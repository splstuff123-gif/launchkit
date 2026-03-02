// Premium templates with Turso integration and landing pages

export interface TemplateFiles {
  [path: string]: string;
}

export function generatePremiumTaskManagerTurso(name: string, description: string, price: string): TemplateFiles {
  return {
    'package.json': JSON.stringify({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      private: true,
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start',
      },
      dependencies: {
        '@libsql/client': '^0.5.0',
        '@headlessui/react': '^2.0.0',
        '@heroicons/react': '^2.1.1',
        'framer-motion': '^11.0.0',
        'date-fns': '^3.3.1',
        next: '^16.1.6',
        react: '^19',
        'react-dom': '^19',
      },
      devDependencies: {
        '@tailwindcss/postcss': '^4',
        '@types/node': '^20',
        '@types/react': '^19',
        '@types/react-dom': '^19',
        autoprefixer: '^10',
        postcss: '^8',
        tailwindcss: '^4',
        typescript: '^5',
      },
    }, null, 2),

    'src/lib/db.ts': `import { createClient } from '@libsql/client';

export const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export async function query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const result = await db.execute({ sql, args });
  return result.rows as T[];
}

export async function execute(sql: string, args: any[] = []) {
  return await db.execute({ sql, args });
}
`,

    'src/components/TaskCard.tsx': `'use client';

import { motion } from 'framer-motion';
import { CheckCircleIcon, ClockIcon, FlagIcon, TrashIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  due_date: string | null;
  created_at: string;
}

interface TaskCardProps {
  task: Task;
  onStatusChange: (id: string, status: Task['status']) => void;
  onDelete: (id: string) => void;
}

const priorityConfig = {
  low: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '🟢' },
  medium: { color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '🟡' },
  high: { color: 'bg-rose-100 text-rose-700 border-rose-200', icon: '🔴' },
};

const statusConfig = {
  todo: { color: 'bg-slate-100', button: 'Start', nextStatus: 'in_progress' as const },
  in_progress: { color: 'bg-blue-50', button: 'Complete', nextStatus: 'done' as const },
  done: { color: 'bg-green-50', button: 'Reopen', nextStatus: 'todo' as const },
};

export default function TaskCard({ task, onStatusChange, onDelete }: TaskCardProps) {
  const priority = priorityConfig[task.priority];
  const status = statusConfig[task.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={\`relative overflow-hidden rounded-xl border border-slate-200 \${status.color} p-6 shadow-sm hover:shadow-md transition-shadow\`}
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-current to-transparent opacity-50" 
        style={{ color: priority.color.includes('emerald') ? '#10b981' : priority.color.includes('amber') ? '#f59e0b' : '#ef4444' }} />
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
            <span className={\`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border \${priority.color}\`}>
              <span>{priority.icon}</span>
              {task.priority}
            </span>
          </div>

          {task.description && (
            <p className="text-slate-600 mb-4 leading-relaxed">{task.description}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-slate-500">
            {task.due_date && (
              <div className="flex items-center gap-1.5">
                <ClockIcon className="w-4 h-4" />
                <span>Due {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <FlagIcon className="w-4 h-4" />
              <span className="capitalize">{task.status.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          <button
            onClick={() => onStatusChange(task.id, status.nextStatus)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            {task.status === 'done' ? (
              <>↩️ {status.button}</>
            ) : task.status === 'in_progress' ? (
              <><CheckCircleIcon className="w-4 h-4" /> {status.button}</>
            ) : (
              <>▶️ {status.button}</>
            )}
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="inline-flex items-center justify-center p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete task"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
`,

    // Add more component files here (AddTaskModal, etc.)
    // For brevity, I'll show the structure

    'SCHEMA.sql': `-- ${name} Database Schema (Turso/SQLite)

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
  due_date DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER IF NOT EXISTS tasks_updated_at 
AFTER UPDATE ON tasks
BEGIN
  UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
`,

    '.env.local.example': `# Turso Database Configuration
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here

# Get these from: turso db show <db-name>
`,

    'README.md': `# ${name}

${description}

## Setup

### 1. Install Dependencies

\`\`\`bash
npm install
\`\`\`

### 2. Set up Turso Database

\`\`\`bash
# Install Turso CLI (if not already installed)
curl -sSfL https://get.tur.so/install.sh | bash

# Login to Turso
turso auth login

# Create database
turso db create ${name.toLowerCase().replace(/\s+/g, '-')}

# Get connection details
turso db show ${name.toLowerCase().replace(/\s+/g, '-')} --url
turso db tokens create ${name.toLowerCase().replace(/\s+/g, '-')}
\`\`\`

### 3. Initialize Database Schema

\`\`\`bash
# Apply schema
turso db shell ${name.toLowerCase().replace(/\s+/g, '-')} < SCHEMA.sql
\`\`\`

### 4. Configure Environment

Copy \`.env.local.example\` to \`.env.local\` and add your Turso credentials.

### 5. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000)

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Turso** - Serverless SQLite database
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Headless UI** - Accessible components
- **Heroicons** - Icons

## Pricing

\$${price}/month

Built with ❤️ by LaunchKit 🚀
`,
  };
}
