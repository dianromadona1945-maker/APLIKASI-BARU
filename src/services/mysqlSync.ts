import { Student, StudentDocument, AuditLog, User } from '../types';
import {
  smartMergeRemoteData,
  getStudents,
  getDocuments,
  getAcademicYears,
  getDeletedStudentIds,
  getDeletedDocIds,
  markStudentsAsSynced,
  markDocumentsAsSynced,
} from './storage';

export interface RumahwebSyncConfig {
  apiUrl: string;
  syncKey: string;
  autoSync: boolean;
  lastSyncTime?: string;
  lastSyncStatus?: 'idle' | 'success' | 'error' | 'syncing';
  lastSyncMessage?: string;
  serverCounts?: {
    students: number;
    documents: number;
    academicYears: number;
  };
}

const SYNC_CONFIG_KEY = 'arsip_rumahweb_sync_config_v1';
const LAST_KNOWN_UPDATE_KEY = 'arsip_rumahweb_last_known_update_v1';
const LAST_KNOWN_DOC_UPDATE_KEY = 'arsip_rumahweb_last_known_doc_update_v1';

let isSyncInProgress = false;

export function getIsSyncInProgress(): boolean {
  return isSyncInProgress;
}

export function getLastKnownSyncTimestamp(): string {
  try {
    return localStorage.getItem(LAST_KNOWN_UPDATE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveLastKnownSyncTimestamp(ts: string): void {
  try {
    localStorage.setItem(LAST_KNOWN_UPDATE_KEY, ts);
  } catch {}
}

export function getLastKnownDocSyncTimestamp(): string {
  try {
    return localStorage.getItem(LAST_KNOWN_DOC_UPDATE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveLastKnownDocSyncTimestamp(ts: string): void {
  try {
    localStorage.setItem(LAST_KNOWN_DOC_UPDATE_KEY, ts);
  } catch {}
}

export function getSyncConfig(): RumahwebSyncConfig {
  try {
    const raw = localStorage.getItem(SYNC_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.apiUrl || typeof parsed.apiUrl !== 'string' || !parsed.apiUrl.trim()) {
        parsed.apiUrl = 'https://arsipatf.my.id/api.php';
      }
      if (!parsed.syncKey || typeof parsed.syncKey !== 'string' || !parsed.syncKey.trim()) {
        parsed.syncKey = 'ArsipAttafaqquh2026';
      }
      if (parsed.autoSync === undefined) {
        parsed.autoSync = true;
      }
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load Rumahweb sync config:', e);
  }
  return {
    apiUrl: 'https://arsipatf.my.id/api.php',
    syncKey: 'ArsipAttafaqquh2026',
    autoSync: true,
    lastSyncStatus: 'idle',
  };
}

export function saveSyncConfig(config: Partial<RumahwebSyncConfig>): RumahwebSyncConfig {
  const current = getSyncConfig();
  const updated: RumahwebSyncConfig = {
    ...current,
    ...config,
  };
  localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(updated));
  return updated;
}

/**
 * Lightweight check to detect if server data has changed without pulling entire database
 * Uses action=check_sync for instant detection of student or document changes
 */
export async function checkServerSyncStatus(): Promise<{
  success: boolean;
  counts?: { students: number; documents: number; academicYears: number };
  lastStudentUpdate?: string;
  lastDocUpdate?: string;
  serverTime?: string;
  error?: string;
}> {
  const config = getSyncConfig();
  if (!config.apiUrl || !config.apiUrl.startsWith('http')) {
    return { success: false, error: 'API URL belum dikonfigurasi' };
  }

  try {
    const cleanUrl = config.apiUrl.trim();
    const url = new URL(cleanUrl);
    // Primary: use action=check_sync which returns real-time max upload_date for documents and updated_at for students
    url.searchParams.set('action', 'check_sync');

    let response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({ key: config.syncKey.trim() }),
    });

    // Fallback: if server has an older api.php that does not have check_sync, fallback to action=test
    if (!response.ok) {
      url.searchParams.set('action', 'test');
      response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': config.syncKey.trim(),
        },
        body: JSON.stringify({ key: config.syncKey.trim() }),
      });
    }

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    if (data.success) {
      saveSyncConfig({
        lastSyncStatus: 'success',
        serverCounts: data.counts,
      });
      return {
        success: true,
        counts: data.counts,
        lastStudentUpdate: data.lastStudentUpdate || '',
        lastDocUpdate: data.lastDocUpdate || '',
        serverTime: data.server_time || '',
      };
    }
    return { success: false, error: data.error || 'Check failed' };
  } catch (err: any) {
    return { success: false, error: err.message || String(err) };
  }
}

export async function testRumahwebConnection(
  apiUrl: string,
  syncKey: string
): Promise<{ success: boolean; message: string; counts?: { students: number; documents: number; academicYears: number } }> {
  if (!apiUrl || !apiUrl.startsWith('http')) {
    return {
      success: false,
      message: 'URL API Rumahweb tidak valid. Pastikan diawali dengan https:// atau http://',
    };
  }

  try {
    const cleanUrl = apiUrl.trim();
    const url = new URL(cleanUrl);
    url.searchParams.set('action', 'test');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': syncKey.trim(),
      },
      body: JSON.stringify({ key: syncKey.trim() }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      return {
        success: false,
        message: `Server Rumahweb merespons status HTTP ${response.status}: ${text.slice(0, 150) || response.statusText}`,
      };
    }

    const data = await response.json();
    if (data.success) {
      saveSyncConfig({
        apiUrl: cleanUrl,
        syncKey: syncKey.trim(),
        lastSyncStatus: 'success',
        lastSyncMessage: data.message || 'Terhubung dengan database MySQL Rumahweb',
        serverCounts: data.counts,
      });
      return {
        success: true,
        message: data.message || 'Berhasil terhubung ke database MySQL Rumahweb!',
        counts: data.counts,
      };
    } else {
      return {
        success: false,
        message: data.error || data.message || 'Gagal autentikasi dengan server Rumahweb',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi server Rumahweb: ${err.message || String(err)}. Periksa koneksi internet atau CORS pada hosting.`,
    };
  }
}

export async function deleteStudentFromHosting(studentId: string): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API belum dikonfigurasi' };
  }
  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'delete_student');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        studentId,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const result = await response.json();
    return {
      success: !!result.success,
      message: result.message || 'Siswa berhasil dihapus dari server cloud',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghapus siswa dari server cloud: ${err.message || String(err)}`,
    };
  }
}

export async function saveStudentToHosting(student: Student): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API belum dikonfigurasi' };
  }
  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'save_student');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        student,
      }),
    });

    if (!response.ok) {
      // Fallback: If server has older api.php without 'save_student', fallback to pushStudentsToHosting
      return await pushStudentsToHosting([student]);
    }

    const data = await response.json();
    if (data.success) {
      markStudentsAsSynced([student.id]);
      return { success: true, message: data.message || `Siswa ${student.name} berhasil disimpan di cloud` };
    } else {
      return await pushStudentsToHosting([student]);
    }
  } catch {
    try {
      return await pushStudentsToHosting([student]);
    } catch (fallbackErr: any) {
      return { success: false, message: fallbackErr.message || String(fallbackErr) };
    }
  }
}

