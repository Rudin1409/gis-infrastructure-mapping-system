// ==============================================================================
// GOOGLE APPS SCRIPT: BACKEND DATABASE & CLOUD FOTO GIS KOTA LUBUKLINGGAU
// (SEMUA NAMA TABEL & KOLOM 100% BAHASA INDONESIA)
// ==============================================================================

var FOLDER_NAME = 'FOTO_SURVEI_TIANG_LUBUKLINGGAU';

// 1. Sheet DATA_TIANG (Tabel Utama Tiang Utilitas GIS)
var POLE_SHEET_NAME = 'DATA_TIANG';
var POLE_HEADERS = [
  'ID_Tiang',
  'Kode_Fisik_Tiang',
  'Latitude_GIS',
  'Longitude_GIS',
  'Latitude_GPS_Device',
  'Longitude_GPS_Device',
  'Akurasi_GPS_Meter',
  'Jarak_Deviasi_Meter',
  'Metode_Penentuan_Lokasi',
  'ID_Provider',
  'Nama_Provider_Operator',
  'Jenis_Tiang',
  'Kondisi_Tiang',
  'Nama_Jalan_Lokasi',
  'Kelurahan',
  'Kecamatan',
  'Kota_Kabupaten',
  'Patokan_Lokasi',
  'Sisi_Jalan',
  'Tinggi_Tiang',
  'Status_Kepemilikan',
  'Bahaya_Tiang_Miring',
  'Bahaya_Kabel_Semrawut',
  'Bahaya_Kabel_Rendah',
  'Bahaya_Karat_Retak',
  'Mengganggu_Jalan_Trotoar',
  'Potensi_Bahaya_Lain',
  'Catatan_Keterangan_Lapangan',
  'ID_File_Google_Drive',
  'Link_Foto_Google_Drive',
  'ID_Surveyor',
  'Nama_Petugas_Surveyor',
  'Tanggal_Survey',
  'Waktu_Survey',
  'Status_Validasi',
  'Catatan_Validasi',
  'Waktu_Dibuat',
  'Waktu_Diperbarui'
];

// 2. Sheet DATA_PROVIDER (Master 20+ Operator Provider)
var PROVIDER_SHEET_NAME = 'DATA_PROVIDER';
var PROVIDER_HEADERS = [
  'ID_Provider',
  'Nama_Provider',
  'Kode_Singkatan',
  'Kode_Warna_Hex',
  'Status_Aktif'
];

// 3. Sheet JALUR_KABEL_FO (Master Segmen Topologi Jaringan Kabel FO)
var SEGMENT_SHEET_NAME = 'JALUR_KABEL_FO';
var SEGMENT_HEADERS = [
  'ID_Segmen',
  'Kode_Segmen_Kabel',
  'ID_Tiang_Pangkal',
  'ID_Tiang_Ujung',
  'ID_Provider',
  'Nama_Provider',
  'Jenis_Jaringan',
  'Tipe_Pemasangan',
  'Estimasi_Jarak_Meter',
  'Status_Jalur',
  'Keterangan_Jalur',
  'Waktu_Dibuat',
  'Waktu_Diperbarui'
];

// 4. Sheet DATA_SURVEYOR (Data Akun Petugas & Surveyor)
var USER_SHEET_NAME = 'DATA_SURVEYOR';
var USER_HEADERS = [
  'ID_Pengguna',
  'Nama_Lengkap',
  'Email',
  'Password',
  'Peran_Role',
  'Instansi_Dinas',
  'No_Handphone',
  'Status_Akun',
  'Waktu_Terdaftar'
];

