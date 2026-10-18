import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  RotateCcw,
  Sparkles,
  Database,
  Trash2,
  PlusCircle,
  Search,
  Filter,
  Save,
  FileDown,
  Info,
  HelpCircle,
  Check,
  Edit2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { RegionProfile, ProvinceName, SubPillars, UrgencyLevel } from '../types';
import {
  cleanRawImdiDataset,
  downloadRealImdiTemplateXLSX,
  exportCleanedImdiToXLSX,
  simulateDirtyImdiDataset,
  ImdiCleaningResult,
} from '../utils/dataCleaner';
import { computeUrgency } from '../data/regionsData';

interface ImdiManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  regions: RegionProfile[];
  customImdiUpdates: Record<string, Record<number, {
    imdiComposite: number;
    subPillars: SubPillars;
    ipmScore?: number;
  }>>;
  onSaveSingleImdi: (update: {
    kabKota: string;
    year: number;
    imdiComposite: number;
    subPillars: SubPillars;
    ipmScore?: number;
  }) => void;
  onDeleteSingleImdi: (kabKota: string, year: number) => void;
  onApplyBatchImdi: (
    updates: Record<string, Record<number, {
      imdiComposite: number;
      subPillars: SubPillars;
      ipmScore?: number;
    }>>,
    mode: 'merge' | 'replace'
  ) => void;
  onResetAllCustomImdi: () => void;
}

