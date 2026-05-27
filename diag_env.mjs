import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

console.log('--- Environment Check ---');
console.log('RESEND_API_KEY present in process.env:', !!process.env.RESEND_API_KEY);
if (process.env.RESEND_API_KEY) {
    console.log('Value starts with:', process.env.RESEND_API_KEY.substring(0, 5) + '...');
}
console.log('Other keys found:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('SUPABASE') || k.includes('RESEND') || k.includes('AVIATION')));
