import React from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { LayoutDashboard, ListFilter, ShieldCheck, Download, RotateCcw, LogOut, LogIn, User } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsExportOpen,
    resetToDefaultData,
    filteredPrograms,
    currentUser,
    logout,
  } = useProgramContext();

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Zone 1: Single text element Brand wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
              IAB
            </div>
            <a
              href="#dashboard"
              onClick={(e) => {
                e.preventDefault();
                setActiveTab('dashboard');
              }}
              className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-slate-700"
            >
              DASHBOARD PUSAT PPPT
            </a>
          </div>

          {/* Zone 2: Navigation Links (Page 1, Page 2, Page 3: Admin) */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard Program Pusat</span>
            </button>

            <button
              onClick={() => setActiveTab('perincian')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'perincian'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Perincian Program</span>
              <span
                className={`ml-0.5 text-[11px] px-1.5 py-0.2 rounded-full tabular-nums ${
                  activeTab === 'perincian'
                    ? 'bg-slate-800 text-slate-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {filteredPrograms.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'admin'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Page 3: Admin</span>
              {currentUser && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sesi Aktif" />
              )}
            </button>
          </nav>

          {/* Zone 3: Primary Action Zone */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsExportOpen(true)}
              title="Eksport data ke fail CSV atau cetak format rasmi"
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Eksport</span>
            </button>

            {/* Admin User Status / Shortcut */}
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex flex-col items-end text-right">
                  <span className="text-[11px] font-bold text-slate-900 leading-tight">
                    {currentUser.id}
                  </span>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin Jabatan'}
                  </span>
                </div>
                <button
                  onClick={logout}
                  title="Log Keluar dari akaun Admin"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Keluar</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('admin')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-slate-500" />
                <span>Log Masuk Admin</span>
              </button>
            )}

            <button
              onClick={() => {
                if (window.confirm('Set semula semua rekod kepada data contoh rasmi asal?')) {
                  resetToDefaultData();
                }
              }}
              title="Set Semula Data Contoh Asal"
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
