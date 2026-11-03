import React, { useState } from 'react';
import { useProgramContext } from '../context/ProgramContext';
import { AdminLogin } from './AdminLogin';
import { FilterBar } from './FilterBar';
import { getStatusConfig } from '../utils/formatters';
import { Pegawai, ProgramItem } from '../types/program';
import {
  ShieldCheck,
  UserCheck,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Users,
  Building,
  Briefcase,
  Wallet,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Settings,
  Lock,
  Mail,
  Phone,
  User,
  X,
  Sparkles,
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const {
    currentUser,
    logout,
    filteredPrograms,
    programs,
    setIsFormOpen,
    setProgramToEdit,
    deleteProgram,
    adminUsers,
    createAdminUser,
    deleteAdminUser,
    pusatList,
    jabatanMap,
    pegawaiList,
    sumberKewanganList,
    statusProgramList,
    addPegawai,
    updatePegawai,
    deletePegawai,
    addPusat,
    updatePusat,
    deletePusat,
    addJabatan,
    updateJabatan,
    deleteJabatan,
    addSumberKewangan,
    updateSumberKewangan,
    deleteSumberKewangan,
    addStatusProgram,
    updateStatusProgram,
    deleteStatusProgram,
  } = useProgramContext();

  // Active sub-tab inside Admin portal
  const [adminTab, setAdminTab] = useState<'programs' | 'users' | 'master'>('programs');

  // Master Data active subcategory
  const [masterCategory, setMasterCategory] = useState<
    'pegawai' | 'pusat' | 'jabatan' | 'sumber' | 'status'
  >('pegawai');

  // Form states for creating new admin user
  const [selectedPegawaiIdForAdmin, setSelectedPegawaiIdForAdmin] = useState('');
  const [newAdminId, setNewAdminId] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPusat, setNewAdminPusat] = useState('');
  const [newAdminJabatan, setNewAdminJabatan] = useState('');
  const [userActionMsg, setUserActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form states for Master Data: Pegawai (6 fields requirement)
  // 1. NAMA PEGAWAI, 2. PUSAT, 3. JABATAN, 4. JAWATAN, 5. EMEL, 6. NO. HP:
  const [isPegawaiFormOpen, setIsPegawaiFormOpen] = useState(false);
  const [editingPegawaiId, setEditingPegawaiId] = useState<string | null>(null);
  const [pegawaiFormNama, setPegawaiFormNama] = useState('');
  const [pegawaiFormPusat, setPegawaiFormPusat] = useState(pusatList[0] || '');
  const [pegawaiFormJabatan, setPegawaiFormJabatan] = useState(
    (jabatanMap[pusatList[0]] && jabatanMap[pusatList[0]][0]) || ''
  );
  const [pegawaiFormJawatan, setPegawaiFormJawatan] = useState('');
  const [pegawaiFormEmel, setPegawaiFormEmel] = useState('');
  const [pegawaiFormNoHp, setPegawaiFormNoHp] = useState('');

  // Form states for Pusat, Jabatan, Sumber, Status
  const [pusatInput, setPusatInput] = useState('');
  const [editingPusat, setEditingPusat] = useState<string | null>(null);

  const [selectedPusatForJabatan, setSelectedPusatForJabatan] = useState(pusatList[0] || '');
  const [jabatanInput, setJabatanInput] = useState('');
  const [editingJabatan, setEditingJabatan] = useState<string | null>(null);

  const [sumberInput, setSumberInput] = useState('');
  const [editingSumber, setEditingSumber] = useState<string | null>(null);

  const [statusInput, setStatusInput] = useState('');
  const [editingStatus, setEditingStatus] = useState<string | null>(null);

  // If not logged in, render the login page
  if (!currentUser) {
    return <AdminLogin />;
  }

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  // REQUIREMENT 1:
  // "Untuk paparan admin jabatan, apabila mana-mana admin log in sahaja, hanya dipaparkan program di bawah jabatan mereka sahaja (filtered)."
  const adminProgramList = isSuperAdmin
    ? filteredPrograms
    : filteredPrograms.filter((p) => p.jabatan === currentUser.jabatan);

  const totalProgramsForUser = isSuperAdmin
    ? programs.length
    : programs.filter((p) => p.jabatan === currentUser.jabatan).length;

  // Handling Program Edit
  const handleEditProgram = (prog: ProgramItem) => {
    if (!isSuperAdmin && currentUser.jabatan && prog.jabatan !== currentUser.jabatan) {
      alert(`Akses Ditolak: Anda hanya boleh mengemaskini program di bawah ${currentUser.jabatan}`);
      return;
    }
    setProgramToEdit(prog);
    setIsFormOpen(true);
  };

  // Handling Program Delete (Super Admin only)
  const handleDeleteProgram = (prog: ProgramItem) => {
    if (!isSuperAdmin) {
      alert('Akses Ditolak: Hanya Super Admin dibenarkan memadam program.');
      return;
    }
    if (window.confirm(`Adakah anda pasti ingin memadamkan program "${prog.namaProgram}"?`)) {
      const res = deleteProgram(prog.id);
      if (!res.success) {
        alert(res.message);
      }
    }
  };

  // REQUIREMENT 4:
  // When Super Admin selects Pegawai from Dropdown in "Daftar ID Admin Jabatan Baru",
  // autofill and disable Pusat Ditugaskan and Jabatan Diberi Akses
  const handleSelectPegawaiForAdmin = (pegId: string) => {
    setSelectedPegawaiIdForAdmin(pegId);
    setUserActionMsg(null);

    const peg = pegawaiList.find((p) => p.id === pegId);
    if (peg) {
      setNewAdminName(peg.nama);
      setNewAdminPusat(peg.pusat || pusatList[0] || '');
      setNewAdminJabatan(
        peg.jabatan || (jabatanMap[peg.pusat || pusatList[0]] && jabatanMap[peg.pusat || pusatList[0]][0]) || ''
      );

      // Auto-suggest login ID if blank
      if (!newAdminId) {
        const cleanName = peg.nama.replace(/^(DR\.|ENCIK|PUAN|CIK|HAJI|HAJAH)\s+/i, '');
        const initials = cleanName
          .split(' ')
          .filter(Boolean)
          .slice(0, 2)
          .join('_')
          .toUpperCase();
        setNewAdminId(`ADMIN_${initials}`);
      }
    } else {
      setNewAdminName('');
      setNewAdminPusat('');
      setNewAdminJabatan('');
    }
  };

  // Handle Add Admin User submit
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserActionMsg(null);

    if (!newAdminName) {
      setUserActionMsg({
        type: 'error',
        text: 'Sila pilih Nama Penuh Pegawai Admin daripada senarai drop down.',
      });
      return;
    }

    if (!newAdminId.trim() || !newAdminPassword.trim()) {
      setUserActionMsg({ type: 'error', text: 'Sila masukkan ID Pengguna dan Kata Laluan admin.' });
      return;
    }

    if (!newAdminJabatan) {
      setUserActionMsg({
        type: 'error',
        text: 'Pegawai yang dipilih belum mempunyai Jabatan dalam data induk. Sila kemaskini profil pegawai terlebih dahulu.',
      });
      return;
    }

    const res = createAdminUser({
      id: newAdminId.trim().toUpperCase(),
      password: newAdminPassword.trim(),
      name: newAdminName.trim(),
      role: 'ADMIN',
      pusat: newAdminPusat,
      jabatan: newAdminJabatan,
    });

    if (res.success) {
      setUserActionMsg({
        type: 'success',
        text: `ID Admin "${newAdminId.toUpperCase()}" untuk pegawai "${newAdminName}" di bawah Jabatan "${newAdminJabatan}" berjaya didaftarkan!`,
      });
      setSelectedPegawaiIdForAdmin('');
      setNewAdminId('');
      setNewAdminPassword('');
      setNewAdminName('');
      setNewAdminPusat('');
      setNewAdminJabatan('');
    } else {
      setUserActionMsg({ type: 'error', text: res.message || 'Gagal mendaftar admin.' });
    }
  };

  // REQUIREMENT 3:
  // Open Pegawai modal / form with 6 fields
  const handleOpenAddPegawai = () => {
    setEditingPegawaiId(null);
    setPegawaiFormNama('');
    const p = pusatList[0] || '';
    setPegawaiFormPusat(p);
    setPegawaiFormJabatan((jabatanMap[p] && jabatanMap[p][0]) || '');
    setPegawaiFormJawatan('');
    setPegawaiFormEmel('');
    setPegawaiFormNoHp('');
    setIsPegawaiFormOpen(true);
  };

  const handleEditPegawai = (peg: Pegawai) => {
    setEditingPegawaiId(peg.id);
    setPegawaiFormNama(peg.nama);
    const p = peg.pusat || pusatList[0] || '';
    setPegawaiFormPusat(p);
    setPegawaiFormJabatan(peg.jabatan || (jabatanMap[p] && jabatanMap[p][0]) || '');
    setPegawaiFormJawatan(peg.jawatan || '');
    setPegawaiFormEmel(peg.emel || '');
    setPegawaiFormNoHp(peg.noHp || '');
    setIsPegawaiFormOpen(true);
  };

  const handlePusatChangeInPegawaiForm = (newPusat: string) => {
    setPegawaiFormPusat(newPusat);
    const avail = jabatanMap[newPusat] || [];
    if (avail.length > 0) {
      setPegawaiFormJabatan(avail[0]);
    } else {
      setPegawaiFormJabatan('');
    }
  };

  const handleSavePegawai = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pegawaiFormNama.trim()) return;

    const payload = {
      nama: pegawaiFormNama.trim().toUpperCase(),
      pusat: pegawaiFormPusat,
      jabatan: pegawaiFormJabatan,
      jawatan: pegawaiFormJawatan.trim(),
      emel: pegawaiFormEmel.trim().toLowerCase(),
      noHp: pegawaiFormNoHp.trim(),
    };

    if (editingPegawaiId) {
      updatePegawai(editingPegawaiId, payload);
    } else {
      const id = `Pegawai ${pegawaiList.length + 1}`;
      addPegawai({
        id,
        ...payload,
        label: `${id} (${payload.nama})`,
      });
    }

    setIsPegawaiFormOpen(false);
    setEditingPegawaiId(null);
  };

  return (
    <div className="space-y-6">
      {/* Admin Session Header Bar */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Portal Kawalan Pentadbir
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                  isSuperAdmin ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                }`}
              >
                {isSuperAdmin ? 'Super Admin (Kuasa Penuh)' : 'Admin Jabatan'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              {currentUser.name} ({currentUser.id})
            </h2>
            {!isSuperAdmin && currentUser.jabatan && (
              <p className="text-xs text-blue-200 mt-0.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>
                  Paparan Khusus Jabatan: <strong>{currentUser.jabatan}</strong>
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setProgramToEdit(null);
              setIsFormOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-900 bg-white rounded-md hover:bg-slate-100 transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Program Baru</span>
          </button>

          <button
            onClick={logout}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-md hover:bg-rose-900/60 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Keluar</span>
          </button>
        </div>
      </div>

      {/* Main Admin Tab Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setAdminTab('programs')}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
            adminTab === 'programs'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Senarai Ringkas Program</span>
          <span className="text-[11px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-bold ml-1">
            {adminProgramList.length}
          </span>
        </button>

        {isSuperAdmin && (
          <>
            <button
              onClick={() => setAdminTab('users')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                adminTab === 'users'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Pengurusan ID Admin ({adminUsers.length})</span>
            </button>

            <button
              onClick={() => setAdminTab('master')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                adminTab === 'master'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Pengurusan Data Induk (Master Data)</span>
            </button>
          </>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* TAB 1: SENARAI RINGKAS PROGRAM & PENAPIS (HIDE PUSAT & JABATAN)*/}
      {/* ------------------------------------------------------------- */}
      {adminTab === 'programs' && (
        <div className="space-y-4">
          {/* REQUIREMENT 2:
              "Pada bahagian Penapis Data Program Admin, remove filter: 1. Pusat, 2. Jabatan" */}
          <FilterBar showTahunBulan={true} showStatusFilter={true} hidePusatJabatan={true} />

          {/* Sub-admin notice if applicable */}
          {!isSuperAdmin && currentUser.jabatan && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Log Masuk: <strong>{currentUser.name}</strong> · Hanya memaparkan program di bawah jabatan anda:{' '}
                  <strong>{currentUser.jabatan}</strong> ({adminProgramList.length} rekod).
                </span>
              </div>
            </div>
          )}

          {/* REQUIREMENT 4: Paparkan Senarai Ringkas Program:
              PUSAT | JABATAN | KOD PROGRAM | NAMA PROGRAM | STATUS | TINDAKAN */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {isSuperAdmin
                    ? 'Senarai Ringkas Program Pusat (Keseluruhan)'
                    : `Senarai Ringkas Program: ${currentUser.jabatan}`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isSuperAdmin
                    ? 'Paparan penuh pentadbir dengan fungsi kemaskini dan pemadaman'
                    : 'Paparan automatik bagi program di bawah bidang kuasa jabatan anda'}
                </p>
              </div>

              <div className="text-xs font-semibold text-slate-700 tabular-nums">
                Jumlah: <strong>{adminProgramList.length}</strong> / {totalProgramsForUser} program
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-3 px-4">PUSAT</th>
                    <th className="py-3 px-4">JABATAN</th>
                    <th className="py-3 px-4">KOD PROGRAM</th>
                    <th className="py-3 px-4 min-w-[280px]">NAMA PROGRAM</th>
                    <th className="py-3 px-4 text-center">STATUS</th>
                    <th className="py-3 px-4 text-center">TINDAKAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {adminProgramList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        Tiada program dijumpai di bawah penapis semasa.
                      </td>
                    </tr>
                  ) : (
                    adminProgramList.map((prog) => {
                      const statusCfg = getStatusConfig(prog.statusProgram);
                      const isOwnerDept =
                        isSuperAdmin || (currentUser.jabatan && prog.jabatan === currentUser.jabatan);

                      return (
                        <tr
                          key={prog.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-[11px] text-slate-700 max-w-[200px] truncate" title={prog.pusat}>
                            {prog.pusat}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600 max-w-[220px] truncate" title={prog.jabatan}>
                            {prog.jabatan}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                            {prog.kodProgram}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 uppercase">
                            <span className="line-clamp-2" title={prog.namaProgram}>
                              {prog.namaProgram.toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-500 font-normal block mt-0.5">
                              {prog.tempoh} ({prog.jumlahHari} hari) · {prog.tempat} · Pengurus: {prog.pengurusNama}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <span
                              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded border ${statusCfg.badgeBg}`}
                            >
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Edit or Pencil Button */}
                              {isOwnerDept ? (
                                <button
                                  onClick={() => handleEditProgram(prog)}
                                  title="Kemaskini Program (Pencil)"
                                  className="p-1.5 text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  disabled
                                  title={`Terkunci: Program di bawah ${prog.jabatan}`}
                                  className="p-1.5 text-slate-300 bg-slate-50 rounded cursor-not-allowed"
                                >
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {/* Delete Button: Super Admin SAHAJA */}
                              {isSuperAdmin && (
                                <button
                                  onClick={() => handleDeleteProgram(prog)}
                                  title="Padam Program (Super Admin Sahaja)"
                                  className="p-1.5 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 2: PENGURUSAN ID ADMIN (SUPER ADMIN ONLY)                 */}
      {/* ------------------------------------------------------------- */}
      {adminTab === 'users' && isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* REQUIREMENT 4: Create Sub-Admin Form with Pegawai Dropdown + Autofill */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <UserCheck className="w-4 h-4 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">
                Daftar ID Admin Jabatan Baru
              </h3>
            </div>

            {userActionMsg && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs flex items-center gap-2 ${
                  userActionMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {userActionMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                )}
                <span>{userActionMsg.text}</span>
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              {/* 1. NAMA PENUH PEGAWAI ADMIN (DROPDOWN MENU DARI DATA INDUK) */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Nama Penuh Pegawai Admin (Pilih Pegawai) *
                </label>
                <select
                  required
                  value={selectedPegawaiIdForAdmin}
                  onChange={(e) => handleSelectPegawaiForAdmin(e.target.value)}
                  className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold text-slate-900"
                >
                  <option value="">-- Pilih Pegawai daripada Data Induk --</option>
                  {pegawaiList.map((peg) => (
                    <option key={peg.id} value={peg.id}>
                      {peg.nama} ({peg.jabatan || 'Tiada Jabatan Ditugaskan'})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Pilih pegawai berdaftar. Pusat dan Jabatan akan diisi secara automatik mengikut profil pegawai.
                </p>
              </div>

              {/* 2. ID PENGGUNA ADMIN */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  ID Pengguna Admin (Log Masuk) *
                </label>
                <input
                  type="text"
                  required
                  value={newAdminId}
                  onChange={(e) => setNewAdminId(e.target.value.toUpperCase())}
                  placeholder="CTH: ADMIN_WAN_AZROI"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-mono"
                />
              </div>

              {/* 3. KATA LALUAN */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                  Kata Laluan *
                </label>
                <input
                  type="password"
                  required
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="Masukkan kata laluan"
                  className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              {/* 4. PUSAT DITUGASKAN (AUTOFILL & DISABLE) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                    Pusat Ditugaskan (Autofill) *
                  </label>
                  <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-1.5 py-0.2 rounded">
                    Ditarik dari Pegawai
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={newAdminPusat || 'Sila pilih Pegawai dahulu'}
                  className="w-full py-2 px-3 bg-slate-100 border border-slate-200 rounded-md text-slate-700 font-medium cursor-not-allowed"
                />
              </div>

              {/* 5. JABATAN DIBERI AKSES (AUTOFILL & DISABLE) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                    Jabatan Diberi Akses (Skop Kemaskini - Autofill) *
                  </label>
                  <span className="text-[10px] text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                    Akses Terhad
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value={newAdminJabatan || 'Sila pilih Pegawai dahulu'}
                  className="w-full py-2 px-3 bg-slate-100 border border-slate-200 rounded-md text-slate-900 font-bold cursor-not-allowed"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Data pusat dan jabatan ditarik secara automatik daripada Pengurusan Nama Pegawai dan dikunci bagi memastikan integriti skop tugas.
                </p>
              </div>

              <button
                type="submit"
                disabled={!selectedPegawaiIdForAdmin}
                className="w-full mt-2 py-2 px-4 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                Cipta ID Admin Sekarang
              </button>
            </form>
          </div>

          {/* Admin Accounts Table */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Senarai Akaun Pentadbir Berdaftar
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Super Admin boleh memadam ID admin (Super Admin AMAN tidak boleh dipadam)
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                {adminUsers.length} akaun
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-4">ID PENGGUNA</th>
                    <th className="py-2.5 px-4">NAMA PEGAWAI</th>
                    <th className="py-2.5 px-4">PERANAN</th>
                    <th className="py-2.5 px-4">JABATAN DITUGASKAN</th>
                    <th className="py-2.5 px-4 text-center">TINDAKAN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {adminUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {user.id}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        {user.name}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            user.role === 'SUPER_ADMIN'
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}
                        >
                          {user.role === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMIN JABATAN'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        {user.role === 'SUPER_ADMIN' ? (
                          <span className="text-slate-500 italic">Semua Jabatan (Kuasa Penuh)</span>
                        ) : (
                          <strong className="text-slate-800">{user.jabatan}</strong>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {user.id.toUpperCase() === 'AMAN' ? (
                          <span className="text-[11px] text-slate-400 italic">Kekal</span>
                        ) : (
                          <button
                            onClick={() => {
                              if (window.confirm(`Padam ID Admin "${user.id}"?`)) {
                                deleteAdminUser(user.id);
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Padam akaun admin"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* TAB 3: PENGURUSAN DATA INDUK / MASTER DATA (SUPER ADMIN ONLY) */}
      {/* ------------------------------------------------------------- */}
      {adminTab === 'master' && isSuperAdmin && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          {/* Sub Navigation Bar for Master Data */}
          <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
              Kategori Data Induk:
            </span>

            <button
              onClick={() => setMasterCategory('pegawai')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'pegawai'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              1. Pegawai (Pengurus & Pengurus Bersama)
            </button>

            <button
              onClick={() => setMasterCategory('pusat')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'pusat'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              2. Pusat
            </button>

            <button
              onClick={() => setMasterCategory('jabatan')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'jabatan'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              3. Jabatan
            </button>

            <button
              onClick={() => setMasterCategory('sumber')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'sumber'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              4. Sumber Kewangan
            </button>

            <button
              onClick={() => setMasterCategory('status')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                masterCategory === 'status'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              5. Status Program
            </button>
          </div>

          <div className="p-6">
            {/* SUB-CATEGORY 1: PEGAWAI (6 FIELDS COMPLETE FORM & TABLE) */}
            {masterCategory === 'pegawai' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Pengurusan Profil Pegawai (Pengurus & Pengurus Bersama)
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Mengandungi maklumat lengkap 6 perkara: Nama, Pusat, Jabatan, Jawatan, Emel, dan No. HP.
                    </p>
                  </div>

                  <button
                    onClick={handleOpenAddPegawai}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Tambah Pegawai Baru</span>
                  </button>
                </div>

                {/* REQUIREMENT 3: Form Add / Edit Pegawai with 6 fields */}
                {isPegawaiFormOpen && (
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-300 shadow-sm animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-slate-800" />
                        <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                          {editingPegawaiId ? `Kemaskini Pegawai: ${editingPegawaiId}` : 'Borang Tambah Pegawai Baru'}
                        </h5>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsPegawaiFormOpen(false);
                          setEditingPegawaiId(null);
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <form onSubmit={handleSavePegawai} className="space-y-4 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* 1. NAMA PEGAWAI */}
                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            1. Nama Penuh Pegawai (HURUF BESAR) *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="CTH: DR. AHMAD BIN ISMAIL"
                            value={pegawaiFormNama}
                            onChange={(e) => setPegawaiFormNama(e.target.value.toUpperCase())}
                            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-semibold uppercase"
                          />
                        </div>

                        {/* 4. JAWATAN */}
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            4. Jawatan *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="CTH: Ketua Penolong Pengarah / Pensyarah Cemerlang"
                            value={pegawaiFormJawatan}
                            onChange={(e) => setPegawaiFormJawatan(e.target.value)}
                            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 2. PUSAT */}
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            2. Pusat *
                          </label>
                          <select
                            required
                            value={pegawaiFormPusat}
                            onChange={(e) => handlePusatChangeInPegawaiForm(e.target.value)}
                            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                          >
                            {pusatList.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* 3. JABATAN */}
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            3. Jabatan *
                          </label>
                          <select
                            required
                            value={pegawaiFormJabatan}
                            onChange={(e) => setPegawaiFormJabatan(e.target.value)}
                            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                          >
                            {(jabatanMap[pegawaiFormPusat] || []).map((j) => (
                              <option key={j} value={j}>
                                {j}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* 5. EMEL */}
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            5. Emel Rasmi *
                          </label>
                          <input
                            type="email"
                            required
                            placeholder="CTH: ahmad.ismail@iab.edu.my"
                            value={pegawaiFormEmel}
                            onChange={(e) => setPegawaiFormEmel(e.target.value)}
                            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium lowercase"
                          />
                        </div>

                        {/* 6. NO. HP: */}
                        <div>
                          <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                            6. No. HP: *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="CTH: 012-3456789"
                            value={pegawaiFormNoHp}
                            onChange={(e) => setPegawaiFormNoHp(e.target.value)}
                            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-medium"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => {
                            setIsPegawaiFormOpen(false);
                            setEditingPegawaiId(null);
                          }}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
                        >
                          {editingPegawaiId ? 'Simpan Kemaskini Pegawai' : 'Daftar Pegawai Baru'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Table of Pegawai showing all 6 fields */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-4 w-28">ID</th>
                        <th className="py-2.5 px-4">NAMA PEGAWAI</th>
                        <th className="py-2.5 px-4">PUSAT & JABATAN</th>
                        <th className="py-2.5 px-4">JAWATAN</th>
                        <th className="py-2.5 px-4">HUBUNGI (EMEL & HP)</th>
                        <th className="py-2.5 px-4 w-32 text-center">TINDAKAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pegawaiList.map((peg) => (
                        <tr key={peg.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                            {peg.id}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-900 uppercase">
                            {peg.nama}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600">
                            <span className="font-semibold text-slate-800 block">
                              {peg.jabatan || 'Belum Ditetapkan'}
                            </span>
                            <span className="text-[10px] text-slate-500 block truncate max-w-[200px]" title={peg.pusat}>
                              {peg.pusat}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-800 font-medium">
                            {peg.jawatan || '-'}
                          </td>
                          <td className="py-3 px-4 text-[11px] text-slate-600">
                            <div className="flex items-center gap-1 text-slate-700">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{peg.emel || '-'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-600 mt-0.5 font-mono">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{peg.noHp || '-'}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleEditPegawai(peg)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Padam pegawai "${peg.nama}"?`)) {
                                    deletePegawai(peg.id);
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                              >
                                Padam
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 2: PUSAT */}
            {masterCategory === 'pusat' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pengurusan Senarai Pusat</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tambah atau edit nama Pusat (cth: PPPT, PKPOP). Perubahan akan dipaparkan dalam semua filter dan pendaftaran program.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!pusatInput.trim()) return;
                    if (editingPusat) {
                      updatePusat(editingPusat, pusatInput.trim());
                      setEditingPusat(null);
                    } else {
                      addPusat(pusatInput.trim());
                    }
                    setPusatInput('');
                  }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-end gap-3 text-xs"
                >
                  <div className="flex-1 w-full">
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Nama Pusat *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CTH: PUSAT PEMBANGUNAN DAN PENGURUSAN TEKNOLOGI"
                      value={pusatInput}
                      onChange={(e) => setPusatInput(e.target.value.toUpperCase())}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {editingPusat ? 'Simpan Pusat' : '+ Tambah Pusat'}
                    </button>
                    {editingPusat && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPusat(null);
                          setPusatInput('');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-4">NAMA PUSAT</th>
                        <th className="py-2.5 px-4 w-44">BILANGAN JABATAN</th>
                        <th className="py-2.5 px-4 w-36 text-center">TINDAKAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {pusatList.map((p) => (
                        <tr key={p} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-bold text-slate-900">{p}</td>
                          <td className="py-3 px-4 text-slate-600 tabular-nums">
                            {(jabatanMap[p] || []).length} jabatan
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingPusat(p);
                                  setPusatInput(p);
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Padam pusat "${p}" dan semua jabatannya?`)) {
                                    deletePusat(p);
                                  }
                                }}
                                className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                              >
                                Padam
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 3: JABATAN */}
            {masterCategory === 'jabatan' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Pengurusan Jabatan (Mengikut Pusat)
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih pusat di bawah untuk menambah atau mengemaskini jabatan yang berkaitan.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Pusat Induk
                    </label>
                    <select
                      value={selectedPusatForJabatan}
                      onChange={(e) => setSelectedPusatForJabatan(e.target.value)}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold text-slate-900"
                    >
                      {pusatList.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!jabatanInput.trim()) return;
                      if (editingJabatan) {
                        updateJabatan(selectedPusatForJabatan, editingJabatan, jabatanInput.trim());
                        setEditingJabatan(null);
                      } else {
                        addJabatan(selectedPusatForJabatan, jabatanInput.trim());
                      }
                      setJabatanInput('');
                    }}
                    className="flex flex-col sm:flex-row items-end gap-3 pt-2"
                  >
                    <div className="flex-1 w-full">
                      <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                        Nama Jabatan Baru / Kemaskini *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="CTH: JABATAN KECERDASAN BUATAN DAN INOVASI DIGITAL"
                        value={jabatanInput}
                        onChange={(e) => setJabatanInput(e.target.value.toUpperCase())}
                        className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                      >
                        {editingJabatan ? 'Simpan Jabatan' : '+ Tambah Jabatan'}
                      </button>
                      {editingJabatan && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingJabatan(null);
                            setJabatanInput('');
                          }}
                          className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-800 border-b border-slate-200">
                    Senarai Jabatan di bawah: <span className="text-slate-950 font-extrabold">{selectedPusatForJabatan}</span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <tbody className="divide-y divide-slate-100">
                      {(jabatanMap[selectedPusatForJabatan] || []).length === 0 ? (
                        <tr>
                          <td className="py-6 text-center text-slate-400">
                            Tiada jabatan di bawah pusat ini lagi. Sila tambah di atas.
                          </td>
                        </tr>
                      ) : (
                        (jabatanMap[selectedPusatForJabatan] || []).map((jab, idx) => (
                          <tr key={jab} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-bold text-slate-400 w-12 text-center">
                              {idx + 1}.
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                              {jab}
                            </td>
                            <td className="py-2.5 px-4 w-36 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    setEditingJabatan(jab);
                                    setJabatanInput(jab);
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => {
                                    if (window.confirm(`Padam jabatan "${jab}"?`)) {
                                      deleteJabatan(selectedPusatForJabatan, jab);
                                    }
                                  }}
                                  className="px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                                >
                                  Padam
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 4: SUMBER KEWANGAN */}
            {masterCategory === 'sumber' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pengurusan Sumber Kewangan</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tambah atau edit nama Sumber Kewangan (cth: IAB – LATIHAN, BSTP, BPG, BPK).
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!sumberInput.trim()) return;
                    if (editingSumber) {
                      updateSumberKewangan(editingSumber, sumberInput.trim());
                      setEditingSumber(null);
                    } else {
                      addSumberKewangan(sumberInput.trim());
                    }
                    setSumberInput('');
                  }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-end gap-3 text-xs"
                >
                  <div className="flex-1 w-full">
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Nama Sumber Kewangan *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CTH: IAB - PENYELIDIKAN"
                      value={sumberInput}
                      onChange={(e) => setSumberInput(e.target.value.toUpperCase())}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {editingSumber ? 'Simpan' : '+ Tambah Sumber'}
                    </button>
                    {editingSumber && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSumber(null);
                          setSumberInput('');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-4">NAMA SUMBER KEWANGAN</th>
                        <th className="py-2.5 px-4 w-36 text-center">TINDAKAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sumberKewanganList.map((sk) => (
                        <tr key={sk} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">{sk}</td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingSumber(sk);
                                  setSumberInput(sk);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Padam sumber "${sk}"?`)) {
                                    deleteSumberKewangan(sk);
                                  }
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                              >
                                Padam
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SUB-CATEGORY 5: STATUS PROGRAM */}
            {masterCategory === 'status' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Pengurusan Status Program</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Urus status rasmi pelaksanaan program (cth: SELESAI, DALAM TINDAKAN, TANGGUNG, BELUM AMBIL TINDAKAN, BATAL).
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!statusInput.trim()) return;
                    if (editingStatus) {
                      updateStatusProgram(editingStatus, statusInput.trim());
                      setEditingStatus(null);
                    } else {
                      addStatusProgram(statusInput.trim());
                    }
                    setStatusInput('');
                  }}
                  className="p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-end gap-3 text-xs"
                >
                  <div className="flex-1 w-full">
                    <label className="block font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-1">
                      Nama Status Program *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="CTH: DALAM PERANCANGAN"
                      value={statusInput}
                      onChange={(e) => setStatusInput(e.target.value.toUpperCase())}
                      className="w-full py-2 px-3 bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-900 uppercase font-medium"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {editingStatus ? 'Simpan' : '+ Tambah Status'}
                    </button>
                    {editingStatus && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStatus(null);
                          setStatusInput('');
                        }}
                        className="px-3 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                    )}
                  </div>
                </form>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                        <th className="py-2.5 px-4">STATUS PROGRAM</th>
                        <th className="py-2.5 px-4 w-36 text-center">TINDAKAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {statusProgramList.map((st) => (
                        <tr key={st} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                              {st}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingStatus(st);
                                  setStatusInput(st);
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Padam status "${st}"?`)) {
                                    deleteStatusProgram(st);
                                  }
                                }}
                                className="px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded cursor-pointer"
                              >
                                Padam
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
