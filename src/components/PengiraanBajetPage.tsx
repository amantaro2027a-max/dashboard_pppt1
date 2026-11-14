import React, { useState, useEffect, useMemo } from 'react';
import { useProgramContext, DEFAULT_BUDGET_RATES } from '../context/ProgramContext';
import { BudgetRatesConfig } from '../types/program';
import { formatRM } from '../utils/formatters';
import {
  RotateCcw,
  Lock,
  Unlock,
  Save,
  CheckCircle2,
  Printer,
  Download,
  Calculator,
  Building,
} from 'lucide-react';
import * as XLSX from 'xlsx';

type MakanKey = keyof BudgetRatesConfig['makanMinum'];
type DobiKey = keyof BudgetRatesConfig['dobi'];

interface MakanInputRow {
  key: MakanKey;
  label: string;
  peserta: number;
  bilHari: number;
}

interface DobiInputRow {
  key: DobiKey;
  label: string;
  peserta: number;
}

const DEFAULT_MAKAN_INPUTS: Record<MakanKey, { peserta: number; bilHari: number }> = {
  sarapan: { peserta: 30, bilHari: 2 },
  minumPagi: { peserta: 30, bilHari: 2 },
  lunch: { peserta: 30, bilHari: 2 },
  minumPetang: { peserta: 30, bilHari: 2 },
  dinner: { peserta: 30, bilHari: 2 },
};

const DEFAULT_DOBI_INPUTS: Record<DobiKey, number> = {
  inapanIabi: 0,
  bestari: 15,
  eksekutif: 15,
  iabcu: 0,
  iabcswk: 0,
  iabcsbh: 0,
};

const DEFAULT_HOTEL_INPUTS = {
  bajet: 17500,
  single: { rate: 250, peserta: 10, hari: 2 },
  double: { rate: 200, peserta: 20, hari: 2 },
};

const STORAGE_LOCAL_CALC = 'pppt_pengiraan_bajet_inputs_v1';

const formatRMNoSpace = (val: number): string => `RM${formatRM(val)}`;

