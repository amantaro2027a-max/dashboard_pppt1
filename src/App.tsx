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
import { ProgramDetailModal } from './components/ProgramDetailModal';
import { ProgramFormModal } from './components/ProgramFormModal';
import { ExportModal } from './components/ExportModal';
import { Landmark, ShieldCheck } from 'lucide-react';

const DashboardContent: React.FC = () => {
  const { activeTab, setActiveTab } = useProgramContext();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div>
        <Header />

        {/* Page Hero Banner */}
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  <Landmark className="w-3.5 h-3.5 text-slate-700" />
                  <span>Institut Aminuddin Baki · Kementerian Pendidikan Malaysia</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {activeTab === 'dashboard'
                    ? 'Dashboard Program Pusat (PPPT & PKPOP)'
                    : activeTab === 'perincian'
                    ? 'Perincian & Katalog Program Pusat'
                    : 'Portal Pengurusan Pentadbir (Admin)'}
                </h1>
                <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                  {activeTab === 'dashboard'
                    ? 'Sistem pemantauan dan analisis statistik perancangan aktiviti, sumber kewangan, dan status pelaksanaan program rasmi IAB (Mod Paparan Sahaja).'
                    : activeTab === 'perincian'
                    ? 'Katalog terperinci maklumat program, agihan peruntukan objek sebagai (OS21, OS24, OS27, OS29), dan profil pegawai pengurus (Mod Paparan Sahaja).'
                    : 'Pusat kawalan pendaftaran & kemaskini program, pengurusan akaun ID Admin mengikut Jabatan, serta kemaskini data induk (Master Data).'}
                </p>
              </div>

              {/* Page Segmented Switcher */}
              <div className="flex items-center p-1 bg-slate-100 rounded-lg shrink-0 self-start md:self-center gap-1">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'dashboard'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Dashboard Program
                </button>
                <button
                  onClick={() => setActiveTab('perincian')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'perincian'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Perincian Program
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'admin'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>Admin</span>
                </button>
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
          ) : activeTab === 'perincian' ? (
            /* PAGE 2 – PERINCIAN PROGRAM (VIEW ONLY) */
            <ProgramCatalog />
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
            <span className="font-bold text-slate-800">DASHBOARD PUSAT PPPT</span>
            <span>·</span>
            <span>Institut Aminuddin Baki (IAB)</span>
          </div>
          <div>
            <span>Pusat Pembangunan dan Pengurusan Teknologi (PPPT) & Pusat Konsultasi (PKPOP)</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ProgramProvider>
      <DashboardContent />
    </ProgramProvider>
  );
}
