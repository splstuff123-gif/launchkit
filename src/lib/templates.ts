// Smart template generator for different SaaS types
import { generatePremiumTaskManagerTurso } from './templates-premium-turso';

type FileMap = Record<string, string>;

type TemplateGenerator = (name: string, description: string, price: string) => FileMap;

function applyAdvancedProductionPack(files: FileMap, name: string, price: string, profile: 'b2b' | 'creator' | 'marketplace'): FileMap {
  const packageJson = JSON.parse(files['package.json'] || '{}');
  packageJson.dependencies = {
    ...(packageJson.dependencies || {}),
    stripe: '^18.0.0',
  };
  packageJson.scripts = {
    ...(packageJson.scripts || {}),
    lint: 'eslint',
    'test:smoke': 'node scripts/smoke-check.mjs',
    'test:ci': 'npm run lint && npm run build && npm run test:smoke',
  };

  const profileLabel = profile === 'b2b' ? 'B2B SaaS' : profile === 'creator' ? 'Creator SaaS' : 'Marketplace SaaS';

  return {
    ...files,
    'package.json': JSON.stringify(packageJson, null, 2),
    'src/app/api/health/route.ts': `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, service: '${name}', profile: '${profileLabel}' });
}
`,
    'src/app/api/auth/status/route.ts': `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ ok: true, loaded: true, provider: 'placeholder-auth' });
}
`,
    'src/app/api/db/ping/route.ts': `import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    await db.execute('SELECT 1');
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'db error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
`,
    'src/app/api/ready/route.ts': `import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    appUrl: Boolean(process.env.NEXT_PUBLIC_APP_URL),
    stripeKey: Boolean(process.env.STRIPE_SECRET_KEY),
    stripePrice: Boolean(process.env.STRIPE_PRICE_ID),
    tursoUrl: Boolean(process.env.TURSO_DATABASE_URL),
    tursoToken: Boolean(process.env.TURSO_AUTH_TOKEN),
  };

  const ok = Object.values(checks).every(Boolean);
  return NextResponse.json({ ok, checks }, { status: ok ? 200 : 500 });
}
`,
    'src/app/api/billing/checkout/route.ts': `import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-07-30.basil' })
  : null;

export async function POST() {
  if (!stripe || !process.env.STRIPE_PRICE_ID || !process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ ok: false, error: 'Stripe env vars missing' }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    success_url: process.env.NEXT_PUBLIC_APP_URL + '/billing?success=1',
    cancel_url: process.env.NEXT_PUBLIC_APP_URL + '/billing?canceled=1',
  });

  return NextResponse.json({ ok: true, url: session.url });
}
`,
    'src/app/api/billing/webhook/route.ts': `import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-07-30.basil' })
  : null;

export async function POST(request: Request) {
  if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ received: false, error: 'Webhook env vars missing' }, { status: 500 });
  }

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ received: false, error: 'Missing signature' }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);

    // Minimal lifecycle handling scaffold
    if (event.type === 'checkout.session.completed' || event.type === 'invoice.payment_succeeded') {
      // TODO: persist subscription state in DB
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch {
    return NextResponse.json({ received: false, error: 'Invalid signature' }, { status: 400 });
  }
}
`,
    'src/app/billing/page.tsx': `'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function BillingPage() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const features = useMemo(
    () => [
      'Unlimited projects and workspaces',
      'Advanced automation and reminders',
      'Role-based access and audit history',
      'Priority support and launch consulting',
    ],
    []
  );

  const testimonials = useMemo(
    () => [
      '"We activated our team in under an hour." — Ops Lead',
      '"Checkout setup was painless and started converting on day one." — Founder',
    ],
    []
  );

  const checkoutSuccess = searchParams.get('success') === '1';
  const checkoutCanceled = searchParams.get('canceled') === '1';

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/checkout', { method: 'POST' });
      const data = await response.json();

      if (!response.ok || !data?.url) {
        throw new Error(data?.error || 'Unable to create checkout session');
      }

      window.location.href = data.url;
    } catch (checkoutError: unknown) {
      const message = checkoutError instanceof Error ? checkoutError.message : 'Checkout failed';
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <p className="mb-3 inline-flex rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-blue-300">
            Revenue plan
          </p>
          <h1 className="mb-3 text-4xl font-bold">${name} Pro</h1>
          <p className="mb-6 text-slate-300">${profileLabel} pricing optimized for conversion and retention.</p>

          {checkoutSuccess && (
            <p className="mb-4 rounded-lg border border-emerald-700 bg-emerald-900/40 px-3 py-2 text-sm text-emerald-200">
              Checkout completed. Activate your workspace and verify webhook events.
            </p>
          )}
          {checkoutCanceled && (
            <p className="mb-4 rounded-lg border border-amber-700 bg-amber-900/30 px-3 py-2 text-sm text-amber-100">
              Checkout canceled. You can restart anytime with your trial preserved.
            </p>
          )}

          <div className="mb-6 flex items-end gap-2">
            <span className="text-5xl font-bold">$${price}</span>
            <span className="pb-1 text-slate-400">/month</span>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={isLoading}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 text-base font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? 'Redirecting to secure checkout…' : 'Start 14-day free trial'}
          </button>

          {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}

          <p className="mt-4 text-xs text-slate-400">No contract • Cancel anytime • Test mode ready for Stripe</p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-8">
          <h2 className="mb-4 text-xl font-semibold">What teams get on day one</h2>
          <ul className="space-y-3 text-slate-200">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <span className="mt-0.5 text-emerald-400">✓</span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Activation checklist</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Connect Stripe keys in deployment environment.</li>
              <li>Verify <code>/api/ready</code> returns <code>{'{ ok: true }'}</code>.</li>
              <li>Run smoke checks and complete onboarding flow.</li>
            </ol>
          </div>

          <div className="mt-4 rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Customer proof</p>
            <ul className="mt-2 space-y-2">
              {testimonials.map((quote) => (
                <li key={quote}>{quote}</li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
`,
    'src/app/onboarding/page.tsx': `'use client';

import { useMemo, useState } from 'react';

export default function OnboardingPage() {
  const steps = useMemo(
    () => [
      { title: 'Connect your workspace', detail: 'Invite teammates and set permissions in under 2 minutes.' },
      { title: 'Import your first data set', detail: 'Use CSV import or API sync to populate your dashboard quickly.' },
      { title: 'Launch billing', detail: 'Enable Stripe, confirm plans, and validate checkout conversion.' },
    ],
    []
  );
  const [completed, setCompleted] = useState<number[]>([]);

  const progress = Math.round((completed.length / steps.length) * 100);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-6 py-16">
        <p className="mb-2 text-sm uppercase tracking-wider text-blue-300">First-run UX</p>
        <h1 className="mb-3 text-4xl font-bold">Welcome to ${name}</h1>
        <p className="mb-6 text-slate-300">A guided onboarding flow designed to reduce time-to-value and improve paid conversion.</p>

        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-300">Activation progress</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full bg-blue-500" style={{ width: progress + '%' }} />
          </div>
          <p className="mt-2 text-xs text-slate-400">{completed.length}/{steps.length} completed ({progress}%)</p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => {
            const done = completed.includes(index);
            return (
              <section key={step.title} className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-blue-300">Step {index + 1}</p>
                    <h2 className="mt-1 text-xl font-semibold">{step.title}</h2>
                    <p className="mt-2 text-slate-300">{step.detail}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCompleted((prev) => (done ? prev.filter((item) => item !== index) : [...prev, index]))
                    }
                    className={done ? 'rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white' : 'rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700'}
                  >
                    {done ? 'Completed' : 'Mark done'}
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-900">Go to app</a>
          <a href="/billing" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500">Continue to billing</a>
        </div>
      </div>
    </main>
  );
}
`,
    'middleware.ts': `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/app')) {
    const hasSubscription = request.cookies.get('launchkit_subscription')?.value === 'active';
    if (!hasSubscription) {
      return NextResponse.redirect(new URL('/billing', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/app/:path*'],
};
`,
    'scripts/smoke-check.mjs': `const base = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

const checks = [
  '/api/health',
  '/api/db/ping',
  '/api/auth/status',
  '/api/ready',
  '/billing',
  '/onboarding',
];

for (const path of checks) {
  const response = await fetch(base + path);
  if (!response.ok) {
    console.error('Smoke check failed:', path, response.status);
    process.exit(1);
  }
}

console.log('Smoke checks passed');
`,
    '.github/workflows/ci.yml': `name: CI\n\non:\n  push:\n    branches: [ main ]\n  pull_request:\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n      - run: npm ci\n      - run: npm run lint\n      - run: npm run build\n`,
    'UX_PLAYBOOK.md': `# UX / Conversion Playbook\n\nUse this generated product as a starting point for a high-converting SaaS UX:\n\n## Core UX principles\n- Keep first-value time under 5 minutes (guided onboarding + sample data).\n- Always show a next-best action on empty states.\n- Surface trust signals before the paywall (uptime, support SLA, testimonials).\n- Keep billing transparent with one clear primary CTA and low-friction trial copy.\n\n## Recommended experiments\n1. Add role-specific onboarding paths (founder, operator, analyst).\n2. A/B test CTA copy on pricing and empty-state buttons.\n3. Add event tracking for: onboarding_started, onboarding_completed, checkout_started, checkout_completed.\n4. Build win-back nudges for trial users with no activation in 48h.\n\n## Accessibility checklist\n- Ensure all forms have labels and keyboard focus styles.\n- Keep color contrast WCAG AA for body text and actionable controls.\n- Provide non-color status indicators for success/error states.\n`,
    'LAUNCH_CHECKLIST.md': `# Launch Checklist\n\n- [ ] Configure Stripe env vars (STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET)\n- [ ] Configure Turso env vars (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)\n- [ ] Run smoke checks (npm run test:smoke)\n- [ ] Verify /api/ready returns ok: true\n- [ ] Confirm billing checkout works in Stripe test mode\n- [ ] Complete onboarding flow and capture activation screenshots\n`,
    'PRIVACY.md': `# Privacy Policy\n\nThis generated product includes a default privacy policy template. Replace with counsel-approved policy before production launch.\n`,
    'TERMS.md': `# Terms of Service\n\nThis generated product includes a default terms template. Replace with counsel-approved terms before production launch.\n`,
    'src/lib/rate-limit.ts': `const windowMs = 60_000;
const limit = 60;

const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string) {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterMs: entry.resetAt - now };
  }

  entry.count += 1;
  return { ok: true };
}
`,
  };
}

