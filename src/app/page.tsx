"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGame() {
    setCreating(true);
    setError(null);
    
    try {
      const res = await fetch('/api/games', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create game');
      }
      
      const game = await res.json();
      if (!game?.id) {
        throw new Error('Invalid game response');
      }
      
      router.push(`/game/${game.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create game');
      setCreating(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 48, marginBottom: 32, color: '#e6eef8' }}>Tic Tac Toe</h1>
      {error && (
        <div style={{ color: '#ff6b6b', marginBottom: 16, padding: 12, background: 'rgba(255,0,0,0.1)', borderRadius: 8 }}>
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <button
          onClick={createGame}
          disabled={creating}
          style={{
            padding: '12px 24px',
            fontSize: 18,
            borderRadius: 8,
            background: 'linear-gradient(180deg,#0b1220,#07122a)',
            border: '1px solid rgba(255,255,255,0.04)',
            color: '#e6eef8',
            cursor: creating ? 'not-allowed' : 'pointer',
            opacity: creating ? 0.7 : 1,
            transition: 'all 0.2s ease',
            boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.4)'
          }}
        >
          {creating ? 'Creating...' : 'Start New Game'}
        </button>
        <a
          href="/stats"
          style={{
            padding: '12px 24px',
            fontSize: 18,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.04)',
            color: '#e6eef8',
            textDecoration: 'none',
            transition: 'all 0.2s ease'
          }}
        >
          View Stats
        </a>
      </div>
    </div>
  );
}