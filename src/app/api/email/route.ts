import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAuth } from '@/utils/auth';
import { escapeHtml } from '@/utils/sanitize';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  // Require authentication to protect Resend API credits
  const authResult = await requireAuth();
  if ('error' in authResult) return authResult.error;

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { recipients, senderName, tripTitle, tripUrl, personalMessage } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0 || recipients.length > 10) {
      return NextResponse.json({ error: 'Invalid recipients list (1–10 addresses required)' }, { status: 400 });
    }

    // Validate every recipient is a proper email address
    for (const addr of recipients) {
      if (typeof addr !== 'string' || !EMAIL_RE.test(addr)) {
        return NextResponse.json({ error: `Invalid email address: ${addr}` }, { status: 400 });
      }
    }

    if (!senderName || !tripTitle) {
      return NextResponse.json({ error: 'senderName and tripTitle are required' }, { status: 400 });
    }

    // Escape all user-supplied values before embedding in HTML (XSS prevention)
    const safeSenderName = escapeHtml(senderName);
    const safeTripTitle = escapeHtml(tripTitle);
    const safeTripUrl = encodeURI(typeof tripUrl === 'string' ? tripUrl : '');
    const safeMessage = personalMessage ? escapeHtml(personalMessage) : '';

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px;">✈️ You're Invited!</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">${safeSenderName} shared a trip with you</p>
        </div>
        <div style="padding: 30px;">
          ${safeMessage ? `<p style="color: #4b5563; line-height: 1.6; margin-bottom: 20px;">"${safeMessage}"</p>` : ''}
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <h2 style="margin: 0; color: #1e293b; font-size: 18px;">${safeTripTitle}</h2>
            <p style="color: #64748b; margin: 5px 0 20px 0;">View the full itinerary and start planning together.</p>
            <a href="${safeTripUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">View Trip Details</a>
          </div>
        </div>
        <div style="padding: 20px; background: #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px;">
          <p style="margin: 0;">This trip was shared via WanderPlan AI Travel Planner</p>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'WanderPlan AI <onboarding@resend.dev>',
      to: recipients,
      subject: `${safeSenderName} shared a trip with you: ${safeTripTitle}`,
      html,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, id: data?.id });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Email sending failed';
    console.error('Email Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
