import React, { useState } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  RotateCcw,
  ShieldCheck,
  ArrowRight,
  Database,
  Trash2,
  PlusCircle,
  Search,
  Filter,
  Save,
  FileDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  CleanedParticipant,
  cleanRawAlumniDataset,
  downloadRealAlumniTemplateXLSX,
  downloadRealImdiTemplateXLSX,
  exportCleanedParticipantsToXLSX,
  classifySegment,
  DirtyDataProcessingResult,
} from '../utils/dataCleaner';
import { DirtyDataSummary, ProvinceName } from '../types';
import { REGIONS_DATA } from '../data/regionsData';

interface DataUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  participants: CleanedParticipant[];
  onAddParticipant: (newP: CleanedParticipant) => void;
  onDeleteParticipant: (id: string) => void;
  onBulkDelete: (filterParams?: { kabKota?: string; year?: number }) => void;
  onApplyCleanedData: (result: DirtyDataProcessingResult, mode: 'replace' | 'append') => void;
  onResetData: () => void;
  currentSummary: DirtyDataSummary | null;
}

export const DataUploaderModal: React.FC<DataUploaderModalProps> = ({
  isOpen,
  onClose,
  participants,
  onAddParticipant,
  onDeleteParticipant,
  onBulkDelete,
  onApplyCleanedData,
  onResetData,
  currentSummary,
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'add' | 'upload' | 'templates'>('manage');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<DirtyDataProcessingResult | null>(null);
  const [uploadMode, setUploadMode] = useState<'replace' | 'append'>('append');
  const [dragActive, setDragActive] = useState(false);

  // Search & Filter state for 'manage' tab
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKabKota, setFilterKabKota] = useState('Semua');
  const [filterYear, setFilterYear] = useState('Semua');
  const [filterSegment, setFilterSegment] = useState('Semua');

  // Form state for 'add' manual tab
  const [formRegister, setFormRegister] = useState('');
  const [formTheme, setFormTheme] = useState('');
  const [formProvince, setFormProvince] = useState<ProvinceName>('Jawa Timur');
  const [formKabKota, setFormKabKota] = useState('Kota Surabaya');
  const [formYear, setFormYear] = useState<number>(2026);
  const [formAge, setFormAge] = useState<number>(24);
  const [formOccupation, setFormOccupation] = useState('');
  const [formSuccessMessage, setFormSuccessMessage] = useState('');

  if (!isOpen) return null;

  // Filtered participants list for management tab
  const filteredParticipants = participants.filter((p) => {
    if (filterKabKota !== 'Semua' && p.kabKota !== filterKabKota) return false;
    if (filterYear !== 'Semua' && p.year !== Number(filterYear)) return false;
    if (filterSegment !== 'Semua' && p.segment !== filterSegment) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.nomorRegister.toLowerCase().includes(q) ||
        p.themeName.toLowerCase().includes(q) ||
        p.kabKota.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Calculate unique registers in current filtered list
  const uniqueRegistersCount = new Set(participants.map((p) => p.nomorRegister)).size;

  const handleFileUpload = (file: File) => {
    setProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        let parsedRows: any[] = [];

        if (file.name.endsWith('.json')) {
          parsedRows = JSON.parse(data as string);
        } else {
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          parsedRows = XLSX.utils.sheet_to_json(worksheet);
        }

        if (parsedRows.length === 0) {
          alert('Berkas kosong. Mohon unggah berkas yang berisi data.');
          setProcessing(false);
          return;
        }

        const cleanedResult = cleanRawAlumniDataset(parsedRows, file.name);
        setResult(cleanedResult);
      } catch (err: any) {
        alert(`Gagal memproses berkas: ${err.message || 'Format tidak didukung'}`);
      } finally {
        setProcessing(false);
      }
    };

    if (file.name.endsWith('.json') || file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmApply = () => {
    if (result) {
      onApplyCleanedData(result, uploadMode);
      setResult(null);
      setActiveTab('manage');
    }
  };

  // Submit manual participant form
  const handleManualAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRegister.trim() || !formTheme.trim() || !formKabKota) {
      alert('Mohon lengkapi Nomor Register, Tema Pelatihan, dan Kabupaten/Kota.');
      return;
    }

    const detectedSegment = classifySegment(formOccupation, formAge);
    const contactHash = Math.abs(
      formRegister.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0)
    )
      .toString(16)
      .padStart(8, '0');

    const newParticipant: CleanedParticipant = {
      id: `PART_${contactHash.substring(0, 8)}`,
      originalId: `MANUAL_${Date.now()}`,
      nomorRegister: formRegister.trim(),
      themeName: formTheme.trim(),
      kabKota: formKabKota,
      province: formProvince,
      year: formYear,
      age: formAge,
      segment: detectedSegment,
      contactHash,
      uniqueKey: `PARTICIPANT_${contactHash.substring(0, 8)}`,
    };

    onAddParticipant(newParticipant);
    setFormSuccessMessage(`Berhasil menambahkan talenta dengan No. Register: ${formRegister.trim()}`);
    setFormRegister('');
    setFormTheme('');
    setFormOccupation('');

    setTimeout(() => {
      setFormSuccessMessage('');
    }, 3000);
  };

  const availableDistricts = REGIONS_DATA.filter((r) => r.province === formProvince);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl text-white shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center shadow-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Pusat Pengelolaan Data Talenta Digital (Data Management Center)
              </h3>
              <p className="text-xs text-slate-400">
                Tambah, hapus, unggah berkas baru, dan kelola nomor register riil talenta digital daerah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Tab Switcher */}
        <div className="flex items-center border-b border-slate-800 bg-slate-950 px-4 sm:px-6 pt-2 overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('manage')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'manage'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Daftar &amp; Kelola Data ({participants.length} Baris / {uniqueRegistersCount} No. Register)</span>
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'add'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Tambah Data Satuan</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Unggah Berkas Baru (.xlsx / .csv)</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`pb-2.5 px-3.5 text-xs font-bold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template Format Resmi</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: MANAGE DATA (LIST & DELETE) */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* Filter and Search Bar */}
              <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="relative w-full md:w-64">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari No. Register / Tema..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl pl-8 pr-3 py-1.5 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                  {/* Filter Kab/Kota */}
                  <select
                    value={filterKabKota}
                    onChange={(e) => setFilterKabKota(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Semua">Semua Wilayah</option>
                    {REGIONS_DATA.map((r) => (
                      <option key={r.id} value={r.name}>{r.name}</option>
                    ))}
                  </select>

                  {/* Filter Tahun */}
                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Semua">Semua Tahun</option>
                    {[2022, 2023, 2024, 2025, 2026].map((y) => (
                      <option key={y} value={y}>Tahun {y}</option>
                    ))}
                  </select>

                  {/* Filter Segmen */}
                  <select
                    value={filterSegment}
                    onChange={(e) => setFilterSegment(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Semua">Semua Segmen</option>
                    <option value="vokasi">Vokasi / Pelajar</option>
                    <option value="umkm">UMKM / Swasta</option>
                    <option value="asn">ASN / Pejabat</option>
                  </select>

                  {/* Export button */}
                  {participants.length > 0 && (
                    <button
                      onClick={() => exportCleanedParticipantsToXLSX(filteredParticipants)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 transition cursor-pointer"
                      title="Ekspor data terkelola ke file Excel"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Ekspor (.xlsx)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Data Table */}
              {participants.length === 0 ? (
                <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800 space-y-3">
                  <Database className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-300">Belum Ada Data Talenta Terunggah</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Silakan unggah berkas Excel/CSV atau gunakan tab <strong>Tambah Data Satuan</strong> untuk memasukkan data nomor register talenta digital Anda.
                  </p>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      onClick={() => setActiveTab('add')}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Tambah Data Satuan</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Unggah Berkas</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>
                      Menampilkan <strong>{filteredParticipants.length}</strong> dari <strong>{participants.length}</strong> total baris data (
                      <strong className="text-cyan-300">{uniqueRegistersCount} Nomor Register Unik</strong>)
                    </span>
                    {filteredParticipants.length > 0 && (filterKabKota !== 'Semua' || filterYear !== 'Semua' || filterSegment !== 'Semua') && (
                      <button
                        onClick={() => {
                          if (confirm(`Yakin ingin menghapus ${filteredParticipants.length} data yang sedang terfilter?`)) {
                            onBulkDelete({
                              kabKota: filterKabKota !== 'Semua' ? filterKabKota : undefined,
                              year: filterYear !== 'Semua' ? Number(filterYear) : undefined,
                            });
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Hapus Seluruh Hasil Filter
                      </button>
                    )}
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-800 max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-950 text-slate-400 font-bold sticky top-0 z-10 border-b border-slate-800">
                        <tr>
                          <th className="p-2.5 text-center w-12">No.</th>
                          <th className="p-2.5">Nomor Register Unik</th>
                          <th className="p-2.5">Kabupaten / Kota</th>
                          <th className="p-2.5">Tema Pelatihan</th>
                          <th className="p-2.5 text-center">Tahun</th>
                          <th className="p-2.5 text-center">Usia</th>
                          <th className="p-2.5 text-center">Segmen</th>
                          <th className="p-2.5 text-center w-16">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                        {filteredParticipants.map((p, idx) => (
                          <tr key={p.id + idx} className="hover:bg-slate-800/80 transition group">
                            <td className="p-2.5 text-center text-slate-500 text-[11px]">{idx + 1}</td>
                            <td className="p-2.5 font-mono text-[11px] font-bold text-cyan-300">{p.nomorRegister}</td>
                            <td className="p-2.5 font-medium text-white">{p.kabKota}</td>
                            <td className="p-2.5 truncate max-w-xs">{p.themeName}</td>
                            <td className="p-2.5 text-center font-semibold text-slate-300">{p.year}</td>
                            <td className="p-2.5 text-center">{p.age} th</td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                  p.segment === 'vokasi'
                                    ? 'bg-blue-950 text-blue-300 border-blue-800'
                                    : p.segment === 'asn'
                                    ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                                    : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                }`}
                              >
                                {p.segment}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => {
                                  if (confirm(`Hapus talenta dengan Nomor Register: ${p.nomorRegister}?`)) {
                                    onDeleteParticipant(p.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer"
                                title="Hapus Data Ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Reset all button */}
                  <div className="pt-2 flex justify-between items-center text-xs">
                    <span className="text-slate-500">
                      Setiap penambahan atau penghapusan otomatis menyinkronkan seluruh analisis spasial dan IMDI daerah.
                    </span>
                    <button
                      onClick={() => {
                        if (confirm('Yakin ingin mengosongkan seluruh data talenta yang tersimpan?')) {
                          onResetData();
                        }
                      }}
                      className="text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Kosongkan Seluruh Data
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL ADD PARTICIPANT FORM */}
          {activeTab === 'add' && (
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-cyan-400" />
                  Formulir Tambah Data Talenta Digital Satuan
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Masukkan data peserta secara manual. Sistem otomatis menentukan segmen (Vokasi, UMKM, ASN) dan mengkalkulasi ulang rasio talenta unik.
                </p>
              </div>

              {formSuccessMessage && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{formSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleManualAddSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nomor Register */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nomor Register Peserta *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: DTS-2026-0089 atau NIK/ID"
                      value={formRegister}
                      onChange={(e) => setFormRegister(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Kunci deduplikasi: nomor register yang sama dengan tema berbeda dihitung sebagai 1 talenta multi-keahlian.
                    </span>
                  </div>

                  {/* Nama Tema Pelatihan */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Tema Pelatihan *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Junior Web Developer, SPBE, Digital Marketing"
                      value={formTheme}
                      onChange={(e) => setFormTheme(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Provinsi */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Provinsi *
                    </label>
                    <select
                      value={formProvince}
                      onChange={(e) => {
                        const prov = e.target.value as ProvinceName;
                        setFormProvince(prov);
                        const firstDist = REGIONS_DATA.find((r) => r.province === prov);
                        if (firstDist) setFormKabKota(firstDist.name);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                    >
                      <option value="Jawa Timur">Jawa Timur</option>
                      <option value="Nusa Tenggara Barat">Nusa Tenggara Barat</option>
                    </select>
                  </div>

                  {/* Kabupaten / Kota */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kabupaten / Kota *
                    </label>
                    <select
                      value={formKabKota}
                      onChange={(e) => setFormKabKota(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                    >
                      {availableDistricts.map((r) => (
                        <option key={r.id} value={r.name}>{r.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tahun Pelaksanaan */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tahun Pelaksanaan *
                    </label>
                    <select
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                    >
                      {[2022, 2023, 2024, 2025, 2026].map((y) => (
                        <option key={y} value={y}>Tahun {y}</option>
                      ))}
                    </select>
                  </div>

                  {/* Usia Peserta */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Usia Peserta (Tahun) *
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={80}
                      required
                      value={formAge}
                      onChange={(e) => setFormAge(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Pekerjaan / Instansi */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pekerjaan / Instansi
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: ASN Dinas Kominfo, Siswa SMK RPL, Pelaku UMKM Kopi, Wiraswasta"
                    value={formOccupation}
                    onChange={(e) => setFormOccupation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-xs text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-blue-500"
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-slate-400">Deteksi Segmen Otomatis:</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700">
                      {classifySegment(formOccupation, formAge).toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan &amp; Tambahkan ke Sistem</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: BATCH UPLOAD NEW FILE */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {!result && (
                <div className="space-y-4">
                  {/* Mode switch: Replace vs Append */}
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">Mode Penambahan Data:</span>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="uploadMode"
                          checked={uploadMode === 'append'}
                          onChange={() => setUploadMode('append')}
                          className="text-blue-500"
                        />
                        <span className="text-slate-300">Gabungkan / Tambah (Append)</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer ml-3">
                        <input
                          type="radio"
                          name="uploadMode"
                          checked={uploadMode === 'replace'}
                          onChange={() => setUploadMode('replace')}
                          className="text-blue-500"
                        />
                        <span className="text-slate-300">Ganti Seluruh Data (Replace)</span>
                      </label>
                    </div>
                  </div>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragActive(true);
                    }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-8 text-center transition cursor-pointer ${
                      dragActive
                        ? 'border-blue-400 bg-blue-950/20'
                        : 'border-slate-700 bg-slate-950/60 hover:border-slate-600'
                    }`}
                  >
                    <Upload className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                    <h4 className="text-sm font-bold text-white mb-1">
                      Tarik &amp; Letakkan Berkas Data Nyata (.xlsx, .xls, .csv, atau .json)
                    </h4>
                    <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                      Sistem otomatis menormalkan nama kolom kotor berekor ID, memetakan nomor register, mengekstrak tahun, dan menghapus baris duplikat.
                    </p>

                    <label className="inline-flex items-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer shadow-lg transition">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      {processing ? 'Memproses Berkas...' : 'Pilih Berkas dari Komputer'}
                      <input
                        type="file"
                        accept=".xlsx,.xls,.csv,.json"
                        className="hidden"
                        disabled={processing}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleFileUpload(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Cleaned Result Presentation */}
              {result && (
                <div className="space-y-4">
                  <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-300">
                          Pembersihan Otonom &amp; Deduplikasi Data Riil Selesai
                        </h4>
                        <p className="text-xs text-slate-300">
                          Berkas: <strong>{result.summary.fileName}</strong> (Mode:{' '}
                          {uploadMode === 'append' ? 'Gabungkan dengan data yang ada' : 'Ganti seluruh data'})
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setResult(null)}
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Unggah Berkas Lain
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-400 block">Total Baris Terbaca</span>
                      <span className="text-base font-bold text-white">
                        {result.summary.originalRowCount.toLocaleString('id-ID')} Baris
                      </span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-rose-900/40">
                      <span className="text-[10px] text-rose-400 block">Baris Ganda Dihapus</span>
                      <span className="text-base font-bold text-rose-400">
                        {result.summary.duplicateRowsRemoved.toLocaleString('id-ID')} Baris
                      </span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-cyan-900/40">
                      <span className="text-[10px] text-cyan-400 block">No. Register Unik</span>
                      <span className="text-base font-bold text-cyan-300">
                        {result.summary.uniqueTalentsIdentified.toLocaleString('id-ID')} Unik
                      </span>
                    </div>
                    <div className="bg-slate-950 p-3 rounded-xl border border-blue-900/40">
                      <span className="text-[10px] text-blue-400 block">Multi-Keahlian (&gt;1 Tema)</span>
                      <span className="text-base font-bold text-blue-300">
                        {result.summary.multiSkillTalents.toLocaleString('id-ID')} Jiwa
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={handleConfirmApply}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
                    >
                      <span>Terapkan &amp; Sinkronkan ke Sistem</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: OFFICIAL TEMPLATES DOWNLOAD */}
          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Download className="w-4 h-4 text-cyan-400" />
                  Unduh Berkas Format Standar Excel (.xlsx)
                </h4>
                <p className="text-xs text-slate-400">
                  Gunakan template resmi ini untuk memasukkan data survei atau data kepesertaan DTS Kominfo di daerah Anda.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={downloadRealAlumniTemplateXLSX}
                    className="p-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-cyan-300 block group-hover:text-cyan-200">
                        Template Data Alumni Pelatihan (.xlsx)
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Memuat kolom: Nama Tema, Provinsi, Kabupaten/Kota, Tanggal Pendaftaran, Usia, Pekerjaan/Instansi, Nomor Registrasi.
                      </span>
                    </div>
                    <Download className="w-5 h-5 text-cyan-400 shrink-0 ml-3" />
                  </button>

                  <button
                    onClick={downloadRealImdiTemplateXLSX}
                    className="p-4 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700/80 text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <div>
                      <span className="text-xs font-bold text-indigo-300 block group-hover:text-indigo-200">
                        Template Data IMDI Resmi Daerah (.xlsx)
                      </span>
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Memuat skor IMDI komposit dan 4 sub-pilar (Infrastruktur, Keterampilan, Pemberdayaan, Pekerjaan).
                      </span>
                    </div>
                    <Download className="w-5 h-5 text-indigo-400 shrink-0 ml-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Total Data Aktif:{' '}
            <strong className="text-white">{participants.length.toLocaleString('id-ID')} baris</strong> (
            <strong className="text-cyan-300">{uniqueRegistersCount.toLocaleString('id-ID')} No. Register Unik</strong>)
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
          >
            Selesai &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
