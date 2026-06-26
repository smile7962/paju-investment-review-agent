/* 메인 애플리케이션 — 상태 관리, 렌더링, AI 연동, 계산, 저장/불러오기, 이벤트 바인딩 */
import { EXEMPT_META, CHECKS_META } from './data.js';
import { v, gv, gnv, gsv, gc, sv, sc, esc } from './util.js';
import {
  getAuthority, getReReview, getDeadline, getCentralDeadline, buildCheckKeys
} from './logic.js';

var gAI = 'gpt';
var gKey = '';
var gResult = null;
var gCheckState = {};
var gChatHistory = [];  /* AI 대화 이력 */
var gPeriodTotal = 0;   /* calcPeriod 결과 — 전역 저장 */
var gEconResult  = {bc:0, npv:0, irr:0};  /* calcEcon 결과 — 전역 저장 */


function switchIT(t){
  ['basic','budget','review'].forEach(function(x){
    var el=v('it-'+x); if(el) el.className='tab-content'+(x===t?' active':'');
    var btn=v('itab-'+x); if(btn) btn.className='tab-btn'+(x===t?' active':'');
  });
}
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
function setRI(val,el){
  ['new','re','2nd'].forEach(function(x){
    var ri=v('ri-'+x); if(ri) ri.className='ri';
  });
  el.className='ri active';
  var inp=el.querySelector('input');
  if(inp) inp.checked=true;
}
function onReserveChg(){
  var el=v('reserveWarn');
  if(el) el.style.display=gc('f_reserve')?'none':'block';
}
function openSettings(){
  v('settingsModal').className='modal-ov open';
  selectAI(gAI);
}
function closeSettings(){ v('settingsModal').className='modal-ov'; }
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
function updateModelLabel(){
  [['gpt-model-select','gpt-model-label'],
   ['gemini-model-select','gemini-model-label'],
   ['claude-model-select','claude-model-label']].forEach(function(pair){
    var sel=v(pair[0]), lbl=v(pair[1]);
    if(sel&&lbl) lbl.textContent=sel.value;
  });
}
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
function deleteSavedKey(){
  if(!confirm('현재 엔진('+gAI+')에 저장된 API 키를 삭제할까요?')) return;
  localStorage.removeItem('ace_ai_key_'+gAI);
  localStorage.removeItem('ace_ai_key');
  gKey='';
  updBadge();
  selectAI(gAI);
}
function updBadge(){
  var names={gpt:'ChatGPT',gemini:'Gemini',claude:'Claude'};
  var b=v('aiBadge');
  if(!b) return;
  if(gKey){ b.textContent=(names[gAI]||'AI')+' 연결됨'; b.style.background='#10b981'; }
  else { b.textContent='AI 미설정'; b.style.background='var(--po)'; }
}


function getActiveKeys(keys){
  return keys.filter(function(k){ return CHECKS_META[k]&&CHECKS_META[k].level!=='na'; });
}

function updateProgress(keys){
  var active=getActiveKeys(keys);
  if(active.length===0) return;
  var done=active.filter(function(k){ return gCheckState[k]==='done'; }).length;
  var doing=active.filter(function(k){ return gCheckState[k]==='doing'; }).length;
  var pct=Math.round(done/active.length*100);

  var pb=v('progress-fill');
  if(pb) pb.style.width=pct+'%';
  var pp=v('progress-pct');
  if(pp) pp.textContent=pct+'%';
  var ps=v('progress-status');
  if(ps) ps.textContent='완료 '+done+'건 / 진행중 '+doing+'건 / 전체 '+active.length+'건';

  renderNextBox(keys);

  if(pct===100){
    var db=v('done-banner');
    if(db) db.style.display='flex';
    var nb=v('next-box');
    if(nb) nb.style.display='none';
  } else {
    var db2=v('done-banner');
    if(db2) db2.style.display='none';
  }
}

function renderNextBox(keys){
  var active=getActiveKeys(keys);
  var pending=active.filter(function(k){ return !gCheckState[k]||gCheckState[k]===''; });
  var nb=v('next-box-items');
  if(!nb) return;
  if(pending.length===0){ v('next-box').style.display='none'; return; }
  v('next-box').style.display='block';
  var shown=pending.slice(0,2);
  var h='';
  for(var i=0;i<shown.length;i++){
    var m=CHECKS_META[shown[i]];
    if(!m) continue;
    h+='<div class="next-item">';
    h+='<div class="next-num">'+(i+1)+'</div>';
    h+='<div class="next-content">';
    h+='<div class="next-item-title">'+m.title+'</div>';
    h+='<div class="next-item-desc">'+m.desc.substring(0,50)+'...</div>';
    if(m.dept) h+='<div class="next-dept">'+m.dept+'</div>';
    h+='</div></div>';
  }
  nb.innerHTML=h;
}

function handleCheck(el){
  var key=el.getAttribute('data-key');
  var action=el.getAttribute('data-action');
  if(key!==null) toggleCheck(key,action);
}
function toggleCheck(key,action){
  if(CHECKS_META[key]&&CHECKS_META[key].level==='na') return;
  gCheckState[key]=action;
  if(gResult) updateProgress(gResult.checkKeys);
  var row=v('ci-'+key);
  if(!row) return;
  var btn=v('cb-'+key);
  var title=v('ct-'+key);
  if(action==='done'){
    row.className=row.className.replace(/critical|important/,'').replace('doing','').trim()+' done';
    if(btn){ btn.className='ci-check checked'; btn.innerHTML='&#10003;'; }
    if(title) title.className='ci-title line-through';
  } else if(action==='doing'){
    row.className=row.className.replace(/critical|important/,'').replace('done','').trim()+' doing';
    if(btn){ btn.className='ci-check doing-c'; btn.innerHTML='&#9654;'; }
    if(title) title.className='ci-title';
  } else {
    var orig=CHECKS_META[key];
    row.className='ci '+(orig?orig.level:'');
    if(btn){ btn.className='ci-check'; btn.innerHTML=''; }
    if(title) title.className='ci-title';
  }
}

function loadSample(){
  sv('f_name','운정4동 행정복지센터 및 국민체육센터 복합건립');
  sv('f_type','complex'); sv('f_cost','373'); sv('f_stage','detail');
  sc('f_reserve',true); sc('f_self',false); sc('f_joint',false);
  sv('f_nat','30'); sv('f_prov','0'); sv('f_city','343');
  sv('f_bond','0'); sv('f_priv','0');
  sv('f_prev_cost','283'); sv('f_prev_result','cond');
  sv('f_years','2'); sv('f_prev_auth','gyeonggi');
  sc('f_site',false); sc('f_bond_chg',false);
  var reRi=v('ri-re');
  if(reRi){ setRI('re',reRi); reRi.querySelector('input').checked=true; }
  switchIT('basic');
  doAnalyze();
}

function doReset(){
  ['f_name','f_type','f_cost','f_stage','f_nat','f_prov','f_city',
   'f_bond','f_priv','f_prev_cost','f_prev_result','f_years','f_prev_auth'].forEach(function(id){ sv(id,''); });
  ['f_reserve','f_self','f_joint','f_site','f_bond_chg'].forEach(function(id){ sc(id,false); });
  var nr=v('ri-new'); if(nr){ setRI('new',nr); nr.querySelector('input').checked=true; }
  /* 전역 상태 초기화 */
  gCheckState={};
  gResult=null;
  gChatHistory=[];
  gPeriodTotal=0;
  gEconResult={bc:0,npv:0,irr:0};
  window.gLastUnit=0;
  window.gCalcTotal=0;
  projectData={basic:{},finance:{},cost:{},period:{},review:{},economy:{},draft:{},ai:{},output:{}};
  /* DOM 초기화 — 존재하는 요소만 안전하게 */
  var safeHide=function(emptyId,boxId){
    var em=v(emptyId),bx=v(boxId);
    if(em) em.style.display='flex';
    if(bx) bx.style.display='none';
  };
  safeHide('empty-result','result-box');
  safeHide('empty-check','check-box');
  /* draft-box 초기화 */
  var db=v('draft-box');
  if(db){db.innerHTML='';db.style.display='none';}
  var ed=v('empty-draft');
  if(ed) ed.style.display='flex';
  /* 요약바 초기화 */
  ['sum-cost','sum-finance','sum-judge','sum-period','sum-match','sum-bc'].forEach(function(id){
    var el=v(id); if(el){el.textContent='-';el.className='sum-val';}
  });
  onTypeChange();
  switchIT('basic');
  updateSummary();
}

/* ── Phase 1: 전역 상태 + 요약바 ─────────────────── */
var projectData = {
  basic: {}, finance: {}, cost: {}, period: {},
  review: {}, economy: {}, draft: {}, ai: {}, output: {}
};

function collectProjectData(){
  var reviewType=document.querySelector('input[name="rtype"]:checked')?document.querySelector('input[name="rtype"]:checked').value:'new';
  var nat=parseFloat(gv('f_nat'))||0;
  var prov=parseFloat(gv('f_prov'))||0;
  var city=parseFloat(gv('f_city'))||0;
  var bond=parseFloat(gv('f_bond'))||0;
  var priv=parseFloat(gv('f_priv'))||0;
  var cost=parseFloat(gv('f_cost'))||0;
  projectData.basic={
    name:gv('f_name'), type:gv('f_type'), stage:gv('f_stage'),
    totalCost:cost, reserveExcluded:gc('f_reserve'),
    selfFinanceOnly:gc('f_self'), jointProject:gc('f_joint')
  };
  projectData.finance={
    national:nat, province:prov, city:city, bond:bond, privateCapital:priv,
    total:nat+prov+city+bond+priv,
    matched:cost>0&&Math.abs(cost-(nat+prov+city+bond+priv))<0.5
  };
  projectData.review={
    type:reviewType, previousCost:parseFloat(gv('f_prev_cost'))||0,
    previousResult:gv('f_prev_result'), elapsedYears:parseInt(gv('f_years'))||0,
    previousAuthority:gv('f_prev_auth'), siteChanged:gc('f_site'),
    bondPlanChanged:gc('f_bond_chg'), result:gResult
  };
  projectData.cost={
    area:parseFloat(gv('ci_area'))||0, unitCost:parseFloat(gv('ci_unit'))||0,
    land:parseFloat(gv('ci_land'))||0, calculatedTotal:window.gCalcTotal||0
  };
  projectData.period={
    constructionMonths:parseFloat(gv('pp_construct'))||0,
    designMonths:parseFloat(gv('pp_design'))||0,
    reviewMonths:parseFloat(gv('pp_review'))||0,
    permitMonths:parseFloat(gv('pp_permit'))||0
  };
  projectData.economy={
    discountRate:parseFloat(gv('ec_rate'))||0,
    years:parseFloat(gv('ec_years'))||0,
    users:parseFloat(gv('ec_users'))||0
  };
  projectData.ai={engine:gAI, hasKey:!!gKey, chatCount:(gChatHistory||[]).length};
  return projectData;
}

function calcAll(){
  collectProjectData();
  updateSummary();
  return projectData;
}

function bindProjectDataInputs(){
  var ids=['f_name','f_type','f_cost','f_stage','f_nat','f_prov','f_city','f_bond','f_priv',
    'f_prev_cost','f_prev_result','f_years','f_prev_auth','f_site','f_bond_chg','f_reserve',
    'f_self','f_joint','ci_area','ci_unit','ci_land','pp_construct','pp_design','pp_review','pp_permit',
    'ec_rate','ec_years','ec_users'];
  ids.forEach(function(id){
    var el=v(id);
    if(!el||el.getAttribute('data-pd-bound')) return;
    el.setAttribute('data-pd-bound','1');
    el.addEventListener('input',calcAll);
    el.addEventListener('change',calcAll);
  });
  var radios=document.querySelectorAll('input[name="rtype"]');
  for(var i=0;i<radios.length;i++){
    if(!radios[i].getAttribute('data-pd-bound')){
      radios[i].setAttribute('data-pd-bound','1');
      radios[i].addEventListener('change',calcAll);
    }
  }
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
    if(gEconResult.bc>0){
      sb.textContent=gEconResult.bc.toFixed(2);
      sb.className='sum-val'+(gEconResult.bc>=1?' ok':' err');
    }else{
      sb.textContent='-'; sb.className='sum-val';
    }
  }
}


function doAnalyze(){
  var name=gv('f_name');
  var type=gv('f_type');
  var cost=parseFloat(gv('f_cost'))||0;
  if(!type||cost<=0){ alert('사업 유형과 총사업비를 입력해주세요.'); return; }
  var isSelf=gc('f_self'); var isJoint=gc('f_joint');
  var nat=parseFloat(gv('f_nat'))||0;
  var prov=parseFloat(gv('f_prov'))||0;
  var bond=parseFloat(gv('f_bond'))||0;
  var priv=parseFloat(gv('f_priv'))||0;
  var natRatio=cost>0?(nat/cost*100):0;
  var prevCost=parseFloat(gv('f_prev_cost'))||0;
  var years=parseInt(gv('f_years'))||0;
  var prevAuth=gv('f_prev_auth');
  var bondChg=gc('f_bond_chg'); var siteChg=gc('f_site');
  var reviewType=document.querySelector('input[name="rtype"]:checked')?document.querySelector('input[name="rtype"]:checked').value:'new';
  var exemptCode=gv('f_exempt')||'';
  var stage=gv('f_stage')||'plan';

  var auth;
  if(exemptCode&&typeof EXEMPT_META!=='undefined'&&EXEMPT_META[exemptCode]){
    auth={type:'exempt',label:'면제',reason:EXEMPT_META[exemptCode].label,law:EXEMPT_META[exemptCode].law,range:'법정 당연면제 (법 제37조 제3항·시행령 별표)'};
  } else {
    auth=getAuthority(type,cost,isSelf,isJoint,natRatio);
  }

  var selfFund=Math.max(0,cost-nat-prov-bond-priv);
  var rr=getReReview({cost:cost,prevCost:prevCost,years:years,bondChg:bondChg,siteChg:siteChg,
    prevAuth:prevAuth,curAuth:auth.type,
    prevBond:parseFloat(gv('f_prev_bond'))||0,curBond:bond,selfFund:selfFund,
    deduct:parseFloat(gv('f_deduct'))||0,spent:gv('f_spent')||'none',auditReq:gc('f_audit_req')});

  var tangExempt=gc('f_tang_exempt');
  var designOrdered=(stage==='detail'||stage==='detail_done');
  var needsTang=cost>=500&&!tangExempt&&!designOrdered&&auth.type!=='exempt'&&auth.type!=='none';
  var dl=getDeadline();
  var checkKeys=buildCheckKeys(type,cost,prov,reviewType,needsTang);

  gCheckState={};
  gResult={name:name,type:type,cost:cost,auth:auth,reTrig:rr.triggers,reInfo:rr,
    needsTang:needsTang,tangExempt:tangExempt,designOrdered:designOrdered,
    dl:dl,nat:nat,prov:prov,natRatio:natRatio,bond:bond,stage:stage,
    eventRegular:gc('f_event_regular'),
    reviewType:reviewType,checkKeys:checkKeys};
  collectProjectData();

  renderResult(gResult);
  renderCheck(gResult);

  v('empty-result').style.display='none'; v('result-box').style.display='block';
  v('empty-check').style.display='none';  v('check-box').style.display='block';
  v('empty-calc').style.display='none';   v('calc-box').style.display='block';
  v('empty-draft').style.display='none';
  v('draft-box').style.display='block';
  var econEmpty = document.getElementById('econ-empty');
  if (econEmpty) econEmpty.style.display = 'none';
  var econBox = document.getElementById('econ-box');
  if (econBox) econBox.style.display = 'block';
  renderCalc(gResult);
  if(typeof restoreUnitFromType==='function') restoreUnitFromType();
  renderDraft(gResult);
  renderEcon(gResult);
  updateSummary();
  switchRT('result');
  if(gKey) genAI(gResult);
}

function renderResult(r){
  var h='';
  var isEx=(r.auth.type==='exempt'||r.auth.type==='none');
  var typeMap={general:'일반투자사업',office:'청사 신축',culture:'문화·체육',
    complex:'복합시설',promo:'홍보관',event:'행사성',debt:'채무부담',joint:'공동협력'};

  if(isEx){
    var exLabel=r.auth.type==='none'?'투자심사 대상 아님 (기준금액 미만)':'투자심사 면제 대상';
    var exReason=r.auth.type==='none'?'기준 금액 미만으로 투자심사 의무없음':('면제 사유: '+r.auth.reason);
    h+='<div class="vb none-type"><div class="vb-icon">&#9989;</div>';
    h+='<div style="flex:1"><div class="vb-main green">'+exLabel+'</div>';
    h+='<div class="vb-detail">'+esc(r.name||'(사업명 미입력)')+' | '+(typeMap[r.type]||'')+' | 총사업비 '+r.cost+'억원</div>';
    if(r.auth.law) h+='<div class="vb-law">'+r.auth.law+'</div>';
    h+='<div style="font-size:12px;color:var(--g600);margin-top:5px">'+exReason+'</div>';
    h+='</div></div>';
    h+='<div class="exempt-notice">';
    h+='<div class="en-icon">&#128203;</div>';
    h+='<div class="en-title">투자심사 의뢰 불필요</div>';
    h+='<div class="en-desc">이 사업은 투자심사 대상이 아닙니다.<br>예산 편성 절차를 진행하시면 됩니다.</div>';
    h+='</div>';
    v('result-box').innerHTML=h;
    return;
  }

  h+='<div class="vb req-type"><div class="vb-icon">&#127963;</div>';
  h+='<div style="flex:1"><div class="vb-main blue">투자심사 필요 — '+r.auth.label+'</div>';
  h+='<div class="vb-detail">'+esc(r.name||'(사업명 미입력)')+' | '+(typeMap[r.type]||'')+' | 총사업비 '+r.cost+'억원</div>';
  if(r.auth.law) h+='<div class="vb-law">'+r.auth.law+'</div>';
  h+='</div></div>';

  if(r.natRatio>=60&&r.natRatio<70){
    h+='<div class="wb"><div class="wb-title">&#9888; 국비 비율 확인 필요</div>';
    h+='<ul><li>현재 국비 비율 '+r.natRatio.toFixed(1)+'% — 70% 이상 시 면제 대상 (시행령 별표 제25호)</li></ul></div>';
  }

  if(r.reTrig.length>0){
    h+='<div class="wb"><div class="wb-title">&#128260; 재심사 사유 발생 ('+r.reTrig.length+'건)</div><ul>';
    for(var i=0;i<r.reTrig.length;i++) h+='<li><strong>'+r.reTrig[i].t+'</strong> — '+r.reTrig[i].l+'</li>';
    h+='</ul>';
    if(r.reInfo&&r.reInfo.excluded){
      h+='<div style="margin-top:8px;padding:8px 10px;background:#fffbeb;border:1px solid #fde68a;border-radius:6px;font-size:12px;color:#92400e">&#9888; <strong>재심사 제외요건 해당 가능</strong> — '+r.reInfo.exclNote+'</div>';
    }
    h+='<div style="margin-top:8px;padding:8px 10px;background:var(--g50);border-radius:6px;font-size:11px;color:var(--g600)">&#128337; <strong>의뢰 시기</strong>: 사업추진 단계별(기본계획·타당성조사·기본설계·실시설계·본공사계약·시공)로 재심사 요건에 해당하게 된 즉시, 다음 절차 진행 <strong>이전에</strong> 재심사를 의뢰해야 합니다. 재심사 기관은 변경된 총사업비 기준으로 시행령 제41조에 따라 다시 판정합니다.</div>';
    if(r.reviewType!=='re'){
      h+='<div class="resim-guide">&#128204; <strong>심사 구분을 “재심사”로 변경하신 후 심사이력 탭에 직전 사업비 등을 입력해 주세요.</div>';
    }
    h+='</div>';
  }
  if(r.reInfo&&r.reInfo.notes&&r.reInfo.notes.length>0){
    h+='<div class="wb" style="border-color:#bbf7d0;background:#f0fdf4"><div class="wb-title" style="color:#15803d">&#8505; 재심사 비대상 판단 참고</div><ul>';
    for(var ni=0;ni<r.reInfo.notes.length;ni++) h+='<li>'+r.reInfo.notes[ni]+'</li>';
    h+='</ul></div>';
  }
  /* 지방재정영향평가 안내 (지방재정영향평가지침 제7조) */
  if(r.type==='event'&&r.cost>=10){
    h+='<div class="wb"><div class="wb-title">&#128202; 지방재정영향평가 대상</div><ul>';
    h+='<li>시·군·구 <strong>10억원 이상 행사성 사업</strong>은 투자심사 의뢰 시 <strong>지방재정영향평가서</strong>를 함께 제출해야 합니다. (지방재정법 제27조의6, 지방재정영향평가지침 제7조)</li>';
    h+='</ul></div>';
  }
  /* 정기 개최 행사 특례 */
  if(r.type==='event'&&r.eventRegular){
    h+='<div class="wb" style="border-color:#bfdbfe;background:#eff6ff"><div class="wb-title" style="color:var(--pb)">&#128197; 정기 개최 행사 심사 특례</div><ul>';
    h+='<li>매년 또는 격년제로 개최되는 행사성 사업은 <strong>3년마다</strong> 투자심사를 받습니다. 다만 총사업비가 <strong>직전 투자심사 대비 20% 이상 증액</strong>된 경우에는 3년이 지나지 않았어도 다시 심사를 받아야 합니다. (운영기준 Ⅱ-6)</li>';
    h+='</ul></div>';
  }
  /* 2단계 심사 안내 */
  if(r.reviewType==='2nd'){
    h+='<div class="wb" style="border-color:#ddd6fe;background:#f5f3ff"><div class="wb-title" style="color:#6d28d9">2&#65039;&#8419; 2단계 심사</div><ul>';
    h+='<li>최초 투자심사 결과에 부가된 <strong>조건</strong>에 따라 한 번 더 받는 심사입니다. 1단계 통과 후 공사계약과 관련 없는 설계비·보상비 등의 예산편성·집행은 가능하나, <strong>본공사 계약 전</strong> 2단계 심사를 완료해야 합니다. (운영기준 Ⅱ-8)</li>';
    h+='</ul></div>';
  }

  var authLabel={central:'행안부(중앙)',gyeonggi:'경기도',self:'파주시 자체'};
  var authCol={central:'red',gyeonggi:'orange',self:'blue'};
  var authSub={central:'200억 이상 등',gyeonggi:'유형별 기준',self:'유형별 기준'};
  h+='<div class="info-grid">';
  h+='<div class="ic"><div class="ic-label">심사기관</div>';
  h+='<div class="ic-val '+(authCol[r.auth.type]||'blue')+'">'+(authLabel[r.auth.type]||r.auth.label)+'</div>';
  h+='<div class="ic-sub">'+(r.auth.range||authSub[r.auth.type]||'')+'</div></div>';
  h+='<div class="ic"><div class="ic-label">타당성조사</div>';
  var tangTxt=r.needsTang?'필요 (500억↑)':(r.cost>=500?(r.tangExempt?'면제 (유사절차 기이행)':(r.designOrdered?'비대상 (실시설계 기발주)':'불필요')):'불필요');
  h+='<div class="ic-val '+(r.needsTang?'red':'green')+'">'+tangTxt+'</div>';
  h+='<div class="ic-sub">'+(r.cost>=500?'지방재정법 제37조의2':'500억원 미만')+'</div></div>';
  h+='<div class="ic"><div class="ic-label">재심사</div>';
  h+='<div class="ic-val '+(r.reTrig.length>0?'red':'green')+'">'+(r.reTrig.length>0?'재심사 필요':'해당없음')+'</div>';
  h+='<div class="ic-sub">'+(r.reTrig.length>0?r.reTrig.length+'개 사유':'심사규칙 제6조')+'</div></div>';
  h+='</div>';

  if(r.dl){
    var urg=r.dl.remain<=14;
    h+='<div class="dl-box'+(urg?' urgent':'')+'"><div style="font-size:22px">&#128197;</div>';
    h+='<div class="dl-content">';
    var dlTitle='';
    if(r.auth.type==='self') dlTitle='자체심사 일정 (파주시 내부 기준)';
    else if(r.auth.type==='central') dlTitle='중앙의뢰심사 마감 (경기도&#8594;행안부)';
    else dlTitle='시도의뢰심사 마감 (파주시&#8594;경기도)';
    h+='<div class="dl-title">'+dlTitle+'</div>';
    if(r.auth.type==='self'){
      h+='<div class="dl-date" style="font-size:13px">파주시 내부 위원회 심의 후 예산 편성</div>';
    } else if(r.auth.type==='central'){
      var cdl=getCentralDeadline();
      h+='<div class="dl-date">'+(cdl?cdl.date+' ('+cdl.label+')':r.dl.date+' ('+r.dl.label+')')+'</div>';
    } else {
      h+='<div class="dl-date">'+r.dl.date+' ('+r.dl.label+'차)</div>';
    }
    if(r.auth.type==='self'){
      h+='<div class="dl-remain">의뢰 마감일 없음 (자체 일정에 따라 진행)</div>';
    } else if(r.auth.type==='central'){
      var cdl2=getCentralDeadline();
      h+='<div class="dl-remain">'+(cdl2?'D-'+cdl2.remain+'일 남음 | ':'')+'심사완료 예정: '+r.dl.comp+'</div>';
    } else {
      h+='<div class="dl-remain">D-'+r.dl.remain+'일 남음 | 심사완료 예정: '+r.dl.comp+'</div>';
    }
    h+='</div></div>';
  }

  var activeKeys=getActiveKeys(r.checkKeys);
  h+='<div id="progress-box" class="progress-box">';
  h+='<div class="progress-top">';
  h+='<div class="progress-title">&#128203; 사전절차 이행률</div>';
  h+='<div class="progress-pct" id="progress-pct">0%</div></div>';
  h+='<div class="progress-bar-bg"><div class="progress-bar-fill" id="progress-fill" style="width:0%"></div></div>';
  h+='<div class="progress-status" id="progress-status">완료 0건 / 진행중 0건 / 전체 '+activeKeys.length+'건</div>';
  h+='</div>';

  h+='<div class="done-banner" id="done-banner" style="display:none">';
  h+='<div class="done-icon">&#127881;</div>';
  h+='<div><div class="done-title">사전절차 완료! 투자심사 의뢰 가능합니다.</div>';
  var doneMsg='';
  if(r.auth.type==='self'){
    doneMsg='자체심사는 별도 의뢰 마감일 없음 (파주시 내부 일정에 따라 진행)';
  } else if(r.auth.type==='central'){
    var cdl=getCentralDeadline();
    doneMsg='행안부 송부 마감: '+(cdl?cdl.date:'확인 필요');
  } else {
    doneMsg='경기도 의뢰 마감: '+(r.dl?r.dl.date:'확인 필요');
  }
  h+='<div class="done-desc">'+doneMsg+'</div></div></div>';

  h+='<div class="next-box" id="next-box">';
  h+='<div class="next-title">&#128204; 지금 바로 해야 할 일</div>';
  h+='<div id="next-box-items"></div></div>';

  h+='<div class="sec"><div class="sec-hd">사전 이행 체크리스트</div>';
  h+='<div class="cl">';
  for(var ci=0;ci<r.checkKeys.length;ci++){
    var key=r.checkKeys[ci];
    var m=CHECKS_META[key];
    if(!m) continue;
    var isNA=m.level==='na';
    var sym=m.badge==='must'?'&#9733;':m.badge==='caution'?'!':'—';
    h+='<div class="ci '+m.level+'" id="ci-'+key+'">';
    if(!isNA){
      h+='<div class="ci-check" id="cb-'+key+'" data-key="'+key+'" data-action="done" onclick="handleCheck(this)"></div>';
    } else {
      h+='<div class="ci-badge skip">—</div>';
    }
    h+='<div class="ci-badge '+m.badge+'">'+sym+'</div>';
    h+='<div class="ci-content">';
    h+='<div class="ci-title" id="ct-'+key+'">'+m.title+'</div>';
    h+='<div class="ci-desc">'+m.desc+'</div>';
    h+='<div class="ci-law">&#128218; '+m.law+'</div>';
    if(m.dept) h+='<div class="ci-dept">'+m.dept+'</div>';
    if(!isNA){
      h+='<div class="ci-actions">';
      h+='<button class="ci-btn btn-done" data-key="'+key+'" data-action="done" onclick="handleCheck(this)">&#10003; 완료</button>';
      h+='<button class="ci-btn btn-doing" data-key="'+key+'" data-action="doing" onclick="handleCheck(this)">&#9654; 진행중</button>';
      h+='<button class="ci-btn btn-undo" data-key="'+key+'" data-action="" onclick="handleCheck(this)">↺ 미완료</button>';
      h+='</div>';
    }
    h+='</div></div>';
  }
  h+='</div></div>';

  var docs=[
    {n:'투자심사 의뢰서 (별지 제1호)',tag:'must',tl:'필수'},
    {n:'단위사업 계획서',tag:'must',tl:'필수'},
    {n:'투자사업 우선순위표',tag:'must',tl:'필수'},
    {n:'회계별 가용재원 판단서',tag:'must',tl:'필수 (예산부서)'},
    {n:'중기지방재정계획 반영 확인서',tag:'must',tl:'필수'},
  ];
  if(parseFloat(r.prov)>0) docs.splice(4,0,{n:'경기도비 지원 검토의견서',tag:'must',tl:'도비 포함'});
  else docs.splice(4,0,{n:'경기도비 지원 검토의견서',tag:'na',tl:'해당없음'});
  if(r.type==='office'||r.type==='complex') docs.push({n:'청사 리모델링 검토서',tag:'cond',tl:'청사 신축 시'});
  if(r.needsTang) docs.push({n:'타당성조사 결과서',tag:'must',tl:'500억↑ 필수'});

  h+='<div class="sec"><div class="sec-hd">제출 서류 목록</div><div class="dl-list">';
  for(var di=0;di<docs.length;di++){
    var d=docs[di];
    h+='<div class="di"><div class="d-num">'+(di+1)+'</div>';
    h+='<div class="d-name">'+d.n+'</div>';
    h+='<div class="d-tag '+d.tag+'">'+d.tl+'</div></div>';
  }
  h+='</div></div>';

  v('result-box').innerHTML=h;
  setTimeout(function(){ if(gResult) updateProgress(gResult.checkKeys); },50);
}

