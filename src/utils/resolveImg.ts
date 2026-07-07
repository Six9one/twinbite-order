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
 */
export function resolveImg(url?: string | null): string | undefined {
  if (!url) return undefined;
  return LOCAL_IMG[url] || url;
}
