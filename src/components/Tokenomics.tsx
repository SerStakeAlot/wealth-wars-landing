import { useEffect } from 'react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import WealthWarsLogo from './WealthWarsLogo';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Vault, GearSix, ChartPieSlice, Lightning, UsersThree, ShieldCheck, WarningCircle, Infinity } from '@phosphor-icons/react';

interface TokenomicsProps { onBack: () => void }

// Data structures
const supply = {
  total: '999,900,236',
  chain: 'Solana (SPL)' ,
  ratio: '1 $WEALTH = 100 Credits'
};

const distribution = [
  { label: 'Public Circulating Supply', percent: '92.39%', tokens: '≈ 923M', description: 'Community holders + open-market liquidity', status: 'circulating' },
  { label: 'Treasury (Oct 30 Unlock)', percent: '5.55%', tokens: '≈ 55.5M', description: 'Founding distribution + game pools', status: 'treasury' },
  { label: 'Developer Vault', percent: '2.06%', tokens: '≈ 20.6M', description: 'Development + demo rewards + liquidity', status: 'dev' },
  { label: 'Additional Private Reserve (~est.)', percent: '~2%', tokens: '≈ 20M', description: 'Backup liquidity / ops reserve (segmented)', status: 'reserve' }
];

const treasuryUnlock = [
  { segment: 'Holder Rewards (Founding Citizens)', percent: '50%', tokens: '27.75M', description: 'Snapshot airdrop (~244 wallets)' },
  { segment: 'In-Game Treasury Pool', percent: '25%', tokens: '13.88M', description: 'Credit → $WEALTH conversion liquidity' },
  { segment: 'Marketing & Partnerships', percent: '15%', tokens: '8.33M', description: 'Campaigns, quests, collaborations' },
  { segment: 'Emergency Reserve', percent: '10%', tokens: '5.55M', description: 'Liquidity / stability buffer' }
];

const devVault = [
  { purpose: 'Demo Player Rewards (Event)', percent: '30%', tokens: '6M', description: 'Activity-weighted distribution (6–10M range)' },
  { purpose: 'Liquidity / Buybacks', percent: '30%', tokens: '6M', description: 'Depth + stability support' },
  { purpose: 'Future Quests / Airdrops', percent: '25%', tokens: '5M', description: 'Engagement & growth incentives' },
  { purpose: 'Development / Operations', percent: '15%', tokens: '3M', description: 'Core build + infra costs' }
];

const economicFramework = [
  { label: 'Soft Conversion Ratio', value: '1 $WEALTH = 100 Credits' },
  { label: 'Daily Clock-In Reward (Aggregate)', value: '≈ 100M Credits (≈ 1M $WEALTH perceived)' },
  { label: 'Per-Player Max Convertible / Day', value: '100k $WEALTH (anti-hoarding cap)' },
  { label: 'Treasury Replenishment', value: '5–10% of inflows / buybacks recycled' },
  { label: 'Inflation Sinks', value: 'Business upgrades, lotteries, fees, anti-bot gating' }
];

const summary = [
  { group: 'Community (Circulating)', allocation: '92.39%', purpose: 'Public holders & market liquidity' },
  { group: 'Treasury (Oct 30 Unlock)', allocation: '5.55%', purpose: 'Founding rewards + game pool' },
  { group: 'Developer Vault', allocation: '2.06%', purpose: 'Demo rewards + liquidity + development' },
  { group: 'Additional Private Reserve', allocation: '~2%', purpose: 'Backup liquidity / operations' },
  { group: 'Total Supply', allocation: '100%', purpose: 'Fixed — 999,900,236 $WEALTH' }
];

const statusColor: Record<string,string> = {
  circulating: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  treasury: 'bg-indigo-500/15 text-indigo-300 border-indigo-400/30',
  dev: 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  reserve: 'bg-slate-500/15 text-slate-300 border-slate-400/30'
};

