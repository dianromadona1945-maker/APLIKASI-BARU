import React, { useState, useEffect } from 'react';
import { X, User, Hash, Calendar, MapPin, Phone, Building, Save, Plus, Check, School, FileSpreadsheet } from 'lucide-react';
import { Student, InstitutionLevel } from '../types';
import {
  getAcademicYears,
  addAcademicYear,
  parseInstitution,
  extractYearCycle,
  formatAcademicYear,
} from '../services/storage';
import { INSTITUTION_CONFIGS, INSTITUTION_LIST } from '../data/constants';

interface StudentFormModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => void;
  onYearsUpdated?: (years: string[]) => void;
  onOpenImportExcel?: () => void;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  student,
  isOpen,
  onClose,
  onSave,
  onYearsUpdated,
  onOpenImportExcel,
}) => {
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [showInlineAddYear, setShowInlineAddYear] = useState(false);
  const [inlineNewYear, setInlineNewYear] = useState('');
  const [inlineYearError, setInlineYearError] = useState<string | null>(null);

  const [institution, setInstitution] = useState<InstitutionLevel>('SMP');
  const [yearCycle, setYearCycle] = useState('2025/2026');

  const [formData, setFormData] = useState({
    name: '',
    nis: '',
    nisn: '',
    nik: '',
    birthPlace: '',
    birthDate: '',
    gender: 'L' as 'L' | 'P',
    address: '',
    parentName: '',
    parentPhone: '',
    status: 'Aktif' as 'Aktif' | 'Lulus' | 'Pindah',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const years = getAcademicYears();
    setAcademicYears(years);

    if (student) {
      const activeInst: InstitutionLevel =
        student.institution || parseInstitution(student.classRoom || student.academicYear, 'SMP');
      const activeCycle = extractYearCycle(student.classRoom || student.academicYear || '2025/2026');

      setInstitution(activeInst);
      setYearCycle(activeCycle);

      setFormData({
        name: student.name,
        nis: student.nis,
        nisn: student.nisn,
        nik: student.nik,
        birthPlace: student.birthPlace,
        birthDate: student.birthDate,
        gender: student.gender,
        address: student.address,
        parentName: student.parentName,
        parentPhone: student.parentPhone,
        status: student.status,
      });
    } else {
      // Auto generate random sample NIS/NISN for quick convenience
      const randNis = '2425' + Math.floor(1000 + Math.random() * 9000);
      const randNisn = '008' + Math.floor(1000000 + Math.random() * 9000000);
      const randNik = '320108' + Math.floor(1000000000 + Math.random() * 9000000000);

      setInstitution('SMP');
      setYearCycle('2025/2026');

      setFormData({
        name: '',
        nis: randNis,
        nisn: randNisn,
        nik: randNik,
        birthPlace: 'Bogor',
        birthDate: '10 Mei 2008',
        gender: 'L',
        address: '',
        parentName: '',
        parentPhone: '',
        status: 'Aktif',
      });
    }
    setErrors({});
    setShowInlineAddYear(false);
    setInlineNewYear('');
    setInlineYearError(null);
  }, [student, isOpen]);

  if (!isOpen) return null;

  // Available year cycles
  const availableCycles: string[] = Array.from(
    new Set<string>(academicYears.map((y) => extractYearCycle(y)))
  ).sort((a, b) => b.localeCompare(a));

  if (!availableCycles.includes('2025/2026')) {
    availableCycles.unshift('2025/2026');
  }

  const handleQuickAddYear = () => {
    const trimmed = inlineNewYear.trim();
    if (!trimmed) {
      setInlineYearError('Tahun pelajaran tidak boleh kosong.');
      return;
    }

    const res = addAcademicYear(trimmed, institution);
    if (!res.success) {
      setInlineYearError(res.message || 'Gagal menambahkan tahun pelajaran.');
    } else {
      setAcademicYears(res.years);
      const newCycle = extractYearCycle(trimmed);
      setYearCycle(newCycle);
      setInlineNewYear('');
      setShowInlineAddYear(false);
      setInlineYearError(null);
      if (onYearsUpdated) onYearsUpdated(res.years);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'Nama lengkap siswa wajib diisi.';
    if (!formData.nis.trim()) newErrors.nis = 'NIS wajib diisi.';
    if (!formData.nisn.trim()) newErrors.nisn = 'NISN wajib diisi.';
    if (formData.nisn.length < 10) newErrors.nisn = 'NISN normalnya terdiri dari 10 digit.';
    if (!formData.nik.trim()) newErrors.nik = 'NIK wajib diisi.';
    if (formData.nik.length < 16) newErrors.nik = 'NIK normalnya terdiri dari 16 digit.';
    if (!yearCycle.trim()) newErrors.yearCycle = 'Tahun pelajaran wajib dipilih.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const formattedYear = formatAcademicYear(institution, yearCycle);

    onSave({
      ...(student ? { id: student.id } : {}),
      ...formData,
      address: formData.address || student?.address || '-',
      parentName: formData.parentName || student?.parentName || '-',
      parentPhone: formData.parentPhone || student?.parentPhone || '-',
      institution,
      classRoom: formattedYear,
      academicYear: formattedYear,
    });
    onClose();
  };

  const selectedInstConfig = INSTITUTION_CONFIGS[institution];

  return (
    <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white">
                {student ? 'Ubah Data Siswa' : 'Tambah Siswa Baru ke Sistem'}
              </h3>
              <p className="text-[11px] text-slate-300">
                Pilih lembaga (SD, SMP, atau SMK) dan tahun pelajaran
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Quick Excel Import Banner */}
          {!student && onOpenImportExcel && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-emerald-950">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  Punya data dalam format Excel? Tambahkan puluhan siswa sekaligus tanpa input satu per satu.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImportExcel();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shrink-0 shadow-2xs transition cursor-pointer"
              >
                <span>Buka Impor Excel</span>
              </button>
            </div>
          )}

          {/* INSTITUTION SELECTOR (SD, SMP, SMK) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <School className="w-4 h-4 text-blue-600" />
                <span>Pilih Lembaga Pendidikan <span className="text-rose-500">*</span></span>
              </label>
              <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold border ${selectedInstConfig.badgeClass}`}>
                {selectedInstConfig.name}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {INSTITUTION_LIST.map((inst) => {
                const isSelected = institution === inst.code;
                return (
                  <button
                    key={inst.code}
                    type="button"
                    onClick={() => setInstitution(inst.code)}
                    className={`py-2 px-3 rounded-xl border text-center transition cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      isSelected
                        ? `${inst.cardBorder} ${inst.bgLight} ring-2 ring-blue-500 shadow-xs`
                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span className="font-extrabold text-sm text-slate-900">{inst.code}</span>
                    <span className="text-[10px] text-slate-500 font-medium line-clamp-1">{inst.shortTitle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Lengkap */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nama Lengkap Siswa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Muhammad Farhan Alamsyah"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition font-medium"
              />
              {errors.name && <p className="text-rose-500 text-[11px] mt-1">{errors.name}</p>}
            </div>

            {/* NIS */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor Induk Siswa (NIS) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nis}
                onChange={(e) => setFormData({ ...formData, nis: e.target.value })}
                placeholder="Contoh: 23241010"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono transition"
              />
              {errors.nis && <p className="text-rose-500 text-[11px] mt-1">{errors.nis}</p>}
            </div>

            {/* NISN */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                NISN (10 Digit) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={10}
                value={formData.nisn}
                onChange={(e) => setFormData({ ...formData, nisn: e.target.value })}
                placeholder="Contoh: 0089123456"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono transition"
              />
              {errors.nisn && <p className="text-rose-500 text-[11px] mt-1">{errors.nisn}</p>}
            </div>

            {/* NIK */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                NIK (16 Digit Kependudukan) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                maxLength={16}
                value={formData.nik}
                onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                placeholder="Contoh: 3201081503080002"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono transition"
              />
              {errors.nik && <p className="text-rose-500 text-[11px] mt-1">{errors.nik}</p>}
            </div>

            {/* Tahun Pelajaran */}
            <div className="sm:col-span-2 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tahun Pelajaran ({selectedInstConfig.name})</span>
                  <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowInlineAddYear(!showInlineAddYear)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 hover:underline cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showInlineAddYear ? 'Tutup Input Cepat' : '+ Tambah Tahun Baru'}</span>
                </button>
              </div>

              {/* Inline Add Year Form */}
              {showInlineAddYear && (
                <div className="mb-2.5 p-2.5 bg-white rounded-lg border border-blue-200 shadow-2xs space-y-1.5">
                  <p className="text-[11px] text-slate-600 font-medium">
                    Masukkan Siklus Tahun Baru untuk <b>{selectedInstConfig.name}</b> (Contoh: 2027/2028):
                  </p>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={inlineNewYear}
                      onChange={(e) => {
                        setInlineNewYear(e.target.value);
                        if (inlineYearError) setInlineYearError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleQuickAddYear();
                        }
                      }}
                      placeholder="Contoh: 2027/2028"
                      className="flex-1 px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleQuickAddYear}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-md transition shadow-2xs flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan &amp; Pilih</span>
                    </button>
                  </div>
                  {inlineYearError && (
                    <p className="text-rose-600 text-[11px] font-medium">{inlineYearError}</p>
                  )}
                </div>
              )}

              <select
                id="student-form-academic-year-select"
                value={yearCycle}
                onChange={(e) => setYearCycle(e.target.value)}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
              >
                {availableCycles.map((cycle) => (
                  <option key={cycle} value={cycle}>
                    {institution} - Tahun Pelajaran {cycle}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Tersimpan sebagai: <span className="font-semibold text-slate-800">{institution} - {yearCycle}</span>
              </p>
              {errors.yearCycle && (
                <p className="text-rose-500 text-[11px] mt-1">{errors.yearCycle}</p>
              )}
            </div>

            {/* Tempat Lahir */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tempat Lahir</label>
              <input
                type="text"
                value={formData.birthPlace}
                onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                placeholder="Contoh: Bogor"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Tanggal Lahir */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tanggal Lahir</label>
              <input
                type="text"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                placeholder="Contoh: 15 Maret 2008"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Jenis Kelamin */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
              <div className="flex gap-3 mt-1">
                <label className="inline-flex items-center text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    checked={formData.gender === 'L'}
                    onChange={() => setFormData({ ...formData, gender: 'L' })}
                    className="mr-1.5 text-blue-600"
                  />
                  Laki-Laki (L)
                </label>
                <label className="inline-flex items-center text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    checked={formData.gender === 'P'}
                    onChange={() => setFormData({ ...formData, gender: 'P' })}
                    className="mr-1.5 text-pink-600"
                  />
                  Perempuan (P)
                </label>
              </div>
            </div>

            {/* Nomor HP */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nomor HP / WhatsApp
              </label>
              <input
                type="tel"
                value={formData.parentPhone}
                onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                placeholder="Contoh: 0812-3456-7890"
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            {/* Status Siswa */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Status Keaktifan</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-3.5 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="Aktif">Aktif</option>
                <option value="Lulus">Lulus</option>
                <option value="Pindah">Pindah</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Data Siswa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