function renderCheck(r){
  var isEx=(r.auth.type==='exempt'||r.auth.type==='none'||r.auth.type==='self');
  if(isEx){
    var noticeMsg='';
    if(r.auth.type==='self'){
      noticeMsg='<div class="en-title">\uc790\uccb4\uc2ec\uc0ac \ub300\uc0c1</div>'
        +'<div class="en-desc">\uc790\uccb4\uc2ec\uc0ac \uc0ac\uc5c5\uc740 \uacbd\uae30\ub3c4 \ud22c\uc790\uc2ec\uc0ac \uccb4\ud06c\ub9ac\uc2a4\ud2b8 \uc791\uc131\uc774 \ud544\uc694\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.<br>\ud30c\uc8fc\uc2dc \uc790\uccb4 \ud22c\uc790\uc2ec\uc0ac\uc704\uc6d0\ud68c \uc2ec\uc758\ub97c \uc9c4\ud589\ud558\uc2dc\uba74 \ub429\ub2c8\ub2e4.</div>';
    } else {
      noticeMsg='<div class="en-title">\ud22c\uc790\uc2ec\uc0ac \uc758\ub8b0 \ubd88\ud544\uc694</div>'
        +'<div class="en-desc">\uc774 \uc0ac\uc5c5\uc740 \ud22c\uc790\uc2ec\uc0ac \ub300\uc0c1\uc774 \uc544\ub2d9\ub2c8\ub2e4.<br>\uacbd\uae30\ub3c4 \uccb4\ud06c\ub9ac\uc2a4\ud2b8 \uc791\uc131\uc774 \ud544\uc694\ud558\uc9c0 \uc54a\uc2b5\ub2c8\ub2e4.</div>';
    }
    var h='<div class="exempt-notice" style="margin:20px">';
    h+='<div class="en-icon">&#128203;</div>';
    h+=noticeMsg;
    h+='</div>';
    v('check-box').innerHTML=h;
    return;
  }
  var isEv=(r.type==='event');
  var items=isEv?[
    {no:'1',item:'심사대상',cont:'총사업비 및 심사주체 확인',guide:'도심사(3억 이상 30억 미만 행사성 등)',ex:''},
    {no:'2',item:'사업계획 수립',cont:'사업계획 수립여부 / 재정합의 이행여부 / 사업성격(근거법령)',guide:'경기도 예산담당관 공문번호 기재',ex:''},
    {no:'3',item:'사전절차',cont:'중기지방재정계획 반영 / 타당성조사 / 지방재정영향평가 / 주민·전문가 의견수렴',guide:'반영 연도 및 금액 기재',ex:'예: 반영(&#39;24.11월) / 사업명 00억원'},
    {no:'4',item:'제출서류',cont:'관련기관·기본현황 / 의뢰서 1번~6번 항목 / 재상정 사유 보완',guide:'항목 빠짐없이 작성',ex:''},
    {no:'5',item:'재원조달 능력',cont:'이전재원 / 자체재원 / 기타재원',guide:'공문번호 포함 구체적 기재',ex:'예: (국비) 0억원 / 00부 00과-00호'},
    {no:'6',item:'주민수혜·참여',cont:'주민 수혜도(%) / 숫원도 / 참여인원',guide:'(수혜주민/전체주민)\xd7100으로 산출',ex:'예: 4.63%(23,719명/511,308명)'},
    {no:'7',item:'필요성·차별성',cont:'지역사회 영향 / 주제·내용 연관성 / 추진시기 / 타 사업과 차별성',guide:'도내 유사사업과의 차별성 명시',ex:''},
    {no:'8',item:'사업의 타당성',cont:'사업규모·참여인원 / 사업비 산출근거 / 재무·경제 수익성 / 운영방안',guide:'전년도 결과보고서 기준 산출',ex:'예: &#39;24년 OOO축제 정산보고서 기준'},
    {no:'9',item:'사후평가',cont:'사후평가 계획 / 전년도 개선사항 반영 여부',guide:'1회성 행사는 해당없음 명시',ex:''},
    {no:'10',item:'기타',cont:'안전관리대안 / 홍보계획 / 부대시설 / 탄소중립·ESG',guide:'수립/수립예정/미수립 기재',ex:''},
  ]:[
    {no:'1',item:'심사대상',cont:'총사업비 및 심사주체 확인',guide:'이전재원 포함 여부, 유형별 기준금액 확인',ex:''},
    {no:'2',item:'사업계획 수립',cont:'사업계획 수립여부 / 재정합의 이행여부 / 사업성격(근거법령)',guide:'사업계획 수립 공문 또는 보고일자 기재',ex:'예: 경기도 예산담당관-00호(&#39;24.0.00)'},
    {no:'3',item:'사전절차',cont:'중기지방재정계획 반영 / 타당성조사 / 주민·전문가 의견수렴',guide:'반영 연도, 사업명, 금액 / B/C, IRR, NPV 포함',ex:'예: 반영(&#39;24.11월) / 사업명(5개년) 00억원'},
    {no:'4',item:'제출서류',cont:'관련기관·기본현황 / 의뢰서 1번~6번 항목 / 재상정 사유 보완여부',guide:'의뢰서 각 항목 누락 없이 작성',ex:''},
    {no:'5',item:'재원조달 능력',cont:'이전재원(국비·도비) / 자체재원 / 기타재원',guide:'공문번호 및 공모선정 내용 포함',ex:'예: (국비) 0억원 / 00부 00과-00호, 00사업 선정'},
    {no:'6',item:'주민수혜·요구',cont:'주민 수혜도(%) / 주민 숫원도',guide:'(수혜주민/전체주민)\xd7100으로 산출',ex:'예: 4.63%(23,719명/511,308명)'},
    {no:'7',item:'필요성·시급성',cont:'사업의 필요성·시급성 / 파급효과',guide:'현황 및 통계자료 쳊부',ex:''},
    {no:'8',item:'사업의 타당성',cont:'사업규모 / 사업비 산출근거 / 재무·경제 수익성 / 운영방안',guide:'유사시설 단가 또는 조달청 기준 적용',ex:'예: 조달청 공사비 정보광장 유사시설 단가'},
    {no:'9',item:'관련법령 절차',cont:'개별법령 관련성 / 법적 제약',guide:'허가·승인 필요 여부 및 처리 현황 기재',ex:'예: 개발제한구역 허가(00법 00조) 취득'},
    {no:'10',item:'기타',cont:'사업추진 위험성 (주민반대, 환경파괴 등)',guide:'쟁송·민원 현황 기재',ex:''},
  ];

  var h='';
  h+='<button class="print-btn" onclick="window.print()">&#128424; 인쇄</button>';
  h+='<div style="font-size:12px;color:var(--g500);margin-bottom:10px">사업명: <strong>'+esc(r.name||'미입력')+'</strong> | 총사업비: <strong>'+r.cost+'억원</strong></div>';
  h+='<div class="gk"><div class="gk-hdr">&#9633; 형식적 요건</div>';
  h+='<table><tr><th style="width:26px">No</th><th style="width:95px">항목</th><th>확인내용 및 작성 가이드</th></tr>';
  for(var ii=0;ii<5;ii++){
    var it=items[ii];
    h+='<tr><td class="gk-no">'+it.no+'</td><td class="gk-item">'+it.item+'</td>';
    h+='<td>'+it.cont+'<br><span style="color:var(--g400)">&#8594; '+it.guide+'</span>';
    if(it.ex) h+='<br><span class="gk-ex">&#128204; '+it.ex+'</span>';
    h+='</td></tr>';
  }
  h+='</table></div>';
  h+='<div class="gk"><div class="gk-hdr">&#9633; 실질적 요건</div>';
  h+='<table><tr><th style="width:26px">No</th><th style="width:95px">항목</th><th>확인내용 및 작성 가이드</th></tr>';
  for(var jj=5;jj<items.length;jj++){
    var jt=items[jj];
    h+='<tr><td class="gk-no">'+jt.no+'</td><td class="gk-item">'+jt.item+'</td>';
    h+='<td>'+jt.cont+'<br><span style="color:var(--g400)">&#8594; '+jt.guide+'</span>';
    if(jt.ex) h+='<br><span class="gk-ex">&#128204; '+jt.ex+'</span>';
    h+='</td></tr>';
  }
  h+='</table></div>';
  v('check-box').innerHTML=h;
}


/* ═══════════════════════════════════════════════════
   프롬프트 템플릿 (3단계 강화 버전)
════════════════════════════════════════════════════ */

/* ── 레이어 1: 시스템 프롬프트 (역할·원칙·금지) ── */
var PROMPT_SYSTEM = {
  base:
    '당신은 경기도 파주시 지방재정 투자심사 전담 행정 보조 AI입니다.\n\n'
  + '▣ 전문 역할\n'
  + '「지방재정법」제37조 및 「지방재정투자사업 심사규칙」에 정통한 투자심사 전문가.\n'
  + '파주시(시·군·구 기준) 자체·경기도·중앙 투자심사 전 단계 작성 실무 전문가.\n\n'
  + '▣ 출력 형식 (절대 준수)\n'
  + '① 마크다운 완전 금지: **, *, #, ##, ---, ___ 등 일절 사용 금지\n'
  + '② 항목 시작: ◦ 또는 ○ 기호, 또는 자연스러운 문장 서술 방식 허용\n'
  + '③ 소항목: 「가.」「나.」또는「①②③」으로 구분\n'
  + '④ 강조: 「」 괄호 사용\n'
  + '⑤ 항목 제목: 【5-N 항목명】 형식\n'
  + '⑥ 표: 텍스트 형식 (마크다운 표 금지)\n\n'
  + '▣ 수치·사실 처리 원칙 (절대 준수)\n'
  + '① 아래 【사업 정보】에 명시된 수치만 사용\n'
  + '② 제공되지 않은 수치는 절대 임의 생성 금지\n'
  + '   → [담당자 입력 필요: 항목명] 형식으로 표시\n'
  + '③ 법령 인용은 반드시 조문 번호까지 명시\n'
  + '④ 파주시 인구 530,000명은 확정 수치 (사용 가능)\n'
  + '⑤ 연도별 투자계획 임의 배분 절대 금지\n'
  + '⑥ 사업 정보에 없는 특정 지명·시설명·인물명 추가 금지\n\n'
  + '▣ 작성 금지\n'
  + '① 조문 번호 없는 법령 인용\n'
  + '② 근거 없는 수치 생성 (B/C, IRR, NPV, 이용률, 경제유발효과 등)\n'
  + '③ "~될 것으로 기대됩니다" 등 추측 표현\n'
  + '④ 제공된 사업 정보 외 사실 임의 추가\n'
  + '⑤ 특정 동명·지명 등 사업 정보에 없는 고유명사 추가\n\n'
  + '▣ 작성 품질 기준\n'
  + '① 각 소항목(가·나·다)은 최소 3~5문장 이상 구체적으로 작성\n'
  + '② 심사위원이 "왜 이 사업이 필요한가"를 납득할 수 있는 논거 제시\n'
  + '③ 파주시 특성 반영: 수도권 북부 신도시 개발 지속, 인구 지속 유입,\n'
  + '   운정신도시 등 택지개발에 따른 공공시설 수요 급증\n'
  + '④ 단순 나열 금지 → 원인-현황-필요성 인과관계 중심 서술\n'
  + '⑤ 법령 조문은 반드시 조문 번호·항·호까지 정확히 인용\n'
  + '⑥ 수치가 없는 항목은 [담당자 입력 필요: 구체 항목명] 으로 표시\n'
  + '   단, 파주시 인구(530,000명)·법령 조문은 확정 수치로 직접 사용',

  kb:
    '\n\n▣ 내장 지식베이스: 지방재정 투자심사 및 타당성조사 운영기준(행정안전부, 2025.4.30. 개정) 요지\n'
  + '① 심사대상·기관(파주시 등 시·군·구 기준, 시행령 제41조 제2항):\n'
  + ' - 이전재원 포함 일반투자사업: 20억 미만 비대상 / 20~60억 자체심사 / 60~200억 경기도 의뢰 / 200억 이상 중앙(행안부)\n'
  + ' - 전액 자체재원 일반투자사업: 20억 이상이면 금액 상한 없이 전부 자체심사 (제1호 다목)\n'
  + ' - 전액 자체재원 청사·문화·체육시설 신축: 20~60억 자체 / 60억 이상 경기도 의뢰 (중앙심사 없음, 제2호 라목)\n'
  + ' - 홍보관: 3~60억 자체 / 60~200억 경기도 / 200억 이상 중앙. 행사성: 1~3억 자체 / 3~200억 경기도 / 200억 이상 중앙\n'
  + ' - 공동협력사업: 20억 미만 비대상 / 20~60억 자체 / 60~500억 경기도 / 500억 이상 중앙\n'
  + ' - 채무부담·보증채무·예산외의무부담: 20억 미만 자체 / 20~50억 경기도 / 50억 이상 중앙 (하한 없음)\n'
  + ' - 외국자본 도입사업: 10억 이상 전부 중앙심사(제3호 나목). 파주시는 인구 100만 미만으로 대도시 특례 미적용\n'
  + '② 심사 면제: 재해복구, 문화재수리, 지방공사·공단 설립, 보건소·소방기관 건축(복합시설 제외)(법 제37조③) + 시행령 별표 25개 당연면제(총사업비 70% 이상 국가지원 포함) + 협의면제(별표 제26호)\n'
  + '③ 재심사 사유(심사규칙 제6조): 1.총사업비 30% 이상 증가(물가인상분·손실보상비 공제 가능. 단 연면적·연장 증가 공사비, 부지면적 증가 보상비는 공제 불가. 500억 이상은 (심사당시총사업비-500억)×20%+150억 초과 시) 2.지방채발행액 30% 이상 증가 3.지방채 신설로 자체재원의 50% 초과 발행 4.4년 이상 지연(미착공)·보류(예산 미편성) 5.재원변경으로 심사기관 상위 변경 6.사업부지 위치 변경(동일 법정동 내 제외) 7.감사원 요청\n'
  + ' - 재심사 제외: 시설사업 기성대가 10% 이상 지출 또는 기타사업 총사업비 25% 이상 기지출(단 재심사 대상이 객관적으로 예상된 경우 즉시 의뢰 의무). 국가·민간 부담분만 증가한 경우 제외\n'
  + ' - 재심사 의뢰시기: 요건 해당 즉시, 다음 절차 진행 이전에 의뢰. 재심사 기관은 변경된 총사업비 기준 재판정\n'
  + '④ 총사업비 산정: 공사비(낙찰차액 미적용)+보상비+시설부대경비(설계·감리·조사측량 등)+운영설비비+제세공과금+예비비(합계의 10%) 모두 포함. 국가·민간 부담분, 기지출 비용, 융자사업비 포함. 계속사업은 5년간 사업비 합계로 판단. 실시설계 완료 후 예비비 제외 가능\n'
  + '⑤ 타당성조사: 총사업비 500억 이상 신규사업(실시설계 미발주)은 행안부 고시 전문기관의 타당성조사 후 투자심사(법 제37조의2). 예비타당성조사 등 기이행 시 면제\n'
  + '⑥ 정기심사 연 3회(3·6·9월): 파주시→경기도 의뢰 마감 1/15·4/15·7/15, 경기도→행안부 1/31·4/30·7/31, 결과통보 4·7·10월 중순\n'
  + '⑦ 예산편성 연계: 투자심사 통과(적정·조건부) 후에만 기본설계 용역(생략 시 실시설계) 예산 편성 가능. 부적정·재검토 사업은 국고보조금·특별교부세·시도비 지원 불가\n'
  + '⑧ 행사성 특례: 매년·격년 정기 행사는 3년마다 심사(직전 대비 20% 이상 증액 시 즉시 재심사). 행사 개최용 영구시설물은 별도 사업으로 심사\n'
  + '⑨ 지방재정영향평가: 행사성 사업(시·군·구 10억 이상), 공모 유치·응모 사업(총사업비 100억 이상 그리고 지방재정부담 50억 이상)은 평가서 제출\n'
  + '⑩ 2단계 심사: 1차 심사 조건부 통과 후 본공사 계약 전 재차 심사. 공사계약과 무관한 설계비·보상비 집행은 가능\n'
  + '※ 규정 질의에는 위 지식과 조문번호를 근거로 답하고, 위 지식 범위 밖이면 운영기준 원문 확인을 안내할 것.',

  gyeonggi:
    '\n\n▣ 경기도 의뢰심사 특화 (60~200억)\n'
  + '심사기관: 경기도 투자심사위원회 (15인 이내)\n'
  + '반드시 포함:\n'
  + '① 도비 확보 현황: 확보 시 보조율·회계명·확보 시기 명시. 미확보 시 [담당자 입력 필요]\n'
  + '② 재원조달능력 판단조서 작성 예정 여부\n'
  + '③ 경기도 중기지방재정계획 반영 여부: [담당자 입력 필요]\n'
  + '④ 경기도 공공건설심의 완료 여부 (공사비 5억↑ 복합공종)\n'
  + '부결 사유 사전 차단: 재원조달 미흡 / 주민수혜도 저조 / 준비 미비 / 타당성 저조',

  central:
    '\n\n▣ 행안부 중앙투자심사 특화 (200억 이상)\n'
  + '심사기관: 행정안전부 중앙투자심사위원회 (연 4회: 1·4·7·10월)\n'
  + '가장 엄격한 기준. 현지심사 가능성 고려하여 수치 중심 작성.\n'
  + '반드시 포함:\n'
  + '① 타당성조사 이행 여부 (5-5항 필수 명시)\n'
  + '   500억 이상: 전문기관 조사 완료 후 의뢰. [담당자 입력 필요: 조사결과]\n'
  + '   500억 미만: "총사업비 N억원으로 의무 타당성조사 대상 미해당 (500억↑)"\n'
  + '② 국비 확보 현황 (1-7항·5-6항 필수 명시)\n'
  + '   확보: "{부처} {사업명}, {연도}년 예산 반영 확정 공문번호: [담당자 입력]"\n'
  + '   미확보: [담당자 입력 필요: 신청 예정 부처·시기·공모사업명]\n'
  + '③ 재원조달능력 판단조서 반드시 작성 명시\n'
  + '④ 유사·중복시설 검토 (5-8항): 인근 유사시설 현황 [담당자 입력 필요]\n'
  + '⑤ 연도별 투자계획: [담당자 작성 필요] — 임의 배분 금지\n'
  + '부결 사유 차단: 국비 미확보 / B/C 1.0 미만 시 정책 타당성 보완 / 운영 적자 해소방안'
};

/* ── 레이어 2: 컨텍스트 프롬프트 (사업별 자동 생성) ── */
function buildContextPrompt(r) {
  if (!r) return '';
  var typeMap = {
    general:'일반투자사업', office:'청사 신축사업',
    culture:'문화·체육시설', complex:'복합시설(청사+문화체육)',
    promo:'홍보관', event:'행사성 사업',
    debt:'채무부담행위', joint:'공동협력사업'
  };
  var stageMap = {
    plan:'사업계획 수립', basic:'기본설계 중',
    basic_done:'기본설계 완료', detail:'실시설계 중',
    detail_done:'실시설계 완료'
  };
  var cost = r.cost || 0;
  var nat  = r.nat  || 0;
  var prov = r.prov || 0;
  var city = Math.max(0, cost - nat - prov);
  var natPct  = cost > 0 ? (nat/cost*100).toFixed(1)  : 0;
  var provPct = cost > 0 ? (prov/cost*100).toFixed(1) : 0;
  var cityPct = cost > 0 ? (city/cost*100).toFixed(1) : 0;
  var tang = cost >= 500 ? '의무 대상 (500억 이상)' : '대상 아님 (500억 미만, 「지방재정법」 제37조의2)';

  var c = '\n\n【사업 기본 정보】\n';
  c += '사업명:     ' + (r.name||'미입력') + '\n';
  c += '사업유형:   ' + (typeMap[r.type]||r.type) + '\n';
  c += '심사기관:   ' + (r.auth ? r.auth.label : '미판단') + '\n';
  c += '법령근거:   ' + (r.auth ? r.auth.law : '') + '\n';
  c += '현재단계:   ' + (stageMap[r.stage]||r.stage||'사업계획 수립') + '\n';
  c += '총사업비:   ' + cost + '억원\n';
  c += '재원구성:   국비 ' + nat + '억원(' + natPct + '%)';
  c += ' / 도비 ' + prov + '억원(' + provPct + '%)';
  c += ' / 시비 ' + city + '억원(' + cityPct + '%)\n';
  c += '타당성조사: ' + tang + '\n';
  c += '재심사여부: ' + (r.reTrig && r.reTrig.length > 0 ? '재심사 사유 발생 (' + r.reTrig.length + '건)' : '해당 없음') + '\n';

  /* 계산기 결과 자동 포함 (입력된 경우에만) */
  var area = parseFloat(document.getElementById('ci_area') ? document.getElementById('ci_area').value : 0) || 0;
  var unit = parseFloat(document.getElementById('ci_unit') ? document.getElementById('ci_unit').value : 0) || 0;
  if (area > 0 && unit > 0) {
    var resultEl = document.getElementById('calc-result-area');
    if (resultEl && resultEl.innerText && resultEl.innerText.length > 10) {
      c += '\n【총사업비 세부산출내역】 (계산기 입력 기준)\n';
      c += '연면적:     ' + area.toLocaleString() + '㎡\n';
      c += '공사비 단가:' + unit.toLocaleString() + '천원/㎡\n';
      var constBase = area * unit / 100000;
      c += '공사비:     약 ' + constBase.toFixed(1) + '억원\n';
      var cmEl = document.getElementById('ci_cm_type');
      if (cmEl) c += 'CM 방식:    ' + (cmEl.options[cmEl.selectedIndex] ? cmEl.options[cmEl.selectedIndex].text : '') + '\n';
    }
  }

  /* 사업기간 자동 포함 */
  var construct = parseFloat(document.getElementById('pp_construct') ? document.getElementById('pp_construct').value : 0) || 0;
  var resultEl2 = document.getElementById('period-result-area');
  if (construct > 0 && resultEl2 && resultEl2.innerText) {
    var txt = resultEl2.innerText.replace(/\n+/g, ' ').trim();
    if (txt.length > 5) {
      c += '\n【사업기간 산출 결과】\n';
      c += '공사기간:   ' + construct + '개월\n';
      c += '기간 요약:  ' + txt.substring(0, 100) + '\n';
    }
  }

  c += '\n【파주시 기준 데이터】\n';
  c += '전체 인구:  530,000명 (수혜도 계산 기준)\n';
  c += '지역 특성:  수도권 북부, 운정신도시 등 택지개발 지속, 인구 급증 지역\n';
  c += '※ 동별 인구, 재정자립도 등은 [담당자 입력 필요]\n';

  /* 경제성 분석 결과 자동 주입 */
  var econEl3 = document.getElementById('econ-result-area');
  if (econEl3 && econEl3.innerText && econEl3.innerText.length > 20) {
    var et3 = econEl3.innerText;
    var bm3 = et3.match(/B\/C[^:\n]*?:\s*([\d.]+)/);
    var nm3 = et3.match(/NPV[^:\n]*?:\s*([+-]?\d+)/);
    var im3 = et3.match(/IRR[^:\n]*?:\s*([\d.]+)/);
    if (bm3 || nm3 || im3) {
      c += '\n【경제성 분석 결과 (자체 검토)】\n';
      c += '분석기준: 사회적 할인율 4.5% / 분석기간 30년\n';
      if (bm3) c += 'B/C: ' + bm3[1] + '\n';
      if (nm3) c += 'NPV: ' + nm3[1] + '억원\n';
      if (im3) c += 'IRR: ' + im3[1] + '%\n';
    }
  }

  return c;
}

/* ── buildSystemPrompt ── */
function buildSystemPrompt(r) {
  var sys = PROMPT_SYSTEM.base + (PROMPT_SYSTEM.kb||'');
  if (!r) return sys;
  if (r.auth && r.auth.type === 'gyeonggi') sys += PROMPT_SYSTEM.gyeonggi;
  if (r.auth && r.auth.type === 'central')  sys += PROMPT_SYSTEM.central;
  return sys;
}

