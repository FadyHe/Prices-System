// Next.js instrumentation — runs once when the server process boots (both
// node and edge runtimes support export async function register()).
// Fails loudly on missing required env vars instead of a confusing
// runtime error deep in a request handler.

export async function register() {
  const { assertEnvVars } = await import('./lib/env');
  assertEnvVars();
}