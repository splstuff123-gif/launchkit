import { NextResponse } from 'next/server';
import { checkRateLimit, requestKey } from '@/lib/rate-limit';

const FIGMA_BASE_URL = 'https://www.figma.com';


function isEmbeddableFigmaUrl(value: string) {
  try {
    const url = new URL(value);
    if (!/figma\.com$/i.test(url.hostname) && !/\.figma\.com$/i.test(url.hostname)) return false;
    return /^\/(file|design|proto|board|jam)\//.test(url.pathname);
  } catch {
    return false;
  }
}

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
    const figmaToken = process.env.FIGMA_TOKEN?.trim();
    const configuredFileKey = process.env.FIGMA_MOCKUP_FILE_KEY?.trim();
    const configuredUrl = process.env.FIGMA_MOCKUP_URL?.trim();
    let figmaUrl = '';
    let warning: string | null = null;

    if (configuredUrl) {
      if (isEmbeddableFigmaUrl(configuredUrl)) {
        figmaUrl = configuredUrl;
      } else {
        warning = 'FIGMA_MOCKUP_URL is not an embeddable Figma design/prototype URL. Ignoring it for preview.';
      }
    }

    if (!figmaToken) {
      warning = warning || 'FIGMA_TOKEN is missing. Add it to .env.local for token-validated automatic mockup links.';
    } else if (configuredFileKey) {
      const verifyResponse = await fetch(`https://api.figma.com/v1/files/${configuredFileKey}`, {
        headers: {
          'X-Figma-Token': figmaToken,
        },
      });

      if (!verifyResponse.ok) {
        const details = await verifyResponse.text().catch(() => 'Unable to validate configured Figma file key');
        warning = `Configured FIGMA_MOCKUP_FILE_KEY is invalid or inaccessible: ${details}`;
      } else {
        figmaUrl = `${FIGMA_BASE_URL}/file/${configuredFileKey}`;
      }
    } else {
      const meResponse = await fetch('https://api.figma.com/v1/me', {
        headers: {
          'X-Figma-Token': figmaToken,
        },
      });

      if (!meResponse.ok) {
        const details = await meResponse.text().catch(() => 'Unable to validate Figma token');
        warning = `Unable to access Figma profile with FIGMA_TOKEN: ${details}`;
      }
    }

    return NextResponse.json({
      success: true,
      figmaPrompt,
      figmaUrl,
      ...(warning ? { warning } : {}),
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
