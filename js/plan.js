/* js/plan.js — AI 사업 기획서 작성 (위저드 1단계)
   신규 사업 아이디어 → AI 기획서 초안 → 투자심사 기본정보로 연결.
   투자심사 대상이 아닌 일반 사업 직원도 기획서 작성 도구로 활용할 수 있게 한다.
   의존: utils.js(v/gv/sv/esc/gnv), draft.js(callAI), render.js(sec/toggleEdit),
        ui.js(goToStepKey/updateSummary), data.js(onTypeChange) */

var gPlanGenerated = false;
if (typeof window !== 'undefined') window.gPlanGenerated = false;

/* 첫 요소: sec() id·표시 번호(의뢰서는 '1-1' 형식이라 순수 숫자 id와 충돌 없음)
   둘째 요소: AI 응답 파싱용 마커 키 */
var PLAN_SECTIONS = [
  ['1','추진 배경 및 필요성','p1'],
  ['2','사업 목표','p2'],
  ['3','추진 내용 및 방안','p3'],
  ['4','개산 소요예산','p4'],
  ['5','추진 일정','p5'],
  ['6','기대효과','p6']
];
/* 유사사례 검토 절 — '사업 목표(p2)' 다음에 끼워 넣고 이후 번호를 다시 매긴다 */
var PLAN_CASE_SECTION = ['*','유사사례 검토 및 시사점','p7'];

/* 이번 초안에 유사사례 절이 포함되는지에 따라 실제 목차를 만든다.
   번호는 렌더 시점에 다시 부여하므로 sec- id 와 Word 출력 번호가 항상 일치한다. */
function planSections(){
  var list = PLAN_SECTIONS.slice();
  if (window._planCase) {
    var out = [];
    list.forEach(function(s){
      out.push(s);
      if (s[2] === 'p2') out.push(PLAN_CASE_SECTION);
    });
    list = out;
  }
  return list.map(function(s, i){ return [String(i+1), s[1], s[2]]; });
}

/* 기획 분야 → 투자심사 사업유형 매핑 (매핑되는 것만, 나머지는 일반투자사업) */
var PLAN_FIELD_TO_TYPE = { culture:'culture', office:'office' };
/* 기획 분야 → 단가 DB(UNIT_PRICE_DB) 유형. 건축물이 아닌 분야는 매핑하지 않는다 */
var PLAN_FIELD_TO_UNITDB = { welfare:'general', culture:'culture', office:'office' };
var PLAN_FIELD_LABEL = {
  welfare:'복지·보건', culture:'문화·체육', office:'청사·행정시설', road:'도로·교통',
  env:'환경·안전', park:'공원·녹지', econ:'지역경제·일자리', etc:'기타'
};

function _planStatus(text, cls){
  var el = v('plan-status');
  if(!el) return;
  el.textContent = text || '';
  el.className = 'plan-status' + (cls ? ' ' + cls : '');
}
/* 기획 완성도(시안) — 입력 충실도를 참고용 진행바로 표시.
   분야(기본 선택) 20 + 사업명 20 + 배경 40(20자↑) + 대상 20 */
function renderPlanCompleteness(){
  var box = v('plan-completeness');
  if(!box) return;
  var pct = 0;
  if(gv('plan_field')) pct += 20;
  if(gv('plan_name').trim()) pct += 20;
  var idea = gv('plan_idea').trim();
  if(idea.length >= 20) pct += 40; else if(idea.length > 0) pct += 20;
  if(gv('plan_scale').trim()) pct += 20;
  if(pct > 100) pct = 100;
  var hint = pct >= 80 ? '충분합니다 — 지금 초안을 생성해 보세요.'
    : (pct >= 40 ? '배경·목적을 더 구체적으로 적으면 초안 품질이 올라갑니다.'
    : '사업 배경·목적을 채우면 완성도가 올라갑니다.');
  box.innerHTML = '<div class="plan-comp-top"><span>기획 완성도</span><b>' + pct + '%</b></div>'
    + '<div class="plan-comp-bar"><i style="width:' + pct + '%"></i></div>'
    + '<div class="plan-comp-hint">' + hint + '</div>';
}