// ==============================================================================
// FUNGSI UTAMA: PERBARUI TABEL LAMA KE BAHASA INDONESIA (1-KLIK RUN)
// ==============================================================================
function initialSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Rename sheet lama jika ada atau buat baru
  var poleSheet = ss.getSheetByName('POLES') || ss.getSheetByName(POLE_SHEET_NAME);
  if (poleSheet) {
    poleSheet.setName(POLE_SHEET_NAME);
  } else {
    poleSheet = ss.insertSheet(POLE_SHEET_NAME);
  }
  // Tulis ulang header baris 1 ke Bahasa Indonesia
  poleSheet.getRange(1, 1, 1, POLE_HEADERS.length).setValues([POLE_HEADERS]);
  poleSheet.setFrozenRows(1);
  poleSheet.getRange(1, 1, 1, POLE_HEADERS.length).setFontWeight('bold').setBackground('#dbeafe');

  // 2. Rename PROVIDERS -> DATA_PROVIDER
  var provSheet = ss.getSheetByName('PROVIDERS') || ss.getSheetByName(PROVIDER_SHEET_NAME);
  if (provSheet) {
    provSheet.setName(PROVIDER_SHEET_NAME);
  } else {
    provSheet = ss.insertSheet(PROVIDER_SHEET_NAME);
  }
  provSheet.getRange(1, 1, 1, PROVIDER_HEADERS.length).setValues([PROVIDER_HEADERS]);
  provSheet.setFrozenRows(1);
  provSheet.getRange(1, 1, 1, PROVIDER_HEADERS.length).setFontWeight('bold').setBackground('#dbeafe');

  // 3. Rename NETWORK_SEGMENTS -> JALUR_KABEL_FO
  var segSheet = ss.getSheetByName('NETWORK_SEGMENTS') || ss.getSheetByName(SEGMENT_SHEET_NAME);
  if (segSheet) {
    segSheet.setName(SEGMENT_SHEET_NAME);
  } else {
    segSheet = ss.insertSheet(SEGMENT_SHEET_NAME);
  }
  segSheet.getRange(1, 1, 1, SEGMENT_HEADERS.length).setValues([SEGMENT_HEADERS]);
  segSheet.setFrozenRows(1);
  segSheet.getRange(1, 1, 1, SEGMENT_HEADERS.length).setFontWeight('bold').setBackground('#dbeafe');

  // 4. Rename USERS -> DATA_SURVEYOR
  var userSheet = ss.getSheetByName('USERS') || ss.getSheetByName(USER_SHEET_NAME);
  if (userSheet) {
    userSheet.setName(USER_SHEET_NAME);
  } else {
    userSheet = ss.insertSheet(USER_SHEET_NAME);
  }
  userSheet.getRange(1, 1, 1, USER_HEADERS.length).setValues([USER_HEADERS]);
  userSheet.setFrozenRows(1);
  userSheet.getRange(1, 1, 1, USER_HEADERS.length).setFontWeight('bold').setBackground('#dbeafe');

  // Isi data awal akun jika masih kosong
  if (userSheet.getLastRow() <= 1) {
    var defaultUsers = [
      ['USR-KOMINFO-ADMIN', 'Admin DISKOMINFO', 'admin.kominfo@lubuklinggaukota.go.id', 'kominfo123', 'ADMIN_KOMINFO', 'Dinas Komunikasi, Informatika, Statistik dan Persandian Kota Lubuklinggau', '0812-7890-1234', 'AKTIF', '2026-08-25'],
      ['USR-BAPENDA-ADMIN', 'Admin BAPENDA', 'admin.bapenda@lubuklinggaukota.go.id', 'bapenda123', 'ADMIN_BAPENDA', 'Badan Pendapatan Daerah Kota Lubuklinggau', '0813-6789-5678', 'AKTIF', '2026-08-25'],
      ['USR-SURVEYOR-01', 'Surveyor 1 (Kominfo)', 'surveyor1@lubuklinggaukota.go.id', 'surveyor123', 'SURVEYOR', 'Dinas Kominfo Lubuklinggau', '0852-1122-3344', 'AKTIF', '2026-08-25'],
      ['USR-SURVEYOR-02', 'Surveyor 2 (Bapenda)', 'surveyor2@lubuklinggaukota.go.id', 'surveyor123', 'SURVEYOR', 'Badan Pendapatan Daerah Lubuklinggau', '0853-9988-7766', 'AKTIF', '2026-08-25']
    ];
    userSheet.getRange(2, 1, defaultUsers.length, USER_HEADERS.length).setValues(defaultUsers);
  }

  // 5. Hapus Sheet1 kosong bawaan jika ada
  var sheet1 = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
  if (sheet1 && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(sheet1);
    } catch(e) {}
  }

  // 6. Buat folder Drive jika belum ada
  getOrCreatePhotoFolder();

  Logger.log('SUKSES: Seluruh 4 Tab dan Baris Kolom berhasil diubah ke Bahasa Indonesia!');
}

