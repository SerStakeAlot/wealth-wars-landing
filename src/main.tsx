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

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <SolanaWalletProvider>
      <App />
    </SolanaWalletProvider>
   </ErrorBoundary>
)
