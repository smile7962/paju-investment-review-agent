/* js/ui.js — UI 제어·위저드·설정 모달
   의존: utils.js, project.js */

/* ── 단계형 위저드 메타데이터 ──
   탭 매핑은 switchRT의 탭 순서를 따른다. check()는 해당 단계 완료 여부를
   런타임 상태(gResult·projectData·gEconResult 등)로 판정하며, 항상 안전하게
   동작하도록 미정의 전역은 접근 전에 보호한다. */
var gCurrentStep = 1;

var STEP_META = [
  { num:1, name:'기본정보',    tab:'basic',  desc:'사업 유형·총사업비·재원 구성 입력',
    check:function(){ return !!(gv('f_name') && gv('f_type') && gnv('f_cost')>0); } },
  { num:2, name:'사업비·기간', tab:'calc',   desc:'총사업비 산출내역과 사업기간 계산',
    check:function(){ return (typeof projectData!=='undefined' && projectData && !!projectData.cost) || gPeriodTotal>0; } },
  { num:3, name:'경제성',      tab:'econ',   desc:'B/C·NPV·IRR 등 경제성 분석',
    check:function(){ return !!(gEconResult && gEconResult.bc>0); } },
  { num:4, name:'심사판단',    tab:'result', desc:'심사기관·면제·재심사 사전판단 실행',
    check:function(){ return !!gResult; } },
  { num:5, name:'의뢰서',      tab:'draft',  desc:'투자심사 의뢰서 초안 확인·보완',
    check:function(){ return !!gResult; } },
  { num:6, name:'AI 보완',     tab:'ai',     desc:'서술형 항목 AI 초안·규정 Q&A (선택)',
    check:function(){ return !!(typeof gChatHistory!=='undefined' && gChatHistory && gChatHistory.length>0); } },
  { num:7, name:'출력·저장',   tab:'output', desc:'Word 내보내기 및 작업 저장',
    check:function(){ return false; } },
];

var NEXT_ACTIONS = [
  '좌측 <b>기본정보</b> 탭에서 사업명·유형·총사업비·재원 구성을 입력하세요.',
  '<b>사업비·기간</b> 탭에서 총사업비 산출내역과 12단계 사업기간을 계산하세요.',
  '<b>경제성</b> 탭에서 편익·비용을 입력해 B/C·NPV·IRR을 산출하세요. (해당하는 경우)',
  '기본정보 입력 후 <b>분석 실행</b>을 눌러 심사기관·면제·재심사 판정을 확인하세요.',
  '<b>의뢰서</b> 탭에서 자동 생성된 초안을 확인하고 서술형 항목을 보완하세요.',
  '<b>AI 보완</b> 탭에서 API 키 설정 후 서술형 초안 작성·규정 질의를 활용하세요. (선택)',
  '<b>출력·저장</b> 탭에서 Word(.docx)로 내보내거나 작업을 저장하세요.',
];

function switchRT(t){
  var order=['basic','calc','econ','result','draft','ai','output'];
  var cur=order.indexOf(t);
  order.forEach(function(x,i){
    var el=v('rt-'+x);
    if(el){
      el.className='tab-content res-body'+(x===t?' active':'');
      if(x==='draft'&&x===t){el.style.flexDirection='column';el.style.padding='0';}
      else if(x==='draft'){el.style.flexDirection='';el.style.padding='';}
    }
    var btn=v('rtab-'+x);
    if(btn) btn.className='step-btn'+(x===t?' active':i<cur?' done':'');
    var sc=v('sc-'+x);
    if(sc) sc.innerHTML=(i<cur)?'&#10003;':(i+1)+'';
  });
  if(t==='basic') switchIT('basic');
  if(t==='calc'){
    var cb=v('calc-box');
    var emCb=v('empty-calc');
    /* calc-box가 비어있으면 renderCalc 실행 (판단 여부 무관) */
    if(cb && cb.innerHTML.trim()===''){
      /* 판단 미실행이어도 계산기는 독립적으로 사용 가능 */
      if(emCb) emCb.style.display='none';
      cb.style.display='block';
      var fakeR=gResult||{cost:parseFloat(document.getElementById('f_cost')?document.getElementById('f_cost').value:0)||0,type:document.getElementById('f_type')?document.getElementById('f_type').value:'general'};
      if(typeof renderCalc==='function') renderCalc(fakeR);
    }
    /* 단가 복원 — DOM이 생성된 후 */
    setTimeout(function(){
      var el=document.getElementById('ci_unit');
      if(el && window.gLastUnit){
        el.value=window.gLastUnit;
        var hint=document.getElementById('ci_unit_hint');
        if(hint) hint.textContent='서울시 가이드라인 자동 적용: '+window.gLastUnit.toLocaleString()+'천원/㎡';
        if(typeof recalcCost==='function') recalcCost();
      }
    },50);
  }
  updateSummary();
}
function switchIT(t){
  ['basic','budget','review'].forEach(function(x){
    var el=v('it-'+x); if(el) el.className='tab-content'+(x===t?' active':'');
    var btn=v('itab-'+x); if(btn) btn.className='tab-btn'+(x===t?' active':'');
  });
}
function initAll(){
    updateSummary();
    if (gKey) updBadge();
    placeChatDock();
    if(typeof initProject==='function') initProject();
    if(typeof renderWizard==='function') renderWizard();
    if(typeof renderNextCard==='function') renderNextCard();
    // 모든 입력에 자동저장 연결
    document.querySelectorAll('input,select,textarea').forEach(function(el){
      el.addEventListener('change', function(){
        if(typeof scheduleAutoSave==='function') scheduleAutoSave();
        if(typeof renderWizard==='function') renderWizard();
      });
    });
  }
