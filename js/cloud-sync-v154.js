/* Lover Legend Online Store V15.4 — Auto Online Cloud Sync
   - Online Store data only; Import / Inventory remains read-only.
   - Supabase Auth + RLS. The anon key is public by design; writes require an authenticated user.
   - Local cache first; automatic startup/focus/network sync after first migration; revision conflict protection; lightweight revision checks only.
*/
(() => {
  'use strict';

  const CFG_KEY = 'llaOnlineStoreV151::cloudConfig';
  const SESSION_KEY = 'llaOnlineStoreV151::cloudSession';
  const META_KEY = 'llaOnlineStoreV151::cloudMeta';
  const STATE_KEY = 'llaOnlineStoreV22::state';
  const UI_KEY = 'llaOnlineStoreV22::ui';
  const HISTORY_KEY = 'llaOnlineStoreV22::history';
  const TEMPLATE_KEY = 'onlineStoreContentTemplatesV41';
  const HOLIDAY_KEY = 'onlineStoreHolidayModeV29';
  const LOCAL_PRODUCTS_KEY = 'llaOnlineStoreV70::localProducts';
  const SETTINGS_REVISION_KEY = 'llaOnlineStoreV22::settingsRevisionV78';
  const APP_VERSION = '15.4';
  const DEFAULT_STORE_ID = 'lover-legend-main';

  let busy = false;
  let pushTimer = 0;
  let suppressDirty = false;
  let lastStatusKind = 'idle';
  let lastBackgroundCheckAt = 0;
  const BACKGROUND_CHECK_MIN_MS = 3500;
  const PERIODIC_REVISION_CHECK_MS = 60000;

  const parse = (raw, fallback) => {
    try { return raw == null || raw === '' ? fallback : JSON.parse(raw); }
    catch (_) { return fallback; }
  };
  const readJSON = (key, fallback) => parse(localStorage.getItem(key), fallback);
  const writeJSON = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const cleanUrl = value => String(value || '').trim().replace(/\/+$/, '');
  const nowIso = () => new Date().toISOString();
  const fmtTime = value => {
    const d = new Date(value || '');
    if (Number.isNaN(d.getTime())) return '尚未同步';
    const p = n => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth()+1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };

  function getConfig() {
    const raw = readJSON(CFG_KEY, {});
    return {
      url: cleanUrl(raw?.url),
      anonKey: String(raw?.anonKey || '').trim(),
      storeId: String(raw?.storeId || DEFAULT_STORE_ID).trim() || DEFAULT_STORE_ID,
      email: String(raw?.email || '').trim()
    };
  }

  function saveConfig(cfg) {
    const next = {
      url: cleanUrl(cfg?.url),
      anonKey: String(cfg?.anonKey || '').trim(),
      storeId: String(cfg?.storeId || DEFAULT_STORE_ID).trim() || DEFAULT_STORE_ID,
      email: String(cfg?.email || '').trim()
    };
    writeJSON(CFG_KEY, next);
    return next;
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

  function getSession() {
    const raw = readJSON(SESSION_KEY, {});
    return raw && typeof raw === 'object' ? raw : {};
  }

  function saveSession(session) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const next = {
      access_token: String(session?.access_token || ''),
      refresh_token: String(session?.refresh_token || ''),
      token_type: String(session?.token_type || 'bearer'),
      expires_at: Number(session?.expires_at) || (nowSeconds + Math.max(0, Number(session?.expires_in) || 0)),
      user: session?.user ? { id: String(session.user.id || ''), email: String(session.user.email || '') } : null
    };
    writeJSON(SESSION_KEY, next);
    return next;
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    renderStatus();
  }

  function configured(cfg = getConfig()) {
    return /^https:\/\/.+\.supabase\.co$/i.test(cfg.url) && cfg.anonKey.length > 20 && cfg.storeId.length > 0;
  }

  function sessionActive(session = getSession()) {
    return Boolean(session?.access_token && Number(session?.expires_at || 0) > Math.floor(Date.now()/1000) + 45);
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
  }

  function renderStatus() {
    const cfg = getConfig();
    const meta = getMeta();
    const session = getSession();
    const rev = document.getElementById('v151CloudRevision');
    const last = document.getElementById('v151CloudLastSync');
    if (rev) rev.textContent = meta.revision ? `R${meta.revision}` : '尚未建立';
    if (last) last.textContent = fmtTime(meta.lastSyncedAt);

    if (!configured(cfg)) {
      setStatus('idle', 'Online Cloud 未配置', '先填 Supabase Project URL、Anon Key，再登录。当前仍使用本机 Local Cache。');
      return;
    }
    if (!sessionActive(session) && !session?.refresh_token) {
      if (meta.lastError) {
        setStatus('error', 'Cloud 登录失败', meta.lastError);
      } else {
        setStatus(meta.dirty ? 'warn' : 'idle', meta.dirty ? '本机有未同步资料' : 'Cloud 已配置 · 尚未登录', meta.dirty ? '资料仍安全保存在这台设备；登录后再同步。' : '请使用 Supabase Auth 账号登录。');
      }
      return;
    }
    if (meta.conflict) {
      setStatus('error', '同步冲突 · 已阻止覆盖', 'Cloud 与本机都发生过修改。请先检查 Cloud，再明确选择上传本机或下载 Cloud。');
      return;
    }
    if (meta.dirty) {
      setStatus('warn', '本机有待同步修改', meta.dirtyReason ? `待同步：${meta.dirtyReason}` : '等待上传 Cloud。');
      return;
    }
    if (meta.initialized) {
      setStatus(lastStatusKind === 'busy' ? 'busy' : 'ok', lastStatusKind === 'busy' ? '正在同步 Online Cloud…' : 'Online Cloud 已同步', `Revision R${meta.revision || 0} · 自动同步已开启 · 最后同步 ${fmtTime(meta.lastSyncedAt)}`);
      return;
    }
    setStatus('warn', 'Cloud 已连接 · 尚未完成首次迁移', '先“检查 Cloud”。若 Cloud 为空，再执行“首次上传本机资料”。');
  }

  function snapshot() {
    return {
      schemaVersion: 154,
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

  async function authRequest(path, body) {
    const cfg = getConfig();
    if (!configured(cfg)) throw new Error('请先保存 Supabase Project URL / Anon Key。');
    const response = await fetch(`${cfg.url}/auth/v1/${path}`, {
      method:'POST',
      headers:{ 'apikey':cfg.anonKey, 'Content-Type':'application/json' },
      body:JSON.stringify(body || {})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || `Auth HTTP ${response.status}`);
    return data;
  }

  async function login(email, password) {
    if (!email || !password) throw new Error('请输入 Cloud Email 和 Password。');
    const data = await authRequest('token?grant_type=password', { email, password });
    saveSession(data);
    const cfg = getConfig();
    if (email !== cfg.email) saveConfig({ ...cfg, email });
    renderStatus();
    return data;
  }

  async function ensureSession() {
    let session = getSession();
    if (sessionActive(session)) return session;
    if (!session?.refresh_token) throw new Error('Cloud 登录已失效，请重新登录。');
    try {
      const data = await authRequest('token?grant_type=refresh_token', { refresh_token:session.refresh_token });
      session = saveSession(data);
      return session;
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  function recoveryRedirectUrl() {
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    return url.toString();
  }

  async function sendPasswordRecovery(email) {
    const cfg = getConfig();
    if (!configured(cfg)) throw new Error('请先保存 Supabase Project URL / Anon Key。');
    const normalizedEmail = String(email || '').trim();
    if (!normalizedEmail) throw new Error('请先填写 Cloud Email。');
    const redirectTo = recoveryRedirectUrl();
    const response = await fetch(`${cfg.url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method:'POST',
      headers:{ 'apikey':cfg.anonKey, 'Content-Type':'application/json' },
      body:JSON.stringify({ email:normalizedEmail })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || `Recovery HTTP ${response.status}`);
    return data;
  }

  async function updateRecoveryPassword(password) {
    const cfg = getConfig();
    const session = getSession();
    if (!configured(cfg)) throw new Error('Cloud 尚未配置。');
    if (!session?.access_token) throw new Error('Password Recovery Session 已失效，请重新发送重设密码邮件。');
    const response = await fetch(`${cfg.url}/auth/v1/user`, {
      method:'PUT',
      headers:{
        'apikey':cfg.anonKey,
        'Authorization':`Bearer ${session.access_token}`,
        'Content-Type':'application/json'
      },
      body:JSON.stringify({ password })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.msg || data?.message || data?.error_description || data?.error || `Password HTTP ${response.status}`);
    return data;
  }

  function removeRecoveryParamsFromUrl() {
    const url = new URL(window.location.href);
    ['access_token','refresh_token','expires_in','expires_at','token_type','type','error','error_code','error_description','code'].forEach(key => url.searchParams.delete(key));
    url.hash = '';
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}` || '/');
  }

  function openRecoveryDialog() {
    document.getElementById('v153RecoveryOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'v153RecoveryOverlay';
    overlay.className = 'v153-recovery-overlay';
    overlay.innerHTML = `
      <div class="v153-recovery-dialog" role="dialog" aria-modal="true" aria-labelledby="v153RecoveryTitle">
        <div class="v153-recovery-head">
          <div><strong id="v153RecoveryTitle">重设 Cloud 密码</strong><small>Supabase Password Recovery</small></div>
          <button type="button" class="v153-recovery-x" aria-label="关闭">×</button>
        </div>
        <p>请输入新的 Cloud Password。更新成功后，请使用新密码重新登录 Online Cloud。</p>
        <label>新密码
          <input id="v153RecoveryPassword" type="password" autocomplete="new-password" placeholder="至少 6 个字符" />
        </label>
        <label>确认新密码
          <input id="v153RecoveryPasswordConfirm" type="password" autocomplete="new-password" placeholder="再次输入新密码" />
        </label>
        <div class="v153-recovery-error" id="v153RecoveryError" hidden></div>
        <div class="v153-recovery-actions">
          <button type="button" class="secondary-btn v153-recovery-cancel">取消</button>
          <button type="button" class="primary-btn v153-recovery-confirm">确认更新密码</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    document.body.classList.add('v153-recovery-open');
    const close = () => {
      overlay.remove();
      document.body.classList.remove('v153-recovery-open');
    };
    overlay.querySelector('.v153-recovery-x')?.addEventListener('click', close);
    overlay.querySelector('.v153-recovery-cancel')?.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    const submit = overlay.querySelector('.v153-recovery-confirm');
    submit?.addEventListener('click', async () => {
      const p1 = String(document.getElementById('v153RecoveryPassword')?.value || '');
      const p2 = String(document.getElementById('v153RecoveryPasswordConfirm')?.value || '');
      const errorBox = document.getElementById('v153RecoveryError');
      const showError = message => { if (errorBox) { errorBox.hidden = false; errorBox.textContent = message; } };
      if (p1.length < 6) { showError('新密码至少需要 6 个字符。'); return; }
      if (p1 !== p2) { showError('两次输入的密码不一致。'); return; }
      submit.disabled = true;
      if (errorBox) { errorBox.hidden = true; errorBox.textContent = ''; }
      try {
        await updateRecoveryPassword(p1);
        localStorage.removeItem(SESSION_KEY);
        setMeta({ lastError:'' });
        setStatus('ok','Cloud 密码已更新','请在 Online Cloud Sync 使用新密码重新登录。');
        close();
        document.getElementById('v151CloudSyncPanel')?.scrollIntoView({ behavior:'smooth', block:'start' });
        setTimeout(() => document.getElementById('v151CloudPassword')?.focus(), 350);
      } catch (error) {
        showError(String(error?.message || error || '密码更新失败'));
      } finally {
        if (submit.isConnected) submit.disabled = false;
      }
    });
    setTimeout(() => document.getElementById('v153RecoveryPassword')?.focus(), 60);
  }

  function captureRecoverySessionFromUrl() {
    const hash = new URLSearchParams(String(window.location.hash || '').replace(/^#/,''));
    const query = new URLSearchParams(window.location.search || '');
    const errorCode = hash.get('error_code') || query.get('error_code') || '';
    const errorDescription = hash.get('error_description') || query.get('error_description') || '';
    if (errorCode || errorDescription) {
      const message = decodeURIComponent(String(errorDescription || errorCode).replace(/\+/g,' '));
      if (/otp_expired|expired|invalid/i.test(`${errorCode} ${message}`)) {
        setMeta({ lastError:message });
        setStatus('error','Reset Password 链接已失效', '请重新发送一封 Password Recovery Email，再使用最新链接。');
      }
      removeRecoveryParamsFromUrl();
      return false;
    }
    const type = hash.get('type') || query.get('type') || '';
    const accessToken = hash.get('access_token') || query.get('access_token') || '';
    if (type !== 'recovery' || !accessToken) return false;
    saveSession({
      access_token:accessToken,
      refresh_token:hash.get('refresh_token') || query.get('refresh_token') || '',
      token_type:hash.get('token_type') || query.get('token_type') || 'bearer',
      expires_in:Number(hash.get('expires_in') || query.get('expires_in') || 3600)
    });
    setMeta({ lastError:'' });
    removeRecoveryParamsFromUrl();
    setStatus('warn','Password Recovery 已验证','请在弹出的窗口设置新的 Cloud Password。');
    openRecoveryDialog();
    return true;
  }

  async function cloudFetch(path, options = {}) {
    const cfg = getConfig();
    const session = await ensureSession();
    const response = await fetch(`${cfg.url}/rest/v1/${path}`, {
      ...options,
      headers:{
        'apikey':cfg.anonKey,
        'Authorization':`Bearer ${session.access_token}`,
        'Content-Type':'application/json',
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch (_) { data = text; }
    if (!response.ok) {
      const message = data?.message || data?.hint || data?.details || data?.error || `Cloud HTTP ${response.status}`;
      throw new Error(String(message));
    }
    return data;
  }

  async function pullRemoteMeta() {
    const cfg = getConfig();
    const query = `online_store_sync?store_id=eq.${encodeURIComponent(cfg.storeId)}&select=store_id,revision,updated_at&limit=1`;
    const rows = await cloudFetch(query, { method:'GET' });
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function pullRemote() {
    const cfg = getConfig();
    const query = `online_store_sync?store_id=eq.${encodeURIComponent(cfg.storeId)}&select=store_id,revision,payload,updated_at&limit=1`;
    const rows = await cloudFetch(query, { method:'GET' });
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function pushRemote(baseRevision, payload) {
    const cfg = getConfig();
    const result = await cloudFetch('rpc/online_store_sync_push', {
      method:'POST',
      body:JSON.stringify({ p_store_id:cfg.storeId, p_base_revision:Math.max(0, Number(baseRevision)||0), p_payload:payload })
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

    try { if (typeof applyOnlineStoreBrandingV12 === 'function') applyOnlineStoreBrandingV12(); } catch (_) {}
    try { if (typeof renderOnlineStoreProductListV10 === 'function') renderOnlineStoreProductListV10(); } catch (_) {}
    try { if (typeof renderOnlineStoreHistoryV14 === 'function') renderOnlineStoreHistoryV14(); } catch (_) {}
    try { if (typeof renderStorePreviewV13 === 'function') renderStorePreviewV13(); } catch (_) {}
    try { if (typeof v41RenderTemplateList === 'function') v41RenderTemplateList(); } catch (_) {}
    try { if (typeof v71RebuildLocalPanel === 'function') v71RebuildLocalPanel(); } catch (_) {}
    try { if (typeof v78ApplyFreshSettings === 'function') v78ApplyFreshSettings(`cloud-${source}`); } catch (_) {}
    try { window.dispatchEvent(new CustomEvent('online-store-v151-cloud-applied',{detail:{revision,source}})); } catch (_) {}
  }

  async function checkCloud({ allowAutoApply = true, reason = 'manual' } = {}) {
    if (busy) return null;
    busy = true;
    setStatus('busy','正在检查 Online Cloud…',reason === 'manual' ? '读取 Cloud revision，不会覆盖本机资料。' : '后台检查 revision。');
    try {
      const remoteMeta = await pullRemoteMeta();
      const meta = getMeta();
      setMeta({ lastCheckedAt:nowIso(), lastError:'' });
      if (!remoteMeta) {
        if (meta.initialized && meta.revision > 0) {
          setStatus('error','Cloud 资料不存在','已阻止自动建立空资料。请检查 Supabase Store ID / Table。');
        } else {
          setStatus('warn','Cloud 目前为空','可以安全执行“首次上传本机资料”。不会自动上传。');
        }
        return null;
      }
      const remoteRevision = Math.max(0, Number(remoteMeta.revision)||0);
      if (!meta.initialized) {
        setStatus('warn',`Cloud 已有资料 · R${remoteRevision}`,'这台设备尚未建立 Cloud 基线；系统会在安全条件下自动下载，否则要求人工确认。');
        return remoteMeta;
      }
      if (remoteRevision > meta.revision) {
        if (meta.dirty) {
          setMeta({ conflict:true });
          setStatus('error',`同步冲突 · Cloud R${remoteRevision} / 本机 R${meta.revision}`,'两边都有修改，系统已阻止自动覆盖。');
          return remoteMeta;
        }
        if (allowAutoApply) {
          const remote = await pullRemote();
          if (!remote) throw new Error('Cloud Revision 存在，但完整资料读取失败。');
          applySnapshot(remote.payload, remoteRevision, reason);
          setStatus('ok','Online Cloud 已更新到本机',`已应用 Cloud Revision R${remoteRevision}。`);
        }
        return remoteMeta;
      }
      if (remoteRevision < meta.revision) {
        setMeta({ conflict:true });
        setStatus('error',`Revision 异常 · Cloud R${remoteRevision} / 本机 R${meta.revision}`,'已阻止覆盖；请检查是否切换了 Store ID 或恢复过旧 Cloud。');
        return remoteMeta;
      }
      if (meta.dirty) {
        busy = false;
        return await syncNow({ reason:`${reason}-push`, skipInitialPull:true });
      }
      setMeta({ conflict:false, lastSyncedAt:meta.lastSyncedAt || nowIso() });
      setStatus('ok','Online Cloud 已同步',`Revision R${remoteRevision} · 没有新变化。`);
      return remoteMeta;
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
    const cfg = getConfig();
    if (!configured(cfg)) throw new Error('请先保存 Cloud 连接设置。');
    await ensureSession();
    const remote = await pullRemoteMeta();
    if (remote) throw new Error(`Cloud 已有 Revision R${remote.revision}，已阻止“首次上传”覆盖。请先检查 Cloud。`);
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
      setStatus('ok','首次 Cloud Migration 完成',`Cloud Revision R${Number(result.revision)||1} 已建立。后续保存会自动同步。`);
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
      setStatus('warn','尚未完成首次 Cloud Migration','请先检查 Cloud，然后选择“首次上传本机资料”或“从 Cloud 下载”。');
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
    const cfg = getConfig();
    const session = getSession();
    if (!configured(cfg) || (!sessionActive(session) && !session?.refresh_token) || !navigator.onLine || busy) return false;

    const meta = getMeta();
    if (meta.initialized) return checkCloud({ allowAutoApply:true, reason });

    busy = true;
    setStatus('busy','本机资料已保留 · 后台检查 Cloud…','自动检查 Cloud Revision；只有安全时才会自动应用。');
    try {
      await ensureSession();
      const remoteMeta = await pullRemoteMeta();
      setMeta({ lastCheckedAt:nowIso(), lastError:'' });
      if (!remoteMeta) {
        setStatus('warn','Cloud 目前为空','这是尚未建立 Cloud 主档的设备；只有首次建立主档时才需要“首次上传本机资料”。');
        return false;
      }

      const rr = Math.max(0, Number(remoteMeta.revision)||0);
      if (hasMeaningfulLocalData()) {
        setStatus('warn',`Cloud 已有资料 · R${rr}`,'这台设备尚未建立同步基线，而且本机已有资料。为避免误覆盖，请人工选择“从 Cloud 下载”或先备份本机。');
        return false;
      }

      const remote = await pullRemote();
      if (!remote) throw new Error('Cloud Revision 存在，但完整资料读取失败。');
      applySnapshot(remote.payload, rr, `auto-bootstrap-${reason}`);
      setStatus('ok','新设备已自动同步 Cloud',`已建立本机基线 Revision R${rr}。以后打开网页会自动检查更新。`);
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
  window.v154OnlineCloudAutoCheck = () => autoBootstrap('external-auto-check');

  function populateUi() {
    const cfg = getConfig();
    const map = {
      v151SupabaseUrl:cfg.url,
      v151SupabaseAnonKey:cfg.anonKey,
      v151StoreId:cfg.storeId,
      v151CloudEmail:cfg.email
    };
    Object.entries(map).forEach(([id,value]) => { const el=document.getElementById(id); if(el)el.value=value || ''; });
    renderStatus();
  }

  function setupUi() {
    populateUi();
    document.getElementById('v151SaveCloudConfig')?.addEventListener('click', () => {
      const before = getConfig();
      const cfg = saveConfig({
        url:document.getElementById('v151SupabaseUrl')?.value,
        anonKey:document.getElementById('v151SupabaseAnonKey')?.value,
        storeId:document.getElementById('v151StoreId')?.value,
        email:document.getElementById('v151CloudEmail')?.value
      });
      if (before.url && (before.url !== cfg.url || before.storeId !== cfg.storeId)) {
        const dirty = getMeta().dirty;
        setMeta({ revision:0, initialized:false, conflict:false, dirty, lastSyncedAt:'', lastCheckedAt:'', lastError:'', dirtyReason:dirty?'Cloud 连接已切换；本机资料尚未同步':'' });
        clearSession();
      }
      if (!configured(cfg)) { setStatus('error','Cloud 连接设置不完整','Project URL 应为 https://xxxx.supabase.co，并填写 Publishable / Anon Key。'); return; }
      setMeta({ lastError:'' });
      setStatus('idle','Cloud 连接设置已保存','下一步使用 Supabase Auth 账号登录。');
    });

    document.getElementById('v151CloudLogin')?.addEventListener('click', async e => {
      const btn=e.currentTarget; btn.disabled=true;
      try {
        const email=String(document.getElementById('v151CloudEmail')?.value||'').trim();
        const password=String(document.getElementById('v151CloudPassword')?.value||'');
        setMeta({ lastError:'' });
        setStatus('busy','正在登录 Cloud…',email || '正在连接 Supabase Auth');
        await login(email,password);
        const p=document.getElementById('v151CloudPassword'); if(p)p.value='';
        setMeta({ lastError:'' });
        setStatus('ok','Cloud 登录成功',email);
        await autoBootstrap('login');
      } catch(error) {
        const message=String(error?.message||error||'未知登录错误');
        setMeta({ lastError:message });
        setStatus('error','Cloud 登录失败',message);
      } finally {
        btn.disabled=false;
      }
    });

    document.getElementById('v153CloudPasswordReset')?.addEventListener('click', async e => {
      const btn=e.currentTarget; btn.disabled=true;
      try {
        const email=String(document.getElementById('v151CloudEmail')?.value||'').trim();
        setStatus('busy','正在发送重设密码邮件…',email || '请先填写 Cloud Email');
        await sendPasswordRecovery(email);
        setMeta({ lastError:'' });
        setStatus('ok','重设密码邮件已发送','请打开最新的 Supabase Email，并使用邮件中的 Reset Password 链接。');
      } catch(error) {
        const message=String(error?.message||error||'发送失败');
        setMeta({ lastError:message });
        setStatus('error','重设密码邮件发送失败',message);
      } finally { btn.disabled=false; }
    });

    document.getElementById('v151CloudLogout')?.addEventListener('click', () => {
      if (!confirm('退出这台设备的 Online Cloud 登录？\n本机资料不会删除。')) return;
      setMeta({ lastError:'' });
      clearSession();
      setStatus('idle','已退出 Online Cloud','本机 Local Cache 保留。');
    });

    document.getElementById('v151CloudCheck')?.addEventListener('click', async e => {
      e.currentTarget.disabled=true;
      try { await checkCloud({allowAutoApply:false,reason:'manual'}); }
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

  function backgroundCheck(reason) {
    const now = Date.now();
    if (now - lastBackgroundCheckAt < BACKGROUND_CHECK_MIN_MS) return;
    lastBackgroundCheckAt = now;
    const cfg=getConfig(), session=getSession();
    if (!configured(cfg) || (!sessionActive(session) && !session?.refresh_token) || !navigator.onLine || busy) return;
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
    const recovering = captureRecoverySessionFromUrl();
    if (!recovering) setTimeout(() => backgroundCheck('startup'), 650);
  });
})();
