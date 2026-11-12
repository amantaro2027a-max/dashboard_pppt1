import React, { useMemo } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Wallet,
  TrendingDown,
  Layers,
  ArrowRight,
  TrendingUp,
  Briefcase,
  Building2,
  ShieldCheck,
  Percent,
  Search,
  XCircle,
  Coins,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ProgramItem } from '../../types/program';
import { formatNumber, formatRM } from '../../utils/formatters';

interface ExecutiveOverviewModuleProps {
  programs: ProgramItem[];
  totalAllocationPeruntukanPage: number;
  onOpenDrillDown: (title: string, filteredList: ProgramItem[]) => void;
  onViewProgramDetail: (prog: ProgramItem) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const ExecutiveOverviewModule: React.FC<ExecutiveOverviewModuleProps> = ({
  programs,
  totalAllocationPeruntukanPage,
  onOpenDrillDown,
  onViewProgramDetail,
  isExpanded = true,
  onToggleExpand,
}) => {
  // Subsets by Status as strictly requested
  const completedList = useMemo(
    () => programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'SELESAI'),
    [programs]
  );

  const ongoingList = useMemo(
    () => programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'DALAM TINDAKAN'),
    [programs]
  );

  // Flash card: Upcoming - Hanya status TANGGUNG sahaja
  const upcomingTanggungList = useMemo(
    () => programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG'),
    [programs]
  );

  // Flash card: Attention Required - Hanya status BELUM AMBIL TINDAKAN sahaja
  const attentionBelumAmbilList = useMemo(
    () => programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BELUM AMBIL TINDAKAN'),
    [programs]
  );

  // Flash card: BATAL - Hanya status BATAL sahaja
  const batalList = useMemo(
    () => programs.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BATAL'),
    [programs]
  );

  const amendedList = useMemo(
    () => programs.filter((p) => p.rekodPindaan && p.rekodPindaan.length > 0),
    [programs]
  );

  // Financial calculations
  // 1. Total Allocation Program: Mengambil nilai peruntukan diterima JUMLAH PERUNTUKAN DITERIMA (RM) bagi program
  const totalProgramAllocation = useMemo(() => {
    return programs.reduce((sum, p) => sum + (Number(p.jumlahRm) || 0), 0);
  }, [programs]);

  // 2. Committed LO (Ambil nilai dalam BELANJA SEBENAR (OS) status tanggung)
  const tanggungCommittedLO = useMemo(() => {
    return upcomingTanggungList.reduce((sum, p) => sum + (Number(p.jumlahBelanjaRm) || 0), 0);
  }, [upcomingTanggungList]);

  // 3. Available Balance (Ambil nilai dalam PENJIMATAN (OS) BAKI BERSIH status tanggung)
  const tanggungAvailableBalance = useMemo(() => {
    return upcomingTanggungList.reduce((sum, p) => {
      const penjimatan =
        p.jumlahPenjimatanRm != null
          ? Number(p.jumlahPenjimatanRm)
          : (Number(p.jumlahRm) || 0) - (Number(p.jumlahBelanjaRm) || 0);
      return sum + penjimatan;
    }, 0);
  }, [upcomingTanggungList]);

  // Overall participants & actual expenditure
  const totalPeserta = useMemo(() => {
    return programs.reduce((sum, p) => sum + (Number(p.bilanganPeserta) || 0), 0);
  }, [programs]);

  const totalActualExp = useMemo(() => {
    return programs.reduce((sum, p) => sum + (Number(p.jumlahBelanjaRm) || 0), 0);
  }, [programs]);

  const totalCount = programs.length;

  return (
    <div className="space-y-8 mb-12">
      {/* SECTION HEADER - KAD HEADER GELAP (MENGIKUT CONTOH IMAGE) */}
      <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 select-none shadow-sm border border-slate-800 transition-all hover:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-600/30 border border-blue-400/40 text-blue-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                MODUL 1
              </span>
              <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                PRESTASI KESELURUHAN &amp; KAD ANALITIK UTAMA PPPT
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
              <span>Kategori:</span>
              <strong className="text-amber-400 font-bold uppercase">
                GAMBARAN EKSEKUTIF (EXECUTIVE OVERVIEW DASHBOARD)
              </strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-lg text-right shrink-0">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Program Disaring
            </span>
            <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
              {totalCount} Aktiviti
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

      {/* FLASH CARDS – OVERALL PERFORMANCE (UPGRADED PER USER SPECIFICATIONS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
        {/* 1. Total Programmes */}
        <div
          onClick={() => onOpenDrillDown('Senarai Semua Program Terpilih', programs)}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Total Programmes
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {formatNumber(totalCount)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Semua aktiviti</span>
              <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center text-[10px]">
                Lihat &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* 2. Completed Programmes */}
        <div
          onClick={() => onOpenDrillDown('Program Status SELESAI', completedList)}
          className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Completed
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-700">
              {formatNumber(completedList.length)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>Hanya SELESAI</span>
              <span className="text-emerald-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center text-[10px]">
                Lihat &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* 3. Ongoing Programmes */}
        <div
          onClick={() => onOpenDrillDown('Program Status DALAM TINDAKAN', ongoingList)}
          className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs hover:border-sky-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
              Ongoing
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-sky-700">
              {formatNumber(ongoingList.length)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span>DALAM TINDAKAN</span>
              <span className="text-sky-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center text-[10px]">
                Lihat &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* 4. Upcoming (HANYA STATUS TANGGUNG SAHAJA) */}
        <div
          onClick={() => onOpenDrillDown('Program Status TANGGUNG (Upcoming)', upcomingTanggungList)}
          className="bg-white p-4 rounded-xl border border-purple-200/80 shadow-xs hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Upcoming
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <CalendarDays className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-700">
              {formatNumber(upcomingTanggungList.length)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span className="text-purple-600 font-semibold">Hanya TANGGUNG</span>
              <span className="text-purple-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center text-[10px]">
                Lihat &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* 5. Attention Required (HANYA STATUS BELUM AMBIL TINDAKAN SAHAJA) */}
        <div
          onClick={() => onOpenDrillDown('Program Status BELUM AMBIL TINDAKAN', attentionBelumAmbilList)}
          className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Attention Required
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-700">
              {formatNumber(attentionBelumAmbilList.length)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span className="text-amber-700 font-semibold truncate max-w-[120px]" title="Belum Ambil Tindakan">
                BELUM AMBIL TINDAKAN
              </span>
              <span className="text-amber-700 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center text-[10px]">
                Lihat &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* 6. TAMBAH 1 FLASH CARD: BATAL (HANYA STATUS BATAL SAHAJA) */}
        <div
          onClick={() => onOpenDrillDown('Program Status BATAL', batalList)}
          className="bg-white p-4 rounded-xl border border-zinc-300 shadow-xs hover:border-zinc-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">
              BATAL
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-700 flex items-center justify-center group-hover:scale-110 transition-transform">
              <XCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-zinc-800">
              {formatNumber(batalList.length)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
              <span className="text-zinc-600 font-semibold">Hanya BATAL</span>
              <span className="text-zinc-800 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center text-[10px]">
                Lihat &rarr;
              </span>
            </div>
          </div>
        </div>

        {/* 7. Total Participants */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Total Participants
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {formatNumber(totalPeserta)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Purata{' '}
              <strong className="text-slate-800">
                {totalCount > 0 ? Math.round(totalPeserta / totalCount) : 0}
              </strong>{' '}
              peserta / program
            </p>
          </div>
        </div>

        {/* 8. Total Allocation Keseluruhan (AMBIL DALAM PAGE PERUNTUKAN) */}
        <div className="bg-white p-4 rounded-xl border border-blue-300 shadow-xs flex flex-col justify-between bg-gradient-to-b from-white to-blue-50/20">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
              Total Allocation
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-blue-950 truncate" title={formatRM(totalAllocationPeruntukanPage)}>
              {formatRM(totalAllocationPeruntukanPage)}
            </div>
            <p className="text-[11px] text-blue-700 font-semibold mt-1">
              Dari Page PERUNTUKAN
            </p>
          </div>
        </div>

        {/* 9. Total Allocation Program (JUMLAH PERUNTUKAN DITERIMA BAGI PROGRAM) */}
        <div
          onClick={() => onOpenDrillDown('Senarai Program Mengikut Peruntukan Diterima (RM)', programs)}
          className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-gradient-to-b from-white to-purple-50/30"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
              Total Allocation Program
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
              <FileCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-purple-950 truncate" title={formatRM(totalProgramAllocation)}>
              {formatRM(totalProgramAllocation)}
            </div>
            <p className="text-[11px] text-purple-700 font-semibold mt-1 flex items-center justify-between">
              <span>Peruntukan Program</span>
              <span className="text-[10px] underline">Lihat &rarr;</span>
            </p>
          </div>
        </div>

        {/* 10. Committed LO (BELANJA SEBENAR STATUS TANGGUNG) */}
        <div
          onClick={() => onOpenDrillDown('Komitmen LO (Belanja Sebenar Status TANGGUNG)', upcomingTanggungList)}
          className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-gradient-to-b from-white to-amber-50/30"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Committed LO
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-amber-950 truncate" title={formatRM(tanggungCommittedLO)}>
              {formatRM(tanggungCommittedLO)}
            </div>
            <p className="text-[11px] text-amber-700 font-semibold mt-1 flex items-center justify-between">
              <span>Belanja Tanggung</span>
              <span className="text-[10px] underline">Lihat &rarr;</span>
            </p>
          </div>
        </div>

        {/* 11. Available Balance (PENJIMATAN BAKI BERSIH STATUS TANGGUNG) */}
        <div
          onClick={() => onOpenDrillDown('Baki Bersih (Penjimatan Status TANGGUNG)', upcomingTanggungList)}
          className="bg-white p-4 rounded-xl border border-emerald-300 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-gradient-to-b from-white to-emerald-50/40"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Available Balance
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
              RM
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-emerald-900 truncate" title={formatRM(tanggungAvailableBalance)}>
              {formatRM(tanggungAvailableBalance)}
            </div>
            <p className="text-[11px] text-emerald-700 font-semibold mt-1 flex items-center justify-between">
              <span>Baki Bersih Tanggung</span>
              <span className="text-[10px] underline">Lihat &rarr;</span>
            </p>
          </div>
        </div>

        {/* 12. Total Actual Expenditure Keseluruhan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Actual Expenditure
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black text-rose-950 truncate" title={formatRM(totalActualExp)}>
              {formatRM(totalActualExp)}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Belanja sebenar program</p>
          </div>
        </div>
      </div>

      {/* B. FOUR MAIN DASHBOARD CARDS (WITH DRILL-DOWN CAPABILITY) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Programme Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">1. Programme Overview</h3>
                  <p className="text-xs text-slate-500">Kadar pelaksanaan dan volum aktiviti PPPT</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {totalCount} Program
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Kadar Siap Pelaksanaan</span>
                <span className="text-xl font-black text-emerald-700 mt-0.5 block">
                  {totalCount > 0 ? `${Math.round((completedList.length / totalCount) * 100)}%` : '0%'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {completedList.length} daripada {totalCount} aktiviti
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Status Belum Siap</span>
                <span className="text-xl font-black text-amber-700 mt-0.5 block">
                  {ongoingList.length + upcomingTanggungList.length + attentionBelumAmbilList.length}
                </span>
                <span className="text-[10px] text-slate-400">
                  {ongoingList.length} aktif + {upcomingTanggungList.length} tanggung + {attentionBelumAmbilList.length} belum
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Nisbah Status Program</span>
                <span className="font-semibold">{completedList.length} Selesai</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                <div
                  style={{ width: `${totalCount > 0 ? (completedList.length / totalCount) * 100 : 0}%` }}
                  className="bg-emerald-500 h-full"
                  title="Selesai"
                />
                <div
                  style={{ width: `${totalCount > 0 ? (ongoingList.length / totalCount) * 100 : 0}%` }}
                  className="bg-sky-500 h-full"
                  title="Dalam Tindakan"
                />
                <div
                  style={{ width: `${totalCount > 0 ? (upcomingTanggungList.length / totalCount) * 100 : 0}%` }}
                  className="bg-purple-500 h-full"
                  title="Tanggung"
                />
                <div
                  style={{ width: `${totalCount > 0 ? (attentionBelumAmbilList.length / totalCount) * 100 : 0}%` }}
                  className="bg-amber-400 h-full"
                  title="Belum Ambil Tindakan"
                />
                <div
                  style={{ width: `${totalCount > 0 ? (batalList.length / totalCount) * 100 : 0}%` }}
                  className="bg-zinc-600 h-full"
                  title="Batal"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Papar senarai program terperinci</span>
            <button
              onClick={() => onOpenDrillDown('Drill-Down: Programme Overview', programs)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
            >
              <span>Buka Rekod Program</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 2: Financial Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">2. Financial Overview</h3>
                  <p className="text-xs text-slate-500">Kadar pembakaran bajet &amp; agihan peruntukan</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {totalAllocationPeruntukanPage > 0
                  ? `${Math.min(100, Math.round(((totalActualExp + tanggungCommittedLO) / totalAllocationPeruntukanPage) * 100))}% Terpakai`
                  : '0% Terpakai'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Jumlah Peruntukan</span>
                <span className="text-base sm:text-lg font-black text-slate-900 mt-0.5 block truncate">
                  {formatRM(totalAllocationPeruntukanPage)}
                </span>
                <span className="text-[10px] text-blue-700 font-semibold">Page PERUNTUKAN</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Baki Bersih Tanggung</span>
                <span className="text-base sm:text-lg font-black text-emerald-700 mt-0.5 block truncate">
                  {formatRM(tanggungAvailableBalance)}
                </span>
                <span className="text-[10px] text-emerald-600 font-semibold">Penjimatan Tanggung</span>
              </div>
            </div>

            {/* Financial Progress Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Perbelanjaan Sebenar vs Peruntukan</span>
                <span className="font-semibold">{formatRM(totalActualExp)} dibelanja</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden flex">
                <div
                  style={{
                    width: `${
                      totalAllocationPeruntukanPage > 0
                        ? Math.min(100, (totalActualExp / totalAllocationPeruntukanPage) * 100)
                        : 0
                    }%`,
                  }}
                  className="bg-rose-500 h-full"
                  title="Belanja Sebenar"
                />
                <div
                  style={{
                    width: `${
                      totalAllocationPeruntukanPage > 0
                        ? Math.min(100, (tanggungCommittedLO / totalAllocationPeruntukanPage) * 100)
                        : 0
                    }%`,
                  }}
                  className="bg-amber-400 h-full"
                  title="Committed LO Tanggung"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Analisis lejar kewangan OS</span>
            <button
              onClick={() => onOpenDrillDown('Drill-Down: Financial Overview', programs)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <span>Buka Lejar Kewangan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 3: Programme Management Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">3. Programme Management Overview</h3>
                  <p className="text-xs text-slate-500">Pengurusan pegawai, jabatan &amp; jangka masa</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                Tadbir Urus
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Jumlah Peserta Terlibat</span>
                <span className="text-xl font-black text-indigo-900 mt-0.5 block">
                  {formatNumber(totalPeserta)}
                </span>
                <span className="text-[10px] text-slate-400">Penyertaan menyeluruh</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Purata Tempoh Aktiviti</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">
                  {totalCount > 0
                    ? `${(
                        programs.reduce((sum, p) => sum + (Number(p.jumlahHari) || 1), 0) / totalCount
                      ).toFixed(1)} Hari`
                    : '0 Hari'}
                </span>
                <span className="text-[10px] text-slate-400">Hari pelaksanaan</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 flex items-center justify-between">
              <span>Pengurus Program Terlibat:</span>
              <strong className="text-slate-900 font-bold">
                {new Set(programs.map((p) => p.pengurusNama || p.pengurusId)).size} Pegawai
              </strong>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Papar profil pengurusan aktiviti</span>
            <button
              onClick={() => onOpenDrillDown('Drill-Down: Programme Management Overview', programs)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
            >
              <span>Buka Maklumat Pengurus</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card 4: Amendment and Governance Overview */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">4. Amendment &amp; Governance Overview</h3>
                  <p className="text-xs text-slate-500">Audit pindaan borang BK04 &amp; pematuhan dasar</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                BK04 Audit
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Program Dipinda (BK04)</span>
                <span className="text-xl font-black text-purple-900 mt-0.5 block">
                  {amendedList.length}
                </span>
                <span className="text-[10px] text-slate-400">
                  {totalCount > 0 ? `${Math.round((amendedList.length / totalCount) * 100)}%` : '0%'} daripada aktiviti
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[11px] text-slate-500 block">Jumlah Kitaran Pindaan</span>
                <span className="text-xl font-black text-slate-900 mt-0.5 block">
                  {programs.reduce((sum, p) => sum + (p.rekodPindaan?.length || 0), 0)}
                </span>
                <span className="text-[10px] text-slate-400">Kekerapan semakan</span>
              </div>
            </div>

            <div className="mt-4 p-3 bg-purple-50/60 rounded-xl text-xs text-purple-950 flex items-center justify-between border border-purple-100">
              <span>Status Audit Tadbir Urus:</span>
              <strong className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terkawal &amp; Tersimpan (BK04)
              </strong>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Audit log pindaan program</span>
            <button
              onClick={() => onOpenDrillDown('Drill-Down: Rekod Pindaan BK04', amendedList)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
            >
              <span>Buka Log BK04</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
