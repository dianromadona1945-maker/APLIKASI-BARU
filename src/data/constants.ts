import { DocumentTypeConfig, DocumentType, User, InstitutionLevel } from '../types';

export interface InstitutionConfig {
  id: InstitutionLevel;
  code: InstitutionLevel;
  name: string;
  shortTitle: string;
  fullName: string;
  badgeClass: string;
  badgeSolidClass: string;
  borderClass: string;
  cardBorder: string;
  colorClass: string;
  textClass: string;
  bgLightClass: string;
  bgLight: string;
  description: string;
}

export const INSTITUTION_CONFIGS: Record<InstitutionLevel, InstitutionConfig> = {
  SD: {
    id: 'SD',
    code: 'SD',
    name: 'SD',
    shortTitle: 'Sekolah Dasar',
    fullName: 'Sekolah Dasar (SD)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    badgeSolidClass: 'bg-emerald-600 text-white',
    borderClass: 'border-emerald-300',
    cardBorder: 'border-emerald-200',
    colorClass: 'text-emerald-700',
    textClass: 'text-emerald-700',
    bgLightClass: 'bg-emerald-50/70',
    bgLight: 'bg-emerald-50/70',
    description: 'Jenjang Pendidikan Dasar Kelas 1 - 6',
  },
  SMP: {
    id: 'SMP',
    code: 'SMP',
    name: 'SMP',
    shortTitle: 'SMP',
    fullName: 'Sekolah Menengah Pertama (SMP)',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    badgeSolidClass: 'bg-blue-600 text-white',
    borderClass: 'border-blue-300',
    cardBorder: 'border-blue-200',
    colorClass: 'text-blue-700',
    textClass: 'text-blue-700',
    bgLightClass: 'bg-blue-50/70',
    bgLight: 'bg-blue-50/70',
    description: 'Jenjang Pendidikan Menengah Pertama Kelas 7 - 9',
  },
  SMK: {
    id: 'SMK',
    code: 'SMK',
    name: 'SMK',
    shortTitle: 'SMK',
    fullName: 'Sekolah Menengah Kejuruan (SMK)',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    badgeSolidClass: 'bg-purple-600 text-white',
    borderClass: 'border-purple-300',
    cardBorder: 'border-purple-200',
    colorClass: 'text-purple-700',
    textClass: 'text-purple-700',
    bgLightClass: 'bg-purple-50/70',
    bgLight: 'bg-purple-50/70',
    description: 'Jenjang Pendidikan Kejuruan Kelas 10 - 12',
  },
};

export const INSTITUTION_LIST: InstitutionConfig[] = [
  INSTITUTION_CONFIGS.SD,
  INSTITUTION_CONFIGS.SMP,
  INSTITUTION_CONFIGS.SMK,
];

export const DOCUMENT_CONFIGS: Record<DocumentType, DocumentTypeConfig> = {
  kk: {
    id: 'kk',
    title: 'Kartu Keluarga (KK)',
    shortTitle: 'KK',
    description: 'Salinan resmi Kartu Keluarga terbaru yang memuat nama siswa dan NIK kepala keluarga.',
    isMandatory: true,
    acceptedFormats: 'PDF, JPG, PNG (Maks 5MB)',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    iconName: 'Users',
  },
  ktp: {
    id: 'ktp',
    title: 'Kartu Tanda Penduduk (KTP)',
    shortTitle: 'KTP',
    description: 'KTP siswa (bila sudah 17 tahun) atau KTP elektronik orang tua/wali siswa.',
    isMandatory: false,
    acceptedFormats: 'PDF, JPG, PNG (Maks 5MB)',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconName: 'CreditCard',
  },
  akta: {
    id: 'akta',
    title: 'Akta Kelahiran',
    shortTitle: 'Akta',
    description: 'Kutipan Akta Kelahiran resmi dari Dinas Kependudukan dan Pencatatan Sipil.',
    isMandatory: true,
    acceptedFormats: 'PDF, JPG, PNG (Maks 5MB)',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconName: 'FileText',
  },
  ijazah: {
    id: 'ijazah',
    title: 'Ijazah / SKL',
    shortTitle: 'Ijazah',
    description: 'Ijazah pendidikan sebelumnya (SMP/MTs/SD) atau Surat Keterangan Lulus resmi.',
    isMandatory: true,
    acceptedFormats: 'PDF, JPG, PNG (Maks 5MB)',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    iconName: 'GraduationCap',
  },
  kip: {
    id: 'kip',
    title: 'Kartu Indonesia Pintar (KIP / PIP)',
    shortTitle: 'KIP',
    description: 'Kartu Indonesia Pintar, Program Indonesia Pintar (PIP), atau Kartu KKS / KIS bagi penerima bantuan.',
    isMandatory: false,
    acceptedFormats: 'PDF, JPG, PNG (Maks 5MB)',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
    iconName: 'Award',
  },
  lainnya: {
    id: 'lainnya',
    title: 'Dokumen Lainnya',
    shortTitle: 'Lainnya',
    description: 'Berkas pendukung seperti Pas Foto 3x4, Buku Rapor, Sertifikat Prestasi, atau Surat Pindah.',
    isMandatory: false,
    acceptedFormats: 'PDF, JPG, PNG (Maks 5MB)',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    iconName: 'FolderPlus',
  },
};

export const BASE_YEAR_CYCLES = [
  '2023/2024',
  '2024/2025',
  '2025/2026',
  '2026/2027',
  '2027/2028',
  '2028/2029',
  '2029/2030',
];

export const DEFAULT_ACADEMIC_YEARS = [
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

export const CLASS_OPTIONS = [
  'Semua Tahun Pelajaran',
  ...DEFAULT_ACADEMIC_YEARS,
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin-01',
    username: 'admin',
    name: 'Dian Romadona, S.Pd.',
    role: 'admin',
    email: 'dian.romadona@sekolah.sch.id',
    nip: '',
    password: 'admin',
    active: true,
    lastLogin: '2026-09-17 08:30 WIB',
  },
  {
    id: 'usr-tu-01',
    username: 'petugas_tu',
    name: 'Mamat Miftahurrahmat, S.Pd.',
    role: 'petugas_tu',
    email: 'mamat.miftahurrahmat@sekolah.sch.id',
    nip: '',
    password: 'tu123',
    active: true,
    lastLogin: '2026-09-17 09:15 WIB',
  },
  {
    id: 'usr-tu-123',
    username: 'tu123',
    name: 'Mamat Miftahurrahmat, S.Pd.',
    role: 'petugas_tu',
    email: 'mamat.miftahurrahmat@sekolah.sch.id',
    nip: '',
    password: '123456789',
    active: true,
    lastLogin: '2026-09-17 09:15 WIB',
  },
  {
    id: 'usr-tu-mila',
    username: 'mila',
    name: 'mila',
    role: 'petugas_tu',
    email: 'mila@sekolah.sch.id',
    nip: '',
    password: 'mila',
    active: true,
    lastLogin: '24 Sep 2026 07.40 WIB',
  },
  {
    id: 'usr-tu-tika',
    username: 'tika1',
    name: 'tika',
    role: 'petugas_tu',
    email: 'tika1@sekolah.sch.id',
    nip: '',
    password: 'tika',
    active: true,
    lastLogin: 'Baru Dibuat',
  },
];
