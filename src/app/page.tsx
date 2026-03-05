'use client';

import { useMemo, useState } from 'react';

type RequirementDocView = {
  version: number;
  productName: string;
  productDescription: string;
  correlation?: {
    matchedSignals: string[];
    missingSignals: string[];
    coverageScore: number;
  };
  requirements: Array<{
    id: string;
    priority: 'must' | 'should' | 'could';
    title: string;
    description?: string;
    sourceSnippet?: string;
    acceptanceCriteria?: string[];
    businessImpact?: string;
  }>;
};

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
  });

  const [advanced, setAdvanced] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isReqGenerating, setIsReqGenerating] = useState(false);
  const [requirementsDoc, setRequirementsDoc] = useState<RequirementDocView | null>(null);
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
  const [figmaToken, setFigmaToken] = useState('');
  const [openAiKey, setOpenAiKey] = useState('');
  const [requirementsPromptEdit, setRequirementsPromptEdit] = useState('');
  const [isTestingIntegrations, setIsTestingIntegrations] = useState(false);
  const [isTestingOpenAiKey, setIsTestingOpenAiKey] = useState(false);
  const [isGeneratingMockupBrief, setIsGeneratingMockupBrief] = useState(false);
  const [integrationStatus, setIntegrationStatus] = useState<{
    vercel: IntegrationStatus;
    turso: IntegrationStatus;
    openai: IntegrationStatus;
    figma: IntegrationStatus;
  } | null>(null);

  const [asyncMode, setAsyncMode] = useState(true);
  const [jobId, setJobId] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<'landing' | 'app'>('landing');
  const [figmaMockupBrief, setFigmaMockupBrief] = useState<{ prompt: string; figmaUrl: string } | null>(null);

  const previewName = formData.name.trim() || 'Your SaaS';
  const previewPrice = formData.price.trim() || '29';
  const previewType = useMemo(() => {
    const desc = formData.description.toLowerCase();
    if (/marketplace|vendor|buyer|seller|booking|service/.test(desc)) return 'Marketplace SaaS';
    if (/creator|course|newsletter|community|content|fans/.test(desc)) return 'Creator SaaS';
    if (/team|enterprise|crm|dashboard|analytics|b2b|sales/.test(desc)) return 'B2B SaaS';
    return 'Productivity SaaS';
  }, [formData.description]);

  const generateRequirements = async () => {
    setIsReqGenerating(true);
    setResult(null);
    try {
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          ...(openAiKey.trim() ? { openAiKey: openAiKey.trim() } : {}),
          ...(requirementsPromptEdit.trim() ? { additionalPrompt: requirementsPromptEdit.trim() } : {}),
        }),
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
        body: JSON.stringify({ vercelToken, tursoToken, openAiKey, figmaToken }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setIntegrationStatus({
        vercel: data.vercel,
        turso: data.turso,
        openai: data.openai || { connected: false, error: 'OpenAI status unavailable' },
        figma: data.figma || { connected: false, error: 'Figma status unavailable' },
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to test integrations';
      setResult({ error: msg });
      setIntegrationStatus(null);
    } finally {
      setIsTestingIntegrations(false);
    }
  };

  const validateOpenAiKey = async () => {
    setIsTestingOpenAiKey(true);
    setResult(null);

    try {
      const response = await fetch('/api/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openAiKey }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setIntegrationStatus((previous) => ({
        vercel: previous?.vercel || { connected: false },
        turso: previous?.turso || { connected: false },
        openai: data.openai || { connected: false, error: 'OpenAI status unavailable' },
        figma: data.figma || { connected: false, error: 'Figma status unavailable' },
      }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to validate OpenAI key';
      setResult({ error: msg });
    } finally {
      setIsTestingOpenAiKey(false);
    }
  };

  const generateFigmaMockupBrief = async () => {
    setIsGeneratingMockupBrief(true);
    setResult(null);

    try {
      const response = await fetch('/api/mockups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          price: formData.price,
          additionalPrompt: requirementsPromptEdit,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setFigmaMockupBrief({ prompt: data.figmaPrompt, figmaUrl: data.figmaUrl });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to generate Figma mockup brief';
      setResult({ error: msg });
    } finally {
      setIsGeneratingMockupBrief(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    let startedAsyncPolling = false;

    try {
      const payload: Record<string, unknown> = { ...formData, async: asyncMode };
      if (advanced) {
        payload.requirements = requirementsText;
        if (vercelToken.trim()) payload.vercelToken = vercelToken.trim();
        if (tursoToken.trim()) payload.tursoToken = tursoToken.trim();
      }

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (asyncMode && data.jobId) {
        startedAsyncPolling = true;
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
      if (!startedAsyncPolling) {
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

                    <div>
                      <label htmlFor="figmaToken" className="mb-2 block text-sm font-medium text-gray-300">Figma Token (for API validation)</label>
                      <input
                        id="figmaToken"
                        type="password"
                        value={figmaToken}
                        onChange={(e) => setFigmaToken(e.target.value)}
                        placeholder="figd_..."
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="openAiKey" className="mb-2 block text-sm font-medium text-gray-300">OpenAI API Key (optional for richer requirements)</label>
                      <input
                        id="openAiKey"
                        type="password"
                        value={openAiKey}
                        onChange={(e) => setOpenAiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={validateOpenAiKey}
                        disabled={isTestingOpenAiKey || !openAiKey.trim()}
                        className="mt-3 rounded-lg border border-gray-600 bg-gray-900 px-4 py-2 text-sm font-semibold hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isTestingOpenAiKey ? 'Validating OpenAI key…' : 'Validate OpenAI key'}
                      </button>
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
                          {' • '}
                          <span className={integrationStatus.openai.connected ? 'text-green-400' : 'text-red-400'}>
                            OpenAI: {integrationStatus.openai.connected ? 'connected' : 'failed'}
                          </span>
                          {' • '}
                          <span className={integrationStatus.figma.connected ? 'text-green-400' : 'text-red-400'}>
                            Figma: {integrationStatus.figma.connected ? 'connected' : 'failed'}
                          </span>
                        </div>
                      )}
                    </div>

                    {integrationStatus && (!integrationStatus.vercel.connected || !integrationStatus.turso.connected || !integrationStatus.openai.connected || !integrationStatus.figma.connected) && (
                      <div className="rounded-lg border border-red-900 bg-red-950/40 p-3 text-xs text-red-200">
                        {!integrationStatus.vercel.connected && <p>{integrationStatus.vercel.error}</p>}
                        {!integrationStatus.turso.connected && <p>{integrationStatus.turso.error}</p>}
                        {!integrationStatus.openai.connected && <p>{integrationStatus.openai.error}</p>}
                        {!integrationStatus.figma.connected && <p>{integrationStatus.figma.error}</p>}
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
                    <button
                      type="button"
                      onClick={generateFigmaMockupBrief}
                      disabled={isGeneratingMockupBrief || !formData.name || !formData.description}
                      className="px-4 py-2 rounded-lg bg-indigo-800 hover:bg-indigo-700 border border-indigo-600 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingMockupBrief ? 'Generating mockup brief…' : 'Generate Figma AI mockup brief'}
                    </button>
                  </div>

                  <div>
                    <label htmlFor="requirementsPromptEdit" className="mb-2 block text-sm font-medium text-gray-300">Additional prompt edits (optional)</label>
                    <textarea
                      id="requirementsPromptEdit"
                      value={requirementsPromptEdit}
                      onChange={(e) => setRequirementsPromptEdit(e.target.value)}
                      placeholder="Example: prioritize enterprise RBAC, add audit logs, include SOC2-ready controls, and detail onboarding acceptance criteria."
                      rows={3}
                      className="w-full rounded-lg border border-gray-600 bg-gray-900 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">This refines the consulting-style requirements response generated from your description.</p>
                  </div>

                  <textarea
                    value={requirementsText}
                    onChange={(e) => setRequirementsText(e.target.value)}
                    placeholder="Click 'Generate requirements' or paste your own.\n\nExample:\n- [must] Authentication - Users can sign up/login\n- [must] Billing - Stripe subscriptions\n- [should] Team accounts - Invite members"
                    rows={8}
                    className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                  />


                  {figmaMockupBrief && (
                    <div className="rounded-lg border border-indigo-700 bg-indigo-950/30 p-3 text-xs text-indigo-100 space-y-2">
                      <p className="font-semibold">Figma AI mockup brief ready</p>
                      <a href={figmaMockupBrief.figmaUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-300 underline">Open Figma →</a>
                      <pre className="max-h-44 overflow-y-auto whitespace-pre-wrap rounded bg-black/30 p-2 text-[11px]">{figmaMockupBrief.prompt}</pre>
                    </div>
                  )}

                  {requirementsDoc && (
                    <div className="space-y-3">
                      <div className="text-xs text-gray-400">
                        Draft generated from your description. You can edit freely before deploying.
                      </div>

                      {requirementsDoc.correlation && (
                        <div className="rounded-lg border border-gray-700 bg-gray-950/50 p-3 text-xs">
                          <p className="font-semibold text-gray-200">Prompt correlation score: <span className={requirementsDoc.correlation.coverageScore >= 80 ? 'text-green-400' : 'text-yellow-300'}>{requirementsDoc.correlation.coverageScore}%</span></p>
                          <p className="mt-1 text-gray-400">Matched: {requirementsDoc.correlation.matchedSignals.join(', ') || 'None'}</p>
                          {requirementsDoc.correlation.missingSignals.length > 0 && (
                            <p className="mt-1 text-yellow-300">Missing signals: {requirementsDoc.correlation.missingSignals.join(', ')}</p>
                          )}
                        </div>
                      )}

                      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                        {requirementsDoc.requirements.slice(0, 5).map((req) => (
                          <div key={req.id} className="rounded-lg border border-gray-700 bg-gray-950/40 p-3 text-xs text-gray-300">
                            <p className="font-semibold text-gray-100">{req.title}</p>
                            {req.sourceSnippet && <p className="mt-1 text-gray-400">Source: {req.sourceSnippet}</p>}
                            {req.businessImpact && <p className="mt-1 text-emerald-300">Impact: {req.businessImpact}</p>}
                            {req.acceptanceCriteria && req.acceptanceCriteria.length > 0 && (
                              <ul className="mt-1 list-disc pl-5 text-gray-400">
                                {req.acceptanceCriteria.slice(0, 2).map((criterion) => (
                                  <li key={criterion}>{criterion}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}


              {/* Output Preview */}
              <div className="rounded-2xl border border-indigo-700/50 bg-indigo-950/20 p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Live output preview</p>
                    <p className="text-sm text-gray-400">Visualize what LaunchKit will generate before deploy.</p>
                  </div>
                  <div className="inline-flex rounded-lg border border-gray-700 bg-gray-900 p-1 text-xs">
                    <button
                      type="button"
                      onClick={() => setPreviewTab('landing')}
                      className={`rounded-md px-3 py-1 transition ${previewTab === 'landing' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                    >
                      Landing
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab('app')}
                      className={`rounded-md px-3 py-1 transition ${previewTab === 'app' ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-800'}`}
                    >
                      App UI
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                  {previewTab === 'landing' ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-indigo-500/30 bg-gradient-to-r from-indigo-900/50 to-purple-900/40 p-4">
                        <p className="text-xs uppercase tracking-wider text-indigo-300">{previewType}</p>
                        <h3 className="mt-1 text-2xl font-bold text-white">{previewName}</h3>
                        <p className="mt-2 text-sm text-gray-300">{formData.description.trim() || 'AI-powered product experience generated from your prompt.'}</p>
                        <div className="mt-4 flex items-center gap-4">
                          <button type="button" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold">Start free trial</button>
                          <p className="text-sm text-gray-300">From <span className="font-semibold text-white">${previewPrice}/mo</span></p>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-300">
                        <div className="rounded-md border border-gray-700 bg-gray-950 p-2">✅ Onboarding flow</div>
                        <div className="rounded-md border border-gray-700 bg-gray-950 p-2">✅ Billing & checkout</div>
                        <div className="rounded-md border border-gray-700 bg-gray-950 p-2">✅ Health + ready checks</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-md border border-gray-700 bg-gray-950 p-3">
                        <div>
                          <p className="font-semibold">{previewName} workspace</p>
                          <p className="text-xs text-gray-400">Operator dashboard preview</p>
                        </div>
                        <span className="rounded-full bg-emerald-900/40 px-2 py-1 text-xs text-emerald-300">Revenue ready</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-md border border-gray-700 bg-gray-950 p-3 text-gray-300">MRR widget</div>
                        <div className="rounded-md border border-gray-700 bg-gray-950 p-3 text-gray-300">Trial conversion funnel</div>
                        <div className="rounded-md border border-gray-700 bg-gray-950 p-3 text-gray-300">Recent signups</div>
                        <div className="rounded-md border border-gray-700 bg-gray-950 p-3 text-gray-300">Action center</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

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
