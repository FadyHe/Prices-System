// Startup env validation. Call assertEnvVars() once at process start (see
// instrumentation.ts) so a missing required var fails loudly and
// immediately instead of surfacing as a confusing runtime error later.
// Individual routes also call requireEnv()/getEnv() so a missing var is a
// 5xx with a clear message, never a silent misbehavior.

export const REQUIRED_ENV_VARS = [
  'MONGODB_URI',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'WEBHOOK_SECRET',
  'GITHUB_TOKEN',
  'GITHUB_REPO',
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

export function assertEnvVars(): string[] {
  const missing: string[] = [];
  for (const name of REQUIRED_ENV_VARS) {
    if (!process.env[name]) missing.push(name);
  }
  if (missing.length > 0) {
    console.error(
      `[env] Missing required environment variables: ${missing.join(', ')}`
    );
  }
  return missing;
}

/** Throw if a required var is missing — call at the top of routes that need it. */
export function requireEnv(name: RequiredEnvVar): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}

/** Safe getter returning '' when unset — use when a var is optional. */
export function getEnv(name: RequiredEnvVar): string {
  return process.env[name] ?? '';
}
