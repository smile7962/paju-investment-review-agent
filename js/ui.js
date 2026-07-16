/* js/ui.js — UI 제어·위저드·설정 모달
   의존: utils.js, project.js */

/* ── 단계형 위저드 메타데이터 ──
   탭 매핑은 switchRT의 탭 순서를 따른다. check()는 해당 단계 완료 여부를
   런타임 상태(gResult·projectData·gEconResult 등)로 판정하며, 항상 안전하게
   동작하도록 미정의 전역은 접근 전에 보호한다. */
var gCurrentStep = 1;

/* v4: 입력(기본정보·재원구성·심사이력)과 결과(계산기~출력)를 하나의 순차
   단계로 통합. 화면에는 STEP_META[gCurrentStep-1]의 컨테이너 하나만 보이고
   나머지는 숨겨진다(강사 피드백 — 좌측 패널 상시노출 제거). AI 상담은 더 이상
   순차 단계가 아니라 우하단 플로팅 패널로 상시 접근 가능하다. */
var STEP_META = [
  { num:1, key:'basic',  id:'it-basic',  icon:'&#128203;', name:'기본정보',   title:'사업 기본정보 입력',
    desc:'사업명·유형·총사업비를 입력하세요.',
    check:function(){ return !!(gv('f_name') && gv('f_type') && gnv('f_cost')>0); } },
  { num:2, key:'budget', id:'it-budget', icon:'&#128176;', name:'재원구성',   title:'재원 구성 입력',
    desc:'국비·도비·시비·지방채·민자 등 재원 구성을 입력하세요. (전액 자체재원이면 기본정보의 해당 체크박스를 선택하세요)',
    check:function(){ return (gnv('f_nat')+gnv('f_prov')+gnv('f_city')+gnv('f_bond')+gnv('f_priv'))>0 || gc('f_self'); } },
  { num:3, key:'review', id:'it-review', icon:'&#128260;', name:'심사이력',   title:'이전 심사 이력',
    desc:'재심사·2단계 심사인 경우 이전 심사 이력을 입력하세요. 신규 사업이면 바로 다음 단계로 이동해도 됩니다.',
    check:function(){ var rt=document.querySelector('input[name="rtype"]:checked'); var val=rt?rt.value:'new'; return val==='new' || !!gv('f_prev_result'); } },
  { num:4, key:'calc',   id:'rt-calc',   icon:'&#129518;', name:'사업비·기간', title:'사업비 계산기·사업기간',
    desc:'사업비 계산기에서 총사업비 산출내역과 12단계 사업기간을 계산하세요.',
    check:function(){ return (typeof projectData!=='undefined' && projectData && projectData.cost && projectData.cost.calculatedTotal>0) || gPeriodTotal>0; } },
  { num:5, key:'econ',   id:'rt-econ',   icon:'&#128200;', name:'경제성',     title:'경제성 분석',
    desc:'경제성 탭에서 편익·비용을 입력해 B/C·NPV·IRR을 산출하세요. (해당하는 경우)',
    check:function(){ return !!(gEconResult && gEconResult.bc>0); } },
  { num:6, key:'result', id:'rt-result', icon:'&#127963;', name:'심사판단',   title:'투자심사 사전판단 결과',
    desc:'입력을 마쳤다면 <b>분석 실행</b>을 눌러 심사기관·면제·재심사 판정을 확인하세요.',
    check:function(){ return !!gResult; } },
  { num:7, key:'draft',  id:'rt-draft',  icon:'&#128196;', name:'의뢰서',     title:'투자심사 의뢰서 초안',
    desc:'의뢰서 탭에서 자동 생성된 초안을 확인하고 서술형 항목을 보완하세요.',
    check:function(){ return !!gResult; } },
  { num:8, key:'output', id:'rt-output', icon:'&#128190;', name:'출력·저장', title:'출력 및 저장',
    desc:'출력·저장 탭에서 Word(.docx)로 내보내거나 작업을 저장하세요.',
    check:function(){ return false; } },
];

