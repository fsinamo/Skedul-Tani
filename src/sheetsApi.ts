import { Crop, Activity, Category } from "./types";

export const APPS_SCRIPT_CODE = `/**
 * GOOGLE APPS SCRIPT UNTUK SKEDUL TANI
 * 
 * Petunjuk Instalasi:
 * 1. Buka Google Sheets menggunakan akun appdb74@gmail.com.
 * 2. Buat spreadsheet baru atau buka spreadsheet "skedultani".
 * 3. Pilih menu "Ekstensi" > "Apps Script".
 * 4. Hapus seluruh kode bawaan yang ada, lalu salin & tempel kode di bawah ini.
 * 5. Klik ikon Simpan (Save).
 * 6. Klik "Terapkan" (Deploy) > "Penerapan Baru" (New deployment).
 * 7. Klik ikon gerigi di sebelah "Pilih jenis" (Select type) lalu pilih "Aplikasi web" (Web app).
 * 8. Konfigurasikan:
 *    - Deskripsi: API Skedul Tani
 *    - Jalankan sebagai (Execute as): Saya (appdb74@gmail.com)
 *    - Siapa yang memiliki akses (Who has access): Siapa saja (Anyone)
 * 9. Klik "Terapkan" (Deploy).
 * 10. Jika muncul "Otorisasi akses" (Authorize access), berikan izin yang diminta (pilih akun Anda, klik Advanced, klik Go to Untitled Project (unsafe), lalu klik Allow).
 * 11. Salin "URL Aplikasi web" (dimulai dengan https://script.google.com/macros/s/...) dan tempel ke pengaturan Sinkronisasi di aplikasi Skedul Tani Anda.
 */

function doGet(e) {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  
  // Inisialisasi sheet jika belum ada
  initSheets(spreadsheet);
  
  var crops = getSheetData(spreadsheet.getSheetByName("Crops"));
  var activities = getSheetData(spreadsheet.getSheetByName("Activities"));
  var categories = getSheetData(spreadsheet.getSheetByName("Categories"));
  
  var result = {
    crops: crops,
    activities: activities,
    categories: categories
  };
  
  return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result }))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*");
}

function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    
    initSheets(spreadsheet);
    
    if (postData.action === "syncAll") {
      syncSheetData(spreadsheet.getSheetByName("Crops"), postData.crops);
      syncSheetData(spreadsheet.getSheetByName("Activities"), postData.activities);
      syncSheetData(spreadsheet.getSheetByName("Categories"), postData.categories);
      
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Data berhasil disinkronisasi!" }))
        .setMimeType(ContentService.MimeType.JSON)
        .setHeader("Access-Control-Allow-Origin", "*");
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Aksi tidak dikenal" }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeader("Access-Control-Allow-Origin", "*");
  }
}

function initSheets(spreadsheet) {
  if (!spreadsheet.getSheetByName("Crops")) {
    var sheet = spreadsheet.insertSheet("Crops");
    sheet.appendRow(["id", "name", "startDate", "notes"]);
  }
  if (!spreadsheet.getSheetByName("Activities")) {
    var sheet = spreadsheet.insertSheet("Activities");
    sheet.appendRow(["id", "cropId", "category", "date", "description", "brand", "dosage", "function"]);
  }
  if (!spreadsheet.getSheetByName("Categories")) {
    var sheet = spreadsheet.insertSheet("Categories");
    sheet.appendRow(["name", "isCustom", "color"]);
  }
}

function getSheetData(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  
  var headers = rows[0];
  var data = [];
  
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var val = row[j];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
      }
      obj[headers[j]] = val;
    }
    data.push(obj);
  }
  return data;
}

function syncSheetData(sheet, dataList) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  
  if (!dataList || dataList.length === 0) return;
  
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rowsToAppend = [];
  
  for (var i = 0; i < dataList.length; i++) {
    var obj = dataList[i];
    var row = [];
    for (var j = 0; j < headers.length; j++) {
      var field = headers[j];
      var val = obj[field] !== undefined ? obj[field] : "";
      row.push(val);
    }
    rowsToAppend.push(row);
  }
  
  sheet.getRange(2, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
}
`;

export interface SyncResponse {
  status: "success" | "error";
  message?: string;
  data?: {
    crops: Crop[];
    activities: Activity[];
    categories: Category[];
  };
}

export async function fetchFromGoogleSheets(url: string): Promise<SyncResponse> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error("URL Google Apps Script belum dikonfigurasi.");
  }

  try {
    const response = await fetch(`/api/sync?url=${encodeURIComponent(cleanUrl)}`, {
      method: "GET"
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as SyncResponse;
  } catch (error) {
    console.error("Gagal mengambil data dari Google Sheets:", error);
    throw new Error(error instanceof Error ? error.message : "Terjadi kesalahan koneksi.");
  }
}

export async function syncToGoogleSheets(
  url: string,
  payload: { crops: Crop[]; activities: Activity[]; categories: Category[] }
): Promise<SyncResponse> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    throw new Error("URL Google Apps Script belum dikonfigurasi.");
  }

  try {
    const postPayload = {
      action: "syncAll",
      ...payload,
    };

    const response = await fetch(`/api/sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: cleanUrl,
        payload: postPayload
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data as SyncResponse;
  } catch (error) {
    console.error("Gagal menyinkronkan data ke Google Sheets:", error);
    throw new Error(error instanceof Error ? error.message : "Terjadi kesalahan koneksi.");
  }
}
