import React, { useState } from 'react';
import { History, Search, Filter, ShieldCheck, Download, UserCheck, FileUp, Trash2, CheckCircle2 } from 'lucide-react';
import { AuditLog } from '../types';

interface AuditLogsViewProps {
  logs: AuditLog[];
}

export const AuditLogsView: React.FC<AuditLogsViewProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.studentName && log.studentName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'UPLOAD_DOC':
        return { label: 'Unggah Dokumen', color: 'bg-blue-100 text-blue-800' };
      case 'VERIFY_DOC':
        return { label: 'Verifikasi Berkas', color: 'bg-emerald-100 text-emerald-800' };
      case 'DELETE_DOC':
        return { label: 'Hapus Berkas', color: 'bg-rose-100 text-rose-800' };
      case 'CREATE_STUDENT':
        return { label: 'Tambah Siswa', color: 'bg-indigo-100 text-indigo-800' };
      case 'UPDATE_STUDENT':
        return { label: 'Ubah Data Siswa', color: 'bg-amber-100 text-amber-800' };
      case 'BACKUP_DATA':
        return { label: 'Cadangan Sistem', color: 'bg-purple-100 text-purple-800' };
      case 'RESTORE_DATA':
        return { label: 'Pemulihan Data', color: 'bg-teal-100 text-teal-800' };
      default:
        return { label: action, color: 'bg-slate-100 text-slate-800' };
    }
  };

  const handleExportLog = () => {
    const textContent = logs
      .map(
        (l) =>
          `[${new Date(l.timestamp).toLocaleString('id-ID')}] [${l.action}] Petugas: ${l.userName} (${l.userRole}) | Rincian: ${l.details} ${
            l.studentName ? `| Siswa: ${l.studentName}` : ''
          }`
      )
      .join('\n');

    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Log_Aktivitas_Arsip_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" />
            <span>Riwayat Perubahan &amp; Log Aktivitas (Audit Trail)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Merekam seluruh jejak pengunggahan, verifikasi, perubahan biodata, dan pengelolaan berkas siswa secara transparan
          </p>
        </div>

        <button
          onClick={handleExportLog}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-2xs transition self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Unduh Log (TXT)</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari aktivitas berdasarkan nama petugas, siswa, atau rincian tindakan..."
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 text-slate-700 font-medium"
          >
            <option value="ALL">Semua Jenis Aksi</option>
            <option value="UPLOAD_DOC">Unggah Dokumen</option>
            <option value="VERIFY_DOC">Verifikasi Berkas</option>
            <option value="DELETE_DOC">Hapus Berkas</option>
            <option value="CREATE_STUDENT">Tambah Siswa</option>
            <option value="UPDATE_STUDENT">Ubah Data Siswa</option>
            <option value="BACKUP_DATA">Cadangan Data</option>
            <option value="RESTORE_DATA">Pemulihan Data</option>
          </select>
        </div>
      </div>

      {/* Table of logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Waktu (WIB)</th>
                <th className="py-3 px-4">Petugas / Pengguna</th>
                <th className="py-3 px-4">Tindakan</th>
                <th className="py-3 px-4">Siswa Terkait</th>
                <th className="py-3 px-4">Keterangan &amp; Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    Tidak ada catatan aktivitas yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{log.userName}</div>
                        <div className="text-[10px] text-slate-400 capitalize">{log.userRole}</div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {log.studentName ? (
                          <span className="font-semibold text-blue-700">{log.studentName}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 max-w-md">{log.details}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
