/**
 * Browser-side helpers for starting Stripe Checkout and resuming it after signup/login.
 *
 * Flow: Pricing button → POST /api/subscription/checkout
 *   - signed in  → redirect to Stripe
 *   - signed out → /signup?plan=pro&billing=monthly → after auth → /pricing?checkout=pro&billing=monthly
 *     → Pricing page auto-starts checkout.
 */

export type CheckoutPlan = 'starter' | 'pro';
export type CheckoutBilling = 'monthly' | 'yearly';

export interface CheckoutIntent {
    plan: CheckoutPlan;
    billing: CheckoutBilling;
}

/** Reads and validates a plan/billing pair from a query string. */
export function readCheckoutIntent(search: string, planKey = 'plan'): CheckoutIntent | null {
    const params = new URLSearchParams(search);
    const plan = params.get(planKey);
    const billingRaw = params.get('billing');
    if (plan !== 'starter' && plan !== 'pro') return null;
    const billing: CheckoutBilling = billingRaw === 'yearly' || billingRaw === 'annual' ? 'yearly' : 'monthly';
    return { plan, billing };
}

/** Locale-less path that resumes checkout on the pricing page. */
export function checkoutResumePath({ plan, billing }: CheckoutIntent): string {
    return `/pricing?checkout=${plan}&billing=${billing}`;
}

/** Query string used to carry the intent through signup/login. */
export function checkoutIntentQuery({ plan, billing }: CheckoutIntent): string {
    return `?plan=${plan}&billing=${billing}`;
}

export type StartCheckoutResult =
    | { status: 'redirecting' }
    | { status: 'unauthenticated' }
    | { status: 'error'; message: string };

export async function startPlanCheckout(intent: CheckoutIntent): Promise<StartCheckoutResult> {
    try {
        const res = await fetch('/api/subscription/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(intent),
        });

        if (res.status === 401) return { status: 'unauthenticated' };

        const data = await res.json().catch(() => ({}));
        if (!res.ok || typeof data?.url !== 'string') {
            return { status: 'error', message: data?.error || 'Could not start checkout. Please try again.' };
        }

        window.location.href = data.url;
        return { status: 'redirecting' };
    } catch {
        return { status: 'error', message: 'Network error. Please check your connection and try again.' };
    }
}
