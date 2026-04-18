import PocketBase from 'pocketbase';

const POCKETBASE_URL = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

// Import the PocketBase client like this:
// import { pb } from "@/integrations/pocketbase/client";

export const pb = new PocketBase(POCKETBASE_URL);

// Disable auto-cancellation so multiple requests can run in parallel
pb.autoCancellation(false);

// ============================================
// Auth helpers
// ============================================

/** Check if user is currently authenticated */
export function isAuthenticated(): boolean {
  return pb.authStore.isValid;
}

/** Get current auth user */
export function getCurrentUser() {
  return pb.authStore.record;
}

/** Sign in with email and password */
export async function signIn(email: string, password: string) {
  return pb.collection('users').authWithPassword(email, password);
}

/** Sign out */
export function signOut() {
  pb.authStore.clear();
}

/** Get the current auth token (for API calls) */
export function getAuthToken(): string {
  return pb.authStore.token;
}

// ============================================
// File URL helper
// ============================================

/**
 * Get the full URL for a file stored in PocketBase.
 * Usage: getFileUrl(record, 'image')
 */
export function getFileUrl(
  record: { id: string; collectionId: string; collectionName: string; [key: string]: any },
  filename: string
): string {
  if (!filename) return '';
  // If it's already an absolute URL (e.g. external image), return as-is
  if (filename.startsWith('http://') || filename.startsWith('https://')) {
    return filename;
  }
  return pb.files.getURL(record, filename);
}

// ============================================
// Realtime helpers
// ============================================

/**
 * Subscribe to realtime changes on a collection.
 * Returns an unsubscribe function.
 */
export function subscribeToCollection(
  collectionName: string,
  callback: (data: { action: string; record: any }) => void,
  filter?: string
): () => void {
  const eventStr = filter || '*';
  pb.collection(collectionName).subscribe(eventStr, (e) => {
    callback({ action: e.action, record: e.record });
  });

  return () => {
    pb.collection(collectionName).unsubscribe(eventStr);
  };
}

export default pb;
