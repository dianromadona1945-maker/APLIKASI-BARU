import { Student, StudentDocument, AuditLog, User, CompletenessStats, DocumentType, VerificationStatus, InstitutionLevel } from '../types';
import { INITIAL_USERS, DEFAULT_ACADEMIC_YEARS } from '../data/constants';
import { generateSampleDocumentDataUrl } from '../utils/documentGenerator';

const STORAGE_KEYS = {
  STUDENTS: 'arsip_siswa_data_v2',
  DOCUMENTS: 'arsip_dokumen_data_v1',
  LOGS: 'arsip_log_data_v1',
  USERS: 'arsip_users_data_v1',
  CURRENT_USER: 'arsip_current_user_v1',
  INITIALIZED: 'arsip_initialized_v3',
  IS_AUTHENTICATED: 'arsip_auth_state_v1',
  ACADEMIC_YEARS: 'arsip_academic_years_v3',
  DELETED_STUDENT_IDS: 'arsip_deleted_student_ids_v1',
  DELETED_DOC_IDS: 'arsip_deleted_doc_ids_v1',
  DELETED_DOC_KEYS: 'arsip_deleted_doc_keys_v1',
};

// Tombstone tracking for deleted students across devices
export function getDeletedStudentIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_STUDENT_IDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordDeletedStudentId(studentId: string): void {
  try {
    const list = getDeletedStudentIds();
    if (!list.includes(studentId)) {
      list.push(studentId);
      // Keep up to 1000 IDs
      localStorage.setItem(STORAGE_KEYS.DELETED_STUDENT_IDS, JSON.stringify(list.slice(-1000)));
    }
  } catch {}
}

export function removeDeletedStudentId(studentId: string): void {
  try {
    const list = getDeletedStudentIds().filter((id) => id !== studentId);
    localStorage.setItem(STORAGE_KEYS.DELETED_STUDENT_IDS, JSON.stringify(list));
  } catch {}
}

export function markStudentsAsSynced(studentIds: string[]): void {
  try {
    const idSet = new Set(studentIds);
    const students = getStudents();
    let changed = false;
    const updated = students.map((s) => {
      if (idSet.has(s.id) && !s.syncedWithCloud) {
        changed = true;
        return { ...s, syncedWithCloud: true };
      }
      return s;
    });
    if (changed) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));
    }
  } catch {}
}

// Tombstone tracking for deleted documents across devices
export function getDeletedDocIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_DOC_IDS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordDeletedDocId(docId: string): void {
  try {
    const list = getDeletedDocIds();
    if (!list.includes(docId)) {
      list.push(docId);
      localStorage.setItem(STORAGE_KEYS.DELETED_DOC_IDS, JSON.stringify(list.slice(-1000)));
    }
  } catch {}
}

export function removeDeletedDocId(docId: string): void {
  try {
    const list = getDeletedDocIds().filter((id) => id !== docId);
    localStorage.setItem(STORAGE_KEYS.DELETED_DOC_IDS, JSON.stringify(list));
  } catch {}
}