export const ImdiManagerModal: React.FC<ImdiManagerModalProps> = ({
  isOpen,
  onClose,
  regions,
  customImdiUpdates,
  onSaveSingleImdi,
  onDeleteSingleImdi,
  onApplyBatchImdi,
  onResetAllCustomImdi,
}) => {
  const [activeTab, setActiveTab] = useState<'manage' | 'add' | 'upload' | 'guide'>('manage');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvince, setFilterProvince] = useState<string>('Semua');
  const [filterYear, setFilterYear] = useState<number>(2026);
  const [filterType, setFilterType] = useState<'semua' | 'custom' | 'spbe'>('semua');

  // Form states for 'add' / 'edit'
  const [formKabKota, setFormKabKota] = useState('Kabupaten Sampang');
  const [formYear, setFormYear] = useState<number>(2026);
  const [formComposite, setFormComposite] = useState<number>(32.1);
  const [formInfra, setFormInfra] = useState<number>(33.0);
  const [formSkills, setFormSkills] = useState<number>(30.5);
  const [formEmpower, setFormEmpower] = useState<number>(31.8);
  const [formWork, setFormWork] = useState<number>(30.2);
  const [formIpm, setFormIpm] = useState<number>(66.8);
  const [formSuccessMessage, setFormSuccessMessage] = useState('');

  // Upload state
  const [processing, setProcessing] = useState(false);
  const [uploadResult, setUploadResult] = useState<ImdiCleaningResult | null>(null);
  const [uploadMode, setUploadMode] = useState<'merge' | 'replace'>('merge');
  const [dragActive, setDragActive] = useState(false);

  if (!isOpen) return null;

  // Count total custom entries across all districts & years
  let totalCustomCount = 0;
  for (const reg of Object.keys(customImdiUpdates)) {
    totalCustomCount += Object.keys(customImdiUpdates[reg]).length;
  }

  // Pre-fill form when user wants to edit a region
  const handleStartEdit = (kabKota: string, year: number) => {
    const reg = regions.find((r) => r.name === kabKota);
    if (!reg) return;
    const ym = reg.yearlyData[year] || reg.yearlyData[2026];
    setFormKabKota(reg.name);
    setFormYear(year);
    setFormComposite(ym.imdiComposite);
    setFormInfra(ym.subPillars.infrastructure);
    setFormSkills(ym.subPillars.skills);
    setFormEmpower(ym.subPillars.empowerment);
    setFormWork(ym.subPillars.workforce);
    setFormIpm(reg.ipmScore);
    setFormSuccessMessage('');
    setActiveTab('add');
  };

  // Auto-calculate composite from 4 sub-pillars
  const handleAutoCalcComposite = () => {
    const avg = +((formInfra + formSkills + formEmpower + formWork) / 4).toFixed(1);
    setFormComposite(avg);
  };

  // Save manual form
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSingleImdi({
      kabKota: formKabKota,
      year: formYear,
      imdiComposite: formComposite,
      subPillars: {
        infrastructure: formInfra,
        skills: formSkills,
        empowerment: formEmpower,
        workforce: formWork,
      },
      ipmScore: formIpm,
    });

    setFormSuccessMessage(`Nilai IMDI ${formKabKota} (${formYear}) berhasil disimpan & disinkronkan ke AI Agent!`);
    setTimeout(() => {
      setFormSuccessMessage('');
    }, 3500);
  };

  // Handle file drop / upload
  const handleFileUpload = (file: File) => {
    setProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: Array<Record<string, any>> = XLSX.utils.sheet_to_json(worksheet);

        const cleanResult = cleanRawImdiDataset(rawJson, file.name);
        setUploadResult(cleanResult);
      } catch (err) {
        console.error('Gagal membaca berkas IMDI:', err);
        alert('Gagal memproses berkas. Pastikan format berkas adalah Excel (.xlsx/.xls) atau CSV.');
      } finally {
        setProcessing(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Simulate dirty IMDI dataset
  const handleSimulateDirtyImdi = () => {
    setProcessing(true);
    setTimeout(() => {
      const rawRows = simulateDirtyImdiDataset();
      const cleanResult = cleanRawImdiDataset(rawRows, 'Simulasi_Dirty_Data_IMDI_Kominfo.xlsx');
      setUploadResult(cleanResult);
      setProcessing(false);
    }, 400);
  };

  // Apply parsed upload result
  const handleApplyUpload = () => {
    if (!uploadResult) return;
    onApplyBatchImdi(uploadResult.updates, uploadMode);
    setActiveTab('manage');
    setUploadResult(null);
  };

  // Filtered regions list for management table
  const displayedRows = regions
    .filter((r) => {
      if (filterProvince !== 'Semua' && r.province !== filterProvince) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.province.toLowerCase().includes(q)) return false;
      }
      const isCustom = !!customImdiUpdates[r.name]?.[filterYear];
      const ym = r.yearlyData[filterYear] || r.yearlyData[2026];
      const isSpbe = ym.subPillars.empowerment < 38.0 && ym.subPillars.infrastructure < 40.0;

      if (filterType === 'custom' && !isCustom) return false;
      if (filterType === 'spbe' && !isSpbe) return false;

      return true;
    })
    .map((r) => {
      const ym = r.yearlyData[filterYear] || r.yearlyData[2026];
      const isCustom = !!customImdiUpdates[r.name]?.[filterYear];
      const isSpbe = ym.subPillars.empowerment < 38.0 && ym.subPillars.infrastructure < 40.0;
      return {
        region: r,
        yearMetrics: ym,
        isCustom,
        isSpbe,
      };
    });

  // Urgency score calculation preview for form
  const previewUrgency = computeUrgency(
    formComposite,
    {
      infrastructure: formInfra,
      skills: formSkills,
      empowerment: formEmpower,
      workforce: formWork,
    },
    0,
    15000,
    formIpm,
    false
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  Pusat Pengelolaan Nilai IMDI (Indeks Masyarakat Digital Indonesia)
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI Kolom Recognizer
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kelola skor komposit, 4 sub-pilar IMDI, dan kenali kolom otomatis untuk rekomendasi kebijakan presisi Jawa Timur &amp; NTB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-800 bg-slate-950/50 flex space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('manage')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'manage'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Daftar &amp; Kelola Nilai IMDI</span>
            {totalCustomCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {totalCustomCount} Kustom
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'add'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Tambah / Edit Manual</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Unggah Berkas IMDI (AI Kolom Recognition)</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-3 text-xs sm:text-sm font-semibold border-b-2 flex items-center gap-2 transition cursor-pointer whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Kolom yang Dibutuhkan Agen</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: MANAGE / DAFTAR NILAI IMDI */}
          {activeTab === 'manage' && (
            <div className="space-y-4">
              {/* Filter and Action Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <div className="relative min-w-[200px] flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari Kabupaten/Kota..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <select
                    value={filterProvince}
                    onChange={(e) => setFilterProvince(e.target.value)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Semua">Semua Provinsi</option>
                    <option value="Jawa Timur">Jawa Timur</option>
                    <option value="Nusa Tenggara Barat">Nusa Tenggara Barat</option>
                  </select>

                  <select
                    value={filterYear}
                    onChange={(e) => setFilterYear(Number(e.target.value))}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {[2022, 2023, 2024, 2025, 2026].map((yr) => (
                      <option key={yr} value={yr}>
                        Tahun {yr}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="semua">Semua Status</option>
                    <option value="custom">Hanya Nilai Kustom ({totalCustomCount})</option>
                    <option value="spbe">⚠️ Pemicu SPBE Saja</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => exportCleanedImdiToXLSX(regions, filterYear)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                    title="Unduh Tabel IMDI Saat Ini ke Excel"
                  >
                    <FileDown className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Ekspor (.xlsx)</span>
                  </button>

                  {totalCustomCount > 0 && (
                    <button
                      onClick={() => {
                        if (confirm('Kembalikan semua nilai IMDI kustom ke baseline standar BPS-Kominfo?')) {
                          onResetAllCustomImdi();
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/50 text-xs font-semibold text-rose-300 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Kustom</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Information Banner */}
              <div className="px-4 py-2.5 rounded-xl bg-indigo-950/30 border border-indigo-900/60 flex items-center justify-between text-xs text-indigo-300">
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                  <span>
                    Menampilkan <strong>{displayedRows.length}</strong> daerah ({filterProvince}, Tahun {filterYear}). Agen menggunakan 4 sub-pilar untuk merumuskan intervensi presisi.
                  </span>
                </div>
                <button
                  onClick={() => setActiveTab('add')}
                  className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 transition"
                >
                  <PlusCircle className="w-3 h-3" />
                  <span>Tambah/Edit</span>
                </button>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-400 font-semibold border-b border-slate-800">
                      <th className="py-2.5 px-3">Kabupaten / Kota</th>
                      <th className="py-2.5 px-3">Provinsi</th>
                      <th className="py-2.5 px-3 text-center">Tahun</th>
                      <th className="py-2.5 px-3 text-center">Skor Komposit</th>
                      <th className="py-2.5 px-3 text-center">Infrastruktur</th>
                      <th className="py-2.5 px-3 text-center">Keterampilan</th>
                      <th className="py-2.5 px-3 text-center">Pemberdayaan</th>
                      <th className="py-2.5 px-3 text-center">Pekerjaan</th>
                      <th className="py-2.5 px-3 text-center">Urgensi AI</th>
                      <th className="py-2.5 px-3 text-center">Tipe</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {displayedRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-500">
                          Tidak ada daerah yang cocok dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      displayedRows.map(({ region, yearMetrics: ym, isCustom, isSpbe }) => (
                        <tr
                          key={`${region.id}-${filterYear}`}
                          className="hover:bg-slate-800/40 transition"
                        >
                          <td className="py-2.5 px-3 font-semibold text-white">
                            {region.name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">{region.province}</td>
                          <td className="py-2.5 px-3 text-center text-slate-300 font-mono">
                            {filterYear}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">
                              {ym.imdiComposite.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {ym.subPillars.infrastructure.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {ym.subPillars.skills.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono">
                            <span
                              className={`px-1.5 py-0.5 rounded ${
                                ym.subPillars.empowerment < 38.0
                                  ? 'bg-rose-950/60 text-rose-300 border border-rose-800 font-bold'
                                  : 'text-slate-300'
                              }`}
                              title={
                                ym.subPillars.empowerment < 38.0
                                  ? 'Skor < 38 memicu prioritas SPBE ASN otomatis'
                                  : ''
                              }
                            >
                              {ym.subPillars.empowerment.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                            {ym.subPillars.workforce.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                ym.urgencyLevel === 'Kritis'
                                  ? 'bg-rose-950/60 text-rose-300 border-rose-700/60'
                                  : ym.urgencyLevel === 'Perlu Perhatian'
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-700/60'
                                  : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60'
                              }`}
                            >
                              {ym.urgencyLevel}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {isCustom ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-semibold">
                                Kustom
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                Standar
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleStartEdit(region.name, filterYear)}
                                className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-indigo-300 transition"
                                title="Edit / Sesuaikan Nilai Daerah Ini"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              {isCustom && (
                                <button
                                  onClick={() => onDeleteSingleImdi(region.name, filterYear)}
                                  className="p-1 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition"
                                  title="Hapus Nilai Kustom & Kembalikan ke Standar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
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

          {/* TAB 2: TAMBAH / EDIT MANUAL */}
          {activeTab === 'add' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-400" />
                  <span>Formulir Entri Nilai IMDI Daerah</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Masukkan nilai IMDI komposit dan 4 sub-pilar untuk wilayah sasaran. Agen AI akan langsung menghitung ulang bobot urgensi dan rekomendasi tema pelatihan.
                </p>
              </div>

              {formSuccessMessage && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/50 text-xs text-emerald-200 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{formSuccessMessage}</span>
                </div>
              )}

              <form onSubmit={handleSaveForm} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Pilih Kabupaten / Kota
                    </label>
                    <select
                      value={formKabKota}
                      onChange={(e) => {
                        setFormKabKota(e.target.value);
                        const found = regions.find((r) => r.name === e.target.value);
                        if (found) {
                          const ym = found.yearlyData[formYear] || found.yearlyData[2026];
                          setFormComposite(ym.imdiComposite);
                          setFormInfra(ym.subPillars.infrastructure);
                          setFormSkills(ym.subPillars.skills);
                          setFormEmpower(ym.subPillars.empowerment);
                          setFormWork(ym.subPillars.workforce);
                          setFormIpm(found.ipmScore);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {regions.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name} ({r.province})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Tahun Penilaian
                    </label>
                    <select
                      value={formYear}
                      onChange={(e) => {
                        const yr = Number(e.target.value);
                        setFormYear(yr);
                        const found = regions.find((r) => r.name === formKabKota);
                        if (found) {
                          const ym = found.yearlyData[yr] || found.yearlyData[2026];
                          setFormComposite(ym.imdiComposite);
                          setFormInfra(ym.subPillars.infrastructure);
                          setFormSkills(ym.subPillars.skills);
                          setFormEmpower(ym.subPillars.empowerment);
                          setFormWork(ym.subPillars.workforce);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {[2022, 2023, 2024, 2025, 2026].map((yr) => (
                        <option key={yr} value={yr}>
                          Tahun {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 4 Sub-Pillars Card */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">
                      Nilai 4 Sub-Pilar IMDI (Skala 0 - 100)
                    </span>
                    <button
                      type="button"
                      onClick={handleAutoCalcComposite}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-semibold cursor-pointer"
                    >
                      Hitung Rata-Rata Komposit Otomatis
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        1. Infrastruktur &amp; Ekosistem
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formInfra}
                        onChange={(e) => setFormInfra(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        2. Keterampilan Digital (Digital Skills)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formSkills}
                        onChange={(e) => setFormSkills(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[11px] text-slate-400">
                          3. Pemberdayaan (Empowerment)
                        </label>
                        {formEmpower < 38.0 && (
                          <span className="text-[10px] text-rose-400 font-bold">
                            ⚠️ &lt; 38 (Pemicu SPBE)
                          </span>
                        )}
                      </div>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formEmpower}
                        onChange={(e) => setFormEmpower(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        4. Pekerjaan &amp; Lapangan Kerja
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formWork}
                        onChange={(e) => setFormWork(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  </div>

                  {formEmpower < 38.0 && formInfra < 40.0 && (
                    <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">Mandat Pelatihan SPBE ASN Aktif!</strong>
                        Skor Pemberdayaan ({formEmpower}) &lt; 38.0 dan Infrastruktur ({formInfra}) &lt; 40.0. Agen secara otomatis memprioritaskan ASN wilayah ini untuk menerima pelatihan <em>&quot;Tata Kelola Digital / SPBE&quot;</em>.
                      </div>
                    </div>
                  )}
                </div>

                {/* Composite and IPM */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Skor IMDI Komposit
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formComposite}
                      onChange={(e) => setFormComposite(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      IPM Daerah (Indeks Pembangunan Manusia)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={formIpm}
                      onChange={(e) => setFormIpm(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      {formIpm < 70
                        ? 'IPM Rendah (<70): Vokasi diarahkan ke Literasi Dasar'
                        : formIpm <= 78
                        ? 'IPM Menengah (70-78): Vokasi diarahkan ke Keahlian Terapan Web/Data'
                        : 'IPM Tinggi (>78): Vokasi diarahkan ke Lanjutan (AI/Cloud/Security)'}
                    </span>
                  </div>
                </div>

                {/* AI Impact Calculation Preview */}
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Proyeksi Status Urgensi AI:</span>
                    <strong className="text-white">
                      Skor Urgensi Defisit: {previewUrgency.urgencyScore}/100
                    </strong>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      previewUrgency.urgencyLevel === 'Kritis'
                        ? 'bg-rose-950/80 text-rose-300 border-rose-700'
                        : previewUrgency.urgencyLevel === 'Perlu Perhatian'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-700'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                    }`}
                  >
                    {previewUrgency.urgencyLevel}
                  </span>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('manage')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Nilai IMDI</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: UPLOAD BERKAS IMDI (AI COLUMN RECOGNITION) */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Unggah Berkas IMDI dengan AI Column Recognition</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                    Unggah berkas Excel/CSV resmi maupun tidak terstruktur. Agen AI secara mandiri mengenali kolom yang dibutuhkan untuk merumuskan urgensi dan intervensi rekomendasi.
                  </p>
                </div>
                <button
                  onClick={handleSimulateDirtyImdi}
                  className="px-3.5 py-2 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-xs font-bold text-indigo-300 flex items-center gap-2 transition cursor-pointer shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Simulasikan Berkas Kotor (Dirty Data)</span>
                </button>
              </div>

              {/* Drag and Drop Zone */}
              {!uploadResult && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileUpload(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center ${
                    dragActive
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-slate-700/80 bg-slate-950/40 hover:border-slate-600'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
                    <FileSpreadsheet className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">
                    Tarik &amp; Letakkan Berkas Nilai IMDI di Sini
                  </h4>
                  <p className="text-xs text-slate-400 mb-4 max-w-md">
                    Mendukung berkas <strong>.xlsx</strong>, <strong>.xls</strong>, atau <strong>.csv</strong>. Agen AI akan mengenali nama kolom secara cerdas meskipun memiliki format berekor acak.
                  </p>

                  <label className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg transition">
                    <Upload className="w-4 h-4" />
                    <span>Pilih Berkas Excel / CSV</span>
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              )}

              {/* Upload Result & AI Column Recognition Showcase */}
              {uploadResult && (
                <div className="space-y-4 animate-in fade-in">
                  {/* Semantic Column Recognition Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          Hasil Deteksi Semantik Kolom oleh Agen AI
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        Semua Kolom Kunci Dikenali
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {Object.entries(uploadResult.recognizedColumns).map(([colName, mappedRole]) => (
                        <div
                          key={colName}
                          className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/70 text-xs"
                        >
                          <span className="text-[10px] text-slate-400 block font-mono truncate" title={colName}>
                            Kolom: {colName}
                          </span>
                          <span className="text-xs font-bold text-indigo-300 flex items-center gap-1 mt-0.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            {mappedRole === 'region'
                              ? 'Nama Daerah'
                              : mappedRole === 'composite'
                              ? 'Skor Komposit IMDI'
                              : mappedRole === 'infrastructure'
                              ? 'Sub-Pilar Infrastruktur'
                              : mappedRole === 'skills'
                              ? 'Sub-Pilar Keterampilan'
                              : mappedRole === 'empowerment'
                              ? 'Sub-Pilar Pemberdayaan'
                              : mappedRole === 'workforce'
                              ? 'Sub-Pilar Pekerjaan'
                              : mappedRole === 'ipm'
                              ? 'IPM Daerah'
                              : 'Tahun'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t border-indigo-900/50 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
                      <span>
                        Berkas: <strong className="text-white">{uploadResult.fileName}</strong> | Total Baris:{' '}
                        <strong className="text-white">{uploadResult.totalRows}</strong> | Wilayah Terpetakan:{' '}
                        <strong className="text-cyan-300">{uploadResult.updatedDistrictsCount} Daerah</strong>
                      </span>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-slate-300 flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="upmode"
                            checked={uploadMode === 'merge'}
                            onChange={() => setUploadMode('merge')}
                          />
                          <span>Perbarui / Gabungkan</span>
                        </label>
                        <label className="text-xs text-slate-300 flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name="upmode"
                            checked={uploadMode === 'replace'}
                            onChange={() => setUploadMode('replace')}
                          />
                          <span>Gantikan Seluruh Kustom</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Preview Rows Table */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/40">
                    <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 text-xs font-bold text-white flex items-center justify-between">
                      <span>Pratinjau Data yang Dipetakan ({uploadResult.previewRows.length} Baris Pertama)</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        Nilai siap disinkronkan ke seluruh modul visualisasi
                      </span>
                    </div>
                    <div className="overflow-x-auto max-h-56">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900/70 text-slate-400 font-semibold border-b border-slate-800">
                            <th className="py-2 px-3">Kabupaten/Kota</th>
                            <th className="py-2 px-3">Provinsi</th>
                            <th className="py-2 px-3 text-center">Tahun</th>
                            <th className="py-2 px-3 text-center">Komposit</th>
                            <th className="py-2 px-3 text-center">Infrastruktur</th>
                            <th className="py-2 px-3 text-center">Keterampilan</th>
                            <th className="py-2 px-3 text-center">Pemberdayaan</th>
                            <th className="py-2 px-3 text-center">Pekerjaan</th>
                            <th className="py-2 px-3 text-center">Status SPBE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {uploadResult.previewRows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-800/40">
                              <td className="py-2 px-3 font-semibold text-white">{row.kabKota}</td>
                              <td className="py-2 px-3 text-slate-400">{row.province}</td>
                              <td className="py-2 px-3 text-center text-slate-300 font-mono">{row.year}</td>
                              <td className="py-2 px-3 text-center font-bold text-cyan-300 font-mono">
                                {row.composite.toFixed(1)}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-slate-300">
                                {row.infrastructure.toFixed(1)}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-slate-300">
                                {row.skills.toFixed(1)}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-slate-300">
                                {row.empowerment.toFixed(1)}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-slate-300">
                                {row.workforce.toFixed(1)}
                              </td>
                              <td className="py-2 px-3 text-center">
                                {row.spbeMandatory ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                                    ⚠️ Mandat ASN
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-500">Standar</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Apply Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setUploadResult(null)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                    >
                      Batal / Unggah Berkas Lain
                    </button>
                    <button
                      onClick={handleApplyUpload}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Terapkan Pembaruan Nilai IMDI ke Sistem</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PANDUAN KOLOM YANG DIBUTUHKAN AGEN */}
          {activeTab === 'guide' && (
            <div className="space-y-6 max-w-4xl mx-auto">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-indigo-400" />
                  <span>Daftar Kolom yang Dibutuhkan Agen AI untuk Rekomendasi Kebijakan</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Sesuai PRD Asisten Perencana Kebijakan Publik Senior, agen membaca variabel-variabel ini untuk menghasilkan analisis deret waktu, pemicu SPBE, dan pemetaan 3 segmen.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      1
                    </span>
                    <strong className="text-xs text-white">Kabupaten / Kota &amp; Provinsi</strong>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Digunakan untuk identifikasi 48 wilayah target di Jawa Timur &amp; NTB serta pemetaan karakteristik ekonomi (Agraris, Pesisir, Industri, Pariwisata, Tambang).
                  </p>
                  <div className="text-[11px] font-mono text-indigo-300 bg-slate-900 p-2 rounded border border-slate-800">
                    Contoh header: <code>kabupaten_kota</code>, <code>nama_daerah</code>, <code>wilayah_domisili</code>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      2
                    </span>
                    <strong className="text-xs text-white">Tahun Penilaian (Time-Series)</strong>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Digunakan untuk analisis deret waktu 2022-2026 dan mendeteksi anomali <em>stagnan</em> (kuota alumni masif tetapi skor IMDI tidak berkembang).
                  </p>
                  <div className="text-[11px] font-mono text-indigo-300 bg-slate-900 p-2 rounded border border-slate-800">
                    Contoh header: <code>tahun</code>, <code>periode_survei</code>, <code>batch_year</code>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <strong className="text-xs text-white">Sub-Pilar Pemberdayaan &amp; Infrastruktur</strong>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>Aturan Mutlak PRD:</strong> Jika Pemberdayaan &lt; 38.0 dan Infrastruktur &lt; 40.0, segmen ASN secara otomatis menjadi <em>prioritas utama</em> pelatihan <strong>Tata Kelola Digital / SPBE</strong>.
                  </p>
                  <div className="text-[11px] font-mono text-indigo-300 bg-slate-900 p-2 rounded border border-slate-800">
                    Contoh header: <code>subpilar_pemberdayaan</code>, <code>subpilar_infrastruktur</code>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                      4
                    </span>
                    <strong className="text-xs text-white">Sub-Pilar Keterampilan &amp; Pekerjaan</strong>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Mengukur tingkat kecakapan digital masyarakat umum dan serapan tenaga kerja produktif di ekosistem digital.
                  </p>
                  <div className="text-[11px] font-mono text-indigo-300 bg-slate-900 p-2 rounded border border-slate-800">
                    Contoh header: <code>subpilar_keterampilan</code>, <code>subpilar_pekerjaan</code>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <strong className="text-xs font-bold text-white block">
                    Unduh Format Standar Excel IMDI Kominfo
                  </strong>
                  <span className="text-xs text-slate-300">
                    Gunakan template ini untuk mengisi data lapangan resmi secara rapi dan terstandarisasi.
                  </span>
                </div>
                <button
                  onClick={downloadRealImdiTemplateXLSX}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh Template (.xlsx)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