export const PengiraanBajetPage: React.FC = () => {
  const { currentUser, budgetRates, updateBudgetRates } = useProgramContext();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  // Local editable unit-rate draft for Super Admin
  const [rateDraft, setRateDraft] = useState<BudgetRatesConfig>(budgetRates);
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setRateDraft(budgetRates);
  }, [budgetRates]);

  // Yellow-cell inputs (editable by any user / pelawat / admin / super admin)
  const [makanInputs, setMakanInputs] = useState<Record<MakanKey, { peserta: number; bilHari: number }>>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_LOCAL_CALC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.makanInputs) return { ...DEFAULT_MAKAN_INPUTS, ...parsed.makanInputs };
      }
    } catch {}
    return DEFAULT_MAKAN_INPUTS;
  });

  const [dobiInputs, setDobiInputs] = useState<Record<DobiKey, number>>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_LOCAL_CALC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.dobiInputs) return { ...DEFAULT_DOBI_INPUTS, ...parsed.dobiInputs };
      }
    } catch {}
    return DEFAULT_DOBI_INPUTS;
  });

  const [hotelInputs, setHotelInputs] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_LOCAL_CALC);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.hotelInputs) {
          return {
            bajet: parsed.hotelInputs.bajet ?? DEFAULT_HOTEL_INPUTS.bajet,
            single: { ...DEFAULT_HOTEL_INPUTS.single, ...(parsed.hotelInputs.single || {}) },
            double: { ...DEFAULT_HOTEL_INPUTS.double, ...(parsed.hotelInputs.double || {}) },
          };
        }
      }
    } catch {}
    return DEFAULT_HOTEL_INPUTS;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_LOCAL_CALC,
        JSON.stringify({ makanInputs, dobiInputs, hotelInputs })
      );
    } catch {}
  }, [makanInputs, dobiInputs, hotelInputs]);

  const activeRates = isSuperAdmin ? rateDraft : budgetRates;

  const hasUnsavedRateChanges = useMemo(() => {
    if (!isSuperAdmin) return false;
    return (
      JSON.stringify(rateDraft.makanMinum) !== JSON.stringify(budgetRates.makanMinum) ||
      JSON.stringify(rateDraft.dobi) !== JSON.stringify(budgetRates.dobi)
    );
  }, [isSuperAdmin, rateDraft, budgetRates]);

  // ------------------------------------------------------------------
  // 1. PENGIRAAN BAJET MAKAN MINUM
  // ------------------------------------------------------------------
  const makanRows: Array<MakanInputRow & { rm: number; jumlah: number }> = useMemo(() => {
    const defs: Array<{ key: MakanKey; label: string }> = [
      { key: 'sarapan', label: 'Sarapan' },
      { key: 'minumPagi', label: 'Minum pagi' },
      { key: 'lunch', label: 'Lunch' },
      { key: 'minumPetang', label: 'Minum Petang' },
      { key: 'dinner', label: 'Dinner' },
    ];
    return defs.map((d) => {
      const rm = Number(activeRates.makanMinum[d.key]) || 0;
      const peserta = Number(makanInputs[d.key]?.peserta) || 0;
      const bilHari = Number(makanInputs[d.key]?.bilHari) || 0;
      return {
        key: d.key,
        label: d.label,
        rm,
        peserta,
        bilHari,
        jumlah: rm * peserta * bilHari,
      };
    });
  }, [activeRates, makanInputs]);

  const makanSubtotal = useMemo(
    () => makanRows.reduce((sum, r) => sum + r.jumlah, 0),
    [makanRows]
  );
  const makanSst6Add = makanSubtotal * 0.06;
  const makanSst8Add = makanSubtotal * 0.08;
  const makanTotalSst6 = makanSubtotal + makanSst6Add;
  const makanTotalSst8 = makanSubtotal + makanSst8Add;

  // ------------------------------------------------------------------
  // 2. PENGIRAAN DOBI
  // ------------------------------------------------------------------
  const dobiRows: Array<DobiInputRow & { rm: number; jumlah: number }> = useMemo(() => {
    const defs: Array<{ key: DobiKey; label: string }> = [
      { key: 'inapanIabi', label: 'INAPAN IABI' },
      { key: 'bestari', label: 'BESTARI (IABCGH)' },
      { key: 'eksekutif', label: 'EKSEKUTIF (IABCGH)' },
      { key: 'iabcu', label: 'IABCU' },
      { key: 'iabcswk', label: 'IABCSWK' },
      { key: 'iabcsbh', label: 'IABCSBH' },
    ];
    return defs.map((d) => {
      const rm = Number(activeRates.dobi[d.key]) || 0;
      const peserta = Number(dobiInputs[d.key]) || 0;
      return {
        key: d.key,
        label: d.label,
        rm,
        peserta,
        jumlah: rm * peserta,
      };
    });
  }, [activeRates, dobiInputs]);

  const dobiTotal = useMemo(
    () => dobiRows.reduce((sum, r) => sum + r.jumlah, 0),
    [dobiRows]
  );

  // ------------------------------------------------------------------
  // 3. JUMLAH KESELURUHAN (MAKAN MINUM + DOBI)
  // ------------------------------------------------------------------
  const grandTiadaSst = makanSubtotal + dobiTotal;
  const grandSst6 = makanTotalSst6 + dobiTotal;
  const grandSst8 = makanTotalSst8 + dobiTotal;

  // ------------------------------------------------------------------
  // 4. PAKEJ HOTEL
  // ------------------------------------------------------------------
  const hotelCalc = useMemo(() => {
    const bajet = Number(hotelInputs.bajet) || 0;

    const sAllIn =
      (Number(hotelInputs.single.rate) || 0) *
      (Number(hotelInputs.single.peserta) || 0) *
      (Number(hotelInputs.single.hari) || 0);
    const sSst6Only = sAllIn * 0.06;
    const sSst8Only = sAllIn * 0.08;
    const sSst6Total = sAllIn + sSst6Only;
    const sSst8Total = sAllIn + sSst8Only;

    const dAllIn =
      (Number(hotelInputs.double.rate) || 0) *
      (Number(hotelInputs.double.peserta) || 0) *
      (Number(hotelInputs.double.hari) || 0);
    const dSst6Only = dAllIn * 0.06;
    const dSst8Only = dAllIn * 0.08;
    const dSst6Total = dAllIn + dSst6Only;
    const dSst8Total = dAllIn + dSst8Only;

    const pkgAllIn = sAllIn + dAllIn;
    const pkgSst6 = sSst6Total + dSst6Total;
    const pkgSst8 = sSst8Total + dSst8Total;

    const bakiAllIn = bajet - pkgAllIn;
    const bakiSst6 = bajet - pkgSst6;
    const bakiSst8 = bajet - pkgSst8;

    const sstOnly6 = sSst6Only + dSst6Only;
    const sstOnly8 = sSst8Only + dSst8Only;

    return {
      bajet,
      single: { allIn: sAllIn, sst6: sSst6Total, sst8: sSst8Total, sst6Only: sSst6Only, sst8Only: sSst8Only },
      double: { allIn: dAllIn, sst6: dSst6Total, sst8: dSst8Total, sst6Only: dSst6Only, sst8Only: dSst8Only },
      pkg: { allIn: pkgAllIn, sst6: pkgSst6, sst8: pkgSst8 },
      baki: { allIn: bakiAllIn, sst6: bakiSst6, sst8: bakiSst8 },
      sstOnly: { tanpa: 0, sst6: sstOnly6, sst8: sstOnly8 },
    };
  }, [hotelInputs]);

  // Handlers
  const handleMakanRateChange = (key: MakanKey, val: string) => {
    if (!isSuperAdmin) return;
    const num = Math.max(0, parseFloat(val) || 0);
    setRateDraft((prev) => ({
      ...prev,
      makanMinum: { ...prev.makanMinum, [key]: num },
    }));
  };

  const handleDobiRateChange = (key: DobiKey, val: string) => {
    if (!isSuperAdmin) return;
    const num = Math.max(0, parseFloat(val) || 0);
    setRateDraft((prev) => ({
      ...prev,
      dobi: { ...prev.dobi, [key]: num },
    }));
  };

  const handleSaveRates = () => {
    if (!isSuperAdmin) return;
    const res = updateBudgetRates(rateDraft);
    if (res.success) {
      setSaveNotice({
        type: 'success',
        text: 'Kadar kos seunit (RM) berjaya disimpan dan diselaraskan kepada semua pengguna.',
      });
      setTimeout(() => setSaveNotice(null), 4000);
    } else {
      setSaveNotice({
        type: 'error',
        text: res.message || 'Gagal menyimpan kadar RM seunit.',
      });
    }
  };

  const handleResetRatesToDefault = () => {
    if (!isSuperAdmin) return;
    setRateDraft(DEFAULT_BUDGET_RATES);
    const res = updateBudgetRates(DEFAULT_BUDGET_RATES);
    if (res.success) {
      setSaveNotice({
        type: 'success',
        text: 'Kadar RM seunit telah ditetapkan semula kepada nilai asal.',
      });
      setTimeout(() => setSaveNotice(null), 4000);
    }
  };

  const handleResetYellowInputs = () => {
    setMakanInputs(DEFAULT_MAKAN_INPUTS);
    setDobiInputs(DEFAULT_DOBI_INPUTS);
    setHotelInputs(DEFAULT_HOTEL_INPUTS);
  };

  const handleZeroYellowInputs = () => {
    setMakanInputs({
      sarapan: { peserta: 0, bilHari: 0 },
      minumPagi: { peserta: 0, bilHari: 0 },
      lunch: { peserta: 0, bilHari: 0 },
      minumPetang: { peserta: 0, bilHari: 0 },
      dinner: { peserta: 0, bilHari: 0 },
    });
    setDobiInputs({
      inapanIabi: 0,
      bestari: 0,
      eksekutif: 0,
      iabcu: 0,
      iabcswk: 0,
      iabcsbh: 0,
    });
    setHotelInputs({
      bajet: 0,
      single: { rate: 0, peserta: 0, hari: 0 },
      double: { rate: 0, peserta: 0, hari: 0 },
    });
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const sheet1Rows: (string | number)[][] = [
      ['PENGIRAAN BAJET MAKAN MINUM'],
      ['Kategori', 'RM', 'PESERTA', 'BIL. HARI', 'JUMLAH (RM)'],
      ...makanRows.map((r) => [r.label, r.rm, r.peserta, r.bilHari, Number(r.jumlah.toFixed(2))]),
      ['JUMLAH', '(Tiada SST)', Number(makanSubtotal.toFixed(2)), 'SST (TAMBAH)', ''],
      ['', 'SST 6%', Number(makanTotalSst6.toFixed(2)), Number(makanSst6Add.toFixed(2)), ''],
      ['', 'SST 8%', Number(makanTotalSst8.toFixed(2)), Number(makanSst8Add.toFixed(2)), ''],
      [],
      ['PENGIRAAN DOBI'],
      ['INAPAN', 'RM', 'PESERTA', 'JUMLAH (RM)'],
      ...dobiRows.map((r) => [r.label, r.rm, r.peserta, Number(r.jumlah.toFixed(2))]),
      ['', '', 'JUMLAH', Number(dobiTotal.toFixed(2))],
      [],
      ['JUMLAH KESELURUHAN', 'MAKAN MINUM (RM)', 'DOBI (RM)', 'JUMLAH (RM)'],
      ['(Tiada SST)', Number(makanSubtotal.toFixed(2)), Number(dobiTotal.toFixed(2)), Number(grandTiadaSst.toFixed(2))],
      ['SST 6%', Number(makanTotalSst6.toFixed(2)), Number(dobiTotal.toFixed(2)), Number(grandSst6.toFixed(2))],
      ['SST 8%', Number(makanTotalSst8.toFixed(2)), Number(dobiTotal.toFixed(2)), Number(grandSst8.toFixed(2))],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
    ws1['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Makan Minum & Dobi');

    const sheet2Rows: (string | number)[][] = [
      ['PAKEJ HOTEL'],
      ['BAJET (RM)', Number(hotelCalc.bajet.toFixed(2))],
      [],
      ['BILIK HOTEL', 'RATE PER NIGHT (RM)', 'BIL. PESERTA', 'BIL. HARI'],
      ['Single', hotelInputs.single.rate, hotelInputs.single.peserta, hotelInputs.single.hari],
      ['Double', hotelInputs.double.rate, hotelInputs.double.peserta, hotelInputs.double.hari],
      [],
      ['BILIK HOTEL', 'JUMLAH (ALL-IN)', 'JUMLAH (SST 6%)', 'JUMLAH (SST 8%)'],
      ['Single', Number(hotelCalc.single.allIn.toFixed(2)), Number(hotelCalc.single.sst6.toFixed(2)), Number(hotelCalc.single.sst8.toFixed(2))],
      ['Double', Number(hotelCalc.double.allIn.toFixed(2)), Number(hotelCalc.double.sst6.toFixed(2)), Number(hotelCalc.double.sst8.toFixed(2))],
      ['JUMLAH (PAKEJ)', Number(hotelCalc.pkg.allIn.toFixed(2)), Number(hotelCalc.pkg.sst6.toFixed(2)), Number(hotelCalc.pkg.sst8.toFixed(2))],
      [],
      ['BAKI (BAJET - PAKEJ)', Number(hotelCalc.baki.allIn.toFixed(2)), Number(hotelCalc.baki.sst6.toFixed(2)), Number(hotelCalc.baki.sst8.toFixed(2))],
      [],
      ['BILIK HOTEL', 'TANPA SST', 'SST 6%', 'SST 8%'],
      ['Single', 0, Number(hotelCalc.single.sst6Only.toFixed(2)), Number(hotelCalc.single.sst8Only.toFixed(2))],
      ['Double', 0, Number(hotelCalc.double.sst6Only.toFixed(2)), Number(hotelCalc.double.sst8Only.toFixed(2))],
      ['JUMLAH (SST SAHAJA)', 0, Number(hotelCalc.sstOnly.sst6.toFixed(2)), Number(hotelCalc.sstOnly.sst8.toFixed(2))],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
    ws2['!cols'] = [{ wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Pakej Hotel');

    XLSX.writeFile(wb, `Pengiraan_Bajet_IAB_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Control & Instruction Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#fff200] border border-amber-400 text-slate-900 font-bold">
            <span>Petak Kuning</span>
            <span className="font-normal text-slate-800">= Boleh diisi / disunting oleh semua pengguna</span>
          </div>
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-semibold ${
              isSuperAdmin
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            {isSuperAdmin ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>
              {isSuperAdmin
                ? 'Mod Super Admin: Sel RM (kos seunit) Makan Minum & Dobi boleh disunting'
                : 'Sel RM (kos seunit) Makan Minum & Dobi dikunci (Super Admin sahaja)'}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && (
            <>
              <button
                type="button"
                onClick={handleSaveRates}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  hasUnsavedRateChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Kadar RM (Super Admin)</span>
              </button>
              <button
                type="button"
                onClick={handleResetRatesToDefault}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kadar RM Asal</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleZeroYellowInputs}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <span>Kosongkan (0)</span>
          </button>
          <button
            type="button"
            onClick={handleResetYellowInputs}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Contoh Asal</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Eksport Excel</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0 print:hidden"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {saveNotice && (
        <div
          className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            saveNotice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveNotice.text}</span>
        </div>
      )}

      {/* Main 2-Column Workspace Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* ============================================================ */}
        {/* BAHAGIAN 1: MAKAN MINUM, DOBI & JUMLAH KESELURUHAN (IMAGE 1) */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-black tracking-wide text-slate-900 uppercase">
                Pengiraan Bajet Makan Minum &amp; Dobi
              </h2>
            </div>
            {budgetRates.updatedAt && (
              <span className="text-[11px] text-slate-500">
                Kadar dikemaskini: {budgetRates.updatedAt}
              </span>
            )}
          </div>

          {/* 1A. PENGIRAAN BAJET MAKAN MINUM */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs sm:text-sm tabular-nums">
              <thead>
                <tr>
                  <th
                    colSpan={5}
                    className="border border-black bg-white text-black font-black text-center py-2 px-3 text-sm sm:text-base tracking-wide uppercase"
                  >
                    PENGIRAAN BAJET MAKAN MINUM
                  </th>
                </tr>
                <tr className="bg-[#cccccc] text-black font-bold text-center">
                  <th className="border border-black py-1.5 px-3 w-[160px] bg-white"></th>
                  <th className="border border-black py-1.5 px-2 w-[90px]">RM</th>
                  <th className="border border-black py-1.5 px-2 w-[100px]">PESERTA</th>
                  <th className="border border-black py-1.5 px-2 w-[100px]">BIL. HARI</th>
                  <th className="border border-black py-1.5 px-3 w-[130px]">JUMLAH</th>
                </tr>
              </thead>
              <tbody>
                {makanRows.map((row) => (
                  <tr key={row.key}>
                    <td className="border border-black bg-[#cccccc] text-black font-bold py-1.5 px-3 text-left">
                      {row.label}
                    </td>
                    <td className="border border-black bg-white p-0 text-right">
                      {isSuperAdmin ? (
                        <input
                          type="number"
                          step="0.10"
                          min="0"
                          value={rateDraft.makanMinum[row.key]}
                          onChange={(e) => handleMakanRateChange(row.key, e.target.value)}
                          aria-label={`Kadar RM ${row.label}`}
                          className="w-full h-full py-1.5 px-2 text-right font-semibold text-blue-900 bg-blue-50/50 focus:bg-white focus:outline-2 focus:outline-blue-600 tabular-nums"
                        />
                      ) : (
                        <div className="py-1.5 px-2.5 text-right font-medium text-black">
                          {row.rm.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="border border-black bg-[#ffff00] p-0 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={makanInputs[row.key].peserta}
                        onChange={(e) => {
                          const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setMakanInputs((prev) => ({
                            ...prev,
                            [row.key]: { ...prev[row.key], peserta: v },
                          }));
                        }}
                        aria-label={`Peserta ${row.label}`}
                        className="w-full h-full py-1.5 px-2 text-center font-semibold text-black bg-[#ffff00] focus:outline-2 focus:outline-slate-900 tabular-nums"
                      />
                    </td>
                    <td className="border border-black bg-[#ffff00] p-0 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={makanInputs[row.key].bilHari}
                        onChange={(e) => {
                          const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setMakanInputs((prev) => ({
                            ...prev,
                            [row.key]: { ...prev[row.key], bilHari: v },
                          }));
                        }}
                        aria-label={`Bil Hari ${row.label}`}
                        className="w-full h-full py-1.5 px-2 text-center font-semibold text-black bg-[#ffff00] focus:outline-2 focus:outline-slate-900 tabular-nums"
                      />
                    </td>
                    <td className="border border-black bg-white py-1.5 px-3 text-right font-medium text-black">
                      {formatRMNoSpace(row.jumlah)}
                    </td>
                  </tr>
                ))}

                {/* Summary Rows under Makan Minum (Matching Image 1 exact layout) */}
                <tr>
                  <td colSpan={2} className="py-1.5"></td>
                  <td className="py-1.5 px-2 text-center font-black text-black">JUMLAH</td>
                  <td className="py-1.5 px-2 text-center text-black">(Tiada SST)</td>
                  <td className="py-1.5 px-3 text-right font-black text-black">
                    {formatRMNoSpace(makanSubtotal)}
                  </td>
                  <td className="py-1.5 pl-4 text-left font-black underline text-black whitespace-nowrap">
                    SST (TAMBAH)
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1"></td>
                  <td className="py-1 px-2 text-center text-black">SST 6%</td>
                  <td className="py-1 px-3 text-right font-black text-black">
                    {formatRMNoSpace(makanTotalSst6)}
                  </td>
                  <td className="py-1 pl-4 text-right font-medium text-black whitespace-nowrap">
                    {formatRMNoSpace(makanSst6Add)}
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-1"></td>
                  <td className="py-1 px-2 text-center text-black">SST 8%</td>
                  <td className="py-1 px-3 text-right font-black text-black">
                    {formatRMNoSpace(makanTotalSst8)}
                  </td>
                  <td className="py-1 pl-4 text-right font-medium text-black whitespace-nowrap">
                    {formatRMNoSpace(makanSst8Add)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 1B. PENGIRAAN DOBI */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full max-w-[540px] border-collapse text-xs sm:text-sm tabular-nums">
              <thead>
                <tr>
                  <th
                    colSpan={4}
                    className="border border-black bg-white text-black font-black text-center py-2 px-3 text-sm sm:text-base tracking-wide uppercase"
                  >
                    PENGIRAAN DOBI
                  </th>
                </tr>
                <tr className="bg-[#cccccc] text-black font-bold text-center">
                  <th className="border border-black py-1.5 px-3 text-center w-[200px]">INAPAN</th>
                  <th className="border border-black py-1.5 px-2 w-[90px]">RM</th>
                  <th className="border border-black py-1.5 px-2 w-[100px]">PESERTA</th>
                  <th className="border border-black py-1.5 px-3 w-[130px]">JUMLAH</th>
                </tr>
              </thead>
              <tbody>
                {dobiRows.map((row) => (
                  <tr key={row.key}>
                    <td className="border border-black bg-[#cccccc] text-black font-semibold py-1.5 px-3 text-left">
                      {row.label}
                    </td>
                    <td className="border border-black bg-white p-0 text-right">
                      {isSuperAdmin ? (
                        <input
                          type="number"
                          step="0.10"
                          min="0"
                          value={rateDraft.dobi[row.key]}
                          onChange={(e) => handleDobiRateChange(row.key, e.target.value)}
                          aria-label={`Kadar RM Dobi ${row.label}`}
                          className="w-full h-full py-1.5 px-2 text-right font-semibold text-blue-900 bg-blue-50/50 focus:bg-white focus:outline-2 focus:outline-blue-600 tabular-nums"
                        />
                      ) : (
                        <div className="py-1.5 px-2.5 text-right font-medium text-black">
                          {row.rm.toFixed(2)}
                        </div>
                      )}
                    </td>
                    <td className="border border-black bg-[#ffff00] p-0 text-center">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={dobiInputs[row.key]}
                        onChange={(e) => {
                          const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                          setDobiInputs((prev) => ({ ...prev, [row.key]: v }));
                        }}
                        aria-label={`Peserta Dobi ${row.label}`}
                        className="w-full h-full py-1.5 px-2 text-center font-semibold text-black bg-[#ffff00] focus:outline-2 focus:outline-slate-900 tabular-nums"
                      />
                    </td>
                    <td className="border border-black bg-white py-1.5 px-3 text-right font-medium text-black">
                      {formatRMNoSpace(row.jumlah)}
                    </td>
                  </tr>
                ))}

                {/* JUMLAH Dobi Row */}
                <tr>
                  <td colSpan={2} className="py-1.5"></td>
                  <td className="py-1.5 px-2 text-center font-black text-black">JUMLAH</td>
                  <td className="border border-black bg-white py-1.5 px-3 text-right font-black text-black">
                    {formatRMNoSpace(dobiTotal)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 1C. JUMLAH KESELURUHAN */}
          <div className="pt-2 overflow-x-auto">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="sm:w-[155px] shrink-0 text-center">
                <div className="text-sm sm:text-base font-black text-black leading-tight uppercase">
                  JUMLAH
                  <br />
                  KESELURUHAN
                </div>
              </div>

              <table className="flex-1 max-w-[460px] border-collapse text-xs sm:text-sm tabular-nums">
                <thead>
                  <tr className="bg-[#cccccc] text-black font-bold text-center">
                    <th className="border border-black bg-white py-1.5 px-3 w-[110px]"></th>
                    <th className="border border-black py-1.5 px-3">MAKAN MINUM</th>
                    <th className="border border-black py-1.5 px-3">DOBI</th>
                    <th className="border border-black py-1.5 px-3">JUMLAH</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-black bg-white py-1.5 px-2.5 text-center text-black">
                      (Tiada SST)
                    </td>
                    <td className="border border-black bg-white py-1.5 px-3 text-right font-medium text-black">
                      {formatRMNoSpace(makanSubtotal)}
                    </td>
                    <td
                      rowSpan={3}
                      className="border border-black bg-white py-1.5 px-3 text-center font-medium text-black align-middle"
                    >
                      {formatRMNoSpace(dobiTotal)}
                    </td>
                    <td className="border border-black bg-[#b8e994] py-1.5 px-3 text-right font-black text-black">
                      {formatRMNoSpace(grandTiadaSst)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-white py-1.5 px-2.5 text-center text-black">
                      SST 6%
                    </td>
                    <td className="border border-black bg-white py-1.5 px-3 text-right font-medium text-black">
                      {formatRMNoSpace(makanTotalSst6)}
                    </td>
                    <td className="border border-black bg-[#b8e994] py-1.5 px-3 text-right font-black text-black">
                      {formatRMNoSpace(grandSst6)}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-black bg-white py-1.5 px-2.5 text-center text-black">
                      SST 8%
                    </td>
                    <td className="border border-black bg-white py-1.5 px-3 text-right font-medium text-black">
                      {formatRMNoSpace(makanTotalSst8)}
                    </td>
                    <td className="border border-black bg-[#b8e994] py-1.5 px-3 text-right font-black text-black">
                      {formatRMNoSpace(grandSst8)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ============================================================ */}
        {/* BAHAGIAN 2: PAKEJ HOTEL (IMAGE 2)                            */}
        {/* ============================================================ */}
        <section className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-700" />
              <h2 className="text-sm font-black tracking-wide text-slate-900 uppercase">
                Pengiraan Pakej Hotel
              </h2>
            </div>
            <span className="text-[11px] text-slate-500">Semua sel kuning boleh disunting pengguna</span>
          </div>

          <div className="space-y-6 overflow-x-auto">
            {/* Title */}
            <h3 className="text-lg sm:text-xl font-black text-center text-black tracking-wide uppercase">
              PAKEJ HOTEL
            </h3>

            {/* 2A. BAJET Input Box */}
            <table className="border-collapse text-xs sm:text-sm tabular-nums">
              <tbody>
                <tr>
                  <td className="border border-black bg-[#cccccc] text-black font-black py-1.5 px-8 text-center w-[180px]">
                    BAJET
                  </td>
                  <td className="border border-black bg-[#ffff00] p-0 w-[160px]">
                    <div className="flex items-center px-2">
                      <span className="font-bold text-black select-none">RM</span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        value={hotelInputs.bajet}
                        onChange={(e) => {
                          const v = Math.max(0, parseFloat(e.target.value) || 0);
                          setHotelInputs((prev) => ({ ...prev, bajet: v }));
                        }}
                        aria-label="Bajet Pakej Hotel"
                        className="w-full py-1.5 px-1 text-right font-semibold text-black bg-[#ffff00] focus:outline-none tabular-nums"
                      />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2B. BILIK HOTEL Input Table */}
            <table className="w-full border-collapse text-xs sm:text-sm tabular-nums">
              <thead>
                <tr className="bg-[#cccccc] text-black font-bold text-center">
                  <th className="border border-black py-1.5 px-3 w-[180px]">BILIK HOTEL</th>
                  <th className="border border-black py-1.5 px-3">RATE PER NIGHT</th>
                  <th className="border border-black py-1.5 px-3">BIL. PESERTA</th>
                  <th className="border border-black py-1.5 px-3">BIL. HARI</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black bg-[#cccccc] text-black font-semibold py-1.5 px-3 text-center">
                    Single
                  </td>
                  <td className="border border-black bg-[#ffff00] p-0">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={hotelInputs.single.rate}
                      onChange={(e) => {
                        const v = Math.max(0, parseFloat(e.target.value) || 0);
                        setHotelInputs((prev) => ({
                          ...prev,
                          single: { ...prev.single, rate: v },
                        }));
                      }}
                      aria-label="Rate Per Night Single"
                      className="w-full py-1.5 px-2 text-center font-semibold text-black bg-[#ffff00] focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </td>
                  <td className="border border-black bg-[#ffff00] p-0">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={hotelInputs.single.peserta}
                      onChange={(e) => {
                        const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setHotelInputs((prev) => ({
                          ...prev,
                          single: { ...prev.single, peserta: v },
                        }));
                      }}
                      aria-label="Bil Peserta Single"
                      className="w-full py-1.5 px-2 text-center font-semibold text-black bg-[#ffff00] focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </td>
                  <td className="border border-black bg-[#ffff00] p-0">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={hotelInputs.single.hari}
                      onChange={(e) => {
                        const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setHotelInputs((prev) => ({
                          ...prev,
                          single: { ...prev.single, hari: v },
                        }));
                      }}
                      aria-label="Bil Hari Single"
                      className="w-full py-1.5 px-2 text-center font-semibold text-black bg-[#ffff00] focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-[#cccccc] text-black font-semibold py-1.5 px-3 text-center">
                    Double
                  </td>
                  <td className="border border-black bg-[#ffff00] p-0">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={hotelInputs.double.rate}
                      onChange={(e) => {
                        const v = Math.max(0, parseFloat(e.target.value) || 0);
                        setHotelInputs((prev) => ({
                          ...prev,
                          double: { ...prev.double, rate: v },
                        }));
                      }}
                      aria-label="Rate Per Night Double"
                      className="w-full py-1.5 px-2 text-center font-semibold text-black bg-[#ffff00] focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </td>
                  <td className="border border-black bg-[#ffff00] p-0">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={hotelInputs.double.peserta}
                      onChange={(e) => {
                        const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setHotelInputs((prev) => ({
                          ...prev,
                          double: { ...prev.double, peserta: v },
                        }));
                      }}
                      aria-label="Bil Peserta Double"
                      className="w-full py-1.5 px-2 text-center font-semibold text-black bg-[#ffff00] focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </td>
                  <td className="border border-black bg-[#ffff00] p-0">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={hotelInputs.double.hari}
                      onChange={(e) => {
                        const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setHotelInputs((prev) => ({
                          ...prev,
                          double: { ...prev.double, hari: v },
                        }));
                      }}
                      aria-label="Bil Hari Double"
                      className="w-full py-1.5 px-2 text-center font-semibold text-black bg-[#ffff00] focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2C. JUMLAH (PAKEJ) Output Table */}
            <table className="w-full border-collapse text-xs sm:text-sm tabular-nums">
              <thead>
                <tr className="bg-[#cccccc] text-black font-bold text-center">
                  <th className="border border-black py-1.5 px-3 w-[180px]">BILIK HOTEL</th>
                  <th className="border border-black py-1.5 px-3">JUMLAH (ALL-IN)</th>
                  <th className="border border-black py-1.5 px-3">JUMLAH (SST 6%)</th>
                  <th className="border border-black py-1.5 px-3">JUMLAH (SST 8%)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black bg-[#cccccc] text-black font-semibold py-1.5 px-3 text-center">
                    Single
                  </td>
                  <td className="border border-black bg-white py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(hotelCalc.single.allIn)}
                  </td>
                  <td className="border border-black bg-white py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(hotelCalc.single.sst6)}
                  </td>
                  <td className="border border-black bg-white py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(hotelCalc.single.sst8)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black bg-[#cccccc] text-black font-semibold py-1.5 px-3 text-center">
                    Double
                  </td>
                  <td className="border border-black bg-white py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(hotelCalc.double.allIn)}
                  </td>
                  <td className="border border-black bg-white py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(hotelCalc.double.sst6)}
                  </td>
                  <td className="border border-black bg-white py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(hotelCalc.double.sst8)}
                  </td>
                </tr>
                <tr className="bg-white font-black text-black">
                  <td className="border border-black py-1.5 px-3 text-center">JUMLAH (PAKEJ)</td>
                  <td className="border border-black py-1.5 px-3 text-right">
                    {formatRMNoSpace(hotelCalc.pkg.allIn)}
                  </td>
                  <td className="border border-black py-1.5 px-3 text-right">
                    {formatRMNoSpace(hotelCalc.pkg.sst6)}
                  </td>
                  <td className="border border-black py-1.5 px-3 text-right">
                    {formatRMNoSpace(hotelCalc.pkg.sst8)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2D. BAKI (BAJET - PAKEJ) Row */}
            <table className="w-full border-collapse text-xs sm:text-sm tabular-nums">
              <tbody>
                <tr className="bg-[#dbeafe] font-black">
                  <td className="border border-black py-1.5 px-3 text-center text-black w-[180px]">
                    BAKI (BAJET - PAKEJ)
                  </td>
                  <td
                    className={`border border-black py-1.5 px-3 text-right ${
                      hotelCalc.baki.allIn < 0 ? 'text-rose-700' : 'text-black'
                    }`}
                  >
                    {formatRMNoSpace(hotelCalc.baki.allIn)}
                  </td>
                  <td
                    className={`border border-black py-1.5 px-3 text-right ${
                      hotelCalc.baki.sst6 < 0 ? 'text-rose-700' : 'text-black'
                    }`}
                  >
                    {formatRMNoSpace(hotelCalc.baki.sst6)}
                  </td>
                  <td
                    className={`border border-black py-1.5 px-3 text-right ${
                      hotelCalc.baki.sst8 < 0 ? 'text-rose-700' : 'text-black'
                    }`}
                  >
                    {formatRMNoSpace(hotelCalc.baki.sst8)}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 2E. JUMLAH (SST SAHAJA) Table */}
            <table className="w-full border-collapse text-xs sm:text-sm tabular-nums bg-[#ffedd5]">
              <thead>
                <tr className="font-bold text-black text-center">
                  <th className="border border-black py-1.5 px-3 w-[180px]">BILIK HOTEL</th>
                  <th className="border border-black py-1.5 px-3">TANPA SST</th>
                  <th className="border border-black py-1.5 px-3">SST 6%</th>
                  <th className="border border-black py-1.5 px-3">SST 8%</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black py-1.5 px-3 text-center text-black">Single</td>
                  <td className="border border-black py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(0)}
                  </td>
                  <td className="border border-black py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(hotelCalc.single.sst6Only)}
                  </td>
                  <td className="border border-black py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(hotelCalc.single.sst8Only)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black py-1.5 px-3 text-center text-black">Double</td>
                  <td className="border border-black py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(0)}
                  </td>
                  <td className="border border-black py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(hotelCalc.double.sst6Only)}
                  </td>
                  <td className="border border-black py-1.5 px-3 text-right text-black">
                    {formatRMNoSpace(hotelCalc.double.sst8Only)}
                  </td>
                </tr>
                <tr className="font-black text-black">
                  <td className="border border-black py-1.5 px-3 text-center">
                    JUMLAH (SST SAHAJA)
                  </td>
                  <td className="border border-black py-1.5 px-3 text-right">
                    {formatRMNoSpace(hotelCalc.sstOnly.tanpa)}
                  </td>
                  <td className="border border-black py-1.5 px-3 text-right">
                    {formatRMNoSpace(hotelCalc.sstOnly.sst6)}
                  </td>
                  <td className="border border-black py-1.5 px-3 text-right">
                    {formatRMNoSpace(hotelCalc.sstOnly.sst8)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};
