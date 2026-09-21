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
};

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

// Seed student profiles across 3 institutions: SD, SMP, and SMK
const SEED_STUDENTS: Student[] = [
  {
    id: 'std-001',
    name: 'Ahmad Faiz Zulkarnain',
    nis: '23241001',
    nisn: '0089123456',
    nik: '3201081503080002',
    birthPlace: 'Bogor',
    birthDate: '15 Maret 2012',
    gender: 'L',
    institution: 'SD',
    classRoom: 'SD - 2024/2025',
    address: 'Jl. Pajajaran No. 45, RT 02/RW 05, Kel. Sukasari, Kota Bogor',
    parentName: 'H. Sudarsono, S.T.',
    parentPhone: '0812-3456-7890',
    status: 'Aktif',
    academicYear: 'SD - 2024/2025',
    createdAt: '2024-07-10T08:00:00.000Z',
    updatedAt: '2024-07-15T10:30:00.000Z',
  },
  {
    id: 'std-002',
    name: 'Nadia Salsabila Putri',
    nis: '23241002',
    nisn: '0087654321',
    nik: '3201085208080004',
    birthPlace: 'Jakarta',
    birthDate: '12 Agustus 2013',
    gender: 'P',
    institution: 'SD',
    classRoom: 'SD - 2024/2025',
    address: 'Komplek Baranangsiang Indah Blok C2 No. 12, Kota Bogor',
    parentName: 'Ir. Hendra Gunawan',
    parentPhone: '0813-8899-2211',
    status: 'Aktif',
    academicYear: 'SD - 2024/2025',
    createdAt: '2024-07-10T08:15:00.000Z',
    updatedAt: '2024-07-16T11:00:00.000Z',
  },
  {
    id: 'std-003',
    name: 'Muhammad Rizky Pratama',
    nis: '23241003',
    nisn: '0078901234',
    nik: '3201082005070001',
    birthPlace: 'Bandung',
    birthDate: '20 Mei 2010',
    gender: 'L',
    institution: 'SMP',
    classRoom: 'SMP - 2025/2026',
    address: 'Jl. Sholeh Iskandar No. 88, Tanah Sareal, Kota Bogor',
    parentName: 'Drs. Agus Setiawan',
    parentPhone: '0857-1122-3344',
    status: 'Aktif',
    academicYear: 'SMP - 2025/2026',
    createdAt: '2023-07-12T09:00:00.000Z',
    updatedAt: '2024-07-12T09:00:00.000Z',
  },
  {
    id: 'std-004',
    name: 'Siti Rahma Azzahra',
    nis: '23241004',
    nisn: '0086549871',
    nik: '3201086011080003',
    birthPlace: 'Depok',
    birthDate: '20 November 2010',
    gender: 'P',
    institution: 'SMP',
    classRoom: 'SMP - 2025/2026',
    address: 'Kp. Muara RT 03/RW 01, Kel. Pasir Jaya, Kota Bogor',
    parentName: 'Mulyadi (Penerima PIP)',
    parentPhone: '0896-7788-9900',
    status: 'Aktif',
    academicYear: 'SMP - 2025/2026',
    createdAt: '2024-07-11T13:20:00.000Z',
    updatedAt: '2024-07-18T14:40:00.000Z',
  },
  {
    id: 'std-005',
    name: 'Dimas Aditya Nugroho',
    nis: '23241005',
    nisn: '0071239874',
    nik: '3201081001070005',
    birthPlace: 'Surabaya',
    birthDate: '10 Januari 2007',
    gender: 'L',
    institution: 'SMK',
    classRoom: 'SMK - 2026/2027',
    address: 'Jl. R.E. Martadinata No. 19, Bogor Tengah',
    parentName: 'Budi Nugroho, S.E.',
    parentPhone: '0812-9900-1122',
    status: 'Aktif',
    academicYear: 'SMK - 2026/2027',
    createdAt: '2023-07-14T10:00:00.000Z',
    updatedAt: '2024-08-01T08:00:00.000Z',
  },
  {
    id: 'std-006',
    name: 'Clara Anindya Putri',
    nis: '23241006',
    nisn: '0069871234',
    nik: '3201084504060002',
    birthPlace: 'Bogor',
    birthDate: '05 April 2007',
    gender: 'P',
    institution: 'SMK',
    classRoom: 'SMK - 2026/2027',
    address: 'Jl. Pandu Raya No. 102, Bantarjati, Kota Bogor',
    parentName: 'dr. Anton Wijaya, Sp.A',
    parentPhone: '0811-2233-4455',
    status: 'Aktif',
    academicYear: 'SMK - 2026/2027',
    createdAt: '2022-07-15T09:00:00.000Z',
    updatedAt: '2024-07-20T16:00:00.000Z',
  },
];

