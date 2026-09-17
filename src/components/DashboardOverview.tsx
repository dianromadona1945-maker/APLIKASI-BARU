import React, { useState, useMemo } from 'react';
import {
  FileText,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
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

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  students,
  documents,
  onOpenStudentDossier,
  onAddNewStudent,
  onNavigate,
}) => {
  const [quickSearch, setQuickSearch] = useState('');
  const [yearFilterInstitution, setYearFilterInstitution] = useState<'ALL' | InstitutionLevel>('ALL');

  // Key metrics calculation
  const totalStudents = students.length;
  const totalDocuments = documents.length;
  const verifiedDocuments = documents.filter((d) => d.verificationStatus === 'verified').length;
  const pendingDocuments = documents.filter((d) => d.verificationStatus === 'pending').length;
  const revisionDocuments = documents.filter((d) => d.verificationStatus === 'revision').length;

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

  // Quick search results
  const filteredStudents = quickSearch.trim()
    ? students.filter(
        (s) =>
          s.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
          s.nis.includes(quickSearch) ||
          s.nisn.includes(quickSearch) ||
          s.nik.includes(quickSearch) ||
          (s.parentPhone && s.parentPhone.includes(quickSearch)) ||
          (s.institution && s.institution.toLowerCase().includes(quickSearch.toLowerCase())) ||
          s.classRoom.toLowerCase().includes(quickSearch.toLowerCase())
      )
    : [];

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
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none flex items-center pr-10">
          <GraduationCap className="w-80 h-80" />
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
            Menyimpan, mengelola, mencari, dan memverifikasi dokumen penting (KK, KTP, Akta Kelahiran, Ijazah, KIP)
            secara terstruktur dan terpisah antara jenjang <strong>SD</strong>, <strong>SMP</strong>, dan <strong>SMK</strong>.
          </p>

          {/* Quick Search Bar */}
          <div className="mt-6 relative">
            <div className="relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Pencarian cepat: Ketik Nama Siswa, NIS, NISN, NIK, atau Lembaga (SD/SMP/SMK)..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-400 focus:bg-white/15 transition shadow-inner"
              />
              {quickSearch && (
                <button
                  onClick={() => setQuickSearch('')}
                  className="absolute right-3.5 top-3 text-xs bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>

            {/* Live Search dropdown overlay */}
            {quickSearch.trim() !== '' && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-200 text-slate-900 z-50 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center text-xs font-bold text-slate-600">
                  <span>Hasil Pencarian ({filteredStudents.length} siswa ditemukan)</span>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {filteredStudents.length === 0 ? (
                    <div className="p-4 text-center text-sm text-slate-500">
                      Tidak ditemukan siswa dengan kata kunci "{quickSearch}"
                    </div>
                  ) : (
                    filteredStudents.map((std) => {
                      const stats = calculateCompleteness(std, documents);
                      const stdInst = std.institution || parseInstitution(std.classRoom || std.academicYear, 'SMP');
                      const instCfg = INSTITUTION_CONFIGS[stdInst];
                      return (
                        <div
                          key={std.id}
                          onClick={() => {
                            onOpenStudentDossier(std);
                            setQuickSearch('');
                          }}
                          className="p-3.5 hover:bg-blue-50/80 cursor-pointer flex items-center justify-between transition"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`px-1.5 py-0.2 rounded text-[10px] font-extrabold border ${instCfg.badgeClass}`}>
                                {instCfg.code}
                              </span>
                              <span className="font-bold text-sm text-slate-900">{std.name}</span>
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-2 mt-1">
                              <span className="font-mono font-medium text-slate-700">NISN: {std.nisn}</span>
                              <span>•</span>
                              <span className="font-semibold text-blue-700">{std.classRoom}</span>
                              <span>•</span>
                              <span className="font-mono text-slate-500">NIK: {std.nik}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                                stats.isComplete
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {stats.isComplete ? 'Lengkap (100%)' : `${stats.mandatoryUploaded}/3 Wajib`}
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-400" />
                          </div>
                        </div>
                      );
                    })
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
            <div className="text-2xl font-extrabold text-emerald-600">{fullyCompleteStudents} Siswa (100%)</div>
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

