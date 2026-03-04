import { NextResponse } from 'next/server';
import { checkRateLimit, requestKey } from '@/lib/rate-limit';

type Check = {
  ok: boolean;
  detail?: string;
};

async function checkGitHub(token?: string): Promise<Check> {
  if (!token) return { ok: false, detail: 'Missing GITHUB_TOKEN' };
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!response.ok) return { ok: false, detail: `GitHub auth failed (${response.status})` };
  return { ok: true };
}

async function checkVercel(token?: string): Promise<Check> {
  if (!token) return { ok: false, detail: 'Missing VERCEL_TOKEN' };
  const response = await fetch('https://api.vercel.com/v2/user', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { ok: false, detail: `Vercel auth failed (${response.status})` };
  return { ok: true };
}

async function checkTurso(token?: string): Promise<Check> {
  if (!token) return { ok: false, detail: 'Missing TURSO_TOKEN' };
  const response = await fetch('https://api.turso.tech/v1/organizations', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return { ok: false, detail: `Turso auth failed (${response.status})` };
  return { ok: true };
}

export async function GET(request: Request) {
  const limit = checkRateLimit(requestKey(request));
  if (!limit.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please retry shortly.' }, { status: 429 });
  }

  const [github, vercel, turso] = await Promise.all([
    checkGitHub(process.env.GITHUB_TOKEN),
    checkVercel(process.env.VERCEL_TOKEN),
    checkTurso(process.env.TURSO_TOKEN),
  ]);

  return NextResponse.json({
    ok: github.ok && vercel.ok && turso.ok,
    checks: { github, vercel, turso },
  });
}