export async function pushStudentsToHosting(students: Student[]): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API belum dikonfigurasi' };
  }
  if (students.length === 0) {
    return { success: true, message: 'Tidak ada data siswa untuk dikirim' };
  }
  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'push_students');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        students,
      }),
    });

    if (!response.ok) {
      // Fallback to push_all with mirror: false (NON-DESTRUCTIVE: NEVER deletes existing server data)
      const fallbackUrl = new URL(config.apiUrl);
      fallbackUrl.searchParams.set('action', 'push_all');
      const fallbackRes = await fetch(fallbackUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': config.syncKey.trim(),
        },
        body: JSON.stringify({
          key: config.syncKey.trim(),
          students,
          documents: [],
          academicYears: [],
          mirror: false,
        }),
      });
      if (!fallbackRes.ok) throw new Error(`HTTP ${fallbackRes.status}`);
      const fbData = await fallbackRes.json();
      if (fbData.success) {
        markStudentsAsSynced(students.map((s) => s.id));
        return { success: true, message: fbData.message || `${students.length} siswa tersimpan di cloud` };
      }
      return { success: false, message: fbData.error || fbData.message || 'Gagal menyimpan siswa' };
    }

    const data = await response.json();
    if (data.success) {
      markStudentsAsSynced(students.map((s) => s.id));
      return { success: true, message: data.message || `${students.length} siswa tersimpan di cloud` };
    }
    return { success: false, message: data.error || data.message || 'Gagal menyimpan siswa' };
  } catch (err: any) {
    return { success: false, message: `Gagal mengirim siswa ke cloud: ${err.message || String(err)}` };
  }
}

