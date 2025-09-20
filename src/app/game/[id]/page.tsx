"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Board from '@/components/Board';

type Game = {
  id: number;
  board: string;
  next_turn: 'X' | 'O';
  status: string;
  winner: string | null;
  moves: Array<{
    id: number;
    player: 'X' | 'O';
    position: number;
    created_at: string;
  }>;
};

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id;
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      router.push('/');
      return;
    }
    
    async function loadGame() {
      try {
        const res = await fetch(`/api/games/${id}`);
        if (!res.ok) {
          throw new Error('Failed to load game');
        }
        const data = await res.json();
        if (!data.board) {
          data.board = '_________';
        }
        setGame(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load game');
      }
    }

    loadGame();
  }, [id, router]);

  async function handleMove(pos: number) {
    if (!game || loading) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${game.id}/move`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: game.next_turn, position: pos })
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to make move');
      }

      const updated = await res.json();
      setGame(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to make move');
    } finally {
      setLoading(false);
    }
  }

  if (error) {
    return (
      <div style={{ padding: 20, color: '#ff6b6b' }}>
        Error: {error}
      </div>
    );
  }

  if (!game) {
    return (
      <div style={{ padding: 20, color: '#e6eef8' }}>
        Loading game...
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h2 style={{ fontSize: 32, marginBottom: 16, color: '#e6eef8' }}>Game #{game.id}</h2>
      <p style={{ fontSize: 18, marginBottom: 24, color: '#e6eef8' }}>
        Next Player: <strong>{game.next_turn || '?'}</strong>
        <span style={{ margin: '0 12px' }}>•</span>
        Status: <strong>{game.status || 'loading'}</strong>
        {game.winner && <span><span style={{ margin: '0 12px' }}>•</span>Winner: <strong>{game.winner}</strong></span>}
      </p>
      <Board 
        board={game.board} 
        onMove={handleMove} 
        disabled={loading || game.status !== 'in_progress'} 
      />
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 24, marginBottom: 16, color: '#e6eef8' }}>Moves History</h3>
        <ol style={{ color: '#e6eef8' }}>
          {(game.moves || []).map((m) => (
            <li key={m.id} style={{ marginBottom: 8 }}>
              Player <strong>{m.player}</strong> placed at position <strong>{m.position}</strong>
              <span style={{ color: '#8899ac', marginLeft: 8 }}>
                ({new Date(m.created_at).toLocaleString()})
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
