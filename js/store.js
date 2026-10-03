(() => {
  'use strict';

  const KEY = 'llOnlineStoreV101';
  const VERSION = 1;
  const clone = v => JSON.parse(JSON.stringify(v));
  const now = () => new Date().toISOString();

  const DEFAULT_STATE = {
    schemaVersion: VERSION,
    revision: 1,
    updatedAt: now(),
    settings: {
      brand: 'Lover Legend Gardening',
      chineseName: '线上商店管理系统',
      englishName: 'Online Store Management Admin',
      browserTitle: '线上商店管理系统 | Lover Legend Gardening',
      targetMarginPct: 30,
      paymentFeePct: 2,
      paymentFeeEnabled: true,
      affiliatePct: 10,
      affiliateEnabled: false,
      packagingDefault: 20,
      potDefault: 35,
      sellerShippingDefault: 0,
      packageReserve: { length: 5, width: 5, height: 8 },
      holiday: { enabled: false, start: '', end: '', message: '' }
    },
    products: {},
    templates: {},
    deletedTemplateIds: {},
    pendingReservations: {},
    history: [],
    orders: {},
    ui: { lastRoom: 'overview' }
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return clone(DEFAULT_STATE);
      const parsed = JSON.parse(raw);
      return migrate(parsed);
    } catch (err) {
      console.warn('[V1.01] state load failed', err);
      return clone(DEFAULT_STATE);
    }
  }

  function migrate(state) {
    const out = Object.assign(clone(DEFAULT_STATE), state || {});
    out.settings = Object.assign(clone(DEFAULT_STATE.settings), state?.settings || {});
    out.settings.packageReserve = Object.assign(clone(DEFAULT_STATE.settings.packageReserve), state?.settings?.packageReserve || {});
    out.settings.holiday = Object.assign(clone(DEFAULT_STATE.settings.holiday), state?.settings?.holiday || {});
    out.products = state?.products || {};
    out.templates = state?.templates || {};
    out.deletedTemplateIds = state?.deletedTemplateIds || {};
    out.pendingReservations = state?.pendingReservations || {};
    out.history = Array.isArray(state?.history) ? state.history : [];
    out.orders = state?.orders || {};
    out.ui = Object.assign(clone(DEFAULT_STATE.ui), state?.ui || {});
    out.schemaVersion = VERSION;
    return out;
  }

  let state = load();
  const listeners = new Set();

  function persist({silent = false} = {}) {
    state.revision = Number(state.revision || 0) + 1;
    state.updatedAt = now();
    localStorage.setItem(KEY, JSON.stringify(state));
    if (!silent) listeners.forEach(fn => { try { fn(getState()); } catch (e) { console.error(e); } });
  }

  function getState() { return clone(state); }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }

  function ensureProduct(parentId, importRecord = {}) {
    const id = String(parentId || '').trim().toUpperCase();
    if (!id) throw new Error('Missing parent product ID');
    if (!state.products[id]) {
      state.products[id] = {
        id,
        frontName: importRecord.name || '',
        englishName: importRecord.englishName || '',
        details: '',
        careGuide: '',
        summary: '',
        defaultPrice: Number(importRecord.minimumPrice || 0),
        dimensions: { length: 0, width: 0, height: 0 },
        weight: 0,
        potCost: Number(state.settings.potDefault || 35),
        packagingCost: Number(state.settings.packagingDefault || 20),
        otherCost: 0,
        shipping: { sellerPays: false, reference: 0, sellerCost: Number(state.settings.sellerShippingDefault || 0) },
        rooms: {
          vip: roomState(), premium: roomState(), starter: roomState(), random: roomState()
        },
        children: { premium: [], starter: [] },
        random: { qty: 1, photos: [], video: '', draftSavedAt: '', publishedAt: '' },
        parentMedia: { photos: [], videos: [] },
        templateId: '',
        sold: false,
        createdAt: now(), updatedAt: now()
      };
      addHistory('PRODUCT_CREATED', id, '', '建立 Online 母产品主档');
      persist();
    }
    return state.products[id];
  }

  function roomState() {
    return { assigned: false, draftSavedAt: '', publishedAt: '', publishedSnapshot: null, dirty: false };
  }

  function updateProduct(parentId, patch, {persistNow = true} = {}) {
    const p = ensureProduct(parentId);
    deepAssign(p, patch || {});
    p.updatedAt = now();
    if (persistNow) persist();
    return clone(p);
  }

  function deepAssign(target, patch) {
    Object.entries(patch).forEach(([k,v]) => {
      if (v && typeof v === 'object' && !Array.isArray(v) && target[k] && typeof target[k] === 'object' && !Array.isArray(target[k])) deepAssign(target[k], v);
      else target[k] = v;
    });
    return target;
  }

  function assignRoom(parentId, room) {
    const p = ensureProduct(parentId);
    if (!p.rooms[room]) throw new Error('Unknown room');
    p.rooms[room].assigned = true;
    p.rooms[room].dirty = true;
    addHistory('ROOM_ASSIGNED', parentId, room, `加入 ${room} 房间`);
    persist();
  }

  function removeRoom(parentId, room) {
    const p = ensureProduct(parentId);
    p.rooms[room] = roomState();
    if (room === 'premium' || room === 'starter') p.children[room] = [];
    if (room === 'random') p.random = { qty: 1, photos: [], video: '', draftSavedAt: '', publishedAt: '' };
    addHistory('ROOM_REMOVED', parentId, room, `移除此房：${room}`);
    persist();
  }

  function markDirty(parentId, room, value = true) {
    const p = ensureProduct(parentId);
    if (p.rooms[room]) p.rooms[room].dirty = !!value;
    p.updatedAt = now();
    persist({silent:true});
  }

  function saveDraft(parentId, room, snapshot) {
    const p = ensureProduct(parentId);
    if (!p.rooms[room]) throw new Error('Unknown room');
    p.rooms[room].assigned = true;
    p.rooms[room].draftSavedAt = now();
    p.rooms[room].dirty = false;
    if (room === 'random') p.random.draftSavedAt = p.rooms[room].draftSavedAt;
    addHistory('DRAFT_SAVED', parentId, room, '草稿已保存/更新');
    persist();
    return clone(p.rooms[room]);
  }

  function publish(parentId, room, snapshot) {
    const p = ensureProduct(parentId);
    const r = p.rooms[room];
    r.assigned = true;
    r.draftSavedAt = r.draftSavedAt || now();
    r.publishedAt = now();
    r.publishedSnapshot = clone(snapshot || {});
    r.dirty = false;
    if (room === 'random') p.random.publishedAt = r.publishedAt;
    addHistory('PUBLISHED', parentId, room, '商品卡已上架/更新');
    persist();
    return clone(r);
  }

  function unpublish(parentId, room, reason = '手动下架') {
    const p = ensureProduct(parentId);
    const r = p.rooms[room];
    r.publishedAt = '';
    r.publishedSnapshot = null;
    r.dirty = false;
    if (room === 'random') p.random.publishedAt = '';
    addHistory('UNPUBLISHED', parentId, room, reason);
    persist();
  }

  function addChild(parentId, room) {
    if (!['premium','starter'].includes(room)) throw new Error('Child only available in Premium/Starter');
    const p = ensureProduct(parentId);
    const list = p.children[room] || (p.children[room] = []);
    if (list.length >= 10) throw new Error('每个母产品最多 10 个 Child');
    const used = new Set(list.map(c => Number(c.seq)));
    let seq = 1; while (used.has(seq) && seq <= 10) seq++;
    const child = {
      id: `${p.id}-${seq}`, seq, sold: false,
      price: Number(p.defaultPrice || 0),
      dimensions: clone(p.dimensions), weight: Number(p.weight || 0),
      details: p.details || '', careGuide: p.careGuide || '',
      photo: '', video: '', draftSavedAt: '', publishedAt: '', dirty: true,
      createdAt: now(), updatedAt: now()
    };
    list.push(child);
    p.rooms[room].assigned = true;
    p.rooms[room].dirty = true;
    addHistory('CHILD_CREATED', parentId, room, `新增 ${child.id}`);
    persist();
    return clone(child);
  }

  function updateChild(parentId, room, childId, patch) {
    const p = ensureProduct(parentId);
    const c = (p.children[room] || []).find(x => x.id === childId);
    if (!c) throw new Error('Child not found');
    deepAssign(c, patch || {}); c.updatedAt = now(); c.dirty = true;
    p.rooms[room].dirty = true;
    persist();
    return clone(c);
  }

  function saveChildDraft(parentId, room, childId) {
    const p = ensureProduct(parentId);
    const c = (p.children[room] || []).find(x => x.id === childId);
    if (!c) throw new Error('Child not found');
    c.draftSavedAt = now(); c.dirty = false;
    addHistory('CHILD_DRAFT_SAVED', parentId, room, `${childId} 草稿已保存`);
    persist();
  }

  function publishChild(parentId, room, childId) {
    const p = ensureProduct(parentId);
    const c = (p.children[room] || []).find(x => x.id === childId);
    if (!c) throw new Error('Child not found');
    c.draftSavedAt = c.draftSavedAt || now(); c.publishedAt = now(); c.dirty = false;
    addHistory('CHILD_PUBLISHED', parentId, room, `${childId} 已上架`);
    persist();
  }

  function unpublishChild(parentId, room, childId, reason='手动下架') {
    const p = ensureProduct(parentId);
    const c = (p.children[room] || []).find(x => x.id === childId);
    if (!c) throw new Error('Child not found');
    c.publishedAt = ''; c.dirty = false;
    addHistory('CHILD_UNPUBLISHED', parentId, room, `${childId}：${reason}`);
    persist();
  }

  function deleteChild(parentId, room, childId) {
    const p = ensureProduct(parentId);
    const list = p.children[room] || [];
    const idx = list.findIndex(x => x.id === childId);
    if (idx < 0) return;
    if (list[idx].sold) throw new Error('已售出的 Child 必须保留历史，不能普通删除');
    list.splice(idx, 1);
    addHistory('CHILD_DELETED', parentId, room, `${childId} 已删除并释放分配`);
    persist();
  }

  function upsertTemplate(template) {
    const id = template.id || `tpl_${Date.now()}`;
    delete state.deletedTemplateIds[id];
    state.templates[id] = Object.assign({id, name:'', keywords:'', details:'', careGuide:'', updatedAt:now(), revision:1}, state.templates[id] || {}, template, {id, updatedAt:now()});
    state.templates[id].revision = Number(state.templates[id].revision || 0) + 1;
    addHistory('TEMPLATE_SAVED', '', '', `模板：${state.templates[id].name || id}`);
    persist();
    return clone(state.templates[id]);
  }

  function deleteTemplate(id) {
    if (!state.templates[id]) return;
    const name = state.templates[id].name || id;
    delete state.templates[id];
    state.deletedTemplateIds[id] = now();
    Object.values(state.products).forEach(p => { if (p.templateId === id) p.templateId = ''; });
    addHistory('TEMPLATE_DELETED', '', '', `永久删除模板：${name}`);
    persist();
  }

  function addReservation(rec) {
    const key = `${rec.orderId}::${rec.lineId}`;
    if (state.pendingReservations[key]) return clone(state.pendingReservations[key]);
    state.pendingReservations[key] = Object.assign({key, status:'PENDING_IMPORT_LINK', createdAt:now(), ackAt:''}, rec);
    addHistory('RESERVATION_CREATED', rec.parentId, rec.room || '', `${key} · Qty ${rec.qty || 1}`);
    persist();
    return clone(state.pendingReservations[key]);
  }

  function ackReservation(orderId, lineId) {
    const key = `${orderId}::${lineId}`;
    const r = state.pendingReservations[key];
    if (!r) return false;
    if (r.status === 'ACK') return true;
    r.status = 'ACK'; r.ackAt = now();
    addHistory('RESERVATION_ACK', r.parentId, r.room || '', `${key} ACK`);
    persist();
    return true;
  }

  function pendingQty(parentId) {
    const id = String(parentId || '').toUpperCase();
    return Object.values(state.pendingReservations).reduce((sum,r) => sum + ((r.parentId === id && r.status !== 'ACK') ? Number(r.qty || 0) : 0), 0);
  }

  function addHistory(type, parentId='', room='', remark='') {
    state.history.unshift({ id:`h_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, at:now(), type, parentId, room, remark });
    if (state.history.length > 2000) state.history.length = 2000;
  }

  function backup() {
    return JSON.stringify({ app:'Lover Legend Online Store', version:'1.01', exportedAt:now(), state }, null, 2);
  }

  function restore(json) {
    const parsed = typeof json === 'string' ? JSON.parse(json) : json;
    const incoming = parsed?.state || parsed;
    state = migrate(incoming);
    addHistory('RESTORE', '', '', 'Online Store Backup Restore');
    persist();
  }

  function reset() { state = clone(DEFAULT_STATE); persist(); }

  window.LLStore = {
    getState, subscribe, ensureProduct, updateProduct, assignRoom, removeRoom, markDirty,
    saveDraft, publish, unpublish, addChild, updateChild, saveChildDraft, publishChild, unpublishChild, deleteChild,
    upsertTemplate, deleteTemplate, addReservation, ackReservation, pendingQty,
    backup, restore, reset,
    saveSettings(patch){ deepAssign(state.settings, patch || {}); addHistory('SETTINGS_UPDATED','','','设置已更新'); persist(); },
    addHistory(type,parentId,room,remark){ addHistory(type,parentId,room,remark); persist(); }
  };
})();
