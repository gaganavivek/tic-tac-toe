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
      {cells.map((cell, index) => {
        const isEmpty = cell === '_' || cell === '.';
        const isClickable = isEmpty && !disabled;
        
        return (
          <button
            key={index}
            onClick={() => isClickable && onMove(index)}
            disabled={!isClickable}
            style={{
              width: 120,
              height: 120,
              fontSize: 48,
              fontWeight: 'bold',
              borderRadius: 12,
              background: 'linear-gradient(180deg,#0b1220,#07122a)',
              border: '1px solid rgba(255,255,255,0.04)',
              color: '#e6eef8',
              boxShadow: 'inset 0 -6px 12px rgba(0,0,0,0.6)',
              cursor: isClickable ? 'pointer' : 'not-allowed',
              opacity: isClickable ? 1 : disabled ? 0.5 : 1,
              transition: 'all 0.2s ease'
            }}
            aria-label={`cell-${index}`}
          >
            {isEmpty ? '' : cell}
          </button>
        );
      })}
    </div>
  );
}
