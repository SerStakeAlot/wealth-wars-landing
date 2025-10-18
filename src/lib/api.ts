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

export async function apiLottoCurrentRound(): Promise<any> {
  const r = await fetch(url(`/api/lotto/current-round`), { headers: headers() });
  if (!r.ok) throw new Error(`current-round failed: ${r.status}`);
  return r.json();
}

export async function apiLottoMyEntries(): Promise<any[]> {
  const r = await fetch(url(`/api/lotto/my-entries`), { headers: headers() });
  if (!r.ok) throw new Error(`my-entries failed: ${r.status}`);
  return r.json();
}

export async function apiLottoJoin(amount: number): Promise<any> {
  const r = await fetch(url(`/api/lotto/join`), { 
    method: 'POST', 
    headers: headers(), 
    body: JSON.stringify({ amount }) 
  });
  if (!r.ok) throw new Error(`join failed: ${r.status}`);
  return r.json();
}

export async function apiLottoRounds(): Promise<any[]> {
  const r = await fetch(url(`/api/lotto/rounds`), { headers: headers() });
  if (!r.ok) throw new Error(`rounds failed: ${r.status}`);
  return r.json();
}

export async function apiLottoJoinWeb(roundId: string, wallet: string, username: string): Promise<any> {
  const r = await fetch(url(`/api/lotto/rounds/${roundId}/join/web`), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ wallet, username })
  });
  if (!r.ok) throw new Error(`join-web failed: ${r.status}`);
  return r.json();
}

export async function apiLottoClaimPayout(entryId: string, wallet: string): Promise<any> {
  const r = await fetch(url(`/api/lotto/entries/${entryId}/claim`), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ wallet })
  });
  if (!r.ok) throw new Error(`claim failed: ${r.status}`);
  return r.json();
}

export async function apiLottoHealth(): Promise<any> {
  const r = await fetch(url(`/api/lotto/health`), { headers: headers() });
  if (!r.ok) throw new Error(`health failed: ${r.status}`);
  return r.json();
}

// Admin endpoints (require ADMIN_API_TOKEN in Authorization header)
export async function apiLottoCreateRound(
  ticketPriceLamports: number,
  maxEntries: number,
  durationSlots: number,
  retainedBps: number,
  adminToken: string
): Promise<any> {
  const r = await fetch(url(`/api/lotto/rounds`), {
    method: 'POST',
    headers: {
      ...headers(),
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ ticketPriceLamports, maxEntries, durationSlots, retainedBps })
  });
  if (!r.ok) throw new Error(`create-round failed: ${r.status}`);
  return r.json();
}

export async function apiLottoCloseRound(roundId: string, adminToken: string): Promise<any> {
  const r = await fetch(url(`/api/lotto/rounds/${roundId}/close`), {
    method: 'POST',
    headers: {
      ...headers(),
      'Authorization': `Bearer ${adminToken}`
    }
  });
  if (!r.ok) throw new Error(`close-round failed: ${r.status}`);
  return r.json();
}

export async function apiLottoSettleRound(roundId: string, adminToken: string): Promise<any> {
  const r = await fetch(url(`/api/lotto/rounds/${roundId}/settle`), {
    method: 'POST',
    headers: {
      ...headers(),
      'Authorization': `Bearer ${adminToken}`
    }
  });
  if (!r.ok) throw new Error(`settle-round failed: ${r.status}`);
  return r.json();
}