import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Lock,
  Key,
  KeyRound,
  Check,
  AlertCircle,
  ShieldAlert,
  Edit3,
  Trash2,
  Copy,
  Eye,
  EyeOff,
  X,
  AlertTriangle,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { EditUserModal } from './EditUserModal';

interface UserManagementViewProps {
  users: User[];
  onSaveUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  currentUser: User;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  users,
  onSaveUser,
  onDeleteUser,
  currentUser,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    role: 'petugas_tu' as UserRole,
    nip: '',
    password: '',
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = formData.name.trim();
    const cleanUsername = formData.username
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_.]/g, '');

    if (!cleanName) {
      setFormError('Nama lengkap petugas tidak boleh kosong.');
      return;
    }

    if (!cleanUsername || cleanUsername.length < 3) {
      setFormError('Username minimal 3 karakter (huruf kecil, angka, garis bawah).');
      return;
    }

    // Check username uniqueness
    const isDuplicate = users.some(
      (u) => u.username.toLowerCase() === cleanUsername
    );
    if (isDuplicate) {
      setFormError(
        `Username "@${cleanUsername}" sudah digunakan oleh petugas lain. Silakan pilih username yang berbeda.`
      );
      return;
    }

    const defaultPass = formData.role === 'admin' ? 'admin' : 'tu123';
    const finalPassword = formData.password.trim() ? formData.password.trim() : defaultPass;

    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      name: cleanName,
      username: cleanUsername,
      email: formData.email.trim() || `${cleanUsername}@sekolah.sch.id`,
      role: formData.role,
      nip: formData.nip.trim(),
      password: finalPassword,
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
      password: '',
    });
    setFormError(null);
  };

  const handleConfirmDelete = () => {
    if (!userToDelete) return;
    onDeleteUser(userToDelete.id);
    setUserToDelete(null);
  };

  const handleCopyCredentials = (user: User) => {
    const pass = user.password || (user.role === 'admin' ? 'admin' : 'tu123');
    const text = `Akun Arsip SD, SMP & SMK Al-Tafaqquh Fiddin:\nNama: ${user.name}\nUsername: ${user.username}\nKata Sandi: ${pass}\nPeran: ${user.role === 'admin' ? 'Administrator' : 'Petugas TU'}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedUserId(user.id);
      setTimeout(() => setCopiedUserId(null), 2500);
    }).catch(() => {});
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
      desc: 'Kelola biodata siswa (tambah, edit, hapus), unggah & hapus berkas dokumen, unduh arsip, dan cetak laporan.',
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
          onClick={() => {
            setFormError(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-2xs transition self-start sm:self-auto cursor-pointer"
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
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Daftar Akun Petugas Sekolah</h3>
            <p className="text-[11px] text-slate-400">Seluruh akun dapat masuk ke aplikasi arsip dengan username dan kata sandi masing-masing</p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-full border border-slate-200">
            {users.length} Akun Terdaftar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Nama Petugas</th>
                <th className="py-3 px-4">Username Login</th>
                <th className="py-3 px-4">NIP</th>
                <th className="py-3 px-4">Peran / Hak Akses</th>
                <th className="py-3 px-4">Status &amp; Terakhir Masuk</th>
                <th className="py-3 px-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => {
                const roleBadge = roleLabels[user.role] || roleLabels.petugas_tu;
                const isCurrent = user.id === currentUser.id;
                const isPrimaryAdmin = user.id === 'usr-admin-01' || user.username.toLowerCase() === 'admin';

                return (
                  <tr key={user.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-xs shrink-0">
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
                          <div className="text-[11px] text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800">@{user.username}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyCredentials(user)}
                          title="Salin username & rincian login akun"
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                        >
                          {copiedUserId === user.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-400 font-sans">
                        Sandi: <span className="font-mono text-slate-600">{user.password || (user.role === 'admin' ? 'admin' : 'tu123')}</span>
                      </div>
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
                        <span className={`w-2 h-2 rounded-full ${user.active !== false ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        <span>{user.lastLogin || 'Aktif'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingUser(user)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition shadow-2xs cursor-pointer"
                          title={`Ubah profil atau kata sandi untuk ${user.name}`}
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Ubah</span>
                        </button>

                        {!isPrimaryAdmin && !isCurrent && (
                          <button
                            type="button"
                            onClick={() => setUserToDelete(user)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition shadow-2xs cursor-pointer"
                            title={`Hapus akun petugas ${user.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Hapus</span>
                          </button>
                        )}
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
          Penjelasan hak akses tiap tingkatan pengguna di dalam sistem arsip digital SD, SMP &amp; SMK Al-Tafaqquh Fiddin
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
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Hapus Data Siswa &amp; Berkas Dokumen</span>
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
                    <span>Cadangan Sistem (Backup) &amp; Pengaturan Cloud</span>
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
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <span>Tambah Akun Petugas Baru</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 font-semibold text-xs mb-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Contoh: Rina Anggraini, S.Pd."
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Username Login <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      username: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    })
                  }
                  placeholder="Contoh: rina_tu"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-700"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Gunakan huruf kecil, angka, atau garis bawah tanpa spasi (unik untuk setiap petugas).
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Peran / Hak Akses</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white font-semibold text-slate-800"
                >
                  <option value="petugas_tu">Petugas Tata Usaha (TU)</option>
                  <option value="admin">Administrator Sekolah</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">NIP (Nomor Induk Pegawai)</label>
                <input
                  type="text"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  placeholder="Boleh dikosongkan jika belum memiliki NIP"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Alamat Email Sekolah</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Opsional: otomatis rina_tu@sekolah.sch.id"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Kata Sandi Awal</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={formData.role === 'admin' ? 'Bawaan: admin' : 'Bawaan: tu123'}
                    className="w-full p-2.5 pr-10 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Biarkan kosong untuk menggunakan kata sandi bawaan ({formData.role === 'admin' ? 'admin' : 'tu123'}).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl font-bold shadow-2xs transition cursor-pointer"
                >
                  Simpan Petugas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-base mb-1">
              Hapus Akun Petugas?
            </h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun petugas <span className="font-bold text-slate-900">{userToDelete.name}</span> (@{userToDelete.username})? Setelah dihapus, akun ini tidak akan dapat login lagi ke sistem.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-3.5 py-2 rounded-xl font-semibold text-xs text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.99] text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
              >
                Ya, Hapus Akun
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User & Password Modal */}
      <EditUserModal
        isOpen={!!editingUser}
        user={editingUser}
        onClose={() => setEditingUser(null)}
        onSave={(updated) => {
          onSaveUser(updated);
          setEditingUser(null);
        }}
      />
    </div>
  );
};
