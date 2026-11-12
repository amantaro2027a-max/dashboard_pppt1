import React, { useState, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ProgramItem } from '../types/program';
import { formatRMWithPrefix, formatRM } from '../utils/formatters';
import {
  CreditCard,
  ShieldAlert,
  Lock,
  ArrowRight,
  TrendingDown,
  Layers,
  FileCheck2,
  ChevronDown,
  ChevronUp,
  Info,
  Building2,
  ExternalLink,
} from 'lucide-react';

interface BahagianPerbelanjaanProps {
  bahagianIndex: number;
  sumberKewangan: string;
  programs: ProgramItem[];
  viewProgramDetail: (prog: ProgramItem) => void;
}

const BahagianPerbelanjaanCard: React.FC<BahagianPerbelanjaanProps> = ({
  bahagianIndex,
  sumberKewangan,
  programs,
  viewProgramDetail,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [filterMode, setFilterMode] = useState<'SELESAI' | 'SEMUA'>('SEMUA');

  // Filter programs under this Sumber Kewangan
  const relevantPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (p.sumberKewangan !== sumberKewangan) return false;
      const status = (p.statusProgram || '').trim().toUpperCase();
      if (filterMode === 'SELESAI') {
        return status === 'SELESAI';
      }
      return status === 'SELESAI' || status === 'TANGGUNG';
    });
  }, [programs, sumberKewangan, filterMode]);

  // Totals for this section's programs
  const totals = useMemo(() => {
    let t21 = 0;
    let t24 = 0;
    let t27 = 0;
    let t29 = 0;

    relevantPrograms.forEach((p) => {
      t21 += Number(p.os21000Belanja) || 0;
      t24 += Number(p.os24000Belanja) || 0;
      t27 += Number(p.os27000Belanja) || 0;
      t29 += Number(p.os29000Belanja) || 0;
    });

    return {
      os21: t21,
      os24: t24,
      os27: t27,
      os29: t29,
      grand: t21 + t24 + t27 + t29,
    };
  }, [relevantPrograms]);

  return (
    <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden mb-8 transition-all hover:border-slate-400">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
            <FileCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-teal-600/30 border border-teal-400/40 text-teal-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                Bahagian {bahagianIndex}
              </span>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                PERUNTUKAN DIBELANJAKAN (STATUS PROGRAM: TANGGUNG DAN SELESAI)
              </h3>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-300">
              <span>Sumber Kewangan {bahagianIndex}:</span>
              <strong className="text-amber-400 font-bold uppercase">{sumberKewangan}</strong>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-800 border border-slate-700 px-3.5 py-1.5 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Jumlah Dibelanjakan
            </span>
            <span className="text-sm font-bold text-teal-400 font-mono">
              {formatRMWithPrefix(totals.grand)}
            </span>
          </div>

          {/* Sembunyi / Papar Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors cursor-pointer"
            title={isCollapsed ? 'Papar Bahagian Ini' : 'Sembunyi Bahagian Ini'}
          >
            <span>{isCollapsed ? 'Papar' : 'Sembunyi'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <div className="p-6 space-y-4">
          {/* Subheader Title & Filter Options */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>Senarai Program telah SELESAI sahaja:</span>
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Data BELANJA SEBENAR (OS) ditarik secara automatik daripada Perincian Maklumat Lengkap Program.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Paparan:</span>
              <button
                onClick={() => setFilterMode('SELESAI')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  filterMode === 'SELESAI'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Status SELESAI Sahaja ({programs.filter(p => p.sumberKewangan === sumberKewangan && (p.statusProgram || '').toUpperCase() === 'SELESAI').length})
              </button>
              <button
                onClick={() => setFilterMode('SEMUA')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors cursor-pointer ${
                  filterMode === 'SEMUA'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                SELESAI &amp; TANGGUNG ({programs.filter(p => p.sumberKewangan === sumberKewangan && ['SELESAI', 'TANGGUNG'].includes((p.statusProgram || '').toUpperCase())).length})
              </button>
            </div>
          </div>

          {/* Table */}
          {relevantPrograms.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-xs">
              Tiada program berstatus {filterMode === 'SELESAI' ? 'SELESAI' : 'SELESAI atau TANGGUNG'} direkodkan di bawah sumber kewangan <strong>{sumberKewangan}</strong> setakat ini.
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-3 px-3 w-12 text-center">BIL.</th>
                    <th className="py-3 px-3 w-28 font-mono">KOD PROGRAM</th>
                    <th className="py-3 px-4 min-w-[220px]">NAMA PROGRAM</th>
                    <th className="py-3 px-3 min-w-[160px]">PUSAT &amp; JABATAN</th>
                    <th className="py-3 px-3 w-28 text-center">STATUS</th>
                    <th className="py-3 px-3 w-36 text-right">OS21000: AUTOFILL (RM)</th>
                    <th className="py-3 px-3 w-36 text-right">OS24000: AUTOFILL (RM)</th>
                    <th className="py-3 px-3 w-36 text-right">OS27000: AUTOFILL (RM)</th>
                    <th className="py-3 px-3 w-36 text-right">OS29000: AUTOFILL (RM)</th>
                    <th className="py-3 px-4 w-40 text-right bg-teal-50/60 font-bold text-teal-950">
                      JUMLAH BELANJA (RM)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {relevantPrograms.map((prog, idx) => {
                    const os21 = Number(prog.os21000Belanja) || 0;
                    const os24 = Number(prog.os24000Belanja) || 0;
                    const os27 = Number(prog.os27000Belanja) || 0;
                    const os29 = Number(prog.os29000Belanja) || 0;
                    const rowSum =
                      prog.jumlahBelanjaRm !== undefined
                        ? Number(prog.jumlahBelanjaRm)
                        : os21 + os24 + os27 + os29;

                    return (
                      <tr key={prog.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-500">
                          {idx + 1}.
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-700">
                          {prog.kodProgram}
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => viewProgramDetail(prog)}
                            className="font-bold text-slate-900 hover:text-blue-600 uppercase text-left transition-colors flex items-center gap-1 group cursor-pointer"
                            title="Lihat Perincian Maklumat Lengkap Program"
                          >
                            <span>{prog.namaProgram}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 shrink-0" />
                          </button>
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            {prog.jenisProgram} · {prog.tempoh}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-600">
                          <span className="font-semibold text-slate-800 block truncate max-w-[180px]">
                            {prog.jabatan}
                          </span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[180px]" title={prog.pusat}>
                            {prog.pusat}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                              prog.statusProgram.toUpperCase() === 'SELESAI'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : 'bg-orange-100 text-orange-800 border-orange-300'
                            }`}
                          >
                            {prog.statusProgram}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                          {formatRM(os21)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                          {formatRM(os24)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                          {formatRM(os27)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                          {formatRM(os29)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-teal-950 bg-teal-50/40">
                          {formatRMWithPrefix(rowSum)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                    <td colSpan={5} className="py-3.5 px-4 uppercase tracking-wider text-right">
                      JUMLAH TELAH DIBELANJAKAN:
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                      {formatRMWithPrefix(totals.os21)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                      {formatRMWithPrefix(totals.os24)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                      {formatRMWithPrefix(totals.os27)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                      {formatRMWithPrefix(totals.os29)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-teal-300 bg-slate-950 text-sm">
                      {formatRMWithPrefix(totals.grand)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* User Required Notice Block */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 uppercase tracking-wide text-[11px]">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              <span>NOTA:</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              1. Autofill setiap OS data diambil dalam bahagian Perincian Maklumat Lengkap Program, data <strong>BELANJA SEBENAR (OS)</strong>.
            </p>
            <p className="text-[11px] leading-relaxed">
              2. Senarai Program telah SELESAI sahaja merujuk kepada <strong>STATUS PROGRAM ialah SELESAI sahaja</strong>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export const PerbelanjaanPage: React.FC = () => {
  const {
    currentUser,
    pegawaiList,
    setActiveTab,
    sumberKewanganList,
    programs,
    viewProgramDetail,
  } = useProgramContext();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const canAccess = isSuperAdmin || (currentUser?.role === 'ADMIN' && currentUser.allowedPages?.includes('PERBELANJAAN'));

  // Compute PERUNTUKAN DIBELANJAKAN KESELURUHAN (STATUS PROGRAM: TANGGUNG DAN SELESAI)
  const keseluruhanStats = useMemo(() => {
    const bySumber: Record<
      string,
      { os21: number; os24: number; os27: number; os29: number; grand: number; count: number }
    > = {};

    let grand21 = 0;
    let grand24 = 0;
    let grand27 = 0;
    let grand29 = 0;
    let totalSelesai = 0;
    let totalTanggung = 0;

    sumberKewanganList.forEach((sk) => {
      let s21 = 0;
      let s24 = 0;
      let s27 = 0;
      let s29 = 0;
      let count = 0;

      programs.forEach((p) => {
        if (p.sumberKewangan === sk) {
          const status = (p.statusProgram || '').trim().toUpperCase();
          if (status === 'SELESAI' || status === 'TANGGUNG') {
            s21 += Number(p.os21000Belanja) || 0;
            s24 += Number(p.os24000Belanja) || 0;
            s27 += Number(p.os27000Belanja) || 0;
            s29 += Number(p.os29000Belanja) || 0;
            count++;
            if (status === 'SELESAI') totalSelesai++;
            if (status === 'TANGGUNG') totalTanggung++;
          }
        }
      });

      const rowSum = s21 + s24 + s27 + s29;
      bySumber[sk] = {
        os21: s21,
        os24: s24,
        os27: s27,
        os29: s29,
        grand: rowSum,
        count,
      };

      grand21 += s21;
      grand24 += s24;
      grand27 += s27;
      grand29 += s29;
    });

    const totalPrograms = totalSelesai + totalTanggung;

    return {
      bySumber,
      grandTotals: {
        os21: grand21,
        os24: grand24,
        os27: grand27,
        os29: grand29,
        grand: grand21 + grand24 + grand27 + grand29,
        totalSelesai,
        totalTanggung,
        totalPrograms,
      },
    };
  }, [sumberKewanganList, programs]);

  // If user cannot access, show restricted screen
  if (!canAccess) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 sm:p-12 shadow-sm text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-5 border-4 border-rose-50">
            <Lock className="w-8 h-8" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
            Akses Dihadkan · Super Admin Sahaja
          </span>
          <h2 className="text-2xl font-black text-slate-900 mt-4 tracking-tight">
            Pengurusan Perbelanjaan Sebenar (IAB)
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            Halaman ini hanya boleh diakses oleh <strong>Super Admin (Kuasa Penuh)</strong> bagi
            memantau rekod perbelanjaan sebenar dan agihan peruntukan Institut Aminuddin Baki.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('admin')}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Log Masuk Sebagai Super Admin</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Kembali ke Dashboard Program
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
            <CreditCard className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Portal Pemantauan Perbelanjaan Sebenar Program IAB
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Pemantauan perbelanjaan sebenar (OS21, OS24, OS27, OS29) bagi program berstatus SELESAI &amp; TANGGUNG mengikut Sumber Kewangan Induk.
            </p>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-800/90 border border-slate-700 px-3.5 py-2 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Jumlah Perbelanjaan
            </span>
            <span className="text-base font-bold text-teal-400 font-mono">
              {formatRMWithPrefix(keseluruhanStats.grandTotals.grand)}
            </span>
          </div>

          {/* Selesai followed by Tanggung and Selesai + Tanggung */}
          <div className="bg-slate-800/90 border border-emerald-900/60 px-3.5 py-2 rounded-lg text-right">
            <span className="text-[10px] text-emerald-400 font-semibold uppercase block flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              Program Selesai
            </span>
            <span className="text-base font-bold text-emerald-300 font-mono">
              {keseluruhanStats.grandTotals.totalSelesai} Aktiviti
            </span>
          </div>

          <div className="bg-slate-800/90 border border-amber-900/60 px-3.5 py-2 rounded-lg text-right">
            <span className="text-[10px] text-amber-400 font-semibold uppercase block flex items-center justify-end gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Program Tanggung
            </span>
            <span className="text-base font-bold text-amber-300 font-mono">
              {keseluruhanStats.grandTotals.totalTanggung} Aktiviti
            </span>
          </div>

          <div className="bg-slate-800/90 border border-slate-700 px-3.5 py-2 rounded-lg text-right">
            <span className="text-[10px] text-slate-300 font-semibold uppercase block">
              Program Selesai + Tanggung
            </span>
            <span className="text-base font-bold text-white font-mono">
              {keseluruhanStats.grandTotals.totalPrograms} Aktiviti
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: PERUNTUKAN DIBELANJAKAN KESELURUHAN (STATUS PROGRAM: TANGGUNG DAN SELESAI)
         ========================================================================= */}
      <div className="bg-white border-2 border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center font-bold">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  PERUNTUKAN DIBELANJAKAN KESELURUHAN (STATUS PROGRAM: TANGGUNG DAN SELESAI)
                </h2>
                <span className="text-[10px] bg-teal-400 text-slate-950 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Autofill Automatik
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pengiraan automatik jumlah amaun semua Bahagian/Sumber Kewangan bagi program berstatus TANGGUNG dan SELESAI.
              </p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 px-4 py-1.5 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Jumlah Dibelanjakan
            </span>
            <span className="text-base font-bold text-teal-300 font-mono">
              {formatRMWithPrefix(keseluruhanStats.grandTotals.grand)}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-4 w-12 text-center">BIL</th>
                <th className="py-3 px-4 min-w-[240px]">NAMA SUMBER KEWANGAN (DATA INDUK)</th>
                <th className="py-3 px-4 w-40 text-right">OS21000: AUTOFILL (RM)</th>
                <th className="py-3 px-4 w-40 text-right">OS24000: AUTOFILL (RM)</th>
                <th className="py-3 px-4 w-40 text-right">OS27000: AUTOFILL (RM)</th>
                <th className="py-3 px-4 w-40 text-right">OS29000: AUTOFILL (RM)</th>
                <th className="py-3 px-5 w-48 text-right bg-teal-50/70 text-teal-950">
                  JUMLAH BESAR (RM)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sumberKewanganList.map((sk, index) => {
                const row = keseluruhanStats.bySumber[sk] || {
                  os21: 0,
                  os24: 0,
                  os27: 0,
                  os29: 0,
                  grand: 0,
                  count: 0,
                };
                return (
                  <tr key={sk} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 uppercase block">
                        {sk}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Sumber Kewangan {index + 1} · ({row.count} aktiviti selesai/tanggung)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      {formatRMWithPrefix(row.os21)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      {formatRMWithPrefix(row.os24)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      {formatRMWithPrefix(row.os27)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-800">
                      {formatRMWithPrefix(row.os29)}
                    </td>
                    <td className="py-3 px-5 text-right font-mono font-bold text-teal-950 bg-teal-50/40 text-xs">
                      {formatRMWithPrefix(row.grand)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-700 text-xs">
                <td colSpan={2} className="py-4 px-4 uppercase tracking-wider text-right">
                  JUMLAH KESELURUHAN (SEMUA SUMBER KEWANGAN):
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(keseluruhanStats.grandTotals.os21)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(keseluruhanStats.grandTotals.os24)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(keseluruhanStats.grandTotals.os27)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-slate-200">
                  {formatRMWithPrefix(keseluruhanStats.grandTotals.os29)}
                </td>
                <td className="py-4 px-5 text-right font-mono text-teal-300 bg-slate-950 text-sm">
                  {formatRMWithPrefix(keseluruhanStats.grandTotals.grand)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* =========================================================================
          SECTIONS FOR EACH SUMBER KEWANGAN (BAHAGIAN 1, BAHAGIAN 2, DLL.)
         ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-slate-600" />
              <span>Pecahan Terperinci Mengikut Bahagian / Sumber Kewangan</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Setiap bahagian menyenaraikan program yang telah disempurnakan dengan pecahan belanja sebenar mengikut OS.
            </p>
          </div>
        </div>

        {sumberKewanganList.map((sk, idx) => (
          <BahagianPerbelanjaanCard
            key={sk}
            bahagianIndex={idx + 1}
            sumberKewangan={sk}
            programs={programs}
            viewProgramDetail={viewProgramDetail}
          />
        ))}
      </div>
    </div>
  );
};
