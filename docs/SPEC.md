# スライドパズル 企画・要件定義・MVP仕様書 v1.1

> 本書は実装担当（gpt-5.4 mini）への引き渡し仕様です。曖昧さを残さないことを目的とし、
> 「何を作るか」「どう振る舞うか」「完了の判定基準」を確定します。
> 仕様変更時は本書を更新し、コードより本書を正とします。

- 対象リポジトリ: `7-girl-slide-puzzle`
- 公開先: GitHub Pages（`base = '/7-girl-slide-puzzle'`）
- 技術スタック: Astro 5 / バニラ TypeScript / Vitest
- バージョン: v1.1（v1.0 の実装レビューを反映）

---

## 1. 企画

### 1.1 コンセプト
イラストポートフォリオサイト（`mopslipper/mopslipper-Illustration-site`）の作品画像を使って遊べる
スライドパズル。ポートフォリオと同じテーマ色（ダーク × ピンク `#FF69B4` × パープル）を採用し、
ブランド体験を地続きにする回遊コンテンツとして提供する。

### 1.2 ゴール
- 来訪者が「好きな作品を選んで」「好きな難度で」スライドパズルを遊べる。
- ローカル開発で完成させ、GitHub Pages へ静的サイトとして公開する。
- 画像はポートフォリオ側を一次ソースとし、本リポジトリに画像実体を持たない。

### 1.3 想定ユーザー / 利用環境
- ポートフォリオ訪問者（PC・スマートフォン両対応）。
- モバイル幅 360px でレイアウトが崩れず、タップで操作できること。

### 1.4 非ゴール（MVP対象外）
- タイル移動のアニメーション補間（CSS transition の軽微な演出は可）。
- オンラインランキング / スコア共有 / SNS連携。
- 難易度自動調整・ソルバーAI。
- 動画作品・NSFW作品の対応。
- 複数タイル同時スライド、ドラッグ操作。

---

## 2. 要件定義

### 2.1 機能要件
| ID | 要件 | 区分 |
|----|------|------|
| FR-1 | 盤面サイズを 4×4 / 5×5 / 6×6 から選択できる | 必須 |
| FR-2 | ポートフォリオ作品から画像を選択し、パズル画像を切り替えられる | 必須 |
| FR-3 | 空きマスに隣接するタイルのみ、クリック/タップで移動できる | 必須 |
| FR-4 | 手数カウンターを表示する | 必須 |
| FR-5 | 経過時間タイマー（mm:ss）を表示する | 必須 |
| FR-6 | 完成を検出し、クリア演出を表示する | 必須 |
| FR-7 | 完成見本（プレビュー）の表示/非表示を切り替えられる | 必須 |
| FR-8 | タイル番号の表示/非表示を切り替えられる | 必須 |
| FR-9 | ベストスコア（手数優先→同手数なら時間）を画像×サイズ別に保存・表示する | 必須 |
| FR-10 | キーボード（矢印キー）でも空き隣接タイルを移動できる | 必須 |
| FR-11 | 画像が0件のときは明示的にビルドを失敗させ、壊れた公開を防ぐ | 必須 |

### 2.2 非機能要件
| ID | 要件 |
|----|------|
| NFR-1 | ポートフォリオと同一のテーマ色・トーンを再現する |
| NFR-2 | モバイル幅 360px で操作・レイアウトが破綻しない |
| NFR-3 | 画像実体を本リポジトリに保持しない（jsDelivr 参照） |
| NFR-4 | ネットワーク不通時でもビルドが再現可能（manifest スナップショットを使用） |
| NFR-5 | パズルの中核ロジックは DOM 非依存の純粋関数で、単体テスト可能 |
| NFR-6 | 初回ロードの盤面状態が毎回同一（非決定性を排除） |

### 2.3 v1.0 レビューで確定した修正方針
本仕様は v1.0 実装のレビュー結果を反映する。以下を必須の是正項目とする。

1. **初期化の非決定性を排除**（→ §4.2）
   v1.0 では非同期の画像寸法取得とサイズ初期化のシャッフルが競合し、初回盤面が
   ネットワーク速度依存で「シャッフル済み/完成済み」と揺れた。本版では
   「初回は未シャッフルの完成見本」を一意な初期状態とし、シャッフルは明示操作でのみ実行する。

2. **プレビュー/番号の既定を OFF に**（→ §5.3）
   既定 ON ではパズルとして難度が成立しないため、両トグルとも既定 OFF とする。

