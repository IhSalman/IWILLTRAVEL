import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createAdminClient } from '@/utils/supabase/admin';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// TODO: Add IP-based rate limiting (e.g. Upstash ratelimit) to prevent bot spam
export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Normalize email to prevent case-sensitive duplicates
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
    }

    // Create admin client per-request (not at module level)
    const supabase = createAdminClient();

    // 1. Check for existing subscriber
    const { data: existingSubscriber } = await supabase
      .from('newsletter_subscribers')
      .select('id')
      .eq('email', email)
      .single();

    if (existingSubscriber) {
      return NextResponse.json({ success: true, message: 'Already subscribed!' });
    }

    // 2. Insert subscriber
    const { error: dbError } = await supabase
      .from('newsletter_subscribers')
      .insert([{ email }]);

    if (dbError) {
      console.error('Newsletter Supabase Error:', dbError);
      throw new Error('Failed to save subscription');
    }

    // 3. Send Welcome Email via Resend
    const year = new Date().getFullYear();
    const welcomeHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%); padding: 40px 30px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 800;">Welcome to WanderPlan AI ✈️</h1>
          <p style="margin: 15px 0 0 0; font-size: 16px; opacity: 0.9;">The Data-Driven Travel OS for Modern Explorers</p>
        </div>
        <div style="padding: 40px 30px;">
          <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0;">Hi traveler,</p>
          <p style="color: #334155; font-size: 16px; line-height: 1.6;">Thank you for joining the WanderPlan AI community! You're now on the list to receive our best travel intel, destination guides, and exclusive early-access features.</p>

          <h2 style="color: #0f172a; font-size: 20px; margin: 30px 0 15px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">What you can do right now:</h2>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #0ea5e9; margin: 0 0 5px 0; font-size: 16px;">🤖 AI Itinerary Generator</h3>
            <p style="color: #64748b; margin: 0; font-size: 14px; line-height: 1.5;">Create personalized 3-7 day travel plans down to the hour, including costs and travel times.</p>
          </div>

          <div style="margin-bottom: 20px;">
            <h3 style="color: #10b981; margin: 0 0 5px 0; font-size: 16px;">🛂 AI Visa Hub</h3>
            <p style="color: #64748b; margin: 0; font-size: 14px; line-height: 1.5;">Check visa requirements instantly, get AI-summarized policies, and document checklists.</p>
          </div>

          <div style="margin-bottom: 30px;">
            <h3 style="color: #3b82f6; margin: 0 0 5px 0; font-size: 16px;">🗣️ LinguaSphere Translation</h3>
            <p style="color: #64748b; margin: 0; font-size: 14px; line-height: 1.5;">Real-time conversation translation and text-to-speech in 50+ languages.</p>
          </div>

          <div style="text-align: center; margin-top: 40px;">
            <a href="https://wanderplan.example.com" style="display: inline-block; background-color: #0ea5e9; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">Start Planning a Trip</a>
          </div>
        </div>
        <div style="padding: 20px; background: #f8fafc; text-align: center; color: #94a3b8; font-size: 13px; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0;">© ${year} WanderPlan AI. You are receiving this because you subscribed to our newsletter.</p>
        </div>
      </div>
    `;

    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { error: emailError } = await resend.emails.send({
        from: 'WanderPlan AI <onboarding@resend.dev>',
        to: [email],
        subject: 'Welcome to WanderPlan AI! ✈️',
        html: welcomeHtml,
        tags: [{ name: 'category', value: 'welcome_email' }],
      });

      if (emailError) {
        // Log but don't fail — the subscriber is already saved
        console.error('Welcome Email Error:', emailError);
      }
    } else {
      console.log('[NEWSLETTER API] Missing RESEND_API_KEY. Skipping welcome email.');
    }

    return NextResponse.json({ success: true, message: 'Subscribed successfully' });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Subscription failed';
    console.error('Newsletter Route Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
