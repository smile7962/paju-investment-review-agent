/* js/render.js — 화면 렌더링 함수
   의존: utils.js, data.js, rules.js, calc.js */

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

  /* ── KPI 리포트 카드 (OpenGov·ClearGov 스타일) — 결론 직후 핵심 숫자 4개 ──
     행정업무에 맞게 "신뢰도 %" 대신 검증 가능한 값(건수·항목수)만 사용 */
  var kpiLocal = gnv('f_city') + (r.bond||0);              /* 지방비 부담 = 시비+지방채 */
  var kpiChecks = (typeof getActiveKeys==='function') ? getActiveKeys(r.checkKeys).length : 0;
  var kpiRe = r.reTrig.length;
  h+='<div class="kpi-row">';
  h+='<div class="kpi-card"><div class="kpi-label">총사업비</div>'
    +'<div class="kpi-val">'+Number(r.cost).toLocaleString()+'<span class="kpi-unit">억원</span></div>'
    +'<div class="kpi-sub">'+(typeMap[r.type]||'')+'</div></div>';
  h+='<div class="kpi-card"><div class="kpi-label">지방비 부담</div>'
    +'<div class="kpi-val">'+kpiLocal.toLocaleString()+'<span class="kpi-unit">억원</span></div>'
    +'<div class="kpi-sub">시비+지방채</div></div>';
  h+='<div class="kpi-card"><div class="kpi-label">사전절차 점검항목</div>'
    +'<div class="kpi-val">'+kpiChecks+'<span class="kpi-unit">개</span></div>'
    +'<div class="kpi-sub">아래 체크리스트에서 이행</div></div>';
  h+='<div class="kpi-card'+(kpiRe>0?' kpi-warn':'')+'"><div class="kpi-label">재심사 사유</div>'
    +'<div class="kpi-val">'+kpiRe+'<span class="kpi-unit">건</span></div>'
    +'<div class="kpi-sub">'+(kpiRe>0?'확인 필요':'해당 없음')+'</div></div>';
  h+='</div>';

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
    {no:'6',item:'주민수혜·참여',cont:'주민 수혜도(%) / 숙원도 / 참여인원',guide:'(수혜주민/전체주민)\xd7100으로 산출',ex:'예: 4.63%(23,719명/511,308명)'},
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
    {no:'6',item:'주민수혜·요구',cont:'주민 수혜도(%) / 주민 숙원도',guide:'(수혜주민/전체주민)\xd7100으로 산출',ex:'예: 4.63%(23,719명/511,308명)'},
    {no:'7',item:'필요성·시급성',cont:'사업의 필요성·시급성 / 파급효과',guide:'현황 및 통계자료 첨부',ex:''},
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
function renderDraft(r) {
  var typeMap={general:'일반투자사업',office:'청사 신축사업',
    culture:'문화·체육시설 신축사업',complex:'복합시설(청사+문화체육)',
    promo:'홍보관 사업',event:'행사성 사업',debt:'채무부담행위',joint:'공동협력사업'};
  var now=new Date();
  var today=now.getFullYear()+'년 '+(now.getMonth()+1)+'월 '+now.getDate()+'일';
  var name=gv('f_name')||'(사업명 미입력)';
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
    h+=noAI?'':'<button class="draft-ai-section-btn" data-ai-num="'+safeNum+'" data-ai-title="'+title+'" title="AI로 이 항목만 새로 작성">&#129302; AI</button>';
    h+=noAI?'':'<button class="draft-chat-edit-btn" data-chat-num="'+safeNum+'" data-chat-title="'+title+'" title="AI 채팅으로 이 항목 대화하며 수정">&#128172; 채팅수정</button>';
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
  highlightNeeds();  /* 미처리 [담당자…] 표시 래핑 + 담당자 입력 필요 개수 카운터 갱신 */
  
    /* ── 이벤트 위임: 편집·AI 버튼 ──
       draft-box는 renderDraft가 재호출될 때마다 innerHTML만 교체되고 엘리먼트 자체는
       유지되므로, 매번 리스너를 추가하면 재분석·기간반영 등으로 여러 번 렌더링될 때
       클릭 1회에 핸들러가 N번 실행되어(편집 토글이 켜졌다 즉시 꺼짐) 버튼이 먹통이 된다.
       data 속성으로 1회만 바인딩되도록 가드한다. */
    (function(){
      var box=v('draft-box');
      if(!box || box.dataset.editDelegated) return;
      box.dataset.editDelegated='1';
      box.addEventListener('click',function(e){
        /* 편집 버튼 */
        var editBtn=e.target.closest('[data-edit-id]');
        if(editBtn){
          toggleEdit(editBtn.getAttribute('data-edit-id'));
          return;
        }
        /* AI 버튼(원샷 재작성) */
        var aiBtn=e.target.closest('[data-ai-num]');
        if(aiBtn){
          aiSection(
            aiBtn.getAttribute('data-ai-num').replace(/_/g,'-'),
            aiBtn.getAttribute('data-ai-title')
          );
          return;
        }
        /* 채팅수정 버튼(대화로 항목 다듬기) */
        var chatBtn=e.target.closest('[data-chat-num]');
        if(chatBtn){
          chatEditSection(
            chatBtn.getAttribute('data-chat-num').replace(/_/g,'-'),
            chatBtn.getAttribute('data-chat-title')
          );
          return;
        }
      });
    })();
}
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
  h+='<div class="calc-input-wrap"><input type="number" class="calc-input" id="f_cost_calc_d" value="'+cost+'" oninput="checkCostDiff()" onchange="checkCostDiff()"><span class="calc-unit">억원</span></div></div>';
  h+='<div class="calc-field"><div class="calc-label">예비비</div>';
  h+='<label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" id="ci_reserve_apply_d" checked onchange="recalcCost()"> 예비비 10% 포함 (운영기준 총사업비 산정)</label></div>';
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
  calcPeriod(true);  /* 초기 렌더 — 사용자 미조작이므로 요약칩에 노출하지 않음 */
}
function chapterTitle(txt,anchor){
    return '<div class="draft-chapter-anchor" id="'+anchor+'"></div>'
      +'<div class="draft-chapter-title">'+txt+'</div>';
  }
