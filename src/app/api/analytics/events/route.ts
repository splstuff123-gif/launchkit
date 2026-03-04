import { NextResponse } from 'next/server';
import { listEvents } from '@/lib/analytics';

export async function GET() {
  return NextResponse.json({ events: listEvents() });
}