/* ════════════════════════════════════════════════════════════════
   유사사례 검토 옵션
   ▸ 정량 비교표는 내장 단가 DB(서울시 공공건축물 건립 공사비 책정
     가이드라인 2024)로만 만든다 — AI가 수치를 지어낼 여지를 없앤다.
   ▸ AI 는 '무엇을 어디서 확인할지'(조사 프레임)만 작성한다.
   ════════════════════════════════════════════════════════════════ */

function planCaseOn(){ return !!gc('plan_case_study'); }

/* AI 에게는 '조사 프레임'만 시킨다. 실제 사례명·금액을 지어내지 못하도록 강하게 못 박는다 */
var PLAN_CASE_PROMPT =
  '[[p7]]\n'
+ '(유사사례 검토 및 시사점 — 아래 5개 소항목을 이 순서·이 제목 그대로 출력)\n'
+ '1. 확인 항목\n'
+ '   ◦ 담당자가 유사사례에서 반드시 확인해야 할 항목 5~7개 (연면적·총사업비·㎡당 공사비·운영인력·연간 운영비·이용실적·재원분담 등 이 사업 성격에 맞게)\n'
+ '2. 자료 출처\n'
+ '   ◦ 실제로 조회 가능한 공개 자료원만 열거 (지방재정365, 행정안전부 지방재정 투자사업 심사결과 공개, 지방재정영향평가서, 해당 지자체 홈페이지 정보공개, 조달청 나라장터 계약현황, 국가통계포털 등)\n'
+ '3. 검색 키워드\n'
+ '   ◦ 3~5개 (따옴표로 구분)\n'
+ '4. 사례 비교표(조사 양식)\n'
+ '   ◦ "사례명 | 지자체 | 준공연도 | 연면적(㎡) | 총사업비(억원) | ㎡당 공사비(천원) | 시사점" 머리행을 쓰고,\n'
+ '     그 아래에 값이 모두 (   ) 로 비어 있는 행 3개를 만들 것\n'
+ '5. 검토 시 유의사항\n'
+ '   ◦ 사례 비교 시 주의할 점 2~3개 (건립시기 물가 보정, 부지비 포함 여부, 지역 여건 차이 등)\n';

var PLAN_CASE_RULE =
  '\n[[p7]] 작성 시 반드시 지킬 것:\n'
+ '- 실제 사업명·지자체명·준공연도·사업비 등 구체적 사실을 절대 만들어내지 마세요.\n'
+ '- 기억에 있는 사례를 예시로 드는 것도 금지합니다. 비교표의 값은 모두 (   ) 로 비워 두세요.\n'
+ '- 당신의 역할은 "무엇을 어디서 확인할지"를 제시하는 것까지입니다.\n';

/* 입력 문장에서 연면적(㎡)을 찾아낸다. ㎡ 표기가 없으면 '평'을 환산 */
function planParseArea(text){
  var s = String(text || '');
  var m = s.match(/([\d,]+(?:\.\d+)?)\s*(?:㎡|m2|m²|제곱미터)/i);
  if (m) return parseFloat(m[1].replace(/,/g, '')) || 0;
  /* '평균·평가' 등과 구분하기 위해 뒤에 한글이 오면 제외 */
  m = s.match(/([\d,]+(?:\.\d+)?)\s*평(?![가-힣])/);
  if (m) return Math.round((parseFloat(m[1].replace(/,/g, '')) || 0) * 3.3058);
  return 0;
}
/* 여러 입력칸을 순서대로 훑어 연면적을 찾는다 */
function planDetectArea(){
  var srcs = [gv('plan_scale'), gv('plan_idea'), gv('plan_name')];
  for (var i = 0; i < srcs.length; i++){
    var a = planParseArea(srcs[i]);
    if (a > 0) return a;
  }
  return 0;
}
/* 단가 DB 의 range 문자열('3,500㎡ 미만 신축' 등)을 면적 구간으로 해석 */
function planParseBand(range){
  var s = String(range || '').replace(/,/g, '');
  var m = s.match(/(\d+(?:\.\d+)?)\s*[~∼-]\s*(\d+(?:\.\d+)?)\s*㎡/);
  if (m) return { min:+m[1], max:+m[2] };
  m = s.match(/(\d+(?:\.\d+)?)\s*㎡\s*(?:미만|이하)/);
  if (m) return { min:0, max:+m[1] };
  m = s.match(/(\d+(?:\.\d+)?)\s*㎡\s*(?:초과|이상)/);
  if (m) return { min:+m[1], max:Infinity };
  return null;
}

