import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with specific databaseId if provided
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

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
