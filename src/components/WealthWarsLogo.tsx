import React from 'react';

export default function WealthWarsLogo({ className = '' }: { className?: string }) {
  return (
    <h1 className={`wealthwars-logo gold-gradient ${className}`} style={{ fontFamily: 'Orbitron, monospace' }}>
      WEALTH WARS
    </h1>
  );
}