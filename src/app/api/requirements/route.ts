import { NextResponse } from 'next/server';

type RequirementPriority = 'must' | 'should' | 'could';

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
  requirements: Array<{
    id: string;
    priority: RequirementPriority;
    title: string;
    description: string;
  }>;
};

function inferSpec(name: string, description: string): ProductSpec {
  const desc = description.toLowerCase();
  const isMarketplace = /marketplace|vendor|buyer|seller|booking|service/.test(desc);
  const isCreator = /creator|content|newsletter|course|community|paywall/.test(desc);

  const userRoles = isMarketplace
    ? ['admin', 'buyer', 'seller']
    : isCreator
      ? ['admin', 'creator', 'subscriber']
      : ['admin', 'member'];

  const entities = isMarketplace
    ? [
        { name: 'Listing', fields: ['title', 'price', 'status'] },
        { name: 'Order', fields: ['buyerId', 'sellerId', 'amount', 'status'] },
      ]
    : isCreator
      ? [
          { name: 'Content', fields: ['title', 'body', 'visibility'] },
          { name: 'Subscription', fields: ['userId', 'plan', 'status'] },
        ]
      : [
          { name: 'Project', fields: ['name', 'ownerId', 'status'] },
          { name: 'Task', fields: ['title', 'priority', 'status', 'dueDate'] },
        ];

  return {
    version: 2,
    productName: name || 'Untitled Product',
    productDescription: description,
    entities,
    userRoles,
    workflows: [
      'User onboarding and authentication',
      'Core object creation/edit/delete workflow',
      'Billing subscription and access gating workflow',
    ],
    monetization: {
      model: 'subscription',
      plans: ['Starter', 'Pro'],
    },
    analyticsEvents: ['signup_completed', 'project_created', 'checkout_started', 'checkout_completed'],
    requirements: [
      {
        id: '1',
        priority: 'must',
        title: 'Authentication & Roles',
        description: `Support login/signup and role-aware access for: ${userRoles.join(', ')}`,
      },
      {
        id: '2',
        priority: 'must',
        title: 'Core Domain Data Model',
        description: `Implement entities: ${entities.map((e) => e.name).join(', ')}`,
      },
      {
        id: '3',
        priority: 'must',
        title: 'Monetization',
        description: 'Stripe checkout + subscription lifecycle webhook + plan-based feature gating',
      },
      {
        id: '4',
        priority: 'should',
        title: 'Analytics Instrumentation',
        description: 'Track funnel events for signup, activation, and billing conversion',
      },
      {
        id: '5',
        priority: 'should',
        title: 'Production Readiness',
        description: 'Health endpoint, DB connectivity checks, and smoke test support',
      },
    ],
  };
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
  try {
    const { name, description } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Missing description' }, { status: 400 });
    }

    let spec = inferSpec(String(name || ''), String(description || ''));

    // Fail/repair loop: if schema validation fails, apply minimal repair once.
    let errors = validateSpec(spec);
    if (errors.length > 0) {
      spec = {
        ...spec,
        entities: spec.entities.length ? spec.entities : [{ name: 'Item', fields: ['name'] }],
        userRoles: spec.userRoles.length ? spec.userRoles : ['admin', 'member'],
        workflows: spec.workflows.length ? spec.workflows : ['Core workflow'],
        requirements: spec.requirements.length
          ? spec.requirements
          : [
              {
                id: 'fallback-1',
                priority: 'must',
                title: 'Core functionality',
                description: 'Implement core product flow',
              },
            ],
      };
      errors = validateSpec(spec);
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: `Spec validation failed: ${errors.join(', ')}` }, { status: 422 });
    }

    return NextResponse.json({
      success: true,
      doc: spec,
      promptSuggestion:
        'Edit these requirements/spec fields. You can ask: "add team seats", "add trial plan", "track activation event".',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate requirements';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