/* ── 레이어 3: 항목별 태스크 프롬프트 (범용 구조) ── */
function buildTaskPrompt(r) {
  var cost = r ? (r.cost || 0) : 0;
  var isCentral  = r && r.auth && r.auth.type === 'central';
  var isGyeonggi = r && r.auth && r.auth.type === 'gyeonggi';
  var tang500    = cost >= 500;

  var t = '아래 9개 항목을 순서대로 모두 작성해줘.\n';
  t += '각 항목은 【5-N 항목명】 제목으로 시작하고 자연스러운 문장 또는 ◦ 기호로 작성.\n';
  t += '마크다운(**, *, #, ##) 절대 금지.\n\n';
  t += '【작성 품질 기준】\n';
  t += '① 각 소항목(가·나·다) 최소 3~5문장 이상 — 1~2줄 작성 금지\n';
  t += '② 원인→현황→결론 인과관계 중심 서술\n';
  t += '③ 심사위원 관점: "왜 지금 이 사업이 필요한가" 논거 명확히\n';
  t += '④ 파주시 신도시 인구 유입·공공시설 수요 맥락 적극 활용\n';
  t += '⑤ 제공된 수치(사업비·면적·경제성 등)는 반드시 본문에 인용\n';
  t += '⑥ 수치 없으면 [담당자 입력 필요: 구체 항목명] 표시\n\n';

  /* 5-1 */
  t += '【5-1 사업의 필요성 및 시급성】\n';
  t += '가. 현황 및 문제점 (3~5문장 이상 구체적으로)\n';
  t += '  - 파주시 인구 530,000명, 신도시 개발로 인구 지속 유입\n';
  t += '  - 사업명·사업유형 기준으로 해당 시설 부재·노후·부족 현황\n';
  t += '  - 현재 주민이 겪는 구체적 불편사항과 행정 수요\n';
  t += '  - 수치 없으면 [담당자 입력 필요: 현황 수치] 표시\n';
  t += '나. 추진 근거\n';
  t += '  - 총사업비 기준 심사기관 법령 근거 명시\n';
  t += '  - 중기지방재정계획 반영: [담당자 입력 필요]\n';
  t += '다. 시급성: 지연 시 발생하는 구체적 문제\n\n';

  /* 5-2 */
  t += '【5-2 국가계획 및 경제·사회정책과의 부합성】\n';
  t += '가. 파주시 중기지방재정계획 반영\n';
  t += '  - [담당자 입력 필요: 반영 연도·금액]\n';
  t += '나. 관련 상위 계획 부합성\n';
  t += '  - 파주시 도시기본계획 부합\n';
  t += '  - 사업 유형에 맞는 국가 정책 인용 (법령 조문 명시)\n';
  t += '다. 정부 정책 부합성: 관련 법령 및 정책 연계\n\n';

  /* 5-3 */
  t += '【5-3 주민의 숙원도 및 수혜도】\n';
  t += '가. 주민 수혜도 (정량적 산출)\n';
  t += '  산출식: (수혜주민 ÷ 530,000) × 100\n';
  t += '  수혜 범위는 사업 유형·규모에 따라 결정 (3~5문장 이상):\n';
  t += '  - 동 단위 시설: 해당 동 주민\n';
  t += '  - 시 전체 이용 시설: 파주시 전체 또는 권역 주민\n';
  t += '  - 복합시설: 시설별 수혜 범위 각각 산정\n';
  t += '  수혜 인원: [담당자 입력 필요: 직접 수혜 N명]\n';
  t += '  수혜율:   [담당자 산출 필요]\n';
  t += '나. 주민 숙원도\n';
  t += '  - 건의·청원·민원 현황: [담당자 입력 필요]\n';
  t += '  - 설문조사 결과 (시행 시): [담당자 입력 필요]\n\n';

  /* 5-4 */
  t += '【5-4 사업의 파급효과】\n';
  t += '가. 직접 효과\n';
  t += '  - 연간 예상 이용 인원: [담당자 입력 필요]\n';
  t += '  - 주민 서비스 개선 내용\n';
  t += '나. 간접 효과\n';
  t += '  - 지역 정주 여건 개선, 공동체 활성화\n';
  t += '다. 경제적 효과\n';
  t += '  - 건설 단계 고용 창출: [담당자 입력 필요]\n';
  t += '  - 운영 단계 일자리: [담당자 입력 필요]\n\n';

  /* 5-5 */
  t += '【5-5 재정·경제적 효율성】\n';
  t += '가. 의무 타당성조사 이행 여부\n';
  if (tang500) {
    t += '  총사업비 ' + cost + '억원 — 의무 타당성조사 대상\n';
    t += '  「지방재정법」 제37조의2 제1항\n';
    t += '  조사 결과: [담당자 입력 필요: 기관·B/C·IRR·NPV]\n';
  } else {
    t += '  총사업비 ' + cost + '억원으로 의무 타당성조사\n';
    t += '  대상(500억 이상) 미해당\n';
    t += '  (「지방재정법」 제37조의2 제1항)\n';
  }
  t += '나. 경제성 분석 (자체 검토 시)\n';
  t += '  B/C: [담당자 산출 필요]\n';
  t += '  IRR: [담당자 산출 필요]\n';
  t += '  NPV: [담당자 산출 필요]\n';
  t += '  ※ 수치 없으면 [담당자 작성] 표시. 임의 생성 금지\n';
  t += '다. 적정 사업비 검토\n';
  t += '  공사비 기준 단가와 유사시설 비교\n';
  if (isCentral) {
    t += '  ⚠ 중앙심사: B/C 1.0 미만 시 정책적 타당성으로 보완 필수\n';
  t += '  ※ 경제성 분석 결과(B/C·NPV·IRR)가 【사업 정보】에 있으면 반드시 인용\n';
  }
  t += '\n';

  /* 5-6 */
  t += '【5-6 재원조달 가능 여부 및 채무상환능력】\n';
  t += '가. 재원 구성 명세\n';
  t += '  (【사업 기본 정보】의 재원구성 그대로 작성)\n';
  if (isCentral || isGyeonggi) {
    t += '나. 국비·도비 확보 현황 (필수 명시)\n';
    t += '  확보 완료: "{부처} {사업명}, {연도}년 예산 반영\n';
    t += '              공문번호: [담당자 입력 필요]"\n';
    t += '  미확보: [담당자 입력 필요: 신청 예정 부처·시기]\n';
  }
  t += '다. 연도별 투자계획: [담당자 작성 필요] — 임의 배분 절대 금지\n';
  t += '라. 재원조달능력 판단조서\n';
  t += '  재정자립도: [담당자 입력 필요: 최신 연도]\n';
  t += '  재정자주도: [담당자 입력 필요: 최신 연도]\n';
  t += '  지방채 현황: [담당자 입력 필요]\n\n';

  /* 5-7 */
  t += '【5-7 사업추진 준비상황】\n';
  t += '가. 현재 단계 (자동 반영)\n';
  t += '나. 법적 절차 이행 현황\n';
  t += '  - 공유재산관리계획 수립: [담당자 입력 필요]\n';
  t += '  - 중기지방재정계획 반영: [담당자 입력 필요]\n';
  t += '  - 부지 확보 현황: [담당자 입력 필요]\n';
  t += '  - 도시계획시설 지정: [담당자 입력 필요]\n';
  t += '다. 설계 진행 현황\n';
  t += '라. 인허가 처리 현황: [담당자 입력 필요]\n\n';

  /* 5-8 */
  t += '【5-8 사업추진에 따른 문제점 및 대책】\n';
  t += '가. 예상 문제점\n';
  t += '  - 공사 기간 중 민원 (소음·분진 등)\n';
  t += '  - 운영 단계 재정 부담\n';
  t += '  - [담당자 입력 필요: 사업 특성상 문제점]\n';
  t += '나. 대책\n';
  t += '  - 주민 설명회 개최 계획\n';
  t += '  - 운영 수지 개선 방안\n';
  if (isCentral) {
    t += '다. 유사·중복시설 검토 (중앙심사 필수)\n';
    t += '  인근 유사시설 현황: [담당자 입력 필요]\n';
    t += '  이용률 현황: [담당자 입력 필요]\n';
    t += '  차별화 방안: 사업명 기준으로 차별화 방안 명시\n';
  }
  t += '\n';

  /* 5-9 */
  t += '【5-9 기타】\n';
  t += '가. 주민 반대 현황: [없으면 "해당 없음"]\n';
  t += '나. 환경영향평가 필요 여부\n';
  t += '다. 타 기관 협의 사항: [담당자 입력 필요]\n';
  if (r && r.reviewType === 're') {
    t += '라. 재심사 이력\n';
    t += '  직전 심사 결과 및 조건부 사항 이행 내용 명시\n';
  }

  return t;
}

/* ── aiDraftAll 업데이트 (레이어3 통합) ── */
/* 의뢰서 초안 항목 AI 채우기 */
function aiDraftBySection() {
  if (!gResult) {
    alert('먼저 투자심사 사전판단을 실행하세요.');
    return;
  }
  if (!gKey) {
    alert('AI 설정에서 API Key를 입력하세요.');
    openSettings();
    return;
  }

  /* 의뢰서 초안 탭 유지 + 로딩 표시 */
  var draftBox = v('draft-box');
  if (!draftBox) {
    alert('판단을 먼저 실행하세요.');
    return;
  }

  /* 로딩 오버레이 표시 */
  var overlay = document.getElementById('ai-draft-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'ai-draft-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;'
      + 'background:rgba(0,0,0,.45);z-index:9999;display:flex;'
      + 'align-items:center;justify-content:center;';
    overlay.innerHTML = '<div style="background:#fff;border-radius:12px;padding:32px 40px;'
      + 'text-align:center;box-shadow:0 8px 32px rgba(0,0,0,.2);max-width:360px">'
      + '<div style="font-size:36px;margin-bottom:12px">&#129302;</div>'
      + '<div style="font-size:15px;font-weight:700;color:#003C96;margin-bottom:8px">'
      + 'AI가 의뢰서 초안을 작성 중입니다</div>'
      + '<div style="font-size:12px;color:#666;margin-bottom:16px">'
      + '25개 항목을 순서대로 작성합니다.<br>'
      + 'GPT: 30치~1분 / Gemini: 20~40초 소요</div>'
      + '<div class="ai-typing-dots" style="justify-content:center">'
      + '<span></span><span></span><span></span></div>'
      + '<div style="margin-top:16px">'
      + '<button onclick="document.getElementById(\'ai-draft-overlay\').style.display=\'none\'" '
      + 'style="font-size:11px;padding:5px 14px;border:1px solid #ccc;'
      + 'border-radius:99px;cursor:pointer;background:#f5f5f5">'
      + '■ 취소</button></div>'
      + '</div>';
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';

  var prompt = buildDraftSectionPrompt(gResult);

  callAI(prompt, function(resp, err) {
    /* 오버레이 제거 */
    if (overlay) overlay.style.display = 'none';

    if (err) {
      alert('AI 오류: ' + err);
      return;
    }

    /* 의뢰서 초안에 반영 */
    var applied = applyAIDraftToForm(resp);
    if (applied > 0) {
      /* 의뢰서 초안 탭 유지 + 상단 안내 */
      switchRT('draft');
      var notice = document.getElementById('ai-applied-notice');
      if (!notice) {
        notice = document.createElement('div');
        notice.id = 'ai-applied-notice';
        notice.style.cssText = 'background:#e8f5e9;border:1px solid #4caf50;'
          + 'border-radius:6px;padding:10px 14px;margin-bottom:10px;'
          + 'font-size:12px;color:#1b5e20;display:flex;align-items:center;gap:8px;';
        var scrollEl = document.getElementById('draft-scroll') ||
    document.querySelector('#rt-draft > div:last-child') ||
    document.querySelector('#rt-draft [style*="overflow-y"]');
        if (scrollEl) scrollEl.insertBefore(notice, scrollEl.firstChild);
      }
      notice.innerHTML = '&#10003; <strong>AI 작성 완료</strong> — '
        + applied + '개 항목이 반영됐습니다. '
        + '<span style="color:#1565c0">[담당자 입력 필요]</span> 항목을 직접 수정하세요. '
        + '<button onclick="this.parentNode.style.display=\'none\'" '
        + 'style="margin-left:8px;border:none;background:transparent;cursor:pointer;'
        + 'color:#666;font-size:12px">✕ 닫기</button>';
      notice.style.display = 'flex';

      /* 스크롤 상단으로 */
      var scroll = document.getElementById('draft-scroll');
      if (scroll) scroll.scrollTop = 0;
    } else {
      alert('AI 응답에서 항목을 찾지 못했습니다.\nAI 초안 탭에서 응답 형식을 확인하세요.');
      /* 실패 시 AI 탭으로 이동해서 원본 확인 */
      addChatMsg('user', '(의뢰서 초안 채우기 시도)');
      addChatMsg('assistant', resp);
      switchRT('ai');
    }
  });
}


/* 의뢰서 초안 항목별 프롬프트 생성 */
function buildDraftSectionPrompt(r){
  var ctx=buildContextPrompt(r);
  var sys=buildSystemPrompt(r);
  var sections=[
    '1-1 추진목적','1-2 시행근거','1-3 시행주체','1-4 사업위치',
    '1-5 사업기간','1-6 사업량','1-7 총사업비','1-8 사업추진절차','1-9 기대효과',
    '4-1 중기재정계획','4-2 지방재정영향평가','4-3 관계기관협의','4-4 타당성조사',
    '5-1 사업의필요성및시급성','5-2 국가계획부합성','5-3 주민숙원도및수혜도',
    '5-4 사업의파급효과','5-5 경제적수익성및타당성','5-6 재원조달가능여부',
    '5-7 사업추진준비상황','5-8 문제점및대책','5-9 기타',
    '6-1 기구및조직','6-2 사업수지전망','6-3 세부시설운영계획'
  ];
  var prompt=sys+ctx
    +'\n\n【작성 요청】\n'
    +'다음 의뢰서 항목들을 순서대로 작성해주세요.\n'
    +'각 항목은 [항목번호 항목명] 형태로 시작하고, 내용을 작성하세요.\n'
    +'예시: [1-1 추진목적]\n내용...\n\n[1-2 시행근거]\n내용...\n\n'
    +'규칙:\n'
    +'- 마크다운(**, ##) 사용 금지\n'
    +'- 정보 없는 항목: [담당자 입력 필요: 설명] 형태\n'
    +'- ◦ 기호로 항목 구분\n'
    +'- 가나다라 소제목 사용\n'
    +'- 각 항목 3~5문장\n\n'
    +'작성할 항목 목록:\n';
  sections.forEach(function(s){prompt+=s+'\n';});
  return prompt;
}
function applyAIDraftToForm(resp){
  var draftBox=v('draft-box');
  if(!draftBox||!resp) return 0;
  var sections={};
  var ALL_KEYS=[
    '1-1','1-2','1-3','1-4','1-5','1-6','1-7','1-8','1-9',
    '4-1','4-2','4-3','4-4',
    '5-1','5-2','5-3','5-4','5-5','5-6','5-7','5-8','5-9',
    '6-1','6-2','6-3'
  ];
  ALL_KEYS.forEach(function(k){ sections[k]=''; });
  var lines=resp.split('\n'), curKey=null;
  function detectKey(line){
    var t=line.trim();
    var m=t.match(/^\[?(\d+-\d+)[.\s\]]/);
    if(m) return m[1];
    return null;
  }
  lines.forEach(function(line){
    var k=detectKey(line);
    if(k && sections.hasOwnProperty(k)){ curKey=k; return; }
    if(curKey && sections.hasOwnProperty(curKey)){
      sections[curKey]+=(sections[curKey]?'\n':'')+line;
    }
  });
  var applied=0;
  ALL_KEYS.forEach(function(key){
    var content=sections[key].trim();
    if(!content) return;
    var el=getSecEl(key);
    if(!el) return;
    el.textContent=content;
    el.style.background='#f0f7ff';
    el.style.borderLeft='3px solid #003C96';
    el.style.paddingLeft='10px';
    el.style.transition='background .5s';
    setTimeout(function(f){ return function(){ f.style.background=''; }; }(el), 2000);
    applied++;
  });
  return applied;
}
function addChatMsg(role, content) {
  var now = new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
  gChatHistory.push({role:role, content:content, time:now});
  renderChatMsg(role, content, now);
  var hist = v('ai-chat-history');
  if (hist) hist.scrollTop = hist.scrollHeight;
}

function renderChatMsg(role, content, time) {
  var hist = v('ai-chat-history');
  if (!hist) return;
  var safe = content.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  var div = document.createElement('div');
  div.className = 'ai-msg ai-msg-' + (role==='user'?'user':'ai');
  div.innerHTML = '<div class="ai-msg-bubble">' + safe + '</div>'
    + '<div class="ai-msg-meta">' + (role==='user'?'나':'AI 어시스턴트') + ' · ' + time + '</div>';
  hist.appendChild(div);
  hist.scrollTop = hist.scrollHeight;
}

function showTyping() {
  var hist = v('ai-chat-history');
  if (!hist) return;
  var div = document.createElement('div');
  div.className = 'ai-msg ai-msg-ai ai-msg-typing';
  div.id = 'ai-typing-indicator';
  div.innerHTML = '<div class="ai-msg-bubble"><div class="ai-typing-dots"><span></span><span></span><span></span></div></div>';
  hist.appendChild(div);
  hist.scrollTop = hist.scrollHeight;
}

function hideTyping() {
  var el = v('ai-typing-indicator');
  if (el) el.parentNode.removeChild(el);
}

function clearChat() {
  if (!confirm('대화 내용을 모두 지우시겠습니까?')) return;
  gChatHistory = [];
  var hist = v('ai-chat-history');
  if (hist) hist.innerHTML = '<div class="ai-msg ai-msg-ai"><div class="ai-msg-bubble">대화가 초기화되었습니다. 질문을 입력하세요.</div></div>';
}

/* ═══════════════════════════════════════════════════
   API 호출 (멀티턴)
════════════════════════════════════════════════════ */
function callAI(userMsg, callback) {
  if (!gKey) {
    callback(null, 'API Key가 설정되지 않았습니다. 우측 상단 AI 설정 버튼을 클릭하세요.');
    return;
  }
  /* gChatHistory 제외한 메시지만 전송 (AI 초안 요청에는 대화 기록을 남기지 않음) */
  var url, opts;
  var sysFull = buildSystemPrompt(gResult) + buildContextPrompt(gResult);
  if (gAI === 'claude') {
    var claudeModel = (document.getElementById('claude-model-select') ?
      document.getElementById('claude-model-select').value : 'claude-sonnet-4-6');
    var sysPromptC = sysFull;
    url = 'https://api.anthropic.com/v1/messages';
    opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': gKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: claudeModel,
        max_tokens: 4000,
        system: sysPromptC,
        messages: [{role: 'user', content: userMsg}]
      })
    };
  } else if (gAI === 'gpt') {
    var gptModel = (document.getElementById('gpt-model-select') ?
      document.getElementById('gpt-model-select').value : 'gpt-4o');
    var sysPrompt = sysFull;
    url = 'https://api.openai.com/v1/chat/completions';
    opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + gKey
      },
      body: JSON.stringify({
        model: gptModel,
        max_tokens: 4000,
        messages: [
          {role: 'system', content: sysPrompt},
          {role: 'user',   content: userMsg}
        ]
      })
    };
  } else {
    var geminiModel = (document.getElementById('gemini-model-select') ?
      document.getElementById('gemini-model-select').value : 'gemini-2.0-flash');
    var sysPromptG = sysFull;
    url = 'https://generativelanguage.googleapis.com/v1beta/models/'
        + geminiModel + ':generateContent?key=' + gKey;
    opts = {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        system_instruction: {parts: [{text: sysPromptG}]},
        contents: [{parts: [{text: userMsg}]}],
        generationConfig: {maxOutputTokens: 4000}
      })
    };
  }
  fetch(url, opts)
    .then(function(res) {
      if (!res.ok) {
        return res.text().then(function(t) {
          throw new Error('HTTP ' + res.status + ': ' + t.substring(0, 200));
        });
      }
      return res.json();
    })
    .then(function(data) {
      var txt = '';
      if (gAI === 'claude') {
        if (data.content && data.content.length) {
          txt = data.content.filter(function(c){return c.type==='text';})
                            .map(function(c){return c.text;}).join('');
        }
      } else if (gAI === 'gpt') {
        txt = (data.choices && data.choices[0] &&
               data.choices[0].message &&
               data.choices[0].message.content) || '';
      } else {
        txt = (data.candidates && data.candidates[0] &&
               data.candidates[0].content &&
               data.candidates[0].content.parts &&
               data.candidates[0].content.parts[0] &&
               data.candidates[0].content.parts[0].text) || '';
      }
      if (!txt) {
        callback(null, 'API 응답이 비어있습니다. (' + JSON.stringify(data).substring(0,100) + ')');
        return;
      }
      callback(txt, null);
    })
    .catch(function(e) { callback(null, e.message); });
}
function sendChat() {
  var input = v('ai-chat-input');
  if (!input) return;
  var msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  input.style.height = '';
  var btn = v('ai-chat-send-btn');
  if (btn) btn.disabled = true;
  addChatMsg('user', msg);
  showTyping();
  callAI(msg, function(resp, err) {
    hideTyping();
    if (btn) btn.disabled = false;
    if (err) { addChatMsg('assistant', '오류: ' + err); return; }
    addChatMsg('assistant', resp);
  });
}

