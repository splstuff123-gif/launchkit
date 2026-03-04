import { NextResponse } from 'next/server';
import { checkRateLimit, requestKey } from '@/lib/rate-limit';

type RequirementPriority = 'must' | 'should' | 'could';

type RequirementItem = {
  id: string;
  priority: RequirementPriority;
  title: string;
  description: string;
  sourceSnippet?: string;
  acceptanceCriteria?: string[];
  businessImpact?: string;
};

type ProductSpec = {
  version: 2;
  productName: string;
  productDescription: string;
  entities: Array<{ name: string; fields: string[] }>;
  userRoles: string[];
  workflows: string[];
  monetization: {
    model: 'subscription' | 'one_time' | 'usage';
    plans: string[];
  };
  analyticsEvents: string[];
  requirements: RequirementItem[];
  correlation?: {
    matchedSignals: string[];
    missingSignals: string[];
    coverageScore: number;
  };
};

type DescriptionSignals = {
  domain: 'marketplace' | 'creator' | 'b2b' | 'general';
  actors: string[];
  capabilities: string[];
  integrations: string[];
  monetizationHints: string[];
  analyticsHints: string[];
};

function unique(items: string[]) {
  return [...new Set(items.map((i) => i.trim()).filter(Boolean))];
}

function extractSignals(description: string): DescriptionSignals {
  const desc = description.toLowerCase();

  const domain: DescriptionSignals['domain'] = /marketplace|vendor|buyer|seller|booking|service provider|gig/.test(desc)
    ? 'marketplace'
    : /creator|content|newsletter|course|community|paywall|fans/.test(desc)
      ? 'creator'
      : /team|enterprise|crm|lead|dashboard|analytics|rbac|org/.test(desc)
        ? 'b2b'
        : 'general';

  const actors = unique([
    /admin|operator|owner/.test(desc) ? 'admin' : '',
    /team|employee|agent|member|manager/.test(desc) ? 'member' : '',
    /buyer|customer|client/.test(desc) ? 'buyer' : '',
    /seller|vendor|provider|creator/.test(desc) ? 'seller' : '',
    /subscriber|user/.test(desc) ? 'user' : '',
  ]);

  const capabilities = unique([
    /auth|login|signup|session/.test(desc) ? 'authentication' : '',
    /dashboard|report|analytics|metric|chart/.test(desc) ? 'dashboard analytics' : '',
    /notification|email|reminder/.test(desc) ? 'notifications' : '',
    /search|filter/.test(desc) ? 'search and filtering' : '',
    /workflow|automation/.test(desc) ? 'workflow automation' : '',
    /team|invite|seat|role|permission/.test(desc) ? 'team collaboration' : '',
    /onboarding|first-run|tutorial/.test(desc) ? 'onboarding' : '',
    /payment|billing|stripe|subscription|checkout/.test(desc) ? 'billing and subscriptions' : '',
  ]);

  const integrations = unique([
    /stripe/.test(desc) ? 'stripe' : '',
    /slack/.test(desc) ? 'slack' : '',
    /github/.test(desc) ? 'github' : '',
    /zapier/.test(desc) ? 'zapier' : '',
    /turso|database|sqlite|postgres/.test(desc) ? 'database' : '',
  ]);

  const monetizationHints = unique([
    /subscription|monthly|annual|recurring/.test(desc) ? 'subscription' : '',
    /usage|meter|per use|api call/.test(desc) ? 'usage' : '',
    /one-time|lifetime/.test(desc) ? 'one_time' : '',
    /trial|free trial|freemium/.test(desc) ? 'trial' : '',
  ]);

  const analyticsHints = unique([
    /conversion|trial-to-paid|activation/.test(desc) ? 'activation and conversion tracking' : '',
    /retention|churn/.test(desc) ? 'retention tracking' : '',
    /funnel/.test(desc) ? 'funnel tracking' : '',
  ]);

  return { domain, actors, capabilities, integrations, monetizationHints, analyticsHints };
}

function splitDescriptionHighlights(description: string): string[] {
  return unique(
    description
      .split(/[.!?\n]+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 8)
  ).slice(0, 5);
}

function buildAcceptanceCriteria(title: string, snippet: string, signals: DescriptionSignals): string[] {
  const criteria = [
    `Given the scenario "${snippet}", the ${title.toLowerCase()} flow completes without manual workarounds.`,
    'The flow has clear happy-path and failure-state handling with user-facing feedback.',
    'The flow is covered by at least one integration/smoke verification path.',
  ];

  if (signals.integrations.length > 0) {
    criteria.push(`Required integrations for this flow are configurable: ${signals.integrations.join(', ')}.`);
  }

  return criteria.slice(0, 4);
}

function enrichRequirements(requirements: RequirementItem[], description: string, signals: DescriptionSignals): RequirementItem[] {
  const highlights = splitDescriptionHighlights(description);
  return requirements.map((req, idx) => {
    const snippet = highlights[idx % Math.max(highlights.length, 1)] || description;
    return {
      ...req,
      sourceSnippet: req.sourceSnippet || snippet,
      acceptanceCriteria: req.acceptanceCriteria?.length
        ? req.acceptanceCriteria
        : buildAcceptanceCriteria(req.title, snippet, signals),
      businessImpact:
        req.businessImpact ||
        (req.priority === 'must'
          ? 'Critical for launch viability and revenue capture.'
          : 'Improves activation, retention, and operational confidence.'),
    };
  });
}