/* 분야·연면적으로 동종 공공건축물 표준단가 비교표를 만든다 */
function buildPlanCaseCompare(field, area){
  var key = PLAN_FIELD_TO_UNITDB[field];
  var db = (key && typeof UNIT_PRICE_DB !== 'undefined') ? UNIT_PRICE_DB[key] : null;
  if (!db || !db.length) return null;

  var rows = db.map(function(it){
    var band = planParseBand(it.range);
    var fit = !!(band && area > 0 && area >= band.min && area <= band.max);
    return {
      sub: it.sub, name: it.name, price: it.price, range: it.range, fit: fit,
      /* 1억원 = 100,000천원 */
      cost: area > 0 ? (area * it.price / 100000) : 0
    };
  });
  var fits = rows.filter(function(r){ return r.fit; });
  var base = fits.length ? fits : rows;
  var sum = 0;
  base.forEach(function(r){ sum += r.price; });

  return {
    typeKey: key, area: area, rows: rows,
    fits: fits, avg: sum / base.length,
    source: '서울특별시 「공공건축물 건립 공사비 책정 가이드라인」(2024) — 신축·부가세 포함 기준'
  };
}

/* ① 단계 체크박스 아래 안내문 — 무엇이 붙는지 미리 보여준다 */
function renderPlanCaseHint(){
  var box = v('plan-case-hint');
  if (!box) return;
  if (!planCaseOn()){ box.innerHTML = ''; box.style.display = 'none'; return; }
  box.style.display = 'block';

  var field = gv('plan_field') || 'etc';
  var area = planDetectArea();
  var cmp = buildPlanCaseCompare(field, area);
  var h = '';
  if (cmp && area > 0){
    h = '&#9989; 연면적 <b>' + area.toLocaleString() + '㎡</b> 인식 — '
      + esc(PLAN_FIELD_LABEL[field] || field) + ' 표준단가 비교표 <b>' + cmp.rows.length + '건</b>'
      + (cmp.fits.length ? '(해당 규모 구간 ' + cmp.fits.length + '건 강조)' : '')
      + '이 함께 작성됩니다.';
  } else if (cmp){
    h = '&#9432; 대상·규모에 <b>연면적(㎡)</b>을 적으면 표준단가 대비 공사비까지 자동 비교합니다.';
  } else {
    h = '&#9432; 이 분야는 건축 표준단가 기준이 없어 <b>조사 항목·자료 출처·비교표 양식</b>만 제공됩니다.';
  }
  h += '<br><span class="plan-case-warn">실제 사례의 사업명·금액은 AI가 만들어내지 않습니다. 담당자가 조사해 채우는 양식으로 제공됩니다.</span>';
  box.innerHTML = h;
}

