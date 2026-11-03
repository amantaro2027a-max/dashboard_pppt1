import React from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { formatNumber, formatRM } from '../utils/formatters';
import { X, Download, Printer, FileSpreadsheet } from 'lucide-react';

export const ExportModal: React.FC = () => {
  const { isExportOpen, setIsExportOpen, filteredPrograms } = useProgramContext();

  if (!isExportOpen) return null;

  const downloadCSV = () => {
    const headers = [
      'Bil',
      'Kod Program',
      'Nama Program',
      'Jenis Program',
      'Tempoh',
      'Jumlah Hari',
      'Tempat',
      'Negeri',
      'Bilangan Peserta',
      'Pengurus',
      'Pengurus Bersama',
      'Pusat',
      'Jabatan',
      'Sumber Kewangan',
      'OS21000 (RM)',
      'OS24000 (RM)',
      'OS27000 (RM)',
      'OS29000 (RM)',
      'JUMLAH (RM)',
      'Status Program',
    ];

    const rows = filteredPrograms.map((p, idx) => [
      idx + 1,
      `"${p.kodProgram.toUpperCase()}"`,
      `"${p.namaProgram.toUpperCase().replace(/"/g, '""')}"`,
      `"${p.jenisProgram}"`,
      `"${p.tempoh}"`,
      p.jumlahHari,
      `"${p.tempat.replace(/"/g, '""')}"`,
      `"${p.negeri}"`,
      p.bilanganPeserta,
      `"${p.pengurusNama}"`,
      `"${p.pengurusBersamaNama || ''}"`,
      `"${p.pusat}"`,
      `"${p.jabatan}"`,
      `"${p.sumberKewangan}"`,
      p.os21000,
      p.os24000,
      p.os27000,
      p.os29000,
      p.jumlahRm,
      `"${p.statusProgram}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Daftar_Program_PPPT_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-slate-300" />
            <div>
              <span className="text-[11px] font-medium text-slate-300 block uppercase tracking-wider">
                Eksport & Cetakan Laporan Rasmi
              </span>
              <h3 className="text-base font-bold text-white tracking-tight">
                Laporan Senarai Program Pusat PPPT ({filteredPrograms.length} Rekod)
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

        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="font-bold text-slate-900 block mb-0.5">
                Format Eksport Sedia Digunakan
              </span>
              <span>
                Muat turun lembaran data dalam format fail CSV yang serasi dengan Microsoft Excel, Google Sheets, atau cetak dokumen rasmi secara terus.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={downloadCSV}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Muat Turun CSV</span>
              </button>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Laporan</span>
              </button>
            </div>
          </div>

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
                {filteredPrograms.map((p, idx) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 tabular-nums font-medium text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-slate-900 uppercase">{p.namaProgram.toUpperCase()}</div>
                      <div className="text-[11px] font-mono text-slate-500 uppercase">{p.kodProgram}</div>
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
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={() => setIsExportOpen(false)}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
