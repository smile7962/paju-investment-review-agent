/* 공용 DOM 헬퍼 및 보안 유틸 */
export function v(id){ return document.getElementById(id); }
export function gv(id){ var el=v(id); return el?el.value:''; }
export function gnv(id){ var n=parseFloat(gv(id)); return isNaN(n)?0:n; }
export function gsv(id){ return gv(id); }
export function gc(id){ var el=v(id); return el?el.checked:false; }
export function sv(id,val){ var el=v(id); if(el) el.value=val; }
export function sc(id,val){ var el=v(id); if(el) el.checked=val; }

/* HTML 이스케이프 — 사용자 입력을 innerHTML에 넣기 전 반드시 통과시킬 것(XSS 방지) */
export function esc(s){
  if(s===null||s===undefined) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