3. **データ取得の堅牢化**（→ §6）
   ビルド時に jsDelivr から取得した manifest を `src/data/works.generated.json` に
   スナップショット保存し、リポジトリに含める。ネット不通時はスナップショットを使用。
   取得・スナップショットともに 0 件なら **ビルドを失敗**させる（FR-11）。

4. **`game.ts` の再設計**（→ §5.4）
   引数手渡し中心の構造をやめ、単一の状態オブジェクト + クロージャ群に集約する。
   デッドコード（未使用引数等）を除去し、`render(state)` を単一の「状態→DOM」関数に統一する。

5. **ピッカーの初期負荷軽減**（→ §5.2）
   全作品を一度に描画せず、初期表示は上限 60 件 +「もっと見る」で追加描画する。

### 2.4 確定した運用方針（推奨採用）
- 画像 manifest: **ビルド時 fetch + リポジトリへ JSON スナップショット保存**（ネット不通でもビルド可）。
- jsDelivr 参照: `@main`（自動同期）。
- works 空時: **ビルド失敗**で公開を防止する。
- UI: バニラ TypeScript（ポートフォリオ流儀踏襲）。

---

## 3. システム構成

```
7-girl-slide-puzzle/
├ astro.config.mjs            site + base='/7-girl-slide-puzzle', build.format='file'
├ package.json                astro^5, vitest, typescript
├ tsconfig.json
├ docs/SPEC.md                本書
├ scripts/
│  └ sync-works.mjs           ビルド前に works.json を取得し generated JSON を更新
├ .github/workflows/deploy.yml  test → build → deploy(pages)
├ public/favicon.svg
├ src/
│  ├ layouts/Layout.astro
│  ├ pages/index.astro        パズルUI（サイズ選択 / 盤面 / HUD / ピッカー / クリア演出）
│  ├ styles/global.css        ポートフォリオのデザイントークン
│  ├ data/works.generated.json  画像 manifest スナップショット（コミット対象）
│  ├ lib/
│  │  ├ works.ts              generated JSON を読み込み PuzzleImage[] を export（0件で throw）
│  │  └ puzzle.ts             純粋ゲームロジック
│  └ scripts/game.ts          DOM 配線（状態 + クロージャ）
└ tests/
   └ puzzle.test.ts           ロジック単体テスト
```

---

## 4. 用語と状態モデル

### 4.1 用語
- **N**: グリッド一辺のタイル数（`4 | 5 | 6`）。
- **盤面（Board）**: 長さ N² の配列。各要素は tileValue（`0` = 空きマス）。
- **index**: 盤面位置 `0..N²-1`。`row = Math.floor(index / N)`, `col = index % N`。
- **tileValue**: タイルの正解位置番号 `1..N²-1`（空きは `0`）。完成形は `[1,2,...,N²-1, 0]`。

### 4.2 初期状態（一意・再現性あり）
- 初回ロード時: 選択画像 = `works[0]`、N = 4、盤面 = **未シャッフルの完成形**。
  - 完成見本として盤面に画像が整列表示される（ただしプレビュー overlay は §5.3 の既定に従い OFF）。
  - タイマー未開始（`00:00`）、手数 0。
- 画像寸法（naturalWidth/Height）の取得は**ゲーム開始をブロックしない**。
  未取得時は CSS の `cover` 相当にフォールバックし、取得後に再描画する。
- **シャッフルは明示操作（シャッフルボタン押下 / サイズ変更 / 画像変更）でのみ**実行する。

### 4.3 ゲーム状態オブジェクト（game.ts 内）
```ts
type GameState = {
  size: number;            // N (4|5|6)
  board: Board;            // 現在の盤面
  image: PuzzleImage;      // 選択中の画像
  moves: number;           // 手数
  startedAt: number | null;// 最初の有効手の時刻（null=未開始）
  timerId: number | null;  // setInterval ハンドル
  showPreview: boolean;    // 既定 false
  showNumbers: boolean;    // 既定 false
  solved: boolean;         // 完成フラグ
  natural: { w: number; h: number }; // 画像実寸（未取得は {1,1}）
};
```

---

## 5. 画面・UI/操作仕様

### 5.1 レイアウト（上から）
1. ヘッダー: タイトル「Slide Puzzle」。任意でポートフォリオへの戻りリンク。
2. コントロールバー:
   - サイズ選択: `[4×4][5×5][6×6]`（`data-size`、選択中をハイライト）。
   - アクション: `シャッフル` / `見本`（プレビュー切替）/ `番号`（番号切替）。
