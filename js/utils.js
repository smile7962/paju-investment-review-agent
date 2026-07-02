/* js/utils.js — 전역 상태변수 + 범용 헬퍼 */
/* 의존: 없음 */

// ── 전역 상태변수 ──
/* ════ data/data.js ════ */
/* ── 파주시 투자심사 에이전트 — 데이터·상수 (data.js) ── */
/* 운영기준 개정 시 이 파일만 수정 */

// EXEMPT_META


// PROMPT_SYSTEM


// BENEFIT_UNIT


// USER_UNIT


// UNIT_PRICE_DB


// PERIOD12_ITEMS




/* ════ js/utils.js ════ */
/* ── utils.js ── */

// 전역 상태 변수


CHECKS_META = {
  'midterm': {title:'중기지방재정계획 반영 확인', level:'critical', badge:'must',
    desc:'파주시 중기지방재정계획(5개년)에 해당 사업이 반영되어 있어야 합니다.',
    law:'지방재정법 제33조 제11항 / 심사규칙 제4조', dept:'담당부서: 기획예산과'},
  'plan': {title:'사업기본계획 수립 완료', level:'critical', badge:'must',
    desc:'기본설계 용역 착수 전에 투자심사를 의뢰해야 합니다.',
    law:'심사규칙 제4조 제1항', dept:'담당부서: 사업부서'},
  'priority': {title:'투자사업 우선순위표 작성', level:'critical', badge:'must',
    desc:'제출 서류에 반드시 포함되어야 합니다.',
    law:'심사규칙 제4조 제3항 제2호', dept:'담당부서: 기획예산과'},
  'budget': {title:'회계별 가용재원 판단서 작성', level:'critical', badge:'must',
    desc:'예산부서에서 작성·확인합니다. 최근 3년 결산 기준.',
    law:'심사규칙 제4조 제3항 제3호', dept:'협조부서: 기획예산과 예산팀'},
  'national': {title:'국비 확보 여부 확인', level:'important', badge:'caution',
    desc:'원칙적으로 국비 확보 후 투자심사를 의뢰해야 합니다. (공모선정사업 등 예외 있음)',
    law:'심사규칙 제4조 관련', dept:'담당부서: 사업부서'},
  'gyeonggi': {title:'경기도비 지원 검토의견서 징구', level:'important', badge:'caution',
    desc:'도비 보조사업의 경우 경기도 재정정책과로부터 검토의견서를 받아야 합니다.',
    law:'별지 제3호 서식', dept:'협조기관: 경기도 재정정책과'},
  'tangibility': {title:'타당성조사 이행 필수 (500억 이상)', level:'critical', badge:'must',
    desc:'총사업비 500억원 이상으로 타당성조사 대상입니다. 한국지방행정연구원 또는 한국지방재정공제회에 의뢰.',
    law:'지방재정법 제37조의2 제1항', dept:'협조기관: 한국지방행정연구원'},
  'no_tangibility': {title:'타당성조사 (500억 이상 해당)', level:'na', badge:'skip',
    desc:'총사업비 500억원 미만으로 타당성조사 의무 대상이 아닙니다.',
    law:'지방재정법 제37조의2', dept:''},
  'remodel': {title:'청사 리모델링 가능 여부 검토서', level:'important', badge:'caution',
    desc:'본청 및 의회청사 신축사업의 경우 리모델링 검토서를 첨부해야 합니다.',
    law:'심사규칙 제4조 제3항 제4호', dept:'담당부서: 건축담당'},
  'resim_comply': {title:'이전 심사 조건부 사항 이행내용 보완', level:'critical', badge:'must',
    desc:'종전 투자심사 결과 재검토·조건부 통보 사항에 대한 이행내용을 의뢰서에 구체적으로 기재해야 합니다.',
    law:'심사규칙 제5조 제2항 제2호', dept:'담당부서: 사업부서'},
};
var gAI = 'gpt';
var gKey = '';
var gResult = null;
var gCheckState = {};
var gChatHistory = [];  /* AI 대화 이력 */
var gPeriodTotal = 0;   /* calcPeriod 결과 — 전역 저장 */
var gEconResult  = {bc:0, npv:0, irr:0};  /* calcEcon 결과 — 전역 저장 */

/* ── 프로젝트/자동저장 상태 및 localStorage 키 ──
   project.js·ui.js가 참조하지만 정의가 누락돼 있던 전역들. 정의하지 않으면
   앱 초기화(initProject)와 분석(collectProjectData)이 ReferenceError로 실패한다. */
