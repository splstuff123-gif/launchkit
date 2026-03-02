// Smart template generator for different SaaS types
import { generatePremiumTaskManager } from './templates-premium';

export function selectTemplate(description: string): string {
  const desc = description.toLowerCase();
  
  // Task/Todo/Project Management
  if (desc.match(/task|todo|project|manage|organize|checklist|priority/)) {
    return 'task-manager';
  }
  
  // Fitness/Health/Workout
  if (desc.match(/workout|fitness|exercise|health|gym|training|goal|weight/)) {
    return 'fitness';
  }
  
  // CRM/Contacts/Customers
  if (desc.match(/crm|customer|contact|client|lead|sales|deal/)) {
    return 'crm';
  }
  
  // Analytics/Dashboard/Metrics
  if (desc.match(/analytics|dashboard|metric|chart|report|stat|track/)) {
    return 'analytics';
  }
  
  // Notes/Wiki/Documentation
  if (desc.match(/note|wiki|document|knowledge|write|blog|content/)) {
    return 'notes';
  }
  
  // Default to task manager for generic descriptions
  return 'task-manager';
}

export function generateTemplate(templateType: string, name: string, description: string, price: string) {
  const generators: Record<string, Function> = {
    'task-manager': generateTaskManager,
    'fitness': generateFitness,
    'crm': generateCRM,
    'analytics': generateAnalytics,
    'notes': generateNotes,
  };
  
  const generator = generators[templateType] || generateTaskManager;
  return generator(name, description, price);
}

function generateTaskManager(name: string, description: string, price: string) {
  // Use premium template for task manager
  return generatePremiumTaskManager(name, description, price);
  
  /* OLD TEMPLATE - REPLACED WITH PREMIUM VERSION
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

    'src/app/page.tsx': `'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    due_date: '',
  });
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');

  useEffect(() => {
    loadTasks();
  }, [filter]);

  async function loadTasks() {
    let query = supabase.from('tasks').select('*').order('created_at', { ascending: false });
    
    if (filter !== 'all') {
      query = query.eq('status', filter);
    }
    
    const { data } = await query;
    if (data) setTasks(data);
  }

  async function addTask() {
    if (!newTask.title) return;
    
    await supabase.from('tasks').insert([{
      ...newTask,
      status: 'todo',
      description: newTask.description || null,
      due_date: newTask.due_date || null,
    }]);
    
    setNewTask({ title: '', description: '', priority: 'medium', due_date: '' });
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

  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">${name}</h1>
          <p className="text-gray-600 mt-2">${description}</p>
        </header>

        {/* Add Task Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Task</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Task title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              placeholder="Description (optional)"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={addTask}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Add Task
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={\`px-4 py-2 rounded-lg font-medium transition \${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }\`}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Task List */}
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{task.title}</h3>
                    <span className={\`px-3 py-1 rounded-full text-xs font-medium \${priorityColors[task.priority]}\`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="text-gray-600 mb-3">{task.description}</p>
                  )}
                  <div className="flex gap-4 text-sm text-gray-500">
                    {task.due_date && (
                      <span>📅 Due: {new Date(task.due_date).toLocaleDateString()}</span>
                    )}
                    <span>Status: {task.status.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {task.status !== 'done' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, task.status === 'todo' ? 'in_progress' : 'done')}
                      className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 transition"
                    >
                      {task.status === 'todo' ? '▶️ Start' : '✅ Done'}
                    </button>
                  )}
                  {task.status === 'done' && (
                    <button
                      onClick={() => updateTaskStatus(task.id, 'todo')}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                    >
                      ↩️ Reopen
                    </button>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No tasks yet. Add your first task above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`,

    'SCHEMA.sql': `-- Run this in your Supabase SQL editor

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

-- Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- For now, allow all operations (add auth later)
CREATE POLICY "Allow all on tasks" ON tasks FOR ALL USING (true);

-- Index for faster queries
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
`,

    ...generateCommonFiles(name, description),
  };
}

