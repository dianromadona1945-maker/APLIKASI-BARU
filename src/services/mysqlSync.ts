import { Student, StudentDocument, AuditLog, User, UserRole } from '../types';
import {
  smartMergeRemoteData,
  getStudents,
  getDocuments,
  getAcademicYears,
  getUsers,
  getCurrentUser,
  getDeletedStudentIds,
  getDeletedDocIds,
  getDeletedUserIds,
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

const LAST_KNOWN_USER_UPDATE_KEY = 'arsip_last_user_sync_ts';

export function getLastKnownUserSyncTimestamp(): string {
  try {
    return localStorage.getItem(LAST_KNOWN_USER_UPDATE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveLastKnownUserSyncTimestamp(ts: string): void {
  try {
    localStorage.setItem(LAST_KNOWN_USER_UPDATE_KEY, ts);
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
  counts?: { students: number; documents: number; academicYears: number; users?: number };
  lastStudentUpdate?: string;
  lastDocUpdate?: string;
  lastUserUpdate?: string;
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
    // Primary: use action=check_sync with anti-cache timestamp
    url.searchParams.set('action', 'check_sync');
    url.searchParams.set('_t', Date.now().toString());

    let response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({ key: config.syncKey.trim() }),
    });

    let data: any = null;
    if (response.ok) {
      try {
        data = await response.json();
      } catch {}
    }

    // Fallback: if check_sync failed, returned HTTP error, or returned success:false, fallback to action=test!
    if (!response.ok || !data || !data.success) {
      url.searchParams.set('action', 'test');
      url.searchParams.set('_t', Date.now().toString());
      response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': config.syncKey.trim(),
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({ key: config.syncKey.trim() }),
      });
      if (response.ok) {
        try {
          data = await response.json();
        } catch {}
      }
    }

    if (!response.ok || !data) {
      return { success: false, error: `HTTP ${response.status}` };
    }
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
        lastUserUpdate: data.lastUserUpdate || '',
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

    let data: any = null;
    if (response.ok) {
      try {
        data = await response.json();
      } catch {}
    }

    if (!response.ok || !data || !data.success) {
      // Fallback: If server has older api.php without 'save_student', fallback to pushStudentsToHosting
      return await pushStudentsToHosting([student]);
    }

    markStudentsAsSynced([student.id]);
    return { success: true, message: data.message || `Siswa ${student.name} berhasil disimpan di cloud` };
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

    let data: any = null;
    if (response.ok) {
      try {
        data = await response.json();
      } catch {}
    }

    if (!response.ok || !data || !data.success) {
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

    markStudentsAsSynced(students.map((s) => s.id));
    return { success: true, message: data.message || `${students.length} siswa tersimpan di cloud` };
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

export async function saveDocumentToHosting(
  doc: StudentDocument,
  currentUser?: User
): Promise<{ success: boolean; message: string; fileUrl?: string; docId?: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API belum dikonfigurasi' };
  }

  const user = currentUser || getCurrentUser();

  try {
    const cleanUrl = config.apiUrl.trim();
    const url = new URL(cleanUrl);
    url.searchParams.set('action', 'save_document');
    url.searchParams.set('_t', Date.now().toString());

    let response: Response;

    // Convert base64 data URL to Blob for binary multipart transfer
    let blob: Blob | null = null;
    if (doc.fileDataUrl && doc.fileDataUrl.startsWith('data:')) {
      try {
        const parts = doc.fileDataUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : (doc.fileType || 'application/octet-stream');
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } catch (blobErr) {
        console.warn('[UPLOAD] Blob conversion failed, falling back to JSON:', blobErr);
      }
    }

    if (blob) {
      const formData = new FormData();
      formData.append('key', config.syncKey.trim());
      formData.append('action', 'save_document');
      formData.append('id', doc.id);
      formData.append('studentId', doc.studentId);
      formData.append('docType', doc.docType);
      formData.append('title', doc.title);
      formData.append('fileName', doc.fileName);
      formData.append('fileSize', String(doc.fileSize));
      formData.append('fileType', doc.fileType);
      formData.append('uploadedBy', doc.uploadedBy || `${user.name} (${user.role})`);
      formData.append('verificationStatus', doc.verificationStatus || 'verified');
      formData.append('notes', doc.notes || '');
      formData.append('userId', user.id);
      formData.append('userRole', user.role);
      formData.append('userName', user.name);
      formData.append('file', blob, doc.fileName);

      response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'X-Sync-Key': config.syncKey.trim(),
        },
        body: formData,
      });
    } else {
      // JSON payload
      response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': config.syncKey.trim(),
        },
        body: JSON.stringify({
          key: config.syncKey.trim(),
          action: 'save_document',
          document: {
            ...doc,
            uploadedBy: doc.uploadedBy || `${user.name} (${user.role})`,
          },
          userId: user.id,
          userRole: user.role,
          userName: user.name,
        }),
      });
    }

    let data: any = null;
    if (response.ok) {
      try {
        data = await response.json();
      } catch {}
    }

    if (!response.ok || !data || !data.success) {
      // Fallback via batch push
      const pushRes = await pushDocumentsToHosting([doc]);
      if (pushRes.success) {
        markDocumentsAsSynced([doc.id]);
        return pushRes;
      }
      return { success: false, message: data?.error || data?.message || `Server error (HTTP ${response.status})` };
    }

    markDocumentsAsSynced([doc.id]);
    return {
      success: true,
      message: data.message || `Dokumen ${doc.title} berhasil tersimpan di server cloud.`,
      fileUrl: data.fileUrl,
      docId: data.docId || doc.id,
    };
  } catch (err: any) {
    try {
      const fallbackRes = await pushDocumentsToHosting([doc]);
      if (fallbackRes.success) {
        markDocumentsAsSynced([doc.id]);
        return fallbackRes;
      }
      return { success: false, message: fallbackRes.message || String(err) };
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

    let data: any = null;
    if (response.ok) {
      try {
        data = await response.json();
      } catch {}
    }

    if (!response.ok || !data || !data.success) {
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

    markDocumentsAsSynced(documents.map((d) => d.id));
    return { success: true, message: data.message || `${documents.length} dokumen tersimpan di cloud` };
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

    // 3. Push local student additions/updates to cloud
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

    // Note: User accounts are managed directly and strictly via single source of truth (save_user and delete_user).
    // NEVER push local users here, which would resurrect deleted accounts from other computers!

    const now = new Date().toISOString();
    // Save latest document, student, and user timestamps from remote data
    const remoteDocs = Array.isArray(pullResult.data.documents) ? pullResult.data.documents : [];
    const remoteStudents = Array.isArray(pullResult.data.students) ? pullResult.data.students : [];
    const remoteUsers = Array.isArray(pullResult.data.users) ? pullResult.data.users : [];
    const latestDocUpdate = remoteDocs.reduce((max: string, d: any) => {
      const ts = d.uploadedAt || d.upload_date || '';
      return ts > max ? ts : max;
    }, '');
    const latestStudentUpdate = remoteStudents.reduce((max: string, s: any) => {
      const ts = s.updatedAt || s.createdAt || s.updated_at || '';
      return ts > max ? ts : max;
    }, '');
    const latestUserUpdate = remoteUsers.reduce((max: string, u: any) => {
      const ts = u.updatedAt || u.updated_at || '';
      return ts > max ? ts : max;
    }, '');

    saveLastKnownSyncTimestamp(latestStudentUpdate || now);
    saveLastKnownDocSyncTimestamp(latestDocUpdate || '');
    if (latestUserUpdate) saveLastKnownUserSyncTimestamp(latestUserUpdate);

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

export async function saveUserToHosting(user: User): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API Rumahweb belum dikonfigurasi.' };
  }

  const currentAdmin = getCurrentUser();
  console.log('[CREATE/UPDATE USER] Request ke database MySQL:', {
    action: 'save_user',
    userId: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    adminId: currentAdmin?.id || 'admin',
    adminUsername: currentAdmin?.username || 'admin',
    timestamp: new Date().toISOString(),
    status: 'PENDING',
  });

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'save_user');
    url.searchParams.set('_t', Date.now().toString());
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        user,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    console.log('[CREATE/UPDATE USER] Response dari database MySQL:', {
      userId: user.id,
      username: user.username,
      status: data.success ? 'SUCCESS' : 'FAILED',
      timestamp: new Date().toISOString(),
      adminId: currentAdmin?.id || 'admin',
      response: data,
    });

    return {
      success: !!data.success,
      message: data.message || `Akun petugas ${user.name} berhasil disimpan di cloud.`,
    };
  } catch (err: any) {
    console.error('[CREATE/UPDATE USER] Error koneksi:', {
      userId: user.id,
      username: user.username,
      status: 'FAILED',
      error: err.message || String(err),
      adminId: currentAdmin?.id || 'admin',
      timestamp: new Date().toISOString(),
    });
    return { success: false, message: `Gagal menyimpan user ke cloud: ${err.message || String(err)}` };
  }
}

