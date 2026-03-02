import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME!;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN!;

export async function POST(request: Request) {
  try {
    const { name, description, price } = await request.json();
    
    console.log('🚀 Starting deployment:', { name, description, price });

    // Step 1: Create GitHub repo
    console.log('📦 Creating GitHub repository...');
    let repoName = name.toLowerCase().replace(/\s+/g, '-');
    const octokit = new Octokit({ auth: GITHUB_TOKEN });
    
    let repo;
    try {
      const { data } = await octokit.repos.createForAuthenticatedUser({
        name: repoName,
        description,
        private: false,
        auto_init: true,
      });
      repo = data;
    } catch (error: any) {
      if (error.message?.includes('name already exists')) {
        // Repo exists, add timestamp to make it unique
        repoName = `${repoName}-${Date.now()}`;
        const { data } = await octokit.repos.createForAuthenticatedUser({
          name: repoName,
          description,
          private: false,
          auto_init: true,
        });
        repo = data;
      } else {
        throw error;
      }
    }
    
    console.log('✅ GitHub repo created:', repo.html_url);

    // Step 2: Generate boilerplate code and push to repo
    console.log('📝 Generating code...');
    const files = generateSaaSBoilerplate(name, description, price);
    
    // Push files to GitHub
    for (const [path, content] of Object.entries(files)) {
      try {
        // Try to get the file first to see if it exists
        let sha;
        try {
          const { data: existingFile } = await octokit.repos.getContent({
            owner: GITHUB_USERNAME,
            repo: repoName,
            path,
          });
          if ('sha' in existingFile) {
            sha = existingFile.sha;
          }
        } catch (error) {
          // File doesn't exist, that's fine
        }

        await octokit.repos.createOrUpdateFileContents({
          owner: GITHUB_USERNAME,
          repo: repoName,
          path,
          message: `Add ${path}`,
          content: Buffer.from(content).toString('base64'),
          ...(sha && { sha }),
        });
      } catch (error) {
        console.error(`Failed to create ${path}:`, error);
        // Continue with other files
      }
    }
    
    console.log('✅ Code pushed to GitHub');

    // Step 3: Create Supabase project
    console.log('🗄️  Creating Supabase project...');
    const supabaseProject = await fetch('https://api.supabase.com/v1/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        organization_id: await getSupabaseOrgId(),
        plan: 'free',
        region: 'us-east-1',
        db_pass: generateRandomPassword(),
      }),
    });

    let supabaseData;
    let supabaseUrl = null;
    
    if (supabaseProject.ok) {
      supabaseData = await supabaseProject.json();
      supabaseUrl = `https://app.supabase.com/project/${supabaseData.id}`;
      console.log('✅ Supabase project created:', supabaseUrl);
    } else {
      console.warn('⚠️  Supabase project creation failed, continuing without it');
      const errorData = await supabaseProject.json();
      console.error('Supabase error:', errorData);
    }

    // Step 4: Create Vercel project and link to GitHub
    console.log('🚢 Creating Vercel project...');
    
    // First, create a Vercel project
    const vercelProject = await fetch('https://api.vercel.com/v9/projects', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: repoName,
        framework: 'nextjs',
      }),
    });

    let deployedUrl = `https://${repoName}.vercel.app`;
    let projectId = null;
    
    if (vercelProject.ok) {
      const projectData = await vercelProject.json();
      projectId = projectData.id;
      console.log('✅ Vercel project created:', projectData);
      
      // Link GitHub repository to the project
      console.log('🔗 Linking GitHub repository...');
      const linkRepo = await fetch(`https://api.vercel.com/v9/projects/${projectId}/link`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${VERCEL_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'github',
          repo: `${GITHUB_USERNAME}/${repoName}`,
          gitBranch: 'main',
        }),
      });

      if (linkRepo.ok) {
        console.log('✅ GitHub repository linked');
        
        // Wait a moment for GitHub to sync
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Trigger initial deployment
        console.log('🚀 Triggering deployment...');
        const vercelDeploy = await fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: repoName,
            project: projectId,
            target: 'production',
            gitSource: {
              type: 'github',
              repo: `${GITHUB_USERNAME}/${repoName}`,
              ref: 'main',
            },
          }),
        });
        
        if (vercelDeploy.ok) {
          const deployData = await vercelDeploy.json();
          console.log('✅ Vercel deployment initiated:', deployData);
          deployedUrl = `https://${deployData.url}`;
        } else {
          const deployError = await vercelDeploy.json();
          console.warn('⚠️  Deployment trigger failed:', deployError);
        }
      } else {
        const linkError = await linkRepo.json();
        console.warn('⚠️  GitHub link failed:', linkError);
      }
    } else {
      const errorData = await vercelProject.json();
      console.warn('⚠️  Vercel project creation failed:', errorData);
      console.log('Manual setup required: Import the GitHub repo in Vercel dashboard');
    }

    // Generate Vercel import URL
    const vercelImportUrl = `https://vercel.com/new/clone?repository-url=${encodeURIComponent(repo.html_url)}`;

    return NextResponse.json({
      success: true,
      url: deployedUrl,
      githubUrl: repo.html_url,
      vercelImportUrl: vercelImportUrl,
      stripeUrl: null, // TODO: Add Stripe integration
      supabaseUrl: supabaseUrl,
      message: 'SaaS created! Click "Deploy to Vercel" to complete setup.',
    });

  } catch (error: any) {
    console.error('❌ Generation error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate SaaS',
        details: error.response?.data || error.toString(),
      },
      { status: 500 }
    );
  }
}

function generateSaaSBoilerplate(name: string, description: string, price: string) {
  // Basic Next.js SaaS template
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
        next: '15.1.6',
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

    'src/app/page.tsx': `export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <div className="text-center text-white p-8">
        <h1 className="text-6xl font-bold mb-4">${name}</h1>
        <p className="text-xl mb-8">${description}</p>
        <p className="text-3xl font-semibold">\$${price}/month</p>
        <button className="mt-8 px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition">
          Get Started
        </button>
      </div>
    </main>
  );
}
`,

    'src/app/layout.tsx': `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "${name}",
  description: "${description}",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`,

    'postcss.config.mjs': `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};

export default config;
`,

    'README.md': `# ${name}

${description}

## Pricing
\$${price}/month

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

Built with LaunchKit 🚀
`,
  };
}

async function getSupabaseOrgId(): Promise<string> {
  // Get the first organization ID from the user's account
  const response = await fetch('https://api.supabase.com/v1/organizations', {
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    },
  });
  
  const orgs = await response.json();
  if (orgs && orgs.length > 0) {
    return orgs[0].id;
  }
  
  throw new Error('No Supabase organization found');
}

function generateRandomPassword(): string {
  return Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16);
}
