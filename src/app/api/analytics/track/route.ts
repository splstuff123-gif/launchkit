import { NextResponse } from 'next/server';
import { trackEvent } from '@/lib/analytics';
import { checkRateLimit, requestKey } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const limit = checkRateLimit(requestKey(request));
  if (!limit.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please retry shortly.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const type = String(body?.type || '').trim();
    const metadata = body?.metadata && typeof body.metadata === 'object' ? body.metadata : undefined;

    if (!type) {
      return NextResponse.json({ error: 'Missing event type' }, { status: 400 });
    }

    await trackEvent(type, metadata);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to track event';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