export async function deleteUserFromHosting(userId: string, username?: string): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, message: 'URL API Rumahweb belum dikonfigurasi.' };
  }

  const currentAdmin = getCurrentUser();
  const cleanU = username ? username.replace(/^@/, '') : '';

  console.log('[DELETE USER] Request ke database MySQL:', {
    action: 'delete_user',
    userId,
    username: cleanU,
    adminId: currentAdmin?.id || 'admin',
    adminUsername: currentAdmin?.username || 'admin',
    timestamp: new Date().toISOString(),
    status: 'PENDING',
  });

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'delete_user');
    url.searchParams.set('_t', Date.now().toString());
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        userId,
        username: cleanU,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    console.log('[DELETE USER] Response dari database MySQL:', {
      userId,
      username: cleanU,
      status: data.success ? 'SUCCESS' : 'FAILED',
      adminId: currentAdmin?.id || 'admin',
      timestamp: new Date().toISOString(),
      response: data,
    });

    return {
      success: !!data.success,
      message: data.message || `Akun petugas berhasil dihapus dari cloud.`,
    };
  } catch (err: any) {
    console.error('[DELETE USER] Error koneksi:', {
      userId,
      username: cleanU,
      status: 'FAILED',
      error: err.message || String(err),
      adminId: currentAdmin?.id || 'admin',
      timestamp: new Date().toISOString(),
    });
    return { success: false, message: `Gagal menghapus user dari cloud: ${err.message || String(err)}` };
  }
}

export async function loginWithHosting(
  usernameInput: string,
  passwordInput: string,
  requiredRole?: UserRole
): Promise<{ success: boolean; user?: User; error?: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: false, error: 'URL API MySQL belum dikonfigurasi.' };
  }

  const cleanUsername = usernameInput.trim().replace(/^@/, '');
  const cleanPassword = passwordInput.trim();

  // Periksa apakah akun sudah dihapus oleh admin
  const deletedList = getDeletedUserIds();
  if (
    deletedList.includes(cleanUsername.toLowerCase()) ||
    deletedList.includes('@' + cleanUsername.toLowerCase())
  ) {
    return {
      success: false,
      error: `Akun "@${cleanUsername}" telah dihapus oleh Administrator dan tidak lagi dapat digunakan untuk masuk.`,
    };
  }

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'login');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        username: cleanUsername,
        password: cleanPassword,
        role: requiredRole,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = `Server error (HTTP ${response.status})`;
      try {
        const j = JSON.parse(errText);
        if (j.error) parsedErr = j.error;
      } catch {}
      return { success: false, error: parsedErr };
    }

    const data = await response.json();
    if (data.success && data.user) {
      // Pastikan akun ini bukan akun yang telah dihapus
      const isDel =
        deletedList.includes((data.user.id || '').toLowerCase()) ||
        deletedList.includes((data.user.username || '').toLowerCase().replace(/^@/, ''));
      if (isDel) {
        return {
          success: false,
          error: `Akun "@${data.user.username}" telah dihapus oleh Administrator dan tidak lagi memiliki akses.`,
        };
      }

      // Pastikan role akun cocok dengan yang dipilih
      if (requiredRole && data.user.role !== requiredRole) {
        if (requiredRole === 'admin') {
          return {
            success: false,
            error: `Akun "@${data.user.username}" terdaftar sebagai Petugas Tata Usaha (TU), bukan Administrator. Silakan klik tab "Petugas Tata Usaha (TU)" di atas untuk masuk.`,
          };
        } else {
          return {
            success: false,
            error: `Akun "@${data.user.username}" terdaftar sebagai Administrator, bukan Petugas TU. Silakan klik tab "Administrator" di atas untuk masuk.`,
          };
        }
      }

      return { success: true, user: data.user };
    } else {
      return { success: false, error: data.error || 'Autentikasi akun di database cloud gagal.' };
    }
  } catch (err: any) {
    return { success: false, error: `Gagal verifikasi ke server: ${err.message || String(err)}` };
  }
}

