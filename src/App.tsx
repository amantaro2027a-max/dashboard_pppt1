/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ProgramProvider, useProgramContext } from './context/ProgramContext';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { FlashCardsGroup1 } from './components/FlashCardsGroup1';
import { FlashCardsGroup2 } from './components/FlashCardsGroup2';
import { DashboardCharts } from './components/DashboardCharts';
import { StatusPeruntukanKewangan } from './components/StatusPeruntukanKewangan';
import { ProgramCatalog } from './components/ProgramCatalog';
import { AdminPage } from './components/AdminPage';
import { PeruntukanPage } from './components/PeruntukanPage';
import { PerbelanjaanPage } from './components/PerbelanjaanPage';
import { SubwaranPage } from './components/SubwaranPage';
import { BakiPeruntukanPage } from './components/BakiPeruntukanPage';
import { ProgramDetailModal } from './components/ProgramDetailModal';
import { ProgramFormModal } from './components/ProgramFormModal';
import { ExportModal } from './components/ExportModal';
import { WelcomePage } from './components/WelcomePage';
import { DashboardBersepaduPage } from './components/DashboardBersepaduPage';
import { Landmark, ShieldCheck } from 'lucide-react';
import { getUserBannerInfo } from './utils/formatters';

const DashboardContent: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, pegawaiList } = useProgramContext();

  const bannerInfo = React.useMemo(
    () => getUserBannerInfo(currentUser, pegawaiList),
    [currentUser, pegawaiList]
  );

  if (activeTab === 'welcome') {
    return (
      <>
        <WelcomePage />
        <ProgramDetailModal />
        <ProgramFormModal />
        <ExportModal />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        <Header />

        {/* Page Hero Banner */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="w-full">
                {/* Baris 1: Institut Aminuddin Baki · Kementerian Pendidikan */}
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-800 tracking-wide mb-1">
                  <Landmark className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                  <span>{bannerInfo.instansi}</span>
                </div>

                {/* Baris 2: Pengguna: NAMA PEGAWAI | Jawatan: JAWATAN PEGAWAI */}
                <div className="text-xs sm:text-sm tracking-wide leading-relaxed">
                  <span className="text-black font-black">Pengguna: </span>
                  <span className="text-blue-600 font-black">{bannerInfo.nama}</span>
                  <span className="text-black font-black"> | Jawatan: </span>
                  <span className="text-blue-600 font-black">{bannerInfo.jawatan}</span>
                </div>

                {/* Baris 3: PUSAT & JABATAN: PUSAT dan JABATAN */}
                <div className="text-xs sm:text-sm tracking-wide leading-relaxed mt-0.5">
                  <span className="text-black font-black">PUSAT &amp; JABATAN: </span>
                  <span className="text-blue-600 font-black">{bannerInfo.pusatDanJabatan}</span>
                </div>

                <div className="pt-3 border-t border-slate-100 mt-3">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    {activeTab === 'dashboard'
                      ? 'Dashboard Interaktif Masa Kini IAB'
                      : activeTab === 'bersepadu'
                      ? 'Dashboard Bersepadu & Analitik Eksekutif PPPT'
                      : activeTab === 'perincian'
                      ? 'Perincian & Katalog Program Pusat'
                      : activeTab === 'peruntukan'
                      ? 'Pengurusan Peruntukan'
                      : activeTab === 'perbelanjaan'
                      ? 'Pemantauan Perbelanjaan Sebenar'
                      : activeTab === 'subwaran'
                      ? 'Pengurusan Sub Waran Peruntukan'
                      : activeTab === 'baki'
                      ? 'Pemantauan Baki Peruntukan Kewangan'
                      : 'Portal Pengurusan Pentadbir (Admin)'}
                  </h1>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                  {activeTab === 'dashboard'
                    ? 'Sistem pemantauan dan analisis statistik perancangan aktiviti, sumber kewangan, dan status pelaksanaan program rasmi IAB (Mod Paparan Sahaja).'
                    : activeTab === 'bersepadu'
                    ? 'Portal eksekutif bersepadu: Prestasi Keseluruhan, Indikator Prestasi KPI, Risikan Kewangan (Financial Intelligence), Papan Pengumuman & Visualisasi Interaktif PPPT.'
                    : activeTab === 'perincian'
                    ? 'Katalog terperinci maklumat program, agihan peruntukan objek sebagai (OS21, OS24, OS27, OS29), dan profil pegawai pengurus (Mod Paparan Sahaja).'
                    : activeTab === 'peruntukan'
                    ? 'Penetapan peruntukan Fasa 1, Fasa 2 dan seterusnya mengikut Sumber Kewangan & pecahan Kod OS bagi kegunaan rasmi IAB.'
                    : activeTab === 'perbelanjaan'
                    ? 'Pemantauan rekod belanja sebenar (OS21, OS24, OS27, OS29) bagi program berstatus SELESAI & TANGGUNG mengikut Sumber Kewangan Induk.'
                    : activeTab === 'subwaran'
                    ? 'Pendaftaran dan pemantauan peruntukan yang diagihkan / disubwaran kepada PTJ Cawangan IAB, JPN, PPD, IPG, dan KV mengikut Sumber Kewangan & pecahan OS.'
                    : activeTab === 'baki'
                    ? 'Analisis baki peruntukan menyeluruh: Peruntukan (Page Peruntukan) − Belanja Sebenar (Page Perbelanjaan) = Penjimatan; Penjimatan − Subwaran = Baki Bersih Akhir.'
                    : 'Pusat kawalan pendaftaran & kemaskini program, pengurusan akaun ID Admin mengikut Jabatan, serta kemaskini data induk (Master Data).'}
                </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {activeTab === 'dashboard' ? (
            /* PAGE 1 – DASHBOARD PROGRAM PUSAT (VIEW ONLY) */
            <div>
              {/* Filter Bar with Sumber Kewangan */}
              <FilterBar showTahunBulan={true} showStatusFilter={true} />

              {/* Prestasi Pelaksanaan Program */}
              <FlashCardsGroup1 />

              {/* STATUS PERUNTUKAN KEWANGAN (Group Baharu Latar Soft Green) */}
              <StatusPeruntukanKewangan />

              {/* Status Pelaksanaan Program */}
              <FlashCardsGroup2 />

              {/* Analytics & Distribution Visualisations */}
              <DashboardCharts />
            </div>
          ) : activeTab === 'bersepadu' ? (
            /* PAGE 2 – DASHBOARD BERSEPADU & ANALITIK EKSEKUTIF PPPT */
            <DashboardBersepaduPage />
          ) : activeTab === 'perincian' ? (
            /* PAGE 3 – PERINCIAN PROGRAM (VIEW ONLY) */
            <ProgramCatalog />
          ) : activeTab === 'peruntukan' ? (
            /* PAGE 4 – PERUNTUKAN FASA (SUPER ADMIN) */
            <PeruntukanPage />
          ) : activeTab === 'perbelanjaan' ? (
            /* PAGE 5 – PERBELANJAAN (SUPER ADMIN) */
            <PerbelanjaanPage />
          ) : activeTab === 'subwaran' ? (
            /* PAGE 6 – SUBWARAN (SUPER ADMIN) */
            <SubwaranPage />
          ) : activeTab === 'baki' ? (
            /* PAGE 7 – BAKI PERUNTUKAN (SUPER ADMIN) */
            <BakiPeruntukanPage />
          ) : (
            /* PAGE 3 – ADMIN */
            <AdminPage />
          )}
        </main>
      </div>

      {/* Modals */}
      <ProgramDetailModal />
      <ProgramFormModal />
      <ExportModal />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800">Dashboard Pusat IAB</span>
            <span>·</span>
            <span>Institut Aminuddin Baki (IAB)</span>
          </div>
          <div>
            <span>Aplikasi ini dibangunkan oleh Pusat Pembangunan dan Pengurusan Teknologi (PPPT)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-xl space-y-4">
            <h2 className="text-xl font-bold text-rose-400">Ralat Memuat Aplikasi</h2>
            <p className="text-xs text-slate-300 font-mono bg-slate-950/70 p-3 rounded-lg text-left overflow-x-auto">
              {this.state.error?.message || 'Ralat tidak diketahui'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Tetapkan Semula &amp; Muat Semula
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ProgramProvider>
        <DashboardContent />
      </ProgramProvider>
    </ErrorBoundary>
  );
}