function onReserveChg(){
  var el=v('reserveWarn');
  if(el) el.style.display=gc('f_reserve')?'none':'block';
}
function setRI(val,el){
  ['new','re','2nd'].forEach(function(x){
    var ri=v('ri-'+x); if(ri) ri.className='ri';
  });
  el.className='ri active';
  var inp=el.querySelector('input');
  if(inp) inp.checked=true;
}
function openSettings(){
  v('settingsModal').className='modal-ov open';
  selectAI(gAI);
}
function closeSettings(){ v('settingsModal').className='modal-ov'; }
function saveSettings(){
  var typed = v('apiKeyInput').value.trim();
  var opts={'opt-gpt':'gpt','opt-gemini':'gemini','opt-claude':'claude'};
  Object.keys(opts).forEach(function(id){
    var el=document.getElementById(id);
    if(el&&el.classList.contains('selected')) gAI=opts[id];
  });
  var saved=localStorage.getItem('ace_ai_key_'+gAI)||'';
  gKey = typed || saved;   /* 빈칸 저장 = 기존 키 유지 */
  localStorage.setItem('ace_ai_engine', gAI);
  if(typed){
    localStorage.setItem('ace_ai_key', typed);
    localStorage.setItem('ace_ai_key_'+gAI, typed);
  } else if(saved){
    localStorage.setItem('ace_ai_key', saved);
  } else {
    localStorage.removeItem('ace_ai_key');
  }
  var ki=v('apiKeyInput'); if(ki) ki.value='';
  updBadge();
  closeSettings();
}
function selectAI(ai){
  gAI=ai; selAIUI(ai);
  var hints={gpt:'sk-proj-...',gemini:'AIza...',claude:'sk-ant-api03-...'};
  v('keyHintLabel').textContent='('+(hints[ai]||'API Key')+')';
  var rows={gpt:'gpt-model-row',gemini:'gemini-model-row',claude:'claude-model-row'};
  Object.keys(rows).forEach(function(k){
    var el=v(rows[k]); if(el) el.style.display=(ai===k)?'block':'none';
  });
  /* 보안상 키 값은 입력칸에 표시하지 않고, 저장 여부만 안내 */
  var ki=v('apiKeyInput');
  if(ki) ki.value='';
  var saved=localStorage.getItem('ace_ai_key_'+ai)||'';
  var st=v('keySavedStatus');
  if(st){
    if(saved){
      st.innerHTML='&#10003; 이 엔진에 저장된 키가 있습니다 (끝자리 ····'+saved.slice(-4)+') — 유지하려면 비워두고 저장, 변경하려면 새 키를 입력하세요';
      st.style.color='#10b981';
    } else {
      st.textContent='저장된 키 없음 — 새 API Key를 입력하세요';
      st.style.color='var(--g400)';
    }
  }
  var db=v('keyDeleteBtn');
  if(db) db.style.display=saved?'inline-block':'none';
}
function selAIUI(ai){
  ['gpt','gemini','claude'].forEach(function(a){
    var el=v('opt-'+a);
    if(el) el.className='ai-opt'+(a===ai?' selected':'');
  });
}
function updBadge(){
  var names={gpt:'ChatGPT',gemini:'Gemini',claude:'Claude'};
  var b=v('aiBadge');
  if(!b) return;
  if(gKey){ b.textContent=(names[gAI]||'AI')+' 연결됨'; b.style.background='#10b981'; }
  else { b.textContent='AI 미설정'; b.style.background='var(--po)'; }
}
function updateModelLabel(){
  [['gpt-model-select','gpt-model-label'],
   ['gemini-model-select','gemini-model-label'],
   ['claude-model-select','claude-model-label']].forEach(function(pair){
    var sel=v(pair[0]), lbl=v(pair[1]);
    if(sel&&lbl) lbl.textContent=sel.value;
  });
}
function deleteSavedKey(){
  if(!confirm('현재 엔진('+gAI+')에 저장된 API 키를 삭제할까요?')) return;
  localStorage.removeItem('ace_ai_key_'+gAI);
  localStorage.removeItem('ace_ai_key');
  gKey='';
  updBadge();
  selectAI(gAI);
}
function updateSummary(){
  collectProjectData();
  var cost=parseFloat(gv('f_cost'))||0;
  var sc=v('sum-cost');
  if(sc){sc.textContent=cost>0?cost.toLocaleString()+'억':'-';}

  var nat=parseFloat(gv('f_nat'))||0;
  var prov=parseFloat(gv('f_prov'))||0;
  var city=parseFloat(gv('f_city'))||0;
  var bond=parseFloat(gv('f_bond'))||0;
  var priv=parseFloat(gv('f_priv'))||0;
  var finTotal=nat+prov+city+bond+priv;
  var sf=v('sum-finance'),sm=v('sum-match');
  if(sf){
    sf.textContent=finTotal>0?finTotal.toLocaleString()+'억':'-';
    var ok=cost>0&&Math.abs(cost-finTotal)<0.5;
    sf.className='sum-val'+(cost===0?'':ok?' ok':' warn');
    if(sm){sm.textContent=cost===0?'-':ok?'일치':'불일치';sm.className='sum-val'+(cost===0?'':ok?' ok':' err');}
  }

  var sj=v('sum-judge');
  if(sj){
    if(gResult&&gResult.auth){
      var lbl={self:'자체심사',gyeonggi:'경기도심사',central:'중앙심사'}[gResult.auth.type]||gResult.auth.label;
      sj.textContent=lbl;
      sj.className='sum-val'+(gResult.auth.type==='central'?' err':gResult.auth.type==='gyeonggi'?' warn':' ok');
    }else{sj.textContent='-';sj.className='sum-val';}
  }

  var sp=v('sum-period');
  if(sp){
    sp.textContent=gPeriodTotal>0?gPeriodTotal+'개월':'-';
  }

  var sb=v('sum-bc');
  if(sb){
    if(gEconResult && gEconResult.bc>0){
      sb.textContent=gEconResult.bc.toFixed(2);
      sb.className='sum-val'+(gEconResult.bc>=1?' ok':' err');
    }else{
      sb.textContent='-'; sb.className='sum-val';
    }
  }
}
function placeChatDock(){
    var c=document.getElementById('ai-chat-container');
    var slot=document.getElementById('dock-chat-slot');
    var home=document.getElementById('rt-ai');
    var tabBtn=document.getElementById('rtab-ai');
    if(!c||!slot||!home) return;
    var wide=window.innerWidth>=1680;
    if(wide){
      if(c.parentElement!==slot){
        slot.appendChild(c);
        if(tabBtn) tabBtn.style.display='none';
        if(home.className.indexOf('active')>=0) switchRT('result');
      }
    } else {
      if(c.parentElement!==home){
        home.appendChild(c);
        if(tabBtn) tabBtn.style.display='';
      }
    }
  }
