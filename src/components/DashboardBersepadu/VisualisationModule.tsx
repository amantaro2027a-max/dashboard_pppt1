import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  PieChart,
  TrendingUp,
  AlertTriangle,
  Layers,
  Building2,
  Calendar,
  Users,
  ShieldCheck,
  ArrowRight,
  Flame,
  CheckCircle2,
  ChevronRight,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ProgramItem } from '../../types/program';
import { formatNumber, formatRM, getStatusConfig } from '../../utils/formatters';
import { BULAN_LIST } from '../../data/constants';

interface VisualisationModuleProps {
  programs: ProgramItem[];
  allPrograms: ProgramItem[];
  onOpenDrillDown: (title: string, filteredList: ProgramItem[]) => void;
  onViewProgramDetail: (prog: ProgramItem) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const VisualisationModule: React.FC<VisualisationModuleProps> = ({
  programs,
  allPrograms,
  onOpenDrillDown,
  onViewProgramDetail,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  // 1. Allocation vs Actual Expenditure by Department
  const deptComparison = useMemo(() => {
    const map: Record<string, { alloc: number; actual: number; count: number }> = {};
    programs.forEach((p) => {
      const d = p.jabatan || 'Lain-lain';
      if (!map[d]) map[d] = { alloc: 0, actual: 0, count: 0 };
      map[d].alloc += Number(p.jumlahRm) || 0;
      map[d].actual += Number(p.jumlahBelanjaRm) || 0;
      map[d].count++;
    });

    return Object.entries(map)
      .map(([dept, val]) => ({
        dept,
        alloc: val.alloc,
        actual: val.actual,
        count: val.count,
        utilRate: val.alloc > 0 ? Math.round((val.actual / val.alloc) * 100) : 0,
      }))
      .sort((a, b) => b.alloc - a.alloc);
  }, [programs]);

  const maxDeptAlloc = Math.max(...deptComparison.map((d) => Math.max(d.alloc, d.actual)), 1);

  // 2. Budget Utilisation by OS Code
  const osUtilisation = useMemo(() => {
    let a21 = 0, b21 = 0;
    let a24 = 0, b24 = 0;
    let a27 = 0, b27 = 0;
    let a29 = 0, b29 = 0;

    programs.forEach((p) => {
      a21 += Number(p.os21000) || 0;
      b21 += Number(p.os21000Belanja) || 0;
      a24 += Number(p.os24000) || 0;
      b24 += Number(p.os24000Belanja) || 0;
      a27 += Number(p.os27000) || 0;
      b27 += Number(p.os27000Belanja) || 0;
      a29 += Number(p.os29000) || 0;
      b29 += Number(p.os29000Belanja) || 0;
    });

    return [
      { code: 'OS21000', name: 'Perjalanan & Sara Hidup', alloc: a21, actual: b21, rate: a21 > 0 ? Math.round((b21 / a21) * 100) : 0, color: 'bg-emerald-500' },
      { code: 'OS24000', name: 'Sewaan & Penginapan', alloc: a24, actual: b24, rate: a24 > 0 ? Math.round((b24 / a24) * 100) : 0, color: 'bg-sky-500' },
      { code: 'OS27000', name: 'Bekalan Bahan & Latihan', alloc: a27, actual: b27, rate: a27 > 0 ? Math.round((b27 / a27) * 100) : 0, color: 'bg-amber-500' },
      { code: 'OS29000', name: 'Perkhidmatan Ikhtisas', alloc: a29, actual: b29, rate: a29 > 0 ? Math.round((b29 / a29) * 100) : 0, color: 'bg-indigo-500' },
    ];
  }, [programs]);

  // 3. Financial Composition (OS share)
  const totalAlloc = osUtilisation.reduce((sum, o) => sum + o.alloc, 0) || 1;
  const osComposition = osUtilisation.map((o) => ({
    ...o,
    pct: Math.round((o.alloc / totalAlloc) * 100),
  }));

  // 4. Programme Status Distribution
  const statusDist = useMemo(() => {
    const map: Record<string, number> = {};
    programs.forEach((p) => {
      const s = (p.statusProgram || 'LAIN').trim().toUpperCase();
      map[s] = (map[s] || 0) + 1;
    });

    const total = programs.length || 1;
    return Object.entries(map).map(([status, count]) => {
      const cfg = getStatusConfig(status);
      return {
        status,
        count,
        pct: Math.round((count / total) * 100),
        color:
          status === 'SELESAI'
            ? '#10b981'
            : status === 'DALAM TINDAKAN'
            ? '#0ea5e9'
            : status === 'TANGGUNG'
            ? '#8b5cf6'
            : status === 'BELUM AMBIL TINDAKAN'
            ? '#f59e0b'
            : '#f43f5e',
      };
    });
  }, [programs]);

  // 5. Programme Type Distribution
  const typeDist = useMemo(() => {
    const map: Record<string, number> = {};
    programs.forEach((p) => {
      const t = p.jenisProgram || 'Lain-lain';
      map[t] = (map[t] || 0) + 1;
    });
    const maxVal = Math.max(...Object.values(map), 1);
    return Object.entries(map)
      .map(([type, count]) => ({ type, count, pct: Math.round((count / maxVal) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [programs]);

  // 6. Programme Distribution by Department
  const deptDist = useMemo(() => {
    const map: Record<string, { count: number; alloc: number }> = {};
    programs.forEach((p) => {
      const d = p.jabatan || 'Lain-lain';
      if (!map[d]) map[d] = { count: 0, alloc: 0 };
      map[d].count++;
      map[d].alloc += Number(p.jumlahRm) || 0;
    });
    const maxCount = Math.max(...Object.values(map).map((v) => v.count), 1);
    return Object.entries(map)
      .map(([dept, val]) => ({ dept, count: val.count, alloc: val.alloc, pct: Math.round((val.count / maxCount) * 100) }))
      .sort((a, b) => b.count - a.count);
  }, [programs]);

  // 7. Participant Statistics
  const participantStats = useMemo(() => {
    const byMonth: Record<number, number> = {};
    programs.forEach((p) => {
      const m = p.bulan || 1;
      byMonth[m] = (byMonth[m] || 0) + (Number(p.bilanganPeserta) || 0);
    });

    const maxMonthP = Math.max(...Object.values(byMonth), 1);
    return BULAN_LIST.map((b) => ({
      bulanLabel: b.label.substring(0, 3),
      peserta: byMonth[b.value] || 0,
      pct: Math.round(((byMonth[b.value] || 0) / maxMonthP) * 100),
    }));
  }, [programs]);

  // 8. Programme Trend Analysis (Monthly Count)
  const monthlyTrend = useMemo(() => {
    const map: Record<number, number> = {};
    programs.forEach((p) => {
      const m = p.bulan || 1;
      map[m] = (map[m] || 0) + 1;
    });
    const maxCount = Math.max(...Object.values(map), 1);
    return BULAN_LIST.map((b) => ({
      label: b.label.substring(0, 3),
      count: map[b.value] || 0,
      pct: Math.round(((map[b.value] || 0) / maxCount) * 100),
    }));
  }, [programs]);

  // 9. BK04 Amendment Analysis (12+ Kategori Terperinci)
  const bk04Analysis = useMemo(() => {
    const amendedProgs = programs.filter((p) => p.rekodPindaan && p.rekodPindaan.length > 0);
    const typeCount: Record<string, number> = {
      'Nama Program': 0,
      'Tarikh Program': 0,
      'Tempat': 0,
      'Bilangan Peserta': 0,
      'Sumber Kewangan': 0,
      'OS21000': 0,
      'OS24000': 0,
      'OS27000': 0,
      'OS29000': 0,
      'Pengurus': 0,
      'Pengurus Bersama': 0,
      'Status Program': 0,
      'Objektif / Catatan': 0,
    };

    let totalVarianceRm = 0;

    amendedProgs.forEach((p) => {
      (p.rekodPindaan || []).forEach((rec) => {
        (rec.perubahan || []).forEach((item) => {
          const j = (item.jenisPerubahan || '').trim().toLowerCase();
          if (j.includes('nama program') || (j.includes('nama') && !j.includes('pengurus'))) {
            typeCount['Nama Program']++;
          } else if (j.includes('tarikh') || j.includes('tempoh')) {
            typeCount['Tarikh Program']++;
          } else if (j.includes('tempat') || j.includes('negeri') || j.includes('lokasi')) {
            typeCount['Tempat']++;
          } else if (j.includes('peserta')) {
            typeCount['Bilangan Peserta']++;
          } else if (j.includes('sumber')) {
            typeCount['Sumber Kewangan']++;
          } else if (j.includes('os21000') || j.includes('os21')) {
            typeCount['OS21000']++;
          } else if (j.includes('os24000') || j.includes('os24')) {
            typeCount['OS24000']++;
          } else if (j.includes('os27000') || j.includes('os27')) {
            typeCount['OS27000']++;
          } else if (j.includes('os29000') || j.includes('os29')) {
            typeCount['OS29000']++;
          } else if (j.includes('bersama')) {
            typeCount['Pengurus Bersama']++;
          } else if (j.includes('pengurus') || j.includes('pegawai')) {
            typeCount['Pengurus']++;
          } else if (j.includes('status')) {
            typeCount['Status Program']++;
          } else {
            typeCount['Objektif / Catatan']++;
          }

          // Compute variance if financial change
          if (j.includes('os') || j.includes('peruntukan') || j.includes('rm') || j.includes('belanja')) {
            const numAsal = Number(String(item.maklumatAsal || '').replace(/[^0-9.-]+/g, '')) || 0;
            const numKini = Number(String(item.maklumatTerkini || '').replace(/[^0-9.-]+/g, '')) || 0;
            if (numKini !== numAsal) {
              totalVarianceRm += (numKini - numAsal);
            }
          }
        });
      });
    });

    return {
      amendedCount: amendedProgs.length,
      totalPindaanCycles: programs.reduce((sum, p) => sum + (p.rekodPindaan?.length || 0), 0),
      typeBreakdown: Object.entries(typeCount),
      totalVarianceRm,
      amendedProgs,
    };
  }, [programs]);

  // 10.1 Analisis Matriks Risiko Kewangan
  const kewanganRisk = useMemo(() => {
    const sihatRendah: ProgramItem[] = []; // >= 95%
    const sederhana: ProgramItem[] = []; // 80% - 94.99%
    const tinggi: ProgramItem[] = []; // < 80%

    programs.forEach((p) => {
      const a = Number(p.jumlahRm) || 0;
      const b = Number(p.jumlahBelanjaRm) || 0;

      if (a <= 0) {
        tinggi.push(p);
        return;
      }

      const util = (b / a) * 100;
      if (util >= 95) {
        sihatRendah.push(p);
      } else if (util >= 80) {
        sederhana.push(p);
      } else {
        tinggi.push(p);
      }
    });

    return { sihatRendah, sederhana, tinggi };
  }, [programs]);

  // 10.2 Analisis Matriks Risiko Tempoh (Melibatkan status selain SELESAI)
  const tempohRisk = useMemo(() => {
    const sihatRendah: ProgramItem[] = [];
    const sederhana: ProgramItem[] = [];
    const tinggi: ProgramItem[] = [];
    const tidakBerkenaan: ProgramItem[] = [];

    const nonCompleted = programs.filter(
      (p) => (p.statusProgram || '').trim().toUpperCase() !== 'SELESAI'
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    nonCompleted.forEach((p) => {
      const status = (p.statusProgram || '').trim().toUpperCase();

      // Risiko - Tidak Berkenaan: status BATAL
      if (status === 'BATAL') {
        tidakBerkenaan.push(p);
        return;
      }

      let diffDays: number | null = null;
      if (p.tarikhMula) {
        const d = new Date(p.tarikhMula);
        if (!isNaN(d.getTime())) {
          d.setHours(0, 0, 0, 0);
          diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      // Sihat / Rendah (Kelulusan LO/PO diperolehi): status TANGGUNG ATAU > 90 hari sebelum tarikh mula
      if (status === 'TANGGUNG' || (diffDays !== null && diffDays > 90)) {
        sihatRendah.push(p);
        return;
      }

      // Risiko Sederhana (30 hari sebelum tarikh mula program): status DALAM TINDAKAN dan > 30 hari sebelum tarikh mula
      if (status === 'DALAM TINDAKAN' && diffDays !== null && diffDays > 30 && diffDays <= 90) {
        sederhana.push(p);
        return;
      }

      // Risiko Tinggi (Kurang 7 hari / kritikal sebelum tarikh mula): status DALAM TINDAKAN (< 30 hari sebelum tarikh mula) ATAU status BELUM AMBIL TINDAKAN
      if (
        status === 'BELUM AMBIL TINDAKAN' ||
        (status === 'DALAM TINDAKAN' && (diffDays === null || diffDays <= 30))
      ) {
        tinggi.push(p);
        return;
      }

      // Fallback
      if (diffDays !== null && diffDays <= 30) {
        tinggi.push(p);
      } else {
        sederhana.push(p);
      }
    });

    return {
      totalNonCompleted: nonCompleted.length,
      sihatRendah,
      sederhana,
      tinggi,
      tidakBerkenaan,
    };
  }, [programs]);

  return (
    <div className="space-y-8 mb-12">
      {/* SECTION HEADER - KAD HEADER GELAP (MENGIKUT CONTOH IMAGE) */}
      <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shadow-sm border border-slate-800 transition-all hover:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-600/30 border border-blue-400/40 text-blue-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                MODUL 4
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                10 CARTA INTERAKTIF, ANALISIS PINDAAN BK04 &amp; MATRIKS RISIKO
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
              <span>Kategori:</span>
              <strong className="text-amber-400 font-bold uppercase">
                VISUALISASI DATA INTERAKTIF (INTERACTIVE DATA VISUALISATION)
              </strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-lg text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Visualisasi &amp; Risiko
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
              10 Carta + Matriks
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
      {/* CHARTS GRID ROW 1: COMPARATIVE & OS CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Allocation vs Actual Expenditure (Comparative bar chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                1. Peruntukan vs Belanja Sebenar Mengikut Jabatan
              </h3>
              <p className="text-[11px] text-slate-500">Perbandingan peruntukan (biru) vs belanja sebenar (kuning)</p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
                Peruntukan
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                Belanja
              </span>
            </div>
          </div>

          <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
            {deptComparison.map((d) => {
              const allocWidth = Math.round((d.alloc / maxDeptAlloc) * 100);
              const actualWidth = Math.round((d.actual / maxDeptAlloc) * 100);

              return (
                <div key={d.dept} className="text-xs group">
                  <div className="flex justify-between items-center mb-1 font-semibold text-slate-800">
                    <span className="truncate max-w-[220px]" title={d.dept}>
                      {d.dept}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {d.utilRate}% terpakai
                    </span>
                  </div>
                  {/* Allocation Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex flex-col gap-0.5">
                    <div
                      style={{ width: `${allocWidth}%` }}
                      className="bg-blue-600 h-1.5 rounded-full"
                      title={`Peruntukan: ${formatRM(d.alloc)}`}
                    />
                    <div
                      style={{ width: `${actualWidth}%` }}
                      className="bg-amber-500 h-1 rounded-full"
                      title={`Belanja: ${formatRM(d.actual)}`}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Peruntukan: {formatRM(d.alloc)}</span>
                    <span className="text-amber-700 font-medium">Belanja: {formatRM(d.actual)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Budget Utilisation by OS Code (Horizontal bar chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                2. Kadar Utiliti Bajet Mengikut Kod OS
              </h3>
              <p className="text-[11px] text-slate-500">Peratusan belanja sebenar berbanding siling diluluskan</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-4">
            {osUtilisation.map((o) => (
              <div key={o.code} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div>
                    <span className="font-bold text-slate-900">{o.code}</span>
                    <span className="text-slate-500 ml-1.5 font-normal">({o.name})</span>
                  </div>
                  <span className="font-mono font-black text-slate-900 text-sm">{o.rate}%</span>
                </div>
                <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${Math.min(100, o.rate)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      o.rate >= 90 ? 'bg-rose-500' : o.rate >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5">
                  <span>Belanja: {formatRM(o.actual)}</span>
                  <span>Peruntukan: {formatRM(o.alloc)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHARTS GRID ROW 2: COMPOSITION & STATUS CHARTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 3. Financial Composition (Donut / Share Breakdown) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-sm font-bold text-slate-900">3. Komposisi Peruntukan Kod OS</h3>
            <p className="text-[11px] text-slate-500">Syer peruntukan bagi setiap kod objek sebagai</p>
          </div>

          <div className="flex items-center justify-center py-4">
            {/* Donut representation */}
            <div className="relative w-40 h-40 rounded-full flex items-center justify-center border-8 border-indigo-600 bg-slate-50 shadow-inner">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Jumlah</span>
                <span className="text-sm font-black text-slate-900">{formatRM(totalAlloc)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            {osComposition.map((o) => (
              <div key={o.code} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${o.color}`} />
                  <span className="font-semibold text-slate-800">{o.code}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{formatRM(o.alloc)}</span>
                  <span className="text-slate-400 ml-1.5">({o.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Programme Status Distribution (Donut Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-sm font-bold text-slate-900">4. Agihan Status Program</h3>
            <p className="text-[11px] text-slate-500">Pecahan status kemajuan aktiviti semasa</p>
          </div>

          <div className="space-y-2.5 mt-2">
            {statusDist.map((s) => (
              <div
                key={s.status}
                onClick={() =>
                  onOpenDrillDown(
                    `Program Status: ${s.status}`,
                    programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === s.status)
                  )
                }
                className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-300 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="font-bold text-slate-800">{s.status}</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">
                    {s.count} ({s.pct}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                    className="h-full rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Programme Type Distribution (Bar Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-sm font-bold text-slate-900">5. Agihan Jenis Program</h3>
            <p className="text-[11px] text-slate-500">Bengkel, kursus, seminar, dan mesyuarat</p>
          </div>

          <div className="space-y-3">
            {typeDist.map((t) => (
              <div key={t.type} className="text-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">{t.type}</span>
                  <span className="font-bold text-slate-900">{t.count}</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${t.pct}%` }}
                    className="bg-indigo-600 h-full rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CHARTS GRID ROW 3: PARTICIPANTS, TRENDS & RANKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6. Programme Distribution by Department */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                6. Kedudukan Aktiviti Mengikut Jabatan
              </h3>
              <p className="text-[11px] text-slate-500">Bilangan program dan jumlah peruntukan</p>
            </div>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
            {deptDist.map((d, idx) => (
              <div key={d.dept} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-slate-800 truncate" title={d.dept}>
                    {d.dept}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-slate-900 block">{d.count} program</span>
                  <span className="text-[10px] text-slate-400">{formatRM(d.alloc)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 7. Participant Statistics & 8. Trend Analysis */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                7 &amp; 8. Statistik Peserta &amp; Trend Bulanan
              </h3>
              <p className="text-[11px] text-slate-500">Aktiviti dan bilangan peserta sepanjang 12 bulan</p>
            </div>
            <Calendar className="w-4 h-4 text-slate-400" />
          </div>

          {/* Bar Chart by Month */}
          <div className="flex items-end justify-between gap-1 h-36 pt-4 px-1 border-b border-slate-100">
            {monthlyTrend.map((m, idx) => {
              const pCount = participantStats[idx]?.peserta || 0;
              return (
                <div key={m.label} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap shadow-lg">
                    {m.count} Program | {formatNumber(pCount)} Peserta
                  </div>
                  <div className="w-full flex justify-center gap-0.5 items-end h-28">
                    <div
                      style={{ height: `${Math.max(8, m.pct)}%` }}
                      className="w-2.5 sm:w-3 bg-blue-600 rounded-t-sm group-hover:bg-blue-700 transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold mt-2">{m.label}</span>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-2">
            <span>Jumlah Peserta: <strong className="text-slate-900">{formatNumber(participantStats.reduce((s, p) => s + p.peserta, 0))}</strong></span>
            <span>Jumlah Program: <strong className="text-slate-900">{programs.length}</strong></span>
          </div>
        </div>
      </div>

      {/* CHARTS GRID ROW 4: BK04 AMENDMENTS & FINANCIAL RISK ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 9. BK04 Amendment Analysis */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  9. Analisis Pindaan Maklumat Program (BK04)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Pindaan tarikh, tempat, peserta &amp; kewangan diluluskan
                </p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                {bk04Analysis.amendedCount} Program Dipinda
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Kekerapan Pindaan</span>
                <span className="text-xl font-black text-purple-900 mt-0.5 block">
                  {bk04Analysis.totalPindaanCycles} Kitaran
                </span>
                <span className="text-[10px] text-slate-400">Pindaan rasmi direkod</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Impak Kewangan (Varian)</span>
                <span className="text-lg font-black text-slate-900 mt-0.5 block truncate">
                  {bk04Analysis.totalVarianceRm !== 0 ? formatRM(bk04Analysis.totalVarianceRm) : 'RM 0.00'}
                </span>
                <span className="text-[10px] text-slate-400">Perubahan peruntukan</span>
              </div>
            </div>

            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Pecahan Jenis Pindaan BK04
            </h4>
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {bk04Analysis.typeBreakdown.map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 hover:bg-slate-100/80 transition-colors border border-slate-100"
                >
                  <span className="font-semibold text-slate-800">{type}</span>
                  <span
                    className={`font-bold text-[11px] px-2 py-0.5 rounded border ${
                      count > 0
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}
                  >
                    {count} kali dipinda
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => onOpenDrillDown('Senarai Program Dipinda (BK04)', bk04Analysis.amendedProgs)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
            >
              <span>Semak Rekod Borang BK04</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 10. Analisis Matriks Risiko (Kewangan & Tempoh) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  10. Analisis Matriks Risiko
                </h3>
                <p className="text-[11px] text-slate-500">
                  Pengelasan risiko kewangan dan risiko tempoh pelaksanaan program
                </p>
              </div>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>

            {/* 10.1: Analisis Matriks Risiko Kewangan */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  10.1: Analisis Matriks Risiko Kewangan
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Berdasarkan utiliti bajet</span>
              </div>
              <div className="space-y-2">
                {/* Sihat / Rendah */}
                <div
                  onClick={() =>
                    onOpenDrillDown(
                      'Matriks Kewangan: Sihat / Rendah (≥ 95% / Bijak Belanja)',
                      kewanganRisk.sihatRendah
                    )
                  }
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:border-emerald-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <span className="font-bold text-xs text-emerald-950">
                        Sihat / Rendah (&ge; 95% / Bijak Belanja)
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-950">
                      {kewanganRisk.sihatRendah.length} Program
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    Program yang telah memaksimumkan penggunaan peruntukan disediakan.
                  </p>
                </div>

                {/* Sederhana */}
                <div
                  onClick={() =>
                    onOpenDrillDown(
                      'Matriks Kewangan: Risiko Sederhana (80% - 94%)',
                      kewanganRisk.sederhana
                    )
                  }
                  className="p-3 rounded-xl bg-amber-50 border border-amber-200 hover:border-amber-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                      <span className="font-bold text-xs text-amber-950">
                        Risiko Sederhana (80% - 94%)
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-950">
                      {kewanganRisk.sederhana.length} Program
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Program yang tidak memaksimumkan penggunaan peruntukan disediakan.
                  </p>
                </div>

                {/* Tinggi */}
                <div
                  onClick={() =>
                    onOpenDrillDown(
                      'Matriks Kewangan: Risiko Tinggi (< 80%)',
                      kewanganRisk.tinggi
                    )
                  }
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 hover:border-rose-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      <span className="font-bold text-xs text-rose-950">
                        Risiko Tinggi (&lt; 80%)
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-950">
                      {kewanganRisk.tinggi.length} Program
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 mt-1">
                    Penggunaan peruntukan rendah, baki peruntukan disediakan masih banyak dan perlu teliti semula duit lebihan.
                  </p>
                </div>
              </div>
            </div>

            {/* 10.2: Analisis Matriks Risiko Tempoh (Melibatkan status program selain SELESAI) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  10.2: Analisis Matriks Risiko Tempoh
                </span>
                <span className="text-[10px] text-purple-700 bg-purple-50 px-2 py-0.5 rounded font-bold border border-purple-200">
                  Selain Status SELESAI ({tempohRisk.totalNonCompleted})
                </span>
              </div>
              <div className="space-y-2">
                {/* Sihat / Rendah */}
                <div
                  onClick={() =>
                    onOpenDrillDown(
                      'Matriks Tempoh: Sihat / Rendah (Kelulusan LO/PO / >90 Hari)',
                      tempohRisk.sihatRendah
                    )
                  }
                  className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:border-emerald-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <span className="font-bold text-xs text-emerald-950">
                        Sihat / Rendah (Kelulusan LO/PO diperolehi)
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-950">
                      {tempohRisk.sihatRendah.length} Program
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-800 mt-1">
                    Status TANGGUNG atau &gt; 90 hari sebelum tarikh mula program.
                  </p>
                </div>

                {/* Sederhana */}
                <div
                  onClick={() =>
                    onOpenDrillDown(
                      'Matriks Tempoh: Risiko Sederhana (> 30 Hari Sebelum Mula)',
                      tempohRisk.sederhana
                    )
                  }
                  className="p-3 rounded-xl bg-amber-50 border border-amber-200 hover:border-amber-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                      <span className="font-bold text-xs text-amber-950">
                        Risiko Sederhana (30 hari sebelum tarikh mula)
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-950">
                      {tempohRisk.sederhana.length} Program
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-1">
                    Status DALAM TINDAKAN dan &gt; 30 hari sebelum tarikh mula program.
                  </p>
                </div>

                {/* Tinggi */}
                <div
                  onClick={() =>
                    onOpenDrillDown(
                      'Matriks Tempoh: Risiko Tinggi (Kurang 7 Hari / Kritikal)',
                      tempohRisk.tinggi
                    )
                  }
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 hover:border-rose-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                      <span className="font-bold text-xs text-rose-950">
                        Risiko Tinggi (Kurang 7 hari / kritikal)
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-950">
                      {tempohRisk.tinggi.length} Program
                    </span>
                  </div>
                  <p className="text-[11px] text-rose-800 mt-1">
                    Status DALAM TINDAKAN (&lt; 30 hari sebelum mula) atau status BELUM AMBIL TINDAKAN.
                  </p>
                </div>

                {/* Tidak Berkenaan (BATAL) */}
                <div
                  onClick={() =>
                    onOpenDrillDown(
                      'Matriks Tempoh: Risiko - Tidak Berkenaan (BATAL)',
                      tempohRisk.tidakBerkenaan
                    )
                  }
                  className="p-3 rounded-xl bg-zinc-100 border border-zinc-300 hover:border-zinc-400 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-500" />
                      <span className="font-bold text-xs text-zinc-900">
                        Risiko - Tidak Berkenaan
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-200 text-zinc-900">
                      {tempohRisk.tidakBerkenaan.length} Program
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-600 mt-1">
                    Status program telah dibatalkan (BATAL).
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
