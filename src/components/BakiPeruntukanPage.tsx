import React, { useState, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { ProgramItem } from '../types/program';
import { formatRMWithPrefix, formatRM } from '../utils/formatters';
import {
  Scale,
  ShieldAlert,
  Lock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Layers,
  Building2,
  FileSpreadsheet,
  Coins,
  TrendingDown,
  TrendingUp,
  Share2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface BahagianBakiProps {
  bahagianIndex: number;
  sumberKewangan: string;
  programs: ProgramItem[];
  peruntukanPerFasaTotal: {
    os21: number;
    os24: number;
    os27: number;
    os29: number;
    grand: number;
  };
  subwaranTotal: {
    os21: number;
    os24: number;
    os27: number;
    os29: number;
    grand: number;
    items: any[];
  };
  viewProgramDetail: (prog: ProgramItem) => void;
}

const BahagianBakiCard: React.FC<BahagianBakiProps> = ({
  bahagianIndex,
  sumberKewangan,
  programs,
  peruntukanPerFasaTotal,
  subwaranTotal,
  viewProgramDetail,
}) => {
  // Sembunyi bahagian ini as a default
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Programs under this Sumber Kewangan with status SELESAI & TANGGUNG
  const relevantPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (p.sumberKewangan !== sumberKewangan) return false;
      const status = (p.statusProgram || '').trim().toUpperCase();
      return status === 'SELESAI' || status === 'TANGGUNG';
    });
  }, [programs, sumberKewangan]);

  // Programs under this Sumber Kewangan with status DALAM TINDAKAN, BELUM AMBIL TINDAKAN, BATAL
  const pendingPrograms = useMemo(() => {
    return programs.filter((p) => {
      if (p.sumberKewangan !== sumberKewangan) return false;
      const status = (p.statusProgram || '').trim().toUpperCase();
      return (
        status === 'DALAM TINDAKAN' ||
        status === 'BELUM AMBIL TINDAKAN' ||
        status === 'BATAL'
      );
    });
  }, [programs, sumberKewangan]);

  const pendingTotals = useMemo(() => {
    let d21 = 0, d24 = 0, d27 = 0, d29 = 0, dTotal = 0;

    pendingPrograms.forEach((prog) => {
      const progD21 = Number(prog.os21000) || 0;
      const progD24 = Number(prog.os24000) || 0;
      const progD27 = Number(prog.os27000) || 0;
      const progD29 = Number(prog.os29000) || 0;
      const rowD = Number(prog.jumlahRm) || (progD21 + progD24 + progD27 + progD29);

      d21 += progD21;
      d24 += progD24;
      d27 += progD27;
      d29 += progD29;
      dTotal += rowD;
    });

    return {
      diterima: { os21: d21, os24: d24, os27: d27, os29: d29, grand: dTotal },
      belanja: { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0 },
      penjimatan: { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0 },
    };
  }, [pendingPrograms]);

  // Program-level totals: Peruntukan Diterima, Belanja Sebenar, Penjimatan
  const progTotals = useMemo(() => {
    let d21 = 0, d24 = 0, d27 = 0, d29 = 0, dTotal = 0;
    let b21 = 0, b24 = 0, b27 = 0, b29 = 0, bTotal = 0;
    let p21 = 0, p24 = 0, p27 = 0, p29 = 0, pTotal = 0;

    relevantPrograms.forEach((prog) => {
      const progD21 = Number(prog.os21000) || 0;
      const progD24 = Number(prog.os24000) || 0;
      const progD27 = Number(prog.os27000) || 0;
      const progD29 = Number(prog.os29000) || 0;
      const rowD = Number(prog.jumlahRm) || (progD21 + progD24 + progD27 + progD29);

      const progB21 = Number(prog.os21000Belanja) || 0;
      const progB24 = Number(prog.os24000Belanja) || 0;
      const progB27 = Number(prog.os27000Belanja) || 0;
      const progB29 = Number(prog.os29000Belanja) || 0;
      const rowB = prog.jumlahBelanjaRm !== undefined ? Number(prog.jumlahBelanjaRm) : (progB21 + progB24 + progB27 + progB29);

      const progP21 = prog.os21000Penjimatan !== undefined ? Number(prog.os21000Penjimatan) : (progD21 - progB21);
      const progP24 = prog.os24000Penjimatan !== undefined ? Number(prog.os24000Penjimatan) : (progD24 - progB24);
      const progP27 = prog.os27000Penjimatan !== undefined ? Number(prog.os27000Penjimatan) : (progD27 - progB27);
      const progP29 = prog.os29000Penjimatan !== undefined ? Number(prog.os29000Penjimatan) : (progD29 - progB29);
      const rowP = prog.jumlahPenjimatanRm !== undefined ? Number(prog.jumlahPenjimatanRm) : (rowD - rowB);

      d21 += progD21; d24 += progD24; d27 += progD27; d29 += progD29; dTotal += rowD;
      b21 += progB21; b24 += progB24; b27 += progB27; b29 += progB29; bTotal += rowB;
      p21 += progP21; p24 += progP24; p27 += progP27; p29 += progP29; pTotal += rowP;
    });

    return {
      diterima: { os21: d21, os24: d24, os27: d27, os29: d29, grand: dTotal },
      belanja: { os21: b21, os24: b24, os27: b27, os29: b29, grand: bTotal },
      penjimatan: { os21: p21, os24: p24, os27: p27, os29: p29, grand: pTotal },
    };
  }, [relevantPrograms]);

  // Overall Section Calculations:
  // Jumlah Penjimatan Program = (Jumlah dalam page Peruntukan) - (Jumlah dalam page Perbelanjaan)
  const penjimatanFromPages = useMemo(() => {
    const p21 = peruntukanPerFasaTotal.os21 - progTotals.belanja.os21;
    const p24 = peruntukanPerFasaTotal.os24 - progTotals.belanja.os24;
    const p27 = peruntukanPerFasaTotal.os27 - progTotals.belanja.os27;
    const p29 = peruntukanPerFasaTotal.os29 - progTotals.belanja.os29;
    const grand = peruntukanPerFasaTotal.grand - progTotals.belanja.grand;
    return { os21: p21, os24: p24, os27: p27, os29: p29, grand };
  }, [peruntukanPerFasaTotal, progTotals.belanja]);

  // Baki = (Jumlah Penjimatan Program) - (Jumlah dalam page Subwaran)
  const bakiAkhir = useMemo(() => {
    const b21 = penjimatanFromPages.os21 - subwaranTotal.os21;
    const b24 = penjimatanFromPages.os24 - subwaranTotal.os24;
    const b27 = penjimatanFromPages.os27 - subwaranTotal.os27;
    const b29 = penjimatanFromPages.os29 - subwaranTotal.os29;
    const grand = penjimatanFromPages.grand - subwaranTotal.grand;
    return { os21: b21, os24: b24, os27: b27, os29: b29, grand };
  }, [penjimatanFromPages, subwaranTotal]);

  return (
    <div className="bg-white border border-slate-300 rounded-xl shadow-xs overflow-hidden mb-8 transition-all hover:border-slate-400">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-blue-600/30 border border-blue-400/40 text-blue-300 px-2 py-0.5 rounded font-mono font-bold uppercase">
                Bahagian {bahagianIndex}
              </span>
              <h3 className="text-base font-bold text-white uppercase tracking-wider">
                BAKI PERUNTUKAN (PERUNTUKAN − PERBELANJAAN − SUBWARAN)
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
              Baki Bersih Akhir
            </span>
            <span
              className={`text-sm font-bold font-mono ${
                bakiAkhir.grand >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatRMWithPrefix(bakiAkhir.grand)}
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
        <div className="p-6 space-y-8">
          {/* =================================================================
              SUB-SECTION 1.1: BAKI PERUNTUKAN PROGRAM (3 BARIS PER PROGRAM)
             ================================================================= */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                  <span>Bahagian {bahagianIndex}.1: BAKI PERUNTUKAN PROGRAM (STATUS: SELESAI &amp; TANGGUNG)</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Perbandingan 3 baris serentak bagi setiap program: PERUNTUKAN DITERIMA, BELANJA SEBENAR, dan PENJIMATAN (OS).
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-500">
                <span>{relevantPrograms.length} aktiviti selesai &amp; tanggung</span>
              </div>
            </div>

            {relevantPrograms.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-xs">
                Tiada rekod program berstatus SELESAI atau TANGGUNG di bawah sumber kewangan <strong>{sumberKewangan}</strong>.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <th className="py-2.5 px-3 w-12 text-center">BIL.</th>
                      <th className="py-2.5 px-3 w-28 font-mono">KOD PROGRAM</th>
                      <th className="py-2.5 px-4 min-w-[220px]">NAMA PROGRAM</th>
                      <th className="py-2.5 px-3 min-w-[170px]">PERUNTUKAN / STATUS</th>
                      <th className="py-2.5 px-3 w-32 text-right">OS21000: AUTOFILL</th>
                      <th className="py-2.5 px-3 w-32 text-right">OS24000: AUTOFILL</th>
                      <th className="py-2.5 px-3 w-32 text-right">OS27000: AUTOFILL</th>
                      <th className="py-2.5 px-3 w-32 text-right">OS29000: AUTOFILL</th>
                      <th className="py-2.5 px-4 w-36 text-right bg-slate-200/60 font-bold text-slate-900">
                        JUMLAH (RM)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {relevantPrograms.map((prog, idx) => {
                      const d21 = Number(prog.os21000) || 0;
                      const d24 = Number(prog.os24000) || 0;
                      const d27 = Number(prog.os27000) || 0;
                      const d29 = Number(prog.os29000) || 0;
                      const dSum = Number(prog.jumlahRm) || (d21 + d24 + d27 + d29);

                      const b21 = Number(prog.os21000Belanja) || 0;
                      const b24 = Number(prog.os24000Belanja) || 0;
                      const b27 = Number(prog.os27000Belanja) || 0;
                      const b29 = Number(prog.os29000Belanja) || 0;
                      const bSum = prog.jumlahBelanjaRm !== undefined ? Number(prog.jumlahBelanjaRm) : (b21 + b24 + b27 + b29);

                      const p21 = prog.os21000Penjimatan !== undefined ? Number(prog.os21000Penjimatan) : (d21 - b21);
                      const p24 = prog.os24000Penjimatan !== undefined ? Number(prog.os24000Penjimatan) : (d24 - b24);
                      const p27 = prog.os27000Penjimatan !== undefined ? Number(prog.os27000Penjimatan) : (d27 - b27);
                      const p29 = prog.os29000Penjimatan !== undefined ? Number(prog.os29000Penjimatan) : (d29 - b29);
                      const pSum = prog.jumlahPenjimatanRm !== undefined ? Number(prog.jumlahPenjimatanRm) : (dSum - bSum);

                      return (
                        <React.Fragment key={prog.id}>
                          {/* Row 1: PERUNTUKAN DITERIMA */}
                          <tr className="border-t border-slate-200 hover:bg-slate-50/60 transition-colors">
                            <td rowSpan={3} className="py-3 px-3 text-center font-mono font-bold text-slate-600 border-r border-slate-200 bg-slate-50/40">
                              {idx + 1}.
                            </td>
                            <td rowSpan={3} className="py-3 px-3 font-mono font-bold text-slate-800 border-r border-slate-200 bg-slate-50/40">
                              {prog.kodProgram}
                            </td>
                            <td rowSpan={3} className="py-3 px-4 border-r border-slate-200 bg-slate-50/40">
                              <button
                                onClick={() => viewProgramDetail(prog)}
                                className="font-bold text-slate-900 hover:text-blue-600 uppercase text-left transition-colors flex items-center gap-1 group cursor-pointer"
                                title="Lihat Perincian Maklumat Lengkap Program"
                              >
                                <span>{prog.namaProgram}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 shrink-0" />
                              </button>
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                {prog.jabatan} · {prog.statusProgram}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[11px] font-semibold text-slate-700 bg-sky-50/50">
                              PERUNTUKAN DITERIMA
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 bg-sky-50/30">
                              {formatRM(d21)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 bg-sky-50/30">
                              {formatRM(d24)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 bg-sky-50/30">
                              {formatRM(d27)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 bg-sky-50/30">
                              {formatRM(d29)}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-semibold text-sky-950 bg-sky-100/60">
                              {formatRMWithPrefix(dSum)}
                            </td>
                          </tr>

                          {/* Row 2: BELANJA SEBENAR */}
                          <tr className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                            <td className="py-2 px-3 text-[11px] font-semibold text-teal-800 bg-teal-50/50">
                              BELANJA SEBENAR
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-teal-900 bg-teal-50/30">
                              {formatRM(b21)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-teal-900 bg-teal-50/30">
                              {formatRM(b24)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-teal-900 bg-teal-50/30">
                              {formatRM(b27)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-teal-900 bg-teal-50/30">
                              {formatRM(b29)}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-semibold text-teal-950 bg-teal-100/60">
                              {formatRMWithPrefix(bSum)}
                            </td>
                          </tr>

                          {/* Row 3: PENJIMATAN (OS) - BOLD SEMUA FONT BARIS INI */}
                          <tr className="border-t border-slate-200 border-b-2 border-slate-300 bg-amber-50/70 text-amber-950 font-bold hover:bg-amber-100/70 transition-colors">
                            <td className="py-2 px-3 text-[11px] font-black uppercase tracking-wider text-amber-900">
                              PENJIMATAN (OS)
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-950">
                              {formatRM(p21)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-950">
                              {formatRM(p24)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-950">
                              {formatRM(p27)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-950">
                              {formatRM(p29)}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-black text-amber-950 bg-amber-200/70">
                              {formatRMWithPrefix(pSum)}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {/* Ringkasan Penjimatan Program Footer */}
                    <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-800 text-xs">
                      <td colSpan={4} className="py-3.5 px-4 uppercase tracking-wider text-right">
                        JUMLAH KESELURUHAN PENJIMATAN PROGRAM:
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                        {formatRMWithPrefix(progTotals.penjimatan.os21)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                        {formatRMWithPrefix(progTotals.penjimatan.os24)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                        {formatRMWithPrefix(progTotals.penjimatan.os27)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                        {formatRMWithPrefix(progTotals.penjimatan.os29)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-300 bg-slate-950 text-sm">
                        {formatRMWithPrefix(progTotals.penjimatan.grand)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Kotak Perbandingan Side-by-Side (Sesuai Arahan Pengguna) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-4 h-4 text-blue-600" />
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Perbandingan Jumlah Side-by-Side (Berdasarkan Maklumat Lengkap Program)
                </h5>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse bg-white rounded-lg border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                      <th className="py-2.5 px-3">KATEGORI PERUNTUKAN</th>
                      <th className="py-2.5 px-3 text-right">OS21000</th>
                      <th className="py-2.5 px-3 text-right">OS24000</th>
                      <th className="py-2.5 px-3 text-right">OS27000</th>
                      <th className="py-2.5 px-3 text-right">OS29000</th>
                      <th className="py-2.5 px-4 text-right bg-slate-200/50 font-bold">JUMLAH BESAR (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-700">
                        Jumlah PERUNTUKAN DITERIMA Program
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {formatRMWithPrefix(progTotals.diterima.os21)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {formatRMWithPrefix(progTotals.diterima.os24)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {formatRMWithPrefix(progTotals.diterima.os27)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {formatRMWithPrefix(progTotals.diterima.os29)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50">
                        {formatRMWithPrefix(progTotals.diterima.grand)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-teal-800">
                        Jumlah BELANJA SEBENAR (OS) Program
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-teal-900">
                        {formatRMWithPrefix(progTotals.belanja.os21)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-teal-900">
                        {formatRMWithPrefix(progTotals.belanja.os24)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-teal-900">
                        {formatRMWithPrefix(progTotals.belanja.os27)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-teal-900">
                        {formatRMWithPrefix(progTotals.belanja.os29)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-teal-950 bg-teal-50">
                        {formatRMWithPrefix(progTotals.belanja.grand)}
                      </td>
                    </tr>
                    <tr className="bg-amber-50/80 font-bold text-amber-950">
                      <td className="py-2.5 px-3 font-black text-amber-900 uppercase">
                        Jumlah PENJIMATAN (OS) Program
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-950">
                        {formatRMWithPrefix(progTotals.penjimatan.os21)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-950">
                        {formatRMWithPrefix(progTotals.penjimatan.os24)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-950">
                        {formatRMWithPrefix(progTotals.penjimatan.os27)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-950">
                        {formatRMWithPrefix(progTotals.penjimatan.os29)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-amber-950 bg-amber-200/80">
                        {formatRMWithPrefix(progTotals.penjimatan.grand)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* =================================================================
              SUB-SECTION 1.2: BAKI PERUNTUKAN PROGRAM (STATUS: DALAM TINDAKAN, BELUM AMBIL TINDAKAN & BATAL)
             ================================================================= */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-500 inline-block" />
                  <span>
                    Bahagian {bahagianIndex}.2: BAKI PERUNTUKAN PROGRAM (STATUS: DALAM TINDAKAN, BELUM AMBIL TINDAKAN &amp; BATAL)
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Program belum tanggung atau selesai lagi. Nilai BELANJA SEBENAR (OS) dan PENJIMATAN (OS) adalah RM 0.00 secara lalai.
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-500">
                <span>{pendingPrograms.length} aktiviti belum selesai / batal</span>
              </div>
            </div>

            {pendingPrograms.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200 text-slate-500 text-xs">
                Tiada rekod program berstatus DALAM TINDAKAN, BELUM AMBIL TINDAKAN atau BATAL di bawah sumber kewangan <strong>{sumberKewangan}</strong>.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <th className="py-2.5 px-3 w-12 text-center">BIL.</th>
                      <th className="py-2.5 px-3 w-28 font-mono">KOD PROGRAM</th>
                      <th className="py-2.5 px-4 min-w-[220px]">NAMA PROGRAM</th>
                      <th className="py-2.5 px-3 min-w-[170px]">PERUNTUKAN / STATUS</th>
                      <th className="py-2.5 px-3 w-32 text-right">OS21000: AUTOFILL</th>
                      <th className="py-2.5 px-3 w-32 text-right">OS24000: AUTOFILL</th>
                      <th className="py-2.5 px-3 w-32 text-right">OS27000: AUTOFILL</th>
                      <th className="py-2.5 px-3 w-32 text-right">OS29000: AUTOFILL</th>
                      <th className="py-2.5 px-4 w-36 text-right bg-slate-200/60 font-bold text-slate-900">
                        JUMLAH (RM)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingPrograms.map((prog, idx) => {
                      const d21 = Number(prog.os21000) || 0;
                      const d24 = Number(prog.os24000) || 0;
                      const d27 = Number(prog.os27000) || 0;
                      const d29 = Number(prog.os29000) || 0;
                      const dSum = Number(prog.jumlahRm) || (d21 + d24 + d27 + d29);

                      return (
                        <React.Fragment key={prog.id}>
                          {/* Row 1: PERUNTUKAN DITERIMA */}
                          <tr className="border-t border-slate-200 hover:bg-slate-50/60 transition-colors">
                            <td rowSpan={3} className="py-3 px-3 text-center font-mono font-bold text-slate-600 border-r border-slate-200 bg-slate-50/40">
                              {idx + 1}.
                            </td>
                            <td rowSpan={3} className="py-3 px-3 font-mono font-bold text-slate-800 border-r border-slate-200 bg-slate-50/40">
                              {prog.kodProgram}
                            </td>
                            <td rowSpan={3} className="py-3 px-4 border-r border-slate-200 bg-slate-50/40">
                              <button
                                onClick={() => viewProgramDetail(prog)}
                                className="font-bold text-slate-900 hover:text-blue-600 uppercase text-left transition-colors flex items-center gap-1 group cursor-pointer"
                                title="Lihat Perincian Maklumat Lengkap Program"
                              >
                                <span>{prog.namaProgram}</span>
                                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 shrink-0" />
                              </button>
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                {prog.jabatan} · <strong className="text-slate-700">{prog.statusProgram}</strong>
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[11px] font-semibold text-slate-700 bg-sky-50/50">
                              PERUNTUKAN DITERIMA
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 bg-sky-50/30">
                              {formatRM(d21)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 bg-sky-50/30">
                              {formatRM(d24)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 bg-sky-50/30">
                              {formatRM(d27)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-700 bg-sky-50/30">
                              {formatRM(d29)}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-semibold text-sky-950 bg-sky-100/60">
                              {formatRMWithPrefix(dSum)}
                            </td>
                          </tr>

                          {/* Row 2: BELANJA SEBENAR (0.00 by default) */}
                          <tr className="border-t border-slate-100 hover:bg-slate-50/60 transition-colors">
                            <td className="py-2 px-3 text-[11px] font-semibold text-slate-600 bg-slate-50/50">
                              BELANJA SEBENAR
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500 bg-slate-50/30">
                              {formatRM(0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500 bg-slate-50/30">
                              {formatRM(0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500 bg-slate-50/30">
                              {formatRM(0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-slate-500 bg-slate-50/30">
                              {formatRM(0)}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-semibold text-slate-700 bg-slate-100/60">
                              {formatRMWithPrefix(0)}
                            </td>
                          </tr>

                          {/* Row 3: PENJIMATAN (OS) - (0.00 by default, BOLD SEMUA FONT) */}
                          <tr className="border-t border-slate-200 border-b-2 border-slate-300 bg-amber-50/70 text-amber-950 font-bold hover:bg-amber-100/70 transition-colors">
                            <td className="py-2 px-3 text-[11px] font-black uppercase tracking-wider text-amber-900">
                              PENJIMATAN (OS)
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-950">
                              {formatRM(0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-950">
                              {formatRM(0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-950">
                              {formatRM(0)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-amber-950">
                              {formatRM(0)}
                            </td>
                            <td className="py-2 px-4 text-right font-mono font-black text-amber-950 bg-amber-200/70">
                              {formatRMWithPrefix(0)}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-white font-bold border-t-2 border-slate-800 text-xs">
                      <td colSpan={4} className="py-3.5 px-4 uppercase tracking-wider text-right">
                        JUMLAH KESELURUHAN PENJIMATAN PROGRAM:
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-300">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-amber-300 bg-slate-950 text-sm">
                        {formatRMWithPrefix(0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Kotak Perbandingan Side-by-Side (DALAM TINDAKAN, BELUM AMBIL TINDAKAN & BATAL) */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-3">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-4 h-4 text-slate-600" />
                <h5 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Perbandingan Jumlah Side-by-Side (Program Belum Selesai / Batal)
                </h5>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse bg-white rounded-lg border border-slate-200">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase text-[11px] border-b border-slate-200">
                      <th className="py-2.5 px-3">KATEGORI PERUNTUKAN</th>
                      <th className="py-2.5 px-3 text-right">OS21000</th>
                      <th className="py-2.5 px-3 text-right">OS24000</th>
                      <th className="py-2.5 px-3 text-right">OS27000</th>
                      <th className="py-2.5 px-3 text-right">OS29000</th>
                      <th className="py-2.5 px-4 text-right bg-slate-200/50 font-bold">JUMLAH BESAR (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-700">
                        Jumlah PERUNTUKAN DITERIMA Program
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {formatRMWithPrefix(pendingTotals.diterima.os21)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {formatRMWithPrefix(pendingTotals.diterima.os24)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {formatRMWithPrefix(pendingTotals.diterima.os27)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-800">
                        {formatRMWithPrefix(pendingTotals.diterima.os29)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-900 bg-slate-50">
                        {formatRMWithPrefix(pendingTotals.diterima.grand)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 font-semibold text-slate-500">
                        Jumlah BELANJA SEBENAR (OS) Program
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-500">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-2 px-4 text-right font-mono font-bold text-slate-600 bg-slate-50">
                        {formatRMWithPrefix(0)}
                      </td>
                    </tr>
                    <tr className="bg-amber-50/80 font-bold text-amber-950">
                      <td className="py-2.5 px-3 font-black text-amber-900 uppercase">
                        Jumlah PENJIMATAN (OS) Program
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-950">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-950">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-950">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-950">
                        {formatRMWithPrefix(0)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-black text-amber-950 bg-amber-200/80">
                        {formatRMWithPrefix(0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* =================================================================
              SUB-SECTION 1.3: SUBWARAN & JUMLAH KESELURUHAN BAKI
             ================================================================= */}
          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>Bahagian {bahagianIndex}.3: SUBWARAN &amp; PENGIRAAN BAKI BERSIH</span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Formula: <strong>JUMLAH KESELURUHAN BAKI = (JUMLAH KESELURUHAN PENJIMATAN PROGRAM) − (Jumlah dalam page Subwaran)</strong>
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-500">
                <span>{subwaranTotal.items.length} agihan subwaran berdaftar</span>
              </div>
            </div>

            {/* Jadual Subwaran Ringkas */}
            {subwaranTotal.items.length > 0 && (
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                      <th className="py-2.5 px-3 w-12 text-center">BIL</th>
                      <th className="py-2.5 px-3">NAMA PTJ</th>
                      <th className="py-2.5 px-3">TARIKH SUB WARAN</th>
                      <th className="py-2.5 px-3">NAMA PROGRAM</th>
                      <th className="py-2.5 px-3 text-right">OS21000</th>
                      <th className="py-2.5 px-3 text-right">OS24000</th>
                      <th className="py-2.5 px-3 text-right">OS27000</th>
                      <th className="py-2.5 px-3 text-right">OS29000</th>
                      <th className="py-2.5 px-4 text-right bg-amber-50/70 font-bold">JUMLAH (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subwaranTotal.items.map((sub, idx) => (
                      <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 text-center font-mono text-slate-500">{idx + 1}.</td>
                        <td className="py-2 px-3 font-bold text-slate-900">{sub.namaPtj} {sub.ptjLain ? `(${sub.ptjLain})` : ''}</td>
                        <td className="py-2 px-3 font-mono text-slate-700">{sub.tarikhSubWaran || '-'}</td>
                        <td className="py-2 px-3 text-slate-800 line-clamp-1">{sub.namaProgram}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">{formatRM(sub.os21000)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">{formatRM(sub.os24000)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">{formatRM(sub.os27000)}</td>
                        <td className="py-2 px-3 text-right font-mono text-slate-800">{formatRM(sub.os29000)}</td>
                        <td className="py-2 px-4 text-right font-mono font-bold text-amber-950 bg-amber-50/50">
                          {formatRMWithPrefix(sub.jumlah)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-bold text-xs">
                      <td colSpan={4} className="py-2.5 px-3 uppercase text-right">
                        Jumlah Subwaran bagi Sumber Kewangan Ini:
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-300">{formatRMWithPrefix(subwaranTotal.os21)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-300">{formatRMWithPrefix(subwaranTotal.os24)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-300">{formatRMWithPrefix(subwaranTotal.os27)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-300">{formatRMWithPrefix(subwaranTotal.os29)}</td>
                      <td className="py-2.5 px-4 text-right font-mono text-amber-300 bg-slate-900">
                        {formatRMWithPrefix(subwaranTotal.grand)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* KOTAK RUMUSAN BAKI AKHIR KESELURUHAN (PERUNTUKAN − PERBELANJAAN − SUBWARAN) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border-2 border-slate-700 text-white rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
                    <Scale className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="text-sm font-bold uppercase tracking-wider text-white">
                      RUMUSAN BAKI PERUNTUKAN: {sumberKewangan}
                    </h5>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      (Jumlah Penjimatan Program) − (Jumlah dalam page Subwaran)
                    </p>
                  </div>
                </div>

                <div className="bg-slate-800 border border-slate-600 px-4 py-1.5 rounded-lg text-right">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                    Baki Keseluruhan Bersih
                  </span>
                  <span
                    className={`text-base font-bold font-mono ${
                      bakiAkhir.grand >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatRMWithPrefix(bakiAkhir.grand)}
                  </span>
                </div>
              </div>

              {/* Table Rumusan Baki Akhir Pecahan OS */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800/80 text-slate-300 uppercase text-[10px] tracking-wider border-b border-slate-700">
                      <th className="py-2.5 px-3">KOMPONEN PENGIRAAN</th>
                      <th className="py-2.5 px-3 text-right">OS21000</th>
                      <th className="py-2.5 px-3 text-right">OS24000</th>
                      <th className="py-2.5 px-3 text-right">OS27000</th>
                      <th className="py-2.5 px-3 text-right">OS29000</th>
                      <th className="py-2.5 px-4 text-right bg-slate-800 text-white font-bold">JUMLAH BESAR (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300">
                        (+) Jumlah Penjimatan Program
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-semibold">
                        {formatRMWithPrefix(progTotals.penjimatan.os21)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-semibold">
                        {formatRMWithPrefix(progTotals.penjimatan.os24)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-semibold">
                        {formatRMWithPrefix(progTotals.penjimatan.os27)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-semibold">
                        {formatRMWithPrefix(progTotals.penjimatan.os29)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-300 bg-slate-800/60">
                        {formatRMWithPrefix(progTotals.penjimatan.grand)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2.5 px-3 text-slate-300">
                        (−) Jumlah Disubwaran (Page Subwaran)
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatRMWithPrefix(subwaranTotal.os21)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatRMWithPrefix(subwaranTotal.os24)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatRMWithPrefix(subwaranTotal.os27)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                        {formatRMWithPrefix(subwaranTotal.os29)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-300 bg-slate-800/60">
                        {formatRMWithPrefix(subwaranTotal.grand)}
                      </td>
                    </tr>
                    <tr className="bg-slate-800 text-white font-bold border-t border-slate-700">
                      <td className="py-3 px-3 uppercase tracking-wider text-emerald-400 font-black">
                        (=) JUMLAH KESELURUHAN BAKI:
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-300 font-bold">
                        {formatRMWithPrefix(bakiAkhir.os21)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-300 font-bold">
                        {formatRMWithPrefix(bakiAkhir.os24)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-300 font-bold">
                        {formatRMWithPrefix(bakiAkhir.os27)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-300 font-bold">
                        {formatRMWithPrefix(bakiAkhir.os29)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-300 bg-slate-950 text-sm">
                        {formatRMWithPrefix(bakiAkhir.grand)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const BakiPeruntukanPage: React.FC = () => {
  const {
    currentUser,
    pegawaiList,
    setActiveTab,
    sumberKewanganList,
    programs,
    fasaPeruntukanList,
    subwaranList,
    viewProgramDetail,
  } = useProgramContext();

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const canAccess = isSuperAdmin || (currentUser?.role === 'ADMIN' && currentUser.allowedPages?.includes('BAKI PERUNTUKAN'));

  // SECTION 1: BAKI PERUNTUKAN KESELURUHAN (PERUNTUKAN − PERBELANJAAN − SUBWARAN)
  const keseluruhanAnalysis = useMemo(() => {
    // 1. Peruntukan per Sumber Kewangan from all Fasa
    const peruntukanBySk: Record<
      string,
      { os21: number; os24: number; os27: number; os29: number; grand: number }
    > = {};

    sumberKewanganList.forEach((sk) => {
      let p21 = 0, p24 = 0, p27 = 0, p29 = 0;
      fasaPeruntukanList.forEach((fasa) => {
        const alloc = fasa.allocations?.[sk];
        if (alloc) {
          p21 += Number(alloc.os21000) || 0;
          p24 += Number(alloc.os24000) || 0;
          p27 += Number(alloc.os27000) || 0;
          p29 += Number(alloc.os29000) || 0;
        }
      });
      peruntukanBySk[sk] = {
        os21: p21,
        os24: p24,
        os27: p27,
        os29: p29,
        grand: p21 + p24 + p27 + p29,
      };
    });

    // 2. Perbelanjaan per Sumber Kewangan (from programs berstatus SELESAI & TANGGUNG)
    const belanjaBySk: Record<
      string,
      { os21: number; os24: number; os27: number; os29: number; grand: number; count: number }
    > = {};

    sumberKewanganList.forEach((sk) => {
      let b21 = 0, b24 = 0, b27 = 0, b29 = 0, count = 0;
      programs.forEach((prog) => {
        if (prog.sumberKewangan === sk) {
          const status = (prog.statusProgram || '').trim().toUpperCase();
          if (status === 'SELESAI' || status === 'TANGGUNG') {
            b21 += Number(prog.os21000Belanja) || 0;
            b24 += Number(prog.os24000Belanja) || 0;
            b27 += Number(prog.os27000Belanja) || 0;
            b29 += Number(prog.os29000Belanja) || 0;
            count++;
          }
        }
      });
      belanjaBySk[sk] = {
        os21: b21,
        os24: b24,
        os27: b27,
        os29: b29,
        grand: b21 + b24 + b27 + b29,
        count,
      };
    });

    // 3. Subwaran per Sumber Kewangan
    const subwaranBySk: Record<
      string,
      { os21: number; os24: number; os27: number; os29: number; grand: number; items: any[] }
    > = {};

    sumberKewanganList.forEach((sk) => {
      let s21 = 0, s24 = 0, s27 = 0, s29 = 0;
      const items: any[] = [];
      subwaranList.forEach((sub) => {
        if (sub.sumberKewangan === sk) {
          s21 += Number(sub.os21000) || 0;
          s24 += Number(sub.os24000) || 0;
          s27 += Number(sub.os27000) || 0;
          s29 += Number(sub.os29000) || 0;
          items.push(sub);
        }
      });
      subwaranBySk[sk] = {
        os21: s21,
        os24: s24,
        os27: s27,
        os29: s29,
        grand: s21 + s24 + s27 + s29,
        items,
      };
    });

    // 4. Combined calculations per Sumber Kewangan:
    // Penjimatan = Peruntukan - Belanja
    // Baki = Penjimatan - Subwaran
    const summaryBySk: Record<
      string,
      {
        peruntukan: { os21: number; os24: number; os27: number; os29: number; grand: number };
        belanja: { os21: number; os24: number; os27: number; os29: number; grand: number };
        penjimatan: { os21: number; os24: number; os27: number; os29: number; grand: number };
        subwaran: { os21: number; os24: number; os27: number; os29: number; grand: number };
        baki: { os21: number; os24: number; os27: number; os29: number; grand: number };
      }
    > = {};

    let totalPeruntukanGrand = 0;
    let totalBelanjaGrand = 0;
    let totalPenjimatanGrand = 0;
    let totalSubwaranGrand = 0;
    let totalBakiGrand = 0;

    sumberKewanganList.forEach((sk) => {
      const per = peruntukanBySk[sk] || { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0 };
      const bel = belanjaBySk[sk] || { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0 };
      const sub = subwaranBySk[sk] || { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0, items: [] };

      const pen21 = per.os21 - bel.os21;
      const pen24 = per.os24 - bel.os24;
      const pen27 = per.os27 - bel.os27;
      const pen29 = per.os29 - bel.os29;
      const penGrand = per.grand - bel.grand;

      const bak21 = pen21 - sub.os21;
      const bak24 = pen24 - sub.os24;
      const bak27 = pen27 - sub.os27;
      const bak29 = pen29 - sub.os29;
      const bakGrand = penGrand - sub.grand;

      summaryBySk[sk] = {
        peruntukan: per,
        belanja: bel,
        penjimatan: { os21: pen21, os24: pen24, os27: pen27, os29: pen29, grand: penGrand },
        subwaran: sub,
        baki: { os21: bak21, os24: bak24, os27: bak27, os29: bak29, grand: bakGrand },
      };

      totalPeruntukanGrand += per.grand;
      totalBelanjaGrand += bel.grand;
      totalPenjimatanGrand += penGrand;
      totalSubwaranGrand += sub.grand;
      totalBakiGrand += bakGrand;
    });

    return {
      peruntukanBySk,
      belanjaBySk,
      subwaranBySk,
      summaryBySk,
      grandTotals: {
        peruntukan: totalPeruntukanGrand,
        belanja: totalBelanjaGrand,
        penjimatan: totalPenjimatanGrand,
        subwaran: totalSubwaranGrand,
        baki: totalBakiGrand,
      },
    };
  }, [sumberKewanganList, fasaPeruntukanList, programs, subwaranList]);

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
            Pemantauan Baki Peruntukan Kewangan (IAB)
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto mt-2 leading-relaxed">
            Halaman ini hanya boleh diakses oleh <strong>Super Admin (Kuasa Penuh)</strong> bagi
            memantau penjimatan program, agihan subwaran, dan baki akhir peruntukan Kementerian.
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
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Portal Pemantauan Baki Peruntukan Kewangan IAB
            </h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Analisis bersepadu: <strong>Peruntukan Fasa − Perbelanjaan Sebenar − Subwaran = Baki Peruntukan Bersih</strong>.
            </p>
          </div>
        </div>

        {/* Quick summary stats */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="bg-slate-800/90 border border-purple-900/60 px-3 py-2 rounded-lg text-right">
            <span className="text-[10px] text-purple-400 font-semibold uppercase block">
              Peruntukan Fasa
            </span>
            <span className="text-sm font-bold text-purple-300 font-mono">
              {formatRMWithPrefix(keseluruhanAnalysis.grandTotals.peruntukan)}
            </span>
          </div>

          <div className="bg-slate-800/90 border border-teal-900/60 px-3 py-2 rounded-lg text-right">
            <span className="text-[10px] text-teal-400 font-semibold uppercase block">
              Belanja Sebenar
            </span>
            <span className="text-sm font-bold text-teal-300 font-mono">
              {formatRMWithPrefix(keseluruhanAnalysis.grandTotals.belanja)}
            </span>
          </div>

          <div className="bg-slate-800/90 border border-amber-900/60 px-3 py-2 rounded-lg text-right">
            <span className="text-[10px] text-amber-400 font-semibold uppercase block">
              Subwaran
            </span>
            <span className="text-sm font-bold text-amber-300 font-mono">
              {formatRMWithPrefix(keseluruhanAnalysis.grandTotals.subwaran)}
            </span>
          </div>

          <div className="bg-slate-800/90 border border-emerald-900/80 px-3 py-2 rounded-lg text-right">
            <span className="text-[10px] text-emerald-400 font-semibold uppercase block">
              Baki Bersih Akhir
            </span>
            <span
              className={`text-base font-bold font-mono ${
                keseluruhanAnalysis.grandTotals.baki >= 0 ? 'text-emerald-300' : 'text-rose-400'
              }`}
            >
              {formatRMWithPrefix(keseluruhanAnalysis.grandTotals.baki)}
            </span>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 1: BAKI PERUNTUKAN KESELURUHAN (PERUNTUKAN − PERBELANJAAN − SUBWARAN)
         ========================================================================= */}
      <div className="bg-white border-2 border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white uppercase tracking-wider">
                  BAKI PERUNTUKAN KESELURUHAN (PERUNTUKAN − PERBELANJAAN − SUBWARAN)
                </h2>
                <span className="text-[10px] bg-blue-400 text-slate-950 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Rumusan Induk
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pengiraan baki peruntukan mengikut Sumber Kewangan: Peruntukan (Page Peruntukan) − Belanja Sebenar (Page Perbelanjaan) = Penjimatan; Penjimatan − Subwaran (Page Subwaran) = Baki.
              </p>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 px-4 py-1.5 rounded-lg text-right">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">
              Baki Keseluruhan
            </span>
            <span className="text-base font-bold text-emerald-300 font-mono">
              {formatRMWithPrefix(keseluruhanAnalysis.grandTotals.baki)}
            </span>
          </div>
        </div>

        {/* Table Keseluruhan Berdasarkan Formula Pengguna */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <th className="py-3 px-3 w-12 text-center">BIL</th>
                <th className="py-3 px-4 min-w-[200px]">SUMBER KEWANGAN (DATA INDUK)</th>
                <th className="py-3 px-3 w-36 text-right">PERUNTUKAN (A)</th>
                <th className="py-3 px-3 w-36 text-right">PERBELANJAAN (B)</th>
                <th className="py-3 px-3 w-40 text-right bg-amber-50/70 text-amber-950 font-bold">
                  PENJIMATAN (A − B)
                </th>
                <th className="py-3 px-3 w-36 text-right">SUBWARAN (C)</th>
                <th className="py-3 px-4 w-44 text-right bg-blue-50/80 text-blue-950 font-black">
                  BAKI BERSIH (PENJIMATAN − C)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sumberKewanganList.map((sk, index) => {
                const s = keseluruhanAnalysis.summaryBySk[sk] || {
                  peruntukan: { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0 },
                  belanja: { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0 },
                  penjimatan: { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0 },
                  subwaran: { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0 },
                  baki: { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0 },
                };

                return (
                  <tr key={sk} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 text-center font-mono font-semibold text-slate-500">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 uppercase block">
                        {sk}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Sumber Kewangan {index + 1}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-purple-900">
                      {formatRMWithPrefix(s.peruntukan.grand)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-teal-900">
                      {formatRMWithPrefix(s.belanja.grand)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-amber-950 bg-amber-50/40">
                      {formatRMWithPrefix(s.penjimatan.grand)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700">
                      {formatRMWithPrefix(s.subwaran.grand)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-black text-blue-950 bg-blue-50/40 text-xs">
                      {formatRMWithPrefix(s.baki.grand)}
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
                <td className="py-4 px-3 text-right font-mono text-purple-300">
                  {formatRMWithPrefix(keseluruhanAnalysis.grandTotals.peruntukan)}
                </td>
                <td className="py-4 px-3 text-right font-mono text-teal-300">
                  {formatRMWithPrefix(keseluruhanAnalysis.grandTotals.belanja)}
                </td>
                <td className="py-4 px-3 text-right font-mono text-amber-300 bg-slate-950">
                  {formatRMWithPrefix(keseluruhanAnalysis.grandTotals.penjimatan)}
                </td>
                <td className="py-4 px-3 text-right font-mono text-slate-300">
                  {formatRMWithPrefix(keseluruhanAnalysis.grandTotals.subwaran)}
                </td>
                <td className="py-4 px-4 text-right font-mono text-emerald-300 bg-slate-950 text-sm">
                  {formatRMWithPrefix(keseluruhanAnalysis.grandTotals.baki)}
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
              <span>Perincian Baki Peruntukan Mengikut Sumber Kewangan</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pecahan terperinci perbandingan PERUNTUKAN DITERIMA, BELANJA SEBENAR, dan PENJIMATAN (OS) bagi setiap aktiviti program serta agihan Subwaran.
            </p>
          </div>
        </div>

        {sumberKewanganList.map((sk, idx) => (
          <BahagianBakiCard
            key={sk}
            bahagianIndex={idx + 1}
            sumberKewangan={sk}
            programs={programs}
            peruntukanPerFasaTotal={
              keseluruhanAnalysis.peruntukanBySk[sk] || { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0 }
            }
            subwaranTotal={
              keseluruhanAnalysis.subwaranBySk[sk] || { os21: 0, os24: 0, os27: 0, os29: 0, grand: 0, items: [] }
            }
            viewProgramDetail={viewProgramDetail}
          />
        ))}
      </div>
    </div>
  );
};