function getOrCreatePhotoFolder() {
  var folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  var folder = DriveApp.createFolder(FOLDER_NAME);
  folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return folder;
}

function poleToRowArray(p) {
  return [
    p.id || '',
    p.poleCode || '',
    p.poleLatitude !== undefined ? p.poleLatitude : '',
    p.poleLongitude !== undefined ? p.poleLongitude : '',
    p.deviceLatitude !== undefined ? p.deviceLatitude : '',
    p.deviceLongitude !== undefined ? p.deviceLongitude : '',
    p.gpsAccuracy !== undefined ? p.gpsAccuracy : '',
    p.distanceFromDevice !== undefined ? p.distanceFromDevice : '',
    p.locationMethod || 'MANUAL_MAP_PIN',
    p.providerId || '',
    p.providerName || '',
    p.poleType || 'BETON',
    p.condition || 'GOOD',
    p.road || '',
    p.kelurahan || '',
    p.kecamatan || '',
    p.kota || 'Kota Lubuklinggau',
    p.patokanLokasi || '',
    p.sisiJalan || 'KIRI',
    p.height || '7m',
    p.ownershipStatus || 'SENDIRI',
    p.isTilted ? 'YA' : 'TIDAK',
    p.isMessyCable ? 'YA' : 'TIDAK',
    p.isLowCable ? 'YA' : 'TIDAK',
    p.isCorroded ? 'YA' : 'TIDAK',
    p.isObstructing ? 'YA' : 'TIDAK',
    p.isHazardous ? 'YA' : 'TIDAK',
    p.description || '',
    p.photoFileId || '',
    p.photoUrl || '',
    p.surveyorId || '',
    p.surveyorName || 'Surveyor 1',
    p.surveyDate || new Date().toISOString().split('T')[0],
    p.surveyTime || '',
    p.validationStatus || 'SUBMITTED',
    p.validationNote || '',
    p.createdAt || new Date().toISOString(),
    p.updatedAt || new Date().toISOString()
  ];
}