function generatePlan(){
  var idea = gv('plan_idea').trim();
  if(!idea){ _planStatus('사업 배경·목적을 입력하세요.', 'err'); v('plan_idea').focus(); return; }
  if(!gKey){ _planStatus('AI 설정에서 API Key를 먼저 입력하세요.', 'err'); openSettings(); return; }

  var field = gv('plan_field') || 'etc';
  var name = gv('plan_name').trim();
  var scale = gv('plan_scale').trim();

  var caseOn = planCaseOn();
  var caseArea = caseOn ? planDetectArea() : 0;
  var caseCmp = caseOn ? buildPlanCaseCompare(field, caseArea) : null;

  _planStatus(caseOn
    ? 'AI가 사업 기획서와 유사사례 검토 항목을 작성하는 중입니다... (30~50초 소요)'
    : 'AI가 사업 기획서를 작성하는 중입니다... (20~40초 소요)', 'busy');

  var prompt = '당신은 대한민국 지방자치단체(파주시) 공무원의 신규 사업 기획을 돕는 전문가입니다.\n'
    + '아래 정보를 바탕으로 "사업 기획서(안)"를 작성하세요.\n\n'
    + '[사업 분야] ' + (PLAN_FIELD_LABEL[field] || field) + '\n'
    + '[사업명] ' + (name || '(미정)') + '\n'
    + '[사업 배경·목적] ' + idea + '\n'
    + '[대상·규모] ' + (scale || '(미기재)') + '\n\n'
    + '다음 형식으로만 출력하세요. 각 구획은 반드시 대괄호 마커로 시작하고, 마커 외 다른 머리말·마크다운(**, ##)은 쓰지 마세요.\n'
    + '[[cost]]\n(개산 총사업비를 숫자만, 억원 단위. 예: 35. 판단이 어려우면 0)\n'
    + '[[p1]]\n(추진 배경 및 필요성 — 3~5문장)\n'
    + '[[p2]]\n(사업 목표)\n'
    + '[[p3]]\n(추진 내용 및 방안)\n'
    + '[[p4]]\n(개산 소요예산 — 항목별 개략 배분과 산출 근거. 정확한 단가가 없으면 [담당자 확인 필요: 내용] 표시)\n'
    + '[[p5]]\n(추진 일정 — 단계별 예상 기간)\n'
    + '[[p6]]\n(기대효과 — 정량·정성 효과)\n'
    + (caseOn ? PLAN_CASE_PROMPT : '')
    + '\n작성 규칙:\n'
    + '- 파주시(인구 약 53만) 실정에 맞게 구체적으로\n'
    + '- 확인이 필요한 수치는 [담당자 확인 필요: 내용] 형태로 표시\n'
    + '- 공문서체(◦ 개조식)로 간결하게, 각 항목 3~5문장'
    + (caseOn ? PLAN_CASE_RULE : '');

  callAI(prompt, function(resp, err){
    if(err){ _planStatus('기획서 생성 실패: ' + err, 'err'); return; }
    var parsed = parsePlanResponse(resp);
    window._planCase = caseOn;
    window._planCaseData = caseCmp;
    renderPlan(parsed, name, field);
    gPlanGenerated = true;
    window.gPlanGenerated = true;
    window._planCost = parseFloat(parsed.cost) || 0;
    window._planName = name;
    window._planField = field;
    _planStatus('기획서 초안이 작성되었습니다. 아래에서 확인·수정하세요.', 'done');
    if(typeof renderWizard === 'function') renderWizard();
    if(typeof scheduleAutoSave === 'function') scheduleAutoSave();
  });
}

function parsePlanResponse(resp){
  var out = {};
  var markers = ['cost','p1','p2','p3','p4','p5','p6','p7'];
  markers.forEach(function(m){
    var re = new RegExp('\\[\\[' + m + '\\]\\]([\\s\\S]*?)(?=\\[\\[(?:cost|p[1-7])\\]\\]|$)');
    var mm = resp.match(re);
    out[m] = mm ? mm[1].trim() : '';
  });
  return out;
}

