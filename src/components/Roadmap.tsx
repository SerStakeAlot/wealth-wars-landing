import { Button } from '@/components/ui/button';
import WealthWarsLogo from './WealthWarsLogo';
import { useEffect } from 'react';
import { useScrollReveal } from '@/hooks/use-scroll-reveal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface RoadmapProps {
  onBack: () => void;
}

type Milestone = {
  id: string;
  dateLabel: string;
  title: string;
  description?: string;
  status: 'completed' | 'in-progress' | 'planned';
  range?: boolean;
};

// NOTE: Corrected hackathon entry year from 2024 -> 2025 (original input likely a typo)
// and reordered strictly chronological so August precedes September etc.
const milestones: Milestone[] = [
  {
    id: 'idea-created',
    dateLabel: 'Aug 27, 2025',
    title: 'Concept Formalized',
    description: 'Core Wealth Wars economic loop & scarcity mechanics drafted.',
    status: 'completed'
  },
  {
    id: 'dev-start',
    dateLabel: 'Sep 1, 2025',
    title: 'Development Began',
    description: 'Initial codebase + foundational economic systems.',
    status: 'completed'
  },
  {
    id: 'hackathon-entry-2025',
    dateLabel: "Sep 24, 2025",
    title: "Entered Colosseum's hackathon",
    description: 'Initial exposure and competitive framing for the concept.',
    status: 'completed'
  },
  {
    id: 'demo-complete',
    dateLabel: 'Oct 5, 2025',
    title: 'Demo Build Complete',
    description: 'Internal feature-complete demo for hackathon validation.',
    status: 'completed'
  },
  {
    id: 'public-demo',
    dateLabel: 'Oct 20–25, 2025',
    title: 'Public Demo (Credit Earning)',
    description: 'Open limited-time demo to allow early users to earn Credits.',
    status: 'in-progress',
    range: true
  },
  {
    id: 'hackathon-complete',
    dateLabel: 'Oct 30, 2025',
    title: 'Hackathon Competition Ends',
    description: 'Post-event refinement & trajectory planning.',
    status: 'planned'
  },
  {
    id: 'phased-release',
    dateLabel: 'Nov–Dec 2025',
    title: 'Phased Feature Releases',
    description: 'Three staged modules: Lottery, Business Expansion, Battles / Clan layer.',
    status: 'planned',
    range: true
  },
  {
    id: 'full-game',
    dateLabel: 'Jan–Feb 2026',
    title: 'Full Game Launch + Land / City (Exploration)',
    description: 'Complete integrated experience; potential territorial / macro-layer experimentation.',
    status: 'planned',
    range: true
  }
];

const statusStyles: Record<Milestone['status'], string> = {
  completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  'in-progress': 'bg-amber-500/15 text-amber-300 border-amber-400/30',
  planned: 'bg-slate-500/15 text-slate-300 border-slate-400/30'
};

const statusLabel: Record<Milestone['status'], string> = {
  completed: 'Completed',
  'in-progress': 'In Progress',
  planned: 'Planned'
};

export default function Roadmap({ onBack }: RoadmapProps) {
  useScrollReveal('roadmap');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-safe-bottom">
      <header className="flex items-center justify-between px-6 py-4 border-b border-border/50">
        <div className="flex items-center gap-4">
          <WealthWarsLogo size="sm" />
          <h1 className="font-orbitron text-xl tracking-wide gold-gradient">Roadmap</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack}>Back</Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-12">
        <div className="mb-12 text-center scroll-reveal">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 font-orbitron tracking-wide gold-gradient">Progress & Vision</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A transparent look at what&apos;s been built, what&apos;s live, and what&apos;s coming next. Dates are targets and may refine as we optimize core systems.
          </p>
        </div>

        <div className="relative pl-6 md:pl-10">
          {/* Vertical line */}
          <div className="absolute left-2 md:left-4 top-0 bottom-0 w-px bg-gradient-to-b from-accent/60 via-accent/20 to-transparent" />

          <ul className="space-y-8">
            {milestones.map((m, idx) => (
              <li key={m.id} className="scroll-reveal" style={{ animationDelay: `${idx * 0.06}s` }}>
                <div className="relative pl-6 md:pl-10">
                  {/* Node */}
                  <span className={`absolute left-[-14px] md:left-[-10px] top-2 w-6 h-6 rounded-full bg-background border-2 border-accent flex items-center justify-center`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${m.status === 'completed' ? 'bg-accent' : m.status === 'in-progress' ? 'bg-amber-400' : 'bg-slate-400'}`} />
                  </span>
                  <Card className="border-border/40 hover:border-accent/40 transition-colors bg-card/40 backdrop-blur-sm">
                    <CardContent className="pt-6">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-sm uppercase tracking-wider text-accent/90 font-semibold">
                          {m.dateLabel}
                        </span>
                        <Badge variant="outline" className={`text-xs font-medium border ${statusStyles[m.status]}`}>{statusLabel[m.status]}</Badge>
                      </div>
                      <h3 className="text-2xl font-semibold mb-2 font-orbitron tracking-wide">{m.title}</h3>
                      {m.description && (
                        <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                          {m.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-16 text-center text-xs text-muted-foreground/70">
          * Timeline subject to iteration based on balance feedback, infrastructure readiness, and economic integrity safeguards.
        </div>
      </main>
    </div>
  );
}
