import { calculateWinner, makeMove } from './ttt';

describe('ttt utilities', () => {
  test('detects horizontal winner', () => {
    expect(calculateWinner('XXX______')).toBe('X');
    expect(calculateWinner('OOO______')).toBe('O');
  });

  test('detects draw', () => {
    expect(calculateWinner('XOXOXOOXO')).toBe('draw');
  });

  test('invalid move position', () => {
    expect(() => makeMove('_________', -1, 'X' as any)).toThrow();
    expect(() => makeMove('_________', 9, 'X' as any)).toThrow();
  });

  test('cell taken', () => {
    expect(() => makeMove('X________', 0, 'O' as any)).toThrow();
  });
});
