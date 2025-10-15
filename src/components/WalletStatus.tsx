import { useEffect, useMemo, useState } from 'react';
import { apiMe, apiLinkStart, apiLinkFinish, API_BASE } from '@/lib/api';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';

export function WalletStatus() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState<Awaited<ReturnType<typeof apiMe>> | null>(null);
  const [health, setHealth] = useState<'online' | 'offline' | 'unknown'>('unknown');
  const { publicKey, signMessage, connected } = useWallet();

  const refresh = async () => {
    setLoading(true);
    try {
      setError(null);
      setMe(await apiMe());
    } catch (e: any) {
      setError(e?.message || 'Backend unavailable');
      setMe(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    // Ping backend health if BASE is set
    if (!API_BASE) { setHealth('unknown'); return; }
    fetch(`${API_BASE}/healthz`).then(r => setHealth(r.ok ? 'online' : 'offline')).catch(() => setHealth('offline'));
  }, []);

  const linked = useMemo(() => !!me?.wallet, [me]);

  const doLink = async () => {
    if (!connected || !publicKey) {
      alert('Connect Phantom or Solflare first');
      return;
    }
    if (!signMessage) {
      alert('This wallet does not support signMessage');
      return;
    }
    const { message } = await apiLinkStart();
    const sig = await signMessage(new TextEncoder().encode(message));
    const signatureB64 = btoa(String.fromCharCode(...sig));
    await apiLinkFinish(publicKey.toBase58(), signatureB64);
    await refresh();
  };

  if (loading) return <div className="text-sm text-muted-foreground">Loading wallet status…</div>;

  return (
    <div className="text-sm flex flex-col gap-2 items-start">
      <div className="flex items-center gap-2 text-xs opacity-70">
        <span>API:</span>
        <span className={health === 'online' ? 'text-green-600' : health === 'offline' ? 'text-red-600' : 'text-muted-foreground'}>
          {health === 'online' ? 'Online' : health === 'offline' ? 'Offline' : 'Unknown'}
        </span>
      </div>
      {error && (
        <div className="text-xs text-red-500/80">{error} — configure VITE_BACKEND_API_BASE or run backend locally.</div>
      )}
      <div>
        Status: {linked ? <span className="text-green-500">Linked ✅</span> : <span className="text-red-500">Not linked ❌</span>}
      </div>
      <div className="text-xs opacity-70">
        User ID: {localStorage.getItem('userId')}
      </div>
      {me?.wallet && (
        <div className="text-xs break-all opacity-75">{me.wallet}</div>
      )}
      {me?.wealth && (
        <div className="flex items-center gap-2">
          <span className="font-semibold">$WEALTH:</span>
          <span>{me.wealth.uiAmount.toLocaleString()}</span>
          <span className="px-2 py-0.5 rounded bg-accent/20 border border-accent/30 text-accent text-xs">{me.wealth.tier}</span>
        </div>
      )}
      {!linked && (
        <Button variant="outline" size="sm" onClick={doLink}>Link Wallet on Web</Button>
      )}
      <Button variant="ghost" size="sm" className="text-xs opacity-70" onClick={() => alert('Lottery coming soon')}>Open Lottery (Web)</Button>
    </div>
  );
}
