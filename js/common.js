const APP_VERSION = "37.2";

// Online Store V2.4: GitHub Pages apps share the same origin, so localStorage is
// shared across /lover-legend-import-system/ and /lover-legend-online-store/.
// Namespace every inherited Import-system key inside Online Store to prevent the
// Online app from changing the Import app's local cache/settings on the same PC.
const ONLINE_STORE_IMPORT_MIRROR_PREFIX_V20 = "llaOnlineImportMirrorV24::";
const ONLINE_STORE_ISOLATE_IMPORT_STORAGE_V20 = /\/lover-legend-online-store(?:\/|$)/i.test(location.pathname);
const __nativeStorageGetItemV20 = Storage.prototype.getItem;
const __nativeStorageSetItemV20 = Storage.prototype.setItem;
const __nativeStorageRemoveItemV20 = Storage.prototype.removeItem;
function mapOnlineImportStorageKeyV20(key) {
  const raw = String(key ?? "");
  if (!ONLINE_STORE_ISOLATE_IMPORT_STORAGE_V20) return raw;
  if (/^importSystem/i.test(raw) || raw === "minimumPricePendingV345") return ONLINE_STORE_IMPORT_MIRROR_PREFIX_V20 + raw;
  return raw;
}
Storage.prototype.getItem = function(key){ return __nativeStorageGetItemV20.call(this, mapOnlineImportStorageKeyV20(key)); };
Storage.prototype.setItem = function(key,value){ return __nativeStorageSetItemV20.call(this, mapOnlineImportStorageKeyV20(key), value); };
Storage.prototype.removeItem = function(key){ return __nativeStorageRemoveItemV20.call(this, mapOnlineImportStorageKeyV20(key)); };

if (ONLINE_STORE_ISOLATE_IMPORT_STORAGE_V20) document.documentElement.classList.add("online-store-app-v24");

