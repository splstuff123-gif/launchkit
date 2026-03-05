import { NextResponse } from 'next/server';
import { checkRateLimit, requestKey } from '@/lib/rate-limit';

function inferProductType(description: string) {
  const desc = description.toLowerCase();
  if (/marketplace|vendor|buyer|seller|booking/.test(desc)) return 'Marketplace SaaS';
  if (/creator|content|newsletter|community|course/.test(desc)) return 'Creator SaaS';
  if (/team|enterprise|crm|analytics|dashboard|b2b/.test(desc)) return 'B2B SaaS';
  return 'Productivity SaaS';
}

function buildFigmaAiPrompt(input: { name: string; description: string; price: string; additionalPrompt?: string }) {
  const { name, description, price, additionalPrompt } = input;
  const type = inferProductType(description);

  const base = [
    `You are a senior product design consulting team creating a premium SaaS mockup in Figma for ${name}.`,
    `Product type: ${type}.`,
    `Product description: ${description}.`,
    `Target price point: $${price || '29'}/month.`,
    'Create desktop-first high-fidelity mockups with a modern SaaS aesthetic, clear information hierarchy, and conversion-focused UX.',
    'Include these frames: 1) Landing page, 2) Pricing/Billing page, 3) App dashboard, 4) Onboarding flow, 5) Settings page.',
    'Include key states: empty state, loading state, success state, error state.',
    'Include realistic sample data and clear CTAs for trial and upgrade.',
    'Design system: consistent color tokens, spacing scale, typography scale, reusable components, button variants, inputs, alerts, cards, tables.',
    'Accessibility: WCAG AA contrast and keyboard-focus states for primary interactions.',
  ];

  if (additionalPrompt?.trim()) {
    base.push(`Additional design directives: ${additionalPrompt.trim()}`);
  }

  return base.join(' ');
}

export async function POST(request: Request) {
  const limit = checkRateLimit(requestKey(request));
  if (!limit.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please retry shortly.' }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const description = String(body.description || '').trim();
    const price = String(body.price || '').trim();
    const additionalPrompt = body.additionalPrompt ? String(body.additionalPrompt) : undefined;

    if (!name || !description) {
      return NextResponse.json({ error: 'name and description are required' }, { status: 400 });
    }

    const figmaPrompt = buildFigmaAiPrompt({ name, description, price, additionalPrompt });

    return NextResponse.json({
      success: true,
      figmaPrompt,
      figmaUrl: 'https://www.figma.com/',
      recommendedFrames: ['Landing', 'Pricing/Billing', 'Dashboard', 'Onboarding', 'Settings'],
      handoffChecklist: [
        'Paste the prompt into Figma AI / Make Design flow',
        'Generate desktop variants first, then responsive versions',
        'Export design tokens and component names for implementation',
      ],
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate Figma mockup prompt';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
