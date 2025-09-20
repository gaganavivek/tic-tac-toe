"use client";
import React from 'react';

type Props = {
  board: string;
  onMove: (pos: number) => void;
  disabled?: boolean;
};

export default function Board({ board = '_________', onMove, disabled = false }: Props) {
  const cells = board.split('');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 120px)', gap: 12 }}>
      {cells.map((c, i) => (
        <button
          key={i}
          onClick={() => !disabled && onMove(i)}
          style={{
            width: 120,
            height: 120,
            fontSize: 48,
            borderRadius: 12,
            background: 'linear-gradient(180deg,#0b1220,#07122a)',
            border: '1px solid rgba(255,255,255,0.04)',
            color: '#e6eef8',
            boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.6)',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
          aria-label={`cell-${i}`}
        >
          {c === '_' || c === '.' ? '' : c}
        </button>
      ))}
    </div>
  );
}
