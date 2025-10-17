import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Trophy, Coins, Users, Timer, Crown } from '@phosphor-icons/react';
import { apiMe } from '@/lib/api';

export function Lotto({ onBack }: { onBack: () => void }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setDataLoading(true);
    try {
      const userData = await apiMe();
      setMe(userData);
      console.log('Lotto: User data loaded:', userData, 'userId from localStorage:', localStorage.getItem('userId'));
    } catch (e) {
      console.error('Failed to load user data:', e);
    } finally {
      setDataLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!amount || !me?.wallet) {
      alert('Please link your wallet first and enter an amount');
      return;
    }
    setLoading(true);
    try {
      // For now, just show a success message
      alert(`🎰 Lotto entry simulated! You entered ${amount} $WEALTH\n\nThis is a demo - full lotto system coming soon!`);
      setAmount('');
    } catch (e) {
      alert('Error joining lotto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        <Button onClick={onBack} className="mb-8">← Back to Home</Button>
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-accent to-yellow-400 bg-clip-text text-transparent">
            $WEALTH Lotto Arena
          </h1>
          <p className="text-xl text-muted-foreground">Demo Version - Full lotto system coming soon!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Current Round Card */}
          <Card className="border-accent/20 bg-gradient-to-br from-accent/5 to-yellow-400/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Coins className="w-6 h-6 text-accent" />
                Current Round
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-accent mb-2">
                  1,250 $WEALTH
                </div>
                <p className="text-muted-foreground">Jackpot Pot</p>
              </div>
              <div className="flex justify-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  12 Players
                </div>
                <div className="flex items-center gap-1">
                  <Timer className="w-4 h-4" />
                  OPEN
                </div>
              </div>

              {dataLoading ? (
                <div className="text-center p-4">
                  <p className="text-muted-foreground">Loading wallet status...</p>
                </div>
              ) : !me?.wallet ? (
                <div className="text-center p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-red-400 font-semibold mb-2">Wallet Not Linked</p>
                  <p className="text-sm text-muted-foreground mb-2">
                    You must link your wallet on the main page before entering the lotto arena.
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    User ID: {me?.id || 'unknown'}
                  </p>
                  <Button onClick={onBack} variant="outline" size="sm">
                    ← Go Back to Link Wallet
                  </Button>
                </div>
              ) : (
                <>
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
                  <Button onClick={handleJoin} disabled={loading || !amount} className="w-full text-lg py-6" size="lg">
                    {loading ? 'Joining...' : '🎰 Enter the Arena!'}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    80% to winner • 20% to treasury
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stats Card */}
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Lotto Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">1,250</div>
                  <p className="text-sm text-muted-foreground">Total Pot</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">8</div>
                  <p className="text-sm text-muted-foreground">Rounds Played</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">6</div>
                  <p className="text-sm text-muted-foreground">Winners</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">250</div>
                  <p className="text-sm text-muted-foreground">Treasury</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Winners */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="w-5 h-5" />
              Recent Winners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-accent/5 rounded">
                <span>Round #7</span>
                <span className="font-semibold">950 $WEALTH</span>
                <Badge variant="secondary">Winner: 8x...9y2</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-accent/5 rounded">
                <span>Round #6</span>
                <span className="font-semibold">780 $WEALTH</span>
                <Badge variant="secondary">Winner: 4a...3b8</Badge>
              </div>
              <div className="flex justify-between items-center p-2 bg-accent/5 rounded">
                <span>Round #5</span>
                <span className="font-semibold">620 $WEALTH</span>
                <Badge variant="secondary">Winner: 9c...1d4</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}