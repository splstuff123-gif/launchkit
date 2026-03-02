'use client';

import { useState } from 'react';

export default function Home() {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Generation failed:', error);
      setResult({ error: 'Failed to generate SaaS' });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              LaunchKit
            </h1>
            <p className="text-gray-400 text-lg">
              From idea to deployed SaaS in minutes
            </p>
          </div>

          {/* Form */}
          <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Project Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., InvoiceReminder"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                  What does it do?
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g., Track invoices and send payment reminders to clients"
                  rows={4}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                  required
                />
              </div>

              {/* Pricing */}
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-2">
                  Monthly Price (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500">$</span>
                  <input
                    type="number"
                    id="price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="29"
                    className="w-full pl-8 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500"
                    required
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isGenerating}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isGenerating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating & Deploying...
                  </span>
                ) : (
                  '🚀 Generate & Deploy'
                )}
              </button>
            </form>
          </div>

          {/* Result */}
          {result && (
            <div className="mt-8 bg-gray-800 rounded-2xl p-8 shadow-2xl border border-gray-700">
              {result.error ? (
                <div className="text-red-400">
                  <p className="font-semibold mb-2">❌ Error</p>
                  <p>{result.error}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-green-400 text-xl font-semibold">
                    <span>✅</span>
                    <span>SaaS Deployed!</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-900 p-4 rounded-lg">
                      <p className="text-gray-400 text-sm mb-1">Live URL</p>
                      <a 
                        href={result.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 underline break-all"
                      >
                        {result.url}
                      </a>
                    </div>

                    {result.stripeUrl && (
                      <div className="bg-gray-900 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm mb-1">Stripe Dashboard</p>
                        <a 
                          href={result.stripeUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          View payments →
                        </a>
                      </div>
                    )}

                    {result.supabaseUrl && (
                      <div className="bg-gray-900 p-4 rounded-lg">
                        <p className="text-gray-400 text-sm mb-1">Supabase Dashboard</p>
                        <a 
                          href={result.supabaseUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline"
                        >
                          View database →
                        </a>
                      </div>
                    )}

                    {result.vercelImportUrl && (
                      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-4 rounded-lg border border-blue-700">
                        <p className="text-gray-400 text-sm mb-2">🚀 Final Step</p>
                        <a 
                          href={result.vercelImportUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block px-6 py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 transition"
                        >
                          ▲ Deploy to Vercel
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
