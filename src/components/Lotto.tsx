import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trophy, Coins, Users, Timer, Zap, Crown } from '@phosphor-icons/react';
import { apiMe } from '@/lib/api';

interface Round {
  id: string;
  status: 'OPEN' | 'CLOSED' | 'SETTLED';
  potAmount: number;
  winner?: string;
  entries: any[];
}

interface Entry {
  id: string;
  amount: number;
  ticketCount: number;
  round: Round;
}

export function Lotto({ onBack }: { onBack: () => void }) {
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [myEntries, setMyEntries] = useState<Entry[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [stats, setStats] = useState({
    totalPot: 0,
    totalRounds: 0,
    totalWinners: 0,
    treasuryBalance: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [roundRes, entriesRes, meRes, roundsRes] = await Promise.all([
        fetch('/api/lotto/current-round'),
        fetch('/api/lotto/my-entries'),
        apiMe(),
        fetch('/api/lotto/rounds'),
      ]);
      if (roundRes.ok) setCurrentRound(await roundRes.json());
      if (entriesRes.ok) setMyEntries(await entriesRes.json());
      if (meRes) setMe(meRes);
      if (roundsRes.ok) {
        const data = await roundsRes.json();
        setRounds(data);
        calculateStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const calculateStats = (rounds: Round[]) => {
    const totalPot = rounds.reduce((sum, r) => sum + r.potAmount, 0);
    const totalRounds = rounds.length;
    const totalWinners = rounds.filter(r => r.winner).length;
    const feePercent = 20;
    const treasuryBalance = (totalPot * feePercent) / 100 / 1e9;
    setStats({ totalPot, totalRounds, totalWinners, treasuryBalance });
  };

  const handleJoin = async () => {
    if (!amount || !currentRound) return;
    setLoading(true);
    try {
      const res = await fetch('/api/lotto/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) * 1e9 }),
      });
      const data = await res.json();
      if (res.ok && data.solanaPayUrl) {
        window.open(data.solanaPayUrl, '_blank');
        alert('Payment link opened. Confirm payment to complete entry.');
        fetchData();
      } else {
        alert(data.error || 'Failed to join');
      }
    } catch (e) {
      alert('Error joining');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-6xl mx-auto">
        <Button onClick={onBack} className="mb-8">← Back to Home</Button>
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-accent to-yellow-400 bg-clip-text text-transparent">
            $WEALTH Lotto Arena
          </h1>
          <p className="text-xl text-muted-foreground">Enter the pot, claim victory, build your empire!</p>
        </div>

        <Tabs defaultValue="play" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="play" className="flex items-center gap-2">
              <Zap className="w-4 h-4" /> Play Lotto
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Trophy className="w-4 h-4" /> My History
            </TabsTrigger>
            <TabsTrigger value="treasury" className="flex items-center gap-2">
              <Crown className="w-4 h-4" /> Treasury
            </TabsTrigger>
          </TabsList>

          <TabsContent value="play">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {currentRound && (
                <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-yellow-400/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl">
                      <Coins className="w-6 h-6 text-accent" />
                      Current Round #{currentRound.id}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-4xl font-bold text-accent mb-2">
                        {(currentRound.potAmount / 1e9).toLocaleString()} $WEALTH
                      </div>
                      <p className="text-muted-foreground">Jackpot Pot</p>
                    </div>
                    <div className="flex justify-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {currentRound.entries.length} Players
                      </div>
                      <div className="flex items-center gap-1">
                        <Timer className="w-4 h-4" />
                        {currentRound.status}
                      </div>
                    </div>
                    {currentRound.status === 'OPEN' && (
                      <div className="space-y-4">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground mb-2">Enter amount in $WEALTH</p>
                          <Input
                            type="number"
                            placeholder="1.0"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="text-center text-lg"
                          />
                        </div>
                        <Button onClick={handleJoin} disabled={loading} className="w-full text-lg py-6" size="lg">
                          {loading ? 'Joining...' : '⚔️ Enter the Arena!'}
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          80% to winner • 20% to treasury
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>How to Play</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold">1</div>
                    <p>Deposit $WEALTH to join the current round's pot.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold">2</div>
                    <p>Round closes automatically or by admin.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold">3</div>
                    <p>One lucky winner takes 80% of the pot!</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold">4</div>
                    <p>20% goes to treasury for future development.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  My Lotto History
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myEntries.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No entries yet. Join a round to start!</p>
                ) : (
                  <div className="space-y-4">
                    {myEntries.map((entry) => (
                      <div key={entry.id} className="p-4 border rounded-lg bg-gradient-to-r from-background to-accent/5">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-semibold">Round #{entry.round.id}</span>
                          <Badge variant={entry.round.status === 'SETTLED' ? 'default' : 'secondary'}>
                            {entry.round.status}
                          </Badge>
                        </div>
                        <p>Deposited: {(entry.amount / 1e9).toLocaleString()} $WEALTH</p>
                        <p>Tickets: {entry.ticketCount}</p>
                        {entry.round.winner === me?.wallet && (
                          <Badge className="mt-2 bg-yellow-500 text-black">
                            🏆 Winner!
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="treasury">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Coins className="w-8 h-8 mx-auto mb-2 text-accent" />
                  <div className="text-2xl font-bold">{(stats.totalPot / 1e9).toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Total Ever Played</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-accent" />
                  <div className="text-2xl font-bold">{stats.totalRounds}</div>
                  <p className="text-sm text-muted-foreground">Rounds Played</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Crown className="w-8 h-8 mx-auto mb-2 text-accent" />
                  <div className="text-2xl font-bold">{stats.totalWinners}</div>
                  <p className="text-sm text-muted-foreground">Champions Crowned</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <Zap className="w-8 h-8 mx-auto mb-2 text-accent" />
                  <div className="text-2xl font-bold">{stats.treasuryBalance.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">Treasury Balance</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Battles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rounds.slice(0, 5).map((round) => (
                    <div key={round.id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-semibold">Round #{round.id}</span>
                        <Badge variant={round.status === 'SETTLED' ? 'default' : 'secondary'}>
                          {round.status}
                        </Badge>
                      </div>
                      <p>Pot: {(round.potAmount / 1e9).toLocaleString()} $WEALTH</p>
                      <p>Players: {round.entries.length}</p>
                      {round.winner && (
                        <p className="text-sm text-muted-foreground">
                          Winner: {round.winner.slice(0, 8)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}