// Additional tombstone by studentId:docType so deleted documents never resurrect even if ID differs
export function getDeletedDocKeys(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DELETED_DOC_KEYS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordDeletedDocKey(studentId: string, docType: string): void {
  try {
    const key = `${studentId}:${docType.toLowerCase()}`;
    const list = getDeletedDocKeys();
    if (!list.includes(key)) {
      list.push(key);
      localStorage.setItem(STORAGE_KEYS.DELETED_DOC_KEYS, JSON.stringify(list.slice(-1000)));
    }
  } catch {}
}

export function removeDeletedDocKey(studentId: string, docType: string): void {
  try {
    const key = `${studentId}:${docType.toLowerCase()}`;
    const list = getDeletedDocKeys().filter((k) => k !== key);
    localStorage.setItem(STORAGE_KEYS.DELETED_DOC_KEYS, JSON.stringify(list));
  } catch {}
}

export function markDocumentsAsSynced(docIds: string[]): void {
  try {
    const idSet = new Set(docIds);
    const docs = getDocuments();
    let changed = false;
    const updated = docs.map((d) => {
      if (idSet.has(d.id) && !d.syncedWithCloud) {
        changed = true;
        return { ...d, syncedWithCloud: true };
      }
      return sDoc(d);
    });
    if (changed) {
      localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
    }
  } catch {}
}

function sDoc(d: StudentDocument): StudentDocument {
  return d;
}

// Helper: parse institution from string (SD, SMP, or SMK)
export function parseInstitution(str?: string, defaultInst: InstitutionLevel = 'SMP'): InstitutionLevel {
  if (!str) return defaultInst;
  const upper = str.toUpperCase().trim();
  if (upper.startsWith('SD -') || upper.startsWith('SD-') || upper.startsWith('SD ') || upper === 'SD' || upper.includes('[SD]')) return 'SD';
  if (upper.startsWith('SMK -') || upper.startsWith('SMK-') || upper.startsWith('SMK ') || upper === 'SMK' || upper.includes('[SMK]')) return 'SMK';
  if (upper.startsWith('SMP -') || upper.startsWith('SMP-') || upper.startsWith('SMP ') || upper === 'SMP' || upper.includes('[SMP]')) return 'SMP';
  if (upper.includes('SD')) return 'SD';
  if (upper.includes('SMK')) return 'SMK';
  if (upper.includes('SMP')) return 'SMP';
  return defaultInst;
}

// Helper: normalize academic year format to "LEMBAGA - TAHUN/TAHUN" (e.g. "SMP - 2024/2025")
export function formatAcademicYear(institution: InstitutionLevel, rawYear: string): string {
  const match = rawYear.match(/(\d{4}\/\d{4})/);
  const yearCycle = match ? match[1] : rawYear.replace(/^(SD|SMP|SMK)\s*[-:]*\s*/i, '').trim();
  return `${institution} - ${yearCycle}`;
}

// Helper: extract cycle like "2024/2025" from "SMP - 2024/2025"
export function extractYearCycle(academicYearString: string): string {
  const match = academicYearString.match(/(\d{4}\/\d{4})/);
  return match ? match[1] : academicYearString;
}

// Known legacy demo student IDs and names to permanently purge and never resurrect
export const DEMO_STUDENT_IDS = ['std-001', 'std-002', 'std-003', 'std-004', 'std-005', 'std-006'];
export const DEMO_STUDENT_NAMES = [
  'Ahmad Faiz Zulkarnain',
  'Nadia Salsabila Putri',
  'Muhammad Rizky Pratama',
  'Siti Rahma Azzahra',
  'Dimas Aditya Nugroho',
  'Clara Anindya Putri',
];

export function isDemoStudent(student: { id?: string; name?: string }): boolean {
  if (!student) return false;
  if (student.id && DEMO_STUDENT_IDS.includes(student.id)) return true;
  if (student.name && DEMO_STUDENT_NAMES.some((dn) => dn.toLowerCase().trim() === (student.name || '').toLowerCase().trim())) {
    return true;
  }
  return false;
}

export function isDemoDocument(doc: { id?: string; studentId?: string; fileType?: string; fileDataUrl?: string }): boolean {
  if (!doc) return false;
  if (doc.id && (doc.id.startsWith('doc-std-00') || DEMO_STUDENT_IDS.some((sid) => doc.id!.includes(sid)))) {
    return true;
  }
  if (doc.studentId && DEMO_STUDENT_IDS.includes(doc.studentId)) {
    return true;
  }
  if (
    doc.fileType === 'image/svg+xml' &&
    doc.fileDataUrl &&
    (doc.fileDataUrl.includes('Ahmad Faiz') ||
      doc.fileDataUrl.includes('Nadia Salsabila') ||
      doc.fileDataUrl.includes('Siti Rahma') ||
      doc.fileDataUrl.includes('Clara Anindya') ||
      doc.fileDataUrl.includes('sample-doc-watermark'))
  ) {
    return true;
  }
  return false;
}

/**
 * Permanently purges any initial demo students (std-001..006) and dummy SVG documents
 * from localStorage and records tombstones so they are deleted from MySQL cloud and never reappear.
 */
export function purgeLegacyDemoData(): { deletedStudents: number; deletedDocs: number } {
  if (typeof window === 'undefined') return { deletedStudents: 0, deletedDocs: 0 };

  let rawStudents: Student[] = [];
  try {
    const sStr = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (sStr) rawStudents = JSON.parse(sStr);
  } catch {}

  let rawDocs: StudentDocument[] = [];
  try {
    const dStr = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (dStr) rawDocs = JSON.parse(dStr);
  } catch {}

  const demoStudentIds = new Set<string>(DEMO_STUDENT_IDS);
  const toDeleteStudentIds = new Set<string>();

  rawStudents.forEach((s) => {
    if (isDemoStudent(s)) {
      toDeleteStudentIds.add(s.id);
      demoStudentIds.add(s.id);
      recordDeletedStudentId(s.id);
    }
  });

  // Always blacklist all 6 demo IDs
  DEMO_STUDENT_IDS.forEach((id) => recordDeletedStudentId(id));

  const keptStudents = rawStudents.filter((s) => !toDeleteStudentIds.has(s.id) && !isDemoStudent(s));
  const deletedStudents = rawStudents.length - keptStudents.length;

  const toDeleteDocIds = new Set<string>();
  rawDocs.forEach((d) => {
    if (isDemoDocument(d) || toDeleteStudentIds.has(d.studentId) || demoStudentIds.has(d.studentId)) {
      toDeleteDocIds.add(d.id);
      recordDeletedDocId(d.id);
      if (d.studentId && d.docType) {
        recordDeletedDocKey(d.studentId, d.docType);
      }
    }
  });

  const keptDocs = rawDocs.filter(
    (d) => !toDeleteDocIds.has(d.id) && !isDemoDocument(d) && !toDeleteStudentIds.has(d.studentId)
  );
  const deletedDocs = rawDocs.length - keptDocs.length;

  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(keptStudents));
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(keptDocs));
  localStorage.setItem('arsip_demo_purged_permanently_v2', 'true');

  // Also clean demo audit logs
  try {
    const lStr = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (lStr) {
      const logs: AuditLog[] = JSON.parse(lStr);
      const cleanLogs = logs.filter(
        (l) => !['log-001', 'log-002', 'log-003'].includes(l.id) && (!l.studentId || !demoStudentIds.has(l.studentId))
      );
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(cleanLogs));
    }
  } catch {}

  return { deletedStudents, deletedDocs };
}

/**
 * Completely wipe ALL students and documents from localStorage and record tombstones
 * so cloud MySQL is also cleared upon sync.
 */
export function wipeAllData(): void {
  if (typeof window === 'undefined') return;

  let allStudents: Student[] = [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (raw) allStudents = JSON.parse(raw);
  } catch {}

  let allDocs: StudentDocument[] = [];
  try {
    const rawD = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (rawD) allDocs = JSON.parse(rawD);
  } catch {}

  allStudents.forEach((s) => recordDeletedStudentId(s.id));
  allDocs.forEach((d) => {
    recordDeletedDocId(d.id);
    if (d.studentId && d.docType) {
      recordDeletedDocKey(d.studentId, d.docType);
    }
  });

  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify([]));

  const wipeLog: AuditLog = {
    id: `log-wipe-${Date.now()}`,
    timestamp: new Date().toISOString(),
    action: 'DELETE_STUDENT',
    userId: 'admin',
    userName: 'Administrator',
    userRole: 'admin',
    details: `Seluruh data siswa (${allStudents.length} siswa) dan arsip dokumen (${allDocs.length} berkas) telah dikosongkan.`,
  };
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([wipeLog]));
  localStorage.setItem('arsip_demo_purged_permanently_v2', 'true');
}

// Initialize default data cleanly with ZERO fake demo students/documents
export function initializeStorage(): void {
  if (typeof window === 'undefined') return;

  // Always purge legacy demo data on any startup or tab load
  const isPurged = localStorage.getItem('arsip_demo_purged_permanently_v2');
  if (!isPurged) {
    purgeLegacyDemoData();
  }

  const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!isInitialized) {
    // Seed users
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));

    // CLEAN INITIAL STATE: Start with 0 students and 0 documents!
    // NEVER seed demo students or sample SVG files on new laptops/browsers!
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEARS, JSON.stringify(DEFAULT_ACADEMIC_YEARS));
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify([]));

    // Ensure all demo student IDs are tombstoned from day 1
    DEMO_STUDENT_IDS.forEach((id) => recordDeletedStudentId(id));

    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    localStorage.setItem('arsip_demo_purged_permanently_v2', 'true');
  }
}

