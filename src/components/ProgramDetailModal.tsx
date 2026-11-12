import React from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { formatNumber, formatRM, getStatusConfig } from '../utils/formatters';
import {
  X,
  Edit2,
  Calendar,
  Building,
  MapPin,
  Users,
  Wallet,
  Receipt,
  FileText,
  CheckCircle2,
  History,
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
    programs,
  } = useProgramContext();

  if (!isDetailOpen || !selectedProgram) return null;

  // Ensure showing latest program data from state if available
  const currentProg = programs.find((p) => p.id === selectedProgram.id) || selectedProgram;
  const statusConfig = getStatusConfig(currentProg.statusProgram);

  // View-only unless authenticated as Super Admin or Admin of matching Jabatan
  const canEdit =
    currentUser &&
    (currentUser.role === 'SUPER_ADMIN' ||
      !currentUser.jabatan ||
      currentUser.jabatan === currentProg.jabatan ||
      (currentUser.allowedJabatans &&
        (currentUser.allowedJabatans.includes('SEMUA JABATAN') ||
          currentUser.allowedJabatans.includes(currentProg.jabatan))));

  const handleEdit = () => {
    if (!canEdit) return;
    setProgramToEdit(currentProg);
    setIsDetailOpen(false);
    setIsFormOpen(true);
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
                {currentProg.kodProgram}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={handleEdit}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
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
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors cursor-pointer"
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
                Kod Program: {currentProg.kodProgram}
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
              Nama Program: {currentProg.namaProgram.toUpperCase()}
            </h2>
            <div className="text-xs font-medium text-slate-600 mt-1">
              Jenis Program: <strong className="text-slate-900">{currentProg.jenisProgram}</strong>
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
                  {currentProg.tempoh}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Jumlah Hari:
                </span>
                <div className="font-bold text-slate-900 text-sm mt-0.5 tabular-nums">
                  {currentProg.jumlahHari} hari
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Tempat:
                </span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {currentProg.tempat}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Negeri:
                </span>
                <div className="font-bold text-slate-900 mt-0.5">
                  {currentProg.negeri}
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Bilangan Peserta:
                </span>
                <div className="font-bold text-slate-900 mt-0.5 tabular-nums">
                  {formatNumber(currentProg.bilanganPeserta)} orang
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
                  {currentProg.pengurusNama}
                </div>
                <div className="text-[11px] text-slate-500">
                  ({currentProg.pengurusId})
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Pengurus Bersama:
                </span>
                <div className="font-bold text-slate-900 mt-0.5">
                  {currentProg.pengurusBersamaNama || 'Tiada'}
                </div>
                {currentProg.pengurusBersamaId && (
                  <div className="text-[11px] text-slate-500">
                    ({currentProg.pengurusBersamaId})
                  </div>
                )}
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-200">
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Pusat:
                </span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {currentProg.pusat}
                </div>
              </div>

              <div className="sm:col-span-2">
                <span className="text-slate-500 block text-[11px] uppercase font-semibold">
                  Jabatan:
                </span>
                <div className="font-semibold text-slate-900 mt-0.5">
                  {currentProg.jabatan}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Kewangan & Objek Sebagai (OS) */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" />
              <span>Peruntukan Kewangan Diluluskan (Seperti dinyatakan dalam BK65)</span>
            </h4>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                <span className="text-slate-600 font-semibold uppercase text-[11px]">
                  Sumber Kewangan:
                </span>
                <span className="font-bold text-slate-900 bg-white px-2.5 py-0.5 rounded border border-slate-300">
                  {currentProg.sumberKewangan}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                <div className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-600">OS21000 (RM):</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRM(currentProg.os21000)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-600">OS24000 (RM):</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRM(currentProg.os24000)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-600">OS27000 (RM):</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRM(currentProg.os27000)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-white rounded border border-slate-200">
                  <span className="text-slate-600">OS29000 (RM):</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatRM(currentProg.os29000)}
                  </span>
                </div>
              </div>

              {/* Total RM */}
              <div className="mt-3 p-3 bg-slate-900 text-white rounded-md flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-300 block uppercase font-semibold">
                    JUMLAH PERUNTUKAN DITERIMA (RM)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Jumlah kumulatif OS21000 + OS24000 + OS27000 + OS29000
                  </span>
                </div>
                <div className="text-lg font-bold tabular-nums">
                  RM {formatRM(currentProg.jumlahRm)}
                </div>
              </div>
            </div>

            {/* Belanja Sebenar & Penjimatan (Hanya bagi Status SELESAI dan TANGGUNG) */}
            {(currentProg.statusProgram.toUpperCase() === 'SELESAI' ||
              currentProg.statusProgram.toUpperCase() === 'TANGGUNG') && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {/* Belanja Sebenar */}
                <div className="bg-emerald-50/70 p-4 rounded-lg border border-emerald-200 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <span className="font-bold text-emerald-950 uppercase tracking-wide text-[11px]">
                      BELANJA SEBENAR (OS)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-bold text-[10px]">
                      {currentProg.statusProgram.toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-slate-700">
                      <span>OS21000 Belanja:</span>
                      <strong className="tabular-nums">
                        RM {formatRM(currentProg.os21000Belanja ?? 0)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>OS24000 Belanja:</span>
                      <strong className="tabular-nums">
                        RM {formatRM(currentProg.os24000Belanja ?? 0)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>OS27000 Belanja:</span>
                      <strong className="tabular-nums">
                        RM {formatRM(currentProg.os27000Belanja ?? 0)}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>OS29000 Belanja:</span>
                      <strong className="tabular-nums">
                        RM {formatRM(currentProg.os29000Belanja ?? 0)}
                      </strong>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-emerald-200 flex justify-between font-bold text-emerald-950 text-sm">
                    <span>Jumlah Belanja Sebenar:</span>
                    <span className="tabular-nums">
                      RM{' '}
                      {formatRM(
                        currentProg.jumlahBelanjaRm ??
                          (Number(currentProg.os21000Belanja || 0) +
                            Number(currentProg.os24000Belanja || 0) +
                            Number(currentProg.os27000Belanja || 0) +
                            Number(currentProg.os29000Belanja || 0))
                      )}
                    </span>
                  </div>
                </div>

                {/* Penjimatan */}
                <div className="bg-amber-50/70 p-4 rounded-lg border border-amber-200 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                    <span className="font-bold text-amber-950 uppercase tracking-wide text-[11px]">
                      PENJIMATAN (OS)
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">
                      BAKI BERSIH
                    </span>
                  </div>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-slate-700">
                      <span>OS21000 Penjimatan:</span>
                      <strong className="tabular-nums">
                        RM{' '}
                        {formatRM(
                          currentProg.os21000Penjimatan ??
                            Math.max(
                              0,
                              (currentProg.os21000 || 0) - (currentProg.os21000Belanja || 0)
                            )
                        )}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>OS24000 Penjimatan:</span>
                      <strong className="tabular-nums">
                        RM{' '}
                        {formatRM(
                          currentProg.os24000Penjimatan ??
                            Math.max(
                              0,
                              (currentProg.os24000 || 0) - (currentProg.os24000Belanja || 0)
                            )
                        )}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>OS27000 Penjimatan:</span>
                      <strong className="tabular-nums">
                        RM{' '}
                        {formatRM(
                          currentProg.os27000Penjimatan ??
                            Math.max(
                              0,
                              (currentProg.os27000 || 0) - (currentProg.os27000Belanja || 0)
                            )
                        )}
                      </strong>
                    </div>
                    <div className="flex justify-between text-slate-700">
                      <span>OS29000 Penjimatan:</span>
                      <strong className="tabular-nums">
                        RM{' '}
                        {formatRM(
                          currentProg.os29000Penjimatan ??
                            Math.max(
                              0,
                              (currentProg.os29000 || 0) - (currentProg.os29000Belanja || 0)
                            )
                        )}
                      </strong>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-200 flex justify-between font-bold text-amber-950 text-sm">
                    <span>Jumlah Penjimatan:</span>
                    <span className="tabular-nums">
                      RM{' '}
                      {formatRM(
                        currentProg.jumlahPenjimatanRm ??
                          Math.max(
                            0,
                            (currentProg.jumlahRm || 0) -
                              (currentProg.jumlahBelanjaRm || 0)
                          )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {currentProg.catatan && (
            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded border border-slate-200">
              <span className="font-semibold text-slate-700 block mb-0.5">Catatan Tambahan:</span>
              <p>{currentProg.catatan}</p>
            </div>
          )}

          {/* BAHAGIAN BAHARU: Rekod Perubahan Maklumat Program (BK04) */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                <span>Rekod Perubahan Maklumat Program (BK04)</span>
              </h4>
              {currentProg.rekodPindaan && currentProg.rekodPindaan.length > 0 && (
                <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2 py-0.5 rounded font-bold">
                  {currentProg.rekodPindaan.length} Pindaan Direkodkan
                </span>
              )}
            </div>

            {!currentProg.rekodPindaan || currentProg.rekodPindaan.length === 0 ? (
              <div className="text-xs text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-200 text-center">
                <p className="font-medium text-slate-700">Tiada rekod perubahan maklumat program (BK04) buat masa ini.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Sebarang pindaan maklumat pada borang program akan direkodkan secara terperinci di sini mengikut tarikh dan nama pegawai pengemaskini.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentProg.rekodPindaan.map((pindaan, pIdx) => (
                  <div
                    key={pIdx}
                    className="bg-white border border-slate-300 rounded-lg overflow-hidden shadow-2xs text-xs"
                  >
                    {/* Header Pindaan: Pindaan Kali X | Tarikh Pindaan: ... | Dikemaskini oleh: ... */}
                    <div className="bg-slate-100/90 px-3.5 py-2 border-b border-slate-200 flex flex-wrap items-center gap-2 text-slate-800 font-bold text-[11px]">
                      <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[10px] font-mono">
                        Pindaan Kali {pindaan.noPindaan}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span>Tarikh Pindaan: <strong className="text-slate-900">{pindaan.tarikhPindaan}</strong></span>
                      <span className="text-slate-400">|</span>
                      <span>Dikemaskini oleh: <strong className="text-blue-900 uppercase">{pindaan.dikemaskiniOleh}</strong></span>
                      <span className="text-slate-400">|</span>
                    </div>

                    {/* Jadual Perubahan: Bil. | Jenis Perubahan | Maklumat Asal | Maklumat Terkini */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[10px] uppercase">
                            <th className="py-2 px-3 w-12 text-center">Bil.</th>
                            <th className="py-2 px-3 min-w-[140px]">Jenis Perubahan</th>
                            <th className="py-2 px-3 min-w-[180px]">Maklumat Asal</th>
                            <th className="py-2 px-3 min-w-[180px]">Maklumat Terkini</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {pindaan.perubahan.map((item, itemIdx) => (
                            <tr key={itemIdx} className="hover:bg-slate-50/60">
                              <td className="py-2 px-3 text-center font-semibold text-slate-500">
                                {itemIdx + 1}
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-900">
                                {item.jenisPerubahan}
                              </td>
                              <td className="py-2 px-3 text-rose-700 font-medium bg-rose-50/40">
                                {item.maklumatAsal || '-'}
                              </td>
                              <td className="py-2 px-3 text-emerald-800 font-bold bg-emerald-50/40">
                                {item.maklumatTerkini || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
