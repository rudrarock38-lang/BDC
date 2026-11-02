import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { getDb, queryAll } from './db.ts';

export const firebaseConfig = {
  apiKey: "AIzaSyCoMmmaild-sOHcfB5bcOyyuGTQ2c2THyA",
  authDomain: "bdc-test-7bb1b.firebaseapp.com",
  projectId: "bdc-test-7bb1b",
  storageBucket: "bdc-test-7bb1b.firebasestorage.app",
  messagingSenderId: "875395492560",
  appId: "1:875395492560:web:658f00fbe812818e068cd5"
};

// Singleton Firebase App for server
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestore = getFirestore(app);

let lastSyncStats = {
  lastSyncTime: null as string | null,
  totalSynced: 0,
  breakdown: {} as Record<string, number>,
  status: 'idle' as 'idle' | 'syncing' | 'success' | 'error',
  error: null as string | null
};

/**
 * Live test to verify connection to Firestore
 */
export async function testFirebaseConnection(): Promise<{
  connected: boolean;
  projectId: string;
  latencyMs: number;
  timestamp: string;
  message?: string;
  error?: string;
}> {
  const startTime = Date.now();
  try {
    const testRef = doc(firestore, 'system_health', 'status');
    const nowIso = new Date().toISOString();
    await setDoc(testRef, {
      connected: true,
      projectId: firebaseConfig.projectId,
      tested_at: nowIso,
      message: 'Active live connection established from Pariksha CBT Server.'
    });

    const snap = await getDoc(testRef);
    const latencyMs = Date.now() - startTime;

    if (snap.exists()) {
      return {
        connected: true,
        projectId: firebaseConfig.projectId,
        latencyMs,
        timestamp: nowIso,
        message: 'Successfully verified Firestore read & write connection.'
      };
    } else {
      return {
        connected: false,
        projectId: firebaseConfig.projectId,
        latencyMs,
        timestamp: nowIso,
        error: 'Firestore document write succeeded but read was empty.'
      };
    }
  } catch (err: any) {
    return {
      connected: false,
      projectId: firebaseConfig.projectId,
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      error: err.message || 'Failed to connect to Firebase Firestore.'
    };
  }
}

/**
 * Synchronize a single record directly to Firestore
 */
export async function syncRecordToFirestore(
  collectionName: string,
  docId: string,
  data: Record<string, any>
): Promise<boolean> {
  try {
    const docRef = doc(firestore, collectionName, String(docId));
    // Clean undefined fields
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    await setDoc(docRef, {
      ...sanitized,
      _synced_at: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn(`[FIREBASE SYNC] Failed to sync ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Delete a single record from Firestore
 */
export async function removeRecordFromFirestore(
  collectionName: string,
  docId: string
): Promise<boolean> {
  try {
    const docRef = doc(firestore, collectionName, String(docId));
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.warn(`[FIREBASE SYNC] Failed to delete ${collectionName}/${docId}:`, err);
    return false;
  }
}

/**
 * Batch-sync an entire table from SQLite to Firestore
 */
async function syncTable(
  tableName: string,
  targetCollection: string,
  idField: string = 'id',
  transform?: (row: any) => any
): Promise<number> {
  const db = await getDb();
  const rows = queryAll(db, `SELECT * FROM ${tableName}`);
  if (!rows || rows.length === 0) return 0;

  // Firestore batches max 500 operations
  const chunkSize = 400;
  let synced = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const batch = writeBatch(firestore);

    for (const row of chunk) {
      const docId = String(row[idField]);
      if (!docId) continue;

      const docRef = doc(firestore, targetCollection, docId);
      let payload = transform ? transform(row) : { ...row };

      // Ensure no undefined values
      const sanitized: Record<string, any> = {};
      for (const [k, v] of Object.entries(payload)) {
        if (v !== undefined) {
          sanitized[k] = v;
        }
      }
      sanitized._synced_at = new Date().toISOString();

      batch.set(docRef, sanitized, { merge: true });
    }

    await batch.commit();
    synced += chunk.length;
  }

  return synced;
}

/**
 * Full synchronization of all CBT tables to Firebase Firestore
 */
export async function syncAllDataToFirestore(): Promise<{
  success: boolean;
  totalSynced: number;
  breakdown: Record<string, number>;
  timestamp: string;
  error?: string;
}> {
  lastSyncStats.status = 'syncing';
  lastSyncStats.error = null;

  try {
    const breakdown: Record<string, number> = {};

    // 1. Users (exclude raw plaintext password)
    breakdown['users'] = await syncTable('users', 'users', 'id', (row) => ({
      id: row.id,
      role: row.role,
      name: row.name,
      email: row.email,
      mobile: row.mobile || '',
      roll_number: row.roll_number || '',
      status: row.status || 'active',
      created_at: row.created_at
    }));

    // 2. Subjects
    breakdown['subjects'] = await syncTable('subjects', 'subjects');

    // 3. Topics
    breakdown['topics'] = await syncTable('topics', 'topics');

    // 4. Questions
    breakdown['questions'] = await syncTable('questions', 'questions');

    // 5. Exams
    breakdown['exams'] = await syncTable('exams', 'exams');

    // 6. Exam Questions link
    breakdown['exam_questions'] = await syncTable('exam_questions', 'exam_questions');

    // 7. Exam Attempts
    breakdown['exam_attempts'] = await syncTable('exam_attempts', 'exam_attempts');

    // 8. Answers
    breakdown['answers'] = await syncTable('answers', 'answers');

    // 9. Results
    breakdown['results'] = await syncTable('results', 'results');

    // 10. System Settings
    breakdown['settings'] = await syncTable('settings', 'settings', 'key', (row) => ({
      key: row.key,
      value: row.value
    }));

    const totalSynced = Object.values(breakdown).reduce((a, b) => a + b, 0);
    const nowIso = new Date().toISOString();

    // Record sync metadata in Firestore
    await setDoc(doc(firestore, 'system_health', 'sync_meta'), {
      last_synced_at: nowIso,
      total_records: totalSynced,
      breakdown,
      synced_by: 'Pariksha CBT Engine'
    }, { merge: true });

    lastSyncStats = {
      lastSyncTime: nowIso,
      totalSynced,
      breakdown,
      status: 'success',
      error: null
    };

    console.log(`[FIREBASE SYNC] Complete! Synced ${totalSynced} records to Firestore.`);
    return {
      success: true,
      totalSynced,
      breakdown,
      timestamp: nowIso
    };
  } catch (err: any) {
    console.error('[FIREBASE SYNC] Error during full sync:', err);
    lastSyncStats.status = 'error';
    lastSyncStats.error = err.message || 'Sync failed';
    return {
      success: false,
      totalSynced: 0,
      breakdown: {},
      timestamp: new Date().toISOString(),
      error: err.message || 'Sync failed'
    };
  }
}

/**
 * Get current sync and connection summary
 */
export async function getFirebaseStatusSummary() {
  const connTest = await testFirebaseConnection();
  const db = await getDb();

  const localCounts: Record<string, number> = {};
  const tables = ['users', 'subjects', 'topics', 'questions', 'exams', 'exam_attempts', 'results', 'settings'];
  for (const t of tables) {
    try {
      const rows = queryAll(db, `SELECT COUNT(*) as count FROM ${t}`);
      localCounts[t] = rows[0]?.count || 0;
    } catch {
      localCounts[t] = 0;
    }
  }

  return {
    connected: connTest.connected,
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket,
    latencyMs: connTest.latencyMs,
    lastSyncStats,
    localCounts,
    timestamp: new Date().toISOString()
  };
}