function generateFitness(name: string, description: string, price: string) {
  // Use the WorkoutPro template we already know works
  return {
    'package.json': JSON.stringify({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      private: true,
      scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
      dependencies: {
        '@supabase/supabase-js': '^2.39.0',
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

    'src/app/page.tsx': `'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Goal {
  id: string;
  title: string;
  target_value: number;
  current_value: number;
  unit: string;
}

interface Workout {
  id: string;
  title: string;
  duration_minutes: number;
  calories: number;
  completed_at: string;
}

export default function Home() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [newGoal, setNewGoal] = useState({ title: '', target_value: 0, unit: 'reps' });
  const [newWorkout, setNewWorkout] = useState({ title: '', duration_minutes: 0, calories: 0 });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: goalsData } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
    const { data: workoutsData } = await supabase.from('workouts').select('*').order('completed_at', { ascending: false });
    
    if (goalsData) setGoals(goalsData);
    if (workoutsData) setWorkouts(workoutsData);
  }

  async function addGoal() {
    if (!newGoal.title) return;
    await supabase.from('goals').insert([{ ...newGoal, current_value: 0 }]);
    setNewGoal({ title: '', target_value: 0, unit: 'reps' });
    loadData();
  }

  async function addWorkout() {
    if (!newWorkout.title) return;
    await supabase.from('workouts').insert([newWorkout]);
    setNewWorkout({ title: '', duration_minutes: 0, calories: 0 });
    loadData();
  }

  async function updateGoalProgress(id: string, increment: number) {
    const goal = goals.find(g => g.id === id);
    if (!goal) return;
    await supabase.from('goals').update({ current_value: goal.current_value + increment }).eq('id', id);
    loadData();
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">${name}</h1>
          <p className="text-gray-600 mt-2">${description}</p>
        </header>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Fitness Goals</h2>
            <div className="mb-6 space-y-3">
              <input type="text" placeholder="Goal name" value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg" />
              <div className="flex gap-2">
                <input type="number" placeholder="Target" value={newGoal.target_value || ''}
                  onChange={(e) => setNewGoal({ ...newGoal, target_value: parseInt(e.target.value) || 0 })}
                  className="flex-1 px-4 py-2 border rounded-lg" />
                <input type="text" placeholder="Unit" value={newGoal.unit}
                  onChange={(e) => setNewGoal({ ...newGoal, unit: e.target.value })}
                  className="w-24 px-4 py-2 border rounded-lg" />
              </div>
              <button onClick={addGoal}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
                Add Goal
              </button>
            </div>
            <div className="space-y-3">
              {goals.map((goal) => (
                <div key={goal.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{goal.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm text-gray-600">{goal.current_value} / {goal.target_value} {goal.unit}</div>
                    <div className="flex gap-2">
                      <button onClick={() => updateGoalProgress(goal.id, 1)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">+1</button>
                      <button onClick={() => updateGoalProgress(goal.id, -1)}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">-1</button>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full"
                      style={{ width: \`\${Math.min((goal.current_value / goal.target_value) * 100, 100)}%\` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold mb-4">Workout Log</h2>
            <div className="mb-6 space-y-3">
              <input type="text" placeholder="Workout name" value={newWorkout.title}
                onChange={(e) => setNewWorkout({ ...newWorkout, title: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg" />
              <div className="flex gap-2">
                <input type="number" placeholder="Duration (min)" value={newWorkout.duration_minutes || ''}
                  onChange={(e) => setNewWorkout({ ...newWorkout, duration_minutes: parseInt(e.target.value) || 0 })}
                  className="flex-1 px-4 py-2 border rounded-lg" />
                <input type="number" placeholder="Calories" value={newWorkout.calories || ''}
                  onChange={(e) => setNewWorkout({ ...newWorkout, calories: parseInt(e.target.value) || 0 })}
                  className="flex-1 px-4 py-2 border rounded-lg" />
              </div>
              <button onClick={addWorkout}
                className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition">
                Log Workout
              </button>
            </div>
            <div className="space-y-3">
              {workouts.slice(0, 10).map((workout) => (
                <div key={workout.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{workout.title}</h3>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>⏱️ {workout.duration_minutes} min</span>
                    <span>🔥 {workout.calories} cal</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(workout.completed_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
`,

    'SCHEMA.sql': `CREATE TABLE goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  unit TEXT,
  deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration_minutes INTEGER,
  calories INTEGER,
  notes TEXT,
  completed_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on goals" ON goals FOR ALL USING (true);
CREATE POLICY "Allow all on workouts" ON workouts FOR ALL USING (true);
`,

    ...generateCommonFiles(name, description),
  };
}

function generateCRM(name: string, description: string, price: string) {
  return {
    'package.json': JSON.stringify({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      version: '0.1.0',
      private: true,
      scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
      dependencies: {
        '@supabase/supabase-js': '^2.39.0',
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

    'src/app/page.tsx': `'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Contact {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  status: 'lead' | 'customer' | 'inactive';
  notes: string | null;
  created_at: string;
}

export default function Home() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    status: 'lead' as const,
    notes: '',
  });
  const [filter, setFilter] = useState<'all' | 'lead' | 'customer' | 'inactive'>('all');

  useEffect(() => {
    loadContacts();
  }, [filter]);

  async function loadContacts() {
    let query = supabase.from('contacts').select('*').order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    if (data) setContacts(data);
  }

  async function addContact() {
    if (!newContact.name || !newContact.email) return;
    await supabase.from('contacts').insert([{
      ...newContact,
      company: newContact.company || null,
      phone: newContact.phone || null,
      notes: newContact.notes || null,
    }]);
    setNewContact({ name: '', email: '', company: '', phone: '', status: 'lead', notes: '' });
    loadContacts();
  }

  async function updateStatus(id: string, status: Contact['status']) {
    await supabase.from('contacts').update({ status }).eq('id', id);
    loadContacts();
  }

  async function deleteContact(id: string) {
    await supabase.from('contacts').delete().eq('id', id);
    loadContacts();
  }

  const statusColors = {
    lead: 'bg-blue-100 text-blue-800',
    customer: 'bg-green-100 text-green-800',
    inactive: 'bg-gray-100 text-gray-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">${name}</h1>
          <p className="text-gray-600 mt-2">${description}</p>
        </header>

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Add Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <input type="text" placeholder="Name *" value={newContact.name}
              onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
              className="px-4 py-2 border rounded-lg" />
            <input type="email" placeholder="Email *" value={newContact.email}
              onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
              className="px-4 py-2 border rounded-lg" />
            <input type="text" placeholder="Company" value={newContact.company}
              onChange={(e) => setNewContact({ ...newContact, company: e.target.value })}
              className="px-4 py-2 border rounded-lg" />
            <input type="tel" placeholder="Phone" value={newContact.phone}
              onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
              className="px-4 py-2 border rounded-lg" />
            <select value={newContact.status}
              onChange={(e) => setNewContact({ ...newContact, status: e.target.value as any })}
              className="px-4 py-2 border rounded-lg">
              <option value="lead">Lead</option>
              <option value="customer">Customer</option>
              <option value="inactive">Inactive</option>
            </select>
            <textarea placeholder="Notes" value={newContact.notes}
              onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
              className="px-4 py-2 border rounded-lg col-span-2" rows={2} />
          </div>
          <button onClick={addContact}
            className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition font-semibold">
            Add Contact
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {(['all', 'lead', 'customer', 'inactive'] as const).map((status) => (
            <button key={status} onClick={() => setFilter(status)}
              className={\`px-4 py-2 rounded-lg font-medium \${
                filter === status ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
              }\`}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {contacts.map((contact) => (
            <div key={contact.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{contact.name}</h3>
                    <span className={\`px-3 py-1 rounded-full text-xs font-medium \${statusColors[contact.status]}\`}>
                      {contact.status}
                    </span>
                  </div>
                  <div className="text-gray-600 space-y-1">
                    <p>📧 {contact.email}</p>
                    {contact.company && <p>🏢 {contact.company}</p>}
                    {contact.phone && <p>📞 {contact.phone}</p>}
                    {contact.notes && <p className="mt-2 text-sm">📝 {contact.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <select value={contact.status}
                    onChange={(e) => updateStatus(contact.id, e.target.value as any)}
                    className="px-3 py-1 border rounded-lg text-sm">
                    <option value="lead">Lead</option>
                    <option value="customer">Customer</option>
                    <option value="inactive">Inactive</option>
                  </select>
                  <button onClick={() => deleteContact(contact.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
          {contacts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No contacts yet. Add your first contact above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
`,

    'SCHEMA.sql': `CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  phone TEXT,
  status TEXT CHECK (status IN ('lead', 'customer', 'inactive')) DEFAULT 'lead',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on contacts" ON contacts FOR ALL USING (true);

CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_email ON contacts(email);
`,

    ...generateCommonFiles(name, description),
  };
}

// Simplified stubs for analytics and notes (can expand later)
function generateAnalytics(name: string, description: string, price: string) {
  return generateTaskManager(name, description, price); // Fallback for now
}

function generateNotes(name: string, description: string, price: string) {
  return generateTaskManager(name, description, price); // Fallback for now
}

function generateCommonFiles(name: string, description: string) {
  return {
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

    'src/app/layout.tsx': `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${name}",
  description: "${description}",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`,

    'src/app/globals.css': `@import "tailwindcss";`,

    'tailwind.config.ts': `import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [],
};
export default config;
`,

    'postcss.config.mjs': `const config = { plugins: { '@tailwindcss/postcss': {} } };
export default config;
`,

    'README.md': `# ${name}

${description}

## Setup

1. Create a Supabase project
2. Run the SQL in SCHEMA.sql
3. Add environment variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY

\`\`\`bash
npm install
npm run dev
\`\`\`

Built with LaunchKit 🚀
`,

    '.env.local.example': `NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
`,
  };
}
