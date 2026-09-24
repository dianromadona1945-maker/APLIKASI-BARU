import React, { useState, useEffect } from 'react';
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
  FileCheck2,
  Clock,
} from 'lucide-react';
import { User, UserRole } from '../types';
import { loginUser, saveUser } from '../services/storage';
import { loginWithHosting, pullUsersFromHosting } from '../services/mysqlSync';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
  noticeMessage?: string | null;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess, noticeMessage }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    // Tarik akun petugas terbaru dari server hosting secara otomatis di latar belakang
    pullUsersFromHosting()
      .then((remoteUsers) => {
        if (remoteUsers && Array.isArray(remoteUsers) && remoteUsers.length > 0) {
          remoteUsers.forEach((ru) => saveUser(ru));
        }
      })
      .catch(() => {});
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = username.trim().replace(/^@/, '');
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMessage('Mohon lengkapi username dan kata sandi.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // 1. Coba login lokal terlebih dahulu (cepat dan mendukung akses offline)
    const localResult = loginUser(cleanUsername, cleanPassword);
    if (localResult.success && localResult.user) {
      setIsLoading(false);
      onLoginSuccess(localResult.user);
      return;
    }

    // 2. Jika akun belum tersimpan di browser ini, lakukan verifikasi langsung ke server MySQL hosting
    try {
      const remoteLogin = await loginWithHosting(cleanUsername, cleanPassword);
      if (remoteLogin.success && remoteLogin.user) {
        saveUser(remoteLogin.user);
        const retryResult = loginUser(cleanUsername, cleanPassword);
        setIsLoading(false);
        if (retryResult.success && retryResult.user) {
          onLoginSuccess(retryResult.user);
          return;
        } else {
          onLoginSuccess(remoteLogin.user);
          return;
        }
      } else if (remoteLogin.error && !remoteLogin.error.includes('HTTP 404') && !remoteLogin.error.includes('Aksi tidak dikenal')) {
        setIsLoading(false);
        setErrorMessage(remoteLogin.error);
        return;
      }
    } catch {}

    setIsLoading(false);
    setErrorMessage(localResult.error || 'Login gagal. Periksa kembali username dan kata sandi Anda.');
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
            <span className="text-[11px] text-slate-400 font-medium">
              SD, SMP &amp; SMK Al-Tafaqquh Fiddin • Portal Masuk Petugas
            </span>
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

              {/* Security & Confidentiality Notice */}
              <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-lg space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Kerahasiaan &amp; Akses Terbatas</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sistem ini hanya diperuntukkan bagi Administrator dan Petugas Tata Usaha resmi SD, SMP &amp; SMK Al-Tafaqquh Fiddin. Seluruh aktivitas akses dan pengelolaan dokumen siswa tercatat dalam sistem audit keamanan.
                </p>
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
                <span>Cadangan Data JSON &amp; ZIP</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Kepatuhan UU PDP</span>
              </div>
            </div>
          </div>

          {/* Right Column: Standard Interactive Login Form */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 flex flex-col justify-center">
            <div>
              {/* Form Title */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    Masuk ke Akun Petugas
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Silakan masukkan nama pengguna dan kata sandi resmi Anda
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
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
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
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    selectedRole === 'petugas_tu'
                      ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-extrabold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileCheck2 className="w-4 h-4 text-blue-600" />
                  <span>Petugas Tata Usaha (TU)</span>
                </button>
              </div>

              {/* Auto-logout / Security Notice if any */}
              {noticeMessage && (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start gap-2.5 shadow-xs animate-fadeIn">
                  <Clock className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold block text-amber-800">Sesi Berakhir Otomatis</span>
                    <span className="text-amber-700">{noticeMessage}</span>
                  </div>
                </div>
              )}

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
                      placeholder="Masukkan username Anda..."
                      className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium transition text-slate-900"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">Kata Sandi</label>
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
                      className="w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-slate-50 focus:bg-white rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium transition font-mono text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
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
                        <span>Memverifikasi Kredensial...</span>
                      </span>
                    ) : (
                      <>
                        <span>
                          Masuk Sebagai {selectedRole === 'admin' ? 'Administrator' : 'Petugas TU'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full py-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/80">
        <p>Sistem Pengelolaan Dokumen Siswa SD, SMP &amp; SMK Al-Tafaqquh Fiddin</p>
      </footer>
    </div>
  );
};
