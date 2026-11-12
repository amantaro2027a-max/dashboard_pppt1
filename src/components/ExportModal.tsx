import React, { useState, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { formatRM } from '../utils/formatters';
import { ProgramItem } from '../types/program';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  X,
  Download,
  FileSpreadsheet,
  CheckSquare,
  Square,
  SlidersHorizontal,
  Search,
  Eye,
  FileText,
  Briefcase,
  CheckCircle2,
} from 'lucide-react';

interface ExportFieldDef {
  key: string;
  label: string;
  getValue: (p: ProgramItem, idx: number) => string | number;
}

const ALL_EXPORT_FIELDS: ExportFieldDef[] = [
  { key: 'bil', label: 'Bil', getValue: (_p, idx) => idx + 1 },
  { key: 'kodProgram', label: 'Kod Program', getValue: (p) => p.kodProgram.toUpperCase() },
  { key: 'namaProgram', label: 'Nama Program', getValue: (p) => p.namaProgram.toUpperCase() },
  { key: 'jenisProgram', label: 'Jenis Program', getValue: (p) => p.jenisProgram },
  { key: 'tempoh', label: 'Tempoh', getValue: (p) => p.tempoh },
  { key: 'jumlahHari', label: 'Jumlah Hari', getValue: (p) => `${p.jumlahHari} hari` },
  { key: 'tempat', label: 'Tempat', getValue: (p) => p.tempat },
  { key: 'negeri', label: 'Negeri', getValue: (p) => p.negeri },
  { key: 'bilanganPeserta', label: 'Bilangan Peserta', getValue: (p) => p.bilanganPeserta },
  { key: 'pengurusNama', label: 'Pengurus', getValue: (p) => p.pengurusNama },
  { key: 'pengurusBersamaNama', label: 'Pengurus Bersama', getValue: (p) => p.pengurusBersamaNama || '-' },
  { key: 'pusat', label: 'Pusat', getValue: (p) => p.pusat },
  { key: 'jabatan', label: 'Jabatan', getValue: (p) => p.jabatan },
  { key: 'sumberKewangan', label: 'Sumber Kewangan', getValue: (p) => p.sumberKewangan },
  { key: 'os21000', label: 'OS21000 (RM)', getValue: (p) => formatRM(p.os21000) },
  { key: 'os24000', label: 'OS24000 (RM)', getValue: (p) => formatRM(p.os24000) },
  { key: 'os27000', label: 'OS27000 (RM)', getValue: (p) => formatRM(p.os27000) },
  { key: 'os29000', label: 'OS29000 (RM)', getValue: (p) => formatRM(p.os29000) },
  { key: 'jumlahRm', label: 'JUMLAH (RM)', getValue: (p) => formatRM(p.jumlahRm) },
  { key: 'jumlahBelanjaRm', label: 'BELANJA SEBENAR (RM)', getValue: (p) => formatRM(p.jumlahBelanjaRm ?? 0) },
  { key: 'jumlahPenjimatanRm', label: 'PENJIMATAN (RM)', getValue: (p) => formatRM(p.jumlahPenjimatanRm ?? 0) },
  { key: 'statusProgram', label: 'Status Program', getValue: (p) => p.statusProgram },
];