export default function Tokenomics({ onBack }: TokenomicsProps) {
  useScrollReveal('tokenomics');
  useEffect(()=>{ window.scrollTo({ top:0, behavior: 'instant' as ScrollBehavior }); },[]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-safe-bottom">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50 backdrop-blur-sm bg-background/60 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <WealthWarsLogo size="sm" />
          <h1 className="font-orbitron text-lg sm:text-xl tracking-wide gold-gradient flex items-center gap-3">
            Tokenomics <Badge variant="outline" className="text-[10px] tracking-wider">Overview</Badge>
          </h1>
        </div>
        <Button variant="outline" onClick={onBack}>Back</Button>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12 space-y-24">
        {/* Intro */}
        <section className="max-w-4xl mx-auto text-center scroll-reveal">
          <h2 className="text-4xl md:text-5xl font-orbitron font-bold tracking-wide mb-6 gold-gradient">🪙 Wealth Wars Tokenomics & Allocation</h2>
          <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
            Finalized framework for <span className="text-accent font-semibold">wealthwars.fun</span>. A transparent breakdown of supply, unlock logic, incentive scaffolding & long-term sustainability levers.
          </p>
          <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
            <Badge variant="outline" className="bg-accent/10 text-accent border-accent/40 flex items-center gap-1"><Coins size={14}/> Total Supply: {supply.total}</Badge>
            <Badge variant="outline" className="bg-card/40 border-border/40 flex items-center gap-1"><Lightning size={14}/> Chain: {supply.chain}</Badge>
            <Badge variant="outline" className="bg-card/40 border-border/40 flex items-center gap-1"><GearSix size={14}/> Ratio: {supply.ratio}</Badge>
          </div>
          <p className="mt-4 text-xs text-muted-foreground/60">* Values approximate; formatting & rounding may produce small aggregate variance.</p>
        </section>

        {/* Distribution Summary */}
        <section>
          <div className="mb-10 text-center scroll-reveal">
            <h3 className="text-3xl md:text-4xl font-bold font-orbitron tracking-wide mb-4 gold-gradient">💰 Distribution Summary</h3>
            <p className="text-muted-foreground max-w-3xl mx-auto">Macro allocation across circulating, strategic pools and controlled reserves.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="scroll-reveal border-border/40 bg-card/40 backdrop-blur-sm">
              <CardHeader><CardTitle className="text-xl flex items-center gap-2"><ChartPieSlice size={26} className="text-accent"/>Allocation Table</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm border-separate border-spacing-y-2">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground/70">
                    <tr><th className="text-left pr-4 py-1">Category</th><th className="text-left pr-4 py-1">% Supply</th><th className="text-left pr-4 py-1">Tokens</th><th className="text-left py-1">Description</th></tr>
                  </thead>
                  <tbody className="align-top text-muted-foreground">
                    {distribution.map((d,i) => (
                      <tr key={d.label} className="hover:bg-accent/5 transition-colors">
                        <td className="py-2 pr-4 font-medium text-foreground flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusColor[d.status]}`}>{d.percent}</span>{d.label}
                        </td>
                        <td className="py-2 pr-4">{d.percent}</td>
                        <td className="py-2 pr-4">{d.tokens}</td>
                        <td className="py-2">{d.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className="scroll-reveal border-accent/30 bg-card/40 backdrop-blur-sm" style={{animationDelay:'0.08s'}}>
              <CardHeader><CardTitle className="text-xl flex items-center gap-2"><ShieldCheck size={26} className="text-accent"/>Supply Integrity</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm md:text-base text-muted-foreground">
                <p><span className="text-foreground font-semibold">Fixed Supply:</span> {supply.total} $WEALTH — no additional minting planned.</p>
                <p><span className="text-foreground font-semibold">Controlled Pools:</span> Combined Treasury + Developer Vault represents ≈ 7.61% strategic governance & emissions pacing.</p>
                <p><span className="text-foreground font-semibold">Reserve (~2%):</span> Segregated for contingency & liquidity smoothing; may remain dormant unless market health requires deployment.</p>
                <p className="text-xs text-amber-300/80 flex items-start gap-2"><WarningCircle size={16} className="mt-0.5"/>Rounding plus provisional reserve modeling can cause temporary sum {'>'} 100%. Final live audit will publish exact on-chain splits.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Treasury Unlock */}
        <section>
          <div className="mb-10 text-center scroll-reveal">
            <h3 className="text-3xl md:text-4xl font-bold font-orbitron tracking-wide mb-4 gold-gradient">🏦 October 30 — Treasury Unlock (5.55%)</h3>
            <p className="text-muted-foreground max-w-3xl mx-auto">“The First Treasury Opening” — structured release aligned with early player value & ecosystem bootstrapping.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="scroll-reveal border-border/40 bg-card/40 backdrop-blur-sm">
              <CardHeader><CardTitle className="text-xl flex items-center gap-2"><Vault size={26} className="text-accent"/>Unlock Segments</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto text-sm">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground/70"><tr><th className="text-left pr-4 py-1">Segment</th><th className="text-left pr-4 py-1">% of Unlock</th><th className="text-left pr-4 py-1">Tokens</th><th className="text-left py-1">Description</th></tr></thead>
                  <tbody className="align-top text-muted-foreground">
                    {treasuryUnlock.map(r => (
                      <tr key={r.segment} className="hover:bg-accent/5 transition-colors">
                        <td className="py-2 pr-4 font-medium text-foreground">{r.segment}</td>
                        <td className="py-2 pr-4">{r.percent}</td>
                        <td className="py-2 pr-4">{r.tokens}</td>
                        <td className="py-2">{r.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className="scroll-reveal border-accent/30 bg-card/40 backdrop-blur-sm" style={{animationDelay:'0.08s'}}>
              <CardHeader><CardTitle className="text-xl flex items-center gap-2"><UsersThree size={26} className="text-accent"/>Snapshot Mechanics</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm md:text-base text-muted-foreground">
                <p><span className="text-foreground font-semibold">Snapshot:</span> Oct 30 00:00 UTC — Founding Citizen wallets frozen for distribution logic.</p>
                <p><span className="text-foreground font-semibold">Distribution:</span> Airdrop or claim portal (TBA) — anti-sybil filters applied.</p>
                <p><span className="text-foreground font-semibold">Emission Discipline:</span> Pools unlock only per roadmap gating + economic health signals.</p>
                <p className="text-xs text-muted-foreground/60">Holder reward tranche sized to recognize early belief without destabilizing secondary liquidity.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Developer Vault */}
        <section>
          <div className="mb-10 text-center scroll-reveal">
            <h3 className="text-3xl md:text-4xl font-bold font-orbitron tracking-wide mb-4 gold-gradient">🧱 Developer Vault (2.06%)</h3>
            <p className="text-muted-foreground max-w-3xl mx-auto">Structured to fund growth, reward early actions, and maintain adaptive liquidity response.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="scroll-reveal border-border/40 bg-card/40 backdrop-blur-sm">
              <CardHeader><CardTitle className="text-xl flex items-center gap-2"><Vault size={26} className="text-accent"/>Vault Allocation</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto text-sm">
                <table className="w-full border-separate border-spacing-y-2">
                  <thead className="text-xs uppercase tracking-wider text-muted-foreground/70"><tr><th className="text-left pr-4 py-1">Purpose</th><th className="text-left pr-4 py-1">% of Vault</th><th className="text-left pr-4 py-1">Tokens</th><th className="text-left py-1">Description</th></tr></thead>
                  <tbody className="align-top text-muted-foreground">
                    {devVault.map(r => (
                      <tr key={r.purpose} className="hover:bg-accent/5 transition-colors">
                        <td className="py-2 pr-4 font-medium text-foreground">{r.purpose}</td>
                        <td className="py-2 pr-4">{r.percent}</td>
                        <td className="py-2 pr-4">{r.tokens}</td>
                        <td className="py-2">{r.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            <Card className="scroll-reveal border-accent/30 bg-card/40 backdrop-blur-sm" style={{animationDelay:'0.08s'}}>
              <CardHeader><CardTitle className="text-xl flex items-center gap-2"><Lightning size={26} className="text-accent"/>Incentive Design</CardTitle></CardHeader>
              <CardContent className="space-y-4 text-sm md:text-base text-muted-foreground">
                <p><span className="text-foreground font-semibold">Balanced Mix:</span> Player rewards, market health, and future questing each receive dedicated slices.</p>
                <p><span className="text-foreground font-semibold">Adaptive Use:</span> Liquidity & buyback segment deploys only on volatility triggers.</p>
                <p><span className="text-foreground font-semibold">Future-Proofing:</span> Airdrop & quest tranche fuels sustained discovery loops.</p>
                <p className="text-xs text-muted-foreground/60 flex items-center gap-1"><Infinity size={14} /> Dynamic allocations may be tuned pre-mainnet launch; any change announced transparently.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Economic Framework */}
        <section>
          <div className="mb-10 text-center scroll-reveal">
            <h3 className="text-3xl md:text-4xl font-bold font-orbitron tracking-wide mb-4 gold-gradient">⚙️ Economic Framework</h3>
            <p className="text-muted-foreground max-w-3xl mx-auto">Simplified operational levers shaping emission pacing & value recycling.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {economicFramework.map((f,i)=>(
              <Card key={f.label} className="scroll-reveal border-border/40 bg-card/40 backdrop-blur-sm" style={{animationDelay:`${i*0.05}s`}}>
                <CardHeader><CardTitle className="text-base font-orbitron tracking-wide text-accent">{f.label}</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground leading-relaxed">{f.value}</CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Vision */}
        <section className="scroll-reveal">
          <Card className="border-accent/30 bg-card/40 backdrop-blur-sm">
            <CardHeader><CardTitle className="text-2xl font-orbitron tracking-wide gold-gradient">🌐 Vision Statement</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-muted-foreground text-lg leading-relaxed">
              <p>Wealth Wars is building a player-driven economy where Credits earned through daily engagement translate into real treasury value. Early Citizens share in the foundation, while future gameplay & business systems reinforce long-term stability and emergent strategy.</p>
            </CardContent>
          </Card>
        </section>

        {/* Summary Table */}
        <section>
          <div className="mb-10 text-center scroll-reveal">
            <h3 className="text-3xl md:text-4xl font-bold font-orbitron tracking-wide mb-4 gold-gradient">✅ Summary</h3>
          </div>
          <Card className="scroll-reveal border-border/40 bg-card/40 backdrop-blur-sm">
            <CardContent className="pt-6 overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-y-2">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground/70"><tr><th className="text-left pr-4 py-1">Group</th><th className="text-left pr-4 py-1">Allocation</th><th className="text-left py-1">Purpose</th></tr></thead>
                <tbody className="align-top text-muted-foreground">
                  {summary.map(s => (
                    <tr key={s.group} className="hover:bg-accent/5 transition-colors">
                      <td className="py-2 pr-4 font-medium text-foreground">{s.group}</td>
                      <td className="py-2 pr-4">{s.allocation}</td>
                      <td className="py-2">{s.purpose}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-4 text-xs text-muted-foreground/60">Rounding + provisional reserve modeling may cause temporary aggregate {'>'} 100%. Final audited splits will be published before main launch.</p>
            </CardContent>
          </Card>
        </section>

        <section className="text-center text-xs text-muted-foreground/60 pt-12 border-t border-border/40">
          * All token-related representations are informational only and may adjust pending security review & economic audits.
        </section>
      </main>
    </div>
  );
}