3. HUD: 手数 / 時間 / ベスト / 選択中作品名。
4. 盤面: `aspect-ratio:1` の正方形コンテナ。タイルを絶対配置。
5. 画像ピッカー: 作品カードのグリッド。選択中をハイライト。初期最大 60 件 +「もっと見る」。
6. クリア演出オーバーレイ: 初期非表示。完成時に「クリア！ 手数X / 時間Y」を表示。

### 5.2 画像ピッカー
- カードはサムネ（`thumbnail`）+ タイトル。クリックで選択画像を切替 → **完成見本へリセット**（自動シャッフルしない）。
- 初期描画は先頭 60 件。「もっと見る」押下で残りを追加描画。
- 画像が 0 件のケースはビルドで弾く（FR-11）ため、UI 側の空状態は最小限（プレースホルダ文言）で可。

### 5.3 トグルの既定値
- **プレビュー（見本）: 既定 OFF。** ON のとき盤面に完成画像を半透明（opacity ≈ 0.28）で重畳。
- **番号: 既定 OFF。** ON のとき各タイルに tileValue を表示。
- 両トグルは即時反映（再描画）。

### 5.4 操作・描画（game.ts）
- 描画方針: 空き以外のタイル（N²-1 個）を `div`/`button` で生成し盤面へ絶対配置。
  - タイル寸法 = 盤面幅 / N。位置 = `(col, row) × タイル寸法`。
  - 各タイルは同一画像を共有し、`background-size`/`background-position` を計算してずらすことで
    「1枚の画像を分割」表現にする。
  - 画像はポートレート主体のため、正方形盤面へ **cover でセンタークロップ**（短辺基準でスケール、中央寄せ）。
- 入力:
  - クリック/タップ（`pointerup` または `click`）で対象タイルが `canMove` なら `move`、`moves++`、再描画。
  - **キーボード（矢印キー）**: 押下方向に応じて空きマスへスライドできるタイルを移動（FR-10）。
    例: 「↑」= 空きの一つ下のタイルを上へ動かす（空きが上方向へ動くのと逆方向のタイルが動く）。
    実装は「空きの隣接タイルのうち押下方向に対応するものを `move`」とする。
- タイマー: 最初の有効手で開始（`setInterval` 1s）。完成で停止。
- 完成処理: タイマー停止 → クリア演出表示 → ベスト更新判定。
- ドラッグは実装しない。

### 5.5 ベストスコア（localStorage）
- キー: `sp-best:{imageId}:{N}`。値: `{ moves: number, seconds: number }`。
- 更新規則: `moves` が小さい方を優先。同手数なら `seconds` が短い方。更新時に HUD 反映。

---

## 6. データ層

### 6.1 ソースと参照
- 一次ソース: `https://cdn.jsdelivr.net/gh/mopslipper/mopslipper-Illustration-site@main/data/works.json`
- 画像 URL: `https://cdn.jsdelivr.net/gh/mopslipper/mopslipper-Illustration-site@main` + `image_path`
  （`image_path` は `"/static/img/works/x.webp"` 形式。`encodeURI` でスペース等を安全化）。

### 6.2 manifest 同期スクリプト（scripts/sync-works.mjs）
- 役割: works.json を取得し、除外・整形して `src/data/works.generated.json` に書き出す。
- 実行: `npm run sync`（手動）。`prebuild` で自動実行するが、**取得失敗時は既存スナップショットを温存**する
  （ネット不通でビルドを壊さない）。
- 除外条件: `hidden === true` / `nsfw === true` / `image_path` が動画（`.mp4` / `.mov` / `.webm`）。
- 変換後の各要素:
  ```json
  { "id": 1, "title": "猫耳少女", "category": "Original",
    "src": "https://cdn.jsdelivr.net/gh/.../001-cat-girl.webp",
    "thumbnail": "https://cdn.jsdelivr.net/gh/.../001-cat-girl.jpg" }
  ```

### 6.3 読み込み（src/lib/works.ts）
- `src/data/works.generated.json` を import し、`PuzzleImage[]` として export する。
- **配列が空なら例外を throw**（FR-11 / §2.3-3）。これによりビルドが失敗し、壊れた公開を防ぐ。

---

## 7. ゲームロジック（src/lib/puzzle.ts・純粋関数）

```ts
type Board = number[];

createSolved(n: number): Board          // [1..n²-1, 0]
findBlank(b: Board): number             // 値0のindex
canMove(b: Board, n: number, i: number): boolean
                                        // iのタイルが空きと上下左右で隣接（行折返し禁止）
move(b: Board, n: number, i: number): Board
                                        // 合法なら空きと交換した新配列、非合法なら同一内容の新配列
isSolved(b: Board): boolean             // createSolved と一致
shuffle(b: Board, n: number, steps?, rng?): Board
                                        // 合法手のみ適用して解ける配置を生成。
                                        // 直前の手の即戻し回避。既定 steps = n²×40。
                                        // 偶然 isSolved になったら再シャッフル。
```
- 隣接判定: index 差が `±n`、または `±1` かつ同一 row（col 折返し禁止）。
- `rng` を引数で受けてテスト時に決定的シードを注入できること。

