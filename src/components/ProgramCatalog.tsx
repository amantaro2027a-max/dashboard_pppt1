import React from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { FilterBar } from './FilterBar';
import { formatRM, getStatusConfig } from '../utils/formatters';
import {
  Calendar,
  MapPin,
  Building,
  Briefcase,
  ArrowRight,
} from 'lucide-react';

export const ProgramCatalog: React.FC = () => {
  const {
    filteredPrograms,
    viewProgramDetail,
  } = useProgramContext();

  return (
    <div>
      {/* 1. Filter by Pusat, Jabatan, Jenis Program, Pengurus, Pengurus Bersama, Negeri, Sumber Kewangan, Tahun, Bulan, Status (Sama seperti Page 1) */}
      <FilterBar showTahunBulan={true} showStatusFilter={true} />

      {/* Catalog Header with count and informational note (View Only) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Katalog Perincian Program
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Paparan katalog ringkasan program mengikut spesifikasi Pusat PPPT & PKPOP IAB (Mod Paparan Sahaja)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-md font-medium tabular-nums shadow-xs">
            Menunjukkan <strong>{filteredPrograms.length}</strong> program
          </span>
        </div>
      </div>

      {/* Empty State */}
      {filteredPrograms.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-lg p-12 text-center">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-900">
            Tiada Program Ditemui
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Tiada rekod program yang menepati gabungan penapis yang dipilih. Sila laraskan semula pilihan penapis di atas.
          </p>
        </div>
      ) : (
        /* 2. Paparkan ringkasan program dalam bentuk katalog */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPrograms.map((prog) => {
            const statusCfg = getStatusConfig(prog.statusProgram);

            return (
              <div
                key={prog.id}
                className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Top: Status Badge (No edit/delete in public view) */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${statusCfg.badgeBg}`}
                    >
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Nama Program (UPPERCASE) */}
                  <h3 className="text-sm font-bold text-slate-900 line-clamp-2 min-h-[2.5rem] group-hover:text-slate-800 leading-snug uppercase">
                    {prog.namaProgram.toUpperCase()}
                  </h3>

                  <div className="text-[11px] font-mono text-slate-500 mt-1 mb-4 uppercase">
                    Kod: {prog.kodProgram} · {prog.jenisProgram}
                  </div>

                  {/* Program Metadata List as per requirement:
                      b. Tempoh
                      c. Jumlah Hari
                      d. Tempat
                      e. Pusat
                      f. Jabatan
                  */}
                  <div className="space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    {/* b. Tempoh & c. Jumlah Hari */}
                    <div className="flex items-start gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] text-slate-400 block uppercase font-semibold">
                          Tempoh & Jumlah Hari
                        </span>
                        <div className="font-semibold text-slate-800 tabular-nums">
                          {prog.tempoh}
                          <span className="text-slate-500 font-normal ml-1">
                            ({prog.jumlahHari} hari)
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* d. Tempat & Negeri */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] text-slate-400 block uppercase font-semibold">
                          Tempat & Negeri
                        </span>
                        <div className="text-slate-800 font-medium line-clamp-1">
                          {prog.tempat}
                          <span className="text-slate-500 ml-1">({prog.negeri})</span>
                        </div>
                      </div>
                    </div>

                    {/* e. Pusat */}
                    <div className="flex items-start gap-2">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] text-slate-400 block uppercase font-semibold">
                          Pusat
                        </span>
                        <div className="text-slate-800 font-medium text-[11px] line-clamp-1">
                          {prog.pusat}
                        </div>
                      </div>
                    </div>

                    {/* f. Jabatan */}
                    <div className="flex items-start gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[11px] text-slate-400 block uppercase font-semibold">
                          Jabatan
                        </span>
                        <div className="text-slate-800 font-medium text-[11px] line-clamp-1">
                          {prog.jabatan}
                        </div>
                      </div>
                    </div>

                    {/* Additional Officer & Participant note */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Pengurus: <strong className="text-slate-700">{prog.pengurusNama}</strong></span>
                      <span className="tabular-nums font-medium">{prog.bilanganPeserta} peserta</span>
                    </div>
                  </div>
                </div>

                {/* g. Bawah sekali, ada link untuk Lihat Maklumat Lanjut */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-900 tabular-nums">
                    RM {formatRM(prog.jumlahRm)}
                  </div>

                  <button
                    onClick={() => viewProgramDetail(prog)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-slate-700 hover:underline transition-all cursor-pointer py-1"
                  >
                    <span>Lihat Maklumat Lanjut</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
