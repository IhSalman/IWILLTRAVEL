import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
    // 1. Run the next-intl middleware first
    const response = intlMiddleware(request);

    // 2. Run the Supabase session middleware logic
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const pathname = request.nextUrl.pathname;

    /**
     * Routes that require the user to be logged in.
     * The locale prefix is stripped before matching.
     */
    const protectedPaths = [
        '/dashboard',
        '/admin',
        '/plan-trip',
        '/translate',
        '/visa-hub',
        '/community',
        '/itineraries',
        '/discover',
    ];

    /** Routes that logged-in users should not visit (login / signup pages). */
    const authPaths = ['/login', '/signup'];

    /** Strip the locale prefix (/en, /fr, …) from a pathname. */
    const getPathWithoutLocale = (path: string) => {
        const parts = path.split('/');
        if (parts.length > 1 && routing.locales.includes(parts[1] as any)) {
            return '/' + parts.slice(2).join('/');
        }
        return path;
    };

    const pathWithoutLocale = getPathWithoutLocale(pathname);
    const isProtected = protectedPaths.some((p) => pathWithoutLocale.startsWith(p));
    const isAuthPage = authPaths.some((p) => pathWithoutLocale.startsWith(p));

    // Derive the locale prefix for redirect URLs
    const locale = pathname.split('/')[1];
    const prefix = routing.locales.includes(locale as any) ? `/${locale}` : '';

    // Redirect unauthenticated users away from protected routes
    if (!user && isProtected) {
        const url = request.nextUrl.clone();
        url.pathname = `${prefix}/login`;
        url.searchParams.set('redirectedFrom', pathname);
        return NextResponse.redirect(url);
    }

    // Redirect logged-in users away from auth pages
    if (user && isAuthPage) {
        const url = request.nextUrl.clone();
        url.pathname = `${prefix}/dashboard`;
        return NextResponse.redirect(url);
    }

    // Additional checks for logged-in users (only on page routes, not API)
    if (user && !pathWithoutLocale.startsWith('/api')) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('preferences, is_admin')
            .eq('id', user.id)
            .single();

        // Admin route protection — check DB flag, not just auth
        if (pathWithoutLocale.startsWith('/admin') && profile?.is_admin !== true) {
            const url = request.nextUrl.clone();
            url.pathname = `${prefix}/`;
            return NextResponse.redirect(url);
        }

        // Onboarding gate — skip for onboarding and admin pages
        if (
            !pathWithoutLocale.startsWith('/onboarding') &&
            !pathWithoutLocale.startsWith('/admin') &&
            !profile?.preferences
        ) {
            const url = request.nextUrl.clone();
            url.pathname = `${prefix}/onboarding`;
            return NextResponse.redirect(url);
        }
    }

    return response;
}

export const config = {
    matcher: [
        // Match all pathnames except static files and internal Next.js routes
        '/((?!api|_next|_vercel|.*\\..*).*)',
    ],
};