var PROJECTS_KEY   = 'paju_pj_projects_v3';   /* 다중 사업 목록 저장 키 */
var CURRENT_PJ_KEY = 'paju_pj_current_v3';    /* 현재 사업 ID 저장 키 */
var SAVE_KEY       = 'paju_pj_saves_v3';      /* 저장된 작업(불러오기) 키 */
var gCurrentProjectId = null;
var gAutoSaveTimer = null;
var projectData = {basic:{},finance:{},cost:{},period:{},review:{},economy:{},draft:{},ai:{},output:{}};

// ── 헬퍼 함수 ──
function v(id){ return document.getElementById(id); }
function gv(id){ var el=v(id); return el?el.value:''; }
function gnv(id){ var n=parseFloat(gv(id)); return isNaN(n)?0:n; }
function gsv(id){ return gv(id); }
function gc(id){ var el=v(id); return el?el.checked:false; }
function sv(id,val){ var el=v(id); if(el) el.value=val; }
function sc(id,val){ var el=v(id); if(el) el.checked=val; }
function need(t){return '<span class="need">'+t+'</span>';}
/* HTML 이스케이프 — 사용자 입력을 innerHTML에 넣기 전 반드시 통과시킬 것(XSS 방지) */
function esc(s){
  if(s===null||s===undefined) return '';
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ── 접근성: 시각 라벨(.fl)·행 텍스트·placeholder를 컨트롤의 접근가능한 이름으로 연결 ──
   정적/동적 컨트롤 모두에 aria-label을 부여해 스크린리더가 필드명을 읽도록 한다. */
function _a11yClean(s){ return (s||'').replace(/\s+/g,' ').trim().slice(0,80); }
function _a11yFindLabel(c){
  /* 1) 라디오·체크박스: 같은 행(.ri/.ck-row/label)의 텍스트 */
  if(c.type==='radio' || c.type==='checkbox'){
    var row = c.closest('.ri,.ck-row,label') || c.parentElement;
    if(row){ var t=_a11yClean(row.textContent); if(t) return t; }
  }
  /* 2) 12단계 기간표: 행 첫 셀(단계명) + 열 위치별 접미 */
  var prow = c.closest('.period12-row');
  if(prow){
    var stage = prow.firstElementChild ? _a11yClean(prow.firstElementChild.textContent) : '';
    var cols = ['기간(월)','법적근거·성격','승인·협의기관'];
    var inputs = prow.querySelectorAll('input');
    for(var k=0;k<inputs.length;k++){
      if(inputs[k]===c) return _a11yClean(stage+' '+(cols[k]||''));
    }
  }
  /* 3) 컨트롤 또는 그 래퍼의 직전 형제에서 라벨 요소(.fl/.calc-label/.project-label/<label>) 탐색 */
  var nodes=[c, c.parentElement];
  for(var n=0;n<nodes.length;n++){
    var el=nodes[n]; if(!el) continue;
    var p=el.previousElementSibling;
    while(p){
      if(p.tagName==='LABEL' || (p.classList && (p.classList.contains('fl')
        || p.classList.contains('calc-label') || p.classList.contains('project-label')
        || p.classList.contains('econ-label')))){
        return _a11yClean(p.textContent);
      }
      p=p.previousElementSibling;
    }
  }
  /* 4) 최후: placeholder */
  return _a11yClean(c.getAttribute('placeholder')||'');
}
function applyA11yLabels(root){
  var scope=(root && root.querySelectorAll) ? root : document;
  var ctrls=scope.querySelectorAll('input,select,textarea');
  for(var i=0;i<ctrls.length;i++){
    var c=ctrls[i];
    if(c.type==='hidden') continue;
    /* 보이지 않는 컨트롤(예: display:none 파일 입력)은 라벨 불필요 */
    if(window.getComputedStyle && getComputedStyle(c).display==='none') continue;
    if(c.getAttribute('aria-label') || c.getAttribute('aria-labelledby')) continue;
    if(c.closest('label')) continue;
    if(c.id){
      var esc2=(window.CSS && CSS.escape) ? CSS.escape(c.id) : c.id;
      if(document.querySelector('label[for="'+esc2+'"]')) continue;
    }
    var lbl=_a11yFindLabel(c);
    if(lbl) c.setAttribute('aria-label', lbl);
  }
}
