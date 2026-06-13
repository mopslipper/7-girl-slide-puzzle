import {
  createSolved,
  isSolved,
  moveByDirection,
  shuffle,
  slideTo,
  type Board,
  type Direction,
} from '../lib/puzzle';
import type { PuzzleImage } from '../lib/works';

type BestScore = {
  moves: number;
  seconds: number;
};

type GameState = {
  size: number;
  board: Board;
  selectedImage: PuzzleImage;
  moves: number;
  startedAt: number | null;
  timerId: number | null;
  showPreview: boolean;
  showNumbers: boolean;
  solved: boolean;
  naturalWidth: number;
  naturalHeight: number;
};

type Refs = {
  board: HTMLElement;
  preview: HTMLElement;
  meta: HTMLElement;
  timerLabel: HTMLElement;
  movesLabel: HTMLElement;
  bestLabel: HTMLElement;
  clearOverlay: HTMLElement;
  confetti: HTMLElement | null;
};

const GRID_SIZES = [3, 4, 5] as const;

const CONFETTI_COLORS = ['#ff69b4', '#e05cc8', '#ff8ab0', '#ffd166', '#7ad7f0', '#c792ea'];

function clearConfetti(refs: Refs): void {
  if (refs.confetti) {
    refs.confetti.innerHTML = '';
  }
}

function launchConfetti(refs: Refs): void {
  const layer = refs.confetti;
  if (!layer) {
    return;
  }

  layer.innerHTML = '';
  const pieceCount = 80;

  for (let index = 0; index < pieceCount; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'confetti-piece';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
    piece.style.setProperty('--fall-delay', `${Math.floor(Math.random() * 400)}ms`);
    piece.style.setProperty('--fall-duration', `${1400 + Math.floor(Math.random() * 1200)}ms`);
    piece.style.setProperty('--fall-spin', `${Math.floor(Math.random() * 720) - 360}deg`);
    const scale = 0.7 + Math.random() * 0.8;
    piece.style.transform = `scale(${scale})`;
    layer.appendChild(piece);
  }
}

function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, '0');
  const remainder = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function bestScoreKey(imageId: number, size: number): string {
  return `sp-best:${imageId}:${size}`;
}

function readBestScore(imageId: number, size: number): BestScore | null {
  const raw = window.localStorage.getItem(bestScoreKey(imageId, size));
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as BestScore;
    if (typeof parsed.moves === 'number' && typeof parsed.seconds === 'number') {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function writeBestScore(imageId: number, size: number, score: BestScore): void {
  window.localStorage.setItem(bestScoreKey(imageId, size), JSON.stringify(score));
}

function isBetterScore(current: BestScore, candidate: BestScore): boolean {
  if (candidate.moves !== current.moves) {
    return candidate.moves < current.moves;
  }

  return candidate.seconds < current.seconds;
}

function createState(images: PuzzleImage[]): GameState {
  const selectedImage = images[0] ?? {
    id: 0,
    title: 'No image',
    category: 'Original',
    src: '',
    thumbnail: '',
  };

  return {
    size: 4,
    board: createSolved(4),
    selectedImage,
    moves: 0,
    startedAt: null,
    timerId: null,
    showPreview: false,
    showNumbers: false,
    solved: true,
    naturalWidth: 1,
    naturalHeight: 1,
  };
}

function loadImageMetrics(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (!src) {
      resolve({ width: 1, height: 1 });
      return;
    }

    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      resolve({ width: image.naturalWidth || 1, height: image.naturalHeight || 1 });
    };
    image.onerror = () => resolve({ width: 1, height: 1 });
    image.src = src;
  });
}

function selectImageFromButton(button: HTMLButtonElement): PuzzleImage {
  return {
    id: Number(button.dataset.workId),
    title: button.dataset.workTitle ?? 'Untitled',
    category: button.dataset.workCategory ?? 'Original',
    src: button.dataset.workSrc ?? '',
    thumbnail: button.dataset.workThumbnail ?? '',
  };
}

function startTimer(state: GameState, refs: Refs): void {
  if (state.startedAt !== null) {
    return;
  }

  state.startedAt = Date.now();
  state.timerId = window.setInterval(() => {
    refs.timerLabel.textContent = formatTime((Date.now() - (state.startedAt ?? Date.now())) / 1000);
    const best = readBestScore(state.selectedImage.id, state.size);
    refs.bestLabel.textContent = best ? `${best.moves}手 / ${formatTime(best.seconds)}` : '--';
  }, 1000);
}

function stopTimer(state: GameState): void {
  if (state.timerId !== null) {
    window.clearInterval(state.timerId);
    state.timerId = null;
  }
}

function getTilePosition(tileValue: number, size: number): { row: number; col: number } {
  const index = tileValue - 1;
  return {
    row: Math.floor(index / size),
    col: index % size,
  };
}

function updateBestLabel(state: GameState, refs: Refs): void {
  const best = readBestScore(state.selectedImage.id, state.size);
  refs.bestLabel.textContent = best ? `${best.moves}手 / ${formatTime(best.seconds)}` : '--';
}

