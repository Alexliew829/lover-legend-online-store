const APP_VERSION = "37.2";

// Online Store V1.9: GitHub Pages apps share the same origin, so localStorage is
// shared across /lover-legend-import-system/ and /lover-legend-online-store/.
// Namespace every inherited Import-system key inside Online Store to prevent the
// Online app from changing the Import app's local cache/settings on the same PC.
const ONLINE_STORE_IMPORT_MIRROR_PREFIX_V19 = "llaOnlineImportMirrorV19::";
const ONLINE_STORE_ISOLATE_IMPORT_STORAGE_V19 = /\/lover-legend-online-store(?:\/|$)/i.test(location.pathname);
const __nativeStorageGetItemV19 = Storage.prototype.getItem;
const __nativeStorageSetItemV19 = Storage.prototype.setItem;
const __nativeStorageRemoveItemV19 = Storage.prototype.removeItem;
function mapOnlineImportStorageKeyV19(key) {
  const raw = String(key ?? "");
  if (!ONLINE_STORE_ISOLATE_IMPORT_STORAGE_V19) return raw;
  if (/^importSystem/i.test(raw) || raw === "minimumPricePendingV345") return ONLINE_STORE_IMPORT_MIRROR_PREFIX_V19 + raw;
  return raw;
}
Storage.prototype.getItem = function(key){ return __nativeStorageGetItemV19.call(this, mapOnlineImportStorageKeyV19(key)); };
Storage.prototype.setItem = function(key,value){ return __nativeStorageSetItemV19.call(this, mapOnlineImportStorageKeyV19(key), value); };
Storage.prototype.removeItem = function(key){ return __nativeStorageRemoveItemV19.call(this, mapOnlineImportStorageKeyV19(key)); };

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