function chatKeyDown(e) {
  if (e.key==='Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
  var input = e.target;
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';
}

function quickAsk(question) {
  var input = v('ai-chat-input');
  if (input) { input.value = question; sendChat(); }
}

function aiDraftAll() {
  var sectionList = ''
    + '5-1. 사업의 필요성 및 시급성\n'
    + '5-2. 국가계획 및 경제·사회정책과의 부합성\n'
    + '5-3. 주민의 숙원도 및 수혜도\n'
    + '5-4. 사업의 파급효과\n'
    + '5-5. 재정·경제적 효율성 (타당성조사 이행 여부 포함)\n'
    + '5-6. 재원조달 가능 여부 및 채무상환능력\n'
    + '5-7. 사업추진 준비상황 (법적절차 이행 등)\n'
    + '5-8. 문제점 및 대책 (유사·중복시설 검토 포함)\n'
    + '5-9. 기타\n';
  var msg = '현재 사업의 투자심사 의뢰서 심사기준 항목 초안을 아래 9개 항목 순서대로 모두 작성해줘.\n\n'
    + sectionList
    + '\n【작성 규칙 엄수】\n'
    + '① 마크다운 문법(**, *, #, ---, _) 절대 사용 금지\n'
    + '② 항목 시작: ◦ 또는 ○ 기호, 또는 자연스러운 문장 서술 방식 허용\n'
    + '③ 소항목: 가. 나. 다. 또는 ① ② ③ 으로 구분\n'
    + '④ 각 항목 제목은 【5-1 사업의 필요성 및 시급성】 형식으로 표시\n'
    + '⑤ (확인이 필요합니다) 표시 대신 [담당자 확인 필요: 내용] 형식으로 표시\n'
    + '⑥ 수치는 반드시 출처 명시, 없으면 [출처 확인 필요] 표시';
  quickAsk(msg);
  switchRT('ai');
}

function genAI(r) {
  // 기존 단발성 생성 → AI 탭으로 전환만
  switchRT('ai');
  var nokey = v('ai-nokey-notice');
  if (nokey) nokey.style.display = gKey ? 'none' : 'block';
}

/* ═══════════════════════════════════════════════════
   대화 저장 (파일 내보내기)
════════════════════════════════════════════════════ */
function exportChat() {
  if (gChatHistory.length === 0) { alert('저장할 대화 내용이 없습니다.'); return; }
  var data = {
    exportedAt: new Date().toLocaleString('ko-KR'),
    sysPromptType: gResult ? gResult.auth.type : 'unknown',
    businessName: gResult ? (gResult.name||'미입력') : '',
    chatHistory: gChatHistory
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '투자심사_AI대화_' + (data.businessName||'파주시') + '_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
}

/* ═══════════════════════════════════════════════════
   작업 저장/불러오기 (localStorage)
════════════════════════════════════════════════════ */
var SAVE_KEY = 'paju_invest_saves';

function saveWork() {
  var name = prompt('저장할 작업 이름을 입력하세요:', gResult ? (gResult.name||'파주시 투자심사') : '파주시 투자심사');
  if (!name) return;
  var saves = loadSaves();
  var id = 'save_' + Date.now();
  var inputs = {};
  var ids = ['f_name','f_type','f_cost','f_nat','f_prov','f_stage','f_city',
    'ci_area','ci_unit','ci_zero_energy','ci_land','ci_inflate','ci_design_grade',
    'ci_design_split','ci_design_intent','ci_cm_type','ci_cm_direct','ci_reserve',
    'ci_comp_reward','ci_comp_mgmt','ci_survey','ci_geo','ci_ve','ci_traffic',
    'ci_underground','ci_underground_sm','ci_etc_consult','ci_cert_green',
    'ci_cert_energy','ci_cert_bf','ci_art','ci_safety',
    'pp_urban','pp_plan','pp_property','pp_precheck','pp_competition',
    'pp_basic','pp_detail','pp_review','pp_permit','pp_construct'];
  for (var i=0; i<ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) inputs[ids[i]] = el.value;
  }
  saves[id] = {
    id: id, name: name,
    savedAt: new Date().toLocaleString('ko-KR'),
    inputs: inputs,
    chatHistory: gChatHistory,
    gResult: gResult,
    projectData: collectProjectData()
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
    alert('"' + name + '" 저장 완료!');
    renderSaveList();
  } catch(e) {
    alert('저장 실패: 브라우저 저장공간이 부족합니다.');
  }
}

function loadSaves() {
  try {
    var raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e) { return {}; }
}

function loadWork(id) {
  var saves = loadSaves();
  var save = saves[id];
  if (!save) { alert('저장 데이터를 찾을 수 없습니다.'); return; }
  if (!confirm('"' + save.name + '" 작업을 불러오시겠습니까?\n현재 작업 내용이 덮어씌워집니다.')) return;
  // 입력값 복원
  for (var k in save.inputs) {
    var el = document.getElementById(k);
    if (el) el.value = save.inputs[k];
  }
  // 대화 이력 복원
  gChatHistory = save.chatHistory || [];
  var hist = v('ai-chat-history');
  if (hist) {
    hist.innerHTML = '';
    if (gChatHistory.length === 0) {
      hist.innerHTML = '<div class="ai-msg ai-msg-ai"><div class="ai-msg-bubble">작업을 불러왔습니다. 질문을 입력하세요.</div></div>';
    } else {
      for (var i=0; i<gChatHistory.length; i++) {
        renderChatMsg(gChatHistory[i].role, gChatHistory[i].content, gChatHistory[i].time||'');
      }
    }
  }
  // 판단 결과 복원 후 재렌더링
  if (save.projectData) projectData = save.projectData;
  if (save.gResult) {
    gResult = save.gResult;
    renderResult(gResult);
    renderCheck(gResult);
    v('empty-result').style.display='none'; v('result-box').style.display='block';
    v('empty-check').style.display='none';  v('check-box').style.display='block';
    v('empty-calc').style.display='none';   v('calc-box').style.display='block';
    v('empty-draft').style.display='none';
  v('draft-box').style.display='block';
    renderCalc(gResult);
    renderDraft(gResult);
  }
  calcAll();
  closeSaveModal();
  alert('"' + save.name + '" 불러오기 완료!');
}

function deleteWork(id, name) {
  if (!confirm('"' + name + '" 작업을 삭제하시겠습니까?')) return;
  var saves = loadSaves();
  delete saves[id];
  localStorage.setItem(SAVE_KEY, JSON.stringify(saves));
  renderSaveList();
}

function exportWork() {
  if (!gResult) { alert('저장할 작업이 없습니다. 먼저 판단을 실행하세요.'); return; }
  var name = (gResult.name||'파주시_투자심사');
  var inputs = {};
  var ids = ['f_name','f_type','f_cost','f_nat','f_prov','f_stage',
    'ci_area','ci_unit','ci_zero_energy','ci_land','ci_inflate'];
  for (var i=0; i<ids.length; i++) {
    var el = document.getElementById(ids[i]);
    if (el) inputs[ids[i]] = el.value;
  }
  var data = {version:'2.1-phase1', exportedAt:new Date().toLocaleString('ko-KR'),
    name:name, inputs:inputs, chatHistory:gChatHistory, gResult:gResult,
    projectData: collectProjectData()};
  var blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '투자심사_' + name + '_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
}

function importWork() {
  v('import-file-input').click();
}

function doImport(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    try {
      var data = JSON.parse(ev.target.result);
      if (!confirm('"' + (data.name||'가져온 작업') + '" 파일을 불러오시겠습니까?')) return;
      if (data.inputs) {
        for (var k in data.inputs) {
          var el = document.getElementById(k);
          if (el) el.value = data.inputs[k];
        }
      }
      if (data.chatHistory) {
        gChatHistory = data.chatHistory;
        var hist = v('ai-chat-history');
        if (hist) {
          hist.innerHTML = '';
          for (var i=0; i<gChatHistory.length; i++) {
            renderChatMsg(gChatHistory[i].role, gChatHistory[i].content, gChatHistory[i].time||'');
          }
        }
      }
      if (data.gResult) {
        gResult = data.gResult;
        renderResult(gResult);
        renderCheck(gResult);
        v('empty-result').style.display='none'; v('result-box').style.display='block';
        v('empty-check').style.display='none';  v('check-box').style.display='block';
        v('empty-calc').style.display='none';   v('calc-box').style.display='block';
        v('empty-draft').style.display='none';
  v('draft-box').style.display='block';
        renderCalc(gResult); renderDraft(gResult);
      }
      alert('파일 불러오기 완료!');
    } catch(err) { alert('파일 형식이 올바르지 않습니다: ' + err.message); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

function openSaveModal() {
  renderSaveList();
  v('saveModal').className = 'modal-ov open';
}
function closeSaveModal() {
  v('saveModal').className = 'modal-ov';
}

function renderSaveList() {
  var saves = loadSaves();
  var list = v('save-list');
  if (!list) return;
  var keys = Object.keys(saves);
  if (keys.length === 0) {
    list.innerHTML = '<div class="save-empty">저장된 작업이 없습니다.</div>';
    return;
  }
  keys.sort(function(a,b){ return saves[b].savedAt > saves[a].savedAt ? 1 : -1; });
  var h = '';
  for (var i=0; i<keys.length; i++) {
    var s = saves[keys[i]];
    h += '<div class="save-item" onclick="loadWork(\'' + s.id + '\')">';
    h += '<div class="save-item-info">';
    h += '<div class="save-item-name">&#128196; ' + s.name + '</div>';
    h += '<div class="save-item-meta">저장일시: ' + s.savedAt + ' · 대화: ' + (s.chatHistory?s.chatHistory.length:0) + '건</div>';
    h += '</div>';
    h += '<button class="save-item-del" onclick="event.stopPropagation();deleteWork(\'' + s.id + '\',\'' + s.name + '\')" >삭제</button>';
    h += '</div>';
  }
  h += '<div style="margin-top:10px;text-align:right">';
  h += '<button class="ai-chat-btn ai-chat-btn-sec" onclick="exportWork()" style="font-size:11px">&#128229; 파일로 내보내기</button>';
  h += '</div>';
  list.innerHTML = h;
}


/* updateGeminiModel → updateModelLabel 통합 */


/* ═══════════════════════════════════════════════
   경제성 분석 (B/C · NPV · IRR)
   근거: 행안부 투자심사 및 타당성조사 매뉴얼
         사회적 할인율 4.5% / 분석기간 30년
         서울연구원(2019) 편익 원단위
════════════════════════════════════════════════ */

/* 편익 원단위 (서울연구원 2019 + 행안부 매뉴얼 기준)
   단위: 천원/인/년 */
var BENEFIT_UNIT = {
  office:  180,   /* 행정서비스 이동시간 절감 편익 */
  culture: 250,   /* 체육시설 건강증진 편익 */
  complex: 210,   /* 복합시설 평균 */
  general: 200,   /* 일반시설 */
  promo:   150,
  joint:   200
};

/* 연간 이용인원 추정 원단위 (1일 이용인원 기준)
   단위: 인/일 per 100㎡ */
var USER_UNIT = {
  office:  8,    /* 행정복지센터 */
  culture: 15,   /* 체육관·문화시설 */
  complex: 11,   /* 복합 평균 */
  general: 10,
  promo:   12,
  joint:   10
};

function renderEcon(r) {
  var emptyEl = document.getElementById('econ-empty');
  var boxEl   = document.getElementById('econ-box');
  if (!boxEl) return;
  if (!r) {
    if (emptyEl) emptyEl.style.display = 'block';
    boxEl.style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  boxEl.style.display = 'block';

  var cost      = r.cost || 0;
  var area      = gnv('ci_area') || 0;
  var unit      = gnv('ci_unit') || 0;
  var constCost = (area > 0 && unit > 0) ? (area * unit / 100000) : (cost * 0.65);
  var land      = gnv('ci_land') || 0;
  var tang500   = cost >= 500;
  var construct = gnv('pp_construct') || 24;

  /* 자동 추정값 */
  var USER_UNIT_VAL = {office:8, culture:15, complex:11, general:10, promo:12, joint:10};
  var BEN_UNIT_VAL  = {office:180, culture:250, complex:210, general:200, promo:150, joint:200};
  var autoUsers     = area > 0
    ? Math.round((USER_UNIT_VAL[r.type]||10) * area / 100 * 300)
    : Math.round((USER_UNIT_VAL[r.type]||10) * 1000 / 100 * 300);
  var autoBenUnit   = BEN_UNIT_VAL[r.type] || 200;
  var autoOpCost    = parseFloat((cost * 0.02).toFixed(1));
  var autoMaint     = parseFloat((constCost * 0.01).toFixed(1));
  var autoResidual  = parseFloat((land * 0.8).toFixed(1));
  var autoConstYrs  = Math.max(1, Math.round(construct / 12));

  var h = '';

  /* 타당성 안내 */
  if (tang500) {
    h += '<div class="econ-warn">&#9888; 총사업비 ' + cost + '억원으로 <strong>의무 타당성조사 대상</strong>입니다 (「지방재정법」 제37조의2). 전문기관 타당성조사 완료 후 의뢰하여야 합니다. 아래 계산기는 참고용입니다.</div>';
  } else {
    h += '<div class="draft-tip">&#128204; 총사업비 ' + cost + '억원으로 의무 타당성조사 대상 미해당 (500억 미만). 자체 경제성 분석 결과를 의뢰서 5-5항에 활용하세요. 각 항목을 조정 후 [의뢰서 5-5항 반영] 버튼을 클릭하세요.</div>';
  }

  /* ── 분석 기준 ── */
  h += '<div class="econ-section"><div class="econ-section-title">&#128204; 분석 기준</div>';
  h += '<div class="econ-row"><div class="econ-label">사회적 할인율</div>';
  h += '<div><input type="number" class="econ-input" id="ec_rate" value="4.5" step="0.1" min="1" max="20"></div>';
  h += '<div class="econ-hint">% &#8203;기본값: 4.5% (국가 예비타당성조사 기준, 행안부 매뉴얼)</div></div>';
  h += '<div class="econ-row"><div class="econ-label">분석기간</div>';
  h += '<div><input type="number" class="econ-input" id="ec_years" value="30" min="10" max="50"></div>';
  h += '<div class="econ-hint">년 &#8203;공공건축물 내용연수 기준: 30년</div></div>';
  h += '<div class="econ-row"><div class="econ-label">분석 기준연도</div>';
  h += '<div><input type="number" class="econ-input" id="ec_base_year" value="' + new Date().getFullYear() + '"></div>';
  h += '<div class="econ-hint">년</div></div>';
  h += '<div class="econ-row"><div class="econ-label">공사기간</div>';
  h += '<div><input type="number" class="econ-input" id="ec_const_years" value="' + autoConstYrs + '" min="1" max="10"></div>';
  h += '<div class="econ-hint">년 (비용 투입 기간, 자동추정: ' + autoConstYrs + '년)</div></div>';
  h += '</div>';

  /* ── 비용 항목 ── */
  h += '<div class="econ-section"><div class="econ-section-title">&#128181; 비용 항목 (자동 추정 · 수동 조정 가능)</div>';
  h += '<div class="econ-row"><div class="econ-label">총사업비 (건설비)</div>';
  h += '<div><input type="number" class="econ-input" id="ec_invest" value="' + cost + '"></div>';
  h += '<div class="econ-hint">억원</div></div>';
  h += '<div class="econ-row"><div class="econ-label">연간 운영비</div>';
  h += '<div><input type="number" class="econ-input" id="ec_op_cost" value="' + autoOpCost + '" step="0.1"></div>';
  h += '<div class="econ-hint">억원/년 <span class="econ-auto">자동추정: 총사업비 × 2% = ' + autoOpCost + '억</span></div></div>';
  h += '<div class="econ-row"><div class="econ-label">연간 유지보수비</div>';
  h += '<div><input type="number" class="econ-input" id="ec_maint" value="' + autoMaint + '" step="0.1"></div>';
  h += '<div class="econ-hint">억원/년 <span class="econ-auto">자동추정: 공사비 × 1% = ' + autoMaint + '억</span></div></div>';
  h += '</div>';

  /* ── 편익 항목 ── */
  h += '<div class="econ-section"><div class="econ-section-title">&#127381; 편익 항목 (자동 추정 · 수동 조정 가능)</div>';
  h += '<div class="draft-tip" style="margin-bottom:10px">&#9432; 자동 추정값을 제공합니다. 실제 수요 예측값으로 조정하세요.<br>';
  h += '근거: 서울연구원(2019) 투자심사 경제성 분석 가이드라인</div>';
  h += '<div class="econ-row"><div class="econ-label">연간 이용 인원</div>';
  h += '<div><input type="number" class="econ-input" id="ec_users" value="' + autoUsers + '"></div>';
  h += '<div class="econ-hint">명/년 <span class="econ-auto">자동추정: ' + (USER_UNIT_VAL[r.type]||10) + '인/100㎡/일 × ' + (area||1000).toLocaleString() + '㎡ × 300일 = ' + autoUsers.toLocaleString() + '명</span></div></div>';
  h += '<div class="econ-row"><div class="econ-label">1인당 연간 편익</div>';
  h += '<div><input type="number" class="econ-input" id="ec_benefit_unit" value="' + autoBenUnit + '"></div>';
  h += '<div class="econ-hint">천원/인/년 <span class="econ-auto">자동추정: 서울연구원 원단위 ' + autoBenUnit + '천원</span></div></div>';
  h += '<div class="econ-row"><div class="econ-label">연간 이용 수입</div>';
  h += '<div><input type="number" class="econ-input" id="ec_revenue" value="0" step="0.1"></div>';
  h += '<div class="econ-hint">억원/년 (이용료 수입, 없으면 0)</div></div>';
  h += '<div class="econ-row"><div class="econ-label">잔존가치</div>';
  h += '<div><input type="number" class="econ-input" id="ec_residual" value="' + autoResidual + '" step="0.1"></div>';
  h += '<div class="econ-hint">억원 (분석기간 종료 시 토지 가치, 자동추정: 보상비 × 80% = ' + autoResidual + '억)</div></div>';
  h += '</div>';

  /* ── 계산 버튼 (핵심: 명시적 버튼) ── */
  h += '<div style="text-align:center;margin:16px 0">';
  h += '<button onclick="calcEcon()" style="padding:12px 40px;background:var(--pb);color:#fff;';
  h += 'border:none;border-radius:var(--r);font-size:14px;font-weight:700;cursor:pointer;';
  h += 'width:100%">&#128202; 경제성 분석 실행</button></div>';

  /* ── 결과 영역 ── */
  h += '<div id="econ-result-area"></div>';
  h += '<div class="econ-source">분석 기준: 사회적 할인율 4.5% / 행안부 투자심사 및 타당성조사 매뉴얼 / 서울연구원(2019) 편익 원단위</div>';

  boxEl.innerHTML = h;
  restoreUnitFromType();
  /* DOM 삽입 후 즉시 계산 실행 */
  calcEcon();
}


/* ── 경제성 계산 엔진 ── */
function calcEcon() {
  var rate       = (gnv('ec_rate') || 4.5) / 100;
  var years      = Math.round(gnv('ec_years') || 30);
  var baseYear   = gnv('ec_base_year') || new Date().getFullYear();
  var constYears = Math.max(1, Math.round(gnv('ec_const_years') || 3));
  var invest     = gnv('ec_invest')   || 0;
  var opCost     = gnv('ec_op_cost')  || 0;
  var maint      = gnv('ec_maint')    || 0;
  var users      = gnv('ec_users')    || 0;
  var unitBen    = gnv('ec_benefit_unit') || 0;
  var revenue    = gnv('ec_revenue')  || 0;
  var residual   = gnv('ec_residual') || 0;

  /* 연간 총편익·비용 */
  var annualBenefit = users * unitBen / 100000 + revenue; /* 억원 */
  var annualCost    = opCost + maint;

  /* 연도별 현금흐름 */
  var pvBenefit = 0, pvCost = 0;
  var cashFlows = [];

  for (var t = 1; t <= years + constYears; t++) {
    var disc = Math.pow(1 + rate, t);
    if (t <= constYears) {
      /* 건설기간: 비용만 발생 (균등 배분) */
      var annualInvest = invest / constYears;
      pvCost += annualInvest / disc;
      cashFlows.push({year: baseYear + t - 1, benefit: 0, cost: annualInvest, net: -annualInvest, disc: disc});
    } else {
      /* 운영기간: 편익·운영비 발생 */
      var opT = t - constYears;
      var ben  = annualBenefit;
      var cost_t = annualCost;
      /* 마지막 연도: 잔존가치 추가 */
      if (opT === years) ben += residual;
      pvBenefit += ben / disc;
      pvCost    += cost_t / disc;
      cashFlows.push({year: baseYear + t - 1, benefit: ben, cost: cost_t, net: ben - cost_t, disc: disc});
    }
  }

  var npv = pvBenefit - pvCost;
  var bc  = pvCost > 0 ? pvBenefit / pvCost : 0;

  /* IRR: 이분법 */
  var irr = calcIRR(invest, constYears, years, annualBenefit, annualCost, residual);

  /* 결과 출력 */
  var bcOk  = bc >= 1.0;
  var npvOk = npv >= 0;
  var irrOk = irr >= 4.5;

  var h = '<div class="econ-result-box">';
  h += '<div class="econ-result-title">&#128202; 경제성 분석 결과</div>';

  /* KPI 카드 */
  h += '<div class="econ-kpi-row">';
  h += '<div class="econ-kpi"><div class="econ-kpi-label">비용편익비 (B/C)</div>';
  h += '<div class="econ-kpi-val ' + (bcOk?'ok':'ng') + '">' + bc.toFixed(2) + '</div>';
  h += '<div class="econ-kpi-sub">' + (bcOk?'✅ 경제성 확보 (≥1.0)':'⚠ 경제성 미확보 (<1.0)') + '</div></div>';

  h += '<div class="econ-kpi"><div class="econ-kpi-label">순현재가치 (NPV)</div>';
  h += '<div class="econ-kpi-val ' + (npvOk?'ok':'ng') + '">' + (npv>=0?'+':'') + Math.round(npv) + '억</div>';
  h += '<div class="econ-kpi-sub">' + (npvOk?'✅ 양(+)의 NPV':'⚠ 음(-)의 NPV') + '</div></div>';

  h += '<div class="econ-kpi"><div class="econ-kpi-label">내부수익률 (IRR)</div>';
  h += '<div class="econ-kpi-val ' + (irrOk?'ok':'ng') + '">' + (irr!==null?irr.toFixed(1)+'%':'산출불가') + '</div>';
  h += '<div class="econ-kpi-sub">' + (irrOk?'✅ 할인율 초과 (>4.5%)':'⚠ 할인율 미만') + '</div></div>';
  h += '</div>';

  /* 분석 요약 */
  h += '<table class="econ-table">';
  h += '<tr><th>구분</th><th>편익 현재가 (억)</th><th>비용 현재가 (억)</th><th>판정</th></tr>';
  h += '<tr><td>건설기간 (' + constYears + '년)</td><td>0</td><td>' + Math.round(pvCost - (pvCost * years/(years+constYears))) + '</td><td>-</td></tr>';
  h += '<tr><td>운영기간 (' + years + '년)</td><td>' + Math.round(pvBenefit) + '</td><td>' + Math.round(pvCost * years/(years+constYears)) + '</td><td>' + (npvOk?'✅':'⚠') + '</td></tr>';
  h += '<tr><td>합계</td><td>' + Math.round(pvBenefit) + '</td><td>' + Math.round(pvCost) + '</td><td>B/C=' + bc.toFixed(2) + '</td></tr>';
  h += '</table>';

  /* 연도별 현금흐름 (5년 단위 요약) */
  h += '<div style="margin-top:10px;font-size:11px;font-weight:700;color:var(--pb)">연도별 현금흐름 요약 (5년 단위)</div>';
  h += '<table class="econ-table">';
  h += '<tr><th>연도</th><th>편익(억)</th><th>비용(억)</th><th>순편익(억)</th><th>할인계수</th></tr>';
  var shown = [0, 4, 9, 14, 19, 24, 29, cashFlows.length-1];
  for (var si = 0; si < shown.length; si++) {
    var idx = shown[si];
    if (idx >= cashFlows.length) continue;
    var cf = cashFlows[idx];
    h += '<tr><td>' + cf.year + '년 (' + (idx+1) + '년차)</td>';
    h += '<td>' + cf.benefit.toFixed(1) + '</td>';
    h += '<td>' + cf.cost.toFixed(1) + '</td>';
    h += '<td>' + cf.net.toFixed(1) + '</td>';
    h += '<td>' + (1/cf.disc).toFixed(4) + '</td></tr>';
  }
  h += '</table>';

  /* B/C 1.0 미만 시 정책적 타당성 안내 */
  if (!bcOk) {
    h += '<div class="econ-warn" style="margin-top:10px">&#9888; B/C가 1.0 미만입니다. 중앙투자심사 시 경제적 타당성 미확보로 부결될 수 있습니다.<br>편익 원단위·이용인원을 재검토하거나 <strong>5-5항에 정책적 타당성</strong> (형평성·지역균형발전 등)으로 보완하세요.</div>';
  }

  /* 5-5항 반영 버튼 */
  h += '<button class="econ-apply-btn" onclick="applyEconToDraft(' + bc.toFixed(2) + ',' + Math.round(npv) + ',' + (irr!==null?irr.toFixed(1):0) + ')">&#8593; 분석 결과를 의뢰서 5-5항에 반영</button>';
  h += '</div>';

  gEconResult={bc:bc, npv:Math.round(npv), irr:(irr!==null?irr:0)};  /* 전역 저장 */
  var el = v('econ-result-area');
  if (el) el.innerHTML = h;
}

/* IRR 이분법 계산 */
function calcIRR(invest, constYrs, opYrs, annualBen, annualCost, residual) {
  function npvAtRate(r) {
    var pv = 0;
    for (var t = 1; t <= constYrs + opYrs; t++) {
      var disc = Math.pow(1 + r, t);
      if (t <= constYrs) {
        pv -= (invest / constYrs) / disc;
      } else {
        var opT = t - constYrs;
        var ben = annualBen + (opT === opYrs ? residual : 0);
        pv += (ben - annualCost) / disc;
      }
    }
    return pv;
  }
  var lo = -0.5, hi = 5.0;
  if (npvAtRate(lo) * npvAtRate(hi) > 0) return null;
  for (var i = 0; i < 100; i++) {
    var mid = (lo + hi) / 2;
    if (Math.abs(hi - lo) < 0.00001) return mid * 100;
    if (npvAtRate(mid) * npvAtRate(lo) < 0) hi = mid;
    else lo = mid;
  }
  return ((lo + hi) / 2) * 100;
}

/* 의뢰서 5-5항 자동 반영 */
function applyEconToDraft(bc,npv,irr){
  var draftBox=v('draft-box');
  if(!draftBox||!draftBox.innerHTML.trim()){
    if(gResult){renderDraft(gResult);}
    else{alert('판단 먼저 실행');return;}
  }
  var rate=gnv('ec_rate')||4.5;
  var years=gnv('ec_years')||30;
  var baseY=gnv('ec_base_year')||new Date().getFullYear();
  var invest=gnv('ec_invest')||0;
  var tang=invest>=500; var bcOk=bc>=1.0;
  var L=[];
  if(tang){
    L.push('가. 의무 타당성조사 대상 (500억 이상)');
    L.push('   (「지방재정법」 제37조의2 제1항)');
    L.push('   [담당자 입력 필요: 전문기관 타당성조사 결과]');L.push('');
  }else{
    L.push('가. 의무 타당성조사 미해당 (500억 미만)');
    L.push('   (「지방재정법」 제37조의2 제1항)');L.push('');
  }
  L.push('나. 자체 경제성 분석 결과');
  L.push('   리율 '+rate+'% / '+years+'년 / '+baseY+'년 / '+invest+'억원');L.push('');
  L.push('   ◦ B/C: '+bc+' ('+(bcOk?'경제성 확보':'미확보')+')');
  L.push('   ◦ NPV: '+(npv>=0?'+':'')+npv+'억원');
  L.push('   ◦ IRR: '+irr+'%');L.push('');
  if(!bcOk){
    L.push('다. 정책적 타당성');
    L.push('   ◦ 지역형평성 / 생활SOC / 주민복지');L.push('');
  }
  L.push((bcOk?'다':'라')+'. 적정 사업비 검토');
  L.push('   ◦ [담당자: 유사시설 단가 비교 결과 입력]');
  var el=getSecEl('5-5');
  if(el){
    el.textContent=L.join('\n');
    el.style.background='#f0fdf4';el.style.borderLeft='3px solid var(--ok)';el.style.paddingLeft='10px';
    setTimeout(function(){el.style.background='';el.style.borderLeft='';el.style.paddingLeft='';},3000);
    switchRT('draft');
    var s55=document.getElementById('sec-5_5');
    if(s55) s55.scrollIntoView({behavior:'smooth',block:'center'});
    alert('5-5항에 반영되었습니다.');
  }else{ alert('의뢰서 탭에서 판단을 먼저 실행하세요.'); }
}
function scrollToSec(id) {
  var el = document.getElementById(id);
  var scrollEl = document.getElementById('draft-scroll') ||
    document.querySelector('#rt-draft > div:last-child') ||
    document.querySelector('#rt-draft [style*="overflow-y"]');
  if (el && scrollEl) {
    scrollEl.scrollTo({ top: el.offsetTop - 10, behavior: 'smooth' });
  }
}



/* ── 의뢰서 2장(사업비 산출내역) 데이터 빌더 — 산출방식(약식/세부) 연동 ── */
function buildCh2Data(r){
  var cost=(r&&r.cost)||0;
  var mode=(typeof getCalcMode==='function')?getCalcMode():'simple';
  var cd=(typeof projectData!=='undefined'&&projectData&&projectData.cost)?projectData.cost:null;
  var gt=(cd&&cd.groupTotals)||{};
  var items=(cd&&cd.items)||[];
  var area=gnv('ci_area')||((cd&&cd.area)||0);
  var unit=gnv('ci_unit')||((cd&&cd.unitCost)||0);
  var constCost=(area>0&&unit>0)?area*unit/100000:0;
  var zeb=gc('ci_zero_energy')&&area>=500;
  function pick(prefixes){
    var out=[];
    items.forEach(function(it){
      for(var i=0;i<prefixes.length;i++){
        if(it.id.indexOf(prefixes[i])===0&&it.amount>0){
          out.push('· '+it.label+': '+(it.basis||'[담당자 입력 필요: 산출근거]')+' — '+it.amount.toFixed(1)+'억');
          break;
        }
      }
    });
    return out;
  }
  var amtC=gt.construction||0, amtL=gt.land||0;
  var amtS=(gt.design||0)+(gt.supervision||0)+(gt.facility||0);
  var amtE=gt.equipment||0;
  var rsv=cd?(cd.reserveFee||0):0;
  var total=(cd&&cd.calculatedTotal>0)?cd.calculatedTotal:cost;
  var rows=[];
  if(mode==='detail'&&cd){
    rows.push({g:'공사비',d:pick(['c37_const']).join('\n')||'[담당자 입력 필요: 공사비 세부 산출내역]',a:amtC,n:'토목·건축·조경 등 구분 기재'});
    rows.push({g:'보상비',d:pick(['c37_land']).join('\n')||'해당 없음 또는 [담당자 입력 필요: 부지매입·지장물 보상 산출근거]',a:amtL,n:'공시지가·감정평가 근거'});
    rows.push({g:'시설부대경비',d:pick(['c37_design','c37_cm','c37_facility']).join('\n')||'[담당자 입력 필요: 설계·감리·조사측량비 등]',a:amtS,n:'대가기준·요율 근거'});
    rows.push({g:'운영설비비',d:pick(['c37_equip']).join('\n')||'해당 없음 또는 [담당자 입력 필요: 장비·집기 산출내역]',a:amtE,n:'품목별 견적'});
  } else {
    var dC='서울시 공공건축물 건립 공사비 책정 가이드라인(2024) 단가 적용';
    if(area>0&&unit>0){ dC+='\n- (건축공사비) '+unit.toLocaleString()+'천원/㎡ × '+area.toLocaleString()+'㎡ = '+constCost.toFixed(1)+'억원'; }
    else { dC+='\n- [담당자 입력 필요: 연면적·단가 — 기본정보 탭에서 입력]'; }
    if(zeb) dC+='\n- (제로에너지건축 가산) 건축공사비 × 5% = '+(constCost*0.05).toFixed(1)+'억원';
    dC+='\n- 토목·기계·전기·통신·소방·조경 등 분야별 구분은 실시설계 후 보완';
    rows.push({g:'공사비',d:dC,a:amtC>0?amtC:constCost*(zeb?1.05:1),n:'약식 산출(가이드라인 단가)'});
    rows.push({g:'보상비',d:amtL>0?'부지 매입비 등\n- [담당자 입력 필요: 공시지가·감정평가 등 단가 산정근거]':'해당 없음(시유지 활용 등) 또는 [담당자 입력 필요: 보상비 산출근거]',a:amtL,n:''});
    rows.push({g:'시설부대경비',d:'설계비(공사비 요율 체감)·감리/CM(요율)·조사측량비(공사비 1%) 등\n- 엔지니어링사업대가 기준(별표1)·공공발주사업 건축사 대가기준 적용',a:amtS,n:'요율 자동산출'});
    rows.push({g:'운영설비비',d:amtE>0?pick(['c37_equip']).join('\n'):'[담당자 입력 필요: 집기비품·전산장비 등 운영설비]',a:amtE,n:''});
  }
  rows.push({g:'예비비',d:'(공사비+보상비+시설부대경비+운영설비비+제세공과금) × 10%'+(rsv<=0?'\n- 미계상 시 사유 부기(실시설계 완료, 연례반복 행사 등)':''),a:rsv,n:'운영기준 총사업비 산정 기준'});
  rows.push({g:'기타',d:'지방비 편성이 수반되지 않으나 총사업비에 포함하는 항목(보유 공유재산 가액 등) — 해당 시 작성',a:0,n:'예산 외 의무부담액(우발채무) 미포함'});
  var notes=['총사업비 항목별 산정기준은 투자심사 의뢰 직전년도 말(또는 그 이후) 기준, 불변가격(물가상승분 미반영)으로 작성',
    '단가 산정근거를 구체적으로 기재(공시지가, 지자체 예산편성지침 참고자료, 유사시설 공사단가 등)',
    '공사비·보상비 등은 세부사업별로 자세히 작성하고, 공사비는 토목/건축/조경 등 구분하여 기재',
    '소계는 소수점, 총계는 정수로 작성'];
  if(r&&r.type==='event') notes.push('행사성 사업은 직전행사 정산보고서를 근거로 비고란에 전년도 사업비 기재');
  return {mode:mode,hasCalc:!!cd,rows:rows,total:total,notes:notes};
}

/* ── 의뢰서 3장(세부추진계획·일정) 데이터 빌더 — 12단계 계산기 연동 ── */
function buildCh3Data(r){
  var cost=(r&&r.cost)||0;
  var catMap={pp_basic_plan:'계획수립',pp_midterm:'행정절차',pp_property:'행정절차',
    pp_feasibility:'타당성조사',pp_review:'투자심사',pp_design_comp:'설계',pp_design:'설계',
    pp_consult:'협의·영향평가',pp_permit:'사업승인',pp_bid:'계약',pp_construct:'공사',pp_closeout:'준공'};
  var dtl={pp_basic_plan:'사업 필요성 분석, 기본구상, 적정 규모·사업비 산출',
    pp_midterm:'중기지방재정계획 반영(의회 제출)',
    pp_property:'공유재산관리계획 수립·의회 의결',
    pp_feasibility:'전문기관 타당성조사(한국지방행정연구원 등)',
    pp_review:'투자심사 의뢰 및 심사 — 사업 적정성 판단',
    pp_design_comp:'설계공모 공고·심사·설계계약',
    pp_design:'기본·실시설계 입찰, 업체 선정, 설계 완료',
    pp_consult:'BF·녹색건축·에너지효율 인증, 교통·환경 등 관계기관 협의',
    pp_permit:'건축허가 등 인허가',
    pp_bid:'공사 입찰 및 계약',
    pp_construct:'착공~준공(기초·골조·마감·설비)',
    pp_closeout:'준공검사, 이전·개관 준비'};
  var rows=[],cum=0;
  if(typeof PERIOD12_ITEMS!=='undefined'){
    PERIOD12_ITEMS.forEach(function(pi){
      var el=(typeof v==='function')?v(pi[0]):null;
      var m=(el&&el.value!=='')?(parseFloat(el.value)||0):pi[2];
      if(pi[0]==='pp_feasibility'&&cost<500&&(!el||el.value==='')) m=0;
      if(m<=0) return;
      rows.push({cat:catMap[pi[0]]||'',label:pi[1],
        basis:(el?(gv(pi[0]+'_basis')||pi[3]):pi[3]),
        period:'착수 후 '+(cum+1)+'~'+(cum+m)+'개월 ('+m+'개월)',
        detail:dtl[pi[0]]||'',
        dept:(el?(gv(pi[0]+'_dept')||pi[4]):pi[4])});
      cum+=m;
    });
  }
  return {rows:rows,total:cum};
}

function renderDraft(r) {
  var typeMap={general:'일반투자사업',office:'청사 신축사업',
    culture:'문화·체육시설 신축사업',complex:'복합시설(청사+문화체육)',
    promo:'홍보관 사업',event:'행사성 사업',debt:'채무부담행위',joint:'공동협력사업'};
  var now=new Date();
  var today=now.getFullYear()+'년 '+(now.getMonth()+1)+'월 '+now.getDate()+'일';
  var name=esc(gv('f_name')||'(사업명 미입력)');
  var typeTxt=typeMap[r.type]||r.type;
  var cost=r.cost||0, nat=r.nat||0, prov=r.prov||0;
  var city=Math.max(0,cost-nat-prov);
  var natPct=cost>0?Math.round(nat/cost*100):0;
  var provPct=cost>0?Math.round(prov/cost*100):0;
  var cityPct=cost>0?Math.round(city/cost*100):0;
  var stageMap={plan:'사업계획 수립',basic:'기본설계 중',basic_done:'기본설계 완료',
    detail:'실시설계 중',detail_done:'실시설계 완료'};
  var stageTxt=stageMap[gv('f_stage')]||'사업계획 수립';
  var authLabel={self:'파주시 자체심사',gyeonggi:'경기도 의뢰심사',
    central:'행정안전부 의뢰심사'}[r.auth.type]||r.auth.label;
  var isCentral=r.auth.type==='central';
  var isGyeonggi=r.auth.type==='gyeonggi';
  var tang500=cost>=500;
  var isNoConst=r.type==='event'||r.type==='debt';
  var isReview=r.reviewType==='re'||r.reviewType==='re2';
  var isOffice=r.type==='office'||r.type==='complex';
  var isCulture=r.type==='culture'||r.type==='complex';

  var area=gnv('ci_area')||0, unit=gnv('ci_unit')||0;
  var constCost=(area>0&&unit>0)?parseFloat((area*unit/100000).toFixed(1)):0;
  var areaStr=area>0?area.toLocaleString()+'㎡':'[담당자 입력 필요]';
  var unitStr=unit>0?unit.toLocaleString()+'천원/㎡':'[담당자 입력 필요]';
  var construct=gnv('pp_construct')||0;
  var periodEl=document.getElementById('period-result-area');
  var adjusted=0;
  if(periodEl){var m2=(periodEl.innerText||'').match(/총 사업기간.*?(\d+)개월/);if(m2)adjusted=parseInt(m2[1]);}
  var periodStr=adjusted>0?adjusted+'개월 ('+Math.floor(adjusted/12)+'년 '+(adjusted%12)+'개월)':'[사업기간 계산기 결과 입력 필요]';

  /* 경제성 분석 결과 */
  var bcVal='-',npvVal='-',irrVal='-';
  var econEl=document.getElementById('econ-result-area');
  if(econEl){
    var et=econEl.innerText||'';
    var bm=et.match(/B\/C[^:\n]*?:\s*([\d.]+)/);
    var nm=et.match(/NPV[^:\n]*?:\s*([+-]?\d+)/);
    var im=et.match(/IRR[^:\n]*?:\s*([\d.]+)/);
    if(bm)bcVal=bm[1]; if(nm)npvVal=nm[1]+'억원'; if(im)irrVal=im[1]+'%';
  }

  function need(t){return '<span class="need">'+t+'</span>';}
  function sec(num, title, content, noAI){
    var id='sec-'+num.replace(/-/g,'_');
    var safeNum=num.replace(/\./g,'').replace(/-/g,'_');
    var h='<div class="draft-section" id="'+id+'">';
    h+='<div class="draft-section-header">';
    h+='<span class="draft-section-num">'+num+'</span>';
    h+='<span class="draft-section-title">'+title+'</span>';
    h+='<button class="draft-edit-btn" data-edit-id="'+id+'_content" title="직접 편집">✏ 편집</button>';
    h+=noAI?'':'<button class="draft-ai-section-btn" data-ai-num="'+safeNum+'" data-ai-title="'+title+'" title="AI로 이 항목만 작성">&#129302; AI</button>';
    h+='</div>';
    h+='<div class="draft-content" id="'+id+'_content">'+content+'</div>';
    h+='</div>';
    return h;
  }
  function chapterTitle(txt,anchor){
    return '<div class="draft-chapter-anchor" id="'+anchor+'"></div>'
      +'<div class="draft-chapter-title">'+txt+'</div>';
  }

  /* ── 좌측 네비게이션 ── */
  var nav='<div class="draft-nav">';
  nav+='<div class="draft-nav-sep">의뢰서</div>';
  nav+='<div class="draft-nav-item" onclick="scrollToSec(\'cover\')">📋 표지·현황</div>';
  nav+='<div class="draft-nav-sep">1장 사업개요</div>';
  ['1-1 추진목적','1-2 시행근거','1-3 시행주체','1-4 사업위치',
   '1-5 사업기간','1-6 사업량','1-7 총사업비','1-8 추진절차','1-9 기대효과'
  ].forEach(function(s){
    var id=s.split(' ')[0].replace(/-/g,'_');
    nav+='<div class="draft-nav-item" onclick="scrollToSec(\'sec-'+id+'\')">'+s+'</div>';
  });
  nav+='<div class="draft-nav-sep">2장 사업비 산출</div>';
  nav+='<div class="draft-nav-item" onclick="scrollToSec(\'sec-2_1\')">2-1 총사업비 산출내역</div>';
  nav+='<div class="draft-nav-sep">3장 추진계획</div>';
  nav+='<div class="draft-nav-item" onclick="scrollToSec(\'sec-3_1\')">3-1 세부추진계획·일정</div>';
  nav+='<div class="draft-nav-sep">4장 사전절차</div>';
  ['4-1 중기재정계획','4-2 재정영향평가','4-3 관계기관협의','4-4 타당성조사'
  ].forEach(function(s){
    var id=s.split(' ')[0].replace(/-/g,'_');
    nav+='<div class="draft-nav-item" onclick="scrollToSec(\'sec-'+id+'\')">'+s+'</div>';
  });
  nav+='<div class="draft-nav-sep">5장 심사자료</div>';
  ['5-1 필요성','5-2 국가계획','5-3 수혜도','5-4 파급효과',
   '5-5 경제성','5-6 재원조달','5-7 준비상황','5-8 문제점','5-9 기타'
  ].forEach(function(s){
    var id=s.split(' ')[0].replace(/-/g,'_');
    nav+='<div class="draft-nav-item" onclick="scrollToSec(\'sec-'+id+'\')">'+s+'</div>';
  });
  nav+='<div class="draft-nav-sep">6장 운영계획</div>';
  ['6-1 기구 및 조직','6-2 수지전망','6-3 세부시설 운영계획'
  ].forEach(function(s){
    var id=s.split(' ')[0].replace(/-/g,'_');
    nav+='<div class="draft-nav-item" onclick="scrollToSec(\'sec-'+id+'\')">'+s+'</div>';
  });
  nav+='<div class="draft-nav-sep">7장 유형별 추가자료</div>';
  if(r.type==='office'||r.type==='complex'||r.type==='culture'){
    nav+='<div class="draft-nav-item" onclick="scrollToSec(\'sec-7_2\')">7-2 유형별 추가자료</div>';
  }
  nav+='</div>';

  /* ── 표지 ── */
  var laws=getLaws(r.type);
  var pg='<div class="draft-page">';
  pg+='<div class="draft-chapter-anchor" id="cover"></div>';
  pg+='<div class="draft-cover">';
  pg+='<div class="draft-doc-title">지방재정 투자심사 의뢰서</div>';
  pg+='<div class="draft-doc-biz">'+name+'</div>';
  pg+='<table class="draft-meta-table">';
  pg+='<tr><th>심사기관</th><td>'+authLabel+'</td>'
    +'<th>총사업비</th><td>'+cost+'억원</td>'
    +'<th>심사구분</th><td>'+(isReview?'재심사':'신규')+'</td></tr>';
  pg+='<tr><th>국비</th><td>'+nat+'억('+natPct+'%)</td>'
    +'<th>도비</th><td>'+prov+'억('+provPct+'%)</td>'
    +'<th>시비</th><td>'+city+'억('+cityPct+'%)</td></tr>';
  pg+='<tr><th>법령근거</th><td colspan="5">'+r.auth.law+'</td></tr>';
  pg+='<tr><th>사업단계</th><td>'+stageTxt+'</td>'
    +'<th>타당성조사</th><td>'+(tang500?'의무 대상':'해당 없음(500억 미만)')+'</td>'
    +'<th>사업유형</th><td>'+typeTxt+'</td></tr>';
  pg+='</table>';
  /* 기본현황표 */
  pg+='<table class="draft-basic-table">';
  pg+='<tr><th>전체인구</th><th>수혜주민</th><th>고용효과(직접)</th><th>고용효과(간접)</th><th>운영주체</th></tr>';
  pg+='<tr><td>530천명</td>'
    +'<td class="red">'+need('[담당자]')+'명</td>'
    +'<td class="red">'+need('[담당자]')+'명</td>'
    +'<td class="red">'+need('[담당자]')+'명</td>'
    +'<td class="red">'+need('[담당자]')+'</td></tr>';
  pg+='</table>';
  pg+='</div>';

  /* ── 1장 사업개요 ── */
  pg+=chapterTitle('1. 사업개요','ch1');

  pg+=sec('1-1','추진목적',
    '파주시 인구 530,000명 증가에 따른 '+typeTxt+' 수요 증가\n'
    +need('[담당자 입력 필요: 현재 시설 현황·부재·노후화 등 구체적 문제점]')+'\n\n'
    +'「지방자치법」 제13조 제2항에 따른 주민 복지 증진 및 생활 편의 향상\n'
    +need('[담당자 입력 필요: 관련 법령 및 상위 계획 근거]'));

  pg+=sec('1-2','시행근거',laws.map(function(l){return '◦ '+l;}).join('\n'));
  pg+=sec('1-3','시행주체','◦ 파주시');
  pg+=sec('1-4','사업위치','◦ 파주시 '+need('[읍면동 지번]')+' 일원');

  var s15='';
  if(!isNoConst){
    s15+='◦ 건설기간: '+need('[착공 연월]')+' ~ '+need('[준공 연월]');
    if(construct>0) s15+=' (공사기간 약 '+construct+'개월)';
    s15+='\n◦ 총 사업기간: '+periodStr+'\n';
  }
  s15+='◦ 운영기간: 준공 후 운영';
  pg+=sec('1-5','사업기간',s15);

  var s16='';
  if(!isNoConst){
    s16='◦ 부지면적: '+need('[담당자 입력 필요]')+'\n'
      +'◦ 연  면  적: '+areaStr+' (지상 __층, 지하 __층)\n\n'
      +'<table class="draft-cost-table">'
      +'<tr><th>층별</th><th>주요시설</th></tr>'
      +'<tr><td>지상 ○층</td><td>'+need('[담당자 입력]')+'</td></tr>'
      +'<tr><td>지하 1층</td><td>주차장</td></tr>'
      +'</table>\n◦ 주차장: ___면(법정 ___면)';
  } else { s16=need('[담당자 입력 필요: 사업 규모 및 내용]'); }
  pg+=sec('1-6','사업량',s16);

  var s17='◦ 총사업비: '+cost+'억원\n\n'
    +'<table class="draft-cost-table">'
    +'<tr><th>구분</th><th>합계</th><th>국비</th><th>도비</th><th>시비</th></tr>'
    +'<tr><td>사업비(억원)</td><td>'+cost+'</td><td>'+nat+'</td><td>'+prov+'</td><td>'+city+'</td></tr>'
    +'</table>\n';
  if(nat>0) s17+='◦ 국비('+natPct+'%): '+need('[보조(정액)/기금 구분]')+'\n';
  if(prov>0) s17+='◦ 도비('+provPct+'%): '+need('[보조율 및 회계 구분]')+'\n';
  s17+='◦ 시비('+cityPct+'%): 자체(정액) / 일반회계';
  pg+=sec('1-7','총사업비',s17);

  var s18='◦ '+need('[기본계획 수립 연월]')+'\n'
    +'◦ '+need('[공유재산관리계획 수립 연월]')+'\n'
    +'◦ '+need('[중기지방재정계획 반영 연도]')+'\n'
    +'◦ '+now.getFullYear()+'년 '+(now.getMonth()+1)+'월: 투자심사 의뢰 ('+authLabel+')\n';
  if(isCentral||isGyeonggi) s18+='◦ '+need('[국비·도비 확보 일정]')+'\n';
  if(!isNoConst) s18+='◦ '+need('[공사 착공 연월]')+'\n◦ '+need('[공사 준공 연월]')+'\n';
  pg+=sec('1-8','사업추진절차 및 계획',s18);

  pg+=sec('1-9','기대효과',
    '◦ '+name+' 건립으로 지역 주민 생활편의 향상 및 복지 증진\n\n'
    +'◦ 파주시 '+typeTxt+' 인프라 확충으로 주민 삶의 질 개선 및 정주 여건 강화\n\n'
    +'◦ 고용 창출 효과\n'
    +(isNoConst?'':'  - 건설 단계: '+need('[담당자]')+'명\n')
    +'  - 운영 단계: '+need('[담당자]')+'명\n\n'
    +'◦ '+need('[담당자 입력 필요: 사업 특성에 맞는 구체적 기대효과]'));


  /* ── 2장 사업비 산출내역 (산출방식 연동 자동 작성) ── */
  var d2=buildCh2Data(r);
  function fmtCell(t){
    return String(t||'').split('\n').map(function(l){
      return l.replace(/\[담당자[^\]]*\]/g,function(mm){return '<span class="need">'+mm+'</span>';});
    }).join('<br>');
  }
  var c2='<div style="font-size:11px;color:var(--g600);margin-bottom:6px">◦ 작성 기준: '
    +(d2.mode==='simple'
      ?'<strong>약식 산출</strong> — 서울시 공공건축물 건립 공사비 책정 가이드라인(2024) 단가 × 연면적 (사업비·기간 탭 자동 산출 연동)'
      :'<strong>세부 산출</strong> — 37항목 산출내역 직접 입력값 연동')
    +'</div>';
  if(!d2.hasCalc) c2+='<div style="font-size:11px;margin-bottom:6px">'+need('[사업비·기간 탭에서 산출을 실행하면 아래 금액이 자동 반영됩니다]')+'</div>';
  c2+='<table class="econ-table" style="width:100%"><tr><th style="width:13%">구 분</th><th>세부 산출내역</th><th style="width:11%">금액(억원)</th><th style="width:17%">비 고</th></tr>';
  c2+='<tr style="font-weight:700;background:var(--pbp)"><td>총 계</td><td style="text-align:left">'
    +(d2.mode==='simple'?'약식 산출 합계 (실시설계 후 세부 산출로 보완)':'37항목 세부 산출내역 합계')
    +'</td><td>'+Math.round(d2.total)+'</td><td>직전년도 말 기준 불변가격</td></tr>';
  d2.rows.forEach(function(rw){
    c2+='<tr><td style="font-weight:600">'+rw.g+'</td><td style="text-align:left">'+fmtCell(rw.d)+'</td><td>'+(rw.a>0?rw.a.toFixed(1):'-')+'</td><td style="font-size:10px">'+(rw.n||'')+'</td></tr>';
  });
  c2+='</table>';
  d2.notes.forEach(function(n){ c2+='<div style="font-size:10px;color:var(--g500);margin-top:3px">※ '+n+'</div>'; });
  pg+=chapterTitle('2. 사업비 산출내역','ch2');
  pg+=sec('2-1','총사업비 산출내역',c2,true);

  /* ── 3장 세부사업 추진계획 및 일정 (12단계 계산기 연동) ── */
  var d3=buildCh3Data(r);
  var c3='';
  if(d3.rows.length===0){
    c3+='<div style="font-size:11px;margin-bottom:6px">'+need('[사업비·기간 탭의 12단계 사업기간 계산기에서 단계별 기간을 입력하면 자동 작성됩니다]')+'</div>';
  } else {
    c3+='<table class="econ-table" style="width:100%"><tr><th style="width:10%">구분</th><th style="width:15%">사업내용</th><th style="width:18%">법적근거</th><th style="width:19%">추진기간</th><th>세부추진내용</th><th style="width:10%">승인기관</th></tr>';
    d3.rows.forEach(function(rw){
      c3+='<tr><td style="font-size:10px">'+rw.cat+'</td><td style="font-weight:600;font-size:10.5px">'+rw.label+'</td><td style="font-size:10px">'+rw.basis+'</td><td style="font-size:10px">'+rw.period+'</td><td style="text-align:left;font-size:10.5px">'+rw.detail+'</td><td style="font-size:10px">'+rw.dept+'</td></tr>';
    });
    c3+='<tr style="font-weight:700;background:var(--pbp)"><td colspan="3">계</td><td colspan="3" style="text-align:left">총 사업기간 '+d3.total+'개월 ('+Math.floor(d3.total/12)+'년 '+(d3.total%12)+'개월)</td></tr>';
    c3+='</table>';
  }
  c3+='<div style="font-size:10px;color:var(--g500);margin-top:3px">※ 사업추진상 구분은 계획 입안, 협의(법적), 사전영향평가(환경·교통·재해 등), 사업승인, 보상, 설계(기본·실시), 공사 등으로 단계적·추진순서대로 빠짐없이 기재</div>';
  c3+='<div style="font-size:10px;color:var(--g500);margin-top:2px">※ 사업비·기간 탭의 12단계 계산기와 연동 — 기간 수정 후 초안 탭을 다시 열면 갱신됩니다. 착수 시점이 확정되면 「착수 후 N개월」을 실제 연월로 치환하세요'+(gnv('ci_land')>0?' / 보상 절차가 있는 경우 단계를 추가 기재':'')+'</div>';
  pg+=chapterTitle('3. 세부사업 추진계획 및 일정','ch3');
  pg+=sec('3-1','단계별 추진계획 및 일정',c3,true);

  /* ── 4장 사전절차 ── */
  pg+=chapterTitle('4. 사전절차','ch4');

  /* 4-1 중기지방재정계획 */
  var midYear=new Date().getFullYear();
  var s41='가. 중기지방재정계획 반영 현황\n'
    +'\n'
    +'<table class="draft-simple-table">\n'
    +'<tr><th>구분</th><th>사업명</th><th>계(억원)</th>'
    +'<th>'+midYear+'</th><th>'+(midYear+1)+'</th>'
    +'<th>'+(midYear+2)+'</th><th>'+(midYear+3)+'</th>'
    +'<th>'+(midYear+4)+'이후</th></tr>\n'
    +'<tr><td>합계</td><td>'+name+'</td>'
    +'<td>'+cost+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td></tr>\n'
    +'<tr><td>국비</td><td></td>'
    +'<td>'+nat+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td></tr>\n'
    +'<tr><td>도비</td><td></td>'
    +'<td>'+prov+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td></tr>\n'
    +'<tr><td>시비</td><td></td>'
    +'<td>'+city+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td></tr>\n'
    +'</table>\n\n'
    +'나. 반영 근거\n'
    +'  ◦ 반영 회의: '+need('[담당자 입력: 중기재정계획심의위원회 개최일]')+'\n'
    +'  ◦ 반영 연도: '+need('[담당자 입력: 최초 반영 연도]')+'\n'
    +'  ◦ '+need('[담당자 입력: 반영 계획서 문서번호]');
  pg+=sec('4-1','중기지방재정계획',s41);

  /* 4-2 지방재정영향평가 */
  var s42='가. 해당 여부\n'
    +'  ◦ 총사업비 '+cost+'억원 — ';
  if(cost>=200){
    s42+='지방재정영향평가 해당 (200억원 이상)\n'
      +'  ◦ (「지방재정법」 제37조의3 제1항)\n\n'
      +'나. 평가 결과\n'
      +'  ◦ 평가 기관: '+need('[담당자 입력: 평가기관명]')+'\n'
      +'  ◦ 평가 일자: '+need('[담당자 입력: 평가 완료일]')+'\n'
      +'  ◦ 평가 결과: '+need('[담당자 입력: 요약 결과]')+'\n'
      +'  ◦ 주요 의견: '+need('[담당자 입력: 주요 의견 및 반영 사항]');
  } else {
    s42+='지방재정영향평가 대상 미해당 (200억원 미만)\n'
      +'  ◦ (「지방재정법」 제37조의3 제1항 — 200억원 미만 제외)';
  }
  pg+=sec('4-2','지방재정영향평가',s42);

  /* 4-3 관계기관 협의 */
  var s43='가. 협의 현황\n'
    +'\n'
    +'<table class="draft-simple-table">\n'
    +'<tr><th>협의기관</th><th>협의 내용</th><th>협의일</th><th>결과</th></tr>\n'
    +'<tr><td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td></tr>\n'
    +'<tr><td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td>'
    +'<td>'+need('[담당자]')+'</td></tr>\n'
    +'</table>\n\n'
    +'나. 주요 협의 결과\n'
    +'  ◦ '+need('[담당자 입력: 핵심 협의 결과 요약]')+'\n'
    +'  ◦ '+need('[담당자 입력: 조건부 사항 및 이행 계획]');
  pg+=sec('4-3','관계기관 협의',s43);

  /* 4-4 타당성조사 */
  var s44='가. 의무 타당성조사 대상 여부\n'
    +'  ◦ 총사업비 '+cost+'억원 — ';
  if(cost>=500){
    s44+='의무 타당성조사 대상 (500억원 이상)\n'
      +'  ◦ (「지방재정법」 제37조의2 제1항)\n\n'
      +'나. 타당성조사 결과\n'
      +'  ◦ 조사 기관: '+need('[담당자 입력: 한국지방행정연구원 등]')+'\n'
      +'  ◦ 조사 기간: '+need('[담당자 입력: 착수일 ~ 완료일]')+'\n'
      +'  ◦ B/C 분석: '+need('[담당자 입력: B/C 수치]')+'\n'
      +'  ◦ NPV:      '+need('[담당자 입력: NPV 수치 (억원)]')+'\n'
      +'  ◦ IRR:      '+need('[담당자 입력: IRR 수치 (%)]')+'\n'
      +'  ◦ 결  론:   '+need('[담당자 입력: 경제적 타당성 확보 여부]');
  } else {
    s44+='의무 타당성조사 대상 미해당 (500억원 미만)\n'
      +'  ◦ (「지방재정법」 제37조의2 제1항 — 500억원 미만 제외)\n\n'
      +'나. 자체 경제성 분석 결과 (경제성 분석 탭 참조)\n'
      +'  ◦ 분석 기준: 사회적 할인율 4.5% / 분석기간 30년\n';
    var econEl=document.getElementById('econ-result-area');
    if(econEl && econEl.innerText && econEl.innerText.trim().length>10){
      var et=econEl.innerText;
      var bm=et.match(/B\/C[^:]*:\s*([\d.]+)/);
      var nm=et.match(/NPV[^:]*:\s*([+\-\d.]+)/);
      var im=et.match(/IRR[^:]*:\s*([\d.]+)/);
      s44+='  ◦ B/C: '+(bm?bm[1]:'경제성 분석 탭 실행 후 자동 반영')+'\n';
      s44+='  ◦ NPV: '+(nm?nm[1]:'경제성 분석 탭 실행 후 자동 반영')+'억원\n';
      s44+='  ◦ IRR: '+(im?im[1]:'경제성 분석 탭 실행 후 자동 반영')+'%';
    } else {
      s44+='  ◦ '+need('[경제성 분석 탭에서 분석 실행 후 자동 반영됩니다]');
    }
  }
  pg+=sec('4-4','타당성조사',s44);

  /* ── 5장 투자심사 자료 ── */
  pg+=chapterTitle('5. 투자심사 자료','ch5');

  var s51='가. 현황 및 문제점\n'
    +'  ◦ 파주시 인구 530,000명 대비 '+typeTxt+' 부족·부재 또는 노후화로 주민 불편 지속\n'
    +'  ◦ '+need('[담당자 입력 필요: 현재 시설 현황 및 주민 불편 사항 수치]')+'\n\n'
    +'나. 추진 근거\n'
    +'  ◦ 총사업비 '+cost+'억원으로 '+authLabel+' 대상\n'
    +'  ◦ (「지방재정법 시행령」 '+r.auth.law+')\n'
    +'  ◦ 현재 사업 단계: '+stageTxt+'\n\n'
    +'다. 시급성\n'
    +'  ◦ 사업 지연 시 주민 불편 지속 및 서비스 공백 심화\n'
    +'  ◦ '+need('[담당자 입력 필요: 시급성 입증 자료 및 수치]');
  pg+=sec('5-1','사업의 필요성 및 시급성',s51);

  pg+=sec('5-2','국가계획 및 경제·사회정책과의 부합성',
    '◦ 「2025~2029 파주시 중기지방재정계획」 반영\n  '+need('[담당자: 반영 연도 및 금액]')+'\n\n'
    +'◦ 파주시 도시기본계획 부합\n\n'
    +'◦ 「지방자치법」 제13조 제2항 (주민 복지증진 및 생활편의 향상)\n\n'
    +'◦ '+need('[담당자: 사업 특성에 맞는 관련 국가계획·법령 추가]')+'\n\n'
    +'◦ 행정안전부 생활SOC 복합화 정책 부합');

  pg+=sec('5-3','주민의 숙원도 및 수혜도',
    '가. 주민 수혜도\n'
    +'  ◦ 수혜도(%) = (수혜주민 ÷ 530,000명) × 100\n'
    +'  ◦ 직접 수혜: '+need('[담당자]')+'명 / 간접 수혜: '+need('[담당자]')+'명\n'
    +'  ◦ 최종 수혜율: '+need('[담당자 산출 필요]')+'%\n\n'
    +'나. 주민 숙원도\n'
    +'  ◦ 건의·청원·민원: '+need('[담당자 입력 필요]')+'\n'
    +'  ◦ 설문조사: '+need('[담당자 입력 필요]'));

  pg+=sec('5-4','사업의 파급효과',
    '가. 직접 효과\n'
    +'  ◦ 연간 예상 이용 인원: '+need('[담당자]')+'명\n'
    +'  ◦ 주민 생활편의 향상 및 '+typeTxt+' 서비스 접근성 개선\n\n'
    +'나. 간접 효과\n'
    +'  ◦ 지역 정주 여건 개선으로 인구 유입 및 지역경제 활성화\n\n'
    +'다. 경제적 파급효과\n'
    +(isNoConst?'':'  ◦ 건설 단계: '+need('[담당자]')+'명\n')
    +'  ◦ 운영 단계: '+need('[담당자]')+'명');

  var s55='가. 의무 타당성조사 이행 여부\n'
    +(tang500
      ?'  ◦ 총사업비 '+cost+'억원 → 의무 타당성조사 대상\n    (「지방재정법」 제37조의2 제1항)\n    '+need('[담당자: 타당성조사 결과 B/C·IRR·NPV]')
      :'  ◦ 총사업비 '+cost+'억원 → 의무 타당성조사 대상 미해당 (500억 미만)\n    (「지방재정법」 제37조의2 제1항)')+'\n\n'
    +'나. 경제성 분석 결과 (자체 검토)\n'
    +'  ◦ 분석 기준: 사회적 할인율 4.5% / 분석기간 30년\n'
    +'  ◦ B/C: '+(bcVal!=='-'?bcVal:need('[경제성 분석 탭 실행 후 반영]'))+'\n'
    +'  ◦ NPV: '+(npvVal!=='-'?npvVal:need('[경제성 분석 탭 실행 후 반영]'))+'\n'
    +'  ◦ IRR: '+(irrVal!=='-'?irrVal:need('[경제성 분석 탭 실행 후 반영]'))+'\n\n'
    +'다. 적정 사업비 검토\n'
    +(constCost>0&&area>0
      ?'  ◦ 공사비 '+constCost.toFixed(1)+'억원 / 연면적 '+areaStr+'\n  ◦ 단위면적당: '+unitStr
      :'  ◦ '+need('[담당자: 사업비 적정성 검토]'));
  pg+=sec('5-5','경제적 수익성 및 타당성',s55);

  var s56='가. 재원 구성\n  총사업비 '+cost+'억원\n'
    +'  - 국  비: '+nat+'억원('+natPct+'%)\n'
    +(prov>0?'  - 도  비: '+prov+'억원('+provPct+'%)\n':'')
    +'  - 시  비: '+city+'억원('+cityPct+'%)\n\n';
  if(isCentral||isGyeonggi){
    s56+='나. 국비·도비 확보 현황\n'
      +(nat>0?'  ◦ 국비 '+nat+'억: '+need('[담당자: 확보 여부·부처·사업명]')+'\n':'  ◦ 국비 미신청\n')
      +(prov>0?'  ◦ 도비 '+prov+'억: '+need('[담당자: 보조사업명·보조율]')+'\n':'')
      +'\n다. 연도별 투자계획\n  '+need('[담당자 작성 필요]')+'\n\n'
      +'라. 재원조달능력 판단\n';
  } else {
    s56+='나. 연도별 투자계획\n  '+need('[담당자 작성 필요]')+'\n\n'
      +'다. 재원조달능력 판단\n';
  }
  s56+='  ◦ 재정자립도: '+need('[담당자]')+' / 재정자주도: '+need('[담당자]')+'\n'
    +'  ◦ 지방채 발행 없이 자체 재원으로 조달 가능';
  pg+=sec('5-6','재원조달 가능 여부 및 채무상환능력',s56);

  var s57='가. 현재 단계: '+stageTxt+'\n\n'
    +'나. 법적 절차 이행 현황\n'
    +'  ◦ 중기지방재정계획 반영: '+need('[담당자]')+'\n'
    +(isNoConst?'':
      '  ◦ 공유재산관리계획 수립: '+need('[담당자]')+'\n'
      +'  ◦ 사업부지 확보: '+need('[담당자]')+'\n'
      +'  ◦ 도시계획시설 지정: '+need('[담당자]')+'\n')
    +'  ◦ 인허가: '+need('[담당자]')+'\n\n'
    +'다. 설계 진행: '+stageTxt
    +(isCentral?'\n\n라. 타당성조사\n  '+cost+'억원 '+(tang500?'의무 대상\n  '+need('[담당자: 조사 착수·완료 현황]'):'미해당(500억 미만)'):'');
  pg+=sec('5-7','사업추진 준비상황',s57);

  var s58='가. 예상 문제점\n'
    +(isNoConst?'':'  ◦ 공사 중 소음·분진 민원\n')
    +'  ◦ 운영 초기 재정 부담\n'
    +'  ◦ '+need('[담당자: 사업 특성상 예상 문제점]')+'\n\n'
    +'나. 대책\n'
    +(isNoConst?'':'  ◦ 착공 전 주민 설명회 개최\n')
    +'  ◦ 운영 수지 개선 계획 수립\n'
    +'  ◦ '+need('[담당자: 구체적 해결 방안]')
    +(isCentral?'\n\n다. 유사·중복시설 검토 (중앙심사 필수)\n  ◦ '+need('[담당자: 인근 시설명·거리·이용률]'):'');
  pg+=sec('5-8','사업추진에 따른 문제점 및 대책',s58);

  pg+=sec('5-9','기타',
    '◦ 주민 반대: '+(isReview?need('[담당자]'):'해당 없음')+'\n'
    +'◦ 환경영향평가: '+need('[담당자 확인]')+'\n'
    +'◦ 재심사 이력: '+(isReview?need('[직전 심사결과 및 이행현황]'):'해당 없음'));


  /* ── 6장 운영계획 ── */
  pg+=chapterTitle('6. 운영계획','ch6');

  /* 6-1 기구 및 조직 */
  var s61='가. 운영주체\n'
    +'  ◦ 운영기관: '+need('[담당자 입력: 직영/위탁/법인 구분]')+'\n'
    +'  ◦ 위탁 시 수탁기관: '+need('[담당자 입력: 예정 수탁기관명]')+'\n\n'
    +'나. 조직 구성\n'
    +'  ◦ 총 정원: '+need('[담당자 입력]')+'명 (정규직 '+need('[담당자]')+'명 / 계약직 '+need('[담당자]')+'명)\n'
    +'  ◦ 주요 직위\n'
    +'    - 관장/소장: 1명\n'
    +'    - 행정직: '+need('[담당자]')+'명\n'
    +'    - 시설관리직: '+need('[담당자]')+'명\n'
    +'    - 프로그램 운영직: '+need('[담당자]')+'명\n\n'
    +'다. 연간 인건비\n'
    +'  ◦ '+need('[담당자 입력: 인건비 산출 근거 및 합계]')+'억원';
  pg+=sec('6-1','기구 및 조직',s61);

  /* 6-2 수지전망 (연도별 자동계산) */
  var compYear=new Date().getFullYear()+2;
  var annualOp=(gnv('ec_op_cost')||0)+(gnv('ec_maint')||0);
  var annualRev=gnv('ec_revenue')||0;
  var yearlyRows='';
  var totalRev=0, totalExp=0;
  for(var yi=0;yi<5;yi++){
    var yr=compYear+yi;
    var label=yi===0?yr+'(준공)':yr+'(Y+'+(yi)+')';
    var rev=annualRev>0?(annualRev*yi===0?annualRev*0.5:annualRev):0;
    var exp=annualOp>0?annualOp:0;
    var sur=rev-exp;
    totalRev+=rev; totalExp+=exp;
    yearlyRows+='<tr><td class="label">'+label+'</td>'
      +'<td>'+rev.toFixed(1)+'</td>'
      +'<td>'+exp.toFixed(1)+'</td>'
      +'<td class="'+(sur>=0?'pos':'neg')+'">'+sur.toFixed(1)+'</td></tr>';
  }
  var s62='가. 연도별 수지전망 (준공년도~+4년)\n\n'
    +'<table class="ops-table">\n'
    +'<tr><th>연도</th><th>수입(억원)</th><th>지출(억원)</th><th>수지(억원)</th></tr>\n'
    +yearlyRows
    +'<tr class="total"><td class="label">합계(5년)</td>'
    +'<td>'+totalRev.toFixed(1)+'</td>'
    +'<td>'+totalExp.toFixed(1)+'</td>'
    +'<td class="'+(totalRev-totalExp>=0?'pos':'neg')+'">'+(totalRev-totalExp).toFixed(1)+'</td></tr>\n'
    +'</table>\n\n'
    +'나. 수입 내역 (연간)\n'
    +'  ◦ 이용료·사용료: '+need('[담당자 입력]')+'억원\n'
    +'  ◦ 국비·도비 보조금: '+need('[담당자 입력]')+'억원\n'
    +'  ◦ 기타 수입: '+need('[담당자 입력]')+'억원\n\n'
    +'다. 지출 내역 (연간)\n'
    +'  ◦ 인건비: '+need('[담당자 입력]')+'억원\n'
    +'  ◦ 시설유지관리비: '+(annualOp>0?annualOp.toFixed(1):need('[담당자 입력]'))+'억원'
      +(annualOp>0?' (경제성 분석 탭 자동 반영)':'')+'\n'
    +'  ◦ 관리운영비: '+need('[담당자 입력]')+'억원\n'
    +'  ◦ 기타 경비: '+need('[담당자 입력]')+'억원\n\n'
    +'라. 재정지원 계획\n'
    +'  ◦ '+(totalRev-totalExp<0
      ? '운영 적자 예상 — 파주시 일반회계 지원: '+Math.abs(totalRev-totalExp).toFixed(1)+'억원/년'
      : '운영 흑자 예상 — 자립 운영 목표')+'\n'
    +'  ◦ '+need('[담당자 입력: 적자 보전 방안 또는 수익 개선 계획]');
  pg+=sec('6-2','사업수지 전망',s62);

  /* 6-3 세부시설 운영계획 */
  var s63='가. 운영 시간\n'
    +'  ◦ 운영 일수: '+need('[담당자 입력: 연간 운영일 수]')+'일/년\n'
    +'  ◦ 운영 시간: '+need('[담당자 입력: 예) 09:00~21:00]')+'\n'
    +'  ◦ 휴관일: '+need('[담당자 입력: 예) 매주 월요일, 공휴일]')+'\n\n'
    +'나. 시설별 운영 방식\n'
    +'  ◦ '+need('[담당자 입력: 주요 시설별 운영 방식 및 이용 요금]')+'\n\n'
    +'다. 프로그램 운영 계획\n'
    +'  ◦ 주요 프로그램: '+need('[담당자 입력: 운영 예정 프로그램 목록]')+'\n'
    +'  ◦ 예상 연간 이용 인원: '+need('[담당자 입력]')+'명\n\n'
    +'라. 개관 준비 계획\n'
    +'  ◦ 개관 목표일: '+need('[담당자 입력]')+'\n'
    +'  ◦ 준비 기간 주요 업무: 인력 채용, 집기·장비 구입, 운영 규정 제정, 홍보';
  pg+=sec('6-3','세부시설 운영계획',s63);



  /* ── 7장 유형별 추가자료 ── */
  if(r.type==='office'||r.type==='complex'||r.type==='culture'){
    pg+=chapterTitle('7. 유형별 추가자료','ch7');

    /* 파주시 인구 및 청사 기준면적 (공유재산 및 물품 관리법 시행령 별표1) */
    var paju_pop = 530000;  /* 파주시 인구 (2024년 기준) */
    /* 인구 구간별 기준면적 (시·군 본청 기준) */
    var areaStandards = [
      [100000,  11893, '10만명 미만'],
      [200000,  13965, '10만~20만명'],
      [300000,  17759, '20만~30만명'],
      [500000,  18907, '30만~50만명'],
      [700000,  19098, '50만~70만명'],
      [900000,  20214, '70만~90만명'],
      [1000000, 21968, '90만~100만명'],
      [9999999, 22319, '100만명 이상'],
    ];
    var stdArea = 19098;  /* 파주시 기준 (50만~70만명) */
    var stdLabel = '50만명 이상 70만명 미만';
    for(var ai=0; ai<areaStandards.length; ai++){
      if(paju_pop < areaStandards[ai][0]){
        stdArea = areaStandards[ai][1];
        stdLabel = areaStandards[ai][2];
        break;
      }
    }
    var planArea = gnv('ci_area') || 0;  /* 계획 연면적 */

    /* ── 7-2 청사·문화체육시설 유형별 추가자료 ── */
    var s72 = '';

    /* 청사 사업인 경우: 기준면적 비교표 */
    if(r.type==='office'||r.type==='complex'){
      /* 제외 면적 추정 (지하주차장 등) */
      var excludeArea = planArea > 0 ? Math.round(planArea * 0.25) : 0;
      var netArea = planArea > 0 ? planArea - excludeArea : 0;
      var isOk = netArea > 0 && netArea <= stdArea;
      var diffArea = netArea - stdArea;
      var diffPct = stdArea > 0 ? (diffArea / stdArea * 100).toFixed(1) : 0;

      s72 += '가. 청사 기준면적 적합성 검토\n'
        + '   (공유재산 및 물품 관리법 시행령 제95조제2항제1호 관련 [별표 1])\n\n'
        + '<table class="area-compare-table">\n'
        + '<tr><th>구분</th><th>면적(㎡)</th><th>비고</th></tr>\n'
        + '<tr class="highlight"><td class="label">파주시 법정 기준면적</td>'
        + '<td>' + stdArea.toLocaleString() + '㎡</td>'
        + '<td>시·군 본청 / 인구 ' + stdLabel + ' / 공유재산법 시행령 별표1</td></tr>\n'
        + '<tr><td class="label">계획 건물 연면적</td>'
        + '<td>' + (planArea > 0 ? planArea.toLocaleString() : need('[담당자 입력: 계획 연면적]')) + '㎡</td>'
        + '<td>계산기 탭 연면적 기준</td></tr>\n'
        + '<tr><td class="label">제외 면적 (지하주차장 등)</td>'
        + '<td>- ' + (excludeArea > 0 ? excludeArea.toLocaleString() : need('[담당자 입력]')) + '㎡</td>'
        + '<td>지하주차장·주민편의·법정 의무시설 제외</td></tr>\n'
        + '<tr class="result"><td class="label">적용 연면적 (순 청사 면적)</td>'
        + '<td>' + (netArea > 0 ? netArea.toLocaleString() : need('[담당자 입력]')) + '㎡</td>'
        + '<td class="' + (planArea > 0 ? (isOk ? 'area-ok' : 'area-ng') : '') + '">'
        + (planArea > 0
          ? (isOk
            ? '✅ 기준면적 이내 (' + diffPct + '%)'
            : '⚠ 기준면적 초과 (+' + Math.abs(diffPct) + '%) — 초과 사유 기재 필요')
          : need('[담당자: 적합성 판정]'))
        + '</td></tr>\n'
        + '</table>\n\n';

      if(planArea > 0 && !isOk){
        s72 += '  ⚠ 기준면적 초과 시 초과 사유 및 필요성을 반드시 기재하세요.\n'
          + '  (행안부 투자심사에서 기준면적 초과 여부를 중점 심사합니다)\n\n';
      }

      s72 += '나. 청사 면적 구성 (층별 용도별)\n'
        + need('[담당자 입력: 용도별 면적 내역 — 주요 업무공간·민원실·회의실·편의시설 등]') + '\n\n';
    }

    /* 체육시설 포함 사업: 유사시설 현황 */
    if(r.type==='culture'||r.type==='complex'){
      s72 += (r.type==='complex'?'다':'가') + '. 인근 유사시설 현황 (중앙심사 필수 항목)\n\n'
        + '<table class="similar-table">\n'
        + '<tr><th>시설명</th><th>소재지</th><th>규모(㎡)</th>'
        + '<th>운영현황</th><th>거리(km)</th><th>이용률(%)</th></tr>\n'
        + '<tr><td class="label">' + need('[시설명]') + '</td>'
        + '<td>' + need('[소재지]') + '</td>'
        + '<td>' + need('[규모]') + '</td>'
        + '<td>' + need('[운영]') + '</td>'
        + '<td>' + need('[거리]') + '</td>'
        + '<td>' + need('[이용률]') + '</td></tr>\n'
        + '<tr><td class="label">' + need('[시설명]') + '</td>'
        + '<td>' + need('[소재지]') + '</td>'
        + '<td>' + need('[규모]') + '</td>'
        + '<td>' + need('[운영]') + '</td>'
        + '<td>' + need('[거리]') + '</td>'
        + '<td>' + need('[이용률]') + '</td></tr>\n'
        + '</table>\n\n'
        + (r.type==='complex'?'라':'나') + '. 차별화 방안 및 추가 필요성\n'
        + '  ◦ 기존 시설과의 차별화 방안: ' + need('[담당자 입력: 차별화 내용]') + '\n'
        + '  ◦ 권역별 수요 분석: ' + need('[담당자 입력: 해당 권역 인구 및 시설 부족 현황]') + '\n'
        + '  ◦ 접근성 및 이용 편의: ' + need('[담당자 입력]');
    }

    /* 모든 유형: 경제성 분석 세부 내역 */
    s72 += '\n\n' + (r.type==='office'?'다':r.type==='complex'?'마':'다') + '. 경제성 분석 세부 내역\n'
      + '  ◦ 분석 방법: 비용편익분석(CBA) — B/C, NPV, IRR\n'
      + '  ◦ 사회적 할인율: 4.5% (국가 예비타당성조사 기준)\n'
      + '  ◦ 분석기간: 30년 (공공건축물 내용연수)\n'
      + '  ◦ 편익 산정: 서울연구원(2019) 투자심사 경제성 분석 가이드라인 원단위 적용\n'
      + '  ◦ ' + need('[경제성 분석 탭에서 분석 실행 후 B/C·NPV·IRR 결과를 여기에 기재]');

    pg+=sec('7-2','유형별 추가자료 (청사·체육시설)',s72);
  }


  pg+='<div style="margin-top:16px;padding-top:8px;border-top:1px solid var(--g200);font-size:10px;color:var(--g400);text-align:center">'
    +'파주시 AI 혁신동아리 ACE팀 | 생성일: '+today+'</div>';
  pg+='</div>';

  /* ── 최종 조합 ── */
  var scrollArea='<div class="draft-scroll" id="draft-scroll">'
    +pg+'</div>';
  var layoutArea='<div class="draft-layout">'+nav+scrollArea+'</div>';

  v('draft-box').innerHTML=layoutArea;
  
    /* ── 이벤트 위임: 편집·AI 버튼 ── */
    (function(){
      var box=v('draft-box');
      if(!box) return;
      box.addEventListener('click',function(e){
        /* 편집 버튼 */
        var editBtn=e.target.closest('[data-edit-id]');
        if(editBtn){
          toggleEdit(editBtn.getAttribute('data-edit-id'));
          return;
        }
        /* AI 버튼 */
        var aiBtn=e.target.closest('[data-ai-num]');
        if(aiBtn){
          aiSection(
            aiBtn.getAttribute('data-ai-num').replace(/_/g,'-'),
            aiBtn.getAttribute('data-ai-title')
          );
          return;
        }
      });
    })();
}




/* ══ 서울시 공공건축물 건축공사비 단가 (2024 기준) ══
   출처: 서울시 공공건축물 건축공사비 책정 가이드라인(2024)
         행안부 지방재정 투자심사 매뉴얼 참고
   단위: 천원/㎡ (부가세 포함 기준)              */
var UNIT_PRICE_DB = {
  /* ══════════════════════════════════════════════════════
     서울시 공공건축물 건립 공사비 책정 가이드라인 (2024)
     서울특별시 기술심사담당관
     단위: 천원/㎡ (부가세 포함 / 신축 기준)
     규모 구간별 대표값 적용
     ══════════════════════════════════════════════════════ */

  /* 2-1. 업무시설 */
  office: [
    {sub:'동청사·행정복지센터',
     name:'행정복지센터 소형 (1,500㎡ 이하)',
     price:4179, range:'1,500㎡ 이하 신축',
     note:'서울시 가이드라인 동청사(자치회관) 1,500㎡ 미만 평균', selected:true},
    {sub:'동청사·행정복지센터',
     name:'행정복지센터 중형 (1,500~2,000㎡)',
     price:4067, range:'1,500~2,000㎡ 신축',
     note:'서울시 가이드라인 동청사(자치회관) 1,500~2,000㎡'},
    {sub:'동청사·행정복지센터',
     name:'행정복지센터 대형 (2,000㎡ 초과)',
     price:3974, range:'2,000㎡ 초과 신축',
     note:'서울시 가이드라인 동청사(자치회관) 2,000㎡ 초과'},
    {sub:'복지지원센터',
     name:'복지지원센터·주민센터 (5,000㎡ 미만)',
     price:4417, range:'5,000㎡ 미만 신축',
     note:'서울시 가이드라인 복지지원센터 5,000㎡ 미만'},
    {sub:'복지지원센터',
     name:'복지지원센터·주민센터 (5,000㎡ 이상)',
     price:4243, range:'5,000~15,000㎡ 신축',
     note:'서울시 가이드라인 복지지원센터 5,000~15,000㎡'},
    {sub:'복합청사·대형청사',
     name:'복합청사·대형청사 (4,000㎡ 미만)',
     price:3883, range:'3,000~4,000㎡ 신축',
     note:'서울시 가이드라인 복합청사(대형청사) 3,000~4,000㎡'},
    {sub:'복합청사·대형청사',
     name:'복합청사·대형청사 (4,000~10,000㎡)',
     price:3835, range:'4,000~10,000㎡ 신축',
     note:'서울시 가이드라인 복합청사(대형청사) 4,000~10,000㎡'},
    {sub:'공공업무사무소',
     name:'공공업무사무소 (1,500~5,000㎡)',
     price:4161, range:'1,500~5,000㎡ 신축',
     note:'서울시 가이드라인 공공업무사무소 평균 4,175'},
  ],

  /* 2-6. 운동시설 + 2-2. 문화·집회 + 2-4. 도서관 + 2-5. 청소년 */
  culture: [
    {sub:'체육관·체육센터',
     name:'국민체육센터 (3,500㎡ 미만)',
     price:4352, range:'3,500㎡ 미만 신축',
     note:'서울시 가이드라인 체육관(체육센터) 3,500㎡ 미만', selected:true},
    {sub:'체육관·체육센터',
     name:'국민체육센터 (3,500~5,000㎡)',
     price:4313, range:'3,500~5,000㎡ 신축',
     note:'서울시 가이드라인 체육관(체육센터) 3,500~5,000㎡'},
    {sub:'체육관·체육센터',
     name:'국민체육센터 (5,000~10,000㎡)',
     price:4222, range:'5,000~10,000㎡ 신축',
     note:'서울시 가이드라인 체육관(체육센터) 5,000~10,000㎡'},
    {sub:'체육관·체육센터',
     name:'국민체육센터 (10,000㎡ 초과)',
     price:4127, range:'10,000㎡ 초과 신축',
     note:'서울시 가이드라인 체육관(체육센터) 10,000㎡ 초과'},
    {sub:'문화·집회시설',
     name:'문화예술회관·문화집회시설 (3,000㎡ 미만)',
     price:5084, range:'3,000㎡ 미만 신축',
     note:'서울시 가이드라인 문화예술회관 3,000㎡ 미만'},
    {sub:'문화·집회시설',
     name:'문화예술회관·문화집회시설 (4,000~10,000㎡)',
     price:4916, range:'4,000~10,000㎡ 신축',
     note:'서울시 가이드라인 문화예술회관 4,000~10,000㎡'},
    {sub:'전시·박물관',
     name:'전시·박물관 (5,000~10,000㎡)',
     price:4643, range:'5,000~10,000㎡ 신축',
     note:'서울시 가이드라인 전시·박물관 5,000~10,000㎡'},
    {sub:'도서관',
     name:'공공도서관 (2,000~6,000㎡)',
     price:4354, range:'2,000~6,000㎡ 신축',
     note:'서울시 가이드라인 도서관 2,000~6,000㎡'},
    {sub:'도서관',
     name:'공공도서관 (6,000㎡ 초과)',
     price:4230, range:'6,000㎡ 초과 신축',
     note:'서울시 가이드라인 도서관 6,000㎡ 초과'},
    {sub:'청소년시설',
     name:'청소년·문화수련시설 (2,000~6,000㎡)',
     price:3860, range:'2,000~6,000㎡ 신축',
     note:'서울시 가이드라인 청소년·문화수련시설 2,000~6,000㎡'},
  ],

  /* 복합시설: 구성 비중 가중 평균 적용 */
  complex: [
    {sub:'복합시설',
     name:'행정복지센터 + 체육센터 (규모 중형, 50:50)',
     price:4200, range:'각 단가 평균',
     note:'동청사 4,061 + 체육관 4,352 평균 (면적 가중)', selected:true},
    {sub:'복합시설',
     name:'행정복지센터 + 체육센터 (청사 비중 높음 60%)',
     price:4150, range:'청사 60% + 체육 40%',
     note:'청사 4,061×0.6 + 체육 4,352×0.4 = 4,178 근사'},
    {sub:'복합시설',
     name:'복지지원센터 + 체육센터 (50:50)',
     price:4380, range:'각 단가 평균',
     note:'복지지원센터 4,417 + 체육관 4,352 평균'},
    {sub:'복합시설',
     name:'행정복지센터 + 문화·집회시설',
     price:4500, range:'청사+문화 면적 가중',
     note:'동청사 4,061 + 문화예술회관 4,916 평균'},
  ],

  /* 2-3. 복지시설 + 2-4. 보건·의료·교육 + 2-5. 노유자시설 */
  general: [
    {sub:'사회복지관',
     name:'종합사회복지관 (1,000~3,000㎡)',
     price:4298, range:'1,000~3,000㎡ 신축',
     note:'서울시 가이드라인 종합사회복지관 1,000~3,000㎡', selected:true},
    {sub:'사회복지관',
     name:'종합사회복지관 (3,000~5,000㎡)',
     price:4188, range:'3,000~5,000㎡ 신축',
     note:'서울시 가이드라인 종합사회복지관 3,000~5,000㎡'},
    {sub:'사회복지관',
     name:'장애인복지관 (1,000~3,000㎡)',
     price:3947, range:'1,000~3,000㎡ 신축',
     note:'서울시 가이드라인 장애인복지관 1,000~3,000㎡'},
    {sub:'노인복지시설',
     name:'노인복지센터 (1,000~3,000㎡)',
     price:4477, range:'1,000~3,000㎡ 신축',
     note:'서울시 가이드라인 노인복지센터 1,000~3,000㎡'},
    {sub:'노인복지시설',
     name:'노인요양시설 (2,000~5,000㎡)',
     price:4157, range:'2,000~5,000㎡ 신축',
     note:'서울시 가이드라인 노인요양 2,000~5,000㎡'},
    {sub:'보건·의료',
     name:'보건소 (2,000~3,000㎡)',
     price:3815, range:'2,000~3,000㎡ 신축',
     note:'서울시 가이드라인 보건소 2,000~3,000㎡'},
    {sub:'노유자시설',
     name:'어린이집·보육시설 (500~800㎡)',
     price:4902, range:'500~800㎡ 신축',
     note:'서울시 가이드라인 어린이집 500~800㎡'},
    {sub:'노유자시설',
     name:'어린이집·보육시설 (1,000㎡ 초과)',
     price:4615, range:'1,000㎡ 초과 신축',
     note:'서울시 가이드라인 어린이집 1,000㎡ 초과'},
    {sub:'노유자시설',
     name:'주민공동이용시설 (400㎡ 초과)',
     price:4365, range:'400㎡ 초과 신축',
     note:'서울시 가이드라인 주민공동이용시설'},
  ],

  /* 2-2. 전시·박물관 */
  promo: [
    {sub:'전시·홍보시설',
     name:'홍보관·전시관 (3,000~5,000㎡)',
     price:4712, range:'3,000~5,000㎡ 신축',
     note:'서울시 가이드라인 전시·박물관 3,000~5,000㎡', selected:true},
    {sub:'전시·홍보시설',
     name:'홍보관·전시관 소형 (3,000㎡ 미만)',
     price:4880, range:'3,000㎡ 미만 신축',
     note:'서울시 가이드라인 전시·박물관 3,000㎡ 미만'},
  ],
}

function showUnitPriceBox(type) {
  var box = document.getElementById('unit-price-box');
  if (!box) return;
  var db = UNIT_PRICE_DB[type];
  if (!db || db.length === 0) {
    box.className = 'unit-price-box';
    return;
  }
  var h = '<div class="unit-price-title">&#128200; 서울시 건축공사비 단가 (2024) — 클릭하면 자동 적용</div>';
  h += '<div class="unit-price-grid">';
  db.forEach(function(item, i) {
    var sel = item.selected ? ' selected' : '';
    h += '<div class="unit-price-card' + sel + '" onclick="applyUnitPrice(' + item.price + ',this)">';
    h += '<div class="upc-sub">' + item.sub + '</div>';
    h += '<div class="upc-name">' + item.name + '</div>';
    h += '<div class="upc-price">' + item.price.toLocaleString() + '<span class="upc-unit">천원/㎡</span></div>';
    h += '<div class="upc-range">' + item.range + '</div>';
    h += '<div style="font-size:9px;color:var(--g400);margin-top:2px">' + (item.note||'') + '</div>';
    h += '</div>';
  });
  h += '</div>';
  h += '<div class="upc-source">출처: 서울시 공공건축물 건립 공사비 책정 가이드라인(2024, 기술심사담당관) | 부가세 포함·신축 기준 | 지하층 포함 시 상향 적용</div>';
  h += '<div class="unit-price-note">&#9432; 위 단가는 지상층 기준 평균값입니다. 지하주차장 포함 시 15~20% 상향, 특수시설(수영장·대형체육관 등) 포함 시 별도 검토하세요.</div>';
  box.innerHTML = h;
  box.className = 'unit-price-box show';
  /* 기본 선택 단가 자동 적용 */
  var defItem = db.find(function(d){ return d.selected; }) || db[0];
  if (defItem) applyUnitPriceSilent(defItem.price);
}

function applyUnitPrice(price, cardEl) {
  /* 카드 선택 표시 */
  var box = document.getElementById('unit-price-box');
  if (box) {
    var cards = box.querySelectorAll('.unit-price-card');
    cards.forEach(function(c){ c.classList.remove('selected'); });
    if (cardEl) cardEl.classList.add('selected');
  }
  applyUnitPriceSilent(price);
  /* 계산기 탭으로 이동하지 않고 안내만 */
  var note = document.getElementById('unit-applied-note');
  if (note) {
    note.textContent = '✅ ' + price.toLocaleString() + '천원/㎡ 적용됨 — 사업비 계산기에서 연면적을 입력하면 공사비가 자동 산출됩니다';
    note.style.display = 'block';
    setTimeout(function(){ note.style.display='none'; }, 4000);
  }
}

function applyUnitPriceSilent(price) {
  window.gLastUnit = price;
  /* ci_unit은 정적 DOM — 항상 존재 */
  var el = document.getElementById('ci_unit');
  if (el) {
    el.value = price;
    var hint = document.getElementById('ci_unit_hint');
    if (hint) hint.textContent = '서울시 가이드라인 자동 적용: ' + price.toLocaleString() + ' 천원/㎡';
    if (typeof recalcCost === 'function') recalcCost();
  }
  /* renderCalc 내 표시용 div도 동기화 */
  var disp = document.getElementById('ci_unit_display');
  if (disp) disp.textContent = price.toLocaleString();
}
function getCalcMode(){
  var r=document.querySelector('input[name="f_calc_mode"]:checked');
  return r?r.value:'simple';
}
function applyCalcModeVis(){
  var detail=(getCalcMode()==='detail');
  var uw=document.getElementById('ci_unit_wrap'); if(uw) uw.style.display=detail?'none':'';
  var ub=document.getElementById('unit-price-box'); if(ub) ub.style.display=detail?'none':'';
  if(detail){ var un=document.getElementById('unit-applied-note'); if(un) un.style.display='none'; }
}
function onCalcModeChange(){
  applyCalcModeVis();
  if(typeof gResult!=='undefined' && gResult && typeof renderCalc==='function') renderCalc(gResult);
  else if(typeof recalcCost==='function') recalcCost();
}
function onTypeChange() {
  var type = document.getElementById('f_type') ?
    document.getElementById('f_type').value : '';
  showUnitPriceBox(type);
  if(typeof applyCalcModeVis==='function') applyCalcModeVis();
  var erw=document.getElementById('event-regular-wrap');
  if(erw) erw.style.display=(type==='event')?'':'none';
  /* calc 탭이 이미 활성화된 상태이면 ci_unit 즉시 반영 */
  setTimeout(function(){
    var el=document.getElementById('ci_unit');
    if(el && window.gLastUnit){
      el.value=window.gLastUnit;
      var hint=document.getElementById('ci_unit_hint');
      if(hint) hint.textContent='서울시 가이드라인 자동 적용: '+window.gLastUnit.toLocaleString()+'천원/㎡';
      if(typeof recalcCost==='function') recalcCost();
    }
  },30);
  if(typeof calcAll==='function') calcAll();
}

/* 계산기 탭 렌더링 후 gLastUnit 복원 */
function restoreUnitFromType() {
  var el = document.getElementById('ci_unit');
  if (!el || !window.gLastUnit) return;
  /* 사업유형 선택 단가를 항상 우선 적용
     (담당자가 직접 수정했을 경우: 수정값 유지하고 싶으면 gLastUnit을 0으로 초기화) */
  if (!el.value || el.value === '') {
    el.value = window.gLastUnit;
    if (typeof recalcCost === 'function') recalcCost();
  }
  /* ci_unit 필드 하단에 출처 안내 표시 */
  var hint = document.getElementById('ci_unit_hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'ci_unit_hint';
    hint.style.cssText = 'font-size:10px;color:var(--pb);margin-top:3px;font-weight:600';
    if (el.parentNode && el.parentNode.parentNode)
      el.parentNode.parentNode.appendChild(hint);
  }
  hint.textContent = '서울시 가이드라인 자동 적용: ' + window.gLastUnit.toLocaleString() + '천원/㎡ (클릭하여 변경 가능)';
}

var COST37_GROUPS = [
  {key:'land', title:'용지·보상비 6항목', items:[
    ['c37_land_buy','부지매입비','필지별 취득가액','억원'],
    ['c37_land_comp','영업·지장물 보상비','감정평가 또는 보상계획','억원'],
    ['c37_land_reloc','이주·생활대책비','보상계획','억원'],
    ['c37_land_survey','측량·감정평가비','용역 견적','억원'],
    ['c37_land_tax','취득세·등기 등 제세공과금','세율 적용','억원'],
    ['c37_land_public','지방비 미수반 공유재산 가액','총사업비 포함, 예비비 제외 가능','억원']
  ]},
  {key:'construction', title:'공사비 8항목', items:[
    ['c37_const_civil','토목공사비','수량×단가','억원'],
    ['c37_const_arch','건축공사비','연면적×단위공사비 자동 산정 가능','억원'],
    ['c37_const_mech','기계설비공사비','공사비 산출내역','억원'],
    ['c37_const_elec','전기공사비','공사비 산출내역','억원'],
    ['c37_const_comm','통신·전산공사비','공사비 산출내역','억원'],
    ['c37_const_fire','소방공사비','공사비 산출내역','억원'],
    ['c37_const_landscape','조경·외부공사비','공사비 산출내역','억원'],
    ['c37_const_zeb','제로에너지·녹색건축 추가비','ZEB 적용 시 자동 산정 가능','억원']
  ]},
  {key:'design', title:'설계·용역비 8항목', items:[
    ['c37_design_basic','기본설계비','요율 또는 견적','억원'],
    ['c37_design_detail','실시설계비','요율 또는 견적','억원'],
    ['c37_design_intent','설계의도 구현비','건축서비스산업진흥법 관련','억원'],
    ['c37_design_comp','설계공모 보상비','공모 지침','억원'],
    ['c37_design_survey','현황측량·지반조사비','용역 견적','억원'],
    ['c37_design_cert','인증·BF·녹색·에너지 용역비','인증 수수료 및 용역','억원'],
    ['c37_design_ve','VE·기술검토비','용역 견적','억원'],
    ['c37_design_pm','사업관리·기본계획 용역비','기본계획·타당성 검토','억원']
  ]},
  {key:'supervision', title:'감리·CM 3항목', items:[
    ['c37_cm_normal','건설사업관리·감리비','CM 방식별 자동 산정 가능','억원'],
    ['c37_cm_safety','안전점검·품질관리비','법정 점검','억원'],
    ['c37_cm_commission','공사감독 위탁수수료','위탁계약','억원']
  ]},
  {key:'facility', title:'시설부대경비 6항목', items:[
    ['c37_facility_impact','교통·환경·재해 영향평가비','대상 시 산정','억원'],
    ['c37_facility_permit','인허가·심의 수수료','법정 수수료','억원'],
    ['c37_facility_art','미술작품 설치비','문화예술진흥법 검토','억원'],
    ['c37_facility_insurance','보험·보증·안전관리비','공사 관련 보험','억원'],
    ['c37_facility_open','개관·이전 준비비','이전·개관 준비','억원'],
    ['c37_facility_misc','기타 시설부대비','산출근거 직접 입력','억원']
  ]},
  {key:'equipment', title:'운영설비비 6항목', items:[
    ['c37_equip_furniture','집기·비품 구입비','품목별 견적','억원'],
    ['c37_equip_it','전산·통신 장비비','서버·네트워크·PC','억원'],
    ['c37_equip_security','보안·관제·방송설비비','CCTV·방송·출입통제','억원'],
    ['c37_equip_special','특수설비·전문장비비','시설유형별 장비','억원'],
    ['c37_equip_book','도서·콘텐츠·자료 구입비','도서관 등 해당 시','억원'],
    ['c37_equip_ops','운영 개시 초기물품비','소모품·초기 운영물품','억원']
  ]}
];

var PERIOD12_ITEMS = [
  ['pp_basic_plan','기본계획 수립',2,'사업계획 입안','사업부서'],
  ['pp_midterm','중기지방재정계획 반영',2,'중기지방재정계획','예산부서'],
  ['pp_property','공유재산 심의',2,'공유재산 및 물품 관리법','재산관리부서'],
  ['pp_feasibility','타당성조사·검토',6,'지방재정법 제37조의2','전문기관'],
  ['pp_review','투자심사',3,'지방재정투자사업 심사규칙 제4조','심사기관'],
  ['pp_design_comp','설계공모·계약',3,'건축서비스산업진흥법','사업부서'],
  ['pp_design','기본·실시설계',9,'설계용역','사업부서'],
  ['pp_consult','인증·관계기관 협의',3,'BF·녹색·에너지·교통 등','관계기관'],
  ['pp_permit','인허가',2,'건축허가 등','인허가부서'],
  ['pp_bid','발주·계약',2,'지방계약법','계약부서'],
  ['pp_construct','공사',24,'착공~준공','시공사'],
  ['pp_closeout','준공·개관 준비',2,'준공검사·이전·개관','사업부서']
];

function renderCalc(r) {
  var emptyEl=v('empty-calc'), boxEl=v('calc-box');
  if(!boxEl) return;
  if(!r){if(emptyEl)emptyEl.style.display='block'; boxEl.style.display='none'; return;}
  if(emptyEl) emptyEl.style.display='none';
  boxEl.style.display='block';

  var cost=r.cost||0;
  var h='';
  var detail=(typeof getCalcMode==='function')&&getCalcMode()==='detail';

  if(!detail){
  /* 1. 사업비 자동 산출 (메인) — 약식 모드 */
  h+='<div class="calc-section">';
  h+='<div class="calc-section-title">&#128181; 사업비 자동 산출</div>';
  h+='<div class="phase2-note">&#128200; 사업유형 선택 시 서울시 가이드라인(2024) 단가가 자동 적용됩니다. 연면적을 입력하면 공사비 및 관련 비용이 자동 산출됩니다.</div>';

  h+='<div class="calc-row">';
  h+='<div class="calc-field"><div class="calc-label">연면적 <span class="req">필수</span></div>';
  h+='<div class="calc-input-wrap"><input type="number" class="calc-input" id="ci_area" placeholder="예: 5580" oninput="recalcCost()" onchange="recalcCost()"><span class="calc-unit">㎡</span></div></div>';
  h+='<div class="calc-field"><div class="calc-label">단위 공사비</div>';
  h+='<div class="calc-input-wrap"><div class="calc-input" style="background:var(--pbp);border:1px solid rgba(0,60,150,.2);padding:5px 8px;font-weight:700;color:var(--pb);min-width:80px" id="ci_unit_display">-</div><span class="calc-unit">천원/㎡</span></div>';
  h+='<div style="font-size:10px;color:var(--g400)">기본정보 탭에서 사업유형 선택 시 자동 적용</div></div>';
  h+='</div>';

  h+='<div class="calc-row">';
  h+='<div class="calc-field"><div class="calc-label">보상비 (용지·이주 등)</div>';
  h+='<div class="calc-input-wrap"><input type="number" class="calc-input" id="ci_land" placeholder="0" oninput="syncLegacyLand();recalcCost()" onchange="syncLegacyLand();recalcCost()"><span class="calc-unit">억원</span></div></div>';
  h+='<div class="calc-field"><div class="calc-label">기본정보 총사업비 <span style="font-size:10px;color:var(--g400)">(비교용)</span></div>';
  h+='<div class="calc-input-wrap"><input type="number" class="calc-input" id="f_cost_calc" value="'+cost+'" oninput="checkCostDiff()" onchange="checkCostDiff()"><span class="calc-unit">억원</span></div></div>';
  h+='</div>';

  h+='<div class="calc-row">';
  h+='<div class="calc-field"><div class="calc-label">ZEB 적용</div>';
  h+='<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="ci_zero_energy" onchange="recalcCost()"> 연면적 500㎡ 이상 적용 (건축공사비 +5%)</label></div>';
  h+='<div class="calc-field"><div class="calc-label">예비비</div>';
  h+='<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="ci_reserve_apply" checked onchange="recalcCost()"> 예비비 10% 포함</label></div>';
  h+='</div>';

  h+='<div class="calc-row">';
  h+='<div class="calc-field"><div class="calc-label">설계비 단계 구분</div>';
  h+='<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="ci_design_split" onchange="recalcCost()"> 기본설계(35%)·실시설계(65%) 분리 산출</label></div>';
  h+='<div class="calc-field"><div class="calc-label">용역비 자동산출 항목</div>';
  h+='<div style="font-size:10px;color:var(--g500);line-height:1.5">설계비(공사비 요율 체감) · 감리/CM(요율) · 설계의도구현(설계비 5%) · 조사측량(공사비 1%) · 교통영향평가(7천㎡↑ 0.3%) · 미술작품(1만㎡↑ 0.7%) · 타당성조사 용역(500억↑) — 개략 참고치이며 각 항목에서 직접 수정 가능</div></div>';
  h+='</div>';

  h+='<div class="calc-row">';
  h+='<div class="calc-field"><div class="calc-label">감리·CM 방식</div>';
  h+='<select class="calc-select" id="ci_cm_type" onchange="recalcCost()">';
  h+='<option value="cm_normal">전면책임감리 (보통, 10.73%)</option>';
  h+='<option value="cm_complex">전면책임감리 (복잡, 13.5%)</option>';
  h+='<option value="cm_none">CM 미적용</option>';
  h+='</select></div>';
  h+='<div class="calc-field"><div class="calc-label">건물 종별 (설계요율)</div>';
  h+='<select class="calc-select" id="ci_bldg_type" onchange="recalcCost()">';
  h+='<option value="type3">제3종 (공공청사·문화체육·운동시설)</option>';
  h+='<option value="type2">제2종 (일반건축물)</option>';
  h+='</select></div>';
  h+='</div>';

  h+='<div id="cm-mandatory-warn" class="calc-warn" style="display:none">&#9888; 총사업비 200억 이상 또는 연면적 5,000㎡ 이상 — CM·감리 적용 여부 검토 필요</div>';
  h+='<div id="calc-result-area"></div>';
  h+='<div class="calc-source">근거: 서울시 공공건축물 건립 공사비 책정 가이드라인(2024, 기술심사담당관) | 엔지니어링사업대가 기준(별표1) | 지방재정 투자심사 운영기준</div>';
  h+='</div>';
  } else {
  /* 1. 세부 산출 모드 안내 */
  h+='<div class="calc-section">';
  h+='<div class="calc-section-title">&#128203; 사업비 세부 산출 모드</div>';
  h+='<div class="phase2-note">기본정보에서 「세부 산출」을 선택했습니다. 아래 37항목 산출내역에 직접 입력하세요. 서울시 단가 약식 산출과 용역비 자동 채움은 적용되지 않습니다.</div>';
  h+='<div class="calc-row">';
  h+='<div class="calc-field"><div class="calc-label">기본정보 총사업비 <span style="font-size:10px;color:var(--g400)">(비교용)</span></div>';
  h+='<div class="calc-input-wrap"><input type="number" class="calc-input" id="f_cost_calc" value="'+cost+'" oninput="checkCostDiff()" onchange="checkCostDiff()"><span class="calc-unit">억원</span></div></div>';
  h+='<div class="calc-field"><div class="calc-label">예비비</div>';
  h+='<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="ci_reserve_apply" checked onchange="recalcCost()"> 예비비 10% 포함 (운영기준 총사업비 산정)</label></div>';
  h+='</div>';
  h+='<div id="cm-mandatory-warn" class="calc-warn" style="display:none">&#9888; 총사업비 200억 이상 또는 연면적 5,000㎡ 이상 — CM·감리 적용 여부 검토 필요</div>';
  h+='<div id="calc-result-area"></div>';
  h+='<div class="calc-source">근거: 지방재정 투자심사 운영기준 — 총사업비는 공사비·보상비·시설부대경비·운영설비비·제세공과금·예비비(10%)를 포함하여 산정</div>';
  h+='</div>';
  }

  /* 2. 37항목 세부 산출내역 (약식: 접이식 선택 / 세부: 기본 펼침) */
  h+='<div class="calc-section" style="margin-top:12px">';
  h+='<div class="calc-section-title" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center" onclick="toggleC37()">';
  h+='<span>&#128203; 37항목 세부 산출내역 <span style="font-size:10px;font-weight:400;color:var(--g400)">'+(detail?'(세부 산출 모드 · 직접 입력)':'(의뢰서 2장 작성용 · 선택)')+'</span></span>';
  h+='<span id="c37-arrow" style="font-size:12px;transition:transform .2s'+(detail?';transform:rotate(180deg)':'')+'">&#9660;</span>';
  h+='</div>';
  h+='<div id="c37-wrap" style="display:'+(detail?'block':'none')+'">';
  h+='<div class="phase2-note" style="margin:8px 0">'+(detail?'&#9432; 설계 산출내역·견적 자료를 근거로 각 항목의 산출근거·수량·단가를 직접 입력하세요. 합계가 자동 집계되어 기본정보 총사업비와 비교됩니다.':'&#9432; 분야별 공사비(토목·기계·전기 등)는 실시설계 완료 후 정확한 산출이 가능합니다. 위 자동 산출 결과를 건축공사비 항목에 입력하고, 나머지는 설계 완료 후 보완하세요.')+'</div>';
  for(var gi=0;gi<COST37_GROUPS.length;gi++){
    var g=COST37_GROUPS[gi];
    h+='<div class="cost37-group" data-group="'+g.key+'">';
    h+='<div class="cost37-group-title"><span>'+g.title+'</span><span id="sum-'+g.key+'">0.0억원</span></div>';
    h+='<div class="cost37-row head"><div>항목</div><div>산출근거</div><div>수량</div><div>단가</div><div>금액</div></div>';
    for(var ii=0;ii<g.items.length;ii++){
      var it=g.items[ii];
      h+='<div class="cost37-row">';
      h+='<div>'+it[1]+'</div>';
      h+='<input class="cost37-input" id="'+it[0]+'_basis" placeholder="'+it[2]+'" oninput="recalcCost()">';
      h+='<input type="number" class="cost37-input" id="'+it[0]+'_qty" placeholder="1" oninput="recalcCost()">';
      h+='<input type="number" class="cost37-input" id="'+it[0]+'_unit" placeholder="억원" oninput="recalcCost()">';
      h+='<div class="cost37-amount" id="'+it[0]+'_amount">0.0억원</div>';
      h+='</div>';
    }
    h+='</div>';
  }
  h+='<button class="calc-btn" onclick="recalcCost()" style="margin-top:8px">&#128202; 37항목 합계 재계산</button>';
  h+='</div>';
  h+='</div>';

  /* 3. 사업기간 계산기 12단계 */
  h+='<div class="calc-section" style="margin-top:12px">';
  h+='<div class="calc-section-title">&#128197; 사업기간 계산기 — 12단계</div>';
  h+='<div class="phase2-note">기본계획 수립부터 준공·개관 준비까지 단계별 소요기간을 입력하면 총 사업기간이 자동 산출됩니다.</div>';
  h+='<div class="period12-wrap">';
  h+='<div class="period12-row head"><div>단계</div><div>기간(월)</div><div>법적근거·성격</div><div>승인·협의기관</div></div>';
  for(var pi=0;pi<PERIOD12_ITEMS.length;pi++){
    var p=PERIOD12_ITEMS[pi];
    h+='<div class="period12-row">';
    h+='<div>'+p[1]+'</div>';
    h+='<input type="number" class="period12-input" id="'+p[0]+'" value="'+p[2]+'" min="0" oninput="calcPeriod()" onchange="calcPeriod()">';
    h+='<input class="period12-input" id="'+p[0]+'_basis" value="'+p[3]+'" oninput="calcPeriod()">';
    h+='<input class="period12-input" id="'+p[0]+'_dept" value="'+p[4]+'" oninput="calcPeriod()">';
    h+='</div>';
  }
  h+='</div>';
  h+='<div style="display:flex;gap:8px;margin-top:10px">';
  h+='<button class="calc-btn" style="flex:1" onclick="calcPeriod()">&#128197; 사업기간 산출</button>';
  h+='<button class="calc-btn" style="flex:1;background:var(--g100);color:var(--g700)" onclick="autoEstimatePeriod()">&#9881; 자동 추정</button>';
  h+='</div>';
  h+='<div id="period-result-area" style="margin-top:10px"></div>';
  h+='</div>';

  boxEl.innerHTML = h;
  restoreUnitFromType();
  recalcCost();
  calcPeriod();
}

function toggleC37(){
  var wrap=v('c37-wrap'), arrow=v('c37-arrow');
  if(!wrap) return;
  var open=wrap.style.display!=='none';
  wrap.style.display=open?'none':'block';
  if(arrow) arrow.style.transform=open?'':'rotate(180deg)';
}


function c37Val(id){
  var qtyEl=v(id+'_qty'), unitEl=v(id+'_unit');
  var q=parseFloat(qtyEl&&qtyEl.value!==''?qtyEl.value:1)||0;
  var u=parseFloat(unitEl&&unitEl.value!==''?unitEl.value:0)||0;
  return q*u;
}

function setC37Auto(id,val,basis){
  var qty=v(id+'_qty'), unit=v(id+'_unit'), bas=v(id+'_basis');
  if(qty && !qty.value) qty.value=1;
  if(unit && (unit.value===''||unit.getAttribute('data-auto')==='1')){
    unit.value=val>0?val.toFixed(2):'';
    unit.setAttribute('data-auto','1');
  }
  if(bas && basis && !bas.value) bas.value=basis;
}

function syncLegacyLand(){
  var land=gnv('ci_land')||0;
  var unit=v('c37_land_buy_unit'), qty=v('c37_land_buy_qty'), bas=v('c37_land_buy_basis');
  if(land>0 && unit && !unit.value){ if(qty&&!qty.value)qty.value=1; unit.value=land; if(bas&&!bas.value)bas.value='기존 보상비 간편 입력'; }
}

function recalcCost() {
  var area=gnv('ci_area')||0;
  var unit=gnv('ci_unit')||0;
  var zeb=gc('ci_zero_energy');
  var reserveApply=gc('ci_reserve_apply');
  var cmType=gsv('ci_cm_type')||'cm_normal';
  var bldgType=gsv('ci_bldg_type')||'type3';
  var fCost=gnv('f_cost')||0;
  var autoFill=!((typeof getCalcMode==='function')&&getCalcMode()==='detail');
  var ud=v('ci_unit_display'); if(ud) ud.textContent=unit>0?unit.toLocaleString():'-';
  var constBase=(area>0&&unit>0)?area*unit/100000:0;
  var zebAdj=(zeb&&area>=500)?constBase*0.05:0;
  if(autoFill&&constBase>0) setC37Auto('c37_const_arch', constBase, area.toLocaleString()+'㎡ × '+unit.toLocaleString()+'천원/㎡');
  if(autoFill&&zebAdj>0) setC37Auto('c37_const_zeb', zebAdj, '건축공사비 × 5%');

  var constructionBase=0;
  ['c37_const_civil','c37_const_arch','c37_const_mech','c37_const_elec','c37_const_comm','c37_const_fire','c37_const_landscape','c37_const_zeb'].forEach(function(id){ constructionBase+=c37Val(id); });
  var rates=(bldgType==='type2')?[[10,6.5],[20,5.8],[50,5.1],[100,4.6],[200,4.1],[500,3.8],[1000,3.5],[9999,3.2]]:[[10,7.2],[20,6.5],[50,5.8],[100,5.2],[200,4.7],[500,4.3],[1000,3.9],[9999,3.5]];
  var designRate=rates[rates.length-1][1];
  for(var ri=0;ri<rates.length;ri++){ if(constructionBase<=rates[ri][0]){designRate=rates[ri][1];break;} }
  /* ▼ 용역비 자동 산출 (개략 요율 — 참고용, 각 항목에서 직접 수정 가능) */
  var designFeeAll=constructionBase>0?constructionBase*designRate/100:0;
  var rateLbl=(bldgType==='type2'?'제2종':'제3종')+' 설계요율 '+designRate+'%';
  if(autoFill&&designFeeAll>0){
    if(gc('ci_design_split')){
      setC37Auto('c37_design_basic',  designFeeAll*0.35, rateLbl+' × 기본설계분 35%');
      setC37Auto('c37_design_detail', designFeeAll*0.65, rateLbl+' × 실시설계분 65%');
    } else {
      setC37Auto('c37_design_detail', designFeeAll, rateLbl+' (기본+실시 통합)');
    }
    setC37Auto('c37_design_intent', designFeeAll*0.05, '설계의도 구현비: 설계비 × 5% (개략)');
    setC37Auto('c37_design_survey', constructionBase*0.01, '조사·측량비: 공사비 × 1% (운영기준 총사업비 항목 예시)');
  }
  var cmRate=cmType==='cm_complex'?13.5:(cmType==='cm_normal'?10.73:0);
  if(autoFill&&constructionBase>0&&cmRate>0) setC37Auto('c37_cm_normal', (constructionBase/1.1)*cmRate/100, '공사비/1.1 × '+cmRate+'%');
  if(autoFill&&area>=7000) setC37Auto('c37_facility_impact', constructionBase*0.003, '교통영향평가 검토: 공사비 × 0.3%');
  if(autoFill&&area>=10000&&constBase>0) setC37Auto('c37_facility_art', constBase*0.007, '미술작품 설치비: 건축공사비 × 0.7% (문화예술진흥법 제9조, 연면적 1만㎡ 이상)');
  if(autoFill&&fCost>=500) setC37Auto('c37_design_pm', 1.5, '타당성조사 용역(개략 1.5억): 500억 이상 신규사업 — 행안부 고시 전문기관 견적 확인 필요');

  var groupTotals={}, totalBeforeReserve=0, reserveBase=0, rows=[];
  COST37_GROUPS.forEach(function(g){
    var sum=0;
    g.items.forEach(function(it){
      var val=c37Val(it[0]);
      sum+=val;
      var amt=v(it[0]+'_amount'); if(amt) amt.textContent=val.toFixed(1)+'억원';
      rows.push({id:it[0], label:it[1], group:g.title.replace(/ \\d+항목/,'').replace(/ 8항목/,'').replace(/ 3항목/,'').replace(/ 6항목/,''), amount:val, basis:gv(it[0]+'_basis')});
    });
    groupTotals[g.key]=sum;
    var el=v('sum-'+g.key); if(el) el.textContent=sum.toFixed(1)+'억원';
    totalBeforeReserve+=sum;
  });
  reserveBase=(groupTotals.land||0)+(groupTotals.construction||0)+(groupTotals.facility||0)+(groupTotals.equipment||0);
  var reserveFee=reserveApply?reserveBase*0.1:0;
  var totalCalc=totalBeforeReserve+reserveFee;
  var cmWarn=v('cm-mandatory-warn');
  if(cmWarn) cmWarn.style.display=(totalCalc>=200||area>=5000)?'block':'none';

  var h='<div class="calc-result-box">';
  h+='<div class="calc-result-title">37항목 사업비 산출 결과</div>';
  h+='<table class="econ-table"><tr><th>구분</th><th>금액(억원)</th><th>비고</th></tr>';
  COST37_GROUPS.forEach(function(g){ h+='<tr><td>'+g.title+'</td><td>'+groupTotals[g.key].toFixed(1)+'</td><td>'+g.items.length+'개 항목</td></tr>'; });
  h+='<tr><td>예비비</td><td>'+reserveFee.toFixed(1)+'</td><td>'+(reserveApply?'적용: 기준액 '+reserveBase.toFixed(1)+'억 × 10%':'미적용')+'</td></tr>';
  h+='</table>';
  h+='<div class="calc-result-total"><div class="calc-result-label" style="font-weight:700">총사업비 산출액</div><div class="calc-result-val" style="font-size:18px;color:var(--pb)">'+totalCalc.toFixed(1)+'억원</div><div class="calc-result-basis">37개 입력항목 + 예비비</div></div>';
  if(fCost>0){
    var diff=Math.abs(totalCalc-fCost), diffPct=(diff/fCost*100).toFixed(1);
    if(diff>fCost*0.1){
      h+='<div class="calc-warn" id="cost-diff-warn" style="margin-top:10px">&#9888; 입력 총사업비('+fCost+'억)와 계산값('+totalCalc.toFixed(1)+'억)의 차이가 '+diffPct+'%입니다.';
      h+='<button onclick="applyCostFromCalc('+totalCalc.toFixed(1)+')" style="margin-left:8px;padding:3px 10px;background:var(--pb);color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px">계산값으로 적용</button></div>';
    }
  }
  h+='</div>';
  var ra=v('calc-result-area'); if(ra) ra.innerHTML=h;
  window.gCalcTotal=totalCalc;
  projectData.cost={area:area,unitCost:unit,items:rows,groupTotals:groupTotals,reserveFee:reserveFee,calculatedTotal:totalCalc};
  updateSummary();
}

function calcPeriod() {
  var total=0, rows=[];
  PERIOD12_ITEMS.forEach(function(p){
    var months=gnv(p[0])||0;
    total+=months;
    rows.push({id:p[0], label:p[1], months:months, basis:gv(p[0]+'_basis')||p[3], dept:gv(p[0]+'_dept')||p[4]});
  });
  var h='<div class="calc-result-box"><div class="calc-result-title">12단계 사업기간 산출 결과</div>';
  h+='<table class="econ-table"><tr><th>단계</th><th>기간</th><th>근거·성격</th><th>기관</th></tr>';
  rows.forEach(function(r){ h+='<tr><td>'+r.label+'</td><td>'+r.months+'개월</td><td>'+r.basis+'</td><td>'+r.dept+'</td></tr>'; });
  h+='</table><div class="period12-total"><span>총 사업기간</span><span>'+total+'개월 ('+Math.floor(total/12)+'년 '+(total%12)+'개월)</span></div>';
  h+='<button onclick="applyPeriodToForm('+total+','+(gnv('pp_construct')||0)+')" style="margin-top:10px;width:100%;padding:8px;background:var(--pb);color:#fff;border:none;border-radius:var(--rs);font-size:12px;font-weight:700;cursor:pointer">&#8593; 의뢰서 1-5 및 3장 추진계획에 반영</button>';
  h+='</div>';
  var pa=v('period-result-area'); if(pa) pa.innerHTML=h;
  gPeriodTotal=total;  /* 전역 저장 — updateSummary 등 참조 */
  projectData.period={totalMonths:total, steps:rows};
  updateSummary();
}

function autoEstimatePeriod() {
  var cost = gnv('f_cost')||0;
  var p = estimatePeriod(cost, gsv('f_type'));
  Object.keys(p.steps).forEach(function(id){ var el=v(id); if(el) el.value=p.steps[id]; });
  calcPeriod();
}

function applyPeriodToForm(total, construct) {
  sv('pp_construct', construct);
  var el=v('pp_construct'); if(el) el.value=construct;
  alert('사업기간 '+total+'개월이 의뢰서 1-5항에 반영됩니다.\n의뢰서 초안 탭에서 확인하세요.');
  renderDraft(gResult);
}

function checkCostDiff() {
  recalcCost();
}




function applyCostFromCalc(val) {
  sv('f_cost', val);
  var el = v('f_cost');
  if(el){ el.value = val; el.style.background='#e8f5e9'; setTimeout(function(){el.style.background='';},1000); }
  v('cost-diff-warn') && (v('cost-diff-warn').style.display='none');
}

function estimatePeriod(cost, type) {
  var officeLike = type === 'office' || type === 'culture' || type === 'complex';
  var steps = {
    pp_basic_plan: 2,
    pp_midterm: 2,
    pp_property: officeLike ? 2 : 1,
    pp_feasibility: cost >= 500 ? 6 : 0,
    pp_review: 3,
    pp_design_comp: officeLike ? 3 : 1,
    pp_design: cost < 100 ? 6 : cost < 300 ? 9 : 12,
    pp_consult: officeLike ? 3 : 2,
    pp_permit: 2,
    pp_bid: 2,
    pp_construct: cost < 50 ? 12 : cost < 100 ? 18 : cost < 200 ? 24 : cost < 500 ? 30 : 36,
    pp_closeout: 2
  };
  var total = 0;
  Object.keys(steps).forEach(function(key){ total += steps[key]; });
  return {
    steps: steps,
    total: total,
    construct: steps.pp_construct,
    design: steps.pp_design,
    review: steps.pp_review,
    permit: steps.pp_permit
  };
}

function downloadDocx() {
  if(!gResult){alert('먼저 투자심사 판단을 실행하세요.');return;}
  if(typeof docx==='undefined'){
    if(window.gDocxError){
      if(confirm('Word 라이브러리 로드 실패.\n[확인] 재시도  [취소] 인쇄(PDF)')){
        window.gDocxError=false;
        var s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/docx@9.6.1/dist/index.iife.js';
        s.onload=function(){window.gDocxReady=true;downloadDocx();};
        s.onerror=function(){window.gDocxError=true;alert('재시도 실패. 인쇄 기능을 이용하세요.');};
        document.head.appendChild(s);
      } else { window.print(); }
    } else {
      var retryBtn=event&&event.target?event.target:null;
      if(retryBtn){retryBtn.textContent='로딩 중...';retryBtn.disabled=true;}
      var cnt=0,timer=setInterval(function(){
        cnt++;
        if(typeof docx!=='undefined'){clearInterval(timer);if(retryBtn){retryBtn.textContent='Word 다운로드';retryBtn.disabled=false;}downloadDocx();}
        else if(cnt>=10){clearInterval(timer);if(retryBtn){retryBtn.textContent='Word 다운로드';retryBtn.disabled=false;}alert('로드 시간 초과. 인터넷 연결을 확인하세요.');}
      },500);
    }
    return;
  }

  var btn=event&&event.target?event.target:null;
  if(btn){btn.disabled=true;btn.textContent='생성 중...';}

  function getSec(num){
    /* Phase 6 구조: contenteditable id 기반으로 직접 읽기 */
    var cleanNum=num.replace(/\.$/,'').replace(/\./g,'');
    var directEl=document.getElementById('sec-'+cleanNum.replace(/-/g,'_')+'_content');
    if(directEl) return (directEl.innerText||directEl.textContent||'').trim();
    var key=num.replace('.','');
    var ns=document.querySelectorAll('#draft-box .draft-section-num');
    var cs=document.querySelectorAll('#draft-box .draft-content');
    for(var i=0;i<ns.length;i++){
      if(ns[i].textContent.replace(/\./g,'').trim()===key&&cs[i])
        return cs[i].innerText||cs[i].textContent||'';
    }
    return '';
  }

  var r=gResult,cost=r.cost||0,nat=r.nat||0,prov=r.prov||0;
  var city=Math.max(0,cost-nat-prov);
  var natPct=cost>0?Math.round(nat/cost*100):0;
  var citPct=cost>0?Math.round(city/cost*100):0;
  var now=new Date();
  var today=now.getFullYear()+'년 '+(now.getMonth()+1)+'월 '+now.getDate()+'일';
  var name=gv('f_name')||'(사업명 미입력)';
  var authLabel={self:'파주시 자체심사',gyeonggi:'경기도 의뢰심사',
    central:'행정안전부 의뢰심사'}[r.auth.type]||r.auth.label;
  var typeMap={general:'일반투자사업',office:'청사 신축사업',
    culture:'문화.체육시설',complex:'복합시설',promo:'홍보관',
    event:'행사성',debt:'채무부담행위',joint:'공동협력'};
  var typeTxt=typeMap[r.type]||r.type;

  var D=docx;
  var AT=D.AlignmentType,BS=D.BorderStyle,WT=D.WidthType,VA=D.VerticalAlign,SH=D.ShadingType;
  var FB='HY신명조',FT='HY헤드라인M',FL='Times New Roman';
  var CB='003C96',CT='1A1A1A',CR='CC0000';
  var CW=9638;
  var bd={style:BS.SINGLE,size:4,color:CB};
  var tb={style:BS.SINGLE,size:2,color:'BBBBBB'};

  function rn(text,o){o=o||{};return new D.TextRun({text:text||'',font:{name:o.latin||FL,eastAsia:o.font||FB},size:(o.size||10)*2,bold:o.bold||false,color:o.color||CT});}
  function pr(children,o){o=o||{};return new D.Paragraph({alignment:o.align||AT.LEFT,spacing:{before:o.before||40,after:o.after||40,line:o.line||276,lineRule:'auto'},children:Array.isArray(children)?children:[children]});}
  function cl(content,o){o=o||{};var ch=Array.isArray(content)?content:[pr(rn(content,{font:FB,size:o.size||9,bold:o.bold||false,color:o.color||CT}),{align:o.align||AT.CENTER,before:60,after:60})];
    return new D.TableCell({width:{size:o.width||1000,type:WT.DXA},borders:o.borders||{top:tb,bottom:tb,left:tb,right:tb},shading:o.bg?{fill:o.bg,type:SH.CLEAR}:undefined,verticalAlign:VA.CENTER,columnSpan:o.span||1,margins:{top:60,bottom:60,left:80,right:80},children:ch});}
  function hcl(t,w,span){return cl(t,{width:w,span:span,bg:CB,color:'FFFFFF',bold:true,size:9,borders:{top:bd,bottom:bd,left:bd,right:bd}});}
  function toParas(text){if(!text)return[pr(rn('',{size:10}))];return text.split('\n').map(function(line){var t=line.replace(/^\s+/,'');return pr(rn(t,{font:FB,size:10,color:(t.indexOf('[담당자')>=0||t.indexOf('[AI로')>=0||t.indexOf('[경제성')>=0)?CR:CT}),{before:30,after:20,line:280});});}
  function chT(text){return[pr(rn(text,{font:FT,size:13,bold:true,color:CB}),{before:180,after:80,line:320}),new D.Paragraph({border:{bottom:{style:BS.SINGLE,size:8,color:CB}},spacing:{before:0,after:100},children:[]})];}
  function secD(num,title,txt){var rows=[pr([rn(num+'. ',{font:FB,size:11,bold:true,color:CB}),rn(title,{font:FB,size:11,bold:true})],{before:120,after:60,line:300})];return rows.concat(toParas(txt));}

  var ch=[];
  ch.push(pr(rn('지방재정 투자심사 의뢰서',{font:FT,latin:'Arial',size:18,bold:true,color:CB}),{align:AT.CENTER,before:0,after:120,line:400}));
  ch.push(pr(rn(name,{font:FB,size:13,bold:true}),{align:AT.CENTER,before:0,after:200}));
  ch.push(new D.Table({width:{size:CW,type:WT.DXA},columnWidths:[1500,2000,1500,2000,1500,1138],rows:[
    new D.TableRow({children:[hcl('심사기관',1500),cl(authLabel,{width:2000}),hcl('총사업비',1500),cl(cost+'억원',{width:2000}),hcl('심사구분',1500),cl(r.reviewType==='re'?'재심사':'신규',{width:1138})]}),
    new D.TableRow({children:[hcl('국비',1500),cl(nat+'억('+natPct+'%)',{width:2000}),hcl('도비',1500),cl(prov+'억',{width:2000}),hcl('시비',1500),cl(city+'억('+citPct+'%)',{width:1138})]}),
    new D.TableRow({children:[hcl('법령근거',1500),cl(r.auth.law||'',{width:8138,span:5,align:AT.LEFT})]}),
    new D.TableRow({children:[hcl('사업단계',1500),cl(({plan:'사업계획',basic:'기본설계중',basic_done:'기본설계완료',detail:'실시설계중',detail_done:'실시설계완료'}[gv('f_stage')])||'사업계획',{width:2000}),hcl('타당성조사',1500),cl(cost>=500?'의무 대상':'미해당',{width:2000}),hcl('사업유형',1500),cl(typeTxt,{width:1138})]}),
  ]}));
  ch.push(pr(rn(''),{before:200}));

  chT('1. 사업개요').forEach(function(p){ch.push(p);});
  [['1-1','추진목적'],['1-2','시행근거'],['1-3','시행주체'],['1-4','사업위치'],
   ['1-5','사업기간'],['1-6','사업량'],['1-7','총사업비'],['1-8','사업추진절차'],['1-9','기대효과']
  ].forEach(function(s){secD(s[0],s[1],getSec(s[0]+'.')).forEach(function(p){ch.push(p);});ch.push(pr(rn(''),{before:60}));});

  /* ── 2장 사업비 산출내역 (산출방식 연동 표) ── */
  ch.push(new D.Paragraph({children:[new D.PageBreak()]}));
  chT('2. 사업비 산출내역').forEach(function(p){ch.push(p);});
  (function(){
    var d2=buildCh2Data(r);
    function cellParas(t,sz){
      return String(t||'').split('\n').map(function(l){
        return pr(rn(l,{font:FB,size:sz||8.5,color:(l.indexOf('[담당자')>=0||l.indexOf('[사업비')>=0)?CR:CT}),{align:AT.LEFT,before:30,after:20,line:240});
      });
    }
    ch.push(pr(rn('◦ 작성 기준: '+(d2.mode==='simple'?'약식 산출 — 서울시 공공건축물 건립 공사비 책정 가이드라인(2024) 단가 × 연면적':'세부 산출 — 37항목 산출내역 직접 입력값'),{font:FB,size:9,bold:true}),{before:40,after:60}));
    var trs=[new D.TableRow({children:[hcl('구 분',1300),hcl('세부 산출내역',4738),hcl('금액(억원)',1300),hcl('비 고',2300)]})];
    trs.push(new D.TableRow({children:[
      cl('총 계',{width:1300,bold:true}),
      cl(cellParas(d2.mode==='simple'?'약식 산출 합계 (실시설계 후 세부 산출로 보완)':'37항목 세부 산출내역 합계',9),{width:4738}),
      cl(String(Math.round(d2.total)),{width:1300,bold:true}),
      cl('직전년도 말 기준 불변가격',{width:2300,size:8})
    ]}));
    d2.rows.forEach(function(rw){
      trs.push(new D.TableRow({children:[
        cl(rw.g,{width:1300,bold:true,size:9}),
        cl(cellParas(rw.d),{width:4738}),
        cl(rw.a>0?rw.a.toFixed(1):'-',{width:1300,size:9}),
        cl(rw.n||'',{width:2300,size:8})
      ]}));
    });
    ch.push(new D.Table({width:{size:CW,type:WT.DXA},columnWidths:[1300,4738,1300,2300],rows:trs}));
    d2.notes.forEach(function(n){ch.push(pr(rn('※ '+n,{font:FB,size:8,color:'666666'}),{before:30,after:10,line:230}));});
  })();

  /* ── 3장 세부사업 추진계획 및 일정 (12단계 연동 표) ── */
  ch.push(new D.Paragraph({children:[new D.PageBreak()]}));
  chT('3. 세부사업 추진계획 및 일정').forEach(function(p){ch.push(p);});
  (function(){
    var d3=buildCh3Data(r);
    if(d3.rows.length===0){
      ch.push(pr(rn('[사업비·기간 탭의 12단계 사업기간 계산기에서 단계별 기간을 입력하면 자동 작성됩니다]',{font:FB,size:9,color:CR}),{before:40,after:60}));
    } else {
      var trs=[new D.TableRow({children:[hcl('구분',1000),hcl('사업내용',1500),hcl('법적근거',1800),hcl('추진기간',1900),hcl('세부추진내용',2438),hcl('승인기관',1000)]})];
      d3.rows.forEach(function(rw){
        trs.push(new D.TableRow({children:[
          cl(rw.cat,{width:1000,size:8}),
          cl(rw.label,{width:1500,size:8,bold:true}),
          cl(rw.basis,{width:1800,size:8}),
          cl(rw.period,{width:1900,size:8}),
          cl(rw.detail,{width:2438,size:8,align:AT.LEFT}),
          cl(rw.dept,{width:1000,size:8})
        ]}));
      });
      trs.push(new D.TableRow({children:[
        cl('계',{width:1000,bold:true,size:9}),
        cl('총 사업기간',{width:1500,bold:true,size:9}),
        cl('',{width:1800}),
        cl(d3.total+'개월 ('+Math.floor(d3.total/12)+'년 '+(d3.total%12)+'개월)',{width:1900,bold:true,size:9}),
        cl('',{width:2438}),cl('',{width:1000})
      ]}));
      ch.push(new D.Table({width:{size:CW,type:WT.DXA},columnWidths:[1000,1500,1800,1900,2438,1000],rows:trs}));
    }
    ch.push(pr(rn('※ 사업추진상 구분은 계획 입안, 협의(법적), 사전영향평가, 사업승인, 보상, 설계(기본·실시), 공사 등 단계적·추진순서대로 기재',{font:FB,size:8,color:'666666'}),{before:30,after:10,line:230}));
  })();

  /* ── 4장 사전절차 ── */
  ch.push(new D.Paragraph({children:[new D.PageBreak()]}));
  chT('4. 사전절차').forEach(function(p){ch.push(p);});
  [['4-1','중기지방재정계획'],['4-2','지방재정영향평가'],
   ['4-3','관계기관 협의'],['4-4','타당성조사']
  ].forEach(function(s){
    secD(s[0],s[1],getSec(s[0]+'.')).forEach(function(p){ch.push(p);});
    ch.push(pr(rn(''),{before:60}));
  });

  /* ── 5장 투자심사 자료 ── */
  ch.push(new D.Paragraph({children:[new D.PageBreak()]}));
  chT('5. 투자심사 자료').forEach(function(p){ch.push(p);});
  [['5-1','사업의 필요성 및 시급성'],['5-2','국가계획 부합성'],['5-3','주민 숙원도 및 수혜도'],
   ['5-4','사업의 파급효과'],['5-5','경제적 수익성 및 타당성'],['5-6','재원조달 가능 여부'],
   ['5-7','사업추진 준비상황'],['5-8','문제점 및 대책'],['5-9','기타']
  ].forEach(function(s,i){
    secD(s[0],s[1],getSec(s[0]+'.')).forEach(function(p){ch.push(p);});
    ch.push(pr(rn(''),{before:80}));
    if(i===3)ch.push(new D.Paragraph({children:[new D.PageBreak()]}));
  });

  /* ── 6장 운영계획 ── */
  ch.push(new D.Paragraph({children:[new D.PageBreak()]}));
  chT('6. 운영계획').forEach(function(p){ch.push(p);});
  [['6-1','기구 및 조직'],['6-2','사업수지 전망'],['6-3','세부시설 운영계획']
  ].forEach(function(s){
    secD(s[0],s[1],getSec(s[0]+'.')).forEach(function(p){ch.push(p);});
    ch.push(pr(rn(''),{before:60}));
  });

  /* ── 7장 유형별 추가자료 (청사·복합·체육만) ── */
  if(r.type==='office'||r.type==='complex'||r.type==='culture'){
    ch.push(new D.Paragraph({children:[new D.PageBreak()]}));
    chT('7. 유형별 추가자료').forEach(function(p){ch.push(p);});
    secD('7-2','유형별 추가자료',getSec('7-2.')).forEach(function(p){ch.push(p);});
  }

    var doc=new D.Document({
    styles:{default:{document:{run:{font:FL,eastAsiaFont:FB,size:20,color:CT}}}},
    sections:[{
      properties:{page:{size:{width:11906,height:16838},margin:{top:1134,bottom:1134,left:1134,right:1134}}},
      headers:{default:new D.Header({children:[pr([rn('파주시 지방재정 투자심사 의뢰서  |  '+name,{font:FB,size:8,color:'888888'})],{align:AT.RIGHT,before:0,after:0})]})},
      footers:{default:new D.Footer({children:[pr([rn('파주시 AI 혁신동아리 ACE팀  |  생성일: '+today,{font:FB,size:8,color:'888888'})],{align:AT.CENTER,before:0,after:0})]})},
      children:ch
    }]
  });

  D.Packer.toBlob(doc).then(function(blob){
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;
    var safe=name.replace(/[\/\\:*?"<>|]/g,'_');
    a.download='투자심사_의뢰서_'+safe+'_'+now.getFullYear()+(now.getMonth()+1<10?'0':'')+(now.getMonth()+1)+'.docx';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if(btn){btn.disabled=false;btn.textContent='Word 다운로드';}
  }).catch(function(e){
    if(btn){btn.disabled=false;btn.textContent='Word 다운로드';}
    alert('Word 생성 오류: '+e.message);
  });
}



/* ── Phase 6: 직접 편집 + 개별 AI 작성 ── */
function toggleEdit(contentId){
  var el=v(contentId);
  if(!el) return;
  var isEditing=el.contentEditable==='true';
  if(isEditing){
    el.contentEditable='false';
    el.classList.remove('draft-edit-active');
    /* 편집 완료 후 need 강조 재적용 */
    el.innerHTML=el.innerHTML.replace(
      /(\[담당자[^\]]*\]|\[읍면동[^\]]*\]|\[착공[^\]]*\]|\[준공[^\]]*\])/g,
      '<span class="need">$1</span>');
  } else {
    el.contentEditable='true';
    el.classList.add('draft-edit-active');
    el.focus();
    /* 커서 끝으로 이동 */
    var range=document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

function aiSection(secNum, secTitle){
  if(!gResult){alert('먼저 투자심사 판단을 실행하세요.');return;}
  if(!gKey){alert('AI 설정에서 API Key를 입력하세요.');openSettings();return;}
  var id='sec-'+secNum.replace(/-/g,'_')+'_content';
  var el=v(id);
  if(!el){alert('항목을 찾을 수 없습니다: '+secNum);return;}

  /* 로딩 표시 */
  var origContent=el.innerHTML;
  el.innerHTML='<span style="color:var(--g400)">&#129302; AI 작성 중...</span>';
  el.contentEditable='false';

  var ctx=buildContextPrompt(gResult);
  var sysPrompt=buildSystemPrompt(gResult);
  var taskPrompt=sysPrompt+ctx
    +'\n\n【작성 요청】\n'
    +'의뢰서 '+secNum+' '+secTitle+' 항목을 작성해주세요.\n'
    +'- 마크다운 없이 텍스트만 작성\n'
    +'- 정보가 없는 항목은 [담당자 입력 필요: 내용] 형태로 표시\n'
    +'- ◦ 기호로 항목 구분, 가나다라 소제목 사용\n'
    +'- 3~5문장 분량으로 구체적으로 작성\n'
    +'해당 항목 내용만 작성하고 섹션 제목은 포함하지 마세요.';

  callAI(taskPrompt, function(resp,err){
    if(err){
      el.innerHTML=origContent;
      alert('AI 오류: '+err);
      return;
    }
    var txt=resp.trim();
    /* 줄바꿈 → <br> 변환 */
    txt=txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n/g,'<br>')
      .replace(/(\[담당자[^\]]*\])/g,'<span class="need">$1</span>');
    el.innerHTML=txt;
    el.style.borderLeft='3px solid var(--ok)';
    setTimeout(function(){el.style.borderLeft='';},2000);
  });
}


  /* 스크롤-네비 연동 */
  var scrollEl=document.getElementById('draft-scroll');
  if(scrollEl){
    scrollEl.addEventListener('scroll',function(){
      var anchors=document.querySelectorAll('.draft-chapter-anchor,[id^="sec-"]');
      var active=null;
      anchors.forEach(function(a){if(a.getBoundingClientRect().top<120)active=a.id;});
      if(active){
        document.querySelectorAll('.draft-nav-item').forEach(function(item){
          var onclick=item.getAttribute('onclick')||'';
          item.classList.toggle('active',onclick.indexOf(active)>=0);
        });
      }
    });
  }

  /* [담당자 입력 필요] 빨간색 강조 */
  setTimeout(function(){
    var els=document.querySelectorAll('#draft-box .draft-content');
    els.forEach(function(el){
      if(el.innerHTML.indexOf('class="need"')<0){
        el.innerHTML=el.innerHTML.replace(
          /(\[담당자[^\]]*\]|\[읍면동[^\]]*\]|\[착공[^\]]*\]|\[준공[^\]]*\]|\[보조[^\]]*\]|\[국비[^\]]*\]|\[도비[^\]]*\]|\[기본계획[^\]]*\]|\[공유재산[^\]]*\]|\[중기[^\]]*\]|\[경제성[^\]]*\])/g,
          '<span class="need">$1</span>');
      }
    });
  },150);

