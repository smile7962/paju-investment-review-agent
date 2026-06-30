/* js/rules.js — 투자심사 판정 로직
   ★ 운영기준 개정 시 data.js 와 함께 검토
   의존: utils.js, data.js */

function getAuthority(type,cost,isSelf,isJoint,natRatio){
  /* 파주시(시·군·구) 기준 — 지방재정법 시행령 제41조 제2항(대통령령 제35186호, 2025.1.7.)
     ※ 파주시는 인구 100만 미만이므로 대도시(특례시) 상향 기준 미적용 */
  if(natRatio>=70) return {type:'exempt',label:'면제',reason:'총사업비의 70% 이상을 국가에서 지원',law:'지방재정법 시행령 별표 제25호',range:'국비 70% 이상 당연면제'};
  if(type==='foreign'){
    if(cost<10) return {type:'none',label:'심사 불필요',law:'시행령 제41조 제2항 제3호 나목 (10억원 미만)',range:'10억 미만 비대상'};
    return {type:'central',label:'중앙(행안부) 의뢰심사',law:'시행령 제41조 제2항 제3호 나목 (외국자본 도입 10억원 이상)',range:'10억 이상 전부 중앙'};
  }
  if(type==='debt'){
    if(cost<20) return {type:'self',label:'자체심사',law:'시행령 제41조 제2항 제1호 바목',range:'20억 미만 자체 (하한 없음)'};
    if(cost<50) return {type:'gyeonggi',label:'경기도 의뢰심사',law:'시행령 제41조 제2항 제2호 바목',range:'20~50억 시·도 의뢰'};
    return {type:'central',label:'중앙(행안부) 의뢰심사',law:'시행령 제41조 제2항 제3호 마목',range:'50억 이상 중앙'};
  }
  if(isJoint){
    if(cost<20) return {type:'none',label:'심사 불필요',law:'공동협력사업 20억원 미만 (운영기준 심사대상표)',range:'20억 미만 비대상'};
    if(cost<60) return {type:'self',label:'자체심사',law:'시행령 제41조 제2항 제1호',range:'20~60억 자체심사'};
    if(cost<500) return {type:'gyeonggi',label:'경기도 의뢰심사',law:'시행령 제41조 제2항 제2호 마목',range:'60~500억 시·도 의뢰'};
    return {type:'central',label:'중앙(행안부) 의뢰심사',law:'시행령 제41조 제2항 제3호 라목',range:'500억 이상 중앙'};
  }
  if(type==='event'){
    if(cost<1) return {type:'none',label:'심사 불필요',law:'행사성 사업 1억원 미만',range:'1억 미만 비대상'};
    if(cost<3) return {type:'self',label:'자체심사',law:'시행령 제41조 제2항 제1호 마목',range:'1~3억 자체심사'};
    if(cost<200) return {type:'gyeonggi',label:'경기도 의뢰심사',law:'시행령 제41조 제2항 제2호 다목',range:'3~200억 시·도 의뢰'};
    return {type:'central',label:'중앙(행안부) 의뢰심사',law:'시행령 제41조 제2항 제3호 다목',range:'200억 이상 중앙'};
  }
  if(type==='promo'){
    if(cost<3) return {type:'none',label:'심사 불필요',law:'홍보관 사업 3억원 미만',range:'3억 미만 비대상'};
    if(cost<60) return {type:'self',label:'자체심사',law:'시행령 제41조 제2항 제1호 라목',range:'3~60억 자체심사'};
    if(cost<200) return {type:'gyeonggi',label:'경기도 의뢰심사',law:'시행령 제41조 제2항 제2호 나목',range:'60~200억 시·도 의뢰'};
    return {type:'central',label:'중앙(행안부) 의뢰심사',law:'시행령 제41조 제2항 제3호 다목',range:'200억 이상 중앙'};
  }
  if(type==='office'||type==='culture'||type==='complex'){
    if(isSelf){
      if(cost<20) return {type:'none',label:'심사 불필요',law:'기준금액(20억원) 미만',range:'20억 미만 비대상'};
      if(cost<60) return {type:'self',label:'자체심사',law:'시행령 제41조 제2항 제1호 나목',range:'20~60억 자체심사'};
      return {type:'gyeonggi',label:'경기도 의뢰심사',law:'시행령 제41조 제2항 제2호 라목 (전액 자체재원 청사·문화·체육 60억 이상 — 중앙심사 없음)',range:'60억 이상 전부 시·도 의뢰'};
    }
    if(cost<20) return {type:'none',label:'심사 불필요',law:'기준금액(20억원) 미만',range:'20억 미만 비대상'};
    if(cost<60) return {type:'self',label:'자체심사',law:'시행령 제41조 제2항 제1호 가목',range:'20~60억 자체심사'};
    if(cost<200) return {type:'gyeonggi',label:'경기도 의뢰심사',law:'시행령 제41조 제2항 제2호 가목',range:'60~200억 시·도 의뢰'};
    return {type:'central',label:'중앙(행안부) 의뢰심사',law:'시행령 제41조 제2항 제3호 가목',range:'200억 이상 중앙'};
  }
  if(isSelf){
    if(cost<20) return {type:'none',label:'심사 불필요',law:'기준금액(20억원) 미만',range:'20억 미만 비대상'};
    return {type:'self',label:'자체심사',law:'시행령 제41조 제2항 제1호 다목 (전액 자체재원 일반투자사업 — 금액 상한 없이 자체심사)',range:'20억 이상 전부 자체심사'};
  }
  if(cost<20) return {type:'none',label:'심사 불필요',law:'기준금액(20억원) 미만',range:'20억 미만 비대상'};
  if(cost<60) return {type:'self',label:'자체심사',law:'시행령 제41조 제2항 제1호 가목',range:'20~60억 자체심사'};
  if(cost<200) return {type:'gyeonggi',label:'경기도 의뢰심사',law:'시행령 제41조 제2항 제2호 가목',range:'60~200억 시·도 의뢰'};
  return {type:'central',label:'중앙(행안부) 의뢰심사',law:'시행령 제41조 제2항 제3호 가목',range:'200억 이상 중앙'};
}
function getReReview(o){
  /* ｢지방재정투자사업 심사규칙｣ 제6조 (행정안전부령 제464호) — 재심사 7개 사유 + 제외요건 */
  var triggers=[], notes=[];
  var cost=o.cost||0, prevCost=o.prevCost||0, deduct=o.deduct||0;
  var adj=Math.max(0,cost-deduct);
  if(prevCost>0&&cost>0){
    var inc=adj-prevCost;
    var rate=inc/prevCost*100;
    var rawRate=(cost-prevCost)/prevCost*100;
    if(prevCost>=500){
      var thr=(prevCost-500)*0.2+150;
      if(inc>thr){
        triggers.push({t:'총사업비 기준액 초과 증가 ('+(deduct>0?'공제 후 ':'')+'+'+inc.toFixed(1)+'억 > 기준 '+thr.toFixed(1)+'억)',l:'심사규칙 제6조 제1호 단서 — 500억 이상: (심사당시 총사업비-500억)×20%+150억 초과 시'});
      } else if((cost-prevCost)>thr&&deduct>0){
        notes.push('명목 증가액 '+(cost-prevCost).toFixed(1)+'억원이나 물가상승분·손실보상비 공제('+deduct+'억) 적용 시 기준액('+thr.toFixed(1)+'억) 이내로 재심사 비대상 — 공제 산정근거(건설공사비지수·건설투자 GDP디플레이터, 감정평가서 등)를 반드시 보관하세요.');
      }
    } else if(rate>=30){
      triggers.push({t:'총사업비 30% 이상 증가 ('+(deduct>0?'공제 후 ':'')+rate.toFixed(1)+'%, '+prevCost+'억 → '+cost+'억)',l:'심사규칙 제6조 제1호 (2024.3월 개정으로 50%→30% 강화)'});
    } else if(rawRate>=30&&deduct>0){
      notes.push('명목 증가율 '+rawRate.toFixed(1)+'%이나 물가상승분·손실보상비 공제('+deduct+'억) 적용 시 '+rate.toFixed(1)+'%로 재심사 비대상 — 단, 연면적·연장 증가에 따른 공사비 증가분과 부지면적 증가에 따른 보상비 증가분은 공제할 수 없습니다(운영기준 Ⅱ-7).');
    }
  }
  var prevBond=o.prevBond||0, curBond=o.curBond||0, selfFund=o.selfFund||0;
  if(prevBond>0&&curBond>=prevBond*1.3)
    triggers.push({t:'지방채 발행액 30% 이상 증가 ('+prevBond+'억 → '+curBond+'억, +'+((curBond-prevBond)/prevBond*100).toFixed(1)+'%)',l:'심사규칙 제6조 제2호'});
  if(prevBond===0&&curBond>0&&selfFund>0&&curBond>selfFund*0.5)
    triggers.push({t:'지방채 발행계획 신설 — 자체재원('+selfFund.toFixed(1)+'억)의 50%를 초과한 발행('+curBond+'억)',l:'심사규칙 제6조 제3호 (파주시: 인구 100만 미만 시·군·구 → 50% 기준 적용)'});
  if(o.bondChg) triggers.push({t:'지방채 발행계획 변경 (담당자 확인)',l:'심사규칙 제6조 제2·3호'});
  if((o.years||0)>=4)
    triggers.push({t:'투자심사 후 4년 이상 사업추진 지연·보류 ('+o.years+'년)',l:'심사규칙 제6조 제4호 — 다음연도부터 기산하여 4년 이상 본공사 미착공(계약일 기준) 또는 4년 이상 사업예산 미편성'});
  var ord={self:1,gyeonggi:2,central:3};
  if(o.prevAuth&&o.curAuth&&ord[o.curAuth]>ord[o.prevAuth]){
    var nm={self:'자체심사',gyeonggi:'경기도 의뢰',central:'중앙 의뢰'};
    triggers.push({t:'재원조달 변경으로 심사기관 상위기관 변경 ('+(nm[o.prevAuth]||o.prevAuth)+' → '+(nm[o.curAuth]||o.curAuth)+')',l:'심사규칙 제6조 제5호 ※ 당해 회계연도 예산 기반영 + 자체재원 비중 90% 이상 사업은 제외'});
  }
  if(o.siteChg) triggers.push({t:'사업부지 위치 변경',l:'심사규칙 제6조 제6호 ※ 동일 읍·면·동(법정동) 내 이동, 도로·철도 일부 구간 변경은 제외'});
  if(o.auditReq) triggers.push({t:'감사원 감사결과에 따른 재심사 요청',l:'심사규칙 제6조 제7호'});
  var excluded=false, exclNote='';
  if(triggers.length>0&&o.spent&&o.spent!=='none'){
    excluded=true;
    exclNote=(o.spent==='over_const'?'시설사업의 기성대가가 본공사 계약금액의 10% 이상 지출(부지 보상비·선금 제외)':'총사업비의 25% 이상 기지출')
      +'되어 재심사 제외 대상에 해당할 수 있습니다. 다만 재심사 대상임이 객관적으로 예상된 상태에서 지출을 진행한 경우 제외가 인정되지 않으며, 사업추진 단계별(기본계획→타당성조사→기본설계→실시설계→본공사계약→시공)로 재심사 요건 해당 즉시 다음 절차 진행 전에 재심사를 의뢰해야 합니다. (운영기준 Ⅱ-7-3·4)';
  }
  return {triggers:triggers, notes:notes, excluded:excluded, exclNote:exclNote};
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
function getDeadline(){
  var now=new Date();
  var y=now.getFullYear();
  var deadlines=[
    {label:'1차',date:new Date(y,0,15),comp:new Date(y,2,31)},
    {label:'2차',date:new Date(y,3,15),comp:new Date(y,5,30)},
    {label:'3차',date:new Date(y,6,15),comp:new Date(y,8,30)},
    {label:'1차',date:new Date(y+1,0,15),comp:new Date(y+1,2,31)},
  ];
  for(var i=0;i<deadlines.length;i++){
    var d=deadlines[i];
    if(now<=d.date){
      var diff=Math.ceil((d.date-now)/(1000*60*60*24));
      return {label:d.label,
        date:d.date.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'}),
        remain:diff,
        comp:d.comp.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'})};
    }
  }
  return null;
}
function getCentralDeadline(){
  var now=new Date();
  var y=now.getFullYear();
  var deadlines=[
    {label:'1\ucc28',date:new Date(y,0,31),comp:new Date(y,2,31)},
    {label:'2\ucc28',date:new Date(y,3,30),comp:new Date(y,5,30)},
    {label:'3\ucc28',date:new Date(y,6,31),comp:new Date(y,8,30)},
    {label:'1\ucc28',date:new Date(y+1,0,31),comp:new Date(y+1,2,31)},
  ];
  for(var i=0;i<deadlines.length;i++){
    var d=deadlines[i];
    if(now<=d.date){
      var diff=Math.ceil((d.date-now)/(1000*60*60*24));
      return {label:d.label,
        date:d.date.toLocaleDateString('ko-KR',{year:'numeric',month:'long',day:'numeric'}),
        remain:diff};
    }
  }
  return null;
}
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

/* Node 단위 테스트용 export — 브라우저에선 module이 정의되지 않아 무시됨 */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getAuthority, getReReview, getDeadline, getCentralDeadline };
}