function getDocumentTitle(type: DocumentType, studentName: string): string {
  switch (type) {
    case 'kk':
      return `Kartu Keluarga - ${studentName}`;
    case 'ktp':
      return `KTP Siswa / Wali - ${studentName}`;
    case 'akta':
      return `Akta Kelahiran - ${studentName}`;
    case 'ijazah':
      return `Ijazah Kelulusan - ${studentName}`;
    case 'kip':
      return `Kartu Indonesia Pintar (KIP) - ${studentName}`;
    case 'lainnya':
      return `Piagam Prestasi / Berkas - ${studentName}`;
    default:
      return `Dokumen - ${studentName}`;
  }
}

// Student operations
export function getStudents(): Student[] {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
  if (!raw) return [];
  try {
    const list: any[] = JSON.parse(raw);
    let modified = false;

    // First pass: migrate institution and academic year format
    const migrated: Student[] = list.map((s, index) => {
      // Clean Excel leading apostrophes if any
      const cleanNis = String(s.nis || '').replace(/^['\s]+|['\s]+$/g, '').trim();
      const cleanNisn = String(s.nisn || '').replace(/^['\s]+|['\s]+$/g, '').trim();
      const cleanNik = String(s.nik || '').replace(/^['\s]+|['\s]+$/g, '').trim();
      const cleanPhone = String(s.parentPhone || '').replace(/^['\s]+|['\s]+$/g, '').trim();

      if (cleanNis !== s.nis || cleanNisn !== s.nisn || cleanNik !== s.nik || cleanPhone !== s.parentPhone) {
        modified = true;
      }

      // Determine institution: SD, SMP, or SMK
      let inst: InstitutionLevel = s.institution;
      if (!inst || (inst !== 'SD' && inst !== 'SMP' && inst !== 'SMK')) {
        if (s.classRoom) inst = parseInstitution(s.classRoom, index < 2 ? 'SD' : index < 4 ? 'SMP' : 'SMK');
        else if (s.academicYear) inst = parseInstitution(s.academicYear, index < 2 ? 'SD' : index < 4 ? 'SMP' : 'SMK');
        else inst = index < 2 ? 'SD' : index < 4 ? 'SMP' : 'SMK';
        modified = true;
      }

      // Format academicYear and classRoom to include the institution tag
      const rawYr = s.academicYear || s.classRoom || '2025/2026';
      const formattedYear = formatAcademicYear(inst, rawYr);

      if (s.institution !== inst || s.academicYear !== formattedYear || s.classRoom !== formattedYear) {
        modified = true;
      }

      return {
        ...s,
        nis: cleanNis,
        nisn: cleanNisn,
        nik: cleanNik,
        parentPhone: cleanPhone,
        institution: inst,
        classRoom: formattedYear,
        academicYear: formattedYear,
      } as Student;
    });

    // Second pass: remove duplicate students & guarantee 100% unique IDs
    const seenNis = new Set<string>();
    const seenNisn = new Set<string>();
    const seenNik = new Set<string>();
    const seenNameBirth = new Set<string>();
    const seenIds = new Set<string>();
    const deduplicated: Student[] = [];

    for (let i = 0; i < migrated.length; i++) {
      const s = migrated[i];
      const nisKey = s.nis ? s.nis.toLowerCase().trim() : '';
      const nisnKey = s.nisn ? s.nisn.toLowerCase().trim() : '';
      const nikKey = s.nik ? s.nik.trim() : '';
      const nameBirthKey = `${(s.name || '').trim().toLowerCase()}_${(s.birthDate || '').trim().toLowerCase()}`;

      let isDuplicate = false;
      if (nisKey && nisKey !== '-' && nisKey !== '0' && seenNis.has(nisKey)) {
        isDuplicate = true;
      } else if (nisnKey && nisnKey !== '-' && nisnKey !== '0' && seenNisn.has(nisnKey)) {
        isDuplicate = true;
      } else if (nikKey && nikKey.length >= 10 && seenNik.has(nikKey)) {
        isDuplicate = true;
      } else if (s.name && s.name.trim().length > 3 && seenNameBirth.has(nameBirthKey) && (s.classRoom === deduplicated.find(d => `${(d.name || '').trim().toLowerCase()}_${(d.birthDate || '').trim().toLowerCase()}` === nameBirthKey)?.classRoom)) {
        isDuplicate = true;
      }

      if (isDuplicate) {
        modified = true;
        continue;
      }

      if (nisKey && nisKey !== '-' && nisKey !== '0') seenNis.add(nisKey);
      if (nisnKey && nisnKey !== '-' && nisnKey !== '0') seenNisn.add(nisnKey);
      if (nikKey && nikKey.length >= 10) seenNik.add(nikKey);
      if (s.name && s.name.trim().length > 3) seenNameBirth.add(nameBirthKey);

      // Ensure guaranteed unique ID
      let finalId = s.id;
      if (!finalId || seenIds.has(finalId)) {
        finalId = `std-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${i}`;
        modified = true;
      }
      seenIds.add(finalId);

      deduplicated.push({
        ...s,
        id: finalId,
      });
    }

    if (modified || deduplicated.length !== list.length) {
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(deduplicated));
    }
    return deduplicated;
  } catch {
    return [];
  }
}

