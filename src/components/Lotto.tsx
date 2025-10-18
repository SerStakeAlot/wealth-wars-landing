import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Coins, Users, Timer, TelegramLogo, ShieldCheck, Trophy, ArrowRight, CheckCircle } from '@phosphor-icons/react';
import {
  apiMe,
  type MeResponse,
  apiLottoCurrentRound,
  apiLottoJoinWeb,
  apiLottoClaimPayout,
  apiLottoHealth,
  apiLottoCreateRound,
  apiLottoCloseRound,
  apiLottoSettleRound,
} from '@/lib/api';

export function Lotto({ onBack }: { onBack: () => void }) {
  const [profile, setProfile] = useState<MeResponse | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  
  // Current round state
  const [currentRound, setCurrentRound] = useState<any>(null);
  const [loadingRound, setLoadingRound] = useState(true);
  const [roundError, setRoundError] = useState<string | null>(null);
  
  // Join form state
  const [username, setUsername] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  
  // Claim state
  const [claimableEntries, setClaimableEntries] = useState<any[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  
  // Backend health
  const [backendHealthy, setBackendHealthy] = useState<boolean | null>(null);

  // Admin state
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [createFormData, setCreateFormData] = useState({
    ticketPriceLamports: 10000000, // 0.01 SOL
    maxEntries: 100,
    durationSlots: 43200, // ~1 day
    retainedBps: 1000, // 10%
  });
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminSuccess, setAdminSuccess] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);

  // Load profile
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

  // Load current round
  useEffect(() => {
    let active = true;

    async function loadRound() {
      try {
        const round = await apiLottoCurrentRound();
        if (!active) return;
        setCurrentRound(round.data.round);
        
        // Check for claimable entries (won entries)
        if (round.data.entries && profile?.wallet) {
          const myEntries = round.data.entries.filter((e: any) => 
            e.wallet?.toLowerCase() === profile.wallet?.toLowerCase()
          );
          setClaimableEntries(myEntries);
        }
      } catch (error) {
        console.error('Unable to load current round', error);
        if (!active) return;
        setRoundError('No active lotto round at the moment.');
      } finally {
        if (active) setLoadingRound(false);
      }
    }

    if (!loadingProfile) {
      loadRound();
    }

    return () => {
      active = false;
    };
  }, [loadingProfile, profile]);

  // Check backend health
  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        const health = await apiLottoHealth();
        if (!active) return;
        setBackendHealthy(health.data.healthy);
      } catch (error) {
        console.error('Backend health check failed', error);
        if (!active) return;
        setBackendHealthy(false);
      }
    }

    checkHealth();

    return () => {
      active = false;
    };
  }, []);

  const handleJoinRound = async () => {
    if (!profile?.wallet) {
      setJoinError('Please link your wallet first');
      return;
    }

    if (!username.trim()) {
      setJoinError('Please enter a username');
      return;
    }

    if (!currentRound) {
      setJoinError('No active round');
      return;
    }

    setJoining(true);
    setJoinError(null);
    setJoinSuccess(false);

    try {
      await apiLottoJoinWeb(currentRound.id, profile.wallet, username.trim());
      setJoinSuccess(true);
      
      // Reload round to show updated entry
      const round = await apiLottoCurrentRound();
      setCurrentRound(round.data.round);
    } catch (error: any) {
      console.error('Failed to join round', error);
      setJoinError(error.message || 'Failed to join round. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleClaimPayout = async (entryId: string) => {
    if (!profile?.wallet) {
      setClaimError('Please link your wallet first');
      return;
    }

    setClaiming(true);
    setClaimError(null);
    setClaimSuccess(null);

    try {
      const result = await apiLottoClaimPayout(entryId, profile.wallet);
      setClaimSuccess(`Claimed ${result.data.entry.wonAmountLamports / 1e9} SOL!`);
      
      // Remove from claimable entries
      setClaimableEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (error: any) {
      console.error('Failed to claim payout', error);
      setClaimError(error.message || 'Failed to claim payout. Please try again.');
    } finally {
      setClaiming(false);
    }
  };

  // Admin handlers
  const handleCreateRound = async () => {
    if (!adminToken.trim()) {
      setAdminError('Admin token is required');
      return;
    }

    setAdminLoading(true);
    setAdminError(null);
    setAdminSuccess(null);

    try {
      const result = await apiLottoCreateRound(
        createFormData.ticketPriceLamports,
        createFormData.maxEntries,
        createFormData.durationSlots,
        createFormData.retainedBps,
        adminToken
      );
      setAdminSuccess(`Round created successfully! ID: ${result.data.round.id}`);
      // Reload current round
      loadCurrentRound();
    } catch (error: any) {
      console.error('Failed to create round', error);
      setAdminError(error.message || 'Failed to create round');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleCloseRound = async () => {
    if (!currentRound || !adminToken.trim()) {
      setAdminError('No active round or admin token missing');
      return;
    }

    setAdminLoading(true);
    setAdminError(null);
    setAdminSuccess(null);

    try {
      await apiLottoCloseRound(currentRound.id, adminToken);
      setAdminSuccess('Round closed successfully');
      loadCurrentRound();
    } catch (error: any) {
      console.error('Failed to close round', error);
      setAdminError(error.message || 'Failed to close round');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSettleRound = async () => {
    if (!currentRound || !adminToken.trim()) {
      setAdminError('No active round or admin token missing');
      return;
    }

    setAdminLoading(true);
    setAdminError(null);
    setAdminSuccess(null);

    try {
      const result = await apiLottoSettleRound(currentRound.id, adminToken);
      setAdminSuccess(
        `Round settled! Winner: ${result.data.settlement.winner.slice(0, 8)}... Payout: ${
          parseInt(result.data.settlement.payoutAmount) / 1e9
        } SOL`
      );
      loadCurrentRound();
    } catch (error: any) {
      console.error('Failed to settle round', error);
      setAdminError(error.message || 'Failed to settle round');
    } finally {
      setAdminLoading(false);
    }
  };

  const loadCurrentRound = async () => {
    try {
      setLoadingRound(true);
      const response = await apiLottoCurrentRound();
      if (response.data?.round) {
        setCurrentRound(response.data.round);
      }
    } catch (error) {
      console.error('Failed to load round', error);
    } finally {
      setLoadingRound(false);
    }
  };

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
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack} className="px-0 text-muted-foreground hover:text-accent">
            ← Back
          </Button>
          <div className="flex items-center gap-2">
            {backendHealthy !== null && (
              <Badge variant={backendHealthy ? "default" : "destructive"} className="text-xs">
                {backendHealthy ? "🟢 Live" : "🔴 Offline"}
              </Badge>
            )}
            <Badge variant="secondary" className="bg-accent/10 text-accent backdrop-blur">
              Beta Preview
            </Badge>
          </div>
        </div>

        {/* Hero Section */}
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
            $WEALTH Lotto
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:text-base">
            On-chain lottery powered by Solana. Join rounds, compete with others, and claim your winnings directly to your wallet.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="gap-2">
              <a href="https://t.me/WealthWarsLottoBot" target="_blank" rel="noopener noreferrer">
                <TelegramLogo className="h-5 w-5" weight="fill" />
                Launch Telegram Bot
              </a>
            </Button>
          </div>
        </section>

        {/* Claimable Winnings Alert */}
        {claimableEntries.length > 0 && (
          <Alert className="border-accent/40 bg-accent/10">
            <Trophy className="h-4 w-4 text-accent" weight="fill" />
            <AlertDescription>
              <strong>Congratulations!</strong> You have {claimableEntries.length} winning {claimableEntries.length === 1 ? 'entry' : 'entries'} to claim.
            </AlertDescription>
          </Alert>
        )}

        {/* Main Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Round Card */}
          <Card className="border-accent/20 bg-card/60">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Current Round</CardTitle>
              <CardDescription>
                {loadingRound ? 'Loading round...' : roundError ? roundError : 'Active lotto round'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {loadingRound ? (
                <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>
              ) : currentRound ? (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center text-xs sm:text-sm">
                    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                      <Coins className="mx-auto mb-2 h-5 w-5 text-accent" />
                      <p className="font-semibold text-foreground">{(currentRound.ticketPriceLamports / 1e9).toFixed(2)}</p>
                      <p className="text-muted-foreground">SOL/Entry</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                      <Users className="mx-auto mb-2 h-5 w-5 text-accent" />
                      <p className="font-semibold text-foreground">{currentRound.totalEntries || 0}</p>
                      <p className="text-muted-foreground">Entries</p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                      <Timer className="mx-auto mb-2 h-5 w-5 text-accent" />
                      <p className="font-semibold text-foreground">{currentRound.status}</p>
                      <p className="text-muted-foreground">Status</p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-4 text-center">
                    <p className="text-sm font-medium text-foreground mb-1">Prize Pool</p>
                    <p className="text-2xl font-bold text-accent">
                      {((currentRound.ticketPriceLamports * (currentRound.totalEntries || 0)) / 1e9).toFixed(2)} SOL
                    </p>
                  </div>

                  <div className="rounded-2xl border border-dashed border-accent/40 bg-accent/5 p-4 text-center text-sm font-medium text-foreground">
                    {walletStatus}
                  </div>
                </>
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No active round. Check Telegram bot for updates.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Join Round Card */}
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Join Round</CardTitle>
              <CardDescription>Enter the current lotto round</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!profile?.wallet ? (
                <div className="space-y-4">
                  <Alert>
                    <ShieldCheck className="h-4 w-4" />
                    <AlertDescription>
                      Link your Solana wallet to participate in the lotto.
                    </AlertDescription>
                  </Alert>
                  <Button asChild variant="secondary" className="w-full bg-accent text-accent-foreground">
                    <a href="/sign.html" target="_blank" rel="noopener noreferrer">
                      Link Wallet & Sign Message
                    </a>
                  </Button>
                </div>
              ) : joinSuccess ? (
                <div className="space-y-4 text-center py-6">
                  <CheckCircle className="mx-auto h-12 w-12 text-accent" weight="fill" />
                  <p className="font-semibold text-accent">Successfully joined the round!</p>
                  <p className="text-sm text-muted-foreground">Good luck! Check back when the round settles.</p>
                  <Button onClick={() => setJoinSuccess(false)} variant="outline" className="w-full">
                    Join Another Round
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-accent">
                    <ShieldCheck className="h-4 w-4" weight="fill" />
                    Wallet verified
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">Display Username</Label>
                    <Input
                      id="username"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={joining || !currentRound || currentRound.status !== 'open'}
                    />
                  </div>

                  {joinError && (
                    <Alert variant="destructive">
                      <AlertDescription>{joinError}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    onClick={handleJoinRound}
                    disabled={joining || !currentRound || currentRound.status !== 'open' || !username.trim()}
                    className="w-full gap-2"
                  >
                    {joining ? 'Joining...' : (
                      <>
                        Join for {currentRound ? (currentRound.ticketPriceLamports / 1e9).toFixed(2) : '0.00'} SOL
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {!currentRound && (
                    <p className="text-xs text-center text-muted-foreground">
                      No active round available
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Claim Winnings Section */}
        {claimableEntries.length > 0 && (
          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-accent" weight="fill" />
                Claim Your Winnings
              </CardTitle>
              <CardDescription>You have unclaimed winning entries!</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {claimSuccess && (
                <Alert className="border-accent/40 bg-accent/10">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <AlertDescription>{claimSuccess}</AlertDescription>
                </Alert>
              )}

              {claimError && (
                <Alert variant="destructive">
                  <AlertDescription>{claimError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-3">
                {claimableEntries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg border border-accent/30 bg-background/60 p-4">
                    <div>
                      <p className="font-semibold text-foreground">Round Entry</p>
                      <p className="text-sm text-muted-foreground">Won: {(entry.wonAmountLamports / 1e9).toFixed(2)} SOL</p>
                    </div>
                    <Button
                      onClick={() => handleClaimPayout(entry.id)}
                      disabled={claiming}
                      className="gap-2"
                    >
                      {claiming ? 'Claiming...' : 'Claim'}
                      <Coins className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Controls */}
        <Card className="border-accent/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Admin Controls</CardTitle>
                <CardDescription>Manage lotto rounds (requires admin token)</CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdmin(!showAdmin)}
              >
                {showAdmin ? 'Hide' : 'Show'}
              </Button>
            </div>
          </CardHeader>
          {showAdmin && (
            <CardContent>
              <Tabs defaultValue="create" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="create">Create</TabsTrigger>
                  <TabsTrigger value="manage">Manage</TabsTrigger>
                  <TabsTrigger value="token">Token</TabsTrigger>
                </TabsList>

                {/* Create Round Tab */}
                <TabsContent value="create" className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ticketPrice">Ticket Price (lamports)</Label>
                      <Input
                        id="ticketPrice"
                        type="number"
                        value={createFormData.ticketPriceLamports}
                        onChange={(e) =>
                          setCreateFormData((prev) => ({
                            ...prev,
                            ticketPriceLamports: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        {(createFormData.ticketPriceLamports / 1e9).toFixed(4)} SOL
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxEntries">Max Entries</Label>
                      <Input
                        id="maxEntries"
                        type="number"
                        value={createFormData.maxEntries}
                        onChange={(e) =>
                          setCreateFormData((prev) => ({
                            ...prev,
                            maxEntries: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="durationSlots">Duration (slots)</Label>
                      <Input
                        id="durationSlots"
                        type="number"
                        value={createFormData.durationSlots}
                        onChange={(e) =>
                          setCreateFormData((prev) => ({
                            ...prev,
                            durationSlots: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        ~{Math.floor(createFormData.durationSlots / 43200)} days
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="retainedBps">Treasury Cut (bps)</Label>
                      <Input
                        id="retainedBps"
                        type="number"
                        value={createFormData.retainedBps}
                        onChange={(e) =>
                          setCreateFormData((prev) => ({
                            ...prev,
                            retainedBps: parseInt(e.target.value) || 0,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        {(createFormData.retainedBps / 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleCreateRound}
                    disabled={adminLoading || !adminToken.trim()}
                    className="w-full"
                  >
                    {adminLoading ? 'Creating...' : 'Create New Round'}
                  </Button>
                </TabsContent>

                {/* Manage Round Tab */}
                <TabsContent value="manage" className="space-y-4">
                  {currentRound ? (
                    <div className="space-y-4">
                      <div className="rounded-lg border border-border bg-background/60 p-4">
                        <p className="text-sm font-medium text-foreground">Current Round</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ID: {currentRound.id}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Status: <Badge variant="secondary">{currentRound.status}</Badge>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Entries: {currentRound.totalEntries || 0} / {currentRound.maxEntries}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={handleCloseRound}
                          disabled={adminLoading || !adminToken.trim() || currentRound.status !== 'open'}
                          variant="outline"
                          className="w-full"
                        >
                          {adminLoading ? 'Closing...' : 'Close Round'}
                        </Button>

                        <Button
                          onClick={handleSettleRound}
                          disabled={adminLoading || !adminToken.trim() || currentRound.status !== 'closed'}
                          className="w-full"
                        >
                          {adminLoading ? 'Settling...' : 'Settle Round'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      No active round
                    </p>
                  )}
                </TabsContent>

                {/* Token Tab */}
                <TabsContent value="token" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="adminToken">Admin API Token</Label>
                    <Input
                      id="adminToken"
                      type="password"
                      placeholder="Enter admin token..."
                      value={adminToken}
                      onChange={(e) => setAdminToken(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Token is stored locally and required for all admin operations
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <Separator className="my-4" />

              {/* Admin feedback */}
              {adminSuccess && (
                <Alert className="border-accent/40 bg-accent/10">
                  <CheckCircle className="h-4 w-4 text-accent" />
                  <AlertDescription>{adminSuccess}</AlertDescription>
                </Alert>
              )}

              {adminError && (
                <Alert variant="destructive">
                  <AlertDescription>{adminError}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          )}
        </Card>

        {/* How It Works */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">1</span>
              <div>
                <p className="font-semibold text-foreground">Link your Solana wallet</p>
                <p>Use the signing flow to verify ownership. Your wallet will be used for entries and payouts.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">2</span>
              <div>
                <p className="font-semibold text-foreground">Join an active round</p>
                <p>Enter your username and join the current round. The entry fee is deducted from your wallet.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">3</span>
              <div>
                <p className="font-semibold text-foreground">Wait for settlement</p>
                <p>When the round ends, winners are selected on-chain. Check back to claim your winnings!</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">4</span>
              <div>
                <p className="font-semibold text-foreground">Claim your payout</p>
                <p>If you win, claim your SOL directly to your wallet. Winners are verifiable on-chain.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <footer className="pb-4 text-center text-[11px] text-muted-foreground/70">
          Powered by Solana blockchain. All transactions are verifiable on-chain.
        </footer>
      </div>
    </div>
  );
}