import React from 'react';
import { X, Check, ShieldCheck, User, ArrowRight, LogOut } from 'lucide-react';
import { User as UserType, UserRole } from '../types';

interface UserSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserType[];
  currentUser: UserType;
  onSelectUser: (user: UserType) => void;
  onLogout?: () => void;
}

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onSelectUser,
  onLogout,
}) => {
  if (!isOpen) return null;

  const roleBadges: Record<UserRole, { label: string; color: string; desc: string }> = {
    admin: {
      label: 'Administrator Sekolah',
      color: 'bg-red-100 text-red-800 border-red-200',
      desc: 'Hak akses penuh: kelola siswa, upload arsip, kelola user & backup data sekolah.',
    },
    petugas_tu: {
      label: 'Petugas Tata Usaha (TU)',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      desc: 'Pengelolaan berkas harian: input siswa, upload KK/KTP/Akta/Ijazah/KIP, download arsip.',
    },
  };

  return (
    <div className="fixed inset-0 z-80 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-extrabold text-base text-white">Ganti Akun &amp; Peran Petugas</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Pilih salah satu profil petugas demonstrasi untuk menguji sistem dengan tingkat hak akses yang berbeda:
          </p>

          <div className="space-y-3">
            {users.filter((u) => u.role === 'admin' || u.role === 'petugas_tu').map((user) => {
              const isSelected = user.id === currentUser.id;
              const badge = roleBadges[user.role] || roleBadges.petugas_tu;

              return (
                <div
                  key={user.id}
                  onClick={() => {
                    onSelectUser(user);
                    onClose();
                  }}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                    isSelected
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-9 h-9 rounded-xl font-bold text-xs flex items-center justify-center ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                          <span>{user.name}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 flex items-center gap-1 font-semibold group-hover:text-blue-600">
                        <span>Pilih</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-500">{badge.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          {onLogout ? (
            <button
              onClick={() => {
                onClose();
                onLogout();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar ke Halaman Login</span>
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
