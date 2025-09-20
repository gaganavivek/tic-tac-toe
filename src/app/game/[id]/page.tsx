"use client";
import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Board from '@/components/Board';

type Game = any;

export default function GamePage() {
  // useParams is not available in Node rendering here; fallback to reading window.location
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = window.location.pathname.split('/').pop();
    if (!id) return;
    fetch(`/api/games/${id}`)
      .then(r => r.json())
      .then(setGame)
      .catch(console.error);
  }, []);

  async function handleMove(pos: number) {
    if (!game) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/games/${game.id}/move`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ player: game.next_turn, position: pos }) });
      const updated = await res.json();
      setGame(updated);
    } finally { setLoading(false); }
  }

  if (!game) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div style={{ padding: 20, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <h2>Game #{game.id}</h2>
      <p>Next: {game.next_turn} — Status: {game.status} {game.winner ? ` — Winner: ${game.winner}` : ''}</p>
      <Board board={game.board} onMove={handleMove} disabled={loading || game.status !== 'in_progress'} />
      <div style={{ marginTop: 16 }}>
        <h3>Moves</h3>
        <ol>
          {(game.moves || []).map((m: any) => <li key={m.id}>{m.player} → {m.position} ({new Date(m.created_at).toLocaleString()})</li>)}
        </ol>
      </div>
    </div>
  );
}
