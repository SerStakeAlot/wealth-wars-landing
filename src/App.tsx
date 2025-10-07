import { useState, useEffect } from 'react';
import { useScrollReveal } from './hooks/use-scroll-reveal';
import WealthWarsLogo from './components/WealthWarsLogo';
import Whitepaper from './components/Whitepaper';
import Roadmap from './components/Roadmap';
import Demo from './components/Demo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowSquareOut, Shield, Coins, Trophy, Users, Lightning } from '@phosphor-icons/react';

function App() {
  const [currentView, setCurrentView] = useState<'home' | 'whitepaper' | 'roadmap' | 'demo'>('home');
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
  <section className="relative min-h-dvh flex flex-col items-center justify-center px-4 pt-safe-top pb-safe-bottom hero-glow">
        <div className="absolute top-8 left-8">
          <WealthWarsLogo size="sm" />
        </div>
        
        <div className="text-center max-w-4xl mx-auto">
          <WealthWarsLogo size="hero" shimmer className="mb-10" />
          
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            Build, defend, and raid for advantage in a constrained resource economy—master timing and pressure to turn daily production into lasting <span className="text-accent font-semibold">$WEALTH</span>.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button variant="outline" size="lg" className="text-lg px-8 py-4" onClick={() => setCurrentView('whitepaper')}>Whitepaper</Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4" onClick={() => setCurrentView('roadmap')}>Roadmap</Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4 relative overflow-hidden group" onClick={() => setCurrentView('demo')}>
              <span className="pr-3">Demo</span>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/30 group-hover:border-amber-300 transition-colors">Soon</span>
            </Button>
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
                <CardTitle className="text-2xl text-accent">Exchange Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">75:1</div>
                <p className="text-muted-foreground">Credits to $WEALTH conversion rate</p>
              </CardContent>
            </Card>

            <Card className="scroll-reveal text-center">
              <CardHeader>
                <CardTitle className="text-2xl text-accent">Daily Cap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">10 $WEALTH</div>
                <p className="text-muted-foreground">Per-player daily limit creates fair competition</p>
              </CardContent>
            </Card>

            <Card className="scroll-reveal text-center">
              <CardHeader>
                <CardTitle className="text-2xl text-accent">Global Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">1,000 $WEALTH</div>
                <p className="text-muted-foreground">Total daily pool resets at UTC midnight</p>
              </CardContent>
            </Card>
          </div>
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
        <div className="max-w-6xl mx-auto text-center">
          <WealthWarsLogo size="md" className="mb-4" />
          <p className="text-muted-foreground">
            Build, defend, and raid for advantage in a constrained resource economy.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;