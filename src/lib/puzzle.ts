export type Board = number[];
export type Direction = 'up' | 'down' | 'left' | 'right';

export function createSolved(size: number): Board {
  const total = size * size;
  return Array.from({ length: total }, (_, index) => (index === total - 1 ? 0 : index + 1));
}

export function findBlank(board: Board): number {
  return board.indexOf(0);
}

function isWithinBounds(index: number, size: number): boolean {
  return index >= 0 && index < size * size;
}

export function canMove(board: Board, size: number, index: number): boolean {
  if (!isWithinBounds(index, size) || board[index] === 0) {
    return false;
  }

  const blank = findBlank(board);
  const row = Math.floor(index / size);
  const col = index % size;
  const blankRow = Math.floor(blank / size);
  const blankCol = blank % size;

  return (row === blankRow && Math.abs(col - blankCol) === 1) || (col === blankCol && Math.abs(row - blankRow) === 1);
}

function swap(board: Board, left: number, right: number): Board {
  const next = board.slice();
  [next[left], next[right]] = [next[right], next[left]];
  return next;
}

export function move(board: Board, size: number, index: number): Board {
  if (!canMove(board, size, index)) {
    return board.slice();
  }

  const blank = findBlank(board);
  return swap(board, index, blank);
}

export function isSolved(board: Board): boolean {
  const solved = board.length;
  for (let index = 0; index < solved - 1; index += 1) {
    if (board[index] !== index + 1) {
      return false;
    }
  }

  return board[solved - 1] === 0;
}

function isInside(size: number, row: number, col: number): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

export function moveByDirection(board: Board, size: number, direction: Direction): Board {
  const blank = findBlank(board);
  const blankRow = Math.floor(blank / size);
  const blankCol = blank % size;

  const target =
    direction === 'up'
      ? isInside(size, blankRow + 1, blankCol)
        ? blank + size
        : -1
      : direction === 'down'
        ? isInside(size, blankRow - 1, blankCol)
          ? blank - size
          : -1
        : direction === 'left'
          ? isInside(size, blankRow, blankCol - 1)
            ? blank - 1
            : -1
          : isInside(size, blankRow, blankCol + 1)
            ? blank + 1
            : -1;

  if (target < 0 || !canMove(board, size, target)) {
    return board.slice();
  }

  return move(board, size, target);
}

function neighbors(blank: number, size: number): number[] {
  const row = Math.floor(blank / size);
  const col = blank % size;
  const result: number[] = [];

  if (row > 0) result.push(blank - size);
  if (row < size - 1) result.push(blank + size);
  if (col > 0) result.push(blank - 1);
  if (col < size - 1) result.push(blank + 1);

  return result;
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

export function shuffle(board: Board, size: number, steps = size * size * 40, rng: () => number = Math.random): Board {
  let current = board.slice();
  let previousBlank = -1;

  for (let step = 0; step < steps; step += 1) {
    const blank = findBlank(current);
    const candidates = neighbors(blank, size).filter((candidate) => candidate !== previousBlank);
    const moves = candidates.length > 0 ? candidates : neighbors(blank, size);
    const nextIndex = pick(moves, rng);

    current = swap(current, blank, nextIndex);
    previousBlank = blank;
  }

  if (isSolved(current)) {
    return shuffle(current, size, steps, rng);
  }

  return current;
}