import React from 'react';
import {
  Menu,
  ShieldCheck,
  UserCheck,
  LogOut,
  ArrowRightLeft,
  School,
  FileText,
  Users,
  LayoutDashboard,
  History,
  Database,
  KeyRound,
  Cloud,
  Server,
  RefreshCw,
} from 'lucide-react';
import { User, StudentDocument, Student } from '../types';
import { getSyncConfig } from '../services/mysqlSync';

interface NavbarProps {
  currentUser: User;
  onSwitchUserClick: () => void;
  onLogoutClick: () => void;
  onEditProfileClick?: () => void;
  onLoginAsAdminClick?: () => void;
  onOpenRumahwebSync?: () => void;
  onForceSync?: () => void;
  isSyncing?: boolean;
  syncStatus?: 'connected' | 'syncing' | 'error' | 'idle';
  onToggleSidebar: () => void;
  currentView: string;
  students: Student[];
  documents: StudentDocument[];
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUserClick,
  onLogoutClick,
  onEditProfileClick,
  onLoginAsAdminClick,
  onOpenRumahwebSync,
  onForceSync,
  isSyncing = false,
  syncStatus = 'connected',
  onToggleSidebar,
  currentView,
  students,
  documents,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const syncConfig = getSyncConfig();
  const isCloudConnected =
    syncStatus === 'connected' ||
    (Boolean(syncConfig.apiUrl) && syncConfig.lastSyncStatus !== 'error');

  const viewTitles: Record<string, { title: string; subtitle: string; icon: React.ComponentType<{ className?: string }> }> = {
    dashboard: {
      title: 'Dashboard & Statistik',
      subtitle: 'Ringkasan kelengkapan berkas & grafik arsip',
      icon: LayoutDashboard,
    },
    students: {
      title: 'Data Siswa & Dokumen',
      subtitle: 'Arsip digital KK, KTP, Akta, Ijazah, KIP siswa',
      icon: Users,
    },
    logs: {
      title: 'Riwayat Log Aktivitas',
      subtitle: 'Jejak rekam audit aktivitas penyimpanan berkas',
      icon: History,
    },
    users: {
      title: 'Pengguna & Hak Akses',
      subtitle: 'Manajemen akun Administrator & Petugas TU',
      icon: ShieldCheck,
    },
    backup: {
      title: 'Cadangan & Keamanan Data',
      subtitle: 'Ekspor database JSON, unduhan & proteksi arsip',
      icon: Database,
    },
  };

  const currentViewInfo = viewTitles[currentView] || viewTitles.dashboard;
  const CurrentIcon = currentViewInfo.icon;

  const roleBadges: Record<string, { label: string; color: string }> = {
    admin: { label: 'Administrator', color: 'bg-red-50 text-red-700 border-red-200' },
    petugas_tu: { label: 'Petugas TU', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  };

  const currentRoleBadge = roleBadges[currentUser.role] || {
    label: currentUser.role,
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Left: Mobile hamburger & Page title */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button
              type="button"
              id="btn-toggle-sidebar"
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
              aria-label="Buka navigasi samping"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="hidden sm:flex w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 items-center justify-center shrink-0">
                <CurrentIcon className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight leading-tight">
                  {currentViewInfo.title}
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500 font-medium hidden xs:block">
                  {currentViewInfo.subtitle}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Quick Stats & User controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick stats on medium screens and up */}
            <div className="hidden md:flex items-center space-x-3 border-r border-slate-200 pr-4 mr-1">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Siswa</div>
                <div className="text-xs font-extrabold text-slate-800">{students.length} Siswa</div>
              </div>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-slate-400">Arsip Berkas</div>
                <div className="text-xs font-extrabold text-blue-600">{documents.length} Dokumen</div>
              </div>
            </div>

            {/* Cloud MySQL Rumahweb Sync Quick Button & Live Status */}
            {onOpenRumahwebSync && (
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5 shadow-2xs">
                <button
                  type="button"
                  onClick={onOpenRumahwebSync}
                  title={
                    isSyncing
                      ? 'Sedang menyelaraskan data dengan database MySQL Rumahweb...'
                      : isCloudConnected
                      ? 'Live Sync Aktif: Data otomatis tersambung antar-laptop'
                      : 'Sambungkan ke Database MySQL Hosting Rumahweb'
                  }
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    isSyncing
                      ? 'text-blue-800 bg-blue-50'
                      : isCloudConnected
                      ? 'text-emerald-800 hover:bg-emerald-50'
                      : 'text-indigo-800 hover:bg-indigo-50'
                  }`}
                >
                  <div className="relative">
                    <Cloud className={`w-3.5 h-3.5 ${isSyncing ? 'text-blue-600 animate-bounce' : isCloudConnected ? 'text-emerald-600' : 'text-slate-500'}`} />
                    <span
                      className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                        isSyncing
                          ? 'bg-blue-500 animate-ping'
                          : isCloudConnected
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-amber-400'
                      }`}
                    />
                  </div>
                  <span className="inline-block whitespace-nowrap">
                    {isSyncing ? 'Sinkronisasi...' : isCloudConnected ? 'Live Sync' : 'Sinkron Cloud'}
                  </span>
                </button>

                {onForceSync && (
                  <button
                    type="button"
                    onClick={onForceSync}
                    disabled={isSyncing}
                    title={isSyncing ? 'Sedang memeriksa & menyelaraskan data...' : 'Tarik data terbaru dari cloud sekarang (Sinkron Manual)'}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : ''}`} />
                  </button>
                )}
              </div>
            )}

            {/* User chip */}
            <div
              onClick={onEditProfileClick}
              title="Klik untuk mengubah nama atau kata sandi akun Anda"
              className="flex items-center space-x-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-1.5 pr-2.5 cursor-pointer transition"
            >
              <div
                className={`w-8 h-8 rounded-lg font-bold flex items-center justify-center text-xs shadow-2xs ${
                  isAdmin ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'
                }`}
              >
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                  {currentUser.name}
                </div>
                <div className="mt-0.5">
                  <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold ${currentRoleBadge.color}`}>
                    {currentRoleBadge.label}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Edit Profile & Password Button */}
            {onEditProfileClick && (
              <button
                type="button"
                onClick={onEditProfileClick}
                title="Ubah Nama & Kata Sandi Akun Anda"
                className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg shadow-2xs transition cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden xl:inline">Ubah Profil &amp; Sandi</span>
              </button>
            )}

            {/* Quick Login Admin button if user is not admin */}
            {!isAdmin && onLoginAsAdminClick && (
              <button
                type="button"
                onClick={onLoginAsAdminClick}
                title="Masuk sebagai Administrator"
                className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg shadow-2xs transition"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                <span>Login Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSwitchUserClick}
              title="Ganti Akun / Peran Petugas"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs hover:border-slate-300 transition cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden lg:inline">Ganti Akun</span>
            </button>

            <button
              type="button"
              onClick={onLogoutClick}
              title="Keluar dari Sistem"
              className="inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg shadow-2xs transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

