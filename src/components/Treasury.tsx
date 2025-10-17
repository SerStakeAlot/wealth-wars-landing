import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Round {
  id: string;
  status: 'OPEN' | 'CLOSED' | 'SETTLED';
  potAmount: number;
  winner?: string;
  entries: any[];
}

export function Treasury({ onBack }: { onBack: () => void }) {
  const [rounds, setRounds] = useState<Round[]>([]);
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
      const res = await fetch('/api/lotto/rounds');
      if (res.ok) {
        const data = await res.json();
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
    const feePercent = 20; // from env
    const treasuryBalance = (totalPot * feePercent) / 100 / 1e9; // in $WEALTH

    setStats({ totalPot, totalRounds, totalWinners, treasuryBalance });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        <Button onClick={onBack} className="mb-8">← Back to Home</Button>
        <h1 className="text-4xl font-bold mb-8">Treasury Dashboard</h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{(stats.totalPot / 1e9).toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Pot ($WEALTH)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalRounds}</div>
              <p className="text-sm text-muted-foreground">Total Rounds</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.totalWinners}</div>
              <p className="text-sm text-muted-foreground">Winners Paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{stats.treasuryBalance.toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Treasury Balance ($WEALTH)</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Rounds</CardTitle>
          </CardHeader>
          <CardContent>
            {rounds.slice(0, 10).map((round) => (
              <div key={round.id} className="mb-4 p-4 border rounded">
                <p>Round: {round.id}</p>
                <p>Status: <Badge variant={round.status === 'SETTLED' ? 'default' : 'secondary'}>{round.status}</Badge></p>
                <p>Pot: {(round.potAmount / 1e9).toLocaleString()} $WEALTH</p>
                <p>Entries: {round.entries.length}</p>
                {round.winner && <p>Winner: {round.winner.slice(0, 8)}...</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}