function finishGame(state: GameState, refs: Refs): void {
  stopTimer(state);
  state.solved = true;
  const elapsed = state.startedAt ? Math.max(1, Math.round((Date.now() - state.startedAt) / 1000)) : 0;
  const nextBest = { moves: state.moves, seconds: elapsed };
  const currentBest = readBestScore(state.selectedImage.id, state.size);
  if (!currentBest || isBetterScore(currentBest, nextBest)) {
    writeBestScore(state.selectedImage.id, state.size, nextBest);
  }

  refs.timerLabel.textContent = formatTime(elapsed);
  updateBestLabel(state, refs);
  refs.clearOverlay.classList.add('is-visible');
  refs.clearOverlay.querySelector('[data-clear-stats]')!.textContent = `${state.moves}手 / ${formatTime(elapsed)}`;
  launchConfetti(refs);
}

function startNewGame(state: GameState, refs: Refs, forceShuffle = true): void {
  stopTimer(state);
  state.board = forceShuffle ? shuffle(createSolved(state.size), state.size) : createSolved(state.size);
  state.moves = 0;
  state.startedAt = null;
  state.solved = !forceShuffle;
  refs.clearOverlay.classList.remove('is-visible');
  refs.clearOverlay.querySelector('[data-clear-stats]')!.textContent = '';
  clearConfetti(refs);
  refs.timerLabel.textContent = '00:00';
  refs.movesLabel.textContent = '0';
  updateBestLabel(state, refs);
  renderBoard(state, refs);
}

function setImage(state: GameState, refs: Refs, image: PuzzleImage): void {
  state.selectedImage = image;
  state.board = shuffle(createSolved(state.size), state.size);
  state.moves = 0;
  state.startedAt = null;
  state.solved = false;
  stopTimer(state);
  refs.clearOverlay.classList.remove('is-visible');
  refs.clearOverlay.querySelector('[data-clear-stats]')!.textContent = '';
  clearConfetti(refs);
  refs.timerLabel.textContent = '00:00';
  refs.movesLabel.textContent = '0';
  updateBestLabel(state, refs);
  refs.meta.textContent = `${image.title} / ${image.category}`;
  refs.preview.style.backgroundImage = `url(${image.src})`;

  void loadImageMetrics(image.src).then((metrics) => {
    if (state.selectedImage.id !== image.id) {
      return;
    }

    state.naturalWidth = metrics.width;
    state.naturalHeight = metrics.height;
    renderBoard(state, refs);
  });

  renderBoard(state, refs);
}

function renderBoard(state: GameState, refs: Refs): void {
  const { board, preview } = refs;
  const boardRect = board.getBoundingClientRect();
  const boardSize = Math.max(1, boardRect.width);
  const tileSize = boardSize / state.size;
  const scale = Math.max(boardSize / state.naturalWidth, boardSize / state.naturalHeight);
  const coverWidth = state.naturalWidth * scale;
  const coverHeight = state.naturalHeight * scale;
  const offsetX = (boardSize - coverWidth) / 2;
  const offsetY = (boardSize - coverHeight) / 2;

  board.innerHTML = '';
  board.style.setProperty('--grid-size', String(state.size));
  board.style.setProperty('--tile-size', `${tileSize}px`);

  preview.style.backgroundImage = `url(${state.selectedImage.src})`;
  preview.style.backgroundSize = `${coverWidth}px ${coverHeight}px`;
  preview.style.backgroundPosition = `${offsetX}px ${offsetY}px`;
  preview.classList.toggle('is-visible', state.showPreview && !state.solved);

  const blank = state.board.indexOf(0);
  const solved = isSolved(state.board);
  state.solved = solved;

  state.board.forEach((tileValue, position) => {
    if (tileValue === 0) {
      return;
    }

    const tile = document.createElement('button');
    const tileRow = Math.floor(position / state.size);
    const tileCol = position % state.size;
    const sourcePosition = getTilePosition(tileValue, state.size);
    const left = tileCol * tileSize;
    const top = tileRow * tileSize;

    tile.type = 'button';
    tile.className = 'tile';
    tile.style.width = `${tileSize}px`;
    tile.style.height = `${tileSize}px`;
    tile.style.left = `${left}px`;
    tile.style.top = `${top}px`;
    tile.style.backgroundImage = `url(${state.selectedImage.src})`;
    tile.style.backgroundSize = `${coverWidth}px ${coverHeight}px`;
    tile.style.backgroundPosition = `${offsetX - sourcePosition.col * tileSize}px ${offsetY - sourcePosition.row * tileSize}px`;
    tile.dataset.index = String(position);
    tile.dataset.value = String(tileValue);
    tile.setAttribute('aria-label', `タイル ${tileValue}`);
    tile.setAttribute('aria-pressed', 'false');

    if (state.showNumbers) {
      tile.classList.add('show-numbers');
    }

    tile.addEventListener('click', () => {
      if (state.solved) {
        return;
      }

      const blankIndex = state.board.indexOf(0);
      const blankRow = Math.floor(blankIndex / state.size);
      const blankCol = blankIndex % state.size;
      const tileRowIndex = Math.floor(position / state.size);
      const tileColIndex = position % state.size;

      const sameRow = tileRowIndex === blankRow;
      const sameCol = tileColIndex === blankCol;
      if (!sameRow && !sameCol) {
        return;
      }

      const distance = sameRow ? Math.abs(tileColIndex - blankCol) : Math.abs(tileRowIndex - blankRow);
      if (distance < 1) {
        return;
      }

      state.board = slideTo(state.board, state.size, position);
      state.moves += distance;
      startTimer(state, refs);
      renderBoard(state, refs);
      if (isSolved(state.board)) {
        finishGame(state, refs);
      }
    });

    board.appendChild(tile);
  });

  const best = readBestScore(state.selectedImage.id, state.size);
  refs.timerLabel.textContent = state.startedAt ? formatTime((Date.now() - state.startedAt) / 1000) : '00:00';
  refs.movesLabel.textContent = String(state.moves);
  refs.bestLabel.textContent = best ? `${best.moves}手 / ${formatTime(best.seconds)}` : '--';
  refs.clearOverlay.classList.toggle('is-visible', state.solved && blank === state.board.length - 1 && state.moves > 0);
}

