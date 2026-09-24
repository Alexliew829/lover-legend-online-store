const APP_VERSION = "37.2";

// Online Store V2.2: GitHub Pages apps share the same origin, so localStorage is
// shared across /lover-legend-import-system/ and /lover-legend-online-store/.
// Namespace every inherited Import-system key inside Online Store to prevent the
// Online app from changing the Import app's local cache/settings on the same PC.
const ONLINE_STORE_IMPORT_MIRROR_PREFIX_V20 = "llaOnlineImportMirrorV22::";
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

// V2.2: inherited Import modules register beforeunload guards for hidden Import-only
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
