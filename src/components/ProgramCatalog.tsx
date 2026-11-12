import React, { useState, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { FilterBar } from './FilterBar';
import { formatRM, getStatusConfig } from '../utils/formatters';
import {
  Calendar,
  MapPin,
  Building,
  Briefcase,
  ArrowRight,
  ArrowUpDown,
  Filter,
} from 'lucide-react';

export const ProgramCatalog: React.FC = () => {
  const {
    filteredPrograms,
    viewProgramDetail,
    currentUser,
    pegawaiList,
  } = useProgramContext();

  // Bilangan paparan katalog dibenarkan: default 6
  const [displayLimit, setDisplayLimit] = useState<string>('6');
  const displayOptions = ['6', '12', '18', '24', '48', 'Semua'];

  // Filter sorting by STATUS PROGRAM
  const [statusSort, setStatusSort] = useState<string>('default');

  // User/Admin Access Filter:
  // Selepas log masuk, hanya memaparkan Katalog program di bawah JABATAN DIBERI AKSES,
  // atau di mana user/admin sebagai pengurus atau pengurus bersama.
  // Jika JABATAN DIBERI AKSES tiada maklumat, kosong atau NULL, paparkan semua katalog program sebagai VIEWER user sahaja.
  const accessiblePrograms = useMemo(() => {
    // 1. Jika belum log masuk, paparkan semua sebagai Viewer
    if (!currentUser) return filteredPrograms;

    // 2. Super Admin mempunyai akses penuh
    if (currentUser.role === 'SUPER_ADMIN') {
      return filteredPrograms;
    }

    // Dapatkan JABATAN DIBERI AKSES
    const allowed = (currentUser.allowedJabatans && currentUser.allowedJabatans.length > 0)
      ? currentUser.allowedJabatans.filter(Boolean)
      : (currentUser.jabatan ? [currentUser.jabatan] : []);

    // 3. Jika JABATAN DIBERI AKSES tiada maklumat, kosong atau NULL:
    // hanya paparkan semua katalog program sebagai VIEWER user sahaja
    if (allowed.length === 0 || allowed.includes('SEMUA JABATAN')) {
      return filteredPrograms;
    }

    const userNameNorm = (currentUser.name || '').trim().toUpperCase();
    const userIdNorm = (currentUser.id || '').trim().toUpperCase();
    const matchedPegawai = pegawaiList?.find(
      (p) =>
        (p.nama && p.nama.trim().toUpperCase() === userNameNorm) ||
        (p.id && p.id.trim().toUpperCase() === userIdNorm)
    );
    const pegIdNorm = matchedPegawai?.id?.trim().toUpperCase();
    const pegNamaNorm = matchedPegawai?.nama?.trim().toUpperCase();

    return filteredPrograms.filter((prog) => {
      // Syarat A: Di bawah JABATAN DIBERI AKSES
      if (prog.jabatan && allowed.includes(prog.jabatan)) {
        return true;
      }

      // Syarat B: User/admin sebagai Pengurus program
      const pId = (prog.pengurusId || '').trim().toUpperCase();
      const pNama = (prog.pengurusNama || '').trim().toUpperCase();
      const isPengurus =
        (pId && (pId === userIdNorm || (pegIdNorm && pId === pegIdNorm))) ||
        (pNama && (pNama === userNameNorm || (pegNamaNorm && pNama === pegNamaNorm)));
      if (isPengurus) return true;

      // Syarat C: User/admin sebagai Pengurus Bersama program
      const pbId = (prog.pengurusBersamaId || '').trim().toUpperCase();
      const pbNama = (prog.pengurusBersamaNama || '').trim().toUpperCase();
      const isPengurusBersama =
        (pbId && (pbId === userIdNorm || (pegIdNorm && pbId === pegIdNorm))) ||
        (pbNama && (pbNama === userNameNorm || (pegNamaNorm && pbNama === pegNamaNorm)));
      if (isPengurusBersama) return true;

      return false;
    });
  }, [filteredPrograms, currentUser, pegawaiList]);

  const sortedPrograms = useMemo(() => {
    const list = [...accessiblePrograms];
    if (statusSort === 'az') {
      return list.sort((a, b) => (a.statusProgram || '').localeCompare(b.statusProgram || ''));
    }
    if (statusSort === 'za') {
      return list.sort((a, b) => (b.statusProgram || '').localeCompare(a.statusProgram || ''));
    }
    if (statusSort === 'selesai_first') {
      return list.sort((a, b) => (a.statusProgram === 'SELESAI' ? -1 : b.statusProgram === 'SELESAI' ? 1 : 0));
    }
    if (statusSort === 'tanggung_first') {
      return list.sort((a, b) => (a.statusProgram === 'TANGGUNG' ? -1 : b.statusProgram === 'TANGGUNG' ? 1 : 0));
    }
    if (statusSort === 'dalam_tindakan_first') {
      return list.sort((a, b) => (a.statusProgram === 'DALAM TINDAKAN' ? -1 : b.statusProgram === 'DALAM TINDAKAN' ? 1 : 0));
    }
    if (statusSort === 'belum_ambil_first') {
      return list.sort((a, b) => (a.statusProgram === 'BELUM AMBIL TINDAKAN' ? -1 : b.statusProgram === 'BELUM AMBIL TINDAKAN' ? 1 : 0));
    }
    if (statusSort === 'batal_first') {
      return list.sort((a, b) => (a.statusProgram === 'BATAL' ? -1 : b.statusProgram === 'BATAL' ? 1 : 0));
    }
    return list;
  }, [accessiblePrograms, statusSort]);

  const displayedPrograms = useMemo(() => {
    if (displayLimit === 'Semua') return sortedPrograms;
    return sortedPrograms.slice(0, Number(displayLimit));
  }, [sortedPrograms, displayLimit]);

  return (
    <div>
      {/* 1. Filter by Pusat, Jabatan, Jenis Program, Pengurus, Pengurus Bersama, Negeri, Sumber Kewangan, Tahun, Bulan, Status (Sama seperti Page 1) */}
      <FilterBar showTahunBulan={true} showStatusFilter={true} />

      {/* Maklumat Skop Akses jika pengguna log masuk dan ada penapisan jabatan */}
      {currentUser && currentUser.role !== 'SUPER_ADMIN' && currentUser.allowedJabatans && currentUser.allowedJabatans.length > 0 && !currentUser.allowedJabatans.includes('SEMUA JABATAN') && (
        <div className="mb-4 px-3.5 py-2.5 bg-blue-50 border border-blue-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-blue-900">
          <div className="flex items-center gap-2">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-blue-200 text-blue-950 px-2 py-0.5 rounded">
              Skop Akses Pengguna
            </span>
            <span>
              Memaparkan katalog program di bawah jabatan diberi akses, atau di mana anda dilantik sebagai Pengurus / Pengurus Bersama.
            </span>
          </div>
          <span className="font-semibold text-blue-800 tabular-nums shrink-0">
            {accessiblePrograms.length} daripada {filteredPrograms.length} program
          </span>
        </div>
      )}

      {/* Catalog Header with controls: Bilangan Paparan & Sort by Status */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs mb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight">
            Katalog Perincian Program
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Paparan katalog ringkasan program mengikut spesifikasi Dashboard Pusat IAB (Mod Paparan Sahaja)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sorting by STATUS PROGRAM */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Susunan Status:</span>
            </label>
            <select
              value={statusSort}
              onChange={(e) => setStatusSort(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-md px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
            >
              <option value="default">Default (Susunan Asal)</option>
              <option value="az">Status (A - Z)</option>
              <option value="za">Status (Z - A)</option>
              <option value="selesai_first">Status: SELESAI Dahulu</option>
              <option value="tanggung_first">Status: TANGGUNG Dahulu</option>
              <option value="dalam_tindakan_first">Status: DALAM TINDAKAN Dahulu</option>
              <option value="belum_ambil_first">Status: BELUM AMBIL TINDAKAN Dahulu</option>
              <option value="batal_first">Status: BATAL Dahulu</option>
            </select>
          </div>

          {/* Bilangan Paparan Dibenarkan */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Papar:</span>
            <div className="inline-flex rounded-md shadow-2xs border border-slate-200 bg-slate-50 p-0.5">
              {displayOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setDisplayLimit(opt)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    displayLimit === opt
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <span className="text-xs text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-md font-medium tabular-nums">
            Menunjukkan <strong>{displayedPrograms.length}</strong> / {filteredPrograms.length} program
          </span>
        </div>
      </div>

      {/* Empty State */}
      {displayedPrograms.length === 0 ? (
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
        /* 2. Paparkan ringkasan program dalam bentuk katalog dengan ketebalan border 2 kali ganda (border-2) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedPrograms.map((prog) => {
            const statusCfg = getStatusConfig(prog.statusProgram);

            return (
              <div
                key={prog.id}
                className={`relative overflow-hidden rounded-xl p-5 shadow-xs transition-all flex flex-col justify-between group border-2 ${statusCfg.cardBg}`}
              >
                {/* Top accent bar matching status color */}
                <div className={`absolute top-0 left-0 right-0 h-1.5 ${statusCfg.accentBar}`} />

                <div>
                  {/* Card Top: Status Badge with specific color */}
                  <div className="flex items-start justify-between gap-2 mb-3 pt-1">
                    <span
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-md border whitespace-nowrap shadow-2xs ${statusCfg.badgeBg}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${statusCfg.dotBg}`} />
                      <span>{statusCfg.label}</span>
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
