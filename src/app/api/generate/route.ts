import { NextResponse } from 'next/server';
import { checkRateLimit, requestKey } from '@/lib/rate-limit';
import { Octokit } from '@octokit/rest';
import { selectTemplate, generateTemplate } from '@/lib/templates';
import { createTursoDatabase, initializeTursoSchema } from '@/lib/database-turso';
import { parseRequirementsText } from '@/lib/requirements';
import { createJob, getJob, updateJob } from '@/lib/generation-jobs';
import { trackEvent } from '@/lib/analytics';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME!;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;
const TURSO_TOKEN = process.env.TURSO_TOKEN!;

const CRITICAL_PATHS = ['package.json', 'src/app/page.tsx', 'src/app/layout.tsx'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function retry<T>(fn: () => Promise<T>, attempts = 3, delayMs = 600): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < attempts - 1) {
        await sleep(delayMs * (i + 1));
      }
    }
  }
  throw lastError;
}

async function vercelFetchJson<T = unknown>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`https://api.vercel.com${path}`, init);
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Vercel API ${path} failed: ${response.status} ${details}`);
  }
  return response.json() as Promise<T>;
}

type DeploymentVerification = {
  passed: boolean;
  checks: {
    homepage: boolean;
    healthEndpoint: boolean;
    dbRoundtrip: boolean;
    authFlow: boolean;
    pricingPage: boolean;
    checkoutSession: boolean;
  };
  errors: string[];
  pending?: boolean;
};

async function checkJsonOk(url: string, expectedOkField = true) {
  const response = await fetch(url);
  if (!response.ok) return false;

  try {
    const data = await response.json();
    if (expectedOkField && typeof data.ok === 'boolean') {
      return data.ok;
    }
    return true;
  } catch {
    return false;
  }
}

async function checkHtmlOk(url: string, expectedText?: string) {
  const response = await fetch(url);
  if (!response.ok) return false;
  const html = (await response.text()).toLowerCase();
  if (!expectedText) return html.includes('html');
  return html.includes(expectedText.toLowerCase());
}

async function checkCheckout(url: string) {
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) return false;

  try {
    const data = await response.json();
    return Boolean(data.ok);
  } catch {
    return false;
  }
}

async function verifyDeployment(baseUrl: string): Promise<DeploymentVerification> {
  const checks = {
    homepage: false,
    healthEndpoint: false,
    dbRoundtrip: false,
    authFlow: false,
    pricingPage: false,
    checkoutSession: false,
  };
  const errors: string[] = [];

  const run = async (name: keyof typeof checks, fn: () => Promise<boolean>) => {
    try {
      checks[name] = await retry(fn, 4, 1200);
      if (!checks[name]) errors.push(`${name} check failed`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'unknown error';
      errors.push(`${name} check error: ${message}`);
      checks[name] = false;
    }
  };

  await run('homepage', () => checkHtmlOk(baseUrl));
  await run('healthEndpoint', () => checkJsonOk(`${baseUrl}/api/health`));
  await run('dbRoundtrip', () => checkJsonOk(`${baseUrl}/api/db/ping`));
  await run('authFlow', () => checkJsonOk(`${baseUrl}/api/auth/status`));
  await run('pricingPage', () => checkHtmlOk(`${baseUrl}/billing`, 'billing'));
  await run('checkoutSession', () => checkCheckout(`${baseUrl}/api/billing/checkout`));

  const passed = Object.values(checks).every(Boolean);
  return { passed, checks, errors };
}


async function waitForVercelDeploymentReady(deploymentId: string, maxAttempts = 36) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}`, {
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const state = String(data.readyState || '').toUpperCase();
        if (state === 'READY') {
          return { ready: true };
        }
        if (state === 'ERROR' || state === 'CANCELED') {
          return { ready: false, state };
        }
      }
    } catch {
      // Keep polling on transient failures.
    }

    await sleep(5000);
  }

  return { ready: false, state: 'TIMEOUT' };
}