/* 유사사례 절 본문 = ① 내장 단가 DB 비교표(고정·편집불가) + ② AI 조사 프레임(편집 가능) */
function planCaseContent(aiText){
  var cmp = window._planCaseData;
  var h = '<div class="plan-case-lead">&#9432; 이 절은 <b>담당자가 직접 조사·확인해야 하는 항목</b>입니다. '
        + '아래 단가는 공표된 기준값이며, 사례 비교표의 값은 조사 후 채워 넣으십시오.</div>';

  if(cmp && cmp.rows.length){
    h += '<div class="plan-case-table" contenteditable="false">';
    h += '<div class="plan-case-cap">&#128200; 동종 공공건축물 표준 건축공사비 단가 비교</div>';
    h += '<table><thead><tr><th>구분</th><th>시설 유형·규모 구간</th><th>표준단가<br>(천원/㎡)</th>'
       + (cmp.area > 0 ? '<th>연면적 ' + cmp.area.toLocaleString() + '㎡ 적용<br>건축공사비(억원)</th>' : '')
       + '</tr></thead><tbody>';
    cmp.rows.forEach(function(r){
      h += '<tr' + (r.fit ? ' class="fit"' : '') + '>'
         + '<td>' + esc(r.sub) + (r.fit ? ' <span class="pc-badge">해당 구간</span>' : '') + '</td>'
         + '<td>' + esc(r.name) + '</td>'
         + '<td class="num">' + r.price.toLocaleString() + '</td>'
         + (cmp.area > 0 ? '<td class="num">' + r.cost.toFixed(1) + '</td>' : '')
         + '</tr>';
    });
    h += '</tbody></table>';
    h += '<div class="plan-case-src">자료: ' + esc(cmp.source) + '</div>';

    /* 시사점 — 계산값만 서술한다 */
    var lead = cmp.fits.length ? cmp.fits[0] : null;
    h += '<div class="plan-case-imp">';
    if(lead && cmp.area > 0){
      var dev = ((lead.price - cmp.avg) / cmp.avg) * 100;
      h += '◦ 연면적 ' + cmp.area.toLocaleString() + '㎡ 기준 해당 구간 표준단가는 '
         + lead.price.toLocaleString() + '천원/㎡ 으로, 건축공사비는 약 <b>'
         + lead.cost.toFixed(1) + '억원</b> 수준으로 추정<br>'
         + '◦ 동종 시설 평균단가(' + Math.round(cmp.avg).toLocaleString() + '천원/㎡) 대비 '
         + (dev >= 0 ? '+' : '') + dev.toFixed(1) + '%<br>';
    } else if(cmp.area > 0){
      h += '◦ 입력 연면적(' + cmp.area.toLocaleString() + '㎡)에 정확히 대응하는 규모 구간이 없어, '
         + '동종 시설 전체 평균단가(' + Math.round(cmp.avg).toLocaleString() + '천원/㎡)를 참고치로 제시<br>';
    } else {
      h += '◦ 연면적이 확정되면 위 표준단가를 적용해 건축공사비를 산정할 수 있음<br>';
    }
    h += '◦ 위 금액은 <b>건축공사비</b>만으로, 부지매입비·설계비·감리비·집기비품비 등은 별도 반영 필요<br>'
       + '◦ 최종 사업비는 지역 여건·특수공법·물가변동을 반영해 조정 [담당자 확인 필요: 설계 개략견적]';
    h += '</div></div>';
  } else {
    h += '<div class="plan-case-table" contenteditable="false">'
       + '<div class="plan-case-cap">&#128200; 표준단가 비교</div>'
       + '<div class="plan-case-none">건축물 신축이 아닌 분야로 내장 표준단가 기준이 적용되지 않습니다. '
       + '유사 사업의 <b>실제 집행액</b>과 산출 근거를 아래 조사 항목에 따라 직접 확인하십시오.</div>'
       + '</div>';
  }

  var txt = (aiText || '').trim() || '[담당자 확인 필요: 조사 항목]';
  h += '<div class="plan-case-frame" id="plan-case-frame">'
     + esc(txt).replace(/(\[담당자[^\]]*\])/g, '<span class="need">$1</span>')
     + '</div>';
  return h;
}