function sec(num, title, content, noAI){
    var id='sec-'+num.replace(/-/g,'_');
    var safeNum=num.replace(/\./g,'').replace(/-/g,'_');
    var h='<div class="draft-section" id="'+id+'">';
    h+='<div class="draft-section-header">';
    h+='<span class="draft-section-num">'+num+'</span>';
    h+='<span class="draft-section-title">'+title+'</span>';
    h+='<button class="draft-edit-btn" data-edit-id="'+id+'_content" title="직접 편집">✏ 편집</button>';
    h+=noAI?'':'<button class="draft-ai-section-btn" data-ai-num="'+safeNum+'" data-ai-title="'+title+'" title="AI로 이 항목만 새로 작성">&#129302; AI</button>';
    h+=noAI?'':'<button class="draft-chat-edit-btn" data-chat-num="'+safeNum+'" data-chat-title="'+title+'" title="AI 채팅으로 이 항목 대화하며 수정">&#128172; 채팅수정</button>';
    h+='</div>';
    h+='<div class="draft-content" id="'+id+'_content">'+content+'</div>';
    h+='</div>';
    return h;
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
function buildCheckKeys(type,cost,prov,reviewType,needsTang){
  var keys=['midterm','plan','priority','budget'];
  if(parseFloat(prov)>0) keys.push('gyeonggi');
  keys.push('national');
  if(needsTang) keys.push('tangibility');
  else keys.push('no_tangibility');
  if(type==='office'||type==='complex') keys.push('remodel');
  if(reviewType==='re') keys.push('resim_comply');
  return keys;
}
function getActiveKeys(keys){
  return keys.filter(function(k){ return CHECKS_META[k]&&CHECKS_META[k].level!=='na'; });
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
function highlightNeeds() {
  var contents = document.querySelectorAll('.draft-content');
  contents.forEach(function(el) {
    var txt = el.innerHTML;
    /* 이미 need()로 감싼 것은 재래핑하지 않음(중복 카운트 방지) */
    el.innerHTML = txt.replace(
      /(?<!class="need">)(\[담당자[^\]]*\])/g,
      '<span class="need">$1</span>'
    );
  });
  /* 담당자 입력 필요 개수 카운터 갱신 */
  var box = document.getElementById('draft-box');
  var badge = document.getElementById('need-count');
  if (badge && box) {
    var n = box.querySelectorAll('.need').length;
    if (n > 0) {
      badge.textContent = '담당자 입력 필요: ' + n + '곳';
      badge.className = 'need-count has-need';
    } else {
      badge.textContent = '✓ 담당자 입력 완료';
      badge.className = 'need-count done';
    }
  }
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
function secId(num){
  return 'sec-'+num.replace(/\./g,'').replace(/-/g,'_')+'_content';
}
function getSecEl(num){ return document.getElementById(secId(num)); }
function getSecText(num){
  var el=getSecEl(num);
  return el?(el.innerText||el.textContent||'').trim():'';
}
/* ── 항목별 직접 편집 토글 (draft-edit-btn 클릭 시 render.js의 이벤트 위임에서 호출) ── */
function toggleEdit(contentId){
  var el=v(contentId);
  if(!el) return;
  var isEditing=el.contentEditable==='true';
  if(isEditing){
    el.contentEditable='false';
    el.classList.remove('draft-edit-active');
    /* 편집 완료 후 need 강조 재적용(이미 감싼 곳은 재래핑하지 않음) */
    el.innerHTML=el.innerHTML.replace(
      /(?<!class="need">)(\[담당자[^\]]*\]|\[읍면동[^\]]*\]|\[착공[^\]]*\]|\[준공[^\]]*\])/g,
      '<span class="need">$1</span>');
    highlightNeeds();
  } else {
    el.contentEditable='true';
    el.classList.add('draft-edit-active');
    el.focus();
    var range=document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    var sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }
}
