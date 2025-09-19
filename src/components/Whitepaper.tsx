import { ArrowLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import WealthWarsLogo from './WealthWarsLogo';

interface WhitepaperProps {
  onBack: () => void;
}

export default function Whitepaper({ onBack }: WhitepaperProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="lg"
            onClick={onBack}
            className="text-muted-foreground hover:text-accent"
          >
            <ArrowLeft size={20} className="mr-2" />
            Back to Home
          </Button>
          <WealthWarsLogo className="text-xl" />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 gold-gradient" style={{ fontFamily: 'Orbitron, monospace' }}>
            Wealth Wars Whitepaper
          </h1>
          <p className="text-xl text-muted-foreground">
            Strategy Idle Battle Economy (Light Token Beta)
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8">
          {/* Executive Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-accent">Executive Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                Wealth Wars is a competitive strategy–idle battler where you build and defend a growing economic empire while probing, pressuring, and opportunistically striking at others. Players grind Credits through daily actions, acquire and stack businesses for escalating production, and race to secure $WEALTH.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                You fortify with shields, gamble at the lottery, and time your moves around daily reset windows—always weighing when to scale, when to protect, and when to strike. Along the way players naturally pick up patterns about pacing, risk sizing, and resource timing simply by trying to outplay rivals.
              </p>
            </CardContent>
          </Card>

          {/* Positioning Statement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-accent">Positioning Statement</CardTitle>
            </CardHeader>
            <CardContent>
              <blockquote className="text-lg italic text-center border-l-4 border-accent pl-4">
                "Build, defend, and raid for advantage in a constrained resource economy—master timing and pressure to turn daily production into lasting $WEALTH."
              </blockquote>
            </CardContent>
          </Card>

          {/* Design Pillars */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-accent">Design Pillars</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3 list-decimal list-inside">
                <li><strong>Fun First:</strong> Every mechanic must stand on pure game utility before educational value.</li>
                <li><strong>Predictable Progression:</strong> Daily caps and clear rates remove opaque inflation anxiety.</li>
                <li><strong>Light Token Mode:</strong> Token utility is intentionally narrow until the economy hardens.</li>
                <li><strong>Ethical Treasury & Dev Policy:</strong> Public caps, fee sources, and payout tiers.</li>
                <li><strong>Expand in Phases:</strong> Ship core loop/mastery before complex yield or governance layers.</li>
              </ol>
            </CardContent>
          </Card>

          {/* Core Gameplay */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-accent">Core Gameplay Loop</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
                  <div>
                    <strong>Work Actions → Earn Credits</strong>
                    <p className="text-muted-foreground">Base output improved by owned businesses</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
                  <div>
                    <strong>Buy Businesses → Increase Credit Velocity</strong>
                    <p className="text-muted-foreground">Stack businesses for escalating production multipliers</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
                  <div>
                    <strong>Monitor Exchange Pool → Redeem $WEALTH</strong>
                    <p className="text-muted-foreground">Respect caps & fees, time your conversions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">4</span>
                  <div>
                    <strong>Allocate $WEALTH</strong>
                    <p className="text-muted-foreground">Shields, lottery participation, selective risk</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">5</span>
                  <div>
                    <strong>Iterate → Optimize</strong>
                    <p className="text-muted-foreground">Perfect timing and composition for maximum advantage</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exchange Pool Economics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-accent">Exchange Pool (Current Beta)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Parameters</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Rate:</strong> 75 Credits = 1 $WEALTH</li>
                    <li><strong>Fee:</strong> 1% on input Credits</li>
                    <li><strong>Global Daily Cap:</strong> 1,000 $WEALTH</li>
                    <li><strong>Per-Player Daily Cap:</strong> 10 $WEALTH</li>
                    <li><strong>Reset:</strong> UTC midnight</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Rationale</h4>
                  <p className="text-muted-foreground">
                    One-way conversion with predictable scarcity creates strategic tension. 
                    Simplicity and transparency over complex bonding curves during early development.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Token Utility */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-accent">Current Token Utility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Live Features</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Shields:</strong> 5 / 20 / 50 $WEALTH defensive tiers</li>
                    <li><strong>Lottery:</strong> 25 $WEALTH entry fee</li>
                    <li><strong>Battle Costs:</strong> Various competitive features</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Planned Utilities</h4>
                  <ul className="space-y-2 text-muted-foreground">
                    <li><strong>Phase 2:</strong> Premium Pass, Business marketplace</li>
                    <li><strong>Phase 3:</strong> Land NFTs, Guild features</li>
                    <li><strong>Phase 4:</strong> Governance staking</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Competitive Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-accent">Competitive Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Lottery System</h4>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Entry: 25 $WEALTH</li>
                  <li>• Distribution: 80% winner / 10% Treasury / 10% Redistribution</li>
                  <li>• Future: Multi-tier brackets & progressive jackpots</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Shield Defense</h4>
                <p className="text-muted-foreground">
                  Three tiers of protection (5, 20, 50 $WEALTH) with varying durations. 
                  Strategic timing of shield activation can determine empire survival.
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Business Empire</h4>
                <p className="text-muted-foreground">
                  Tiered business system with increasing Credit multipliers. 
                  Future phases will add synergy sets and specialization bonuses.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Development Roadmap */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-accent">Development Roadmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-accent mb-2">Phase 1: Active Beta</h4>
                  <p className="text-muted-foreground">Core loop, one-way pool, shields, lottery, presence systems</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Phase 2: Economy Deepening</h4>
                  <p className="text-muted-foreground">Synergy businesses, Premium Pass, adaptive pool modifiers, marketplace</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Phase 3: Social & Land</h4>
                  <p className="text-muted-foreground">Guilds, territory control, Land NFT system, audited on-chain enforcement</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Phase 4: Governance & Scale</h4>
                  <p className="text-muted-foreground">Formal governance, cross-chain features, analytics layer</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Success Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-accent">Success Metrics (Beta Focus)</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-muted-foreground">
                <li>• Daily active redemption participation breadth</li>
                <li>• Cap utilization stability (avoiding constant max-out or chronic under-fill)</li>
                <li>• Shield vs lottery spend ratio (balanced risk appetites)</li>
                <li>• Treasury runway growth without aggressive player taxation</li>
              </ul>
            </CardContent>
          </Card>

          {/* Conclusion */}
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl text-accent">Conclusion</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                Wealth Wars (Light Token Beta) prioritizes a tight, comprehensible resource loop: earn Credits → constrained redemption → tactical $WEALTH spending. By deferring complex yield and governance until the base economy is proven, we trade hype velocity for resilience and trust. 
              </p>
              <p className="text-muted-foreground leading-relaxed mt-4">
                Incidental learning emerges from optimizing strategy, not from lectures. Success comes from mastering timing, resource allocation, and competitive pressure in a transparent, fair environment.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}