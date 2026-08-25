// ==============================================================================
// GOOGLE APPS SCRIPT: BACKEND DATABASE & CLOUD FOTO GIS LUBUKLINGGAU
// ==============================================================================

var FOLDER_NAME = 'FOTO_SURVEI_TIANG_LUBUKLINGGAU';

var POLE_HEADERS = [
  'id', 'poleCode', 'poleLatitude', 'poleLongitude', 'deviceLatitude', 'deviceLongitude',
  'gpsAccuracy', 'distanceFromDevice', 'locationMethod', 'providerId', 'providerName',
  'poleType', 'condition', 'road', 'kelurahan', 'kecamatan', 'kota', 'patokanLokasi',
  'sisiJalan', 'height', 'ownershipStatus', 'isTilted', 'isMessyCable', 'isLowCable',
  'isHazardous', 'isCorroded', 'isObstructing', 'description', 'photoFileId', 'photoUrl',
  'surveyorId', 'surveyorName', 'surveyDate', 'surveyTime', 'validationStatus',
  'validationNote', 'createdAt', 'updatedAt'
];

var PROVIDER_HEADERS = ['id', 'name', 'code', 'colorHex', 'status'];
var SEGMENT_HEADERS = [
  'id', 'segmentCode', 'fromNodeId', 'toNodeId', 'providerId', 'providerName',
  'networkType', 'installationType', 'estimatedDistance', 'status', 'description',
  'createdAt', 'updatedAt'
];
var USER_HEADERS = ['id', 'name', 'email', 'role', 'agency', 'phone', 'status', 'createdAt'];

// Fungsi Inisialisasi Otomatis (Membuat 4 Sheet & Folder Foto Drive)
function initialSetup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  getOrCreateSheet(ss, 'POLES', POLE_HEADERS);
  getOrCreateSheet(ss, 'PROVIDERS', PROVIDER_HEADERS);
  getOrCreateSheet(ss, 'NETWORK_SEGMENTS', SEGMENT_HEADERS);
  getOrCreateSheet(ss, 'USERS', USER_HEADERS);
  getOrCreatePhotoFolder();
  Logger.log('SUKSES: 4 Sheet dan Folder Foto Google Drive berhasil dibuat!');
}

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#dbeafe');
  }
  return sheet;
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

// Endpoint GET: Ambil data
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var action = (e && e.parameter && e.parameter.action) || 'getPoles';

    if (action === 'init') {
      initialSetup();
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Inisialisasi berhasil' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = getOrCreateSheet(ss, 'POLES', POLE_HEADERS);
    var data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var headers = data[0];
    var rows = data.slice(1);
    var poles = rows.map(function(row) {
      var obj = {};
      headers.forEach(function(h, i) {
        obj[h] = row[i];
      });
      return obj;
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
      var fileName = contents.fileName || ('POLE_' + new Date().getTime() + '.jpg');
      var mimeType = contents.mimeType || 'image/jpeg';

      var folder = getOrCreatePhotoFolder();
      var decoded = Utilities.base64Decode(base64Data);
      var blob = Utilities.newBlob(decoded, mimeType, fileName);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      var fileId = file.getId();
      var photoUrl = 'https://drive.google.com/uc?id=' + fileId + '&export=view';

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        data: {
          fileId: fileId,
          photoUrl: photoUrl,
          fileName: fileName
        }
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Simpan Data Tiang Baru ke Sheet POLES
    if (action === 'savePole') {
      var poleSheet = getOrCreateSheet(ss, 'POLES', POLE_HEADERS);
      var pole = contents.data;

      var row = POLE_HEADERS.map(function(header) {
        var val = pole[header];
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (val === undefined || val === null) return '';
        return val;
      });

      poleSheet.appendRow(row);

      return ContentService.createTextOutput(JSON.stringify({ success: true, data: pole }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Update Data Tiang yang Sudah Ada di Sheet POLES
    if (action === 'updatePole') {
      var poleSheet = getOrCreateSheet(ss, 'POLES', POLE_HEADERS);
      var pole = contents.data;
      var data = poleSheet.getDataRange().getValues();

      var targetRow = -1;
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(pole.id)) {
          targetRow = i + 1; // 1-indexed for Sheets API
          break;
        }
      }

      if (targetRow !== -1) {
        var rowValues = POLE_HEADERS.map(function(header) {
          var val = pole[header];
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (val === undefined || val === null) return '';
          return val;
        });
        poleSheet.getRange(targetRow, 1, 1, rowValues.length).setValues([rowValues]);

        return ContentService.createTextOutput(JSON.stringify({ success: true, data: pole }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        // Jika belum ada, append row baru
        var newRow = POLE_HEADERS.map(function(header) {
          var val = pole[header];
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
          if (val === undefined || val === null) return '';
          return val;
        });
        poleSheet.appendRow(newRow);

        return ContentService.createTextOutput(JSON.stringify({ success: true, data: pole }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 4. Hapus Data Tiang dari Sheet POLES
    if (action === 'deletePole') {
      var poleSheet = getOrCreateSheet(ss, 'POLES', POLE_HEADERS);
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

    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Unknown action' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