function inferSpec(name: string, description: string): ProductSpec {
  const signals = extractSignals(description);
  const highlights = splitDescriptionHighlights(description);

  const userRoles = signals.actors.length
    ? signals.actors
    : signals.domain === 'marketplace'
      ? ['admin', 'buyer', 'seller']
      : signals.domain === 'creator'
        ? ['admin', 'creator', 'subscriber']
        : ['admin', 'member'];

  const entities = signals.domain === 'marketplace'
    ? [
        { name: 'Listing', fields: ['title', 'price', 'status', 'category'] },
        { name: 'Order', fields: ['buyerId', 'sellerId', 'amount', 'status'] },
      ]
    : signals.domain === 'creator'
      ? [
          { name: 'Content', fields: ['title', 'body', 'visibility', 'publishedAt'] },
          { name: 'Subscription', fields: ['userId', 'plan', 'status', 'renewsAt'] },
        ]
      : [
          { name: 'Workspace', fields: ['name', 'ownerId', 'status'] },
          { name: 'Item', fields: ['title', 'priority', 'status', 'createdAt'] },
        ];

  const monetizationModel: ProductSpec['monetization']['model'] =
    signals.monetizationHints.includes('usage')
      ? 'usage'
      : signals.monetizationHints.includes('one_time')
        ? 'one_time'
        : 'subscription';

  const requirements: RequirementItem[] = [
    {
      id: '1',
      priority: 'must',
      title: 'Description-aligned core workflow',
      description: `Implement the core user journey described as: "${description}". Explicitly cover: ${highlights.join(' | ') || 'primary value journey'}.`,
    },
    {
      id: '2',
      priority: 'must',
      title: 'Authentication and role-based access',
      description: `Support role-aware access for: ${userRoles.join(', ')} and align permissions to prompt capabilities: ${signals.capabilities.join(', ') || 'authentication, onboarding'}.`,
    },
    {
      id: '3',
      priority: 'must',
      title: 'Data model that matches domain',
      description: `Implement entities and CRUD flows for: ${entities.map((e) => e.name).join(', ')} with statuses matching prompt behavior.`,
    },
    {
      id: '4',
      priority: 'must',
      title: 'Monetization implementation',
      description: `Implement ${monetizationModel} billing with checkout, webhook handling, and entitlement checks. Prompt monetization cues: ${signals.monetizationHints.join(', ') || 'subscription'}.`,
    },
    {
      id: '5',
      priority: 'should',
      title: 'Activation and analytics instrumentation',
      description: `Track lifecycle events for activation/conversion${signals.analyticsHints.length ? ` (${signals.analyticsHints.join(', ')})` : ''}.`,
    },
    {
      id: '6',
      priority: 'should',
      title: 'Production readiness and verification',
      description: 'Include health endpoint, readiness checks, DB connectivity checks, and smoke-test coverage.',
    },
  ];

  if (signals.capabilities.length) {
    requirements.push({
      id: '7',
      priority: 'should',
      title: 'Capability set from prompt',
      description: `Implement these requested capabilities: ${signals.capabilities.join(', ')}.`,
    });
  }

  if (signals.integrations.length) {
    requirements.push({
      id: '8',
      priority: 'could',
      title: 'External integrations',
      description: `Add integration-ready scaffolding for: ${signals.integrations.join(', ')}.`,
    });
  }

  const allSignals = unique([
    ...signals.capabilities,
    ...signals.integrations,
    ...signals.monetizationHints,
    ...signals.analyticsHints,
  ]);

  const enriched = enrichRequirements(requirements, description, signals);
  const reqText = enriched.map((r) => `${r.title} ${r.description} ${r.sourceSnippet ?? ''}`).join(' ').toLowerCase();
  const matchedSignals = allSignals.filter((signal) => reqText.includes(signal.split(' ')[0] || signal));
  const missingSignals = allSignals.filter((signal) => !matchedSignals.includes(signal));
  const coverageScore = allSignals.length === 0 ? 100 : Math.round((matchedSignals.length / allSignals.length) * 100);

  return {
    version: 2,
    productName: name || 'Untitled Product',
    productDescription: description,
    entities,
    userRoles,
    workflows: [
      'User onboarding and authentication',
      'Primary value-delivery workflow from product description',
      'Billing and access control lifecycle',
      ...splitDescriptionHighlights(description).map((h, i) => `Description focus ${i + 1}: ${h}`).slice(0, 2),
    ],
    monetization: {
      model: monetizationModel,
      plans: ['Starter', 'Pro'],
    },
    analyticsEvents: ['signup_completed', 'activation_completed', 'checkout_started', 'checkout_completed'],
    requirements: enriched,
    correlation: { matchedSignals, missingSignals, coverageScore },
  };
}

