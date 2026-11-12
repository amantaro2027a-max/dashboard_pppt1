import React, { useState, useEffect, useRef } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import {
  Home,
  LayoutDashboard,
  ListFilter,
  ShieldCheck,
  LogOut,
  Wallet,
  CreditCard,
  Share2,
  Scale,
  ChevronDown,
  Check,
  BarChart2,
} from 'lucide-react';
import jataNegaraLogo from '../assets/jata_negara.png';

export const Header: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    filteredPrograms,
    currentUser,
    logout,
    firebaseStatus,
  } = useProgramContext();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or ESC key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  // Dashboard pages list & Permissions Filter
  const isDashboardActive = activeTab !== 'welcome';
  const isSuper = currentUser?.role === 'SUPER_ADMIN';
  const isAdmin = currentUser?.role === 'ADMIN';
  const allowedPages = currentUser?.allowedPages || [];

  const allMenuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard Program',
      desc: 'Pemantauan statistik perancangan & status program',
      icon: LayoutDashboard,
      iconBg: 'bg-blue-100 text-blue-700',
    },
    {
      id: 'bersepadu',
      label: 'Dashboard Bersepadu',
      desc: 'Analitik eksekutif & risikan bersepadu PPPT',
      icon: BarChart2,
      iconBg: 'bg-indigo-100 text-indigo-700',
    },
    {
      id: 'perincian',
      label: 'Perincian Program',
      desc: 'Katalog terperinci maklumat program & kod OS',
      icon: ListFilter,
      iconBg: 'bg-teal-100 text-teal-700',
      badge: filteredPrograms.length,
    },
    {
      id: 'peruntukan',
      label: 'Peruntukan',
      desc: 'Penetapan peruntukan fasa mengikut kod OS',
      icon: Wallet,
      iconBg: 'bg-purple-100 text-purple-700',
    },
    {
      id: 'perbelanjaan',
      label: 'Perbelanjaan',
      desc: 'Pemantauan rekod belanja sebenar program',
      icon: CreditCard,
      iconBg: 'bg-emerald-100 text-emerald-700',
    },
    {
      id: 'subwaran',
      label: 'Subwaran',
      desc: 'Agihan sub waran peruntukan ke cawangan/PTJ',
      icon: Share2,
      iconBg: 'bg-amber-100 text-amber-700',
    },
    {
      id: 'baki',
      label: 'Baki Peruntukan',
      desc: 'Peruntukan − Belanja − Subwaran = Baki Bersih',
      icon: Scale,
      iconBg: 'bg-sky-100 text-sky-700',
    },
    {
      id: 'admin',
      label: 'Admin',
      desc: 'Pusat kawalan pendaftaran & akaun pentadbir',
      icon: ShieldCheck,
      iconBg: 'bg-rose-100 text-rose-700',
      hasActiveSession: !!currentUser,
    },
  ];

  // User requirement:
  // "From Page UTAMA, once klik MASUK, viewer sahaja can only see Page Dashboard Program and Dashboard Bersepadu sahaja.
  // Other page hide from guest/view user/public. Only certain user can view page based on selected page from KEBENARAN VIEW/PAPAR PAGE."
  const visibleMenuItems = allMenuItems.filter((item) => {
    // 1. Dashboard Program sentiasa dibenarkan untuk semua
    if (item.id === 'dashboard') {
      return true;
    }

    // 2. Super Admin mempunyai kebenaran capaian semua modul
    if (isSuper) {
      return true;
    }

    // 3. Untuk pelawat / mod viewer (tiada log masuk), hanya Dashboard Program dan Dashboard Bersepadu
    if (!currentUser) {
      return item.id === 'dashboard' || item.id === 'bersepadu';
    }

    // 4. Untuk Admin biasa, tapis mengikut halaman yang dipilih dalam KEBENARAN VIEW/PAPAR PAGE
    if (isAdmin) {
      if (item.id === 'admin') return true;
      if (item.id === 'bersepadu') return allowedPages.includes('DASHBOARD BERSEPADU');
      if (item.id === 'perincian') return allowedPages.includes('PERINCIAN PROGRAM');
      if (item.id === 'peruntukan') return allowedPages.includes('PERUNTUKAN');
      if (item.id === 'perbelanjaan') return allowedPages.includes('PERBELANJAAN');
      if (item.id === 'subwaran') return allowedPages.includes('SUBWARAN');
      if (item.id === 'baki') return allowedPages.includes('BAKI PERUNTUKAN');
    }

    return false;
  });

  const handleLogout = () => {
    logout();
    setActiveTab('dashboard');
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* ============================================================== */}
        {/* BARIS 1: JATA NEGARA & PORTAL MAKLUMAT PROGRAM IAB            */}
        {/* ============================================================== */}
        <div className="py-3 border-b border-slate-100 relative">
          {/* Status Awan (Unobtrusive di penjuru kanan) */}
          <div className="absolute right-0 top-3 hidden md:flex items-center gap-1.5">
            <div
              title={
                firebaseStatus === 'connected'
                  ? 'Pangkalan data awan Firebase Firestore disambung & diselaraskan'
                  : firebaseStatus === 'connecting'
                  ? 'Menyambung ke pangkalan data awan Firebase...'
                  : 'Pangkalan data mod simpanan tempatan aktif'
              }
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 border border-slate-200 text-slate-700 select-none"
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
              <span>
                {firebaseStatus === 'connected'
                  ? 'Cloud: Aktif'
                  : firebaseStatus === 'connecting'
                  ? 'Menyambung...'
                  : 'Tempatan'}
              </span>
            </div>
          </div>

          {/* Centered Jata Negara + KEMENTERIAN PENDIDIKAN / INSTITUT AMINUDDIN BAKI + PORTAL MAKLUMAT PROGRAM IAB */}
          <div className="flex flex-col items-center justify-center text-center">
            <img
              src={jataNegaraLogo}
              alt="Jata Negara Malaysia"
              className="h-14 sm:h-16 w-auto object-contain mx-auto"
            />
            <div className="mt-1 leading-snug">
              <span className="block text-[11px] sm:text-xs font-bold tracking-wider text-slate-800 uppercase">
                KEMENTERIAN PENDIDIKAN
              </span>
              <span className="block text-[11px] sm:text-xs font-bold tracking-wider text-slate-800 uppercase">
                INSTITUT AMINUDDIN BAKI
              </span>
            </div>
            <h1 className="text-base sm:text-lg md:text-xl font-black tracking-wider text-slate-900 uppercase mt-1.5">
              PORTAL MAKLUMAT PROGRAM IAB
            </h1>
          </div>
        </div>

        {/* ============================================================== */}
        {/* BARIS 2: Utama | Dashboard | Log Keluar                       */}
        {/* ============================================================== */}
        <div className="flex items-center justify-center py-2 relative">
          <nav className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-bold">
            {/* 1. Utama */}
            <button
              type="button"
              onClick={() => {
                setActiveTab('welcome');
                setIsMenuOpen(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'welcome'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Laman Selamat Datang Utama"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Utama</span>
            </button>

            {/* Pemisah '|' */}
            <span className="text-slate-300 font-light select-none text-sm">|</span>

            {/* 2. Dashboard (Dropdown) */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isDashboardActive
                    ? 'bg-blue-600 text-white shadow-xs hover:bg-blue-700'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
                }`}
                title="Buka Menu Pilihan Dashboard"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu List: 8 Pages as Requested */}
              {isMenuOpen && (
                <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-[calc(100vw-32px)] max-w-sm sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-2 max-h-[75vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>{currentUser ? 'Menu Pilihan Halaman' : 'Menu Paparan Pelawat'}</span>
                    <span className="text-blue-600 font-mono text-[10px]">
                      {visibleMenuItems.length} HALAMAN
                    </span>
                  </div>

                  <div className="py-1">
                    {visibleMenuItems.map((item) => {
                      const Icon = item.icon;
                      const isCurrent = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id as any);
                            setIsMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-blue-50 text-blue-900 font-bold'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                                  {item.label}
                                </span>
                                {item.badge !== undefined && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-200 text-slate-700 font-mono">
                                    {item.badge}
                                  </span>
                                )}
                                {item.hasActiveSession && (
                                  <span
                                    className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"
                                    title="Sesi Log Masuk Aktif"
                                  />
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 truncate">
                                {item.desc}
                              </p>
                            </div>
                          </div>

                          {isCurrent && (
                            <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Pemisah '|' */}
            <span className="text-slate-300 font-light select-none text-sm">|</span>

            {/* 3. Admin (Bila belum log in) / Log Keluar (Bila admin log in) */}
            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-xs font-bold"
                title={`Log Keluar (${currentUser.id} - ${currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'})`}
              >
                <LogOut className="w-3.5 h-3.5 text-rose-500" />
                <span>Log Keluar</span>
                <span
                  className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5"
                  title="Sesi Aktif"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('admin');
                  setIsMenuOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-bold ${
                  activeTab === 'admin'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Buka Portal Admin / Log Masuk"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Admin</span>
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};
