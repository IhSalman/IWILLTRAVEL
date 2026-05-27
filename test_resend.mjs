import { Resend } from 'resend';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);

async function testResend() {
    console.log('Testing Resend with key:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
    
    try {
        const { data, error } = await resend.emails.send({
            from: 'WanderPlan AI <onboarding@resend.dev>',
            to: ['salman@example.com'], // User's email should go here for a real test
            subject: 'Diagnostic Test',
            html: '<p>If you see this, Resend is working!</p>'
        });

        if (error) {
            console.error('Resend Error:', JSON.stringify(error, null, 2));
        } else {
            console.log('Resend Success:', data);
        }
    } catch (err) {
        console.error('Exception during Resend test:', err);
    }
}

testResend();