/* ── 구버전 탭 이름(switchIT/switchRT) 호환 shim ──
   project.js/rules.js/render.js/draft.js가 여전히 이 이름으로 호출하므로
   내부적으로 goToStep()/toggleFloatingChat()에 위임해 하위 호환을 유지한다. */
function switchIT(t){
  var map={basic:1,budget:2,review:3};
  if(map[t]) goToStep(map[t]);
}
function switchRT(t){
  if(t==='ai'){ toggleFloatingChat(true); return; }
  for(var i=0;i<STEP_META.length;i++){
    if(STEP_META[i].key===t){ goToStep(STEP_META[i].num); return; }
  }
}
function initAll(){
    updateSummary();
    if (gKey) updBadge();
    goToStep(1, true);
    if(typeof initProject==='function') initProject();
    if(typeof renderWizard==='function') renderWizard();
    if(typeof renderNextCard==='function') renderNextCard();
    /* 접근성: 정적 컨트롤 라벨링 + 동적 렌더 대응(디바운스 관찰) */
    if(typeof applyA11yLabels==='function'){
      applyA11yLabels();
      if(window.MutationObserver){
        var _a11yTimer;
        new MutationObserver(function(){
          clearTimeout(_a11yTimer);
          _a11yTimer=setTimeout(function(){ applyA11yLabels(); }, 150);
        }).observe(document.body, {childList:true, subtree:true});
      }
    }
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

/* ── 피드백 5번: 투자심사 비대상 직원도 쓸 수 있는 간이 진단 모드 ──
   getAuthority()(rules.js)를 그대로 재사용해 몇 개 항목만으로 즉시 판정
   결과를 보여준다. 전체 위저드를 다 채우지 않아도 되는 저부담 진입점. */
function openQuickCheck(){
  var m = v('quickCheckModal');
  if (m) m.className = 'modal-ov open';
  var r = v('qc-result');
  if (r) r.style.display = 'none';
}
function closeQuickCheck(){
  var m = v('quickCheckModal');
  if (m) m.className = 'modal-ov';
}
function runQuickCheck(){
  if (typeof getAuthority !== 'function') return;
  var type = gv('qc_type') || 'general';
  var cost = gnv('qc_cost');
  var nat = gnv('qc_nat');
  var isSelf = gc('qc_self');
  var isJoint = gc('qc_joint');
  var auth = getAuthority(type, cost, isSelf, isJoint, nat);
  var box = v('qc-result');
  if (!box) return;
  var isLight = (auth.type === 'none' || auth.type === 'exempt');
  box.innerHTML = '<div class="vb ' + (isLight ? 'ex-type' : 'req-type') + '" style="margin-bottom:0">'
    + '<div class="vb-icon">' + (isLight ? '&#9989;' : '&#127963;') + '</div>'
    + '<div><div class="vb-main ' + (isLight ? 'green' : 'blue') + '">' + esc(auth.label) + '</div>'
    + '<div class="vb-detail">' + esc(auth.range || '') + '</div>'
    + '<div class="vb-law">' + esc(auth.law || '') + '</div></div></div>'
    + '<button class="sample-btn" style="margin-top:12px;width:100%" onclick="applyQuickCheckToWizard()">이 사업으로 전체 기능 사용해보기 &#8594;</button>';
  box.style.display = 'block';
}
function applyQuickCheckToWizard(){
  sv('f_type', gv('qc_type') || 'general');
  sv('f_cost', gnv('qc_cost'));
  sv('f_nat', gnv('qc_nat'));
  sc('f_self', gc('qc_self'));
  sc('f_joint', gc('qc_joint'));
  if (typeof onTypeChange === 'function') onTypeChange();
  closeQuickCheck();
  goToStep(1);
  if (typeof updateSummary === 'function') updateSummary();
}
function saveSettings(){
  var typed = v('apiKeyInput').value.trim();
  var opts={'opt-gemini':'gemini','opt-claude':'claude','opt-gpt':'gpt'};
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
  var hints={gemini:'AIza...',claude:'sk-ant-api03-...',gpt:'sk-proj-...'};
  v('keyHintLabel').textContent='('+(hints[ai]||'API Key')+')';
  var rows={gemini:'gemini-model-row',claude:'claude-model-row',gpt:'gpt-model-row'};
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
  ['gemini','claude','gpt'].forEach(function(a){
    var el=v('opt-'+a);
    if(el) el.className='ai-opt'+(a===ai?' selected':'');
  });
}
function updBadge(){
  var names={gemini:'Gemini',claude:'Claude',gpt:'ChatGPT'};
  var b=v('aiBadge');
  if(!b) return;
  if(gKey){ b.textContent=(names[gAI]||'AI')+' 연결됨'; b.style.background='#10b981'; }
  else { b.textContent='AI 미설정'; b.style.background='var(--po)'; }
}
function updateModelLabel(){
  [['gemini-model-select','gemini-model-label'],
   ['claude-model-select','claude-model-label'],
   ['gpt-model-select','gpt-model-label']].forEach(function(pair){
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
    /* 기본값 자동계산은 노출하지 않고, 사용자가 기간을 계산·입력한 경우에만 표시 */
    sp.textContent=(window.gPeriodCalculated && gPeriodTotal>0)?gPeriodTotal+'개월':'-';
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
/* AI 상담 채팅은 더 이상 순차 단계가 아니라 우하단 플로팅 패널에 상시 거주한다.
   show 생략 시 토글, true/false로 명시적 열기/닫기 가능. */
function toggleFloatingChat(show){
  var panel=v('floating-chat-panel');
  var btn=v('floating-chat-btn');
  if(!panel) return;
  var open=(typeof show==='boolean')?show:!panel.classList.contains('open');
  panel.classList.toggle('open', open);
  panel.setAttribute('aria-hidden', open?'false':'true');
  if(btn) btn.classList.toggle('active', open);
  if(open){
    var input=v('ai-chat-input');
    if(input) setTimeout(function(){ input.focus(); }, 200);
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
  if (typeof STEP_META === 'undefined') return;
  /* '지금 할 일'은 현재 단계가 아니라 실제 진행상 첫 미완료 단계를 가리킨다 */
  var last = STEP_META.length;
  var focus = last;
  for (var _i=0; _i<STEP_META.length; _i++){ if(!STEP_META[_i].check()){ focus = STEP_META[_i].num; break; } }
  var allDone = STEP_META.every(function(st){ return st.check(); });
  var s = STEP_META[focus-1];
  // 비대상 판정 시 안내 변경
  var skipNote = '';
  if (gResult && gResult.auth && gResult.auth.type === 'none') {
    skipNote = '<div style="margin-top:8px;padding:6px 10px;background:var(--ok-l);border-radius:6px;font-size:11px;color:var(--ok)">'
      + '✅ 심사 비대상 판정 — 의뢰서 작성이 필요 없습니다. <a href="#" onclick="goToStep('+last+');return false" style="color:var(--ok);font-weight:700">'+last+'단계로 이동 →</a></div>';
  } else if (gResult && gResult.exempt) {
    skipNote = '<div style="margin-top:8px;padding:6px 10px;background:var(--ok-l);border-radius:6px;font-size:11px;color:var(--ok)">'
      + '✅ 면제 사유 해당 — 의뢰서 작성이 필요 없습니다. <a href="#" onclick="goToStep('+last+');return false" style="color:var(--ok);font-weight:700">'+last+'단계로 이동 →</a></div>';
  }
  card.innerHTML = '<div class="next-card-title">📍 지금 할 일 — ' + focus + '단계: ' + s.name + (allDone ? ' (모든 단계 완료 ✓)' : '') + '</div>'
    + '<div class="next-card-body">' + s.desc + skipNote + '</div>'
    + '<div class="next-card-action">'
    + '<button class="btn-next" onclick="goToStep('+focus+')">' + focus + '단계로 이동 →</button>'
    + '</div>';
}
function goToStep(n, skipScroll) {
  if (typeof STEP_META === 'undefined') return;
  n = Math.max(1, Math.min(STEP_META.length, n));
  gCurrentStep = n;
  var target = STEP_META[n-1];
  /* 현재 단계 컨테이너만 노출, 나머지는 숨김 (좌측 패널 상시노출 제거) */
  STEP_META.forEach(function(s){
    var el = v(s.id);
    if (el) el.className = 'tab-content res-body' + (s.num===n ? ' active' : '');
  });
  var st = v('stage-title'); if (st) st.innerHTML = target.icon+' '+target.title;
  var ss = v('stage-sub'); if (ss) ss.innerHTML = target.desc;
  /* 계산기 단계 진입 시 초기 렌더(구 switchRT의 'calc' 분기 이식) */
  if (target.key === 'calc') {
    var cb=v('calc-box'), emCb=v('empty-calc');
    if (cb && cb.innerHTML.trim()===''){
      if (emCb) emCb.style.display='none';
      cb.style.display='block';
      var fakeR=gResult||{cost:gnv('f_cost'), type:gv('f_type')||'general'};
      if (typeof renderCalc==='function') renderCalc(fakeR);
    }
    setTimeout(function(){
      var el=document.getElementById('ci_unit');
      if (el && window.gLastUnit){
        el.value=window.gLastUnit;
        var hint=document.getElementById('ci_unit_hint');
        if (hint) hint.textContent='서울시 가이드라인 자동 적용: '+window.gLastUnit.toLocaleString()+'천원/㎡';
        if (typeof recalcCost==='function') recalcCost();
      }
    },50);
  }
  /* 이전/다음 내비 갱신 */
  var prevBtn=v('stage-prev-btn'), nextBtn=v('stage-next-btn'), pos=v('stage-nav-pos');
  if (prevBtn) prevBtn.style.visibility = (n===1) ? 'hidden' : 'visible';
  if (nextBtn) nextBtn.style.visibility = (n===STEP_META.length) ? 'hidden' : 'visible';
  if (pos) pos.textContent = n+' / '+STEP_META.length+'단계';
  renderWizard();
  renderNextCard();
  updateSummary();
  if (!skipScroll) {
    var stage=v('wizard-stage');
    if (stage) stage.scrollIntoView({behavior:'smooth', block:'start'});
  }
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
    html += '<div class="'+cls+'" onclick="goToStep('+s.num+')" title="'+s.desc.replace(/<[^>]+>/g,'')+'">'
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
  var total = STEP_META.length;
  var pct = Math.round((completed.length / total) * 100);
  var el = document.getElementById('progress-pct');
  if (el) el.textContent = pct + '%';
  var desc = document.getElementById('progress-desc');
  if (desc) {
    /* 첫 미완료 단계 기준으로 '다음 할 일'을 표시(카드와 일관) */
    var focus = total;
    for (var i=0; i<STEP_META.length; i++){ if(!STEP_META[i].check()){ focus = STEP_META[i].num; break; } }
    var allDone = completed.length >= total;
    var cur = STEP_META[focus-1];
    desc.innerHTML = '<strong style="color:var(--pb)">' + (allDone ? '모든 단계 완료 ✓' : focus + '단계 — ' + cur.name) + '</strong>'
      + '<br>' + completed.length + '단계 완료 · ' + (total-completed.length) + '단계 남음'
      + (allDone ? '' : '<br><strong style="color:var(--pb)">다음 할 일:</strong> ' + cur.desc);
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