function getLaws(type) {
  var common = [
    '「지방재정법」제37조(지방재정투자사업의 타당성 조사 및 투자심사)',
    '「지방재정투자사업 심사규칙」(행정안전부령 제464호)',
    '「2025～2029 파주시 중기지방재정계획」',
  ];
  var specific = {
    office:  ['「공유재산 및 물품 관리법 시행령」제95조(청사 기준면적)'],
    culture: ['「체육시설의 설치·이용에 관한 법률」제6조(생활체육시설)'],
    complex: ['「공유재산 및 물품 관리법 시행령」제95조',
              '「체육시설의 설치·이용에 관한 법률」제6조',
              '「국토의 계획 및 이용에 관한 법률」제2조 및 제30조'],
    general: ['「지방자치법」제139조 및 제147조'],
  };
  var sp = specific[type] || specific['general'];
  return sp.concat(common);
}

/* DOM helper: sec id direct access */
function secId(num){
  return 'sec-'+num.replace(/\./g,'').replace(/-/g,'_')+'_content';
}
function getSecEl(num){ return document.getElementById(secId(num)); }
function getSecText(num){
  var el=getSecEl(num);
  return el?(el.innerText||el.textContent||'').trim():'';
}

function highlightNeeds() {
  var contents = document.querySelectorAll('.draft-content');
  contents.forEach(function(el) {
    var txt = el.innerHTML;
    el.innerHTML = txt.replace(
      /(\[담당자[^\]]*\])/g,
      '<span class="need">$1</span>'
    );
  });
}

