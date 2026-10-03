(() => {
  'use strict';

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = n => `RM ${Number(n || 0).toLocaleString('en-MY',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const roomNames = { vip:'VIP Room 贵宾室', premium:'Premium 精品馆', starter:'Starter 入门首选', random:'Random 随机发货' };
  const pageTitles = {dashboard:'商店经营动态',products:'商品管理',orders:'订单管理',shipping:'物流管理',marketing:'营销管理',finance:'财务管理',affiliate:'联盟管理',preview:'前台预览',history:'历史查询',settings:'设置'};

  const UI = {
    page:'dashboard', productTab:'overview', room:null, productId:null, importSource:'—', editorDirty:false, historyQuery:''
  };

  function toast(msg, type='ok') {
    const el = document.createElement('div'); el.className = `toast ${type === 'error' ? 'error' : type === 'warn' ? 'warn' : ''}`; el.textContent = msg;
    $('#toastHost').appendChild(el); setTimeout(() => el.remove(), 3200);
  }

  function confirmLeaveIfDirty() {
    if (!UI.editorDirty) return true;
    return window.confirm('有未保存修改。确认离开？');
  }

  function showPage(page) {
    if (UI.page === 'products' && page !== 'products' && UI.productId && !confirmLeaveIfDirty()) return;
    UI.page = page;
    $$('.page').forEach(x => x.classList.toggle('active', x.id === `page-${page}`));
    $$('[data-page]').forEach(x => x.classList.toggle('active', x.dataset.page === page));
    $('#pageTitle').textContent = pageTitles[page] || 'Lover Legend';
    if (page === 'dashboard') renderDashboard();
    if (page === 'products') renderProductArea();
    if (page === 'orders') renderOrders();
    if (page === 'preview') renderPreview();
    if (page === 'history') renderHistory();
    if (page === 'settings') renderSettings();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function setProductTab(tab) {
    if (UI.productId && tab !== UI.productTab && !confirmLeaveIfDirty()) return;
    UI.productTab = tab;
    UI.productId = null; UI.editorDirty = false;
    $('#productOverview').classList.toggle('active', tab === 'overview');
    $('#roomView').classList.toggle('active', ['vip','premium','starter','random'].includes(tab));
    $('#childrenView').classList.toggle('active', tab === 'children');
    $('#templatesView').classList.toggle('active', tab === 'templates');
    $$('#productTabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    if (['vip','premium','starter','random'].includes(tab)) enterRoom(tab);
    if (tab === 'children') renderAllChildren();
    if (tab === 'templates') renderTemplates();
  }

  function renderProductArea() {
    setProductTab(UI.productTab || 'overview');
  }

  function enterRoom(room) {
    UI.room = room; UI.productId = null; UI.editorDirty = false;
    $('#roomTitle').textContent = `当前房间：${roomNames[room]}`;
    $('#roomHint').textContent = room === 'random' ? 'Random 只用母产品编号，不建立 Child。' : room === 'vip' ? 'VIP 为收藏级单棵产品，不建立 Child。' : 'Premium / Starter 可建立最多 10 个 Child。';
    $('#roomSearchArea').classList.remove('hidden'); $('#productEditor').classList.add('hidden'); $('#productEditor').innerHTML='';
    $('#roomSearchInput').value=''; $('#roomSearchResults').innerHTML='';
    renderRoomList();
  }

  function renderRoomList() {
    const state = LLStore.getState();
    const room = UI.room;
    const items = Object.values(state.products).filter(p => p.rooms?.[room]?.assigned);
    $('#roomProductList').innerHTML = items.length ? items.map(p => {
      const r = p.rooms[room];
      const published = !!r.publishedAt;
      return `<article class="product-card">
        <div class="title"><b>${esc(p.id)} · ${esc(p.frontName || '未设置前台名称')}</b><span>${published ? `已上架 · ${formatTime(r.publishedAt)}` : r.draftSavedAt ? `草稿 · ${formatTime(r.draftSavedAt)}` : '尚未保存草稿'}</span></div>
        <div class="status-line">${published?'<span class="badge blue">● 已上架</span>':'<span class="badge">草稿</span>'}${r.dirty?'<span class="badge orange">有未发布修改</span>':''}<button class="ghost" data-open-product="${esc(p.id)}">编辑</button></div>
      </article>`;
    }).join('') : `<div class="empty-state">这个房间暂时没有商品。请在上方搜索 Import 产品加入。</div>`;
  }

  function searchImport() {
    const q = $('#roomSearchInput').value.trim();
    if (!q) { $('#roomSearchResults').innerHTML=''; return; }
    const list = LLImport.search(q);
    $('#roomSearchResults').innerHTML = list.length ? list.map(p => `<div class="search-result">
      <div class="meta"><b>${esc(p.id)} · ${esc(p.name)}</b><span>库存 ${p.stock} · 平均成本 ${money(p.averageCost)} · 最低售价 ${money(p.minimumPrice)}</span></div>
      <button class="primary" data-select-import="${esc(p.id)}">选择产品</button>
    </div>`).join('') : '<div class="empty-state">没有找到产品。</div>';
  }

  function openProduct(id, assign=true) {
    if(assign && UI.room==='vip'){
      const st=LLStore.getState(); const already=!!st.products[id]?.rooms?.vip?.assigned;
      const vipCount=Object.values(st.products).filter(p=>p.rooms?.vip?.assigned).length;
      if(!already && vipCount>=30){ toast('VIP 房内最多 30 张商品卡','error'); return; }
    }
    const imp = LLImport.get(id) || {id,name:id,stock:0,averageCost:0,minimumPrice:0};
    LLStore.ensureProduct(id, imp);
    if (assign && !LLStore.getState().products[id]?.rooms?.[UI.room]?.assigned) LLStore.assignRoom(id, UI.room);
    UI.productId = id; UI.editorDirty = false;
    $('#roomSearchArea').classList.add('hidden'); $('#productEditor').classList.remove('hidden');
    renderEditor(); window.scrollTo({top:0,behavior:'smooth'});
  }

  function editorProduct() { return LLStore.getState().products[UI.productId]; }
  function importProduct() { return LLImport.get(UI.productId) || {id:UI.productId,name:UI.productId,stock:0,averageCost:0,minimumPrice:0}; }
  function pendingQty(id=UI.productId){ return LLStore.pendingQty(id); }
  function effectiveStock(){ const imp=importProduct(); return Math.max(0, num(imp.stock)-pendingQty()); }

  function pricing(p) {
    const imp = importProduct(), s = LLStore.getState().settings;
    const payment = s.paymentFeeEnabled ? num(s.paymentFeePct)/100 : 0;
    const affiliate = s.affiliateEnabled ? num(s.affiliatePct)/100 : 0;
    const margin = num(s.targetMarginPct)/100;
    const fixed = num(imp.averageCost)+num(p.potCost)+num(p.packagingCost)+num(p.otherCost)+(p.shipping?.sellerPays?num(p.shipping.sellerCost):0);
    const denom = 1-payment-affiliate-margin;
    const floor = denom > .01 ? fixed/denom : fixed;
    const price = num(p.defaultPrice);
    const variable = price*(payment+affiliate);
    const totalCost = fixed+variable;
    const profit = price-totalCost;
    const profitPct = price>0 ? profit/price*100 : 0;
    return {floor,totalCost,profit,profitPct};
  }

  function renderEditor() {
    const p=editorProduct(), imp=importProduct(), room=UI.room, r=p.rooms[room], calc=pricing(p);
    const assignedCount = room === 'premium' || room === 'starter' ? p.children[room].length : room === 'random' ? num(p.random.qty) : (r.assigned?1:0);
    const available = effectiveStock();
    const publishedStatus = r.publishedAt ? '<span class="badge blue">● 已上架</span>' : '<span class="badge">未上架</span>';
    const draftStatus = r.draftSavedAt ? `<span class="badge green">${r.publishedAt?'草稿已保存':'草稿已更新/保存'}</span>` : '';
    const dirtyStatus = UI.editorDirty || r.dirty ? '<span class="badge orange">有未发布修改</span>' : '';
    let roomSpecific='';
    if (room === 'premium' || room === 'starter') roomSpecific = renderParentMediaSection(p) + renderChildrenSection(p, room, calc.floor);
    else if (room === 'random') roomSpecific = renderRandomSection(p, available);
    else roomSpecific = renderVipSection(p);

    $('#productEditor').innerHTML = `
      <div class="editor-head"><div class="identity"><h2>${esc(p.id)} · ${esc(imp.name)}</h2><p>当前房间：${esc(roomNames[room])} · Import Read-Only</p></div><div class="editor-actions"><button class="ghost" id="closeEditorBtn">关闭</button><button class="danger" id="removeRoomBtn">移除此房</button></div></div>
      <div class="editor-status">${publishedStatus}${draftStatus}${dirtyStatus}<span class="badge">${esc(room)} · ${esc(p.id)}</span></div>
      <div class="inventory-strip">
        <div class="inventory-cell"><small>Import 真实总库存</small><b>${imp.stock}</b></div>
        <div class="inventory-cell"><small>Online Pending</small><b>${pendingQty()}</b></div>
        <div class="inventory-cell"><small>当前真实可售库存</small><b>${available}</b></div>
        <div class="inventory-cell"><small>当前房分配</small><b>${assignedCount}</b></div>
      </div>
      <section class="editor-section">
        <h3>Import Read-Only 数据</h3><p>Import / Inventory 是唯一 Source of Truth；Online 不回写库存、平均成本或最低售价。</p>
        <div class="form-grid three"><label>平均成本（Import）（RM）<input readonly value="${imp.averageCost.toFixed(2)}"></label><label>Import 当前最低售价（只读）（RM）<input readonly id="importMinPriceField" value="${imp.minimumPrice.toFixed(2)}"></label><label>Import 当前库存<input readonly value="${imp.stock}"></label></div>
      </section>
      <section class="editor-section">
        <h3>母产品共同资料</h3><p>Premium / Starter Child 新增时继承；Random 直接使用母产品资料。</p>
        <div class="form-grid two"><label>商品名称（前台显示）<input data-field="frontName" value="${esc(p.frontName)}"></label><label>母产品默认售价（RM）<input data-field="defaultPrice" type="number" step="0.01" value="${num(p.defaultPrice)}"></label></div>
        <label>商品卖点 / Short Summary<textarea data-field="summary" rows="2">${esc(p.summary)}</textarea></label>
        <label>Product Details<textarea data-field="details" rows="4">${esc(p.details)}</textarea></label>
        <label>Care Guide<textarea data-field="careGuide" rows="4">${esc(p.careGuide)}</textarea></label>
        <div class="form-grid four"><label>长 cm<input data-dim="length" type="number" step="0.1" value="${num(p.dimensions.length)}"></label><label>宽 cm<input data-dim="width" type="number" step="0.1" value="${num(p.dimensions.width)}"></label><label>高 cm<input data-dim="height" type="number" step="0.1" value="${num(p.dimensions.height)}"></label><label>重量 kg<input data-field="weight" type="number" step="0.1" value="${num(p.weight)}"></label></div>
      </section>
      <section class="editor-section">
        <h3>Online 成本与销售保护</h3><p>Import 最低售价变化不会覆盖母产品默认售价，只会重新计算保护线与利润。</p>
        <div class="form-grid four"><label>Online Pot Cost<input data-field="potCost" type="number" step="0.01" value="${num(p.potCost)}"></label><label>Packaging<input data-field="packagingCost" type="number" step="0.01" value="${num(p.packagingCost)}"></label><label>其他固定成本<input data-field="otherCost" type="number" step="0.01" value="${num(p.otherCost)}"></label><label>参考运费（买家承担）<input data-shipping="reference" type="number" step="0.01" value="${num(p.shipping.reference)}"></label></div>
        <div class="switch-row"><label><input data-shipping="sellerPays" type="checkbox" ${p.shipping.sellerPays?'checked':''}> 卖家包邮</label><button class="ghost" id="restoreSuggestedShippingBtn" type="button">恢复建议值</button></div>
        <div class="form-grid two"><label>卖家承担运费（RM）<input data-shipping="sellerCost" type="number" step="0.01" value="${num(p.shipping.sellerCost)}"></label><div></div></div>
        <div class="price-box" id="priceBox">${renderPriceStats(calc, p.defaultPrice)}</div>
      </section>
      ${roomSpecific}
      <div class="main-actions"><button class="primary" id="saveDraftBtn">${r.draftSavedAt?'更新草稿':'保存草稿'}</button><button class="publish-btn ${(r.publishedAt && !hasNewerDraft(r))?'unpublish':''}" id="publishBtn">${r.publishedAt ? (hasNewerDraft(r)?'更新商品卡并上架':'下架') : '确认商品卡并上架'}</button></div>
    `;
  }

  function renderPriceStats(calc, price) {
    return `<div class="price-stat"><small>Online 销售保护底线</small><b>${money(calc.floor)}</b></div><div class="price-stat"><small>实际总成本</small><b>${money(calc.totalCost)}</b></div><div class="price-stat ${calc.profit>=0?'positive':'negative'}"><small>实际净利</small><b>${money(calc.profit)}</b></div><div class="price-stat ${calc.profitPct>=0?'positive':'negative'}"><small>实际净利率</small><b>${calc.profitPct.toFixed(2)}%</b></div>`;
  }

  function hasNewerDraft(r){ return !!(r?.publishedAt && r?.draftSavedAt && new Date(r.draftSavedAt).getTime() > new Date(r.publishedAt).getTime()); }

  function renderParentMediaSection(p){
    const photos=(p.parentMedia?.photos||[]).slice(0,10).join('\n');
    const videos=(p.parentMedia?.videos||[]).slice(0,10).join('\n');
    return `<section class="editor-section"><h3>母产品照片 / 视频</h3><p>最多 10 张照片 + 10 个视频；每行一个 URL。只有 1 Photo + 1 Video 也允许母产品直接上架，不需要先建立 Child。</p><div class="form-grid two"><label>照片 URL（最多 10）<textarea data-parent-photos rows="6">${esc(photos)}</textarea></label><label>视频 URL（最多 10）<textarea data-parent-videos rows="6">${esc(videos)}</textarea></label></div></section>`;
  }

  function renderVipSection(p) {
    const photos=p.parentMedia?.photos||[], videos=p.parentMedia?.videos||[];
    return `<section class="editor-section"><h3>VIP 单棵媒体</h3><p>VIP 不建立 Child；至少 1 Photo + 1 Video 才允许上架。</p><div class="form-grid two"><label>照片 URL<input data-parent-media="photo" value="${esc(photos[0]||'')}"></label><label>视频 URL<input data-parent-media="video" value="${esc(videos[0]||'')}"></label></div></section>`;
  }

  function renderChildrenSection(p, room, floor) {
    const list=p.children[room]||[];
    const remaining=Math.max(0, Math.min(10,effectiveStock())-list.length);
    const cards=list.map(c=>renderChildCard(c,room,floor)).join('');
    return `<section class="editor-section"><h3>${room==='premium'?'Premium':'Starter'} · Individual Trees</h3><p>每个母产品最多 10 个 Child；可连续新增，不需要先保存上一棵。新增后继承母产品当前共同资料。</p><div class="limit-note">当前 ${list.length}/10 · 仍可新增 ${remaining} 棵（同时受真实可分配库存限制）</div><div class="child-list" style="margin-top:12px">${cards || '<div class="empty-state">尚未建立 Child。母产品本身仍可直接上架。</div>'}</div>${list.length<10 && list.length<effectiveStock()?'<div class="action-row"><button class="ghost" id="addFirstChildBtn">＋ 新增一棵</button></div>':''}</section>`;
  }

  function renderChildCard(c, room, floor) {
    const published=!!c.publishedAt; const newerDraft=!!(c.publishedAt&&c.draftSavedAt&&new Date(c.draftSavedAt)>new Date(c.publishedAt));
    return `<article class="child-card" data-child-card="${esc(c.id)}"><div class="child-card-head"><div><h4>${esc(c.id)} ${published?'<span class="badge blue">● 已上架</span>':''} ${c.dirty?'<span class="badge orange">有修改</span>':''}</h4><small>独立售价、尺寸、重量、1 Photo + 1 Video</small></div><div class="child-card-actions"><button class="danger" data-child-delete="${esc(c.id)}">删除编辑器</button><button class="ghost" data-child-add="${esc(c.id)}">＋ 新增一棵</button><button class="ghost" data-child-collapse="${esc(c.id)}">收起</button></div></div><div class="child-body" data-child-body="${esc(c.id)}">
      <div class="form-grid four"><label>售价 RM<input data-child-field="price" data-child="${esc(c.id)}" type="number" step="0.01" value="${num(c.price)}"></label><label>长 cm<input data-child-dim="length" data-child="${esc(c.id)}" type="number" value="${num(c.dimensions.length)}"></label><label>宽 cm<input data-child-dim="width" data-child="${esc(c.id)}" type="number" value="${num(c.dimensions.width)}"></label><label>高 cm<input data-child-dim="height" data-child="${esc(c.id)}" type="number" value="${num(c.dimensions.height)}"></label></div><div class="form-grid two"><label>重量 kg<input data-child-field="weight" data-child="${esc(c.id)}" type="number" step="0.1" value="${num(c.weight)}"></label><label>售价保护<input readonly value="不得低于 ${money(floor)}"></label></div>
      <div class="child-media"><label>${esc(c.id)} · 照片<input data-child-field="photo" data-child="${esc(c.id)}" value="${esc(c.photo)}"></label><label>${esc(c.id)} · 视频<input data-child-field="video" data-child="${esc(c.id)}" value="${esc(c.video)}"></label></div>
      <div class="child-actions"><button class="ghost" data-child-save="${esc(c.id)}">${c.draftSavedAt?'更新草稿':'保存草稿'}</button><button class="${published&&!newerDraft?'danger':'primary'}" data-child-publish="${esc(c.id)}">${published?(newerDraft?'更新商品卡并上架':'下架'):'确认并上架'}</button></div></div></article>`;
  }

  function renderRandomSection(p, available) {
    const r=p.random||{qty:1,photos:[],video:''}; const max=Math.min(20,available); const photos=[...r.photos]; while(photos.length<5) photos.push('');
    return `<section class="editor-section"><h3>Random 随机发货</h3><p>独立房间；只使用母产品编号，不生成 -1 / -2 / -3。顾客不能指定具体哪一棵。</p><div class="form-grid two"><label>上架数量（1–20）<input id="randomQty" type="number" min="1" max="20" value="${num(r.qty)||1}"></label><label>当前实际有效上限<input readonly value="${max}"></label></div><div class="limit-note">实际最大可上架数量 = min(20, Import 当前真实库存 − 尚未 ACK 的 Online Pending) = ${max}</div><div class="random-media-grid" style="margin-top:14px">${photos.map((x,i)=>`<label>参考照片 ${i+1}<input data-random-photo="${i}" value="${esc(x)}"></label>`).join('')}<label>参考视频（最多 1 个）<input id="randomVideo" value="${esc(r.video||'')}"></label></div></section>`;
  }

  function markEditorDirty() {
    UI.editorDirty=true;
    LLStore.markDirty(UI.productId,UI.room,true);
    const status=$('.editor-status'); if(status && !status.querySelector('.badge.orange')) status.insertAdjacentHTML('beforeend','<span class="badge orange">有未发布修改</span>');
  }

  function syncEditorFieldsFromDom() {
    const p=editorProduct(); if(!p) return;
    const patch={dimensions:{},shipping:{}};
    $$('[data-field]',$('#productEditor')).forEach(el=>patch[el.dataset.field]=el.type==='number'?num(el.value):el.value);
    $$('[data-dim]',$('#productEditor')).forEach(el=>patch.dimensions[el.dataset.dim]=num(el.value));
    $$('[data-shipping]',$('#productEditor')).forEach(el=>patch.shipping[el.dataset.shipping]=el.type==='checkbox'?el.checked:num(el.value));
    const photo=$('[data-parent-media="photo"]'), video=$('[data-parent-media="video"]');
    const photoList=$('[data-parent-photos]'), videoList=$('[data-parent-videos]');
    if(photoList||videoList) patch.parentMedia={photos:(photoList?.value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,10),videos:(videoList?.value||'').split(/\n+/).map(x=>x.trim()).filter(Boolean).slice(0,10)};
    else if(photo||video) patch.parentMedia={photos:photo?.value?[photo.value.trim()]:[],videos:video?.value?[video.value.trim()]:[]};
    if(UI.room==='random'){
      patch.random={qty:Math.max(1,num($('#randomQty')?.value||1)),photos:$$('[data-random-photo]').map(x=>x.value.trim()).filter(Boolean).slice(0,5),video:$('#randomVideo')?.value.trim()||''};
    }
    LLStore.updateProduct(UI.productId,patch,{persistNow:false});
    // force a silent persistence through dirty marker; updateProduct above mutates current state only in store closure
    LLStore.markDirty(UI.productId,UI.room,true);
  }

  function saveDraft() {
    syncEditorFieldsFromDom();
    const p=editorProduct();
    if(UI.room==='random'){
      const max=Math.min(20,effectiveStock());
      if(num(p.random.qty)>max){ toast(`Random 上架数量不能超过当前有效上限 ${max}`, 'error'); renderEditor(); return; }
    }
    LLStore.saveDraft(UI.productId,UI.room,{}); UI.editorDirty=false; toast(p.rooms[UI.room].draftSavedAt?'草稿保存成功':'草稿保存成功'); renderEditor();
  }

  function validatePublish(p) {
    const calc=pricing(p);
    if(!p.frontName.trim()) return '请填写商品名称（前台显示）';
    if(num(p.defaultPrice)<calc.floor) return `母产品售价不能低于 Online 销售保护底线 ${money(calc.floor)}`;
    if(UI.room==='vip'){
      if(!(p.parentMedia?.photos||[]).length || !(p.parentMedia?.videos||[]).length) return 'VIP 至少需要 1 Photo + 1 Video 才允许上架';
    }
    if(UI.room==='premium' || UI.room==='starter'){
      if(!(p.parentMedia?.photos||[]).length || !(p.parentMedia?.videos||[]).length) return '母产品直接上架前至少需要 1 Photo + 1 Video；不需要先建立 Child';
      if((p.parentMedia.photos||[]).length>10 || (p.parentMedia.videos||[]).length>10) return '母产品最多 10 张照片 + 10 个视频';
    }
    if(UI.room==='random'){
      const max=Math.min(20,effectiveStock()); if(num(p.random.qty)<1 || num(p.random.qty)>max) return `Random 上架数量必须在 1–${max} 之间`;
      if((p.random.photos||[]).length>5) return 'Random 最多 5 张参考照片';
    }
    return '';
  }

  function publishToggle() {
    syncEditorFieldsFromDom(); const p=editorProduct(); const r=p.rooms[UI.room];
    if(r.publishedAt && !hasNewerDraft(r)){ if(!window.confirm('确认下架？下架后顾客前台将不再显示此商品。')) return; LLStore.unpublish(UI.productId,UI.room,'后台手动下架'); UI.editorDirty=false; toast('已下架'); renderEditor(); renderRoomList(); return; }
    const err=validatePublish(p); if(err){toast(err,'error'); return;}
    LLStore.saveDraft(UI.productId,UI.room,{}); LLStore.publish(UI.productId,UI.room,{version:1,at:new Date().toISOString()}); UI.editorDirty=false; toast('商品卡已上架'); renderEditor(); renderRoomList();
  }

  function removeRoom() {
    if(UI.editorDirty && !window.confirm('有未保存修改。仍要移除此房？')) return;
    if(!window.confirm(`确认将 ${UI.productId} 从 ${roomNames[UI.room]} 移除？不会删除 Import 产品或历史。`)) return;
    LLStore.removeRoom(UI.productId,UI.room); UI.productId=null; UI.editorDirty=false; $('#productEditor').classList.add('hidden'); $('#roomSearchArea').classList.remove('hidden'); renderRoomList(); toast('已移除此房');
  }

  function closeEditor() {
    if(!confirmLeaveIfDirty()) return;
    UI.productId=null;UI.editorDirty=false;$('#productEditor').classList.add('hidden');$('#roomSearchArea').classList.remove('hidden');renderRoomList();
  }

  function updatePricePreview() {
    try { syncEditorFieldsFromDom(); const p=editorProduct(); const box=$('#priceBox'); if(box) box.innerHTML=renderPriceStats(pricing(p),p.defaultPrice); } catch{}
  }

  function addChild() {
    syncEditorFieldsFromDom(); const p=editorProduct();
    if((p.children[UI.room]||[]).length >= Math.min(10,effectiveStock())) return toast('已达到 10 棵上限或当前真实可分配库存上限','error');
    try { const c=LLStore.addChild(UI.productId,UI.room); UI.editorDirty=true; toast(`已建立 ${c.id}`); renderEditor(); } catch(e){toast(e.message,'error');}
  }

  function childById(id){ return (editorProduct()?.children?.[UI.room]||[]).find(c=>c.id===id); }

  function updateChildFromInput(el) {
    const id=el.dataset.child; if(!id)return;
    const patch={}; if(el.dataset.childField) patch[el.dataset.childField]=el.type==='number'?num(el.value):el.value; if(el.dataset.childDim) patch.dimensions={[el.dataset.childDim]:num(el.value)};
    LLStore.updateChild(UI.productId,UI.room,id,patch); UI.editorDirty=true;
  }

  function saveChild(id) {
    const c=childById(id), floor=pricing(editorProduct()).floor; if(num(c.price)<floor) return toast(`${id} 售价不能低于 ${money(floor)}`,'error');
    LLStore.saveChildDraft(UI.productId,UI.room,id); toast(`${id} 草稿已保存`); renderEditor();
  }

  function publishChild(id) {
    const c=childById(id), floor=pricing(editorProduct()).floor;
    const newerDraft=!!(c.publishedAt&&c.draftSavedAt&&new Date(c.draftSavedAt)>new Date(c.publishedAt));
    if(c.publishedAt && !newerDraft){ if(!window.confirm(`确认下架 ${id}？`)) return; LLStore.unpublishChild(UI.productId,UI.room,id,'后台手动下架'); toast(`${id} 已下架`); renderEditor(); return; }
    if(num(c.price)<floor) return toast(`${id} 售价不能低于 ${money(floor)}`,'error');
    // Individual Child can stay draft when media incomplete; publish requires both media
    if(!c.photo || !c.video) return toast(`${id} 上架前需要 1 张照片 + 1 个视频`,'error');
    LLStore.saveChildDraft(UI.productId,UI.room,id); LLStore.publishChild(UI.productId,UI.room,id); toast(`${id} 已上架`); renderEditor();
  }

  function deleteChild(id) { const c=childById(id); if(!c)return; if(c.sold)return toast('已售出 Child 必须保留历史','error'); if(!window.confirm(`确认删除 ${id}？这会释放 Online 分配。`))return; try{LLStore.deleteChild(UI.productId,UI.room,id);toast(`${id} 已删除`);renderEditor();}catch(e){toast(e.message,'error');} }

  function renderAllChildren() {
    const state=LLStore.getState(); const rows=[]; Object.values(state.products).forEach(p=>['premium','starter'].forEach(room=>(p.children[room]||[]).forEach(c=>rows.push({p,room,c}))));
    $('#allChildrenList').innerHTML=rows.length?rows.map(({p,room,c})=>`<div class="table-row"><b>${esc(c.id)}</b><span>${esc(roomNames[room])}</span><span>${esc(p.frontName||p.id)} · ${money(c.price)}</span><span class="badge ${c.publishedAt?'blue':''}">${c.publishedAt?'已上架':'草稿'}</span></div>`).join(''):'<div class="empty-state">暂时没有 Child。</div>';
  }

  function renderTemplates() {
    const t=LLStore.getState().templates; const arr=Object.values(t);
    $('#templateList').innerHTML=arr.length?arr.map(x=>`<article class="template-card"><div><b>${esc(x.name||'未命名模板')}</b><small>${esc(x.keywords||'无关键词')} · revision ${x.revision||1}</small></div><div class="action-row"><button class="ghost" data-template-edit="${esc(x.id)}">编辑</button><button class="danger" data-template-delete="${esc(x.id)}">删除</button></div></article>`).join(''):'<div class="empty-state">尚未建立模板。</div>';
  }

  function clearTemplateForm(){ $('#templateId').value='';$('#templateName').value='';$('#templateKeywords').value='';$('#templateDetails').value='';$('#templateCare').value=''; }
  function saveTemplate(){ const t={id:$('#templateId').value||undefined,name:$('#templateName').value.trim(),keywords:$('#templateKeywords').value.trim(),details:$('#templateDetails').value,careGuide:$('#templateCare').value}; if(!t.name)return toast('请输入模板名称','error'); LLStore.upsertTemplate(t);clearTemplateForm();renderTemplates();toast('模板已保存'); }

  function renderDashboard() {
    const state=LLStore.getState(), imports=LLImport.getAll();
    const products=Object.values(state.products); const pending=Object.values(state.pendingReservations).filter(r=>r.status!=='ACK');
    $('#kpiProducts').textContent=products.length; $('#kpiActions').textContent=pending.length; $('#kpiOrders').textContent=Object.keys(state.orders).length; $('#kpiSales').textContent='RM 0.00';
    $('#importProductCount').textContent=imports.length; $('#importStockTotal').textContent=imports.reduce((a,p)=>a+num(p.stock),0); $('#importCostSummary').textContent=money(imports.reduce((a,p)=>a+num(p.averageCost),0)); $('#importSource').textContent=UI.importSource;
    $('#actionCards').innerHTML=`<article class="action-card"><span>Online 库存待处理</span><strong>${pending.length}</strong><button class="ghost" data-page="orders">查看</button></article><article class="action-card"><span>Child 库存人工确认</span><strong>0</strong><small class="muted">Import 只知母编号减少时，不自动猜 Child。</small></article>`;
  }

  function seedTestOrder() {
    const state=LLStore.getState(); const p=Object.values(state.products).find(x=>Object.values(x.rooms).some(r=>r.assigned)); if(!p)return toast('请先在商品管理加入至少一个产品','warn');
    const orderId=`ORD${Date.now().toString().slice(-8)}`, lineId='1'; const room=Object.keys(p.rooms).find(k=>p.rooms[k].assigned)||'random';
    LLStore.addReservation({orderId,lineId,parentId:p.id,childId:'',qty:1,room});
    toast('已模拟 Online 成交：前台可售库存即时 -1，并建立 Pending Reservation'); renderOrders();
  }

  function renderOrders() {
    const arr=Object.values(LLStore.getState().pendingReservations);
    $('#ordersList').innerHTML=arr.length?arr.map(r=>`<div class="table-row"><b>${esc(r.orderId)} / ${esc(r.lineId)}</b><span>${esc(r.parentId)} · Qty ${r.qty}</span><span>${esc(r.room||'')} · ${esc(r.status)}</span>${r.status==='ACK'?'<span class="badge green">ACK</span>':`<button class="primary" data-ack-order="${esc(r.orderId)}" data-ack-line="${esc(r.lineId)}">模拟 Import ACK</button>`}</div>`).join(''):'<div class="empty-state">目前没有 Online Pending Reservation。</div>';
  }

  function renderPreview() {
    const state=LLStore.getState(); const rooms=['vip','premium','starter','random'];
    let html='<div class="preview-head"><h2>Lover Legend Gardening</h2><p>Online Store · 精选商品</p></div>';
    rooms.forEach(room=>{ const list=Object.values(state.products).filter(p=>p.rooms?.[room]?.publishedAt); if(!list.length)return; html+=`<section class="preview-room"><h3>${esc(roomNames[room])}</h3><div class="preview-grid">${list.map(p=>`<article class="preview-card"><div class="preview-media">${room==='random'?'Random Reference':'Product Media'}</div><div class="body"><b>${esc(p.frontName||p.id)}</b><span>${esc(p.summary||p.details||'Lover Legend Gardening')}</span><span class="preview-price">${money(p.defaultPrice)}</span></div></article>`).join('')}</div></section>`; });
    $('#storePreview').innerHTML=html;
  }

  function renderHistory() {
    const q=(UI.historyQuery||'').toLowerCase(); const arr=LLStore.getState().history.filter(h=>!q||JSON.stringify(h).toLowerCase().includes(q)).slice(0,300);
    $('#historyList').innerHTML=arr.length?arr.map(h=>`<div class="table-row"><b>${formatTime(h.at)}</b><span>${esc(h.type)}</span><span>${esc([h.parentId,h.room,h.remark].filter(Boolean).join(' · '))}</span><span></span></div>`).join(''):'<div class="empty-state">没有记录。</div>';
  }

  function renderSettings() {
    const state=LLStore.getState(),s=state.settings;
    $('#brandName').value=s.brand;$('#browserTitle').value=s.browserTitle;$('#chineseName').value=s.chineseName;$('#englishName').value=s.englishName;$('#targetMargin').value=s.targetMarginPct;$('#paymentFee').value=s.paymentFeePct;$('#affiliateFee').value=s.affiliatePct;$('#packagingDefault').value=s.packagingDefault;$('#paymentEnabled').checked=s.paymentFeeEnabled;$('#affiliateEnabled').checked=s.affiliateEnabled;$('#reserveLength').value=s.packageReserve.length;$('#reserveWidth').value=s.packageReserve.width;$('#reserveHeight').value=s.packageReserve.height;$('#holidayEnabled').checked=s.holiday.enabled;$('#holidayStart').value=s.holiday.start;$('#holidayEnd').value=s.holiday.end;$('#holidayMessage').value=s.holiday.message;$('#settingsRevision').textContent=state.revision;$('#settingsImportSource').textContent=UI.importSource;
  }

  function saveBrand(){ LLStore.saveSettings({brand:$('#brandName').value.trim(),browserTitle:$('#browserTitle').value.trim(),chineseName:$('#chineseName').value.trim(),englishName:$('#englishName').value.trim()}); document.title=$('#browserTitle').value.trim()||document.title;toast('品牌设置已保存');renderSettings(); }
  function savePricing(){ LLStore.saveSettings({targetMarginPct:num($('#targetMargin').value),paymentFeePct:num($('#paymentFee').value),affiliatePct:num($('#affiliateFee').value),packagingDefault:num($('#packagingDefault').value),paymentFeeEnabled:$('#paymentEnabled').checked,affiliateEnabled:$('#affiliateEnabled').checked});toast('商业规则已保存');renderSettings(); }
  function saveHoliday(){ LLStore.saveSettings({holiday:{enabled:$('#holidayEnabled').checked,start:$('#holidayStart').value,end:$('#holidayEnd').value,message:$('#holidayMessage').value}});toast('Holiday Mode 已保存');renderSettings(); }
  function saveReserve(){ LLStore.saveSettings({packageReserve:{length:num($('#reserveLength').value),width:num($('#reserveWidth').value),height:num($('#reserveHeight').value)}});toast('包装预留已保存'); }

  function backup(){ const blob=new Blob([LLStore.backup()],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`Lover_Legend_Online_Store_V1.01_Backup_${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);toast('Backup 已建立'); }
  async function restore(file){ if(!file)return; if(!window.confirm('Restore 会覆盖当前 Online Store Local Cache。确认继续？'))return; try{LLStore.restore(await file.text());toast('Restore 完成');renderDashboard();renderSettings();}catch(e){toast(`Restore 失败：${e.message}`,'error');} }

  function formatTime(iso){ if(!iso)return '—'; const d=new Date(iso); return d.toLocaleString('en-GB',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'}); }

  function updateImport(payload) {
    UI.importSource=payload?.source||'read-only'; $('#sidebarImportStatus').textContent=`${payload?.products?.length||0} 产品 · rev ${payload?.revision||0}`;
    // Event-driven reconciliation: Random quantity is automatically clamped when Import stock falls.
    const st=LLStore.getState();
    Object.values(st.products).forEach(p=>{
      if(!p.rooms?.random?.assigned) return;
      const imp=LLImport.get(p.id); if(!imp) return;
      const cap=Math.min(20,Math.max(0,num(imp.stock)-LLStore.pendingQty(p.id)));
      if(num(p.random?.qty)>cap){ LLStore.updateProduct(p.id,{random:{qty:Math.max(0,cap)}}); LLStore.addHistory('RANDOM_QTY_CLAMPED',p.id,'random',`Import 库存变化，Random 上架数量自动压低到 ${cap}`); }
    });
    if(UI.productId){ const imp=LLImport.get(UI.productId); const fld=$('#importMinPriceField'); if(fld&&imp) fld.value=num(imp.minimumPrice).toFixed(2); renderEditor(); }
    if(UI.page==='dashboard')renderDashboard(); if(UI.page==='settings')renderSettings();
  }

  function estimateShipping(){ const l=num($('#shipL')?.value),w=num($('#shipW')?.value),h=num($('#shipH')?.value),kg=num($('#shipWeight')?.value); const reserve=LLStore.getState().settings.packageReserve; const vol=((l+reserve.length)*(w+reserve.width)*(h+reserve.height))/5000; const charge=Math.max(kg,vol); $('#shippingEstimate').textContent=`参考包装尺寸 ${(l+reserve.length).toFixed(0)} × ${(w+reserve.width).toFixed(0)} × ${(h+reserve.height).toFixed(0)} cm · 参考计费重量 ${charge.toFixed(2)} kg。最终收费以物流商 Quote 为准。`; }

  document.addEventListener('click', e => {
    const page=e.target.closest('[data-page]'); if(page){e.preventDefault();showPage(page.dataset.page);return;}
    const tab=e.target.closest('[data-tab]'); if(tab){setProductTab(tab.dataset.tab);return;}
    const room=e.target.closest('[data-room]'); if(room){setProductTab(room.dataset.room);return;}
    const sel=e.target.closest('[data-select-import]'); if(sel){openProduct(sel.dataset.selectImport,true);return;}
    const open=e.target.closest('[data-open-product]'); if(open){openProduct(open.dataset.openProduct,false);return;}
    const te=e.target.closest('[data-template-edit]'); if(te){const t=LLStore.getState().templates[te.dataset.templateEdit];if(t){$('#templateId').value=t.id;$('#templateName').value=t.name;$('#templateKeywords').value=t.keywords;$('#templateDetails').value=t.details;$('#templateCare').value=t.careGuide;}return;}
    const td=e.target.closest('[data-template-delete]'); if(td){if(window.confirm('确认永久删除这个模板？删除后不会自动恢复。')){LLStore.deleteTemplate(td.dataset.templateDelete);renderTemplates();toast('模板已永久删除');}return;}
    const ca=e.target.closest('[data-child-add]'); if(ca){addChild();return;}
    const cc=e.target.closest('[data-child-collapse]'); if(cc){const body=$(`[data-child-body="${CSS.escape(cc.dataset.childCollapse)}"]`);if(body){body.hidden=!body.hidden;cc.textContent=body.hidden?'展开':'收起';}return;}
    const cd=e.target.closest('[data-child-delete]'); if(cd){deleteChild(cd.dataset.childDelete);return;}
    const cs=e.target.closest('[data-child-save]'); if(cs){saveChild(cs.dataset.childSave);return;}
    const cp=e.target.closest('[data-child-publish]'); if(cp){publishChild(cp.dataset.childPublish);return;}
    const ack=e.target.closest('[data-ack-order]'); if(ack){LLStore.ackReservation(ack.dataset.ackOrder,ack.dataset.ackLine);toast('ACK 已记录；不会再次扣 Online 前台库存');renderOrders();return;}
  });

  document.addEventListener('input', e => {
    if(e.target.closest('#productEditor')){
      if(e.target.matches('[data-child-field],[data-child-dim]')){updateChildFromInput(e.target);return;}
      if(e.target.matches('[data-field],[data-dim],[data-shipping],[data-random-photo],#randomQty,#randomVideo,[data-parent-media],[data-parent-photos],[data-parent-videos]')){markEditorDirty(); if(e.target.matches('[data-field="defaultPrice"],[data-field="potCost"],[data-field="packagingCost"],[data-field="otherCost"],[data-shipping]'))updatePricePreview(); return;}
    }
    if(e.target.matches('#shipL,#shipW,#shipH,#shipWeight'))estimateShipping();
  });

  document.addEventListener('change', e=>{
    if(e.target.id==='restoreInput')restore(e.target.files?.[0]);
  });

  window.addEventListener('beforeunload', e=>{ if(UI.editorDirty){e.preventDefault();e.returnValue='';} });
  LLImport.subscribe(updateImport);

  function bindFixedButtons(){
    $('#refreshImportBtn').onclick=()=>{updateImport(LLImport.refresh('manual'));toast('已重新读取 Import Read-Only 数据');};
    $('#roomSearchBtn').onclick=searchImport; $('#roomSearchInput').addEventListener('keydown',e=>{if(e.key==='Enter')searchImport();});
    $('#backProductOverview').onclick=()=>setProductTab('overview');
    $('#saveTemplateBtn').onclick=saveTemplate; $('#clearTemplateBtn').onclick=clearTemplateForm;
    $('#seedOrderBtn').onclick=seedTestOrder; $('#refreshPreviewBtn').onclick=renderPreview;
    $('#historySearchBtn').onclick=()=>{UI.historyQuery=$('#historySearch').value.trim();renderHistory();}; $('#clearHistoryFilterBtn').onclick=()=>{UI.historyQuery='';$('#historySearch').value='';renderHistory();};
    $('#saveBrandBtn').onclick=saveBrand;$('#savePricingBtn').onclick=savePricing;$('#saveHolidayBtn').onclick=saveHoliday;$('#saveReserveBtn').onclick=saveReserve;$('#resetReserveBtn').onclick=()=>{$('#reserveLength').value=5;$('#reserveWidth').value=5;$('#reserveHeight').value=8;saveReserve();};
    $('#backupBtn').onclick=backup; $('#jumpTop').onclick=()=>window.scrollTo({top:0,behavior:'smooth'}); $('#jumpBottom').onclick=()=>window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'});
  }

  document.addEventListener('click', e=>{
    if(e.target.id==='closeEditorBtn')closeEditor();
    else if(e.target.id==='removeRoomBtn')removeRoom();
    else if(e.target.id==='saveDraftBtn')saveDraft();
    else if(e.target.id==='publishBtn')publishToggle();
    else if(e.target.id==='addFirstChildBtn')addChild();
    else if(e.target.id==='restoreSuggestedShippingBtn'){
      const p=editorProduct(); if(!p)return; const suggested=Math.max(0,Math.ceil((num(p.weight)*6 + 8)/5)*5); const el=$('[data-shipping="reference"]'); if(el){el.value=suggested;markEditorDirty();toast('只恢复参考运费数字；卖家包邮开关保持不变');}
    }
  });

  function init(){
    bindFixedButtons();
    const s=LLStore.getState().settings; document.title=s.browserTitle||document.title;
    updateImport(LLImport.refresh('init'));
    renderDashboard();renderSettings();
    if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  document.addEventListener('DOMContentLoaded',init);
})();
