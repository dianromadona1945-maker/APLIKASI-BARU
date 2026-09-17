import React, { useState } from 'react';
import { ShieldCheck, UserPlus, Users, Lock, Key, Check, AlertCircle, ShieldAlert } from 'lucide-react';
import { User, UserRole } from '../types';

interface UserManagementViewProps {
  users: User[];
  onSaveUser: (user: User) => void;
  currentUser: User;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  onSaveUser,
  currentUser,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    role: 'petugas_tu' as UserRole,
    nip: '',
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username) return;

    const newUser: User = {
      id: `usr-${Date.now().toString().slice(-6)}`,
      name: formData.name,
      username: formData.username.toLowerCase().replace(/\s+/g, '_'),
      email: formData.email || `${formData.username}@sekolah.sch.id`,
      role: formData.role,
      nip: formData.nip,
      active: true,
      lastLogin: 'Baru Dibuat',
    };

    onSaveUser(newUser);
    setShowAddModal(false);
    setFormData({
      name: '',
      username: '',
      email: '',
      role: 'petugas_tu',
      nip: '',
    });
  };

  const roleLabels: Record<UserRole, { label: string; color: string; desc: string }> = {
    admin: {
      label: 'Administrator Sistem',
      color: 'bg-red-50 text-red-700 border-red-200',
      desc: 'Akses penuh: Kelola biodata siswa, arsip berkas KK/KTP/Akta/Ijazah/KIP, manajemen akun petugas, dan cadangan sistem.',
    },
    petugas_tu: {
      label: 'Petugas Tata Usaha (TU)',
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      desc: 'Input dan edit biodata siswa, unggah berkas arsip, unduh berkas digital, dan cetak laporan.',
    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Pengelolaan Pengguna &amp; Hak Akses (RBAC)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Membatasi hak akses dokumen siswa yang memuat data pribadi sensitif hanya untuk staf berwenang
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-2xs transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Tambah Petugas Baru</span>
        </button>
      </div>

      {/* Security Banner: UU Perlindungan Data Pribadi */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 sm:p-5 flex items-start space-x-3.5">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-extrabold block text-sm text-amber-950 mb-0.5">
            Kebijakan Privasi &amp; Kepatuhan Data Pribadi Siswa
          </span>
          Berdasarkan ketentuan perlindungan data pribadi dan administrasi sekolah, dokumen seperti Kartu Keluarga,
          KTP, dan Akta Kelahiran memuat NIK dan data keluarga yang bersifat rahasia. Akses ke berkas digital dibatasi
          secara ketat sesuai dengan peran (Role-Based Access Control) dan setiap tindakan terekam dalam audit log.
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Daftar Akun Petugas Sekolah</h3>
          <span className="text-xs text-slate-400">{users.length} Akun Aktif</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Nama Petugas</th>
                <th className="py-3 px-4">Username &amp; Email</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Peran / Hak Akses</th>
                <th className="py-3 px-4">Status &amp; Terakhir Aktif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const roleBadge = roleLabels[user.role] || roleLabels.petugas_tu;
                const isCurrent = user.id === currentUser.id;

                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs">
                          {user.name
                            .split(' ')
                            .map((n) => n[0])
                            .slice(0, 2)
                            .join('')}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{user.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded">
                                Anda
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-700">
                      <div>@{user.username}</div>
                      <div className="text-[11px] text-slate-400">{user.email}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-600">
                      {user.nip || '-'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${roleBadge.color}`}>
                        {roleBadge.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>{user.lastLogin || 'Aktif'}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RBAC Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="font-extrabold text-slate-900 text-sm mb-1">Matriks Izin &amp; Batasan Hak Akses</h3>
        <p className="text-xs text-slate-500 mb-4">
          Penjelasan hak akses tiap tingkatan pengguna di dalam sistem arsip digital
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['admin', 'petugas_tu'] as UserRole[]).map((r) => {
            const info = roleLabels[r];
            return (
              <div key={r} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-block ${info.color}`}>
                  {info.label}
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{info.desc}</p>
                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 space-y-1 font-medium">
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Akses Pencarian &amp; Preview Dokumen</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unggah &amp; Perbarui Berkas Dokumen</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Unduh Arsip &amp; Ekspor Dokumen ZIP/Excel</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r === 'admin' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="text-slate-300 font-bold">✕</span>
                    )}
                    <span>Kelola Akun Pengguna &amp; Hak Akses</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r === 'admin' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="text-slate-300 font-bold">✕</span>
                    )}
                    <span>Hapus Data Permanen &amp; Cadangan Sistem (Backup)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 bg-black/50 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200">
            <h3 className="font-extrabold text-slate-900 text-base mb-4">Tambah Akun Petugas Baru</h3>
            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap &amp; Gelar</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Rina Anggraini, S.Pd."
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Username Login</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Contoh: rina_tu"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Peran / Hak Akses</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white font-medium"
                >
                  <option value="petugas_tu">Petugas Tata Usaha (TU)</option>
                  <option value="admin">Administrator Sekolah</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">NIP (Nomor Induk Pegawai)</label>
                <input
                  type="text"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="Contoh: 199308122019032005"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Email Sekolah</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="rina@sekolah.sch.id"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-2xs"
                >
                  Simpan Petugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
