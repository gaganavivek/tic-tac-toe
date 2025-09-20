"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

type DailyStats = {
  date: string;
  total_games: number;
  x_wins: number;
  o_wins: number;
  draws: number;
  avg_moves: number;
};

export default function StatsPage() {
  const [stats, setStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats/daily');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setStats(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return <div style={{ padding: 20, color: '#e6eef8' }}>Loading stats...</div>;
  }

  if (error) {
    return <div style={{ padding: 20, color: '#ff6b6b' }}>Error: {error}</div>;
  }

  return (
    <div style={{ padding: 20, maxWidth: 1000, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, color: '#e6eef8' }}>Daily Game Statistics</h1>
        <Link 
          href="/"
          style={{ 
            padding: '8px 16px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.1)',
            color: '#e6eef8',
            textDecoration: 'none'
          }}
        >
          Back to Home
        </Link>
      </div>

      {stats.length === 0 ? (
        <p style={{ color: '#8899ac', fontSize: 18 }}>No games played yet. Start playing to see statistics!</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', color: '#e6eef8' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Total Games</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>X Wins</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>O Wins</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Draws</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Avg Moves</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((day, idx) => (
                <tr 
                  key={`${day.date}-${idx}`}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <td style={{ padding: '12px 16px' }}>
                    {new Date(day.date).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{day.total_games}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#4ade80' }}>{day.x_wins}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#60a5fa' }}>{day.o_wins}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', color: '#8899ac' }}>{day.draws}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>{day.avg_moves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}