function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const { action, name, items, total, timestamp, date, day,
          fromDate, toDate, location, menu, callback, users, rows } = e.parameter;

  // ── MENU: save location menu ──
  if (action === 'saveMenu') {
    const sheetName = location || 'Generic';
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) sheet = ss.insertSheet(sheetName);
    sheet.clearContents();
    sheet.appendRow(['Name', 'Price', 'Category']);
    const menuItems = JSON.parse(decodeURIComponent(menu || '[]'));
    menuItems.forEach(item => sheet.appendRow([item.name, item.price, item.cat]));
    return jsonpResponse({ status: 'ok', saved: menuItems.length }, callback);
  }

  // ── MENU: get location menu ──
  if (action === 'getMenu') {
    const sheetName = location || 'Generic';
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return jsonpResponse({ status: 'ok', menu: [] }, callback);
    const data = sheet.getDataRange().getValues();
    const menuItems = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][0]) menuItems.push({
        name: String(data[i][0]),
        price: Number(data[i][1]) || 0,
        cat: String(data[i][2]) || 'Other'
      });
    }
    return jsonpResponse({ status: 'ok', menu: menuItems }, callback);
  }

  // ── SHEET: delete location sheet tab ──
  if (action === 'deleteSheet') {
    const sheetName = location || '';
    if (sheetName && sheetName !== 'Orders' && sheetName !== 'Users') {
      const sheetToDelete = ss.getSheetByName(sheetName);
      if (sheetToDelete) ss.deleteSheet(sheetToDelete);
    }
    return jsonpResponse({ status: 'ok', deleted: sheetName }, callback);
  }

  // ── USERS: save team members ──
  if (action === 'saveUsers') {
    let sheet = ss.getSheetByName('Users');
    if (!sheet) {
      sheet = ss.insertSheet('Users');
      ss.setActiveSheet(sheet);
      ss.moveActiveSheet(1);
    }
    sheet.clearContents();
    sheet.appendRow(['Name']);
    const userList = JSON.parse(decodeURIComponent(users || '[]'));
    userList.forEach(u => sheet.appendRow([u]));
    return jsonpResponse({ status: 'ok', saved: userList.length }, callback);
  }

  // ── LOCATIONS: get all non-system sheet names ──
  if (action === 'getLocations') {
    const systemSheets = ['Orders', 'Users'];
    const locations = ss.getSheets()
      .map(s => s.getName())
      .filter(n => !systemSheets.includes(n));
    return jsonpResponse({ status: 'ok', locations: locations }, callback);
  }

  // ── ORDERS: all order actions use the Orders sheet ──
  const sheet = ss.getSheetByName('Orders') || ss.getActiveSheet();

  if (action === 'getToday') {
    const data = sheet.getDataRange().getValues();
    const orders = [];
    for (let i = 1; i < data.length; i++) {
      if (normaliseDate(data[i][0]) === date) {
        orders.push({
          date: normaliseDate(data[i][0]),
          day:  String(data[i][1]),
          time: String(data[i][2]),
          name: String(data[i][3]),
          items: String(data[i][4]),
          total: String(data[i][5])
        });
      }
    }
    return jsonpResponse({ status: 'ok', orders }, callback);
  }

  if (action === 'getRange') {
    const data = sheet.getDataRange().getValues();
    const orders = [];
    for (let i = 1; i < data.length; i++) {
      const rowDate = normaliseDate(data[i][0]);
      if (rowDate >= fromDate && rowDate <= toDate) {
        orders.push({
          date: rowDate,
          day:  String(data[i][1]),
          time: String(data[i][2]),
          name: String(data[i][3]),
          items: String(data[i][4]),
          total: String(data[i][5])
        });
      }
    }
    return jsonpResponse({ status: 'ok', orders }, callback);
  }

  // ── DELETE single order ──
  if (action === 'delete') {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (normaliseDate(data[i][0]) === date && String(data[i][3]).trim() === name) {
        sheet.deleteRow(i + 1);
        return jsonpResponse({ status: 'deleted' }, callback);
      }
    }
    return jsonpResponse({ status: 'notfound' }, callback);
  }

  // ── DELETE BATCH: delete multiple orders at once ──
  if (action === 'deleteBatch') {
    const items = JSON.parse(decodeURIComponent(e.parameter.items || '[]'));
    let deleted = 0;
    // Iterate in reverse so row deletion doesn't shift indices
    items.forEach(function(item) {
      const data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) {
        if (normaliseDate(data[i][0]) === item.date && String(data[i][3]).trim() === item.name) {
          sheet.deleteRow(i + 1);
          deleted++;
          break;
        }
      }
    });
    return jsonpResponse({ status: 'ok', deleted: deleted }, callback);
  }

  // ── SPLIT BATCH: update payer row + add sharer rows ──
  if (action === 'splitBatch') {
    const splitRows = JSON.parse(decodeURIComponent(e.parameter.rows || '[]'));
    const payerName  = e.parameter.payerName;
    const splitDate  = e.parameter.date;
    const splitDay   = e.parameter.day || getDayName(splitDate);
    const splitTime  = e.parameter.timestamp;
    let saved = 0;
    splitRows.forEach(function(row, i) {
      if (i === 0) {
        // First row = update payer's existing row with split label
        const data = sheet.getDataRange().getValues();
        let updated = false;
        for (let j = 1; j < data.length; j++) {
          if (normaliseDate(data[j][0]) === splitDate && String(data[j][3]).trim() === payerName) {
            sheet.getRange(j + 1, 1, 1, 6).setValues([[
              splitDate, splitDay, splitTime, row.name, row.items, 'Rs ' + row.total
            ]]);
            updated = true;
            saved++;
            break;
          }
        }
        if (!updated) {
          sheet.appendRow([splitDate, splitDay, splitTime, row.name, row.items, 'Rs ' + row.total]);
          saved++;
        }
      } else {
        // Remaining rows = new sharer rows
        sheet.appendRow([splitDate, splitDay, splitTime, row.name, row.items, 'Rs ' + row.total]);
        saved++;
      }
    });
    return jsonpResponse({ status: 'ok', saved: saved }, callback);
  }

  // ── BATCH: submit multiple orders at once ──
  if (action === 'addBatch') {
    const rowList = JSON.parse(decodeURIComponent(rows || '[]'));
    const batchDay = getDayName(date);
    rowList.forEach(row => {
      const rowTs = row.timestamp || timestamp || '';
      const rowTotal = String(row.total).startsWith('Rs') ? row.total : 'Rs ' + row.total;
      sheet.appendRow([date, batchDay, rowTs, row.name, row.items, rowTotal]);
    });
    return jsonpResponse({ status: 'ok', count: rowList.length }, callback);
  }

  // ── WRITE order (add or update) ──
  if (!name || !items) {
    return jsonpResponse({ status: 'error', msg: 'Missing name or items' }, callback);
  }

  const dayName = getDayName(date);

  if (action === 'update') {
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (normaliseDate(data[i][0]) === date && String(data[i][3]).trim() === name) {
        sheet.getRange(i + 1, 1, 1, 6).setValues([[date, dayName, timestamp, name, items, total]]);
        return jsonpResponse({ status: 'updated' }, callback);
      }
    }
    sheet.appendRow([date, dayName, timestamp, name, items, total]);
    return jsonpResponse({ status: 'ok' }, callback);
  }

  // Default: add new row
  sheet.appendRow([date, dayName, timestamp, name, items, total]);
  return jsonpResponse({ status: 'ok' }, callback);
}

function getDayName(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    return ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d.getDay()];
  } catch(e) { return ''; }
}

function normaliseDate(val) {
  if (!val) return '';
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  try {
    const d = new Date(s);
    if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  } catch(e) {}
  return s.slice(0, 10);
}

function jsonpResponse(obj, callback) {
  const json = JSON.stringify(obj);
  const output = callback ? `${callback}(${json})` : json;
  return ContentService.createTextOutput(output)
    .setMimeType(callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}
