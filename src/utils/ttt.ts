// File: /lib/ttt.ts
// Tic-tac-toe logic utilities for Next.js backend routes

export const LINES = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

export function normalizeEmpty(boardStr?: string) {
  if (!boardStr || boardStr.length !== 9) return '_________';
  return boardStr.replace(/\s/g, '');
}

export function calculateWinner(boardStr?: string): 'X'|'O'|'draw'|null {
  const b = normalizeEmpty(boardStr);
  for (const [a,bb,c] of LINES) {
    const A = b[a], B = b[bb], C = b[c];
    if (A !== '_' && A !== '.' && A === B && A === C) return A as 'X'|'O';
  }
  if (!b.includes('_') && !b.includes('.')) return 'draw';
  return null;
}

export function makeMove(boardStr: string|undefined, position: number, player: 'X'|'O') {
  const board = normalizeEmpty(boardStr).split('');
  if (position < 0 || position > 8) throw { status:400, code:'INVALID_POSITION', message:'position must be 0..8' };
  if (board[position] !== '_' && board[position] !== '.') throw { status:409, code:'CELL_TAKEN', message:'Cell already taken' };
  board[position] = player;
  const newBoard = board.join('');
  const winner = calculateWinner(newBoard);
  const nextTurn = winner ? null : (player === 'X' ? 'O' : 'X');
  return { board: newBoard, winner, nextTurn };
}

export async function reconstructBoardFromMoves(client: any, gameId: number) {
  const res = await client.query('SELECT player, position FROM moves WHERE game_id = $1 ORDER BY id ASC', [gameId]);
  const board = '_________'.split('');
  for (const row of res.rows) {
    board[row.position] = row.player;
  }
  return board.join('');
}
