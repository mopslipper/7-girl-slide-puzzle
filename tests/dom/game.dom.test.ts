// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { startSlidePuzzle } from '../../src/scripts/game';

const pickerButtons = `
  <button type="button" class="work-card is-active" data-work-id="1" data-work-title="First Work" data-work-category="Illustration" data-work-src="https://example.com/first.webp" data-work-thumbnail="https://example.com/first-thumb.webp"></button>
  <button type="button" class="work-card" data-work-id="2" data-work-title="Second Work" data-work-category="Concept" data-work-src="https://example.com/second.webp" data-work-thumbnail="https://example.com/second-thumb.webp"></button>
`;

function setUpDom(): void {
  document.body.innerHTML = `
    <main>
      <button type="button" data-size="3" class="chip is-active">3×3</button>
      <button type="button" data-size="4" class="chip">4×4</button>
      <button type="button" data-size="5" class="chip">5×5</button>
      <button type="button" data-shuffle>Shuffle</button>
      <button type="button" data-toggle-preview>Preview</button>
      <button type="button" data-toggle-numbers>Numbers</button>
      <div data-timer>00:00</div>
      <div data-moves>0</div>
      <div data-best>--</div>
      <div data-selected-meta>First Work / Illustration</div>
      <div data-board></div>
      <div data-preview></div>
      <div data-clear><span data-clear-stats></span></div>
      <div data-picker>
        ${pickerButtons}
      </div>
    </main>
  `;
}

describe('slide puzzle DOM wiring', () => {
  beforeEach(() => {
    window.localStorage.clear();
    setUpDom();
  });

  it('renders the initial board, switches works, and reshuffles by size', () => {
    startSlidePuzzle();

    const board = document.querySelector<HTMLElement>('[data-board]');
    const preview = document.querySelector<HTMLElement>('[data-preview]');
    const clearOverlay = document.querySelector<HTMLElement>('[data-clear]');
    const timerLabel = document.querySelector<HTMLElement>('[data-timer]');
    const movesLabel = document.querySelector<HTMLElement>('[data-moves]');
    const selectedMeta = document.querySelector<HTMLElement>('[data-selected-meta]');
    const secondPickerButton = document.querySelectorAll<HTMLButtonElement>('[data-work-id]')[1];
    const sizeFiveButton = document.querySelector<HTMLButtonElement>('[data-size="5"]');

    expect(board).not.toBeNull();
    expect(preview).not.toBeNull();
    expect(clearOverlay).not.toBeNull();
    expect(timerLabel).not.toBeNull();
    expect(movesLabel).not.toBeNull();
    expect(selectedMeta).not.toBeNull();
    expect(sizeFiveButton).not.toBeNull();
    expect(secondPickerButton).not.toBeUndefined();

    expect(timerLabel?.textContent).toBe('00:00');
    expect(movesLabel?.textContent).toBe('0');
    expect(board?.querySelectorAll('.tile')).toHaveLength(8);
    expect(clearOverlay?.classList.contains('is-visible')).toBe(false);

    secondPickerButton.click();

    expect(selectedMeta?.textContent).toBe('Second Work / Concept');
    expect(movesLabel?.textContent).toBe('0');
    expect(timerLabel?.textContent).toBe('00:00');
    expect(clearOverlay?.classList.contains('is-visible')).toBe(false);
    expect(board?.querySelectorAll('.tile')).toHaveLength(8);

    sizeFiveButton?.click();

    expect(board?.querySelectorAll('.tile')).toHaveLength(24);
    expect(movesLabel?.textContent).toBe('0');
    expect(sizeFiveButton?.classList.contains('is-active')).toBe(true);
  });
});