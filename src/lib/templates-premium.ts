// Premium SaaS templates with beautiful UI and advanced features

export function generatePremiumTaskManager(name: string, description: string, price: string) {
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
        '@supabase/supabase-js': '^2.39.0',
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

    'src/lib/supabase.ts': `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
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
      {/* Priority Indicator */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-transparent via-current to-transparent opacity-50" 
        style={{ color: priority.color.includes('emerald') ? '#10b981' : priority.color.includes('amber') ? '#f59e0b' : '#ef4444' }} />
      
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title & Priority */}
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
            <span className={\`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border \${priority.color}\`}>
              <span>{priority.icon}</span>
              {task.priority}
            </span>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-slate-600 mb-4 leading-relaxed">{task.description}</p>
          )}

          {/* Meta Info */}
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

        {/* Actions */}
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
import { supabase } from '@/lib/supabase';
import TaskCard from '@/components/TaskCard';
import AddTaskModal from '@/components/AddTaskModal';
import { PlusIcon, FunnelIcon } from '@heroicons/react/24/outline';

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
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
    
    if (filter !== 'all') {
      query = query.eq('status', filter);
    }
    
    const { data } = await query;
    if (data) setTasks(data);
    setIsLoading(false);
  }

  async function addTask(taskData: any) {
    await supabase.from('tasks').insert([{
      ...taskData,
      status: 'todo',
      description: taskData.description || null,
      due_date: taskData.due_date || null,
    }]);
    loadTasks();
  }

  async function updateTaskStatus(id: string, status: Task['status']) {
    await supabase.from('tasks').update({ status }).eq('id', id);
    loadTasks();
  }

  async function deleteTask(id: string) {
    await supabase.from('tasks').delete().eq('id', id);
    loadTasks();
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

    'SCHEMA.sql': `-- TaskMaster Database Schema

CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('todo', 'in_progress', 'done')) DEFAULT 'todo',
  due_date DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (add auth later)
CREATE POLICY "Allow all on tasks" ON tasks FOR ALL USING (true);

-- Performance indexes
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
`,

    'README.md': `# ${name}

${description}

## Features

✨ **Beautiful UI** - Modern, responsive design with smooth animations  
🎯 **Task Management** - Create, update, and track tasks with ease  
📊 **Priority Levels** - Low, Medium, High priority indicators  
📅 **Due Dates** - Never miss a deadline  
🔄 **Status Tracking** - Todo → In Progress → Done workflow  
⚡ **Real-time Updates** - Powered by Supabase  

## Setup

1. Create a Supabase project at https://supabase.com
2. Run the SQL in \`SCHEMA.sql\`
3. Add environment variables:

\`\`\`bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
\`\`\`

4. Install and run:

\`\`\`bash
npm install
npm run dev
\`\`\`

## Tech Stack

- **Next.js 16** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **Headless UI** - Accessible components
- **Heroicons** - Beautiful icons
- **Supabase** - Backend & database

Built with ❤️ by LaunchKit
`,

    '.env.local.example': `NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
`,
  };
}