// V2.4 known-good minimum-price baseline from the 23-09-2026 Import backup.
// This is a bootstrap/fallback only. Every successful live Import pull remains
// authoritative and replaces these values whenever Import returns a valid price.
const ONLINE_IMPORT_MINIMUM_PRICE_BACKUP_V24 = Object.freeze({"BX0004":5380.0,"BX0005":2800.0,"BX0006":3920.0,"BX0009":480.0,"JL0022":3800.0,"JL0023":380.0,"AS0024":380.0,"AS0025":880.0,"JL0026":640.0,"SK0027":220.0,"SC0028":480.0,"SC0029":380.0,"BB0032":430.0,"BB0033":2930.0,"BX0034":450.0,"BX0035":900.0,"BX0001":6800.0,"BX0037":1200.0,"BX0038":3800.0,"BX0039":2380.0,"PD0040":1200.0,"BX0041":280.0,"BX0042":480.0,"BX0043":1380.0,"BX0044":780.0,"BX0045":680.0,"BB0046":260.0,"BB0047":480.0,"SC0048":780.0,"AS0049":870.0,"AS0002":5990.0,"AS0050":3280.0,"BB0052":400.0,"BB0053":450.0,"BB0054":780.0,"BX0055":680.0,"BX0056":1200.0,"BX0057":1500.0,"BX0058":1500.0,"BX0059":2000.0,"BX0060":9800.0,"BX0061":2200.0,"BX0062":4000.0,"SK0063":270.0,"BX0066":3000.0,"BX0067":5740.0,"BX0068":3100.0,"BX0069":6650.0,"BX0070":790.0,"BX0071":2000.0,"BX0072":1500.0,"BX0074":7540.0,"BX0075":6530.0,"BX0076":4630.0,"BX0077":8060.0,"BX0078":870.0,"BX0079":2800.0,"BX0080":9140.0,"BX0081":10550.0,"BX0082":8210.0,"BX0083":5870.0,"BX0084":6330.0,"BX0085":2500.0,"BX0086":17710.0,"BX0087":8840.0,"BX0088":28210.0,"BX0089":15120.0,"BX0090":1500.0,"BX0091":15410.0,"BX0092":15040.0,"BX0093":7880.0,"BX0094":1600.0,"BX0095":3200.0,"BX0096":11500.0,"BX0097":1800.0,"BX0098":290.0,"PD0099":2500.0,"BX0100":2500.0,"BX0101":2300.0,"BX0102":2000.0,"BX0103":8800.0,"BX0104":4000.0,"BX0105":4000.0,"BX0106":4800.0,"BX0107":1300.0,"BX0111":2640.0,"BX0112":5900.0,"BX0113":3340.0,"BX0114":4090.0,"BX0115":4330.0,"BX0116":3820.0,"BX0117":9360.0,"BX0118":4310.0,"BX0119":6880.0,"BX0120":1200.0,"BX0121":4150.0,"BX0122":3480.0,"BX0123":3670.0,"BX0124":2500.0,"BX0125":1800.0,"BX0126":5900.0,"BX0127":7710.0,"BX0128":3960.0,"BX0129":4280.0,"BX0130":1200.0,"BX0131":7200.0,"BX0132":7800.0,"BX0133":3340.0,"BX0134":7740.0,"BX0135":900.0,"BX0136":4510.0,"BX0137":1480.0,"BX0138":1450.0,"BX0139":7010.0,"BX0140":6410.0,"BX0141":3310.0,"BX0142":6410.0,"BX0143":1450.0,"BX0144":4670.0,"BX0145":4170.0,"BX0146":3640.0,"BX0147":1690.0,"BX0148":2640.0,"BX0149":15460.0,"BX0150":1510.0,"BX0151":950.0,"BX0152":1610.0,"BX0153":1200.0,"BX0154":3310.0,"BX0155":7070.0,"BX0156":16390.0,"BX0157":760.0,"BX0158":3010.0,"BX0159":15460.0,"BX0160":8410.0,"BX0161":7070.0,"BX0162":7070.0,"BX0163":2680.0,"BB0164":4810.0,"BB0165":2960.0,"BB0166":3750.0,"BB0167":630.0,"BB0168":810.0,"BB0169":240.0,"SC0170":16000.0,"SC0171":580.0,"SC0172":280.0,"SC0173":450.0,"MR0174":500.0,"BV0177":580.0,"BB0178":350.0,"IX0179":2530.0,"IX0180":3490.0,"IX0181":3880.0,"IX0182":420.0,"IX0183":420.0,"IX0184":420.0,"IX0185":350.0,"PD0186":1520.0,"BX0187":680.0,"BX0188":960.0,"BX0189":7810.0,"BX0190":9290.0,"BX0191":27270.0,"BX0193":280.0,"BS0036":1480.0,"BS0175":220.0,"BS0176":460.0,"BS0192":120.0,"BS0001":600.0});
window.ONLINE_IMPORT_MINIMUM_PRICE_BACKUP_V24 = ONLINE_IMPORT_MINIMUM_PRICE_BACKUP_V24;
function getOnlineImportBackupMinimumPriceV24(productId) {
  const id=String(productId||"").trim().toUpperCase();
  return Math.max(0,Number(ONLINE_IMPORT_MINIMUM_PRICE_BACKUP_V24[id])||0);
}
window.getOnlineImportBackupMinimumPriceV24=getOnlineImportBackupMinimumPriceV24;

// V2.4: inherited Import modules register beforeunload guards for hidden Import-only
// forms. Suppress those guards in Online Store; a dedicated Online-only guard is
// registered later for genuine unsaved sales/settings edits.
window.__nativeAddEventListenerOnlineV21 = window.addEventListener.bind(window);
window.addEventListener = function(type, listener, options) {
  if (ONLINE_STORE_ISOLATE_IMPORT_STORAGE_V20 && String(type) === "beforeunload") return;
  return window.__nativeAddEventListenerOnlineV21(type, listener, options);
};

function formatMoney(value, prefix = "") {
  const number = Number(value) || 0;
  return `${prefix}${number.toLocaleString("en-MY", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function formatNumber(value) {
  return (Number(value) || 0).toLocaleString("en-MY");
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error("Unable to read local data:", error);
    return fallback;
  }
}


// V36.4: read-only JSON cache. It compares the raw localStorage string on every
// read, so direct writes from sync/restore are picked up immediately while
// repeated settings reads during large renders avoid repeated JSON.parse work.
const readOnlyJsonCacheV317 = new Map();
function loadJSONReadOnlyV317(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const cached = readOnlyJsonCacheV317.get(key);
    if (cached && cached.raw === raw) return cached.value;
    const value = JSON.parse(raw);
    readOnlyJsonCacheV317.set(key, { raw, value });
    return value;
  } catch (error) {
    console.error("Unable to read cached local data:", error);
    return fallback;
  }
}

function parseAmount(value) {
  return Number(String(value ?? "").replace(/,/g, "")) || 0;
}

function formatInputAmount(input) {
  input.value = formatMoney(parseAmount(input.value));
}