export const ExportModal: React.FC = () => {
  const { isExportOpen, setIsExportOpen, filteredPrograms, currentUser } = useProgramContext();

  // State: Filter by ID / Kod Program (Text Search)
  const [filterId, setFilterId] = useState('');

  // State: Field Selection Popup Modal mode
  const [fieldModalMode, setFieldModalMode] = useState<'csv' | 'pdf' | null>(null);

  // State: Dedicated PDF Report Preview Modal
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = useState(false);

  // State: Orientation of PDF (Portrait vs Landscape)
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // State: Download feedback notification
  const [downloadFeedback, setDownloadFeedback] = useState<string | null>(null);

  // Selected Field Keys (default standard report fields)
  const [selectedFieldKeys, setSelectedFieldKeys] = useState<string[]>([
    'bil',
    'kodProgram',
    'namaProgram',
    'jenisProgram',
    'tempoh',
    'jabatan',
    'pengurusNama',
    'jumlahRm',
    'statusProgram',
  ]);

  // REQUIREMENT: Bila klik butang Eksport & Cetakan Laporan Rasmi, paparan program hanya paparkan program berdasarkan Jabatan admin sahaja (log in)
  const baseProgramsForExport = useMemo(() => {
    if (currentUser && currentUser.role === 'ADMIN' && currentUser.jabatan) {
      return filteredPrograms.filter((p) => p.jabatan === currentUser.jabatan);
    }
    return filteredPrograms;
  }, [filteredPrograms, currentUser]);

  // Filtered dataset by ID / Kod Program
  const effectivePrograms = useMemo(() => {
    if (!filterId.trim()) return baseProgramsForExport;
    const q = filterId.trim().toLowerCase();
    return baseProgramsForExport.filter(
      (p) =>
        p.kodProgram.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.namaProgram.toLowerCase().includes(q)
    );
  }, [baseProgramsForExport, filterId]);

  if (!isExportOpen) return null;

  const toggleField = (key: string) => {
    setSelectedFieldKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAllFields = () => {
    setSelectedFieldKeys(ALL_EXPORT_FIELDS.map((f) => f.key));
  };

  const deselectAllFields = () => {
    setSelectedFieldKeys(['bil', 'namaProgram']);
  };

  // 1. Generate & Download CSV
  const executeDownloadCSV = () => {
    const activeDefs = ALL_EXPORT_FIELDS.filter((f) => selectedFieldKeys.includes(f.key));
    if (activeDefs.length === 0) return;

    const headers = activeDefs.map((f) => `"${f.label}"`);
    const rows = effectivePrograms.map((p, idx) => {
      return activeDefs.map((f) => {
        const val = f.getValue(p, idx);
        if (typeof val === 'number') return val;
        return `"${String(val).replace(/"/g, '""')}"`;
      });
    });

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Laporan_Program_IAB_${filterId ? `ID_${filterId}_` : ''}${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setFieldModalMode(null);
  };

  // Active definitions chosen
  const activeDefs = ALL_EXPORT_FIELDS.filter((f) => selectedFieldKeys.includes(f.key));

  // 2. REQUIREMENT: Simpan Dokumen (PDF) dalam saiz A4 Portrait atau Landscape menggunakan jsPDF
  const executeSavePDF = () => {
    if (activeDefs.length === 0) return;

    try {
      const doc = new jsPDF({
        orientation: pdfOrientation,
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 10;

      // Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 20, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('KEMENTERIAN PENDIDIKAN MALAYSIA · INSTITUT AMINUDDIN BAKI', margin, 7);

      doc.setFontSize(12);
      doc.text('LAPORAN PROGRAM PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI (PPPT)', margin, 14);

      // Subheader metadata
      doc.setTextColor(71, 85, 105);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const tarikhStr = new Date().toLocaleDateString('ms-MY', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const deptStr = currentUser?.role === 'ADMIN' && currentUser.jabatan ? `Jabatan: ${currentUser.jabatan} | ` : '';
      doc.text(`${deptStr}Jumlah Program: ${effectivePrograms.length} | Tarikh Dijana: ${tarikhStr} | Format: A4 ${pdfOrientation === 'landscape' ? 'Lanskap' : 'Potret'}`, margin, 26);

      // Table Data
      const headers = [activeDefs.map((f) => f.label)];
      const body = effectivePrograms.map((p, idx) => {
        return activeDefs.map((f) => {
          const val = f.getValue(p, idx);
          if (typeof val === 'number') {
            return formatRM(val);
          }
          return String(val ?? '');
        });
      });

      // Alignment settings
      const columnStyles: Record<number, any> = {};
      activeDefs.forEach((f, idx) => {
        const isNum =
          f.key.startsWith('os') ||
          f.key.includes('Rm') ||
          f.key === 'bil' ||
          f.key === 'bilanganPeserta' ||
          f.key === 'jumlahHari';
        if (isNum) {
          columnStyles[idx] = { halign: 'right' };
        }
      });

      autoTable(doc, {
        head: headers,
        body: body,
        startY: 30,
        margin: { left: margin, right: margin, bottom: 12 },
        styles: {
          fontSize: pdfOrientation === 'landscape' ? 7.5 : 6.5,
          cellPadding: 2,
          overflow: 'linebreak',
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: pdfOrientation === 'landscape' ? 8 : 7,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        columnStyles: columnStyles,
        didDrawPage: (data) => {
          // Footer
          const pageCount = (doc as any).internal.getNumberOfPages();
          const str = `Muka surat ${data.pageNumber} daripada ${pageCount}`;
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text(str, pageWidth - margin, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
          doc.text('Dokumen digital rasmi Institut Aminuddin Baki (IAB)', margin, doc.internal.pageSize.getHeight() - 6);
        },
      });

      const fileName = `Laporan_Program_IAB_${pdfOrientation}_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);

      setDownloadFeedback(`Fail PDF berjaya dijana dan dimuat turun (${fileName})!`);
      setTimeout(() => setDownloadFeedback(null), 4500);
    } catch (err) {
      console.warn('jsPDF generation error:', err);
    }
  };

  // 3. Simpan Dokumen (Excel / XLSX)
  const executeSaveExcel = () => {
    if (activeDefs.length === 0) return;

    try {
      const headers = activeDefs.map((f) => f.label);
      const rows = effectivePrograms.map((p, idx) => {
        return activeDefs.map((f) => {
          const val = f.getValue(p, idx);
          return val ?? '';
        });
      });

      const wsData = [
        ['KEMENTERIAN PENDIDIKAN MALAYSIA · INSTITUT AMINUDDIN BAKI'],
        ['LAPORAN SENARAI PROGRAM PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI (PPPT)'],
        [`Tarikh Dijana: ${new Date().toLocaleDateString('ms-MY')} | Jumlah Rekod: ${effectivePrograms.length} program`],
        [],
        headers,
        ...rows,
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Laporan Program');

      const fileName = `Laporan_Program_IAB_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);

      setDownloadFeedback(`Fail Excel (.xlsx) berjaya dimuat turun (${fileName})!`);
      setTimeout(() => setDownloadFeedback(null), 4500);
      setFieldModalMode(null);
    } catch (err) {
      console.error('Error exporting Excel:', err);
    }
  };

  return (
    <>
      {/* Main Export Preview Modal */}
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
        <div
          className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-slate-300" />
              <div>
                <span className="text-[11px] font-medium text-slate-300 block uppercase tracking-wider">
                  Eksport & Cetakan Laporan Rasmi
                </span>
                <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Laporan Senarai Program Pusat IAB ({effectivePrograms.length} Rekod)</span>
                  {currentUser?.role === 'ADMIN' && currentUser.jabatan && (
                    <span className="text-[10px] bg-blue-800 text-blue-200 px-2 py-0.5 rounded font-normal flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      <span>{currentUser.jabatan}</span>
                    </span>
                  )}
                </h3>
              </div>
            </div>
            <button
              onClick={() => setIsExportOpen(false)}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 max-h-[72vh] overflow-y-auto space-y-4">
            {/* REQUIREMENT: In Penapis Mengikut ID / Kod Program, REMOVE the dropdown SELECT */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5 uppercase tracking-wide text-[11px]">
                  <Search className="w-3.5 h-3.5 text-slate-600" />
                  <span>Penapis Mengikut ID / Kod Program:</span>
                </span>
                {filterId && (
                  <button
                    onClick={() => setFilterId('')}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Reset Penapis ID
                  </button>
                )}
              </div>

              {/* Clean Text Search Input ONLY (Dropdown Removed as Requested) */}
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Masukkan Kod Program atau ID untuk menapis laporan (cth: PPPT2026-001)..."
                  value={filterId}
                  onChange={(e) => setFilterId(e.target.value)}
                  className="w-full py-2.5 pl-8 pr-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono text-xs uppercase"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                <span>
                  {filterId ? (
                    <span>
                      Menapis mengikut: <strong className="text-slate-800 font-mono">{filterId.toUpperCase()}</strong>
                    </span>
                  ) : (
                    <span>
                      {currentUser?.role === 'ADMIN' && currentUser.jabatan
                        ? `Memaparkan program di bawah jabatan: ${currentUser.jabatan}.`
                        : 'Memaparkan semua program hasil penapis induk.'}
                    </span>
                  )}
                </span>
                <span className="font-semibold text-slate-700 tabular-nums">
                  Padanan: {effectivePrograms.length} / {baseProgramsForExport.length} program
                </span>
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-slate-100/70 border border-slate-200 rounded-lg text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-slate-900 block mb-0.5">
                  Pilihan Eksport & Simpan Laporan (PDF / Excel / CSV)
                </span>
                <span>
                  Simpan laporan terus dalam format PDF rasmi, lembaran Excel (.xlsx), atau buka pratonton dokumen.
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {/* Direct Save PDF */}
                <button
                  type="button"
                  onClick={executeSavePDF}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-md transition-colors shadow-xs cursor-pointer"
                  title="Simpan dokumen ini terus ke fail PDF"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Simpan Dokumen (PDF)</span>
                </button>

                {/* Direct Save Excel */}
                <button
                  type="button"
                  onClick={executeSaveExcel}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors shadow-xs cursor-pointer"
                  title="Simpan dokumen ke format fail Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Simpan Excel (.xlsx)</span>
                </button>

                {/* Pop up trigger: Muat Turun CSV */}
                <button
                  type="button"
                  onClick={() => setFieldModalMode('csv')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors shadow-xs cursor-pointer"
                  title="Pilih medan & muat turun fail CSV"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>CSV</span>
                </button>

                {/* Preview & Simpan Laporan */}
                <button
                  type="button"
                  onClick={() => setIsPdfPreviewOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs cursor-pointer"
                  title="Buka pratonton dokumen PDF dan tukar orientasi"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Pratonton PDF</span>
                </button>
              </div>
            </div>

            {/* Notification Toast for Downloads */}
            {downloadFeedback && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{downloadFeedback}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setDownloadFeedback(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold ml-3"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Quick Preview Table */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Bil</th>
                    <th className="py-2.5 px-3">Kod & Nama Program</th>
                    <th className="py-2.5 px-3">Jenis</th>
                    <th className="py-2.5 px-3">Pusat / Jabatan</th>
                    <th className="py-2.5 px-3">Pengurus</th>
                    <th className="py-2.5 px-3 text-right">Jumlah (RM)</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {effectivePrograms.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Tiada program dijumpai bagi penapis semasa.
                      </td>
                    </tr>
                  ) : (
                    effectivePrograms.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 tabular-nums font-medium text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-slate-900 uppercase">
                            {p.namaProgram.toUpperCase()}
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 uppercase">
                            {p.kodProgram}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-700">{p.jenisProgram}</td>
                        <td className="py-2 px-3 text-slate-700 max-w-xs truncate">
                          {p.jabatan}
                        </td>
                        <td className="py-2 px-3 text-slate-700">{p.pengurusNama}</td>
                        <td className="py-2 px-3 text-right font-bold tabular-nums">
                          RM {formatRM(p.jumlahRm)}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded border border-slate-200 bg-white">
                            {p.statusProgram}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end">
            <button
              onClick={() => setIsExportOpen(false)}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* POP UP MODAL: PILIH MEDAN-MEDAN LAPORAN */}
      {fieldModalMode && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-bold">
                  Pilih Medan {fieldModalMode === 'csv' ? 'Eksport CSV' : 'Laporan Dokumen PDF'}
                </h4>
              </div>
              <button
                onClick={() => setFieldModalMode(null)}
                className="p-1 text-slate-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 text-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-600 font-medium">
                  Tandakan medan yang ingin dipaparkan ({selectedFieldKeys.length} /{' '}
                  {ALL_EXPORT_FIELDS.length} dipilih):
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFields}
                    className="text-[11px] font-semibold text-blue-600 hover:underline cursor-pointer"
                  >
                    Pilih Semua
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={deselectAllFields}
                    className="text-[11px] font-semibold text-slate-600 hover:underline cursor-pointer"
                  >
                    Nyahpilih
                  </button>
                </div>
              </div>

              {/* Grid of Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {ALL_EXPORT_FIELDS.map((field) => {
                  const isChecked = selectedFieldKeys.includes(field.key);
                  return (
                    <label
                      key={field.key}
                      className={`flex items-center gap-2.5 p-2 rounded-md border text-xs cursor-pointer select-none transition-colors ${
                        isChecked
                          ? 'bg-slate-50 border-slate-300 text-slate-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleField(field.key)}
                        className="sr-only"
                      />
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-slate-900 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                      )}
                      <span>{field.label}</span>
                    </label>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] text-slate-500">
                  {selectedFieldKeys.length === 0 ? 'Sila pilih sekurang-kurangnya satu medan.' : ''}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFieldModalMode(null)}
                    className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>

                  {fieldModalMode === 'csv' ? (
                    <button
                      type="button"
                      disabled={selectedFieldKeys.length === 0}
                      onClick={executeDownloadCSV}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:bg-slate-300 transition-colors shadow-xs cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Teruskan Muat Turun CSV</span>
                    </button>
                  ) : (
                    /* REQUIREMENT: Buka Pratonton & Simpan Laporan PDF */
                    <button
                      type="button"
                      disabled={selectedFieldKeys.length === 0}
                      onClick={() => {
                        setFieldModalMode(null);
                        setIsPdfPreviewOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-slate-300 transition-colors shadow-xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Buka Preview PDF</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REQUIREMENT: MODAL PRATONTON DOKUMEN PDF (DENGAN PILIHAN POTRET ATAU LANDSCAPE & SIMPAN DOKUMEN PDF) */}
      {isPdfPreviewOpen && (
        <div className="fixed inset-0 z-70 bg-slate-950/85 backdrop-blur-sm flex flex-col justify-between overflow-hidden animate-in fade-in duration-150">
          {/* Top PDF Reader Toolbar */}
          <div className="bg-slate-900 text-white px-5 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-rose-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                PDF
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Pratonton Laporan Rasmi (Format Dokumen PDF)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-900 text-blue-200 border border-blue-700 uppercase">
                    A4 {pdfOrientation === 'landscape' ? 'Lanskap' : 'Potret'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400">
                  {currentUser?.role === 'ADMIN' && currentUser.jabatan ? `Jabatan: ${currentUser.jabatan} · ` : ''}
                  {filterId ? `Ditapis ID: ${filterId.toUpperCase()} · ` : ''}
                  Jumlah: {effectivePrograms.length} rekod program
                </p>
              </div>
            </div>

            {/* Controls: Orientation Switcher & Action Buttons */}
            <div className="flex items-center gap-2.5">
              {/* REQUIREMENT: Tambah pilihan untuk tukar sama ada saiz Potrait atau Landscape */}
              <div className="flex items-center bg-slate-800 p-0.5 rounded-md border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setPdfOrientation('portrait')}
                  className={`px-2.5 py-1 font-semibold rounded transition-colors cursor-pointer ${
                    pdfOrientation === 'portrait'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Potret
                </button>
                <button
                  type="button"
                  onClick={() => setPdfOrientation('landscape')}
                  className={`px-2.5 py-1 font-semibold rounded transition-colors cursor-pointer ${
                    pdfOrientation === 'landscape'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Lanskap
                </button>
              </div>

              <button
                type="button"
                onClick={() => setFieldModalMode('pdf')}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md cursor-pointer"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Ubah Medan</span>
              </button>

              {/* Direct Save PDF */}
              <button
                type="button"
                onClick={executeSavePDF}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-md shadow-md transition-all cursor-pointer ring-2 ring-rose-400/30"
                title="Simpan dokumen ini terus ke format PDF"
              >
                <Download className="w-4 h-4" />
                <span>Simpan Dokumen (PDF)</span>
              </button>

              {/* Direct Save Excel */}
              <button
                type="button"
                onClick={executeSaveExcel}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-md shadow-md transition-all cursor-pointer ring-2 ring-emerald-400/30"
                title="Simpan dokumen ke format Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Simpan Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                title="Tutup Pratonton"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* PDF Canvas Viewport with authentic A4 Portrait or Landscape dimensions */}
          <div className="flex-1 overflow-y-auto bg-slate-800 p-4 sm:p-8 flex justify-center">
            {/* The A4 Paper Sheet */}
            <div
              className={`bg-white text-slate-900 shadow-2xl rounded-xs w-full border border-slate-300 flex flex-col justify-between transition-all ${
                pdfOrientation === 'landscape'
                  ? 'max-w-[297mm] min-h-[210mm] p-6 sm:p-10'
                  : 'max-w-[210mm] min-h-[297mm] p-8 sm:p-12'
              }`}
            >
              <div>
                {/* Official Header */}
                <div className="border-b-2 border-slate-900 pb-3 mb-4">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Institut Aminuddin Baki · Kementerian Pendidikan
                  </div>
                  <h1 className="text-lg font-black text-slate-900 mt-1 uppercase tracking-tight">
                    DASHBOARD PUSAT IAB - LAPORAN SENARAI PROGRAM
                  </h1>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-mono">
                    <span>
                      {currentUser?.role === 'ADMIN' && currentUser.jabatan ? (
                        <span>
                          Jabatan: <strong>{currentUser.jabatan}</strong> ·{' '}
                        </span>
                      ) : null}
                      {filterId ? (
                        <span>
                          Penapis ID: <strong>{filterId.toUpperCase()}</strong> ·{' '}
                        </span>
                      ) : null}
                      Jumlah Rekod: <strong>{effectivePrograms.length}</strong> program
                    </span>
                    <span>
                      Tarikh Dijana:{' '}
                      {new Date().toLocaleDateString('ms-MY', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* PDF Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-900">
                        {activeDefs.map((def) => (
                          <th
                            key={def.key}
                            className={`border border-slate-400 p-2 font-bold uppercase tracking-wider ${
                              def.key.startsWith('os') || def.key.includes('Rm')
                                ? 'text-right'
                                : 'text-left'
                            }`}
                          >
                            {def.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {effectivePrograms.length === 0 ? (
                        <tr>
                          <td colSpan={activeDefs.length} className="border border-slate-300 p-8 text-center text-slate-400">
                            Tiada rekod program dijumpai di bawah jabatan/penapis ini.
                          </td>
                        </tr>
                      ) : (
                        effectivePrograms.map((p, idx) => (
                          <tr key={p.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                            {activeDefs.map((def) => {
                              const val = def.getValue(p, idx);
                              const isNum =
                                def.key.startsWith('os') ||
                                def.key.includes('Rm') ||
                                def.key === 'bil' ||
                                def.key === 'bilanganPeserta' ||
                                def.key === 'jumlahHari';
                              return (
                                <td
                                  key={def.key}
                                  className={`border border-slate-300 p-1.5 align-top ${
                                    isNum ? 'text-right tabular-nums' : 'text-left'
                                  }`}
                                >
                                  {val}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Official PDF Document Footer */}
              <div className="mt-8 pt-4 border-t border-slate-300 flex items-center justify-between text-[9px] text-slate-500">
                <span>
                  Dokumen rasmi dijana secara digital melalui Sistem Dashboard Pusat IAB. Sah tanpa tandatangan.
                </span>
                <span className="font-mono">
                  Format: A4 {pdfOrientation === 'landscape' ? 'Lanskap' : 'Potret'} · Halaman 1 daripada 1
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Floating Bar with PDF and Excel Save Action */}
          <div className="bg-slate-900 border-t border-slate-800 px-6 py-2.5 flex items-center justify-between text-xs text-slate-400 shrink-0">
            <span>
              Klik &quot;Simpan Dokumen (PDF)&quot; atau &quot;Simpan Excel (.xlsx)&quot; untuk memuat turun salinan dokumen rasmi terus ke komputer anda.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPdfPreviewOpen(false)}
                className="px-3.5 py-1.5 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 cursor-pointer"
              >
                Kembali
              </button>
              <button
                type="button"
                onClick={executeSaveExcel}
                className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Simpan Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={executeSavePDF}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Simpan Dokumen (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
