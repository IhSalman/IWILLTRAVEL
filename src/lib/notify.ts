/**
 * Traveller notifications: email (Resend) and Telegram (if the account is linked).
 *
 * - Every email carries a signed one-click unsubscribe link (+ List-Unsubscribe headers).
 * - Users who unsubscribed (profiles.email_opt_out) get no automated email;
 *   Telegram messages still go to users who linked the bot themselves.
 * - Never throws: notifications must not break the job that triggered them.
 */
import crypto from 'node:crypto';
import { Resend } from 'resend';
import { createAdminClient } from '@/utils/supabase/admin';
import { getSiteUrl } from '@/utils/site-url';

const FROM = process.env.EMAIL_FROM || 'iWillTravel <onboarding@resend.dev>';

// ── Unsubscribe tokens ────────────────────────────────────────────────────────

function signingSecret(): string | null {
    return process.env.EMAIL_SIGNING_SECRET || null;
}

export function unsubscribeToken(userId: string): string | null {
    const secret = signingSecret();
    if (!secret) return null;
    return crypto.createHmac('sha256', secret).update(`unsub:${userId}`).digest('base64url');
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
    const expected = unsubscribeToken(userId);
    if (!expected) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function unsubscribeUrl(userId: string): string | null {
    const t = unsubscribeToken(userId);
    return t ? `${getSiteUrl()}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${t}` : null;
}

// ── Contact lookup ────────────────────────────────────────────────────────────

interface Contact {
    email: string | null;
    name: string | null;
    telegramChatId: number | null;
    emailOptOut: boolean;
}

async function getContact(userId: string): Promise<Contact> {
    const supabase = createAdminClient();
    const [{ data: authUser }, { data: profile }, { data: tg }] = await Promise.all([
        supabase.auth.admin.getUserById(userId),
        supabase.from('profiles').select('full_name, email_opt_out').eq('id', userId).maybeSingle(),
        supabase.from('telegram_users').select('telegram_id').eq('user_id', userId).maybeSingle(),
    ]);
    return {
        email: authUser?.user?.email ?? null,
        name: (profile?.full_name as string | undefined)?.split(' ')[0] ?? null,
        telegramChatId: (tg?.telegram_id as number | undefined) ?? null,
        emailOptOut: profile?.email_opt_out === true,
    };
}

// ── Channels ──────────────────────────────────────────────────────────────────

export async function sendTelegram(chatId: number, text: string): Promise<boolean> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return false;
    try {
        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown', disable_web_page_preview: true }),
            signal: AbortSignal.timeout(8000),
        });
        return res.ok;
    } catch {
        return false;
    }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Minimal, on-brand HTML email (ink background, warm paper text, sunrise accent). */
export function renderEmail(params: {
    heading: string;
    paragraphs: string[];
    cta?: { label: string; url: string };
    unsubscribe?: string | null;
}): string {
    const body = params.paragraphs.map((p) => `<p style="margin:0 0 14px;line-height:1.6">${esc(p)}</p>`).join('');
    const cta = params.cta
        ? `<p style="margin:24px 0"><a href="${params.cta.url}" style="background:#edeae3;color:#0b0c0f;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:600;display:inline-block">${esc(params.cta.label)}</a></p>`
        : '';
    const footer = params.unsubscribe
        ? `<p style="margin-top:32px;font-size:12px;color:#716d66">You’re receiving this because you planned a trip with iWillTravel. <a href="${params.unsubscribe}" style="color:#959087">Unsubscribe</a></p>`
        : '';
    return `<!doctype html><html><body style="margin:0;background:#0b0c0f;font-family:Inter,Arial,sans-serif;color:#d9d5cc">
<div style="max-width:560px;margin:0 auto;padding:40px 24px">
<p style="font-family:Georgia,serif;font-size:20px;color:#edeae3;margin:0 0 28px">iWill<em style="color:#959087">Travel</em></p>
<h1 style="font-family:Georgia,serif;font-weight:400;font-size:30px;line-height:1.15;color:#edeae3;margin:0 0 18px">${esc(params.heading)}</h1>
${body}${cta}${footer}
</div></body></html>`;
}

export interface NotifyMessage {
    subject: string;
    heading: string;
    paragraphs: string[];
    cta?: { label: string; url: string };
    /** Short Telegram version (Markdown). Falls back to heading + first paragraph. */
    telegramText?: string;
}

/** Send to every channel the user has. Returns which channels succeeded. */
export async function notifyUser(userId: string, msg: NotifyMessage): Promise<{ email: boolean; telegram: boolean }> {
    const sent = { email: false, telegram: false };
    try {
        const contact = await getContact(userId);

        if (contact.telegramChatId) {
            const tgText =
                msg.telegramText ??
                `*${msg.heading}*\n\n${msg.paragraphs[0] ?? ''}${msg.cta ? `\n\n${msg.cta.label}: ${msg.cta.url}` : ''}`;
            sent.telegram = await sendTelegram(contact.telegramChatId, tgText);
        }

        const unsub = unsubscribeUrl(userId);
        // No signing secret ⇒ no unsubscribe link ⇒ don't send automated email at all.
        if (contact.email && !contact.emailOptOut && unsub && process.env.RESEND_API_KEY) {
            const resend = new Resend(process.env.RESEND_API_KEY);
            const { error } = await resend.emails.send({
                from: FROM,
                to: contact.email,
                subject: msg.subject,
                html: renderEmail({ heading: msg.heading, paragraphs: msg.paragraphs, cta: msg.cta, unsubscribe: unsub }),
                text: [msg.heading, '', ...msg.paragraphs, msg.cta ? `\n${msg.cta.label}: ${msg.cta.url}` : '', `\nUnsubscribe: ${unsub}`].join('\n'),
                headers: {
                    'List-Unsubscribe': `<${unsub}>`,
                    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
                },
            });
            sent.email = !error;
            if (error) console.error('[notify] Email failed:', error.message);
        }
    } catch (err) {
        console.error('[notify] Failed:', err);
    }
    return sent;
}
