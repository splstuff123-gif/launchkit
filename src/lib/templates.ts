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
    'src/app/billing/page.tsx': `export default function BillingPage() {
  return (
    <main className="min-h-screen p-8 bg-slate-950 text-white">
      <h1 className="text-3xl font-bold mb-4">Billing & Plans</h1>
      <p className="text-slate-300 mb-6">${profileLabel} default pricing for ${name}: $${price}/month.</p>
      <form action="/api/billing/checkout" method="post">
        <button className="px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 font-semibold" type="submit">
          Upgrade to Pro
        </button>
      </form>
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
  '/billing',
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