async function inferSpecWithLLM(name: string, description: string, openAiKey?: string): Promise<ProductSpec | null> {
  const apiKey = openAiKey?.trim() || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'Return ONLY valid JSON for ProductSpec v2 with fields: version, productName, productDescription, entities, userRoles, workflows, monetization, analyticsEvents, requirements.',
          },
          {
            role: 'user',
            content: `Name: ${name}\nDescription: ${description}`,
          },
        ],
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content) as ProductSpec;
  } catch {
    return null;
  }
}

function normalizeAndCorrelate(spec: ProductSpec, name: string, description: string): ProductSpec {
  const inferred = inferSpec(name, description);
  const normalized: ProductSpec = {
    ...spec,
    productName: spec.productName || inferred.productName,
    productDescription: spec.productDescription || inferred.productDescription,
    entities: spec.entities?.length ? spec.entities : inferred.entities,
    userRoles: spec.userRoles?.length ? spec.userRoles : inferred.userRoles,
    workflows: spec.workflows?.length ? spec.workflows : inferred.workflows,
    monetization: spec.monetization?.model ? spec.monetization : inferred.monetization,
    analyticsEvents: spec.analyticsEvents?.length ? spec.analyticsEvents : inferred.analyticsEvents,
    requirements: spec.requirements?.length ? spec.requirements : inferred.requirements,
  };

  const signals = extractSignals(description);
  normalized.requirements = enrichRequirements(normalized.requirements, description, signals);

  const reqText = normalized.requirements
    .map((r) => `${r.title} ${r.description} ${r.sourceSnippet ?? ''}`.toLowerCase())
    .join(' ');
  const signalCandidates = unique([
    ...signals.capabilities,
    ...signals.integrations,
    ...signals.monetizationHints,
    ...signals.analyticsHints,
  ]);

  const matchedSignals = signalCandidates.filter((signal) => reqText.includes(signal.split(' ')[0] || signal));
  const missingSignals = signalCandidates.filter((signal) => !matchedSignals.includes(signal));

  if (missingSignals.length > 0) {
    normalized.requirements = enrichRequirements(
      [
        ...normalized.requirements,
        {
          id: `auto-${normalized.requirements.length + 1}`,
          priority: 'should',
          title: 'Prompt-correlation gap closure',
          description: `Add explicit support for missing prompt signals: ${missingSignals.join(', ')}.`,
        },
      ],
      description,
      signals
    );
  }

  normalized.correlation = {
    matchedSignals,
    missingSignals,
    coverageScore: signalCandidates.length === 0 ? 100 : Math.round((matchedSignals.length / signalCandidates.length) * 100),
  };

  return normalized;
}

function validateSpec(spec: ProductSpec): string[] {
  const errors: string[] = [];
  if (!spec.productName) errors.push('productName is required');
  if (!spec.productDescription) errors.push('productDescription is required');
  if (!Array.isArray(spec.entities) || spec.entities.length === 0) errors.push('entities must be non-empty');
  if (!Array.isArray(spec.userRoles) || spec.userRoles.length === 0) errors.push('userRoles must be non-empty');
  if (!Array.isArray(spec.workflows) || spec.workflows.length === 0) errors.push('workflows must be non-empty');
  if (!spec.monetization?.model) errors.push('monetization.model is required');
  if (!Array.isArray(spec.requirements) || spec.requirements.length === 0) errors.push('requirements must be non-empty');
  return errors;
}

export async function POST(request: Request) {
  const limit = checkRateLimit(requestKey(request));
  if (!limit.ok) {
    return NextResponse.json({ error: 'Rate limit exceeded. Please retry shortly.' }, { status: 429 });
  }

  try {
    const { name, description, openAiKey } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Missing description' }, { status: 400 });
    }

    const safeName = String(name || '');
    const safeDescription = String(description || '');

    const llmSpec = await inferSpecWithLLM(safeName, safeDescription, openAiKey ? String(openAiKey) : undefined);
    let spec = normalizeAndCorrelate(llmSpec || inferSpec(safeName, safeDescription), safeName, safeDescription);

    let errors = validateSpec(spec);
    if (errors.length > 0) {
      spec = normalizeAndCorrelate(
        {
          ...spec,
          entities: spec.entities?.length ? spec.entities : [{ name: 'Item', fields: ['name'] }],
          userRoles: spec.userRoles?.length ? spec.userRoles : ['admin', 'member'],
          workflows: spec.workflows?.length ? spec.workflows : ['Core workflow'],
          requirements: spec.requirements?.length
            ? spec.requirements
            : [
                {
                  id: 'fallback-1',
                  priority: 'must',
                  title: 'Core functionality',
                  description: `Implement core flow matching: "${safeDescription}"`,
                },
              ],
        },
        safeName,
        safeDescription
      );
      errors = validateSpec(spec);
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: `Spec validation failed: ${errors.join(', ')}` }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      doc: spec,
      promptSuggestion:
        'Edit requirements with prompt-correlation in mind. You can ask: "expand description highlights", "turn signal X into acceptance criteria", "add onboarding KPI", "add checkout recovery flow".',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate requirements';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