export async function pullUsersFromHosting(): Promise<User[]> {
  const config = getSyncConfig();
  if (!config.apiUrl) return [];

  const currentAdmin = getCurrentUser();
  console.log('[GET USERS] Request: Mengambil daftar pengguna dari server database MySQL...', {
    action: 'pull_users',
    adminId: currentAdmin?.id || 'admin',
    adminUsername: currentAdmin?.username || 'admin',
    timestamp: new Date().toISOString(),
    status: 'PENDING',
  });

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'pull_users');
    url.searchParams.set('_t', Date.now().toString());

    // Send request using standard headers for best cross-origin server compatibility
    let response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({ key: config.syncKey.trim() }),
    });

    if (!response.ok) {
      console.warn('[GET USERS] Primary response not ok (status ' + response.status + '), trying fallback...');
      // Fallback: try via action=pull_all if custom action isn't handled by older api.php
      const fallbackUrl = new URL(config.apiUrl);
      fallbackUrl.searchParams.set('action', 'pull_all');
      response = await fetch(fallbackUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': config.syncKey.trim(),
        },
        body: JSON.stringify({ key: config.syncKey.trim() }),
      });
      if (response.ok) {
        const fallbackData = await response.json();
        if (fallbackData.success && fallbackData.data && Array.isArray(fallbackData.data.users)) {
          const deletedList = getDeletedUserIds();
          const validUsers = fallbackData.data.users.filter(
            (u: any) =>
              u &&
              !deletedList.includes((u.id || '').toLowerCase()) &&
              !deletedList.includes((u.username || '').toLowerCase().replace(/^@/, ''))
          );
          return validUsers;
        }
      }
      return [];
    }

    const data = await response.json();
    if (data.success && Array.isArray(data.users)) {
      const deletedList = getDeletedUserIds();
      const validUsers = data.users.filter(
        (u: any) =>
          u &&
          !deletedList.includes((u.id || '').toLowerCase()) &&
          !deletedList.includes((u.username || '').toLowerCase().replace(/^@/, ''))
      );

      console.log('[GET USERS] Response sukses dari server database MySQL:', {
        count: validUsers.length,
        users: validUsers.map((u: User) => ({ id: u.id, username: u.username, role: u.role })),
        adminId: currentAdmin?.id || 'admin',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
      });

      return validUsers;
    }
    return [];
  } catch (err: any) {
    // Attempt fallback to pull_all in case of network or parsing error
    try {
      const fallbackUrl = new URL(config.apiUrl);
      fallbackUrl.searchParams.set('action', 'pull_all');
      const fallbackRes = await fetch(fallbackUrl.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Sync-Key': config.syncKey.trim(),
        },
        body: JSON.stringify({ key: config.syncKey.trim() }),
      });
      if (fallbackRes.ok) {
        const fallbackData = await fallbackRes.json();
        if (fallbackData.success && fallbackData.data && Array.isArray(fallbackData.data.users)) {
          const deletedList = getDeletedUserIds();
          return fallbackData.data.users.filter(
            (u: any) =>
              u &&
              !deletedList.includes((u.id || '').toLowerCase()) &&
              !deletedList.includes((u.username || '').toLowerCase().replace(/^@/, ''))
          );
        }
      }
    } catch {}

    console.warn('[GET USERS] Gagal mengambil pengguna dari server hosting:', {
      error: err.message || String(err),
      adminId: currentAdmin?.id || 'admin',
      timestamp: new Date().toISOString(),
      status: 'OFFLINE_OR_PENDING_API_UPDATE',
    });
    return [];
  }
}

export async function pushUsersToHosting(users: User[]): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl || !users || users.length === 0) {
    return { success: true, message: 'Tidak ada akun untuk disinkronkan.' };
  }

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'push_users');
    url.searchParams.set('_t', Date.now().toString());
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        users,
      }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return {
      success: !!data.success,
      message: data.message || `${users.length} akun petugas berhasil disimpan di cloud.`,
    };
  } catch (err: any) {
    return { success: false, message: `Gagal mengirim akun ke server: ${err.message || String(err)}` };
  }
}

export async function pushAllDataToHosting(payload: {
  students: Student[];
  documents: StudentDocument[];
  academicYears: string[];
  logs?: AuditLog[];
  users?: User[];
  mirror?: boolean;
  clear_all?: boolean;
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
    url.searchParams.set('_t', Date.now().toString());

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        students: payload.students,
        documents: payload.documents,
        academicYears: payload.academicYears,
        logs: payload.logs || [],
        users: payload.users || undefined, // CRITICAL: NEVER send localStorage users blindly!
        deletedIds: payload.mirror === true ? getDeletedStudentIds() : [],
        deletedDocIds: payload.mirror === true ? getDeletedDocIds() : [],
        clear_all: payload.clear_all === true,
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

export async function purgeDemoDataFromHosting(): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: true, message: 'Data demo lokal telah dibersihkan.' };
  }

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'purge_demo');
    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({ key: config.syncKey.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        return { success: true, message: data.message || 'Data sampel awal berhasil dihapus dari cloud.' };
      }
    }
  } catch {}

  // Fallback: delete each demo student and orphan docs directly
  const demoIds = ['std-001', 'std-002', 'std-003', 'std-004', 'std-005', 'std-006'];
  for (const id of demoIds) {
    try {
      await deleteStudentFromHosting(id);
    } catch {}
  }
  try {
    await purgeOrphanDocumentsOnHosting();
  } catch {}

  return {
    success: true,
    message: 'Seluruh berkas & siswa sampel awal berhasil dihapus permanen dari MySQL cloud.',
  };
}

export async function wipeAllDataOnHosting(): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();
  if (!config.apiUrl) {
    return { success: true, message: 'Data lokal telah dikosongkan.' };
  }

  try {
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', 'clear_all');
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Key': config.syncKey.trim(),
      },
      body: JSON.stringify({
        key: config.syncKey.trim(),
        clear_all: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        return { success: true, message: 'Database cloud MySQL berhasil dikosongkan.' };
      }
    }
  } catch {}

  return await pushAllDataToHosting({
    students: [],
    documents: [],
    academicYears: getAcademicYears(),
    clear_all: true,
    mirror: true,
  });
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

// Pengaturan batas runtime PHP untuk unggah dokumen (PDF/Gambar hingga 64MB)
@ini_set('upload_max_filesize', '64M');
@ini_set('post_max_size', '64M');
@ini_set('memory_limit', '256M');
@ini_set('max_execution_time', '300');

// Header CORS agar dapat diakses dari browser aplikasi
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Sync-Key, Cache-Control, Pragma');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');

// Tangani permintaan preflight OPTIONS dari browser
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Inisialisasi folder fisik penyimpanan berkas dokumen (uploads/documents)
$uploadBaseDir = __DIR__ . '/uploads';
$uploadDocDir = $uploadBaseDir . '/documents';
if (!file_exists($uploadBaseDir)) {
    @mkdir($uploadBaseDir, 0755, true);
}
if (!file_exists($uploadDocDir)) {
    @mkdir($uploadDocDir, 0755, true);
}
if (is_dir($uploadDocDir) && !is_writable($uploadDocDir)) {
    @chmod($uploadDocDir, 0755);
    if (!is_writable($uploadDocDir)) {
        @chmod($uploadDocDir, 0777);
    }
}
$htaccessFile = $uploadBaseDir . '/.htaccess';
if (!file_exists($htaccessFile)) {
    @file_put_contents($htaccessFile, "Options -Indexes\n");
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
} elseif (!empty($_POST['key'])) {
    $clientKey = $_POST['key'];
} elseif (!empty($body['key'])) {
    $clientKey = $body['key'];
} elseif (!empty($_GET['key'])) {
    $clientKey = $_GET['key'];
}

// Tangani Aksi (Action)
$action = isset($_GET['action']) ? $_GET['action'] : (isset($_POST['action']) ? $_POST['action'] : (isset($body['action']) ? $body['action'] : 'test'));

// Login publik & streaming berkas tidak memblokir pengguna valid jika sync key kosong di browser baru
if ($action !== 'login' && $action !== 'serve_file' && $action !== 'get_file' && $clientKey !== SYNC_KEY) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => 'Kunci Pengaman (Sync Key) tidak cocok atau tidak disertakan.'
    ]);
    exit;
}

