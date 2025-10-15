import { useEffect, useMemo, useState } from 'react';
import { apiMe, apiLinkStart, apiLinkFinish } from '@/lib/api';
import { useWallet } from '@solana/wallet-adapter-react';

export function WalletStatus() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Awaited<ReturnType<typeof apiMe>> | null>(null);
  const { publicKey, signMessage, connected } = useWallet();

  const refresh = async () => {
    setLoading(true);
    try { setMe(await apiMe()); } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

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
      <div>
        Status: {linked ? <span className="text-green-500">Linked ✅</span> : <span className="text-red-500">Not linked ❌</span>}
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
        <button className="btn btn-outline" onClick={doLink}>Link Wallet on Web</button>
      )}
      <button className="btn btn-ghost text-xs opacity-70" onClick={() => alert('Lottery coming soon')}>Open Lottery (Web)</button>
    </div>
  );
}
