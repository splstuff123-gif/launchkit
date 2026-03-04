'use client';

import { useState } from 'react';

import type { RequirementsDoc } from '@/lib/requirements';

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
  });

  const [advanced, setAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReqGenerating, setIsReqGenerating] = useState(false);
  const [requirementsDoc, setRequirementsDoc] = useState<RequirementsDoc | null>(null);
  const [requirementsText, setRequirementsText] = useState('');

  type GenerateResponse = {
    error?: string;
    url?: string;
    stripeUrl?: string;
    supabaseUrl?: string;
    vercelImportUrl?: string;
    verification?: {
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
    revenueReadiness?: {
      score: number;
      checks: {
        billing: boolean;
        authentication: boolean;
        database: boolean;
        deployment: boolean;
        onboarding: boolean;
        analytics: boolean;
      };
    };
    stats?: {
      totalFiles: number;
      failedFiles: string[];
      durationMs: number;
    };
    remediation?: string[];
    vercelLinkedRepo?: boolean;
    manualImportRequired?: boolean;
  };

  type IntegrationStatus = {
    connected: boolean;
    error?: string;
  };

  const [result, setResult] = useState<GenerateResponse | null>(null);
  const [vercelToken, setVercelToken] = useState('');
  const [tursoToken, setTursoToken] = useState('');
  const [isTestingIntegrations, setIsTestingIntegrations] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<{
    vercel: IntegrationStatus;
    turso: IntegrationStatus;
  } | null>(null);

  const [asyncMode, setAsyncMode] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);

  const generateRequirements = async () => {
    setIsReqGenerating(true);
    setResult(null);
    try {
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, description: formData.description }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setRequirementsDoc(data.doc);
      // Simple text view for now (editable)
      const text = (data.doc.requirements || [])
        .map((r: { priority: string; title: string; description?: string }) =>
          `- [${r.priority}] ${r.title}${r.description ? ` - ${r.description}` : ''}`
        )
        .join('\n');
      setRequirementsText(text);
    } catch (e: unknown) {
      console.error('Requirements generation failed:', e);
      const msg = e instanceof Error ? e.message : 'Failed to generate requirements';
      setResult({ error: msg });
    } finally {
      setIsReqGenerating(false);
    }
  };


  const testIntegrations = async () => {
    setIsTestingIntegrations(true);
    setResult(null);

    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vercelToken, tursoToken }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setIntegrationStatus({
        vercel: data.vercel,
        turso: data.turso,
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to test integrations';
      setResult({ error: msg });
      setIntegrationStatus(null);
    } finally {
      setIsTestingIntegrations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const payload: Record<string, unknown> = { ...formData, async: asyncMode };
      if (advanced) {
        payload.requirements = requirementsText;
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (asyncMode && data.jobId) {
        setJobId(data.jobId);

        const poll = async () => {
          const statusRes = await fetch(`/api/generate?jobId=${data.jobId}`);
          const statusData = await statusRes.json();

          if (statusData.status === 'succeeded') {
            setResult(statusData.result);
            setIsGenerating(false);
            return;
          }

          if (statusData.status === 'failed') {
            setResult({ error: statusData.error || 'Generation failed' });
            setIsGenerating(false);
            return;
          }

          setTimeout(poll, 2000);
        };

        setTimeout(poll, 1200);
      } else {
        setResult(data);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setResult({ error: 'Failed to generate SaaS' });
    } finally {
      if (!asyncMode) {
        setIsGenerating(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              LaunchKit
            </h1>
            <p className="text-gray-400 text-lg">
              From idea to deployed SaaS in minutes
            </p>
          </div>


          {/* Form */}
          <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Advanced toggle */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-700 bg-gray-900/40 px-4 py-3">
                <div>
                  <p className="font-semibold">Advanced</p>
                  <p className="text-sm text-gray-400">Generate requirements → review/edit → build to spec</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdvanced(v => !v)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${advanced ? 'bg-blue-600' : 'bg-gray-700'}`}
                  aria-pressed={advanced}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${advanced ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-700 bg-gray-900/20 px-4 py-3">
                <div>
                  <p className="font-semibold">Async generation</p>
                  <p className="text-sm text-gray-400">Runs in background with progress polling for faster UX.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAsyncMode((v) => !v)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${asyncMode ? 'bg-blue-600' : 'bg-gray-700'}`}
                  aria-pressed={asyncMode}
                >
                  <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${asyncMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {/* Project Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., InvoiceReminder"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  What does it do?
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Track invoices and send payment reminders to clients"
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                  required
                />
              </div>

              {/* Pricing */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Price (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500">$</span>
                  <input
                    type="number"
                    id="price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="29"
                    className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                    required
                  />
                </div>
              </div>

              {advanced && (
                <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5 space-y-4">
                  <div className="rounded-xl border border-gray-700 bg-gray-950/50 p-4 space-y-4">
                    <div>
                      <p className="font-semibold">Integrations</p>
                      <p className="text-sm text-gray-400">Paste Vercel/Turso tokens so Codex can test connectivity, or leave blank to use server env tokens.</p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor="vercelToken" className="mb-2 block text-sm font-medium text-gray-300">Vercel Token</label>
                        <input
                          id="vercelToken"
                          type="password"
                          value={vercelToken}
                          onChange={(e) => setVercelToken(e.target.value)}
                          placeholder="vercel_xxx"
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label htmlFor="tursoToken" className="mb-2 block text-sm font-medium text-gray-300">Turso Token</label>
                        <input
                          id="tursoToken"
                          type="password"
                          value={tursoToken}
                          onChange={(e) => setTursoToken(e.target.value)}
                          placeholder="turso_xxx"
                          className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <button
                        type="button"
                        onClick={testIntegrations}
                        disabled={isTestingIntegrations}
                        className="rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-sm font-semibold hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isTestingIntegrations ? 'Testing…' : 'Test Vercel + Turso'}
                      </button>
                      {integrationStatus && (
                        <div className="text-sm text-gray-300">
                          <span className={integrationStatus.vercel.connected ? 'text-green-400' : 'text-red-400'}>
                            Vercel: {integrationStatus.vercel.connected ? 'connected' : 'failed'}
                          </span>
                          {' • '}
                          <span className={integrationStatus.turso.connected ? 'text-green-400' : 'text-red-400'}>
                            Turso: {integrationStatus.turso.connected ? 'connected' : 'failed'}
                          </span>
                        </div>
                      )}
                    </div>

                    {integrationStatus && (!integrationStatus.vercel.connected || !integrationStatus.turso.connected) && (
                      <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-xs text-red-200">
                        {!integrationStatus.vercel.connected && <p>{integrationStatus.vercel.error}</p>}
                        {!integrationStatus.turso.connected && <p>{integrationStatus.turso.error}</p>}
                      </div>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">Requirements</p>
                      <p className="text-sm text-gray-400">Generate a first draft, then edit manually or by prompting.</p>
                    </div>
                    <button
                      type="button"
                      onClick={generateRequirements}
                      disabled={isReqGenerating || !formData.description}
                      className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isReqGenerating ? 'Generating…' : 'Generate requirements'}
                    </button>
                  </div>

                  <textarea
                    value={requirementsText}
                    onChange={(e) => setRequirementsText(e.target.value)}
                    placeholder="Click 'Generate requirements' or paste your own.\n\nExample:\n- [must] Authentication - Users can sign up/login\n- [must] Billing - Stripe subscriptions\n- [should] Team accounts - Invite members"
                    rows={8}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                  />

                  {requirementsDoc && (
                    <div className="text-xs text-gray-400">
                      Draft generated from your description. You can edit freely before deploying.
                    </div>
                  )}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGenerating || (advanced && !requirementsText.trim())}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating & Deploying...
                  </span>
                ) : advanced ? (
                  '🚀 Generate & Deploy (from requirements)'
                ) : (
                  '🚀 Generate & Deploy'
                )}
              </button>
            </form>
          </div>

          {isGenerating && asyncMode && jobId && (
            <div className="mt-6 rounded-xl border border-blue-700 bg-blue-950/30 p-4 text-sm text-blue-200">
              Background generation running. Tracking job: <span className="font-mono">{jobId}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="mt-8 bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
              {result.error ? (
                <div className="text-red-400">
                  <p className="font-semibold mb-2">❌ Error</p>
                  <p>{result.error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400 text-xl font-semibold">
                    <span>✅</span>
                    <span>SaaS Deployed!</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-900 p-4 rounded-lg">
                      <p className="text-gray-400 text-sm mb-1">Live URL</p>
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline break-all"
                      >
                        {result.url}
                      </a>
                    </div>


                    {result.vercelLinkedRepo !== undefined && (
                      <div className="bg-gray-900 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm mb-1">Vercel Git Integration</p>
                        <p className={result.vercelLinkedRepo ? 'text-green-400' : 'text-yellow-300'}>
                          {result.vercelLinkedRepo
                            ? 'Linked directly to the newly created GitHub repo (no manual clone/import needed).'
                            : 'Auto-linking failed; use manual import fallback below.'}
                        </p>
                      </div>
                    )}

                    {result.stripeUrl && (
                      <div className="bg-gray-900 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm mb-1">Stripe Dashboard</p>
                        <a 
                          href={result.stripeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          View payments →
                        </a>
                      </div>
                    )}

                    {result.supabaseUrl && (
                      <div className="bg-gray-900 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm mb-1">Supabase Dashboard</p>
                        <a 
                          href={result.supabaseUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          View database →
                        </a>
                      </div>
                    )}

                    {result.vercelImportUrl && (
                      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-4 rounded-lg border border-blue-700">
                        <p className="text-gray-400 text-sm mb-2">🚀 Final Step</p>
                        <a 
                          href={result.vercelImportUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition"
                        >
                          ▲ Deploy to Vercel
                        </a>
                      </div>
                    )}

                    {result.verification && (
                      <div className="bg-gray-900 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm mb-1">Deployment Verification</p>
                        <p className={result.verification.passed ? 'text-green-400' : 'text-yellow-300'}>
                          {result.verification.passed ? 'All post-deploy functional checks passed' : result.verification.pending ? 'Verification pending deployment propagation' : 'Verification warnings detected'}
                        </p>
                        {!result.verification.passed && (
                          <ul className="mt-2 text-xs text-yellow-200 list-disc pl-5">
                            {result.verification.errors.map((err) => (<li key={err}>{err}</li>))}
                          </ul>
                        )}
                      </div>
                    )}

                    {result.revenueReadiness && (
                      <div className="bg-gray-900 p-4 rounded-lg space-y-2">
                        <p className="text-gray-400 text-sm">Revenue Readiness Score</p>
                        <p className="text-xl font-semibold text-green-400">{result.revenueReadiness.score}%</p>
                        <div className="text-xs text-gray-300 grid grid-cols-2 gap-1">
                          <span>Billing: {result.revenueReadiness.checks.billing ? '✅' : '❌'}</span>
                          <span>Auth: {result.revenueReadiness.checks.authentication ? '✅' : '❌'}</span>
                          <span>Database: {result.revenueReadiness.checks.database ? '✅' : '❌'}</span>
                          <span>Deployment: {result.revenueReadiness.checks.deployment ? '✅' : '❌'}</span>
                          <span>Onboarding: {result.revenueReadiness.checks.onboarding ? '✅' : '❌'}</span>
                          <span>Analytics: {result.revenueReadiness.checks.analytics ? '✅' : '❌'}</span>
                        </div>
                      </div>
                    )}

                    {result.stats && (
                      <div className="bg-gray-900 p-4 rounded-lg text-xs text-gray-300 space-y-1">
                        <p>Generation Duration: {Math.round(result.stats.durationMs / 1000)}s</p>
                        <p>Uploaded Files: {result.stats.totalFiles - result.stats.failedFiles.length}/{result.stats.totalFiles}</p>
                        {result.stats.failedFiles.length > 0 && (
                          <p className="text-yellow-300">Failed files: {result.stats.failedFiles.join(', ')}</p>
                        )}
                      </div>
                    )}

                    {result.remediation && result.remediation.length > 0 && (
                      <div className="bg-gray-900 p-4 rounded-lg text-xs text-gray-300">
                        <p className="mb-2 font-semibold text-yellow-300">Suggested remediation commands</p>
                        <ul className="space-y-1 list-disc pl-5">
                          {result.remediation.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