switch ($action) {
    case 'login':
        handleLogin($pdo, $body);
        break;

    case 'pull_users':
        handlePullUsers($pdo);
        break;

    case 'push_users':
        handlePushUsers($pdo, $body);
        break;
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

    case 'upload_document':
    case 'save_document':
        handleSaveDocument($pdo, $body);
        break;

    case 'serve_file':
    case 'get_file':
        handleServeFile($pdo);
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

    case 'purge_demo':
        handlePurgeDemo($pdo);
        break;

    case 'clear_all':
        handleClearAll($pdo);
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

    case 'save_user':
        handleSaveUser($pdo, $body);
        break;

    case 'delete_user':
        handleDeleteUser($pdo, $body);
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
        \`file_type\` VARCHAR(100) DEFAULT NULL,
        \`file_path\` TEXT DEFAULT NULL,
        \`file_url\` TEXT DEFAULT NULL,
        \`upload_date\` VARCHAR(50) DEFAULT NULL,
        \`status\` VARCHAR(50) DEFAULT 'verified',
        \`verified_by\` VARCHAR(100) DEFAULT NULL,
        \`verified_at\` VARCHAR(50) DEFAULT NULL,
        \`notes\` TEXT DEFAULT NULL,
        \`file_data\` LONGTEXT DEFAULT NULL,
        \`raw_json\` LONGTEXT DEFAULT NULL,
        INDEX idx_student (\`student_id\`),
        INDEX idx_type (\`type\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Pastikan kolom baru tersedia di tabel dokumen yang sudah ada
    try { $pdo->exec("ALTER TABLE \`arsip_documents\` ADD COLUMN \`file_path\` TEXT DEFAULT NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE \`arsip_documents\` ADD COLUMN \`file_url\` TEXT DEFAULT NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE \`arsip_documents\` ADD COLUMN \`file_type\` VARCHAR(100) DEFAULT NULL"); } catch (Exception $e) {}
    try { $pdo->exec("ALTER TABLE \`arsip_documents\` ADD COLUMN \`raw_json\` LONGTEXT DEFAULT NULL"); } catch (Exception $e) {}

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

    // Tabel Akun Petugas Sekolah
    $pdo->exec("CREATE TABLE IF NOT EXISTS \`arsip_users\` (
        \`id\` VARCHAR(100) NOT NULL PRIMARY KEY,
        \`username\` VARCHAR(100) NOT NULL UNIQUE,
        \`name\` VARCHAR(255) NOT NULL,
        \`role\` VARCHAR(50) NOT NULL,
        \`email\` VARCHAR(255) DEFAULT NULL,
        \`nip\` VARCHAR(50) DEFAULT NULL,
        \`password\` VARCHAR(255) NOT NULL,
        \`active\` TINYINT(1) DEFAULT 1,
        \`last_login\` VARCHAR(100) DEFAULT NULL,
        \`raw_json\` LONGTEXT DEFAULT NULL,
        \`updated_at\` VARCHAR(50) DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

    // Otomatis seed akun admin dan default bila tabel masih kosong
    try {
        $uCount = (int)$pdo->query("SELECT COUNT(*) FROM \`arsip_users\`")->fetchColumn();
        if ($uCount === 0) {
            $defaultUsers = [
                ['id' => 'usr-admin-01', 'username' => 'admin', 'name' => 'Dian Romadona, S.Pd.', 'role' => 'admin', 'email' => 'dian.romadona@sekolah.sch.id', 'nip' => '', 'password' => 'admin', 'active' => 1],
                ['id' => 'usr-tu-01', 'username' => 'petugas_tu', 'name' => 'Mamat Miftahurrahmat, S.Pd.', 'role' => 'petugas_tu', 'email' => 'mamat.miftahurrahmat@sekolah.sch.id', 'nip' => '', 'password' => 'tu123', 'active' => 1],
            ];
            $ins = $pdo->prepare("INSERT IGNORE INTO \`arsip_users\` (\`id\`, \`username\`, \`name\`, \`role\`, \`email\`, \`nip\`, \`password\`, \`active\`, \`last_login\`, \`raw_json\`, \`updated_at\`) VALUES (:id, :username, :name, :role, :email, :nip, :password, :active, 'Baru Dibuat', :raw_json, NOW())");
            foreach ($defaultUsers as $du) {
                $ins->execute([
                    ':id' => $du['id'],
                    ':username' => $du['username'],
                    ':name' => $du['name'],
                    ':role' => $du['role'],
                    ':email' => $du['email'],
                    ':nip' => $du['nip'],
                    ':password' => $du['password'],
                    ':active' => 1,
                    ':raw_json' => json_encode($du),
                ]);
            }
        }
    } catch (Exception $e) {}
}

function handleTest($pdo) {
    $stmt1 = $pdo->query("SELECT COUNT(*) AS total, MAX(\`updated_at\`) AS last_updated FROM \`arsip_students\`");
    $sInfo = $stmt1->fetch();

    $stmt2 = $pdo->query("SELECT COUNT(*) AS total, MAX(\`upload_date\`) AS last_doc FROM \`arsip_documents\`");
    $dInfo = $stmt2->fetch();

    $stmt3 = $pdo->query("SELECT COUNT(*) AS total FROM \`arsip_academic_years\`");
    $totalYears = (int)$stmt3->fetchColumn();

    echo json_encode([
        'success' => true,
        'message' => 'Terhubung dengan Database MySQL Rumahweb!',
        'server_time' => date('Y-m-d H:i:s'),
        'counts' => [
            'students' => (int)($sInfo['total'] ?? 0),
            'documents' => (int)($dInfo['total'] ?? 0),
            'academicYears' => $totalYears
        ],
        'lastStudentUpdate' => $sInfo['last_updated'] ?? '',
        'lastDocUpdate' => $dInfo['last_doc'] ?? '',
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

function handlePurgeDemo($pdo) {
    try {
        $demoIds = ['std-001', 'std-002', 'std-003', 'std-004', 'std-005', 'std-006'];
        $placeholders = implode(',', array_fill(0, count($demoIds), '?'));
        
        $delDocs = $pdo->prepare("DELETE FROM \`arsip_documents\` WHERE \`student_id\` IN ($placeholders) OR \`id\` LIKE 'doc-std-00%'");
        $delDocs->execute($demoIds);

        $delStudents = $pdo->prepare("DELETE FROM \`arsip_students\` WHERE \`id\` IN ($placeholders)");
        $delStudents->execute($demoIds);

        $pdo->exec("DELETE FROM \`arsip_documents\` WHERE \`student_id\` NOT IN (SELECT \`id\` FROM \`arsip_students\`)");

        echo json_encode([
            'success' => true,
            'message' => 'Seluruh profil dan dokumen sampel demonstrasi awal berhasil dihapus permanen dari MySQL cloud.'
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal menghapus data sampel: ' . $e->getMessage()]);
    }
}

function handleClearAll($pdo) {
    try {
        $pdo->exec("DELETE FROM \`arsip_documents\`");
        $pdo->exec("DELETE FROM \`arsip_students\`");
        echo json_encode([
            'success' => true,
            'message' => 'Seluruh data siswa dan dokumen di database MySQL cloud berhasil dikosongkan.'
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal mengosongkan data di cloud: ' . $e->getMessage()]);
    }
}

function handleSaveDocument($pdo, $body) {
    $uploadBaseDir = __DIR__ . '/uploads';
    $uploadDocDir = $uploadBaseDir . '/documents';

    // Pastikan folder fisik penyimpanan dokumen ada dan dapat ditulis
    if (!file_exists($uploadDocDir)) {
        @mkdir($uploadDocDir, 0755, true);
    }
    if (is_dir($uploadDocDir) && !is_writable($uploadDocDir)) {
        @chmod($uploadDocDir, 0755);
        if (!is_writable($uploadDocDir)) {
            @chmod($uploadDocDir, 0777);
        }
    }

    // Tentukan Base URL publik untuk tautan berkas
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443) || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    $protocol = $isHttps ? 'https://' : 'http://';
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : (isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost');
    $rawDir = dirname($_SERVER['SCRIPT_NAME']);
    $cleanDir = trim(str_replace(DIRECTORY_SEPARATOR, '/', $rawDir), '/');
    $baseUrl = $protocol . $host . ($cleanDir !== '' ? '/' . $cleanDir : '');

    // Periksa apakah berkas diunggah via multipart/form-data atau JSON payload
    $isMultipart = !empty($_FILES['file']) && isset($_FILES['file']['tmp_name']);

    $docId = '';
    $studentId = '';
    $docType = 'lainnya';
    $title = 'Dokumen Siswa';
    $fileName = '';
    $fileSize = 0;
    $fileType = 'application/octet-stream';
    $uploadedBy = 'Petugas TU';
    $verificationStatus = 'verified';
    $notes = '';
    $fileData = '';

    if ($isMultipart) {
        $docId = !empty($_POST['id']) ? trim($_POST['id']) : '';
        $studentId = !empty($_POST['studentId']) ? trim($_POST['studentId']) : '';
        $docType = !empty($_POST['docType']) ? strtolower(trim($_POST['docType'])) : 'lainnya';
        $title = !empty($_POST['title']) ? trim($_POST['title']) : 'Dokumen';
        $fileName = !empty($_POST['fileName']) ? trim($_POST['fileName']) : $_FILES['file']['name'];
        $fileSize = (int)(!empty($_POST['fileSize']) ? $_POST['fileSize'] : $_FILES['file']['size']);
        $fileType = !empty($_POST['fileType']) ? trim($_POST['fileType']) : $_FILES['file']['type'];
        $uploadedBy = !empty($_POST['uploadedBy']) ? trim($_POST['uploadedBy']) : 'Petugas TU';
        $verificationStatus = !empty($_POST['verificationStatus']) ? trim($_POST['verificationStatus']) : 'verified';
        $notes = !empty($_POST['notes']) ? trim($_POST['notes']) : '';
    } else {
        $doc = isset($body['document']) && is_array($body['document']) ? $body['document'] : $body;
        $docId = $doc['id'] ?? '';
        $studentId = $doc['studentId'] ?? '';
        $docType = strtolower($doc['docType'] ?? ($doc['type'] ?? 'lainnya'));
        $title = $doc['title'] ?? 'Dokumen';
        $fileName = $doc['fileName'] ?? ($doc['title'] ?? 'dokumen.pdf');
        $fileSize = (int)($doc['fileSize'] ?? 0);
        $fileType = $doc['fileType'] ?? 'application/octet-stream';
        $uploadedBy = $doc['uploadedBy'] ?? ($doc['verifiedBy'] ?? 'Petugas TU');
        $verificationStatus = $doc['verificationStatus'] ?? ($doc['status'] ?? 'verified');
        $notes = $doc['notes'] ?? '';
        $fileData = $doc['fileDataUrl'] ?? ($doc['fileData'] ?? '');
    }

    if (empty($studentId)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Student ID wajib diisi untuk mengaitkan dokumen dengan siswa.']);
        return;
    }
    if (empty($docId)) {
        $docId = 'doc-' . $studentId . '-' . $docType;
    }

    // Sanitasi nama berkas dan ekstensi
    $cleanStudentId = preg_replace('/[^a-zA-Z0-9_-]/', '', $studentId);
    $cleanDocType = preg_replace('/[^a-zA-Z0-9_-]/', '', $docType);

    $ext = pathinfo($fileName, PATHINFO_EXTENSION);
    if (empty($ext)) {
        if (strpos($fileType, 'jpeg') !== false || strpos($fileType, 'jpg') !== false) $ext = 'jpg';
        elseif (strpos($fileType, 'png') !== false) $ext = 'png';
        elseif (strpos($fileType, 'webp') !== false) $ext = 'webp';
        elseif (strpos($fileType, 'svg') !== false) $ext = 'svg';
        elseif (strpos($fileType, 'pdf') !== false) $ext = 'pdf';
        else $ext = 'jpg';
    }
    $ext = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $ext));
    if ($ext === 'jpeg') $ext = 'jpg';

    // Format yang diizinkan
    $allowedExts = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'svg', 'heic'];
    if (!in_array($ext, $allowedExts)) {
        $ext = 'jpg';
    }

    $safeFilename = 'DOC_' . $cleanStudentId . '_' . strtoupper($cleanDocType) . '_' . date('Ymd_His') . '_' . substr(md5(uniqid(mt_rand(), true)), 0, 6) . '.' . $ext;
    $targetFilePath = $uploadDocDir . '/' . $safeFilename;

    $fileSavedOnDisk = false;

    // Simpan berkas fisik ke disk server hosting
    if ($isMultipart && is_uploaded_file($_FILES['file']['tmp_name'])) {
        if (@move_uploaded_file($_FILES['file']['tmp_name'], $targetFilePath)) {
            $fileSavedOnDisk = true;
            $fileSize = filesize($targetFilePath);
            @chmod($targetFilePath, 0644);
        } elseif (@copy($_FILES['file']['tmp_name'], $targetFilePath)) {
            $fileSavedOnDisk = true;
            $fileSize = filesize($targetFilePath);
            @chmod($targetFilePath, 0644);
        }
    } elseif (!empty($fileData) && strpos($fileData, 'data:') === 0) {
        $parts = explode(',', $fileData, 2);
        if (count($parts) === 2) {
            $binary = base64_decode($parts[1]);
            if ($binary !== false && @file_put_contents($targetFilePath, $binary) !== false) {
                $fileSavedOnDisk = true;
                $fileSize = filesize($targetFilePath);
                @chmod($targetFilePath, 0644);
            }
        }
    }

    $fileRelativePath = '';
    $filePublicUrl = '';
    if ($fileSavedOnDisk) {
        $fileRelativePath = 'uploads/documents/' . $safeFilename;
        $filePublicUrl = $baseUrl . '/' . $fileRelativePath;
    }

    try {
        $now = date('c');
        $cleanDoc = [
            'id' => $docId,
            'studentId' => $studentId,
            'docType' => $docType,
            'title' => $title,
            'fileName' => $fileName,
            'fileSize' => $fileSize,
            'fileType' => $fileType,
            'fileUrl' => $filePublicUrl ?: $fileRelativePath,
            'uploadedAt' => $now,
            'uploadedBy' => $uploadedBy,
            'verificationStatus' => $verificationStatus,
            'notes' => $notes,
            'syncedWithCloud' => true,
        ];

        // Query UPSERT ke tabel arsip_documents
        $stmt = $pdo->prepare("INSERT INTO \`arsip_documents\` (
            \`id\`, \`student_id\`, \`type\`, \`file_name\`, \`file_size\`, \`file_type\`,
            \`file_path\`, \`file_url\`, \`upload_date\`, \`status\`, \`verified_by\`, \`verified_at\`, \`notes\`, \`file_data\`, \`raw_json\`
        ) VALUES (
            :id, :student_id, :type, :file_name, :file_size, :file_type,
            :file_path, :file_url, :upload_date, :status, :verified_by, :verified_at, :notes, :file_data, :raw_json
        ) ON DUPLICATE KEY UPDATE
            \`type\` = VALUES(\`type\`),
            \`file_name\` = VALUES(\`file_name\`),
            \`file_size\` = VALUES(\`file_size\`),
            \`file_type\` = VALUES(\`file_type\`),
            \`file_path\` = VALUES(\`file_path\`),
            \`file_url\` = VALUES(\`file_url\`),
            \`upload_date\` = VALUES(\`upload_date\`),
            \`status\` = VALUES(\`status\`),
            \`verified_by\` = VALUES(\`verified_by\`),
            \`verified_at\` = VALUES(\`verified_at\`),
            \`notes\` = VALUES(\`notes\`),
            \`file_data\` = VALUES(\`file_data\`),
            \`raw_json\` = VALUES(\`raw_json\`)");

        // Simpan path relatif di file_data jika berhasil disimpan di disk
        $dbFileData = !empty($fileRelativePath) ? $fileRelativePath : (!empty($fileData) && strlen($fileData) < 2000000 ? $fileData : '');

        $stmt->execute([
            ':id' => $docId,
            ':student_id' => $studentId,
            ':type' => $docType,
            ':file_name' => $fileName,
            ':file_size' => (string)$fileSize,
            ':file_type' => $fileType,
            ':file_path' => $fileRelativePath,
            ':file_url' => $filePublicUrl,
            ':upload_date' => $now,
            ':status' => $verificationStatus,
            ':verified_by' => $uploadedBy,
            ':verified_at' => $now,
            ':notes' => $notes,
            ':file_data' => $dbFileData,
            ':raw_json' => json_encode($cleanDoc),
        ]);

        // Catat Audit Log di MySQL
        try {
            $stmtLog = $pdo->prepare("INSERT INTO \`arsip_audit_logs\` (\`id\`, \`timestamp\`, \`user_name\`, \`user_role\`, \`action\`, \`details\`)
                VALUES (:id, :timestamp, :user_name, :user_role, :action, :details)");
            $stmtLog->execute([
                ':id' => 'log-' . time() . '-' . substr(md5(uniqid()), 0, 6),
                ':timestamp' => $now,
                ':user_name' => $uploadedBy,
                ':user_role' => !empty($_POST['userRole']) ? $_POST['userRole'] : (!empty($body['userRole']) ? $body['userRole'] : 'petugas_tu'),
                ':action' => 'UPLOAD_DOC',
                ':details' => 'Mengunggah dokumen ' . $title . ' (' . $fileName . ') untuk siswa NISN/ID: ' . $studentId,
            ]);
        } catch (Exception $logErr) {}

        echo json_encode([
            'success' => true,
            'message' => 'Dokumen ' . $fileName . ' berhasil diarsipkan ke database & penyimpanan hosting.',
            'docId' => $docId,
            'studentId' => $studentId,
            'docType' => $docType,
            'fileUrl' => $filePublicUrl ?: $fileRelativePath,
            'filePath' => $fileRelativePath,
            'fileName' => $fileName,
            'fileSize' => $fileSize,
            'uploadedBy' => $uploadedBy,
            'storage' => $fileSavedOnDisk ? 'disk_and_database' : 'database_only',
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal menyimpan dokumen: ' . $e->getMessage()]);
    }
}

function handleServeFile($pdo) {
    $fileParam = isset($_GET['file']) ? trim($_GET['file']) : '';
    $idParam = isset($_GET['id']) ? trim($_GET['id']) : '';

    $filePath = '';
    if (!empty($idParam)) {
        try {
            $stmt = $pdo->prepare("SELECT \`file_path\`, \`file_name\`, \`file_type\` FROM \`arsip_documents\` WHERE \`id\` = :id LIMIT 1");
            $stmt->execute([':id' => $idParam]);
            $row = $stmt->fetch();
            if ($row && !empty($row['file_path'])) {
                $filePath = __DIR__ . '/' . ltrim($row['file_path'], '/');
            }
        } catch (Exception $e) {}
    }

    if (empty($filePath) && !empty($fileParam)) {
        $cleanName = basename($fileParam);
        $filePath = __DIR__ . '/uploads/documents/' . $cleanName;
    }

    if (!empty($filePath) && file_exists($filePath) && is_readable($filePath)) {
        $mime = 'application/octet-stream';
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        if ($ext === 'jpg' || $ext === 'jpeg') $mime = 'image/jpeg';
        elseif ($ext === 'png') $mime = 'image/png';
        elseif ($ext === 'webp') $mime = 'image/webp';
        elseif ($ext === 'svg') $mime = 'image/svg+xml';
        elseif ($ext === 'pdf') $mime = 'application/pdf';

        header('Content-Type: ' . $mime);
        header('Content-Length: ' . filesize($filePath));
        header('Content-Disposition: inline; filename="' . basename($filePath) . '"');
        header('Cache-Control: public, max-age=86400');
        readfile($filePath);
        exit;
    }

    http_response_code(404);
    echo json_encode(['success' => false, 'error' => 'Berkas dokumen tidak ditemukan di server.']);
    exit;
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

        // Upsert Akun Petugas / Pengguna
        $users = isset($body['users']) && is_array($body['users']) ? $body['users'] : [];
        if (!empty($users)) {
            $stmtUser = $pdo->prepare("INSERT INTO \`arsip_users\` (
                \`id\`, \`username\`, \`name\`, \`role\`, \`email\`, \`nip\`, \`password\`, \`active\`, \`last_login\`, \`raw_json\`, \`updated_at\`
            ) VALUES (
                :id, :username, :name, :role, :email, :nip, :password, :active, :last_login, :raw_json, :updated_at
            ) ON DUPLICATE KEY UPDATE
                \`username\` = VALUES(\`username\`),
                \`name\` = VALUES(\`name\`),
                \`role\` = VALUES(\`role\`),
                \`email\` = VALUES(\`email\`),
                \`nip\` = VALUES(\`nip\`),
                \`password\` = VALUES(\`password\`),
                \`active\` = VALUES(\`active\`),
                \`last_login\` = VALUES(\`last_login\`),
                \`raw_json\` = VALUES(\`raw_json\`),
                \`updated_at\` = VALUES(\`updated_at\`)");

            foreach ($users as $u) {
                if (empty($u['id']) || empty($u['username'])) continue;
                $stmtUser->execute([
                    ':id' => $u['id'],
                    ':username' => $u['username'],
                    ':name' => $u['name'] ?? '',
                    ':role' => $u['role'] ?? 'petugas_tu',
                    ':email' => $u['email'] ?? '',
                    ':nip' => $u['nip'] ?? '',
                    ':password' => $u['password'] ?? ($u['role'] === 'admin' ? 'admin' : 'tu123'),
                    ':active' => ($u['active'] ?? true) ? 1 : 0,
                    ':last_login' => $u['lastLogin'] ?? '',
                    ':raw_json' => json_encode($u),
                    ':updated_at' => date('c'),
                ]);
            }
        }

        $pdo->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Berhasil menyimpan ' . count($students) . ' siswa, ' . count($documents) . ' dokumen, dan ' . count($users) . ' akun petugas ke MySQL Rumahweb.',
            'saved' => [
                'students' => count($students),
                'documents' => count($documents),
                'users' => count($users),
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
    // Ambil semua data siswa (data terbaru yang ditambahkan berada di paling atas)
    $stmt1 = $pdo->query("SELECT * FROM \`arsip_students\` ORDER BY \`created_at\` DESC, \`id\` DESC");
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
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] == 443) || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    $protocol = $isHttps ? 'https://' : 'http://';
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : (isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : 'localhost');
    $rawDir = dirname($_SERVER['SCRIPT_NAME']);
    $cleanDir = trim(str_replace(DIRECTORY_SEPARATOR, '/', $rawDir), '/');
    $baseUrl = $protocol . $host . ($cleanDir !== '' ? '/' . $cleanDir : '');

    $stmt2 = $pdo->query("SELECT * FROM \`arsip_documents\`");
    $rawDocs = $stmt2->fetchAll();
    $documents = [];
    foreach ($rawDocs as $d) {
        $fileUrl = $d['file_url'] ?? '';
        if (empty($fileUrl) && !empty($d['file_path'])) {
            $fileUrl = $baseUrl . '/' . ltrim($d['file_path'], '/');
        }

        $fileData = $d['file_data'] ?? '';
        if (empty($fileData)) {
            $fileData = $fileUrl;
        } elseif (!empty($fileData) && strpos($fileData, 'uploads/') === 0) {
            $fileData = $baseUrl . '/' . ltrim($fileData, '/');
        }

        if (!empty($d['raw_json'])) {
            $decoded = json_decode($d['raw_json'], true);
            if (is_array($decoded)) {
                if (empty($decoded['fileDataUrl']) && !empty($fileData)) {
                    $decoded['fileDataUrl'] = $fileData;
                }
                if (empty($decoded['fileUrl']) && !empty($fileUrl)) {
                    $decoded['fileUrl'] = $fileUrl;
                }
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
            'fileType' => $d['file_type'] ?? 'application/pdf',
            'fileSize' => (int)($d['file_size'] ?? 0),
            'fileDataUrl' => !empty($fileUrl) ? $fileUrl : $fileData,
            'fileUrl' => $fileUrl,
            'uploadedAt' => $d['upload_date'] ?? date('c'),
            'uploadedBy' => $d['verified_by'] ?? 'Petugas TU',
            'verificationStatus' => $vStatus,
            'notes' => $d['notes'] ?? '',
            'version' => 1,
            'syncedWithCloud' => true,
        ];
    }

    // Ambil tahun pelajaran
    $stmt3 = $pdo->query("SELECT \`year_name\` FROM \`arsip_academic_years\` ORDER BY \`id\` ASC");
    $years = $stmt3->fetchAll(PDO::FETCH_COLUMN);

    // Ambil akun petugas
    $users = [];
    try {
        $stmtUsers = $pdo->query("SELECT * FROM \`arsip_users\`");
        $rawUsers = $stmtUsers->fetchAll();
        foreach ($rawUsers as $u) {
            if (!empty($u['raw_json'])) {
                $decoded = json_decode($u['raw_json'], true);
                if (is_array($decoded)) {
                    $users[] = $decoded;
                    continue;
                }
            }
            $users[] = [
                'id' => $u['id'],
                'username' => $u['username'],
                'name' => $u['name'],
                'role' => $u['role'],
                'email' => $u['email'] ?? '',
                'nip' => $u['nip'] ?? '',
                'password' => $u['password'],
                'active' => (bool)($u['active'] ?? 1),
                'lastLogin' => $u['last_login'] ?? '',
            ];
        }
    } catch (Exception $e) {}

    echo json_encode([
        'success' => true,
        'data' => [
            'students' => $students,
            'documents' => $documents,
            'academicYears' => !empty($years) ? $years : [],
            'users' => $users,
        ]
    ]);
}

function handleCheckSync($pdo) {
    $stmt1 = $pdo->query("SELECT COUNT(*) AS total, MAX(\`updated_at\`) AS last_updated FROM \`arsip_students\`");
    $sInfo = $stmt1->fetch();

    $stmt2 = $pdo->query("SELECT COUNT(*) AS total, MAX(\`upload_date\`) AS last_doc FROM \`arsip_documents\`");
    $dInfo = $stmt2->fetch();

    $stmt3 = $pdo->query("SELECT COUNT(*) AS total FROM \`arsip_academic_years\`");
    $totalYears = (int)$stmt3->fetchColumn();

    $stmt4 = $pdo->query("SELECT COUNT(*) AS total, MAX(\`updated_at\`) AS last_updated FROM \`arsip_users\`");
    $uInfo = $stmt4->fetch();

    echo json_encode([
        'success' => true,
        'counts' => [
            'students' => (int)($sInfo['total'] ?? 0),
            'documents' => (int)($dInfo['total'] ?? 0),
            'academicYears' => $totalYears,
            'users' => (int)($uInfo['total'] ?? 0),
        ],
        'lastStudentUpdate' => $sInfo['last_updated'] ?? '',
        'lastDocUpdate' => $dInfo['last_doc'] ?? '',
        'lastUserUpdate' => $uInfo['last_updated'] ?? '',
        'server_time' => date('Y-m-d H:i:s'),
    ]);
}

function handleSaveUser($pdo, $body) {
    $user = isset($body['user']) && is_array($body['user']) ? $body['user'] : null;
    if (!$user || empty($user['id']) || empty($user['username'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Data user tidak valid atau ID/username kosong']);
        return;
    }

    try {
        $now = date('c');
        $cleanUsername = strtolower(ltrim(trim($user['username']), '@'));
        $stmt = $pdo->prepare("INSERT INTO \`arsip_users\` (
            \`id\`, \`username\`, \`name\`, \`role\`, \`email\`, \`nip\`, \`password\`, \`active\`, \`last_login\`, \`raw_json\`, \`updated_at\`
        ) VALUES (
            :id, :username, :name, :role, :email, :nip, :password, :active, :last_login, :raw_json, :updated_at
        ) ON DUPLICATE KEY UPDATE
            \`username\` = VALUES(\`username\`),
            \`name\` = VALUES(\`name\`),
            \`role\` = VALUES(\`role\`),
            \`email\` = VALUES(\`email\`),
            \`nip\` = VALUES(\`nip\`),
            \`password\` = VALUES(\`password\`),
            \`active\` = VALUES(\`active\`),
            \`last_login\` = VALUES(\`last_login\`),
            \`raw_json\` = VALUES(\`raw_json\`),
            \`updated_at\` = VALUES(\`updated_at\`)");

        $stmt->execute([
            ':id' => $user['id'],
            ':username' => $cleanUsername,
            ':name' => $user['name'] ?? '',
            ':role' => $user['role'] ?? 'petugas_tu',
            ':email' => $user['email'] ?? '',
            ':nip' => $user['nip'] ?? '',
            ':password' => $user['password'] ?? ($user['role'] === 'admin' ? 'admin' : 'tu123'),
            ':active' => ($user['active'] ?? true) ? 1 : 0,
            ':last_login' => $user['lastLogin'] ?? '',
            ':raw_json' => json_encode($user),
            ':updated_at' => $now,
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Akun petugas ' . ($user['name'] ?? '') . ' berhasil disimpan di MySQL cloud.',
            'userId' => $user['id'],
            'timestamp' => $now,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal menyimpan user: ' . $e->getMessage()]);
    }
}

function handleDeleteUser($pdo, $body) {
    $userId = trim($body['userId'] ?? '');
    $username = trim($body['username'] ?? '');
    if (empty($userId) && empty($username)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'ID user tidak boleh kosong']);
        return;
    }
    $cleanU = strtolower(ltrim($username, '@'));
    if ($userId === 'usr-admin-01' || $cleanU === 'admin') {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'Akun admin utama tidak boleh dihapus']);
        return;
    }

    try {
        $now = date('c');
        if (!empty($userId)) {
            $stmt = $pdo->prepare("DELETE FROM \`arsip_users\` WHERE \`id\` = :id");
            $stmt->execute([':id' => $userId]);
        }
        if (!empty($cleanU)) {
            $stmt = $pdo->prepare("DELETE FROM \`arsip_users\` WHERE LOWER(\`username\`) = :u OR LOWER(\`username\`) = :u2");
            $stmt->execute([':u' => $cleanU, ':u2' => '@' . $cleanU]);
        }
        echo json_encode([
            'success' => true,
            'message' => 'Akun petugas berhasil dihapus permanen dari server MySQL cloud.',
            'userId' => $userId,
            'username' => $cleanU,
            'timestamp' => $now,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal menghapus user: ' . $e->getMessage()]);
    }
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

function handleLogin($pdo, $body) {
    $rawUsername = trim($body['username'] ?? '');
    $password = trim($body['password'] ?? '');
    $role = trim($body['role'] ?? '');
    $cleanUsername = strtolower(ltrim($rawUsername, '@'));

    if (empty($cleanUsername) || empty($password)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Username dan kata sandi tidak boleh kosong.']);
        return;
    }

    try {
        $stmt = $pdo->prepare("SELECT * FROM \`arsip_users\` WHERE LOWER(\`username\`) = :u1 OR LOWER(\`email\`) = :u2 OR LOWER(CONCAT('@', \`username\`)) = :u3 LIMIT 1");
        $stmt->execute([
            ':u1' => $cleanUsername,
            ':u2' => $cleanUsername,
            ':u3' => '@' . $cleanUsername,
        ]);
        $row = $stmt->fetch();

        if (!$row) {
            echo json_encode([
                'success' => false,
                'error' => 'Username atau email "' . htmlspecialchars($rawUsername) . '" tidak terdaftar dalam sistem.',
            ]);
            return;
        }

        if (!empty($role) && strtolower($row['role']) !== strtolower($role)) {
            $msg = ($role === 'admin')
                ? 'Akun "@' . htmlspecialchars($row['username']) . '" terdaftar sebagai Petugas Tata Usaha (TU), bukan Administrator. Silakan klik tab "Petugas Tata Usaha (TU)" di atas untuk masuk.'
                : 'Akun "@' . htmlspecialchars($row['username']) . '" terdaftar sebagai Administrator, bukan Petugas TU. Silakan klik tab "Administrator" di atas untuk masuk.';
            echo json_encode([
                'success' => false,
                'error' => $msg,
            ]);
            return;
        }

        if (trim($row['password']) !== $password) {
            echo json_encode([
                'success' => false,
                'error' => 'Kata sandi tidak sesuai. Silakan periksa kembali kata sandi Anda.',
            ]);
            return;
        }

        if (isset($row['active']) && (int)$row['active'] === 0) {
            echo json_encode([
                'success' => false,
                'error' => 'Akun petugas ini sedang dinonaktifkan oleh Administrator.',
            ]);
            return;
        }

        // Update last login
        $nowStr = date('d M Y H.i') . ' WIB';
        $upd = $pdo->prepare("UPDATE \`arsip_users\` SET \`last_login\` = :ll WHERE \`id\` = :id");
        $upd->execute([':ll' => $nowStr, ':id' => $row['id']]);

        $user = [
            'id' => $row['id'],
            'username' => $row['username'],
            'name' => $row['name'],
            'role' => $row['role'],
            'email' => $row['email'] ?? '',
            'nip' => $row['nip'] ?? '',
            'password' => $row['password'],
            'active' => true,
            'lastLogin' => $nowStr,
        ];

        echo json_encode([
            'success' => true,
            'message' => 'Login berhasil!',
            'user' => $user,
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal verifikasi login ke server: ' . $e->getMessage()]);
    }
}

function handlePullUsers($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM \`arsip_users\` ORDER BY \`id\` ASC");
        $rows = $stmt->fetchAll();
        $users = [];
        foreach ($rows as $r) {
            if (!empty($r['raw_json'])) {
                $decoded = json_decode($r['raw_json'], true);
                if (is_array($decoded) && !empty($decoded['id'])) {
                    $users[] = $decoded;
                    continue;
                }
            }
            $users[] = [
                'id' => $r['id'],
                'username' => $r['username'],
                'name' => $r['name'],
                'role' => $r['role'],
                'email' => $r['email'] ?? '',
                'nip' => $r['nip'] ?? '',
                'password' => $r['password'] ?? '',
                'active' => (bool)($r['active'] ?? 1),
                'lastLogin' => $r['last_login'] ?? '',
            ];
        }
        echo json_encode([
            'success' => true,
            'users' => $users,
            'count' => count($users),
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal mengambil data user: ' . $e->getMessage()]);
    }
}

function handlePushUsers($pdo, $body) {
    $users = isset($body['users']) && is_array($body['users']) ? $body['users'] : [];
    if (empty($users)) {
        echo json_encode(['success' => true, 'message' => 'Tidak ada user untuk disimpan.', 'saved' => 0]);
        return;
    }
    try {
        $stmt = $pdo->prepare("INSERT INTO \`arsip_users\` (
            \`id\`, \`username\`, \`name\`, \`role\`, \`email\`, \`nip\`, \`password\`, \`active\`, \`last_login\`, \`raw_json\`, \`updated_at\`
        ) VALUES (
            :id, :username, :name, :role, :email, :nip, :password, :active, :last_login, :raw_json, NOW()
        ) ON DUPLICATE KEY UPDATE
            \`username\` = VALUES(\`username\`),
            \`name\` = VALUES(\`name\`),
            \`role\` = VALUES(\`role\`),
            \`email\` = VALUES(\`email\`),
            \`nip\` = VALUES(\`nip\`),
            \`password\` = VALUES(\`password\`),
            \`active\` = VALUES(\`active\`),
            \`raw_json\` = VALUES(\`raw_json\`),
            \`updated_at\` = NOW()");

        $count = 0;
        foreach ($users as $u) {
            if (!empty($u['id']) && !empty($u['username'])) {
                $stmt->execute([
                    ':id' => $u['id'],
                    ':username' => ltrim($u['username'], '@'),
                    ':name' => $u['name'] ?? '',
                    ':role' => $u['role'] ?? 'petugas_tu',
                    ':email' => $u['email'] ?? '',
                    ':nip' => $u['nip'] ?? '',
                    ':password' => $u['password'] ?? ($u['role'] === 'admin' ? 'admin' : 'tu123'),
                    ':active' => ($u['active'] ?? true) ? 1 : 0,
                    ':last_login' => $u['lastLogin'] ?? '',
                    ':raw_json' => json_encode($u),
                ]);
                $count++;
            }
        }
        echo json_encode(['success' => true, 'message' => \"\$count akun petugas berhasil disinkronkan ke MySQL.\", 'saved' => $count]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Gagal menyimpan akun user ke database: ' . $e->getMessage()]);
    }
}
?>`;
}
