export type MeResponse = {
  id: string;
  wallet: string | null;
  wealth: null | { uiAmount: number; tier: string };
};

const BASE = (import.meta.env?.VITE_BACKEND_API_BASE || "").replace(/\/$/, "");
function url(path: string) {
  const base = BASE || "";
  if (base) return `${base}${path}`;
  // Fallback to same-origin for local dev via proxy or same host
  return path;
}
const headers = () => ({ 'Content-Type': 'application/json', 'X-User-Id': localStorage.getItem('userId') || 'demo-user' });

export async function apiMe(): Promise<MeResponse> {
  const r = await fetch(url(`/me`), { headers: headers() });
  if (!r.ok) throw new Error(`me failed: ${r.status}`);
  return r.json();
}

export async function apiLinkStart(): Promise<{ message: string }> {
  const r = await fetch(url(`/link/start`), { method: 'POST', headers: headers() });
  if (!r.ok) throw new Error(`link/start failed: ${r.status}`);
  return r.json();
}

export async function apiLinkFinish(address: string, signature: string): Promise<{ linked: boolean; wallet: string }>{
  const r = await fetch(url(`/link/finish`), { method: 'POST', headers: headers(), body: JSON.stringify({ address, signature }) });
  if (!r.ok) throw new Error(`link/finish failed: ${r.status}`);
  return r.json();
}
