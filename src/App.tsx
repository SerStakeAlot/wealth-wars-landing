import { useState, useEffect } from 'react';
import { useScrollReveal } from './hooks/use-scroll-reveal';
import WealthWarsLogo from './components/WealthWarsLogo';
import Whitepaper from './components/Whitepaper';
import Roadmap from './components/Roadmap';
import Demo from './components/Demo';
import Tokenomics from './components/Tokenomics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowSquareOut, Shield, Coins, Trophy, Users, Lightning, Info } from '@phosphor-icons/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import ConnectWallet from './components/ConnectWallet';
import { WalletStatus } from './components/WalletStatus';
import { Lotto } from './components/Lotto';
import { Treasury } from './components/Treasury';

function App() {
  // Evaluate gating at render time so it reflects the value set in main.tsx
  const walletEnabled: boolean = (window as any)?.__walletEnabled ?? ((import.meta as any)?.env?.VITE_ENABLE_WALLET === 'true');
  const [currentView, setCurrentView] = useState<'home' | 'whitepaper' | 'roadmap' | 'demo' | 'tokenomics' | 'lotto' | 'treasury'>('home');
  useScrollReveal(currentView);

  // When navigating back to home, ensure scroll reset so reveals can trigger naturally.
  useEffect(() => {
    if (currentView === 'home') {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  }, [currentView]);

  const socialLinks = [
    { name: 'X.com', url: 'https://x.com/WealthWars', icon: ArrowSquareOut },
    { name: 'Telegram', url: 'https://t.me/+yEGQC4AMep1lZGZh', icon: Users },
    { name: 'DexScreener', url: 'https://dexscreener.com/solana/3p6gncso59ksk8e7r7tv8ckdcubgu2xr2sd3muvcajsu', icon: ArrowSquareOut }
  ];

  const features = [
    {
      icon: Coins,
      title: "Strategic Resource Management",
      description: "Earn Credits through daily actions and convert them to $WEALTH through a capped exchange pool. Master timing to maximize your advantage."
    },
    {
      icon: Shield,
      title: "Defensive & Offensive Play",
      description: "Purchase shields for protection or gamble in high-stakes lotteries. Every $WEALTH spent is a strategic choice between safety and opportunity."
    },
    {
      icon: Trophy,
      title: "Competitive Economics",
      description: "Limited daily caps create scarcity and urgency. Race against other players to claim your share of the global $WEALTH pool."
    },
    {
      icon: Lightning,
      title: "Business Empire Building",
      description: "Acquire and stack businesses for escalating Credit production. Build a sustainable economic engine that compounds over time."
    }
  ];

  if (currentView === 'whitepaper') {
    return <Whitepaper onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'roadmap') {
    return <Roadmap onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'demo') {
    return <Demo onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'tokenomics') {
    return <Tokenomics onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'lotto') {
    return <Lotto onBack={() => setCurrentView('home')} />;
  }

  if (currentView === 'treasury') {
    return <Treasury onBack={() => setCurrentView('home')} />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
  <section className="relative min-h-dvh flex flex-col items-center justify-center px-4 pt-safe-top pb-safe-bottom hero-glow">
        <div className="absolute top-8 left-8">
          <WealthWarsLogo size="sm" />
        </div>
        {walletEnabled && (
          <div className="absolute top-8 right-8 z-50 flex flex-col items-end gap-2">
            <ConnectWallet />
            <WalletStatus />
          </div>
        )}
        
        <div className="text-center max-w-4xl mx-auto">
          <WealthWarsLogo size="hero" shimmer className="mb-10" />
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            Build, defend, and raid for advantage in a constrained resource economy—master timing and pressure to turn daily production into lasting <span className="text-accent font-semibold">$WEALTH</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button variant="outline" size="lg" className="text-lg px-8 py-4" onClick={() => setCurrentView('whitepaper')}>Whitepaper</Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4" onClick={() => setCurrentView('roadmap')}>Roadmap</Button>
            <Button asChild variant="outline" size="lg" className="text-lg px-8 py-4 relative overflow-hidden group">
              <a href="/demo/" aria-label="Play Demo at /demo/">
                <span className="pr-3">Play Demo</span>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/30 group-hover:border-amber-300 transition-colors">WebGL</span>
              </a>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4" onClick={() => setCurrentView('tokenomics')}>Tokenomics</Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4" onClick={() => setCurrentView('lotto')}>$WEALTH Lotto</Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4" onClick={() => setCurrentView('treasury')}>Treasury</Button>
          </div>
          
          <div className="flex flex-wrap gap-4 justify-center">
            {socialLinks.map((link) => {
              const IconComponent = link.icon;
              return (
                <Button
                  key={link.name}
                  variant="ghost"
                  size="lg"
                  className="text-muted-foreground hover:text-accent transition-colors"
                  onClick={() => window.open(link.url, '_blank')}
                >
                  <IconComponent size={20} className="mr-2" />
                  {link.name}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Gameplay Section */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 scroll-reveal">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gold-gradient font-orbitron tracking-wide">
              Master the Economy
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Every action matters in Wealth Wars. Strategic decisions, perfect timing, and calculated risks separate winners from losers.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const IconComponent = feature.icon;
              return (
                <Card key={index} className="scroll-reveal border-border/50 hover:border-accent/50 transition-colors" style={{ animationDelay: `${index * 0.1}s` }}>
                  <CardHeader>
                    <IconComponent size={48} className="text-accent mb-4" />
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Economic Model Section */}
      <section className="py-24 px-4 bg-card/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 scroll-reveal">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gold-gradient font-orbitron tracking-wide">
              Transparent Economics
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              No hidden mechanics. Every parameter is published. Your success depends on skill, not luck.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="scroll-reveal text-center">
              <CardHeader>
                <CardTitle className="text-2xl text-accent">Soft Reference Ratio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">100:1</div>
                <p className="text-muted-foreground">Credits → $WEALTH (tunable)</p>
              </CardContent>
            </Card>

            <Card className="scroll-reveal text-center">
              <CardHeader>
                <CardTitle className="text-2xl text-accent flex items-center gap-2 justify-center">
                  Per-Player Cap
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button aria-label="Per-player cap info" className="text-muted-foreground hover:text-accent transition-colors">
                        <Info size={16} weight="bold" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      Hard ceiling 100k per player; effective limit = min(100k, Pool / Active Players).
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">100k</div>
                <p className="text-muted-foreground">Max per player (initial); can be reduced by global pool</p>
              </CardContent>
            </Card>

            <Card className="scroll-reveal text-center">
              <CardHeader>
                <CardTitle className="text-2xl text-accent flex items-center gap-2 justify-center">
                  Global Pool (Daily)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button aria-label="Global pool info" className="text-muted-foreground hover:text-accent transition-colors">
                        <Info size={16} weight="bold" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={6}>
                      1,000,000 $WEALTH shared across actives. Example: 100 actives → ~10,000 each.
                    </TooltipContent>
                  </Tooltip>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">1,000,000</div>
                <p className="text-muted-foreground">Shared across active players → effective per-player cap = min(100k, 1,000,000 / actives). E.g., 100 actives → 10k.</p>
              </CardContent>
            </Card>
          </div>
          <p className="text-center text-[11px] mt-6 text-muted-foreground/60 scroll-reveal">All parameters are provisional & subject to tuning for economic integrity and fairness.</p>
        </div>
      </section>

      {/* Competitive Features */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="scroll-reveal">
              <h2 className="text-4xl md:text-5xl font-bold mb-8 gold-gradient font-orbitron tracking-wide">
                High-Stakes Strategy
              </h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Shield size={24} className="text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Defensive Shields</h3>
                    <p className="text-muted-foreground">Purchase protection with 5, 20, or 50 $WEALTH tiers. Shield timing can make or break your empire.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Trophy size={24} className="text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Lottery System</h3>
                    <p className="text-muted-foreground">25 $WEALTH entry fee, 80% to winner. High variance, high reward for risk-takers.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Lightning size={24} className="text-accent mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Business Scaling</h3>
                    <p className="text-muted-foreground">Compound your Credit production through strategic business acquisitions and timing.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="scroll-reveal">
              <Card className="border-accent/20 glow-effect">
                <CardHeader>
                  <CardTitle className="text-2xl">The Core Loop</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    <li className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm">1</span>
                      <span>Work Actions → Earn Credits</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm">2</span>
                      <span>Buy Businesses → Increase Credit velocity</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm">3</span>
                      <span>Monitor Exchange → Redeem $WEALTH</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm">4</span>
                      <span>Allocate → Shields, Lottery, Strategy</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm">5</span>
                      <span>Iterate → Optimize timing & composition</span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* (Call to Action removed while game in development) */}

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col items-center gap-4 text-center">
          <WealthWarsLogo size="md" className="mb-2" />
          <p className="text-muted-foreground max-w-xl text-sm">
            Build, defend, and raid for advantage in a constrained resource economy.
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-xs uppercase tracking-wide font-medium">
            <button onClick={() => setCurrentView('whitepaper')} className="text-muted-foreground hover:text-accent transition-colors">Whitepaper</button>
            <button onClick={() => setCurrentView('roadmap')} className="text-muted-foreground hover:text-accent transition-colors">Roadmap</button>
            <a href="/demo/" className="text-muted-foreground hover:text-accent transition-colors">Demo</a>
            <button onClick={() => setCurrentView('tokenomics')} className="text-muted-foreground hover:text-accent transition-colors">Tokenomics</button>
          </div>
          <p className="text-[10px] text-muted-foreground/60">© {new Date().getFullYear()} Wealth Wars. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;