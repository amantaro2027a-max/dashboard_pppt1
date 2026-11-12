import React, { useMemo } from 'react';
import {
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  Users,
  Building2,
  Layers,
  TrendingUp,
  BarChart3,
  CalendarDays,
  Target,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ProgramItem } from '../../types/program';
import { formatNumber, formatRM } from '../../utils/formatters';

interface PerformanceKpiModuleProps {
  programs: ProgramItem[];
  allPrograms: ProgramItem[];
  totalAllocationPeruntukanPage?: number;
  onOpenDrillDown: (title: string, filteredList: ProgramItem[]) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const PerformanceKpiModule: React.FC<PerformanceKpiModuleProps> = ({
  programs,
  allPrograms,
  totalAllocationPeruntukanPage,
  onOpenDrillDown,
  isExpanded = false,
  onToggleExpand,
}) => {
  // KPI Metrics Calculation
  const kpi = useMemo(() => {
    const total = programs.length;
    let completed = 0;
    let ongoing = 0;
    let upcoming = 0;
    let delayed = 0;
    let totalPeserta = 0;
    let totalDays = 0;
    let minDays = total > 0 ? 9999 : 0;
    let maxDays = 0;

    const todayStr = new Date().toISOString().slice(0, 10);

    programs.forEach((p) => {
      const status = (p.statusProgram || '').trim().toUpperCase();
      const peserta = Number(p.bilanganPeserta) || 0;
      const days = Number(p.jumlahHari) || 1;

      totalPeserta += peserta;
      totalDays += days;
      if (days < minDays) minDays = days;
      if (days > maxDays) maxDays = days;

      if (status === 'SELESAI') {
        completed++;
      } else if (status === 'DALAM TINDAKAN') {
        ongoing++;
      } else if (status === 'BELUM AMBIL TINDAKAN') {
        upcoming++;
      }

      // Delayed criteria: past end date but not completed, or status BATAL
      if (p.tarikhTamat && p.tarikhTamat < todayStr && status !== 'SELESAI') {
        delayed++;
      } else if (status === 'BATAL') {
        delayed++;
      }
    });

    if (minDays === 9999) minDays = 0;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const avgPeserta = total > 0 ? Math.round(totalPeserta / total) : 0;
    const avgDays = total > 0 ? (totalDays / total).toFixed(1) : '0';

    // Distribution by Type
    const typeCountMap: Record<string, { count: number; peserta: number }> = {};
    programs.forEach((p) => {
      const t = p.jenisProgram || 'Lain-lain';
      if (!typeCountMap[t]) typeCountMap[t] = { count: 0, peserta: 0 };
      typeCountMap[t].count++;
      typeCountMap[t].peserta += Number(p.bilanganPeserta) || 0;
    });

    // Distribution by Department
    const deptCountMap: Record<string, { count: number; peserta: number; alloc: number }> = {};
    programs.forEach((p) => {
      const d = p.jabatan || 'Jabatan Tidak Dinyatakan';
      if (!deptCountMap[d]) deptCountMap[d] = { count: 0, peserta: 0, alloc: 0 };
      deptCountMap[d].count++;
      deptCountMap[d].peserta += Number(p.bilanganPeserta) || 0;
      deptCountMap[d].alloc += Number(p.jumlahRm) || 0;
    });

    // Year-on-year Comparison
    // Group all available programs by year
    const yearMap: Record<string, { count: number; completed: number; peserta: number; alloc: number }> = {};
    allPrograms.forEach((p) => {
      const yr = String(p.tahun || '2026');
      if (!yearMap[yr]) yearMap[yr] = { count: 0, completed: 0, peserta: 0, alloc: 0 };
      yearMap[yr].count++;
      if ((p.statusProgram || '').trim().toUpperCase() === 'SELESAI') {
        yearMap[yr].completed++;
      }
      yearMap[yr].peserta += Number(p.bilanganPeserta) || 0;
      yearMap[yr].alloc += Number(p.jumlahRm) || 0;
    });

    // Gunakan Peruntukan Rasmi dari Page Peruntukan jika tersedia untuk tahun semasa (2026)
    if (totalAllocationPeruntukanPage && yearMap['2026']) {
      yearMap['2026'].alloc = totalAllocationPeruntukanPage;
    }

    return {
      total,
      completed,
      ongoing,
      upcoming,
      delayed,
      completionRate,
      totalPeserta,
      avgPeserta,
      avgDays,
      minDays,
      maxDays,
      typeDistribution: Object.entries(typeCountMap).sort((a, b) => b[1].count - a[1].count),
      deptDistribution: Object.entries(deptCountMap).sort((a, b) => b[1].count - a[1].count),
      yearDistribution: Object.entries(yearMap).sort((a, b) => b[0].localeCompare(a[0])),
    };
  }, [programs, allPrograms, totalAllocationPeruntukanPage]);

  return (
    <div className="space-y-8 mb-12">
      {/* SECTION HEADER - KAD HEADER GELAP (MENGIKUT CONTOH IMAGE) */}
      <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shadow-sm border border-slate-800 transition-all hover:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-600/30 border border-blue-400/40 text-blue-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                MODUL 2
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                INDIKATOR PRESTASI PELAKSANAAN &amp; ANALISIS KOMPARATIF
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
              <span>Kategori:</span>
              <strong className="text-amber-400 font-bold uppercase">
                KPI &amp; PRESTASI PROGRAM (PROGRAMME PERFORMANCE KPI)
              </strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-lg text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Kadar Selesai
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
              {kpi.completionRate}% ({kpi.completed}/{kpi.total})
            </span>
          </div>

          <button
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
            title={isExpanded ? 'Sembunyi Modul Ini' : 'Papar Modul Ini'}
          >
            <span>{isExpanded ? 'Sembunyi' : 'Papar'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <>

      {/* KPI METRICS HERO CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Completion Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Kadar Selesai Program
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Target className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-emerald-700">
              {kpi.completionRate}%
            </span>
            <span className="text-xs text-slate-500">
              ({kpi.completed} / {kpi.total})
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              style={{ width: `${kpi.completionRate}%` }}
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
            />
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Penanda aras KPI tahunan PPPT (&ge;85% sasaran)
          </p>
        </div>

        {/* KPI 2: Execution Status Spectrum */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Status Pelaksanaan
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-2">
              <span className="text-[10px] font-bold text-emerald-800 uppercase block">Selesai</span>
              <span className="text-lg font-black text-emerald-700">{kpi.completed}</span>
            </div>
            <div className="bg-sky-50 border border-sky-100 rounded-lg p-2">
              <span className="text-[10px] font-bold text-sky-800 uppercase block">Aktif</span>
              <span className="text-lg font-black text-sky-700">{kpi.ongoing}</span>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
              <span className="text-[10px] font-bold text-amber-800 uppercase block">Belum</span>
              <span className="text-lg font-black text-amber-700">{kpi.upcoming}</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Lewat / Tertangguh:</span>
            <strong className="text-rose-600 font-bold">{kpi.delayed} aktiviti</strong>
          </div>
        </div>

        {/* KPI 3: Participants Engagement */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Penyertaan &amp; Impak
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-indigo-950">
              {formatNumber(kpi.totalPeserta)}
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
              <span>Purata peserta:</span>
              <strong className="text-slate-900 font-bold">{kpi.avgPeserta} orang / program</strong>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Peserta program latihan, bengkel &amp; seminar kepimpinan
          </p>
        </div>

        {/* KPI 4: Duration Dynamics */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
              Jangka Masa Pelaksanaan
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl sm:text-4xl font-black text-purple-950">
              {kpi.avgDays} <span className="text-sm font-semibold text-slate-500">Hari</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 mt-2">
              <span>Julat tempoh program:</span>
              <strong className="text-slate-900 font-bold">
                {kpi.minDays} hingga {kpi.maxDays} hari
              </strong>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Berdasarkan tarikh mula &amp; tarikh tamat rasmi
          </p>
        </div>
      </div>

      {/* PERFORMANCE BREAKDOWN TABLES & DISTRIBUTIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table 1: Distribution by Programme Type */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Agihan Mengikut Jenis Program</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {kpi.typeDistribution.length} Jenis
            </span>
          </div>

          <div className="space-y-3">
            {kpi.typeDistribution.map(([type, data]) => {
              const pct = kpi.total > 0 ? Math.round((data.count / kpi.total) * 100) : 0;
              return (
                <div key={type} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-800 truncate max-w-[200px]" title={type}>
                      {type}
                    </span>
                    <span className="text-slate-500 font-mono">
                      <strong>{data.count}</strong> ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${pct}%` }}
                      className="bg-blue-600 h-full rounded-full group-hover:bg-blue-700 transition-colors"
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {formatNumber(data.peserta)} peserta terlibat
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Table 2: Distribution by Department */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Agihan Mengikut Jabatan</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">
              {kpi.deptDistribution.length} Jabatan
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {kpi.deptDistribution.map(([dept, data]) => {
              const pct = kpi.total > 0 ? Math.round((data.count / kpi.total) * 100) : 0;
              return (
                <div
                  key={dept}
                  onClick={() =>
                    onOpenDrillDown(
                      `Program Jabatan: ${dept}`,
                      programs.filter((p) => p.jabatan === dept)
                    )
                  }
                  className="p-2.5 rounded-xl border border-slate-100 hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2 text-xs">
                    <span className="font-semibold text-slate-800 line-clamp-1" title={dept}>
                      {dept}
                    </span>
                    <span className="text-indigo-700 font-bold shrink-0">
                      {data.count} aktiviti
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>{formatNumber(data.peserta)} peserta</span>
                    <span className="font-semibold text-slate-700">{formatRM(data.alloc)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Table 3: Year-on-Year Comparison */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Perbandingan Tahun ke Tahun (YoY)</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500">Data Sebenar</span>
          </div>

          <div className="space-y-3">
            {kpi.yearDistribution.map(([year, data]) => {
              const compRate = data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0;
              return (
                <div key={year} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">Tahun {year}</span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {compRate}% Selesai
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-slate-200/60 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Program</span>
                      <strong className="text-xs text-slate-900">{data.count}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Peserta</span>
                      <strong className="text-xs text-slate-900">{formatNumber(data.peserta)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Peruntukan</span>
                      <strong className="text-xs text-slate-900 truncate block">
                        {formatRM(data.alloc)}
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
