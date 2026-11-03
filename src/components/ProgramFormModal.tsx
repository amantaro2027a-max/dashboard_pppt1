import React, { useState, useEffect, useMemo } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import {
  PUSAT_LIST,
  JABATAN_MAP,
  JENIS_PROGRAM_LIST,
  PEGAWAI_LIST,
  NEGERI_LIST,
  SUMBER_KEWANGAN_LIST,
  STATUS_PROGRAM_LIST,
} from '../data/constants';
import { PusatType, StatusProgram, SumberKewangan } from '../types/program';
import { calculateDaysBetween, formatDateToMY, formatRM } from '../utils/formatters';
import { X, Save, AlertCircle, Calculator } from 'lucide-react';

export const ProgramFormModal: React.FC = () => {
  const {
    isFormOpen,
    setIsFormOpen,
    programToEdit,
    setProgramToEdit,
    addProgram,
    updateProgram,
    currentUser,
    pusatList,
    jabatanMap,
    pegawaiList,
    sumberKewanganList,
    statusProgramList,
  } = useProgramContext();

  const [namaProgram, setNamaProgram] = useState('');
  const [kodProgram, setKodProgram] = useState('');
  const [jenisProgram, setJenisProgram] = useState(JENIS_PROGRAM_LIST[0]);
  const [tarikhMula, setTarikhMula] = useState('2026-06-02');
  const [tarikhTamat, setTarikhTamat] = useState('2026-06-05');
  const [tempat, setTempat] = useState('');
  const [negeri, setNegeri] = useState(NEGERI_LIST[11]); // Selangor
  const [bilanganPeserta, setBilanganPeserta] = useState<number>(30);
  const [pengurusId, setPengurusId] = useState(PEGAWAI_LIST[0].id);
  const [pengurusBersamaId, setPengurusBersamaId] = useState(PEGAWAI_LIST[1].id);
  const [pusat, setPusat] = useState<string>(PUSAT_LIST[0]);
  const [jabatan, setJabatan] = useState('');
  const [sumberKewangan, setSumberKewangan] = useState<string>(SUMBER_KEWANGAN_LIST[0]);
  const [os21000, setOs21000] = useState<number>(10000);
  const [os24000, setOs24000] = useState<number>(10000);
  const [os27000, setOs27000] = useState<number>(10000);
  const [os29000, setOs29000] = useState<number>(10000);
  const [statusProgram, setStatusProgram] = useState<string>('SELESAI');
  const [catatan, setCatatan] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Whether user has restricted Jabatan permissions
  const isSubAdminLocked = currentUser?.role === 'ADMIN' && !!currentUser.jabatan;

  // Prepopulate form when editing or initialize when adding
  useEffect(() => {
    if (!isFormOpen) return;

    if (programToEdit) {
      setNamaProgram(programToEdit.namaProgram);
      setKodProgram(programToEdit.kodProgram);
      setJenisProgram(programToEdit.jenisProgram);
      setTarikhMula(programToEdit.tarikhMula || '2026-06-02');
      setTarikhTamat(programToEdit.tarikhTamat || '2026-06-05');
      setTempat(programToEdit.tempat);
      setNegeri(programToEdit.negeri);
      setBilanganPeserta(programToEdit.bilanganPeserta);
      setPengurusId(programToEdit.pengurusId);
      setPengurusBersamaId(programToEdit.pengurusBersamaId);
      setPusat(programToEdit.pusat);
      setJabatan(programToEdit.jabatan);
      setSumberKewangan(programToEdit.sumberKewangan);
      setOs21000(programToEdit.os21000);
      setOs24000(programToEdit.os24000);
      setOs27000(programToEdit.os27000);
      setOs29000(programToEdit.os29000);
      setStatusProgram(programToEdit.statusProgram);
      setCatatan(programToEdit.catatan || '');
    } else {
      // Default new program values
      const initialPusat = (isSubAdminLocked && currentUser?.pusat) ? currentUser.pusat : (pusatList[0] || PUSAT_LIST[0]);
      const initialJabatanList = jabatanMap[initialPusat] || [];
      const initialJabatan = isSubAdminLocked ? currentUser.jabatan! : (initialJabatanList[0] || '');
      const firstPeg = pegawaiList[0]?.id || 'Pegawai 1';
      const secondPeg = pegawaiList[1]?.id || 'Pegawai 2';

      setNamaProgram('');
      setKodProgram(`PROG-${Math.floor(100 + Math.random() * 900)}`);
      setJenisProgram('Bengkel Kerja');
      setTarikhMula('2026-06-02');
      setTarikhTamat('2026-06-05');
      setTempat('Hotel Tenera Bangi');
      setNegeri('SELANGOR');
      setBilanganPeserta(30);
      setPengurusId(firstPeg);
      setPengurusBersamaId(secondPeg);
      setPusat(initialPusat);
      setJabatan(initialJabatan);
      setSumberKewangan(sumberKewanganList[0] || 'IAB – LATIHAN');
      setOs21000(10000);
      setOs24000(10000);
      setOs27000(10000);
      setOs29000(10000);
      setStatusProgram(statusProgramList[0] || 'SELESAI');
      setCatatan('');
    }
    setErrorMsg('');
  }, [programToEdit, isFormOpen, isSubAdminLocked, currentUser, pusatList, jabatanMap, pegawaiList, sumberKewanganList, statusProgramList]);

  // When Pusat changes, ensure Jabatan matches the available options
  const handlePusatChange = (newPusat: string) => {
    if (isSubAdminLocked) return;
    setPusat(newPusat);
    const available = jabatanMap[newPusat] || [];
    if (available.length > 0) {
      setJabatan(available[0]);
    } else {
      setJabatan('');
    }
  };

  // Dynamic Pengurus Bersama list excluding currently selected Pengurus
  const availablePengurusBersama = useMemo(() => {
    return pegawaiList.filter((p) => p.id !== pengurusId);
  }, [pengurusId, pegawaiList]);

  // When Pengurus changes, if Pengurus Bersama equals it, select next available
  const handlePengurusChange = (newPengurusId: string) => {
    setPengurusId(newPengurusId);
    if (pengurusBersamaId === newPengurusId) {
      const nextPegawai = pegawaiList.find((p) => p.id !== newPengurusId);
      if (nextPegawai) {
        setPengurusBersamaId(nextPegawai.id);
      }
    }
  };

  // Calculate days & tempoh
  const calculatedDays = useMemo(() => {
    return calculateDaysBetween(tarikhMula, tarikhTamat);
  }, [tarikhMula, tarikhTamat]);

  const calculatedTempoh = useMemo(() => {
    return `${formatDateToMY(tarikhMula)} - ${formatDateToMY(tarikhTamat)}`;
  }, [tarikhMula, tarikhTamat]);

  // Real-time sum of OS
  const calculatedTotalRm = useMemo(() => {
    return (
      (Number(os21000) || 0) +
      (Number(os24000) || 0) +
      (Number(os27000) || 0) +
      (Number(os29000) || 0)
    );
  }, [os21000, os24000, os27000, os29000]);

  if (!isFormOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaProgram.trim()) {
      setErrorMsg('Sila masukkan Nama Program.');
      return;
    }
    if (!kodProgram.trim()) {
      setErrorMsg('Sila masukkan Kod Program.');
      return;
    }
    if (!tempat.trim()) {
      setErrorMsg('Sila masukkan Tempat / Lokasi Program.');
      return;
    }
    if (pengurusId === pengurusBersamaId) {
      setErrorMsg('Pengurus dan Pengurus Bersama tidak boleh merupakan pegawai yang sama.');
      return;
    }

    const pengurusObj = pegawaiList.find((p) => p.id === pengurusId);
    const pengurusBersamaObj = pegawaiList.find((p) => p.id === pengurusBersamaId);

    const startDate = new Date(tarikhMula);
    const tahun = !isNaN(startDate.getFullYear()) ? startDate.getFullYear() : 2026;
    const bulan = !isNaN(startDate.getMonth()) ? startDate.getMonth() + 1 : 6;

    const programPayload = {
      namaProgram: namaProgram.trim().toUpperCase(),
      kodProgram: kodProgram.trim().toUpperCase(),
      jenisProgram,
      tarikhMula,
      tarikhTamat,
      tempoh: calculatedTempoh,
      jumlahHari: calculatedDays,
      tempat: tempat.trim(),
      negeri,
      bilanganPeserta: Number(bilanganPeserta) || 0,
      pengurusId,
      pengurusNama: pengurusObj ? pengurusObj.nama : pengurusId,
      pengurusBersamaId,
      pengurusBersamaNama: pengurusBersamaObj ? pengurusBersamaObj.nama : pengurusBersamaId,
      pusat,
      jabatan,
      sumberKewangan,
      os21000: Number(os21000) || 0,
      os24000: Number(os24000) || 0,
      os27000: Number(os27000) || 0,
      os29000: Number(os29000) || 0,
      jumlahRm: calculatedTotalRm,
      statusProgram,
      tahun,
      bulan,
      catatan: catatan.trim(),
    };

    const res = programToEdit
      ? updateProgram(programToEdit.id, programPayload)
      : addProgram(programPayload);

    if (!res.success) {
      setErrorMsg(res.message || 'Gagal menyimpan program.');
      return;
    }

    setIsFormOpen(false);
    setProgramToEdit(null);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-3xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div>
            <span className="text-[11px] font-medium text-slate-300 block uppercase tracking-wider">
              {programToEdit ? 'Kemaskini Rekod' : 'Borang Pendaftaran Baru'}
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">
              {programToEdit ? 'Kemaskini Maklumat Program' : 'Daftar Program Pusat PPPT / PKPOP'}
            </h3>
          </div>
          <button
            onClick={() => {
              setIsFormOpen(false);
              setProgramToEdit(null);
            }}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 max-h-[75vh] overflow-y-auto space-y-5 text-xs">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-md flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Row 1: Nama & Kod */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Nama Program (Auto HURUF BESAR) *
                </label>
                <input
                  type="text"
                  required
                  value={namaProgram}
                  onChange={(e) => setNamaProgram(e.target.value.toUpperCase())}
                  placeholder="CTH: BENGKEL KERJA PEMBUDAYAAN DIGITAL DAN AI"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 font-medium uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Kod Program *
                </label>
                <input
                  type="text"
                  required
                  value={kodProgram}
                  onChange={(e) => setKodProgram(e.target.value.toUpperCase())}
                  placeholder="CTH: BGKL KERJAI005"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 font-mono uppercase"
                />
              </div>
            </div>

            {/* Row 2: Pusat & Jabatan (Cascading) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/80 rounded-lg border border-slate-200">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                    Pusat (Main Tree Selection) *
                  </label>
                  {isSubAdminLocked && (
                    <span className="text-[10px] text-amber-700 font-medium">Dikunci</span>
                  )}
                </div>
                <select
                  value={pusat}
                  disabled={isSubAdminLocked}
                  onChange={(e) => handlePusatChange(e.target.value)}
                  className={`w-full py-2 px-3 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium ${
                    isSubAdminLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
                  }`}
                >
                  {pusatList.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                    Jabatan *
                  </label>
                  {isSubAdminLocked && (
                    <span className="text-[10px] text-blue-700 font-semibold">Tugasan Anda</span>
                  )}
                </div>
                <select
                  value={jabatan}
                  disabled={isSubAdminLocked}
                  onChange={(e) => setJabatan(e.target.value)}
                  className={`w-full py-2 px-3 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium ${
                    isSubAdminLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
                  }`}
                >
                  {(jabatanMap[pusat] || []).map((j) => (
                    <option key={j} value={j}>
                      {j}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Jenis Program & Bilangan Peserta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Jenis Program (22 Jenis Rasmi IAB) *
                </label>
                <select
                  value={jenisProgram}
                  onChange={(e) => setJenisProgram(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                >
                  {JENIS_PROGRAM_LIST.map((jp) => (
                    <option key={jp} value={jp}>
                      {jp}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Bilangan Peserta (Orang) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={bilanganPeserta}
                  onChange={(e) => setBilanganPeserta(Number(e.target.value))}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 tabular-nums"
                />
              </div>
            </div>

            {/* Row 4: Pengurus & Pengurus Bersama (Kecualikan Pengurus) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-slate-50/80 rounded-lg border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Pengurus *
                </label>
                <select
                  value={pengurusId}
                  onChange={(e) => handlePengurusChange(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                >
                  {pegawaiList.map((peg) => (
                    <option key={peg.id} value={peg.id}>
                      {peg.id} - {peg.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Pengurus Bersama (Kecuali {pengurusId}) *
                </label>
                <select
                  value={pengurusBersamaId}
                  onChange={(e) => setPengurusBersamaId(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                >
                  {availablePengurusBersama.map((peg) => (
                    <option key={peg.id} value={peg.id}>
                      {peg.id} - {peg.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 5: Tarikh, Tempoh & Hari */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Tarikh Mula *
                </label>
                <input
                  type="date"
                  required
                  value={tarikhMula}
                  onChange={(e) => setTarikhMula(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Tarikh Tamat *
                </label>
                <input
                  type="date"
                  required
                  value={tarikhTamat}
                  onChange={(e) => setTarikhTamat(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Tempoh (Auto)
                </label>
                <div className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-md text-slate-800 font-semibold tabular-nums">
                  {calculatedTempoh}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Jumlah Hari (Auto)
                </label>
                <div className="py-2 px-3 bg-slate-100 border border-slate-200 rounded-md text-slate-800 font-bold tabular-nums">
                  {calculatedDays} hari
                </div>
              </div>
            </div>

            {/* Row 6: Tempat & Negeri */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Tempat *
                </label>
                <input
                  type="text"
                  required
                  value={tempat}
                  onChange={(e) => setTempat(e.target.value)}
                  placeholder="cth: Hotel Tenera Bangi"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Negeri *
                </label>
                <select
                  value={negeri}
                  onChange={(e) => setNegeri(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                >
                  {NEGERI_LIST.map((neg) => (
                    <option key={neg} value={neg}>
                      {neg}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 7: Sumber Kewangan & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Sumber Kewangan *
                </label>
                <select
                  value={sumberKewangan}
                  onChange={(e) => setSumberKewangan(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                >
                  {sumberKewanganList.map((sk) => (
                    <option key={sk} value={sk}>
                      {sk}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Status Program *
                </label>
                <select
                  value={statusProgram}
                  onChange={(e) => setStatusProgram(e.target.value)}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 font-semibold"
                >
                  {statusProgramList.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 8: Pecahan OS Financial Codes */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-slate-700" />
                  <span>Pecahan Objek Sebagai (OS) & Pengiraan Automatik</span>
                </span>
                <span className="text-slate-500 text-[11px]">Format: RM</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                    OS21000 (RM) - Perjalanan
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={os21000}
                    onChange={(e) => setOs21000(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                    OS24000 (RM) - Sewaan
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={os24000}
                    onChange={(e) => setOs24000(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                    OS27000 (RM) - Bekalan
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={os27000}
                    onChange={(e) => setOs27000(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 tabular-nums"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                    OS29000 (RM) - Perkhidmatan
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={os29000}
                    onChange={(e) => setOs29000(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 tabular-nums"
                  />
                </div>
              </div>

              {/* Real-time calculated total */}
              <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-md mt-2">
                <span className="font-semibold text-xs tracking-wide">
                  JUMLAH KESELURUHAN (RM)
                </span>
                <span className="text-base font-bold tabular-nums">
                  RM {formatRM(calculatedTotalRm)}
                </span>
              </div>
            </div>

            {/* Row 9: Catatan Tambahan */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                Catatan Tambahan (Pilihan)
              </label>
              <textarea
                rows={2}
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Maklumat sokongan atau catatan perbincangan jawatankuasa..."
                className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsFormOpen(false);
                setProgramToEdit(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{programToEdit ? 'Simpan Kemaskini' : 'Daftar Program'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