export async function deleteDocumentFromHosting(
  docId: string,
  studentId?: string,
  docType?: string
): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API belum dikonfigurasi' };
  }
  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'delete_document');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        docId,
        studentId,
        docType,
      }),
    });
    const result = await response.json();
    return {
      success: !!result.success,
      message: result.message || 'Dokumen berhasil dihapus dari cloud',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghapus dokumen dari cloud: ${err.message || String(err)}`,
    };
  }
}

export async function saveDocumentToHosting(doc: StudentDocument): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API belum dikonfigurasi' };
  }
  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'save_document');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        document: doc,
      }),
    });

    if (!response.ok) {
      return await pushDocumentsToHosting([doc]);
    }

    const data = await response.json();
    if (data.success) {
      markDocumentsAsSynced([doc.id]);
      return { success: true, message: data.message || `Dokumen ${doc.title} tersimpan di cloud` };
    } else {
      return await pushDocumentsToHosting([doc]);
    }
  } catch {
    try {
      return await pushDocumentsToHosting([doc]);
    } catch (fallbackErr: any) {
      return { success: false, message: fallbackErr.message || String(fallbackErr) };
    }
  }
}

export async function pushDocumentsToHosting(documents: StudentDocument[]): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API belum dikonfigurasi' };
  }
  if (documents.length === 0) {
    return { success: true, message: 'Tidak ada dokumen untuk dikirim' };
  }
  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'push_documents');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        documents,
      }),
    });

    if (!response.ok) {
      // Fallback to push_all
      const fallbackUrl = new URL(config.apiUrl);
      fallbackUrl.searchParams.set('action', 'push_all');
      const fallbackRes = await fetch(fallbackUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': config.syncKey.trim(),
        },
        body: JSON.stringify({
          key: config.syncKey.trim(),
          students: [],
          documents,
          academicYears: [],
          mirror: false,
        }),
      });
      if (!fallbackRes.ok) throw new Error(`HTTP ${fallbackRes.status}`);
      const fbData = await fallbackRes.json();
      if (fbData.success) {
        markDocumentsAsSynced(documents.map((d) => d.id));
        return { success: true, message: fbData.message || `${documents.length} dokumen tersimpan di cloud` };
      }
      return { success: false, message: fbData.error || fbData.message || 'Gagal menyimpan dokumen' };
    }

    const data = await response.json();
    if (data.success) {
      markDocumentsAsSynced(documents.map((d) => d.id));
      return { success: true, message: data.message || `${documents.length} dokumen tersimpan di cloud` };
    }
    return { success: false, message: data.error || data.message || 'Gagal menyimpan dokumen' };
  } catch (err: any) {
    return { success: false, message: `Gagal mengirim dokumen ke cloud: ${err.message || String(err)}` };
  }
}

export async function purgeOrphanDocumentsOnHosting(): Promise<{ success: boolean; message: string; deletedCount?: number }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API belum dikonfigurasi' };
  }
  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'clean_orphans');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({ key: config.syncKey.trim() }),
    });
    const data = await response.json();
    return {
      success: !!data.success,
      message: data.message || 'Pembersihan dokumen yatim selesai.',
      deletedCount: data.deleted_count ?? 0,
    };
  } catch (err: any) {
    return { success: false, message: `Gagal membersihkan dokumen yatim: ${err.message || String(err)}` };
  }
}

export async function executeTwoWaySync(): Promise<{
  success: boolean;
  message: string;
  pushedCount: number;
  pulledCount: number;
  totalStudents: number;
  pushedDocsCount?: number;
  pulledDocsCount?: number;
  totalDocs?: number;
}> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return {
      success: false,
      message: 'URL API MySQL Rumahweb belum dikonfigurasi.',
      pushedCount: 0,
      pulledCount: 0,
      totalStudents: getStudents().length,
      totalDocs: getDocuments().length,
    };
  }

  if (isSyncInProgress) {
    return {
      success: false,
      message: 'Sinkronisasi lain sedang berjalan, silakan tunggu sesaat.',
      pushedCount: 0,
      pulledCount: 0,
      totalStudents: getStudents().length,
      totalDocs: getDocuments().length,
    };
  }

  isSyncInProgress = true;
  saveSyncConfig({ lastSyncStatus: 'syncing', lastSyncMessage: 'Sedang melakukan sinkronisasi dua arah siswa dan dokumen...' });

  try {
    // 1. Pull data from server
    const pullUrl = new URL(config.apiUrl);
    pullUrl.searchParams.set('action', 'pull_all');
    const response = await fetch(pullUrl.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({ key: config.syncKey.trim() }),
    });

    if (!response.ok) {
      throw new Error(`Gagal terhubung ke cloud (HTTP ${response.status})`);
    }

    const pullResult = await response.json();
    if (!pullResult.success || !pullResult.data) {
      throw new Error(pullResult.error || pullResult.message || 'Gagal membaca data dari cloud');
    }

    // 2. Perform safe Bidirectional Smart Merge locally (never loses newly added students or docs!)
    const mergeResult = smartMergeRemoteData(pullResult.data);

    // 3. Delete any student & document records on cloud that were marked deleted locally
    if (mergeResult.deletedToSync && mergeResult.deletedToSync.length > 0) {
      for (const delId of mergeResult.deletedToSync) {
        deleteStudentFromHosting(delId).catch(() => {});
      }
    }
    if (mergeResult.deletedDocsToSync && mergeResult.deletedDocsToSync.length > 0) {
      for (const delDocId of mergeResult.deletedDocsToSync) {
        deleteDocumentFromHosting(delDocId).catch(() => {});
      }
    }

    // 4. Push local student additions/updates to cloud
    let pushedCount = 0;
    if (mergeResult.studentsToPush && mergeResult.studentsToPush.length > 0) {
      const pushRes = await pushStudentsToHosting(mergeResult.studentsToPush);
      if (pushRes.success) {
        pushedCount = mergeResult.studentsToPush.length;
        markStudentsAsSynced(mergeResult.studentsToPush.map((s) => s.id));
      }
    }

    // 5. Push local document additions/updates to cloud
    let pushedDocsCount = 0;
    if (mergeResult.docsToPush && mergeResult.docsToPush.length > 0) {
      const pushDocRes = await pushDocumentsToHosting(mergeResult.docsToPush);
      if (pushDocRes.success) {
        pushedDocsCount = mergeResult.docsToPush.length;
        markDocumentsAsSynced(mergeResult.docsToPush.map((d) => d.id));
      }
    }

    const now = new Date().toISOString();
    // Save latest document and student timestamps from remote data
    const remoteDocs = Array.isArray(pullResult.data.documents) ? pullResult.data.documents : [];
    const remoteStudents = Array.isArray(pullResult.data.students) ? pullResult.data.students : [];
    const latestDocUpdate = remoteDocs.reduce((max: string, d: any) => {
      const ts = d.uploadedAt || d.upload_date || '';
      return ts > max ? ts : max;
    }, '');
    const latestStudentUpdate = remoteStudents.reduce((max: string, s: any) => {
      const ts = s.updatedAt || s.createdAt || s.updated_at || '';
      return ts > max ? ts : max;
    }, '');

    saveLastKnownSyncTimestamp(latestStudentUpdate || now);
    saveLastKnownDocSyncTimestamp(latestDocUpdate || '');

    const finalDocsList = getDocuments();
    const msg = `Sinkronisasi Live sukses: ${mergeResult.mergedStudents.length} siswa (${pushedCount} dikirim, ${mergeResult.remoteStudentsAddedOrUpdated} ditarik), ${finalDocsList.length} dokumen (${pushedDocsCount} dikirim, ${mergeResult.remoteDocsAddedOrUpdated} ditarik)`;
    
    saveSyncConfig({
      lastSyncStatus: 'success',
      lastSyncTime: now,
      lastSyncMessage: msg,
      serverCounts: {
        students: mergeResult.mergedStudents.length,
        documents: finalDocsList.length,
        academicYears: getAcademicYears().length,
      },
    });

    return {
      success: true,
      message: msg,
      pushedCount,
      pulledCount: mergeResult.remoteStudentsAddedOrUpdated,
      totalStudents: mergeResult.mergedStudents.length,
      pushedDocsCount,
      pulledDocsCount: mergeResult.remoteDocsAddedOrUpdated,
      totalDocs: finalDocsList.length,
    };
  } catch (err: any) {
    const errMsg = `Gagal sinkronisasi: ${err.message || String(err)}`;
    saveSyncConfig({
      lastSyncStatus: 'error',
      lastSyncMessage: errMsg,
    });
    return {
      success: false,
      message: errMsg,
      pushedCount: 0,
      pulledCount: 0,
      totalStudents: getStudents().length,
      totalDocs: getDocuments().length,
    };
  } finally {
    isSyncInProgress = false;
  }
}

export async function pushAllDataToHosting(payload: {
  students: Student[];
  documents: StudentDocument[];
  academicYears: string[];
  logs?: AuditLog[];
  mirror?: boolean;
}): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API Rumahweb belum dikonfigurasi.' };
  }

  isSyncInProgress = true;
  saveSyncConfig({ lastSyncStatus: 'syncing', lastSyncMessage: 'Sedang mengunggah data ke Rumahweb...' });

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'push_all');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        students: payload.students,
        documents: payload.documents,
        academicYears: payload.academicYears,
        logs: payload.logs || [],
        deletedIds: getDeletedStudentIds(),
        mirror: payload.mirror === true, // Default to FALSE to prevent destructive deletion
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.success) {
      const now = new Date().toISOString();
      markStudentsAsSynced(payload.students.map((s) => s.id));
      saveLastKnownSyncTimestamp(now);
      saveSyncConfig({
        lastSyncStatus: 'success',
        lastSyncTime: now,
        lastSyncMessage: `Berhasil mengunggah ${payload.students.length} siswa ke MySQL Rumahweb`,
        serverCounts: {
          students: payload.students.length,
          documents: payload.documents.length,
          academicYears: payload.academicYears.length,
        },
      });
      return {
        success: true,
        message: `Berhasil mengunggah ${payload.students.length} siswa & ${payload.documents.length} dokumen ke MySQL Rumahweb!`,
      };
    } else {
      throw new Error(result.error || result.message || 'Gagal menyimpan ke server');
    }
  } catch (err: any) {
    const errMsg = `Gagal mengirim data ke Rumahweb: ${err.message || String(err)}`;
    saveSyncConfig({
      lastSyncStatus: 'error',
      lastSyncMessage: errMsg,
    });
    return { success: false, message: errMsg };
  } finally {
    isSyncInProgress = false;
  }
}

export async function pullAllDataFromHosting(): Promise<{
  success: boolean;
  message: string;
  data?: {
    students: Student[];
    documents: StudentDocument[];
    academicYears: string[];
    logs?: AuditLog[];
  };
}> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API Rumahweb belum dikonfigurasi.' };
  }

  isSyncInProgress = true;
  saveSyncConfig({ lastSyncStatus: 'syncing', lastSyncMessage: 'Sedang mengambil data dari Rumahweb...' });

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'pull_all');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({ key: config.syncKey.trim() }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.success && result.data) {
      const now = new Date().toISOString();
      const students: Student[] = result.data.students || [];
      const documents: StudentDocument[] = result.data.documents || [];
      const academicYears: string[] = result.data.academicYears || [];
      const logs: AuditLog[] = result.data.logs || [];

      saveLastKnownSyncTimestamp(now);
      saveSyncConfig({
        lastSyncStatus: 'success',
        lastSyncTime: now,
        lastSyncMessage: `Sinkronisasi berhasil: ${students.length} siswa dari MySQL Rumahweb`,
        serverCounts: {
          students: students.length,
          documents: documents.length,
          academicYears: academicYears.length,
        },
      });

      return {
        success: true,
        message: `Berhasil mengunduh ${students.length} siswa dari MySQL Rumahweb!`,
        data: {
          students,
          documents,
          academicYears,
          logs,
        },
      };
    } else {
      throw new Error(result.error || result.message || 'Gagal memuat data dari server');
    }
  } catch (err: any) {
    const errMsg = `Gagal mengunduh data dari Rumahweb: ${err.message || String(err)}`;
    saveSyncConfig({
      lastSyncStatus: 'error',
      lastSyncMessage: errMsg,
    });
    return { success: false, message: errMsg };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Generate full, production-ready, single-file PHP script to upload to Rumahweb cPanel
 */
export function generatePhpApiScript(params: {
  dbHost?: string;
  dbName: string;
  dbUser: string;
  dbPass: string;
  syncKey: string;
}): string {
  const host = params.dbHost || 'localhost';
  const name = params.dbName || 'u1234567_arsip';
  const user = params.dbUser || 'u1234567_user';
  const pass = params.dbPass || 'PasswordDBAnda123!';
  const key = params.syncKey || 'ArsipAttafaqquh2026';

  return `<?php
/**
 * =========================================================================
 * SCRIPT REST API SINKRONISASI DATABASE MYSQL RUMAHWEB
 * SISTEM ARSIP DIGITAL SISWA - SD, SMP, & SMK AL-TAFAFRQUH FIDDIN
 * =========================================================================
 * 
 * CARA PEMASANGAN DI CPANEL RUMAHWEB:
 * 1. Buka cPanel Rumahweb -> Menu "MySQL Databases":
 *    - Buat database baru (misal: arsip_sekolah)
 *    - Buat user database baru dan buat password yang kuat
 *    - Hubungkan User ke Database dengan mencentang "ALL PRIVILEGES"
 * 2. Buka cPanel -> "File Manager" -> Masuk ke folder "public_html":
 *    - Unggah berkas "api.php" ini ke dalam folder public_html (atau subfolder)
 * 3. Buka Aplikasi di Komputer, masukkan URL api.php ini di menu Cadangan & Keamanan
 * 4. Selesai! Semua PC otomatis tersinkronisasi secara real-time.
 */

// Konfigurasi Database MySQL Rumahweb
define('DB_HOST', '${host}');
define('DB_NAME', '${name}');
define('DB_USER', '${user}');
define('DB_PASS', '${pass}');
define('SYNC_KEY', '${key}');

// Header CORS agar dapat diakses dari browser aplikasi
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Sync-Key');
header('Content-Type: application/json; charset=utf-8');

// Tangani permintaan preflight OPTIONS dari browser
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Koneksi ke Database MySQL dengan PDO
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Koneksi ke MySQL Rumahweb Gagal: ' . $e->getMessage(),
        'tip' => 'Pastikan nama database, user, dan password pada file api.php sesuai dengan yang dibuat di cPanel.'
    ]);
    exit;
}

