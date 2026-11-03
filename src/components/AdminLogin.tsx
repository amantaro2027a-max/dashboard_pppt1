import React, { useState } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ShieldCheck, Lock, User, AlertCircle, KeyRound, Sparkles } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { login } = useProgramContext();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!userId.trim()) {
      setErrorMessage('Sila masukkan ID Pengguna.');
      return;
    }
    if (!password) {
      setErrorMessage('Sila masukkan Kata Laluan.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const result = login(userId, password);
      setIsLoading(false);
      if (!result.success) {
        setErrorMessage(result.message || 'Log masuk gagal.');
      }
    }, 200);
  };

  const handleQuickFillSuperAdmin = () => {
    setUserId('AMAN');
    setPassword('AMAN');
    setErrorMessage('');
  };

  const handleQuickFillSubAdmin = () => {
    setUserId('ADMIN_JPSM');
    setPassword('AMAN');
    setErrorMessage('');
  };

  return (
    <div className="max-w-md mx-auto my-8">
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 sm:p-8">
        {/* Header with Icon */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Log Masuk Portal Pengurusan Admin
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Dashboard Pusat PPPT & PKPOP · Institut Aminuddin Baki (IAB)
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              ID Pengguna
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                autoFocus
                value={userId}
                onChange={(e) => setUserId(e.target.value.toUpperCase())}
                placeholder="CTH: AMAN"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 font-medium tracking-wide uppercase"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Kata Laluan
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 font-medium tracking-wide"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isLoading ? 'Mengesahkan...' : 'Log Masuk'}</span>
          </button>
        </form>

        {/* Quick Demo Credentials Assistant */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Akses Demonstrasi Pantas</span>
          </div>

          <div className="space-y-2">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900 block">Super Admin (Kuasa Penuh)</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ID: <strong>AMAN</strong> | Kata Laluan: <strong>AMAN</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleQuickFillSuperAdmin}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Isi Pantas
              </button>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-slate-900 block">Admin Jabatan (JPSM)</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  ID: <strong>ADMIN_JPSM</strong> | Kata Laluan: <strong>AMAN</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={handleQuickFillSubAdmin}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-800 bg-white border border-slate-300 rounded hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Isi Pantas
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