function renderPlan(parsed, name, field){
  var box = v('plan-doc');
  if(!box) return;
  var today = new Date().toLocaleDateString('ko-KR');
  var html = '<div class="draft-page" style="max-width:820px;margin:0 auto;padding:28px 36px">';
  html += '<div class="draft-cover">';
  html += '<div class="draft-doc-title">사업 기획서(안)</div>';
  html += '<div class="draft-doc-biz">' + esc(name || '(사업명 미정)') + '</div>';
  html += '<div style="text-align:center;font-size:11px;color:var(--g500)">분야: '
    + esc(PLAN_FIELD_LABEL[field] || field) + ' &nbsp;|&nbsp; 작성일: ' + today + ' &nbsp;|&nbsp; 파주시</div>';
  html += '</div>';
  /* sec()는 render.js의 전역 함수 — noAI=true로 ✏편집 버튼만 노출
     (🤖AI/채팅수정은 투자심사 판단결과 컨텍스트가 필요하므로 기획 단계에선 제외) */
  planSections().forEach(function(s){
    var content;
    if(s[2] === 'p7'){
      content = planCaseContent(parsed.p7);
    } else {
      content = parsed[s[2]] || '[담당자 확인 필요: 내용]';
      /* 미처리 [담당자…] 강조 */
      content = esc(content).replace(/(\[담당자[^\]]*\])/g, '<span class="need">$1</span>');
    }
    if(typeof sec === 'function') html += sec(s[0], s[1], content, true);
  });
  html += '<div style="margin-top:16px;padding-top:8px;border-top:1px solid var(--g200);'
    + 'font-size:10px;color:var(--g400);text-align:center">파주시 AI 혁신동아리 ACE팀 | AI 기획 초안</div>';
  html += '</div>';
  box.innerHTML = html;

  /* 편집 버튼 이벤트 위임 — 1회만 바인딩(재생성 시 중복등록 방지) */
  if(!box.dataset.editDelegated){
    box.dataset.editDelegated = '1';
    box.addEventListener('click', function(e){
      var editBtn = e.target.closest('[data-edit-id]');
      if(editBtn && typeof toggleEdit === 'function'){
        toggleEdit(editBtn.getAttribute('data-edit-id'));
      }
    });
  }
  v('plan-result').style.display = 'block';
  var ph = v('plan-placeholder');
  if(ph) ph.style.display = 'none';
}

function applyPlanToBasic(){
  if(!gPlanGenerated){ alert('먼저 기획서를 생성하세요.'); return; }
  var name = window._planName || gv('plan_name').trim();
  var field = window._planField || gv('plan_field');
  var cost = window._planCost || 0;
  if(name) sv('f_name', name);
  var mapped = PLAN_FIELD_TO_TYPE[field] || 'general';
  sv('f_type', mapped);
  if(typeof onTypeChange === 'function') onTypeChange();
  if(cost > 0) sv('f_cost', cost);
  if(typeof updateSummary === 'function') updateSummary();
  if(typeof goToStepKey === 'function') goToStepKey('basic');
  /* 기본정보 단계에 연결 안내 */
  var intro = v('stage-intro-basic');
  if(intro){
    var note = document.getElementById('plan-linked-note');
    if(!note){
      note = document.createElement('div');
      note.id = 'plan-linked-note';
      note.className = 'upload-applied-banner';
      note.style.marginTop = '10px';
      intro.parentNode.insertBefore(note, intro.nextSibling);
    }
    note.innerHTML = '&#9989; 기획서에서 사업명·유형' + (cost>0 ? '·개산 총사업비(' + cost + '억원)' : '')
      + '을 옮겨왔습니다. 값을 확인·보완한 뒤 재원구성까지 입력하고 <b>분석 실행</b>을 눌러주세요.';
  }
}

function copyPlan(){
  var el = v('plan-doc');
  if(!el){ return; }
  var text = el.innerText || el.textContent || '';
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(function(){ alert('기획서가 클립보드에 복사됐습니다.'); })
      .catch(function(){ _planFallbackCopy(text); });
  } else { _planFallbackCopy(text); }
}
function _planFallbackCopy(text){
  var ta = document.createElement('textarea');
  ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); alert('기획서가 복사됐습니다.'); } catch(e){}
  document.body.removeChild(ta);
}

