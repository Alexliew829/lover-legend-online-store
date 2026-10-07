/* Lover Legend Online Store V16.2 — Clean Zero-Login Auto Cloud Sync
   - Fixed Supabase project + fixed Store ID are built into the deployment.
   - No per-device Cloud email/password/login is required.
   - Cloud is authoritative after first migration; new devices auto-bootstrap from Cloud.
   - Import / Inventory remains read-only and is never uploaded or written back.
   - Revision conflict protection remains mandatory on writes.
*/
(() => {
  'use strict';

  const META_KEY = 'llaOnlineStoreV151::cloudMeta';
  const STATE_KEY = 'llaOnlineStoreV22::state';
  const UI_KEY = 'llaOnlineStoreV22::ui';
  const HISTORY_KEY = 'llaOnlineStoreV22::history';
  const TEMPLATE_KEY = 'onlineStoreContentTemplatesV41';
  const HOLIDAY_KEY = 'onlineStoreHolidayModeV29';
  const LOCAL_PRODUCTS_KEY = 'llaOnlineStoreV70::localProducts';
  const SETTINGS_REVISION_KEY = 'llaOnlineStoreV22::settingsRevisionV78';
  const SAFETY_BACKUP_INDEX_KEY = 'llaOnlineStoreV155::autoSafetyBackups';

  const APP_VERSION = '16.2';
  const CLOUD_URL = 'https://ccnxfbwszyqwwdzkthxz.supabase.co';
  const CLOUD_PUBLISHABLE_KEY = 'sb_publishable_CK3-4sDNyYU1KocQ9xinhQ_4dg3vZ3h';
  const STORE_ID = 'lover-legend-main';

  let busy = false;
  let pushTimer = 0;
  let suppressDirty = false;
  let lastStatusKind = 'idle';
  let lastBackgroundCheckAt = 0;
  const BACKGROUND_CHECK_MIN_MS = 3500;
  const PERIODIC_REVISION_CHECK_MS = 60000;
  const cloudDiagnostics = {
    host: (() => { try { return new URL(CLOUD_URL).host; } catch (_) { return CLOUD_URL; } })(),
    browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : null,
    lastRequestUrl: '',
    lastRequestMethod: '',
    lastRequestAt: '',
    lastSuccessAt: '',
    lastSuccessRevision: 0,
    lastHttpStatus: 0,
    lastFailureAt: '',
    lastStage: '',
    hostReachable: null,
    corsReachable: null,
    requestAttempts: 0
  };

  const parse = (raw, fallback) => {
    try { return raw == null || raw === '' ? fallback : JSON.parse(raw); }
    catch (_) { return fallback; }
  };
  const readJSON = (key, fallback) => parse(localStorage.getItem(key), fallback);
  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const nowIso = () => new Date().toISOString();
  const fmtTime = value => {
    const d = new Date(value || '');
    if (Number.isNaN(d.getTime())) return '尚未同步';
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth()+1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  function cloudConfigured() {
    return /^https:\/\/.+\.supabase\.co$/i.test(CLOUD_URL) && CLOUD_PUBLISHABLE_KEY.length > 20 && STORE_ID.length > 0;
  }

  function getMeta() {
    const raw = readJSON(META_KEY, {});
    return {
      revision: Math.max(0, Number(raw?.revision) || 0),
      initialized: raw?.initialized === true,
      dirty: raw?.dirty === true,
      conflict: raw?.conflict === true,
      lastSyncedAt: String(raw?.lastSyncedAt || ''),
      lastCheckedAt: String(raw?.lastCheckedAt || ''),
      lastError: String(raw?.lastError || ''),
      dirtyReason: String(raw?.dirtyReason || '')
    };
  }

  function setMeta(patch) {
    const next = { ...getMeta(), ...(patch || {}) };
    writeJSON(META_KEY, next);
    renderStatus();
    return next;
  }

  function setStatus(kind, message, detail = '') {
    lastStatusKind = kind;
    const box = document.getElementById('v151CloudStatus');
    const main = document.getElementById('v151CloudStatusText');
    const sub = document.getElementById('v151CloudStatusDetail');
    if (box) {
      box.classList.remove('idle','ok','busy','warn','error');
      box.classList.add(kind || 'idle');
    }
    if (main) main.textContent = message || '';
    if (sub) sub.textContent = detail || '';
    const info = document.getElementById('systemInfoOnlineCloudV151');
    if (info) info.textContent = message || '未配置';
    try {
      window.__onlineCloudRuntimeStatusV157 = { kind:kind || 'idle', message:message || '', detail:detail || '', at:nowIso() };
      window.dispatchEvent(new CustomEvent('online-store-cloud-status-v157',{detail:window.__onlineCloudRuntimeStatusV157}));
    } catch (_) {}
  }

  function renderStatus() {
    const meta = getMeta();
    const rev = document.getElementById('v151CloudRevision');
    const last = document.getElementById('v151CloudLastSync');
    if (rev) rev.textContent = meta.revision ? `R${meta.revision}` : '尚未建立';
    if (last) last.textContent = fmtTime(meta.lastSyncedAt);

    if (!cloudConfigured()) {
      setStatus('error','Online Cloud 内置连接无效','V16.2 内置 Cloud 配置不完整，请检查部署文件。');
      return;
    }
    if (meta.conflict) {
      setStatus('error','同步冲突 · 已阻止覆盖','Cloud 与本机都发生过修改。请使用下方维护按钮明确选择处理方向。');
      return;
    }
    if (meta.lastError) {
      setStatus('error','Online Cloud 检查失败',meta.lastError);
      return;
    }
    if (meta.dirty) {
      setStatus('warn','本机有待同步修改',meta.dirtyReason ? `待同步：${meta.dirtyReason}` : '等待自动上传 Cloud。');
      return;
    }
    if (meta.initialized) {
      setStatus(lastStatusKind === 'busy' ? 'busy' : 'ok', lastStatusKind === 'busy' ? '正在同步 Online Cloud…' : 'Online Cloud 已同步', `Revision R${meta.revision || 0} · 零登录自动同步 · 最后同步 ${fmtTime(meta.lastSyncedAt)}`);
      return;
    }
    setStatus('busy','正在自动连接 Online Cloud…','新设备无需设置或登录，系统会自动建立 Cloud 同步基线。');
  }

  function snapshot() {
    return {
      schemaVersion: 155,
      appVersion: APP_VERSION,
      capturedAt: nowIso(),
      state: readJSON(STATE_KEY, { version:'2.3', products:{} }),
      ui: readJSON(UI_KEY, {}),
      history: readJSON(HISTORY_KEY, []),
      templates: readJSON(TEMPLATE_KEY, {}),
      holidayMode: readJSON(HOLIDAY_KEY, {}),
      localProducts: readJSON(LOCAL_PRODUCTS_KEY, []),
      settingsRevision: String(localStorage.getItem(SETTINGS_REVISION_KEY) || '')
    };
  }

  function snapshotSummary(data = snapshot()) {
    const products = data?.state?.products && typeof data.state.products === 'object' ? Object.keys(data.state.products).length : 0;
    const localProducts = Array.isArray(data?.localProducts) ? data.localProducts.length : 0;
    const templates = data?.templates && typeof data.templates === 'object' ? Object.keys(data.templates).length : 0;
    const history = Array.isArray(data?.history) ? data.history.length : 0;
    return { products, localProducts, templates, history, total: products + localProducts + templates };
  }

  function saveAutomaticSafetyBackup(reason = 'Before_Auto_Cloud_Apply') {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      createdAt: nowIso(),
      reason,
      payload: snapshot()
    };
    const index = readJSON(SAFETY_BACKUP_INDEX_KEY, []);
    const next = [entry, ...(Array.isArray(index) ? index : [])].slice(0, 3);
    try { writeJSON(SAFETY_BACKUP_INDEX_KEY, next); } catch (_) {
      // If storage is tight, keep only the newest compact backup.
      try { writeJSON(SAFETY_BACKUP_INDEX_KEY, [entry]); } catch (_) {}
    }
    return entry;
  }

  function downloadBackup(prefix = 'Before_Cloud_Sync') {
    const payload = { system:'Lover Legend Online Store', version:APP_VERSION, exportedAt:nowIso(), ...snapshot() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date(); const p = n => String(n).padStart(2,'0');
    a.href = url;
    a.download = `Lover_Legend_Online_Store_V${APP_VERSION}_${prefix}_${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}-${p(d.getHours())}-${p(d.getMinutes())}-${p(d.getSeconds())}.json`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function classifyCloudFailure(status, data, fallback='') {
    const raw = [data?.code, data?.message, data?.details, data?.hint, data?.error, fallback].filter(Boolean).join(' ').toLowerCase();
    if (status === 401 || /invalid.*(api|key)|jwt|unauthor/.test(raw)) return 'Key / Auth';
    if (status === 403 || /row.level.security|rls|policy|permission|forbidden|42501/.test(raw)) return 'Permission / RLS';
    if (/network|failed to fetch|load failed|networkerror/.test(raw)) return 'Network';
    return 'Cloud';
  }

  function formatCloudFailure({ status=0, statusText='', method='GET', path='', url='', data=null, cause=null } = {}) {
    const pieces = [];
    const fallback = String(cause?.message || cause || '').trim();
    const category = classifyCloudFailure(status, data, fallback);
    pieces.push(category);
    if (status) pieces.push(`HTTP ${status}${statusText ? ` ${statusText}` : ''}`);
    pieces.push(`${String(method || 'GET').toUpperCase()} ${url || `/rest/v1/${String(path || '').replace(/^\/+/, '')}`}`);
    pieces.push(`Browser ${navigator.onLine ? 'Online' : 'Offline'}`);
    if (data && typeof data === 'object') {
      if (data.code) pieces.push(`Supabase ${data.code}`);
      if (data.message) pieces.push(String(data.message));
      if (data.details) pieces.push(`details: ${data.details}`);
      if (data.hint) pieces.push(`hint: ${data.hint}`);
      if (data.error && data.error !== data.message) pieces.push(`error: ${data.error}`);
    } else if (typeof data === 'string' && data.trim()) {
      pieces.push(data.trim());
    }
    if (fallback && !pieces.some(part => part.includes(fallback))) pieces.push(fallback);
    return pieces.filter(Boolean).join(' · ');
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal:controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }
  async function diagnoseNetworkLayer() {
    const result = { browserOnline:navigator.onLine, hostReachable:null, corsReachable:null, authSettingsStatus:0 };
    if (!navigator.onLine) return result;
    try {
      await fetchWithTimeout(`${CLOUD_URL}/`, { method:'GET', mode:'no-cors', cache:'no-store', credentials:'omit' }, 6500);
      result.hostReachable = true;
    } catch (_) {
      result.hostReachable = false;
      return result;
    }
    try {
      const response = await fetchWithTimeout(`${CLOUD_URL}/auth/v1/settings`, {
        method:'GET', mode:'cors', cache:'no-store', credentials:'omit', headers:{ apikey:CLOUD_PUBLISHABLE_KEY }
      }, 6500);
      result.corsReachable = true;
      result.authSettingsStatus = Number(response.status) || 0;
    } catch (_) {
      result.corsReachable = false;
    }
    return result;
  }
  function networkDiagnosisText(diag) {
    if (!diag?.browserOnline) return '浏览器 Offline';
    if (diag.hostReachable === false) return 'Supabase Host 无法连接：请核对 Project URL / DNS / 项目是否有效';
    if (diag.hostReachable === true && diag.corsReachable === false) return 'Supabase Host 可到达，但浏览器 CORS/API 请求失败';
    if (diag.corsReachable === true) return `Supabase Host/API 可到达${diag.authSettingsStatus ? ` · Probe HTTP ${diag.authSettingsStatus}` : ''}`;
    return '网络层状态未确定';
  }
  async function cloudFetch(path, options = {}) {
    const key = CLOUD_PUBLISHABLE_KEY;
    const method = String(options.method || 'GET').toUpperCase();
    if (!cloudConfigured()) throw new Error('Cloud Config · V16.2 内置 Cloud 配置无效。');
    const requestUrl = `${CLOUD_URL}/rest/v1/${path}`;
    cloudDiagnostics.browserOnline = navigator.onLine;
    cloudDiagnostics.lastRequestUrl = requestUrl;
    cloudDiagnostics.lastRequestMethod = method;
    cloudDiagnostics.lastRequestAt = nowIso();
    cloudDiagnostics.lastStage = 'request';
    cloudDiagnostics.requestAttempts = 0;
    const maxAttempts = method === 'GET' ? 2 : 1;
    let response = null;
    let lastCause = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      cloudDiagnostics.requestAttempts = attempt;
      try {
        response = await fetchWithTimeout(requestUrl, {
          ...options,
          mode:'cors',
          cache:'no-store',
          credentials:'omit',
          headers:{
            apikey:key,
            ...(method === 'GET' || method === 'HEAD' ? {} : {'Content-Type':'application/json'}),
            ...(options.headers || {})
          }
        }, method === 'GET' ? 12000 : 15000);
        break;
      } catch (cause) {
        lastCause = cause;
        if (attempt < maxAttempts && navigator.onLine) await wait(850);
      }
    }
    if (!response) {
      cloudDiagnostics.lastFailureAt = nowIso();
      cloudDiagnostics.lastHttpStatus = 0;
      cloudDiagnostics.lastStage = 'network';
      const diag = await diagnoseNetworkLayer();
      cloudDiagnostics.hostReachable = diag.hostReachable;
      cloudDiagnostics.corsReachable = diag.corsReachable;
      const base = formatCloudFailure({ method, path, url:requestUrl, cause:lastCause });
      throw new Error(`${base} · ${networkDiagnosisText(diag)}`);
    }
    cloudDiagnostics.lastHttpStatus = Number(response.status)||0;
    cloudDiagnostics.hostReachable = true;
    cloudDiagnostics.corsReachable = true;
    const bodyText = await response.text();
    let data = null;
    try { data = bodyText ? JSON.parse(bodyText) : null; } catch (_) { data = bodyText; }
    if (!response.ok) {
      cloudDiagnostics.lastFailureAt = nowIso();
      cloudDiagnostics.lastStage = 'http';
      throw new Error(formatCloudFailure({ status:response.status, statusText:response.statusText, method, path, url:requestUrl, data }));
    }
    cloudDiagnostics.lastSuccessAt = nowIso();
    cloudDiagnostics.lastStage = 'ok';
    return data;
  }
  async function pullRemoteMeta() {
    const query = `online_store_sync?store_id=eq.${encodeURIComponent(STORE_ID)}&select=store_id,revision,updated_at&limit=1`;
    const rows = await cloudFetch(query, { method:'GET' });
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function pullRemote() {
    const query = `online_store_sync?store_id=eq.${encodeURIComponent(STORE_ID)}&select=store_id,revision,payload,updated_at&limit=1`;
    const rows = await cloudFetch(query, { method:'GET' });
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function pushRemote(baseRevision, payload) {
    const result = await cloudFetch('rpc/online_store_sync_push', {
      method:'POST',
      body:JSON.stringify({ p_store_id:STORE_ID, p_base_revision:Math.max(0, Number(baseRevision)||0), p_payload:payload })
    });
    return Array.isArray(result) ? result[0] : result;
  }

  function applySnapshot(payload, revision, source = 'cloud') {
    if (!payload || typeof payload !== 'object') throw new Error('Cloud payload 无效。');
    suppressDirty = true;
    try {
      if (payload.state && typeof payload.state === 'object') writeJSON(STATE_KEY, payload.state);
      if (payload.ui && typeof payload.ui === 'object') writeJSON(UI_KEY, payload.ui);
      if (Array.isArray(payload.history)) writeJSON(HISTORY_KEY, payload.history.slice(0,100));
      if (payload.templates && typeof payload.templates === 'object') writeJSON(TEMPLATE_KEY, payload.templates);
      if (payload.holidayMode && typeof payload.holidayMode === 'object') writeJSON(HOLIDAY_KEY, payload.holidayMode);
      if (Array.isArray(payload.localProducts)) writeJSON(LOCAL_PRODUCTS_KEY, payload.localProducts);
      if (payload.settingsRevision != null) localStorage.setItem(SETTINGS_REVISION_KEY, String(payload.settingsRevision || Date.now()));
      setMeta({ revision:Math.max(0, Number(revision)||0), initialized:true, dirty:false, conflict:false, lastSyncedAt:nowIso(), lastCheckedAt:nowIso(), lastError:'', dirtyReason:'' });
    } finally { suppressDirty = false; }

    // V16.2: one Cloud Apply -> one runtime refresh owner. The app listener invalidates caches and repaints.
    try { window.dispatchEvent(new CustomEvent('online-store-v151-cloud-applied',{detail:{revision,source}})); } catch (_) {}
  }

  async function checkCloud({ allowAutoApply = true, reason = 'manual' } = {}) {
    if (busy) return null;
    busy = true;
    setStatus('busy','正在检查 Online Cloud…',reason === 'manual' ? '读取 Cloud revision。' : '后台检查 revision。');
    try {
      const remoteMeta = await pullRemoteMeta();
      const meta = getMeta();
      setMeta({ lastCheckedAt:nowIso(), lastError:'' });
      if (!remoteMeta) {
        if (meta.initialized && meta.revision > 0) {
          setStatus('error','Cloud 资料不存在','已阻止自动建立空资料。请检查 Supabase 数据表。');
        } else {
          setStatus('warn','Cloud 目前为空','只有第一次建立 Cloud 主档时才需要人工执行“首次上传本机资料”。');
        }
        return null;
      }
      const remoteRevision = Math.max(0, Number(remoteMeta.revision)||0);
      cloudDiagnostics.lastSuccessRevision = remoteRevision;
      cloudDiagnostics.lastSuccessAt = nowIso();
      if (!meta.initialized) {
        if (allowAutoApply) {
          const remote = await pullRemote();
          if (!remote) throw new Error('Cloud Revision 存在，但完整资料读取失败。');
          if (hasMeaningfulLocalData()) saveAutomaticSafetyBackup(`Auto bootstrap before Cloud R${remoteRevision}`);
          applySnapshot(remote.payload, remoteRevision, `auto-bootstrap-${reason}`);
          setStatus('ok','新设备已自动同步 Cloud',`已建立本机基线 Revision R${remoteRevision}。以后无需设置或登录。`);
          return { remoteMeta, changed:true, applied:true, revision:remoteRevision, bootstrap:true };
        }
        return { remoteMeta, changed:true, applied:false, revision:remoteRevision };
      }
      if (remoteRevision > meta.revision) {
        if (meta.dirty) {
          setMeta({ conflict:true });
          setStatus('error',`同步冲突 · Cloud R${remoteRevision} / 本机 R${meta.revision}`,'两边都有修改，系统已阻止自动覆盖。');
          return { remoteMeta, changed:true, applied:false, conflict:true, revision:remoteRevision };
        }
        if (allowAutoApply) {
          const remote = await pullRemote();
          if (!remote) throw new Error('Cloud Revision 存在，但完整资料读取失败。');
          applySnapshot(remote.payload, remoteRevision, reason);
          setStatus('ok','Online Cloud 已更新到本机',`已应用 Cloud Revision R${remoteRevision}。`);
          return { remoteMeta, changed:true, applied:true, revision:remoteRevision };
        }
        return { remoteMeta, changed:true, applied:false, revision:remoteRevision };
      }
      if (remoteRevision < meta.revision) {
        setMeta({ conflict:true });
        setStatus('error',`Revision 异常 · Cloud R${remoteRevision} / 本机 R${meta.revision}`,'已阻止覆盖；请检查是否恢复过旧 Cloud。');
        return { remoteMeta, changed:false, applied:false, conflict:true, revision:remoteRevision };
      }
      if (meta.dirty) {
        busy = false;
        return await syncNow({ reason:`${reason}-push`, skipInitialPull:true });
      }
      setMeta({ conflict:false, lastSyncedAt:meta.lastSyncedAt || nowIso() });
      setStatus('ok','Online Cloud 已同步',`Revision R${remoteRevision} · 没有新变化。`);
      return { remoteMeta, changed:false, applied:false, revision:remoteRevision };
    } catch (error) {
      setMeta({ lastError:String(error?.message || error) });
      setStatus('error','Online Cloud 检查失败',String(error?.message || error));
      throw error;
    } finally {
      busy = false;
      renderStatus();
    }
  }

  async function firstUpload() {
    if (busy) return false;
    const remote = await pullRemoteMeta();
    if (remote) throw new Error(`Cloud 已有 Revision R${remote.revision}，已阻止“首次上传”覆盖。`);
    const data = snapshot();
    const sum = snapshotSummary(data);
    if (!confirm(`首次上传会把“这台设备”的 Online Store 资料建立为 Cloud 主档。\n\n盆景商品：${sum.products}\n周边商品：${sum.localProducts}\n内容模板：${sum.templates}\n历史记录：${sum.history}\n\n系统会先下载一份本机 Backup。确认继续？`)) return false;
    downloadBackup('Before_First_Cloud_Upload');
    busy = true;
    setStatus('busy','正在建立 Online Cloud 主档…','首次上传期间不要关闭网页。');
    try {
      const result = await pushRemote(0, data);
      if (!result?.ok) {
        if (result?.conflict) throw new Error(`Cloud 已由其他设备建立 Revision R${result.revision}，已阻止覆盖。`);
        throw new Error(result?.message || '首次上传失败。');
      }
      setMeta({ revision:Number(result.revision)||1, initialized:true, dirty:false, conflict:false, lastSyncedAt:nowIso(), lastCheckedAt:nowIso(), lastError:'', dirtyReason:'' });
      setStatus('ok','首次 Cloud Migration 完成',`Cloud Revision R${Number(result.revision)||1} 已建立。后续新设备会自动同步。`);
      return true;
    } finally { busy = false; renderStatus(); }
  }

  async function forceDownloadCloud() {
    if (busy) return false;
    const remote = await pullRemote();
    if (!remote) throw new Error('Cloud 目前没有资料。');
    const sum = snapshotSummary(remote.payload || {});
    if (!confirm(`从 Cloud 下载会覆盖这台设备目前的 Online Store 本机资料。\n\nCloud Revision：R${remote.revision}\n盆景商品：${sum.products}\n周边商品：${sum.localProducts}\n内容模板：${sum.templates}\n\n系统会先下载一份当前本机 Backup。确认继续？`)) return false;
    if (!confirm('再次确认：以 Cloud 资料覆盖这台设备的 Online Store 本机资料？\nImport 库存 / 成本不会受影响。')) return false;
    downloadBackup('Before_Cloud_Download');
    applySnapshot(remote.payload, remote.revision, 'manual-download');
    setStatus('ok','Cloud 资料已下载',`已切换到 Revision R${remote.revision}。`);
    return true;
  }

  async function forceUploadLocal() {
    if (busy) return false;
    const meta = getMeta();
    const remote = await pullRemoteMeta();
    if (!remote) return firstUpload();
    if (!confirm(`这会尝试把本机资料上传到 Cloud。\n\n本机 Revision：R${meta.revision}\nCloud Revision：R${remote.revision}\n\n只有两边 Revision 相同才会写入；否则系统仍会阻止覆盖。确认继续？`)) return false;
    return syncNow({ reason:'manual-upload', skipInitialPull:true });
  }

  async function syncNow({ reason = 'manual', skipInitialPull = false } = {}) {
    if (busy) return false;
    const metaStart = getMeta();
    if (!metaStart.initialized) {
      setStatus('warn','尚未建立本机 Cloud 基线','系统会自动从已有 Cloud 建立基线；若 Cloud 为空才需要首次上传。');
      return false;
    }
    busy = true;
    setStatus('busy','正在同步 Online Cloud…',reason);
    try {
      let remoteMeta = null;
      if (!skipInitialPull) remoteMeta = await pullRemoteMeta();
      const meta = getMeta();
      if (remoteMeta) {
        const rr = Math.max(0, Number(remoteMeta.revision)||0);
        if (rr !== meta.revision) {
          if (rr > meta.revision && !meta.dirty) {
            const remote = await pullRemote();
            if (!remote) throw new Error('Cloud Revision 存在，但完整资料读取失败。');
            applySnapshot(remote.payload, rr, reason);
            return true;
          }
          setMeta({ conflict:true });
          setStatus('error',`同步冲突 · Cloud R${rr} / 本机 R${meta.revision}`,'已阻止覆盖。');
          return false;
        }
      }
      if (!meta.dirty) {
        setMeta({ lastCheckedAt:nowIso(), conflict:false });
        setStatus('ok','Online Cloud 已同步',`Revision R${meta.revision} · 没有待上传修改。`);
        return true;
      }
      const result = await pushRemote(meta.revision, snapshot());
      if (!result?.ok) {
        if (result?.conflict) {
          setMeta({ conflict:true });
          setStatus('error',`同步冲突 · Cloud 已到 R${result.revision}`,'本机资料没有覆盖 Cloud。');
          return false;
        }
        throw new Error(result?.message || 'Cloud 保存失败。');
      }
      setMeta({ revision:Number(result.revision)||meta.revision+1, initialized:true, dirty:false, conflict:false, lastSyncedAt:nowIso(), lastCheckedAt:nowIso(), lastError:'', dirtyReason:'' });
      setStatus('ok','Online Cloud 已同步',`已保存为 Revision R${Number(result.revision)||meta.revision+1}。`);
      return true;
    } catch (error) {
      setMeta({ lastError:String(error?.message || error) });
      setStatus('error','Online Cloud 同步失败',String(error?.message || error));
      return false;
    } finally { busy = false; renderStatus(); }
  }

  function markDirty(reason = 'Online Store 资料已修改') {
    if (suppressDirty) return;
    const meta = getMeta();
    setMeta({ dirty:true, dirtyReason:String(reason || 'Online Store 资料已修改'), lastError:'' });
    clearTimeout(pushTimer);
    if (!meta.initialized || meta.conflict || !navigator.onLine) return;
    pushTimer = window.setTimeout(() => { syncNow({ reason:'save-debounce' }).catch(() => {}); }, 900);
  }

  function hasMeaningfulLocalData() {
    const sum = snapshotSummary(snapshot());
    return sum.total > 0 || sum.history > 0;
  }

  async function autoBootstrap(reason = 'startup') {
    if (!cloudConfigured() || !navigator.onLine || busy) return false;
    const meta = getMeta();
    if (meta.initialized) return checkCloud({ allowAutoApply:true, reason });

    busy = true;
    setStatus('busy','本机资料已保留 · 后台检查 Cloud…','V16.2 新设备零设置：自动读取 Cloud Revision 并建立同步基线。');
    try {
      const remoteMeta = await pullRemoteMeta();
      setMeta({ lastCheckedAt:nowIso(), lastError:'' });
      if (!remoteMeta) {
        setStatus('warn','Cloud 目前为空','只有第一台设备建立 Cloud 主档时才需要“首次上传本机资料”。');
        return false;
      }
      const rr = Math.max(0, Number(remoteMeta.revision)||0);
      const remote = await pullRemote();
      if (!remote) throw new Error('Cloud Revision 存在，但完整资料读取失败。');
      if (hasMeaningfulLocalData()) saveAutomaticSafetyBackup(`Auto bootstrap before Cloud R${rr}`);
      applySnapshot(remote.payload, rr, `auto-bootstrap-${reason}`);
      setStatus('ok','新设备已自动同步 Cloud',`Revision R${rr} · 无需设置、无需登录。`);
      return true;
    } catch (error) {
      setMeta({ lastError:String(error?.message || error) });
      setStatus('error','自动 Cloud 检查失败',String(error?.message || error));
      return false;
    } finally {
      busy = false;
      renderStatus();
    }
  }

  window.v151MarkOnlineCloudDirty = markDirty;
  window.v151OnlineCloudSyncNow = () => syncNow({ reason:'external-manual' });

  function ensurePullRefreshIndicator() {
    let el = document.getElementById('v157PullRefreshIndicator');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'v157PullRefreshIndicator';
    el.className = 'v157-pull-refresh-indicator';
    el.setAttribute('aria-live','polite');
    el.innerHTML = '<span class="v157-pull-refresh-icon">↓</span><strong>下拉刷新 Cloud</strong>';
    document.body.appendChild(el);
    return el;
  }

  function setPullRefreshState(state, text) {
    const el = ensurePullRefreshIndicator();
    el.dataset.state = state || 'idle';
    const strong = el.querySelector('strong');
    const icon = el.querySelector('.v157-pull-refresh-icon');
    if (strong) strong.textContent = text || '下拉刷新 Cloud';
    if (icon) icon.textContent = state === 'busy' ? '↻' : state === 'ready' ? '↑' : state === 'ok' ? '✓' : state === 'error' ? '!' : '↓';
  }

  function installMobilePullToRefresh() {
    if (window.__v157PullRefreshBound) return;
    window.__v157PullRefreshBound = true;
    const coarse = window.matchMedia?.('(pointer: coarse)')?.matches || navigator.maxTouchPoints > 0;
    if (!coarse) return;
    let tracking = false, startY = 0, distance = 0, refreshing = false;
    const threshold = 72;
    const ignoreTarget = target => !!target?.closest?.('input,textarea,select,[contenteditable="true"],button,a');
    const reset = (delay=0) => window.setTimeout(() => {
      const el = ensurePullRefreshIndicator();
      el.classList.remove('show');
      el.style.removeProperty('--pull-distance');
      el.dataset.state = 'idle';
      tracking = false; distance = 0;
    }, delay);

    document.addEventListener('touchstart', e => {
      if (refreshing || e.touches.length !== 1 || window.scrollY > 2 || ignoreTarget(e.target)) return;
      tracking = true;
      startY = e.touches[0].clientY;
      distance = 0;
    }, {passive:true});

    document.addEventListener('touchmove', e => {
      if (!tracking || e.touches.length !== 1) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || window.scrollY > 2) { tracking = false; reset(); return; }
      distance = Math.min(120, dy * 0.55);
      const el = ensurePullRefreshIndicator();
      el.classList.add('show');
      el.style.setProperty('--pull-distance', `${distance}px`);
      setPullRefreshState(distance >= threshold ? 'ready' : 'pull', distance >= threshold ? '松手刷新 Cloud' : '继续下拉刷新');
    }, {passive:true});

    document.addEventListener('touchend', async () => {
      if (!tracking) return;
      tracking = false;
      if (distance < threshold || refreshing) { reset(120); return; }
      refreshing = true;
      const el = ensurePullRefreshIndicator();
      el.classList.add('show');
      setPullRefreshState('busy','正在检查 Cloud…');
      try {
        const result = await checkCloud({allowAutoApply:true, reason:'mobile-pull-refresh'});
        setPullRefreshState('ok', result?.applied ? '已同步最新资料' : 'Cloud 没有新资料');
        reset(1100);
      } catch (error) {
        const detail = String(error?.message || error || '未知错误');
        setPullRefreshState('error',`同步失败：${detail}`);
        reset(4200);
      } finally {
        refreshing = false;
      }
    }, {passive:true});
    document.addEventListener('touchcancel', () => { if (tracking) reset(); }, {passive:true});
  }

  function setupUi() {
    renderStatus();
    document.getElementById('v151CloudCheck')?.addEventListener('click', async e => {
      e.currentTarget.disabled=true;
      try { await checkCloud({allowAutoApply:true,reason:'manual'}); }
      catch(error) { alert(`Cloud 检查失败：${error?.message||error}`); }
      finally { e.currentTarget.disabled=false; }
    });
    document.getElementById('v151CloudFirstUpload')?.addEventListener('click', async e => {
      e.currentTarget.disabled=true;
      try { await firstUpload(); }
      catch(error) { setStatus('error','首次上传失败',String(error?.message||error)); alert(`首次上传失败：${error?.message||error}`); }
      finally { e.currentTarget.disabled=false; }
    });
    document.getElementById('v151CloudDownload')?.addEventListener('click', async e => {
      e.currentTarget.disabled=true;
      try { await forceDownloadCloud(); }
      catch(error) { setStatus('error','Cloud 下载失败',String(error?.message||error)); alert(`Cloud 下载失败：${error?.message||error}`); }
      finally { e.currentTarget.disabled=false; }
    });
    document.getElementById('v151CloudSyncNow')?.addEventListener('click', async e => {
      e.currentTarget.disabled=true;
      try { await forceUploadLocal(); }
      catch(error) { setStatus('error','Cloud 同步失败',String(error?.message||error)); alert(`Cloud 同步失败：${error?.message||error}`); }
      finally { e.currentTarget.disabled=false; }
    });
  }

  const cloudApiV161 = Object.freeze({
    check: (reason='system-status') => checkCloud({ allowAutoApply:true, reason }),
    sync: (reason='external-manual') => syncNow({ reason }),
    meta: () => ({ ...getMeta() }),
    diagnostics: () => ({ ...cloudDiagnostics, browserOnline:navigator.onLine }),
    configured: () => cloudConfigured()
  });
  window.LLAOnlineCloudV161 = cloudApiV161;
  window.LLAOnlineCloudV157 = cloudApiV161;

  function backgroundCheck(reason) {
    const now = Date.now();
    if (now - lastBackgroundCheckAt < BACKGROUND_CHECK_MIN_MS) return;
    lastBackgroundCheckAt = now;
    if (!cloudConfigured() || !navigator.onLine || busy) return;
    autoBootstrap(reason).catch(()=>{});
  }

  window.addEventListener('online', () => setTimeout(() => backgroundCheck('online'), 350));
  window.addEventListener('focus', () => setTimeout(() => backgroundCheck('focus'), 350));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(() => backgroundCheck('visibility-return'), 350); });
  window.addEventListener('pageshow', () => setTimeout(() => backgroundCheck('pageshow'), 450));
  window.addEventListener('storage', event => {
    if ([STATE_KEY,UI_KEY,HISTORY_KEY,TEMPLATE_KEY,HOLIDAY_KEY,LOCAL_PRODUCTS_KEY].includes(event.key)) renderStatus();
  });
  window.setInterval(() => {
    if (!document.hidden && navigator.onLine) backgroundCheck('periodic-60s');
  }, PERIODIC_REVISION_CHECK_MS);

  window.addEventListener('DOMContentLoaded', () => {
    setupUi();
    installMobilePullToRefresh();
    setTimeout(() => backgroundCheck('startup'), 500);
  });
})();
