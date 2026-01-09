
import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  ClipboardEdit, 
  BarChart3, 
  UserPlus, 
  Clock, 
  ChevronRight, 
  Info, 
  ShieldCheck, 
  X,
  LogOut,
  Users,
  Search,
  Download,
  Trash2,
  Sparkles,
  Database,
  Camera,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { ViewMode, Guest } from './types';
import { ROOM_OPTIONS, OFFICIAL_OPTIONS, CATEGORY_OPTIONS, ADMIN_PASSWORD, GOOGLE_SHEETS_SCRIPT_URL } from './constants';
import { storageService } from './services/storageService';
import { geminiService } from './services/geminiService';
import { googleSheetsService } from './services/googleSheetsService';
import { 
  PieChart, 
  Pie, 
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

export default function App() {
  const [view, setView] = useState<ViewMode>(ViewMode.REGISTRATION);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isAdminAuth, setIsAdminAuth] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showGuidance, setShowGuidance] = useState(false);
  
  // Camera States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null); // For full-view modal

  // Registration Form State
  const [formData, setFormData] = useState({
    name: '',
    groupSize: 1,
    contact: '',
    room: '',
    official: '',
    category: '',
    purpose: ''
  });
  const [isRefining, setIsRefining] = useState(false);

  // Admin Filter State
  const [filterRoom, setFilterRoom] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    setGuests(storageService.getGuests());
    return () => clearInterval(timer);
  }, []);

  // Camera Functions
  const startCamera = async () => {
    setIsCameraActive(true);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Gagal mengakses kamera. Pastikan izin kamera telah diberikan.");
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
        setCapturedPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.room || !formData.official) {
      alert("Harap lengkapi semua bidang yang wajib diisi.");
      return;
    }
    if (!capturedPhoto) {
      alert("Harap ambil foto selfie terlebih dahulu untuk verifikasi keamanan.");
      return;
    }
    
    const guestData = { ...formData, photo: capturedPhoto };
    
    // 1. Simpan ke Storage Lokal
    const newGuest = storageService.addGuest(guestData);
    const updatedGuests = [newGuest, ...guests];
    setGuests(updatedGuests);
    
    // 2. Reset Form UI
    setFormData({
      name: '',
      groupSize: 1,
      contact: '',
      room: '',
      official: '',
      category: '',
      purpose: ''
    });
    setCapturedPhoto(null);
    
    // 3. Notifikasi Berhasil ke User
    alert("Pendaftaran berhasil! Data Anda sedang disinkronkan.");

    // 4. Sinkronisasi Otomatis ke Google Sheets (Background)
    try {
      await googleSheetsService.syncToSheets(updatedGuests);
      console.log("Auto-sync to Google Sheets successful");
    } catch (error) {
      console.error("Auto-sync failed:", error);
    }
  };

  const handleRefinePurpose = async () => {
    if (!formData.purpose) return;
    setIsRefining(true);
    const refined = await geminiService.refinePurpose(formData.purpose);
    setFormData(prev => ({ ...prev, purpose: refined }));
    setIsRefining(false);
  };

  const handleAdminVerify = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuth(true);
      setIsPasswordModalOpen(false);
      setView(ViewMode.REPORT);
      setPasswordInput('');
    } else {
      alert("Kata sandi salah!");
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      storageService.deleteGuest(id);
      const updated = guests.filter(g => g.id !== id);
      setGuests(updated);
      // Sinkronkan ulang setelah penghapusan
      googleSheetsService.syncToSheets(updated);
    }
  };

  const handleFetchAiSummary = async () => {
    setIsLoadingSummary(true);
    const summary = await geminiService.getVisitSummary(guests);
    setAiSummary(summary);
    setIsLoadingSummary(false);
  };

  const handleSyncToSheets = async () => {
    if (guests.length === 0) {
      alert("Tidak ada data untuk disinkronkan.");
      return;
    }
    setIsSyncing(true);
    const result = await googleSheetsService.syncToSheets(guests);
    alert(result.message);
    setIsSyncing(false);
  };

  const exportCsv = () => {
    const headers = ["Nama", "Rombongan", "Kontak", "Ruangan", "Pejabat", "Kategori", "Perihal", "Waktu"];
    const rows = guests.map(g => [
      g.name,
      g.groupSize,
      g.contact,
      g.room,
      g.official,
      g.category,
      `"${g.purpose}"`,
      new Date(g.timestamp).toLocaleString('id-ID')
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `laporan_bukutamu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredGuests = guests.filter(g => {
    const matchesRoom = !filterRoom || g.room === filterRoom;
    const matchesCategory = !filterCategory || g.category === filterCategory;
    const matchesSearch = !searchTerm || 
      g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      g.purpose.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRoom && matchesCategory && matchesSearch;
  });

  const chartData = CATEGORY_OPTIONS.map(cat => ({
    name: cat,
    value: guests.filter(g => g.category === cat).length
  }));

  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg fixed top-0 left-0 right-0 z-40">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg">
              <Building2 className="text-indigo-700 w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg md:text-xl leading-tight">SETDA KAB. TAPIN</h1>
              <p className="text-xs text-indigo-100 opacity-80">Buku Tamu Digital</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setView(ViewMode.REGISTRATION)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                view === ViewMode.REGISTRATION 
                  ? 'bg-white text-indigo-700 font-semibold shadow-inner' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <ClipboardEdit size={18} />
              <span className="hidden sm:inline">Pendaftaran</span>
            </button>
            <button 
              onClick={() => {
                if (isAdminAuth) setView(ViewMode.REPORT);
                else setIsPasswordModalOpen(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                view === ViewMode.REPORT 
                  ? 'bg-white text-indigo-700 font-semibold shadow-inner' 
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
            >
              <BarChart3 size={18} />
              <span className="hidden sm:inline">Laporan</span>
            </button>
          </div>
        </div>
        
        <div className="bg-indigo-800 py-1.5 border-t border-indigo-600/30">
          <div className="container mx-auto px-4 flex justify-center items-center gap-3">
             <div className="flex items-center gap-2 text-indigo-100 text-xs">
              <Clock size={14} />
              <span>{currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 pt-32 pb-24">
        {view === ViewMode.REGISTRATION ? (
          <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
              <div className="bg-indigo-50 px-8 py-6 border-b border-indigo-100 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-indigo-900 flex items-center gap-2">
                    <UserPlus className="text-indigo-600" />
                    Pendaftaran Tamu
                  </h2>
                  <p className="text-indigo-600/70 text-sm mt-1">Silakan isi formulir kunjungan Anda dengan benar.</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <form onSubmit={handleRegisterSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Nama Perwakilan <span className="text-red-500">*</span></label>
                      <input 
                        type="text" required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder="Masukkan nama lengkap"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Jumlah Rombongan</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="number" min="1"
                          value={formData.groupSize}
                          onChange={e => setFormData({...formData, groupSize: parseInt(e.target.value) || 1})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        />
                        <span className="text-gray-500 whitespace-nowrap">Orang</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Kontak WhatsApp <span className="text-red-500">*</span></label>
                      <input 
                        type="tel" required
                        value={formData.contact}
                        onChange={e => setFormData({...formData, contact: e.target.value})}
                        placeholder="Contoh: 08123456789"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Ruangan Tujuan <span className="text-red-500">*</span></label>
                      <select required
                        value={formData.room}
                        onChange={e => setFormData({...formData, room: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                      >
                        <option value="">Pilih Ruangan</option>
                        {ROOM_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Pejabat Utama Tujuan <span className="text-red-500">*</span></label>
                      <select required
                        value={formData.official}
                        onChange={e => setFormData({...formData, official: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                      >
                        <option value="">Pilih Pejabat</option>
                        {OFFICIAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700">Kategori Tujuan <span className="text-red-500">*</span></label>
                      <select required
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all bg-white"
                      >
                        <option value="">Pilih Kategori</option>
                        {CATEGORY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 relative">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-gray-700">Perihal Kunjungan <span className="text-red-500">*</span></label>
                      <button 
                        type="button"
                        onClick={handleRefinePurpose}
                        disabled={isRefining || !formData.purpose}
                        className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                      >
                        <Sparkles size={14} className={isRefining ? 'animate-pulse' : ''} />
                        {isRefining ? 'Memperbaiki...' : 'Perbaiki dengan AI'}
                      </button>
                    </div>
                    <textarea 
                      required rows={4}
                      value={formData.purpose}
                      onChange={e => setFormData({...formData, purpose: e.target.value})}
                      placeholder="Sampaikan maksud kunjungan Anda secara rinci"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                    ></textarea>
                  </div>

                  {/* Photo Selfie Section */}
                  <div className="flex flex-col items-center gap-4 py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                      <Camera className="text-indigo-600" size={20} />
                      Photo Selfie Pengunjung <span className="text-red-500">*</span>
                    </h3>
                    
                    <div className="relative w-full max-w-sm aspect-video bg-black rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                      {!isCameraActive && !capturedPhoto && (
                        <button 
                          type="button"
                          onClick={startCamera}
                          className="flex flex-col items-center gap-2 text-white/60 hover:text-white transition-colors"
                        >
                          <Camera size={48} />
                          <span className="text-sm font-medium">Aktifkan Kamera</span>
                        </button>
                      )}

                      {isCameraActive && (
                        <>
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                            <button 
                              type="button"
                              onClick={takePhoto}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-all active:scale-90"
                            >
                              <Camera size={24} />
                            </button>
                            <button 
                              type="button"
                              onClick={stopCamera}
                              className="bg-white/20 hover:bg-white/40 text-white p-3 rounded-full shadow-lg backdrop-blur-sm transition-all"
                            >
                              <X size={24} />
                            </button>
                          </div>
                        </>
                      )}

                      {capturedPhoto && (
                        <div className="relative w-full h-full">
                          <img src={capturedPhoto} className="w-full h-full object-cover" alt="Captured" />
                          <button 
                            type="button"
                            onClick={startCamera}
                            className="absolute bottom-4 right-4 bg-white text-slate-800 p-2 rounded-lg shadow-lg flex items-center gap-2 text-xs font-bold hover:bg-slate-100 transition-all"
                          >
                            <RefreshCw size={14} />
                            Ulangi Foto
                          </button>
                        </div>
                      )}
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                    <p className="text-[10px] text-slate-400">Pastikan wajah terlihat jelas untuk verifikasi pendaftaran.</p>
                  </div>

                  <div className="pt-4">
                    <button 
                      type="submit"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 group"
                    >
                      Kirim Pendaftaran
                      <ChevronRight className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </form>
              </div>

              <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                <button onClick={() => setShowGuidance(!showGuidance)} className="flex items-center gap-2 text-indigo-700 font-medium hover:text-indigo-800 transition-colors">
                  <Info size={18} />
                  Panduan & Etika Kunjungan
                </button>
                {showGuidance && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 animate-slideDown">
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                      <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><ShieldCheck size={16} className="text-green-500" /> Standar Kunjungan</h4>
                      <ul className="text-sm text-gray-600 space-y-1.5 list-disc pl-5">
                        <li>Hadir 15 menit sebelum waktu pertemuan</li>
                        <li>Gunakan busana formal/nasional</li>
                        <li>Bawa identitas diri jika diperlukan</li>
                      </ul>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm">
                      <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2"><Users size={16} className="text-blue-500" /> Etika Berada di Kantor</h4>
                      <ul className="text-sm text-gray-600 space-y-1.5 list-disc pl-5">
                        <li>Jaga ketenangan di area kerja pegawai</li>
                        <li>Dilarang merokok di dalam gedung</li>
                        <li>Selesaikan urusan tepat waktu</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fadeIn space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-800">Laporan Kunjungan</h2>
                <p className="text-slate-500">Monitor data kunjungan dengan verifikasi foto.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={handleSyncToSheets} disabled={isSyncing} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md disabled:opacity-50">
                  <Database size={18} className={isSyncing ? 'animate-spin' : ''} />
                  {isSyncing ? 'Sinkronisasi...' : 'Sinkron ke Sheets'}
                </button>
                <button onClick={exportCsv} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-all shadow-md">
                  <Download size={18} />
                  Ekspor CSV
                </button>
                <button onClick={() => { setIsAdminAuth(false); setView(ViewMode.REGISTRATION); }} className="flex items-center gap-2 bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all">
                  <LogOut size={18} />
                  Keluar Admin
                </button>
              </div>
            </div>

            {/* AI Summary Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
               <div className="relative z-10">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="text-xl font-bold flex items-center gap-2"><Sparkles size={22} className="text-amber-300" /> Ringkasan Cerdas AI</h3>
                   <button onClick={handleFetchAiSummary} disabled={isLoadingSummary} className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-50">
                     {isLoadingSummary ? 'Menganalisis...' : 'Perbarui Ringkasan'}
                   </button>
                 </div>
                 {aiSummary ? <p className="text-indigo-50 leading-relaxed italic">"{aiSummary}"</p> : <p className="text-indigo-200/60">Klik perbarui untuk ringkasan tren.</p>}
               </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50/50 space-y-4">
                 <div className="flex flex-wrap gap-3">
                   <div className="flex-grow min-w-[200px] relative">
                     <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                     <input type="text" placeholder="Cari nama atau perihal..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                   </div>
                 </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Foto</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tamu</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Tujuan</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Waktu</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredGuests.length > 0 ? filteredGuests.map(g => (
                      <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          {g.photo ? (
                            <button onClick={() => setSelectedPhoto(g.photo || null)} className="relative group overflow-hidden rounded-lg w-12 h-12 block shadow-sm">
                              <img src={g.photo} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Selfie" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                <ImageIcon size={14} />
                              </div>
                            </button>
                          ) : (
                            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400"><ImageIcon size={18} /></div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{g.name}</div>
                          <div className="text-xs text-slate-500">{g.groupSize} Orang • {g.contact}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-700 font-medium">{g.official} ({g.room})</div>
                          <div className="text-xs text-slate-500 truncate max-w-xs">{g.purpose}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(g.timestamp).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button onClick={() => handleDelete(g.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={18} /></button>
                        </td>
                      </tr>
                    )) : <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">Belum ada data kunjungan.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Full Photo Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-3xl w-full relative">
            <button onClick={() => setSelectedPhoto(null)} className="absolute -top-12 right-0 text-white hover:text-indigo-400 transition-colors flex items-center gap-2 font-bold">
              <X size={32} />
              Tutup
            </button>
            <img src={selectedPhoto} className="w-full rounded-2xl shadow-2xl border-4 border-white" alt="Full Selfie" />
          </div>
        </div>
      )}

      {/* Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden animate-zoomIn">
            <div className="bg-indigo-600 p-8 text-center text-white">
              <h3 className="text-2xl font-bold">Verifikasi Akses</h3>
              <p className="text-indigo-100/70 text-sm mt-2">Masukan sandi admin untuk melihat laporan.</p>
            </div>
            <div className="p-8 space-y-4">
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdminVerify()} placeholder="Kata Sandi Admin" className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500" />
              <button onClick={handleAdminVerify} className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg">Verifikasi & Masuk</button>
              <button onClick={() => setIsPasswordModalOpen(false)} className="w-full text-slate-500 py-2">Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-indigo-900 text-white fixed bottom-0 left-0 right-0 z-40">
        <div className="container mx-auto h-10 overflow-hidden flex items-center relative">
          <div className="running-text-animation whitespace-nowrap px-4 text-xs font-medium uppercase tracking-widest opacity-80">
            Selamat Datang di Buku Tamu Digital Sekretariat Daerah Kabupaten Tapin • Pastikan wajah terverifikasi melalui kamera selfie demi kenyamanan bersama.
          </div>
        </div>
      </footer>
    </div>
  );
}
