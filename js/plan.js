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
/* 기획 분야 → 투자심사 사업유형 매핑 (매핑되는 것만, 나머지는 일반투자사업) */
var PLAN_FIELD_TO_TYPE = { culture:'culture', office:'office' };
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

function generatePlan(){
  var idea = gv('plan_idea').trim();
  if(!idea){ _planStatus('사업 배경·목적을 입력하세요.', 'err'); v('plan_idea').focus(); return; }
  if(!gKey){ _planStatus('AI 설정에서 API Key를 먼저 입력하세요.', 'err'); openSettings(); return; }

  var field = gv('plan_field') || 'etc';
  var name = gv('plan_name').trim();
  var scale = gv('plan_scale').trim();

  _planStatus('AI가 사업 기획서를 작성하는 중입니다... (20~40초 소요)', 'busy');

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
    + '[[p6]]\n(기대효과 — 정량·정성 효과)\n\n'
    + '작성 규칙:\n'
    + '- 파주시(인구 약 53만) 실정에 맞게 구체적으로\n'
    + '- 확인이 필요한 수치는 [담당자 확인 필요: 내용] 형태로 표시\n'
    + '- 공문서체(◦ 개조식)로 간결하게, 각 항목 3~5문장';

  callAI(prompt, function(resp, err){
    if(err){ _planStatus('기획서 생성 실패: ' + err, 'err'); return; }
    var parsed = parsePlanResponse(resp);
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
  var markers = ['cost','p1','p2','p3','p4','p5','p6'];
  markers.forEach(function(m){
    var re = new RegExp('\\[\\[' + m + '\\]\\]([\\s\\S]*?)(?=\\[\\[(?:cost|p[1-6])\\]\\]|$)');
    var mm = resp.match(re);
    out[m] = mm ? mm[1].trim() : '';
  });
  return out;
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
  PLAN_SECTIONS.forEach(function(s){
    var content = parsed[s[2]] || '[담당자 확인 필요: 내용]';
    /* 미처리 [담당자…] 강조 */
    content = esc(content).replace(/(\[담당자[^\]]*\])/g, '<span class="need">$1</span>');
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
  PLAN_SECTIONS.forEach(function(s, i){
    var el = document.getElementById('sec-' + s[0] + '_content');
    var text = el ? (el.innerText || el.textContent || '') : '';
    children.push(new P({ children: [ new T({ text: (i+1) + '. ' + s[1], bold: true, size: 24, color: '003C96' }) ], spacing: { before: 200, after: 80 } }));
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
