// Polyfills must be first: ensure global and Buffer exist before any wallet/web3 imports run
import { Buffer } from 'buffer';
// @ts-ignore
if (!(window as any).Buffer) (window as any).Buffer = Buffer;
// @ts-ignore
if (!(window as any).global) (window as any).global = window;

import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import "@github/spark/spark"

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'
import { SolanaWalletProvider } from './providers/solana-wallet.tsx'

import "./main.css"
import "./styles/theme.css"
import "./index.css"
import "@solana/wallet-adapter-react-ui/styles.css";

// Enable wallet only when explicitly set to 'true' (safe default is disabled)
const enableWallet = (import.meta.env?.VITE_ENABLE_WALLET as string | undefined) === 'true';
// Expose for UI guard
// @ts-ignore
(window as any).__walletEnabled = enableWallet;

try {
  createRoot(document.getElementById('root')!).render(
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      {enableWallet ? (
        <SolanaWalletProvider>
          <App />
        </SolanaWalletProvider>
      ) : (
        <App />
      )}
    </ErrorBoundary>
  )
  const pre = document.getElementById('pre-init-banner');
  if (pre) pre.classList.add('hide');
} catch (e) {
  console.error('Fatal render error', e);
}
