interface WealthWarsLogoProps {
  className?: string;
}

export default function WealthWarsLogo({ className = "" }: WealthWarsLogoProps) {
  return (
    <h1 className={`font-black text-4xl md:text-5xl lg:text-6xl tracking-tight gold-gradient ${className}`} 
        style={{ fontFamily: 'Orbitron, monospace' }}>
      WEALTH WARS
    </h1>
  );
}