import { describe, expect, it } from 'vitest';
import { canMove, createSolved, findBlank, isSolved, move, moveByDirection, shuffle, slideTo } from '../src/lib/puzzle';

describe('puzzle logic', () => {
  it('creates a solved board', () => {
    expect(createSolved(4)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 0]);
  });

  it('finds the blank tile', () => {
    expect(findBlank(createSolved(3))).toBe(8);
  });

  it('only allows orthogonal neighbors to move', () => {
    const board = [1, 2, 3, 4, 5, 6, 7, 0, 8];
    expect(canMove(board, 3, 6)).toBe(true);
    expect(canMove(board, 3, 8)).toBe(true);
    expect(canMove(board, 3, 5)).toBe(false);
  });

  it('returns a new board when moving', () => {
    const board = [1, 2, 3, 4, 5, 6, 7, 0, 8];
    const next = move(board, 3, 8);
    expect(next).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
    expect(board).toEqual([1, 2, 3, 4, 5, 6, 7, 0, 8]);
  });

  it('detects a solved board', () => {
    expect(isSolved(createSolved(5))).toBe(true);
    expect(isSolved([1, 2, 3, 4, 5, 6, 7, 0, 8])).toBe(false);
  });

  it('generates a solvable shuffled board', () => {
    const cases = [4, 5, 6] as const;

    for (const size of cases) {
      const rngValues = [0.1, 0.7, 0.2, 0.9, 0.3, 0.8];
      let index = 0;
      const rng = () => rngValues[index++ % rngValues.length];
      const board = shuffle(createSolved(size), size, size * 10, rng);
      expect(board).toHaveLength(size * size);
      expect(isSolved(board)).toBe(false);
      expect(board).toContain(0);
    }
  });

  it('moves a tile by arrow direction', () => {
    const board = [1, 2, 3, 4, 5, 6, 7, 0, 8];
    expect(moveByDirection(board, 3, 'right')).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0]);
  });

  it('slides multiple tiles in a row toward the blank', () => {
    const board = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(slideTo(board, 3, 2)).toEqual([1, 2, 0, 3, 4, 5, 6, 7, 8]);
  });

  it('slides multiple tiles in a column toward the blank', () => {
    const board = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(slideTo(board, 3, 6)).toEqual([3, 1, 2, 6, 4, 5, 0, 7, 8]);
  });

  it('ignores tiles that are not aligned with the blank', () => {
    const board = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(slideTo(board, 3, 4)).toEqual(board);
  });
});