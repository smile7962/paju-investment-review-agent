/* js/draft.js — 의뢰서 작성·AI 연동·Word 내보내기
   의존: utils.js, data.js, rules.js, render.js */

function downloadDocx() {
  if(!gResult){alert('먼저 투자심사 판단을 실행하세요.');return;}
  if(typeof docx==='undefined'){
    if(typeof gDocxError!=='undefined'&&gDocxError){
      if(confirm('Word 라이브러리 로드 실패.\n[확인] 재시도  [취소] 인쇄(PDF)')){
        gDocxError=false;
        var s=document.createElement('script');
        s.src='https://cdn.jsdelivr.net/npm/docx@9.6.1/build/index.js';
        s.onload=function(){gDocxReady=true;downloadDocx();};
        s.onerror=function(){gDocxError=true;alert('재시도 실패. 인쇄 기능을 이용하세요.');};
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
function buildSystemPrompt(r) {
  var sys = PROMPT_SYSTEM.base + (PROMPT_SYSTEM.kb||'');
  if (!r) return sys;
  if (r.auth && r.auth.type === 'gyeonggi') sys += PROMPT_SYSTEM.gyeonggi;
  if (r.auth && r.auth.type === 'central')  sys += PROMPT_SYSTEM.central;
  return sys;
}
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
      document.getElementById('claude-model-select').value : 'claude-sonnet-5');
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
  } else {
    var geminiModel = (document.getElementById('gemini-model-select') ?
      document.getElementById('gemini-model-select').value : 'gemini-3.5-flash');
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
      + 'Gemini: 20~40초 / Claude: 30초~1분 소요</div>'
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
function genAI(r) {
  // 기존 단발성 생성 → AI 탭으로 전환만
  switchRT('ai');
  var nokey = v('ai-nokey-notice');
  if (nokey) nokey.style.display = gKey ? 'none' : 'block';
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
