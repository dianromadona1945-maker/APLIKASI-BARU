import React, { useState, useMemo } from 'react';
import {
  FileText,
  Users,
  CheckCircle2,
  Upload,
  Search,
  ArrowRight,
  ShieldCheck,
  Download,
  FolderOpen,
  Award,
  CreditCard,
  GraduationCap,
  Sparkles,
  Calendar,
  School,
  X,
} from 'lucide-react';
import { Student, StudentDocument, DocumentType, InstitutionLevel } from '../types';
import { DOCUMENT_CONFIGS, INSTITUTION_CONFIGS, INSTITUTION_LIST } from '../data/constants';
import { calculateCompleteness, getAcademicYears, parseInstitution, extractYearCycle } from '../services/storage';

interface DashboardOverviewProps {
  students: Student[];
  documents: StudentDocument[];
  onOpenStudentDossier: (student: Student) => void;
  onAddNewStudent: () => void;
  onNavigate: (view: string) => void;
}

type SearchFieldMode = 'all' | 'name' | 'id' | 'nik' | 'parent';

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  students,
  documents,
  onOpenStudentDossier,
  onAddNewStudent,
  onNavigate,
}) => {
  const [quickSearch, setQuickSearch] = useState('');
  const [searchFieldMode, setSearchFieldMode] = useState<SearchFieldMode>('all');
  const [yearFilterInstitution, setYearFilterInstitution] = useState<'ALL' | InstitutionLevel>('ALL');

  // Key metrics calculation
  const totalStudents = students.length;
  const totalDocuments = documents.length;

  // Completeness stats across all students
  const studentCompletenessMap = students.map((s) => ({
    student: s,
    stats: calculateCompleteness(s, documents),
    institution: s.institution || parseInstitution(s.classRoom || s.academicYear, 'SMP'),
  }));

  const fullyCompleteStudents = studentCompletenessMap.filter((item) => item.stats.isComplete).length;
  const schoolCompletenessPercentage =
    totalStudents > 0 ? Math.round((fullyCompleteStudents / totalStudents) * 100) : 0;

  // Institution Breakdown Metrics
  const institutionStats = useMemo(() => {
    return INSTITUTION_LIST.map((inst) => {
      const instStudents = studentCompletenessMap.filter((item) => item.institution === inst.code);
      const completeCount = instStudents.filter((item) => item.stats.isComplete).length;
      const percentage = instStudents.length > 0 ? Math.round((completeCount / instStudents.length) * 100) : 0;
      return {
        ...inst,
        total: instStudents.length,
        complete: completeCount,
        percentage,
      };
    });
  }, [studentCompletenessMap]);

  // Counts by document type
  const docTypeCounts: Record<DocumentType, number> = {
    kk: documents.filter((d) => d.docType === 'kk').length,
    ktp: documents.filter((d) => d.docType === 'ktp').length,
    akta: documents.filter((d) => d.docType === 'akta').length,
    ijazah: documents.filter((d) => d.docType === 'ijazah').length,
    kip: documents.filter((d) => d.docType === 'kip').length,
    lainnya: documents.filter((d) => d.docType === 'lainnya').length,
  };

  // Precision Quick Search Results
  // Strictly excludes generic institution ("SMK") and academicYear ("SMK - 2024/2025") from text query
  // to avoid flooding results with all students in the school.
  const { filteredStudents, exactMatchIds } = useMemo(() => {
    const rawQuery = quickSearch.trim();
    if (!rawQuery) {
      return { filteredStudents: [], exactMatchIds: new Set<string>() };
    }

    const queryLower = rawQuery.toLowerCase();
    const queryDigits = queryLower.replace(/\D/g, '');
    const tokens = queryLower.split(/\s+/).filter(Boolean);

    const matches = students.filter((s) => {
      const nameLower = (s.name || '').toLowerCase();
      const nis = (s.nis || '').trim();
      const nisn = (s.nisn || '').trim();
      const nik = (s.nik || '').trim();
      const parentName = (s.parentName || '').toLowerCase();
      const parentPhone = (s.parentPhone || '').trim();

      if (searchFieldMode === 'name') {
        return tokens.every((token) => nameLower.includes(token));
      }

      if (searchFieldMode === 'id') {
        const nisMatches = nis.toLowerCase().includes(queryLower) || (queryDigits && nis.replace(/\D/g, '').includes(queryDigits));
        const nisnMatches = nisn.toLowerCase().includes(queryLower) || (queryDigits && nisn.replace(/\D/g, '').includes(queryDigits));
        return nisMatches || nisnMatches;
      }

      if (searchFieldMode === 'nik') {
        return Boolean(nik && (nik.includes(rawQuery) || (queryDigits && nik.replace(/\D/g, '').includes(queryDigits))));
      }

      if (searchFieldMode === 'parent') {
        return (
          tokens.every((token) => parentName.includes(token)) ||
          Boolean(parentPhone && parentPhone.includes(rawQuery))
        );
      }

      // Default 'all': Search across specific student identifiers only
      const nameMatches = tokens.every((token) => nameLower.includes(token));
      const nisMatches = nis.toLowerCase().includes(queryLower) || (queryDigits && queryDigits.length >= 3 && nis.replace(/\D/g, '').includes(queryDigits));
      const nisnMatches = nisn.toLowerCase().includes(queryLower) || (queryDigits && queryDigits.length >= 3 && nisn.replace(/\D/g, '').includes(queryDigits));
      const nikMatches = Boolean(nik && (nik.includes(rawQuery) || (queryDigits && queryDigits.length >= 4 && nik.replace(/\D/g, '').includes(queryDigits))));
      const parentPhoneMatches = Boolean(parentPhone && queryDigits && queryDigits.length >= 4 && parentPhone.replace(/\D/g, '').includes(queryDigits));
      const parentNameMatches = tokens.every((token) => parentName.includes(token));

      return nameMatches || nisMatches || nisnMatches || nikMatches || parentPhoneMatches || parentNameMatches;
    });

    const exactIds = new Set<string>();

    // Score candidates for precise relevance ordering
    const scored = matches.map((s) => {
      const nameLower = (s.name || '').toLowerCase();
      const nis = (s.nis || '').trim();
      const nisn = (s.nisn || '').trim();
      const nik = (s.nik || '').trim();

      let score = 100;
      let isExact = false;

      // 1. Exact match on full name, NIS, NISN, or NIK
      if (nameLower === queryLower || nis === rawQuery || nisn === rawQuery || (nik && nik === rawQuery)) {
        score = 0;
        isExact = true;
        exactIds.add(s.id);
      }
      // 2. Name starts with full query
      else if (nameLower.startsWith(queryLower)) {
        score = 10;
      }
      // 3. NIS or NISN starts with query
      else if (nis.startsWith(rawQuery) || nisn.startsWith(rawQuery)) {
        score = 15;
      }
      // 4. Name contains the exact full phrase
      else if (nameLower.includes(queryLower)) {
        score = 25;
      }
      // 5. First token matches start of name
      else if (tokens.length > 0 && nameLower.startsWith(tokens[0])) {
        score = 40;
      }

      return { student: s, score, isExact };
    });

    scored.sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.student.name.localeCompare(b.student.name);
    });

    return {
      filteredStudents: scored.map((item) => item.student),
      exactMatchIds: exactIds,
    };
  }, [students, quickSearch, searchFieldMode]);

  // Group by Academic Year
  const academicYears = getAcademicYears();
  const allYears = Array.from(
    new Set([
      ...academicYears,
      ...students.map((s) => s.classRoom || s.academicYear || '').filter(Boolean),
    ])
  );

  const yearBreakdown = allYears
    .map((yearName) => {
      const inst = parseInstitution(yearName, 'SMP');
      const cycle = extractYearCycle(yearName);
      const yearStudents = students.filter((s) => {
        const sInst = s.institution || parseInstitution(s.classRoom || s.academicYear, 'SMP');
        const sClass = s.classRoom || s.academicYear || '';
        return (
          sClass === yearName ||
          (sInst === inst && extractYearCycle(sClass) === cycle)
        );
      });
      const completeInYear = yearStudents.filter(
        (s) => calculateCompleteness(s, documents).isComplete
      ).length;
      const percentage =
        yearStudents.length > 0
          ? Math.round((completeInYear / yearStudents.length) * 100)
          : 0;
      return {
        yearName,
        institution: inst,
        cycle,
        total: yearStudents.length,
        complete: completeInYear,
        percentage,
      };
    })
    .filter((item) => {
      if (yearFilterInstitution !== 'ALL' && item.institution !== yearFilterInstitution) {
        return false;
      }
      return item.total > 0;
    });

  const getDocIcon = (type: DocumentType) => {
    switch (type) {
      case 'kk':
        return Users;
      case 'ktp':
        return CreditCard;
      case 'akta':
        return FileText;
      case 'ijazah':
        return GraduationCap;
      case 'kip':
        return Award;
      default:
        return FolderOpen;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Search Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative">
        {/* Background decorative watermark with isolated clipping */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pr-10">
            <GraduationCap className="w-80 h-80" />
          </div>
        </div>

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Digitalisasi Dokumen Administrasi Siswa Terpadu (SD, SMP, SMK)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Pusat Pengelolaan Arsip Digital 3 Lembaga
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-300 leading-relaxed">
            Menyimpan, mengelola, mencari, dan mengarsipkan dokumen penting (KK, KTP, Akta Kelahiran, Ijazah, KIP)
            secara terstruktur dan terpisah antara jenjang <strong>SD</strong>, <strong>SMP</strong>, dan <strong>SMK</strong>.
          </p>

          {/* Quick Search Bar with Precision Filter Modes */}
          <div className="mt-6 relative">
            {/* Search Mode Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
              <span className="text-xs text-blue-200 font-semibold mr-1 flex items-center gap-1">
                <span>Cari Berdasarkan:</span>
              </span>
              {(
                [
                  { id: 'all', label: 'Semua Kriteria' },
                  { id: 'name', label: 'Nama Siswa' },
                  { id: 'id', label: 'NIS / NISN' },
                  { id: 'nik', label: 'NIK Siswa' },
                  { id: 'parent', label: 'No. HP / Ortu' },
                ] as const
              ).map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setSearchFieldMode(mode.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    searchFieldMode === mode.id
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'bg-slate-900/60 hover:bg-slate-900 text-slate-300 border border-white/10'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-blue-300 pointer-events-none" />
              <input
                id="input-dashboard-search"
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredStudents.length > 0) {
                    onOpenStudentDossier(filteredStudents[0]);
                    setQuickSearch('');
                  } else if (e.key === 'Escape') {
                    setQuickSearch('');
                  }
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder={
                  searchFieldMode === 'name'
                    ? 'Ketik nama siswa (contoh: Ahla Mardhiatul Maula)...'
                    : searchFieldMode === 'id'
                    ? 'Ketik NIS atau NISN siswa...'
                    : searchFieldMode === 'nik'
                    ? 'Ketik NIK siswa...'
                    : searchFieldMode === 'parent'
                    ? 'Ketik nama orang tua atau no. telepon/WA...'
                    : 'Cari 1 siswa: Ketik Nama Lengkap, NIS, NISN, atau NIK...'
                }
                className="w-full pl-12 pr-28 py-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/30 text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition shadow-inner"
              />
              {quickSearch && (
                <button
                  type="button"
                  onClick={() => setQuickSearch('')}
                  className="absolute right-3.5 top-2.5 text-xs bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-lg font-bold cursor-pointer transition flex items-center gap-1"
                  title="Bersihkan kolom pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Bersihkan</span>
                </button>
              )}
            </div>

            {/* Live Search dropdown overlay */}
            {quickSearch.trim() !== '' && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-300 text-slate-900 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/10">
                <div className="p-3 bg-slate-100 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse"></span>
                    <span>
                      Hasil Pencarian: <b>{filteredStudents.length} siswa ditemukan</b>
                    </span>
                    {exactMatchIds.size > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-extrabold border border-emerald-300">
                        {exactMatchIds.size} Cocok Tepat
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      Tekan <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-300 font-mono text-[10px]">Enter ↵</kbd> untuk buka siswa teratas
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuickSearch('')}
                      className="text-slate-600 hover:text-slate-900 text-xs font-bold px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 transition cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>

                <div className="max-h-84 overflow-y-auto divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <div className="p-6 text-center space-y-2">
                      <p className="text-sm font-bold text-slate-700">
                        Tidak ditemukan siswa dengan kata kunci "{quickSearch}"
                      </p>
                      <p className="text-xs text-slate-500">
                        Pastikan ejaan nama, NIS, NISN, atau NIK sudah sesuai, atau ganti mode pencarian di atas.
                      </p>
                    </div>
                  ) : (
                    <>
                      {filteredStudents.slice(0, 15).map((std, index) => {
                        const stats = calculateCompleteness(std, documents);
                        const stdInst = std.institution || parseInstitution(std.classRoom || std.academicYear, 'SMP');
                        const instCfg = INSTITUTION_CONFIGS[stdInst];
                        const isExact = exactMatchIds.has(std.id);

                        return (
                          <div
                            key={std.id}
                            onClick={() => {
                              onOpenStudentDossier(std);
                              setQuickSearch('');
                            }}
                            className={`p-3.5 cursor-pointer flex items-center justify-between transition group ${
                              isExact
                                ? 'bg-emerald-50/60 hover:bg-emerald-100/70 border-l-4 border-l-emerald-500'
                                : index === 0 && filteredStudents.length === 1
                                ? 'bg-blue-50/80 hover:bg-blue-100/80'
                                : 'hover:bg-blue-50/60'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${instCfg.badgeClass}`}>
                                  {instCfg.code}
                                </span>
                                <span className="font-extrabold text-sm text-slate-900 group-hover:text-blue-700 transition">
                                  {std.name}
                                </span>
                                {isExact && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white shadow-2xs">
                                    Cocok Tepat (100%)
                                  </span>
                                )}
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-600">
                                  {std.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                                </span>
                              </div>
                              <div className="text-xs text-slate-600 flex flex-wrap items-center gap-2">
                                <span className="font-mono font-bold text-blue-700">NIS: {std.nis}</span>
                                <span className="text-slate-300">•</span>
                                <span className="font-mono text-slate-600">NISN: {std.nisn}</span>
                                {std.nik && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="font-mono text-slate-500">NIK: {std.nik}</span>
                                  </>
                                )}
                                <span className="text-slate-300">•</span>
                                <span className="font-semibold text-slate-800">{std.classRoom}</span>
                                {std.parentPhone && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="text-slate-500">HP: {std.parentPhone}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0 ml-3">
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full font-extrabold border ${
                                  stats.isComplete
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-amber-50 text-amber-800 border-amber-300'
                                }`}
                              >
                                {stats.isComplete ? 'Berkas Lengkap' : `${stats.mandatoryUploaded}/3 Wajib`}
                              </span>
                              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition flex items-center gap-1 text-xs font-bold">
                                <span className="hidden sm:inline">Buka Dokumen</span>
                                <ArrowRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {filteredStudents.length > 15 && (
                        <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-200">
                          Menampilkan 15 dari total <b>{filteredStudents.length}</b> hasil. Ketik nama lengkap atau nomor NIS agar langsung mengerucut ke 1 orang siswa.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 Institutions Breakdown Overview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {institutionStats.map((inst) => (
          <div
            key={inst.code}
            className={`p-4 rounded-2xl border bg-white shadow-xs hover:shadow-md transition ${inst.cardBorder}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-lg text-xs font-extrabold border ${inst.badgeClass}`}>
                  {inst.code}
                </span>
                <span className="font-extrabold text-sm text-slate-800">{inst.shortTitle}</span>
              </div>
              <span className="text-xs font-bold text-slate-500">{inst.percentage}% Lengkap</span>
            </div>
            <div className="flex items-baseline justify-between mt-3">
              <div>
                <span className="text-2xl font-extrabold text-slate-900">{inst.total}</span>
                <span className="text-xs text-slate-500 ml-1.5">Siswa Terdaftar</span>
              </div>
              <span className="text-xs font-semibold text-emerald-600">
                {inst.complete} Berkas Beres
              </span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className={`h-2 rounded-full transition-all duration-500 ${
                  inst.code === 'SD'
                    ? 'bg-emerald-500'
                    : inst.code === 'SMP'
                    ? 'bg-blue-600'
                    : 'bg-purple-600'
                }`}
                style={{ width: `${inst.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Siswa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Siswa</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900">{totalStudents} Siswa</div>
            <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">{fullyCompleteStudents} Lengkap</span>
              <span>•</span>
              <span>{totalStudents - fullyCompleteStudents} Belum Lengkap</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Dokumen */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Dokumen Diarsipkan</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-slate-900">{totalDocuments} Berkas</div>
            <div className="mt-1 text-xs text-slate-500">Tersimpan dalam format digital</div>
          </div>
        </div>

        {/* Card 3: Status Kelengkapan Siswa */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Berkas Lengkap</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-extrabold text-emerald-600">
              {fullyCompleteStudents} Siswa
              <span className="text-sm font-semibold text-slate-500 ml-1.5">
                ({totalStudents > 0 ? Math.round((fullyCompleteStudents / totalStudents) * 100) : 0}%)
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
              <span>{totalStudents - fullyCompleteStudents} siswa belum melengkapi berkas</span>
            </div>
          </div>
        </div>

        {/* Card 4: Rasio Kelengkapan Sekolah */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rasio Kelengkapan</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-slate-900">{schoolCompletenessPercentage}%</div>
              <span className="text-xs font-bold text-slate-500">Berkas Wajib</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${schoolCompletenessPercentage}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Document Categories & Class Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dokumen Wajib & Status Ketersediaan */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Arsip Berdasarkan Jenis Dokumen</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pemenuhan berkas identitas dan berkas pendukung administrasi
              </p>
            </div>
            <button
              onClick={() => onNavigate('students')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Semua Siswa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(Object.keys(DOCUMENT_CONFIGS) as DocumentType[]).map((type) => {
              const config = DOCUMENT_CONFIGS[type];
              const count = docTypeCounts[type] || 0;
              const Icon = getDocIcon(type);
              const percentage = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;

              return (
                <div
                  key={type}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-200 transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${config.badgeColor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    {config.isMandatory ? (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        Wajib
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        Pendukung
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-sm text-slate-900">{config.shortTitle}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{config.title}</p>

                  <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-end justify-between">
                    <div>
                      <div className="text-lg font-extrabold text-slate-900">{count} Berkas</div>
                      <div className="text-[11px] text-slate-500">{percentage}% siswa memiliki</div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-blue-600">Terarsip</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Actions Panel */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap gap-3">
            <button
              onClick={onAddNewStudent}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-xs hover:shadow transition cursor-pointer"
            >
              <Users className="w-4 h-4" />
              <span>+ Tambah Siswa Baru</span>
            </button>
            <button
              onClick={() => onNavigate('students')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span>Buka Daftar Siswa &amp; Upload</span>
            </button>
            <button
              onClick={() => onNavigate('backup')}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Cadangkan Data (Backup)</span>
            </button>
          </div>
        </div>

        {/* Right 1 Col: Kelengkapan per Tahun Pelajaran */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Progres Tahun Pelajaran</span>
              </h2>
            </div>

            {/* Institution Filter Tabs for Year Progress */}
            <div className="flex gap-1 mb-3 p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setYearFilterInstitution('ALL')}
                className={`flex-1 py-1 text-center rounded-lg transition cursor-pointer ${
                  yearFilterInstitution === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua
              </button>
              {INSTITUTION_LIST.map((inst) => (
                <button
                  key={inst.code}
                  type="button"
                  onClick={() => setYearFilterInstitution(inst.code)}
                  className={`flex-1 py-1 text-center rounded-lg transition cursor-pointer ${
                    yearFilterInstitution === inst.code
                      ? `bg-white ${inst.colorClass} shadow-2xs font-extrabold`
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {inst.code}
                </button>
              ))}
            </div>

            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
              {yearBreakdown.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Belum ada data siswa untuk tahun pelajaran yang dipilih.
                </div>
              ) : (
                yearBreakdown.map((item) => {
                  const instCfg = INSTITUTION_CONFIGS[item.institution];
                  return (
                    <div key={item.yearName} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${instCfg.badgeClass}`}>
                            {instCfg.code}
                          </span>
                          <span className="font-bold text-slate-800">{item.cycle}</span>
                        </div>
                        <span className="font-semibold text-slate-600">
                          {item.complete}/{item.total} Siswa ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${
                            item.percentage === 100
                              ? 'bg-emerald-500'
                              : item.percentage >= 50
                              ? 'bg-blue-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-900 text-xs leading-relaxed">
            <div className="font-bold flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <span>Standar Administrasi Berkas</span>
            </div>
            Siswa dinyatakan <strong>Lengkap</strong> apabila ketiga dokumen pokok: <em>Kartu Keluarga</em>,{' '}
            <em>Akta Kelahiran</em>, dan <em>Ijazah/SKL</em> telah terunggah ke dalam arsip digital.
          </div>
        </div>
      </div>
    </div>
  );
};

