import React from 'react';

type LogoSize = 'sm' | 'md' | 'lg' | 'hero';

interface WealthWarsLogoProps {
  className?: string;
  size?: LogoSize;
  weight?: 600 | 700 | 800; // allow override
  shimmer?: boolean; // enable animated shimmer on hover
}

const sizeClasses: Record<LogoSize, string> = {
  sm: 'text-xl md:text-2xl',
  md: 'text-2xl md:text-3xl',
  lg: 'text-3xl md:text-4xl',
  hero: 'text-[clamp(2.5rem,6vw,4.25rem)]',
};

export default function WealthWarsLogo({ className = '', size = 'md', weight = 800, shimmer = false }: WealthWarsLogoProps) {
  const effectClass = shimmer ? 'gold-gradient-shimmer' : 'gold-gradient';
  return (
    <h1
      className={`wealthwars-logo ${effectClass} ${sizeClasses[size]} ${className}`.trim()}
      style={{ fontWeight: weight }}
    >
      WEALTH WARS
    </h1>
  );
}