function copyDraft() {
  var el = document.getElementById('draft-box');
  if(!el) return;
  var text = el.innerText;
  navigator.clipboard.writeText(text).then(function(){
    alert('의뢰서 초안이 클립보드에 복사됐습니다.');
  }).catch(function(){
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    alert('의뢰서 초안이 복사됐습니다.');
  });
}

function printDraft() {
  /* 의뢰서 초안 탭 확인 및 전환 */
  if (!gResult) {
    alert('먼저 투자심사 판단을 실행하세요.');
    return;
  }
  /* 의뢰서 탭으로 이동 */
  switchRT('draft');
  /* 의뢰서 초안이 없으면 생성 */
  var draftBox = v('draft-box');
  if (draftBox && (!draftBox.innerHTML.trim() || draftBox.style.display === 'none')) {
    v('empty-draft').style.display = 'none';
    draftBox.style.display = 'block';
    renderDraft(gResult);
  }
  /* 렌더링 완료 후 인쇄 */
  setTimeout(function() {
    window.print();
  }, 500);
}

/* ── Phase 1 초기화 ── */
(function(){
  var fn=function(){bindProjectDataInputs();calcAll();};
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn);}
  else{setTimeout(fn,150);}
})();

/* ── Phase 1 초기화: 요약바 이벤트 바인딩 ── */
(function() {
  /* 페이지 로드 후 요약바 초기화 */
  var initSummary = function() { bindProjectDataInputs();calcAll(); };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSummary);
  } else {
    setTimeout(initSummary, 100);
  }
})();



