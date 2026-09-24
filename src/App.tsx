import React, { useState, useEffect, useRef } from 'react';
import {
  initializeStorage,
  getStudents,
  saveStudent,
  deleteStudent,
  getDocuments,
  saveDocument,
  deleteDocument,
  verifyDocument,
  getLogs,
  addAuditLog,
  getUsers,
  saveUser,
  deleteUser,
  getCurrentUser,
  setCurrentUser,
  checkIsAuthenticated,
  setAuthenticated,
  logoutUser,
  loginAsRole,
  getAcademicYears,
  saveStudentsBatch,
  applyRemoteSyncedData,
  setServerUsers,
} from './services/storage';
import {
  getSyncConfig,
  pullAllDataFromHosting,
  pushAllDataToHosting,
  deleteStudentFromHosting,
  deleteDocumentFromHosting,
  saveDocumentToHosting,
  saveUserToHosting,
  deleteUserFromHosting,
  pullUsersFromHosting,
  checkServerSyncStatus,
  getIsSyncInProgress,
  getLastKnownSyncTimestamp,
  saveLastKnownSyncTimestamp,
  getLastKnownDocSyncTimestamp,
  saveLastKnownDocSyncTimestamp,
  getLastKnownUserSyncTimestamp,
  saveLastKnownUserSyncTimestamp,
  pullUsersFromHosting,
  saveStudentToHosting,
  pushStudentsToHosting,
  executeTwoWaySync,
  purgeDemoDataFromHosting,
} from './services/mysqlSync';
import { Student, StudentDocument, User, VerificationStatus, AuditLog } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardOverview } from './components/DashboardOverview';
import { StudentList } from './components/StudentList';
import { StudentDossierModal } from './components/StudentDossierModal';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { StudentFormModal } from './components/StudentFormModal';
import { ManageAcademicYearsModal } from './components/ManageAcademicYearsModal';
import { AuditLogsView } from './components/AuditLogsView';
import { UserManagementView } from './components/UserManagementView';
import { BackupSecurityView } from './components/BackupSecurityView';
import { EditUserModal } from './components/EditUserModal';
import { ImportExcelModal } from './components/ImportExcelModal';
import { RumahwebSyncModal } from './components/RumahwebSyncModal';
import { LoginView } from './components/LoginView';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  // Initialize storage once on boot and ensure any legacy demo data is purged immediately & silently
  useEffect(() => {
    initializeStorage();
    refreshAllData();
    const config = getSyncConfig();
    if (config.apiUrl) {
      purgeDemoDataFromHosting().catch(() => {});
      // Fetch authoritative user list from MySQL database immediately on start
      pullUsersFromHosting()
        .then((serverUsers) => {
          if (serverUsers && Array.isArray(serverUsers) && serverUsers.length > 0) {
            setUsers(serverUsers);
            setServerUsers(serverUsers);
          }
        })
        .catch(() => {});
    }
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => checkIsAuthenticated());
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const [documents, setDocuments] = useState<StudentDocument[]>(() => getDocuments());
  const [logs, setLogs] = useState<AuditLog[]>(() => getLogs());
  const [users, setUsers] = useState<User[]>(() => getUsers());
  const [currentUser, setCurrentUserState] = useState<User>(() => getCurrentUser());
  const [isRefreshingUsers, setIsRefreshingUsers] = useState<boolean>(false);

  const fetchUsersFromServer = async (silent = false) => {
    const config = getSyncConfig();
    if (!config.apiUrl) return;
    if (!silent) setIsRefreshingUsers(true);
    try {
      const serverUsers = await pullUsersFromHosting();
      if (serverUsers && Array.isArray(serverUsers) && serverUsers.length > 0) {
        setUsers(serverUsers);
        setServerUsers(serverUsers);
        if (!silent) {
          showToast(`Berhasil menyinkronkan ${serverUsers.length} akun petugas langsung dari database server.`, 'success');
        }
      }
    } catch (err: any) {
      if (!silent) {
        showToast('Gagal menyinkronkan akun dari database server.', 'error');
      }
    } finally {
      if (!silent) setIsRefreshingUsers(false);
    }
  };

  const [currentView, setCurrentView] = useState<string>('dashboard');

  useEffect(() => {
    if (currentView === 'users') {
      fetchUsersFromServer(true);
    }
  }, [currentView]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [selectedStudentForDossier, setSelectedStudentForDossier] = useState<Student | null>(null);

  // Rumahweb Cloud Sync Modal
  const [isRumahwebSyncOpen, setIsRumahwebSyncOpen] = useState<boolean>(false);

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState<StudentDocument | null>(null);
  const [previewStudent, setPreviewStudent] = useState<Student | undefined>(undefined);

  // Student Form Modal
  const [studentFormModal, setStudentFormModal] = useState<{
    isOpen: boolean;
    student: Student | null;
  }>({
    isOpen: false,
    student: null,
  });

  // Edit Profile Modal
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Manage Academic Years Modal
  const [academicYears, setAcademicYears] = useState<string[]>(() => getAcademicYears());
  const [isManageYearsOpen, setIsManageYearsOpen] = useState(false);

  // Bulk Import Excel Modal
  const [isImportExcelOpen, setIsImportExcelOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-logout jika tidak ada aktivitas (15 menit)
  const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
  const [autoLogoutNotice, setAutoLogoutNotice] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const activityThrottleRef = useRef<number>(0);

  useEffect(() => {
    if (!isAuthenticated) return;

    // Set initial activity time
    const initialTime = Date.now();
    lastActivityRef.current = initialTime;
    try {
      sessionStorage.setItem('arsip_last_active_time', String(initialTime));
      localStorage.removeItem('arsip_last_active_time');
    } catch {}

    const handleUserActivity = () => {
      const now = Date.now();
      // Throttle agar tidak membebani CPU (maksimal sekali per 2 detik)
      if (now - activityThrottleRef.current > 2000) {
        activityThrottleRef.current = now;
        lastActivityRef.current = now;
        try {
          sessionStorage.setItem('arsip_last_active_time', String(now));
        } catch {}
      }
    };

    const userEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];
    userEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    const triggerAutoLogout = (reason: string) => {
      logoutUser();
      setIsAuthenticated(false);
      const notice = 'Sesi Anda telah berakhir secara otomatis karena tidak ada aktivitas selama 15 menit. Silakan masuk kembali demi keamanan data arsip.';
      setAutoLogoutNotice(notice);
      addAuditLog('LOGOUT', `Sesi otomatis ditutup (Auto-Logout) karena tidak ada aktivitas (${reason}).`);
      showToast('Sesi otomatis berakhir karena tidak ada aktivitas selama 15 menit.', 'error');
    };

    // Pengecekan berkala setiap 5 detik
    const idleCheckInterval = setInterval(() => {
      const now = Date.now();
      let lastTime = lastActivityRef.current;
      try {
        const stored = sessionStorage.getItem('arsip_last_active_time');
        if (stored) {
          const parsed = Number(stored);
          if (!isNaN(parsed) && parsed > lastTime) {
            lastTime = parsed;
            lastActivityRef.current = parsed;
          }
        }
      } catch {}

      if (now - lastTime >= INACTIVITY_TIMEOUT_MS) {
        triggerAutoLogout('15 menit inaktif');
      }
    }, 5000);

    // Pengecekan saat tab atau layar kembali aktif (misal laptop baru dibuka/kembali ke tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        let lastTime = lastActivityRef.current;
        try {
          const stored = sessionStorage.getItem('arsip_last_active_time');
          if (stored) {
            const parsed = Number(stored);
            if (!isNaN(parsed) && parsed > lastTime) {
              lastTime = parsed;
              lastActivityRef.current = parsed;
            }
          }
        } catch {}

        if (now - lastTime >= INACTIVITY_TIMEOUT_MS) {
          triggerAutoLogout('inaktif saat layar tidak aktif');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    return () => {
      userEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(idleCheckInterval);
    };
  }, [isAuthenticated]);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const refreshAllData = () => {
    const freshStudents = getStudents();
    const freshDocs = getDocuments();
    setStudents(freshStudents);
    setDocuments(freshDocs);
    setLogs(getLogs());
    setUsers(getUsers());
    setCurrentUserState(getCurrentUser());
    setAcademicYears(getAcademicYears());

    setSelectedStudentForDossier((prev) => {
      if (!prev) return null;
      return freshStudents.find((s) => s.id === prev.id) || prev;
    });
  };

  const broadcastLocalChange = () => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('arsip_attafaqquh_sync');
        bc.postMessage('REFRESH');
        bc.close();
      }
    } catch {}
  };

  // Instant multi-tab / multi-window synchronization
  useEffect(() => {
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('arsip_attafaqquh_sync');
        bc.onmessage = (ev) => {
          if (ev.data === 'REFRESH') {
            refreshAllData();
          }
        };
      }
    } catch {}

    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('arsip_sekolah_') || e.key?.startsWith('arsip_rumahweb_')) {
        refreshAllData();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Live Auto-Sync Status
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'error' | 'idle'>(() => {
    const config = getSyncConfig();
    return config.apiUrl ? 'connected' : 'idle';
  });

  // Background sync helper: performs bidirectional smart merge for students and documents
  const syncToCloudIfEnabled = () => {
    const config = getSyncConfig();
    if (config.apiUrl && config.autoSync) {
      executeTwoWaySync()
        .then((res) => {
          if (
            res.success &&
            ((res.pushedCount ?? 0) > 0 ||
              (res.pulledCount ?? 0) > 0 ||
              (res.pushedDocsCount ?? 0) > 0 ||
              (res.pulledDocsCount ?? 0) > 0)
          ) {
            refreshAllData();
            broadcastLocalChange();
          }
        })
        .catch((e) => console.warn('Auto cloud sync failed:', e));
    }
  };

  // Manual Trigger: performs bidirectional smart merge (never overwrites new local additions!)
  const handleManualSync = async () => {
    if (getIsSyncInProgress() || isLiveSyncing) return;
    setIsLiveSyncing(true);
    setSyncStatus('syncing');
    try {
      const res = await executeTwoWaySync();
      if (res.success) {
        refreshAllData();
        broadcastLocalChange();
        setSyncStatus('connected');
        showToast(res.message, 'success');
      } else {
        setSyncStatus('error');
        showToast(res.message || 'Gagal sinkronisasi data.', 'error');
      }
    } catch (err: any) {
      setSyncStatus('error');
      showToast(`Gagal sinkronisasi: ${err.message || String(err)}`, 'error');
    } finally {
      setIsLiveSyncing(false);
    }
  };

  // Live Auto-Sync Engine across all Laptops
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isCancelled = false;
    let isChecking = false;

    const performSyncCheck = async (isBackground = true) => {
      const config = getSyncConfig();
      if (!config.apiUrl || !config.autoSync || getIsSyncInProgress() || isChecking) {
        return;
      }

      isChecking = true;
      if (!isBackground) setIsLiveSyncing(true);

      try {
        const check = await checkServerSyncStatus();
        if (isCancelled) return;

        if (check.success) {
          setSyncStatus('connected');
        }

        const currentStudents = getStudents();
        const currentDocs = getDocuments();
        const lastKnownUpdate = getLastKnownSyncTimestamp();
        const lastKnownDocUpdate = getLastKnownDocSyncTimestamp();
        const lastKnownUserUpdate = getLastKnownUserSyncTimestamp();

        // 1. Check if user accounts differ on database server (Single Source of Truth)
        if (check.success && check.counts && check.counts.users !== undefined) {
          const userCountDiffers = check.counts.users !== users.length;
          const userTimestampDiffers = Boolean(check.lastUserUpdate) && check.lastUserUpdate !== lastKnownUserUpdate;
          if (userCountDiffers || userTimestampDiffers) {
            pullUsersFromHosting().then((freshUsers) => {
              if (freshUsers && Array.isArray(freshUsers) && freshUsers.length > 0) {
                setUsers(freshUsers);
                setServerUsers(freshUsers);
                if (check.lastUserUpdate) saveLastKnownUserSyncTimestamp(check.lastUserUpdate);
              }
            }).catch(() => {});
          }
        }

        let shouldSync = false;

        if (check.success && check.counts) {
          const studentCountDiffers = check.counts.students !== currentStudents.length;
          const docCountDiffers = check.counts.documents !== currentDocs.length;

          const studentTimestampDiffers =
            Boolean(check.lastStudentUpdate) &&
            check.lastStudentUpdate !== lastKnownUpdate;

          const docTimestampDiffers =
            Boolean(check.lastDocUpdate) &&
            check.lastDocUpdate !== lastKnownDocUpdate;

          const isFreshLocalSeed =
            currentStudents.length <= 6 && check.counts.students > 6;

          // Routine background sync every 25 seconds if autoSync is enabled
          const lastSyncTimeStr = config.lastSyncTime;
          const secondsSinceLastSync = lastSyncTimeStr
            ? (Date.now() - new Date(lastSyncTimeStr).getTime()) / 1000
            : 999;
          const routineSyncDue = secondsSinceLastSync > 25;

          shouldSync =
            studentCountDiffers ||
            docCountDiffers ||
            studentTimestampDiffers ||
            docTimestampDiffers ||
            isFreshLocalSeed ||
            routineSyncDue;
        } else if (!isBackground) {
          shouldSync = true;
        }

        if (shouldSync) {
          setIsLiveSyncing(true);
          setSyncStatus('syncing');
          const res = await executeTwoWaySync();
          if (isCancelled) return;

          if (res.success) {
            refreshAllData();
            broadcastLocalChange();
            setSyncStatus('connected');

            // Store server timestamps to avoid re-pulling if nothing changed
            if (check.lastStudentUpdate) saveLastKnownSyncTimestamp(check.lastStudentUpdate);
            if (check.lastDocUpdate) saveLastKnownDocSyncTimestamp(check.lastDocUpdate);

            const hasNewStudents = (res.pulledCount ?? 0) > 0;
            const hasNewDocs = (res.pulledDocsCount ?? 0) > 0;

            if (!isBackground) {
              showToast(
                `Cloud MySQL: Terhubung & menyelaraskan ${res.totalStudents} siswa, ${res.totalDocs ?? currentDocs.length} berkas (${res.pushedCount} siswa, ${res.pushedDocsCount ?? 0} berkas dikirim).`,
                'success'
              );
            } else if (hasNewStudents || hasNewDocs) {
              const parts = [];
              if (hasNewStudents) parts.push(`${res.pulledCount} data siswa`);
              if (hasNewDocs) parts.push(`${res.pulledDocsCount} berkas/dokumen`);
              showToast(
                `⚡ Live Sync: ${parts.join(' & ')} berhasil disinkronkan otomatis dari laptop lain.`,
                'success'
              );
            }
          } else {
            setSyncStatus(check.success ? 'connected' : 'error');
          }
        }
      } catch (err) {
        // Silently skip background network fluctuations
      } finally {
        isChecking = false;
        setIsLiveSyncing(false);
      }
    };

    // 1. Initial check immediately on application startup
    performSyncCheck(false);

    // 2. Continuous real-time background polling every 3 seconds
    timer = setInterval(() => {
      performSyncCheck(true);
    }, 3000);

    // 3. Immediately sync whenever user switches to this browser tab or window
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        performSyncCheck(true);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      isCancelled = true;
      if (timer) clearInterval(timer);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  // Authentication Handlers
  const handleLoginSuccess = (user: User) => {
    setAutoLogoutNotice(null);
    setCurrentUser(user);
    setAuthenticated(true);
    lastActivityRef.current = Date.now();
    try {
      sessionStorage.setItem('arsip_last_active_time', String(Date.now()));
      localStorage.removeItem('arsip_last_active_time');
    } catch {}
    setCurrentUserState(user);
    setIsAuthenticated(true);
    refreshAllData();
    const roleLabel =
      user.role === 'admin'
        ? 'Administrator (Akses Penuh)'
        : user.role === 'petugas_tu'
        ? 'Petugas Tata Usaha'
        : 'Wali Kelas / Verifikator';
    showToast(`Selamat datang, ${user.name}! Anda berhasil masuk sebagai ${roleLabel}.`, 'success');
  };

  const handleLogout = () => {
    setAutoLogoutNotice(null);
    logoutUser();
    setIsAuthenticated(false);
    showToast('Anda telah berhasil keluar dari sistem.', 'success');
  };

  // Student Actions
  const handleSaveStudent = (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => {
    const isEditing = !!studentData.id;
    const saved = saveStudent(studentData);

    addAuditLog(
      isEditing ? 'UPDATE_STUDENT' : 'CREATE_STUDENT',
      isEditing
        ? `Memperbarui biodata siswa: ${saved.name} (${saved.classRoom})`
        : `Mendaftarkan siswa baru: ${saved.name} (NISN: ${saved.nisn}, Kelas: ${saved.classRoom})`,
      saved.id,
      saved.name
    );

    refreshAllData();
    showToast(isEditing ? 'Data siswa berhasil diperbarui.' : 'Siswa baru berhasil ditambahkan.');

    // Save directly to cloud MySQL (lightweight, near-instant)
    saveStudentToHosting(saved).then((res) => {
      if (res.success) {
        setSyncStatus('connected');
      }
    }).catch(() => {});
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (
      window.confirm(
        `Apakah Anda yakin ingin menghapus siswa "${studentName}" beserta seluruh berkas dokumen digitalnya?`
      )
    ) {
      deleteStudent(studentId);
      addAuditLog('DELETE_STUDENT', `Menghapus data siswa dan seluruh arsip berkas: ${studentName}`, studentId, studentName);
      refreshAllData();
      
      // Hapus langsung dari hosting cloud agar tidak muncul kembali saat sinkronisasi
      deleteStudentFromHosting(studentId).catch((err) => console.warn('Failed to delete from cloud hosting:', err));
      syncToCloudIfEnabled();

      if (selectedStudentForDossier?.id === studentId) {
        setSelectedStudentForDossier(null);
      }
      showToast('Siswa dan dokumen berhasil dihapus dari sistem & cloud hosting.', 'error');
    }
  };

  const handleBatchImportStudents = (
    importedList: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>,
    mode: 'skip_existing' | 'update_existing'
  ) => {
    const result = saveStudentsBatch(importedList, mode);
    addAuditLog(
      'CREATE_STUDENT',
      `Impor massal dari file Excel: berhasil memproses ${result.totalProcessed} siswa (${result.addedCount} siswa baru, ${result.updatedCount} diperbarui).`
    );
    refreshAllData();
    syncToCloudIfEnabled();
    showToast(
      `Berhasil mengimpor ${result.totalProcessed} data siswa (${result.addedCount} baru, ${result.updatedCount} diperbarui).`,
      'success'
    );
  };

  // Document Actions
  const handleUploadDocument = (docData: Omit<StudentDocument, 'id' | 'uploadedAt' | 'version'>) => {
    const newDocId = `doc-${docData.studentId}-${docData.docType}`;
    const newDoc: StudentDocument = {
      ...docData,
      id: newDocId,
      uploadedAt: new Date().toISOString(),
      version: 1,
      syncedWithCloud: false,
    };

    saveDocument(newDoc);
    const student = students.find((s) => s.id === docData.studentId);

    addAuditLog(
      'UPLOAD_DOC',
      `Mengunggah dokumen ${docData.title} (${docData.fileName})`,
      docData.studentId,
      student?.name
    );

    refreshAllData();
    broadcastLocalChange();

    // Simpan instan dokumen langsung ke MySQL Hosting Rumahweb
    saveDocumentToHosting(newDoc)
      .then((res) => {
        if (res.success) {
          setSyncStatus('connected');
        }
        syncToCloudIfEnabled();
      })
      .catch(() => {
        syncToCloudIfEnabled();
      });

    showToast(`Dokumen "${docData.title}" berhasil diarsipkan & disinkronkan ke cloud.`);
  };

  const handleDeleteDocument = (
    docId: string,
    docTitle: string,
    studentId?: string,
    docType?: DocumentType
  ) => {
    if (window.confirm(`Hapus berkas dokumen "${docTitle}"?`)) {
      const doc = documents.find((d) => d.id === docId);
      const targetStudentId = studentId || doc?.studentId;
      const targetDocType = docType || doc?.docType;
      const student = targetStudentId ? students.find((s) => s.id === targetStudentId) : undefined;

      // 1. Delete from local storage & record tombstones
      deleteDocument(docId, targetStudentId, targetDocType);

      // 2. Immediately update state so UI instantly disappears
      refreshAllData();
      broadcastLocalChange();

      if (
        previewDoc &&
        (previewDoc.id === docId ||
          (targetStudentId &&
            targetDocType &&
            previewDoc.studentId === targetStudentId &&
            (previewDoc.docType || '').toLowerCase() === targetDocType.toLowerCase()))
      ) {
        setPreviewDoc(null);
      }

      addAuditLog('DELETE_DOC', `Menghapus berkas dokumen: ${docTitle}`, targetStudentId, student?.name);
      showToast('Dokumen berhasil dihapus dari arsip & cloud.', 'error');

      // 3. Delete directly from MySQL hosting with studentId and docType to prevent resurrection
      deleteDocumentFromHosting(docId, targetStudentId, targetDocType)
        .then(() => {
          syncToCloudIfEnabled();
        })
        .catch((err) => {
          console.warn('Failed to delete doc from cloud hosting:', err);
          syncToCloudIfEnabled();
        });
    }
  };

  const handleVerifyDocument = (docId: string, status: VerificationStatus, notes?: string) => {
    const updated = verifyDocument(docId, status, notes);
    if (updated) {
      const student = students.find((s) => s.id === updated.studentId);
      const statusLabel =
        status === 'verified' ? 'Sah / Valid' : status === 'revision' ? 'Perlu Revisi' : 'Menunggu';

      addAuditLog(
        'VERIFY_DOC',
        `Memverifikasi ${updated.title} -> Status: ${statusLabel}. Catatan: "${notes || '-'}"`,
        updated.studentId,
        student?.name
      );

      refreshAllData();

      // Perbarui status verifikasi di MySQL Hosting
      saveDocumentToHosting(updated).catch(() => {});
      syncToCloudIfEnabled();
      showToast(`Status dokumen diubah menjadi: ${statusLabel}`);
    }
  };

  const handleSaveUser = async (user: User) => {
    const isExisting = users.some((u) => u.id === user.id);
    const config = getSyncConfig();

    if (config.apiUrl) {
      try {
        const res = await saveUserToHosting(user);
        if (res.success) {
          // DATABASE SERVER IS SINGLE SOURCE OF TRUTH: Refetch users from server immediately
          const serverUsers = await pullUsersFromHosting();
          if (serverUsers && Array.isArray(serverUsers) && serverUsers.length > 0) {
            setUsers(serverUsers);
            setServerUsers(serverUsers);
          } else {
            saveUser(user, true);
            setUsers(getUsers());
          }
        } else {
          saveUser(user, true);
          setUsers(getUsers());
          if (res.message?.includes('Aksi tidak dikenal')) {
            showToast('Catatan: File api.php di cPanel belum diperbarui untuk multi-petugas. Silakan unduh api.php terbaru di menu Sinkronisasi Cloud.', 'error');
          }
        }
      } catch {
        saveUser(user, true);
        setUsers(getUsers());
      }
    } else {
      saveUser(user, true);
      setUsers(getUsers());
    }

    if (currentUser.id === user.id) {
      setCurrentUser(user);
      setCurrentUserState(user);
    }

    addAuditLog(
      isExisting ? 'UPDATE_USER' : 'CREATE_USER',
      isExisting
        ? `Memperbarui akun petugas / kata sandi: ${user.name} (${user.role})`
        : `Menambahkan akun petugas baru: ${user.name} (${user.role})`
    );
    refreshAllData();
    broadcastLocalChange();

    showToast(
      isExisting
        ? `Profil & kata sandi ${user.name} berhasil diperbarui di database server.`
        : `Petugas baru "${user.name}" (@${user.username}) berhasil disimpan di database server.`,
      'success'
    );
  };

  const handleDeleteUser = async (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target) return;
    const config = getSyncConfig();

    if (config.apiUrl) {
      try {
        const res = await deleteUserFromHosting(userId, target.username);
        // Record deleted user locally as well
        deleteUser(userId);

        // Immediately fetch fresh users from server to ensure database state is reflected accurately
        const serverUsers = await pullUsersFromHosting();
        if (serverUsers && Array.isArray(serverUsers) && serverUsers.length > 0) {
          setUsers(serverUsers);
          setServerUsers(serverUsers);
        } else {
          setUsers(getUsers());
        }
      } catch {
        deleteUser(userId);
        setUsers(getUsers());
      }
    } else {
      deleteUser(userId);
      setUsers(getUsers());
    }

    addAuditLog('DELETE_USER', `Menghapus akun petugas: ${target.name} (@${target.username})`);
    refreshAllData();
    broadcastLocalChange();
    showToast(`Akun petugas ${target.name} (@${target.username}) berhasil dihapus permanen dari server.`, 'success');
  };

  // Document Preview Open
  const handleOpenPreview = (doc: StudentDocument, student?: Student) => {
    setPreviewDoc(doc);
    setPreviewStudent(student || students.find((s) => s.id === doc.studentId));
  };

  const pendingCount = documents.filter((d) => d.verificationStatus === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-blue-100 selection:text-blue-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-90 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div
            className={`px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2.5 text-xs sm:text-sm font-bold ${
              toastMessage.type === 'success'
                ? 'bg-slate-900 text-white border-slate-700'
                : 'bg-rose-900 text-white border-rose-700'
            }`}
          >
            {toastMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* If user is not authenticated, display the dedicated Login Portal */}
      {!isAuthenticated ? (
        <LoginView onLoginSuccess={handleLoginSuccess} noticeMessage={autoLogoutNotice} />
      ) : (
        <div className="min-h-screen bg-slate-50 flex flex-col">
          {/* Sidebar Navigation on the Left */}
          <Sidebar
            currentView={currentView}
            onSelectView={(view) => setCurrentView(view)}
            currentUser={currentUser}
            onLogoutClick={handleLogout}
            onEditProfileClick={() => setIsEditProfileOpen(true)}
            onManageAcademicYears={() => setIsManageYearsOpen(true)}
            onOpenRumahwebSync={() => setIsRumahwebSyncOpen(true)}
            isOpen={isMobileSidebarOpen}
            onClose={() => setIsMobileSidebarOpen(false)}
            studentsCount={students.length}
            documentsCount={documents.length}
          />

          {/* Main Content Area (Offset by lg:pl-72 to accommodate fixed sidebar) */}
          <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-200">
            {/* Top Navbar */}
            <Navbar
              currentUser={currentUser}
              onLogoutClick={handleLogout}
              onEditProfileClick={() => setIsEditProfileOpen(true)}
              onOpenRumahwebSync={() => setIsRumahwebSyncOpen(true)}
              onForceSync={handleManualSync}
              isSyncing={isLiveSyncing}
              syncStatus={syncStatus}
              onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
              currentView={currentView}
              students={students}
              documents={documents}
            />

            {/* View Content */}
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {currentView === 'dashboard' && (
                <DashboardOverview
                  students={students}
                  documents={documents}
                  onOpenStudentDossier={(std) => {
                    setSelectedStudentForDossier(std);
                    syncToCloudIfEnabled();
                  }}
                  onAddNewStudent={() => setStudentFormModal({ isOpen: true, student: null })}
                  onNavigate={(view) => setCurrentView(view === 'verifikasi' ? 'dashboard' : view)}
                />
              )}

              {currentView === 'students' && (
                <StudentList
                  students={students}
                  documents={documents}
                  onOpenDossier={(std) => {
                    setSelectedStudentForDossier(std);
                    syncToCloudIfEnabled();
                  }}
                  onAddNewStudent={() => setStudentFormModal({ isOpen: true, student: null })}
                  onOpenImportExcel={() => setIsImportExcelOpen(true)}
                  onEditStudent={(std) => setStudentFormModal({ isOpen: true, student: std })}
                  onDeleteStudent={handleDeleteStudent}
                  currentUserRole={currentUser.role}
                  academicYears={academicYears}
                  onYearsUpdated={(updated) => setAcademicYears(updated)}
                />
              )}

              {currentView === 'logs' && <AuditLogsView logs={logs} />}

              {currentView === 'users' && (
                <UserManagementView
                  users={users}
                  onSaveUser={handleSaveUser}
                  onDeleteUser={handleDeleteUser}
                  currentUser={currentUser}
                  onRefreshUsers={() => fetchUsersFromServer(false)}
                  isRefreshing={isRefreshingUsers}
                />
              )}

              {currentView === 'backup' && (
                <BackupSecurityView
                  students={students}
                  documents={documents}
                  onDataRefreshed={refreshAllData}
                  onOpenRumahwebSync={() => setIsRumahwebSyncOpen(true)}
                />
              )}
            </main>

            {/* Footer */}
            <footer className="mt-auto py-5 bg-white border-t border-slate-200 text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">SMP &amp; SMK Al-Tafaqquh Fiddin</span>
                  <span>•</span>
                  <span>Sistem Arsip Dokumen Siswa</span>
                </div>
                <div className="text-slate-400">
                  Penyimpanan terpusat: KK, KTP, Akta Kelahiran, Ijazah, KIP &amp; Dokumen Siswa
                </div>
              </div>
            </footer>
          </div>

          {/* Student Dossier Modal */}
          {selectedStudentForDossier && (
            <StudentDossierModal
              student={selectedStudentForDossier}
              documents={documents}
              onClose={() => setSelectedStudentForDossier(null)}
              onUploadDocument={handleUploadDocument}
              onDeleteDocument={handleDeleteDocument}
              onVerifyDocument={handleVerifyDocument}
              onPreviewDocument={(doc) => handleOpenPreview(doc, selectedStudentForDossier)}
              currentUser={currentUser}
            />
          )}

          {/* Document Preview Modal */}
          {previewDoc && (
            <DocumentPreviewModal
              document={previewDoc}
              student={previewStudent}
              onClose={() => setPreviewDoc(null)}
              onVerify={handleVerifyDocument}
              currentUserRole={currentUser.role}
            />
          )}

          {/* Student Form Modal (Add / Edit) */}
          <StudentFormModal
            isOpen={studentFormModal.isOpen}
            student={studentFormModal.student}
            onClose={() => setStudentFormModal({ isOpen: false, student: null })}
            onSave={handleSaveStudent}
            onYearsUpdated={(updated) => {
              setAcademicYears(updated);
              syncToCloudIfEnabled();
            }}
            onOpenImportExcel={() => setIsImportExcelOpen(true)}
          />

          {/* Bulk Import Excel Modal */}
          <ImportExcelModal
            isOpen={isImportExcelOpen}
            onClose={() => setIsImportExcelOpen(false)}
            onImportSuccess={handleBatchImportStudents}
            existingStudents={students}
          />

          {/* Manage Academic Years Modal */}
          <ManageAcademicYearsModal
            isOpen={isManageYearsOpen}
            onClose={() => setIsManageYearsOpen(false)}
            academicYears={academicYears}
            students={students}
            onYearsUpdated={(updated) => {
              setAcademicYears(updated);
              syncToCloudIfEnabled();
            }}
          />

          {/* Edit Current User Profile & Password Modal */}
          <EditUserModal
            isOpen={isEditProfileOpen}
            user={currentUser}
            onClose={() => setIsEditProfileOpen(false)}
            onSave={handleSaveUser}
          />

          {/* Rumahweb Cloud MySQL Sync Modal */}
          <RumahwebSyncModal
            isOpen={isRumahwebSyncOpen}
            onClose={() => setIsRumahwebSyncOpen(false)}
            students={students}
            documents={documents}
            academicYears={academicYears}
            logs={logs}
            onDataSynced={refreshAllData}
            onToast={showToast}
          />
        </div>
      )}
    </div>
  );
}
