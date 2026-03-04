import { NextResponse } from 'next/server';

// Placeholder "requirements generator".
// Today it returns a structured checklist derived from the description.
// Later we can swap this for an LLM call + tool routing.

export async function POST(request: Request) {
  try {
    const { name, description } = await request.json();

    if (!description) {
      return NextResponse.json({ error: 'Missing description' }, { status: 400 });
    }

    const requirements = [
      {
        id: '1',
        priority: 'must',
        title: 'Authentication',
        description: 'Users can sign up, log in, and log out',
      },
      {
        id: '2',
        priority: 'must',
        title: 'Core CRUD',
        description: `Users can create, view, edit, and delete the main objects for: ${name || 'the product'}`,
      },
      {
        id: '3',
        priority: 'must',
        title: 'Billing',
        description: 'Stripe checkout + subscription gating for paid features',
      },
      {
        id: '4',
        priority: 'should',
        title: 'Onboarding',
        description: 'First-run setup, empty states, and sample data',
      },
      {
        id: '5',
        priority: 'should',
        title: 'Beautiful UI',
        description: 'Consistent components, spacing, typography, and responsive layout',
      },
      {
        id: '6',
        priority: 'could',
        title: 'Admin / Settings',
        description: 'Profile, preferences, and basic usage analytics',
      },
    ];

    return NextResponse.json({
      success: true,
      doc: {
        version: 1,
        productName: name || 'Untitled',
        productDescription: description,
        requirements,
      },
      promptSuggestion:
        'Edit these requirements. You can ask: "add team accounts", "remove billing", "make it mobile-first", etc.',
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to generate requirements';
    return NextResponse.json(
      { error: msg },
      { status: 500 }
    );
  }
}
