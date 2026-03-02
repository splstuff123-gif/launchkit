// Turso database utilities for LaunchKit
import { createClient } from '@libsql/client';

export interface TursoConfig {
  url: string;
  authToken: string;
}

export async function createTursoDatabase(
  appName: string,
  tursoToken: string
): Promise<TursoConfig> {
  // Create a new Turso database for this app
  const response = await fetch('https://api.turso.tech/v1/databases', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tursoToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: appName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      group: 'default',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create Turso database: ${error}`);
  }

  const data = await response.json();
  
  // Generate auth token for this database
  const tokenResponse = await fetch(
    `https://api.turso.tech/v1/databases/${data.database.name}/auth/tokens`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tursoToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const tokenData = await tokenResponse.json();

  // Turso API returns hostname, but libsql needs the full libsql:// URL
  const hostname = data.database.hostname;
  const url = hostname.startsWith('libsql://') ? hostname : `libsql://${hostname}`;

  return {
    url,
    authToken: tokenData.token,
  };
}

export async function initializeTursoSchema(
  config: TursoConfig,
  schema: string
) {
  const client = createClient(config);
  
  // Execute schema SQL
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    await client.execute(statement);
  }

  return true;
}

export function generateTursoClient(url: string, authToken: string) {
  return `import { createClient } from '@libsql/client';

export const db = createClient({
  url: "${url}",
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Helper functions for common operations
export async function query<T = any>(sql: string, args: any[] = []): Promise<T[]> {
  const result = await db.execute({ sql, args });
  return result.rows as T[];
}

export async function execute(sql: string, args: any[] = []) {
  return await db.execute({ sql, args });
}
`;
}
