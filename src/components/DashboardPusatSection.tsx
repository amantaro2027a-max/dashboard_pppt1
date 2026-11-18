import React, { useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Pegawai, ProgramItem } from '../types/program';
import { formatRM, formatRMWithPrefix, getStatusConfig } from '../utils/formatters';
import { getProgramFinanceAggregate } from '../utils/financeCalculations';
import { getProgramYear } from '../utils/financeYear';
import {
  computeNearOrOverduePrograms,
  computeOfficerInvolvementList,
  computeProgramStatusKpis,
  computeRoleInvolvementSummary,
  formatDisplayDate,
  groupProgramsByField,
  groupProgramsByMonth,
  groupProgramsByYear,
  ROLE_COLORS,
  ROLE_LABELS,
} from '../utils/dashboardAnalytics';
import { OrgProgramCalendar } from './OrgProgramCalendar';
import {
  AlertTriangle,
  BarChart3,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Landmark,
  PieChart,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';

interface DashboardPusatSectionProps {
  selectedPusat: string;
  filterTahun: string;
  jabatansUnderPusat: string[];
  pusatPrograms: ProgramItem[]; // Year-filtered & deduplicated by Kod Program
  allPusatPrograms: ProgramItem[]; // All years for selectedPusat (deduplicated)
  pusatOfficers: Pegawai[];
  allPegawaiList: Pegawai[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  onViewProgram: (p: ProgramItem) => void;
  onDrillDown: (title: string, subtitle: string, items: ProgramItem[]) => void;
  onLogExport: (description: string) => void;
  onNotify: (payload: { type: 'success' | 'error'; title: string; message: string }) => void;
}

const STATUS_BAR_COLORS: Record<string, string> = {
  SELESAI: '#059669',
  'DALAM TINDAKAN': '#1d4ed8',
  TANGGUNG: '#d97706',
  'BELUM AMBIL TINDAKAN': '#64748b',
  BATAL: '#e11d48',
};

const OS_KEYS = [
  { key: 'os21000' as const, label: 'OS21000', desc: 'Perjalanan & Sara Hidup' },
  { key: 'os24000' as const, label: 'OS24000', desc: 'Sewaan & Kemudahan' },
  { key: 'os27000' as const, label: 'OS27000', desc: 'Bekalan & Bahan' },
  { key: 'os29000' as const, label: 'OS29000', desc: 'Perkhidmatan Ikhtisas' },
];

type FinanceTab = 'JABATAN' | 'PROGRAM' | 'TAHUN' | 'OS';

export const DashboardPusatSection: React.FC<DashboardPusatSectionProps> = ({
  selectedPusat,
  filterTahun,
  jabatansUnderPusat,
  pusatPrograms,
  allPusatPrograms,
  pusatOfficers,
  allPegawaiList,
  isExpanded,
  onToggleExpand,
  onViewProgram,
  onDrillDown,
  onLogExport,
  onNotify,
}) => {
  const [hoveredRole, setHoveredRole] = useState<'PENGURUS' | 'PENGURUS BERSAMA' | 'URUS SETIA' | null>(null);
  const [financeTab, setFinanceTab] = useState<FinanceTab>('JABATAN');

  const statusKpis = useMemo(() => computeProgramStatusKpis(pusatPrograms), [pusatPrograms]);

  const financeAgg = useMemo(
    () => getProgramFinanceAggregate(pusatPrograms, true),
    [pusatPrograms]
  );

  const officerInvolvements = useMemo(
    () => computeOfficerInvolvementList(pusatPrograms, pusatOfficers, allPegawaiList),
    [pusatPrograms, pusatOfficers, allPegawaiList]
  );

  const activeOfficersCount = useMemo(
    () => officerInvolvements.filter((o) => o.totalUniquePrograms > 0).length,
    [officerInvolvements]
  );

  const byJabatan = useMemo(() => {
    const map = new Map<string, ProgramItem[]>();
    jabatansUnderPusat.forEach((j) => map.set(j, []));
    pusatPrograms.forEach((p) => {
      const j = (p.jabatan || 'TIDAK DINYATAKAN').trim();
      const arr = map.get(j) || [];
      arr.push(p);
      map.set(j, arr);
    });
    return Array.from(map.entries())
      .map(([jabatan, items]) => {
        const fin = getProgramFinanceAggregate(items, true);
        const selesai = items.filter((i) => (i.statusProgram || '').trim().toUpperCase() === 'SELESAI').length;
        return {
          jabatan,
          count: items.length,
          selesai,
          programs: items,
          diagihkan: fin.diagihkan,
          belanja: fin.belanja,
          penjimatan: fin.penjimatan,
        };
      })
      .sort((a, b) => b.count - a.count || b.diagihkan.total - a.diagihkan.total || a.jabatan.localeCompare(b.jabatan));
  }, [jabatansUnderPusat, pusatPrograms]);

  const byStatus = useMemo(
    () =>
      groupProgramsByField(pusatPrograms, (p) =>
        (p.statusProgram || 'BELUM AMBIL TINDAKAN').trim().toUpperCase()
      ),
    [pusatPrograms]
  );

  const byJenis = useMemo(
    () =>
      groupProgramsByField(pusatPrograms, (p) =>
        (p.jenisProgram || 'TIDAK DINYATAKAN').trim().toUpperCase()
      ),
    [pusatPrograms]
  );

  const byYear = useMemo(() => groupProgramsByYear(allPusatPrograms), [allPusatPrograms]);

  const byYearWithOs = useMemo(() => {
    const map = new Map<number, ProgramItem[]>();
    allPusatPrograms.forEach((p) => {
      const yr = getProgramYear(p);
      const arr = map.get(yr) || [];
      arr.push(p);
      map.set(yr, arr);
    });
    return Array.from(map.entries())
      .map(([tahun, items]) => ({
        tahun,
        count: items.length,
        fin: getProgramFinanceAggregate(items, true),
        programs: items,
      }))
      .sort((a, b) => b.tahun - a.tahun);
  }, [allPusatPrograms]);

  const byMonth = useMemo(() => groupProgramsByMonth(pusatPrograms), [pusatPrograms]);

  const roleSummary = useMemo(
    () => computeRoleInvolvementSummary(pusatPrograms),
    [pusatPrograms]
  );

  const nearOrOverdue = useMemo(
    () => computeNearOrOverduePrograms(pusatPrograms),
    [pusatPrograms]
  );

  const roleDonutSegments = useMemo(() => {
    const items = [
      {
        role: 'PENGURUS' as const,
        label: ROLE_LABELS.PENGURUS,
        count: roleSummary.pengurus.count,
        programs: roleSummary.pengurus.programs,
        color: ROLE_COLORS.PENGURUS,
      },
      {
        role: 'PENGURUS BERSAMA' as const,
        label: ROLE_LABELS['PENGURUS BERSAMA'],
        count: roleSummary.pengurusBersama.count,
        programs: roleSummary.pengurusBersama.programs,
        color: ROLE_COLORS['PENGURUS BERSAMA'],
      },
      {
        role: 'URUS SETIA' as const,
        label: ROLE_LABELS['URUS SETIA'],
        count: roleSummary.urusSetia.count,
        programs: roleSummary.urusSetia.programs,
        color: ROLE_COLORS['URUS SETIA'],
      },
    ];
    const totalAssign = items.reduce((sum, i) => sum + i.count, 0);
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    let offsetAcc = 0;

    return {
      totalAssign,
      circumference,
      segments: items.map((item) => {
        const pct = totalAssign > 0 ? Math.round((item.count / totalAssign) * 100) : 0;
        const dashLength = totalAssign > 0 ? (item.count / totalAssign) * circumference : 0;
        const dashOffset = -offsetAcc;
        offsetAcc += dashLength;
        return { ...item, pct, dashLength, dashOffset };
      }),
    };
  }, [roleSummary]);

  const bk04HistoryRows = useMemo(() => {
    const rows: Array<{
      kodProgram: string;
      namaProgram: string;
      jabatan: string;
      statusProgram: string;
      noPindaan: number;
      tarikhPindaan: string;
      dikemaskiniOleh: string;
      butiran: string;
    }> = [];
    pusatPrograms.forEach((p) => {
      const pindaanList = p.rekodPindaan || [];
      if (pindaanList.length === 0) {
        rows.push({
          kodProgram: p.kodProgram,
          namaProgram: p.namaProgram,
          jabatan: p.jabatan,
          statusProgram: p.statusProgram || 'BELUM AMBIL TINDAKAN',
          noPindaan: 0,
          tarikhPindaan: '-',
          dikemaskiniOleh: '-',
          butiran: 'Tiada rekod pindaan BK04',
        });
      } else {
        pindaanList.forEach((rec) => {
          const detailStr = (rec.perubahan || [])
            .map((ch) => `${ch.jenisPerubahan}: ${ch.maklumatAsal || '-'} -> ${ch.maklumatTerkini || '-'}`)
            .join('; ');
          rows.push({
            kodProgram: p.kodProgram,
            namaProgram: p.namaProgram,
            jabatan: p.jabatan,
            statusProgram: p.statusProgram || 'BELUM AMBIL TINDAKAN',
            noPindaan: rec.noPindaan,
            tarikhPindaan: rec.tarikhPindaan || '-',
            dikemaskiniOleh: rec.dikemaskiniOleh || '-',
            butiran: detailStr || '-',
          });
        });
      }
    });
    return rows;
  }, [pusatPrograms]);

  const maxJabatanProg = Math.max(1, ...byJabatan.map((j) => j.count));
  const maxJabatanBudget = Math.max(1, ...byJabatan.map((j) => j.diagihkan.total));
  const maxOfficerProg = Math.max(1, ...officerInvolvements.map((o) => o.totalUniquePrograms));
  const maxStatusCount = Math.max(1, ...byStatus.map((s) => s.count));
  const maxJenisCount = Math.max(1, ...byJenis.map((j) => j.count));
  const maxYearCount = Math.max(1, ...byYear.map((y) => y.count));
  const maxMonthCount = Math.max(1, ...byMonth.map((m) => m.count));
  const maxOsAmount = Math.max(1, ...OS_KEYS.map((o) => financeAgg.diagihkan[o.key]));

  const sortedProgramsFinance = useMemo(() => {
    return [...pusatPrograms].sort((a, b) => (Number(b.jumlahRm) || 0) - (Number(a.jumlahRm) || 0));
  }, [pusatPrograms]);

  // Helper to generate institutional PDF reports
  const generatePdfReport = (
    reportTitle: string,
    filePrefix: string,
    headers: string[],
    body: Array<Array<string | number>>,
    rightAlignedCols: number[] = []
  ) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageWidth, 21, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('KEMENTERIAN PENDIDIKAN MALAYSIA · INSTITUT AMINUDDIN BAKI (IAB)', margin, 7.5);
      doc.setFontSize(11.5);
      doc.text(reportTitle.toUpperCase(), margin, 15);

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const tarikhStr = new Date().toLocaleDateString('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const yearLabel = filterTahun === 'SEMUA' ? 'Semua Tahun' : `Tahun ${filterTahun}`;
      doc.text(
        `Pusat: ${selectedPusat || '-'} | Skop: ${yearLabel} | Jumlah Rekod: ${body.length} | Tarikh Dijana: ${tarikhStr}`,
        margin,
        27
      );

      const columnStyles: Record<number, { halign: 'right' }> = {};
      rightAlignedCols.forEach((colIdx) => {
        columnStyles[colIdx] = { halign: 'right' };
      });

      autoTable(doc, {
        head: [headers],
        body,
        startY: 31,
        margin: { left: margin, right: margin, bottom: 12 },
        styles: {
          fontSize: 7.5,
          cellPadding: 2,
          overflow: 'linebreak',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles,
      });

      const safePusat = (selectedPusat || 'IAB').replace(/[^A-Z0-9]/gi, '_').slice(0, 24);
      const fileName = `${filePrefix}_${safePusat}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);
      onLogExport(`Muat turun PDF: ${reportTitle} (${selectedPusat})`);
      onNotify({
        type: 'success',
        title: 'Laporan PDF Berjaya Dijana',
        message: `${reportTitle} telah dimuat turun sebagai fail PDF.`,
      });
    } catch {
      onNotify({
        type: 'error',
        title: 'Gagal Menjana PDF',
        message: 'Berlaku ralat semasa menjana dokumen PDF. Sila cuba semula.',
      });
    }
  };

  const generateExcelReport = (
    reportTitle: string,
    sheetName: string,
    filePrefix: string,
    rows: Array<Record<string, string | number>>
  ) => {
    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
      const safePusat = (selectedPusat || 'IAB').replace(/[^A-Z0-9]/gi, '_').slice(0, 24);
      XLSX.writeFile(
        wb,
        `${filePrefix}_${safePusat}_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      onLogExport(`Muat turun Excel: ${reportTitle} (${selectedPusat})`);
      onNotify({
        type: 'success',
        title: 'Laporan Excel Berjaya Dijana',
        message: `${reportTitle} telah dimuat turun sebagai fail Excel (.xlsx).`,
      });
    } catch {
      onNotify({
        type: 'error',
        title: 'Gagal Menjana Excel',
        message: 'Berlaku ralat semasa menjana fail Excel. Sila cuba semula.',
      });
    }
  };

  // 5 Report definitions
  const reportModules = [
    {
      id: 'prestasi_pusat',
      title: '1. Prestasi Keseluruhan Program Pusat',
      desc: 'Senarai lengkap program unik di bawah Pusat berserta status, tempoh, pengurusan, peserta & kewangan BK65.',
      countLabel: `${pusatPrograms.length} Program`,
      onPdf: () =>
        generatePdfReport(
          'Laporan Prestasi Keseluruhan Program Pusat',
          'LAPORAN_PRESTASI_PUSAT',
          [
            'Bil',
            'Kod',
            'Nama Program',
            'Jabatan',
            'Jenis',
            'Tempoh',
            'Pengurus',
            'Peserta',
            'BK65 (RM)',
            'Belanja (RM)',
            'Status',
          ],
          pusatPrograms.map((p, i) => [
            i + 1,
            p.kodProgram,
            p.namaProgram,
            p.jabatan,
            p.jenisProgram || '-',
            p.tempoh || formatDisplayDate(p.tarikhMula),
            p.pengurusNama || '-',
            p.bilanganPeserta || 0,
            formatRM(p.jumlahRm),
            formatRM(p.jumlahBelanjaRm || 0),
            p.statusProgram || '-',
          ]),
          [0, 7, 8, 9]
        ),
      onExcel: () =>
        generateExcelReport(
          'Prestasi Keseluruhan Program Pusat',
          'Prestasi Program Pusat',
          'LAPORAN_PRESTASI_PUSAT',
          pusatPrograms.map((p, i) => ({
            Bil: i + 1,
            'Kod Program': p.kodProgram,
            'Nama Program': p.namaProgram,
            Jabatan: p.jabatan,
            'Jenis Program': p.jenisProgram || '-',
            'Tarikh Mula': p.tarikhMula || '-',
            'Tarikh Tamat': p.tarikhTamat || '-',
            Tempoh: p.tempoh || '-',
            Pengurus: p.pengurusNama || '-',
            'Pengurus Bersama': p.pengurusBersamaNama || '-',
            'Urus Setia': p.urusSetiaNama || '-',
            'Bil. Peserta': Number(p.bilanganPeserta) || 0,
            'Peruntukan BK65 (RM)': Number(p.jumlahRm) || 0,
            'Belanja Sebenar (RM)': Number(p.jumlahBelanjaRm) || 0,
            'Penjimatan (RM)': Number(p.jumlahPenjimatanRm) || 0,
            'Status Program': p.statusProgram || '-',
          }))
        ),
    },
    {
      id: 'prestasi_jabatan',
      title: '2. Prestasi Program Mengikut Jabatan',
      desc: 'Perbandingan prestasi pelaksanaan, kadar selesai dan jumlah kewangan setiap Jabatan di bawah Pusat.',
      countLabel: `${byJabatan.length} Jabatan`,
      onPdf: () =>
        generatePdfReport(
          'Laporan Prestasi Program Mengikut Jabatan',
          'LAPORAN_PRESTASI_JABATAN',
          [
            'Bil',
            'Nama Jabatan',
            'Jumlah Prog',
            'Selesai',
            'Dalam Tindakan',
            'Tanggung',
            'Batal',
            'BK65 (RM)',
            'Belanja (RM)',
            'Penjimatan (RM)',
          ],
          byJabatan.map((j, i) => {
            const dalam = j.programs.filter(
              (p) => (p.statusProgram || '').trim().toUpperCase() === 'DALAM TINDAKAN'
            ).length;
            const tanggung = j.programs.filter(
              (p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG'
            ).length;
            const batal = j.programs.filter(
              (p) => (p.statusProgram || '').trim().toUpperCase() === 'BATAL'
            ).length;
            return [
              i + 1,
              j.jabatan,
              j.count,
              j.selesai,
              dalam,
              tanggung,
              batal,
              formatRM(j.diagihkan.total),
              formatRM(j.belanja.total),
              formatRM(j.penjimatan.total),
            ];
          }),
          [0, 2, 3, 4, 5, 6, 7, 8, 9]
        ),
      onExcel: () =>
        generateExcelReport(
          'Prestasi Program Mengikut Jabatan',
          'Prestasi Jabatan',
          'LAPORAN_PRESTASI_JABATAN',
          byJabatan.map((j, i) => {
            const dalam = j.programs.filter(
              (p) => (p.statusProgram || '').trim().toUpperCase() === 'DALAM TINDAKAN'
            ).length;
            const tanggung = j.programs.filter(
              (p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG'
            ).length;
            const batal = j.programs.filter(
              (p) => (p.statusProgram || '').trim().toUpperCase() === 'BATAL'
            ).length;
            return {
              Bil: i + 1,
              'Nama Jabatan': j.jabatan,
              'Jumlah Program': j.count,
              Selesai: j.selesai,
              'Dalam Tindakan': dalam,
              Tanggung: tanggung,
              Batal: batal,
              'Peruntukan BK65 (RM)': j.diagihkan.total,
              'Belanja Sebenar (RM)': j.belanja.total,
              'Penjimatan (RM)': j.penjimatan.total,
            };
          })
        ),
    },
    {
      id: 'penglibatan_pegawai',
      title: '3. Penglibatan Pegawai Mengikut Program & Peranan',
      desc: 'Pecahan tugasan pegawai sebagai Pengurus, Pengurus Bersama dan Urus Setia tanpa pengiraan berganda.',
      countLabel: `${officerInvolvements.length} Pegawai`,
      onPdf: () =>
        generatePdfReport(
          'Laporan Penglibatan Pegawai Mengikut Program & Peranan',
          'LAPORAN_PENGLIBATAN_PEGAWAI',
          [
            'Bil',
            'ID Pegawai',
            'Nama Pegawai',
            'Jabatan',
            'Pengurus',
            'Pengurus Bersama',
            'Urus Setia',
            'Program Unik',
            'Selesai',
            'BK65 Kendalian (RM)',
          ],
          officerInvolvements.map((o, i) => [
            i + 1,
            o.pegawai.id,
            o.pegawai.nama,
            o.pegawai.jabatan || '-',
            o.pengurusCount,
            o.pengurusBersamaCount,
            o.urusSetiaCount,
            o.totalUniquePrograms,
            o.selesaiCount,
            formatRM(o.peruntukan),
          ]),
          [0, 4, 5, 6, 7, 8, 9]
        ),
      onExcel: () =>
        generateExcelReport(
          'Penglibatan Pegawai Mengikut Program & Peranan',
          'Penglibatan Pegawai',
          'LAPORAN_PENGLIBATAN_PEGAWAI',
          officerInvolvements.map((o, i) => ({
            Bil: i + 1,
            'ID Pegawai': o.pegawai.id,
            'Nama Pegawai': o.pegawai.nama,
            Jabatan: o.pegawai.jabatan || '-',
            Jawatan: o.pegawai.jawatan || '-',
            'Sebagai Pengurus': o.pengurusCount,
            'Sebagai Pengurus Bersama': o.pengurusBersamaCount,
            'Sebagai Urus Setia': o.urusSetiaCount,
            'Jumlah Program Unik': o.totalUniquePrograms,
            Selesai: o.selesaiCount,
            'Peruntukan Kendalian (RM)': o.peruntukan,
            'Belanja Sebenar (RM)': o.belanja,
          }))
        ),
    },
    {
      id: 'kewangan_os_bk65',
      title: '4. Peruntukan Kewangan Mengikut Kod OS (BK65)',
      desc: 'Pecahan OS21000, OS24000, OS27000 dan OS29000 bagi setiap jabatan dan jumlah keseluruhan BK65 Pusat.',
      countLabel: formatRMWithPrefix(financeAgg.diagihkan.total),
      onPdf: () =>
        generatePdfReport(
          'Laporan Peruntukan Kewangan Mengikut Kod OS (BK65)',
          'LAPORAN_KEWANGAN_OS_BK65',
          [
            'Bil',
            'Jabatan / Ringkasan',
            'Bil Prog',
            'OS21000 (RM)',
            'OS24000 (RM)',
            'OS27000 (RM)',
            'OS29000 (RM)',
            'Jumlah BK65 (RM)',
            'Belanja (RM)',
          ],
          [
            ...byJabatan.map((j, i) => [
              i + 1,
              j.jabatan,
              j.count,
              formatRM(j.diagihkan.os21000),
              formatRM(j.diagihkan.os24000),
              formatRM(j.diagihkan.os27000),
              formatRM(j.diagihkan.os29000),
              formatRM(j.diagihkan.total),
              formatRM(j.belanja.total),
            ]),
            [
              '-',
              'JUMLAH KESELURUHAN PUSAT (UNIK)',
              pusatPrograms.length,
              formatRM(financeAgg.diagihkan.os21000),
              formatRM(financeAgg.diagihkan.os24000),
              formatRM(financeAgg.diagihkan.os27000),
              formatRM(financeAgg.diagihkan.os29000),
              formatRM(financeAgg.diagihkan.total),
              formatRM(financeAgg.belanja.total),
            ],
          ],
          [0, 2, 3, 4, 5, 6, 7, 8]
        ),
      onExcel: () =>
        generateExcelReport(
          'Peruntukan Kewangan Mengikut Kod OS (BK65)',
          'Kewangan Kod OS BK65',
          'LAPORAN_KEWANGAN_OS_BK65',
          [
            ...byJabatan.map((j, i) => ({
              Bil: i + 1,
              Jabatan: j.jabatan,
              'Bilangan Program': j.count,
              'OS21000 (RM)': j.diagihkan.os21000,
              'OS24000 (RM)': j.diagihkan.os24000,
              'OS27000 (RM)': j.diagihkan.os27000,
              'OS29000 (RM)': j.diagihkan.os29000,
              'Jumlah BK65 (RM)': j.diagihkan.total,
              'Belanja Sebenar (RM)': j.belanja.total,
              'Penjimatan (RM)': j.penjimatan.total,
            })),
            {
              Bil: 0,
              Jabatan: 'JUMLAH KESELURUHAN PUSAT (UNIK)',
              'Bilangan Program': pusatPrograms.length,
              'OS21000 (RM)': financeAgg.diagihkan.os21000,
              'OS24000 (RM)': financeAgg.diagihkan.os24000,
              'OS27000 (RM)': financeAgg.diagihkan.os27000,
              'OS29000 (RM)': financeAgg.diagihkan.os29000,
              'Jumlah BK65 (RM)': financeAgg.diagihkan.total,
              'Belanja Sebenar (RM)': financeAgg.belanja.total,
              'Penjimatan (RM)': financeAgg.penjimatan.total,
            },
          ]
        ),
    },
    {
      id: 'status_sejarah_bk04',
      title: '5. Status Program & Sejarah Pindaan (BK04)',
      desc: 'Status semasa setiap program serta log terperinci semua rekod pindaan BK04 dan pegawai pengemaskini.',
      countLabel: `${bk04HistoryRows.length} Rekod`,
      onPdf: () =>
        generatePdfReport(
          'Laporan Status Program & Sejarah Pindaan (BK04)',
          'LAPORAN_STATUS_PINDAAN_BK04',
          [
            'Bil',
            'Kod Program',
            'Nama Program',
            'Jabatan',
            'Status',
            'No Pindaan',
            'Tarikh Pindaan',
            'Dikemaskini Oleh',
            'Butiran Pindaan BK04',
          ],
          bk04HistoryRows.map((r, i) => [
            i + 1,
            r.kodProgram,
            r.namaProgram,
            r.jabatan,
            r.statusProgram,
            r.noPindaan > 0 ? `#${r.noPindaan}` : '-',
            r.tarikhPindaan,
            r.dikemaskiniOleh,
            r.butiran,
          ]),
          [0, 5]
        ),
      onExcel: () =>
        generateExcelReport(
          'Status Program & Sejarah Pindaan (BK04)',
          'Status & Pindaan BK04',
          'LAPORAN_STATUS_PINDAAN_BK04',
          bk04HistoryRows.map((r, i) => ({
            Bil: i + 1,
            'Kod Program': r.kodProgram,
            'Nama Program': r.namaProgram,
            Jabatan: r.jabatan,
            'Status Program': r.statusProgram,
            'No. Pindaan BK04': r.noPindaan,
            'Tarikh Pindaan': r.tarikhPindaan,
            'Dikemaskini Oleh': r.dikemaskiniOleh,
            'Butiran Perubahan': r.butiran,
          }))
        ),
    },
  ];

  // 9 Dynamic KPI Cards
  const kpiCards = [
    {
      label: 'Jumlah Keseluruhan Program',
      value: statusKpis.total,
      accent: 'text-slate-900',
      sub: 'Kod program unik Pusat',
      onClick: () =>
        onDrillDown(
          `Semua Program · ${selectedPusat}`,
          `${statusKpis.total} program (${filterTahun === 'SEMUA' ? 'Semua Tahun' : `Tahun ${filterTahun}`})`,
          pusatPrograms
        ),
    },
    {
      label: 'Program Selesai',
      value: statusKpis.selesai,
      accent: 'text-emerald-700',
      sub: `${statusKpis.total > 0 ? Math.round((statusKpis.selesai / statusKpis.total) * 100) : 0}% kadar selesai`,
      onClick: () =>
        onDrillDown(
          `Program Selesai · ${selectedPusat}`,
          `${statusKpis.selesai} program`,
          pusatPrograms.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'SELESAI')
        ),
    },
    {
      label: 'Program Tanggung',
      value: statusKpis.tanggung,
      accent: 'text-amber-700',
      sub: 'Status Tanggung',
      onClick: () =>
        onDrillDown(
          `Program Tanggung · ${selectedPusat}`,
          `${statusKpis.tanggung} program`,
          pusatPrograms.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'TANGGUNG')
        ),
    },
    {
      label: 'Program Dalam Tindakan',
      value: statusKpis.dalamTindakan,
      accent: 'text-blue-800',
      sub: 'Sedang dilaksanakan',
      onClick: () =>
        onDrillDown(
          `Program Dalam Tindakan · ${selectedPusat}`,
          `${statusKpis.dalamTindakan} program`,
          pusatPrograms.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'DALAM TINDAKAN')
        ),
    },
    {
      label: 'Program Belum Ambil Tindakan',
      value: statusKpis.belum,
      accent: 'text-slate-700',
      sub: 'Menunggu tindakan',
      onClick: () =>
        onDrillDown(
          `Belum Ambil Tindakan · ${selectedPusat}`,
          `${statusKpis.belum} program`,
          pusatPrograms.filter((p) => {
            const st = (p.statusProgram || '').trim().toUpperCase();
            return !['SELESAI', 'TANGGUNG', 'DALAM TINDAKAN', 'BATAL'].includes(st);
          })
        ),
    },
    {
      label: 'Program Batal',
      value: statusKpis.batal,
      accent: 'text-rose-700',
      sub: 'Dibatalkan',
      onClick: () =>
        onDrillDown(
          `Program Batal · ${selectedPusat}`,
          `${statusKpis.batal} program`,
          pusatPrograms.filter((p) => (p.statusProgram || '').trim().toUpperCase() === 'BATAL')
        ),
    },
    {
      label: 'Jumlah Jabatan',
      value: jabatansUnderPusat.length,
      accent: 'text-slate-900',
      sub: 'Di bawah Pusat',
      onClick: undefined,
    },
    {
      label: 'Jumlah Pegawai Terlibat',
      value: activeOfficersCount,
      accent: 'text-blue-900',
      sub: `${pusatOfficers.length} berdaftar di Pusat`,
      onClick: undefined,
    },
    {
      label: 'Jumlah Peruntukan Diterima',
      value: formatRMWithPrefix(financeAgg.diagihkan.total),
      accent: 'text-blue-950',
      sub: 'BK65 Pusat (unik)',
      isCurrency: true,
      onClick: undefined,
    },
  ];

  return (
    <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Collapsible Header */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer"
      >
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">
            Dashboard Pusat · Analitik, Kewangan BK65, Kalendar &amp; Pelaporan
          </span>
          <h3 className="text-base font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <Landmark className="w-4 h-4 text-blue-900" />
            <span>DASHBOARD PUSAT ({selectedPusat || '-'})</span>
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Paparan bersepadu prestasi jabatan dan pegawai, pecahan kewangan BK65 mengikut Kod OS, pemantauan tarikh, kalendar berpusat serta muat turun laporan PDF &amp; Excel.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Skop Paparan
            </span>
            <span className="text-xs font-black text-slate-900 font-mono tabular-nums">
              {statusKpis.total} Program · {filterTahun === 'SEMUA' ? 'Semua Tahun' : `Tahun ${filterTahun}`}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg whitespace-nowrap">
            <span>{isExpanded ? 'Sembunyi' : 'Papar'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-5 sm:p-6 border-t border-slate-200 bg-slate-50/40 space-y-6">
          {/* 1. DYNAMIC KPI CARDS (9 CARDS) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {kpiCards.map((card) => {
              const Wrapper = card.onClick ? 'button' : 'div';
              return (
                <Wrapper
                  key={card.label}
                  {...(card.onClick ? { type: 'button' as const, onClick: card.onClick } : {})}
                  className={`text-left bg-white border border-slate-200 rounded-xl p-4 transition-colors ${
                    card.onClick ? 'hover:border-blue-900 cursor-pointer' : ''
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block leading-snug">
                    {card.label}
                  </span>
                  <span
                    className={`mt-2 block font-black font-mono tabular-nums ${card.accent} ${
                      card.isCurrency ? 'text-lg' : 'text-2xl'
                    }`}
                  >
                    {card.value}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-1 block">{card.sub}</span>
                </Wrapper>
              );
            })}
          </div>

          {/* 2. INTERACTIVE CHARTS: JABATAN & PEGAWAI */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Program Mengikut Jabatan */}
            <div className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                    Pecahan Mengikut Jabatan
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <Building2 className="w-4 h-4 text-blue-900" />
                    <span>Program Mengikut Jabatan ({byJabatan.length})</span>
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Klik jabatan untuk drill-down</span>
              </div>

              {byJabatan.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">Tiada jabatan direkodkan.</p>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {byJabatan.map((j) => {
                    const barW = (j.count / maxJabatanProg) * 100;
                    return (
                      <button
                        key={j.jabatan}
                        type="button"
                        onClick={() =>
                          onDrillDown(
                            j.jabatan,
                            `${j.count} program (${j.selesai} selesai) · ${formatRMWithPrefix(j.diagihkan.total)}`,
                            j.programs
                          )
                        }
                        className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-900 bg-slate-50/50 hover:bg-white transition-colors cursor-pointer space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-bold text-slate-900 uppercase truncate">
                            {j.jabatan}
                          </span>
                          <span className="font-mono text-[11px] text-slate-700 shrink-0 tabular-nums">
                            <strong>{j.count}</strong> prog · <span className="text-emerald-700">{j.selesai} selesai</span> · {formatRMWithPrefix(j.diagihkan.total)}
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-900 rounded-full" style={{ width: `${barW}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Program Mengikut Pegawai */}
            <div className="xl:col-span-6 bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                    Rekod Pegawai Pusat
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <Users className="w-4 h-4 text-blue-900" />
                    <span>Program Mengikut Pegawai ({officerInvolvements.length})</span>
                  </h4>
                </div>
                <span className="text-[11px] text-slate-400">Klik pegawai untuk drill-down</span>
              </div>

              {officerInvolvements.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">Tiada rekod pegawai Pusat.</p>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {officerInvolvements.map((o) => {
                    const barW = (o.totalUniquePrograms / maxOfficerProg) * 100;
                    return (
                      <button
                        key={o.pegawai.id}
                        type="button"
                        onClick={() =>
                          onDrillDown(
                            o.pegawai.nama,
                            `${o.totalUniquePrograms} program unik · Pengurus: ${o.pengurusCount} · Bersama: ${o.pengurusBersamaCount} · Urus Setia: ${o.urusSetiaCount}`,
                            o.programs
                          )
                        }
                        className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:border-blue-900 bg-slate-50/50 hover:bg-white transition-colors cursor-pointer space-y-1.5"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <span className="font-bold text-slate-900 uppercase truncate">
                            {o.pegawai.nama}
                          </span>
                          <span className="font-mono text-[11px] text-slate-600 tabular-nums shrink-0">
                            <strong className="text-slate-900">{o.totalUniquePrograms} prog</strong> · P:{o.pengurusCount} · PB:{o.pengurusBersamaCount} · US:{o.urusSetiaCount}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-slate-800 rounded-full" style={{ width: `${barW}%` }} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 3. INTERACTIVE CHARTS: STATUS, JENIS, TAHUN & PENGLIBATAN PERANAN */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Status */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
              <div className="border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Status Pelaksanaan
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">Program Mengikut Status</h4>
              </div>
              <div className="space-y-2.5">
                {byStatus.map((item) => {
                  const cfg = getStatusConfig(item.label);
                  const barW = (item.count / maxStatusCount) * 100;
                  const color = STATUS_BAR_COLORS[item.label] || '#334155';
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() =>
                        onDrillDown(
                          `Status: ${cfg.label}`,
                          `${item.count} program di bawah ${selectedPusat}`,
                          item.programs
                        )
                      }
                      className="w-full text-left group cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 group-hover:text-blue-900 truncate">
                          {cfg.label}
                        </span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums">
                          {item.count}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${barW}%`, backgroundColor: color }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Jenis */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
              <div className="border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Kategori Program
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">Program Mengikut Jenis</h4>
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {byJenis.map((item) => {
                  const barW = (item.count / maxJenisCount) * 100;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() =>
                        onDrillDown(
                          `Jenis: ${item.label}`,
                          `${item.count} program · ${formatRMWithPrefix(item.peruntukan)}`,
                          item.programs
                        )
                      }
                      className="w-full text-left group cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-semibold text-slate-800 group-hover:text-blue-900 truncate">
                          {item.label}
                        </span>
                        <span className="font-mono font-bold text-slate-900 tabular-nums shrink-0">
                          {item.count}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-900 rounded-full" style={{ width: `${barW}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tahun */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5">
              <div className="border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Rekod Pelbagai Tahun
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">Program Mengikut Tahun</h4>
              </div>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {byYear.map((yr) => {
                  const barW = (yr.count / maxYearCount) * 100;
                  return (
                    <button
                      key={yr.tahun}
                      type="button"
                      onClick={() =>
                        onDrillDown(
                          `Tahun ${yr.tahun} · ${selectedPusat}`,
                          `${yr.count} program (${yr.selesai} selesai)`,
                          yr.programs
                        )
                      }
                      className="w-full text-left group cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-black text-slate-900 group-hover:text-blue-900">
                          {yr.tahun}
                        </span>
                        <span className="font-mono text-[11px] text-slate-700 tabular-nums">
                          <strong>{yr.count}</strong> prog · {yr.selesai} selesai
                        </span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${barW}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Penglibatan Peranan Donut */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
              <div className="border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Peranan Pegawai
                </span>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <PieChart className="w-4 h-4 text-blue-900" />
                  <span>Pengurus / Bersama / Urus Setia</span>
                </h4>
              </div>

              <div className="flex flex-col items-center gap-3">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <svg viewBox="0 0 130 130" className="w-28 h-28 -rotate-90">
                    <circle cx="65" cy="65" r="50" fill="none" stroke="#e2e8f0" strokeWidth="16" />
                    {roleDonutSegments.segments.map((seg) => (
                      <circle
                        key={seg.role}
                        cx="65"
                        cy="65"
                        r="50"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={hoveredRole === seg.role ? '19' : '16'}
                        strokeDasharray={`${seg.dashLength} ${roleDonutSegments.circumference}`}
                        strokeDashoffset={seg.dashOffset}
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredRole(seg.role)}
                        onMouseLeave={() => setHoveredRole(null)}
                        onClick={() =>
                          onDrillDown(
                            `Peranan: ${seg.label} · ${selectedPusat}`,
                            `${seg.count} program`,
                            seg.programs
                          )
                        }
                      />
                    ))}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-base font-black font-mono text-slate-900">
                      {statusKpis.total}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-slate-500">Unik</span>
                  </div>
                </div>

                <div className="w-full space-y-1.5">
                  {roleDonutSegments.segments.map((seg) => (
                    <button
                      key={seg.role}
                      type="button"
                      onMouseEnter={() => setHoveredRole(seg.role)}
                      onMouseLeave={() => setHoveredRole(null)}
                      onClick={() =>
                        onDrillDown(
                          `Peranan: ${seg.label} · ${selectedPusat}`,
                          `${seg.count} program`,
                          seg.programs
                        )
                      }
                      className="w-full flex items-center justify-between text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-900 bg-slate-50/60 hover:bg-white cursor-pointer"
                    >
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-xs"
                          style={{ backgroundColor: seg.color }}
                        />
                        {seg.label}
                      </span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {seg.count} ({seg.pct}%)
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Program Mengikut Bulan */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Taburan Bulanan Pusat
                </span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                  Program Mengikut Bulan (Januari – Disember)
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">Klik bulan untuk senarai program</span>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end pt-2">
              {byMonth.map((m) => {
                const heightPct = m.count > 0 ? Math.max(12, Math.round((m.count / maxMonthCount) * 100)) : 4;
                return (
                  <button
                    key={m.month}
                    type="button"
                    disabled={m.count === 0}
                    onClick={() =>
                      onDrillDown(
                        `Program Bulan ${m.name} · ${selectedPusat}`,
                        `${m.count} program`,
                        m.programs
                      )
                    }
                    className={`flex flex-col items-center gap-1.5 group ${
                      m.count > 0 ? 'cursor-pointer' : 'cursor-default opacity-60'
                    }`}
                  >
                    <span className="text-[11px] font-mono font-bold text-slate-800 tabular-nums">
                      {m.count}
                    </span>
                    <div className="w-full h-24 bg-slate-100 rounded-md flex items-end overflow-hidden p-0.5 border border-slate-200 group-hover:border-blue-900">
                      <div
                        className={`w-full rounded-xs transition-all ${
                          m.count > 0 ? 'bg-blue-900 group-hover:bg-blue-700' : 'bg-slate-200'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600">{m.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. PERUNTUKAN KEWANGAN KESELURUHAN PUSAT BERDASARKAN BK65 & ANALISIS KEWANGAN */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Kewangan Keseluruhan Pusat Berdasarkan BK65
                </span>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <Wallet className="w-4 h-4 text-blue-900" />
                  <span>Peruntukan Kewangan &amp; Analisis Mengikut Jabatan, Program, Tahun &amp; Kod OS</span>
                </h4>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Unik mengikut Kod Program (tiada pengiraan berganda)
              </span>
            </div>

            {/* 5 Cards: OS21000, OS24000, OS27000, OS29000, Jumlah Peruntukan Diterima */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {OS_KEYS.map((osItem) => {
                const amt = financeAgg.diagihkan[osItem.key];
                const share =
                  financeAgg.diagihkan.total > 0
                    ? Math.round((amt / financeAgg.diagihkan.total) * 100)
                    : 0;
                return (
                  <div
                    key={osItem.key}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-900 font-mono">
                        {osItem.label}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-slate-500">
                        {share}%
                      </span>
                    </div>
                    <div className="text-base font-black text-slate-900 font-mono tabular-nums">
                      {formatRMWithPrefix(amt)}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">{osItem.desc}</div>
                  </div>
                );
              })}

              <div className="bg-slate-900 text-white border border-slate-900 rounded-xl p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Jumlah Peruntukan Diterima
                </span>
                <div className="text-base font-black text-white font-mono tabular-nums">
                  {formatRMWithPrefix(financeAgg.diagihkan.total)}
                </div>
                <div className="text-[10px] text-slate-300">
                  Belanja: {formatRMWithPrefix(financeAgg.belanja.total)} · Jimat: {formatRMWithPrefix(financeAgg.penjimatan.total)}
                </div>
              </div>
            </div>

            {/* Financial Analysis Tab Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-slate-100 p-0.5 gap-0.5">
                {(
                  [
                    { id: 'JABATAN', label: 'Mengikut Jabatan' },
                    { id: 'PROGRAM', label: 'Mengikut Program' },
                    { id: 'TAHUN', label: 'Mengikut Tahun' },
                    { id: 'OS', label: 'Mengikut Kod OS' },
                  ] as Array<{ id: FinanceTab; label: string }>
                ).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setFinanceTab(t.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      financeTab === t.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Semua jumlah dalam Ringgit Malaysia (RM)
              </span>
            </div>

            {/* Tab 1: Mengikut Jabatan */}
            {financeTab === 'JABATAN' && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Jabatan</th>
                      <th className="py-2.5 px-2 text-center">Program</th>
                      <th className="py-2.5 px-2 text-right">OS21000</th>
                      <th className="py-2.5 px-2 text-right">OS24000</th>
                      <th className="py-2.5 px-2 text-right">OS27000</th>
                      <th className="py-2.5 px-2 text-right">OS29000</th>
                      <th className="py-2.5 px-3 text-right">BK65 Diterima</th>
                      <th className="py-2.5 px-3 text-right">Belanja Sebenar</th>
                      <th className="py-2.5 px-3 text-right">Penjimatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {byJabatan.map((j) => {
                      const barW = (j.diagihkan.total / maxJabatanBudget) * 100;
                      return (
                        <tr key={j.jabatan} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <button
                              type="button"
                              onClick={() =>
                                onDrillDown(
                                  `Kewangan Jabatan: ${j.jabatan}`,
                                  `${j.count} program · ${formatRMWithPrefix(j.diagihkan.total)}`,
                                  j.programs
                                )
                              }
                              className="font-bold text-slate-900 hover:text-blue-900 hover:underline text-left uppercase cursor-pointer block"
                            >
                              {j.jabatan}
                            </button>
                            <div className="h-1.5 w-36 bg-slate-100 rounded-full overflow-hidden mt-1">
                              <div className="h-full bg-blue-900" style={{ width: `${barW}%` }} />
                            </div>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold">{j.count}</td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(j.diagihkan.os21000)}</td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(j.diagihkan.os24000)}</td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(j.diagihkan.os27000)}</td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(j.diagihkan.os29000)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 tabular-nums">
                            {formatRM(j.diagihkan.total)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                            {formatRM(j.belanja.total)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 tabular-nums">
                            {formatRM(j.penjimatan.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                      <td className="py-3 px-3 uppercase">JUMLAH KESELURUHAN PUSAT</td>
                      <td className="py-3 px-2 text-center font-mono">{pusatPrograms.length}</td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums">{formatRM(financeAgg.diagihkan.os21000)}</td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums">{formatRM(financeAgg.diagihkan.os24000)}</td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums">{formatRM(financeAgg.diagihkan.os27000)}</td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums">{formatRM(financeAgg.diagihkan.os29000)}</td>
                      <td className="py-3 px-3 text-right font-mono text-blue-950 tabular-nums">
                        {formatRMWithPrefix(financeAgg.diagihkan.total)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-emerald-800 tabular-nums">
                        {formatRMWithPrefix(financeAgg.belanja.total)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-amber-800 tabular-nums">
                        {formatRMWithPrefix(financeAgg.penjimatan.total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Tab 2: Mengikut Program */}
            {financeTab === 'PROGRAM' && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Kod</th>
                      <th className="py-2.5 px-3 min-w-[200px]">Nama Program</th>
                      <th className="py-2.5 px-3">Jabatan</th>
                      <th className="py-2.5 px-2 text-right">OS21000</th>
                      <th className="py-2.5 px-2 text-right">OS24000</th>
                      <th className="py-2.5 px-2 text-right">OS27000</th>
                      <th className="py-2.5 px-2 text-right">OS29000</th>
                      <th className="py-2.5 px-3 text-right">BK65 (RM)</th>
                      <th className="py-2.5 px-3 text-right">Belanja (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sortedProgramsFinance.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          Tiada rekod program bagi Pusat ini.
                        </td>
                      </tr>
                    ) : (
                      sortedProgramsFinance.map((p) => (
                        <tr
                          key={p.id}
                          onClick={() => onViewProgram(p)}
                          className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-700 whitespace-nowrap">
                            {p.kodProgram}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 uppercase">{p.namaProgram}</td>
                          <td className="py-2.5 px-3 text-slate-600 text-[11px]">{p.jabatan}</td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(p.os21000)}</td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(p.os24000)}</td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(p.os27000)}</td>
                          <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(p.os29000)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">
                            {formatRM(p.jumlahRm)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                            {formatRM(p.jumlahBelanjaRm || 0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 3: Mengikut Tahun */}
            {financeTab === 'TAHUN' && (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3">Tahun</th>
                      <th className="py-2.5 px-2 text-center">Program</th>
                      <th className="py-2.5 px-2 text-right">OS21000</th>
                      <th className="py-2.5 px-2 text-right">OS24000</th>
                      <th className="py-2.5 px-2 text-right">OS27000</th>
                      <th className="py-2.5 px-2 text-right">OS29000</th>
                      <th className="py-2.5 px-3 text-right">BK65 Diterima</th>
                      <th className="py-2.5 px-3 text-right">Belanja Sebenar</th>
                      <th className="py-2.5 px-3 text-right">Penjimatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {byYearWithOs.map((row) => (
                      <tr
                        key={row.tahun}
                        onClick={() =>
                          onDrillDown(
                            `Kewangan Tahun ${row.tahun} · ${selectedPusat}`,
                            `${row.count} program · ${formatRMWithPrefix(row.fin.diagihkan.total)}`,
                            row.programs
                          )
                        }
                        className="hover:bg-blue-50/40 cursor-pointer"
                      >
                        <td className="py-2.5 px-3 font-mono font-black text-slate-900">{row.tahun}</td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold">{row.count}</td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(row.fin.diagihkan.os21000)}</td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(row.fin.diagihkan.os24000)}</td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(row.fin.diagihkan.os27000)}</td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums">{formatRM(row.fin.diagihkan.os29000)}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 tabular-nums">
                          {formatRM(row.fin.diagihkan.total)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                          {formatRM(row.fin.belanja.total)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 tabular-nums">
                          {formatRM(row.fin.penjimatan.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tab 4: Mengikut Kod OS */}
            {financeTab === 'OS' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-blue-900" />
                    <span>Carta Perbandingan Peruntukan vs Belanja Mengikut Kod OS</span>
                  </h5>
                  <div className="space-y-3">
                    {OS_KEYS.map((osItem) => {
                      const allocAmt = financeAgg.diagihkan[osItem.key];
                      const spentAmt = financeAgg.belanja[osItem.key];
                      const allocW = (allocAmt / maxOsAmount) * 100;
                      const spentW = (spentAmt / maxOsAmount) * 100;
                      return (
                        <div key={osItem.key} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-mono font-bold text-slate-900">{osItem.label}</span>
                            <span className="font-mono text-[11px] text-slate-700 tabular-nums">
                              <strong>{formatRMWithPrefix(allocAmt)}</strong> · Belanja: {formatRMWithPrefix(spentAmt)}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-900 rounded-full" style={{ width: `${allocW}%` }} />
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${spentW}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Kod OS</th>
                        <th className="py-2.5 px-3 text-right">BK65 (RM)</th>
                        <th className="py-2.5 px-3 text-right">Belanja (RM)</th>
                        <th className="py-2.5 px-3 text-right">Penjimatan (RM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {OS_KEYS.map((osItem) => (
                        <tr key={osItem.key} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                            {osItem.label}
                            <span className="block font-sans text-[10px] font-normal text-slate-500">
                              {osItem.desc}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums">
                            {formatRM(financeAgg.diagihkan[osItem.key])}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-700 tabular-nums">
                            {formatRM(financeAgg.belanja[osItem.key])}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-amber-700 tabular-nums">
                            {formatRM(financeAgg.penjimatan[osItem.key])}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                        <td className="py-3 px-3 uppercase">JUMLAH</td>
                        <td className="py-3 px-3 text-right font-mono tabular-nums">
                          {formatRMWithPrefix(financeAgg.diagihkan.total)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-800 tabular-nums">
                          {formatRMWithPrefix(financeAgg.belanja.total)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-amber-800 tabular-nums">
                          {formatRMWithPrefix(financeAgg.penjimatan.total)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* 5. PEMANTAUAN TARIKH PELAKSANAAN (HAMPIR ATAU MELEPASI TARIKH) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                  Pemantauan Tarikh Pelaksanaan Pusat
                </span>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Hampir atau Melepasi Tarikh Pelaksanaan</span>
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 tabular-nums">
                {nearOrOverdue.length} Program Perlu Perhatian
              </span>
            </div>

            {nearOrOverdue.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Tiada program Pusat yang hampir tiba (≤14 hari) atau melepasi tarikh tanpa penyelesaian.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
                {nearOrOverdue.map(({ program, kind, daysDiff }) => {
                  const cfg = getStatusConfig(program.statusProgram);
                  return (
                    <button
                      key={program.id}
                      type="button"
                      onClick={() => onViewProgram(program)}
                      className="text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-900 bg-slate-50/50 hover:bg-white transition-colors cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px]">
                        <span
                          className={`font-bold flex items-center gap-1 ${
                            kind === 'MELEPASI' ? 'text-rose-700' : 'text-amber-700'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {kind === 'MELEPASI'
                              ? `Melepasi tarikh (${daysDiff} hari lalu)`
                              : daysDiff === 0
                              ? 'Bermula hari ini'
                              : `Hampir tiba (${daysDiff} hari lagi)`}
                          </span>
                        </span>
                        <span className="font-mono text-slate-500">{program.kodProgram}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 uppercase line-clamp-2">
                        {program.namaProgram}
                      </p>
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
                        <span className="truncate">{program.jabatan || '-'}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${cfg.badgeBg}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-500 flex items-center justify-between">
                        <span>{program.tempoh || formatDisplayDate(program.tarikhMula)}</span>
                        <span className="text-blue-900 font-sans font-bold inline-flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> Lihat
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 6. KALENDAR BERPUSAT PUSAT */}
          <OrgProgramCalendar
            title={`Kalendar Berpusat · ${selectedPusat}`}
            subtitle="Jadual Berpusat Semua Program Jabatan di Bawah Pusat"
            programs={pusatPrograms}
            officers={pusatOfficers}
            jabatanOptions={jabatansUnderPusat}
            onViewProgram={onViewProgram}
          />

          {/* 7. MODUL PELAPORAN PUSAT (MUAT TURUN PDF & EXCEL) */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 block">
                  Modul Pelaporan Rasmi Pusat
                </span>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <Download className="w-4 h-4 text-blue-900" />
                  <span>Muat Turun Laporan Bersepadu (PDF &amp; Excel)</span>
                </h4>
              </div>
              <span className="text-[11px] text-slate-500">
                5 Laporan Prestasi, Pegawai, Kewangan Kod OS &amp; Sejarah BK04
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {reportModules.map((rep) => (
                <div
                  key={rep.id}
                  className="border border-slate-200 rounded-xl p-4 bg-slate-50/60 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-black text-slate-900 leading-snug">
                        {rep.title}
                      </h5>
                      <span className="text-[10px] font-mono font-bold text-blue-900 shrink-0">
                        {rep.countLabel}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{rep.desc}</p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={rep.onPdf}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-blue-950 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>
                    <button
                      type="button"
                      onClick={rep.onExcel}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
