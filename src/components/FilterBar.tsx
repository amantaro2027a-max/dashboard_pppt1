import React, { useMemo, useState } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import {
  PUSAT_LIST,
  JABATAN_MAP,
  ALL_JABATAN_LIST,
  JENIS_PROGRAM_LIST,
  PEGAWAI_LIST,
  NEGERI_LIST,
  BULAN_LIST,
  TAHUN_LIST,
  STATUS_PROGRAM_LIST,
  SUMBER_KEWANGAN_LIST,
} from '../data/constants';
import { PusatType } from '../types/program';
import { Search, X, Filter, SlidersHorizontal, ChevronDown, ChevronUp } from 'lucide-react';

interface FilterBarProps {
  showTahunBulan?: boolean;
  showStatusFilter?: boolean;
  hidePusatJabatan?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  showTahunBulan = true,
  showStatusFilter = true,
  hidePusatJabatan = false,
}) => {
  const {
    filters,
    setFilter,
    resetFilters,
    filteredPrograms,
    programs,
    pusatList,
    jabatanMap,
    pegawaiList,
    sumberKewanganList,
    statusProgramList,
  } = useProgramContext();

  // Show/Hide state for filter controls (default: sembunyi penapis)
  const [isExpanded, setIsExpanded] = useState(false);

  // Dynamic Jabatan options based on selected Pusat (Kecualikan "SEMUA JABATAN DI IAB" atau "SEMUA JABATAN")
  const availableJabatan = useMemo(() => {
    let list: string[] = [];
    if (filters.pusat && filters.pusat in jabatanMap) {
      list = jabatanMap[filters.pusat] || [];
    } else {
      const all = Object.values(jabatanMap).flat();
      list = Array.from(new Set(all));
    }
    return list.filter((j) => {
      if (!j) return false;
      const upper = j.trim().toUpperCase();
      return (
        upper !== 'SEMUA JABATAN DI IAB' &&
        upper !== 'SEMUA JABATAN' &&
        !upper.includes('SEMUA JABATAN')
      );
    });
  }, [filters.pusat, jabatanMap]);

  // Dynamic Pengurus Bersama options excluding the currently selected Pengurus
  const availablePengurusBersama = useMemo(() => {
    if (!filters.pengurus) {
      return pegawaiList;
    }
    return pegawaiList.filter(
      (p) => p.id !== filters.pengurus && p.nama !== filters.pengurus
    );
  }, [filters.pengurus, pegawaiList]);

  // Count active filters (excluding default empty values)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (!hidePusatJabatan && filters.pusat) count++;
    if (!hidePusatJabatan && filters.jabatan) count++;
    if (filters.jenisProgram) count++;
    if (filters.pengurus) count++;
    if (filters.pengurusBersama) count++;
    if (filters.negeri) count++;
    if (filters.sumberKewangan) count++;
    if (showTahunBulan && filters.tahun) count++;
    if (showTahunBulan && filters.bulan) count++;
    if (showStatusFilter && filters.status) count++;
    if (filters.searchQuery) count++;
    return count;
  }, [filters, showTahunBulan, showStatusFilter, hidePusatJabatan]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 shadow-xs mb-6">
      {/* Top row: Section title, active count, search input, reset button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-700" />
          <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
            Penapis Data Program
          </h2>
          {activeFilterCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-900 text-white font-medium tabular-nums">
              {activeFilterCount} aktif
            </span>
          )}
          <span className="text-xs text-slate-500 tabular-nums ml-2">
            ({filteredPrograms.length} daripada {programs.length} rekod)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilter('searchQuery', e.target.value)}
              placeholder="Carian program, kod, tempat..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 placeholder:text-slate-400"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilter('searchQuery', '')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Set Semula</span>
            </button>
          )}

          {/* Show / Hide Penapis Toggle Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors cursor-pointer select-none"
            title={isExpanded ? 'Sembunyikan bahagian pilihan penapis' : 'Tunjukkan bahagian pilihan penapis'}
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-slate-600" />
                <span>Sembunyi Penapis</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-slate-600" />
                <span>Tunjuk Penapis</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid of Dropdowns (Show / Hide) */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-4 border-t border-slate-100">
        {/* 1. PUSAT (Main Tree Selection) */}
        {!hidePusatJabatan && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Pusat
            </label>
            <select
              value={filters.pusat}
              onChange={(e) => setFilter('pusat', e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
            >
              <option value="">Semua Pusat</option>
              {pusatList.map((pusat) => (
                <option key={pusat} value={pusat}>
                  {pusat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 2. JABATAN (Bergantung kepada Pusat yang dipilih) */}
        {!hidePusatJabatan && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Jabatan {filters.pusat ? '(Ditapis mengikut Pusat)' : ''}
            </label>
            <select
              value={filters.jabatan}
              onChange={(e) => setFilter('jabatan', e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
            >
              <option value="">Semua Jabatan</option>
              {availableJabatan.map((jabatan) => (
                <option key={jabatan} value={jabatan}>
                  {jabatan}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. JENIS PROGRAM (22 Jenis Program Rasmi IAB) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Jenis Program
          </label>
          <select
            value={filters.jenisProgram}
            onChange={(e) => setFilter('jenisProgram', e.target.value)}
            className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
          >
            <option value="">Semua Jenis Program (22)</option>
            {JENIS_PROGRAM_LIST.map((jenis) => (
              <option key={jenis} value={jenis}>
                {jenis}
              </option>
            ))}
          </select>
        </div>

        {/* 4. PENGURUS */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Pengurus
          </label>
          <select
            value={filters.pengurus}
            onChange={(e) => setFilter('pengurus', e.target.value)}
            className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
          >
            <option value="">Semua Pengurus</option>
            {pegawaiList.map((pegawai) => (
              <option key={pegawai.id} value={pegawai.id}>
                {pegawai.label}
              </option>
            ))}
          </select>
        </div>

        {/* 5. PENGURUS BERSAMA (Kecualikan Pengurus yang dipilih) */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Pengurus Bersama {filters.pengurus ? `(Kecuali ${filters.pengurus})` : ''}
          </label>
          <select
            value={filters.pengurusBersama}
            onChange={(e) => setFilter('pengurusBersama', e.target.value)}
            className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
          >
            <option value="">Semua Pengurus Bersama</option>
            {availablePengurusBersama.map((pegawai) => (
              <option key={pegawai.id} value={pegawai.id}>
                {pegawai.label}
              </option>
            ))}
          </select>
        </div>

        {/* 6. NEGERI */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Negeri
          </label>
          <select
            value={filters.negeri}
            onChange={(e) => setFilter('negeri', e.target.value)}
            className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
          >
            <option value="">Semua Negeri</option>
            {NEGERI_LIST.map((negeri) => (
              <option key={negeri} value={negeri}>
                {negeri}
              </option>
            ))}
          </select>
        </div>

        {/* SUMBER KEWANGAN */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
            Sumber Kewangan
          </label>
          <select
            value={filters.sumberKewangan}
            onChange={(e) => setFilter('sumberKewangan', e.target.value)}
            className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
          >
            <option value="">Semua Sumber Kewangan</option>
            {sumberKewanganList.map((sk) => (
              <option key={sk} value={sk}>
                {sk}
              </option>
            ))}
          </select>
        </div>

        {/* TAHUN (jika showTahunBulan = true) */}
        {showTahunBulan && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Tahun
            </label>
            <select
              value={filters.tahun}
              onChange={(e) => setFilter('tahun', e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
            >
              <option value="">Semua Tahun</option>
              {TAHUN_LIST.map((yr) => (
                <option key={yr} value={yr.toString()}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 8. BULAN (jika showTahunBulan = true) */}
        {showTahunBulan && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Bulan
            </label>
            <select
              value={filters.bulan}
              onChange={(e) => setFilter('bulan', e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
            >
              <option value="">Semua Bulan (1 - 12)</option>
              {BULAN_LIST.map((bln) => (
                <option key={bln.value} value={bln.value.toString()}>
                  {bln.value}. {bln.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 9. STATUS (Optional filter) */}
        {showStatusFilter && (
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 uppercase tracking-wider mb-1">
              Status Program
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
              className="w-full text-xs py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-800"
            >
              <option value="">Semua Status</option>
              {statusProgramList.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      )}
    </div>
  );
};
