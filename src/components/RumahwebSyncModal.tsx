import React, { useState, useEffect } from 'react';
import {
  Cloud,
  Server,
  Database,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Key,
  Globe,
  FileCode,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  X,
  HelpCircle,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Student, StudentDocument, AuditLog } from '../types';
import {
  getSyncConfig,
  saveSyncConfig,
  testRumahwebConnection,
  pushAllDataToHosting,
  pullAllDataFromHosting,
  executeTwoWaySync,
  generatePhpApiScript,
  RumahwebSyncConfig,
} from '../services/mysqlSync';
import { applyRemoteSyncedData } from '../services/storage';

interface RumahwebSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  documents: StudentDocument[];
  academicYears: string[];
  logs?: AuditLog[];
  onDataSynced: () => void;
  onToast: (text: string, type?: 'success' | 'error') => void;
}

export const RumahwebSyncModal: React.FC<RumahwebSyncModalProps> = ({
  isOpen,
  onClose,
  students,
  documents,
  academicYears,
  logs,
  onDataSynced,
  onToast,
}) => {
  const [activeTab, setActiveTab] = useState<'status' | 'config' | 'generator'>('status');
  const [config, setConfig] = useState<RumahwebSyncConfig>(() => getSyncConfig());

  // Connection config form
  const [apiUrl, setApiUrl] = useState<string>(config.apiUrl);
  const [syncKey, setSyncKey] = useState<string>(config.syncKey);
  const [autoSync, setAutoSync] = useState<boolean>(config.autoSync);

  // Script Generator form
  const [dbHost, setDbHost] = useState<string>('localhost');
  const [dbName, setDbName] = useState<string>('arsd2325_arsip');
  const [dbUser, setDbUser] = useState<string>('arsd2325_admin');
  const [dbPass, setDbPass] = useState<string>('');
  const [scriptSyncKey, setScriptSyncKey] = useState<string>(config.syncKey || 'ArsipAttafaqquh2026');

  // Loading & feedback states
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [isPushing, setIsPushing] = useState<boolean>(false);
  const [isPulling, setIsPulling] = useState<boolean>(false);
  const [isSmartSyncing, setIsSmartSyncing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const current = getSyncConfig();
      setConfig(current);
      setApiUrl(current.apiUrl);
      setSyncKey(current.syncKey);
      setAutoSync(current.autoSync);
      setStatusMessage(null);

      // Otomatis verifikasi koneksi saat modal dibuka
      if (current.apiUrl) {
        testRumahwebConnection(current.apiUrl, current.syncKey).then((res) => {
          if (res.success) {
            setConfig(getSyncConfig());
          }
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle test connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setStatusMessage({ text: 'Sedang menghubungi server MySQL Rumahweb...' });
    const result = await testRumahwebConnection(apiUrl, syncKey);
    setIsTesting(false);

    if (result.success) {
      const updated = saveSyncConfig({
        apiUrl: apiUrl.trim(),
        syncKey: syncKey.trim(),
        autoSync,
        lastSyncStatus: 'success',
      });
      setConfig(updated);
      setStatusMessage({
        text: `${result.message} (Terdapat ${result.counts?.students ?? 0} siswa di database hosting)`,
      });
      onToast('Koneksi ke MySQL Rumahweb Berhasil!', 'success');
    } else {
      setStatusMessage({ text: result.message, isError: true });
      onToast('Gagal terhubung ke MySQL Rumahweb', 'error');
    }
  };

  // Handle Save Config
  const handleSaveConfig = () => {
    const updated = saveSyncConfig({
      apiUrl: apiUrl.trim(),
      syncKey: syncKey.trim(),
      autoSync,
    });
    setConfig(updated);
    onToast('Pengaturan koneksi berhasil disimpan', 'success');
  };

  // Handle Push all local data to Hosting
  const handlePush = async () => {
    if (!config.apiUrl) {
      setActiveTab('config');
      setStatusMessage({ text: 'Harap atur URL API Rumahweb terlebih dahulu.', isError: true });
      return;
    }

    if (
      !window.confirm(
        `Kirim ${students.length} data siswa dan ${documents.length} dokumen dari PC ini ke database MySQL Rumahweb?`
      )
    ) {
      return;
    }

    setIsPushing(true);
    setStatusMessage({ text: 'Sedang mengunggah data siswa dan dokumen ke MySQL Rumahweb...' });

    const res = await pushAllDataToHosting({
      students,
      documents,
      academicYears,
      logs,
    });

    setIsPushing(false);
    if (res.success) {
      setConfig(getSyncConfig());
      setStatusMessage({ text: res.message });
      onToast(res.message, 'success');
    } else {
      setStatusMessage({ text: res.message, isError: true });
      onToast(res.message, 'error');
    }
  };

  // Handle Two-Way Smart Merge (Bidirectional Sync)
  const handleSmartSync = async () => {
    if (!config.apiUrl) {
      setActiveTab('config');
      setStatusMessage({ text: 'Harap atur URL API Rumahweb terlebih dahulu.', isError: true });
      return;
    }

    setIsSmartSyncing(true);
    setStatusMessage({ text: 'Sedang menjalankan sinkronisasi cerdas dua arah (Smart Merge)...' });

    const res = await executeTwoWaySync();
    setIsSmartSyncing(false);

    if (res.success) {
      onDataSynced();
      setConfig(getSyncConfig());
      setStatusMessage({ text: res.message });
      onToast(res.message, 'success');
    } else {
      setStatusMessage({ text: res.message, isError: true });
      onToast(res.message, 'error');
    }
  };

  // Handle Pull all data from Hosting to this PC (uses Smart Merge so local newly added data is NEVER lost)
  const handlePull = async () => {
    if (!config.apiUrl) {
      setActiveTab('config');
      setStatusMessage({ text: 'Harap atur URL API Rumahweb terlebih dahulu.', isError: true });
      return;
    }

    setIsPulling(true);
    setStatusMessage({ text: 'Sedang menyelaraskan data dengan database MySQL Rumahweb...' });

    const res = await executeTwoWaySync();
    setIsPulling(false);

    if (res.success) {
      onDataSynced();
      setConfig(getSyncConfig());
      setStatusMessage({ text: res.message });
      onToast(res.message, 'success');
    } else {
      setStatusMessage({ text: res.message, isError: true });
      onToast(res.message, 'error');
    }
  };

  // Generate & Download api.php file
  const handleDownloadPhpScript = () => {
    const phpCode = generatePhpApiScript({
      dbHost,
      dbName,
      dbUser,
      dbPass,
      syncKey: scriptSyncKey,
    });

    const blob = new Blob([phpCode], { type: 'application/x-httpd-php' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api.php';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    onToast('File api.php berhasil diunduh. Silakan upload ke cPanel Rumahweb.', 'success');
  };

  // Copy PHP Script
  const handleCopyPhpScript = () => {
    const phpCode = generatePhpApiScript({
      dbHost,
      dbName,
      dbUser,
      dbPass,
      syncKey: scriptSyncKey,
    });
    navigator.clipboard.writeText(phpCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
    onToast('Kode script api.php berhasil disalin ke papan klip!', 'success');
  };

  const isConnected =
    (config.lastSyncStatus === 'success' || Boolean(config.apiUrl)) &&
    config.lastSyncStatus !== 'error' &&
    Boolean(config.apiUrl);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg">Sinkronisasi Database Hosting Rumahweb</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  MySQL Cloud
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Samakan 513 siswa dan dokumen secara otomatis antar-komputer melalui hosting cPanel Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div
          className={`px-6 py-3 border-b text-xs flex items-center justify-between ${
            isConnected
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  <strong>Status: Terhubung ke MySQL Rumahweb</strong> —{' '}
                  {config.serverCounts?.students !== undefined
                    ? `${config.serverCounts.students} siswa di server cloud`
                    : 'Siap sinkronisasi'}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-medium">
                  <strong>Status: Belum Terhubung</strong> — Masukkan URL endpoint API atau unduh script PHP di tab
                  sebelah.
                </span>
              </>
            )}
          </div>
          {config.lastSyncTime && (
            <span className="text-[11px] opacity-75 font-mono">
              Terakhir sinkron: {new Date(config.lastSyncTime).toLocaleTimeString('id-ID')}
            </span>
          )}
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50 text-xs font-bold">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'status'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Sinkronisasi Data (Push / Pull)</span>
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'config'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Pengaturan Koneksi API</span>
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`py-3.5 px-4 border-b-2 transition flex items-center gap-2 ${
              activeTab === 'generator'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Unduh Script api.php &amp; Panduan cPanel</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Status Message feedback */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between border ${
                statusMessage.isError
                  ? 'bg-rose-50 text-rose-800 border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              <span>{statusMessage.text}</span>
              <button
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-slate-600 ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* TAB 1: STATUS & AKSI SINKRONISASI */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Comparative Stats Card */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-blue-600" />
                      Komputer Ini (Lokal)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-200 text-blue-900">
                      Aktif
                    </span>
                  </div>
                  <div className="text-2xl font-black text-blue-950">{students.length} Siswa</div>
                  <p className="text-xs text-blue-700">
                    {documents.length} dokumen digital tersimpan di peramban komputer ini.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                      <Cloud className="w-4 h-4 text-indigo-600" />
                      Database MySQL Hosting Rumahweb
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isConnected ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {isConnected ? 'Terhubung' : 'Belum Konfigurasi'}
                    </span>
                  </div>
                  <div className="text-2xl font-black text-indigo-950">
                    {config.serverCounts?.students !== undefined
                      ? `${config.serverCounts.students} Siswa`
                      : isConnected
                      ? 'Tersambung'
                      : '-'}
                  </div>
                  <p className="text-xs text-indigo-700 truncate">
                    {config.apiUrl || 'Belum ada alamat API terpasang'}
                  </p>
                </div>
              </div>

              {/* Discrepancy notice if local count differs from cloud server count */}
              {config.serverCounts?.students !== undefined && config.serverCounts.students !== students.length && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-amber-900">
                      Perbedaan Jumlah Siswa ({students.length} di Komputer Ini vs {config.serverCounts.students} di Cloud Server)
                    </p>
                    <p className="text-amber-800 leading-relaxed">
                      {students.length < config.serverCounts.students
                        ? `Ada ${config.serverCounts.students - students.length} siswa yang sudah Anda hapus di komputer ini tetapi masih tersimpan di cloud. Klik "Kirim ke Hosting (Push)" di bawah untuk menyelaraskan cloud dan menghapus siswa tersebut dari server juga. Jangan klik "Tarik Data (Pull)" karena akan memunculkan kembali siswa yang sudah dihapus!`
                        : `Ada ${students.length - config.serverCounts.students} siswa baru di komputer ini yang belum ada di cloud. Klik "Kirim ke Hosting (Push)" untuk mengunggahnya.`}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span>Aksi Sinkronisasi Antar-PC</span>
                </h4>

                {/* Two-Way Smart Merge Card */}
                <div className="p-5 rounded-2xl border-2 border-indigo-500/30 bg-gradient-to-br from-indigo-50/60 via-purple-50/30 to-blue-50/60 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
                          <RefreshCw className={`w-4 h-4 ${isSmartSyncing ? 'animate-spin' : ''}`} />
                        </div>
                        <h5 className="font-extrabold text-slate-900 text-sm sm:text-base">
                          Live Sync Cerdas 2-Arah (Smart Merge)
                        </h5>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-indigo-100 text-indigo-700 border border-indigo-200">
                          Aman &amp; Anti-Hilang
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Menggabungkan data antara Komputer Ini dan Hosting MySQL secara otomatis. Siswa baru yang ditambahkan di Laptop A tidak akan tertindih atau hilang, dan akan langsung tersinkron ke Laptop B.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSmartSync}
                    disabled={isSmartSyncing || isPushing || isPulling}
                    className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-50 transition shadow-md cursor-pointer"
                  >
                    {isSmartSyncing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sedang Menyelaraskan Data...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        <span>Jalankan Live Sync (Smart Merge) Sekarang</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Push Button */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-blue-400 transition space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <h5 className="font-extrabold text-slate-900 text-sm">
                        Kirim Data ke Rumahweb (Push)
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Gunakan tombol ini di <strong>PC Pertama</strong> (yang memiliki 513 siswa) untuk mengunggah
                        seluruh data ke database MySQL hosting Anda.
                      </p>
                    </div>

                    <button
                      onClick={handlePush}
                      disabled={isPushing}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition shadow-2xs cursor-pointer"
                    >
                      {isPushing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sedang Mengunggah...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Kirim {students.length} Siswa ke Hosting</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Pull Button */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-emerald-400 transition space-y-3 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <DownloadCloud className="w-5 h-5" />
                      </div>
                      <h5 className="font-extrabold text-slate-900 text-sm">
                        Tarik Data dari Rumahweb (Pull)
                      </h5>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Gunakan tombol ini di <strong>PC Kedua / Komputer Lain</strong> untuk mengambil data terbaru dari
                        MySQL Rumahweb agar jumlah siswa langsung sama persis.
                      </p>
                    </div>

                    <button
                      onClick={handlePull}
                      disabled={isPulling}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition shadow-2xs cursor-pointer"
                    >
                      {isPulling ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Sedang Mengunduh...</span>
                        </>
                      ) : (
                        <>
                          <DownloadCloud className="w-4 h-4" />
                          <span>Tarik Data Terbaru ke PC Ini</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Automatic Sync Info */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800">Sinkronisasi Otomatis Setiap Ada Perubahan</div>
                  <p className="text-slate-500">
                    Otomatis menyimpan ke database MySQL Rumahweb saat Anda menambah atau mengedit siswa.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSync}
                    onChange={(e) => {
                      setAutoSync(e.target.checked);
                      saveSyncConfig({ autoSync: e.target.checked });
                      onToast(
                        e.target.checked ? 'Sinkronisasi otomatis diaktifkan' : 'Sinkronisasi otomatis dinonaktifkan',
                        'success'
                      );
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          )}

          {/* TAB 2: PENGATURAN KONEKSI */}
          {activeTab === 'config' && (
            <div className="space-y-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Alamat URL Endpoint API Rumahweb (api.php)
                  </label>
                  <div className="relative">
                    <input
                      type="url"
                      value={apiUrl}
                      onChange={(e) => setApiUrl(e.target.value)}
                      placeholder="https://domainanda.com/api.php atau https://domainanda.sch.id/arsip/api.php"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <Globe className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Lokasi berkas <code>api.php</code> yang sudah Anda unggah di File Manager cPanel Rumahweb.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Kunci Pengaman Sinkronisasi (Sync Key)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={syncKey}
                      onChange={(e) => setSyncKey(e.target.value)}
                      placeholder="Kunci rahasia pengaman (sama dengan di api.php)"
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <Key className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Token rahasia ini memastikan hanya komputer sekolah yang berhak mengakses database MySQL Anda.
                  </p>
                </div>
              </div>

              {/* Action Buttons in Config */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
                >
                  Simpan Pengaturan
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !apiUrl}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-2xs"
                >
                  {isTesting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menguji Sambungan...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Uji Koneksi ke Rumahweb</span>
                    </>
                  )}
                </button>
              </div>

              {/* Quick Guide Card */}
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Belum punya berkas api.php di hosting Rumahweb?</span>
                </div>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Buka tab <strong>&quot;Unduh Script api.php &amp; Panduan cPanel&quot;</strong> di atas untuk membuat
                  dan mengunduh berkas PHP siap pakai dalam 1 kali klik!
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: GENERATOR & PANDUAN CPANEL */}
          {activeTab === 'generator' && (
            <div className="space-y-6">
              {/* Step by step guide */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Langkah Mudah Pemasangan di cPanel Rumahweb (3 Menit)</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="w-6 h-6 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                      1
                    </div>
                    <div className="font-bold text-slate-800">Buat Database di cPanel</div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Login ke cPanel Rumahweb &gt; menu <strong>MySQL Databases</strong> &gt; buat database baru &amp; user
                      database, lalu hubungkan dengan mencentang <em>ALL PRIVILEGES</em>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                      2
                    </div>
                    <div className="font-bold text-slate-800">Unduh &amp; Upload api.php</div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Masukkan nama &amp; password database di form bawah, klik <strong>Unduh api.php</strong>, lalu
                      upload ke folder <code>public_html</code> lewat <strong>File Manager</strong> cPanel.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                      3
                    </div>
                    <div className="font-bold text-slate-800">Uji &amp; Langsung Sinkron!</div>
                    <p className="text-slate-500 text-[11px] leading-relaxed">
                      Masukkan alamat link <code>https://domainanda.com/api.php</code> di tab Pengaturan, lalu klik{' '}
                      <strong>Kirim Data ke Rumahweb</strong>. Semua PC langsung tersinkron!
                    </p>
                  </div>
                </div>
              </div>

              {/* Generator Form */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                    <FileCode className="w-4 h-4 text-blue-600" />
                    <span>Konfigurasi Database MySQL Rumahweb Anda</span>
                  </h5>
                  <span className="text-[11px] text-slate-400">Otomatis membuat tabel-tabel MySQL</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Host Database</label>
                    <input
                      type="text"
                      value={dbHost}
                      onChange={(e) => setDbHost(e.target.value)}
                      placeholder="localhost"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white"
                    />
                    <span className="text-[10px] text-slate-400">Standar Rumahweb adalah localhost</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Database</label>
                    <input
                      type="text"
                      value={dbName}
                      onChange={(e) => setDbName(e.target.value)}
                      placeholder="contoh: u1234567_arsip"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white"
                    />
                    <span className="text-[10px] text-slate-400">Nama database yang dibuat di cPanel</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">User Database</label>
                    <input
                      type="text"
                      value={dbUser}
                      onChange={(e) => setDbUser(e.target.value)}
                      placeholder="contoh: u1234567_admin"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white"
                    />
                    <span className="text-[10px] text-slate-400">Pengguna database MySQL cPanel</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Password Database</label>
                    <input
                      type="password"
                      value={dbPass}
                      onChange={(e) => setDbPass(e.target.value)}
                      placeholder="Kata sandi database cPanel"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs bg-white"
                    />
                    <span className="text-[10px] text-slate-400">Kata sandi user MySQL cPanel</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={handleCopyPhpScript}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-700 transition"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Tersalin!' : 'Salin Kode PHP'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPhpScript}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs"
                  >
                    <DownloadCloud className="w-4 h-4" />
                    <span>Unduh Berkas api.php Siap Pakai</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-slate-400" />
            <span>Hosting Rumahweb cPanel &amp; MySQL MariaDB</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