---

## 8. テーマ（src/styles/global.css）
- ポートフォリオ `global.css` の `:root` デザイントークンを移植する。
  - `--primary #ff69b4` / `--accent-2 #e05cc8` / `--bg #0e0d12` / `--bg-card #17151e`
  - `--text #e8e6ee` / `--text-muted #9a93a8` / `--border #2c2837`
  - `--radius` 系、`--font-body`（Noto Sans JP 系）。
- ダーク背景、ピンク/パープルのアクセント、ボタンは pill 形状を踏襲する。

---

## 9. デプロイ（.github/workflows/deploy.yml）
- トリガー: `push`（main）+ `workflow_dispatch`。
- 権限: `pages: write` / `id-token: write`。
- ジョブ: `test`（`npm ci` → `npm test`）→ `build`（`withastro/action@v3` path `.`）→ `deploy`（`actions/deploy-pages@v4`）。
- `astro.config.mjs`: `site='https://mopslipper.github.io'`, `base='/7-girl-slide-puzzle'`,
  `build.format='file'`, `trailingSlash:'ignore'`。
- 補足: manifest スナップショットはリポジトリに含めるため、CI は別リポジトリ取得に依存せずビルド可能。

---

## 10. 受け入れ基準（Acceptance Criteria）
- [ ] AC-1: 4/5/6 切替でグリッドが変わり、新ゲーム（シャッフル状態）が開始する。
- [ ] AC-2: ピッカーから非NSFW作品を選択すると盤面画像が切り替わる（自動シャッフルしない＝完成見本に戻る）。
- [ ] AC-3: シャッフル後、空き隣接タイルのみ移動できる。
- [ ] AC-4: 完成でクリア演出表示・タイマー停止・手数/時間表示。
- [ ] AC-5: 見本/番号トグルが既定 OFF で、押下により即時反映される。
- [ ] AC-6: ベストが画像×サイズ別に localStorage 保存・再訪問で復元される。
- [ ] AC-7: 矢印キーで空き隣接タイルを移動できる。
- [ ] AC-8: 初回ロードの盤面が毎回同一（未シャッフルの完成見本）で、非決定性がない。
- [ ] AC-9: モバイル幅 360px でレイアウト崩れず操作できる。
- [ ] AC-10: `works` が空のとき `npm run build` が失敗する。
- [ ] AC-11: `npm test` 緑（サイズ 4/5/6 × 複数シードで shuffle が解ける & isSolved にならないテストを含む）。
- [ ] AC-12: 画像はリポジトリにコピーされず、jsDelivr 参照のみ。

---

## 11. 実装タスク（gpt-5.4 mini 向け・順序付き）
1. `scripts/sync-works.mjs` を作成し、`package.json` に `sync` / `prebuild` スクリプトを追加。
   初回実行で `src/data/works.generated.json` を生成・コミット。
2. `src/lib/works.ts` を generated JSON 読み込み + 0件 throw に変更。
3. `src/lib/puzzle.ts` にキーボード移動を補助する `moveByDirection`（任意）を検討。なければ game.ts 側で実装。
4. `src/scripts/game.ts` を状態オブジェクト + クロージャに再構成。
   - 初期化順序を §4.2 に合わせ、初回は未シャッフル見本・シャッフルは明示操作のみ。
   - デッドコード除去、`render(state)` へ統一。
   - プレビュー/番号の既定 OFF（§5.3）。
   - 矢印キー操作を追加（§5.4）。
5. `src/pages/index.astro` のピッカーに 60 件上限 +「もっと見る」を追加。
6. `tests/puzzle.test.ts` にサイズ 4/5/6 × 複数シードの shuffle 検証を追加。
7. `npm test` と `npm run build` を緑にする。受け入れ基準 §10 を全て満たすことを確認。

---

## 12. 変更履歴
- v1.1（2026-06-13）: v1.0 実装レビューを反映。初期化の非決定性排除、プレビュー/番号 既定 OFF、
  manifest スナップショット化（0件ビルド失敗）、game.ts 再設計、ピッカー初期負荷軽減、
  キーボード操作とテスト拡充を追加。
- v1.0: 初版 MVP 仕様（基本機能・jsDelivr 参照・GitHub Pages）。
