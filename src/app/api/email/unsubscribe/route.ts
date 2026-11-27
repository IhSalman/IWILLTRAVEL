/**
 * Email unsubscribe.
 *   GET  — confirmation page with a button (email scanners that prefetch links
 *          must not unsubscribe people by accident).
 *   POST — performs the unsubscribe; also used by one-click List-Unsubscribe-Post.
 * Links are HMAC-signed per user (EMAIL_SIGNING_SECRET).
 */
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { verifyUnsubscribeToken } from '@/lib/notify';

const page = (title: string, body: string) =>
    new NextResponse(
        `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:#0b0c0f;color:#d9d5cc;font-family:Inter,Arial,sans-serif">
<div style="max-width:480px;margin:12vh auto;padding:0 24px">
<h1 style="font-family:Georgia,serif;font-weight:400;color:#edeae3">${title}</h1>${body}</div></body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
    );

function params(req: Request) {
    const url = new URL(req.url);
    return { u: url.searchParams.get('u') || '', t: url.searchParams.get('t') || '' };
}

export async function GET(req: Request) {
    const { u, t } = params(req);
    if (!u || !t || !verifyUnsubscribeToken(u, t)) {
        return page('Link not valid', '<p>This unsubscribe link is invalid or has expired.</p>');
    }
    return page(
        'Unsubscribe from trip emails?',
        `<p style="line-height:1.6">You’ll stop getting pre-trip reminders and trip alerts by email. Telegram messages (if linked) are not affected.</p>
<form method="post"><button style="margin-top:16px;background:#edeae3;color:#0b0c0f;border:0;padding:12px 22px;border-radius:999px;font-weight:600;cursor:pointer">Unsubscribe</button></form>`
    );
}

export async function POST(req: Request) {
    const { u, t } = params(req);
    if (!u || !t || !verifyUnsubscribeToken(u, t)) {
        return page('Link not valid', '<p>This unsubscribe link is invalid or has expired.</p>');
    }
    const { error } = await createAdminClient().from('profiles').update({ email_opt_out: true }).eq('id', u);
    if (error) {
        console.error('[unsubscribe] Failed:', error.message);
        return page('Something went wrong', '<p>Please try again, or reply to any of our emails and we’ll remove you.</p>');
    }
    return page('You’re unsubscribed', '<p>We won’t send you automated trip emails any more.</p>');
}
