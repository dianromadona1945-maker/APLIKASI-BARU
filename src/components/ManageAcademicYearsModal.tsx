import React, { useState } from 'react';
import { Calendar, Plus, Trash2, X, CheckCircle2, AlertCircle, Sparkles, Users, School } from 'lucide-react';
import { Student, InstitutionLevel } from '../types';
import { addAcademicYear, deleteAcademicYear, parseInstitution, extractYearCycle } from '../services/storage';
import { INSTITUTION_CONFIGS } from '../data/constants';

interface ManageAcademicYearsModalProps {
  isOpen: boolean;
  onClose: () => void;
  academicYears: string[];
  students: Student[];
  onYearsUpdated: (updatedYears: string[]) => void;
}

export const ManageAcademicYearsModal: React.FC<ManageAcademicYearsModalProps> = ({
  isOpen,
  onClose,
  academicYears,
  students,
  onYearsUpdated,
}) => {
  const [inputYear, setInputYear] = useState('');
  const [targetInstitution, setTargetInstitution] = useState<InstitutionLevel | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'ALL' | InstitutionLevel>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Auto-generate suggestions based on latest year cycle
  const getSuggestions = () => {
    let maxStartYear = 2025;
    academicYears.forEach((y) => {
      const cycle = extractYearCycle(y);
      const match = cycle.match(/^(\d{4})\/(\d{4})$/);
      if (match) {
        const start = parseInt(match[1], 10);
        if (start > maxStartYear) maxStartYear = start;
      }
    });

    const suggestions: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const nextStart = maxStartYear + i;
      const nextEnd = nextStart + 1;
      const candidate = `${nextStart}/${nextEnd}`;
      suggestions.push(candidate);
    }
    return suggestions;
  };

  const suggestions = getSuggestions();

  const handleAddYear = (yearCycleToAdd?: string) => {
    const rawCycle = (yearCycleToAdd || inputYear).trim();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!rawCycle) {
      setErrorMsg('Harap masukkan format tahun pelajaran (misal: 2027/2028).');
      return;
    }

    const res = addAcademicYear(rawCycle, targetInstitution);
    if (!res.success) {
      setErrorMsg(res.message || 'Gagal menambahkan tahun pelajaran.');
    } else {
      const labelInst =
        targetInstitution === 'ALL'
          ? '3 Lembaga (SD, SMP, SMK)'
          : INSTITUTION_CONFIGS[targetInstitution].name;
      setSuccessMsg(`Tahun Pelajaran "${rawCycle}" untuk ${labelInst} berhasil ditambahkan.`);
      setInputYear('');
      onYearsUpdated(res.years);
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleDeleteYear = (year: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const studentCount = students.filter(
      (s) => s.classRoom === year || s.academicYear === year
    ).length;

    if (studentCount > 0) {
      setErrorMsg(
        `Tahun Pelajaran "${year}" tidak dapat dihapus karena masih digunakan oleh ${studentCount} siswa.`
      );
      return;
    }

    if (!window.confirm(`Yakin ingin menghapus Tahun Pelajaran "${year}"?`)) {
      return;
    }

    const res = deleteAcademicYear(year, students);
    if (!res.success) {
      setErrorMsg(res.message || 'Gagal menghapus tahun pelajaran.');
    } else {
      setSuccessMsg(`Tahun Pelajaran "${year}" berhasil dihapus.`);
      onYearsUpdated(res.years);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Filter list by selected tab
  const filteredYears = academicYears.filter((yr) => {
    if (activeTab === 'ALL') return true;
    return parseInstitution(yr) === activeTab;
  });

  return (
    <div
      id="manage-academic-years-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="manage-academic-years-modal"
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                Kelola Tahun Pelajaran (SD, SMP &amp; SMK)
              </h2>
              <p className="text-xs text-slate-300">
                Atur tahun pelajaran untuk 3 lembaga: SD, SMP, dan SMK
              </p>
            </div>
          </div>
          <button
            id="close-manage-years-btn"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Add Form with Institution Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Tambah Tahun Pelajaran Baru
              </label>
              <span className="text-[11px] text-slate-500 font-medium">Pilih Lembaga &amp; Tahun</span>
            </div>

            {/* Target Institution Selection Buttons */}
            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-1.5">Lembaga Tujuan:</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTargetInstitution('ALL')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition text-center ${
                    targetInstitution === 'ALL'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Semua (SD, SMP, SMK)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetInstitution('SD')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition text-center ${
                    targetInstitution === 'SD'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-emerald-800 border-emerald-200 hover:bg-emerald-50'
                  }`}
                >
                  SD Saja
                </button>
                <button
                  type="button"
                  onClick={() => setTargetInstitution('SMP')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition text-center ${
                    targetInstitution === 'SMP'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  SMP Saja
                </button>
                <button
                  type="button"
                  onClick={() => setTargetInstitution('SMK')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition text-center ${
                    targetInstitution === 'SMK'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-purple-800 border-purple-200 hover:bg-purple-50'
                  }`}
                >
                  SMK Saja
                </button>
              </div>
            </div>

            {/* Input and Submit */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  id="new-academic-year-input"
                  type="text"
                  value={inputYear}
                  onChange={(e) => setInputYear(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddYear();
                    }
                  }}
                  placeholder="Contoh: 2027/2028"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium placeholder-slate-400"
                />
              </div>
              <button
                id="submit-academic-year-btn"
                onClick={() => handleAddYear()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition shadow-xs hover:shadow shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah</span>
              </button>
            </div>

            {/* Quick Suggestion Chips */}
            {suggestions.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2 font-medium">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Saran Cepat:</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleAddYear(sug)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-white hover:bg-blue-50 text-blue-700 hover:text-blue-800 border border-blue-200 rounded-lg transition shadow-2xs cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{sug}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Lembaga Filter Tabs */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Daftar Tahun Pelajaran ({filteredYears.length})
              </h3>
              <span className="text-[11px] text-slate-400">Pilih tab lembaga:</span>
            </div>

            <div className="flex p-1 bg-slate-100 rounded-xl gap-1 mb-3">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition text-center ${
                  activeTab === 'ALL'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({academicYears.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SD')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition text-center ${
                  activeTab === 'SD'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                SD ({academicYears.filter((y) => parseInstitution(y) === 'SD').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SMP')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition text-center ${
                  activeTab === 'SMP'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-blue-700'
                }`}
              >
                SMP ({academicYears.filter((y) => parseInstitution(y) === 'SMP').length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SMK')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition text-center ${
                  activeTab === 'SMK'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-purple-700'
                }`}
              >
                SMK ({academicYears.filter((y) => parseInstitution(y) === 'SMK').length})
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white shadow-2xs max-h-64 overflow-y-auto">
              {filteredYears.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm">
                  Belum ada tahun pelajaran untuk lembaga ini.
                </div>
              ) : (
                filteredYears.map((yr) => {
                  const inst = parseInstitution(yr);
                  const instConfig = INSTITUTION_CONFIGS[inst];
                  const yearCycle = extractYearCycle(yr);
                  const studentCount = students.filter(
                    (s) => s.classRoom === yr || s.academicYear === yr
                  ).length;

                  return (
                    <div
                      key={yr}
                      className="px-4 py-2.5 flex items-center justify-between hover:bg-slate-50/70 transition"
                    >
                      <div className="flex items-center space-x-3">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold border ${instConfig.badgeClass}`}
                        >
                          {instConfig.name}
                        </span>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            Tahun Pelajaran {yearCycle}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>
                              {studentCount > 0
                                ? `${studentCount} siswa terdaftar di ${instConfig.name}`
                                : '0 siswa terdaftar'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {studentCount > 0 ? (
                          <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-lg border border-slate-200">
                            Digunakan
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteYear(yr)}
                            title={`Hapus ${yr}`}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            id="close-manage-years-footer-btn"
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition shadow-xs cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

