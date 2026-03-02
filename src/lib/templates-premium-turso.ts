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

    'src/lib/db.ts': `import { createClient, type Client } from '@libsql/client';

let dbInstance: Client | null = null;

function getDb(): Client {
  if (!dbInstance) {
    if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
      throw new Error('Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN environment variables');
    }
    
    dbInstance = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  
  return dbInstance;
}

export const db = {
  execute: async (sql: any) => {
    return await getDb().execute(sql);
  },
};

export async function query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const result = await getDb().execute({ sql, args });
  return result.rows as T[];
}

export async function execute(sql: string, args: any[] = []) {
  return await getDb().execute({ sql, args });
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

    'src/components/AddTaskModal.tsx': `'use client';

import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (task: {
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    due_date: string;
  }) => void;
}

export default function AddTaskModal({ isOpen, onClose, onAdd }: AddTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    onAdd(formData);
    setFormData({ title: '', description: '', priority: 'medium', due_date: '' });
    onClose();
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-2xl font-bold text-slate-900">
                    Create New Task
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Review Q4 budget proposal"
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Add details about this task..."
                      rows={3}
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Priority
                      </label>
                      <select
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="low">🟢 Low</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="high">🔴 High</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-3 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
                    >
                      Create Task
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
`,

    'src/app/page.tsx': `'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/db';
import TaskCard from '@/components/TaskCard';
import AddTaskModal from '@/components/AddTaskModal';
import { PlusIcon } from '@heroicons/react/24/outline';

interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  due_date: string | null;
  created_at: string;
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [filter]);

  async function loadTasks() {
    setIsLoading(true);
    try {
      let sql = 'SELECT * FROM tasks';
      if (filter !== 'all') {
        sql += \` WHERE status = '\${filter}'\`;
      }
      sql += ' ORDER BY created_at DESC';
      
      const result = await db.execute(sql);
      setTasks(result.rows as Task[]);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
    setIsLoading(false);
  }

  async function addTask(taskData: any) {
    try {
      await db.execute({
        sql: 'INSERT INTO tasks (title, description, priority, due_date, status) VALUES (?, ?, ?, ?, ?)',
        args: [
          taskData.title,
          taskData.description || null,
          taskData.priority,
          taskData.due_date || null,
          'todo'
        ]
      });
      loadTasks();
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  }

  async function updateTaskStatus(id: string, status: Task['status']) {
    try {
      await db.execute({
        sql: 'UPDATE tasks SET status = ? WHERE id = ?',
        args: [status, id]
      });
      loadTasks();
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }

  async function deleteTask(id: string) {
    try {
      await db.execute({
        sql: 'DELETE FROM tasks WHERE id = ?',
        args: [id]
      });
      loadTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }

  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    done: tasks.filter(t => t.status === 'done').length,
  };

  const filterButtons = [
    { key: 'all' as const, label: 'All Tasks', count: stats.total },
    { key: 'todo' as const, label: 'To Do', count: stats.todo },
    { key: 'in_progress' as const, label: 'In Progress', count: stats.in_progress },
    { key: 'done' as const, label: 'Completed', count: stats.done },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                ${name}
              </h1>
              <p className="text-slate-600 mt-1">${description}</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105"
            >
              <PlusIcon className="w-5 h-5" />
              New Task
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            {filterButtons.map((btn) => (
              <motion.button
                key={btn.key}
                onClick={() => setFilter(btn.key)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={\`p-4 rounded-xl border-2 transition-all \${
                  filter === btn.key
                    ? 'bg-blue-50 border-blue-500 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }\`}
              >
                <div className="text-2xl font-bold text-slate-900">{btn.count}</div>
                <div className="text-sm text-slate-600 mt-1">{btn.label}</div>
              </motion.button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
          </div>
        ) : tasks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="text-6xl mb-4">📝</div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">No tasks yet</h3>
            <p className="text-slate-600 mb-6">Create your first task to get started!</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shadow-blue-500/30"
            >
              <PlusIcon className="w-5 h-5" />
              Create First Task
            </button>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={updateTaskStatus}
                  onDelete={deleteTask}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Add Task Modal */}
      <AddTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={addTask}
      />
    </div>
  );
}
`,

    'src/app/layout.tsx': `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "${name}",
  description: "${description}",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
`,

    'src/app/globals.css': `@import "tailwindcss";

@layer base {
  * {
    @apply border-slate-200;
  }
  
  body {
    @apply text-slate-900 antialiased;
  }
}
`,

    'tailwind.config.ts': `import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
`,

    'postcss.config.mjs': `const config = { plugins: { '@tailwindcss/postcss': {} } };
export default config;
`,

    'next.config.ts': `import type { NextConfig } from "next";
const nextConfig: NextConfig = {};
export default nextConfig;
`,

    'tsconfig.json': JSON.stringify({
      compilerOptions: {
        target: 'ES2017',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'preserve',
        incremental: true,
        plugins: [{ name: 'next' }],
        paths: { '@/*': ['./src/*'] },
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    }, null, 2),

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
TURSO_DATABASE_URL=libsql://your-db-name.turso.io
TURSO_AUTH_TOKEN=your-auth-token-here

# Get these from Turso CLI:
# turso db show <db-name> --url
# turso db tokens create <db-name>
`,

    'README.md': `# ${name}

${description}

## Features

✨ **Beautiful UI** - Modern, responsive design with smooth animations  
🎯 **Task Management** - Create, update, and track tasks with ease  
📊 **Priority Levels** - Low, Medium, High priority indicators  
📅 **Due Dates** - Never miss a deadline  
🔄 **Status Tracking** - Todo → In Progress → Done workflow  
⚡ **Turso Database** - Fast, serverless SQLite at the edge  

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

Copy \`.env.local.example\` to \`.env.local\` and add your Turso credentials:

\`\`\`env
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token-here
\`\`\`

### 5. Run Development Server

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) to see your app!

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

---

Built with ❤️ by LaunchKit 🚀

Powered by [Turso](https://turso.tech) - The edge database
`,
  };
}