function rowArrayToPole(row) {
  return {
    id: String(row[0] || ''),
    poleCode: row[1] ? String(row[1]) : '',
    poleLatitude: Number(row[2]) || 0,
    poleLongitude: Number(row[3]) || 0,
    deviceLatitude: row[4] ? Number(row[4]) : undefined,
    deviceLongitude: row[5] ? Number(row[5]) : undefined,
    gpsAccuracy: row[6] ? Number(row[6]) : undefined,
    distanceFromDevice: row[7] ? Number(row[7]) : undefined,
    locationMethod: row[8] || 'MANUAL_MAP_PIN',
    providerId: String(row[9] || 'UNKNOWN'),
    providerName: row[10] ? String(row[10]) : '',
    poleType: row[11] || 'BETON',
    condition: row[12] || 'GOOD',
    road: String(row[13] || ''),
    kelurahan: String(row[14] || ''),
    kecamatan: String(row[15] || ''),
    kota: row[16] ? String(row[16]) : 'Kota Lubuklinggau',
    patokanLokasi: row[17] ? String(row[17]) : '',
    sisiJalan: row[18] || 'KIRI',
    height: row[19] ? String(row[19]) : '7m',
    ownershipStatus: row[20] || 'SENDIRI',
    isTilted: row[21] === 'YA' || row[21] === 'TRUE' || row[21] === true,
    isMessyCable: row[22] === 'YA' || row[22] === 'TRUE' || row[22] === true,
    isLowCable: row[23] === 'YA' || row[23] === 'TRUE' || row[23] === true,
    isCorroded: row[24] === 'YA' || row[24] === 'TRUE' || row[24] === true,
    isObstructing: row[25] === 'YA' || row[25] === 'TRUE' || row[25] === true,
    isHazardous: row[26] === 'YA' || row[26] === 'TRUE' || row[26] === true,
    description: row[27] ? String(row[27]) : '',
    photoFileId: row[28] ? String(row[28]) : '',
    photoUrl: row[29] ? String(row[29]) : '',
    surveyorId: row[30] ? String(row[30]) : '',
    surveyorName: row[31] ? String(row[31]) : '',
    surveyDate: String(row[32] || ''),
    surveyTime: row[33] ? String(row[33]) : '',
    validationStatus: row[34] || 'SUBMITTED',
    validationNote: row[35] ? String(row[35]) : '',
    createdAt: String(row[36] || ''),
    updatedAt: String(row[37] || '')
  };
}

