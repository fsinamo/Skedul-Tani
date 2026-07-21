import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Sprout,
  Calendar,
  Layers,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  LogOut,
  AlertCircle,
  FileSpreadsheet,
  Info,
  ChevronRight,
  User,
  Clock,
  ExternalLink,
  PlusCircle,
  Tag,
  Activity as ActivityIcon,
  Search,
  SlidersHorizontal,
  X,
  Database,
  Table,
  List,
  Lock,
  Eye,
  EyeOff,
  Settings
} from "lucide-react";

import { Crop, Activity, Category, UserSession, SyncConfig } from "./types";
import { DEFAULT_CATEGORIES, INITIAL_CROPS, INITIAL_ACTIVITIES } from "./mockData";
import { APPS_SCRIPT_CODE, syncToGoogleSheets, fetchFromGoogleSheets } from "./sheetsApi";

export default function App() {
  // --- STATE ---
  const [session, setSession] = useState<UserSession | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");

  const [crops, setCrops] = useState<Crop[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [selectedCropId, setSelectedCropId] = useState<string>("");
  const [selectedWeek, setSelectedWeek] = useState<string>("all"); // "all", "pra", "1", "2", "3" ...
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline");

  // UI States
  const [showAddCropModal, setShowAddCropModal] = useState(false);
  const [showAddActivityModal, setShowAddActivityModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [showSyncDropdown, setShowSyncDropdown] = useState(false);
  const [showAddCategoryInline, setShowAddCategoryInline] = useState(false);

  // Form States - Crop
  const [newCropName, setNewCropName] = useState("");
  const [newCropStartDate, setNewCropStartDate] = useState("");
  const [newCropNotes, setNewCropNotes] = useState("");

  // Form States - Activity
  const [actCategory, setActCategory] = useState("");
  const [actDate, setActDate] = useState("");
  const [actDescription, setActDescription] = useState("");
  const [actBrand, setActBrand] = useState("");
  const [actDosage, setActDosage] = useState("");
  const [actFunction, setActFunction] = useState("");

  // Form States - Category
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("emerald");

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Google Sheets Config
  const [syncConfig, setSyncConfig] = useState<SyncConfig>({ appsScriptUrl: "" });
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  // --- INITIALIZATION & SESSION CHECK ---
  useEffect(() => {
    // Check Session
    const savedSession = localStorage.getItem("skedultani_session");
    if (savedSession) {
      try {
        const parsed: UserSession = JSON.parse(savedSession);
        if (Date.now() < parsed.expiryTime) {
          setSession(parsed);
        } else {
          localStorage.removeItem("skedultani_session");
        }
      } catch (e) {
        localStorage.removeItem("skedultani_session");
      }
    }

    // Load Data
    const savedCrops = localStorage.getItem("skedultani_crops");
    const savedActivities = localStorage.getItem("skedultani_activities");
    const savedCategories = localStorage.getItem("skedultani_categories");
    const savedSyncConfig = localStorage.getItem("skedultani_sync_config");

    if (savedCrops) setCrops(JSON.parse(savedCrops));
    else setCrops(INITIAL_CROPS);

    if (savedActivities) setActivities(JSON.parse(savedActivities));
    else setActivities(INITIAL_ACTIVITIES);

    if (savedCategories) setCategories(JSON.parse(savedCategories));
    else setCategories(DEFAULT_CATEGORIES);

    if (savedSyncConfig) {
      setSyncConfig(JSON.parse(savedSyncConfig));
    }
  }, []);

  // Set default selected crop once crops loaded
  useEffect(() => {
    if (crops.length > 0 && !selectedCropId) {
      setSelectedCropId(crops[0].id);
    }
  }, [crops, selectedCropId]);

  // Persist Data helper
  const persistCrops = (newCrops: Crop[]) => {
    setCrops(newCrops);
    localStorage.setItem("skedultani_crops", JSON.stringify(newCrops));
  };

  const persistActivities = (newActs: Activity[]) => {
    setActivities(newActs);
    localStorage.setItem("skedultani_activities", JSON.stringify(newActs));
  };

  const persistCategories = (newCats: Category[]) => {
    setCategories(newCats);
    localStorage.setItem("skedultani_categories", JSON.stringify(newCats));
  };

  // --- LOGIN HANDLER ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const emailLower = emailInput.trim().toLowerCase();
    if (emailLower !== "appdb74@gmail.com") {
      setLoginError("Akses ditolak! Anda harus login menggunakan akun email: appdb74@gmail.com");
      return;
    }

    if (passwordInput !== "tani74" && passwordInput !== "appdb74") {
      setLoginError("Kata sandi salah! Silakan coba lagi. (Petunjuk: gunakan kata sandi 'tani74')");
      return;
    }

    const now = Date.now();
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    const sessionData: UserSession = {
      email: emailLower,
      loginTime: now,
      expiryTime: now + oneWeekMs
    };

    localStorage.setItem("skedultani_session", JSON.stringify(sessionData));
    setSession(sessionData);
    setLoginError("");
    setPasswordInput("");
  };

  const handleLogout = () => {
    localStorage.removeItem("skedultani_session");
    setSession(null);
    setEmailInput("");
    setPasswordInput("");
  };

  // --- GOOGLE SHEETS SYNC ---
  const saveSyncConfig = (url: string) => {
    const updated = { appsScriptUrl: url };
    setSyncConfig(updated);
    localStorage.setItem("skedultani_sync_config", JSON.stringify(updated));
  };

  const handlePushToSheets = async () => {
    if (!syncConfig.appsScriptUrl) {
      setSyncStatus("error");
      setSyncMessage("Tolong masukkan URL Google Apps Script terlebih dahulu di pengaturan.");
      return;
    }

    setSyncStatus("loading");
    setSyncMessage("Mengirim data lokal ke Google Sheets...");

    try {
      const response = await syncToGoogleSheets(syncConfig.appsScriptUrl, {
        crops,
        activities,
        categories
      });

      if (response.status === "success") {
        setSyncStatus("success");
        setSyncMessage("Berhasil! Semua data lokal telah menggantikan data di Google Sheets.");
        const updatedConfig = { ...syncConfig, lastSynced: Date.now() };
        setSyncConfig(updatedConfig);
        localStorage.setItem("skedultani_sync_config", JSON.stringify(updatedConfig));
      } else {
        throw new Error(response.message || "Gagal melakukan sinkronisasi.");
      }
    } catch (err) {
      setSyncStatus("error");
      setSyncMessage(err instanceof Error ? err.message : "Terjadi kesalahan koneksi jaringan.");
    }
  };

  const handlePullFromSheets = async () => {
    if (!syncConfig.appsScriptUrl) {
      setSyncStatus("error");
      setSyncMessage("Tolong masukkan URL Google Apps Script terlebih dahulu di pengaturan.");
      return;
    }

    setSyncStatus("loading");
    setSyncMessage("Mengambil data dari Google Sheets...");

    try {
      const response = await fetchFromGoogleSheets(syncConfig.appsScriptUrl);

      if (response.status === "success" && response.data) {
        const { crops: sheetCrops, activities: sheetActivities, categories: sheetCategories } = response.data;
        
        // Update local state and localStorage
        persistCrops(sheetCrops);
        persistActivities(sheetActivities);
        if (sheetCategories && sheetCategories.length > 0) {
          persistCategories(sheetCategories);
        }

        setSyncStatus("success");
        setSyncMessage("Berhasil! Data lokal telah diperbarui sesuai dengan Google Sheets.");
        
        // Auto select first crop if current crop does not exist anymore
        if (sheetCrops.length > 0) {
          const exists = sheetCrops.some(c => c.id === selectedCropId);
          if (!exists) {
            setSelectedCropId(sheetCrops[0].id);
          }
        } else {
          setSelectedCropId("");
        }

        const updatedConfig = { ...syncConfig, lastSynced: Date.now() };
        setSyncConfig(updatedConfig);
        localStorage.setItem("skedultani_sync_config", JSON.stringify(updatedConfig));
      } else {
        throw new Error(response.message || "Gagal mengambil data.");
      }
    } catch (err) {
      setSyncStatus("error");
      setSyncMessage(err instanceof Error ? err.message : "Terjadi kesalahan koneksi jaringan.");
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // --- CROP HANDLERS ---
  const handleAddCrop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCropName || !newCropStartDate) return;

    const newCrop: Crop = {
      id: `crop-${Date.now()}`,
      name: newCropName,
      startDate: newCropStartDate,
      notes: newCropNotes
    };

    const updated = [...crops, newCrop];
    persistCrops(updated);
    setSelectedCropId(newCrop.id);

    // Reset Form
    setNewCropName("");
    setNewCropStartDate("");
    setNewCropNotes("");
    setShowAddCropModal(false);
  };

  const handleDeleteCrop = (id: string) => {
    if (confirm("Apakah Anda yakin ingin menghapus tanaman ini beserta seluruh riwayat kegiatannya?")) {
      const updatedCrops = crops.filter(c => c.id !== id);
      const updatedActs = activities.filter(a => a.cropId !== id);
      
      persistCrops(updatedCrops);
      persistActivities(updatedActs);

      if (selectedCropId === id) {
        setSelectedCropId(updatedCrops.length > 0 ? updatedCrops[0].id : "");
      }
    }
  };

  // --- ACTIVITY HANDLERS ---
  const handleAddActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCropId || !actCategory || !actDate || !actDescription) return;

    const newAct: Activity = {
      id: `act-${Date.now()}`,
      cropId: selectedCropId,
      category: actCategory,
      date: actDate,
      description: actDescription,
      brand: actBrand || "-",
      dosage: actDosage || "-",
      function: actFunction || "-"
    };

    const updated = [...activities, newAct];
    persistActivities(updated);

    // Reset Form
    setActCategory("");
    setActDate("");
    setActDescription("");
    setActBrand("");
    setActDosage("");
    setActFunction("");
    setShowAddActivityModal(false);
  };

  const handleDeleteActivity = (id: string) => {
    if (confirm("Hapus kegiatan ini?")) {
      const updated = activities.filter(a => a.id !== id);
      persistActivities(updated);
    }
  };

  // --- CUSTOM CATEGORY HANDLER ---
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const nameTrimmed = newCatName.trim();
    if (!nameTrimmed) return;

    // Check if category already exists
    if (categories.some(c => c.name.toLowerCase() === nameTrimmed.toLowerCase())) {
      alert("Kategori ini sudah ada!");
      return;
    }

    const newCat: Category = {
      name: nameTrimmed,
      isCustom: true,
      color: newCatColor
    };

    const updated = [...categories, newCat];
    persistCategories(updated);
    setActCategory(newCat.name); // Auto select new category
    setNewCatName("");
    setShowAddCategoryInline(false);
  };

  // --- CALCULATIONS FOR TIMELINE & DETAILS ---
  const activeCrop = useMemo(() => {
    return crops.find(c => c.id === selectedCropId) || null;
  }, [crops, selectedCropId]);

  const activeCropAgeInDays = useMemo(() => {
    if (!activeCrop) return 0;
    const start = new Date(activeCrop.startDate);
    const today = new Date("2026-07-19"); // Consistent with environment date
    const diffTime = today.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }, [activeCrop]);

  // Helper to map date to week number relative to crop start date
  const getActivityWeekInfo = (activityDateStr: string, cropStartDateStr: string) => {
    const actDate = new Date(activityDateStr);
    const startDate = new Date(cropStartDateStr);
    
    // Set both times to midnight to calculate pure date difference
    actDate.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);

    const diffTime = actDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { weekNum: "pra", dayNum: diffDays };
    }

    const weekNum = Math.floor(diffDays / 7) + 1;
    return { weekNum: weekNum.toString(), dayNum: diffDays + 1 };
  };

  // Filter activities for active crop, search query, category filters
  const filteredActivities = useMemo(() => {
    if (!selectedCropId) return [];
    
    return activities
      .filter(a => a.cropId === selectedCropId)
      .filter(a => {
        // Search query check
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchDesc = a.description.toLowerCase().includes(query);
          const matchBrand = a.brand?.toLowerCase().includes(query);
          const matchFunc = a.function?.toLowerCase().includes(query);
          const matchCat = a.category.toLowerCase().includes(query);
          if (!matchDesc && !matchBrand && !matchFunc && !matchCat) return false;
        }

        // Category filter check
        if (categoryFilter !== "all" && a.category !== categoryFilter) {
          return false;
        }

        // Week filter check
        if (selectedWeek !== "all" && activeCrop) {
          const info = getActivityWeekInfo(a.date, activeCrop.startDate);
          if (info.weekNum !== selectedWeek) return false;
        }

        return true;
      })
      // Sort chronologically
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [activities, selectedCropId, searchQuery, categoryFilter, selectedWeek, activeCrop]);

  // Compute all available weeks that have activities, plus current week
  const weekList = useMemo(() => {
    if (!activeCrop) return [];
    
    const cropActs = activities.filter(a => a.cropId === selectedCropId);
    const weeksSet = new Set<string>();

    // Add weeks from actual activities
    cropActs.forEach(a => {
      const info = getActivityWeekInfo(a.date, activeCrop.startDate);
      weeksSet.add(info.weekNum);
    });

    // Add current week of crop
    const currentWeekNum = Math.floor(activeCropAgeInDays / 7) + 1;
    if (currentWeekNum > 0) {
      weeksSet.add(currentWeekNum.toString());
    } else {
      weeksSet.add("pra");
    }

    // Always ensure at least weeks 1 to 4 are available to look tidy
    for (let i = 1; i <= 4; i++) {
      weeksSet.add(i.toString());
    }

    // Convert to sorted list of numbers (plus "pra" if exists)
    const weeksList = Array.from(weeksSet).filter(w => w !== "pra").map(Number).sort((a, b) => a - b).map(String);
    if (weeksSet.has("pra")) {
      weeksList.unshift("pra");
    }

    return weeksList;
  }, [activities, selectedCropId, activeCrop, activeCropAgeInDays]);

  // Helper to get dates for a specific week number
  const getWeekDateRange = (weekStr: string, cropStartDateStr: string) => {
    const start = new Date(cropStartDateStr);
    if (weekStr === "pra") {
      return "Sebelum Tanam";
    }

    const weekNum = parseInt(weekStr);
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() + (weekNum - 1) * 7);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const format = (d: Date) => {
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    };

    return `${format(weekStart)} - ${format(weekEnd)}`;
  };

  // Get color styles for categories
  const getCategoryColor = (catName: string) => {
    const cat = categories.find(c => c.name === catName);
    const color = cat ? cat.color : "emerald";

    const colorMap: Record<string, { border: string; bg: string; text: string; dot: string }> = {
      teal: { border: "border-teal-500", bg: "bg-teal-50", text: "text-teal-700", dot: "bg-teal-500" },
      emerald: { border: "border-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
      amber: { border: "border-amber-500", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
      indigo: { border: "border-indigo-500", bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
      rose: { border: "border-rose-500", bg: "bg-rose-50", text: "text-rose-700", dot: "bg-rose-500" },
      purple: { border: "border-purple-500", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
      orange: { border: "border-orange-500", bg: "bg-orange-50", text: "text-orange-700", dot: "bg-orange-500" },
      slate: { border: "border-slate-500", bg: "bg-slate-50", text: "text-slate-700", dot: "bg-slate-500" },
    };

    return colorMap[color] || colorMap.emerald;
  };

  // Remaining days calculation for active session countdown
  const sessionDaysLeft = useMemo(() => {
    if (!session) return 0;
    const diff = session.expiryTime - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [session]);

  // --- RENDER LOGIN SCREEN ---
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-emerald-200">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Cover Banner */}
          <div className="bg-emerald-800 p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-700/40 rounded-full blur-2xl -mr-8 -mt-8" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-900/50 rounded-full blur-xl -ml-8 -mb-8" />
            
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-emerald-700/80 rounded-xl backdrop-blur-sm shadow-md">
                <Sprout className="w-6 h-6 text-emerald-200" />
              </div>
              <h1 className="text-2xl font-bold font-display tracking-tight text-white">Skedul Tani</h1>
            </div>
            <p className="text-emerald-100/90 text-sm mt-2 font-medium">
              Aplikasi Pencatatan & Penjadwalan Budidaya Pertanian Terintegrasi Google Sheets.
            </p>
          </div>

          {/* Form Area */}
          <div className="p-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Masuk ke Aplikasi</h2>
            <p className="text-xs text-slate-500 mb-6">
              Gunakan email yang terdaftar pada lembar sheet <span className="font-mono text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded">skedultani</span> untuk sinkronisasi.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                  Alamat Email Akun
                </label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    required
                    placeholder="Contoh: appdb74@gmail.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Kata Sandi
                  </label>
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium">
                    Gunakan sandi: tani74
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="Masukkan kata sandi..."
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm font-medium text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5 uppercase tracking-wider">
                  Masa Berlaku Sesi
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Sesi login akan disimpan di peramban ini selama <b>7 hari</b>.</span>
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-xs text-rose-700 animate-pulse">
                  <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900 text-white rounded-xl font-medium text-sm transition-all shadow-md shadow-emerald-700/10 hover:shadow-emerald-700/20 active:shadow-none flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Masuk Sekarang</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-mono">
            SKEDUL TANI v1.0.0 • PROTOTYPE PWA SYSTEM
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN INTERFACE ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col selection:bg-emerald-200">
      
      {/* HEADER BAR */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-700 rounded-xl text-white">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg font-display text-emerald-800 tracking-tight">Skedul Tani</span>
              <span className="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-widest font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">PWA Sheets Client</span>
            </div>
          </div>

          {/* Action Center */}
          <div className="flex items-center gap-3">
            {/* Sync Split Button Group */}
            <div className="relative flex items-center bg-slate-100 border border-slate-200/80 rounded-xl overflow-hidden hover:border-slate-300 hover:bg-slate-200/20 transition-all">
              {/* Main Google Sheets Sync Trigger */}
              <button
                onClick={() => {
                  setSyncStatus("idle");
                  setSyncMessage("");
                  setShowSyncModal(true);
                }}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-200/60 active:bg-slate-300/40 text-slate-700 text-xs font-semibold transition-all cursor-pointer border-r border-slate-250/50"
                title="Buka sinkronisasi & petunjuk"
              >
                <Database className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Google Sheets Sync</span>
                {syncConfig.appsScriptUrl ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </button>

              {/* Small Dropdown Menu Trigger Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSyncDropdown(!showSyncDropdown);
                }}
                className={`p-1.5 hover:bg-slate-200/60 active:bg-slate-300/40 text-slate-500 hover:text-slate-800 transition-all cursor-pointer flex items-center justify-center ${
                  showSyncDropdown ? "bg-slate-200/75 text-slate-800" : ""
                }`}
                title="Kelola Sinkronisasi"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>

              {/* Dropdown Menu Portal */}
              <AnimatePresence>
                {showSyncDropdown && (
                  <>
                    {/* Click backdrop to close */}
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowSyncDropdown(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1.5 overflow-hidden text-left"
                    >
                      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Status Sinkronisasi</span>
                        <span className="block text-xs font-semibold text-slate-600 truncate mt-0.5">
                          {syncConfig.appsScriptUrl ? "Terhubung ke Sheets" : "Belum Terhubung"}
                        </span>
                      </div>
                      
                      <button
                        onClick={() => {
                          setShowSyncDropdown(false);
                          handlePushToSheets();
                        }}
                        disabled={!syncConfig.appsScriptUrl}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kirim ke Google Sheets (Push)</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowSyncDropdown(false);
                          handlePullFromSheets();
                        }}
                        disabled={!syncConfig.appsScriptUrl}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Database className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Unduh dari Google Sheets (Pull)</span>
                      </button>

                      <div className="border-t border-slate-100 my-1" />

                      <button
                        onClick={() => {
                          setShowSyncDropdown(false);
                          setSyncStatus("idle");
                          setSyncMessage("");
                          setShowSyncModal(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                      >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span>Pengaturan &amp; Petunjuk</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Menu */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800">{session.email}</span>
                <span className="text-[10px] text-slate-500">Sesi aktif: {sessionDaysLeft} hari lagi</span>
              </div>
              <button
                onClick={handleLogout}
                title="Keluar"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN: Crop Manager */}
        <section className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-5">
          {/* Section Heading */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-700" />
                <h2 className="font-semibold text-slate-800 text-sm tracking-tight">Daftar Komoditas</h2>
              </div>
              <button
                onClick={() => setShowAddCropModal(true)}
                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                title="Tambah Komoditas Baru"
              >
                <PlusCircle className="w-5 h-5" />
              </button>
            </div>

            {crops.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 p-4">
                <Sprout className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-500 mb-3">Belum ada tanaman terdaftar</p>
                <button
                  onClick={() => setShowAddCropModal(true)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs rounded-lg transition-all"
                >
                  Tambah Tanaman
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                {crops.map((crop) => {
                  const isActive = crop.id === selectedCropId;
                  // count activities for this crop
                  const actCount = activities.filter(a => a.cropId === crop.id).length;

                  return (
                    <div
                      key={crop.id}
                      onClick={() => {
                        setSelectedCropId(crop.id);
                        setSelectedWeek("all"); // Reset week filter
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col relative group ${
                        isActive
                          ? "bg-emerald-50/70 border-emerald-200 shadow-sm"
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className={`font-semibold text-sm ${isActive ? "text-emerald-900" : "text-slate-800"}`}>
                          {crop.name}
                        </span>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCrop(crop.id);
                          }}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"
                          title="Hapus Tanaman"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Mulai: {new Date(crop.startDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                      </div>

                      <div className="mt-2.5 pt-2.5 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
                          {actCount} Kegiatan
                        </span>
                        {isActive && (
                          <span className="text-emerald-700 flex items-center gap-1">
                            Aktif <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: Timeline Visualizer */}
        <section className="flex-1 flex flex-col gap-5 min-w-0">
          
          {/* Active Crop Info & Filter Bar */}
          {activeCrop ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col gap-4">
              {/* Header Info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      HARI KE-{activeCropAgeInDays > 0 ? activeCropAgeInDays : 0} SEJAK TANAM
                    </span>
                  </div>
                  <h1 className="text-xl font-bold font-display text-slate-900 tracking-tight">
                    {activeCrop.name}
                  </h1>
                  {activeCrop.notes && (
                    <p className="text-xs text-slate-500 mt-1 italic font-medium">
                      "{activeCrop.notes}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <button
                    onClick={() => {
                      setActCategory(categories[0]?.name || "");
                      setActDate(new Date().toISOString().split("T")[0]);
                      setShowAddActivityModal(true);
                    }}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-emerald-700/10 hover:shadow-emerald-700/20 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Kegiatan</span>
                  </button>
                </div>
              </div>

              {/* Weeks Slider Bar */}
              <div>
                <span className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
                  Timeline Berdasarkan Minggu Kegiatan
                </span>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
                  <button
                    onClick={() => setSelectedWeek("all")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      selectedWeek === "all"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Semua Minggu
                  </button>
                  
                  {weekList.map((week) => {
                    const isCurrent = week !== "pra" && Math.floor(activeCropAgeInDays / 7) + 1 === parseInt(week);
                    const range = getWeekDateRange(week, activeCrop.startDate);
                    
                    return (
                      <button
                        key={week}
                        onClick={() => setSelectedWeek(week)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                          selectedWeek === week
                            ? "bg-emerald-700 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        <span>{week === "pra" ? "Pra-Tanam" : `Minggu ${week}`}</span>
                        <span className={`text-[10px] font-mono px-1 rounded ${
                          selectedWeek === week ? "bg-emerald-800 text-emerald-200" : "bg-slate-200/80 text-slate-500"
                        }`}>
                          {range}
                        </span>
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Search & Secondary Filter Block */}
              <div className="flex flex-col md:flex-row items-center gap-3 pt-1">
                {/* Search */}
                <div className="relative w-full md:flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari kegiatan, merk, dosis, fungsi..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <SlidersHorizontal className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full md:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-700 cursor-pointer"
                  >
                    <option value="all">Semua Kategori</option>
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-slate-200/60 shadow-sm text-center">
              <Sprout className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h2 className="text-base font-bold text-slate-800 mb-1">Mulai Kelola Skedul Tani</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Pilih komoditas di panel kiri atau tambahkan tanaman baru untuk mulai menjadwalkan kegiatan tani Anda.
              </p>
              <button
                onClick={() => setShowAddCropModal(true)}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold transition-all cursor-pointer"
              >
                Tambah Tanaman Baru
              </button>
            </div>
          )}

          {/* TIMELINE LIST */}
          {activeCrop && (
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/60 shadow-sm flex-1 flex flex-col min-h-[300px]">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-2.5 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {viewMode === "timeline" ? "Timeline Kegiatan" : "Tabel Kegiatan"} ({filteredActivities.length} Terdaftar)
                  </span>
                </div>

                {/* Switcher & Legend */}
                <div className="flex items-center gap-3.5 flex-wrap">
                  {/* View Mode Toggle Button Group */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setViewMode("timeline")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        viewMode === "timeline"
                          ? "bg-white text-emerald-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <List className="w-3.5 h-3.5" />
                      <span>Linimasa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        viewMode === "table"
                          ? "bg-white text-emerald-800 shadow-xs"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Tabel</span>
                    </button>
                  </div>

                  {/* Visual Legend */}
                  {viewMode === "timeline" && (
                    <div className="hidden sm:flex items-center gap-3 text-[10px] text-slate-400 font-mono">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-1 bg-amber-400 rounded-full" />
                        <span>Pemupukan</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-1 bg-rose-500 rounded-full" />
                        <span>Insektisida</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-1 bg-indigo-500 rounded-full" />
                        <span>Pruning</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {filteredActivities.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <ActivityIcon className="w-10 h-10 text-slate-300 mb-2.5" />
                  <p className="text-xs font-semibold text-slate-600">Tidak ada kegiatan ditemukan</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
                    Coba sesuaikan kata kunci pencarian, filter kategori, atau tambahkan kegiatan tani baru.
                  </p>
                </div>
              ) : viewMode === "timeline" ? (
                <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                  <AnimatePresence initial={false}>
                    {filteredActivities.map((act) => {
                      const colors = getCategoryColor(act.category);
                      const weekInfo = getActivityWeekInfo(act.date, activeCrop.startDate);
                      const dateObj = new Date(act.date);
                      const formattedDate = dateObj.toLocaleDateString("id-ID", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric"
                      });

                      return (
                        <motion.div
                          key={act.id}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="relative group"
                        >
                          {/* Timeline dot */}
                          <div className={`absolute -left-[22px] sm:-left-[30px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white ring-4 ring-slate-50 transition-all ${colors.dot} group-hover:scale-125 z-10`} />

                          {/* Card Content */}
                          <div className={`p-4 bg-white rounded-xl border-l-4 border border-slate-150 transition-all hover:shadow-md ${colors.border}`}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                              {/* Category Badge & Date */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                                  {act.category}
                                </span>
                                <span className="text-xs font-bold text-slate-400 font-mono">
                                  {weekInfo.weekNum === "pra" ? "Pra-Tanam" : `Minggu ${weekInfo.weekNum} • Hari ${weekInfo.dayNum}`}
                                </span>
                              </div>

                              {/* Action tools */}
                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                <button
                                  onClick={() => handleDeleteActivity(act.id)}
                                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Hapus Kegiatan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Main Activity Details */}
                            <p className="text-xs text-slate-800 font-medium leading-relaxed mb-3">
                              {act.description}
                            </p>

                            {/* Additional parameters: Brand, Dosage, Function */}
                            {(act.brand !== "-" || act.dosage !== "-" || act.function !== "-") && (
                              <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex flex-wrap gap-x-6 gap-y-2 text-[11px] font-medium text-slate-600">
                                {act.brand && act.brand !== "-" && (
                                  <div>
                                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Merk / Varian</span>
                                    <span className="text-slate-700">{act.brand}</span>
                                  </div>
                                )}
                                {act.dosage && act.dosage !== "-" && (
                                  <div>
                                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Dosis / Konsentrasi</span>
                                    <span className="text-slate-700">{act.dosage}</span>
                                  </div>
                                )}
                                {act.function && act.function !== "-" && (
                                  <div className="flex-1 min-w-[150px]">
                                    <span className="text-slate-400 block text-[9px] uppercase tracking-wider font-bold">Tujuan / Fungsi</span>
                                    <span className="text-slate-700 leading-tight">{act.function}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Absolute Date Stamp */}
                            <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
                              <Clock className="w-3 h-3 text-slate-300" />
                              <span>Pelaksanaan: {formattedDate}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              ) : (
                /* TABLE VIEW */
                <div className="overflow-x-auto border border-slate-200/60 rounded-xl bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        <th className="py-3.5 px-4">Tanggal</th>
                        <th className="py-3.5 px-4">Jadwal Tanam</th>
                        <th className="py-3.5 px-4">Kategori</th>
                        <th className="py-3.5 px-4">Uraian / Deskripsi</th>
                        <th className="py-3.5 px-4">Merk / Varian</th>
                        <th className="py-3.5 px-4">Dosis</th>
                        <th className="py-3.5 px-4">Fungsi / Tujuan</th>
                        <th className="py-3.5 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredActivities.map((act) => {
                        const colors = getCategoryColor(act.category);
                        const weekInfo = getActivityWeekInfo(act.date, activeCrop.startDate);
                        const dateObj = new Date(act.date);
                        const formattedDate = dateObj.toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        });
                        return (
                          <tr key={act.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-4 font-semibold text-slate-600 whitespace-nowrap">
                              {formattedDate}
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-500 whitespace-nowrap">
                              {weekInfo.weekNum === "pra" ? (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold">
                                  Pra-Tanam
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold">
                                  Minggu {weekInfo.weekNum} • Hari {weekInfo.dayNum}
                                </span>
                              )}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${colors.bg} ${colors.text}`}>
                                {act.category}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-medium text-slate-800 max-w-xs break-words">
                              {act.description}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              {act.brand && act.brand !== "-" ? act.brand : <span className="text-slate-300 font-normal">-</span>}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">
                              {act.dosage && act.dosage !== "-" ? act.dosage : <span className="text-slate-300 font-normal">-</span>}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium max-w-[180px] truncate" title={act.function}>
                              {act.function && act.function !== "-" ? act.function : <span className="text-slate-300 font-normal">-</span>}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <button
                                onClick={() => handleDeleteActivity(act.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all inline-flex items-center justify-center cursor-pointer"
                                title="Hapus Kegiatan"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {/* --- MODAL: SYNC CONFIGURATION --- */}
      <AnimatePresence>
        {showSyncModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/45 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-bold text-base font-display">Pengaturan Google Sheets Sync</h3>
                </div>
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-5">
                
                {/* Status Box */}
                {syncStatus !== "idle" && (
                  <div className={`p-4 rounded-xl flex items-start gap-3 text-xs border ${
                    syncStatus === "loading" ? "bg-slate-50 border-slate-200 text-slate-700" :
                    syncStatus === "success" ? "bg-emerald-50 border-emerald-100 text-emerald-800" :
                    "bg-rose-50 border-rose-100 text-rose-800"
                  }`}>
                    {syncStatus === "loading" && <RefreshCw className="w-4 h-4 text-slate-500 animate-spin mt-0.5 flex-shrink-0" />}
                    {syncStatus === "success" && <Check className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />}
                    {syncStatus === "error" && <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 flex-shrink-0" />}
                    <span className="font-medium">{syncMessage}</span>
                  </div>
                )}

                {/* Configuration Input */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                      URL Web App Google Apps Script
                    </label>
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={syncConfig.appsScriptUrl}
                      onChange={(e) => saveSyncConfig(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs font-mono text-slate-700"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-1">
                    <button
                      onClick={handlePushToSheets}
                      disabled={syncStatus === "loading" || !syncConfig.appsScriptUrl}
                      className="w-full sm:flex-1 py-2 px-4 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "loading" ? "animate-spin" : ""}`} />
                      <span>Kirim ke Google Sheets (Push)</span>
                    </button>

                    <button
                      onClick={handlePullFromSheets}
                      disabled={syncStatus === "loading" || !syncConfig.appsScriptUrl}
                      className="w-full sm:flex-1 py-2 px-4 bg-slate-800 hover:bg-slate-900 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Database className="w-3.5 h-3.5" />
                      <span>Unduh dari Google Sheets (Pull)</span>
                    </button>
                  </div>

                  {syncConfig.lastSynced && (
                    <div className="text-[10px] text-slate-400 font-mono text-right">
                      Terakhir disinkronisasi: {new Date(syncConfig.lastSynced).toLocaleString("id-ID")}
                    </div>
                  )}
                </div>

                {/* Installation steps */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-emerald-700" />
                    Cara Menghubungkan Spreadsheet "skedultani"
                  </h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Data Anda disimpan di file spreadsheet Anda sendiri secara mandiri. Ikuti langkah-langkah di bawah untuk menghubungkannya:
                  </p>

                  <div className="text-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-150 text-slate-600">
                    <p><b>1.</b> Masuk ke Google Drive menggunakan akun <span className="font-semibold text-emerald-800 font-mono">appdb74@gmail.com</span>.</p>
                    <p><b>2.</b> Buat spreadsheet kosong baru dan beri nama <span className="font-semibold text-emerald-800 font-mono">skedultani</span>.</p>
                    <p><b>3.</b> Pada spreadsheet tersebut, buka menu <b>Ekstensi &gt; Apps Script</b>.</p>
                    <p><b>4.</b> Klik tombol di bawah ini untuk menyalin kode Apps Script yang siap pakai:</p>
                    
                    <button
                      onClick={handleCopyScript}
                      className="my-1 py-2 px-4 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCode ? "Berhasil Disalin!" : "Salin Kode Apps Script"}</span>
                    </button>

                    <p><b>5.</b> Tempel kode tersebut di jendela Apps Script Anda, simpan (ikon disket).</p>
                    <p><b>6.</b> Klik tombol <b>Terapkan (Deploy) &gt; Penerapan Baru (New deployment)</b>.</p>
                    <p><b>7.</b> Pilih jenis <b>Aplikasi Web (Web App)</b>, konfigurasikan:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-500">
                      <li>Jalankan sebagai: <b>Saya (appdb74@gmail.com)</b></li>
                      <li>Siapa yang memiliki akses: <b>Siapa saja (Anyone)</b></li>
                    </ul>
                    <p className="mt-2"><b>8.</b> Klik Deploy, izinkan otorisasi akses (klik Advanced &gt; Go to ... jika muncul peringatan), lalu salin URL Aplikasi Web yang diberikan dan masukkan pada isian URL di atas.</p>
                  </div>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: ADD CROP --- */}
      <AnimatePresence>
        {showAddCropModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100"
            >
              <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
                <h3 className="font-bold text-base font-display">Tambah Komoditas Baru</h3>
                <button
                  onClick={() => setShowAddCropModal(false)}
                  className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCrop} className="p-6 space-y-4">
                <div>
                  <label htmlFor="cropName" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Nama Tanaman / Komoditas
                  </label>
                  <input
                    id="cropName"
                    type="text"
                    required
                    placeholder="Contoh: Cabai Merah Besar, Jagung Manis"
                    value={newCropName}
                    onChange={(e) => setNewCropName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label htmlFor="startDate" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Tanggal Mulai Tanam / Semai
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    required
                    value={newCropStartDate}
                    onChange={(e) => setNewCropStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs font-medium text-slate-800"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Keterangan Singkat / Catatan (Opsional)
                  </label>
                  <textarea
                    id="notes"
                    placeholder="Contoh: Lahan bedengan utama, irigasi selang tetes."
                    rows={2}
                    value={newCropNotes}
                    onChange={(e) => setNewCropNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs font-medium text-slate-800"
                  />
                </div>

                <div className="flex items-center gap-3.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddCropModal(false)}
                    className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Simpan Tanaman
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MODAL: ADD ACTIVITY --- */}
      <AnimatePresence>
        {showAddActivityModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col"
            >
              <div className="bg-emerald-800 text-white p-5 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-base font-display">Tambah Kegiatan Tani</h3>
                  <span className="text-[10px] text-emerald-200 font-medium">Tanaman: {activeCrop?.name}</span>
                </div>
                <button
                  onClick={() => setShowAddActivityModal(false)}
                  className="p-1 hover:bg-emerald-700 rounded-lg text-emerald-100 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddActivity} className="p-6 overflow-y-auto space-y-4">
                
                {/* Category Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Kategori Kegiatan
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddCategoryInline(!showAddCategoryInline)}
                      className="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>{showAddCategoryInline ? "Batal Kategori" : "Buat Kategori Baru"}</span>
                    </button>
                  </div>

                  {/* Inline Category Addition Form */}
                  {showAddCategoryInline && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-dashed border-emerald-200 mb-3 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            placeholder="Nama Kategori (contoh: Penyiraman)"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                            className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <select
                          value={newCatColor}
                          onChange={(e) => setNewCatColor(e.target.value)}
                          className="px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none"
                        >
                          <option value="emerald">Emerald</option>
                          <option value="teal">Teal</option>
                          <option value="amber">Amber</option>
                          <option value="indigo">Indigo</option>
                          <option value="rose">Rose</option>
                          <option value="purple">Purple</option>
                          <option value="orange">Orange</option>
                          <option value="slate">Slate</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCategory}
                        className="py-1 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold"
                      >
                        Tambah Kategori
                      </button>
                    </div>
                  )}

                  <select
                    required
                    value={actCategory}
                    onChange={(e) => setActCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs font-medium text-slate-800 cursor-pointer"
                  >
                    <option value="" disabled>-- Pilih Kategori --</option>
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label htmlFor="actDate" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Tanggal Pelaksanaan
                  </label>
                  <input
                    id="actDate"
                    type="date"
                    required
                    value={actDate}
                    onChange={(e) => setActDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs font-medium text-slate-800"
                  />
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="actDesc" className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">
                    Uraian / Keterangan Detail
                  </label>
                  <textarea
                    id="actDesc"
                    required
                    rows={2}
                    placeholder="Contoh: Pemberian pupuk susulan pada bedengan bagian utara..."
                    value={actDescription}
                    onChange={(e) => setActDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-xs font-medium text-slate-800"
                  />
                </div>

                {/* Chemical / Input Details */}
                <div className="border-t border-slate-100 pt-3.5 space-y-3.5">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Spesifikasi Bahan / Input (Opsional)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="actBrand" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                        Merk / Varian
                      </label>
                      <input
                        id="actBrand"
                        type="text"
                        placeholder="Contoh: NPK Mutiara, Antracol"
                        value={actBrand}
                        onChange={(e) => setActBrand(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-xs"
                      />
                    </div>

                    <div>
                      <label htmlFor="actDosage" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                        Dosis / Konsentrasi
                      </label>
                      <input
                        id="actDosage"
                        type="text"
                        placeholder="Contoh: 2 gram / liter air"
                        value={actDosage}
                        onChange={(e) => setActDosage(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="actFunc" className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">
                      Tujuan / Fungsi
                    </label>
                    <input
                      id="actFunc"
                      type="text"
                      placeholder="Contoh: Pencegahan jamur patek, memperkuat batang"
                      value={actFunction}
                      onChange={(e) => setActFunction(e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none text-xs"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-3.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddActivityModal(false)}
                    className="w-1/2 py-2.5 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-600 transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Simpan Kegiatan
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
