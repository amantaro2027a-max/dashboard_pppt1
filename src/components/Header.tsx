import React, { useState, useEffect, useRef } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import {
  Home,
  LayoutDashboard,
  ListFilter,
  ShieldCheck,
  RotateCcw,
  LogOut,
  Wallet,
  CreditCard,
  Share2,
  Scale,
  Coins,
  ChevronDown,
  Check,
  BarChart2,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    resetToDefaultData,
    filteredPrograms,
    currentUser,
    logout,
    firebaseStatus,
  } = useProgramContext();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

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
              DASHBOARD PUSAT
            </a>

            {/* Firebase Live Cloud Database indicator */}
            <div
              title={
                firebaseStatus === 'connected'
                  ? 'Pangkalan data awan Firebase Firestore disambung & diselaraskan'
                  : firebaseStatus === 'connecting'
                  ? 'Menyambung ke pangkalan data awan Firebase...'
                  : 'Pangkalan data mod simpanan tempatan aktif'
              }
              className="hidden lg:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 border border-slate-200 text-slate-700 select-none"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  firebaseStatus === 'connected'
                    ? 'bg-emerald-500 shadow-xs ring-2 ring-emerald-200'
                    : firebaseStatus === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-400'
                }`}
              />
              <span>{firebaseStatus === 'connected' ? 'Firebase Firestore: Aktif' : firebaseStatus === 'connecting' ? 'Firebase: Menyambung...' : 'Firebase: Tempatan'}</span>
            </div>
          </div>

          {/* Zone 2: Navigation Links (Dashboard, Perincian, Admin) */}
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab('welcome')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'welcome'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Laman Selamat Datang Utama"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Utama</span>
            </button>

            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard Program</span>
            </button>

            <button
              onClick={() => setActiveTab('bersepadu')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                activeTab === 'bersepadu'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Dashboard Bersepadu & Analitik Eksekutif PPPT"
            >
              <BarChart2 className="w-3.5 h-3.5 text-blue-500" />
              <span>Dashboard Bersepadu</span>
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
              <span>Admin</span>
              {currentUser && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Sesi Aktif" />
              )}
            </button>

            {/* Menu Drop Down List Page selepas Admin: Peruntukan, Perbelanjaan, Subwaran, Baki Peruntukan */}
            {(() => {
              const isSuper = currentUser?.role === 'SUPER_ADMIN';
              const userAllowed = isSuper
                ? ['PERUNTUKAN', 'PERBELANJAAN', 'SUBWARAN', 'BAKI PERUNTUKAN']
                : (currentUser?.allowedPages || []);

              const canPeruntukan = userAllowed.includes('PERUNTUKAN');
              const canPerbelanjaan = userAllowed.includes('PERBELANJAAN');
              const canSubwaran = userAllowed.includes('SUBWARAN');
              const canBaki = userAllowed.includes('BAKI PERUNTUKAN');
              const hasAnyFinancePage = userAllowed.length > 0;

              if (!hasAnyFinancePage) return null;

              return (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      ['peruntukan', 'perbelanjaan', 'subwaran', 'baki'].includes(activeTab)
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300'
                    }`}
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>
                      {activeTab === 'peruntukan'
                        ? 'Peruntukan'
                        : activeTab === 'perbelanjaan'
                        ? 'Perbelanjaan'
                        : activeTab === 'subwaran'
                        ? 'Subwaran'
                        : activeTab === 'baki'
                        ? 'Baki Peruntukan'
                        : 'Pengurusan Kewangan'}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider text-white ${
                        isSuper ? 'bg-purple-600' : 'bg-blue-600'
                      }`}
                    >
                      {isSuper ? 'Super Admin' : 'Admin'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-150 ${
                        isMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 sm:left-0 sm:right-auto mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3.5 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                        <span>{isSuper ? 'Menu Super Admin' : 'Menu Kewangan Diberi Akses'}</span>
                        <span className="text-purple-600 font-mono text-[9px]">
                          {userAllowed.length} MODUL
                        </span>
                      </div>

                      {/* 1. Peruntukan */}
                      {canPeruntukan && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('peruntukan');
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                            activeTab === 'peruntukan'
                              ? 'bg-purple-50 text-purple-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                              <Wallet className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">Peruntukan</div>
                              <div className="text-[10px] text-slate-400">Pengurusan agihan peruntukan fasa</div>
                            </div>
                          </div>
                          {activeTab === 'peruntukan' && (
                            <Check className="w-4 h-4 text-purple-600 shrink-0" />
                          )}
                        </button>
                      )}

                      {/* 2. Perbelanjaan */}
                      {canPerbelanjaan && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('perbelanjaan');
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                            activeTab === 'perbelanjaan'
                              ? 'bg-teal-50 text-teal-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                              <CreditCard className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">Perbelanjaan</div>
                              <div className="text-[10px] text-slate-400">Pemantauan belanja sebenar program</div>
                            </div>
                          </div>
                          {activeTab === 'perbelanjaan' && (
                            <Check className="w-4 h-4 text-teal-600 shrink-0" />
                          )}
                        </button>
                      )}

                      {/* 3. Subwaran */}
                      {canSubwaran && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('subwaran');
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                            activeTab === 'subwaran'
                              ? 'bg-amber-50 text-amber-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                              <Share2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">Subwaran</div>
                              <div className="text-[10px] text-slate-400">Agihan sub waran ke cawangan/PTJ luar</div>
                            </div>
                          </div>
                          {activeTab === 'subwaran' && (
                            <Check className="w-4 h-4 text-amber-600 shrink-0" />
                          )}
                        </button>
                      )}

                      {/* 4. Baki Peruntukan */}
                      {canBaki && (
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab('baki');
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-xs text-left transition-colors cursor-pointer ${
                            activeTab === 'baki'
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                              <Scale className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-900">Baki Peruntukan</div>
                              <div className="text-[10px] text-slate-400">Peruntukan − Belanja − Subwaran</div>
                            </div>
                          </div>
                          {activeTab === 'baki' && (
                            <Check className="w-4 h-4 text-blue-600 shrink-0" />
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </nav>

          {/* Zone 3: Primary Action Zone */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Admin User Status (Hanya dipaparkan jika log masuk) */}
            {currentUser && (
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
                  onClick={() => {
                    logout();
                    setActiveTab('dashboard');
                  }}
                  title="Log Keluar dari akaun Admin"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Log Keluar</span>
                </button>
              </div>
            )}

            <button
              onClick={() => {
                resetToDefaultData();
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
