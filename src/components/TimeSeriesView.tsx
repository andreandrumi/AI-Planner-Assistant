import React, { useState } from 'react';
import { RegionProfile } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface TimeSeriesViewProps {
  regions: RegionProfile[];
  onSelectRegion: (region: RegionProfile) => void;
  selectedProvince: string;
}

export const TimeSeriesView: React.FC<TimeSeriesViewProps> = ({
  regions,
  onSelectRegion,
  selectedProvince,
}) => {
  const filtered = selectedProvince === 'Semua'
    ? regions
    : regions.filter((r) => r.province === selectedProvince);

  const [selectedCase, setSelectedCase] = useState<string>('jatim-bojonegoro');

  const activeRegion = regions.find((r) => r.id === selectedCase) || regions[0];

  const years = [2022, 2023, 2024, 2025, 2026];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl mb-6 space-y-6">
      {/* Header */}
      <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            Analisis Deret Waktu Pelatihan vs Pertumbuhan IMDI (2022-2026)
          </h3>
          <p className="text-xs text-slate-400">
            Mendeteksi anomali: alokasi kuota tinggi yang tidak mendongkrak skor IMDI (Memicu Rekomendasi Perubahan Sektor Radikal)
          </p>
        </div>

        {/* Region selector for deep dive */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">Fokus Daerah:</span>
          <select
            value={selectedCase}
            onChange={(e) => setSelectedCase(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 font-semibold"
          >
            <optgroup label="Contoh Kasus Stagnansi (Time-Series Warning)">
              <option value="jatim-bojonegoro">Kab. Bojonegoro (Jatim - Stagnan)</option>
              <option value="ntb-lombok-timur">Kab. Lombok Timur (NTB - Stagnan)</option>
            </optgroup>
            <optgroup label="Contoh Wilayah Akselerasi Positif">
              <option value="jatim-surabaya">Kota Surabaya (Akselerasi Mapan)</option>
              <option value="jatim-malang-kota">Kota Malang (Creative Hub)</option>
              <option value="ntb-mataram-kota">Kota Mataram (NTB)</option>
              <option value="jatim-banyuwangi">Kab. Banyuwangi (Smart Kampung)</option>
            </optgroup>
            <optgroup label="Seluruh Wilayah">
              {filtered.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.province})</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Selected Region Deep Time-Series Card */}
      {activeRegion && (
        <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h4 className="text-base font-extrabold text-white">{activeRegion.name}</h4>
              <p className="text-xs text-slate-400">
                {activeRegion.province} • {activeRegion.economicCategory} • IPM: {activeRegion.ipmScore}
              </p>
            </div>
            <button
              onClick={() => onSelectRegion(activeRegion)}
              className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <span>Buka Rekomendasi Lengkap AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Time Series Table Progression */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 font-bold">
                <tr>
                  <th className="p-2.5">Indikator</th>
                  {years.map((y) => (
                    <th key={y} className="p-2.5 text-center">Tahun {y}</th>
                  ))}
                  <th className="p-2.5 text-right">Delta (2022-2026)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950">
                {/* Row 1: IMDI Composite */}
                <tr>
                  <td className="p-2.5 font-semibold text-white">Skor IMDI Komposit</td>
                  {years.map((y) => {
                    const ym = activeRegion.yearlyData[y];
                    return (
                      <td key={y} className="p-2.5 text-center font-bold text-cyan-300">
                        {ym.imdiComposite.toFixed(1)}
                      </td>
                    );
                  })}
                  <td className="p-2.5 text-right font-bold text-emerald-400">
                    +{(activeRegion.yearlyData[2026].imdiComposite - activeRegion.yearlyData[2022].imdiComposite).toFixed(1)} poin
                  </td>
                </tr>

                {/* Row 2: Cumulative Alumni */}
                <tr>
                  <td className="p-2.5 font-semibold text-white">Total Alumni Terdaftar</td>
                  {years.map((y) => {
                    const ym = activeRegion.yearlyData[y];
                    return (
                      <td key={y} className="p-2.5 text-center text-slate-300">
                        {ym.totalAlumniRegistered.toLocaleString('id-ID')}
                      </td>
                    );
                  })}
                  <td className="p-2.5 text-right font-bold text-blue-400">
                    +{((activeRegion.yearlyData[2026].totalAlumniRegistered - activeRegion.yearlyData[2022].totalAlumniRegistered)).toLocaleString('id-ID')}
                  </td>
                </tr>

                {/* Row 3: Unique Talents */}
                <tr>
                  <td className="p-2.5 font-semibold text-white">Talenta Unik (Deduplikasi)</td>
                  {years.map((y) => {
                    const ym = activeRegion.yearlyData[y];
                    return (
                      <td key={y} className="p-2.5 text-center text-cyan-400 font-medium">
                        {ym.uniqueTalents.toLocaleString('id-ID')}
                      </td>
                    );
                  })}
                  <td className="p-2.5 text-right font-bold text-cyan-400">
                    +{((activeRegion.yearlyData[2026].uniqueTalents - activeRegion.yearlyData[2022].uniqueTalents)).toLocaleString('id-ID')}
                  </td>
                </tr>

                {/* Row 4: Urgency status */}
                <tr>
                  <td className="p-2.5 font-semibold text-white">Status Urgensi</td>
                  {years.map((y) => {
                    const ym = activeRegion.yearlyData[y];
                    const badge = ym.urgencyLevel === 'Kritis' ? 'text-rose-400' : ym.urgencyLevel === 'Perlu Perhatian' ? 'text-amber-400' : 'text-emerald-400';
                    return (
                      <td key={y} className={`p-2.5 text-center font-bold text-[11px] ${badge}`}>
                        {ym.urgencyLevel}
                      </td>
                    );
                  })}
                  <td className="p-2.5 text-right font-bold text-slate-400">
                    Skor: {activeRegion.yearlyData[2026].urgencyScore}/100
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Time Series Diagnostic Conclusion */}
          {activeRegion.yearlyData[2026].stagnantWarning ? (
            <div className="bg-rose-950/40 border border-rose-500/50 p-4 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>DIAGNOSIS KEBIJAKAN: TERDETEKSI KEJENUHAN &amp; STAGNASI KUOTA PELATIHAN</span>
              </div>
              <p className="text-xs text-rose-200 leading-relaxed text-justify">
                Meskipun telah menerima alokasi kuota kumulatif sebesar {activeRegion.yearlyData[2026].totalAlumniRegistered.toLocaleString('id-ID')} peserta, skor IMDI daerah ini hanya naik {(activeRegion.yearlyData[2026].imdiComposite - activeRegion.yearlyData[2022].imdiComposite).toFixed(1)} poin dalam 4 tahun terakhir. Sesuai PRD Aturan Time-Series, <strong>wajib dilakukan perombakan drastis</strong>: hentikan pelatihan literasi umum massal; alihkan anggaran ke pelatihan terarah sektor {activeRegion.economicCategory} dan sertifikasi vokasi industri.
              </p>
            </div>
          ) : (
            <div className="bg-emerald-950/30 border border-emerald-500/40 p-4 rounded-xl space-y-1.5">
              <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>DIAGNOSIS KEBIJAKAN: PERTUMBUHAN KORELATIF POSITIF</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed text-justify">
                Peningkatan jumlah alumni terbukti efektif mendongkrak sub-pilar keterampilan dan pemberdayaan masyarakat. Rekomendasi: lanjutkan ke pelatihan tingkat lanjut dan spesialisasi emerging tech (AI, Cloud, Cyber Security).
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
