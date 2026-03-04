import { NextResponse } from 'next/server';
import { getFunnelMetrics } from '@/lib/analytics';

export async function GET() {
  return NextResponse.json({ funnel: getFunnelMetrics() });
}