// Endpoint GET: Ambil data
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) || 'getPoles';

    if (action === 'init') {
      initialSetup();
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Inisialisasi 4 Sheet Bahasa Indonesia berhasil' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Ambil Data Akun Petugas & Surveyor
    if (action === 'getUsers') {
      var userSheet = ss.getSheetByName(USER_SHEET_NAME) || ss.getSheetByName('USERS');
      if (!userSheet) {
        initialSetup();
        userSheet = ss.getSheetByName(USER_SHEET_NAME);
      }
      var userData = userSheet.getDataRange().getValues();
      if (userData.length <= 1) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      var users = userData.slice(1).map(function(row) {
        return {
          id: String(row[0] || ''),
          name: String(row[1] || ''),
          email: String(row[2] || ''),
          password: String(row[3] || ''),
          role: String(row[4] || 'SURVEYOR'),
          agency: String(row[5] || ''),
          phone: String(row[6] || ''),
          status: String(row[7] || 'AKTIF'),
          createdAt: String(row[8] || '')
        };
      });
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: users }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = ss.getSheetByName(POLE_SHEET_NAME) || ss.getSheetByName('POLES');
    if (!sheet) {
      initialSetup();
      sheet = ss.getSheetByName(POLE_SHEET_NAME);
    }

    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var rows = data.slice(1);
    var poles = rows.map(function(row) {
      return rowArrayToPole(row);
    });

    return ContentService.createTextOutput(JSON.stringify({ success: true, data: poles }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Endpoint POST: Simpan, Edit & Hapus data survei serta simpan foto ke Google Drive
function doPost(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action || 'savePole';

    // 1. Upload Foto Kamera Langsung ke Google Drive
    if (action === 'uploadPhoto') {
      var base64Data = contents.base64;
      var fileName = contents.fileName || ('FOTO_TIANG_' + new Date().getTime() + '.jpg');
      var mimeType = contents.mimeType || 'image/jpeg';

      var folder = getOrCreatePhotoFolder();
      var decoded = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decoded, mimeType, fileName);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      var fileId = file.getId();
      var photoUrl = 'https://lh3.googleusercontent.com/d/' + fileId + '=w1000';

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: {
          fileId: fileId,
          photoUrl: photoUrl,
          fileName: fileName
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Simpan Data Tiang Baru ke Sheet DATA_TIANG
    if (action === 'savePole') {
      var poleSheet = ss.getSheetByName(POLE_SHEET_NAME) || ss.getSheetByName('POLES');
      if (!poleSheet) {
        initialSetup();
        poleSheet = ss.getSheetByName(POLE_SHEET_NAME);
      }

      var pole = contents.data;

      // Auto sequence ID fallback if missing or duplicate
      var existingData = poleSheet.getDataRange().getValues();
      var maxNum = 0;
      for (var i = 1; i < existingData.length; i++) {
        var rowId = String(existingData[i][0] || '');
        if (rowId.indexOf('LL-') === 0) {
          var num = parseInt(rowId.replace('LL-', ''), 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }

      if (!pole.id || (pole.id === 'LL-0001' && maxNum >= 1)) {
        var nextNum = maxNum + 1;
        var pad = ('0000' + nextNum).slice(-4);
        pole.id = 'LL-' + pad;
      }

      var row = poleToRowArray(pole);
      poleSheet.appendRow(row);

      return ContentService.createTextOutput(JSON.stringify({ success: true, data: pole }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Update Data Tiang yang Sudah Ada di Sheet DATA_TIANG
    if (action === 'updatePole') {
      var poleSheet = ss.getSheetByName(POLE_SHEET_NAME) || ss.getSheetByName('POLES');
      if (!poleSheet) {
        initialSetup();
        poleSheet = ss.getSheetByName(POLE_SHEET_NAME);
      }

      var pole = contents.data;
      var data = poleSheet.getDataRange().getValues();

      var targetRow = -1;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(pole.id)) {
          targetRow = i + 1; // 1-indexed
          break;
        }
      }

      var rowValues = poleToRowArray(pole);

      if (targetRow !== -1) {
        poleSheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        poleSheet.appendRow(rowValues);
      }

      return ContentService.createTextOutput(JSON.stringify({ success: true, data: pole }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Hapus Data Tiang dari Sheet DATA_TIANG
    if (action === 'deletePole') {
      var poleSheet = ss.getSheetByName(POLE_SHEET_NAME) || ss.getSheetByName('POLES');
      if (!poleSheet) {
        initialSetup();
        poleSheet = ss.getSheetByName(POLE_SHEET_NAME);
      }

      var poleId = contents.id;
      var data = poleSheet.getDataRange().getValues();

      var targetRow = -1;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(poleId)) {
          targetRow = i + 1;
          break;
        }
      }

      if (targetRow !== -1) {
        poleSheet.deleteRow(targetRow);
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Tiang berhasil dihapus' }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Tiang tidak ditemukan' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 5. Verifikasi Login Kredensial Pengguna dari Sheet DATA_SURVEYOR
    if (action === 'login') {
      var userSheet = ss.getSheetByName(USER_SHEET_NAME) || ss.getSheetByName('USERS');
      if (!userSheet) {
        initialSetup();
        userSheet = ss.getSheetByName(USER_SHEET_NAME);
      }
      var email = (contents.email || '').toString().trim().toLowerCase();
      var password = (contents.password || '').toString();

      var data = userSheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        var row = data[i];
        var rowEmail = String(row[2] || '').trim().toLowerCase();
        var rowPassword = String(row[3] || '');
        if (rowEmail === email && rowPassword === password) {
          return ContentService.createTextOutput(JSON.stringify({
            success: true,
            user: {
              id: String(row[0]),
              name: String(row[1]),
              email: String(row[2]),
              role: String(row[4] || 'SURVEYOR'),
              roleLabel: String(row[4] || 'SURVEYOR') === 'ADMIN_KOMINFO'
                ? 'Admin Teknis & Jaringan'
                : String(row[4] || 'SURVEYOR') === 'ADMIN_BAPENDA'
                ? 'Admin Pajak & Retribusi Tiang'
                : 'Petugas Lapangan GIS',
              agency: String(row[5] || 'Pemerintah Kota Lubuklinggau'),
              phone: String(row[6] || ''),
              status: String(row[7] || 'AKTIF'),
              avatar: String(row[4]).includes('KOMINFO') ? '🏢' : String(row[4]).includes('BAPENDA') ? '🏛️' : '👨‍💼'
            }
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Email atau kata sandi tidak cocok di database DATA_SURVEYOR.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
