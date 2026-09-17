import { DocumentTypeConfig, DocumentType, User } from '../types';

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

export const DEFAULT_ACADEMIC_YEARS = [
  '2023/2024',
  '2024/2025',
  '2025/2026',
  '2026/2027',
  '2027/2028',
  '2028/2029',
  '2029/2030',
];

export const CLASS_OPTIONS = [
  'Semua Tahun Pelajaran',
  ...DEFAULT_ACADEMIC_YEARS,
];

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-admin-01',
    username: 'admin',
    name: 'Bambang Sudibyo, S.Pd., M.Kom.',
    role: 'admin',
    email: 'admin.arsip@sekolah.sch.id',
    nip: '198402152009031002',
    password: 'admin',
    active: true,
    lastLogin: '2026-09-17 08:30 WIB',
  },
  {
    id: 'usr-tu-01',
    username: 'petugas_tu',
    name: 'Dewi Rahmawati, S.AP.',
    role: 'petugas_tu',
    email: 'dewi.tu@sekolah.sch.id',
    nip: '199105182015022001',
    password: 'tu123',
    active: true,
    lastLogin: '2026-09-17 09:15 WIB',
  },
];
