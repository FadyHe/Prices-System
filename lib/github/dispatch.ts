const GITHUB_API = 'https://api.github.com';

export interface DispatchEvent {
  event_type: string;
  client_payload?: Record<string, unknown>;
}

export async function triggerWorkflowDispatch(opts: {
  repo: string;
  eventType: string;
  token: string;
  clientPayload?: Record<string, unknown>;
}): Promise<void> {
  const { repo, eventType, token, clientPayload } = opts;
  const url = `${GITHUB_API}/repos/${repo}/dispatches`;
  const body: DispatchEvent = { event_type: eventType, client_payload: clientPayload };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'qarinha-web',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GitHub dispatch failed: ${res.status} ${text.slice(0, 200)}`);
  }
}
