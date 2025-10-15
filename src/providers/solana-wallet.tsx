import { FC, PropsWithChildren, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  WalletModalProvider,
} from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
} from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { GlowWalletAdapter } from "@solana/wallet-adapter-glow";
import { LedgerWalletAdapter } from "@solana/wallet-adapter-ledger";
import { SlopeWalletAdapter } from "@solana/wallet-adapter-slope";
import { SolletWalletAdapter } from "@solana/wallet-adapter-sollet";

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

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter({ network }),
      new BackpackWalletAdapter(),
      new GlowWalletAdapter(),
      new LedgerWalletAdapter(),
      new SlopeWalletAdapter(),
      new SolletWalletAdapter({ network }),
    ],
    [network]
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
