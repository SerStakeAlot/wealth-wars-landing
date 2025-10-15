import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { apiMe, apiWealth } from '@/lib/api';

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
  const [myEntries, setMyEntries] = useState<Entry[]>([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [roundRes, entriesRes, meRes] = await Promise.all([
        fetch('/api/lotto/current-round'),
        fetch('/api/lotto/my-entries'),
        apiMe(),
      ]);
      if (roundRes.ok) setCurrentRound(await roundRes.json());
      if (entriesRes.ok) setMyEntries(await entriesRes.json());
      setMe(meRes);
    } catch (e) {
      console.error(e);
    }
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
      <div className="max-w-4xl mx-auto">
        <Button onClick={onBack} className="mb-8">← Back to Home</Button>
        <h1 className="text-4xl font-bold mb-8">$WEALTH Lotto</h1>

        {currentRound && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Current Round #{currentRound.id}</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Status: <Badge variant={currentRound.status === 'OPEN' ? 'default' : 'secondary'}>{currentRound.status}</Badge></p>
              <p>Pot: {(currentRound.potAmount / 1e9).toLocaleString()} $WEALTH</p>
              <p>Entries: {currentRound.entries.length}</p>
              {currentRound.status === 'OPEN' && (
                <div className="mt-4">
                  <Input
                    type="number"
                    placeholder="Amount in $WEALTH"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mb-2"
                  />
                  <Button onClick={handleJoin} disabled={loading}>
                    {loading ? 'Joining...' : 'Join Round'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>My Entries</CardTitle>
          </CardHeader>
          <CardContent>
            {myEntries.length === 0 ? (
              <p>No entries yet.</p>
            ) : (
              myEntries.map((entry) => (
                <div key={entry.id} className="mb-4 p-4 border rounded">
                  <p>Round: {entry.round.id}</p>
                  <p>Amount: {(entry.amount / 1e9).toLocaleString()} $WEALTH</p>
                  <p>Tickets: {entry.ticketCount}</p>
                  <p>Status: {entry.round.status}</p>
                  {entry.round.winner === me?.wallet && <Badge>Won!</Badge>}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}