import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, KeyRound, Eye, EyeOff, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { User, UserRole } from '../types';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (updatedUser: User) => void;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  if (!isOpen || !user) return null;

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email || '');
  const [nip, setNip] = useState(user.nip || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setUsername(user.username);
      setEmail(user.email || '');
      setNip(user.nip || '');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase().replace(/\s+/g, '_');

    if (!cleanName) {
      setError('Nama lengkap tidak boleh kosong.');
      return;
    }

    if (!cleanUsername) {
      setError('Username tidak boleh kosong.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 4) {
        setError('Kata sandi minimal 4 karakter.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setError('Konfirmasi kata sandi tidak cocok. Harap masukkan kata sandi yang sama.');
        return;
      }
    }

    const updatedUser: User = {
      ...user,
      name: cleanName,
      username: cleanUsername,
      email: email.trim() || `${cleanUsername}@sekolah.sch.id`,
      nip: nip.trim(), // Can be empty as requested
      password: newPassword ? newPassword : user.password,
    };

    onSave(updatedUser);
    onClose();
  };

  const roleLabel = user.role === 'admin' ? 'Administrator' : 'Petugas Tata Usaha (TU)';
  const roleBadgeColor =
    user.role === 'admin'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-blue-50 text-blue-700 border-blue-200';

  return (
    <div className="fixed inset-0 z-80 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-white">
                Ubah Nama &amp; Kata Sandi Akun
              </h3>
              <p className="text-[11px] text-slate-400">
                Peran: <span className="font-semibold text-slate-200">{roleLabel}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current role banner */}
          <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-700">Tingkat Akses Akun:</span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full font-bold border text-[11px] ${roleBadgeColor}`}>
              {roleLabel}
            </span>
          </div>

          {/* Nama Lengkap */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Nama Lengkap &amp; Gelar <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Dian Romadona, S.Pd. atau Mamat Miftahurrahmat, S.Pd."
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 font-semibold text-slate-900"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Nama yang akan tertera pada sistem, arsip unggahan berkas, dan laporan cetak.
            </p>
          </div>

          {/* Grid Username & NIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                Username Login <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin / petugas_tu"
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono font-medium text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">
                NIP (Nomor Induk Pegawai)
              </label>
              <input
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="Dapat dikosongkan (-)"
                className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono font-medium text-slate-800"
              />
              <p className="text-[10px] text-slate-500 mt-0.5">Bisa dikosongkan jika tidak ada.</p>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block font-bold text-slate-800 mb-1">Alamat Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@sekolah.sch.id"
              className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
            />
          </div>

          {/* Password Change Box */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                  <span>Ubah Kata Sandi (Password)</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  Biarkan kosong jika tidak ingin mengubah kata sandi akun ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Sembunyikan' : 'Lihat Sandi'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kata Sandi Baru</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Masukkan kata sandi baru"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Konfirmasi Kata Sandi</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi kata sandi baru"
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-2xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