// Initialize default seed data
export function initializeStorage(): void {
  if (typeof window === 'undefined') return;

  const isInitialized = localStorage.getItem(STORAGE_KEYS.INITIALIZED);
  if (!isInitialized) {
    // Seed users
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));

    // Seed students
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(SEED_STUDENTS));

    // Seed documents for students
    const documents: StudentDocument[] = [];

    // std-001 (Ahmad Faiz): All mandatory docs uploaded and verified!
    const std1 = SEED_STUDENTS[0];
    const docTypesStd1: DocumentType[] = ['kk', 'akta', 'ijazah', 'ktp', 'kip'];
    docTypesStd1.forEach((type, idx) => {
      documents.push({
        id: `doc-${std1.id}-${type}`,
        studentId: std1.id,
        docType: type,
        title: getDocumentTitle(type, std1.name),
        fileName: `${type.toUpperCase()}_${std1.nisn}.pdf`,
        fileType: 'image/svg+xml',
        fileSize: 245000 + idx * 31000,
        fileDataUrl: generateSampleDocumentDataUrl(type, std1),
        uploadedAt: '2024-07-12T09:30:00.000Z',
        uploadedBy: 'Petugas TU (Mamat M.)',
        verificationStatus: 'verified',
        notes: 'Dokumen asli telah diverifikasi dan valid.',
        version: 1,
      });
    });

    // std-002 (Nadia Salsabila): KK and Akta verified, Ijazah pending
    const std2 = SEED_STUDENTS[1];
    (['kk', 'akta', 'ijazah'] as DocumentType[]).forEach((type) => {
      documents.push({
        id: `doc-${std2.id}-${type}`,
        studentId: std2.id,
        docType: type,
        title: getDocumentTitle(type, std2.name),
        fileName: `${type.toUpperCase()}_${std2.nisn}.pdf`,
        fileType: 'image/svg+xml',
        fileSize: 280000,
        fileDataUrl: generateSampleDocumentDataUrl(type, std2),
        uploadedAt: '2024-07-16T11:15:00.000Z',
        uploadedBy: 'Petugas TU (Mamat M.)',
        verificationStatus: type === 'ijazah' ? 'pending' : 'verified',
        notes: type === 'ijazah' ? 'Menunggu verifikasi stempel legalisir basah.' : 'Data valid.',
        version: 1,
      });
    });

    // std-004 (Siti Rahma - PIP recipient): KK, Akta, KIP uploaded
    const std4 = SEED_STUDENTS[3];
    (['kk', 'akta', 'kip'] as DocumentType[]).forEach((type) => {
      documents.push({
        id: `doc-${std4.id}-${type}`,
        studentId: std4.id,
        docType: type,
        title: getDocumentTitle(type, std4.name),
        fileName: `${type.toUpperCase()}_${std4.nisn}.pdf`,
        fileType: 'image/svg+xml',
        fileSize: 310000,
        fileDataUrl: generateSampleDocumentDataUrl(type, std4),
        uploadedAt: '2024-07-18T14:40:00.000Z',
        uploadedBy: 'Admin (Dian R.)',
        verificationStatus: 'verified',
        notes: type === 'kip' ? 'Kartu Indonesia Pintar terdaftar aktif di Dapodik.' : 'Valid.',
        version: 1,
      });
    });

    // std-006 (Clara Anindya): Full docs + Sertifikat Prestasi
    const std6 = SEED_STUDENTS[5];
    (['kk', 'akta', 'ijazah', 'lainnya'] as DocumentType[]).forEach((type) => {
      documents.push({
        id: `doc-${std6.id}-${type}`,
        studentId: std6.id,
        docType: type,
        title: getDocumentTitle(type, std6.name),
        fileName: `${type.toUpperCase()}_${std6.nisn}.pdf`,
        fileType: 'image/svg+xml',
        fileSize: 290000,
        fileDataUrl: generateSampleDocumentDataUrl(type, std6),
        uploadedAt: '2024-07-20T16:00:00.000Z',
        uploadedBy: 'Admin (Dian R.)',
        verificationStatus: 'verified',
        notes: 'Arsip lengkap semester awal.',
        version: 1,
      });
    });

    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(documents));

    // Seed audit logs
    const initialLogs: AuditLog[] = [
      {
        id: 'log-001',
        timestamp: '2026-09-17T08:30:00.000Z',
        action: 'LOGIN',
        userId: INITIAL_USERS[0].id,
        userName: INITIAL_USERS[0].name,
        userRole: INITIAL_USERS[0].role,
        details: 'Admin berhasil masuk ke Sistem Arsip Dokumen Siswa.',
      },
      {
        id: 'log-002',
        timestamp: '2026-09-17T08:45:00.000Z',
        action: 'VERIFY_DOC',
        userId: INITIAL_USERS[0].id,
        userName: INITIAL_USERS[0].name,
        userRole: INITIAL_USERS[0].role,
        studentId: std1.id,
        studentName: std1.name,
        details: 'Verifikasi berkas Ijazah & KK selesai (Status: Valid).',
      },
      {
        id: 'log-003',
        timestamp: '2026-09-17T09:15:00.000Z',
        action: 'UPLOAD_DOC',
        userId: INITIAL_USERS[1].id,
        userName: INITIAL_USERS[1].name,
        userRole: INITIAL_USERS[1].role,
        studentId: std4.id,
        studentName: std4.name,
        details: 'Mengunggah Kartu Indonesia Pintar (KIP) format digital.',
      },
    ];

    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(initialLogs));
    localStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
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
    const idx = students.findIndex((s) => s.id === studentData.id);
    if (idx !== -1) {
      savedStudent = {
        ...students[idx],
        ...cleanData,
        id: studentData.id,
        updatedAt: now,
      };
      students[idx] = savedStudent;
    } else {
      savedStudent = {
        ...cleanData,
        id: studentData.id,
        createdAt: now,
        updatedAt: now,
      };
      students.unshift(savedStudent);
    }
  } else {
    // Create with guaranteed unique ID
    const newId = `std-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    savedStudent = {
      ...cleanData,
      id: newId,
      createdAt: now,
      updatedAt: now,
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
        students[existingIndex] = {
          ...students[existingIndex],
          ...cleanData,
          updatedAt: now,
        };
        updatedCount++;
      }
      // If skip_existing, simply do not add duplicate
    } else {
      const newId = `std-${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${idx}`;
      students.unshift({
        ...cleanData,
        id: newId,
        createdAt: now,
        updatedAt: now,
      });
      addedCount++;
    }
  }

  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
  return { addedCount, updatedCount, totalProcessed: newStudents.length };
}

export function deleteStudent(studentId: string): void {
  const students = getStudents();
  const updated = students.filter((s) => s.id !== studentId);
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(updated));

  // Also remove documents
  const docs = getDocuments();
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

export function saveDocument(doc: StudentDocument): void {
  const docs = getDocuments();
  const idx = docs.findIndex((d) => d.id === doc.id);
  if (idx !== -1) {
    docs[idx] = doc;
  } else {
    docs.unshift(doc);
  }
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(docs));
}

export function deleteDocument(docId: string): void {
  const docs = getDocuments();
  const updated = docs.filter((d) => d.id !== docId);
  localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(updated));
}

export function verifyDocument(docId: string, status: VerificationStatus, notes?: string): StudentDocument | null {
  const docs = getDocuments();
  const doc = docs.find((d) => d.id === docId);
  if (doc) {
    doc.verificationStatus = status;
    if (notes !== undefined) doc.notes = notes;
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

export function applyRemoteSyncedData(data: {
  students: Student[];
  documents?: StudentDocument[];
  academicYears?: string[];
  logs?: AuditLog[];
}): void {
  if (data.students && Array.isArray(data.students)) {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(data.students));
  }
  if (data.documents && Array.isArray(data.documents)) {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(data.documents));
  }
  if (data.academicYears && Array.isArray(data.academicYears)) {
    localStorage.setItem(STORAGE_KEYS.ACADEMIC_YEARS, JSON.stringify(data.academicYears));
  }
  if (data.logs && Array.isArray(data.logs)) {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(data.logs));
  }
}

export function resetToFactoryDefault(): void {
  localStorage.removeItem(STORAGE_KEYS.INITIALIZED);
  localStorage.removeItem(STORAGE_KEYS.STUDENTS);
  localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
  localStorage.removeItem(STORAGE_KEYS.LOGS);
  localStorage.removeItem(STORAGE_KEYS.USERS);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  localStorage.removeItem(STORAGE_KEYS.ACADEMIC_YEARS);
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
