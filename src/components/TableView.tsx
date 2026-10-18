import React from 'react';
import { RegionProfile, UrgencyLevel } from '../types';
import { AlertTriangle, ShieldAlert, TrendingUp, ExternalLink } from 'lucide-react';

interface TableViewProps {
  regions: RegionProfile[];
  selectedYear: number;
  onSelectRegion: (region: RegionProfile) => void;
  selectedUrgency: UrgencyLevel | 'Semua';
  selectedProvince: string;
  searchQuery: string;
}

export const TableView: React.FC<TableViewProps> = ({
  regions,
  selectedYear,
  onSelectRegion,
  selectedUrgency,
  selectedProvince,
  searchQuery,
}) => {
  const filtered = regions.filter((r) => {
    if (selectedProvince !== 'Semua' && r.province !== selectedProvince) return false;
    const ym = r.yearlyData[selectedYear] || r.yearlyData[2026];
    if (selectedUrgency !== 'Semua' && ym.urgencyLevel !== selectedUrgency) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.shortName.toLowerCase().includes(q) ||
        r.economicCategory.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl mb-6">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div>
          <h3 className="text-sm font-bold text-white">Matriks Kesenjangan Talenta Digital &amp; Skor IMDI</h3>
          <p className="text-xs text-slate-400">Menampilkan {filtered.length} dari 48 Kabupaten/Kota di Jatim &amp; NTB (Tahun {selectedYear})</p>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 font-bold sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="p-3">Kabupaten / Kota</th>
              <th className="p-3">Provinsi</th>
              <th className="p-3">Karakteristik Ekonomi</th>
              <th className="p-3 text-right">IPM</th>
              <th className="p-3 text-right">Skor IMDI</th>
              <th className="p-3 text-right">Sub-Pilar (I / K / P / W)</th>
              <th className="p-3 text-right">Talenta Unik</th>
              <th className="p-3 text-center">Tingkat Urgensi</th>
              <th className="p-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/60">
            {filtered.map((region) => {
              const ym = region.yearlyData[selectedYear] || region.yearlyData[2026];
              const sub = ym.subPillars;
              const isSPBEAlert = sub.empowerment < 38.0 && sub.infrastructure < 40.0;
              const isStagnant = ym.stagnantWarning;

              let badgeClass = 'bg-emerald-950 text-emerald-400 border-emerald-800';
              if (ym.urgencyLevel === 'Kritis') badgeClass = 'bg-rose-950 text-rose-400 border-rose-800';
              else if (ym.urgencyLevel === 'Perlu Perhatian') badgeClass = 'bg-amber-950 text-amber-400 border-amber-800';

              return (
                <tr key={region.id} className="hover:bg-slate-800/80 transition">
                  <td className="p-3 font-semibold text-white">
                    <div className="flex items-center gap-1.5">
                      <span>{region.name}</span>
                      {isSPBEAlert && (
                        <span title="Mandatori SPBE ASN (Pemberdayaan & Infrastruktur kritis)">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                        </span>
                      )}
                      {isStagnant && (
                        <span title="Peringatan Stagnansi Deret Waktu">
                          <TrendingUp className="w-3.5 h-3.5 text-orange-400" />
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-slate-400">{region.province}</td>
                  <td className="p-3 text-slate-300 truncate max-w-xs">{region.economicCategory}</td>
                  <td className="p-3 text-right font-medium">{region.ipmScore.toFixed(1)}</td>
                  <td className="p-3 text-right font-bold text-white">{ym.imdiComposite.toFixed(1)}</td>
                  <td className="p-3 text-right font-mono text-[11px] text-slate-400">
                    <span className={sub.infrastructure < 40 ? 'text-rose-400' : ''}>{sub.infrastructure.toFixed(0)}</span> /{' '}
                    <span>{sub.skills.toFixed(0)}</span> /{' '}
                    <span className={sub.empowerment < 38 ? 'text-rose-400 font-bold' : ''}>{sub.empowerment.toFixed(0)}</span> /{' '}
                    <span>{sub.workforce.toFixed(0)}</span>
                  </td>
                  <td className="p-3 text-right font-semibold text-cyan-300">
                    {ym.uniqueTalents.toLocaleString('id-ID')}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}>
                      {ym.urgencyLevel}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => onSelectRegion(region)}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white text-[11px] font-medium transition flex items-center gap-1 mx-auto cursor-pointer"
                    >
                      <span>Analisis</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
