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
const MAX_JOBS = 200;
const JOB_TTL_MS = 1000 * 60 * 60 * 6;

function gcJobs() {
  const now = Date.now();
  for (const [id, job] of jobs.entries()) {
    const updatedAt = Date.parse(job.updatedAt);
    if (Number.isFinite(updatedAt) && now - updatedAt > JOB_TTL_MS) {
      jobs.delete(id);
    }
  }

  if (jobs.size <= MAX_JOBS) return;

  const ordered = [...jobs.values()].sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
  const toDelete = ordered.slice(0, jobs.size - MAX_JOBS);
  for (const job of toDelete) jobs.delete(job.id);
}

export function createJob(): GenerationJob {
  gcJobs();
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
  gcJobs();
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