/* 유사사례 절의 단가 비교표를 Word 표로 삽입. 표 지원이 없으면 문단으로 대체 */
function planCaseDocx(children, P, T){
  var cmp = window._planCaseData;
  if(!cmp || !cmp.rows.length){
    children.push(new P({ children: [ new T({
      text: '※ 건축 표준단가 기준이 적용되지 않는 분야로, 유사 사업의 실제 집행액을 직접 조사해 비교할 것', size: 22 }) ] }));
    return;
  }
  var hasArea = cmp.area > 0;
  var head = ['구분', '시설 유형·규모 구간', '표준단가(천원/㎡)'];
  if(hasArea) head.push('연면적 ' + cmp.area.toLocaleString() + '㎡ 적용 건축공사비(억원)');

  if(typeof docx.Table === 'function' && typeof docx.TableRow === 'function'){
    var cell = function(text, bold){
      return new docx.TableCell({ children: [ new P({ children: [ new T({ text: text, bold: !!bold, size: 18 }) ] }) ] });
    };
    var rows = [ new docx.TableRow({ children: head.map(function(t){ return cell(t, true); }) }) ];
    cmp.rows.forEach(function(r){
      var c = [ cell(r.sub + (r.fit ? ' (해당 구간)' : '')), cell(r.name), cell(r.price.toLocaleString()) ];
      if(hasArea) c.push(cell(r.cost.toFixed(1)));
      rows.push(new docx.TableRow({ children: c }));
    });
    children.push(new docx.Table({ rows: rows,
      width: { size: 100, type: docx.WidthType.PERCENTAGE } }));
  } else {
    children.push(new P({ children: [ new T({ text: head.join(' | '), bold: true, size: 20 }) ] }));
    cmp.rows.forEach(function(r){
      var line = [ r.sub + (r.fit ? ' (해당 구간)' : ''), r.name, r.price.toLocaleString() ];
      if(hasArea) line.push(r.cost.toFixed(1));
      children.push(new P({ children: [ new T({ text: line.join(' | '), size: 20 }) ] }));
    });
  }
  children.push(new P({ children: [ new T({ text: '자료: ' + cmp.source, size: 16, color: '888888' }) ], spacing: { after: 120 } }));

  var imp = document.querySelector('.plan-case-imp');
  if(imp){
    (imp.innerText || imp.textContent || '').split('\n').forEach(function(line){
      if(line.trim()) children.push(new P({ children: [ new T({ text: line, size: 22 }) ] }));
    });
  }
}

function downloadPlanDocx(){
  if(!gPlanGenerated){ alert('먼저 기획서를 생성하세요.'); return; }
  if(typeof docx === 'undefined'){ alert('Word 라이브러리를 불러오지 못했습니다. [전체 복사]나 브라우저 인쇄를 이용하세요.'); return; }
  var name = window._planName || gv('plan_name').trim() || '사업 기획서';
  var field = window._planField || gv('plan_field');
  var P = docx.Paragraph, T = docx.TextRun;
  var children = [];
  children.push(new P({ alignment: docx.AlignmentType.CENTER,
    children: [ new T({ text: '사업 기획서(안)', bold: true, size: 36 }) ] }));
  children.push(new P({ alignment: docx.AlignmentType.CENTER,
    children: [ new T({ text: name, bold: true, size: 26 }) ] }));
  children.push(new P({ alignment: docx.AlignmentType.CENTER,
    children: [ new T({ text: '분야: ' + (PLAN_FIELD_LABEL[field] || field) + '  |  파주시', size: 18, color: '888888' }) ] }));
  children.push(new P({ text: '' }));
  planSections().forEach(function(s, i){
    children.push(new P({ children: [ new T({ text: (i+1) + '. ' + s[1], bold: true, size: 24, color: '003C96' }) ], spacing: { before: 200, after: 80 } }));
    if(s[2] === 'p7'){
      /* 단가 비교표는 원본 데이터로 표를 다시 만들어 넣는다(화면 표 텍스트 복사 방지) */
      planCaseDocx(children, P, T);
      var fr = document.getElementById('plan-case-frame');
      var ftxt = fr ? (fr.innerText || fr.textContent || '') : '';
      ftxt.split('\n').forEach(function(line){
        children.push(new P({ children: [ new T({ text: line, size: 22 }) ] }));
      });
      return;
    }
    var el = document.getElementById('sec-' + s[0] + '_content');
    var text = el ? (el.innerText || el.textContent || '') : '';
    text.split('\n').forEach(function(line){
      children.push(new P({ children: [ new T({ text: line, size: 22 }) ] }));
    });
  });
  var doc = new docx.Document({ sections: [ { children: children } ] });
  docx.Packer.toBlob(doc).then(function(blob){
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = '사업기획서_' + (name || 'plan') + '_' + new Date().toISOString().slice(0,10) + '.docx';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }).catch(function(e){ alert('Word 생성 오류: ' + (e.message || e)); });
}
