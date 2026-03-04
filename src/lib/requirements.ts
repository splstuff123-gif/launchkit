export type Requirement = {
  id: string;
  title: string;
  description?: string;
  priority: 'must' | 'should' | 'could';
};

export type RequirementsDoc = {
  version: 1;
  productName: string;
  productDescription: string;
  requirements: Requirement[];
};

export function parseRequirementsText(text: string): RequirementsDoc {
  // Very forgiving parser:
  // - Accepts JSON if provided
  // - Otherwise parses simple markdown-ish lines like:
  //   - [must] Authentication: Users can sign up...
  //   - must: Authentication - Users can...

  const trimmed = (text || '').trim();
  if (!trimmed) {
    throw new Error('No requirements provided');
  }

  // JSON path
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const obj: unknown = JSON.parse(trimmed);
      if (Array.isArray(obj)) {
        return {
          version: 1,
          productName: 'Untitled',
          productDescription: '',
          requirements: obj.map((r: unknown, idx: number) => {
            const rr = r as Record<string, unknown>;
            const priorityRaw = rr.priority;
            const priority: Requirement['priority'] =
              priorityRaw === 'must' || priorityRaw === 'should' || priorityRaw === 'could'
                ? priorityRaw
                : 'must';
            return {
              id: String(rr.id ?? idx + 1),
              title: String(rr.title ?? rr.name ?? `Requirement ${idx + 1}`),
              description: rr.description ? String(rr.description) : undefined,
              priority,
            };
          }),
        };
      }

      if (obj && typeof obj === 'object') {
        const o = obj as Record<string, unknown>;
        const reqs = Array.isArray(o.requirements) ? (o.requirements as unknown[]) : [];
        return {
          version: 1,
          productName: String(o.productName ?? o.name ?? 'Untitled'),
          productDescription: String(o.productDescription ?? o.description ?? ''),
          requirements: reqs.map((r: unknown, idx: number) => {
            const rr = r as Record<string, unknown>;
            const priorityRaw = rr.priority;
            const priority: Requirement['priority'] =
              priorityRaw === 'must' || priorityRaw === 'should' || priorityRaw === 'could'
                ? priorityRaw
                : 'must';
            return {
              id: String(rr.id ?? idx + 1),
              title: String(rr.title ?? rr.name ?? `Requirement ${idx + 1}`),
              description: rr.description ? String(rr.description) : undefined,
              priority,
            };
          }),
        };
      }
    } catch {
      // fall through
    }
  }

  const lines = trimmed.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const requirements: Requirement[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // remove bullets
    const clean = line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '');

    const m1 = clean.match(/^\[?(must|should|could)\]?\s*[:\-]\s*(.+)$/i);
    const priority = (m1?.[1]?.toLowerCase() as Requirement['priority'] | undefined) ?? 'must';
    const rest = (m1?.[2] ?? clean).trim();

    // Split title/description on " - " if present
    const parts = rest.split(/\s+-\s+/, 2);
    const title = parts[0].trim();
    const description = parts[1]?.trim();

    if (!title) continue;

    requirements.push({
      id: String(requirements.length + 1),
      title,
      description,
      priority,
    });
  }

  return {
    version: 1,
    productName: 'Untitled',
    productDescription: '',
    requirements,
  };
}

export function requirementsToText(doc: RequirementsDoc): string {
  return doc.requirements
    .map(r => `- [${r.priority}] ${r.title}${r.description ? ` - ${r.description}` : ''}`)
    .join('\n');
}
