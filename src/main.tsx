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

// Polyfills for browser runtime when using some wallet/web3 libs
// Ensure Buffer is available
import { Buffer } from 'buffer';
// @ts-ignore
if (!(window as any).Buffer) (window as any).Buffer = Buffer;
// Ensure globalThis is present (most browsers support it natively)
// @ts-ignore
if (!(window as any).global) (window as any).global = window;

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <SolanaWalletProvider>
      <App />
    </SolanaWalletProvider>
   </ErrorBoundary>
)
