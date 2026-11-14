import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useProgramContext, DEFAULT_BUDGET_RATES } from '../context/ProgramContext';
import { BudgetRatesConfig } from '../types/program';
import { formatRM } from '../utils/formatters';
import {
  RotateCcw,
  Lock,
  Unlock,
  Save,
  CheckCircle2,
  Eye,
  Download,
  Calculator,
  Building,
  FileSpreadsheet,
  FileText,
  X,
  Eraser,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import jataNegaraLogo from '../assets/jata_negara.png';

type MakanKey = keyof BudgetRatesConfig['makanMinum'];
type DobiKey = keyof BudgetRatesConfig['dobi'];
type CalcMode = 'makanDobi' | 'hotel';

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

const formatRMNoSpace = (val: number): string => {
  const num = Number.isFinite(val) ? val : 0;
  if (num < 0) {
    return `-RM${formatRM(Math.abs(num))}`;
  }
  return `RM${formatRM(num)}`;
};

const loadImageAsDataUrl = (src: string): Promise<string | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });

export const PengiraanBajetPage: React.FC = () => {
  const { currentUser, budgetRates, updateBudgetRates, jabatanMap } = useProgramContext();
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const jabatanOptions = useMemo(() => {
    const set = new Set<string>();
    Object.values(jabatanMap || {}).forEach((arr) => {
      arr.forEach((j) => {
        if (j && j !== 'SEMUA JABATAN') set.add(j);
      });
    });
    return Array.from(set).sort();
  }, [jabatanMap]);

  // Pilihan mod utama kalkulator (Makan Minum & Dobi ATAU Pakej Hotel)
  const [selectedMode, setSelectedMode] = useState<CalcMode>('makanDobi');

  // Preview & Simpan modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewOption, setPreviewOption] = useState<CalcMode>('makanDobi');
  const [programRefTitle, setProgramRefTitle] = useState('');
  const [programDate, setProgramDate] = useState(() =>
    new Date().toLocaleDateString('ms-MY', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  );
  const [programJabatan, setProgramJabatan] = useState(() => currentUser?.jabatan || '');

  // Responsive scaling for A4 Portrait preview sheet (794px x 1123px @ 96dpi)
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const el = previewContainerRef.current;
    if (!el) return;

    const updateScale = () => {
      const availableWidth = Math.max(260, el.clientWidth - 24);
      const a4PixelWidth = 794;
      setPreviewScale(Math.min(1, availableWidth / a4PixelWidth));
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [isPreviewOpen]);

  useEffect(() => {
    if (!isPreviewOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsPreviewOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isPreviewOpen]);

  // Local editable unit-rate draft for Super Admin
  const [rateDraft, setRateDraft] = useState<BudgetRatesConfig>(budgetRates);
  const [saveNotice, setSaveNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  useEffect(() => {
    setRateDraft(budgetRates);
  }, [budgetRates]);

  // Yellow-cell inputs (editable by any user / pelawat / admin / super admin)
  const [makanInputs, setMakanInputs] = useState<
    Record<MakanKey, { peserta: number; bilHari: number }>
  >(() => {
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
  // 1. PENGIRAAN BAJET MAKAN MINUM (KEKAL PENGIRAAN ASAL)
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
  // 2. PENGIRAAN DOBI (KEKAL PENGIRAAN ASAL)
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
  // 4. PAKEJ HOTEL (KEKAL PENGIRAAN ASAL)
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
      single: {
        allIn: sAllIn,
        sst6: sSst6Total,
        sst8: sSst8Total,
        sst6Only: sSst6Only,
        sst8Only: sSst8Only,
      },
      double: {
        allIn: dAllIn,
        sst6: dSst6Total,
        sst8: dSst8Total,
        sst6Only: dSst6Only,
        sst8Only: dSst8Only,
      },
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
    if (selectedMode === 'makanDobi') {
      setMakanInputs(DEFAULT_MAKAN_INPUTS);
      setDobiInputs(DEFAULT_DOBI_INPUTS);
    } else {
      setHotelInputs(DEFAULT_HOTEL_INPUTS);
    }
  };

  const handleZeroYellowInputs = () => {
    if (selectedMode === 'makanDobi') {
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
    } else {
      setHotelInputs({
        bajet: 0,
        single: { rate: 0, peserta: 0, hari: 0 },
        double: { rate: 0, peserta: 0, hari: 0 },
      });
    }
  };

  const openPreviewModal = (mode: CalcMode = selectedMode) => {
    setPreviewOption(mode);
    if (!programJabatan && currentUser?.jabatan) {
      setProgramJabatan(currentUser.jabatan);
    }
    setIsPreviewOpen(true);
  };

  const handleExportExcel = (targetMode: CalcMode) => {
    const wb = XLSX.utils.book_new();
    const metaRows: (string | number)[][] = [
      ['NAMA PROGRAM:', programRefTitle.trim() || '-'],
      ['TARIKH:', programDate.trim() || '-'],
      ['JABATAN:', programJabatan.trim() || '-'],
      [],
    ];

    if (targetMode === 'makanDobi') {
      const sheet1Rows: (string | number)[][] = [
        ...metaRows,
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
        [
          '(Tiada SST)',
          Number(makanSubtotal.toFixed(2)),
          Number(dobiTotal.toFixed(2)),
          Number(grandTiadaSst.toFixed(2)),
        ],
        [
          'SST 6%',
          Number(makanTotalSst6.toFixed(2)),
          Number(dobiTotal.toFixed(2)),
          Number(grandSst6.toFixed(2)),
        ],
        [
          'SST 8%',
          Number(makanTotalSst8.toFixed(2)),
          Number(dobiTotal.toFixed(2)),
          Number(grandSst8.toFixed(2)),
        ],
      ];
      const ws1 = XLSX.utils.aoa_to_sheet(sheet1Rows);
      ws1['!cols'] = [{ wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Makan Minum & Dobi');
      XLSX.writeFile(
        wb,
        `Pengiraan_Bajet_Makan_Minum_Dobi_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } else {
      const sheet2Rows: (string | number)[][] = [
        ...metaRows,
        ['PAKEJ HOTEL'],
        ['BAJET (RM)', Number(hotelCalc.bajet.toFixed(2))],
        [],
        ['BILIK HOTEL', 'RATE PER NIGHT (RM)', 'BIL. PESERTA', 'BIL. HARI'],
        ['Single', hotelInputs.single.rate, hotelInputs.single.peserta, hotelInputs.single.hari],
        ['Double', hotelInputs.double.rate, hotelInputs.double.peserta, hotelInputs.double.hari],
        [],
        ['BILIK HOTEL', 'JUMLAH (ALL-IN)', 'JUMLAH (SST 6%)', 'JUMLAH (SST 8%)'],
        [
          'Single',
          Number(hotelCalc.single.allIn.toFixed(2)),
          Number(hotelCalc.single.sst6.toFixed(2)),
          Number(hotelCalc.single.sst8.toFixed(2)),
        ],
        [
          'Double',
          Number(hotelCalc.double.allIn.toFixed(2)),
          Number(hotelCalc.double.sst6.toFixed(2)),
          Number(hotelCalc.double.sst8.toFixed(2)),
        ],
        [
          'JUMLAH (PAKEJ)',
          Number(hotelCalc.pkg.allIn.toFixed(2)),
          Number(hotelCalc.pkg.sst6.toFixed(2)),
          Number(hotelCalc.pkg.sst8.toFixed(2)),
        ],
        [],
        [
          'BAKI (BAJET - PAKEJ)',
          Number(hotelCalc.baki.allIn.toFixed(2)),
          Number(hotelCalc.baki.sst6.toFixed(2)),
          Number(hotelCalc.baki.sst8.toFixed(2)),
        ],
        [],
        ['BILIK HOTEL', 'TANPA SST', 'SST 6%', 'SST 8%'],
        [
          'Single',
          0,
          Number(hotelCalc.single.sst6Only.toFixed(2)),
          Number(hotelCalc.single.sst8Only.toFixed(2)),
        ],
        [
          'Double',
          0,
          Number(hotelCalc.double.sst6Only.toFixed(2)),
          Number(hotelCalc.double.sst8Only.toFixed(2)),
        ],
        [
          'JUMLAH (SST SAHAJA)',
          0,
          Number(hotelCalc.sstOnly.sst6.toFixed(2)),
          Number(hotelCalc.sstOnly.sst8.toFixed(2)),
        ],
      ];
      const ws2 = XLSX.utils.aoa_to_sheet(sheet2Rows);
      ws2['!cols'] = [{ wch: 24 }, { wch: 20 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Pakej Hotel');
      XLSX.writeFile(wb, `Pengiraan_Pakej_Hotel_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  // Simpan PDF A4 Portrait (1 muka surat sahaja) untuk pilihan yang dipilih
  const handleSavePdfA4Portrait = async (targetMode: CalcMode) => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
      const margin = 14;
      const contentWidth = pageWidth - margin * 2; // 182mm
      const borderNavy: [number, number, number] = [30, 41, 59];
      let cursorY = 10;

      // Logo Jata Negara
      const logoDataUrl = await loadImageAsDataUrl(jataNegaraLogo);
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', pageWidth / 2 - 8.5, cursorY, 17, 13.5);
        cursorY += 16.5;
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.text('KEMENTERIAN PENDIDIKAN · INSTITUT AMINUDDIN BAKI', pageWidth / 2, cursorY, {
        align: 'center',
      });
      cursorY += 5.2;

      doc.setFontSize(11);
      doc.text(
        targetMode === 'makanDobi'
          ? 'PENGIRAAN BAJET MAKAN MINUM & DOBI'
          : 'PENGIRAAN BAJET PAKEJ HOTEL',
        pageWidth / 2,
        cursorY,
        { align: 'center' }
      );
      cursorY += 3;

      doc.setDrawColor(...borderNavy);
      doc.setLineWidth(0.45);
      doc.line(margin, cursorY, pageWidth - margin, cursorY);
      cursorY += 3.5;

      // Kotak Maklumat Program (NAMA PROGRAM, TARIKH, JABATAN)
      const metaLabelWidth = targetMode === 'hotel' ? 52 : 38;
      autoTable(doc, {
        startY: cursorY,
        margin: { left: margin, right: margin },
        body: [
          [
            {
              content: 'NAMA PROGRAM',
              styles: {
                fillColor: [241, 245, 249] as [number, number, number],
                fontStyle: 'bold' as const,
              },
            },
            {
              content: (programRefTitle.trim() || '-').toUpperCase(),
              styles: { fontStyle: 'bold' as const },
            },
          ],
          [
            {
              content: 'TARIKH',
              styles: {
                fillColor: [241, 245, 249] as [number, number, number],
                fontStyle: 'bold' as const,
              },
            },
            { content: programDate.trim() || '-' },
          ],
          [
            {
              content: 'JABATAN',
              styles: {
                fillColor: [241, 245, 249] as [number, number, number],
                fontStyle: 'bold' as const,
              },
            },
            { content: (programJabatan.trim() || '-').toUpperCase() },
          ],
        ],
        theme: 'grid',
        pageBreak: 'avoid',
        styles: {
          fontSize: 8,
          cellPadding: 1.6,
          textColor: [15, 23, 42],
          lineColor: borderNavy,
          lineWidth: 0.28,
        },
        columnStyles: {
          0: { cellWidth: metaLabelWidth },
          1: { cellWidth: contentWidth - metaLabelWidth },
        },
      });

      cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 4;

      if (targetMode === 'makanDobi') {
        // 1. Jadual Makan Minum (Lebar 182mm: 56 + 28 + 30 + 30 + 38)
        autoTable(doc, {
          startY: cursorY,
          margin: { left: margin, right: margin },
          head: [
            [
              {
                content: 'PENGIRAAN BAJET MAKAN MINUM',
                colSpan: 5,
                styles: {
                  halign: 'center' as const,
                  fillColor: [241, 245, 249] as [number, number, number],
                  textColor: [15, 23, 42] as [number, number, number],
                  fontStyle: 'bold' as const,
                  fontSize: 9,
                },
              },
            ],
            ['KATEGORI', 'RM', 'PESERTA', 'BIL. HARI', 'JUMLAH'],
          ],
          body: makanRows.map((r) => [
            {
              content: r.label,
              styles: {
                fillColor: [226, 232, 240] as [number, number, number],
                fontStyle: 'bold' as const,
                halign: 'left' as const,
              },
            },
            { content: r.rm.toFixed(2), styles: { halign: 'right' as const } },
            {
              content: String(r.peserta),
              styles: {
                halign: 'center' as const,
                fillColor: [254, 240, 138] as [number, number, number],
                fontStyle: 'bold' as const,
              },
            },
            {
              content: String(r.bilHari),
              styles: {
                halign: 'center' as const,
                fillColor: [254, 240, 138] as [number, number, number],
                fontStyle: 'bold' as const,
              },
            },
            { content: formatRMNoSpace(r.jumlah), styles: { halign: 'right' as const } },
          ]),
          theme: 'grid',
          pageBreak: 'avoid',
          styles: {
            fontSize: 8.2,
            cellPadding: 1.55,
            textColor: [15, 23, 42],
            lineColor: borderNavy,
            lineWidth: 0.25,
          },
          headStyles: {
            fillColor: [226, 232, 240],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: {
            0: { cellWidth: 56 },
            1: { cellWidth: 28 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 38 },
          },
        });

        cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 2;

        // Ringkasan SST Makan Minum (Lebar 182mm: 84 + 60 + 38 — sejajar lajur luar)
        autoTable(doc, {
          startY: cursorY,
          margin: { left: margin, right: margin },
          head: [['RINGKASAN MAKAN MINUM', 'SST (TAMBAH)', 'JUMLAH']],
          body: [
            ['(Tiada SST)', '-', formatRMNoSpace(makanSubtotal)],
            ['SST 6%', formatRMNoSpace(makanSst6Add), formatRMNoSpace(makanTotalSst6)],
            ['SST 8%', formatRMNoSpace(makanSst8Add), formatRMNoSpace(makanTotalSst8)],
          ],
          theme: 'grid',
          pageBreak: 'avoid',
          styles: {
            fontSize: 8,
            cellPadding: 1.45,
            textColor: [15, 23, 42],
            lineColor: borderNavy,
            lineWidth: 0.25,
          },
          headStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: {
            0: { cellWidth: 84, halign: 'center', fontStyle: 'bold' },
            1: { cellWidth: 60, halign: 'right' },
            2: { cellWidth: 38, halign: 'right', fontStyle: 'bold' },
          },
        });

        cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 4;

        // 2. Jadual Pengiraan Dobi (Lebar 182mm: 84 + 30 + 30 + 38 — sejajar lajur Makan Minum)
        autoTable(doc, {
          startY: cursorY,
          margin: { left: margin, right: margin },
          head: [
            [
              {
                content: 'PENGIRAAN DOBI',
                colSpan: 4,
                styles: {
                  halign: 'center' as const,
                  fillColor: [241, 245, 249] as [number, number, number],
                  textColor: [15, 23, 42] as [number, number, number],
                  fontStyle: 'bold' as const,
                  fontSize: 9,
                },
              },
            ],
            ['INAPAN', 'RM', 'PESERTA', 'JUMLAH'],
          ],
          body: [
            ...dobiRows.map((r) => [
              {
                content: r.label,
                styles: {
                  fillColor: [226, 232, 240] as [number, number, number],
                  fontStyle: 'bold' as const,
                  halign: 'left' as const,
                },
              },
              { content: r.rm.toFixed(2), styles: { halign: 'right' as const } },
              {
                content: String(r.peserta),
                styles: {
                  halign: 'center' as const,
                  fillColor: [254, 240, 138] as [number, number, number],
                  fontStyle: 'bold' as const,
                },
              },
              { content: formatRMNoSpace(r.jumlah), styles: { halign: 'right' as const } },
            ]),
            [
              {
                content: 'JUMLAH DOBI',
                colSpan: 3,
                styles: {
                  halign: 'right' as const,
                  fontStyle: 'bold' as const,
                  fillColor: [248, 250, 252] as [number, number, number],
                },
              },
              {
                content: formatRMNoSpace(dobiTotal),
                styles: {
                  halign: 'right' as const,
                  fontStyle: 'bold' as const,
                  fillColor: [248, 250, 252] as [number, number, number],
                },
              },
            ],
          ],
          theme: 'grid',
          pageBreak: 'avoid',
          styles: {
            fontSize: 8.2,
            cellPadding: 1.5,
            textColor: [15, 23, 42],
            lineColor: borderNavy,
            lineWidth: 0.25,
          },
          headStyles: {
            fillColor: [226, 232, 240],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: {
            0: { cellWidth: 84 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 38 },
          },
        });

        cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 4;

        // 3. Jumlah Keseluruhan (Lebar 182mm: 56 + 44 + 44 + 38)
        autoTable(doc, {
          startY: cursorY,
          margin: { left: margin, right: margin },
          head: [
            [
              {
                content: 'JUMLAH KESELURUHAN (MAKAN MINUM + DOBI)',
                colSpan: 4,
                styles: {
                  halign: 'center' as const,
                  fillColor: [241, 245, 249] as [number, number, number],
                  textColor: [15, 23, 42] as [number, number, number],
                  fontStyle: 'bold' as const,
                  fontSize: 9,
                },
              },
            ],
            ['KATEGORI SST', 'MAKAN MINUM', 'DOBI', 'JUMLAH'],
          ],
          body: [
            [
              { content: '(Tiada SST)', styles: { halign: 'center' as const } },
              { content: formatRMNoSpace(makanSubtotal), styles: { halign: 'right' as const } },
              { content: formatRMNoSpace(dobiTotal), styles: { halign: 'right' as const } },
              {
                content: formatRMNoSpace(grandTiadaSst),
                styles: {
                  halign: 'right' as const,
                  fillColor: [184, 233, 148] as [number, number, number],
                  fontStyle: 'bold' as const,
                },
              },
            ],
            [
              { content: 'SST 6%', styles: { halign: 'center' as const } },
              { content: formatRMNoSpace(makanTotalSst6), styles: { halign: 'right' as const } },
              { content: formatRMNoSpace(dobiTotal), styles: { halign: 'right' as const } },
              {
                content: formatRMNoSpace(grandSst6),
                styles: {
                  halign: 'right' as const,
                  fillColor: [184, 233, 148] as [number, number, number],
                  fontStyle: 'bold' as const,
                },
              },
            ],
            [
              { content: 'SST 8%', styles: { halign: 'center' as const } },
              { content: formatRMNoSpace(makanTotalSst8), styles: { halign: 'right' as const } },
              { content: formatRMNoSpace(dobiTotal), styles: { halign: 'right' as const } },
              {
                content: formatRMNoSpace(grandSst8),
                styles: {
                  halign: 'right' as const,
                  fillColor: [184, 233, 148] as [number, number, number],
                  fontStyle: 'bold' as const,
                },
              },
            ],
          ],
          theme: 'grid',
          pageBreak: 'avoid',
          styles: {
            fontSize: 8.5,
            cellPadding: 1.75,
            textColor: [15, 23, 42],
            lineColor: borderNavy,
            lineWidth: 0.25,
          },
          headStyles: {
            fillColor: [226, 232, 240],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: {
            0: { cellWidth: 56 },
            1: { cellWidth: 44 },
            2: { cellWidth: 44 },
            3: { cellWidth: 38 },
          },
        });
      } else {
        // PAKEJ HOTEL — Semua jadual selari tepat pada grid 4 lajur (52 + 43.33 + 43.33 + 43.34 = 182mm)
        const hotelCol0 = 52;
        const hotelColRest = (contentWidth - hotelCol0) / 3; // 43.333mm setiap satu
        const hotelColStyles = {
          0: { cellWidth: hotelCol0 },
          1: { cellWidth: hotelColRest },
          2: { cellWidth: hotelColRest },
          3: { cellWidth: hotelColRest },
        };

        // Jadual 1: BAJET (Selari lajur 0 & lajur 1)
        autoTable(doc, {
          startY: cursorY,
          margin: { left: margin, right: pageWidth - margin - hotelCol0 - hotelColRest },
          body: [
            [
              {
                content: 'BAJET',
                styles: {
                  fillColor: [226, 232, 240] as [number, number, number],
                  fontStyle: 'bold' as const,
                  halign: 'center' as const,
                },
              },
              {
                content: formatRMNoSpace(hotelCalc.bajet),
                styles: {
                  fillColor: [254, 240, 138] as [number, number, number],
                  fontStyle: 'bold' as const,
                  halign: 'right' as const,
                },
              },
            ],
          ],
          theme: 'grid',
          pageBreak: 'avoid',
          styles: {
            fontSize: 9.5,
            cellPadding: 2.6,
            textColor: [15, 23, 42],
            lineColor: borderNavy,
            lineWidth: 0.3,
          },
          columnStyles: {
            0: { cellWidth: hotelCol0 },
            1: { cellWidth: hotelColRest },
          },
        });

        cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 6;

        // Jadual 2: Input Bilik Hotel
        autoTable(doc, {
          startY: cursorY,
          margin: { left: margin, right: margin },
          head: [['BILIK HOTEL', 'RATE PER NIGHT', 'BIL. PESERTA', 'BIL. HARI']],
          body: [
            [
              {
                content: 'Single',
                styles: {
                  fillColor: [226, 232, 240] as [number, number, number],
                  fontStyle: 'bold' as const,
                  halign: 'center' as const,
                },
              },
              {
                content: String(hotelInputs.single.rate),
                styles: {
                  fillColor: [254, 240, 138] as [number, number, number],
                  halign: 'center' as const,
                  fontStyle: 'bold' as const,
                },
              },
              {
                content: String(hotelInputs.single.peserta),
                styles: {
                  fillColor: [254, 240, 138] as [number, number, number],
                  halign: 'center' as const,
                  fontStyle: 'bold' as const,
                },
              },
              {
                content: String(hotelInputs.single.hari),
                styles: {
                  fillColor: [254, 240, 138] as [number, number, number],
                  halign: 'center' as const,
                  fontStyle: 'bold' as const,
                },
              },
            ],
            [
              {
                content: 'Double',
                styles: {
                  fillColor: [226, 232, 240] as [number, number, number],
                  fontStyle: 'bold' as const,
                  halign: 'center' as const,
                },
              },
              {
                content: String(hotelInputs.double.rate),
                styles: {
                  fillColor: [254, 240, 138] as [number, number, number],
                  halign: 'center' as const,
                  fontStyle: 'bold' as const,
                },
              },
              {
                content: String(hotelInputs.double.peserta),
                styles: {
                  fillColor: [254, 240, 138] as [number, number, number],
                  halign: 'center' as const,
                  fontStyle: 'bold' as const,
                },
              },
              {
                content: String(hotelInputs.double.hari),
                styles: {
                  fillColor: [254, 240, 138] as [number, number, number],
                  halign: 'center' as const,
                  fontStyle: 'bold' as const,
                },
              },
            ],
          ],
          theme: 'grid',
          pageBreak: 'avoid',
          styles: {
            fontSize: 9,
            cellPadding: 2.6,
            textColor: [15, 23, 42],
            lineColor: borderNavy,
            lineWidth: 0.3,
          },
          headStyles: {
            fillColor: [226, 232, 240],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: hotelColStyles,
        });

        cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 6;

        // Jadual 3: JUMLAH (PAKEJ)
        autoTable(doc, {
          startY: cursorY,
          margin: { left: margin, right: margin },
          head: [['BILIK HOTEL', 'JUMLAH (ALL-IN)', 'JUMLAH (SST 6%)', 'JUMLAH (SST 8%)']],
          body: [
            [
              {
                content: 'Single',
                styles: {
                  fillColor: [226, 232, 240] as [number, number, number],
                  fontStyle: 'bold' as const,
                  halign: 'center' as const,
                },
              },
              { content: formatRMNoSpace(hotelCalc.single.allIn), styles: { halign: 'right' as const } },
              { content: formatRMNoSpace(hotelCalc.single.sst6), styles: { halign: 'right' as const } },
              { content: formatRMNoSpace(hotelCalc.single.sst8), styles: { halign: 'right' as const } },
            ],
            [
              {
                content: 'Double',
                styles: {
                  fillColor: [226, 232, 240] as [number, number, number],
                  fontStyle: 'bold' as const,
                  halign: 'center' as const,
                },
              },
              { content: formatRMNoSpace(hotelCalc.double.allIn), styles: { halign: 'right' as const } },
              { content: formatRMNoSpace(hotelCalc.double.sst6), styles: { halign: 'right' as const } },
              { content: formatRMNoSpace(hotelCalc.double.sst8), styles: { halign: 'right' as const } },
            ],
            [
              {
                content: 'JUMLAH (PAKEJ)',
                styles: {
                  halign: 'center' as const,
                  fontStyle: 'bold' as const,
                  fillColor: [248, 250, 252] as [number, number, number],
                },
              },
              {
                content: formatRMNoSpace(hotelCalc.pkg.allIn),
                styles: {
                  halign: 'right' as const,
                  fontStyle: 'bold' as const,
                  fillColor: [248, 250, 252] as [number, number, number],
                },
              },
              {
                content: formatRMNoSpace(hotelCalc.pkg.sst6),
                styles: {
                  halign: 'right' as const,
                  fontStyle: 'bold' as const,
                  fillColor: [248, 250, 252] as [number, number, number],
                },
              },
              {
                content: formatRMNoSpace(hotelCalc.pkg.sst8),
                styles: {
                  halign: 'right' as const,
                  fontStyle: 'bold' as const,
                  fillColor: [248, 250, 252] as [number, number, number],
                },
              },
            ],
          ],
          theme: 'grid',
          pageBreak: 'avoid',
          styles: {
            fontSize: 9,
            cellPadding: 2.6,
            textColor: [15, 23, 42],
            lineColor: borderNavy,
            lineWidth: 0.3,
          },
          headStyles: {
            fillColor: [226, 232, 240],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: hotelColStyles,
        });

        cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 6;

        // Jadual 4: BAKI (BAJET - PAKEJ)
        autoTable(doc, {
          startY: cursorY,
          margin: { left: margin, right: margin },
          body: [
            [
              {
                content: 'BAKI (BAJET - PAKEJ)',
                styles: { halign: 'center' as const, fontStyle: 'bold' as const },
              },
              {
                content: formatRMNoSpace(hotelCalc.baki.allIn),
                styles: {
                  halign: 'right' as const,
                  fontStyle: 'bold' as const,
                  textColor: (hotelCalc.baki.allIn < 0 ? [190, 18, 60] : [15, 23, 42]) as [
                    number,
                    number,
                    number,
                  ],
                },
              },
              {
                content: formatRMNoSpace(hotelCalc.baki.sst6),
                styles: {
                  halign: 'right' as const,
                  fontStyle: 'bold' as const,
                  textColor: (hotelCalc.baki.sst6 < 0 ? [190, 18, 60] : [15, 23, 42]) as [
                    number,
                    number,
                    number,
                  ],
                },
              },
              {
                content: formatRMNoSpace(hotelCalc.baki.sst8),
                styles: {
                  halign: 'right' as const,
                  fontStyle: 'bold' as const,
                  textColor: (hotelCalc.baki.sst8 < 0 ? [190, 18, 60] : [15, 23, 42]) as [
                    number,
                    number,
                    number,
                  ],
                },
              },
            ],
          ],
          theme: 'grid',
          pageBreak: 'avoid',
          styles: {
            fontSize: 9,
            cellPadding: 2.8,
            fillColor: [219, 234, 254],
            textColor: [15, 23, 42],
            lineColor: borderNavy,
            lineWidth: 0.3,
          },
          columnStyles: hotelColStyles,
        });

        cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 6;

        // Jadual 5: JUMLAH (SST SAHAJA)
        autoTable(doc, {
          startY: cursorY,
          margin: { left: margin, right: margin },
          head: [['BILIK HOTEL', 'TANPA SST', 'SST 6%', 'SST 8%']],
          body: [
            [
              { content: 'Single', styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
              { content: formatRMNoSpace(0), styles: { halign: 'right' as const } },
              { content: formatRMNoSpace(hotelCalc.single.sst6Only), styles: { halign: 'right' as const } },
              { content: formatRMNoSpace(hotelCalc.single.sst8Only), styles: { halign: 'right' as const } },
            ],
            [
              { content: 'Double', styles: { halign: 'center' as const, fontStyle: 'bold' as const } },
              { content: formatRMNoSpace(0), styles: { halign: 'right' as const } },
              { content: formatRMNoSpace(hotelCalc.double.sst6Only), styles: { halign: 'right' as const } },
              { content: formatRMNoSpace(hotelCalc.double.sst8Only), styles: { halign: 'right' as const } },
            ],
            [
              {
                content: 'JUMLAH (SST SAHAJA)',
                styles: { halign: 'center' as const, fontStyle: 'bold' as const },
              },
              {
                content: formatRMNoSpace(hotelCalc.sstOnly.tanpa),
                styles: { halign: 'right' as const, fontStyle: 'bold' as const },
              },
              {
                content: formatRMNoSpace(hotelCalc.sstOnly.sst6),
                styles: { halign: 'right' as const, fontStyle: 'bold' as const },
              },
              {
                content: formatRMNoSpace(hotelCalc.sstOnly.sst8),
                styles: { halign: 'right' as const, fontStyle: 'bold' as const },
              },
            ],
          ],
          theme: 'grid',
          pageBreak: 'avoid',
          styles: {
            fontSize: 9,
            cellPadding: 2.6,
            fillColor: [255, 237, 213],
            textColor: [15, 23, 42],
            lineColor: borderNavy,
            lineWidth: 0.3,
          },
          headStyles: {
            fillColor: [254, 215, 170],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            halign: 'center',
          },
          columnStyles: hotelColStyles,
        });
      }

      // Footer A4 Portrait (Pada muka surat tunggal)
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(
        'Dokumen pengiraan bajet ini dijana melalui Portal Maklumat Program IAB · Format A4 Potret (1 Muka Surat)',
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );

      const fileSlug =
        targetMode === 'makanDobi'
          ? 'Pengiraan_Bajet_Makan_Minum_Dobi'
          : 'Pengiraan_Bajet_Pakej_Hotel';
      doc.save(`${fileSlug}_A4_Potret_${new Date().toISOString().slice(0, 10)}.pdf`);

      setSaveNotice({
        type: 'success',
        text: `Dokumen PDF A4 Potret (${
          targetMode === 'makanDobi' ? 'Makan Minum & Dobi' : 'Pakej Hotel'
        }) 1 muka surat berjaya dijana dan disimpan.`,
      });
      setTimeout(() => setSaveNotice(null), 4500);
    } catch (err) {
      console.warn('PDF generation error:', err);
      setSaveNotice({
        type: 'error',
        text: 'Gagal menjana fail PDF. Sila cuba lagi.',
      });
    }
  };

  return (
    <div className="space-y-5">
      {/* ============================================================== */}
      {/* BAR PILIHAN MOD PENGIRAAN & KAWALAN UTAMA (MOBILE-FIRST)       */}
      {/* ============================================================== */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Pilihan Kalkulator: Makan Minum & Dobi ATAU Pakej Hotel */}
          <div className="w-full lg:w-auto">
            <span className="block text-xs font-semibold text-slate-600 mb-2">
              Pilih Jenis Pengiraan Bajet
            </span>
            <div
              role="tablist"
              aria-label="Pilihan Jenis Pengiraan Bajet"
              className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200"
            >
              <button
                type="button"
                role="tab"
                aria-selected={selectedMode === 'makanDobi'}
                onClick={() => setSelectedMode('makanDobi')}
                className={`min-h-[44px] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  selectedMode === 'makanDobi'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Calculator className="w-4 h-4 shrink-0" />
                <span>Makan Minum &amp; Dobi</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={selectedMode === 'hotel'}
                onClick={() => setSelectedMode('hotel')}
                className={`min-h-[44px] px-4 py-2.5 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                  selectedMode === 'hotel'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-700 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                <Building className="w-4 h-4 shrink-0" />
                <span>Pakej Hotel</span>
              </button>
            </div>
          </div>

          {/* Action Buttons: Kosongkan, Contoh Asal, Preview & Simpan */}
          <div className="flex flex-wrap items-center gap-2 pt-1 lg:pt-5">
            <button
              type="button"
              onClick={handleZeroYellowInputs}
              className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Kosongkan (0)</span>
            </button>
            <button
              type="button"
              onClick={handleResetYellowInputs}
              className="min-h-[44px] flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Contoh Asal</span>
            </button>
            <button
              type="button"
              onClick={() => openPreviewModal(selectedMode)}
              className="min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap shrink-0 shadow-xs"
            >
              <Eye className="w-4 h-4" />
              <span>Preview &amp; Simpan</span>
            </button>
          </div>
        </div>

        {/* Status Mod Pengisian & Kawalan Kadar RM */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-600">
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-4 rounded bg-[#fef08a] border border-amber-400 shrink-0" />
              <span>
                <strong className="text-slate-900">Petak Kuning</strong> boleh diisi oleh semua
                pengguna
              </span>
            </div>
            {selectedMode === 'makanDobi' && (
              <>
                <span className="hidden sm:inline text-slate-300">·</span>
                <div className="flex items-center gap-1.5">
                  {isSuperAdmin ? (
                    <Unlock className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  ) : (
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  )}
                  <span className={isSuperAdmin ? 'text-emerald-800 font-semibold' : ''}>
                    {isSuperAdmin
                      ? 'Mod Super Admin: Kadar RM seunit boleh disunting'
                      : 'Kadar RM seunit dikunci (Super Admin sahaja)'}
                  </span>
                </div>
              </>
            )}
          </div>

          {isSuperAdmin && selectedMode === 'makanDobi' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSaveRates}
                className={`min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  hasUnsavedRateChanges
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Kadar RM</span>
              </button>
              <button
                type="button"
                onClick={handleResetRatesToDefault}
                className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kadar RM Asal</span>
              </button>
            </div>
          )}
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

      {/* ============================================================== */}
      {/* PILIHAN 1: PENGIRAAN BAJET MAKAN MINUM & DOBI                  */}
      {/* ============================================================== */}
      {selectedMode === 'makanDobi' ? (
        <div className="space-y-5">
          {/* Ringkasan KPI Pantas (Responsif 1-3 Kolum) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500">
                Jumlah Keseluruhan (Tiada SST)
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                {formatRMNoSpace(grandTiadaSst)}
              </div>
              <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 tabular-nums">
                <span>Makan: {formatRMNoSpace(makanSubtotal)}</span>
                <span aria-hidden="true">·</span>
                <span>Dobi: {formatRMNoSpace(dobiTotal)}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500">
                Jumlah Keseluruhan (SST 6%)
              </div>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                {formatRMNoSpace(grandSst6)}
              </div>
              <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2 tabular-nums">
                <span>Makan: {formatRMNoSpace(makanTotalSst6)}</span>
                <span aria-hidden="true">·</span>
                <span>SST: +{formatRMNoSpace(makanSst6Add)}</span>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
              <div className="text-xs font-semibold text-emerald-800">
                Jumlah Keseluruhan (SST 8%)
              </div>
              <div className="text-2xl font-black text-emerald-950 mt-1 tabular-nums">
                {formatRMNoSpace(grandSst8)}
              </div>
              <div className="text-xs text-emerald-800 mt-1.5 flex items-center gap-2 tabular-nums">
                <span>Makan: {formatRMNoSpace(makanTotalSst8)}</span>
                <span aria-hidden="true">·</span>
                <span>SST: +{formatRMNoSpace(makanSst8Add)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* BAHAGIAN 1A: PENGIRAAN BAJET MAKAN MINUM */}
            <section className="xl:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Pengiraan Bajet Makan Minum
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kadar seunit RM × Peserta × Bilangan Hari
                  </p>
                </div>
                {budgetRates.updatedAt && (
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    Dikemaskini: {budgetRates.updatedAt}
                  </span>
                )}
              </div>

              {/* Paparan Mobile: Kad Sentuh Kemas (Tanpa Skrol Mendatar) */}
              <div className="md:hidden divide-y divide-slate-200">
                {makanRows.map((row) => (
                  <div key={row.key} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-slate-900">{row.label}</span>
                      <span className="text-base font-black text-slate-900 tabular-nums">
                        {formatRMNoSpace(row.jumlah)}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Kadar (RM)
                        </label>
                        {isSuperAdmin ? (
                          <input
                            type="number"
                            inputMode="decimal"
                            step="0.10"
                            min="0"
                            value={rateDraft.makanMinum[row.key]}
                            onChange={(e) => handleMakanRateChange(row.key, e.target.value)}
                            aria-label={`Kadar RM ${row.label}`}
                            className="w-full min-h-[44px] px-2.5 rounded-lg border border-blue-300 bg-blue-50 text-right text-sm font-bold text-blue-900 focus:outline-2 focus:outline-blue-600 tabular-nums"
                          />
                        ) : (
                          <div className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-end text-sm font-semibold text-slate-700 tabular-nums">
                            {row.rm.toFixed(2)}
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Peserta
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
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
                          className="w-full min-h-[44px] px-2.5 rounded-lg border border-amber-400 bg-[#fef08a] text-center text-base font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Bil. Hari
                        </label>
                        <input
                          type="number"
                          inputMode="numeric"
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
                          className="w-full min-h-[44px] px-2.5 rounded-lg border border-amber-400 bg-[#fef08a] text-center text-base font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paparan Desktop: Jadual Berstruktur */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse text-sm tabular-nums">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase">
                      <th className="py-3 px-4 text-left">Kategori</th>
                      <th className="py-3 px-3 text-right w-28">RM</th>
                      <th className="py-3 px-3 text-center w-28">Peserta</th>
                      <th className="py-3 px-3 text-center w-28">Bil. Hari</th>
                      <th className="py-3 px-4 text-right w-36">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {makanRows.map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{row.label}</td>
                        <td className="py-1.5 px-2 text-right">
                          {isSuperAdmin ? (
                            <input
                              type="number"
                              step="0.10"
                              min="0"
                              value={rateDraft.makanMinum[row.key]}
                              onChange={(e) => handleMakanRateChange(row.key, e.target.value)}
                              aria-label={`Kadar RM ${row.label}`}
                              className="w-full h-10 px-2.5 rounded-lg border border-blue-300 bg-blue-50/70 text-right font-semibold text-blue-900 focus:bg-white focus:outline-2 focus:outline-blue-600 tabular-nums"
                            />
                          ) : (
                            <div className="py-2 px-2 text-right font-medium text-slate-700">
                              {row.rm.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="py-1.5 px-2">
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
                            className="w-full h-10 px-2 rounded-lg border border-amber-400 bg-[#fef08a] text-center font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                          />
                        </td>
                        <td className="py-1.5 px-2">
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
                            className="w-full h-10 px-2 rounded-lg border border-amber-400 bg-[#fef08a] text-center font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                          />
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                          {formatRMNoSpace(row.jumlah)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ringkasan Jumlah Makan Minum + SST Tambah */}
              <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-4 space-y-2 text-xs sm:text-sm tabular-nums">
                <div className="grid grid-cols-3 text-[11px] font-bold text-slate-500 uppercase pb-1">
                  <span>Kategori SST</span>
                  <span className="text-right">Jumlah</span>
                  <span className="text-right">SST (Tambah)</span>
                </div>
                <div className="grid grid-cols-3 items-center py-1 border-t border-slate-200/80">
                  <span className="font-semibold text-slate-700">(Tiada SST)</span>
                  <span className="text-right font-black text-slate-900">
                    {formatRMNoSpace(makanSubtotal)}
                  </span>
                  <span className="text-right text-slate-400">-</span>
                </div>
                <div className="grid grid-cols-3 items-center py-1 border-t border-slate-200/80">
                  <span className="font-semibold text-slate-700">SST 6%</span>
                  <span className="text-right font-black text-slate-900">
                    {formatRMNoSpace(makanTotalSst6)}
                  </span>
                  <span className="text-right font-semibold text-slate-700">
                    {formatRMNoSpace(makanSst6Add)}
                  </span>
                </div>
                <div className="grid grid-cols-3 items-center py-1 border-t border-slate-200/80">
                  <span className="font-semibold text-slate-700">SST 8%</span>
                  <span className="text-right font-black text-slate-900">
                    {formatRMNoSpace(makanTotalSst8)}
                  </span>
                  <span className="text-right font-semibold text-slate-700">
                    {formatRMNoSpace(makanSst8Add)}
                  </span>
                </div>
              </div>
            </section>

            {/* BAHAGIAN 1B & 1C: PENGIRAAN DOBI + JUMLAH KESELURUHAN */}
            <div className="xl:col-span-5 space-y-5">
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-200">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Pengiraan Dobi</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kadar seunit RM mengikut inapan × Bilangan Peserta
                  </p>
                </div>

                {/* Paparan Mobile: Kad Sentuh Dobi */}
                <div className="md:hidden divide-y divide-slate-200">
                  {dobiRows.map((row) => (
                    <div key={row.key} className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-900">{row.label}</span>
                        <span className="text-base font-black text-slate-900 tabular-nums">
                          {formatRMNoSpace(row.jumlah)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                            Kadar (RM)
                          </label>
                          {isSuperAdmin ? (
                            <input
                              type="number"
                              inputMode="decimal"
                              step="0.10"
                              min="0"
                              value={rateDraft.dobi[row.key]}
                              onChange={(e) => handleDobiRateChange(row.key, e.target.value)}
                              aria-label={`Kadar RM Dobi ${row.label}`}
                              className="w-full min-h-[44px] px-2.5 rounded-lg border border-blue-300 bg-blue-50 text-right text-sm font-bold text-blue-900 focus:outline-2 focus:outline-blue-600 tabular-nums"
                            />
                          ) : (
                            <div className="w-full min-h-[44px] px-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-end text-sm font-semibold text-slate-700 tabular-nums">
                              {row.rm.toFixed(2)}
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Peserta
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            step="1"
                            value={dobiInputs[row.key]}
                            onChange={(e) => {
                              const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                              setDobiInputs((prev) => ({ ...prev, [row.key]: v }));
                            }}
                            aria-label={`Peserta Dobi ${row.label}`}
                            className="w-full min-h-[44px] px-2.5 rounded-lg border border-amber-400 bg-[#fef08a] text-center text-base font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paparan Desktop: Jadual Dobi */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse text-sm tabular-nums">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase">
                        <th className="py-3 px-4 text-left">Inapan</th>
                        <th className="py-3 px-3 text-right w-24">RM</th>
                        <th className="py-3 px-3 text-center w-28">Peserta</th>
                        <th className="py-3 px-4 text-right w-32">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dobiRows.map((row) => (
                        <tr key={row.key} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{row.label}</td>
                          <td className="py-1.5 px-2 text-right">
                            {isSuperAdmin ? (
                              <input
                                type="number"
                                step="0.10"
                                min="0"
                                value={rateDraft.dobi[row.key]}
                                onChange={(e) => handleDobiRateChange(row.key, e.target.value)}
                                aria-label={`Kadar RM Dobi ${row.label}`}
                                className="w-full h-10 px-2 rounded-lg border border-blue-300 bg-blue-50/70 text-right font-semibold text-blue-900 focus:bg-white focus:outline-2 focus:outline-blue-600 tabular-nums"
                              />
                            ) : (
                              <div className="py-2 px-2 text-right font-medium text-slate-700">
                                {row.rm.toFixed(2)}
                              </div>
                            )}
                          </td>
                          <td className="py-1.5 px-2">
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
                              className="w-full h-10 px-2 rounded-lg border border-amber-400 bg-[#fef08a] text-center font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                            />
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                            {formatRMNoSpace(row.jumlah)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Jumlah Dobi Footer */}
                <div className="bg-slate-50 border-t border-slate-200 px-4 sm:px-6 py-3.5 flex items-center justify-between tabular-nums">
                  <span className="text-sm font-bold text-slate-700">JUMLAH DOBI</span>
                  <span className="text-base font-black text-slate-900">
                    {formatRMNoSpace(dobiTotal)}
                  </span>
                </div>
              </section>

              {/* Ringkasan Jadual Jumlah Keseluruhan */}
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Jumlah Keseluruhan (Makan Minum + Dobi)
                  </h2>
                </div>
                <div className="divide-y divide-slate-200 text-xs sm:text-sm tabular-nums">
                  <div className="px-4 sm:px-6 py-2.5 bg-slate-50 grid grid-cols-4 gap-2 text-[11px] font-bold text-slate-500 uppercase">
                    <span>Pilihan SST</span>
                    <span className="text-right">Makan</span>
                    <span className="text-right">Dobi</span>
                    <span className="text-right">Jumlah</span>
                  </div>
                  {[
                    {
                      label: '(Tiada SST)',
                      makan: makanSubtotal,
                      dobi: dobiTotal,
                      total: grandTiadaSst,
                    },
                    { label: 'SST 6%', makan: makanTotalSst6, dobi: dobiTotal, total: grandSst6 },
                    { label: 'SST 8%', makan: makanTotalSst8, dobi: dobiTotal, total: grandSst8 },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="px-4 sm:px-6 py-3 grid grid-cols-4 gap-2 items-center"
                    >
                      <span className="font-bold text-slate-800">{item.label}</span>
                      <span className="text-right text-slate-700">
                        {formatRMNoSpace(item.makan)}
                      </span>
                      <span className="text-right text-slate-700">
                        {formatRMNoSpace(item.dobi)}
                      </span>
                      <span className="text-right font-black text-emerald-950 bg-[#dcfce7] px-2 py-1 rounded-md">
                        {formatRMNoSpace(item.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* PILIHAN 2: PENGIRAAN PAKEJ HOTEL                               */
        /* ============================================================== */
        <div className="space-y-5">
          {/* Ringkasan KPI Pakej Hotel */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500">Bajet Diperuntukkan</div>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                {formatRMNoSpace(hotelCalc.bajet)}
              </div>
              <div className="text-xs text-slate-500 mt-1.5">Peruntukan sasaran pakej hotel</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-semibold text-slate-500">Jumlah Pakej (All-In)</div>
              <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">
                {formatRMNoSpace(hotelCalc.pkg.allIn)}
              </div>
              <div className="text-xs text-slate-500 mt-1.5 flex flex-wrap items-center gap-x-2 tabular-nums">
                <span>SST 6%: {formatRMNoSpace(hotelCalc.pkg.sst6)}</span>
                <span aria-hidden="true">·</span>
                <span>SST 8%: {formatRMNoSpace(hotelCalc.pkg.sst8)}</span>
              </div>
            </div>

            <div
              className={`rounded-xl border p-4 ${
                hotelCalc.baki.allIn < 0
                  ? 'bg-rose-50 border-rose-200'
                  : 'bg-sky-50 border-sky-200'
              }`}
            >
              <div
                className={`text-xs font-semibold ${
                  hotelCalc.baki.allIn < 0 ? 'text-rose-800' : 'text-sky-900'
                }`}
              >
                Baki (Bajet − Pakej All-In)
              </div>
              <div
                className={`text-2xl font-black mt-1 tabular-nums ${
                  hotelCalc.baki.allIn < 0 ? 'text-rose-700' : 'text-slate-900'
                }`}
              >
                {formatRMNoSpace(hotelCalc.baki.allIn)}
              </div>
              <div
                className={`text-xs font-semibold mt-1.5 ${
                  hotelCalc.baki.allIn < 0 ? 'text-rose-700' : 'text-sky-800'
                }`}
              >
                {hotelCalc.baki.allIn < 0 ? 'Melebihi bajet' : 'Dalam lingkungan bajet'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Input Bajet & Bilik Hotel */}
            <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-4 sm:p-6 space-y-5">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Input Bajet &amp; Bilik Hotel
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isi semua petak kuning untuk mengira kos pakej hotel &amp; SST
                </p>
              </div>

              {/* Input BAJET */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <label
                  htmlFor="hotel-bajet-input"
                  className="block text-xs font-bold text-slate-800 uppercase tracking-wide"
                >
                  Bajet Keseluruhan (RM)
                </label>
                <div className="flex items-center rounded-lg border border-amber-400 bg-[#fef08a] px-3 min-h-[48px] focus-within:outline-2 focus-within:outline-slate-900">
                  <span className="font-black text-slate-900 select-none mr-2">RM</span>
                  <input
                    id="hotel-bajet-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="100"
                    value={hotelInputs.bajet}
                    onChange={(e) => {
                      const v = Math.max(0, parseFloat(e.target.value) || 0);
                      setHotelInputs((prev) => ({ ...prev, bajet: v }));
                    }}
                    className="w-full py-2 text-right text-lg font-black text-slate-900 bg-transparent focus:outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Kad Bilik Single */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Bilik Single</h3>
                  <span className="text-xs font-bold text-slate-600 tabular-nums">
                    All-In: {formatRMNoSpace(hotelCalc.single.allIn)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Rate / Malam
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
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
                      className="w-full min-h-[44px] px-2 rounded-lg border border-amber-400 bg-[#fef08a] text-center text-base font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Bil. Peserta
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
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
                      className="w-full min-h-[44px] px-2 rounded-lg border border-amber-400 bg-[#fef08a] text-center text-base font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Bil. Hari
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
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
                      className="w-full min-h-[44px] px-2 rounded-lg border border-amber-400 bg-[#fef08a] text-center text-base font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Kad Bilik Double */}
              <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Bilik Double</h3>
                  <span className="text-xs font-bold text-slate-600 tabular-nums">
                    All-In: {formatRMNoSpace(hotelCalc.double.allIn)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Rate / Malam
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
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
                      className="w-full min-h-[44px] px-2 rounded-lg border border-amber-400 bg-[#fef08a] text-center text-base font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Bil. Peserta
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
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
                      className="w-full min-h-[44px] px-2 rounded-lg border border-amber-400 bg-[#fef08a] text-center text-base font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Bil. Hari
                    </label>
                    <input
                      type="number"
                      inputMode="numeric"
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
                      className="w-full min-h-[44px] px-2 rounded-lg border border-amber-400 bg-[#fef08a] text-center text-base font-bold text-slate-900 focus:outline-2 focus:outline-slate-900 tabular-nums"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Keputusan Pengiraan Pakej Hotel */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. JUMLAH (PAKEJ) */}
              <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">Jumlah (Pakej)</h2>
                </div>
                <div className="divide-y divide-slate-200 text-xs sm:text-sm tabular-nums">
                  <div className="px-4 sm:px-6 py-2.5 bg-slate-50 grid grid-cols-4 gap-2 text-[11px] font-bold text-slate-500 uppercase">
                    <span>Bilik</span>
                    <span className="text-right">All-In</span>
                    <span className="text-right">SST 6%</span>
                    <span className="text-right">SST 8%</span>
                  </div>
                  <div className="px-4 sm:px-6 py-3 grid grid-cols-4 gap-2 items-center">
                    <span className="font-semibold text-slate-800">Single</span>
                    <span className="text-right text-slate-700">
                      {formatRMNoSpace(hotelCalc.single.allIn)}
                    </span>
                    <span className="text-right text-slate-700">
                      {formatRMNoSpace(hotelCalc.single.sst6)}
                    </span>
                    <span className="text-right text-slate-700">
                      {formatRMNoSpace(hotelCalc.single.sst8)}
                    </span>
                  </div>
                  <div className="px-4 sm:px-6 py-3 grid grid-cols-4 gap-2 items-center">
                    <span className="font-semibold text-slate-800">Double</span>
                    <span className="text-right text-slate-700">
                      {formatRMNoSpace(hotelCalc.double.allIn)}
                    </span>
                    <span className="text-right text-slate-700">
                      {formatRMNoSpace(hotelCalc.double.sst6)}
                    </span>
                    <span className="text-right text-slate-700">
                      {formatRMNoSpace(hotelCalc.double.sst8)}
                    </span>
                  </div>
                  <div className="px-4 sm:px-6 py-3.5 bg-slate-50 grid grid-cols-4 gap-2 items-center font-black text-slate-900">
                    <span>JUMLAH</span>
                    <span className="text-right">{formatRMNoSpace(hotelCalc.pkg.allIn)}</span>
                    <span className="text-right">{formatRMNoSpace(hotelCalc.pkg.sst6)}</span>
                    <span className="text-right">{formatRMNoSpace(hotelCalc.pkg.sst8)}</span>
                  </div>
                </div>
              </section>

              {/* 2. BAKI (BAJET - PAKEJ) */}
              <section className="bg-[#dbeafe]/60 rounded-xl border border-blue-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-3 border-b border-blue-200/80">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Baki (Bajet − Pakej)
                  </h2>
                </div>
                <div className="p-4 sm:px-6 grid grid-cols-1 sm:grid-cols-3 gap-3 tabular-nums">
                  {[
                    { label: 'All-In (Tanpa SST)', value: hotelCalc.baki.allIn },
                    { label: 'Dengan SST 6%', value: hotelCalc.baki.sst6 },
                    { label: 'Dengan SST 8%', value: hotelCalc.baki.sst8 },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="bg-white rounded-lg border border-blue-200/80 p-3 flex sm:block items-center justify-between"
                    >
                      <div className="text-xs font-semibold text-slate-600">{item.label}</div>
                      <div
                        className={`text-base sm:text-lg font-black sm:mt-1 ${
                          item.value < 0 ? 'text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        {formatRMNoSpace(item.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 3. JUMLAH (SST SAHAJA) */}
              <section className="bg-[#ffedd5]/60 rounded-xl border border-orange-200 overflow-hidden">
                <div className="px-4 sm:px-6 py-3.5 border-b border-orange-200/80">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Jumlah (SST Sahaja)
                  </h2>
                </div>
                <div className="divide-y divide-orange-200/70 text-xs sm:text-sm tabular-nums">
                  <div className="px-4 sm:px-6 py-2.5 bg-orange-100/50 grid grid-cols-4 gap-2 text-[11px] font-bold text-slate-700 uppercase">
                    <span>Bilik</span>
                    <span className="text-right">Tanpa SST</span>
                    <span className="text-right">SST 6%</span>
                    <span className="text-right">SST 8%</span>
                  </div>
                  <div className="px-4 sm:px-6 py-3 grid grid-cols-4 gap-2 items-center">
                    <span className="font-semibold text-slate-800">Single</span>
                    <span className="text-right text-slate-700">{formatRMNoSpace(0)}</span>
                    <span className="text-right text-slate-700">
                      {formatRMNoSpace(hotelCalc.single.sst6Only)}
                    </span>
                    <span className="text-right text-slate-700">
                      {formatRMNoSpace(hotelCalc.single.sst8Only)}
                    </span>
                  </div>
                  <div className="px-4 sm:px-6 py-3 grid grid-cols-4 gap-2 items-center">
                    <span className="font-semibold text-slate-800">Double</span>
                    <span className="text-right text-slate-700">{formatRMNoSpace(0)}</span>
                    <span className="text-right text-slate-700">
                      {formatRMNoSpace(hotelCalc.double.sst6Only)}
                    </span>
                    <span className="text-right text-slate-700">
                      {formatRMNoSpace(hotelCalc.double.sst8Only)}
                    </span>
                  </div>
                  <div className="px-4 sm:px-6 py-3.5 bg-orange-100/70 grid grid-cols-4 gap-2 items-center font-black text-slate-900">
                    <span>JUMLAH SST</span>
                    <span className="text-right">{formatRMNoSpace(hotelCalc.sstOnly.tanpa)}</span>
                    <span className="text-right">{formatRMNoSpace(hotelCalc.sstOnly.sst6)}</span>
                    <span className="text-right">{formatRMNoSpace(hotelCalc.sstOnly.sst8)}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* CTA Bawah untuk capaian ibu jari di mobile */}
      <div className="sm:hidden pt-1">
        <button
          type="button"
          onClick={() => openPreviewModal(selectedMode)}
          className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
        >
          <Eye className="w-4 h-4" />
          <span>Preview &amp; Simpan (A4 Potrait)</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* MODAL PREVIEW & SIMPAN (PAPARAN A4 POTRAIT)                    */}
      {/* ============================================================== */}
      {isPreviewOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="bg-white w-full max-w-5xl max-h-[94vh] rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3 shrink-0 bg-white">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Preview &amp; Simpan Dokumen (A4 Potrait)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pilih jenis pengiraan bajet untuk dipaparkan dalam format A4 Potret dan disimpan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                aria-label="Tutup Preview"
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Kawalan Pilihan Dokumen Preview & Maklumat Program */}
            <div className="px-4 sm:px-6 py-3 bg-slate-50 border-b border-slate-200 space-y-3 shrink-0">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1 bg-slate-200/70 rounded-xl w-full md:w-auto">
                  <button
                    type="button"
                    onClick={() => setPreviewOption('makanDobi')}
                    className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      previewOption === 'makanDobi'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>Pengiraan Bajet Makan Minum &amp; Dobi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewOption('hotel')}
                    className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                      previewOption === 'hotel'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-700 hover:text-slate-900'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" />
                    <span>Pengiraan Pakej Hotel</span>
                  </button>
                </div>
                <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">
                  Paparan A4 Potret (1 Muka Surat)
                </span>
              </div>

              {/* Medan Tambahan: NAMA PROGRAM, TARIKH, JABATAN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label
                    htmlFor="preview-nama-program"
                    className="block text-[11px] font-bold text-slate-700 uppercase mb-1"
                  >
                    Nama Program
                  </label>
                  <input
                    id="preview-nama-program"
                    type="text"
                    value={programRefTitle}
                    onChange={(e) => setProgramRefTitle(e.target.value)}
                    placeholder="Contoh: Kursus Kepimpinan..."
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="preview-tarikh"
                    className="block text-[11px] font-bold text-slate-700 uppercase mb-1"
                  >
                    Tarikh
                  </label>
                  <input
                    id="preview-tarikh"
                    type="text"
                    value={programDate}
                    onChange={(e) => setProgramDate(e.target.value)}
                    placeholder="Contoh: 15 - 17/11/2026"
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
                  />
                </div>
                <div>
                  <label
                    htmlFor="preview-jabatan"
                    className="block text-[11px] font-bold text-slate-700 uppercase mb-1"
                  >
                    Jabatan
                  </label>
                  <input
                    id="preview-jabatan"
                    type="text"
                    list="pengiraan-jabatan-list"
                    value={programJabatan}
                    onChange={(e) => setProgramJabatan(e.target.value)}
                    placeholder="Pilih atau taip nama jabatan..."
                    className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:outline-2 focus:outline-blue-600"
                  />
                  <datalist id="pengiraan-jabatan-list">
                    {jabatanOptions.map((jab) => (
                      <option key={jab} value={jab} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Viewport Kertas A4 Potrait (Skala Responsif Untuk Mobile & Desktop - 1 Page) */}
            <div
              ref={previewContainerRef}
              className="flex-1 overflow-y-auto bg-slate-200/80 p-3 sm:p-5 flex justify-center items-start"
            >
              <div
                style={{
                  width: `${Math.round(794 * previewScale)}px`,
                  height: `${Math.round(1123 * previewScale)}px`,
                }}
                className="relative shrink-0"
              >
                <div
                  style={{
                    width: '794px',
                    height: '1123px',
                    transform: `scale(${previewScale})`,
                    transformOrigin: 'top left',
                  }}
                  className="bg-white shadow-xl border border-slate-400 px-10 py-7 text-slate-900 flex flex-col justify-between overflow-hidden"
                >
                  <div className="space-y-3.5">
                    {/* Kepala Rasmi A4 Potret */}
                    <div className="text-center border-b-2 border-slate-800 pb-2.5">
                      <img
                        src={jataNegaraLogo}
                        alt="Jata Negara Malaysia"
                        className="h-12 w-auto mx-auto object-contain"
                      />
                      <div className="mt-1 text-[10.5px] font-bold tracking-wider uppercase text-slate-800">
                        KEMENTERIAN PENDIDIKAN · INSTITUT AMINUDDIN BAKI
                      </div>
                      <h3 className="text-base font-black tracking-wide uppercase text-slate-950 mt-1">
                        {previewOption === 'makanDobi'
                          ? 'PENGIRAAN BAJET MAKAN MINUM & DOBI'
                          : 'PENGIRAAN BAJET PAKEJ HOTEL'}
                      </h3>
                    </div>

                    {/* Jadual Maklumat Program (NAMA PROGRAM, TARIKH, JABATAN) */}
                    <table className="w-full table-fixed border-collapse text-[11px] border border-slate-800">
                      <colgroup>
                        <col className={previewOption === 'hotel' ? 'w-[28.57%]' : 'w-[21%]'} />
                        <col className={previewOption === 'hotel' ? 'w-[71.43%]' : 'w-[79%]'} />
                      </colgroup>
                      <tbody>
                        <tr>
                          <td className="border border-slate-800 bg-slate-100 font-bold py-1 px-2.5 uppercase">
                            NAMA PROGRAM:
                          </td>
                          <td className="border border-slate-800 py-1 px-2.5 font-bold uppercase truncate">
                            {programRefTitle.trim() || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-800 bg-slate-100 font-bold py-1 px-2.5 uppercase">
                            TARIKH:
                          </td>
                          <td className="border border-slate-800 py-1 px-2.5 font-medium">
                            {programDate.trim() || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-slate-800 bg-slate-100 font-bold py-1 px-2.5 uppercase">
                            JABATAN:
                          </td>
                          <td className="border border-slate-800 py-1 px-2.5 font-medium uppercase truncate">
                            {programJabatan.trim() || '-'}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    {previewOption === 'makanDobi' ? (
                      /* A4 Preview: Makan Minum & Dobi (Muat Kemas 1 Muka Surat) */
                      <div className="space-y-3 tabular-nums">
                        {/* A4 Table 1: Makan Minum */}
                        <table className="w-full table-fixed border-collapse text-[11px] border border-slate-800">
                          <colgroup>
                            <col className="w-[31%]" />
                            <col className="w-[15%]" />
                            <col className="w-[16%]" />
                            <col className="w-[16%]" />
                            <col className="w-[22%]" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th
                                colSpan={5}
                                className="border border-slate-800 bg-slate-100 text-slate-900 font-black text-center py-1.5 px-2.5 text-xs uppercase"
                              >
                                PENGIRAAN BAJET MAKAN MINUM
                              </th>
                            </tr>
                            <tr className="bg-slate-200 text-slate-900 font-bold text-center">
                              <th className="border border-slate-800 py-1 px-2.5 text-left">
                                KATEGORI
                              </th>
                              <th className="border border-slate-800 py-1 px-2 text-right">RM</th>
                              <th className="border border-slate-800 py-1 px-2">PESERTA</th>
                              <th className="border border-slate-800 py-1 px-2">BIL. HARI</th>
                              <th className="border border-slate-800 py-1 px-2.5 text-right">
                                JUMLAH
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {makanRows.map((row) => (
                              <tr key={row.key}>
                                <td className="border border-slate-800 bg-slate-200/70 font-bold py-1 px-2.5 text-left">
                                  {row.label}
                                </td>
                                <td className="border border-slate-800 py-1 px-2 text-right">
                                  {row.rm.toFixed(2)}
                                </td>
                                <td className="border border-slate-800 bg-[#fef08a] py-1 px-2 text-center font-bold">
                                  {row.peserta}
                                </td>
                                <td className="border border-slate-800 bg-[#fef08a] py-1 px-2 text-center font-bold">
                                  {row.bilHari}
                                </td>
                                <td className="border border-slate-800 py-1 px-2.5 text-right font-semibold">
                                  {formatRMNoSpace(row.jumlah)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Ringkasan SST Makan Minum (Selari Lajur Penuh) */}
                        <table className="w-full table-fixed border-collapse text-[11px] border border-slate-800">
                          <colgroup>
                            <col className="w-[46%]" />
                            <col className="w-[32%]" />
                            <col className="w-[22%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-slate-100 text-slate-900 font-bold">
                              <th className="border border-slate-800 py-1 px-2.5 text-center">
                                RINGKASAN MAKAN MINUM
                              </th>
                              <th className="border border-slate-800 py-1 px-2.5 text-right">
                                SST (TAMBAH)
                              </th>
                              <th className="border border-slate-800 py-1 px-2.5 text-right">
                                JUMLAH
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-slate-800 py-1 px-2.5 text-center font-bold">
                                (Tiada SST)
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right text-slate-500">
                                -
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right font-black">
                                {formatRMNoSpace(makanSubtotal)}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-slate-800 py-1 px-2.5 text-center font-bold">
                                SST 6%
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right">
                                {formatRMNoSpace(makanSst6Add)}
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right font-black">
                                {formatRMNoSpace(makanTotalSst6)}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-slate-800 py-1 px-2.5 text-center font-bold">
                                SST 8%
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right">
                                {formatRMNoSpace(makanSst8Add)}
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right font-black">
                                {formatRMNoSpace(makanTotalSst8)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* A4 Table 2: Pengiraan Dobi (Selari Lajur Penuh) */}
                        <table className="w-full table-fixed border-collapse text-[11px] border border-slate-800">
                          <colgroup>
                            <col className="w-[46%]" />
                            <col className="w-[16%]" />
                            <col className="w-[16%]" />
                            <col className="w-[22%]" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th
                                colSpan={4}
                                className="border border-slate-800 bg-slate-100 text-slate-900 font-black text-center py-1.5 px-2.5 text-xs uppercase"
                              >
                                PENGIRAAN DOBI
                              </th>
                            </tr>
                            <tr className="bg-slate-200 text-slate-900 font-bold text-center">
                              <th className="border border-slate-800 py-1 px-2.5 text-left">
                                INAPAN
                              </th>
                              <th className="border border-slate-800 py-1 px-2 text-right">RM</th>
                              <th className="border border-slate-800 py-1 px-2">PESERTA</th>
                              <th className="border border-slate-800 py-1 px-2.5 text-right">
                                JUMLAH
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {dobiRows.map((row) => (
                              <tr key={row.key}>
                                <td className="border border-slate-800 bg-slate-200/70 font-bold py-1 px-2.5 text-left">
                                  {row.label}
                                </td>
                                <td className="border border-slate-800 py-1 px-2 text-right">
                                  {row.rm.toFixed(2)}
                                </td>
                                <td className="border border-slate-800 bg-[#fef08a] py-1 px-2 text-center font-bold">
                                  {row.peserta}
                                </td>
                                <td className="border border-slate-800 py-1 px-2.5 text-right font-semibold">
                                  {formatRMNoSpace(row.jumlah)}
                                </td>
                              </tr>
                            ))}
                            <tr className="bg-slate-50 font-black">
                              <td
                                colSpan={3}
                                className="border border-slate-800 py-1 px-2.5 text-right"
                              >
                                JUMLAH DOBI
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right">
                                {formatRMNoSpace(dobiTotal)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* A4 Table 3: Jumlah Keseluruhan (Selari Lajur Penuh) */}
                        <table className="w-full table-fixed border-collapse text-[11px] border border-slate-800">
                          <colgroup>
                            <col className="w-[31%]" />
                            <col className="w-[23.5%]" />
                            <col className="w-[23.5%]" />
                            <col className="w-[22%]" />
                          </colgroup>
                          <thead>
                            <tr>
                              <th
                                colSpan={4}
                                className="border border-slate-800 bg-slate-100 text-slate-900 font-black text-center py-1.5 px-2.5 text-xs uppercase"
                              >
                                JUMLAH KESELURUHAN (MAKAN MINUM + DOBI)
                              </th>
                            </tr>
                            <tr className="bg-slate-200 text-slate-900 font-bold text-center">
                              <th className="border border-slate-800 py-1 px-2.5">KATEGORI SST</th>
                              <th className="border border-slate-800 py-1 px-2.5 text-right">
                                MAKAN MINUM
                              </th>
                              <th className="border border-slate-800 py-1 px-2.5 text-right">
                                DOBI
                              </th>
                              <th className="border border-slate-800 py-1 px-2.5 text-right">
                                JUMLAH
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-slate-800 py-1 px-2.5 text-center font-semibold">
                                (Tiada SST)
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right">
                                {formatRMNoSpace(makanSubtotal)}
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right">
                                {formatRMNoSpace(dobiTotal)}
                              </td>
                              <td className="border border-slate-800 bg-[#b8e994] py-1 px-2.5 text-right font-black">
                                {formatRMNoSpace(grandTiadaSst)}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-slate-800 py-1 px-2.5 text-center font-semibold">
                                SST 6%
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right">
                                {formatRMNoSpace(makanTotalSst6)}
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right">
                                {formatRMNoSpace(dobiTotal)}
                              </td>
                              <td className="border border-slate-800 bg-[#b8e994] py-1 px-2.5 text-right font-black">
                                {formatRMNoSpace(grandSst6)}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-slate-800 py-1 px-2.5 text-center font-semibold">
                                SST 8%
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right">
                                {formatRMNoSpace(makanTotalSst8)}
                              </td>
                              <td className="border border-slate-800 py-1 px-2.5 text-right">
                                {formatRMNoSpace(dobiTotal)}
                              </td>
                              <td className="border border-slate-800 bg-[#b8e994] py-1 px-2.5 text-right font-black">
                                {formatRMNoSpace(grandSst8)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      /* A4 Preview: Pakej Hotel — Semua Jadual Selari Lajur 4-Kolum & Garisan Kemas */
                      <div className="space-y-5 tabular-nums pt-1">
                        {/* Jadual 1: BAJET (Selari tepat dengan Lajur 1 & Lajur 2 di bawah) */}
                        <table className="w-[52.38%] table-fixed border-collapse text-xs border border-slate-800">
                          <colgroup>
                            <col className="w-[54.55%]" />
                            <col className="w-[45.45%]" />
                          </colgroup>
                          <tbody>
                            <tr>
                              <td className="border border-slate-800 bg-slate-200 font-black py-2 px-3 text-center">
                                BAJET
                              </td>
                              <td className="border border-slate-800 bg-[#fef08a] font-black py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.bajet)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Jadual 2: BILIK HOTEL Input */}
                        <table className="w-full table-fixed border-collapse text-xs border border-slate-800">
                          <colgroup>
                            <col className="w-[28.57%]" />
                            <col className="w-[23.81%]" />
                            <col className="w-[23.81%]" />
                            <col className="w-[23.81%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-slate-200 font-bold text-center">
                              <th className="border border-slate-800 py-2 px-3">BILIK HOTEL</th>
                              <th className="border border-slate-800 py-2 px-3">RATE PER NIGHT</th>
                              <th className="border border-slate-800 py-2 px-3">BIL. PESERTA</th>
                              <th className="border border-slate-800 py-2 px-3">BIL. HARI</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-slate-800 bg-slate-200/70 font-bold py-2 px-3 text-center">
                                Single
                              </td>
                              <td className="border border-slate-800 bg-[#fef08a] py-2 px-3 text-center font-bold">
                                {hotelInputs.single.rate}
                              </td>
                              <td className="border border-slate-800 bg-[#fef08a] py-2 px-3 text-center font-bold">
                                {hotelInputs.single.peserta}
                              </td>
                              <td className="border border-slate-800 bg-[#fef08a] py-2 px-3 text-center font-bold">
                                {hotelInputs.single.hari}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-slate-800 bg-slate-200/70 font-bold py-2 px-3 text-center">
                                Double
                              </td>
                              <td className="border border-slate-800 bg-[#fef08a] py-2 px-3 text-center font-bold">
                                {hotelInputs.double.rate}
                              </td>
                              <td className="border border-slate-800 bg-[#fef08a] py-2 px-3 text-center font-bold">
                                {hotelInputs.double.peserta}
                              </td>
                              <td className="border border-slate-800 bg-[#fef08a] py-2 px-3 text-center font-bold">
                                {hotelInputs.double.hari}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Jadual 3: JUMLAH (PAKEJ) */}
                        <table className="w-full table-fixed border-collapse text-xs border border-slate-800">
                          <colgroup>
                            <col className="w-[28.57%]" />
                            <col className="w-[23.81%]" />
                            <col className="w-[23.81%]" />
                            <col className="w-[23.81%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-slate-200 font-bold text-center">
                              <th className="border border-slate-800 py-2 px-3">BILIK HOTEL</th>
                              <th className="border border-slate-800 py-2 px-3">JUMLAH (ALL-IN)</th>
                              <th className="border border-slate-800 py-2 px-3">JUMLAH (SST 6%)</th>
                              <th className="border border-slate-800 py-2 px-3">JUMLAH (SST 8%)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-slate-800 bg-slate-200/70 font-bold py-2 px-3 text-center">
                                Single
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.single.allIn)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.single.sst6)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.single.sst8)}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-slate-800 bg-slate-200/70 font-bold py-2 px-3 text-center">
                                Double
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.double.allIn)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.double.sst6)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.double.sst8)}
                              </td>
                            </tr>
                            <tr className="bg-slate-50 font-black">
                              <td className="border border-slate-800 py-2 px-3 text-center">
                                JUMLAH (PAKEJ)
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.pkg.allIn)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.pkg.sst6)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.pkg.sst8)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Jadual 4: BAKI (BAJET - PAKEJ) */}
                        <table className="w-full table-fixed border-collapse text-xs border border-slate-800">
                          <colgroup>
                            <col className="w-[28.57%]" />
                            <col className="w-[23.81%]" />
                            <col className="w-[23.81%]" />
                            <col className="w-[23.81%]" />
                          </colgroup>
                          <tbody>
                            <tr className="bg-[#dbeafe] font-black">
                              <td className="border border-slate-800 py-2.5 px-3 text-center">
                                BAKI (BAJET - PAKEJ)
                              </td>
                              <td
                                className={`border border-slate-800 py-2.5 px-3 text-right ${
                                  hotelCalc.baki.allIn < 0 ? 'text-rose-700' : 'text-slate-900'
                                }`}
                              >
                                {formatRMNoSpace(hotelCalc.baki.allIn)}
                              </td>
                              <td
                                className={`border border-slate-800 py-2.5 px-3 text-right ${
                                  hotelCalc.baki.sst6 < 0 ? 'text-rose-700' : 'text-slate-900'
                                }`}
                              >
                                {formatRMNoSpace(hotelCalc.baki.sst6)}
                              </td>
                              <td
                                className={`border border-slate-800 py-2.5 px-3 text-right ${
                                  hotelCalc.baki.sst8 < 0 ? 'text-rose-700' : 'text-slate-900'
                                }`}
                              >
                                {formatRMNoSpace(hotelCalc.baki.sst8)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Jadual 5: JUMLAH (SST SAHAJA) */}
                        <table className="w-full table-fixed border-collapse text-xs border border-slate-800 bg-[#ffedd5]">
                          <colgroup>
                            <col className="w-[28.57%]" />
                            <col className="w-[23.81%]" />
                            <col className="w-[23.81%]" />
                            <col className="w-[23.81%]" />
                          </colgroup>
                          <thead>
                            <tr className="bg-[#fed7aa] font-bold text-center">
                              <th className="border border-slate-800 py-2 px-3">BILIK HOTEL</th>
                              <th className="border border-slate-800 py-2 px-3">TANPA SST</th>
                              <th className="border border-slate-800 py-2 px-3">SST 6%</th>
                              <th className="border border-slate-800 py-2 px-3">SST 8%</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-slate-800 py-2 px-3 text-center font-bold">
                                Single
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(0)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.single.sst6Only)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.single.sst8Only)}
                              </td>
                            </tr>
                            <tr>
                              <td className="border border-slate-800 py-2 px-3 text-center font-bold">
                                Double
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(0)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.double.sst6Only)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.double.sst8Only)}
                              </td>
                            </tr>
                            <tr className="font-black bg-[#fed7aa]/60">
                              <td className="border border-slate-800 py-2 px-3 text-center">
                                JUMLAH (SST SAHAJA)
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.sstOnly.tanpa)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.sstOnly.sst6)}
                              </td>
                              <td className="border border-slate-800 py-2 px-3 text-right">
                                {formatRMNoSpace(hotelCalc.sstOnly.sst8)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Nota Kaki Rasmi Kertas A4 */}
                  <div className="pt-2.5 border-t border-slate-300 text-center text-[10px] text-slate-500">
                    Dokumen pengiraan bajet ini dijana melalui Portal Maklumat Program IAB · Format
                    A4 Potret (1 Muka Surat)
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal: Butang Simpan */}
            <div className="px-4 sm:px-6 py-3.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer order-3 sm:order-1"
              >
                Tutup
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 order-1 sm:order-2">
                <button
                  type="button"
                  onClick={() => handleExportExcel(previewOption)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-slate-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
                  <span>Simpan Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSavePdfA4Portrait(previewOption)}
                  className="min-h-[44px] inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer whitespace-nowrap shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <FileText className="w-4 h-4" />
                  <span>Simpan PDF (A4 Potret)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
