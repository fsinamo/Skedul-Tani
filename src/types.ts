export interface Crop {
  id: string;
  name: string;
  startDate: string;
  notes?: string;
}

export interface Activity {
  id: string;
  cropId: string;
  category: string;
  date: string;
  description: string;
  brand?: string;
  dosage?: string;
  function?: string;
}

export interface Category {
  name: string;
  isCustom: boolean;
  color: string; // Tailwind color name e.g. "emerald", "amber", "blue"
}

export interface UserSession {
  email: string;
  loginTime: number; // timestamp
  expiryTime: number; // timestamp
}

export interface SyncConfig {
  appsScriptUrl: string;
  lastSynced?: number;
}
