// ── Local image cache resolver ────────────────────────────────────────────────
// Maps remote URL → http://localhost:3001/cache/<filename>

const PRINT_SERVER = 'http://localhost:3001';
const LOCAL_IMG: Record<string, string> = {};
let imgCacheLoaded = false;

export async function loadImageCache() {
  if (imgCacheLoaded) return;
  try {
    const res = await fetch(`${PRINT_SERVER}/cache/manifest.json`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const manifest = await res.json();
      Object.assign(LOCAL_IMG, manifest);
      imgCacheLoaded = true;
      console.log(`[Image Cache] Loaded ${Object.keys(manifest).length} images served locally`);
    }
  } catch {
    // Print server offline or manifest not generated yet - fallback silently
  }
}

// Call immediately at script load
loadImageCache();

/**
 * Resolves a remote image URL to its local cache counterpart if it exists.
 * Falls back to the original URL if not cached.
 * Automatically rewrites deprecated Supabase cloud URLs to the self-hosted VPS URL.
 */
export function resolveImg(url?: string | null): string | undefined {
  if (!url) return undefined;
  // Auto-rewrite deprecated Supabase cloud domain to self-hosted VPS
  const sanitizedUrl = url.replace('https://hsylnrzxeyqxczdalurj.supabase.co', 'https://supabase.twinpizza.fr');
  return LOCAL_IMG[sanitizedUrl] || LOCAL_IMG[url] || toResizedUrl(sanitizedUrl);
}

// Original uploads are up to ~800 KB: serve a resized/compressed version through the
// storage image transformer of the self-hosted VPS (≈40 KB). Idempotent.
const STORAGE_PUBLIC = 'https://supabase.twinpizza.fr/storage/v1/object/public/';
const STORAGE_RENDER = 'https://supabase.twinpizza.fr/storage/v1/render/image/public/';

function toResizedUrl(url: string): string {
  if (!url.startsWith(STORAGE_PUBLIC) || /\.(svg|gif)(\?|$)/i.test(url)) return url;
  const resized = STORAGE_RENDER + url.slice(STORAGE_PUBLIC.length);
  return resized + (resized.includes('?') ? '&' : '?') + 'width=800&quality=75&resize=contain';
}
