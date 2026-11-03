import React from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { formatNumber, formatRM, getStatusConfig } from '../utils/formatters';
import {
  X,
  Printer,
  Edit2,
  Calendar,
  Building,
  MapPin,
  Users,
  Wallet,
  Receipt,
  FileText,
  CheckCircle2,
} from 'lucide-react';

export const ProgramDetailModal: React.FC = () => {
  const {
    selectedProgram,
    isDetailOpen,
    setIsDetailOpen,
    setSelectedProgram,
    setIsFormOpen,
    setProgramToEdit,
    currentUser,
  } = useProgramContext();

  if (!isDetailOpen || !selectedProgram) return null;

  const statusConfig = getStatusConfig(selectedProgram.statusProgram);

  // View-only unless authenticated as Super Admin or Admin of matching Jabatan
  const canEdit =
    currentUser &&
    (currentUser.role === 'SUPER_ADMIN' ||
      !currentUser.jabatan ||
      currentUser.jabatan === selectedProgram.jabatan);

  const handleEdit = () => {
    if (!canEdit) return;
    setProgramToEdit(selectedProgram);
    setIsDetailOpen(false);
    setIsFormOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center font-bold text-xs tracking-wider">
              IAB
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-300 block uppercase tracking-wider">
                Perincian Maklumat Lengkap Program
              </span>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {selectedProgram.kodProgram}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Cetak lembaran ini"
            >
              <Printer className="w-4 h-4" />
            </button>
            {canEdit && (
              <button
                onClick={handleEdit}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                title="Kemaskini maklumat"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => {
                setIsDetailOpen(false);
                setSelectedProgram(null);
              }}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body - Items without numbering prefixes */}
        <div className="p-6 max-h-[80vh] overflow-y-auto space-y-6">
          {/* Title and Status Banner */}
          <div className="border-b border-slate-200 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-slate-500 font-mono">
                Kod Program: {selectedProgram.kodProgram}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Status Program:</span>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded border whitespace-nowrap ${statusConfig.badgeBg}`}
                >
                  {statusConfig.label}
                </span>
              </div>
            </div>

            {/* Nama Program */}
            <h2 className="text-lg font-bold text-slate-900 tracking-tight uppercase">
              Nama Program: {selectedProgram.namaProgram.toUpperCase()}
            </h2>
            <div className="text-xs font-medium text-slate-600 mt-1">
              Jenis Program: <strong className="text-slate-900">{selectedProgram.jenisProgram}</strong>
            </div>
          </div>

          {/* Section: Tarikh, Masa & Lokasi */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Jadual & Lokasi Pelaksanaan</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Tempoh:
                </span>
                <div className="font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {selectedProgram.tempoh}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Jumlah Hari:
                </span>
                <div className="font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {selectedProgram.jumlahHari} hari
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Tempat:
                </span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {selectedProgram.tempat}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Negeri:
                </span>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedProgram.negeri}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Bilangan Peserta:
                </span>
                <div className="font-bold text-slate-900 mt-0.5 tabular-nums">
                  {formatNumber(selectedProgram.bilanganPeserta)} orang
                </div>
              </div>
            </div>
          </div>

          {/* Section: Pengurusan & Organisasi */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5" />
              <span>Pegawai Pengurus & Struktur Organisasi</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-200/80 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Pengurus:
                </span>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedProgram.pengurusNama}
                </div>
                <div className="text-[11px] text-slate-500">
                  ({selectedProgram.pengurusId})
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Pengurus Bersama:
                </span>
                <div className="font-bold text-slate-900 mt-0.5">
                  {selectedProgram.pengurusBersamaNama || 'Tiada'}
                </div>
                {selectedProgram.pengurusBersamaId && (
                  <div className="text-[11px] text-slate-500">
                    ({selectedProgram.pengurusBersamaId})
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Pusat:
                </span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {selectedProgram.pusat}
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Jabatan:
                </span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {selectedProgram.jabatan}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Kewangan & Objek Sebagai (OS) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>Pecahan Kewangan & Peruntukan Objek Sebagai</span>
            </h4>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-600 font-semibold uppercase text-[11px]">
                  Sumber Kewangan:
                </span>
                <span className="font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-300">
                  {selectedProgram.sumberKewangan}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-600">OS21000 (RM):</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRM(selectedProgram.os21000)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-600">OS24000 (RM):</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRM(selectedProgram.os24000)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-600">OS27000 (RM):</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRM(selectedProgram.os27000)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-600">OS29000 (RM):</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRM(selectedProgram.os29000)}
                  </span>
                </div>
              </div>

              {/* Total RM */}
              <div className="mt-3 p-3 bg-slate-900 text-white rounded-md flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-300 block uppercase font-semibold">
                    JUMLAH (RM)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Jumlah kumulatif OS21000 + OS24000 + OS27000 + OS29000
                  </span>
                </div>
                <div className="text-lg font-bold tabular-nums">
                  RM {formatRM(selectedProgram.jumlahRm)}
                </div>
              </div>
            </div>
          </div>

          {selectedProgram.catatan && (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
              <span className="font-semibold text-slate-700 block mb-0.5">Catatan Tambahan:</span>
              <p>{selectedProgram.catatan}</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Daftar Program Institut Aminuddin Baki (IAB)
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={handleEdit}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
              >
                Kemaskini
              </button>
            )}
            <button
              onClick={() => {
                setIsDetailOpen(false);
                setSelectedProgram(null);
              }}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
