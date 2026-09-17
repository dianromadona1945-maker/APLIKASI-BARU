import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  School,
  ArrowRight,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileCheck2,
  Users,
  Database,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { loginUser, loginAsRole, getUsers } from '../services/storage';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const users = getUsers();
  const adminUser = users.find((u) => u.role === 'admin') || users[0];

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    if (role === 'admin') {
      setUsername('admin');
      setPassword('admin123');
    } else {
      setUsername('petugas_tu');
      setPassword('tu123');
    }
  };

  const handleQuickAdminLogin = () => {
    setIsLoading(true);
    setErrorMessage(null);
    setTimeout(() => {
      const user = loginAsRole('admin');
      setIsLoading(false);
      onLoginSuccess(user);
    }, 400);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Mohon lengkapi username dan kata sandi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      const result = loginUser(username, password);
      setIsLoading(false);

      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'Login gagal. Periksa username dan password Anda.');
      }
    }, 350);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top minimal header */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-slate-900 bg-slate-950/70 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <School className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-white text-base tracking-tight block">
              Sistem Arsip Dokumen Siswa
            </span>
            <span className="text-[11px] text-slate-400 font-medium">SMP &amp; SMK Al-Tafaqquh Fiddin • Portal Masuk Petugas</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Sistem Daring Aktif</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left Column: Admin Spotlight & School Brand Info */}
          <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between text-white shadow-2xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Portal Keamanan Arsip</span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
                  Pengelolaan Dokumen Siswa Terpadu
                </h1>
                <p className="text-slate-400 text-xs sm:text-sm mt-2 leading-relaxed">
                  Digitalisasi berkas Kartu Keluarga, KTP, Akta Kelahiran, Ijazah, dan KIP dengan jaminan
                  keabsahan serta keamanan data pribadi siswa.
                </p>
              </div>

              {/* Quick Admin Access Card */}
              <div className="p-4 rounded-2xl bg-slate-800/80 border border-blue-500/30 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Akses Cepat Administrator</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-red-500/20 text-red-300 border border-red-500/30">
                    Akses Penuh
                  </span>
                </div>

                <div className="text-xs text-slate-300">
                  <div className="font-bold text-white">{adminUser.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                    Username: <span className="text-blue-300 font-bold">admin</span> • Pass:{' '}
                    <span className="text-blue-300 font-bold">admin123</span>
                  </div>
                </div>

                <button
                  type="button"
                  id="quick-admin-login-btn"
                  onClick={handleQuickAdminLogin}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 active:scale-[0.99] text-white rounded-xl text-xs font-extrabold shadow-md shadow-blue-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Masuk Langsung Sebagai Admin</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Feature pillars */}
            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-2 gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Verifikasi Berkas Sah</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Audit Trail Terpusat</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cadangan Data JSON & ZIP</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Kepatuhan UU PDP</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Login Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col justify-between">
            <div>
              {/* Form Title */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Masuk ke Akun Petugas
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih peran atau masukkan kredensial akun Anda di bawah ini
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <KeyRound className="w-5 h-5" />
                </div>
              </div>

              {/* Role Switcher Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl mb-5">
                <button
                  type="button"
                  id="tab-role-admin"
                  onClick={() => handleRoleSelect('admin')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    selectedRole === 'admin'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-red-500" />
                  <span>Administrator</span>
                </button>

                <button
                  type="button"
                  id="tab-role-tu"
                  onClick={() => handleRoleSelect('petugas_tu')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    selectedRole === 'petugas_tu'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileCheck2 className="w-4 h-4 text-blue-600" />
                  <span>Petugas Tata Usaha (TU)</span>
                </button>
              </div>

              {/* Alert error if any */}
              {errorMessage && (
                <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form Inputs */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nama Pengguna (Username / Email)
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      id="input-username"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Masukkan username atau email..."
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium transition"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {selectedRole === 'admin' ? 'Sandi demo: admin / admin123' : 'Sandi demo: tu123'}
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="input-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi..."
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium transition font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 transition"
                      title={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center space-x-2 text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span>Ingat sesi masuk saya</span>
                  </label>
                  <span className="text-slate-400 text-[11px]">Sesi Tersimpan di Peramban</span>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    id="submit-login-btn"
                    disabled={isLoading}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white rounded-xl text-xs sm:text-sm font-extrabold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                  >
                    {isLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Memverifikasi Akses...</span>
                      </span>
                    ) : (
                      <>
                        <span>Masuk Sebagai {selectedRole === 'admin' ? 'Administrator' : 'Petugas TU'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Quick Demo Credentials helper */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Kredensial Akun Demonstrasi (Klik untuk Mengisi):
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleRoleSelect('admin')}
                  className={`p-2.5 rounded-xl text-left border transition ${
                    selectedRole === 'admin'
                      ? 'bg-blue-50/80 border-blue-300 text-blue-900 ring-1 ring-blue-400'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-extrabold text-red-600 flex items-center justify-between">
                    <span>Administrator</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700">Akses Penuh</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono mt-1">Username: <strong>admin</strong></div>
                  <div className="text-[11px] text-slate-500 font-mono">Password: <strong>admin123</strong></div>
                </button>

                <button
                  type="button"
                  onClick={() => handleRoleSelect('petugas_tu')}
                  className={`p-2.5 rounded-xl text-left border transition ${
                    selectedRole === 'petugas_tu'
                      ? 'bg-blue-50/80 border-blue-300 text-blue-900 ring-1 ring-blue-400'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="font-extrabold text-blue-600 flex items-center justify-between">
                    <span>Petugas TU</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">Arsip &amp; Berkas</span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono mt-1">Username: <strong>petugas_tu</strong></div>
                  <div className="text-[11px] text-slate-500 font-mono">Password: <strong>tu123</strong></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/80">
        <p>Sistem Pengelolaan Dokumen Siswa SMP dan SMK Al-Tafaqquh Fiddin • Tahun Pelajaran 2024/2025</p>
      </footer>
    </div>
  );
};
