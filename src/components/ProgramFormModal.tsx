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
import { X, Save, AlertCircle, Calculator, Wallet } from 'lucide-react';

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

  // Bahagian Belanja Sebenar (muncul & wajib bila status = SELESAI)
  const [os21000Belanja, setOs21000Belanja] = useState<number | ''>('');
  const [os24000Belanja, setOs24000Belanja] = useState<number | ''>('');
  const [os27000Belanja, setOs27000Belanja] = useState<number | ''>('');
  const [os29000Belanja, setOs29000Belanja] = useState<number | ''>('');

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
      setOs21000Belanja(programToEdit.os21000Belanja !== undefined ? programToEdit.os21000Belanja : '');
      setOs24000Belanja(programToEdit.os24000Belanja !== undefined ? programToEdit.os24000Belanja : '');
      setOs27000Belanja(programToEdit.os27000Belanja !== undefined ? programToEdit.os27000Belanja : '');
      setOs29000Belanja(programToEdit.os29000Belanja !== undefined ? programToEdit.os29000Belanja : '');
      setStatusProgram(programToEdit.statusProgram);
      setCatatan(programToEdit.catatan || '');
    } else {
      // REQUIREMENT: Kosongkan semua pilihan dan maklumat dalam Borang Pendaftaran Baru
      setNamaProgram('');
      setKodProgram('');
      setJenisProgram('');
      setTarikhMula('');
      setTarikhTamat('');
      setTempat('');
      setNegeri('');
      setBilanganPeserta(0);
      setPengurusId('');
      setPengurusBersamaId('');
      setPusat(isSubAdminLocked && currentUser?.pusat ? currentUser.pusat : '');
      setJabatan(isSubAdminLocked && currentUser?.jabatan ? currentUser.jabatan : '');
      setSumberKewangan('');
      setOs21000(0);
      setOs24000(0);
      setOs27000(0);
      setOs29000(0);
      setOs21000Belanja('');
      setOs24000Belanja('');
      setOs27000Belanja('');
      setOs29000Belanja('');
      setStatusProgram('');
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

  // Calculate days & tempoh safely
  const calculatedDays = useMemo(() => {
    if (!tarikhMula || !tarikhTamat) return 0;
    return calculateDaysBetween(tarikhMula, tarikhTamat);
  }, [tarikhMula, tarikhTamat]);

  const calculatedTempoh = useMemo(() => {
    if (!tarikhMula || !tarikhTamat) return '-';
    return `${formatDateToMY(tarikhMula)} - ${formatDateToMY(tarikhTamat)}`;
  }, [tarikhMula, tarikhTamat]);

  // Requirement: Bila status BATAL, semua nilai OS, Belanja Sebenar dan Penjimatan = 0.00
  const isBatal = statusProgram.trim().toUpperCase() === 'BATAL';

  // Real-time sum of OS (Pecahan OS seperti BK65)
  const calculatedTotalRm = useMemo(() => {
    if (isBatal) return 0;
    return (
      (Number(os21000) || 0) +
      (Number(os24000) || 0) +
      (Number(os27000) || 0) +
      (Number(os29000) || 0)
    );
  }, [os21000, os24000, os27000, os29000, isBatal]);

  // Is program status SELESAI or TANGGUNG?
  const isSelesaiOrTanggung =
    !isBatal && (
      statusProgram.trim().toUpperCase() === 'SELESAI' ||
      statusProgram.trim().toUpperCase() === 'TANGGUNG'
    );

  // Real-time sum of Belanja Sebenar
  const calculatedTotalBelanjaRm = useMemo(() => {
    if (isBatal || !isSelesaiOrTanggung) return 0;
    return (
      (Number(os21000Belanja) || 0) +
      (Number(os24000Belanja) || 0) +
      (Number(os27000Belanja) || 0) +
      (Number(os29000Belanja) || 0)
    );
  }, [os21000Belanja, os24000Belanja, os27000Belanja, os29000Belanja, isBatal, isSelesaiOrTanggung]);

  // Real-time calculations of Penjimatan = Peruntukan - Belanja Sebenar
  const penjimatan21 = useMemo(() => {
    if (isBatal) return 0;
    return Math.max(0, (Number(os21000) || 0) - (Number(os21000Belanja) || 0));
  }, [os21000, os21000Belanja, isBatal]);

  const penjimatan24 = useMemo(() => {
    if (isBatal) return 0;
    return Math.max(0, (Number(os24000) || 0) - (Number(os24000Belanja) || 0));
  }, [os24000, os24000Belanja, isBatal]);

  const penjimatan27 = useMemo(() => {
    if (isBatal) return 0;
    return Math.max(0, (Number(os27000) || 0) - (Number(os27000Belanja) || 0));
  }, [os27000, os27000Belanja, isBatal]);

  const penjimatan29 = useMemo(() => {
    if (isBatal) return 0;
    return Math.max(0, (Number(os29000) || 0) - (Number(os29000Belanja) || 0));
  }, [os29000, os29000Belanja, isBatal]);

  const calculatedTotalPenjimatanRm = useMemo(() => {
    if (isBatal) return 0;
    return penjimatan21 + penjimatan24 + penjimatan27 + penjimatan29;
  }, [penjimatan21, penjimatan24, penjimatan27, penjimatan29, isBatal]);

  if (!isFormOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: Hanya Super Admin boleh edit program berstatus SELESAI dan TANGGUNG
    if (programToEdit) {
      const editStatus = programToEdit.statusProgram.toUpperCase();
      if (
        (editStatus === 'SELESAI' || editStatus === 'TANGGUNG') &&
        currentUser?.role !== 'SUPER_ADMIN'
      ) {
        setErrorMsg(
          'Program berstatus SELESAI dan TANGGUNG telah dikunci dan hanya boleh dikemaskini oleh Super Admin sahaja.'
        );
        return;
      }
    }

    if (!namaProgram.trim()) {
      setErrorMsg('Sila masukkan Nama Program.');
      return;
    }
    if (!kodProgram.trim()) {
      setErrorMsg('Sila masukkan Kod Program.');
      return;
    }
    if (!pusat) {
      setErrorMsg('Sila pilih Pusat.');
      return;
    }
    if (!jabatan) {
      setErrorMsg('Sila pilih Jabatan.');
      return;
    }
    if (!jenisProgram) {
      setErrorMsg('Sila pilih Jenis Program.');
      return;
    }
    if (!pengurusId) {
      setErrorMsg('Sila pilih Pengurus.');
      return;
    }
    if (!tarikhMula || !tarikhTamat) {
      setErrorMsg('Sila pilih Tarikh Mula dan Tarikh Tamat.');
      return;
    }
    if (!tempat.trim()) {
      setErrorMsg('Sila masukkan Tempat / Lokasi Program.');
      return;
    }
    if (!negeri) {
      setErrorMsg('Sila pilih Negeri.');
      return;
    }
    if (!sumberKewangan) {
      setErrorMsg('Sila pilih Sumber Kewangan.');
      return;
    }
    if (!statusProgram) {
      setErrorMsg('Sila pilih Status Program.');
      return;
    }
    if (pengurusBersamaId && pengurusId === pengurusBersamaId) {
      setErrorMsg('Pengurus dan Pengurus Bersama tidak boleh merupakan pegawai yang sama.');
      return;
    }

    // REQUIREMENT: Apabila STATUS PROGRAM = SELESAI atau TANGGUNG dipilih, Bahagian BELANJA SEBENAR dan PENJIMATAN wajib diisi
    if (isSelesaiOrTanggung) {
      if (
        os21000Belanja === '' ||
        os24000Belanja === '' ||
        os27000Belanja === '' ||
        os29000Belanja === ''
      ) {
        setErrorMsg(
          `Status Program adalah ${statusProgram.toUpperCase()}. Bahagian BELANJA SEBENAR dan PENJIMATAN wajib diisi.`
        );
        return;
      }
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
      os21000: isBatal ? 0 : (Number(os21000) || 0),
      os24000: isBatal ? 0 : (Number(os24000) || 0),
      os27000: isBatal ? 0 : (Number(os27000) || 0),
      os29000: isBatal ? 0 : (Number(os29000) || 0),
      jumlahRm: isBatal ? 0 : calculatedTotalRm,
      // BELANJA SEBENAR (Untuk status selain SELESAI dan TANGGUNG by default ialah 0.00, BATAL ialah 0.00)
      os21000Belanja: isBatal ? 0 : (isSelesaiOrTanggung ? Number(os21000Belanja) : 0),
      os24000Belanja: isBatal ? 0 : (isSelesaiOrTanggung ? Number(os24000Belanja) : 0),
      os27000Belanja: isBatal ? 0 : (isSelesaiOrTanggung ? Number(os27000Belanja) : 0),
      os29000Belanja: isBatal ? 0 : (isSelesaiOrTanggung ? Number(os29000Belanja) : 0),
      jumlahBelanjaRm: isBatal ? 0 : (isSelesaiOrTanggung ? calculatedTotalBelanjaRm : 0),
      // PENJIMATAN (Untuk status selain SELESAI dan TANGGUNG by default ialah 0.00, BATAL ialah 0.00)
      os21000Penjimatan: isBatal ? 0 : (isSelesaiOrTanggung ? penjimatan21 : 0),
      os24000Penjimatan: isBatal ? 0 : (isSelesaiOrTanggung ? penjimatan24 : 0),
      os27000Penjimatan: isBatal ? 0 : (isSelesaiOrTanggung ? penjimatan27 : 0),
      os29000Penjimatan: isBatal ? 0 : (isSelesaiOrTanggung ? penjimatan29 : 0),
      jumlahPenjimatanRm: isBatal ? 0 : (isSelesaiOrTanggung ? calculatedTotalPenjimatanRm : 0),
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
              {programToEdit ? 'Kemaskini Maklumat Program' : 'Daftar Program Pusat'}
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
                  <option value="">-- Sila Pilih Pusat --</option>
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
                  <option value="">-- Sila Pilih Jabatan --</option>
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
                  <option value="">-- Sila Pilih Jenis Program --</option>
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
                  value={bilanganPeserta || ''}
                  placeholder="0"
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
                  <option value="">-- Sila Pilih Pengurus --</option>
                  {pegawaiList.map((peg) => (
                    <option key={peg.id} value={peg.id}>
                      {peg.id} - {peg.nama}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Pengurus Bersama (Kecuali {pengurusId || 'Pengurus'})
                </label>
                <select
                  value={pengurusBersamaId}
                  onChange={(e) => setPengurusBersamaId(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                >
                  <option value="">-- Sila Pilih Pengurus Bersama --</option>
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
                  <option value="">-- Sila Pilih Negeri --</option>
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
                  <option value="">-- Sila Pilih Sumber Kewangan --</option>
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
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setStatusProgram(newStatus);
                    if (newStatus.trim().toUpperCase() === 'BATAL') {
                      setOs21000(0);
                      setOs24000(0);
                      setOs27000(0);
                      setOs29000(0);
                      setOs21000Belanja(0);
                      setOs24000Belanja(0);
                      setOs27000Belanja(0);
                      setOs29000Belanja(0);
                    }
                  }}
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900 font-semibold"
                >
                  <option value="">-- Sila Pilih Status Program --</option>
                  {statusProgramList.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 8: Pecahan OS (seperti BK65) */}
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="font-bold text-slate-900 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-slate-700" />
                  <span>Pecahan OS (seperti BK65)</span>
                </span>
                <span className="text-slate-500 text-[11px]">Format: RM</span>
              </div>

              {isBatal && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  Status Program BATAL: Semua pecahan OS, Belanja Sebenar dan Penjimatan ditetapkan kepada RM 0.00 secara automatik.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-600 text-[11px] mb-1">
                    OS21000 (RM) - Perjalanan
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0.00"
                    disabled={isBatal}
                    value={isBatal ? 0 : (os21000 === 0 ? '' : os21000)}
                    onChange={(e) => setOs21000(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full py-2 px-3 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums ${
                      isBatal ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-900'
                    }`}
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
                    placeholder="0.00"
                    disabled={isBatal}
                    value={isBatal ? 0 : (os24000 === 0 ? '' : os24000)}
                    onChange={(e) => setOs24000(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full py-2 px-3 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums ${
                      isBatal ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-900'
                    }`}
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
                    placeholder="0.00"
                    disabled={isBatal}
                    value={isBatal ? 0 : (os27000 === 0 ? '' : os27000)}
                    onChange={(e) => setOs27000(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full py-2 px-3 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums ${
                      isBatal ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-900'
                    }`}
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
                    placeholder="0.00"
                    disabled={isBatal}
                    value={isBatal ? 0 : (os29000 === 0 ? '' : os29000)}
                    onChange={(e) => setOs29000(e.target.value === '' ? 0 : Number(e.target.value))}
                    className={`w-full py-2 px-3 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 tabular-nums ${
                      isBatal ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-slate-900'
                    }`}
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

            {/* REQUIREMENT: 2 BAHAGIAN BAHARU (BELANJA SEBENAR & PENJIMATAN) */}
            {/* By default: HIDE. Apabila STATUS PROGRAM = SELESAI atau TANGGUNG dipilih, muncul & wajib diisi */}
            {isSelesaiOrTanggung && (
              <>
                {/* Bahagian 1: BELANJA SEBENAR */}
                <div className="p-4 bg-emerald-50/60 rounded-lg border-2 border-emerald-300 space-y-3 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-emerald-200">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-emerald-700" />
                      <span className="font-bold text-emerald-950 uppercase tracking-wider text-xs">
                        Bahagian BELANJA SEBENAR *
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-200/80 text-emerald-900 w-fit">
                      Wajib Diisi (Status: {statusProgram.toUpperCase()})
                    </span>
                  </div>

                  <p className="text-[11px] text-emerald-800">
                    Sila masukkan amaun perbelanjaan sebenar bagi setiap Objek Sebagai (OS).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                        OS21000 Belanja Sebenar (RM) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        required
                        placeholder="0.00"
                        value={os21000Belanja}
                        onChange={(e) =>
                          setOs21000Belanja(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className="w-full py-2 px-3 bg-white border border-emerald-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-700 text-slate-900 font-semibold tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                        OS24000 Belanja Sebenar (RM) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        required
                        placeholder="0.00"
                        value={os24000Belanja}
                        onChange={(e) =>
                          setOs24000Belanja(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className="w-full py-2 px-3 bg-white border border-emerald-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-700 text-slate-900 font-semibold tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                        OS27000 Belanja Sebenar (RM) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        required
                        placeholder="0.00"
                        value={os27000Belanja}
                        onChange={(e) =>
                          setOs27000Belanja(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className="w-full py-2 px-3 bg-white border border-emerald-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-700 text-slate-900 font-semibold tabular-nums"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 text-[11px] mb-1">
                        OS29000 Belanja Sebenar (RM) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        required
                        placeholder="0.00"
                        value={os29000Belanja}
                        onChange={(e) =>
                          setOs29000Belanja(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className="w-full py-2 px-3 bg-white border border-emerald-300 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-700 text-slate-900 font-semibold tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Jumlah Belanja Sebenar */}
                  <div className="flex items-center justify-between p-3 bg-emerald-900 text-white rounded-md mt-2">
                    <span className="font-semibold text-xs tracking-wide">
                      JUMLAH BELANJA SEBENAR (RM)
                    </span>
                    <span className="text-base font-bold tabular-nums">
                      RM {formatRM(calculatedTotalBelanjaRm)}
                    </span>
                  </div>
                </div>

                {/* Bahagian 2: PENJIMATAN */}
                <div className="p-4 bg-amber-50/70 rounded-lg border-2 border-amber-300 space-y-3 animate-in fade-in duration-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-amber-200">
                    <div className="flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-amber-700" />
                      <span className="font-bold text-amber-950 uppercase tracking-wider text-xs">
                        Bahagian PENJIMATAN *
                      </span>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 w-fit">
                      Pengiraan Automatik (Peruntukan - Belanja Sebenar)
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-800">
                    Jumlah penjimatan dikira secara automatik berdasarkan perbezaan antara Peruntukan Diterima dan Belanja Sebenar.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-2.5 bg-white rounded-md border border-amber-200">
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">
                        OS21000 Penjimatan (RM)
                      </span>
                      <span className="text-sm font-bold text-slate-900 block mt-1 tabular-nums">
                        RM {formatRM(penjimatan21)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Peruntukan: RM {formatRM(Number(os21000) || 0)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-md border border-amber-200">
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">
                        OS24000 Penjimatan (RM)
                      </span>
                      <span className="text-sm font-bold text-slate-900 block mt-1 tabular-nums">
                        RM {formatRM(penjimatan24)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Peruntukan: RM {formatRM(Number(os24000) || 0)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-md border border-amber-200">
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">
                        OS27000 Penjimatan (RM)
                      </span>
                      <span className="text-sm font-bold text-slate-900 block mt-1 tabular-nums">
                        RM {formatRM(penjimatan27)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Peruntukan: RM {formatRM(Number(os27000) || 0)}
                      </span>
                    </div>

                    <div className="p-2.5 bg-white rounded-md border border-amber-200">
                      <span className="block text-slate-500 text-[10px] uppercase font-semibold">
                        OS29000 Penjimatan (RM)
                      </span>
                      <span className="text-sm font-bold text-slate-900 block mt-1 tabular-nums">
                        RM {formatRM(penjimatan29)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Peruntukan: RM {formatRM(Number(os29000) || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Jumlah Penjimatan */}
                  <div className="flex items-center justify-between p-3 bg-amber-900 text-white rounded-md mt-2">
                    <span className="font-semibold text-xs tracking-wide">
                      JUMLAH PENJIMATAN (RM)
                    </span>
                    <span className="text-base font-bold tabular-nums">
                      RM {formatRM(calculatedTotalPenjimatanRm)}
                    </span>
                  </div>
                </div>
              </>
            )}

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
