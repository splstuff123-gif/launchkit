import { NextResponse } from 'next/server';
import { checkRateLimit, requestKey } from '@/lib/rate-limit';

type ProviderStatus = {
  connected: boolean;
  error?: string;
};

export async function POST(request: Request) {
  const limit = checkRateLimit(requestKey(request));
  if (!limit.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please retry shortly.' }, { status: 429 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const vercelToken = (body.vercelToken as string | undefined)?.trim() || process.env.VERCEL_TOKEN;
    const tursoToken = (body.tursoToken as string | undefined)?.trim() || process.env.TURSO_TOKEN;
    const openAiKey = (body.openAiKey as string | undefined)?.trim() || process.env.OPENAI_API_KEY;

    const result: {
      vercel: ProviderStatus;
      turso: ProviderStatus;
      openai: ProviderStatus;
    } = {
      vercel: { connected: false },
      turso: { connected: false },
      openai: { connected: false },
    };

    if (!vercelToken) {
      result.vercel.error = 'Missing Vercel token';
    } else {
      try {
        const response = await fetch('https://api.vercel.com/v2/user', {
          headers: {
            Authorization: `Bearer ${vercelToken}`,
          },
        });

        if (!response.ok) {
          const details = await response.text();
          throw new Error(details || `HTTP ${response.status}`);
        }

        result.vercel.connected = true;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.vercel.error = `Vercel connection failed: ${message}`;
      }
    }

    if (!tursoToken) {
      result.turso.error = 'Missing Turso token';
    } else {
      try {
        const response = await fetch('https://api.turso.tech/v1/organizations', {
          headers: {
            Authorization: `Bearer ${tursoToken}`,
          },
        });

        if (!response.ok) {
          const details = await response.text();
          throw new Error(details || `HTTP ${response.status}`);
        }

        result.turso.connected = true;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.turso.error = `Turso connection failed: ${message}`;
      }
    }


    if (!openAiKey) {
      result.openai.error = 'Missing OpenAI API key';
    } else {
      try {
        const response = await fetch('https://api.openai.com/v1/models', {
          headers: {
            Authorization: `Bearer ${openAiKey}`,
          },
        });

        if (!response.ok) {
          const details = await response.text();
          throw new Error(details || `HTTP ${response.status}`);
        }

        result.openai.connected = true;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        result.openai.error = `OpenAI connection failed: ${message}`;
      }
    }

    return NextResponse.json({
      success: result.vercel.connected && result.turso.connected && result.openai.connected,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to test integrations';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
