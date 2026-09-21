import React from 'react';
import {
  LayoutDashboard,
  Users,
  History,
  ShieldCheck,
  Database,
  School,
  LogOut,
  UserCheck,
  X,
  Sparkles,
  ChevronRight,
  Shield,
  FileText,
  Calendar,
  Cloud,
  Server,
} from 'lucide-react';
import { User, UserRole, Student, StudentDocument } from '../types';
import { getSyncConfig } from '../services/mysqlSync';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  currentUser: User;
  onSwitchUserClick: () => void;
  onLogoutClick: () => void;
  onLoginAsAdminClick?: () => void;
  onManageAcademicYears?: () => void;
  onOpenRumahwebSync?: () => void;
  isOpen: boolean;
  onClose: () => void;
  studentsCount: number;
  documentsCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  currentUser,
  onSwitchUserClick,
  onLogoutClick,
  onLoginAsAdminClick,
  onManageAcademicYears,
  onOpenRumahwebSync,
  isOpen,
  onClose,
  studentsCount,
  documentsCount,
}) => {
  const syncConfig = getSyncConfig();
  const isCloudConnected = syncConfig.lastSyncStatus === 'success' && Boolean(syncConfig.apiUrl);
  const mainNavigation = [
    {
      id: 'dashboard',
      label: 'Dashboard & Statistik',
      description: 'Ringkasan & grafik berkas',
      icon: LayoutDashboard,
      allowedRoles: ['admin', 'petugas_tu'] as UserRole[],
    },
    {
      id: 'students',
      label: 'Data Siswa & Dokumen',
      description: 'Arsip KK, KTP, Akta, Ijazah',
      icon: Users,
      badge: `${studentsCount} Siswa`,
      allowedRoles: ['admin', 'petugas_tu'] as UserRole[],
    },
    {
      id: 'logs',
      label: 'Riwayat Log Aktivitas',
      description: 'Audit jejak rekam sistem',
      icon: History,
      allowedRoles: ['admin', 'petugas_tu'] as UserRole[],
    },
  ];

  const systemNavigation = [
    {
      id: 'academic-years',
      label: 'Tahun Pelajaran',
      description: 'Kelola & tambah tahun',
      icon: Calendar,
      badge: 'Fleksibel',
      allowedRoles: ['admin', 'petugas_tu'] as UserRole[],
      onClick: onManageAcademicYears,
    },
    {
      id: 'users',
      label: 'Pengguna & Hak Akses',
      description: 'Manajemen akun petugas',
      icon: ShieldCheck,
      badge: 'Admin',
      allowedRoles: ['admin'] as UserRole[],
    },
    {
      id: 'rumahweb-sync',
      label: 'Sinkronisasi Rumahweb',
      description: 'MySQL Cloud antar-PC',
      icon: Cloud,
      badge: isCloudConnected ? 'MySQL Aktif' : 'Atur Cloud',
      allowedRoles: ['admin', 'petugas_tu'] as UserRole[],
      onClick: onOpenRumahwebSync,
    },
    {
      id: 'backup',
      label: 'Cadangan & Keamanan',
      description: 'Ekspor JSON & cadangan',
      icon: Database,
      allowedRoles: ['admin', 'petugas_tu'] as UserRole[],
    },
  ];

  const handleNavClick = (viewId: string) => {
    onSelectView(viewId);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const isAdmin = currentUser.role === 'admin';

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-2xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header: School Logo & Title */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
              <School className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-xs sm:text-sm tracking-tight text-white block leading-snug">
                SD, SMP &amp; SMK Al-Tafaqquh Fiddin
              </span>
              <span className="text-[11px] text-blue-400 font-semibold tracking-wide block">
                Sistem Arsip Dokumen
              </span>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Tutup menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation Items (Di Samping) */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
          {/* Main Navigation Section */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Menu Utama
            </div>
            <nav className="space-y-1" aria-label="Menu Utama">
              {mainNavigation.map((item) => {
                const isActive = currentView === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left group ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                        }`}
                      />
                      <div className="truncate">
                        <div className="truncate">{item.label}</div>
                      </div>
                    </div>
                    {item.badge && (
                      <span
                        className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* System Settings Section */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Pengaturan &amp; Sistem
            </div>
            <nav className="space-y-1" aria-label="Pengaturan Sistem">
              {systemNavigation.map((item) => {
                const isAllowed = item.allowedRoles.includes(currentUser.role);
                if (!isAllowed) return null;

                const isActive = currentView === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => {
                      if ('onClick' in item && typeof item.onClick === 'function') {
                        item.onClick();
                        if (window.innerWidth < 1024) onClose();
                      } else {
                        handleNavClick(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left group ${
                      isActive
                        ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition ${
                          isActive ? 'text-white' : 'text-slate-400 group-hover:text-blue-400'
                        }`}
                      />
                      <div className="truncate">
                        <div className="truncate">{item.label}</div>
                      </div>
                    </div>
                    {item.badge && (
                      <span
                        className={`ml-2 text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Summary Widget */}
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-400" />
                <span>Dokumen Digital</span>
              </span>
              <span className="font-extrabold text-white">{documentsCount}</span>
            </div>
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Siswa Terdaftar</span>
              </span>
              <span className="font-extrabold text-white">{studentsCount}</span>
            </div>
          </div>
        </div>

        {/* Sidebar Footer: Active User & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/50 space-y-3">
          {/* User badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl font-extrabold text-xs flex items-center justify-center shrink-0 shadow-xs ${
                  isAdmin
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {currentUser.name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-white truncate">{currentUser.name}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`inline-block text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      isAdmin
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}
                  >
                    {isAdmin ? 'Administrator' : 'Petugas TU'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              id="sidebar-btn-switch-user"
              onClick={onSwitchUserClick}
              className="py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 border border-slate-700"
              title="Ganti akun petugas demo"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Ganti Akun</span>
            </button>

            <button
              type="button"
              id="sidebar-btn-logout"
              onClick={onLogoutClick}
              className="py-1.5 px-2 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 border border-rose-800/40"
              title="Keluar dari sesi aplikasi"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar</span>
            </button>
          </div>

          {!isAdmin && onLoginAsAdminClick && (
            <button
              type="button"
              onClick={onLoginAsAdminClick}
              className="w-full py-1.5 px-2 bg-red-950/40 hover:bg-red-900/50 text-red-300 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1.5 border border-red-800/40"
            >
              <Shield className="w-3 h-3 text-red-400" />
              <span>Masuk sebagai Admin</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
