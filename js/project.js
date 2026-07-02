/* js/project.js — 다중 사업 관리·자동저장·JSON import/export
   ★ 사업 데이터 구조 변경 시 이 파일 편집
   의존: utils.js */

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
  projectData.ai={engine:gAI, hasKey:!!gKey, chatCount:(window.gChatHistory||[]).length};
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
  /* 유형 선택 효과 재현 — 서울시 가이드라인 단위공사비(gLastUnit) 자동 세팅 */
  if(typeof onTypeChange==='function') onTypeChange();
  doAnalyze();
  /* 계산기 시연을 위한 연면적 예시값 — renderCalc가 입력을 새로 그리므로 doAnalyze 이후에 주입 */
  sv('ci_area','8000');
  if(typeof recalcCost==='function') recalcCost();
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
  gPeriodTotal=0; window.gPeriodCalculated=false;
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
function collectCurrentData() {
  var fields = ['f_name','f_type','f_exempt','f_cost','f_reserve','f_stage',
    'f_self','f_joint','f_tang_exempt','f_nat','f_prov','f_city','f_bond',
    'f_priv','f_prev_cost','f_prev_result','f_years','f_prev_auth',
    'f_prev_bond','f_deduct','f_spent','f_site','f_bond_chg','f_audit_req',
    'ci_area','ci_unit','ci_zero_energy','ci_reserve_apply','ci_design_split',
    'ci_bldg_type','ci_cm_type'];
  var data = { id: gCurrentProjectId, savedAt: new Date().toISOString(), completedSteps: [] };
  fields.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    data[id] = (el.type === 'checkbox') ? el.checked : el.value;
  });
  // 완료 단계 기록
  if (gResult) { data.gResult = gResult; data.completedSteps.push(1,2); }
  if (projectData && projectData.cost) data.completedSteps.push(3);
  data.completedSteps = Array.from(new Set(data.completedSteps));
  return data;
}
function restoreData(data) {
  if (!data) return;
  var fields = Object.keys(data).filter(function(k){ return k.startsWith('f_') || k.startsWith('ci_'); });
  fields.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (el.type === 'checkbox') el.checked = !!data[id];
    else { el.value = data[id] || ''; }
    if (el.onchange) el.onchange();
  });
  if (data.gResult) { gResult = data.gResult; renderResult(gResult); }
  updateProgress(data.completedSteps || []);
  updateSummary();
}
function scheduleAutoSave() {
  clearTimeout(gAutoSaveTimer);
  gAutoSaveTimer = setTimeout(function() {
    if (!gCurrentProjectId) return;
    var data = collectCurrentData();
    var projects = getAllProjects();
    projects[gCurrentProjectId] = data;
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    var badge = document.getElementById('autosave-badge');
    if (badge) {
      var t = new Date();
      badge.textContent = '✓ 자동저장됨 (' + t.getHours() + ':' + String(t.getMinutes()).padStart(2,'0') + ')';
      badge.style.color = 'var(--ok)';
    }
  }, 2000);
}
function newProject() {
  var name = prompt('새 사업명을 입력하세요:');
  if (!name) return;
  var id = 'pj_' + Date.now();
  var projects = getAllProjects();
  projects[id] = { id: id, name: name, savedAt: new Date().toISOString(), completedSteps: [] };
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  switchProject(id);
}
function switchProject(id) {
  if (gCurrentProjectId && id !== gCurrentProjectId) {
    // 현재 작업 자동저장
    var data = collectCurrentData();
    var projects = getAllProjects();
    if (projects[gCurrentProjectId]) {
      projects[gCurrentProjectId] = Object.assign(projects[gCurrentProjectId], data);
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }
    // ★ 이전 사업 화면 상태 초기화 (탭 컨테이너가 아닌 내부 결과 박스 내용만 비운다.
    //   rt-result·rt-econ의 innerHTML을 지우면 그 안의 result-box·econ-box 요소 자체가
    //   삭제되어 이후 렌더가 null 참조로 실패하므로, 박스 내용만 비우고 숨긴다.)
    gResult = null;
    gEconResult = {bc:0, npv:0, irr:0};
    gChatHistory = [];
    gPeriodTotal = 0; window.gPeriodCalculated = false;
    ['result-box','check-box','econ-box','draft-box','calc-box'].forEach(function(id){
      var el=document.getElementById(id); if(el){ el.innerHTML=''; el.style.display='none'; }
    });
    ['empty-result','empty-check','empty-calc','empty-draft','econ-empty'].forEach(function(id){
      var el=document.getElementById(id); if(el) el.style.display='';
    });
    var _ah=document.getElementById('ai-chat-history'); if(_ah) _ah.innerHTML='';
  }
  gCurrentProjectId = id;
  localStorage.setItem(CURRENT_PJ_KEY, id);
  var projects = getAllProjects();
  var pj = projects[id];
  if (pj) restoreData(pj);
  renderProjectBar();
  // 미완료 단계로 자동 이동
  var steps = (pj && pj.completedSteps) || [];
  var nextStep = 1;
  for (var i=1; i<=7; i++) { if (steps.indexOf(i)>=0) nextStep = i+1; else break; }
  goToStep(Math.min(nextStep, 7));
}
function deleteProject(id) {
  if (!confirm('이 사업을 삭제할까요? 복구할 수 없습니다.')) return;
  var projects = getAllProjects();
  delete projects[id];
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  var ids = Object.keys(projects);
  if (ids.length > 0) switchProject(ids[0]);
  else newProject();
}
function exportProjectJSON() {
  var data = collectCurrentData();
  var projects = getAllProjects();
  var pj = projects[gCurrentProjectId] || {};
  var out = JSON.stringify(Object.assign(pj, data), null, 2);
  var blob = new Blob([out], {type:'application/json'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = (pj.name || '사업') + '_투자심사_' + new Date().toISOString().slice(0,10) + '.json';
  a.click();
}
function importProjectJSON() {
  var input = document.createElement('input');
  input.type = 'file'; input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var data = JSON.parse(ev.target.result);
        if (!data.id) data.id = 'pj_' + Date.now();
        var projects = getAllProjects();
        projects[data.id] = data;
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
        switchProject(data.id);
        alert('사업을 불러왔습니다: ' + (data.f_name || data.name || ''));
      } catch(err) { alert('파일 형식 오류: ' + err.message); }
    };
    reader.readAsText(file);
  };
  input.click();
}
function renderProjectBar() {
  var sel = document.getElementById('project-select');
  if (!sel) return;
  var projects = getAllProjects();
  sel.innerHTML = '';
  Object.keys(projects).forEach(function(id) {
    var pj = projects[id];
    var steps = pj.completedSteps || [];
    var opt = document.createElement('option');
    opt.value = id;
    var stepLabel = steps.length > 0 ? steps.length + '단계 완료' : '입력 중';
    opt.textContent = '📁 ' + (pj.f_name || pj.name || '새 사업') + ' — ' + stepLabel;
    if (id === gCurrentProjectId) opt.selected = true;
    sel.appendChild(opt);
  });
}
function initProject() {
  var projects = getAllProjects();
  var lastId = localStorage.getItem(CURRENT_PJ_KEY);
  if (lastId && projects[lastId]) {
    gCurrentProjectId = lastId;
    restoreData(projects[lastId]);
    renderProjectBar();
  } else if (Object.keys(projects).length > 0) {
    switchProject(Object.keys(projects)[0]);
  } else {
    // 최초 실행: 기본 사업 생성
    var id = 'pj_default';
    gCurrentProjectId = id;
    projects[id] = { id:id, name:'새 사업', savedAt:new Date().toISOString(), completedSteps:[] };
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    renderProjectBar();
  }
}
function getAllProjects() {
  try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '{}'); }
  catch(e) { return {}; }
}
