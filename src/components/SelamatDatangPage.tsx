import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { getAdminLevelLabel, ProgramItem } from '../types/program';
import { getProgramDedupeKey } from '../utils/programDedupe';
import {
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ClipboardList,
  Edit2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Trash2,
  Upload,
  User,
  X,
  AlertCircle,
} from 'lucide-react';

export const SelamatDatangPage: React.FC = () => {
  const {
    currentUser,
    isSuperAdmin,
    pegawaiList,
    programs,
    jabatanMap,
    getKlusterForPusat,
    updateOwnPhoto,
    updateOwnContactInfo,
    changeOwnPassword,
    viewProgramDetail,
    setActiveTab,
  } = useProgramContext();

  // Real-time Date & Time
  const [now, setNow] = useState<Date>(() => new Date());
  const [showPhotoControls, setShowPhotoControls] = useState(false);
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTarikh = useMemo(() => {
    try {
      return now.toLocaleDateString('ms-MY', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return now.toLocaleDateString('en-GB');
    }
  }, [now]);

  const formattedMasa = useMemo(() => {
    try {
      return now.toLocaleTimeString('ms-MY', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return now.toLocaleTimeString();
    }
  }, [now]);

  // Resolve Pegawai & Organizational Info
  const matchedPegawai = useMemo(() => {
    if (!currentUser) return undefined;
    const uName = (currentUser.name || '').trim().toUpperCase();
    const uId = (currentUser.id || '').trim().toUpperCase();
    return pegawaiList.find(
      (p) =>
        (uName && p.nama?.trim().toUpperCase() === uName) ||
        (uId && p.id?.trim().toUpperCase() === uId)
    );
  }, [currentUser, pegawaiList]);

  const profileInfo = useMemo(() => {
    if (!currentUser) {
      return {
        namaPegawai: '-',
        jawatan: '-',
        jabatan: '-',
        pusat: '-',
        kluster: '-',
        photoUrl: '',
      };
    }

    const rawNama =
      matchedPegawai?.nama ||
      (isSuperAdmin && currentUser.id.toUpperCase() === 'AMAN'
        ? 'SUPER ADMIN AMAN'
        : currentUser.name) ||
      currentUser.id;
    const namaPegawai = rawNama.trim().toUpperCase();

    const jawatan = (
      matchedPegawai?.jawatan ||
      getAdminLevelLabel(currentUser.levelId, currentUser.role)
    )
      .trim()
      .toUpperCase();

    const rawJabatan =
      matchedPegawai?.jabatan ||
      currentUser.jabatan ||
      (currentUser.allowedJabatans && currentUser.allowedJabatans.length > 0
        ? currentUser.allowedJabatans.join(', ')
        : '') ||
      (isSuperAdmin ? 'SEMUA JABATAN' : '');
    const jabatan = (rawJabatan || '-').trim().toUpperCase();

    let rawPusat = matchedPegawai?.pusat || currentUser.pusat || '';
    if (!rawPusat && jabatan && jabatan !== '-' && jabatan !== 'SEMUA JABATAN' && jabatan !== 'TIDAK BERKENAAN') {
      const firstJab = jabatan.split(',')[0].trim();
      for (const [pusName, jabs] of Object.entries(jabatanMap)) {
        if ((jabs || []).some((j) => j.trim().toUpperCase() === firstJab)) {
          rawPusat = pusName;
          break;
        }
      }
    }
    if (!rawPusat && isSuperAdmin) {
      rawPusat = 'SEMUA PUSAT';
    }
    const pusat = (rawPusat || '-').trim().toUpperCase();

    let kluster = '';
    if (pusat && pusat !== '-' && pusat !== 'SEMUA PUSAT' && pusat !== 'TIDAK BERKENAAN') {
      kluster = getKlusterForPusat(pusat);
    } else if (pusat === 'SEMUA PUSAT' || isSuperAdmin) {
      kluster = 'SEMUA KLUSTER IAB';
    }

    const photoUrl = currentUser.photoUrl || matchedPegawai?.photoUrl || '';
    const noHp =
      currentUser.noHp !== undefined ? currentUser.noHp : matchedPegawai?.noHp || '';
    const emel =
      currentUser.emel !== undefined ? currentUser.emel : matchedPegawai?.emel || '';

    return {
      namaPegawai,
      jawatan,
      jabatan,
      pusat,
      kluster: (kluster || '-').trim().toUpperCase(),
      noHp,
      emel,
      photoUrl,
    };
  }, [currentUser, matchedPegawai, isSuperAdmin, jabatanMap, getKlusterForPusat]);

  // Inline Edit Contact Info (No. HP & Emel Rasmi)
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [noHpInput, setNoHpInput] = useState('');
  const [emelInput, setEmelInput] = useState('');
  const [contactStatus, setContactStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const handleStartEditContact = () => {
    setNoHpInput(profileInfo.noHp || '');
    setEmelInput(profileInfo.emel || '');
    setContactStatus(null);
    setIsEditingContact(true);
  };

  const handleSaveContact = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const res = updateOwnContactInfo(noHpInput, emelInput);
    if (res.success) {
      setIsEditingContact(false);
      setContactStatus({
        type: 'success',
        text: 'No. HP dan Emel Rasmi berjaya dikemaskini dan disimpan.',
      });
      setTimeout(() => setContactStatus(null), 4000);
    } else {
      setContactStatus({
        type: 'error',
        text: res.message || 'Gagal mengemaskini maklumat hubungan.',
      });
    }
  };

  // Officer Programs Table Partition (1 role per program: Pengurus OR Pengurus Bersama OR Urus Setia)
  const {
    pengurusPrograms,
    pengurusBersamaPrograms,
    urusSetiaPrograms,
    roleTableRows,
  } = useMemo(() => {
    if (!currentUser) {
      return {
        pengurusPrograms: [] as ProgramItem[],
        pengurusBersamaPrograms: [] as ProgramItem[],
        urusSetiaPrograms: [] as ProgramItem[],
        roleTableRows: [] as Array<{
          bil: number;
          pengurus?: ProgramItem;
          pengurusBersama?: ProgramItem;
          urusSetia?: ProgramItem;
        }>,
      };
    }

    const officerKeys = new Set<string>();
    if (matchedPegawai?.id) officerKeys.add(matchedPegawai.id.trim().toUpperCase());
    if (matchedPegawai?.nama) officerKeys.add(matchedPegawai.nama.trim().toUpperCase());
    if (currentUser.id) officerKeys.add(currentUser.id.trim().toUpperCase());
    if (currentUser.name) officerKeys.add(currentUser.name.trim().toUpperCase());

    const matchesOfficer = (idVal?: string, namaVal?: string) => {
      const idNorm = (idVal || '').trim().toUpperCase();
      const namaNorm = (namaVal || '').trim().toUpperCase();
      return (idNorm && officerKeys.has(idNorm)) || (namaNorm && officerKeys.has(namaNorm));
    };

    const pengurusList: ProgramItem[] = [];
    const bersamaList: ProgramItem[] = [];
    const urusSetiaList: ProgramItem[] = [];
    const seenProgramKeys = new Set<string>();

    programs.forEach((prog) => {
      if (!prog) return;
      const dedupeKey = getProgramDedupeKey(prog);
      if (seenProgramKeys.has(dedupeKey)) return;
      if (matchesOfficer(prog.pengurusId, prog.pengurusNama)) {
        seenProgramKeys.add(dedupeKey);
        pengurusList.push(prog);
      } else if (matchesOfficer(prog.pengurusBersamaId, prog.pengurusBersamaNama)) {
        seenProgramKeys.add(dedupeKey);
        bersamaList.push(prog);
      } else if (matchesOfficer(prog.urusSetiaId, prog.urusSetiaNama)) {
        seenProgramKeys.add(dedupeKey);
        urusSetiaList.push(prog);
      }
    });

    const maxLen = Math.max(pengurusList.length, bersamaList.length, urusSetiaList.length);
    const rows = Array.from({ length: maxLen }, (_, idx) => ({
      bil: idx + 1,
      pengurus: pengurusList[idx],
      pengurusBersama: bersamaList[idx],
      urusSetia: urusSetiaList[idx],
    }));

    return {
      pengurusPrograms: pengurusList,
      pengurusBersamaPrograms: bersamaList,
      urusSetiaPrograms: urusSetiaList,
      roleTableRows: rows,
    };
  }, [currentUser, matchedPegawai, programs]);

  // Passport Photo Upload & Client-side Compression (350x450 JPEG)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoStatus, setPhotoStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoStatus({
        type: 'error',
        text: 'Format fail tidak sah. Sila pilih fail gambar (JPG, PNG atau WEBP).',
      });
      return;
    }

    setIsUploadingPhoto(true);
    setPhotoStatus(null);

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        try {
          // Standard passport proportion 35:45 => 350x450px
          const targetW = 350;
          const targetH = 450;
          const canvas = document.createElement('canvas');
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            setIsUploadingPhoto(false);
            setPhotoStatus({ type: 'error', text: 'Gagal memproses imej pasport.' });
            return;
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, targetW, targetH);

          // Center-crop to fill 350x450 cleanly
          const srcRatio = img.width / img.height;
          const dstRatio = targetW / targetH;
          let sx = 0;
          let sy = 0;
          let sw = img.width;
          let sh = img.height;

          if (srcRatio > dstRatio) {
            sw = img.height * dstRatio;
            sx = (img.width - sw) / 2;
          } else {
            sh = img.width / dstRatio;
            sy = (img.height - sh) / 2;
          }

          ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.84);

          const res = updateOwnPhoto(compressedDataUrl);
          setIsUploadingPhoto(false);
          if (res.success) {
            setPhotoStatus({
              type: 'success',
              text: 'Gambar pasport berjaya dimuat naik dan disimpan ke profil anda.',
            });
            setTimeout(() => setPhotoStatus(null), 4000);
          } else {
            setPhotoStatus({
              type: 'error',
              text: res.message || 'Gagal menyimpan gambar pasport.',
            });
          }
        } catch {
          setIsUploadingPhoto(false);
          setPhotoStatus({ type: 'error', text: 'Ralat semasa memampatkan imej.' });
        }
      };
      img.onerror = () => {
        setIsUploadingPhoto(false);
        setPhotoStatus({ type: 'error', text: 'Fail imej tidak dapat dibaca.' });
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      setIsUploadingPhoto(false);
      setPhotoStatus({ type: 'error', text: 'Ralat membaca fail gambar.' });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    const res = updateOwnPhoto('');
    if (res.success) {
      setPhotoStatus({
        type: 'success',
        text: 'Gambar pasport telah dipadamkan daripada profil.',
      });
      setTimeout(() => setPhotoStatus(null), 3500);
    }
  };

  // Change Password Modal State
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const openPasswordModal = () => {
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setPassMsg(null);
    setShowCurrentPass(false);
    setShowNewPass(false);
    setIsPassModalOpen(true);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (!currentPass.trim()) {
      setPassMsg({ type: 'error', text: 'Sila masukkan kata laluan semasa anda.' });
      return;
    }
    if (!newPass.trim() || newPass.trim().length < 3) {
      setPassMsg({
        type: 'error',
        text: 'Kata laluan baharu mestilah sekurang-kurangnya 3 aksara.',
      });
      return;
    }
    if (newPass !== confirmPass) {
      setPassMsg({
        type: 'error',
        text: 'Kata laluan baharu dan pengesahan tidak sepadan.',
      });
      return;
    }

    const res = await changeOwnPassword(currentPass, newPass);
    if (res.success) {
      setPassMsg({
        type: 'success',
        text: 'Kata laluan anda berjaya dikemaskini dan disimpan.',
      });
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
      setTimeout(() => {
        setIsPassModalOpen(false);
        setPassMsg(null);
      }, 1600);
    } else {
      setPassMsg({
        type: 'error',
        text: res.message || 'Gagal menukar kata laluan. Sila semak kata laluan semasa.',
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto my-8 bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
        <h2 className="text-lg font-bold text-slate-900">Sesi Tidak Aktif</h2>
        <p className="text-xs text-slate-600 mt-2">
          Sila log masuk terlebih dahulu untuk mengakses halaman Selamat Datang profil anda.
        </p>
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
        >
          <KeyRound className="w-4 h-4" />
          <span>Log Masuk Akaun</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Main Corporate Card matching attached format */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Top Subtle Institutional Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-slate-900 via-blue-900 to-emerald-700" />

        <div className="px-6 py-8 sm:px-12 sm:py-10">
          {/* 1. Centered Heading: SELAMAT DATANG */}
          <div className="text-center pb-6 border-b border-slate-100">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-wide text-slate-900 uppercase">
              SELAMAT DATANG
            </h2>
          </div>

          {/* 2. Centered Passport Photo Frame */}
          <div className="mt-8 flex flex-col items-center">
            <div className="relative group">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                title="Klik untuk muat naik atau tukar gambar pasport"
                className="relative w-36 h-46 sm:w-40 sm:h-52 rounded-lg border border-slate-300 bg-slate-50 overflow-hidden shadow-xs hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 transition-colors flex flex-col items-center justify-center cursor-pointer"
              >
                {profileInfo.photoUrl ? (
                  <>
                    <img
                      src={profileInfo.photoUrl}
                      alt={`Gambar Pasport ${profileInfo.namaPegawai}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-slate-900/75 text-white text-[11px] font-semibold py-1.5 px-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>Tukar Foto</span>
                    </span>
                  </>
                ) : (
                  <div className="px-3 text-center flex flex-col items-center justify-center gap-2 text-slate-500">
                    <div className="w-12 h-12 rounded-full bg-slate-200/80 text-slate-500 flex items-center justify-center">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="block text-xs font-bold text-slate-700">
                        Gambar Passport
                      </span>
                      <span className="block text-[11px] text-slate-500 mt-1 leading-snug">
                        (Muat naik foto anda di sini)
                      </span>
                    </div>
                  </div>
                )}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/*"
                onChange={handlePhotoFileChange}
                className="sr-only"
              />
            </div>

            {/* Subtle Upload / Remove Photo Controls (Hidden by default) */}
            <div className="mt-2.5 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPhotoControls((prev) => !prev)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>{showPhotoControls ? 'Sembunyi Pilihan Foto' : 'Kemaskini Foto'}</span>
              </button>

              {showPhotoControls && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isUploadingPhoto
                        ? 'Memproses...'
                        : profileInfo.photoUrl
                        ? 'Tukar Gambar Pasport'
                        : 'Muat Naik Gambar Pasport'}
                    </span>
                  </button>

                  {profileInfo.photoUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Padam Foto</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {photoStatus && (
              <div
                className={`mt-3 px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 border ${
                  photoStatus.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {photoStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{photoStatus.text}</span>
              </div>
            )}
          </div>

          {/* 3. Structured Profile Information (with NO. HP & EMEL RASMI editable after KLUSTER) */}
          <div className="mt-8 border-t border-b border-slate-200 divide-y divide-slate-100">
            {[
              { label: 'NAMA PEGAWAI', value: profileInfo.namaPegawai },
              { label: 'JAWATAN', value: profileInfo.jawatan },
              { label: 'JABATAN', value: profileInfo.jabatan },
              { label: 'PUSAT', value: profileInfo.pusat },
              { label: 'KLUSTER', value: profileInfo.kluster },
            ].map((row) => (
              <div
                key={row.label}
                className="py-3.5 px-2 sm:px-4 grid grid-cols-1 sm:grid-cols-[180px_16px_1fr] gap-1 sm:gap-2 items-baseline text-sm"
              >
                <span className="font-bold text-slate-700 tracking-wide uppercase text-xs sm:text-sm">
                  {row.label}
                </span>
                <span className="hidden sm:inline font-bold text-slate-400">:</span>
                <span className="font-bold text-slate-900 tracking-tight break-words">
                  {row.value}
                </span>
              </div>
            ))}

            {/* NO. HP (Editable) */}
            <div className="py-3.5 px-2 sm:px-4 grid grid-cols-1 sm:grid-cols-[180px_16px_1fr] gap-1 sm:gap-2 items-center text-sm">
              <span className="font-bold text-slate-700 tracking-wide uppercase text-xs sm:text-sm">
                NO. HP
              </span>
              <span className="hidden sm:inline font-bold text-slate-400">:</span>
              {isEditingContact ? (
                <input
                  type="tel"
                  value={noHpInput}
                  onChange={(e) => setNoHpInput(e.target.value)}
                  placeholder="cth: 012-3456789"
                  maxLength={50}
                  className="w-full max-w-sm px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 tracking-tight break-words tabular-nums">
                    {profileInfo.noHp || '-'}
                  </span>
                  <button
                    type="button"
                    onClick={handleStartEditContact}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
                    title="Kemaskini No. HP dan Emel Rasmi"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Kemaskini</span>
                  </button>
                </div>
              )}
            </div>

            {/* EMEL RASMI (Editable) */}
            <div className="py-3.5 px-2 sm:px-4 grid grid-cols-1 sm:grid-cols-[180px_16px_1fr] gap-1 sm:gap-2 items-center text-sm">
              <span className="font-bold text-slate-700 tracking-wide uppercase text-xs sm:text-sm">
                EMEL RASMI
              </span>
              <span className="hidden sm:inline font-bold text-slate-400">:</span>
              {isEditingContact ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <input
                    type="email"
                    value={emelInput}
                    onChange={(e) => setEmelInput(e.target.value)}
                    placeholder="cth: nama@iab.moe.edu.my"
                    maxLength={200}
                    className="w-full max-w-sm px-3 py-1.5 text-xs sm:text-sm font-semibold lowercase text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleSaveContact()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Simpan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingContact(false);
                        setContactStatus(null);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Batal</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-bold text-slate-900 tracking-tight break-all lowercase">
                    {profileInfo.emel || '-'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {contactStatus && (
            <div
              className={`mt-3 px-4 py-2 rounded-lg text-xs font-medium flex items-center gap-2 border ${
                contactStatus.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {contactStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{contactStatus.text}</span>
            </div>
          )}

          {/* 3B. Senarai Program Pegawai (Pengurus Program | Pengurus Bersama | Urus Setia) — BEFORE Date & Time */}
          <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-700" />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
                    Senarai Tugasan Program Pegawai
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Klik pada nama program untuk melihat perincian maklumat program.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-600 tabular-nums">
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">
                  Pengurus: <strong className="text-slate-900">{pengurusPrograms.length}</strong>
                </span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">
                  Pengurus Bersama: <strong className="text-slate-900">{pengurusBersamaPrograms.length}</strong>
                </span>
                <span className="px-2 py-0.5 bg-white border border-slate-200 rounded">
                  Urus Setia: <strong className="text-slate-900">{urusSetiaPrograms.length}</strong>
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-white uppercase tracking-wider text-[11px]">
                    <th className="py-2.5 px-3 w-14 text-center border-r border-slate-700">Bil.</th>
                    <th className="py-2.5 px-3.5 min-w-[200px] border-r border-slate-700">
                      Pengurus Program
                    </th>
                    <th className="py-2.5 px-3.5 min-w-[200px] border-r border-slate-700">
                      Pengurus Bersama
                    </th>
                    <th className="py-2.5 px-3.5 min-w-[200px]">Urus Setia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {roleTableRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 px-4 text-center text-slate-500 text-xs">
                        Tiada rekod program yang melibatkan anda sebagai Pengurus Program, Pengurus Bersama, atau Urus Setia buat masa ini.
                      </td>
                    </tr>
                  ) : (
                    roleTableRows.map((row) => (
                      <tr key={row.bil} className="hover:bg-slate-50/70 align-top">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700 border-r border-slate-200 tabular-nums">
                          {row.bil}.
                        </td>
                        <td className="py-2.5 px-3.5 border-r border-slate-200">
                          {row.pengurus ? (
                            <button
                              type="button"
                              onClick={() => viewProgramDetail(row.pengurus!)}
                              title={`Klik untuk lihat perincian: ${row.pengurus.namaProgram}`}
                              className="text-left font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors cursor-pointer uppercase leading-snug"
                            >
                              {row.pengurus.namaProgram}
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5 border-r border-slate-200">
                          {row.pengurusBersama ? (
                            <button
                              type="button"
                              onClick={() => viewProgramDetail(row.pengurusBersama!)}
                              title={`Klik untuk lihat perincian: ${row.pengurusBersama.namaProgram}`}
                              className="text-left font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors cursor-pointer uppercase leading-snug"
                            >
                              {row.pengurusBersama.namaProgram}
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3.5">
                          {row.urusSetia ? (
                            <button
                              type="button"
                              onClick={() => viewProgramDetail(row.urusSetia!)}
                              title={`Klik untuk lihat perincian: ${row.urusSetia.namaProgram}`}
                              className="text-left font-semibold text-blue-700 hover:text-blue-900 hover:underline transition-colors cursor-pointer uppercase leading-snug"
                            >
                              {row.urusSetia.namaProgram}
                            </button>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Tarikh & Masa Row */}
          <div className="mt-7 pt-2 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-16 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Tarikh:</span>
              <span className="font-semibold text-slate-900 tabular-nums">{formattedTarikh}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">Masa:</span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {formattedMasa}
              </span>
            </div>
          </div>

          {/* 5. Bottom Action Row: Tukar Password & Teruskan ke Dashboard */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={openPasswordModal}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <KeyRound className="w-4 h-4 text-slate-700" />
              <span>Tukar Password</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-xs sm:text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Masuk ke Dashboard Program</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Tukar Password */}
      {isPassModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsPassModalOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-amber-400" />
                <div>
                  <h3 className="text-sm font-bold">Tukar Kata Laluan</h3>
                  <p className="text-[11px] text-slate-300">ID Pengguna: {currentUser.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPassModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              {passMsg && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                    passMsg.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {passMsg.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{passMsg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Laluan Semasa
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    required
                    autoFocus
                    value={currentPass}
                    onChange={(e) => setCurrentPass(e.target.value)}
                    placeholder="Masukkan kata laluan semasa"
                    className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label="Tunjuk atau sembunyi kata laluan semasa"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kata Laluan Baharu
                </label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Minimum 3 aksara"
                    className="w-full pl-3 pr-10 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass((prev) => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                    aria-label="Tunjuk atau sembunyi kata laluan baharu"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Sahkan Kata Laluan Baharu
                </label>
                <input
                  type={showNewPass ? 'text' : 'password'}
                  required
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Taip semula kata laluan baharu"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 text-slate-900"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPassModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Simpan Kata Laluan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
