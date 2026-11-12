import React, { useState, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ProgramItem } from '../types/program';
import { AnnouncementBoard } from './DashboardBersepadu/AnnouncementBoard';
import { ExecutiveOverviewModule } from './DashboardBersepadu/ExecutiveOverviewModule';
import { PerformanceKpiModule } from './DashboardBersepadu/PerformanceKpiModule';
import { FinancialIntelligenceModule } from './DashboardBersepadu/FinancialIntelligenceModule';
import { VisualisationModule } from './DashboardBersepadu/VisualisationModule';
import { ProgramStatisticsModule } from './DashboardBersepadu/ProgramStatisticsModule';
import {
  Filter,
  RotateCcw,
  Search,
  Calendar,
  Layers,
  Building2,
  Users,
  Coins,
  X,
  FileSpreadsheet,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronRight,
  Download,
} from 'lucide-react';
import { formatNumber, formatRM, getStatusConfig } from '../utils/formatters';

export const DashboardBersepaduPage: React.FC = () => {
  const {
    programs,
    pegawaiList,
    jabatanMap,
    pusatList,
    sumberKewanganList,
    statusProgramList,
    fasaPeruntukanList,
    viewProgramDetail,
  } = useProgramContext();

  // Kawalan Paparan / Collapse Modul:
  // By default:
  // MODUL 1: GAMBARAN EKSEKUTIF -> PAPAR (true)
  // MODUL 2: KPI & PRESTASI PROGRAM -> COLLAPSE/HIDE (false)
  // MODUL 3: RISIKAN KEWANGAN -> COLLAPSE/HIDE (false)
  // MODUL 4: VISUALISASI DATA INTERAKTIF -> COLLAPSE/HIDE (false)
  // MODUL 5: STATISTIK PROGRAM -> PAPAR (true)
  const [moduleExpanded, setModuleExpanded] = useState<{
    m1: boolean;
    m2: boolean;
    m3: boolean;
    m4: boolean;
    m5: boolean;
  }>({
    m1: true,
    m2: false,
    m3: false,
    m4: false,
    m5: false,
  });

  const toggleModule = (key: 'm1' | 'm2' | 'm3' | 'm4' | 'm5') => {
    setModuleExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const setAllModules = (expand: boolean) => {
    setModuleExpanded({
      m1: expand,
      m2: expand,
      m3: expand,
      m4: expand,
      m5: expand,
    });
  };

  // Local state for Bersepadu Dynamic Filtering
  const [filterTahun, setFilterTahun] = useState<string>('SEMUA');
  const [filterStatus, setFilterStatus] = useState<string>('SEMUA');
  const [filterJenis, setFilterJenis] = useState<string>('SEMUA');
  const [filterJabatan, setFilterJabatan] = useState<string>('SEMUA');
  const [filterPengurus, setFilterPengurus] = useState<string>('SEMUA');
  const [filterOsCode, setFilterOsCode] = useState<string>('SEMUA');
  const [filterSumber, setFilterSumber] = useState<string>('SEMUA');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Drill-Down Modal state
  const [drillDownModal, setDrillDownModal] = useState<{
    isOpen: boolean;
    title: string;
    items: ProgramItem[];
  }>({
    isOpen: false,
    title: '',
    items: [],
  });

  // Unique options derived from actual database
  const availableYears = useMemo(() => {
    const set = new Set(programs.map((p) => String(p.tahun || '2026')));
    return Array.from(set).sort().reverse();
  }, [programs]);

  const availableTypes = useMemo(() => {
    const set = new Set(programs.map((p) => p.jenisProgram).filter(Boolean));
    return Array.from(set).sort();
  }, [programs]);

  const availableDepartments = useMemo(() => {
    const list: string[] = [];
    Object.values(jabatanMap || {}).forEach((jList) => {
      jList.forEach((j) => {
        if (!list.includes(j)) list.push(j);
      });
    });
    return list;
  }, [jabatanMap]);

  const availablePengurus = useMemo(() => {
    const map = new Map<string, string>();
    programs.forEach((p) => {
      const name = p.pengurusNama || p.pengurusId;
      if (name && !map.has(name)) {
        map.set(name, name);
      }
    });
    return Array.from(map.values()).sort();
  }, [programs]);

  // Filtered Programs calculation
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (filterTahun !== 'SEMUA' && String(p.tahun || '2026') !== filterTahun) {
        return false;
      }
      if (
        filterStatus !== 'SEMUA' &&
        (p.statusProgram || '').trim().toUpperCase() !== filterStatus.toUpperCase()
      ) {
        return false;
      }
      if (filterJenis !== 'SEMUA' && p.jenisProgram !== filterJenis) {
        return false;
      }
      if (filterJabatan !== 'SEMUA' && p.jabatan !== filterJabatan) {
        return false;
      }
      if (
        filterPengurus !== 'SEMUA' &&
        p.pengurusNama !== filterPengurus &&
        p.pengurusId !== filterPengurus
      ) {
        return false;
      }
      if (filterSumber !== 'SEMUA' && p.sumberKewangan !== filterSumber) {
        return false;
      }

      // OS Code filter
      if (filterOsCode !== 'SEMUA') {
        if (filterOsCode === 'OS21000' && (Number(p.os21000) || 0) <= 0) return false;
        if (filterOsCode === 'OS24000' && (Number(p.os24000) || 0) <= 0) return false;
        if (filterOsCode === 'OS27000' && (Number(p.os27000) || 0) <= 0) return false;
        if (filterOsCode === 'OS29000' && (Number(p.os29000) || 0) <= 0) return false;
      }

      // Keyword search
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchName = (p.namaProgram || '').toLowerCase().includes(q);
        const matchCode = (p.kodProgram || '').toLowerCase().includes(q);
        const matchPlace = (p.tempat || '').toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchPlace) return false;
      }

      return true;
    });
  }, [
    programs,
    filterTahun,
    filterStatus,
    filterJenis,
    filterJabatan,
    filterPengurus,
    filterOsCode,
    filterSumber,
    searchQuery,
  ]);

  // Peruntukan Keseluruhan diambil terus daripada Page PERUNTUKAN (fasaPeruntukanList)
  const totalAllocationPeruntukanPage = useMemo(() => {
    let grand = 0;
    (fasaPeruntukanList || []).forEach((fasa) => {
      if (!fasa.allocations) return;
      Object.entries(fasa.allocations).forEach(([sk, alloc]) => {
        if (filterSumber !== 'SEMUA' && sk !== filterSumber) return;
        if (filterOsCode === 'SEMUA') {
          grand +=
            (alloc.os21000 || 0) +
            (alloc.os24000 || 0) +
            (alloc.os27000 || 0) +
            (alloc.os29000 || 0);
        } else if (filterOsCode === 'OS21000') {
          grand += alloc.os21000 || 0;
        } else if (filterOsCode === 'OS24000') {
          grand += alloc.os24000 || 0;
        } else if (filterOsCode === 'OS27000') {
          grand += alloc.os27000 || 0;
        } else if (filterOsCode === 'OS29000') {
          grand += alloc.os29000 || 0;
        }
      });
    });
    return grand;
  }, [fasaPeruntukanList, filterSumber, filterOsCode]);

  const handleResetFilters = () => {
    setFilterTahun('SEMUA');
    setFilterStatus('SEMUA');
    setFilterJenis('SEMUA');
    setFilterJabatan('SEMUA');
    setFilterPengurus('SEMUA');
    setFilterOsCode('SEMUA');
    setFilterSumber('SEMUA');
    setSearchQuery('');
  };

  const handleOpenDrillDown = (title: string, list: ProgramItem[]) => {
    setDrillDownModal({
      isOpen: true,
      title,
      items: list,
    });
  };

  const handleRiskFilterSelect = (type: 'deficit' | 'high_util' | 'pending_lo' | 'all') => {
    if (type === 'deficit') {
      const list = filteredPrograms.filter(
        (p) => (Number(p.jumlahBelanjaRm) || 0) > (Number(p.jumlahRm) || 0)
      );
      handleOpenDrillDown('Program Defisit Kewangan (Belanja > Peruntukan)', list);
    } else if (type === 'high_util') {
      const list = filteredPrograms.filter((p) => {
        const a = Number(p.jumlahRm) || 0;
        const b = Number(p.jumlahBelanjaRm) || 0;
        return a > 0 && (b / a) * 100 >= 90;
      });
      handleOpenDrillDown('Program Utiliti Bajet Tinggi (≥90%)', list);
    } else if (type === 'pending_lo') {
      const list = filteredPrograms.filter(
        (p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG'
      );
      handleOpenDrillDown('Program Komitmen LO Tertunggak (Status Tanggung)', list);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* 1. FILTER BAR KHAS UNTUK DASHBOARD BERSEPADU */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-700" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Penapis Data Eksekutif Bersepadu
            </span>
            <span className="text-[11px] text-slate-400">
              ({filteredPrograms.length} daripada {programs.length} program dipaparkan)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Keyword Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari program / kod..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
              />
            </div>

            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Set semula semua tapisan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 mt-3">
          {/* 1. Tahun */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Tahun
            </label>
            <select
              value={filterTahun}
              onChange={(e) => setFilterTahun(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
            >
              <option value="SEMUA">Semua Tahun</option>
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Status Program */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Status Program
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
            >
              <option value="SEMUA">Semua Status</option>
              {statusProgramList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Jenis Program */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Jenis Program
            </label>
            <select
              value={filterJenis}
              onChange={(e) => setFilterJenis(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none truncate"
            >
              <option value="SEMUA">Semua Jenis</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Jabatan */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Jabatan
            </label>
            <select
              value={filterJabatan}
              onChange={(e) => setFilterJabatan(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none truncate"
            >
              <option value="SEMUA">Semua Jabatan</option>
              {availableDepartments.map((j) => (
                <option key={j} value={j}>
                  {j}
                </option>
              ))}
            </select>
          </div>

          {/* 5. Pengurus Program */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Pengurus Program
            </label>
            <select
              value={filterPengurus}
              onChange={(e) => setFilterPengurus(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none truncate"
            >
              <option value="SEMUA">Semua Pengurus</option>
              {availablePengurus.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* 6. Kod OS */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Vot / Kod OS
            </label>
            <select
              value={filterOsCode}
              onChange={(e) => setFilterOsCode(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none"
            >
              <option value="SEMUA">Semua Kod OS</option>
              <option value="OS21000">OS21000 (Sara Hidup)</option>
              <option value="OS24000">OS24000 (Sewaan)</option>
              <option value="OS27000">OS27000 (Bekalan)</option>
              <option value="OS29000">OS29000 (Ikhtisas)</option>
            </select>
          </div>

          {/* 7. Sumber Kewangan */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
              Sumber Kewangan
            </label>
            <select
              value={filterSumber}
              onChange={(e) => setFilterSumber(e.target.value)}
              className="w-full text-xs font-semibold py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none truncate"
            >
              <option value="SEMUA">Semua Sumber</option>
              {sumberKewanganList.map((sk) => (
                <option key={sk} value={sk}>
                  {sk}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. PAPAN PENGUMUMAN & AMARAN RISIKO AUTOMATIK */}
      <AnnouncementBoard
        programs={filteredPrograms}
        onSelectRiskFilter={handleRiskFilterSelect}
        onViewProgram={viewProgramDetail}
      />

      {/* QUICK MODULE CONTROLLER / NAVIGATOR BAR */}
      <div className="bg-slate-900 text-white rounded-2xl p-3 sm:p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950/80 px-2.5 py-1 rounded-md border border-teal-800/80">
            Kawalan Modul Dashboard
          </span>
          <span className="text-xs text-slate-300 hidden sm:inline">
            Klik mana-mana modul untuk papar/sembunyi:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => toggleModule('m1')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
              moduleExpanded.m1
                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>Modul 1: Eksekutif</span>
            <span className="text-[10px] opacity-75">{moduleExpanded.m1 ? '▲' : '▼'}</span>
          </button>

          <button
            onClick={() => toggleModule('m2')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
              moduleExpanded.m2
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>Modul 2: KPI</span>
            <span className="text-[10px] opacity-75">{moduleExpanded.m2 ? '▲' : '▼'}</span>
          </button>

          <button
            onClick={() => toggleModule('m3')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
              moduleExpanded.m3
                ? 'bg-amber-600 text-white border-amber-500 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>Modul 3: Kewangan</span>
            <span className="text-[10px] opacity-75">{moduleExpanded.m3 ? '▲' : '▼'}</span>
          </button>

          <button
            onClick={() => toggleModule('m4')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
              moduleExpanded.m4
                ? 'bg-purple-600 text-white border-purple-500 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>Modul 4: Visualisasi</span>
            <span className="text-[10px] opacity-75">{moduleExpanded.m4 ? '▲' : '▼'}</span>
          </button>

          <button
            onClick={() => toggleModule('m5')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer border ${
              moduleExpanded.m5
                ? 'bg-teal-600 text-white border-teal-500 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            <span>Modul 5: Statistik</span>
            <span className="text-[10px] opacity-75">{moduleExpanded.m5 ? '▲' : '▼'}</span>
          </button>

          <div className="h-5 w-[1px] bg-slate-700 hidden lg:block mx-1" />

          <button
            onClick={() => setAllModules(true)}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            Papar Semua
          </button>
          <button
            onClick={() => setAllModules(false)}
            className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            Sembunyi Semua
          </button>
        </div>
      </div>

      {/* 3. MODUL 1: EXECUTIVE OVERVIEW DASHBOARD */}
      <ExecutiveOverviewModule
        programs={filteredPrograms}
        totalAllocationPeruntukanPage={totalAllocationPeruntukanPage}
        onOpenDrillDown={handleOpenDrillDown}
        onViewProgramDetail={viewProgramDetail}
        isExpanded={moduleExpanded.m1}
        onToggleExpand={() => toggleModule('m1')}
      />

      {/* 4. MODUL 2: PROGRAMME PERFORMANCE KPI */}
      <PerformanceKpiModule
        programs={filteredPrograms}
        allPrograms={programs}
        totalAllocationPeruntukanPage={totalAllocationPeruntukanPage}
        onOpenDrillDown={handleOpenDrillDown}
        isExpanded={moduleExpanded.m2}
        onToggleExpand={() => toggleModule('m2')}
      />

      {/* 5. MODUL 3: FINANCIAL INTELLIGENCE DASHBOARD */}
      <FinancialIntelligenceModule
        programs={filteredPrograms}
        totalAllocationPeruntukanPage={totalAllocationPeruntukanPage}
        onOpenDrillDown={handleOpenDrillDown}
        onViewProgramDetail={viewProgramDetail}
        isExpanded={moduleExpanded.m3}
        onToggleExpand={() => toggleModule('m3')}
      />

      {/* 6. MODUL 4: DATA VISUALISATION (10 INTERACTIVE CHARTS) */}
      <VisualisationModule
        programs={filteredPrograms}
        allPrograms={programs}
        onOpenDrillDown={handleOpenDrillDown}
        onViewProgramDetail={viewProgramDetail}
        isExpanded={moduleExpanded.m4}
        onToggleExpand={() => toggleModule('m4')}
      />

      {/* 7. MODUL 5: STATISTIK PROGRAM (PUSAT, JABATAN, PEGAWAI, PROGRAM & STATUS) */}
      <ProgramStatisticsModule
        programs={filteredPrograms}
        allPrograms={programs}
        pegawaiList={pegawaiList}
        pusatList={pusatList}
        jabatanMap={jabatanMap}
        onOpenDrillDown={handleOpenDrillDown}
        onViewProgramDetail={viewProgramDetail}
        isExpanded={moduleExpanded.m5}
        onToggleExpand={() => toggleModule('m5')}
      />

      {/* 7. DRILL-DOWN MODAL DIALOG */}
      {drillDownModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                  Drill-Down Data Sebenar
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {drillDownModal.title}
                </h3>
                <p className="text-xs text-slate-500">
                  {drillDownModal.items.length} rekod program ditemui
                </p>
              </div>
              <button
                onClick={() => setDrillDownModal({ isOpen: false, title: '', items: [] })}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content Table */}
            <div className="p-6 overflow-y-auto flex-1">
              {drillDownModal.items.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  Tiada rekod program padanan dalam tapisan ini.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Bil</th>
                        <th className="py-2.5 px-3">Kod &amp; Nama Program</th>
                        <th className="py-2.5 px-3">Jabatan</th>
                        <th className="py-2.5 px-3">Pengurus</th>
                        <th className="py-2.5 px-3 text-right">Peruntukan</th>
                        <th className="py-2.5 px-3 text-right">Belanja Sebenar</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                        <th className="py-2.5 px-3 text-center">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {drillDownModal.items.map((p, idx) => {
                        const cfg = getStatusConfig(p.statusProgram);
                        return (
                          <tr key={p.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-semibold text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 line-clamp-1">{p.namaProgram}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{p.kodProgram}</div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 truncate max-w-[160px]">{p.jabatan}</td>
                            <td className="py-2.5 px-3 text-slate-700 truncate max-w-[140px]">
                              {p.pengurusNama || p.pengurusId}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                              {formatRM(p.jumlahRm)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-amber-700 font-semibold">
                              {formatRM(p.jumlahBelanjaRm ?? 0)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${cfg.badgeBg}`}
                              >
                                {p.statusProgram}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                onClick={() => {
                                  setDrillDownModal({ isOpen: false, title: '', items: [] });
                                  viewProgramDetail(p);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Perincian</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Institut Aminuddin Baki · Pusat Pembangunan dan Pengurusan Teknologi (PPPT)
              </span>
              <button
                onClick={() => setDrillDownModal({ isOpen: false, title: '', items: [] })}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