// Otomatis Buat Tabel jika belum ada
initDatabaseTables($pdo);

// Validasi Keamanan Kunci Sinkronisasi (Sync Key)
$inputJson = file_get_contents('php://input');
$body = json_decode($inputJson, true) ?: [];

$clientKey = '';
if (!empty($_SERVER['HTTP_X_SYNC_KEY'])) {
    $clientKey = $_SERVER['HTTP_X_SYNC_KEY'];
} elseif (!empty($body['key'])) {
    $clientKey = $body['key'];
} elseif (!empty($_GET['key'])) {
    $clientKey = $_GET['key'];
}

if ($clientKey !== SYNC_KEY) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Kunci Pengaman (Sync Key) tidak cocok atau tidak disertakan.'
    ]);
    exit;
}

// Tangani Aksi (Action)
$action = isset($_GET['action']) ? $_GET['action'] : (isset($body['action']) ? $body['action'] : 'test');

switch ($action) {
    case 'check_sync':
        handleCheckSync($pdo);
        break;

    case 'test':
        handleTest($pdo);
        break;

    case 'save_student':
        handleSaveStudent($pdo, $body);
        break;

    case 'push_students':
        handlePushStudents($pdo, $body);
        break;

    case 'save_document':
        handleSaveDocument($pdo, $body);
        break;

    case 'push_documents':
        handlePushDocuments($pdo, $body);
        break;

    case 'delete_document':
        handleDeleteDocument($pdo, $body);
        break;

    case 'clean_orphans':
        handleCleanOrphans($pdo);
        break;

    case 'push_all':
        handlePushAll($pdo, $body);
        break;

    case 'pull_all':
        handlePullAll($pdo);
        break;

    case 'delete_student':
        handleDeleteStudent($pdo, $body);
        break;

    default:
        echo json_encode([
            'success' => false,
            'error' => 'Aksi tidak dikenal: ' . htmlspecialchars($action)
        ]);
        break;
}

// =========================================================================
// FUNGSI LOGIKA DATABASE
// =========================================================================

