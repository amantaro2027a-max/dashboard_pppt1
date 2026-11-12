import React, { useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { formatRM } from '../utils/formatters';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  Receipt,
  Building2,
  Package,
  Car,
  PieChart,
} from 'lucide-react';

export const StatusPeruntukanKewangan: React.FC = () => {
  const {
    fasaPeruntukanList,
    subwaranList,
    sumberKewanganList,
    filteredPrograms,
    filters,
  } = useProgramContext();

  // Pengiraan tepat mengikut arahan:
  // 1. Card PERUNTUKAN DITERIMA ambil data daripada Page PERUNTUKAN (semua fasa)
  // 2. Card PERUNTUKAN DIBELANJAKAN ambil data daripada Page PERBELANJAAN (status: SELESAI & TANGGUNG)
  // 3. Card BAKI PERUNTUKAN = (PERUNTUKAN DITERIMA) - (PERUNTUKAN DIBELANJAKAN) - (data daripada Page Subwaran)
  const calc = useMemo(() => {
    // 1. Peruntukan Diterima daripada Page Peruntukan
    let d21 = 0, d24 = 0, d27 = 0, d29 = 0;
    const targetSkList = filters.sumberKewangan ? [filters.sumberKewangan] : (sumberKewanganList || []);

    (fasaPeruntukanList || []).forEach((fasa) => {
      targetSkList.forEach((sk) => {
        const alloc = fasa.allocations?.[sk];
        if (alloc) {
          d21 += Number(alloc.os21000) || 0;
          d24 += Number(alloc.os24000) || 0;
          d27 += Number(alloc.os27000) || 0;
          d29 += Number(alloc.os29000) || 0;
        }
      });
    });
    const dKeseluruhan = d21 + d24 + d27 + d29;

    // 2. Peruntukan Dibelanjakan daripada Page Perbelanjaan (Status SELESAI & TANGGUNG)
    let b21 = 0, b24 = 0, b27 = 0, b29 = 0;
    (filteredPrograms || []).forEach((p) => {
      const status = (p.statusProgram || '').trim().toUpperCase();
      if (status === 'SELESAI' || status === 'TANGGUNG') {
        b21 += Number(p.os21000Belanja) || 0;
        b24 += Number(p.os24000Belanja) || 0;
        b27 += Number(p.os27000Belanja) || 0;
        b29 += Number(p.os29000Belanja) || 0;
      }
    });
    const bKeseluruhan = b21 + b24 + b27 + b29;

    // 3. Data daripada Page Subwaran (rujukan)
    let s21 = 0, s24 = 0, s27 = 0, s29 = 0;
    (subwaranList || []).forEach((sub) => {
      if (!filters.sumberKewangan || sub.sumberKewangan === filters.sumberKewangan) {
        s21 += Number(sub.os21000) || 0;
        s24 += Number(sub.os24000) || 0;
        s27 += Number(sub.os27000) || 0;
        s29 += Number(sub.os29000) || 0;
      }
    });
    const sKeseluruhan = s21 + s24 + s27 + s29;

    // 4. Baki Peruntukan = Peruntukan Diterima - Peruntukan Dibelanjakan
    // (Jika Belanja adalah RM0.00, Baki Peruntukan tepat sama dengan Peruntukan Diterima)
    const baki21 = d21 - b21;
    const baki24 = d24 - b24;
    const baki27 = d27 - b27;
    const baki29 = d29 - b29;
    const bakiKeseluruhan = dKeseluruhan - bKeseluruhan;

    const peratusBelanja = Math.min(
      100,
      Math.round((bKeseluruhan / (dKeseluruhan || 1)) * 100)
    );

    return {
      diterimaOs21: d21,
      diterimaOs24: d24,
      diterimaOs27: d27,
      diterimaOs29: d29,
      diterimaKeseluruhan: dKeseluruhan,

      dibelanjaOs21: b21,
      dibelanjaOs24: b24,
      dibelanjaOs27: b27,
      dibelanjaOs29: b29,
      dibelanjaKeseluruhan: bKeseluruhan,

      subwaranOs21: s21,
      subwaranOs24: s24,
      subwaranOs27: s27,
      subwaranOs29: s29,
      subwaranKeseluruhan: sKeseluruhan,

      bakiOs21: baki21,
      bakiOs24: baki24,
      bakiOs27: baki27,
      bakiOs29: baki29,
      bakiKeseluruhan: bakiKeseluruhan,

      peratusBelanja,
    };
  }, [fasaPeruntukanList, subwaranList, sumberKewanganList, filteredPrograms, filters]);

  const financialStats = calc;
  const peratusBelanja = calc.peratusBelanja;

  return (
    <div className="bg-emerald-50/70 border border-emerald-200/90 rounded-xl p-5 sm:p-6 mb-8 shadow-xs">
      {/* Group Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 mb-6 border-b border-emerald-200/70">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Wallet className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-emerald-950 uppercase tracking-tight">
              STATUS PERUNTUKAN KEWANGAN
            </h2>
          </div>
          <p className="text-xs text-emerald-800/80 mt-1">
            Ringkasan status peruntukan diterima, perbelanjaan semasa, dan baki peruntukan mengikut Objek Sebagai (OS)
          </p>
        </div>

        {/* Global Utilization Progress Bar */}
        <div className="bg-white/90 border border-emerald-200 rounded-lg px-4 py-2 flex items-center gap-4 shadow-2xs">
          <div>
            <div className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wider">
              Kadar Perbelanjaan Semasa
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${peratusBelanja}%` }}
                />
              </div>
              <span className="text-xs font-bold text-emerald-950 tabular-nums">
                {peratusBelanja}%
              </span>
            </div>
          </div>

          <div className="border-l border-emerald-100 pl-4 text-right">
            <span className="text-[10px] text-emerald-700 block uppercase font-semibold">
              Baki Bersih
            </span>
            <span className="text-xs font-bold text-emerald-950 tabular-nums">
              RM {formatRM(financialStats.bakiKeseluruhan)}
            </span>
          </div>
        </div>
      </div>

      {/* 3 Main Financial Sub-groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* ========================================================
            SUB-GROUP 1: PERUNTUKAN DITERIMA
        ======================================================== */}
        <div className="bg-white rounded-xl border border-sky-200 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-sky-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-sky-600 text-white flex items-center justify-center">
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-sky-950 uppercase tracking-wider">
                  PERUNTUKAN DITERIMA
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                Waran Masuk
              </span>
            </div>

            {/* Sub-cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-sky-50/40 border border-sky-100 hover:border-sky-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS21</span>
                    <span className="text-[10px] text-slate-500">Perjalanan & Sara Hidup</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  RM {formatRM(financialStats.diterimaOs21)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-sky-50/40 border border-sky-100 hover:border-sky-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS24</span>
                    <span className="text-[10px] text-slate-500">Sewaan & Penginapan</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  RM {formatRM(financialStats.diterimaOs24)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-sky-50/40 border border-sky-100 hover:border-sky-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS27</span>
                    <span className="text-[10px] text-slate-500">Bekalan Bahan & Latihan</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  RM {formatRM(financialStats.diterimaOs27)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-sky-50/40 border border-sky-100 hover:border-sky-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-sky-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS29</span>
                    <span className="text-[10px] text-slate-500">Perkhidmatan Ikhtisas</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  RM {formatRM(financialStats.diterimaOs29)}
                </span>
              </div>
            </div>
          </div>

          {/* Highlight Card: Jumlah Diterima Keseluruhan */}
          <div className="mt-4 pt-3 border-t border-sky-100">
            <div className="p-3 rounded-lg bg-sky-900 text-white flex items-center justify-between shadow-xs">
              <div>
                <span className="text-[11px] font-semibold text-sky-200 uppercase tracking-wider block">
                  Jumlah Diterima Keseluruhan
                </span>
                <span className="text-[10px] text-sky-300">Kumulatif OS21+24+27+29</span>
              </div>
              <div className="text-sm font-bold tabular-nums">
                RM {formatRM(financialStats.diterimaKeseluruhan)}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            SUB-GROUP 2: PERUNTUKAN DIBELANJAKAN
        ======================================================== */}
        <div className="bg-white rounded-xl border border-amber-200 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-600 text-white flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  PERUNTUKAN DIBELANJAKAN
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Belanja Semasa
              </span>
            </div>

            {/* Sub-cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/40 border border-amber-100 hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS21</span>
                    <span className="text-[10px] text-slate-500">Perjalanan & Sara Hidup</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  RM {formatRM(financialStats.dibelanjaOs21)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/40 border border-amber-100 hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS24</span>
                    <span className="text-[10px] text-slate-500">Sewaan & Penginapan</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  RM {formatRM(financialStats.dibelanjaOs24)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/40 border border-amber-100 hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS27</span>
                    <span className="text-[10px] text-slate-500">Bekalan Bahan & Latihan</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  RM {formatRM(financialStats.dibelanjaOs27)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/40 border border-amber-100 hover:border-amber-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS29</span>
                    <span className="text-[10px] text-slate-500">Perkhidmatan Ikhtisas</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900 tabular-nums">
                  RM {formatRM(financialStats.dibelanjaOs29)}
                </span>
              </div>
            </div>
          </div>

          {/* Highlight Card: Jumlah Dibelanja Keseluruhan */}
          <div className="mt-4 pt-3 border-t border-amber-100">
            <div className="p-3 rounded-lg bg-amber-900 text-white flex items-center justify-between shadow-xs gap-2">
              <div>
                <span className="text-[11px] font-semibold text-amber-200 uppercase tracking-wider block">
                  Jumlah Dibelanja Keseluruhan
                </span>
                <span className="text-[10px] text-amber-300 block">
                  Kadar: {peratusBelanja}% pelaksanaan
                </span>
                <span className="text-[10px] text-amber-200/90 font-medium block mt-0.5">
                  [Tidak termasuk Subwaran = RM {formatRM(financialStats.subwaranKeseluruhan)}]
                </span>
              </div>
              <div className="text-sm font-bold tabular-nums shrink-0 text-right">
                RM {formatRM(financialStats.dibelanjaKeseluruhan)}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================
            SUB-GROUP 3: BAKI PERUNTUKAN
        ======================================================== */}
        <div className="bg-white rounded-xl border border-emerald-300 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-100">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-700 text-white flex items-center justify-center">
                  <PiggyBank className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                  BAKI PERUNTUKAN
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Baki Bersih
              </span>
            </div>

            {/* Sub-cards */}
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Car className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS21</span>
                    <span className="text-[10px] text-slate-500">Perjalanan & Sara Hidup</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-900 tabular-nums">
                  RM {formatRM(financialStats.bakiOs21)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS24</span>
                    <span className="text-[10px] text-slate-500">Sewaan & Penginapan</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-900 tabular-nums">
                  RM {formatRM(financialStats.bakiOs24)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS27</span>
                    <span className="text-[10px] text-slate-500">Bekalan Bahan & Latihan</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-900 tabular-nums">
                  RM {formatRM(financialStats.bakiOs27)}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 hover:border-emerald-200 transition-colors">
                <div className="flex items-center gap-2">
                  <Receipt className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 block">Jumlah OS29</span>
                    <span className="text-[10px] text-slate-500">Perkhidmatan Ikhtisas</span>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-900 tabular-nums">
                  RM {formatRM(financialStats.bakiOs29)}
                </span>
              </div>
            </div>
          </div>

          {/* Highlight Card: Jumlah Baki Keseluruhan */}
          <div className="mt-4 pt-3 border-t border-emerald-100">
            <div className="p-3 rounded-lg bg-emerald-800 text-white flex items-center justify-between shadow-xs gap-2">
              <div>
                <span className="text-[11px] font-semibold text-emerald-200 uppercase tracking-wider block">
                  Jumlah Baki Keseluruhan
                </span>
                <span className="text-[10px] text-emerald-300 block">
                  Diterima tolak Dibelanjakan
                </span>
                <span className="text-[10px] text-emerald-200/90 font-medium block mt-0.5">
                  [Tidak termasuk Subwaran = RM {formatRM(financialStats.subwaranKeseluruhan)}]
                </span>
              </div>
              <div className="text-sm font-bold tabular-nums shrink-0 text-right">
                RM {formatRM(financialStats.bakiKeseluruhan)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
