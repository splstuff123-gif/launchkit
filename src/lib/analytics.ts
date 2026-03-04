export type AnalyticsEvent = {
  type: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

const events: AnalyticsEvent[] = [];

export function trackEvent(type: string, metadata?: Record<string, unknown>) {
  events.push({
    type,
    metadata,
    timestamp: new Date().toISOString(),
  });

  if (events.length > 5000) {
    events.shift();
  }
}

export function listEvents() {
  return events;
}
