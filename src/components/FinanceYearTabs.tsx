import React, { useMemo } from 'react';
import { Calendar, RefreshCw, Layers, Building2, RotateCcw, Lock } from 'lucide-react';
import { useProgramContext } from '../context/ProgramContext';
import { getCurrentFinanceYear } from '../utils/financeYear';

interface FinanceYearTabsProps {
  accentColor?: 'emerald' | 'teal' | 'amber' | 'blue';
  subtitle?: string;
}

export const FinanceYearTabs: React.FC<FinanceYearTabsProps> = ({
  accentColor = 'blue',
  subtitle,
}) => {
  const {
    selectedFinanceYear,
    setSelectedFinanceYear,
    availableFinanceYears,
    klusterList,
    klusterMap,
    pusatList,
    financeKlusterFilter,
    setFinanceKlusterFilter,
    financePusatFilter,
    setFinancePusatFilter,
    resetFinanceOrgFilters,
    isFinanceOrgAutoFiltered,
  } = useProgramContext();

  const currentYear = getCurrentFinanceYear();

  const activeButtonClass =
    accentColor === 'emerald'
      ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
      : accentColor === 'teal'
      ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
      : accentColor === 'amber'
      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
      : 'bg-slate-900 text-white border-slate-900 shadow-xs';

  const availablePusatOptions = useMemo(() => {
    if (!financeKlusterFilter || financeKlusterFilter === 'SEMUA') {
      return pusatList;
    }
    const mapped = klusterMap[financeKlusterFilter] || [];
    return mapped.length > 0 ? mapped : [];
  }, [financeKlusterFilter, klusterMap, pusatList]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-4 sm:px-5 py-3.5 shadow-xs space-y-3">
      {/* Row 1: Penapis Tahun Kewangan */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Penapis Tahun Kewangan
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                <RefreshCw className="w-2.5 h-2.5 text-emerald-600" />
                <span>Disegerakkan: Tahun {selectedFinanceYear}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {subtitle ||
                'Pilih tahun, kluster dan pusat untuk menapis & menyegerakkan data merentas halaman Peruntukan, Perbelanjaan, Subwaran dan Baki Peruntukan.'}
            </p>
          </div>
        </div>

        {/* Year Tabs + Quick Select */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Pilih Tahun Kewangan">
            {availableFinanceYears.map((yr) => {
              const isActive = yr === selectedFinanceYear;
              const isCurrent = yr === currentYear;
              return (
                <button
                  key={yr}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedFinanceYear(yr)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                    isActive
                      ? activeButtonClass
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <span className="font-mono">{yr}</span>
                  {isCurrent && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                        isActive
                          ? accentColor === 'amber'
                            ? 'bg-slate-900/15 text-slate-950'
                            : 'bg-white/20 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      Semasa
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <select
            aria-label="Pilih Tahun Kewangan"
            value={selectedFinanceYear}
            onChange={(e) => setSelectedFinanceYear(Number(e.target.value))}
            className="text-xs font-semibold py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
          >
            {availableFinanceYears.map((yr) => (
              <option key={yr} value={yr}>
                Tahun {yr} {yr === currentYear ? '(Semasa)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Penapis Kluster & Pusat (Master Data) */}
      <div className="pt-3 border-t border-slate-100 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-700">
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Tapis Kluster &amp; Pusat (Data Induk):</span>
          </span>
          {isFinanceOrgAutoFiltered ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-300">
              <Lock className="w-3 h-3" />
              <span>Auto-Tapis Pusat Pengguna · Semua Penapis Terkunci</span>
            </span>
          ) : (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
              Paparan Lalai: Semua Kluster &amp; Semua Pusat
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-2.5 flex-1 xl:justify-end">
          {/* Dropdown Kluster */}
          <div className="flex items-center gap-1.5 min-w-[220px]">
            {isFinanceOrgAutoFiltered ? (
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            ) : (
              <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <select
              aria-label="Tapis mengikut Kluster"
              value={financeKlusterFilter}
              disabled={isFinanceOrgAutoFiltered}
              onChange={(e) => setFinanceKlusterFilter(e.target.value)}
              className={`w-full text-xs font-semibold py-1.5 px-2.5 border rounded-lg focus:outline-none ${
                isFinanceOrgAutoFiltered
                  ? 'bg-slate-100 border-slate-300 text-slate-600 cursor-not-allowed opacity-90'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900 cursor-pointer'
              }`}
            >
              <option value="SEMUA">Semua Kluster</option>
              {klusterList.map((klu) => (
                <option key={klu} value={klu}>
                  {klu}
                </option>
              ))}
            </select>
          </div>

          {/* Dropdown Pusat */}
          <div className="flex items-center gap-1.5 min-w-[260px]">
            {isFinanceOrgAutoFiltered ? (
              <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            ) : (
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <select
              aria-label="Tapis mengikut Pusat"
              value={financePusatFilter}
              disabled={isFinanceOrgAutoFiltered}
              onChange={(e) => setFinancePusatFilter(e.target.value)}
              className={`w-full text-xs font-semibold py-1.5 px-2.5 border rounded-lg focus:outline-none ${
                isFinanceOrgAutoFiltered
                  ? 'bg-slate-100 border-slate-300 text-slate-600 cursor-not-allowed opacity-90'
                  : 'bg-slate-50 border-slate-200 text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-900 cursor-pointer'
              }`}
            >
              <option value="SEMUA">Semua Pusat</option>
              {availablePusatOptions.map((pus) => (
                <option key={pus} value={pus}>
                  {pus}
                </option>
              ))}
            </select>
          </div>

          {/* Reset Button (Hidden/Disabled when locked) */}
          {!isFinanceOrgAutoFiltered ? (
            <button
              type="button"
              onClick={resetFinanceOrgFilters}
              title="Tetap semula penapis mengikut tahap kebenaran akaun"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-300 rounded-lg shrink-0 select-none">
              <Lock className="w-3 h-3 text-amber-600" />
              <span>Terkunci</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