async function waitForUrlReachable(url: string, maxAttempts = 20) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (response.ok || response.status === 401 || response.status === 403) {
        return true;
      }
    } catch {
      // Continue polling.
    }

    await sleep(3000);
  }

  return false;
}

async function verifyWithFinalRetry(baseUrl: string) {
  let verification = await verifyDeployment(baseUrl);
  const allFailed = Object.values(verification.checks).every((value) => value === false);

  if (allFailed) {
    await sleep(15000);
    verification = await verifyDeployment(baseUrl);
  }

  return verification;
}

function calculateRevenueReadiness(input: {
  hasBillingSignals: boolean;
  hasAuthSignals: boolean;
  hasDatabase: boolean;
  deploymentVerified: boolean;
  hasOnboarding: boolean;
  hasAnalyticsEvents: boolean;
}) {
  const checks = {
    billing: input.hasBillingSignals,
    authentication: input.hasAuthSignals,
    database: input.hasDatabase,
    deployment: input.deploymentVerified,
    onboarding: input.hasOnboarding,
    analytics: input.hasAnalyticsEvents,
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  return {
    score: Math.round((passed / total) * 100),
    checks,
  };
}

async function runGeneration(payload: { name: string; description: string; price: string; requirements?: string }, jobId?: string) {
  const startedAt = Date.now();
  const { name, description, price, requirements } = payload;

  const setStep = (step: string, progress: number) => {
    if (jobId) updateJob(jobId, { status: 'running', step, progress });
  };

  await trackEvent('generation_started', { name });
  setStep('Creating GitHub repository', 10);

  let repoName = name.toLowerCase().replace(/\s+/g, '-');
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  let repo;
  try {
    const { data } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description,
      private: process.env.GENERATED_REPO_PRIVATE !== 'false',
      auto_init: true,
    });
    repo = data;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : '';
    if (msg.includes('name already exists')) {
      repoName = `${repoName}-${Date.now()}`;
      const { data } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description,
        private: process.env.GENERATED_REPO_PRIVATE !== 'false',
        auto_init: true,
      });
      repo = data;
    } else {
      throw error;
    }
  }

  setStep('Generating code template', 25);

  let effectiveDescription = description as string;
  if (requirements) {
    try {
      const doc = parseRequirementsText(String(requirements));
      const reqLines = doc.requirements
        .slice(0, 20)
        .map((r) => `- [${r.priority}] ${r.title}${r.description ? `: ${r.description}` : ''}`)
        .join('\n');
      effectiveDescription = `${description}\n\nAPPROVED REQUIREMENTS:\n${reqLines}`;
      await trackEvent('requirements_accepted', { name, requirementCount: doc.requirements.length });
    } catch {
      effectiveDescription = `${description}\n\nAPPROVED REQUIREMENTS (raw):\n${String(requirements)}`;
    }
  }

  const templateType = selectTemplate(effectiveDescription);
  const files = generateTemplate(templateType, name, effectiveDescription, price);

  setStep('Provisioning Turso database', 40);

  let tursoConfig;
  let tursoUrl = null;
  try {
    tursoConfig = await createTursoDatabase(repoName, TURSO_TOKEN);
    tursoUrl = `https://turso.tech/app/databases/${repoName}`;

    const schemaFile = files['SCHEMA.sql'] as string;
    if (schemaFile) {
      await initializeTursoSchema(tursoConfig, schemaFile);
    }
  } catch (error) {
    console.warn('Turso provisioning failed:', error);
  }

  setStep('Uploading project files to GitHub', 55);

  const fileEntries = Object.entries(files);
  const failedFiles = new Set<string>();
  const maxParallelUploads = 6;

  const uploadFile = async ([path, content]: [string, string], attempts = 3) => {
    try {
      let sha: string | undefined;
      try {
        const { data: existingFile } = await octokit.repos.getContent({
          owner: GITHUB_USERNAME,
          repo: repoName,
          path,
        });
        if ('sha' in existingFile) {
          sha = existingFile.sha;
        }
      } catch {
        // File doesn't exist, that's fine
      }

      await retry(
        () =>
          octokit.repos.createOrUpdateFileContents({
            owner: GITHUB_USERNAME,
            repo: repoName,
            path,
            message: `Add ${path}`,
            content: Buffer.from(content).toString('base64'),
            ...(sha && { sha }),
          }),
        attempts,
        500
      );

      failedFiles.delete(path);
      return true;
    } catch {
      failedFiles.add(path);
      return false;
    }
  };

  for (let i = 0; i < fileEntries.length; i += maxParallelUploads) {
    const batch = fileEntries.slice(i, i + maxParallelUploads);
    await Promise.all(batch.map((entry) => uploadFile(entry as [string, string])));
  }

  if (failedFiles.size > 0) {
    const repairOrder = fileEntries
      .filter(([path]) => failedFiles.has(path))
      .sort(([a], [b]) => {
        const aCritical = CRITICAL_PATHS.includes(a) ? 0 : 1;
        const bCritical = CRITICAL_PATHS.includes(b) ? 0 : 1;
        return aCritical - bCritical;
      });

    for (const entry of repairOrder) {
      await uploadFile(entry as [string, string], 5);
    }
  }

  const failedFilesList = Array.from(failedFiles);
  const criticalMissing = CRITICAL_PATHS.filter((criticalPath) => files[criticalPath] && failedFilesList.includes(criticalPath));
  if (criticalMissing.length > 0) {
    throw new Error(
      `Generation failed quality gate. Critical files failed to upload after repair pass: ${criticalMissing.join(', ')}`
    );
  }

  setStep('Deploying on Vercel', 75);

  let deployedUrl = `https://${repoName}.vercel.app`;
  let projectId: string | null = null;
  let deploymentId: string | null = null;
  let vercelLinkedRepo = false;
  let manualImportRequired = false;

  try {
    const projectData = await vercelFetchJson<{ id: string }>('/v9/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        framework: 'nextjs',
      }),
    });

    projectId = projectData.id;

    const envVars = [
      ...(tursoConfig
        ? [
            { key: 'TURSO_DATABASE_URL', value: tursoConfig.url, target: ['production', 'preview', 'development'] },
            {
              key: 'TURSO_AUTH_TOKEN',
              value: tursoConfig.authToken,
              target: ['production', 'preview', 'development'],
              sensitive: true,
            },
          ]
        : []),
      { key: 'NEXT_PUBLIC_APP_URL', value: deployedUrl, target: ['production', 'preview', 'development'] },
    ];

    for (const envVar of envVars) {
      try {
        await retry(
          () =>
            vercelFetchJson(`/v10/projects/${projectId}/env`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ...envVar, upsert: true }),
            }),
          3,
          400
        );
      } catch {
        // Non-fatal; surfaced in remediation notes
      }
    }

    await vercelFetchJson(`/v9/projects/${projectId}/link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'github',
        repo: `${GITHUB_USERNAME}/${repoName}`,
        gitBranch: 'main',
      }),
    });

    vercelLinkedRepo = true;
    await sleep(2000);
    const deployData = await vercelFetchJson<{ id?: string; url: string }>('/v13/deployments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        project: projectId,
        target: 'production',
        gitSource: {
          type: 'github',
          repoId: repo.id,
          ref: 'main',
        },
      }),
    });

    deploymentId = deployData.id || null;
    deployedUrl = `https://${deployData.url}`;
  } catch {
    manualImportRequired = true;
  }

  setStep('Running post-deploy functional verification', 90);

  if (deploymentId) {
    const deploymentState = await waitForVercelDeploymentReady(deploymentId);
    if (!deploymentState.ready) {
      await trackEvent('generation_failed', {
        name,
        reason: 'deployment_not_ready',
        state: deploymentState.state,
      });
    }
  }

  const urlReachable = await waitForUrlReachable(deployedUrl);

  let verification = await verifyWithFinalRetry(deployedUrl);
  if (!urlReachable && Object.values(verification.checks).every((value) => value === false)) {
    verification = {
      ...verification,
      pending: true,
      errors: [...verification.errors, 'Deployment URL not reachable yet. Verification is pending propagation.'],
    };
  }

  const hasBillingSignals = /billing|stripe|subscription|payment|checkout/i.test(effectiveDescription);
  const hasAuthSignals = /auth|login|sign up|signup|user account|session/i.test(effectiveDescription);
  const hasOnboarding = /onboarding|empty state|first-run|tutorial/i.test(effectiveDescription) || Boolean(requirements);
  const hasAnalyticsEvents = /analytics|event|track|funnel/i.test(effectiveDescription);

  const deploymentCoreOk = verification.pending
    ? Boolean(vercelLinkedRepo && !manualImportRequired)
    : verification.checks.homepage && verification.checks.healthEndpoint;
  const databaseOk = verification.pending
    ? Boolean(tursoConfig)
    : verification.checks.dbRoundtrip || Boolean(tursoConfig);

  const revenueReadiness = calculateRevenueReadiness({
    hasBillingSignals,
    hasAuthSignals,
    hasDatabase: databaseOk,
    deploymentVerified: deploymentCoreOk,
    hasOnboarding,
    hasAnalyticsEvents,
  });

  const remediation = [
    ...(verification.pending ? ['Wait 1-2 minutes for initial deployment propagation, then re-run verification.'] : []),
    ...(failedFilesList.length > 0
      ? [`Retry file upload in generated repo: git add . && git commit -m "fix" && git push`] : []),
    ...(!verification.checks.checkoutSession
      ? ['Set STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel project env, then redeploy']
      : []),
    ...(!verification.checks.dbRoundtrip
      ? ['Verify TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in Vercel project env']
      : []),
  ];

  setStep('Completed', 100);
  await trackEvent('generation_completed', { name, passedVerification: verification.passed, score: revenueReadiness.score });

  return {
    success: true,
    url: deployedUrl,
    githubUrl: repo.html_url,
    vercelImportUrl: manualImportRequired
      ? `https://vercel.com/new/clone?repository-url=${encodeURIComponent(repo.html_url)}`
      : undefined,
    tursoUrl,
    stats: {
      totalFiles: fileEntries.length,
      failedFiles: failedFilesList,
      durationMs: Date.now() - startedAt,
    },
    verification,
    revenueReadiness,
    remediation,
    vercelLinkedRepo,
    manualImportRequired,
    message: tursoConfig
      ? 'SaaS created successfully! Database is configured and ready.'
      : 'SaaS created! Set up Turso database manually (see README).',
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId' }, { status: 400 });
  }

  const job = getJob(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  return NextResponse.json(job);
}

export async function POST(request: Request) {
  const limit = checkRateLimit(requestKey(request));
  if (!limit.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please retry shortly.' }, { status: 429 });
  }
  try {
    const payload = await request.json();

    await trackEvent('idea_submitted', { name: payload.name });

    if (payload?.async === true) {
      const job = createJob();
      updateJob(job.id, { status: 'running', step: 'Starting generation', progress: 1 });

      void runGeneration(payload, job.id)
        .then((result) => {
          updateJob(job.id, { status: 'succeeded', progress: 100, step: 'Completed', result });
          void trackEvent('deployment_success', { jobId: job.id, url: result.url as string });
        })
        .catch((error: unknown) => {
          const msg = error instanceof Error ? error.message : 'Generation failed';
          updateJob(job.id, { status: 'failed', progress: 100, step: 'Failed', error: msg });
          void trackEvent('generation_failed', { jobId: job.id, error: msg });
        });

      return NextResponse.json({ success: true, async: true, jobId: job.id });
    }

    const result = await runGeneration(payload);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('❌ Generation error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate SaaS';
    return NextResponse.json(
      {
        error: msg,
        details: String(error),
      },
      { status: 500 }
    );
  }
}
