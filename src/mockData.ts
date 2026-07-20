import { Crop, Activity, Category } from "./types";

export const DEFAULT_CATEGORIES: Category[] = [
  { name: "Pembibitan", isCustom: false, color: "teal" },
  { name: "Penanaman", isCustom: false, color: "emerald" },
  { name: "Pemupukan", isCustom: false, color: "amber" },
  { name: "Pruning", isCustom: false, color: "indigo" },
  { name: "Spray Insektisida", isCustom: false, color: "rose" },
  { name: "Fungisida", isCustom: false, color: "purple" },
  { name: "Panen", isCustom: false, color: "orange" },
];

export const INITIAL_CROPS: Crop[] = [
  {
    id: "crop-1",
    name: "Cabai Rawit Dewata",
    startDate: "2026-06-25", // ~3.5 weeks ago based on July 19, 2026
    notes: "Ditanam di bedengan dengan mulsa plastik, penyiraman tetes.",
  },
  {
    id: "crop-2",
    name: "Tomat Cherry Ruby",
    startDate: "2026-07-05", // ~2 weeks ago
    notes: "Sistem hidroponik dft di green house.",
  },
  {
    id: "crop-3",
    name: "Sawi Pagoda (Ta Ke Cai)",
    startDate: "2026-07-15", // ~4 days ago
    notes: "Penyemaian awal langsung di rockwool.",
  }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  // Cabai Rawit Dewata (crop-1)
  {
    id: "act-1",
    cropId: "crop-1",
    category: "Pembibitan",
    date: "2026-06-25",
    description: "Penyemaian benih cabai rawit Dewata pada tray semai dengan media cocopeat & kompos.",
    brand: "Cap Panah Merah",
    dosage: "1 biji per lubang",
    function: "Persiapan bibit unggul tahan penyakit layu bakteri.",
  },
  {
    id: "act-2",
    cropId: "crop-1",
    category: "Penanaman",
    date: "2026-07-02",
    description: "Pemindahan bibit cabai umur 7 hari ke lubang tanam bedengan.",
    brand: "-",
    dosage: "-",
    function: "Penanaman utama lapangan.",
  },
  {
    id: "act-3",
    cropId: "crop-1",
    category: "Pemupukan",
    date: "2026-07-09",
    description: "Pemupukan susulan pertama (kocor) untuk fase vegetatif awal.",
    brand: "NPK Mutiara 16-16-16",
    dosage: "5 gram / liter air per lubang",
    function: "Mempercepat pertumbuhan akar dan daun.",
  },
  {
    id: "act-4",
    cropId: "crop-1",
    category: "Spray Insektisida",
    date: "2026-07-12",
    description: "Pencegahan thrips dan tungau penyebab daun keriting.",
    brand: "Demolish 18EC",
    dosage: "1 ml / liter air",
    function: "Melindungi tanaman dari hama pengisap daun.",
  },
  {
    id: "act-5",
    cropId: "crop-1",
    category: "Pruning",
    date: "2026-07-18",
    description: "Pruning tunas air yang tumbuh di bawah cabang Y utama.",
    brand: "-",
    dosage: "-",
    function: "Fokus penyaluran nutrisi ke pembentukan batang utama dan cabang produktif.",
  },
  {
    id: "act-6",
    cropId: "crop-1",
    category: "Fungisida",
    date: "2026-07-21", // Scheduled
    description: "Penyemprotan preventif terhadap jamur patogen/patek menjelang musim pancaroba.",
    brand: "Antracol 70WP",
    dosage: "2 gram / liter air",
    function: "Mencegah bercak daun dan antraknosa.",
  },

  // Tomat Cherry (crop-2)
  {
    id: "act-7",
    cropId: "crop-2",
    category: "Pembibitan",
    date: "2026-07-05",
    description: "Penyemaian benih tomat cherry dalam media rockwool basah.",
    brand: "Known-You Seed",
    dosage: "1 benih / lubang",
    function: "Bibit hidroponik steril.",
  },
  {
    id: "act-8",
    cropId: "crop-2",
    category: "Penanaman",
    date: "2026-07-12",
    description: "Pindah tanam bibit tomat cherry ke netpot instalasi DFT.",
    brand: "Nutrisi AB Mix Tomat",
    dosage: "EC 1.2 (approx 600 ppm)",
    function: "Adaptasi media tanam air mengalir.",
  },
  {
    id: "act-9",
    cropId: "crop-2",
    category: "Pemupukan",
    date: "2026-07-19",
    description: "Peningkatan kadar nutrisi AB Mix untuk memaksimalkan laju pertumbuhan daun.",
    brand: "AB Mix Premium",
    dosage: "EC naik ke 1.8 (approx 900 ppm)",
    function: "Kebutuhan unsur makro nitrogen & kalium fase vegetatif aktif.",
  },

  // Sawi Pagoda (crop-3)
  {
    id: "act-10",
    cropId: "crop-3",
    category: "Pembibitan",
    date: "2026-07-15",
    description: "Pecah benih (sprouting) sawi pagoda di wadah semai gelap.",
    brand: "Ta Ke Cai Import",
    dosage: "100 benih",
    function: "Merangsang pecah kecambah serentak.",
  }
];
