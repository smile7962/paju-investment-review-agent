/* js/calc.js — 사업비 산출·기간 계산
   의존: utils.js, data.js */

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
  gCalcTotal=totalCalc;
  projectData.cost={area:area,unitCost:unit,items:rows,groupTotals:groupTotals,reserveFee:reserveFee,calculatedTotal:totalCalc};
  updateSummary();
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
function applyPeriodToForm(total, construct) {
  sv('pp_construct', construct);
  var el=v('pp_construct'); if(el) el.value=construct;
  alert('사업기간 '+total+'개월이 의뢰서 1-5항에 반영됩니다.\n의뢰서 초안 탭에서 확인하세요.');
  renderDraft(gResult);
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
function applyCostFromCalc(val) {
  sv('f_cost', val);
  var el = v('f_cost');
  if(el){ el.value = val; el.style.background='#e8f5e9'; setTimeout(function(){el.style.background='';},1000); }
  v('cost-diff-warn') && (v('cost-diff-warn').style.display='none');
}
function c37Val(id){
  var qtyEl=v(id+'_qty'), unitEl=v(id+'_unit');
  var q=parseFloat(qtyEl&&qtyEl.value!==''?qtyEl.value:1)||0;
  var u=parseFloat(unitEl&&unitEl.value!==''?unitEl.value:0)||0;
  return q*u;
}
function toggleC37(){
  var wrap=v('c37-wrap'), arrow=v('c37-arrow');
  if(!wrap) return;
  var open=wrap.style.display!=='none';
  wrap.style.display=open?'none':'block';
  if(arrow) arrow.style.transform=open?'':'rotate(180deg)';
}
function syncLegacyLand(){
  var land=gnv('ci_land')||0;
  var unit=v('c37_land_buy_unit'), qty=v('c37_land_buy_qty'), bas=v('c37_land_buy_basis');
  if(land>0 && unit && !unit.value){ if(qty&&!qty.value)qty.value=1; unit.value=land; if(bas&&!bas.value)bas.value='기존 보상비 간편 입력'; }
}
function checkCostDiff() {
  recalcCost();
}
