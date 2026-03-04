import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { selectTemplate, generateTemplate } from '@/lib/templates';
import { createTursoDatabase, initializeTursoSchema } from '@/lib/database-turso';
import { parseRequirementsText } from '@/lib/requirements';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN!;
const GITHUB_USERNAME = process.env.GITHUB_USERNAME!;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN!;
const TURSO_TOKEN = process.env.TURSO_TOKEN!;

export async function POST(request: Request) {
  try {
    const startedAt = Date.now();
    const { name, description, price, requirements } = await request.json();

    console.log('🚀 Starting deployment:', { name, description, price, hasRequirements: !!requirements });

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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '';
      if (msg.includes('name already exists')) {
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

    // Step 2: Generate boilerplate code
    console.log('📝 Generating code...');

    // If requirements are provided, bake them into the prompt/description for template selection.
    let effectiveDescription = description as string;
    if (requirements) {
      try {
        const doc = parseRequirementsText(String(requirements));
        const reqLines = doc.requirements
          .slice(0, 20)
          .map(r => `- [${r.priority}] ${r.title}${r.description ? `: ${r.description}` : ''}`)
          .join('\n');
        effectiveDescription = `${description}\n\nAPPROVED REQUIREMENTS:\n${reqLines}`;
      } catch {
        // If parsing fails, still include raw text
        effectiveDescription = `${description}\n\nAPPROVED REQUIREMENTS (raw):\n${String(requirements)}`;
      }
    }

    const templateType = selectTemplate(effectiveDescription);
    console.log(`📋 Selected template: ${templateType}`);
    const files = generateTemplate(templateType, name, effectiveDescription, price);
    
    // Step 3: Create Turso database
    console.log('🗄️  Creating Turso database...');
    let tursoConfig;
    let tursoUrl = null;
    
    try {
      tursoConfig = await createTursoDatabase(repoName, TURSO_TOKEN);
      tursoUrl = `https://turso.tech/app/databases/${repoName}`;
      console.log('✅ Turso database created:', tursoUrl);
      
      // Initialize database schema
      const schemaFile = files['SCHEMA.sql'] as string;
      if (schemaFile) {
        await initializeTursoSchema(tursoConfig, schemaFile);
        console.log('✅ Database schema initialized');
      }
    } catch (error) {
      console.warn('⚠️  Turso database creation failed:', error);
      console.log('User will need to create database manually');
    }

    // Step 4: Push files to GitHub
    console.log('📦 Pushing code to GitHub...');
    const fileEntries = Object.entries(files);
    const failedFiles: string[] = [];
    const maxParallelUploads = 6;

    const uploadFile = async ([path, content]: [string, string]) => {
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
        } catch {
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
        failedFiles.push(path);
      }
    };

    for (let i = 0; i < fileEntries.length; i += maxParallelUploads) {
      const batch = fileEntries.slice(i, i + maxParallelUploads);
      await Promise.all(batch.map((entry) => uploadFile(entry as [string, string])));
    }
    
    console.log(`✅ Code pushed to GitHub (${fileEntries.length - failedFiles.length}/${fileEntries.length} files)`);

    // Step 5: Create Vercel project and link to GitHub
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
      console.log('✅ Vercel project created');
      
      // Set Turso environment variables if we have them
      if (tursoConfig) {
        console.log('🔧 Setting environment variables...');
        const envVars = [
          { key: 'TURSO_DATABASE_URL', value: tursoConfig.url, target: ['production', 'preview', 'development'] },
          { key: 'TURSO_AUTH_TOKEN', value: tursoConfig.authToken, target: ['production', 'preview', 'development'], sensitive: true },
        ];

        for (const envVar of envVars) {
          try {
            await fetch(`https://api.vercel.com/v10/projects/${projectId}/env`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${VERCEL_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(envVar),
            });
          } catch {
            console.warn('⚠️  Failed to set env var:', envVar.key);
          }
        }
        console.log('✅ Environment variables set');
      }
      
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
              repoId: repo.id,
              ref: 'main',
            },
          }),
        });
        
        if (vercelDeploy.ok) {
          const deployData = await vercelDeploy.json();
          console.log('✅ Vercel deployment initiated');
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
      tursoUrl: tursoUrl,
      stats: {
        totalFiles: fileEntries.length,
        failedFiles,
        durationMs: Date.now() - startedAt,
      },
      message: tursoConfig 
        ? 'SaaS created successfully! Database is configured and ready.'
        : 'SaaS created! Set up Turso database manually (see README).',
    });

  } catch (error: unknown) {
    console.error('❌ Generation error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate SaaS';
    return NextResponse.json(
      {
        error: msg,
        details: String(error),
      },
      { status: 500 }
    );
  }
}
