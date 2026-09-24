export type UserRole = 'admin' | 'petugas_tu';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  email: string;
  nip?: string;
  password?: string;
  avatar?: string;
  active: boolean;
  lastLogin?: string;
}

export type DocumentType = 'kk' | 'ktp' | 'akta' | 'ijazah' | 'kip' | 'lainnya';

export type VerificationStatus = 'verified' | 'pending' | 'revision' | 'unverified';

export interface DocumentTypeConfig {
  id: DocumentType;
  title: string;
  shortTitle: string;
  description: string;
  isMandatory: boolean;
  acceptedFormats: string;
  badgeColor: string;
  iconName: string;
}

export interface StudentDocument {
  id: string;
  studentId: string;
  docType: DocumentType;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number; // in bytes
  fileDataUrl: string; // base64 or blob URL
  uploadedAt: string;
  uploadedBy: string;
  verificationStatus: VerificationStatus;
  notes?: string;
  version: number;
  syncedWithCloud?: boolean;
}

export type InstitutionLevel = 'SD' | 'SMP' | 'SMK';

export interface Student {
  id: string;
  name: string;
  nis: string;
  nisn: string;
  nik: string;
  birthPlace: string;
  birthDate: string;
  gender: 'L' | 'P';
  institution: InstitutionLevel;
  classRoom: string;
  address: string;
  parentName: string;
  parentPhone: string;
  status: 'Aktif' | 'Lulus' | 'Pindah';
  academicYear: string;
  createdAt: string;
  updatedAt: string;
  syncedWithCloud?: boolean;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action:
    | 'LOGIN'
    | 'LOGOUT'
    | 'UPLOAD_DOC'
    | 'DELETE_DOC'
    | 'VERIFY_DOC'
    | 'CREATE_STUDENT'
    | 'UPDATE_STUDENT'
    | 'DELETE_STUDENT'
    | 'BACKUP_DATA'
    | 'RESTORE_DATA'
    | 'UPDATE_USER'
    | 'DELETE_USER';
  userId: string;
  userName: string;
  userRole: UserRole;
  studentId?: string;
  studentName?: string;
  details: string;
}

export interface CompletenessStats {
  total: number;
  uploaded: number;
  mandatoryCount: number;
  mandatoryUploaded: number;
  isComplete: boolean;
  percentage: number;
  status: 'Lengkap' | 'Belum Lengkap' | 'Kosong';
}
