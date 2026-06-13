import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputFile = resolve(repoRoot, 'src/data/works.generated.json');
const videoPattern = /\.(mp4|mov|webm)$/i;

// Source of truth: the local illustration site's works.json.
// Override with the WORKS_JSON_PATH environment variable if the site lives elsewhere.
const defaultSource = 'C:/Users/shiki/Documents/github/repository/6-mopslippers-illustration_site/data/works.json';
const sourceFile = resolve(process.env.WORKS_JSON_PATH ?? defaultSource);

function filterWork(work) {
  return (
    work &&
    !work.hidden &&
    !work.nsfw &&
    typeof work.image_path === 'string' &&
    !videoPattern.test(work.image_path)
  );
}

async function readExistingSnapshot() {
  try {
    const raw = await readFile(outputFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function readSource() {
  try {
    const raw = await readFile(sourceFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function main() {
  const source = await readSource();

  // On machines without the local illustration site (e.g. CI), keep the
  // committed snapshot so the build still succeeds.
  if (source === null) {
    const existing = await readExistingSnapshot();
    if (existing) {
      console.warn(`[sync-works-local] source not found at ${sourceFile}; keeping existing snapshot`);
      return;
    }

    console.error(`[sync-works-local] source not found at ${sourceFile} and no snapshot exists`);
    process.exit(1);
  }

  const works = Array.isArray(source)
    ? source.filter(filterWork).map((work) => ({
        id: work.id,
        title: work.title ?? `Work ${work.id}`,
        category: work.category ?? 'Original',
        image_path: work.image_path,
        thumbnail: work.thumbnail ?? work.image_path,
        nsfw: work.nsfw ?? false,
        hidden: work.hidden ?? false,
      }))
    : [];

  if (works.length === 0) {
    console.error('[sync-works-local] no usable works found; refusing to overwrite snapshot');
    process.exit(1);
  }

  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(works, null, 2)}\n`, 'utf8');
  console.log(`[sync-works-local] wrote ${works.length} works from ${sourceFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[sync-works-local] unexpected error:', error);
    process.exit(1);
  });
