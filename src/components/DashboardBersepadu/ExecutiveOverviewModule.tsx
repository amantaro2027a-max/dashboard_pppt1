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

      if (status === 'TANGGUNG' || (diffDays !== null && diffDays > 90)) {
        sihatRendah.push(p);
        return;
      }

      if (status === 'DALAM TINDAKAN' && diffDays !== null && diffDays > 30 && diffDays <= 90) {
        sederhana.push(p);
        return;
      }

      if (
        status === 'BELUM AMBIL TINDAKAN' ||
        (status === 'DALAM TINDAKAN' && (diffDays === null || diffDays <= 30))
      ) {
        tinggi.push(p);
        return;
      }

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
      {/* SECTION HEADER */}
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
                PRESTASI KESELURUHAN &amp; KAD ANALITIK UTAMA PROGRAM
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
              <span>Kategori:</span>
              <strong className="text-amber-400 font-bold uppercase">
                GAMBARAN EKSEKUTIF
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
        {/* 1. Jumlah Program */}
        <div
          onClick={() => onOpenDrillDown('Senarai Semua Program Terpilih', programs)}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Jumlah Program
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

        {/* 2. Program Selesai */}
        <div
          onClick={() => onOpenDrillDown('Program Status SELESAI', completedList)}
          className="bg-white p-4 rounded-xl border border-emerald-200/80 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
              Program Selesai
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

        {/* 3. Sedang Berjalan */}
        <div
          onClick={() => onOpenDrillDown('Program Status DALAM TINDAKAN', ongoingList)}
          className="bg-white p-4 rounded-xl border border-sky-200/80 shadow-xs hover:border-sky-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
              Sedang Berjalan
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

        {/* 4. Akan Datang (HANYA STATUS TANGGUNG SAHAJA) */}
        <div
          onClick={() => onOpenDrillDown('Program Status TANGGUNG (Akan Datang)', upcomingTanggungList)}
          className="bg-white p-4 rounded-xl border border-purple-200/80 shadow-xs hover:border-purple-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
              Akan Datang
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

        {/* 5. Perlu Perhatian (HANYA STATUS BELUM AMBIL TINDAKAN SAHAJA) */}
        <div
          onClick={() => onOpenDrillDown('Program Status BELUM AMBIL TINDAKAN', attentionBelumAmbilList)}
          className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs hover:border-amber-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              Perlu Perhatian
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

        {/* 7. Jumlah Peserta */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Jumlah Peserta
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

        {/* 8. Jumlah Peruntukan Keseluruhan (AMBIL DALAM HALAMAN PERUNTUKAN) */}
        <div className="bg-white p-4 rounded-xl border border-blue-300 shadow-xs flex flex-col justify-between bg-gradient-to-b from-white to-blue-50/20">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
              Jumlah Peruntukan
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
              Dari Halaman PERUNTUKAN
            </p>
          </div>
        </div>

        {/* 9. Jumlah Peruntukan Program */}
        <div
          onClick={() => onOpenDrillDown('Senarai Program Mengikut Peruntukan Diterima (RM)', programs)}
          className="bg-white p-4 rounded-xl border border-purple-200 shadow-xs hover:border-purple-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-gradient-to-b from-white to-purple-50/30"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-800">
              Jumlah Peruntukan Program
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

        {/* 10. Komitmen Pesanan Tempatan (BELANJA SEBENAR STATUS TANGGUNG) */}
        <div
          onClick={() => onOpenDrillDown('Komitmen Pesanan Tempatan (Belanja Sebenar Status TANGGUNG)', upcomingTanggungList)}
          className="bg-white p-4 rounded-xl border border-amber-200 shadow-xs hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-gradient-to-b from-white to-amber-50/30"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Komitmen Pesanan Tempatan (LO)
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

        {/* 11. Baki Tersedia (PENJIMATAN BAKI BERSIH STATUS TANGGUNG) */}
        <div
          onClick={() => onOpenDrillDown('Baki Bersih (Penjimatan Status TANGGUNG)', upcomingTanggungList)}
          className="bg-white p-4 rounded-xl border border-emerald-300 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between bg-gradient-to-b from-white to-emerald-50/40"
        >
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
              Baki Tersedia
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

        {/* 12. Perbelanjaan Sebenar Keseluruhan */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
              Perbelanjaan Sebenar
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

      {/* B. EMPAT KAD UTAMA PAPAN PEMUKA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Kad 1: Gambaran Keseluruhan Program */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">1. Gambaran Keseluruhan Program</h3>
                  <p className="text-xs text-slate-500">Kadar pelaksanaan dan jumlah aktiviti program</p>
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
              onClick={() => onOpenDrillDown('Perincian: Gambaran Keseluruhan Program', programs)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 cursor-pointer"
            >
              <span>Buka Rekod Program</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Kad 2: Gambaran Keseluruhan Kewangan */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">2. Gambaran Keseluruhan Kewangan</h3>
                  <p className="text-xs text-slate-500">Kadar perbelanjaan bajet &amp; agihan peruntukan</p>
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
                <span className="text-[10px] text-blue-700 font-semibold">Halaman PERUNTUKAN</span>
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
                <span>Perbelanjaan Sebenar berbanding Peruntukan</span>
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
                  title="Komitmen Pesanan Tempatan (LO) Tanggung"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Analisis lejar kewangan OS</span>
            <button
              onClick={() => onOpenDrillDown('Perincian: Gambaran Keseluruhan Kewangan', programs)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
            >
              <span>Buka Lejar Kewangan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Kad 3: Gambaran Pengurusan Program */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">3. Gambaran Pengurusan Program</h3>
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
              onClick={() => onOpenDrillDown('Perincian: Gambaran Pengurusan Program', programs)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
            >
              <span>Buka Maklumat Pengurus</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Kad 4: Gambaran Pindaan & Tadbir Urus */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">4. Gambaran Pindaan &amp; Tadbir Urus</h3>
                  <p className="text-xs text-slate-500">Semakan pindaan borang BK04 &amp; pematuhan dasar</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200">
                Semakan BK04
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
              <span>Status Semakan Tadbir Urus:</span>
              <strong className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Terkawal &amp; Tersimpan (BK04)
              </strong>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Rekod pindaan program</span>
            <button
              onClick={() => onOpenDrillDown('Perincian: Rekod Pindaan BK04', amendedList)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
            >
              <span>Buka Rekod BK04</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 10. Analisis Matriks Risiko (Dipindahkan ke Modul 1) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              10. Analisis Matriks Risiko
            </h3>
            <p className="text-xs text-slate-500">
              Pengelasan risiko kewangan dan risiko tempoh pelaksanaan program
            </p>
          </div>
          <AlertTriangle className="w-5 h-5 text-amber-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 10.1: Analisis Matriks Risiko Kewangan */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                10.1: Analisis Matriks Risiko Kewangan
              </span>
              <span className="text-[10px] text-slate-400 font-medium">Berdasarkan kadar penggunaan bajet</span>
            </div>
            <div className="space-y-2">
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

          {/* 10.2: Analisis Matriks Risiko Tempoh */}
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
              <div
                onClick={() =>
                  onOpenDrillDown(
                    'Matriks Tempoh: Sihat / Rendah (Kelulusan Pesanan Tempatan / >90 Hari)',
                    tempohRisk.sihatRendah
                  )
                }
                className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:border-emerald-400 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="font-bold text-xs text-emerald-950">
                      Sihat / Rendah (Kelulusan Pesanan Tempatan diperolehi)
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
        </>
      )}
    </div>
  );
};
