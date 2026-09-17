import React, { useRef, useState } from 'react';
import {
  Database,
  Download,
  UploadCloud,
  RefreshCw,
  ShieldCheck,
  FileCheck,
  Archive,
  AlertTriangle,
  Lock,
  HardDrive,
  FileCode,
} from 'lucide-react';
import { Student, StudentDocument } from '../types';
import {
  exportDatabaseBackup,
  restoreDatabaseBackup,
  resetToFactoryDefault,
} from '../services/storage';
import { downloadJsonFile, downloadAllStudentsZip } from '../utils/zipExport';

interface BackupSecurityViewProps {
  students: Student[];
  documents: StudentDocument[];
  onDataRefreshed: () => void;
}

export const BackupSecurityView: React.FC<BackupSecurityViewProps> = ({
  students,
  documents,
  onDataRefreshed,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const handleExportJson = () => {
    const jsonStr = exportDatabaseBackup();
    const filename = `Backup_Arsip_Siswa_AlTafaqquhFiddin_${new Date().toISOString().slice(0, 10)}.json`;
    downloadJsonFile(jsonStr, filename);
  };

  const handleExportZip = () => {
    downloadAllStudentsZip(students, documents);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = restoreDatabaseBackup(content);
      setRestoreStatus(res);
      if (res.success) {
        onDataRefreshed();
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    if (
      window.confirm(
        'Apakah Anda yakin ingin mengembalikan data ke sampel awal? Seluruh perubahan saat ini akan diganti dengan data demonstrasi bawaan.'
      )
    ) {
      resetToFactoryDefault();
      onDataRefreshed();
      setRestoreStatus({
        success: true,
        message: 'Sistem berhasil direset ke data sampel awal bawaan sekolah.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          <span>Cadangan Data (Backup) &amp; Keamanan Arsip</span>
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Lindungi arsip administrasi siswa dari risiko kehilangan atau kerusakan melalui pencadangan berkala
        </p>
      </div>

      {/* Restore Status Alert */}
      {restoreStatus && (
        <div
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
            restoreStatus.success
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <span>{restoreStatus.message}</span>
          <button onClick={() => setRestoreStatus(null)} className="text-slate-400 hover:text-slate-600">
            ✕
          </button>
        </div>
      )}

      {/* Backup Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Ekspor Database JSON */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCode className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Ekspor Cadangan Lengkap (JSON)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mencakup seluruh biodata {students.length} siswa, {documents.length} riwayat dokumen digital, log
              audit aktivitas, dan daftar pengguna terotorisasi dalam satu berkas terstruktur.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">Format: .json</span>
            <button
              onClick={handleExportJson}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Cadangan JSON</span>
            </button>
          </div>
        </div>

        {/* Card 2: Unduh Berkas ZIP */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Archive className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Ekspor Seluruh Dokumen Digital (ZIP)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mengemas seluruh berkas fisik digital (KK, KTP, Akta Kelahiran, Ijazah, KIP) ke dalam struktur folder
              rapi per kelas dan per siswa ke dalam file arsip ZIP.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-400">Format: .zip (Multi-folder)</span>
            <button
              onClick={handleExportZip}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-2xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Arsip ZIP</span>
            </button>
          </div>
        </div>

        {/* Card 3: Pemulihan / Restore Backup */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".json"
            className="hidden"
          />
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Pulihkan Data (Restore)</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Unggah file cadangan JSON yang telah diekspor sebelumnya untuk memulihkan arsip data siswa ke kondisi
              tersebut tanpa kehilangan keteraturan.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Pilih file .json cadangan</span>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Pilih &amp; Pulihkan File</span>
            </button>
          </div>
        </div>

        {/* Card 4: Reset ke Standar Awal */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <RefreshCw className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base">Muat Ulang Data Sampel Pabrik</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Mengatur ulang seluruh data ke demonstrasi awal dengan profil siswa terisi, contoh berkas resmi, dan
              tiga akun petugas demonstrasi.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-rose-500 font-medium">Tindakan demonstrasi</span>
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Reset Data Demo</span>
            </button>
          </div>
        </div>
      </div>

      {/* Security Architecture Summary */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <h3 className="text-base font-extrabold text-slate-900 mb-3 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <span>Panduan Protokol Keamanan Arsip Sekolah</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
            <div className="font-bold text-slate-800">1. Backup Berkala Otomatis &amp; Mandiri</div>
            <p className="text-slate-500">
              Lakukan ekspor cadangan database setiap akhir bulan atau setelah periode penerimaan peserta didik baru
              (PPDB) selesai.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
            <div className="font-bold text-slate-800">2. Pembatasan Hak Akses Staf</div>
            <p className="text-slate-500">
              Akses hanya diberikan kepada operator TU dan Wali Kelas dengan kredensial yang diverifikasi. Dokumen
              terlindungi dari pihak luar.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1.5">
            <div className="font-bold text-slate-800">3. Integritas Data &amp; Watermarking</div>
            <p className="text-slate-500">
              Dokumen siswa seperti KK dan KTP disertai catatan verifikasi digital dan tersimpan dengan resolusi
              jelas untuk keperluan pelaporan Kemendikbudistek.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