function updateProgress(keys) {
  /* 사전절차 이행률(체크리스트) 갱신 + 위저드 렌더링
     keys: 체크키 배열(gResult.checkKeys). 진행률 요소 #progress-pct는
     위저드 요약과 ID가 겹치므로 #check-box 내부로 스코프해 충돌을 피한다. */
  var box = document.getElementById('result-box');
  if (box && Array.isArray(keys) && typeof getActiveKeys === 'function') {
    var active = getActiveKeys(keys);
    if (active.length) {
      var done  = active.filter(function(k){ return gCheckState[k] === 'done';  }).length;
      var doing = active.filter(function(k){ return gCheckState[k] === 'doing'; }).length;
      var pct = Math.round(done / active.length * 100);
      var pf = box.querySelector('.progress-bar-fill'); if (pf) pf.style.width = pct + '%';
      var pp = box.querySelector('.progress-pct');      if (pp) pp.textContent = pct + '%';
      var ps = box.querySelector('.progress-status');
      if (ps) ps.textContent = '완료 ' + done + '건 / 진행중 ' + doing + '건 / 전체 ' + active.length + '건';
      var db = box.querySelector('.done-banner'); if (db) db.style.display = (pct === 100) ? 'flex' : 'none';
      var nb = box.querySelector('.next-box');    if (nb && pct === 100) nb.style.display = 'none';
    }
  }
  // 위저드 진행 단계 렌더링 (v3)
  if (typeof renderWizard === 'function') renderWizard();
  if (typeof renderNextCard === 'function') renderNextCard();
}
function renderNextCard() {
  var card = document.getElementById('next-action-card');
  if (!card) return;
  /* 위저드 메타데이터(STEP_META·NEXT_ACTIONS)가 정의되지 않은 경우 안전하게 종료 */
  if (typeof STEP_META === 'undefined' || typeof NEXT_ACTIONS === 'undefined') return;
  var s = STEP_META[gCurrentStep-1];
  var action = NEXT_ACTIONS[gCurrentStep-1];
  // 비대상 판정 시 안내 변경
  var skipNote = '';
  if (gResult && gResult.auth && gResult.auth.type === 'none') {
    skipNote = '<div style="margin-top:8px;padding:6px 10px;background:var(--ok-l);border-radius:6px;font-size:11px;color:var(--ok)">'
      + '✅ 심사 비대상 판정 — 의뢰서 작성이 필요 없습니다. <a href="#" onclick="goToStep(7);return false" style="color:var(--ok);font-weight:700">7단계로 이동 →</a></div>';
  } else if (gResult && gResult.exempt) {
    skipNote = '<div style="margin-top:8px;padding:6px 10px;background:var(--ok-l);border-radius:6px;font-size:11px;color:var(--ok)">'
      + '✅ 면제 사유 해당 — 의뢰서 작성이 필요 없습니다. <a href="#" onclick="goToStep(7);return false" style="color:var(--ok);font-weight:700">7단계로 이동 →</a></div>';
  }
  card.innerHTML = '<div class="next-card-title">🔵 ' + gCurrentStep + '단계: ' + s.name + '</div>'
    + '<div class="next-card-body">' + action + skipNote + '</div>'
    + '<div class="next-card-action">'
    + (gCurrentStep < 7 ? '<button class="btn-next" onclick="goToStep('+(gCurrentStep+1)+')">다음 단계로 → ' + (gCurrentStep+1) + '단계: ' + STEP_META[gCurrentStep].name + '</button>' : '')
    + (gCurrentStep > 1 ? '<button class="btn-skip" onclick="goToStep('+(gCurrentStep-1)+')">← 이전 단계</button>' : '')
    + '</div>';
}
function goToStep(n) {
  if (typeof STEP_META === 'undefined') return;
  n = Math.max(1, Math.min(7, n));
  gCurrentStep = n;
  renderWizard();
  renderNextCard();
  // 해당 탭으로 자동 이동
  var tab = STEP_META[n-1].tab;
  if (typeof switchRT === 'function') switchRT(tab);
}
function renderWizard() {
  var wrap = document.getElementById('wizard-steps');
  if (!wrap) return;
  if (typeof STEP_META === 'undefined') return;
  var completed = STEP_META.filter(function(s){ return s.check(); }).map(function(s){return s.num;});
  var html = '';
  STEP_META.forEach(function(s, i) {
    var done = completed.indexOf(s.num) >= 0;
    var active = s.num === gCurrentStep;
    var cls = 'step' + (done?' done':'') + (active?' active':'');
    var icon = done ? '✓' : s.num;
    html += '<div class="'+cls+'" onclick="goToStep('+s.num+')" title="'+s.desc+'">'
          + '<div class="step-circle">'+icon+'</div>'
          + '<div class="step-name">'+s.name+'</div>'
          + '<div class="step-status">'+(done?'완료':active?'진행 중':'대기')+'</div>'
          + '</div>';
    if (i < STEP_META.length-1) html += '<div class="step-arrow">›</div>';
  });
  wrap.innerHTML = html;
  // 진행률 업데이트
  renderProgressSummary(completed);
}
function renderProgressSummary(completed) {
  var pct = Math.round((completed.length / 7) * 100);
  var el = document.getElementById('progress-pct');
  if (el) el.textContent = pct + '%';
  var desc = document.getElementById('progress-desc');
  if (desc) {
    var cur = STEP_META[gCurrentStep-1];
    desc.innerHTML = '<strong style="color:var(--pb)">' + gCurrentStep + '단계 — ' + cur.name + '</strong>'
      + '<br>' + completed.length + '단계 완료 · ' + (7-completed.length) + '단계 남음'
      + '<br><strong style="color:var(--pb)">다음 할 일:</strong> ' + cur.desc;
  }
}

/* ── 앱 초기화 실행 ──
   스크립트가 <body> 끝에서 로드되므로 DOM은 준비돼 있으나, 안전하게 상태를 확인해 실행.
   (단일 HTML을 파일로 분리하면서 initAll() 호출이 누락돼 있던 것을 복원) */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}
