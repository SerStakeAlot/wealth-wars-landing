import { useEffect } from 'react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import WealthWarsLogo from './WealthWarsLogo';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, ShareNetwork, Clock, ChartLineUp, Vault, Lightning, Crown, ArrowBendUpRight } from '@phosphor-icons/react';

interface DemoProps {
  onBack: () => void;
}

export default function Demo({ onBack }: DemoProps) {
  useScrollReveal('demo');
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-safe-bottom">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 backdrop-blur-sm bg-background/60 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          <WealthWarsLogo size="sm" />
          <h1 className="font-orbitron text-lg sm:text-xl tracking-wide gold-gradient flex items-center gap-3">
            Demo <Badge variant="outline" className="text-xs bg-amber-500/15 text-amber-300 border-amber-400/40">Coming Soon</Badge>
          </h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>Back</Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-12 space-y-24">
        {/* Hero */}
        <section className="text-center max-w-4xl mx-auto scroll-reveal">
          <h2 className="text-4xl md:text-5xl font-orbitron font-bold tracking-wide mb-4 gold-gradient">🕹️ Wealth Wars Demo — Coming Soon</h2>
          <p className="text-2xl md:text-3xl font-orbitron tracking-wide text-accent mb-6">The First Citizens Rise.</p>
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
            The Wealth Wars Demo marks the first playable chapter of our economy. This short event lets early Citizens earn Credits, climb the leaderboard, and secure a share of the first Developer Vault reward — up to <span className="text-accent font-semibold">10,000,000 $WEALTH</span> in total.
          </p>
          <p className="text-muted-foreground text-lg md:text-xl mt-6 leading-relaxed">
            Your activity in this phase will carry forward into the main game. The earliest players won’t just test the system — they’ll shape the foundation of the future economy.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button variant="outline" disabled className="cursor-not-allowed opacity-70">Not Live Yet</Button>
            <Button variant="ghost" onClick={onBack}>Return Home</Button>
          </div>
        </section>

        {/* How to Play */}
        <section>
          <div className="mb-12 text-center scroll-reveal">
            <h3 className="text-3xl md:text-4xl font-bold font-orbitron tracking-wide mb-4 gold-gradient">⚙️ How to Play</h3>
            <p className="text-muted-foreground max-w-3xl mx-auto text-lg">Engage the loop, amplify your Credits, and secure your founding position.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="scroll-reveal border-border/40 bg-card/40 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center gap-3"><Clock size={36} className="text-accent" /><CardTitle className="text-xl">1️⃣ Clock-In Every 30 Minutes</CardTitle></div>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>Each successful clock-in = <span className="text-accent font-semibold">1,000 Credits</span>.</p>
                <p>Cooldown: 30 minutes between clock-ins.</p>
                <p>Consistency compounds advantage.</p>
              </CardContent>
            </Card>
            <Card className="scroll-reveal border-border/40 bg-card/40 backdrop-blur-sm" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <div className="flex items-center gap-3"><ShareNetwork size={36} className="text-accent" /><CardTitle className="text-xl">2️⃣ Share to Earn Extra Clicks</CardTitle></div>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>Each verified share = +1 bonus click (+1,000 Credits).</p>
                <p>Shares also refresh your timer.</p>
                <p>Max 5 bonus shares / day (anti-spam).</p>
              </CardContent>
            </Card>
            <Card className="scroll-reveal border-border/40 bg-card/40 backdrop-blur-sm" style={{ animationDelay: '0.2s' }}>
              <CardHeader>
                <div className="flex items-center gap-3"><ChartLineUp size={36} className="text-accent" /><CardTitle className="text-xl">3️⃣ Watch Credits Stack</CardTitle></div>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>Tracked off-chain via secure game server.</p>
                <p>All Credits contribute toward October 30 snapshot.</p>
                <p>Early grinding = stronger position.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Vault Event */}
        <section>
          <div className="mb-12 text-center scroll-reveal">
            <h3 className="text-3xl md:text-4xl font-bold font-orbitron tracking-wide mb-4 gold-gradient">🏦 The Developer’s Vault Event</h3>
            <p className="text-muted-foreground max-w-3xl mx-auto text-lg">A one-time distribution rewarding early productive participation.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-start">
            <Card className="scroll-reveal border-accent/30 bg-card/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><Vault size={28} className="text-accent" />Vault Distribution</CardTitle>
              </CardHeader>
              <CardContent className="text-sm md:text-base">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-2">
                    <thead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                      <tr>
                        <th className="py-1 pr-4">Pool</th>
                        <th className="py-1">Details</th>
                      </tr>
                    </thead>
                    <tbody className="align-top text-muted-foreground">
                      <tr className="hover:bg-accent/5 transition-colors">
                        <td className="py-2 pr-4 font-semibold text-foreground">Demo Player Rewards</td>
                        <td className="py-2">6M–10M $WEALTH airdropped proportionally to total Credits earned.</td>
                      </tr>
                      <tr className="hover:bg-accent/5 transition-colors">
                        <td className="py-2 pr-4 font-semibold text-foreground">Snapshot Time</td>
                        <td className="py-2">Oct 30, 00:00 UTC – player totals freeze.</td>
                      </tr>
                      <tr className="hover:bg-accent/5 transition-colors">
                        <td className="py-2 pr-4 font-semibold text-foreground">Distribution</td>
                        <td className="py-2">Direct to wallet (claim flow or auto, TBA).</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-xs text-muted-foreground/70">Your share scales with your total Credits earned. Consistency {'>'} bursts.</p>
              </CardContent>
            </Card>
            <Card className="scroll-reveal border-border/40 bg-card/40 backdrop-blur-sm" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><Lightning size={28} className="text-accent" />Carryover Into Main Game</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm md:text-base text-muted-foreground">
                <p><span className="text-foreground font-semibold">Founding Credits</span> convert from demo Credits, granting a measurable head start.</p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>1–2% of starting main economy reserved for demo participants.</li>
                  <li>Conversion proportional to your share of total demo Credits.</li>
                  <li>Preserves early prestige & incentivizes sustained engagement.</li>
                </ul>
                <blockquote className="border-l-2 border-accent/50 pl-4 italic text-accent/90 text-sm">“Founding Credits from the first demo will be honored at launch — the earliest Citizens begin their new lives with a head start.”</blockquote>
                <div className="flex items-center gap-3 pt-2">
                  <Crown size={24} className="text-accent" />
                  <span className="text-foreground">Title Badge: <span className="font-semibold text-accent">“Founding Citizen — Season Zero.”</span></span>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-4">Note: In main economy, daily conversions draw from a <span className="text-accent font-semibold">1,000,000 $WEALTH</span> global pool shared across active players. Effective per-player limit is min(100k, Pool / Actives).</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* How to Win */}
        <section>
          <div className="mb-12 text-center scroll-reveal">
            <h3 className="text-3xl md:text-4xl font-bold font-orbitron tracking-wide mb-4 gold-gradient">🎖️ How to Win</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="scroll-reveal border-border/40 bg-card/40 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><Trophy size={26} className="text-accent" />Core Strategies</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-muted-foreground text-sm md:text-base">
                  <li><span className="text-foreground font-medium">Clock in often:</span> every 30 minutes counts.</li>
                  <li><span className="text-foreground font-medium">Share strategically:</span> each verified share = extra click.</li>
                  <li><span className="text-foreground font-medium">Maintain streaks:</span> consistency outpaces burst grinding.</li>
                  <li><span className="text-foreground font-medium">Climb the leaderboard:</span> top 10 gain amplified recognition.</li>
                  <li><span className="text-foreground font-medium">Be early:</span> Credits convert into Founding Credits later.</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="scroll-reveal border-accent/30 bg-card/40 backdrop-blur-sm" style={{ animationDelay: '0.1s' }}>
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2"><ArrowBendUpRight size={26} className="text-accent" />Tagline</CardTitle>
              </CardHeader>
              <CardContent className="text-center py-10">
                <p className="font-orbitron tracking-wide text-2xl md:text-3xl gold-gradient leading-snug">The Vault Opens October 30</p>
                <p className="mt-4 text-muted-foreground text-lg">Earn. Share. Rise. Become a Founding Citizen.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="text-center text-xs text-muted-foreground/60 pt-12 border-t border-border/40">
          * All parameters subject to tuning for fairness & economic integrity prior to live activation.
        </section>
      </main>
    </div>
  );
}
