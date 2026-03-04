export type GenerationJobStatus = 'queued' | 'running' | 'succeeded' | 'failed';

export type GenerationJob = {
  id: string;
  status: GenerationJobStatus;
  createdAt: string;
  updatedAt: string;
  progress: number;
  step?: string;
  result?: Record<string, unknown>;
  error?: string;
};

const jobs = new Map<string, GenerationJob>();

export function createJob(): GenerationJob {
  const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const job: GenerationJob = {
    id,
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    progress: 0,
    step: 'Queued',
  };
  jobs.set(id, job);
  return job;
}

export function updateJob(id: string, patch: Partial<GenerationJob>) {
  const existing = jobs.get(id);
  if (!existing) return;
  jobs.set(id, {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

export function getJob(id: string) {
  return jobs.get(id) || null;
}
