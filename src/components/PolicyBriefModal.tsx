import React from 'react';
import { X, Printer, Download, Sparkles, Scale, FileText, CheckCircle2 } from 'lucide-react';
import { AIPolicyReport } from '../types';

interface PolicyBriefModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AIPolicyReport | null;
}

export const PolicyBriefModal: React.FC<PolicyBriefModalProps> = ({
  isOpen,
  onClose,
  report,
}) => {
  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white text-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Bar (Screen only, hidden on print) */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Dokumen Nota Kebijakan Strategis (Siap Cetak / Ekspor PDF)
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak / Simpan PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 sm:p-12 overflow-y-auto flex-1 font-serif text-slate-800 bg-white">
          {/* Official Letterhead (Kop Surat Kedinasan) */}
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
            <div className="text-sm font-black tracking-widest text-slate-900 uppercase">
              KEMENTERIAN KOMUNIKASI DAN INFORMATIKA REPUBLIK INDONESIA
            </div>
            <div className="text-xs font-bold uppercase text-slate-700 tracking-wider">
              BADAN PENGEMBANGAN SUMBER DAYA MANUSIA DAN PENELITIAN KOMUNIKASI DAN INFORMATIKA
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-sans">
              TIM SISTEM ANALISIS KEBIJAKAN PEMERATAAN TALENTA DIGITAL (DATAMAP AI v2.1)
            </div>
            <div className="text-[10px] text-slate-500 font-sans mt-0.5">
              Wilayah Kerja Prioritas: Provinsi Jawa Timur dan Nusa Tenggara Barat
            </div>
          </div>

          {/* Memo Metadata */}
          <div className="flex flex-col sm:flex-row justify-between text-xs font-sans mb-6 pb-4 border-b border-slate-300 gap-2">
            <div className="space-y-1">
              <div><strong>Nomor:</strong> 042/ND-DATAMAP/BPSDMP/X/2026</div>
              <div><strong>Sifat:</strong> Sangat Segera / Rahasia Kebijakan</div>
              <div><strong>Lampiran:</strong> 1 (Satu) Berkas AI Audit Trail Transparansi</div>
            </div>
            <div className="space-y-1 sm:text-right">
              <div><strong>Tanggal:</strong> 17 Oktober 2026</div>
              <div><strong>Tahun Anggaran:</strong> {report.selectedYear}</div>
              <div><strong>Wilayah Sasaran:</strong> {report.regionName} ({report.province})</div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center mb-6">
            <h2 className="text-base font-extrabold text-slate-900 uppercase tracking-tight">
              NOTA KEBIJAKAN STRATEGIS:
            </h2>
            <h3 className="text-sm font-bold text-slate-800 uppercase">
              REKOMENDASI INTERVENSI PEMERATAAN TALENTA DIGITAL TINGKAT KABUPATEN/KOTA
            </h3>
          </div>

          {/* Section 1: Ringkasan Eksekutif & Tingkat Urgensi */}
          <div className="space-y-4 font-sans text-xs mb-6">
            <div className="bg-slate-100 p-4 rounded-xl border border-slate-300">
              <div className="font-bold uppercase text-slate-900 text-xs mb-1.5 flex items-center justify-between">
                <span>I. RINGKASAN EKSEKUTIF</span>
                <span className="px-2.5 py-0.5 rounded font-black text-[10px] uppercase bg-slate-900 text-white">
                  URGENSI: {report.tingkatUrgensi} (Skor Defisit: {report.skorUrgensi}/100)
                </span>
              </div>
              <p className="text-slate-800 leading-relaxed text-justify">
                {report.ringkasanEksekutif}
              </p>
            </div>

            {/* Strategic Shift Notice if Stagnant */}
            {report.fokusPerubahanStrategis && (
              <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-xl">
                <strong className="text-amber-900 block mb-1">
                  Catatan Evaluasi Deret Waktu (Time-Series):
                </strong>
                <p className="text-amber-800 text-justify">
                  {report.fokusPerubahanStrategis}
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Rekomendasi Tema Berjenjang (3 Segmen) */}
          <div className="space-y-4 font-sans text-xs mb-8">
            <h4 className="font-bold text-slate-900 uppercase text-xs border-b border-slate-400 pb-1">
              II. MATRIKS REKOMENDASI TEMA INTERVENSI PELATIHAN (3 SEGMEN PRIORITAS)
            </h4>

            {/* Table of 3 Segments */}
            <div className="overflow-x-auto border border-slate-300 rounded-xl">
              <table className="w-full text-left divide-y divide-slate-300">
                <thead className="bg-slate-100 text-slate-900 font-bold">
                  <tr>
                    <th className="p-3 w-1/4">Segmen Sasaran</th>
                    <th className="p-3 w-1/4">Fokus Prioritas</th>
                    <th className="p-3 w-1/2">Tema Pelatihan &amp; Target Keluaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Segmen 1 */}
                  <tr>
                    <td className="p-3 align-top font-bold text-slate-900">
                      1. Remaja &amp; Pendidikan Vokasi
                      <span className="block text-[10px] text-slate-500 font-normal">
                        (SMK / Politeknik / Mahasiswa)
                      </span>
                    </td>
                    <td className="p-3 align-top font-semibold text-blue-900">
                      {report.rekomendasiTema.vokasi.prioritas}
                    </td>
                    <td className="p-3 align-top space-y-1">
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-800">
                        {report.rekomendasiTema.vokasi.temaUtama.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                      <div className="text-[11px] text-slate-600 pt-1">
                        <strong>Keluaran:</strong> {report.rekomendasiTema.vokasi.targetKeluaran}
                      </div>
                    </td>
                  </tr>

                  {/* Segmen 2 */}
                  <tr>
                    <td className="p-3 align-top font-bold text-slate-900">
                      2. Usia Produktif, UMKM &amp; Swasta
                      <span className="block text-[10px] text-slate-500 font-normal">
                        (Wirausaha &amp; Angkatan Kerja)
                      </span>
                    </td>
                    <td className="p-3 align-top font-semibold text-emerald-900">
                      {report.rekomendasiTema.umkm.prioritas}
                    </td>
                    <td className="p-3 align-top space-y-1">
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-800">
                        {report.rekomendasiTema.umkm.temaUtama.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                      <div className="text-[11px] text-slate-600 pt-1">
                        <strong>Keluaran:</strong> {report.rekomendasiTema.umkm.targetKeluaran}
                      </div>
                    </td>
                  </tr>

                  {/* Segmen 3 */}
                  <tr>
                    <td className="p-3 align-top font-bold text-slate-900">
                      3. Pejabat Publik &amp; ASN
                      <span className="block text-[10px] text-slate-500 font-normal">
                        (Aparatur Sipil Negara &amp; Pemda)
                      </span>
                    </td>
                    <td className="p-3 align-top font-semibold text-indigo-900">
                      {report.rekomendasiTema.asn.prioritas}
                    </td>
                    <td className="p-3 align-top space-y-1">
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-800">
                        {report.rekomendasiTema.asn.temaUtama.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                      <div className="text-[11px] text-slate-600 pt-1">
                        <strong>Keluaran:</strong> {report.rekomendasiTema.asn.targetKeluaran}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: AI Audit Trail (Jejak Penalaran Kebijakan) */}
          <div className="space-y-3 font-sans text-xs mb-8 page-break-before">
            <h4 className="font-bold text-slate-900 uppercase text-xs border-b border-slate-400 pb-1 flex items-center justify-between">
              <span>III. AI AUDIT TRAIL: TRANSPARANSI PENALARAN &amp; AKUNTABILITAS HUKUM</span>
              <span className="text-[10px] font-normal text-slate-500">NFR-02 Transparansi &amp; NFR-03 Privasi</span>
            </h4>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
              <div>
                <strong className="text-slate-900 block">1. Formulasi Algoritma &amp; Komparasi Angka:</strong>
                <p className="text-slate-700 font-mono text-[11px] bg-slate-100 p-2 rounded mt-1">
                  {report.aiAuditTrail.formulaKomputasi}
                </p>
              </div>

              <div>
                <strong className="text-slate-900 block">2. Rasio Talenta Unik Terdeduplikasi:</strong>
                <p className="text-slate-700">
                  {report.aiAuditTrail.rasioPenyerapan}
                </p>
              </div>

              <div>
                <strong className="text-slate-900 block">3. Justifikasi Politik &amp; Hukum bagi Kepala Daerah:</strong>
                <p className="text-slate-700 text-justify">
                  {report.aiAuditTrail.justifikasiHukumPolitik}
                </p>
              </div>
            </div>
          </div>

          {/* Sign-off Blocks */}
          <div className="grid grid-cols-2 gap-8 text-center text-xs font-sans pt-6 border-t border-slate-300">
            <div>
              <div className="text-slate-600 mb-16">
                Disusun Secara Otonom oleh Sistem Kecerdasan Buatan,<br />
                <strong>Asisten Perencana Kebijakan Publik Senior</strong>
              </div>
              <div className="font-bold underline text-slate-900">DATAMAP AI Core Engine v2.1</div>
              <div className="text-[10px] text-slate-500">ID Sertifikasi: DATAMAP-AI-JATIM-NTB</div>
            </div>

            <div>
              <div className="text-slate-600 mb-16">
                Mengetahui &amp; Menyetujui untuk Tindak Lanjut,<br />
                <strong>Kepala BPSDMP Kominfo / Pimpinan Perencana Daerah</strong>
              </div>
              <div className="font-bold underline text-slate-900">( .................................................... )</div>
              <div className="text-[10px] text-slate-500">NIP. ....................................................</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
