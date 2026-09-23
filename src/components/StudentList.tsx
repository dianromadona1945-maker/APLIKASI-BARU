import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  FolderOpen,
  Download,
  FileCheck2,
  Trash2,
  Edit,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Archive,
  Calendar,
  School,
  ArrowUpDown,
  ArrowUpAZ,
  ArrowDownZA,
} from 'lucide-react';
import { Student, StudentDocument, DocumentType, UserRole, InstitutionLevel } from '../types';
import { calculateCompleteness, getAcademicYears, parseInstitution, extractYearCycle } from '../services/storage';
import { downloadStudentZip, downloadAllStudentsZip } from '../utils/zipExport';
import { ManageAcademicYearsModal } from './ManageAcademicYearsModal';
import { INSTITUTION_CONFIGS, INSTITUTION_LIST } from '../data/constants';

interface StudentListProps {
  students: Student[];
  documents: StudentDocument[];
  onOpenDossier: (student: Student) => void;
  onAddNewStudent: () => void;
  onOpenImportExcel?: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (studentId: string, studentName: string) => void;
  currentUserRole: UserRole;
  academicYears?: string[];
  onYearsUpdated?: (years: string[]) => void;
}

export const StudentList: React.FC<StudentListProps> = ({
  students,
  documents,
  onOpenDossier,
  onAddNewStudent,
  onOpenImportExcel,
  onEditStudent,
  onDeleteStudent,
  currentUserRole,
  academicYears: propAcademicYears,
  onYearsUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState<'ALL' | InstitutionLevel>('ALL');
  const [selectedYear, setSelectedYear] = useState('Semua Tahun Pelajaran');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Lengkap' | 'Belum Lengkap' | 'Kosong'>('Semua');
  const [nameSort, setNameSort] = useState<'none' | 'asc' | 'desc'>('none');
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [isManageYearsOpen, setIsManageYearsOpen] = useState(false);

  useEffect(() => {
    if (propAcademicYears && propAcademicYears.length > 0) {
      setAcademicYears(propAcademicYears);
    } else {
      setAcademicYears(getAcademicYears());
    }
  }, [propAcademicYears]);

  const handleYearsUpdated = (updatedYears: string[]) => {
    setAcademicYears(updatedYears);
    if (onYearsUpdated) onYearsUpdated(updatedYears);
  };

  const toggleNameSort = () => {
    setNameSort((prev) => {
      if (prev === 'none') return 'asc';
      if (prev === 'asc') return 'desc';
      return 'none';
    });
  };

  // Filtered academic years for the dropdown based on selected institution
  const filteredDropdownYears = useMemo(() => {
    if (selectedInstitution === 'ALL') {
      return academicYears;
    }
    return academicYears.filter((yr) => {
      const inst = parseInstitution(yr, 'SMP');
      return inst === selectedInstitution;
    });
  }, [academicYears, selectedInstitution]);

  // Institution student counts for quick badge counters
  const institutionCounts = useMemo(() => {
    const counts = { ALL: students.length, SD: 0, SMP: 0, SMK: 0 };
    students.forEach((s) => {
      const inst = s.institution || parseInstitution(s.classRoom || s.academicYear, 'SMP');
      if (counts[inst] !== undefined) {
        counts[inst]++;
      }
    });
    return counts;
  }, [students]);

  // Filter students
  const filteredStudents = useMemo(() => {
    const rawQuery = searchTerm.trim().toLowerCase();
    const queryDigits = rawQuery.replace(/\D/g, '');
    const tokens = rawQuery.split(/\s+/).filter(Boolean);

    const matches = students.filter((student) => {
      const studentInst: InstitutionLevel =
        student.institution || parseInstitution(student.classRoom || student.academicYear, 'SMP');

      // Institution check
      if (selectedInstitution !== 'ALL' && studentInst !== selectedInstitution) {
        return false;
      }

      // Academic Year check
      const matchesYear =
        selectedYear === 'Semua Tahun Pelajaran' ||
        student.classRoom === selectedYear ||
        student.academicYear === selectedYear ||
        extractYearCycle(student.classRoom) === selectedYear;

      if (!matchesYear) return false;

      // Completeness status check
      const stats = calculateCompleteness(student, documents);
      const matchesStatus =
        statusFilter === 'Semua' ||
        (statusFilter === 'Lengkap' && stats.isComplete) ||
        (statusFilter === 'Belum Lengkap' && !stats.isComplete && stats.uploaded > 0) ||
        (statusFilter === 'Kosong' && stats.uploaded === 0);

      if (!matchesStatus) return false;

      // Search check with high precision
      if (rawQuery) {
        const nameLower = (student.name || '').toLowerCase();
        const nis = (student.nis || '').trim();
        const nisn = (student.nisn || '').trim();
        const nik = (student.nik || '').trim();
        const parentName = (student.parentName || '').toLowerCase();
        const parentPhone = (student.parentPhone || '').trim();

        const nameMatches = Boolean(nameLower && tokens.length > 0 && tokens.every((token) => nameLower.includes(token)));
        const nisMatches = Boolean(
          nis && (nis.toLowerCase().includes(rawQuery) || (queryDigits.length >= 3 && nis.replace(/\D/g, '').includes(queryDigits)))
        );
        const nisnMatches = Boolean(
          nisn && (nisn.toLowerCase().includes(rawQuery) || (queryDigits.length >= 3 && nisn.replace(/\D/g, '').includes(queryDigits)))
        );
        const nikMatches = Boolean(
          nik && (nik.includes(rawQuery) || (queryDigits.length >= 4 && nik.replace(/\D/g, '').includes(queryDigits)))
        );
        const parentPhoneMatches = Boolean(
          parentPhone && queryDigits.length >= 4 && parentPhone.replace(/\D/g, '').includes(queryDigits)
        );
        const parentNameMatches = Boolean(
          parentName && tokens.length > 0 && tokens.every((token) => parentName.includes(token))
        );

        return nameMatches || nisMatches || nisnMatches || nikMatches || parentPhoneMatches || parentNameMatches;
      }

      return true;
    });

    // Deduplicate to guarantee no identical duplicate entries appear in the table
    const seen = new Set<string>();
    const deduplicated: Student[] = [];
    for (const student of matches) {
      const dedupeKey = student.id || `${(student.nis || '').trim()}_${(student.name || '').trim().toLowerCase()}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        deduplicated.push(student);
      }
    }

    return deduplicated.sort((a, b) => {
      // 1. Urutkan berdasarkan Abjad jika filter anak panah aktif
      if (nameSort === 'asc') {
        const comp = (a.name || '').localeCompare(b.name || '', 'id', { sensitivity: 'base' });
        if (comp !== 0) return comp;
      } else if (nameSort === 'desc') {
        const comp = (b.name || '').localeCompare(a.name || '', 'id', { sensitivity: 'base' });
        if (comp !== 0) return comp;
      }

      // 2. Prioritas pencarian teks jika ada query
      if (rawQuery) {
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        if (aName === rawQuery && bName !== rawQuery) return -1;
        if (bName === rawQuery && aName !== rawQuery) return 1;
        if (aName.startsWith(rawQuery) && !bName.startsWith(rawQuery)) return -1;
        if (bName.startsWith(rawQuery) && !aName.startsWith(rawQuery)) return 1;
      }

      // 3. Bawaan (jika tidak filter abjad): Data yang pertama itu data yang terakhir kali ditambahkan (Newest first)
      if (nameSort === 'none') {
        const parseTime = (s: Student): number => {
          if (s.createdAt) {
            const t = new Date(s.createdAt).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          if (s.updatedAt) {
            const t = new Date(s.updatedAt).getTime();
            if (!isNaN(t) && t > 0) return t;
          }
          const m = s.id?.match(/\d{10,14}/);
          if (m) {
            const t = Number(m[0]);
            if (!isNaN(t) && t > 0) return t;
          }
          return 0;
        };

        const timeA = parseTime(a);
        const timeB = parseTime(b);
        if (timeB !== timeA && timeA > 0 && timeB > 0) {
          return timeB - timeA;
        }

        // Jika timestamp tidak tersedia atau sama, gunakan urutan penyimpanan (storage unshift menempatkan yang baru di awal)
        const idxA = students.findIndex((s) => s.id === a.id);
        const idxB = students.findIndex((s) => s.id === b.id);
        if (idxA !== -1 && idxB !== -1) {
          return idxA - idxB;
        }
      }

      return 0;
    });
  }, [students, documents, searchTerm, selectedInstitution, selectedYear, statusFilter, nameSort]);

  // Export CSV function
  const handleExportCsv = () => {
    const headers = ['Nama Siswa', 'Lembaga', 'NIS', 'NISN', 'NIK', 'Tahun Pelajaran', 'No. HP', 'TTL', 'Alamat', 'Orang Tua', 'Status Kelengkapan', 'KK', 'KTP', 'Akta', 'Ijazah', 'KIP'];
    const rows = filteredStudents.map((s) => {
      const sDocs = documents.filter((d) => d.studentId === s.id);
      const stats = calculateCompleteness(s, documents);
      const sInst = s.institution || parseInstitution(s.classRoom, 'SMP');
      const hasDoc = (type: DocumentType) => (sDocs.some((d) => d.docType === type) ? 'Ada' : 'Belum');
      return [
        `"${s.name}"`,
        `"${sInst}"`,
        `"${s.nis}"`,
        `"${s.nisn}"`,
        `"${s.nik}"`,
        `"${s.classRoom}"`,
        `"${s.parentPhone || '-'}"`,
        `"${s.birthPlace}, ${s.birthDate}"`,
        `"${s.address}"`,
        `"${s.parentName}"`,
        `"${stats.status} (${stats.mandatoryUploaded}/3 Wajib)"`,
        hasDoc('kk'),
        hasDoc('ktp'),
        hasDoc('akta'),
        hasDoc('ijazah'),
        hasDoc('kip'),
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Arsip_Siswa_${selectedInstitution}_${selectedYear.replace(/[\s\/]+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDocStatusBadge = (studentId: string, type: DocumentType) => {
    const doc = documents.find((d) => d.studentId === studentId && d.docType === type);
    if (!doc) {
      return (
        <span
          title={`Belum ada ${type.toUpperCase()}`}
          className="w-6 h-6 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-400 flex items-center justify-center"
        >
          -
        </span>
      );
    }

    return (
      <span
        title={`${doc.title} (Terarsip)`}
        className="w-6 h-6 rounded-md bg-emerald-100 border border-emerald-300 text-[10px] font-bold text-emerald-800 flex items-center justify-center shadow-2xs"
      >
        ✓
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900">Data Siswa &amp; Arsip Dokumen</h2>
            {selectedInstitution !== 'ALL' && (
              <span className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${INSTITUTION_CONFIGS[selectedInstitution].badgeClass}`}>
                {INSTITUTION_CONFIGS[selectedInstitution].name}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Menampilkan {filteredStudents.length} dari total {students.length} siswa (3 Lembaga: SD, SMP, SMK)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            title="Download file rekapitulasi data siswa ke format CSV/Excel"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={() => downloadAllStudentsZip(filteredStudents, documents)}
            title="Download seluruh dokumen digital siswa terarsip dalam bentuk ZIP"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <Archive className="w-4 h-4 text-indigo-600" />
            <span>Unduh Semua Berkas (ZIP)</span>
          </button>

          <button
            id="manage-academic-years-open-btn"
            onClick={() => setIsManageYearsOpen(true)}
            title="Kelola & Tambah Tahun Pelajaran baru untuk SD, SMP, SMK"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Kelola Th. Pelajaran</span>
          </button>

          {(currentUserRole === 'admin' || currentUserRole === 'petugas_tu') && onOpenImportExcel && (
            <button
              onClick={onOpenImportExcel}
              title="Unggah dan impor banyak data siswa sekaligus dari file Excel (.xlsx / .xls / .csv)"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs hover:shadow transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Impor Excel</span>
            </button>
          )}

          {(currentUserRole === 'admin' || currentUserRole === 'petugas_tu') && (
            <button
              onClick={onAddNewStudent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs hover:shadow transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Institution Tabs Selector */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setSelectedInstitution('ALL');
            setSelectedYear('Semua Tahun Pelajaran');
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 ${
            selectedInstitution === 'ALL'
              ? 'bg-white text-slate-900 shadow-xs ring-1 ring-slate-200'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <School className="w-3.5 h-3.5 text-slate-500" />
          <span>Semua Lembaga</span>
          <span className="px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded-full text-[10px] font-bold">
            {institutionCounts.ALL}
          </span>
        </button>

        {INSTITUTION_LIST.map((inst) => {
          const isSelected = selectedInstitution === inst.code;
          return (
            <button
              key={inst.code}
              type="button"
              onClick={() => {
                setSelectedInstitution(inst.code);
                setSelectedYear('Semua Tahun Pelajaran');
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer shrink-0 ${
                isSelected
                  ? `bg-white ${inst.colorClass} shadow-xs ring-2 ring-blue-500`
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${inst.code === 'SD' ? 'bg-emerald-500' : inst.code === 'SMP' ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
              <span>{inst.shortTitle}</span>
              <span className="px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded-full text-[10px] font-bold">
                {institutionCounts[inst.code]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari berdasarkan Nama Siswa, NIS, NISN, NIK, atau No. HP..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Tahun Pelajaran */}
        <div className="w-full md:w-64 flex items-center gap-1.5">
          <div className="relative flex-1">
            <select
              id="student-list-year-filter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="Semua Tahun Pelajaran">
                {selectedInstitution === 'ALL'
                  ? 'Semua Tahun Pelajaran'
                  : `Semua Th. Pelajaran (${selectedInstitution})`}
              </option>
              {filteredDropdownYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            id="quick-add-year-btn"
            onClick={() => setIsManageYearsOpen(true)}
            title="Tambah atau Kelola Tahun Pelajaran SD, SMP, SMK"
            className="p-2 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-600 rounded-xl border border-slate-200 transition shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Status Kelengkapan */}
        <div className="w-full md:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
          >
            <option value="Semua">Semua Status Berkas</option>
            <option value="Lengkap">Lengkap (100% Wajib)</option>
            <option value="Belum Lengkap">Belum Lengkap</option>
            <option value="Kosong">Tanpa Dokumen</option>
          </select>
        </div>

        {/* Filter / Urutan Siswa (Bawaan: Terbaru Ditambahkan, atau Abjad A-Z / Z-A) */}
        <div className="w-full md:w-56">
          <div className="relative">
            <select
              value={nameSort}
              onChange={(e) => setNameSort(e.target.value as 'none' | 'asc' | 'desc')}
              aria-label="Urutan data siswa"
              className="w-full py-2 pl-9 pr-3 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-semibold cursor-pointer"
            >
              <option value="none">🕒 Terbaru (Bawaan)</option>
              <option value="asc">🔤 Abjad: A → Z (Menaik)</option>
              <option value="desc">🔤 Abjad: Z → A (Menurun)</option>
            </select>
            <div className="absolute left-3 top-2.5 pointer-events-none text-slate-500">
              {nameSort === 'asc' ? (
                <ArrowUpAZ className="w-4 h-4 text-blue-600" />
              ) : nameSort === 'desc' ? (
                <ArrowDownZA className="w-4 h-4 text-blue-600" />
              ) : (
                <ArrowUpDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Info Urutan Aktif jika sedang menggunakan filter abjad */}
      {nameSort !== 'none' && (
        <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold">
          <div className="flex items-center gap-2">
            {nameSort === 'asc' ? (
              <ArrowUpAZ className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <ArrowDownZA className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span>
              Urutan Aktif:{' '}
              <strong className="text-blue-900 font-black">
                {nameSort === 'asc' ? 'Abjad A ke Z (Menaik)' : 'Abjad Z ke A (Menurun)'}
              </strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setNameSort('none')}
            className="px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-100 rounded-lg border border-blue-200 transition cursor-pointer"
            title="Kembali ke urutan data terbaru ditambahkan"
          >
            Kembalikan ke Terbaru Ditambahkan
          </button>
        </div>
      )}

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th
                  onClick={toggleNameSort}
                  title="Klik untuk mengubah urutan abjad siswa (A-Z / Z-A / Bawaan: Terbaru Ditambahkan)"
                  className="py-3.5 px-4 cursor-pointer hover:bg-blue-50/60 transition select-none group/th"
                >
                  <div className="flex items-center gap-1.5">
                    <span className={nameSort !== 'none' ? 'text-blue-700 font-black' : ''}>
                      Identitas Siswa
                    </span>
                    <span
                      className={`inline-flex items-center justify-center p-1 rounded-md transition ${
                        nameSort === 'none'
                          ? 'text-slate-400 group-hover/th:text-blue-600 group-hover/th:bg-blue-100/60'
                          : 'text-blue-700 bg-blue-100 font-black shadow-2xs'
                      }`}
                    >
                      {nameSort === 'asc' ? (
                        <ArrowUpAZ className="w-4 h-4 text-blue-700" />
                      ) : nameSort === 'desc' ? (
                        <ArrowDownZA className="w-4 h-4 text-blue-700" />
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      )}
                    </span>
                    {nameSort === 'asc' && (
                      <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">
                        A-Z
                      </span>
                    )}
                    {nameSort === 'desc' && (
                      <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md">
                        Z-A
                      </span>
                    )}
                  </div>
                </th>
                <th className="py-3.5 px-4">Lembaga</th>
                <th className="py-3.5 px-4">NIS / NISN</th>
                <th className="py-3.5 px-4">
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Tahun Pelajaran
                  </span>
                </th>
                <th className="py-3.5 px-4">Status Dokumen Pokok</th>
                <th className="py-3.5 px-4">Kelengkapan</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody
              key={`tbody-${selectedInstitution}-${searchTerm.trim()}-${selectedYear}-${statusFilter}`}
              className="divide-y divide-slate-100"
            >
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <FolderOpen className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-700">Tidak ada data siswa ditemukan</p>
                      <p className="text-xs text-slate-400">
                        Coba sesuaikan tab lembaga, kata kunci pencarian, atau filter tahun pelajaran di atas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student, index) => {
                  const studentDocs = documents.filter((d) => d.studentId === student.id);
                  const stats = calculateCompleteness(student, documents);
                  const studentInst: InstitutionLevel =
                    student.institution || parseInstitution(student.classRoom || student.academicYear, 'SMP');
                  const instCfg = INSTITUTION_CONFIGS[studentInst];

                  return (
                    <tr
                      key={`${student.id}_${student.nis || ''}_${index}`}
                      className="hover:bg-blue-50/40 transition group cursor-pointer"
                      onClick={() => onOpenDossier(student)}
                    >
                      {/* Siswa Identitas */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              student.gender === 'L'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-pink-100 text-pink-800'
                            }`}
                          >
                            {student.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-blue-700 transition">
                              {student.name}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">NIK: {student.nik}</div>
                          </div>
                        </div>
                      </td>

                      {/* Lembaga Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold border ${instCfg.badgeClass}`}>
                          {instCfg.name}
                        </span>
                      </td>

                      {/* NIS / NISN */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-800 font-medium">{student.nis}</div>
                        <div className="text-[11px] font-mono text-slate-500 font-semibold">
                          NISN: {student.nisn}
                        </div>
                      </td>

                      {/* Tahun Pelajaran */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>{student.classRoom}</span>
                        </span>
                      </td>

                      {/* Document Type Badges: KK, Akta, Ijazah, KTP, KIP */}
                      <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <div className="text-center">
                            {getDocStatusBadge(student.id, 'kk')}
                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">KK</span>
                          </div>
                          <div className="text-center">
                            {getDocStatusBadge(student.id, 'akta')}
                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Akta</span>
                          </div>
                          <div className="text-center">
                            {getDocStatusBadge(student.id, 'ijazah')}
                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">Ijazah</span>
                          </div>
                          <div className="text-center">
                            {getDocStatusBadge(student.id, 'ktp')}
                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">KTP</span>
                          </div>
                          <div className="text-center">
                            {getDocStatusBadge(student.id, 'kip')}
                            <span className="text-[9px] text-slate-400 font-semibold block mt-0.5">KIP</span>
                          </div>
                        </div>
                      </td>

                      {/* Completeness Bar */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 max-w-[120px]">
                          <div className="flex justify-between items-center text-[11px]">
                            <span
                              className={`font-bold ${
                                stats.isComplete ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {stats.isComplete ? 'Lengkap' : `${stats.mandatoryUploaded}/3 Wajib`}
                            </span>
                            <span className="text-slate-400 text-[10px]">{stats.percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full ${
                                stats.isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                              }`}
                              style={{ width: `${stats.percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onOpenDossier(student)}
                            title="Buka Arsip & Kelola Dokumen Siswa"
                            className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => downloadStudentZip(student, studentDocs)}
                            title="Unduh Berkas Siswa (ZIP)"
                            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {(currentUserRole === 'admin' || currentUserRole === 'petugas_tu') && (
                            <button
                              onClick={() => onEditStudent(student)}
                              title="Edit Biodata Siswa"
                              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {(currentUserRole === 'admin' || currentUserRole === 'petugas_tu') && (
                            <button
                              onClick={() => onDeleteStudent(student.id, student.name)}
                              title="Hapus Siswa & Seluruh Dokumen"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Legend footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-700">Keterangan:</span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-[9px] flex items-center justify-center">
                ✓
              </span>
              Valid / Sah
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300 text-amber-800 font-bold text-[9px] flex items-center justify-center">
                ?
              </span>
              Menunggu Verifikasi
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300 text-rose-800 font-bold text-[9px] flex items-center justify-center">
                !
              </span>
              Perlu Revisi
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200 text-slate-400 font-bold text-[9px] flex items-center justify-center">
                -
              </span>
              Belum Diunggah
            </span>
          </div>
          <div>
            *Dokumen Pokok Wajib: <strong>Kartu Keluarga, Akta Kelahiran, dan Ijazah/SKL</strong>
          </div>
        </div>
      </div>

      {/* Modal Kelola Tahun Pelajaran */}
      <ManageAcademicYearsModal
        isOpen={isManageYearsOpen}
        onClose={() => setIsManageYearsOpen(false)}
        academicYears={academicYears}
        students={students}
        onYearsUpdated={handleYearsUpdated}
      />
    </div>
  );
};