export function saveStudent(studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Student {
  const students = getStudents();
  const now = new Date().toISOString();
  let savedStudent: Student;

  const institution: InstitutionLevel =
    studentData.institution || parseInstitution(studentData.classRoom || studentData.academicYear, 'SMP');
  const formattedYear = formatAcademicYear(
    institution,
    studentData.academicYear || studentData.classRoom || '2025/2026'
  );

  const cleanData = {
    ...studentData,
    nis: String(studentData.nis || '').replace(/^['\s]+|['\s]+$/g, '').trim(),
    nisn: String(studentData.nisn || '').replace(/^['\s]+|['\s]+$/g, '').trim(),
    nik: String(studentData.nik || '').replace(/^['\s]+|['\s]+$/g, '').trim(),
    parentPhone: String(studentData.parentPhone || '').replace(/^['\s]+|['\s]+$/g, '').trim(),
    institution,
    classRoom: formattedYear,
    academicYear: formattedYear,
  };

  if (studentData.id) {
    // Update
    removeDeletedStudentId(studentData.id);
    const idx = students.findIndex((s) => s.id === studentData.id);
    if (idx !== -1) {
      savedStudent = {
        ...students[idx],
        ...cleanData,
        id: studentData.id,
        updatedAt: now,
        syncedWithCloud: false,
      };
      students[idx] = savedStudent;
    } else {
      savedStudent = {
        ...cleanData,
        id: studentData.id,
        createdAt: now,
        updatedAt: now,
        syncedWithCloud: false,
      };
      students.unshift(savedStudent);
    }
  } else {
    // Create with guaranteed unique ID
    const newId = `std-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    removeDeletedStudentId(newId);
    savedStudent = {
      ...cleanData,
      id: newId,
      createdAt: now,
      updatedAt: now,
      syncedWithCloud: false,
    };
    students.unshift(savedStudent);
  }

  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  return savedStudent;
}

export function saveStudentsBatch(
  newStudents: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }>,
  mode: 'skip_existing' | 'update_existing' = 'update_existing'
): { addedCount: number; updatedCount: number; totalProcessed: number } {
  const students = getStudents();
  const now = new Date().toISOString();
  let addedCount = 0;
  let updatedCount = 0;

  for (let idx = 0; idx < newStudents.length; idx++) {
    const item = newStudents[idx];
    const institution: InstitutionLevel =
      item.institution || parseInstitution(item.classRoom || item.academicYear, 'SMP');
    const formattedYear = formatAcademicYear(
      institution,
      item.academicYear || item.classRoom || '2025/2026'
    );

    const cleanNis = String(item.nis || '').replace(/^['\s]+|['\s]+$/g, '').trim();
    const cleanNisn = String(item.nisn || '').replace(/^['\s]+|['\s]+$/g, '').trim();
    const cleanNik = String(item.nik || '').replace(/^['\s]+|['\s]+$/g, '').trim();
    const cleanPhone = String(item.parentPhone || '').replace(/^['\s]+|['\s]+$/g, '').trim();

    const cleanData = {
      ...item,
      nis: cleanNis,
      nisn: cleanNisn,
      nik: cleanNik,
      parentPhone: cleanPhone,
      institution,
      classRoom: formattedYear,
      academicYear: formattedYear,
    };

    // Check if student with same NIS, NISN, NIK, or id already exists
    const existingIndex = students.findIndex((s) => {
      if (item.id && s.id === item.id) return true;
      if (cleanNis && cleanNis !== '-' && cleanNis !== '0' && s.nis && s.nis.trim() === cleanNis) return true;
      if (cleanNisn && cleanNisn !== '-' && cleanNisn !== '0' && s.nisn && s.nisn.trim() === cleanNisn) return true;
      if (cleanNik && cleanNik.length >= 10 && s.nik && s.nik.trim() === cleanNik) return true;
      return false;
    });

    if (existingIndex !== -1) {
      if (mode === 'update_existing') {
        const existingId = students[existingIndex].id;
        removeDeletedStudentId(existingId);
        students[existingIndex] = {
          ...students[existingIndex],
          ...cleanData,
          updatedAt: now,
          syncedWithCloud: false,
        };
        updatedCount++;
      }
      // If skip_existing, simply do not add duplicate
    } else {
      const newId = `std-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${idx}`;
      removeDeletedStudentId(newId);
      students.unshift({
        ...cleanData,
        id: newId,
        createdAt: now,
        updatedAt: now,
        syncedWithCloud: false,
      });
      addedCount++;
    }
  }

  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  return { addedCount, updatedCount, totalProcessed: newStudents.length };
}

export function deleteStudent(studentId: string): void {
  recordDeletedStudentId(studentId);
  const students = getStudents();
  const updated = students.filter((s) => s.id !== studentId);
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));

  // Also remove documents and track their tombstones
  const docs = getDocuments();
  docs.filter((d) => d.studentId === studentId).forEach((d) => {
    recordDeletedDocId(d.id);
    if (d.docType) recordDeletedDocKey(studentId, d.docType);
  });
  const updatedDocs = docs.filter((d) => d.studentId !== studentId);
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updatedDocs));
}

// Document operations
export function getDocuments(studentId?: string): StudentDocument[] {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
  const allDocs: StudentDocument[] = raw ? JSON.parse(raw) : [];
  if (studentId) {
    return allDocs.filter((d) => d.studentId === studentId);
  }
  return allDocs;
}

export function saveDocument(doc: StudentDocument): StudentDocument {
  const docs = getDocuments();
  removeDeletedDocId(doc.id);
  if (doc.studentId && doc.docType) {
    removeDeletedDocKey(doc.studentId, doc.docType);
  }
  const docWithSync: StudentDocument = {
    ...doc,
    verificationStatus: 'verified', // All uploaded docs are valid/terarsip by default (no separate verification needed)
    syncedWithCloud: false,
  };
  const idx = docs.findIndex((d) => d.id === doc.id || (doc.studentId && doc.docType && d.studentId === doc.studentId && d.docType === doc.docType));
  if (idx !== -1) {
    docs[idx] = docWithSync;
  } else {
    docs.unshift(docWithSync);
  }
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
  return docWithSync;
}

export function deleteDocument(docId: string, studentId?: string, docType?: DocumentType): void {
  const docs = getDocuments();
  const target = docs.find((d) => d.id === docId);
  const sId = studentId || target?.studentId;
  const dType = (docType || target?.docType)?.toLowerCase();

  recordDeletedDocId(docId);
  if (sId && dType) {
    recordDeletedDocKey(sId, dType);
  }

  const updated = docs.filter((d) => {
    if (d.id === docId) {
      recordDeletedDocId(d.id);
      return false;
    }
    if (sId && dType && d.studentId === sId && d.docType?.toLowerCase() === dType) {
      recordDeletedDocId(d.id);
      return false;
    }
    return true;
  });
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
}

export function verifyDocument(docId: string, status: VerificationStatus, notes?: string): StudentDocument | null {
  const docs = getDocuments();
  const doc = docs.find((d) => d.id === docId);
  if (doc) {
    doc.verificationStatus = status;
    if (notes !== undefined) doc.notes = notes;
    doc.syncedWithCloud = false;
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
    return doc;
  }
  return null;
}

// User operations
export function getUsers(): User[] {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.USERS);
  const rawUsers: User[] = raw ? JSON.parse(raw) : INITIAL_USERS;
  
  // Only retain admin and petugas_tu
  const validUsers = rawUsers.filter((u) => u.role === 'admin' || u.role === 'petugas_tu');
  let modified = validUsers.length !== rawUsers.length;

  const updatedUsers = validUsers.map((u) => {
    let item = { ...u };
    // Migrate old placeholder names if present
    if (item.role === 'admin' && (item.name.includes('Bambang') || item.nip === '198402152009031002')) {
      item.name = 'Dian Romadona, S.Pd.';
      item.nip = '';
      item.email = 'dian.romadona@sekolah.sch.id';
      modified = true;
    }
    if (item.role === 'petugas_tu' && (item.name.includes('Dewi') || item.nip === '199105182015022001')) {
      item.name = 'Mamat Miftahurrahmat, S.Pd.';
      item.nip = '';
      item.email = 'mamat.miftahurrahmat@sekolah.sch.id';
      modified = true;
    }
    if (!item.password) {
      modified = true;
      const defaultPass = item.role === 'admin' ? 'admin' : 'tu123';
      item.password = defaultPass;
    }
    return item;
  });

  if (modified) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updatedUsers));
    return updatedUsers;
  }
  return updatedUsers;
}

export function saveUser(user: User): void {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx !== -1) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

  // If current logged-in user is this user, keep current user in sync
  const current = getCurrentUser();
  if (current.id === user.id) {
    setCurrentUser(user);
  }
}

export function getCurrentUser(): User {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  if (!raw) return INITIAL_USERS[0];
  try {
    const user: User = JSON.parse(raw);
    if (user.role === 'admin' && user.name.includes('Bambang')) {
      const updated: User = { ...user, name: 'Dian Romadona, S.Pd.', nip: '', email: 'dian.romadona@sekolah.sch.id' };
      setCurrentUser(updated);
      return updated;
    }
    if (user.role === 'petugas_tu' && user.name.includes('Dewi')) {
      const updated: User = { ...user, name: 'Mamat Miftahurrahmat, S.Pd.', nip: '', email: 'mamat.miftahurrahmat@sekolah.sch.id' };
      setCurrentUser(updated);
      return updated;
    }
    return user;
  } catch {
    return INITIAL_USERS[0];
  }
}

export function setCurrentUser(user: User): void {
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
}

export function checkIsAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  initializeStorage();
  const authState = localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED);
  return authState === 'true';
}

export function setAuthenticated(status: boolean): void {
  localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, status ? 'true' : 'false');
}

export function loginUser(
  usernameInput: string,
  passwordInput: string
): { success: boolean; user?: User; error?: string } {
  const users = getUsers();
  const cleanUsername = usernameInput.trim().toLowerCase();
  const user = users.find(
    (u) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanUsername
  );

  if (!user) {
    return {
      success: false,
      error: `Username atau email "${usernameInput}" tidak terdaftar dalam sistem.`,
    };
  }

  // Check password strictly against user.password
  const expectedPass = user.password || (user.role === 'admin' ? 'admin' : 'tu123');
  const isPasswordValid = passwordInput === expectedPass;

  if (!isPasswordValid) {
    return {
      success: false,
      error: 'Kata sandi tidak sesuai. Silakan periksa kembali kata sandi Anda.',
    };
  }

  // Update last login
  const nowFormatted =
    new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ' ' +
    new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }) +
    ' WIB';

  user.lastLogin = nowFormatted;
  saveUser(user);
  setCurrentUser(user);
  setAuthenticated(true);

  addAuditLog(
    'LOGIN',
    `Login berhasil: ${user.name} (${user.role.toUpperCase()}) masuk ke sistem.`
  );

  return { success: true, user };
}

export function loginAsRole(role: User['role']): User {
  const users = getUsers();
  const user = users.find((u) => u.role === role) || users[0];
  const nowFormatted =
    new Date().toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }) +
    ' ' +
    new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }) +
    ' WIB';

  user.lastLogin = nowFormatted;
  saveUser(user);
  setCurrentUser(user);
  setAuthenticated(true);

  addAuditLog('LOGIN', `Login cepat sebagai ${role.toUpperCase()}: ${user.name}`);
  return user;
}

export function logoutUser(): void {
  const currentUser = getCurrentUser();
  addAuditLog('LOGOUT', `Pengguna ${currentUser.name} (${currentUser.role}) keluar dari sistem.`);
  setAuthenticated(false);
}

// Logs operations
export function getLogs(): AuditLog[] {
  initializeStorage();
  const raw = localStorage.getItem(STORAGE_KEYS.LOGS);
  return raw ? JSON.parse(raw) : [];
}

export function addAuditLog(
  action: AuditLog['action'],
  details: string,
  studentId?: string,
  studentName?: string
): void {
  const currentUser = getCurrentUser();
  const logs = getLogs();
  const newLog: AuditLog = {
    id: `log-${Date.now().toString().slice(-6)}`,
    timestamp: new Date().toISOString(),
    action,
    userId: currentUser.id,
    userName: currentUser.name,
    userRole: currentUser.role,
    studentId,
    studentName,
    details,
  };
  logs.unshift(newLog);
  // keep last 200 logs
  if (logs.length > 200) logs.pop();
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
}

// Completeness Calculator
export function calculateCompleteness(student: Student, documents: StudentDocument[]): CompletenessStats {
  const studentDocs = documents.filter((d) => d.studentId === student.id);
  const mandatoryTypes: DocumentType[] = ['kk', 'akta', 'ijazah'];
  
  const uploadedTypes = new Set(studentDocs.map((d) => d.docType));
  const mandatoryUploaded = mandatoryTypes.filter((t) => uploadedTypes.has(t)).length;
  
  const totalUploaded = studentDocs.length;
  const isComplete = mandatoryUploaded === mandatoryTypes.length;
  const percentage = Math.round((mandatoryUploaded / mandatoryTypes.length) * 100);

  let status: CompletenessStats['status'] = 'Belum Lengkap';
  if (totalUploaded === 0) {
    status = 'Kosong';
  } else if (isComplete) {
    status = 'Lengkap';
  }

  return {
    total: 5, // typical core suite
    uploaded: totalUploaded,
    mandatoryCount: mandatoryTypes.length,
    mandatoryUploaded,
    isComplete,
    percentage,
    status,
  };
}

// Backup & Restore
export function exportDatabaseBackup(): string {
  const backup = {
    appName: 'Sistem Arsip Dokumen Siswa SMP & SMK Al-Tafaqquh Fiddin',
    version: '1.2.0',
    exportDate: new Date().toISOString(),
    students: getStudents(),
    documents: getDocuments(),
    logs: getLogs(),
    users: getUsers(),
    academicYears: getAcademicYears(),
  };
  return JSON.stringify(backup, null, 2);
}

export function restoreDatabaseBackup(jsonString: string): { success: boolean; message: string; count?: number } {
  try {
    const data = JSON.parse(jsonString);
    if (!data.students || !data.documents) {
      return { success: false, message: 'Format data cadangan (backup) tidak valid.' };
    }

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(data.students));
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(data.documents));
    if (data.logs) localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(data.logs));
    if (data.users) localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(data.users));
    if (data.academicYears && Array.isArray(data.academicYears)) {
      localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEARS, JSON.stringify(data.academicYears));
    }

    return {
      success: true,
      message: `Berhasil memulihkan ${data.students.length} data siswa dan ${data.documents.length} dokumen.`,
      count: data.students.length,
    };
  } catch (err) {
    return { success: false, message: 'Gagal memproses file cadangan. Pastikan file berupa JSON yang valid.' };
  }
}

export interface SmartMergeResult {
  mergedStudents: Student[];
  studentsToPush: Student[];
  deletedToSync: string[];
  docsToPush: StudentDocument[];
  deletedDocsToSync: string[];
  localStudentsAddedOrUpdated: number;
  remoteStudentsAddedOrUpdated: number;
  localDocsAddedOrUpdated: number;
  remoteDocsAddedOrUpdated: number;
}

export function smartMergeRemoteData(data: {
  students: Student[];
  documents?: StudentDocument[];
  academicYears?: string[];
  logs?: AuditLog[];
}): SmartMergeResult {
  const localStudents = getStudents();
  const deletedIds = new Set(getDeletedStudentIds());

  const localMap = new Map<string, Student>();
  localStudents.forEach((s) => localMap.set(s.id, s));

  // Build secondary indexes by NISN and NIS to match records even if ID differed
  const localByNisn = new Map<string, Student>();
  const localByNis = new Map<string, Student>();
  localStudents.forEach((s) => {
    if (s.nisn && s.nisn.trim() && s.nisn !== '-' && s.nisn !== '0') {
      localByNisn.set(s.nisn.trim(), s);
    }
    if (s.nis && s.nis.trim() && s.nis !== '-' && s.nis !== '0') {
      localByNis.set(s.nis.trim(), s);
    }
  });

  const mergedMap = new Map<string, Student>();
  const studentsToPush: Student[] = [];
  const deletedToSync: string[] = [];

  let localStudentsAddedOrUpdated = 0;
  let remoteStudentsAddedOrUpdated = 0;

  const remoteList = Array.isArray(data.students) ? data.students : [];

  // 1. Process Remote Students
  for (const remote of remoteList) {
    if (!remote || !remote.id) continue;

    // If demo student or locally deleted on this laptop, do NOT resurrect it! Mark to delete on server
    if (isDemoStudent(remote) || deletedIds.has(remote.id)) {
      deletedToSync.push(remote.id);
      recordDeletedStudentId(remote.id);
      continue;
    }

    // Match with local student
    let local = localMap.get(remote.id);
    if (!local && remote.nisn && remote.nisn.trim() && remote.nisn !== '-') {
      local = localByNisn.get(remote.nisn.trim());
    }
    if (!local && remote.nis && remote.nis.trim() && remote.nis !== '-') {
      local = localByNis.get(remote.nis.trim());
    }

    if (local) {
      const lTime = new Date(local.updatedAt || local.createdAt || 0).getTime();
      const rTime = new Date(remote.updatedAt || remote.createdAt || 0).getTime();

      if (local.syncedWithCloud === false && lTime > rTime) {
        // Local has unsynced newer changes: keep local and mark to push
        mergedMap.set(local.id, local);
        studentsToPush.push(local);
        localStudentsAddedOrUpdated++;
      } else {
        // Remote is newer or equal: use remote and mark as synced
        mergedMap.set(local.id, {
          ...local,
          ...remote,
          id: local.id,
          syncedWithCloud: true,
        });
        if (rTime > lTime) {
          remoteStudentsAddedOrUpdated++;
        }
      }
      localMap.delete(local.id);
    } else {
      // Remote student does not exist locally -> add to local student list!
      mergedMap.set(remote.id, {
        ...remote,
        syncedWithCloud: true,
      });
      remoteStudentsAddedOrUpdated++;
    }
  }

  // 2. Process remaining Local Students that remote does NOT have
  for (const [id, local] of localMap.entries()) {
    // If demo student or deleted, do NOT keep it: mark for deletion on server
    if (isDemoStudent(local) || deletedIds.has(id)) {
      deletedToSync.push(id);
      recordDeletedStudentId(id);
      continue;
    }

    // If student was already confirmed synced with cloud in the past (syncedWithCloud === true)
    // but remoteList has students and is now missing this student, it was deleted on cloud by another device!
    if (local.syncedWithCloud === true && remoteList.length > 0) {
      recordDeletedStudentId(id);
      continue;
    }

    // Otherwise, this student was newly created or updated locally and NOT yet synced!
    // NEVER overwrite or delete it: keep it in merged and push to cloud!
    mergedMap.set(id, local);
    studentsToPush.push(local);
    localStudentsAddedOrUpdated++;
  }

  const finalStudents = Array.from(mergedMap.values());
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(finalStudents));

  // 3. Bidirectional Smart Merge for Documents
  const localDocs = getDocuments();
  const deletedDocIds = new Set(getDeletedDocIds());
  const deletedDocKeys = new Set(getDeletedDocKeys());
  const remoteDocs = Array.isArray(data.documents) ? data.documents : [];
  const docsToPush: StudentDocument[] = [];
  const deletedDocsToSync: string[] = [];
  let localDocsAddedOrUpdated = 0;
  let remoteDocsAddedOrUpdated = 0;

  const docMap = new Map<string, StudentDocument>();
  const localDocMap = new Map<string, StudentDocument>();
  const localDocByKey = new Map<string, StudentDocument>();
  localDocs.forEach((d) => {
    localDocMap.set(d.id, d);
    if (d.studentId && d.docType) {
      localDocByKey.set(`${d.studentId}:${d.docType.toLowerCase()}`, d);
    }
  });

  // 3a. Process Remote Documents
  for (const rawRDoc of remoteDocs) {
    if (!rawRDoc || !rawRDoc.id) continue;

    // Normalize fields from either camelCase or snake_case / PHP fallback
    const rDoc: StudentDocument = {
      id: rawRDoc.id,
      studentId: rawRDoc.studentId || (rawRDoc as any).student_id,
      docType: (rawRDoc.docType || (rawRDoc as any).type || 'lainnya').toLowerCase() as any,
      title: rawRDoc.title || (rawRDoc as any).file_name || 'Dokumen Siswa',
      fileName: rawRDoc.fileName || (rawRDoc as any).file_name || 'dokumen.pdf',
      fileType: rawRDoc.fileType || 'application/pdf',
      fileSize: Number(rawRDoc.fileSize || (rawRDoc as any).file_size || 0),
      fileDataUrl: rawRDoc.fileDataUrl || (rawRDoc as any).file_data || (rawRDoc as any).fileData || '',
      uploadedAt: rawRDoc.uploadedAt || (rawRDoc as any).upload_date || (rawRDoc as any).uploadDate || new Date().toISOString(),
      uploadedBy: rawRDoc.uploadedBy || (rawRDoc as any).verified_by || 'Petugas TU',
      verificationStatus: (['verified', 'pending', 'revision', 'unverified'].includes(rawRDoc.verificationStatus)
        ? rawRDoc.verificationStatus
        : (rawRDoc as any).status === 'Terverifikasi'
        ? 'verified'
        : (rawRDoc as any).status === 'Perlu Revisi'
        ? 'revision'
        : 'pending') as any,
      notes: rawRDoc.notes || '',
      version: rawRDoc.version || 1,
      syncedWithCloud: true,
    };

    // If demo doc, or student was deleted or demo student, or does not exist, do NOT resurrect document!
    if (
      isDemoDocument(rDoc) ||
      DEMO_STUDENT_IDS.includes(rDoc.studentId) ||
      deletedIds.has(rDoc.studentId) ||
      deletedDocIds.has(rDoc.id) ||
      deletedDocKeys.has(`${rDoc.studentId}:${(rDoc.docType || '').toLowerCase()}`) ||
      !mergedMap.has(rDoc.studentId)
    ) {
      deletedDocsToSync.push(rDoc.id);
      recordDeletedDocId(rDoc.id);
      continue;
    }

    // Remote document exists and belongs to an active student!
    // Clear any local tombstone so this document is fully recognized and never deleted by this laptop
    removeDeletedDocId(rDoc.id);
    if (rDoc.docType) {
      removeDeletedDocKey(rDoc.studentId, rDoc.docType);
    }

    const docKey = `${rDoc.studentId}:${(rDoc.docType || '').toLowerCase()}`;
    const lDoc = localDocMap.get(rDoc.id) || localDocByKey.get(docKey);
    if (lDoc) {
      const lTime = new Date(lDoc.uploadedAt || 0).getTime();
      const rTime = new Date(rDoc.uploadedAt || 0).getTime();

      if (lDoc.syncedWithCloud === false && lTime > rTime) {
        // Local has unsynced newer updates, keep local data and push
        const mergedDoc: StudentDocument = {
          ...rDoc,
          ...lDoc,
          fileDataUrl: lDoc.fileDataUrl || rDoc.fileDataUrl,
        };
        docMap.set(mergedDoc.id, mergedDoc);
        docsToPush.push(mergedDoc);
        localDocsAddedOrUpdated++;
      } else {
        // Remote is authoritative or newer, keep existing local dataUrl if remote dataUrl is empty
        const mergedDoc: StudentDocument = {
          ...rDoc,
          id: lDoc.id || rDoc.id,
          fileDataUrl: rDoc.fileDataUrl || lDoc.fileDataUrl,
          syncedWithCloud: true,
        };
        docMap.set(mergedDoc.id, mergedDoc);
        if (rTime > lTime || !lDoc.fileDataUrl) {
          remoteDocsAddedOrUpdated++;
        }
      }
      localDocMap.delete(lDoc.id);
      if (lDoc.studentId && lDoc.docType) {
        localDocByKey.delete(`${lDoc.studentId}:${lDoc.docType.toLowerCase()}`);
      }
    } else {
      // Remote doc newly received from another laptop
      docMap.set(rDoc.id, rDoc);
      remoteDocsAddedOrUpdated++;
    }
  }

  // 3b. Process remaining Local Documents
  for (const [id, lDoc] of localDocMap.entries()) {
    // If demo doc or orphaned, do NOT keep it!
    if (
      isDemoDocument(lDoc) ||
      DEMO_STUDENT_IDS.includes(lDoc.studentId) ||
      deletedIds.has(lDoc.studentId) ||
      deletedDocIds.has(id) ||
      !mergedMap.has(lDoc.studentId)
    ) {
      deletedDocsToSync.push(id);
      recordDeletedDocId(id);
      continue;
    }

    // Check if docMap already has this student and docType merged
    const alreadyMerged = Array.from(docMap.values()).some(
      (d) => d.studentId === lDoc.studentId && d.docType?.toLowerCase() === lDoc.docType?.toLowerCase()
    );
    if (alreadyMerged) {
      continue;
    }

    // If document was already confirmed synced in the past but remote is now missing it:
    // It means it was deleted on the cloud by another user, so do not resurrect it.
    if (lDoc.syncedWithCloud === true) {
      continue;
    }

    // Otherwise, local document was newly added or modified: KEEP IT AND PUSH TO CLOUD!
    docMap.set(id, lDoc);
    docsToPush.push(lDoc);
    localDocsAddedOrUpdated++;
  }

  const finalDocs = Array.from(docMap.values());
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(finalDocs));

  // 4. Merge Academic Years
  if (data.academicYears && Array.isArray(data.academicYears) && data.academicYears.length > 0) {
    const currentYears = getAcademicYears();
    const combined = Array.from(new Set([...currentYears, ...data.academicYears]));
    saveAcademicYears(sortAcademicYears(combined));
  }

  // 5. Merge Logs
  if (data.logs && Array.isArray(data.logs) && data.logs.length > 0) {
    const currentLogs = getLogs();
    const logMap = new Map<string, AuditLog>();
    currentLogs.forEach((l) => logMap.set(l.id, l));
    data.logs.forEach((l) => {
      if (l && l.id && !logMap.has(l.id)) {
        logMap.set(l.id, l);
      }
    });
    const finalLogs = Array.from(logMap.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 300);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(finalLogs));
  }

  return {
    mergedStudents: finalStudents,
    studentsToPush,
    deletedToSync,
    docsToPush,
    deletedDocsToSync,
    localStudentsAddedOrUpdated,
    remoteStudentsAddedOrUpdated,
    localDocsAddedOrUpdated,
    remoteDocsAddedOrUpdated,
  };
}

export function applyRemoteSyncedData(data: {
  students: Student[];
  documents?: StudentDocument[];
  academicYears?: string[];
  logs?: AuditLog[];
}): void {
  // Use smartMergeRemoteData to guarantee zero data loss!
  smartMergeRemoteData(data);
}

export function resetToFactoryDefault(): void {
  localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
  localStorage.removeItem(STORAGE_KEYS.LOGS);
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.ACADEMIC_YEARS);
  localStorage.setItem('arsip_demo_purged_permanently_v2', 'true');
  initializeStorage();
}

// Academic Years (Tahun Pelajaran) Management for 3 Institutions: SD, SMP, and SMK
export const BASE_ACADEMIC_YEARS: string[] = [
  'SD - 2026/2027',
  'SD - 2025/2026',
  'SD - 2024/2025',
  'SD - 2023/2024',
  'SMP - 2026/2027',
  'SMP - 2025/2026',
  'SMP - 2024/2025',
  'SMP - 2023/2024',
  'SMK - 2026/2027',
  'SMK - 2025/2026',
  'SMK - 2024/2025',
  'SMK - 2023/2024',
];

// Helper: sort academic years cleanly by year cycle descending, then SD -> SMP -> SMK
export function sortAcademicYears(years: string[]): string[] {
  const institutionOrder: Record<string, number> = { SD: 1, SMP: 2, SMK: 3 };
  return [...years].sort((a, b) => {
    const cycleA = extractYearCycle(a);
    const cycleB = extractYearCycle(b);
    if (cycleA !== cycleB) {
      return cycleB.localeCompare(cycleA);
    }
    const instA = parseInstitution(a);
    const instB = parseInstitution(b);
    return (institutionOrder[instA] || 9) - (institutionOrder[instB] || 9);
  });
}

export function getAcademicYears(): string[] {
  if (typeof window === 'undefined') return BASE_ACADEMIC_YEARS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACADEMIC_YEARS);
    let years: string[] = raw ? JSON.parse(raw) : [];

    // If empty, use default base years
    if (!Array.isArray(years) || years.length === 0) {
      years = [...BASE_ACADEMIC_YEARS];
    }

    // Auto-migrate any unbranded legacy years (e.g. "2024/2025") to SD, SMP, and SMK variants
    let migratedYears: string[] = [];
    years.forEach((yr) => {
      const trimmed = yr.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('SD - ') || trimmed.startsWith('SMP - ') || trimmed.startsWith('SMK - ')) {
        if (!migratedYears.includes(trimmed)) migratedYears.push(trimmed);
      } else {
        const cycle = extractYearCycle(trimmed);
        (['SD', 'SMP', 'SMK'] as InstitutionLevel[]).forEach((inst) => {
          const formatted = `${inst} - ${cycle}`;
          if (!migratedYears.includes(formatted)) migratedYears.push(formatted);
        });
      }
    });

    // Also include any academic years present on student profiles
    const rawStudents = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    if (rawStudents) {
      const studentList: Student[] = JSON.parse(rawStudents);
      studentList.forEach((s) => {
        const yr = (s.academicYear || s.classRoom || '').trim();
        if (yr && !migratedYears.includes(yr)) {
          migratedYears.push(yr);
        }
      });
    }

    const sorted = sortAcademicYears(migratedYears);
    saveAcademicYears(sorted);
    return sorted;
  } catch {
    return BASE_ACADEMIC_YEARS;
  }
}

export function saveAcademicYears(years: string[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEARS, JSON.stringify(years));
}

export function addAcademicYear(
  newYear: string,
  targetInstitution?: InstitutionLevel | 'ALL'
): { success: boolean; message?: string; years: string[] } {
  const trimmed = newYear.trim();
  if (!trimmed) {
    return { success: false, message: 'Tahun pelajaran tidak boleh kosong.', years: getAcademicYears() };
  }

  const currentYears = getAcademicYears();
  const yearCycle = extractYearCycle(trimmed);

  // If already prefixed (e.g. "SD - 2026/2027")
  if (trimmed.startsWith('SD - ') || trimmed.startsWith('SMP - ') || trimmed.startsWith('SMK - ')) {
    if (currentYears.includes(trimmed)) {
      return { success: false, message: `Tahun pelajaran "${trimmed}" sudah terdaftar.`, years: currentYears };
    }
    const updated = sortAcademicYears([trimmed, ...currentYears]);
    saveAcademicYears(updated);
    return { success: true, years: updated };
  }

  // If specific institution or ALL requested
  const institutionsToAdd: InstitutionLevel[] =
    targetInstitution === 'ALL'
      ? ['SD', 'SMP', 'SMK']
      : targetInstitution
      ? [targetInstitution]
      : ['SD', 'SMP', 'SMK'];

  const toAdd: string[] = [];
  institutionsToAdd.forEach((inst) => {
    const formatted = `${inst} - ${yearCycle}`;
    if (!currentYears.includes(formatted)) {
      toAdd.push(formatted);
    }
  });

  if (toAdd.length === 0) {
    return {
      success: false,
      message: `Tahun pelajaran untuk siklus "${yearCycle}" sudah terdaftar untuk lembaga yang dipilih.`,
      years: currentYears,
    };
  }

  const updated = sortAcademicYears([...toAdd, ...currentYears]);
  saveAcademicYears(updated);
  return { success: true, years: updated };
}

export function deleteAcademicYear(
  year: string,
  students: Student[]
): { success: boolean; message?: string; years: string[] } {
  const trimmed = year.trim();
  const currentYears = getAcademicYears();

  // Check if any student is assigned to this exact academic year
  const inUse = students.some(
    (s) => s.classRoom === trimmed || s.academicYear === trimmed
  );

  if (inUse) {
    return {
      success: false,
      message: `Tahun pelajaran "${trimmed}" sedang digunakan oleh data siswa dan tidak dapat dihapus.`,
      years: currentYears,
    };
  }

  const updated = currentYears.filter((y) => y !== trimmed);
  saveAcademicYears(updated);
  return { success: true, years: updated };
}
