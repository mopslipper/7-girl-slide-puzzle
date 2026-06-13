import worksJson from '../data/works.generated.json';

const CDN_BASE = 'https://cdn.jsdelivr.net/gh/mopslipper/mopslipper-Illustration-site@main';

export interface PuzzleImage {
  id: number;
  title: string;
  category: string;
  src: string;
  thumbnail: string;
}

interface PortfolioWork {
  id: number;
  title?: string;
  category?: string;
  image_path?: string;
  thumbnail?: string;
  hidden?: boolean;
  nsfw?: boolean;
}

function toCdnUrl(path: string): string {
  const prefixed = path.startsWith('/') ? path : `/${path}`;
  return encodeURI(`${CDN_BASE}${prefixed}`);
}

const rawWorks = worksJson as PortfolioWork[];

export const works: PuzzleImage[] = rawWorks.map((work) => ({
  id: work.id,
  title: work.title ?? `Work ${work.id}`,
  category: work.category ?? 'Original',
  src: toCdnUrl(work.image_path ?? ''),
  thumbnail: toCdnUrl(work.thumbnail ?? work.image_path ?? ''),
}));

if (works.length === 0) {
  throw new Error('works.generated.json is empty. Regenerate the manifest before building.');
}