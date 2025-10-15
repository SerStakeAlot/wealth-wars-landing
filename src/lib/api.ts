export type MeResponse = {
  id: string;
  wallet: string | null;
  wealth: null | { uiAmount: number; tier: string };
};

const BASE = (import.meta.env?.VITE_BACKEND_API_BASE || "").replace(/\/$/, "");
export const API_BASE = BASE;

function getOrCreateUserId() {
  let id = localStorage.getItem('userId');
  if (!id) {
    // 12-char random ID
    id = Math.random().toString(36).slice(2, 14);
    localStorage.setItem('userId', id);
  }
  return id;
}
function url(path: string) {
  const base = BASE || "";
  if (base) return `${base}${path}`;
  // Fallback to same-origin for local dev via proxy or same host
  return path;
}
const headers = () => ({ 'Content-Type': 'application/json', 'X-User-Id': getOrCreateUserId() });

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

export async function apiWealth(address: string): Promise<{ address: string; uiAmount: number; tier: string }>{
  const r = await fetch(url(`/wallet/${address}/wealth`), { headers: headers() });
  if (!r.ok) throw new Error(`wealth failed: ${r.status}`);
  return r.json();
}
