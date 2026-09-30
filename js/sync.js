(() => {
  'use strict';
  const API_URL = 'https://script.google.com/macros/s/AKfycbxWKdEC7vy_7pZ2_CPie-9L5DeIofPggZlLuwB7gW-31HqWXEOxshtCR-HB-m5qLYS6/exec';
  const CLIENT_VERSION = '42.8';
  const SCHEMA_VERSION = 'LL-IMPORT-2026-08-CANONICAL-4';
  const CFG_KEY = 'llOnlineV90::importSync';
  let busy = false;
  let lastCheck = 0;
  const read = (k,f)=>{try{const v=JSON.parse(localStorage.getItem(k)||'null');return v??f}catch(_){return f}};
  const write = (k,v)=>localStorage.setItem(k,JSON.stringify(v));
  function cfg(){return {...{revision:0,lastSyncAt:''},...read(CFG_KEY,{})}}
  function setStatus(state,text){window.dispatchEvent(new CustomEvent('ll-import-sync-status',{detail:{state,text}}));}
  async function call(body){
    const controller=new AbortController();
    const t=setTimeout(()=>controller.abort(),20000);
    try{
      const res=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body),cache:'no-store',signal:controller.signal});
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const data=await res.json();
      if(data?.ok===false) throw new Error(data.error||data.message||'Import pull failed');
      return data||{};
    }finally{clearTimeout(t)}
  }
  function apply(data){
    if(Array.isArray(data.products)) write('importSystemProducts',data.products);
    if(Array.isArray(data.imports)) write('importSystemImports',data.imports);
    if(Array.isArray(data.batches)) write('importSystemBatches',data.batches);
    if(data.settings&&typeof data.settings==='object') write('importSystemSettings',data.settings);
    window.dispatchEvent(new CustomEvent('ll-import-updated',{detail:{revision:Number(data.revision)||0}}));
  }
  async function refresh(force=false){
    if(busy) return false;
    if(!navigator.onLine){setStatus('offline','离线 · 使用缓存');return false;}
    const now=Date.now(); if(!force && now-lastCheck<30000) return false; lastCheck=now;
    busy=true; setStatus('syncing','同步中…');
    try{
      const c=cfg();
      const hasLocal=Array.isArray(read('importSystemProducts',[]))&&read('importSystemProducts',[]).length>0;
      const data=await call({action:'pull',clientVersion:CLIENT_VERSION,schemaVersion:SCHEMA_VERSION,knownRevision:force||!hasLocal?0:Number(c.revision)||0,hasLocalData:!force&&hasLocal,forceFull:Boolean(force||!hasLocal)});
      if(!data.unchanged) apply(data);
      const next={revision:Number(data.revision)||Number(c.revision)||0,lastSyncAt:new Date().toISOString()};write(CFG_KEY,next);
      setStatus('synced',`已同步${next.lastSyncAt?' · '+new Date(next.lastSyncAt).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}):''}`);
      return !data.unchanged;
    }catch(err){console.warn('Import read-only pull failed',err);setStatus('failed','同步失败 · 使用缓存');return false}
    finally{busy=false}
  }
  window.LLImportSync={refresh,getConfig:cfg};
  window.addEventListener('DOMContentLoaded',()=>{setTimeout(()=>refresh(false),50)},{once:true});
  window.addEventListener('focus',()=>refresh(false));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(false)});
})();
