import React, { useMemo, useState } from 'react';
import {
  Wallet,
  TrendingDown,
  Clock,
  PiggyBank,
  Percent,
  AlertTriangle,
  Flame,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  Info,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ProgramItem } from '../../types/program';
import { formatRM, formatRMWithPrefix } from '../../utils/formatters';

interface FinancialIntelligenceModuleProps {
  programs: ProgramItem[];
  totalAllocationPeruntukanPage?: number;
  onOpenDrillDown: (title: string, filteredList: ProgramItem[]) => void;
  onViewProgramDetail: (prog: ProgramItem) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const FinancialIntelligenceModule: React.FC<FinancialIntelligenceModuleProps> = ({
  programs,
  totalAllocationPeruntukanPage,
  onOpenDrillDown,
  onViewProgramDetail,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [selectedOsDrillDown, setSelectedOsDrillDown] = useState<string | null>(null);

  // Financial Metrics following strict PPPT Calculation Rules
  const fin = useMemo(() => {
    let allocTotal = 0;
    let actualExpTotal = 0;
    let committedLoTotal = 0;
    let savingsTotal = 0;
    let deficitCount = 0;
    let highUtilCount = 0;

    // OS Code Breakdown aggregators
    const osBreakdown = {
      os21: { alloc: 0, actual: 0, lo: 0, balance: 0, label: 'OS21000 - Perjalanan & Sara Hidup' },
      os24: { alloc: 0, actual: 0, lo: 0, balance: 0, label: 'OS24000 - Sewaan & Penginapan' },
      os27: { alloc: 0, actual: 0, lo: 0, balance: 0, label: 'OS27000 - Bekalan Bahan & Latihan' },
      os29: { alloc: 0, actual: 0, lo: 0, balance: 0, label: 'OS29000 - Perkhidmatan Ikhtisas' },
    };

    programs.forEach((p) => {
      const a = Number(p.jumlahRm) || 0;
      const b = Number(p.jumlahBelanjaRm) || 0;
      const status = (p.statusProgram || '').trim().toUpperCase();

      allocTotal += a;
      actualExpTotal += b;

      // LO handling: programs with status 'TANGGUNG' are committed via LO
      const isLoCommitted = status === 'TANGGUNG';
      const loAmount = isLoCommitted ? a : 0;
      committedLoTotal += loAmount;

      // Deficit Check: Actual Expenditure > Allocation
      if (b > a && a > 0) {
        deficitCount++;
      }

      // High Utilisation Check: >= 90%
      if (a > 0) {
        const util = (b / a) * 100;
        if (util >= 90 && util <= 100) {
          highUtilCount++;
        }
      }

      // Savings: For completed programmes where expenditure is strictly less than allocation
      if (status === 'SELESAI' && a > b) {
        savingsTotal += (a - b);
      }

      // OS Aggregations
      const a21 = Number(p.os21000) || 0;
      const a24 = Number(p.os24000) || 0;
      const a27 = Number(p.os27000) || 0;
      const a29 = Number(p.os29000) || 0;

      const b21 = Number(p.os21000Belanja) || 0;
      const b24 = Number(p.os24000Belanja) || 0;
      const b27 = Number(p.os27000Belanja) || 0;
      const b29 = Number(p.os29000Belanja) || 0;

      osBreakdown.os21.alloc += a21;
      osBreakdown.os21.actual += b21;
      if (isLoCommitted) osBreakdown.os21.lo += a21;

      osBreakdown.os24.alloc += a24;
      osBreakdown.os24.actual += b24;
      if (isLoCommitted) osBreakdown.os24.lo += a24;

      osBreakdown.os27.alloc += a27;
      osBreakdown.os27.actual += b27;
      if (isLoCommitted) osBreakdown.os27.lo += a27;

      osBreakdown.os29.alloc += a29;
      osBreakdown.os29.actual += b29;
      if (isLoCommitted) osBreakdown.os29.lo += a29;
    });

    // Available Balance = Allocation - Actual Expenditure - Outstanding Committed LO
    const availableBalance = Math.max(0, allocTotal - actualExpTotal - committedLoTotal);

    // Overall Budget Utilisation (%) = (Actual Expenditure + Outstanding Committed LO) / Allocation × 100
    const budgetUtilisationPct = allocTotal > 0
      ? Math.min(100, Math.round(((actualExpTotal + committedLoTotal) / allocTotal) * 100))
      : 0;

    // Actual Expenditure (%) = Actual Expenditure / Allocation × 100
    const actualExpenditurePct = allocTotal > 0
      ? Math.min(100, Math.round((actualExpTotal / allocTotal) * 100))
      : 0;

    // Calculate Available Balance per OS
    Object.keys(osBreakdown).forEach((k) => {
      const item = osBreakdown[k as keyof typeof osBreakdown];
      item.balance = Math.max(0, item.alloc - item.actual - item.lo);
    });

    return {
      allocTotal,
      actualExpTotal,
      committedLoTotal,
      availableBalance,
      savingsTotal,
      budgetUtilisationPct,
      actualExpenditurePct,
      deficitCount,
      highUtilCount,
      osBreakdown,
    };
  }, [programs]);

  // Deficit & High Util Programs List for Drill-Down
  const deficitList = useMemo(
    () =>
      programs.filter((p) => {
        const a = Number(p.jumlahRm) || 0;
        const b = Number(p.jumlahBelanjaRm) || 0;
        return b > a && a > 0;
      }),
    [programs]
  );

  const highUtilList = useMemo(
    () =>
      programs.filter((p) => {
        const a = Number(p.jumlahRm) || 0;
        const b = Number(p.jumlahBelanjaRm) || 0;
        if (a <= 0) return false;
        const u = (b / a) * 100;
        return u >= 90 && u <= 100;
      }),
    [programs]
  );

  return (
    <div className="space-y-8 mb-12">
      {/* SECTION HEADER - KAD HEADER GELAP (MENGIKUT CONTOH IMAGE) */}
      <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shadow-sm border border-slate-800 transition-all hover:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-600/30 border border-blue-400/40 text-blue-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                MODUL 3
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                PEMANTAUAN LEJAR, KOD OS &amp; INTEGRITI PENGIRAAN BAJET
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
              <span>Kategori:</span>
              <strong className="text-amber-400 font-bold uppercase">
                RISIKAN KEWANGAN (FINANCIAL INTELLIGENCE DASHBOARD)
              </strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-lg text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Baki Bersih
            </span>
            <span className={`text-xs sm:text-sm font-bold font-mono ${fin.availableBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {formatRM(fin.availableBalance)}
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
      {/* A. FINANCIAL KPI CARDS (8 CARDS) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Allocation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Total Allocation
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-950 truncate">
            {formatRM(totalAllocationPeruntukanPage ?? fin.allocTotal)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Peruntukan asal diluluskan</p>
        </div>

        {/* 2. Total Actual Expenditure */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Actual Expenditure
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-950 truncate">
            {formatRM(fin.actualExpTotal)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Belanja sebenar ({fin.actualExpenditurePct}%)
          </p>
        </div>

        {/* 3. Committed Expenditure (LO) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Committed LO
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-950 truncate">
            {fin.committedLoTotal > 0 ? formatRM(fin.committedLoTotal) : 'Tiada Maklumat LO'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tanggung / LO belum bayar</p>
        </div>

        {/* 4. Total Available Balance */}
        <div className="bg-white rounded-2xl border border-emerald-300 p-5 shadow-xs bg-gradient-to-b from-white to-emerald-50/40">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Available Balance
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              RM
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-900 truncate">
            {formatRM(fin.availableBalance)}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            Baki Bersih Bebas
          </p>
        </div>

        {/* 5. Total Savings */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Total Savings
            </span>
            <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-teal-900 truncate">
            {formatRM(fin.savingsTotal)}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Penjimatan program selesai</p>
        </div>

        {/* 6. Overall Budget Utilisation */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Budget Utilisation
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-950">
            {fin.budgetUtilisationPct}%
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              style={{ width: `${fin.budgetUtilisationPct}%` }}
              className="bg-indigo-600 h-full rounded-full"
            />
          </div>
        </div>

        {/* 7. Insufficient Allocation (Deficit) */}
        <div
          onClick={() => onOpenDrillDown('Program Defisit Kewangan', deficitList)}
          className={`rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
            fin.deficitCount > 0
              ? 'bg-rose-50/70 border-rose-300 hover:border-rose-500'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
              Defisit Peruntukan
            </span>
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-800">
            {fin.deficitCount} <span className="text-xs font-semibold">Program</span>
          </div>
          <p className="text-[11px] text-rose-600 mt-1 flex items-center justify-between">
            <span>Belanja &gt; Peruntukan</span>
            <span className="underline font-bold">Semak &rarr;</span>
          </p>
        </div>

        {/* 8. High Utilisation (>=90%) */}
        <div
          onClick={() => onOpenDrillDown('Program Utiliti Tinggi (90%-100%)', highUtilList)}
          className={`rounded-2xl border p-5 shadow-xs transition-all cursor-pointer ${
            fin.highUtilCount > 0
              ? 'bg-amber-50/70 border-amber-300 hover:border-amber-500'
              : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Utiliti Tinggi (&ge;90%)
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-900">
            {fin.highUtilCount} <span className="text-xs font-semibold">Program</span>
          </div>
          <p className="text-[11px] text-amber-700 mt-1 flex items-center justify-between">
            <span>Menghampiri had siling</span>
            <span className="underline font-bold">Semak &rarr;</span>
          </p>
        </div>
      </div>

      {/* B. CALCULATION RULES ACCORDION EXPLANATION */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
          <Info className="w-4 h-4 text-blue-600" />
          <span>Formula &amp; Kaedah Pengiraan Kewangan Diluluskan PPPT</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-600">
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-0.5">Baki Peruntukan Tersedia</strong>
            <code>Peruntukan − Belanja Sebenar − Komitmen LO</code>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-0.5">Kadar Utiliti Bajet (%)</strong>
            <code>(Belanja + LO) ÷ Peruntukan × 100</code>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-0.5">Kadar Belanja Sebenar (%)</strong>
            <code>Belanja Sebenar ÷ Peruntukan × 100</code>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200">
            <strong className="text-slate-900 block mb-0.5">Integriti Anti Gandaan</strong>
            <span>LO tidak digandakan dengan Belanja Sebenar.</span>
          </div>
        </div>
      </div>

      {/* C. FINANCIAL ANALYSIS BY OS CODE (OS21, OS24, OS27, OS29) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Analisis Kewangan Mengikut Kod Objek Sebagai (OS Code)
            </h3>
            <p className="text-xs text-slate-500">
              Pecahan Peruntukan, Belanja Sebenar, Komitmen LO dan Baki Tersedia bagi OS21, OS24, OS27 &amp; OS29
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
            4 Kod OS Rasmi
          </span>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-3 px-4">Kod OS &amp; Kategori</th>
                <th className="py-3 px-4 text-right">Peruntukan (RM)</th>
                <th className="py-3 px-4 text-right">Belanja Sebenar (RM)</th>
                <th className="py-3 px-4 text-right">Komitmen LO (RM)</th>
                <th className="py-3 px-4 text-right">Baki Tersedia (RM)</th>
                <th className="py-3 px-4 text-center">Kadar Utiliti</th>
                <th className="py-3 px-4 text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {Object.entries(fin.osBreakdown).map(([key, item]) => {
                const util = item.alloc > 0
                  ? Math.min(100, Math.round(((item.actual + item.lo) / item.alloc) * 100))
                  : 0;

                const osProgramList = programs.filter((p) => {
                  const val = Number(
                    key === 'os21'
                      ? p.os21000
                      : key === 'os24'
                      ? p.os24000
                      : key === 'os27'
                      ? p.os27000
                      : p.os29000
                  ) || 0;
                  return val > 0;
                });

                return (
                  <tr key={key} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.label}</div>
                      <div className="text-[10px] text-slate-400">
                        {osProgramList.length} program memohon peruntukan ini
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {formatRM(item.alloc)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-amber-700 font-semibold">
                      {formatRM(item.actual)}
                    </td>
                    <td className="py-3.5 px-4 text-right text-purple-700 font-semibold">
                      {item.lo > 0 ? formatRM(item.lo) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                      {formatRM(item.balance)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${util}%` }}
                            className={`h-full rounded-full ${
                              util >= 90 ? 'bg-rose-500' : util >= 70 ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                        </div>
                        <span className="font-bold text-[11px] text-slate-700 w-8 text-right">
                          {util}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() =>
                          onOpenDrillDown(
                            `Lejar Terperinci: ${item.label}`,
                            osProgramList
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors cursor-pointer"
                      >
                        <span>Drill-down</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold border-t-2 border-slate-800">
              <tr>
                <td className="py-3.5 px-4">JUMLAH KESELURUHAN</td>
                <td className="py-3.5 px-4 text-right">{formatRM(fin.allocTotal)}</td>
                <td className="py-3.5 px-4 text-right text-amber-300">{formatRM(fin.actualExpTotal)}</td>
                <td className="py-3.5 px-4 text-right text-purple-300">{formatRM(fin.committedLoTotal)}</td>
                <td className="py-3.5 px-4 text-right text-emerald-400">{formatRM(fin.availableBalance)}</td>
                <td className="py-3.5 px-4 text-center">{fin.budgetUtilisationPct}%</td>
                <td className="py-3.5 px-4 text-center">
                  <span className="text-[10px] text-slate-300">Penuh</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
