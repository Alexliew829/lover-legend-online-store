(() => {
  'use strict';

  const DEMO = [
    { id:'JL0023', name:'矮霸水梅5-6公分 JLT580', englishName:'Water Jasmine', stock:12, averageCost:146.63, minimumPrice:296.52, category:'盆景' },
    { id:'BX0034', name:'忠盛黄杨老桩游龙', englishName:'Boxwood', stock:8, averageCost:260.00, minimumPrice:480.00, category:'盆景' },
    { id:'JU0036', name:'系鱼川真柏 SPK1780', englishName:'Itoigawa Juniper', stock:3, averageCost:780.00, minimumPrice:1280.00, category:'盆景' },
    { id:'BB0046', name:'米叶凌珊矮霸冬菇型 BBM298', englishName:'Bonsai', stock:15, averageCost:95.00, minimumPrice:198.00, category:'盆景' }
  ];

  const CANDIDATE_KEYS = [
    'loverLegendImportInventory', 'loverLegendImportState', 'llImportState', 'inventoryData', 'products'
  ];
  let cache = [];
  let revision = 0;
  const listeners = new Set();

  function parseCandidate(raw) {
    if (!raw) return [];
    try {
      const x = JSON.parse(raw);
      const arr = Array.isArray(x) ? x : Array.isArray(x?.products) ? x.products : Array.isArray(x?.inventory) ? x.inventory : Object.values(x?.products || x?.inventory || {});
      return arr.map(normalize).filter(Boolean);
    } catch { return []; }
  }

  function normalize(p) {
    if (!p || typeof p !== 'object') return null;
    const id = String(p.id || p.productId || p.productCode || p.code || p.sku || '').trim().toUpperCase();
    if (!id) return null;
    return {
      id,
      name: String(p.name || p.productName || p.chineseName || id),
      englishName: String(p.englishName || p.nameEn || ''),
      stock: num(p.stock ?? p.qty ?? p.quantity ?? p.currentStock ?? p.remainingStock),
      averageCost: num(p.averageCost ?? p.avgCost ?? p.costAverage ?? p.cost),
      minimumPrice: num(p.minimumPrice ?? p.minPrice ?? p.currentMinimumPrice ?? p.minimumSellingPrice),
      category: String(p.category || p.type || '盆景')
    };
  }

  function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }

  function refresh(reason='manual') {
    let found = [];
    for (const key of CANDIDATE_KEYS) {
      found = parseCandidate(localStorage.getItem(key));
      if (found.length) break;
    }
    cache = found.length ? found : DEMO.map(x => ({...x}));
    revision++;
    const payload = { revision, reason, products: getAll(), source: found.length ? 'local-import-cache' : 'demo-readonly' };
    listeners.forEach(fn => { try { fn(payload); } catch(e){ console.error(e); } });
    window.dispatchEvent(new CustomEvent('ll-import-updated', { detail: payload }));
    return payload;
  }

  function getAll(){ return cache.map(x => ({...x})); }
  function get(id){ const key = String(id || '').toUpperCase(); const p = cache.find(x => x.id === key); return p ? {...p} : null; }
  function search(q=''){
    const s = String(q).trim().toLowerCase();
    if (!s) return [];
    return cache.filter(p => [p.id,p.name,p.englishName,p.category].some(v => String(v).toLowerCase().includes(s))).slice(0,30).map(x => ({...x}));
  }
  function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }

  window.addEventListener('storage', e => { if (CANDIDATE_KEYS.includes(e.key)) refresh('storage'); });
  window.addEventListener('focus', () => refresh('focus'));
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refresh('visible'); });

  window.LLImport = { refresh, getAll, get, search, subscribe, get revision(){ return revision; } };
  refresh('startup');
})();
