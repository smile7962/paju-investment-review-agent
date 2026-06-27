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

// ── 헬퍼 함수 ──
function v(id){ return document.getElementById(id); }
function gv(id){ var el=v(id); return el?el.value:''; }
function gnv(id){ var n=parseFloat(gv(id)); return isNaN(n)?0:n; }
function gsv(id){ return gv(id); }
function gc(id){ var el=v(id); return el?el.checked:false; }
function sv(id,val){ var el=v(id); if(el) el.value=val; }
function sc(id,val){ var el=v(id); if(el) el.checked=val; }
function need(t){return '<span class="need">'+t+'</span>';}
