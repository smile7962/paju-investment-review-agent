/* js/upload.js — 기획서 업로드 → AI 파싱 → 기본정보 자동 채움
   의존: utils.js(v/sv/esc), draft.js(callAI), data.js(onTypeChange)
   HWP(한글)는 서버 없는 정적 사이트에서 클라이언트 파싱이 불가능해 미지원 — PDF 변환 안내 */

var PLAN_TEXT_LIMIT = 8000; /* AI 요청 토큰 한도 고려 — 문서 앞부분만 전송 */
var PLAN_PDF_MAX_PAGES = 30; /* 대용량 문서 처리 시간 보호 */

function _planSetStatus(text, cls){
  var status = v('plan-upload-status');
  if(!status) return;
  status.textContent = text;
  status.className = 'upload-status' + (cls ? ' ' + cls : '');
}

function handlePlanFileUpload(event){
  var file = event.target.files && event.target.files[0];
  event.target.value = ''; /* 같은 파일을 다시 선택해도 change 이벤트가 발생하도록 초기화 */
  if(!file) return;

  if(!gKey){
    _planSetStatus('AI 설정에서 API Key를 먼저 입력하세요.', 'err');
    openSettings();
    return;
  }

  var name = file.name.toLowerCase();
  if(name.endsWith('.hwp')){
    _planSetStatus('HWP 파일은 지원하지 않습니다. PDF로 변환 후 업로드해주세요.', 'err');
    return;
  }

  _planSetStatus('파일을 읽는 중...', 'busy');
  if(name.endsWith('.pdf')){
    readPdfFile(file, function(text, err){ _planOnFileRead(text, err); });
  } else if(name.endsWith('.docx')){
    readDocxFile(file, function(text, err){ _planOnFileRead(text, err); });
  } else if(name.endsWith('.txt')){
    readTxtFile(file, function(text, err){ _planOnFileRead(text, err); });
  } else {
    _planSetStatus('지원하지 않는 파일 형식입니다. (PDF·DOCX·TXT만 가능)', 'err');
  }
}

function _planOnFileRead(text, err){
  if(err){ _planSetStatus('파일을 읽는 중 오류: ' + err, 'err'); return; }
  onPlanTextReady(text);
}

function readTxtFile(file, cb){
  var reader = new FileReader();
  reader.onload = function(e){ cb(e.target.result || '', null); };
  reader.onerror = function(){ cb(null, '파일을 읽을 수 없습니다.'); };
  reader.readAsText(file);
}

function readPdfFile(file, cb){
  if(typeof pdfjsLib === 'undefined'){ cb(null, 'PDF 라이브러리를 불러오지 못했습니다. 네트워크 상태를 확인하세요.'); return; }
  if(!pdfjsLib.GlobalWorkerOptions.workerSrc){
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
  }
  var reader = new FileReader();
  reader.onload = function(e){
    pdfjsLib.getDocument({ data: e.target.result }).promise.then(function(pdf){
      var pages = [];
      var maxPages = Math.min(pdf.numPages, PLAN_PDF_MAX_PAGES);
      function readPage(i){
        if(i > maxPages){ cb(pages.join('\n'), null); return; }
        pdf.getPage(i).then(function(page){ return page.getTextContent(); })
          .then(function(content){
            pages.push(content.items.map(function(it){ return it.str; }).join(' '));
            readPage(i + 1);
          })
          .catch(function(e2){ cb(null, e2.message || String(e2)); });
      }
      readPage(1);
    }).catch(function(e2){ cb(null, e2.message || String(e2)); });
  };
  reader.onerror = function(){ cb(null, '파일을 읽을 수 없습니다.'); };
  reader.readAsArrayBuffer(file);
}

function readDocxFile(file, cb){
  if(typeof mammoth === 'undefined'){ cb(null, 'DOCX 라이브러리를 불러오지 못했습니다. 네트워크 상태를 확인하세요.'); return; }
  var reader = new FileReader();
  reader.onload = function(e){
    mammoth.extractRawText({ arrayBuffer: e.target.result })
      .then(function(result){ cb(result.value || '', null); })
      .catch(function(e2){ cb(null, e2.message || String(e2)); });
  };
  reader.onerror = function(){ cb(null, '파일을 읽을 수 없습니다.'); };
  reader.readAsArrayBuffer(file);
}

function onPlanTextReady(text){
  text = (text || '').trim();
  if(!text){ _planSetStatus('문서에서 텍스트를 찾을 수 없습니다.', 'err'); return; }
  _planSetStatus('AI가 사업 정보를 분석하는 중...', 'busy');
  parsePlanWithAI(text, function(data, err){
    if(err){ _planSetStatus('AI 분석 실패: ' + err, 'err'); return; }
    var applied = applyParsedPlanToForm(data);
    if(applied>0) _planSetStatus('자동 입력 완료 (' + applied + '개 항목) — 반드시 값을 확인하세요.', 'done');
    else _planSetStatus('문서에서 인식 가능한 항목을 찾지 못했습니다.', 'err');
  });
}

