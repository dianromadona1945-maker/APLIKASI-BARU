import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  Download,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Users,
  School,
  ArrowRight,
  FileCheck,
  RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student, InstitutionLevel } from '../types';
import { INSTITUTION_CONFIGS, INSTITUTION_LIST } from '../data/constants';
import {
  getAcademicYears,
  parseInstitution,
  extractYearCycle,
  formatAcademicYear,
} from '../services/storage';

interface ImportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (
    students: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>,
    mode: 'skip_existing' | 'update_existing'
  ) => void;
  existingStudents: Student[];
}

interface ParsedStudentRow {
  name: string;
  nis: string;
  nisn: string;
  nik: string;
  institution: InstitutionLevel;
  academicYear: string;
  classRoom: string;
  gender: 'L' | 'P';
  birthPlace: string;
  birthDate: string;
  parentName: string;
  parentPhone: string;
  address: string;
  status: 'Aktif' | 'Lulus' | 'Pindah';
  isValid: boolean;
  validationError?: string;
  isExistingMatch?: boolean;
}

export const ImportExcelModal: React.FC<ImportExcelModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
  existingStudents,
}) => {
  if (!isOpen) return null;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Settings
  const [defaultInstitution, setDefaultInstitution] = useState<InstitutionLevel>('SMP');
  const [defaultYearCycle, setDefaultYearCycle] = useState('2025/2026');
  const [duplicateMode, setDuplicateMode] = useState<'update_existing' | 'skip_existing'>('update_existing');

  // Academic years options
  const academicYears = getAcademicYears();

  // Helper to normalize and map headers
  const normalizeHeader = (h: any): string => {
    return String(h || '')
      .toLowerCase()
      .trim()
      .replace(/[\s_\-–—.]+/g, '');
  };

  const handleDownloadTemplate = () => {
    // Construct clean sample template
    const templateData = [
      {
        'NIS': '24251001',
        'NISN': '0089123456',
        'Nama Siswa': 'Muhammad Farhan Al-Fatih',
        'Lembaga (SD/SMP/SMK)': 'SMP',
        'Tahun Pelajaran': '2025/2026',
        'Jenis Kelamin (L/P)': 'L',
        'NIK': '3201081503100001',
        'Tempat Lahir': 'Bogor',
        'Tanggal Lahir': '15 Maret 2011',
        'Nama Orang Tua / Wali': 'H. Ahmad Syahid',
        'No HP Ortu': '0812-3456-7890',
        'Alamat Lengkap': 'Jl. Pajajaran No. 12, RT 01/RW 03, Kota Bogor',
        'Status (Aktif/Lulus/Pindah)': 'Aktif',
      },
      {
        'NIS': '24251002',
        'NISN': '0098765432',
        'Nama Siswa': 'Aisyah Putri Ramadhani',
        'Lembaga (SD/SMP/SMK)': 'SD',
        'Tahun Pelajaran': '2025/2026',
        'Jenis Kelamin (L/P)': 'P',
        'NIK': '3201085208130002',
        'Tempat Lahir': 'Jakarta',
        'Tanggal Lahir': '20 Agustus 2014',
        'Nama Orang Tua / Wali': 'Bambang Irawan',
        'No HP Ortu': '0813-8899-0011',
        'Alamat Lengkap': 'Perum Indah Blok B4 No. 5, Bogor',
        'Status (Aktif/Lulus/Pindah)': 'Aktif',
      },
      {
        'NIS': '24251003',
        'NISN': '0076543210',
        'Nama Siswa': 'Fathir Hidayatullah',
        'Lembaga (SD/SMP/SMK)': 'SMK',
        'Tahun Pelajaran': '2025/2026',
        'Jenis Kelamin (L/P)': 'L',
        'NIK': '3201082005080003',
        'Tempat Lahir': 'Bandung',
        'Tanggal Lahir': '10 Mei 2008',
        'Nama Orang Tua / Wali': 'Drs. Supardi',
        'No HP Ortu': '0857-1122-3344',
        'Alamat Lengkap': 'Kp. Babakan RT 02/RW 04, Sukasari, Bogor',
        'Status (Aktif/Lulus/Pindah)': 'Aktif',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    // Auto fit column widths
    const columnWidths = [
      { wch: 14 }, // NIS
      { wch: 16 }, // NISN
      { wch: 30 }, // Nama Siswa
      { wch: 22 }, // Lembaga
      { wch: 18 }, // Th Pelajaran
      { wch: 20 }, // Jenis Kelamin
      { wch: 20 }, // NIK
      { wch: 16 }, // Tempat Lahir
      { wch: 18 }, // Tanggal Lahir
      { wch: 26 }, // Nama Ortu
      { wch: 18 }, // No HP
      { wch: 45 }, // Alamat
      { wch: 14 }, // Status
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Siswa');

    XLSX.writeFile(workbook, 'Template_Impor_Siswa_Arsip.xlsx');
  };

  const processFile = async (file: File) => {
    setParsingError(null);
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error('File Excel tidak memiliki lembar kerja (worksheet).');
      }

      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (!rawRows || rawRows.length < 2) {
        throw new Error('File Excel kosong atau tidak memiliki baris data setelah judul kolom.');
      }

      // Find header row (search first 5 rows for standard keywords)
      let headerRowIndex = 0;
      for (let r = 0; r < Math.min(5, rawRows.length); r++) {
        const rowStrings = rawRows[r].map((c) => normalizeHeader(c));
        if (
          rowStrings.some((s) => s.includes('nama') || s.includes('nis') || s.includes('nisn'))
        ) {
          headerRowIndex = r;
          break;
        }
      }

      const headerRow = rawRows[headerRowIndex].map((h) => normalizeHeader(h));
      const dataRows = rawRows.slice(headerRowIndex + 1);

      // Find index for each column
      const findColIndex = (keywords: string[]): number => {
        return headerRow.findIndex((col) =>
          keywords.some((kw) => col.includes(normalizeHeader(kw)))
        );
      };

      const nameIdx = findColIndex(['namasiswa', 'namalengkap', 'nama', 'fullname', 'name']);
      const nisIdx = findColIndex(['nis', 'noinduk', 'nomorinduk']);
      const nisnIdx = findColIndex(['nisn']);
      const nikIdx = findColIndex(['nik', 'noktp', 'ktp']);
      const instIdx = findColIndex(['lembaga', 'jenjang', 'tingkat', 'sekolah', 'unit']);
      const yearIdx = findColIndex(['tahunpelajaran', 'thpelajaran', 'tahunajaran', 'tp', 'kelas', 'angkatan']);
      const genderIdx = findColIndex(['jeniskelamin', 'jk', 'gender', 'kelamin', 'lp']);
      const birthPlaceIdx = findColIndex(['tempatlahir', 'tempat', 'kotalahir']);
      const birthDateIdx = findColIndex(['tanggallahir', 'tgllahir', 'tgl', 'dob', 'dateofbirth']);
      const parentNameIdx = findColIndex(['namaorangtua', 'namaortu', 'orangtua', 'namaayah', 'ayah', 'wali']);
      const parentPhoneIdx = findColIndex(['nohportu', 'nohp', 'notelp', 'telepon', 'whatsapp', 'kontak']);
      const addressIdx = findColIndex(['alamat', 'alamatlenkap', 'domisili', 'tempattinggal']);
      const statusIdx = findColIndex(['status', 'statussiswa']);

      if (nameIdx === -1) {
        throw new Error(
          'Kolom Nama Siswa / Nama Lengkap tidak ditemukan. Harap pastikan ada kolom dengan judul "Nama Siswa" atau "Nama Lengkap".'
        );
      }

      const parsed: ParsedStudentRow[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        // skip completely empty rows
        if (!row || row.every((c) => String(c || '').trim() === '')) {
          continue;
        }

        const rawName = String(row[nameIdx] || '').trim();
        if (!rawName) {
          // If no name, mark invalid or skip if rest is empty
          continue;
        }

        const rawNis = nisIdx !== -1 ? String(row[nisIdx] || '').trim() : '';
        const rawNisn = nisnIdx !== -1 ? String(row[nisnIdx] || '').trim() : '';
        const rawNik = nikIdx !== -1 ? String(row[nikIdx] || '').trim() : '';
        const rawInst = instIdx !== -1 ? String(row[instIdx] || '').trim() : '';
        const rawYear = yearIdx !== -1 ? String(row[yearIdx] || '').trim() : '';
        const rawGender = genderIdx !== -1 ? String(row[genderIdx] || '').trim().toUpperCase() : '';
        const rawBirthPlace = birthPlaceIdx !== -1 ? String(row[birthPlaceIdx] || '').trim() : '';
        const rawBirthDate = birthDateIdx !== -1 ? String(row[birthDateIdx] || '').trim() : '';
        const rawParentName = parentNameIdx !== -1 ? String(row[parentNameIdx] || '').trim() : '';
        const rawParentPhone = parentPhoneIdx !== -1 ? String(row[parentPhoneIdx] || '').trim() : '';
        const rawAddress = addressIdx !== -1 ? String(row[addressIdx] || '').trim() : '';
        const rawStatus = statusIdx !== -1 ? String(row[statusIdx] || '').trim() : 'Aktif';

        // Normalize institution
        const detectedInst = rawInst ? parseInstitution(rawInst, defaultInstitution) : defaultInstitution;

        // Normalize academic year
        const detectedCycle = rawYear ? extractYearCycle(rawYear) : defaultYearCycle;
        const formattedAcademicYear = formatAcademicYear(detectedInst, detectedCycle);

        // Normalize gender
        let gender: 'L' | 'P' = 'L';
        if (rawGender.startsWith('P') || rawGender.includes('WANITA') || rawGender.includes('PEREMPUAN')) {
          gender = 'P';
        } else {
          gender = 'L';
        }

        // Normalize status
        let status: 'Aktif' | 'Lulus' | 'Pindah' = 'Aktif';
        if (/lulus/i.test(rawStatus)) status = 'Lulus';
        else if (/pindah/i.test(rawStatus)) status = 'Pindah';

        // Check if student matches existing database
        const isExistingMatch = existingStudents.some(
          (s) =>
            (rawNis && s.nis && s.nis.trim() === rawNis) ||
            (rawNisn && s.nisn && s.nisn.trim() === rawNisn) ||
            (s.name.toLowerCase() === rawName.toLowerCase() && s.institution === detectedInst)
        );

        parsed.push({
          name: rawName,
          nis: rawNis || `NIS-${Math.floor(10000 + Math.random() * 90000)}`,
          nisn: rawNisn || `00${Math.floor(10000000 + Math.random() * 90000000)}`,
          nik: rawNik || '',
          institution: detectedInst,
          academicYear: formattedAcademicYear,
          classRoom: formattedAcademicYear,
          gender,
          birthPlace: rawBirthPlace || 'Bogor',
          birthDate: rawBirthDate || '01 Januari 2011',
          parentName: rawParentName || 'Orang Tua / Wali',
          parentPhone: rawParentPhone || '0812-0000-0000',
          address: rawAddress || 'Bogor, Jawa Barat',
          status,
          isValid: true,
          isExistingMatch,
        });
      }

      if (parsed.length === 0) {
        throw new Error('Tidak ditemukan data siswa yang dapat dibaca pada file Excel ini.');
      }

      setParsedRows(parsed);
    } catch (err: any) {
      setParsingError(err?.message || 'Gagal membaca file Excel. Harap pastikan format file sesuai.');
      setParsedRows([]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleExecuteImport = () => {
    if (parsedRows.length === 0) return;

    const studentsToImport: Array<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>> = parsedRows.map((r) => ({
      name: r.name,
      nis: r.nis,
      nisn: r.nisn,
      nik: r.nik,
      institution: r.institution,
      classRoom: r.classRoom,
      academicYear: r.academicYear,
      gender: r.gender,
      birthPlace: r.birthPlace,
      birthDate: r.birthDate,
      parentName: r.parentName,
      parentPhone: r.parentPhone,
      address: r.address,
      status: r.status,
    }));

    onImportSuccess(studentsToImport, duplicateMode);
    onClose();
  };

  const resetFile = () => {
    setFileName(null);
    setParsedRows([]);
    setParsingError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const existingMatchesCount = parsedRows.filter((r) => r.isExistingMatch).length;
  const newCount = parsedRows.length - existingMatchesCount;

  return (
    <div className="fixed inset-0 z-80 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base text-white">
                  Impor Data Siswa Massal dari Excel
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  .xlsx / .xls / .csv
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Unggah puluhan atau ratusan data siswa sekaligus dalam hitungan detik.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
          {/* Quick guide and Template Download bar */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-950 text-sm">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>Format Kolom Excel yang Didukung</span>
              </div>
              <p className="text-[11px] text-emerald-800 leading-relaxed max-w-xl">
                Sistem otomatis mengenali kolom: <b>NIS, NISN, Nama Lengkap, Lembaga (SD/SMP/SMK), Tahun Pelajaran, Jenis Kelamin (L/P), NIK, Tempat/Tgl Lahir, Orang Tua, No HP, Alamat</b>.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-2xs transition shrink-0 cursor-pointer text-xs"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Format Template Excel (.xlsx)</span>
            </button>
          </div>

          {/* Upload or Drop Area */}
          {!fileName ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-3 ${
                dragActive
                  ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
                  : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/80 bg-slate-50/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="font-extrabold text-sm text-slate-800">
                  Tarik &amp; Letakkan file Excel Anda di sini, atau{' '}
                  <span className="text-blue-600 underline">Pilih Berkas</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Mendukung Microsoft Excel (.xlsx, .xls) dan CSV
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-extrabold text-slate-900 text-sm">{fileName}</p>
                  <p className="text-[11px] text-slate-500">
                    Berhasil diuraikan: {parsedRows.length} data siswa terdeteksi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetFile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Ganti Berkas</span>
              </button>
            </div>
          )}

          {/* Parsing Error */}
          {parsingError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-extrabold text-xs">Gagal Memproses File Excel</p>
                <p className="text-[11px] mt-0.5">{parsingError}</p>
              </div>
            </div>
          )}

          {/* Configuration Options */}
          {parsedRows.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
              <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <School className="w-4 h-4 text-blue-600" />
                <span>Pengaturan &amp; Nilai Bawaan (Jika kolom di Excel tidak diisi)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Lembaga Bawaan:
                  </label>
                  <select
                    value={defaultInstitution}
                    onChange={(e) => setDefaultInstitution(e.target.value as InstitutionLevel)}
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 font-bold text-slate-800"
                  >
                    {INSTITUTION_LIST.map((inst) => (
                      <option key={inst.code} value={inst.code}>
                        {inst.fullName} ({inst.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Tahun Pelajaran Bawaan:
                  </label>
                  <input
                    type="text"
                    value={defaultYearCycle}
                    onChange={(e) => setDefaultYearCycle(e.target.value)}
                    placeholder="Contoh: 2025/2026"
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 font-bold text-slate-800 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 text-[11px]">
                    Jika NIS / NISN Sudah Ada:
                  </label>
                  <select
                    value={duplicateMode}
                    onChange={(e) => setDuplicateMode(e.target.value as any)}
                    className="w-full p-2 bg-white rounded-xl border border-slate-200 font-bold text-slate-800"
                  >
                    <option value="update_existing">Perbarui Data (Update)</option>
                    <option value="skip_existing">Lewati &amp; Jangan Ditimpa</option>
                  </select>
                </div>
              </div>

              {/* Duplicate / Existing summary */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 text-[11px]">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  Siswa Baru: <b>{newCount}</b>
                </span>
                {existingMatchesCount > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                    Data Sudah Ada: <b>{existingMatchesCount}</b> ({duplicateMode === 'update_existing' ? 'Akan Diperbarui' : 'Akan Dilewati'})
                  </span>
                )}
                <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 font-bold">
                  Total Baris Siap Diimpor: <b>{parsedRows.length} Siswa</b>
                </span>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-900 text-xs">
                  Pratinjau Data Siswa ({parsedRows.length} Siswa)
                </span>
                <span className="text-[11px] text-slate-500">
                  Menampilkan 10 data teratas
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">No</th>
                      <th className="py-2 px-3">Nama Siswa</th>
                      <th className="py-2 px-3">NIS / NISN</th>
                      <th className="py-2 px-3">Lembaga &amp; TP</th>
                      <th className="py-2 px-3">JK</th>
                      <th className="py-2 px-3">Orang Tua / Telepon</th>
                      <th className="py-2 px-3">Status Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {parsedRows.slice(0, 15).map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="py-2 px-3 font-mono text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold text-slate-900">
                          {row.name}
                        </td>
                        <td className="py-2 px-3 font-mono text-slate-600">
                          {row.nis} / {row.nisn}
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-extrabold border mr-1.5 ${
                              INSTITUTION_CONFIGS[row.institution]?.badgeClass || 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {row.institution}
                          </span>
                          <span className="text-slate-600 font-medium">{row.academicYear}</span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.gender === 'L'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-pink-100 text-pink-700'
                            }`}
                          >
                            {row.gender}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600">
                          {row.parentName} <span className="text-slate-400">({row.parentPhone})</span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          {row.isExistingMatch ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Sudah Ada ({duplicateMode === 'update_existing' ? 'Update' : 'Lewati'})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Siswa Baru
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > 15 && (
                <p className="text-[10px] text-slate-500 italic text-center">
                  ... dan {parsedRows.length - 15} siswa lainnya akan diimpor ke sistem.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer text-xs"
          >
            Batal
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={parsedRows.length === 0 || isProcessing}
              onClick={handleExecuteImport}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-2xs transition cursor-pointer ${
                parsedRows.length > 0 && !isProcessing
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow'
                  : 'bg-slate-300 text-slate-500 cursor-not-allowed'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Memproses...'
                  : `Impor Semua Siswa (${parsedRows.length} Data)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
