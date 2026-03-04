import { promises as fs } from 'fs';
import path from 'path';

export type AnalyticsEvent = {
  type: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

const events: AnalyticsEvent[] = [];
const ANALYTICS_FILE = path.join(process.cwd(), '.launchkit-analytics.jsonl');

async function persistEvent(event: AnalyticsEvent) {
  try {
    await fs.appendFile(ANALYTICS_FILE, `${JSON.stringify(event)}\n`, 'utf8');
  } catch {
    // Best effort only. In serverless env this may be ephemeral/unavailable.
  }
}

export async function trackEvent(type: string, metadata?: Record<string, unknown>) {
  const event: AnalyticsEvent = {
    type,
    metadata,
    timestamp: new Date().toISOString(),
  };

  events.push(event);

  if (events.length > 5000) {
    events.shift();
  }

  await persistEvent(event);
}

export function listEvents() {
  return events;
}

export function getFunnelMetrics() {
  const count = (type: string) => events.filter((e) => e.type === type).length;

  return {
    ideaSubmitted: count('idea_submitted'),
    requirementsAccepted: count('requirements_accepted'),
    generationStarted: count('generation_started'),
    generationCompleted: count('generation_completed'),
    deploymentSuccess: count('deployment_success'),
    firstPaidConversion: count('first_paid_conversion'),
  };
}