function parsePlanWithAI(text, callback){
  var truncated = text.length > PLAN_TEXT_LIMIT ? text.slice(0, PLAN_TEXT_LIMIT) : text;
  var prompt = '다음은 지방자치단체 사업계획서 문서에서 추출한 텍스트입니다.\n\n'
    + '[문서 내용]\n' + truncated + '\n\n'
    + '위 문서를 읽고 아래 항목을 찾아 오직 JSON 객체 하나만 응답하세요. 그 외 설명이나 마크다운은 절대 포함하지 마세요.\n'
    + '{\n'
    + '  "name": "사업명 (문서에 나온 그대로, 모르면 빈 문자열)",\n'
    + '  "type": "다음 중 하나만: general/office/culture/complex/promo/event/debt/joint/foreign 중 가장 가까운 값. '
    +      '(general=일반투자사업, office=청사 신축, culture=문화체육시설, complex=청사+문화체육 복합시설, '
    +      'promo=홍보관, event=행사성 사업, debt=채무부담행위, joint=공동협력사업, foreign=외국자본도입사업). 판단 불가하면 빈 문자열",\n'
    + '  "cost": "총사업비 숫자만(억원 단위, 예: 373.5), 모르면 0",\n'
    + '  "location": "사업 위치·대상지 (없으면 빈 문자열)",\n'
    + '  "stage": "다음 중 하나만: plan/basic/basic_done/detail/detail_done '
    +      '(plan=사업계획수립, basic=기본설계중, basic_done=기본설계완료, detail=실시설계중, detail_done=실시설계완료). 모르면 plan",\n'
    + '  "finance": "재원조달·재원구성 내역이 문서에 명시된 경우에만 각 재원의 금액(억원 숫자)을 채우고, '
    +      '명시되지 않았으면 모두 0. {\\"nat\\": 국비, \\"prov\\": 도비, \\"city\\": 시비, \\"bond\\": 지방채, \\"priv\\": 민간자본}",\n'
    + '  "area": "건축 연면적(㎡ 숫자만, 문서에 있으면. 없으면 0)",\n'
    + '  "reserveIncluded": "총사업비에 예비비(10%)가 포함되어 있다고 문서에 명시된 경우 true '
    +      '(예: 총사업비 268억원(예비비 포함)), 명시가 없으면 false"\n'
    + '}';
  callAI(prompt, function(resp, err){
    if(err){ callback(null, err); return; }
    try{
      var m = resp.match(/\{[\s\S]*\}/);
      if(!m){ callback(null, 'AI 응답에서 JSON을 찾을 수 없습니다.'); return; }
      callback(JSON.parse(m[0]), null);
    }catch(e){
      callback(null, '응답 형식 오류: ' + e.message);
    }
  });
}

function applyParsedPlanToForm(data){
  if(!data || typeof data!=='object') return 0;
  var applied = 0;
  var typeSet = ['general','office','culture','complex','promo','event','debt','joint','foreign'];
  var stageSet = ['plan','basic','basic_done','detail','detail_done'];

  /* 다른 단계 필드도 함께 채웠을 때, 어느 탭이 채워졌는지 안내에 표시 */
  var filledTabs = [];

  if(data.name){ sv('f_name', String(data.name).trim()); applied++; }
  if(data.type && typeSet.indexOf(data.type)>=0){
    sv('f_type', data.type);
    if(typeof onTypeChange==='function') onTypeChange();
    applied++;
  }
  var cost = parseFloat(data.cost);
  if(!isNaN(cost) && cost>0){ sv('f_cost', cost); applied++; }
  if(data.stage && stageSet.indexOf(data.stage)>=0){ sv('f_stage', data.stage); applied++; }

  /* ── 재원구성 단계 자동 입력 (문서에 재원조달 내역이 있는 경우) ── */
  var fin = data.finance || {};
  var finMap = [['f_nat',fin.nat,'국비'],['f_prov',fin.prov,'도비'],['f_city',fin.city,'시비'],
                ['f_bond',fin.bond,'지방채'],['f_priv',fin.priv,'민자']];
  var finParts = [], finSum = 0;
  finMap.forEach(function(f){
    var val = parseFloat(f[1]);
    if(!isNaN(val) && val>0){ sv(f[0], val); applied++; finSum += val; finParts.push(f[2]+' '+val+'억'); }
  });
  if(finParts.length){ filledTabs.push('재원구성(' + finParts.join('·') + ')'); }

  /* ── 총사업비에 예비비 포함 여부 자동 체크 (문서에 명시된 경우) ── */
  if(data.reserveIncluded === true){
    sc('f_reserve', true);
    if(typeof onReserveChg==='function') onReserveChg();   /* 경고문 갱신 */
    applied++;
    filledTabs.push('기본정보(예비비 포함 체크)');
  }

  /* ── 사업비 단계 연면적 자동 입력 (계산기 미렌더 시점 대비 전역 보관) ── */
  var area = parseFloat(data.area);
  if(!isNaN(area) && area>0){
    window.gParsedArea = area;               /* goToStep('calc')에서 적용 */
    if(v('ci_area')){ sv('ci_area', area); applied++; }  /* 이미 렌더돼 있으면 즉시 반영 */
    filledTabs.push('사업비·기간(연면적 ' + area.toLocaleString() + '㎡)');
  }

  var box = v('upload-box');
  if(box){
    var banner = document.getElementById('plan-applied-banner');
    if(!banner){
      banner = document.createElement('div');
      banner.id = 'plan-applied-banner';
      banner.className = 'upload-applied-banner';
      box.appendChild(banner);
    }
    var html = '&#9989; AI가 문서에서 읽어 자동으로 채운 값입니다. 각 단계 입력 필드에서 반드시 확인·수정 후 사용하세요.';
    if(data.location) html += '<br>&#128205; 문서에서 확인된 위치: ' + esc(String(data.location));
    if(filledTabs.length) html += '<br>&#128260; 다른 단계에도 자동 입력됨 &#8594; ' + esc(filledTabs.join(' / '));
    if(finParts.length && cost>0 && Math.abs(finSum-cost) >= 0.5)
      html += '<br>&#9888; 재원 합계(' + finSum + '억)와 총사업비(' + cost + '억)가 달라 재원구성 탭에서 확인이 필요합니다.';
    banner.innerHTML = html;
  }
  if(typeof updateSummary==='function') updateSummary();
  if(typeof scheduleAutoSave==='function') scheduleAutoSave();
  return applied;
}
