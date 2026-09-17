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
} from 'lucide-react';
import { Student, StudentDocument, DocumentType, UserRole } from '../types';
import { calculateCompleteness, getAcademicYears } from '../services/storage';
import { downloadStudentZip, downloadAllStudentsZip } from '../utils/zipExport';
import { ManageAcademicYearsModal } from './ManageAcademicYearsModal';

interface StudentListProps {
  students: Student[];
  documents: StudentDocument[];
  onOpenDossier: (student: Student) => void;
  onAddNewStudent: () => void;
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
  onEditStudent,
  onDeleteStudent,
  currentUserRole,
  academicYears: propAcademicYears,
  onYearsUpdated,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('Semua Tahun Pelajaran');
  const [statusFilter, setStatusFilter] = useState<'Semua' | 'Lengkap' | 'Belum Lengkap' | 'Kosong'>('Semua');
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

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // Search check
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        student.name.toLowerCase().includes(query) ||
        student.nis.includes(query) ||
        student.nisn.includes(query) ||
        student.nik.includes(query) ||
        student.parentName.toLowerCase().includes(query);

      // Academic Year check
      const matchesYear =
        selectedYear === 'Semua Tahun Pelajaran' ||
        student.classRoom === selectedYear ||
        student.academicYear === selectedYear;

      // Completeness status check
      const stats = calculateCompleteness(student, documents);
      const matchesStatus =
        statusFilter === 'Semua' ||
        (statusFilter === 'Lengkap' && stats.isComplete) ||
        (statusFilter === 'Belum Lengkap' && !stats.isComplete && stats.uploaded > 0) ||
        (statusFilter === 'Kosong' && stats.uploaded === 0);

      return matchesSearch && matchesYear && matchesStatus;
    });
  }, [students, documents, searchTerm, selectedYear, statusFilter]);

  // Export CSV function
  const handleExportCsv = () => {
    const headers = ['Nama Siswa', 'NIS', 'NISN', 'NIK', 'Tahun Pelajaran', 'TTL', 'Alamat', 'Orang Tua', 'Status Kelengkapan', 'KK', 'KTP', 'Akta', 'Ijazah', 'KIP'];
    const rows = filteredStudents.map((s) => {
      const sDocs = documents.filter((d) => d.studentId === s.id);
      const stats = calculateCompleteness(s, documents);
      const hasDoc = (type: DocumentType) => (sDocs.some((d) => d.docType === type) ? 'Ada' : 'Belum');
      return [
        `"${s.name}"`,
        `"${s.nis}"`,
        `"${s.nisn}"`,
        `"${s.nik}"`,
        `"${s.classRoom}"`,
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
    link.setAttribute('download', `Rekap_Arsip_Siswa_${selectedYear.replace(/[\s\/]+/g, '_')}.csv`);
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

    if (doc.verificationStatus === 'verified') {
      return (
        <span
          title={`${doc.title} (Terverifikasi)`}
          className="w-6 h-6 rounded-md bg-emerald-100 border border-emerald-300 text-[10px] font-bold text-emerald-800 flex items-center justify-center shadow-2xs"
        >
          ✓
        </span>
      );
    } else if (doc.verificationStatus === 'revision') {
      return (
        <span
          title={`${doc.title} (Perlu Revisi)`}
          className="w-6 h-6 rounded-md bg-rose-100 border border-rose-300 text-[10px] font-bold text-rose-800 flex items-center justify-center"
        >
          !
        </span>
      );
    } else {
      return (
        <span
          title={`${doc.title} (Menunggu Verifikasi)`}
          className="w-6 h-6 rounded-md bg-amber-100 border border-amber-300 text-[10px] font-bold text-amber-800 flex items-center justify-center"
        >
          ?
        </span>
      );
    }
  };

  return (
    <div className="space-y-5">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900">Data Siswa &amp; Arsip Dokumen</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Menampilkan {filteredStudents.length} dari total {students.length} siswa terdaftar
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCsv}
            title="Download file rekapitulasi data siswa ke format CSV/Excel"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Excel</span>
          </button>

          <button
            onClick={() => downloadAllStudentsZip(filteredStudents, documents)}
            title="Download seluruh dokumen digital siswa terarsip dalam bentuk ZIP"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition"
          >
            <Archive className="w-4 h-4 text-indigo-600" />
            <span>Unduh Semua Berkas (ZIP)</span>
          </button>

          <button
            id="manage-academic-years-open-btn"
            onClick={() => setIsManageYearsOpen(true)}
            title="Kelola & Tambah Tahun Pelajaran baru"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Th. Pelajaran</span>
          </button>

          {(currentUserRole === 'admin' || currentUserRole === 'petugas_tu') && (
            <button
              onClick={onAddNewStudent}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs hover:shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Siswa</span>
            </button>
          )}
        </div>
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
            placeholder="Cari berdasarkan Nama Siswa, NIS, NISN, NIK, atau Nama Orang Tua..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Tahun Pelajaran */}
        <div className="w-full md:w-56 flex items-center gap-1.5">
          <div className="relative flex-1">
            <select
              id="student-list-year-filter"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 hover:bg-slate-100/70 rounded-xl border border-slate-200 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium cursor-pointer"
            >
              <option value="Semua Tahun Pelajaran">Semua Tahun Pelajaran</option>
              {academicYears.map((yr) => (
                <option key={yr} value={yr}>
                  T.P. {yr}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            id="quick-add-year-btn"
            onClick={() => setIsManageYearsOpen(true)}
            title="Tambah atau Kelola Tahun Pelajaran"
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
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-4">Identitas Siswa</th>
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
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto text-center space-y-2">
                      <FolderOpen className="w-10 h-10 mx-auto text-slate-300" />
                      <p className="font-semibold text-slate-700">Tidak ada data siswa ditemukan</p>
                      <p className="text-xs text-slate-400">
                        Coba ubah kata kunci pencarian atau sesuaikan filter tahun pelajaran di atas.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const studentDocs = documents.filter((d) => d.studentId === student.id);
                  const stats = calculateCompleteness(student, documents);

                  return (
                    <tr
                      key={student.id}
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

                      {/* NIS / NISN */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono text-slate-800 font-medium">{student.nis}</div>
                        <div className="text-[11px] font-mono text-slate-500 font-semibold">
                          NISN: {student.nisn}
                        </div>
                      </td>

                      {/* Tahun Pelajaran */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200/80">
                          <Calendar className="w-3 h-3 text-blue-600" />
                          {student.classRoom}
                        </span>
                      </td>

                      {/* Document Type Badges: KK, KTP, Akta, Ijazah, KIP */}
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
                            className="p-1.5 rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition"
                          >
                            <FolderOpen className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => downloadStudentZip(student, studentDocs)}
                            title="Unduh Berkas Siswa (ZIP)"
                            className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {(currentUserRole === 'admin' || currentUserRole === 'petugas_tu') && (
                            <button
                              onClick={() => onEditStudent(student)}
                              title="Edit Biodata Siswa"
                              className="p-1.5 rounded-lg text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {currentUserRole === 'admin' && (
                            <button
                              onClick={() => onDeleteStudent(student.id, student.name)}
                              title="Hapus Siswa & Seluruh Dokumen"
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
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