/* ── 사업유형 단가 초기화 ── */
(function(){
  function initUnitPrice(){
    var ftEl = document.getElementById('f_type');
    if(ftEl && ftEl.value) showUnitPriceBox(ftEl.value);
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', initUnitPrice);
  } else {
    setTimeout(initUnitPrice, 200);
  }
})();

/* ── AI 설정 초기화 (페이지 로드 시) ── */
(function(){
  var savedEngine = localStorage.getItem('ace_ai_engine');
  var savedKey    = localStorage.getItem('ace_ai_key');
  if (savedEngine) gAI = savedEngine;
  if (savedKey)    { gKey = savedKey; }
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
  window.placeChatDock=placeChatDock;
  var dockRzT=null;
  window.addEventListener('resize',function(){
    clearTimeout(dockRzT); dockRzT=setTimeout(placeChatDock,200);
  });
  function initAll(){
    updateSummary();
    if (gKey) updBadge();
    placeChatDock();
  }
  if (document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    setTimeout(initAll, 150);
  }
})();

/* ── 인라인 이벤트 핸들러(onclick 등)에서 호출되는 함수를 window에 노출 ── */
Object.assign(window, {
  aiDraftAll, aiDraftBySection, applyCostFromCalc, applyEconToDraft,
  applyPeriodToForm, applyUnitPrice, autoEstimatePeriod, calcEcon, calcPeriod,
  chatKeyDown, checkCostDiff, clearChat, closeSaveModal, closeSettings,
  copyDraft, deleteSavedKey, doAnalyze, doImport, doReset, downloadDocx,
  exportChat, exportWork, handleCheck, importWork, loadSample, loadWork,
  onCalcModeChange, onReserveChg, onTypeChange, openSaveModal, openSettings,
  printDraft, quickAsk, recalcCost, saveSettings, saveWork, scrollToSec,
  selectAI, sendChat, setRI, switchIT, switchRT, syncLegacyLand, toggleC37,
  updateModelLabel, updateSummary
});