function initDatabaseTables($pdo) {
    // Tabel Siswa
    $pdo->exec("CREATE TABLE IF NOT EXISTS \`arsip_students\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(255) NOT NULL,
        \`nis\` VARCHAR(50) DEFAULT NULL,
        \`nisn\` VARCHAR(50) DEFAULT NULL,
        \`nik\` VARCHAR(50) DEFAULT NULL,
        \`institution\` VARCHAR(20) DEFAULT 'SMP',
        \`academic_year\` VARCHAR(100) DEFAULT NULL,
        \`class_room\` VARCHAR(100) DEFAULT NULL,
        \`birth_place\` VARCHAR(100) DEFAULT NULL,
        \`birth_date\` VARCHAR(100) DEFAULT NULL,
        \`gender\` VARCHAR(10) DEFAULT 'L',
        \`address\` TEXT DEFAULT NULL,
        \`parent_name\` VARCHAR(255) DEFAULT NULL,
        \`parent_phone\` VARCHAR(50) DEFAULT NULL,
        \`status\` VARCHAR(50) DEFAULT 'Aktif',
        \`raw_json\` LONGTEXT DEFAULT NULL,
        \`created_at\` VARCHAR(50) DEFAULT NULL,
        \`updated_at\` VARCHAR(50) DEFAULT NULL,
        INDEX idx_institution (\`institution\`),
        INDEX idx_nis (\`nis\`),
        INDEX idx_nisn (\`nisn\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Tabel Dokumen Digital
    $pdo->exec("CREATE TABLE IF NOT EXISTS \`arsip_documents\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`student_id\` VARCHAR(100) NOT NULL,
        \`type\` VARCHAR(50) NOT NULL,
        \`file_name\` VARCHAR(255) DEFAULT NULL,
        \`file_size\` VARCHAR(50) DEFAULT NULL,
        \`upload_date\` VARCHAR(50) DEFAULT NULL,
        \`status\` VARCHAR(50) DEFAULT 'unverified',
        \`verified_by\` VARCHAR(100) DEFAULT NULL,
        \`verified_at\` VARCHAR(50) DEFAULT NULL,
        \`notes\` TEXT DEFAULT NULL,
        \`file_data\` LONGTEXT DEFAULT NULL,
        \`raw_json\` LONGTEXT DEFAULT NULL,
        INDEX idx_student (\`student_id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Pastikan kolom raw_json tersedia di tabel dokumen
    try {
        $pdo->exec("ALTER TABLE \`arsip_documents\` ADD COLUMN \`raw_json\` LONGTEXT DEFAULT NULL");
    } catch (Exception $e) {}

    // Otomatis bersihkan dokumen yatim (dokumen siswa lama/demo yang sudah dihapus)
    try {
        $pdo->exec("DELETE FROM \`arsip_documents\` WHERE \`student_id\` NOT IN (SELECT \`id\` FROM \`arsip_students\`)");
    } catch (Exception $e) {}

    // Tabel Pengaturan Tahun Pelajaran
    $pdo->exec("CREATE TABLE IF NOT EXISTS \`arsip_academic_years\` (
        \`id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`year_name\` VARCHAR(100) NOT NULL UNIQUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Tabel Log Audit
    $pdo->exec("CREATE TABLE IF NOT EXISTS \`arsip_audit_logs\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`timestamp\` VARCHAR(50) DEFAULT NULL,
        \`user_name\` VARCHAR(100) DEFAULT NULL,
        \`user_role\` VARCHAR(50) DEFAULT NULL,
        \`action\` VARCHAR(255) DEFAULT NULL,
        \`details\` TEXT DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
}

function handleTest($pdo) {
    // Bersihkan orphan docs
    try {
        $pdo->exec("DELETE FROM \`arsip_documents\` WHERE \`student_id\` NOT IN (SELECT \`id\` FROM \`arsip_students\`)");
    } catch (Exception $e) {}

    $stmt1 = $pdo->query("SELECT COUNT(*) AS total FROM \`arsip_students\`");
    $totalStudents = (int)$stmt1->fetchColumn();

    $stmt2 = $pdo->query("SELECT COUNT(*) AS total FROM \`arsip_documents\`");
    $totalDocs = (int)$stmt2->fetchColumn();

    $stmt3 = $pdo->query("SELECT COUNT(*) AS total FROM \`arsip_academic_years\`");
    $totalYears = (int)$stmt3->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => 'Terhubung dengan Database MySQL Rumahweb!',
        'server_time' => date('Y-m-d H:i:s'),
        'counts' => [
            'students' => $totalStudents,
            'documents' => $totalDocs,
            'academicYears' => $totalYears
        ]
    ]);
}

function handleCleanOrphans($pdo) {
    try {
        $countStmt = $pdo->query("SELECT COUNT(*) FROM \`arsip_documents\` WHERE \`student_id\` NOT IN (SELECT \`id\` FROM \`arsip_students\`)");
        $orphanCount = (int)$countStmt->fetchColumn();

        $delStmt = $pdo->exec("DELETE FROM \`arsip_documents\` WHERE \`student_id\` NOT IN (SELECT \`id\` FROM \`arsip_students\`)");

        echo json_encode([
            'success' => true,
            'message' => "Berhasil membersihkan {$orphanCount} dokumen yatim.",
            'deleted_count' => $orphanCount
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal membersihkan dokumen yatim: ' . $e->getMessage()]);
    }
}

function handleSaveDocument($pdo, $body) {
    $doc = isset($body['document']) && is_array($body['document']) ? $body['document'] : null;
    if (!$doc || empty($doc['id']) || empty($doc['studentId'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data dokumen tidak valid atau ID / Student ID kosong']);
        return;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO \`arsip_documents\` (
            \`id\`, \`student_id\`, \`type\`, \`file_name\`, \`file_size\`, \`upload_date\`,
            \`status\`, \`verified_by\`, \`verified_at\`, \`notes\`, \`file_data\`, \`raw_json\`
        ) VALUES (
            :id, :student_id, :type, :file_name, :file_size, :upload_date,
            :status, :verified_by, :verified_at, :notes, :file_data, :raw_json
        ) ON DUPLICATE KEY UPDATE
            \`type\` = VALUES(\`type\`),
            \`file_name\` = VALUES(\`file_name\`),
            \`file_size\` = VALUES(\`file_size\`),
            \`upload_date\` = VALUES(\`upload_date\`),
            \`status\` = VALUES(\`status\`),
            \`verified_by\` = VALUES(\`verified_by\`),
            \`verified_at\` = VALUES(\`verified_at\`),
            \`notes\` = VALUES(\`notes\`),
            \`file_data\` = VALUES(\`file_data\`),
            \`raw_json\` = VALUES(\`raw_json\`)");

        $stmt->execute([
            ':id' => $doc['id'],
            ':student_id' => $doc['studentId'],
            ':type' => $doc['docType'] ?? ($doc['type'] ?? 'lainnya'),
            ':file_name' => $doc['fileName'] ?? ($doc['title'] ?? 'Dokumen'),
            ':file_size' => (string)($doc['fileSize'] ?? '0'),
            ':upload_date' => $doc['uploadedAt'] ?? ($doc['uploadDate'] ?? date('c')),
            ':status' => $doc['verificationStatus'] ?? ($doc['status'] ?? 'unverified'),
            ':verified_by' => $doc['uploadedBy'] ?? ($doc['verifiedBy'] ?? null),
            ':verified_at' => $doc['verifiedAt'] ?? null,
            ':notes' => $doc['notes'] ?? '',
            ':file_data' => $doc['fileDataUrl'] ?? ($doc['fileData'] ?? null),
            ':raw_json' => json_encode($doc),
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Dokumen ' . ($doc['title'] ?? '') . ' berhasil disimpan di MySQL cloud.',
            'docId' => $doc['id']
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal menyimpan dokumen: ' . $e->getMessage()]);
    }
}

function handlePushDocuments($pdo, $body) {
    $docs = isset($body['documents']) && is_array($body['documents']) ? $body['documents'] : [];
    if (empty($docs)) {
        echo json_encode(['success' => true, 'message' => 'Tidak ada dokumen yang dikirim', 'count' => 0]);
        return;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO \`arsip_documents\` (
            \`id\`, \`student_id\`, \`type\`, \`file_name\`, \`file_size\`, \`upload_date\`,
            \`status\`, \`verified_by\`, \`verified_at\`, \`notes\`, \`file_data\`, \`raw_json\`
        ) VALUES (
            :id, :student_id, :type, :file_name, :file_size, :upload_date,
            :status, :verified_by, :verified_at, :notes, :file_data, :raw_json
        ) ON DUPLICATE KEY UPDATE
            \`type\` = VALUES(\`type\`),
            \`file_name\` = VALUES(\`file_name\`),
            \`file_size\` = VALUES(\`file_size\`),
            \`upload_date\` = VALUES(\`upload_date\`),
            \`status\` = VALUES(\`status\`),
            \`verified_by\` = VALUES(\`verified_by\`),
            \`verified_at\` = VALUES(\`verified_at\`),
            \`notes\` = VALUES(\`notes\`),
            \`file_data\` = VALUES(\`file_data\`),
            \`raw_json\` = VALUES(\`raw_json\`)");

        foreach ($docs as $doc) {
            if (empty($doc['id']) || empty($doc['studentId'])) continue;
            $stmt->execute([
                ':id' => $doc['id'],
                ':student_id' => $doc['studentId'],
                ':type' => $doc['docType'] ?? ($doc['type'] ?? 'lainnya'),
                ':file_name' => $doc['fileName'] ?? ($doc['title'] ?? 'Dokumen'),
                ':file_size' => (string)($doc['fileSize'] ?? '0'),
                ':upload_date' => $doc['uploadedAt'] ?? ($doc['uploadDate'] ?? date('c')),
                ':status' => $doc['verificationStatus'] ?? ($doc['status'] ?? 'unverified'),
                ':verified_by' => $doc['uploadedBy'] ?? ($doc['verifiedBy'] ?? null),
                ':verified_at' => $doc['verifiedAt'] ?? null,
                ':notes' => $doc['notes'] ?? '',
                ':file_data' => $doc['fileDataUrl'] ?? ($doc['fileData'] ?? null),
                ':raw_json' => json_encode($doc),
            ]);
        }

        $pdo->commit();
        echo json_encode([
            'success' => true,
            'message' => 'Berhasil menyimpan ' . count($docs) . ' dokumen ke cloud.',
            'count' => count($docs)
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal menyimpan dokumen batch: ' . $e->getMessage()]);
    }
}

function handleDeleteDocument($pdo, $body) {
    $docId = $body['docId'] ?? '';
    $studentId = $body['studentId'] ?? '';
    $docType = $body['docType'] ?? '';

    $where = [];
    $params = [];
    if (!empty($docId)) {
        $where[] = "\`id\` = :id";
        $params[':id'] = $docId;
    }
    if (!empty($studentId) && !empty($docType)) {
        $where[] = "(\`student_id\` = :student_id AND LOWER(\`type\`) = LOWER(:doc_type))";
        $params[':student_id'] = $studentId;
        $params[':doc_type'] = $docType;
    }

    if (!empty($where)) {
        $sql = "DELETE FROM \`arsip_documents\` WHERE " . implode(" OR ", $where);
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        echo json_encode([
            'success' => true,
            'message' => 'Dokumen berhasil dihapus dari cloud MySQL.'
        ]);
    } else {
        echo json_encode(['success' => false, 'error' => 'Parameter ID atau Siswa/Tipe tidak boleh kosong.']);
    }
}

function handleSaveStudent($pdo, $body) {
    $student = isset($body['student']) && is_array($body['student']) ? $body['student'] : null;
    if (!$student || empty($student['id'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data siswa tidak valid atau ID kosong']);
        return;
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO \`arsip_students\` (
            \`id\`, \`name\`, \`nis\`, \`nisn\`, \`nik\`, \`institution\`, \`academic_year\`, \`class_room\`,
            \`birth_place\`, \`birth_date\`, \`gender\`, \`address\`, \`parent_name\`, \`parent_phone\`,
            \`status\`, \`raw_json\`, \`created_at\`, \`updated_at\`
        ) VALUES (
            :id, :name, :nis, :nisn, :nik, :institution, :academic_year, :class_room,
            :birth_place, :birth_date, :gender, :address, :parent_name, :parent_phone,
            :status, :raw_json, :created_at, :updated_at
        ) ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`),
            \`nis\` = VALUES(\`nis\`),
            \`nisn\` = VALUES(\`nisn\`),
            \`nik\` = VALUES(\`nik\`),
            \`institution\` = VALUES(\`institution\`),
            \`academic_year\` = VALUES(\`academic_year\`),
            \`class_room\` = VALUES(\`class_room\`),
            \`birth_place\` = VALUES(\`birth_place\`),
            \`birth_date\` = VALUES(\`birth_date\`),
            \`gender\` = VALUES(\`gender\`),
            \`address\` = VALUES(\`address\`),
            \`parent_name\` = VALUES(\`parent_name\`),
            \`parent_phone\` = VALUES(\`parent_phone\`),
            \`status\` = VALUES(\`status\`),
            \`raw_json\` = VALUES(\`raw_json\`),
            \`updated_at\` = VALUES(\`updated_at\`)");

        $stmt->execute([
            ':id' => $student['id'],
            ':name' => $student['name'] ?? '',
            ':nis' => $student['nis'] ?? '',
            ':nisn' => $student['nisn'] ?? '',
            ':nik' => $student['nik'] ?? '',
            ':institution' => $student['institution'] ?? 'SMP',
            ':academic_year' => $student['academicYear'] ?? '',
            ':class_room' => $student['classRoom'] ?? '',
            ':birth_place' => $student['birthPlace'] ?? '',
            ':birth_date' => $student['birthDate'] ?? '',
            ':gender' => $student['gender'] ?? 'L',
            ':address' => $student['address'] ?? '',
            ':parent_name' => $student['parentName'] ?? '',
            ':parent_phone' => $student['parentPhone'] ?? '',
            ':status' => $student['status'] ?? 'Aktif',
            ':raw_json' => json_encode($student),
            ':created_at' => $student['createdAt'] ?? date('c'),
            ':updated_at' => $student['updatedAt'] ?? date('c'),
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Siswa ' . ($student['name'] ?? '') . ' berhasil disimpan di MySQL cloud.',
            'studentId' => $student['id']
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal menyimpan siswa: ' . $e->getMessage()]);
    }
}

function handlePushStudents($pdo, $body) {
    $students = isset($body['students']) && is_array($body['students']) ? $body['students'] : [];
    if (empty($students)) {
        echo json_encode(['success' => true, 'message' => 'Tidak ada siswa yang dikirim']);
        return;
    }

    $pdo->beginTransaction();
    try {
        $stmt = $pdo->prepare("INSERT INTO \`arsip_students\` (
            \`id\`, \`name\`, \`nis\`, \`nisn\`, \`nik\`, \`institution\`, \`academic_year\`, \`class_room\`,
            \`birth_place\`, \`birth_date\`, \`gender\`, \`address\`, \`parent_name\`, \`parent_phone\`,
            \`status\`, \`raw_json\`, \`created_at\`, \`updated_at\`
        ) VALUES (
            :id, :name, :nis, :nisn, :nik, :institution, :academic_year, :class_room,
            :birth_place, :birth_date, :gender, :address, :parent_name, :parent_phone,
            :status, :raw_json, :created_at, :updated_at
        ) ON DUPLICATE KEY UPDATE
            \`name\` = VALUES(\`name\`),
            \`nis\` = VALUES(\`nis\`),
            \`nisn\` = VALUES(\`nisn\`),
            \`nik\` = VALUES(\`nik\`),
            \`institution\` = VALUES(\`institution\`),
            \`academic_year\` = VALUES(\`academic_year\`),
            \`class_room\` = VALUES(\`class_room\`),
            \`birth_place\` = VALUES(\`birth_place\`),
            \`birth_date\` = VALUES(\`birth_date\`),
            \`gender\` = VALUES(\`gender\`),
            \`address\` = VALUES(\`address\`),
            \`parent_name\` = VALUES(\`parent_name\`),
            \`parent_phone\` = VALUES(\`parent_phone\`),
            \`status\` = VALUES(\`status\`),
            \`raw_json\` = VALUES(\`raw_json\`),
            \`updated_at\` = VALUES(\`updated_at\`)");

        foreach ($students as $s) {
            $stmt->execute([
                ':id' => $s['id'],
                ':name' => $s['name'] ?? '',
                ':nis' => $s['nis'] ?? '',
                ':nisn' => $s['nisn'] ?? '',
                ':nik' => $s['nik'] ?? '',
                ':institution' => $s['institution'] ?? 'SMP',
                ':academic_year' => $s['academicYear'] ?? '',
                ':class_room' => $s['classRoom'] ?? '',
                ':birth_place' => $s['birthPlace'] ?? '',
                ':birth_date' => $s['birthDate'] ?? '',
                ':gender' => $s['gender'] ?? 'L',
                ':address' => $s['address'] ?? '',
                ':parent_name' => $s['parentName'] ?? '',
                ':parent_phone' => $s['parentPhone'] ?? '',
                ':status' => $s['status'] ?? 'Aktif',
                ':raw_json' => json_encode($s),
                ':created_at' => $s['createdAt'] ?? date('c'),
                ':updated_at' => $s['updatedAt'] ?? date('c'),
            ]);
        }

        $pdo->commit();
        echo json_encode([
            'success' => true,
            'message' => 'Berhasil menyimpan ' . count($students) . ' data siswa ke cloud.',
            'count' => count($students)
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal menyimpan siswa: ' . $e->getMessage()]);
    }
}

function handlePushAll($pdo, $body) {
    $students = isset($body['students']) && is_array($body['students']) ? $body['students'] : [];
    $documents = isset($body['documents']) && is_array($body['documents']) ? $body['documents'] : [];
    $academicYears = isset($body['academicYears']) && is_array($body['academicYears']) ? $body['academicYears'] : [];
    $logs = isset($body['logs']) && is_array($body['logs']) ? $body['logs'] : [];
    $deletedIds = isset($body['deletedIds']) && is_array($body['deletedIds']) ? $body['deletedIds'] : [];
    $deletedDocIds = isset($body['deletedDocIds']) && is_array($body['deletedDocIds']) ? $body['deletedDocIds'] : [];
    $mirror = isset($body['mirror']) ? (bool)$body['mirror'] : false;

    $pdo->beginTransaction();

    try {
        // Hapus HANYA id siswa yang secara eksplisit dihapus (tombstone)
        if (!empty($deletedIds)) {
            $validDel = array_filter($deletedIds, function($id) { return !empty($id) && is_string($id); });
            if (!empty($validDel)) {
                $delPlaceholders = implode(',', array_fill(0, count($validDel), '?'));
                $delStmt = $pdo->prepare("DELETE FROM \`arsip_students\` WHERE \`id\` IN ($delPlaceholders)");
                $delStmt->execute(array_values($validDel));

                $delDocStmt = $pdo->prepare("DELETE FROM \`arsip_documents\` WHERE \`student_id\` IN ($delPlaceholders)");
                $delDocStmt->execute(array_values($validDel));
            }
        }

        // Hapus HANYA id dokumen yang secara eksplisit dihapus
        if (!empty($deletedDocIds)) {
            $validDelDocs = array_filter($deletedDocIds, function($id) { return !empty($id) && is_string($id); });
            if (!empty($validDelDocs)) {
                $delDocPlaceholders = implode(',', array_fill(0, count($validDelDocs), '?'));
                $delSpecificDocStmt = $pdo->prepare("DELETE FROM \`arsip_documents\` WHERE \`id\` IN ($delDocPlaceholders)");
                $delSpecificDocStmt->execute(array_values($validDelDocs));
            }
        }

        // Bersihkan otomatis dokumen yatim
        try {
            $pdo->exec("DELETE FROM \`arsip_documents\` WHERE \`student_id\` NOT IN (SELECT \`id\` FROM \`arsip_students\`)");
        } catch (Exception $e) {}

        // Upsert Siswa
        if (!empty($students)) {
            $stmtStudent = $pdo->prepare("INSERT INTO \`arsip_students\` (
                \`id\`, \`name\`, \`nis\`, \`nisn\`, \`nik\`, \`institution\`, \`academic_year\`, \`class_room\`,
                \`birth_place\`, \`birth_date\`, \`gender\`, \`address\`, \`parent_name\`, \`parent_phone\`,
                \`status\`, \`raw_json\`, \`created_at\`, \`updated_at\`
            ) VALUES (
                :id, :name, :nis, :nisn, :nik, :institution, :academic_year, :class_room,
                :birth_place, :birth_date, :gender, :address, :parent_name, :parent_phone,
                :status, :raw_json, :created_at, :updated_at
            ) ON DUPLICATE KEY UPDATE
                \`name\` = VALUES(\`name\`),
                \`nis\` = VALUES(\`nis\`),
                \`nisn\` = VALUES(\`nisn\`),
                \`nik\` = VALUES(\`nik\`),
                \`institution\` = VALUES(\`institution\`),
                \`academic_year\` = VALUES(\`academic_year\`),
                \`class_room\` = VALUES(\`class_room\`),
                \`birth_place\` = VALUES(\`birth_place\`),
                \`birth_date\` = VALUES(\`birth_date\`),
                \`gender\` = VALUES(\`gender\`),
                \`address\` = VALUES(\`address\`),
                \`parent_name\` = VALUES(\`parent_name\`),
                \`parent_phone\` = VALUES(\`parent_phone\`),
                \`status\` = VALUES(\`status\`),
                \`raw_json\` = VALUES(\`raw_json\`),
                \`updated_at\` = VALUES(\`updated_at\`)");

            foreach ($students as $s) {
                $stmtStudent->execute([
                    ':id' => $s['id'],
                    ':name' => $s['name'] ?? '',
                    ':nis' => $s['nis'] ?? '',
                    ':nisn' => $s['nisn'] ?? '',
                    ':nik' => $s['nik'] ?? '',
                    ':institution' => $s['institution'] ?? 'SMP',
                    ':academic_year' => $s['academicYear'] ?? '',
                    ':class_room' => $s['classRoom'] ?? '',
                    ':birth_place' => $s['birthPlace'] ?? '',
                    ':birth_date' => $s['birthDate'] ?? '',
                    ':gender' => $s['gender'] ?? 'L',
                    ':address' => $s['address'] ?? '',
                    ':parent_name' => $s['parentName'] ?? '',
                    ':parent_phone' => $s['parentPhone'] ?? '',
                    ':status' => $s['status'] ?? 'Aktif',
                    ':raw_json' => json_encode($s),
                    ':created_at' => $s['createdAt'] ?? date('c'),
                    ':updated_at' => $s['updatedAt'] ?? date('c'),
                ]);
            }
        }

        // Upsert Dokumen
        if (!empty($documents)) {
            $stmtDoc = $pdo->prepare("INSERT INTO \`arsip_documents\` (
                \`id\`, \`student_id\`, \`type\`, \`file_name\`, \`file_size\`, \`upload_date\`,
                \`status\`, \`verified_by\`, \`verified_at\`, \`notes\`, \`file_data\`, \`raw_json\`
            ) VALUES (
                :id, :student_id, :type, :file_name, :file_size, :upload_date,
                :status, :verified_by, :verified_at, :notes, :file_data, :raw_json
            ) ON DUPLICATE KEY UPDATE
                \`type\` = VALUES(\`type\`),
                \`file_name\` = VALUES(\`file_name\`),
                \`file_size\` = VALUES(\`file_size\`),
                \`upload_date\` = VALUES(\`upload_date\`),
                \`status\` = VALUES(\`status\`),
                \`verified_by\` = VALUES(\`verified_by\`),
                \`verified_at\` = VALUES(\`verified_at\`),
                \`notes\` = VALUES(\`notes\`),
                \`file_data\` = VALUES(\`file_data\`),
                \`raw_json\` = VALUES(\`raw_json\`)");

            foreach ($documents as $d) {
                if (empty($d['id']) || empty($d['studentId'])) continue;
                $stmtDoc->execute([
                    ':id' => $d['id'],
                    ':student_id' => $d['studentId'],
                    ':type' => $d['docType'] ?? ($d['type'] ?? 'lainnya'),
                    ':file_name' => $d['fileName'] ?? ($d['title'] ?? 'Dokumen'),
                    ':file_size' => (string)($d['fileSize'] ?? '0'),
                    ':upload_date' => $d['uploadedAt'] ?? ($d['uploadDate'] ?? date('c')),
                    ':status' => $d['verificationStatus'] ?? ($d['status'] ?? 'unverified'),
                    ':verified_by' => $d['uploadedBy'] ?? ($d['verifiedBy'] ?? null),
                    ':verified_at' => $d['verifiedAt'] ?? null,
                    ':notes' => $d['notes'] ?? '',
                    ':file_data' => $d['fileDataUrl'] ?? ($d['fileData'] ?? null),
                    ':raw_json' => json_encode($d),
                ]);
            }
        }

        // Simpan Tahun Pelajaran
        if (!empty($academicYears)) {
            $stmtYear = $pdo->prepare("INSERT IGNORE INTO \`arsip_academic_years\` (\`year_name\`) VALUES (:name)");
            foreach ($academicYears as $y) {
                if (!empty($y)) {
                    $stmtYear->execute([':name' => $y]);
                }
            }
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Berhasil menyimpan ' . count($students) . ' siswa dan ' . count($documents) . ' dokumen ke MySQL Rumahweb.',
            'saved' => [
                'students' => count($students),
                'documents' => count($documents),
            ]
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Gagal menyimpan ke database MySQL: ' . $e->getMessage()
        ]);
    }
}

function handlePullAll($pdo) {
    // Bersihkan orphan docs terlebih dahulu
    try {
        $pdo->exec("DELETE FROM \`arsip_documents\` WHERE \`student_id\` NOT IN (SELECT \`id\` FROM \`arsip_students\`)");
    } catch (Exception $e) {}

    // Ambil semua data siswa
    $stmt1 = $pdo->query("SELECT * FROM \`arsip_students\` ORDER BY \`institution\` ASC, \`name\` ASC");
    $rawStudents = $stmt1->fetchAll();

    $students = [];
    foreach ($rawStudents as $r) {
        if (!empty($r['raw_json'])) {
            $decoded = json_decode($r['raw_json'], true);
            if (is_array($decoded)) {
                $students[] = $decoded;
                continue;
            }
        }
        $students[] = [
            'id' => $r['id'],
            'name' => $r['name'],
            'nis' => $r['nis'] ?? '',
            'nisn' => $r['nisn'] ?? '',
            'nik' => $r['nik'] ?? '',
            'institution' => $r['institution'] ?? 'SMP',
            'academicYear' => $r['academic_year'] ?? '',
            'classRoom' => $r['class_room'] ?? '',
            'birthPlace' => $r['birth_place'] ?? '',
            'birthDate' => $r['birth_date'] ?? '',
            'gender' => $r['gender'] ?? 'L',
            'address' => $r['address'] ?? '',
            'parentName' => $r['parent_name'] ?? '',
            'parentPhone' => $r['parent_phone'] ?? '',
            'status' => $r['status'] ?? 'Aktif',
            'createdAt' => $r['created_at'] ?? '',
            'updatedAt' => $r['updated_at'] ?? '',
        ];
    }

    // Ambil dokumen
    $stmt2 = $pdo->query("SELECT * FROM \`arsip_documents\`");
    $rawDocs = $stmt2->fetchAll();
    $documents = [];
    foreach ($rawDocs as $d) {
        if (!empty($d['raw_json'])) {
            $decoded = json_decode($d['raw_json'], true);
            if (is_array($decoded)) {
                $documents[] = $decoded;
                continue;
            }
        }
        $vStatus = 'pending';
        if (in_array($d['status'], ['verified', 'pending', 'revision', 'unverified'])) {
            $vStatus = $d['status'];
        } elseif ($d['status'] === 'Terverifikasi') {
            $vStatus = 'verified';
        } elseif ($d['status'] === 'Perlu Revisi') {
            $vStatus = 'revision';
        }

        $documents[] = [
            'id' => $d['id'],
            'studentId' => $d['student_id'],
            'docType' => strtolower($d['type']),
            'title' => $d['file_name'] ?? 'Dokumen Siswa',
            'fileName' => $d['file_name'] ?? 'dokumen.pdf',
            'fileType' => 'application/pdf',
            'fileSize' => (int)($d['file_size'] ?? 0),
            'fileDataUrl' => $d['file_data'] ?? '',
            'uploadedAt' => $d['upload_date'] ?? date('c'),
            'uploadedBy' => $d['verified_by'] ?? 'Petugas TU',
            'verificationStatus' => $vStatus,
            'notes' => $d['notes'] ?? '',
            'version' => 1,
        ];
    }

    // Ambil tahun pelajaran
    $stmt3 = $pdo->query("SELECT \`year_name\` FROM \`arsip_academic_years\` ORDER BY \`id\` ASC");
    $years = $stmt3->fetchAll(PDO::FETCH_COLUMN);

    echo json_encode([
        'success' => true,
        'data' => [
            'students' => $students,
            'documents' => $documents,
            'academicYears' => !empty($years) ? $years : [],
        ]
    ]);
}

function handleCheckSync($pdo) {
    try {
        $pdo->exec("DELETE FROM \`arsip_documents\` WHERE \`student_id\` NOT IN (SELECT \`id\` FROM \`arsip_students\`)");
    } catch (Exception $e) {}

    $stmt1 = $pdo->query("SELECT COUNT(*) AS total, MAX(\`updated_at\`) AS last_updated FROM \`arsip_students\`");
    $sInfo = $stmt1->fetch();

    $stmt2 = $pdo->query("SELECT COUNT(*) AS total, MAX(\`upload_date\`) AS last_doc FROM \`arsip_documents\`");
    $dInfo = $stmt2->fetch();

    $stmt3 = $pdo->query("SELECT COUNT(*) AS total FROM \`arsip_academic_years\`");
    $totalYears = (int)$stmt3->fetchColumn();

    echo json_encode([
        'success' => true,
        'counts' => [
            'students' => (int)($sInfo['total'] ?? 0),
            'documents' => (int)($dInfo['total'] ?? 0),
            'academicYears' => $totalYears
        ],
        'lastStudentUpdate' => $sInfo['last_updated'] ?? '',
        'lastDocUpdate' => $dInfo['last_doc'] ?? '',
        'server_time' => date('Y-m-d H:i:s'),
    ]);
}

function handleDeleteStudent($pdo, $body) {
    $studentId = $body['studentId'] ?? '';
    if (!empty($studentId)) {
        $stmt = $pdo->prepare("DELETE FROM \`arsip_students\` WHERE \`id\` = :id");
        $stmt->execute([':id' => $studentId]);

        $stmtDoc = $pdo->prepare("DELETE FROM \`arsip_documents\` WHERE \`student_id\` = :id");
        $stmtDoc->execute([':id' => $studentId]);

        echo json_encode([
            'success' => true,
            'message' => 'Siswa dan dokumen berhasil dihapus dari cloud MySQL.'
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'ID Siswa tidak valid.'
        ]);
    }
}
?>`;
}