export function startSlidePuzzle(): void {
  const board = document.querySelector<HTMLElement>('[data-board]');
  const preview = document.querySelector<HTMLElement>('[data-preview]');
  const clearOverlay = document.querySelector<HTMLElement>('[data-clear]');
  const timerLabel = document.querySelector<HTMLElement>('[data-timer]');
  const movesLabel = document.querySelector<HTMLElement>('[data-moves]');
  const bestLabel = document.querySelector<HTMLElement>('[data-best]');
  const meta = document.querySelector<HTMLElement>('[data-selected-meta]');
  const shuffleButton = document.querySelector<HTMLButtonElement>('[data-shuffle]');
  const previewButton = document.querySelector<HTMLButtonElement>('[data-toggle-preview]');
  const numbersButton = document.querySelector<HTMLButtonElement>('[data-toggle-numbers]');
  const sizeButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-size]')];
  const pickerButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-work-id]')];
  const picker = document.querySelector<HTMLElement>('[data-picker]');
  const confetti = document.querySelector<HTMLElement>('[data-confetti]');

  if (!board || !preview || !clearOverlay || !timerLabel || !movesLabel || !bestLabel || !meta || !shuffleButton || !previewButton || !numbersButton || !picker) {
    return;
  }

  const refs: Refs = {
    board,
    preview,
    meta,
    timerLabel,
    movesLabel,
    bestLabel,
    clearOverlay,
    confetti,
  };

  const state = createState(
    pickerButtons.map((button) => selectImageFromButton(button)),
  );

  const allButtons = [...pickerButtons];

  const render = () => renderBoard(state, refs);

  const applySize = (size: number) => {
    if (!GRID_SIZES.includes(size as (typeof GRID_SIZES)[number])) {
      return;
    }

    state.size = size;
    sizeButtons.forEach((button) => button.classList.toggle('is-active', Number(button.dataset.size) === size));
    startNewGame(state, refs, true);
  };

  if (allButtons[0]) {
    setImage(state, refs, selectImageFromButton(allButtons[0]));
  }

  pickerButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const image = selectImageFromButton(button);
      buttonsSetActive(pickerButtons, button);
      setImage(state, refs, image);
    });
  });

  buttonsSetActive(sizeButtons, sizeButtons.find((button) => Number(button.dataset.size) === 4) ?? sizeButtons[0]);
  render();

  shuffleButton.addEventListener('click', () => {
    startNewGame(state, refs, true);
  });

  previewButton.addEventListener('click', () => {
    state.showPreview = !state.showPreview;
    previewButton.classList.toggle('is-active', state.showPreview);
    render();
  });

  numbersButton.addEventListener('click', () => {
    state.showNumbers = !state.showNumbers;
    numbersButton.classList.toggle('is-active', state.showNumbers);
    render();
  });

  sizeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applySize(Number(button.dataset.size));
    });
  });

  window.addEventListener('keydown', (event) => {
    if (state.solved) {
      return;
    }

    const direction = mapKeyToDirection(event.key);
    if (!direction) {
      return;
    }

    event.preventDefault();
    const nextBoard = moveByDirection(state.board, state.size, direction);
    if (nextBoard === state.board || nextBoard.length === 0) {
      return;
    }

    if (nextBoard.every((value, index) => value === state.board[index])) {
      return;
    }

    state.board = nextBoard;
    state.moves += 1;
    startTimer(state, refs);
    render();
    if (isSolved(state.board)) {
      finishGame(state, refs);
    }
  });

  window.addEventListener('resize', () => {
    render();
  });

  render();
}

function buttonsSetActive(buttons: HTMLButtonElement[], active: HTMLButtonElement): void {
  buttons.forEach((button) => button.classList.toggle('is-active', button === active));
}

function mapKeyToDirection(key: string): Direction | null {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    default:
      return null;
  }
}