function generateB2BTemplate(name: string, description: string, price: string): FileMap {
  const base = generatePremiumTaskManagerTurso(name, `${description}\n\nDomain: B2B SaaS with teams, seats, RBAC, and audit logs.`, price);
  return applyAdvancedProductionPack(base, name, price, 'b2b');
}

function generateCreatorTemplate(name: string, description: string, price: string): FileMap {
  const base = generatePremiumTaskManagerTurso(name, `${description}\n\nDomain: Creator SaaS with subscriptions and content paywall.`, price);
  return applyAdvancedProductionPack(base, name, price, 'creator');
}

function generateMarketplaceTemplate(name: string, description: string, price: string): FileMap {
  const base = generatePremiumTaskManagerTurso(name, `${description}\n\nDomain: Marketplace SaaS with demand/supply workflows.`, price);
  return applyAdvancedProductionPack(base, name, price, 'marketplace');
}

export function selectTemplate(description: string): string {
  const desc = description.toLowerCase();

  if (desc.match(/team|org|enterprise|rbac|audit|b2b|seat/)) {
    return 'b2b-saas';
  }

  if (desc.match(/creator|content|paywall|course|newsletter|community|fans/)) {
    return 'creator-saas';
  }

  if (desc.match(/marketplace|vendor|booking|service provider|buyer|seller|gig/)) {
    return 'marketplace-saas';
  }

  if (desc.match(/task|todo|project|manage|organize|checklist|priority/)) {
    return 'task-manager';
  }

  if (desc.match(/workout|fitness|exercise|health|gym|training|goal|weight/)) {
    return 'creator-saas';
  }

  if (desc.match(/crm|customer|contact|client|lead|sales|deal/)) {
    return 'b2b-saas';
  }

  if (desc.match(/analytics|dashboard|metric|chart|report|stat|track/)) {
    return 'b2b-saas';
  }

  if (desc.match(/note|wiki|document|knowledge|write|blog|content/)) {
    return 'creator-saas';
  }

  return 'task-manager';
}

export function generateTemplate(templateType: string, name: string, description: string, price: string) {
  const generators: Record<string, TemplateGenerator> = {
    'task-manager': (n, d, p) => applyAdvancedProductionPack(generatePremiumTaskManagerTurso(n, d, p), n, p, 'b2b'),
    'b2b-saas': generateB2BTemplate,
    'creator-saas': generateCreatorTemplate,
    'marketplace-saas': generateMarketplaceTemplate,
  };

  const generator = generators[templateType] || generators['task-manager'];
  return generator(name, description, price);
}
