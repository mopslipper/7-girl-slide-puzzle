import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = resolve(repoRoot, 'src/data/works.generated.json');
const cdnBase = 'https://cdn.jsdelivr.net/gh/mopslipper/mopslipper-Illustration-site@main';
const worksUrl = `${cdnBase}/data/works.json`;
const videoPattern = /\.(mp4|mov|webm)$/i;

function toCdnUrl(path) {
  const prefixed = path.startsWith('/') ? path : `/${path}`;
  return encodeURI(`${cdnBase}${prefixed}`);
}

function filterWork(work) {
  return work && !work.hidden && !work.nsfw && typeof work.image_path === 'string' && !videoPattern.test(work.image_path);
}

async function readExistingSnapshot() {
  try {
    const raw = await readFile(outputFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  let works = [];

  try {
    const response = await fetch(worksUrl, {
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`works.json fetch failed: ${response.status}`);
    }

    const json = await response.json();
    works = Array.isArray(json)
      ? json.filter(filterWork).map((work) => ({
          id: work.id,
          title: work.title ?? `Work ${work.id}`,
          category: work.category ?? 'Original',
          image_path: work.image_path,
          thumbnail: work.thumbnail ?? work.image_path,
          nsfw: work.nsfw ?? false,
          hidden: work.hidden ?? false,
          src: toCdnUrl(work.image_path),
        }))
      : [];
  } catch (error) {
    const existing = await readExistingSnapshot();
    if (existing) {
      console.warn('[sync-works] fetch failed, keeping existing snapshot:', error);
      return;
    }

    console.error('[sync-works] fetch failed and no snapshot exists:', error);
    process.exit(1);
  }

  if (works.length === 0) {
    console.error('[sync-works] works manifest is empty; refusing to overwrite snapshot');
    process.exit(1);
  }

  const manifest = works.map(({ src, ...work }) => work);
  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`[sync-works] wrote ${manifest.length} works to ${outputFile}`);
}

main().catch((error) => {
  console.error('[sync-works] unexpected error:', error);
  process.exit(1);
});