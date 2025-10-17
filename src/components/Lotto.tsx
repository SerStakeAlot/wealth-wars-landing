import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Coins, Users, Timer, TelegramLogo, ShieldCheck } from '@phosphor-icons/react';
import { apiMe, type MeResponse } from '@/lib/api';

export function Lotto({ onBack }: { onBack: () => void }) {
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function hydrateProfile() {
      try {
        const me = await apiMe();
        if (!active) return;
        setProfile(me);
      } catch (error) {
        console.error('Unable to load lotto profile', error);
        if (!active) return;
        setProfileError('Unable to load your wallet status right now.');
      } finally {
        if (active) setLoadingProfile(false);
      }
    }

    hydrateProfile();

    return () => {
      active = false;
    };
  }, []);

  const shortWallet = (wallet?: string | null) => {
    if (!wallet) return null;
    return `${wallet.slice(0, 4)}…${wallet.slice(-4)}`;
  };

  const walletStatus = (() => {
    if (loadingProfile) return 'Checking wallet link…';
    if (profileError) return profileError;
    if (!profile?.wallet) return 'Wallet not linked yet';
    return `Linked: ${shortWallet(profile.wallet)}`;
  })();

  return (
    <div className="bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="px-0 text-muted-foreground hover:text-accent">
            ← Back
          </Button>
          <Badge variant="secondary" className="bg-accent/10 text-accent backdrop-blur">
            Beta Preview
          </Badge>
        </div>

        <section className="overflow-hidden rounded-3xl border border-accent/20 bg-gradient-to-br from-accent/10 via-background to-background p-8 text-center shadow-lg shadow-accent/5">
          <div className="mx-auto mb-6 mt-2 flex items-center justify-center sm:mb-8" aria-hidden="true">
            <div className="coin-flip">
              <div className="coin-face">WW</div>
              <div className="coin-face back">$W</div>
            </div>
          </div>
          <span className="sr-only">Animated coin flipping to showcase the lotto theme</span>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.3em] text-accent/80">Wealth Wars</p>
          <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            $WEALTH Telegram Lotto
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            Head-to-head matches settle directly in Telegram. Link your wallet, lock your stake, and let the bot handle the showdown.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <a href="https://t.me/WealthWarsLottoBot" target="_blank" rel="noopener noreferrer">
                <TelegramLogo className="h-5 w-5" weight="fill" />
                Launch Telegram Bot
              </a>
            </Button>
            <Button variant="outline" size="lg" onClick={onBack} className="w-full sm:w-auto">
              Back to Main Site
            </Button>
          </div>
          <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground/70">
            Designed to embed cleanly inside the Wealth Wars Telegram WebApp.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Card className="border-accent/20 bg-card/60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Match Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm text-muted-foreground">
              <div className="grid grid-cols-3 gap-3 text-center text-xs sm:text-sm">
                <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <Coins className="mx-auto mb-2 h-5 w-5 text-accent" />
                  <p className="font-semibold text-foreground">1,000</p>
                  <p>Pot (demo)</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <Users className="mx-auto mb-2 h-5 w-5 text-accent" />
                  <p className="font-semibold text-foreground">2</p>
                  <p>Players</p>
                </div>
                <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                  <Timer className="mx-auto mb-2 h-5 w-5 text-accent" />
                  <p className="font-semibold text-foreground">30s</p>
                  <p>Resolution</p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-4 text-center text-sm font-medium text-foreground">
                {walletStatus}
              </div>

              {!loadingProfile && !profile?.wallet && (
                <Button asChild variant="secondary" className="w-full bg-accent text-accent-foreground">
                  <a href="/sign.html" target="_blank" rel="noopener noreferrer">
                    Link Wallet & Sign Message
                  </a>
                </Button>
              )}

              {profile?.wallet && (
                <div className="flex items-center justify-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent">
                  <ShieldCheck className="h-4 w-4" weight="fill" />
                  Wallet verified
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">How It Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">1</span>
                <div>
                  <p className="font-semibold text-foreground">Link your Solana wallet</p>
                  <p>Use the signing flow to verify ownership. The bot will auto-detect your wallet once linked.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">2</span>
                <div>
                  <p className="font-semibold text-foreground">Start or join a match</p>
                  <p>Open the Telegram bot, choose your stake, and wait for an opponent. Minimum entry is 100 $WEALTH.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">3</span>
                <div>
                  <p className="font-semibold text-foreground">Winner takes 80%</p>
                  <p>The match resolves in 30 seconds once locked. 20% feeds the treasury for future events.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="pb-4 text-center text-[11px] text-muted-foreground/70">
          Stats represent demo values while live pooling rolls out. Check Telegram for real-time rounds.
        </footer>
      </div>
    </div>
  );
}