import fs from 'fs';

const bytes = fs.readFileSync('.env.local');
// Try to decode as UTF-16LE first
const utf16le = bytes.toString('utf16le');
if (utf16le.includes('NEXT_PUBLIC_SUPABASE_URL')) {
    console.log('Detected UTF-16LE encoding. Converting to UTF-8...');
    fs.writeFileSync('.env.local', utf16le, 'utf8');
} else {
    // If it's already UTF-8 but looks scrambled, maybe it has null bytes?
    const utf8 = bytes.toString('utf8');
    const cleaned = utf8.replace(/\u0000/g, '');
    if (cleaned.length < utf8.length) {
        console.log('Detected null bytes (likely UTF-16 read as UTF-8). Cleaning...');
        fs.writeFileSync('.env.local', cleaned, 'utf8');
    } else {
        console.log('No obvious encoding issue detected via simple string check.');
    }
}
