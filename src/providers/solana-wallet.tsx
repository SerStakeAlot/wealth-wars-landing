import { FC, PropsWithChildren, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

// Default styles that can be overridden by your app
import "@solana/wallet-adapter-react-ui/styles.css";

// Tiny helper to pick network+endpoint safely
const getNetwork = (): WalletAdapterNetwork => {
  const env = (import.meta.env?.VITE_SOLANA_NETWORK as string) || "mainnet";
  switch (env) {
    case "devnet":
      return WalletAdapterNetwork.Devnet;
    case "testnet":
      return WalletAdapterNetwork.Testnet;
    default:
      return WalletAdapterNetwork.Mainnet;
  }
};

const getEndpoint = (network: WalletAdapterNetwork): string => {
  // Allow override via env
  const fromEnv = import.meta.env?.VITE_SOLANA_RPC_ENDPOINT as string | undefined;
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  // Fallback public endpoints (ok for demo/dev; use a provider for production)
  switch (network) {
    case WalletAdapterNetwork.Devnet:
      return "https://api.devnet.solana.com";
    case WalletAdapterNetwork.Testnet:
      return "https://api.testnet.solana.com";
    default:
      return "https://api.mainnet-beta.solana.com";
  }
};

export const SolanaWalletProvider: FC<PropsWithChildren> = ({ children }) => {
  const network = getNetwork();
  const endpoint = getEndpoint(network);

  const wallets = useMemo(() => {
    const list = [] as any[];
    try { list.push(new PhantomWalletAdapter()); } catch (e) { console.error("Phantom init failed", e); }
    try { list.push(new SolflareWalletAdapter({ network })); } catch (e) { console.error("Solflare init failed", e); }
    return list;
  }, [network]);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
