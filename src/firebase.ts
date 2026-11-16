import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Secondary Firebase App instance used by Super Admin to provision user accounts
// without signing the Super Admin out of the primary session.
const secondaryApp = initializeApp(firebaseConfig, 'secondaryAuthApp');
export const secondaryAuth = getAuth(secondaryApp);

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

/**
 * Maps an existing staff Login ID (e.g. "AMAN", "IAB001") to an internal
 * Firebase Auth email format so users continue logging in with their ID only.
 */
export function idToAuthEmail(userId: string): string {
  const clean = (userId || '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
  return `${clean || 'user'}@iab.internal`;
}

export function authEmailToId(email?: string | null): string {
  if (!email) return '';
  const local = email.split('@')[0] || '';
  return local.trim().toUpperCase();
}

/**
 * Firebase Authentication enforces a 6-character minimum password.
 * Existing short portal passwords (such as default "123" or "AMAN") are
 * deterministically padded for Firebase Auth compatibility while keeping
 * existing staff passwords unchanged in UX.
 */
export function toFirebaseAuthPassword(rawPassword: string): string {
  const clean = (rawPassword || '').trim();
  return clean.length >= 6 ? clean : `iab$${clean || '123'}#auth`;
}

export enum OperationType {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
}

export interface FirestoreErrorContext {
  operation: OperationType;
  path: string;
}

export function handleFirestoreError(error: unknown, context: FirestoreErrorContext): void {
  const err = error as { code?: string; message?: string };
  const message = `Firestore error during ${context.operation} at ${context.path}: [${err.code || 'unknown'}] ${err.message || String(error)}`;
  console.error(message);
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test_', 'ping'));
    return true;
  } catch (error: any) {
    if (error?.code === 'permission-denied' || error?.code === 'not-found') {
      return true; // Connection reached server successfully
    }
    console.warn('Firebase connection test warning:', error);
    return false;
  }
}
