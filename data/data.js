/* ═══════════════════════════════════════════════════════
   data/data.js — 운영기준 데이터·상수
   ★ 운영기준 개정(매년) 시 이 파일만 수정
   ★ 서울시 단가 갱신 시 UNIT_PRICE_DB 섹션 수정
═══════════════════════════════════════════════════════ */

// ── EXEMPT_META ──
var EXEMPT_META = {
  disaster:{label:'재해복구 등 원상복구를 목적으로 하는 사업',law:'지방재정법 제37조 제3항 제1호'},
  heritage:{label:'문화재수리 사업',law:'지방재정법 제37조 제3항 제2호 (문화재수리 등에 관한 법률 제2조 제1호)'},
  pubcorp:{label:'지방공사·공단 설립 사업',law:'지방재정법 제37조 제3항 제3호 (지방공기업법 제49조·제76조)'},
  health_fire:{label:'보건소·소방기관 건축 사업 (복합시설은 심사 대상)',law:'지방재정법 제37조 제3항 제4호'},
  decree:{label:'시행령 별표 당연면제 사업 (재해예방·하수도정비기본계획 반영사업 등)',law:'지방재정법 시행령 별표 제1호~제24호'}
};

// ── PROMPT_SYSTEM ──
var PROMPT_SYSTEM = {
  base:
    '당신은 경기도 파주시 지방재정 투자심사 전담 행정 보조 AI입니다.\n\n'
  + '▣ 전문 역할\n'
  + '「지방재정법」제37조 및 「지방재정투자사업 심사규칙」에 정통한 투자심사 전문가.\n'
  + '파주시(시·군·구 기준) 자체·경기도·중앙 투자심사 전 단계 작성 실무 전문가.\n\n'
  + '▣ 출력 형식 (절대 준수)\n'
  + '① 마크다운 완전 금지: **, *, #, ##, ---, ___ 등 일절 사용 금지\n'
  + '② 항목 시작: ◦ 또는 ○ 기호, 또는 자연스러운 문장 서술 방식 허용\n'
  + '③ 소항목: 「가.」「나.」또는「①②③」으로 구분\n'
  + '④ 강조: 「」 괄호 사용\n'
  + '⑤ 항목 제목: 【5-N 항목명】 형식\n'
  + '⑥ 표: 텍스트 형식 (마크다운 표 금지)\n\n'
  + '▣ 수치·사실 처리 원칙 (절대 준수)\n'
  + '① 아래 【사업 정보】에 명시된 수치만 사용\n'
  + '② 제공되지 않은 수치는 절대 임의 생성 금지\n'
  + '   → [담당자 입력 필요: 항목명] 형식으로 표시\n'
  + '③ 법령 인용은 반드시 조문 번호까지 명시\n'
  + '④ 파주시 인구 530,000명은 확정 수치 (사용 가능)\n'
  + '⑤ 연도별 투자계획 임의 배분 절대 금지\n'
  + '⑥ 사업 정보에 없는 특정 지명·시설명·인물명 추가 금지\n\n'
  + '▣ 작성 금지\n'
  + '① 조문 번호 없는 법령 인용\n'
  + '② 근거 없는 수치 생성 (B/C, IRR, NPV, 이용률, 경제유발효과 등)\n'
  + '③ "~될 것으로 기대됩니다" 등 추측 표현\n'
  + '④ 제공된 사업 정보 외 사실 임의 추가\n'
  + '⑤ 특정 동명·지명 등 사업 정보에 없는 고유명사 추가\n\n'
  + '▣ 작성 품질 기준\n'
  + '① 각 소항목(가·나·다)은 최소 3~5문장 이상 구체적으로 작성\n'
  + '② 심사위원이 "왜 이 사업이 필요한가"를 납득할 수 있는 논거 제시\n'
  + '③ 파주시 특성 반영: 수도권 북부 신도시 개발 지속, 인구 지속 유입,\n'
  + '   운정신도시 등 택지개발에 따른 공공시설 수요 급증\n'
  + '④ 단순 나열 금지 → 원인-현황-필요성 인과관계 중심 서술\n'
  + '⑤ 법령 조문은 반드시 조문 번호·항·호까지 정확히 인용\n'
  + '⑥ 수치가 없는 항목은 [담당자 입력 필요: 구체 항목명] 으로 표시\n'
  + '   단, 파주시 인구(530,000명)·법령 조문은 확정 수치로 직접 사용',

  kb:
    '\n\n▣ 내장 지식베이스: 지방재정 투자심사 및 타당성조사 운영기준(행정안전부, 2025.4.30. 개정) 요지\n'
  + '① 심사대상·기관(파주시 등 시·군·구 기준, 시행령 제41조 제2항):\n'
  + ' - 이전재원 포함 일반투자사업: 20억 미만 비대상 / 20~60억 자체심사 / 60~200억 경기도 의뢰 / 200억 이상 중앙(행안부)\n'
  + ' - 전액 자체재원 일반투자사업: 20억 이상이면 금액 상한 없이 전부 자체심사 (제1호 다목)\n'
  + ' - 전액 자체재원 청사·문화·체육시설 신축: 20~60억 자체 / 60억 이상 경기도 의뢰 (중앙심사 없음, 제2호 라목)\n'
  + ' - 홍보관: 3~60억 자체 / 60~200억 경기도 / 200억 이상 중앙. 행사성: 1~3억 자체 / 3~200억 경기도 / 200억 이상 중앙\n'
  + ' - 공동협력사업: 20억 미만 비대상 / 20~60억 자체 / 60~500억 경기도 / 500억 이상 중앙\n'
  + ' - 채무부담·보증채무·예산외의무부담: 20억 미만 자체 / 20~50억 경기도 / 50억 이상 중앙 (하한 없음)\n'
  + ' - 외국자본 도입사업: 10억 이상 전부 중앙심사(제3호 나목). 파주시는 인구 100만 미만으로 대도시 특례 미적용\n'
  + '② 심사 면제: 재해복구, 문화재수리, 지방공사·공단 설립, 보건소·소방기관 건축(복합시설 제외)(법 제37조③) + 시행령 별표 25개 당연면제(총사업비 70% 이상 국가지원 포함) + 협의면제(별표 제26호)\n'
  + '③ 재심사 사유(심사규칙 제6조): 1.총사업비 30% 이상 증가(물가인상분·손실보상비 공제 가능. 단 연면적·연장 증가 공사비, 부지면적 증가 보상비는 공제 불가. 500억 이상은 (심사당시총사업비-500억)×20%+150억 초과 시) 2.지방채발행액 30% 이상 증가 3.지방채 신설로 자체재원의 50% 초과 발행 4.4년 이상 지연(미착공)·보류(예산 미편성) 5.재원변경으로 심사기관 상위 변경 6.사업부지 위치 변경(동일 법정동 내 제외) 7.감사원 요청\n'
  + ' - 재심사 제외: 시설사업 기성대가 10% 이상 지출 또는 기타사업 총사업비 25% 이상 기지출(단 재심사 대상이 객관적으로 예상된 경우 즉시 의뢰 의무). 국가·민간 부담분만 증가한 경우 제외\n'
  + ' - 재심사 의뢰시기: 요건 해당 즉시, 다음 절차 진행 이전에 의뢰. 재심사 기관은 변경된 총사업비 기준 재판정\n'
  + '④ 총사업비 산정: 공사비(낙찰차액 미적용)+보상비+시설부대경비(설계·감리·조사측량 등)+운영설비비+제세공과금+예비비(합계의 10%) 모두 포함. 국가·민간 부담분, 기지출 비용, 융자사업비 포함. 계속사업은 5년간 사업비 합계로 판단. 실시설계 완료 후 예비비 제외 가능\n'
  + '⑤ 타당성조사: 총사업비 500억 이상 신규사업(실시설계 미발주)은 행안부 고시 전문기관의 타당성조사 후 투자심사(법 제37조의2). 예비타당성조사 등 기이행 시 면제\n'
  + '⑥ 정기심사 연 3회(3·6·9월): 파주시→경기도 의뢰 마감 1/15·4/15·7/15, 경기도→행안부 1/31·4/30·7/31, 결과통보 4·7·10월 중순\n'
  + '⑦ 예산편성 연계: 투자심사 통과(적정·조건부) 후에만 기본설계 용역(생략 시 실시설계) 예산 편성 가능. 부적정·재검토 사업은 국고보조금·특별교부세·시도비 지원 불가\n'
  + '⑧ 행사성 특례: 매년·격년 정기 행사는 3년마다 심사(직전 대비 20% 이상 증액 시 즉시 재심사). 행사 개최용 영구시설물은 별도 사업으로 심사\n'
  + '⑨ 지방재정영향평가: 행사성 사업(시·군·구 10억 이상), 공모 유치·응모 사업(총사업비 100억 이상 그리고 지방재정부담 50억 이상)은 평가서 제출\n'
  + '⑩ 2단계 심사: 1차 심사 조건부 통과 후 본공사 계약 전 재차 심사. 공사계약과 무관한 설계비·보상비 집행은 가능\n'
  + '※ 규정 질의에는 위 지식과 조문번호를 근거로 답하고, 위 지식 범위 밖이면 운영기준 원문 확인을 안내할 것.',

  gyeonggi:
    '\n\n▣ 경기도 의뢰심사 특화 (60~200억)\n'
  + '심사기관: 경기도 투자심사위원회 (15인 이내)\n'
  + '반드시 포함:\n'
  + '① 도비 확보 현황: 확보 시 보조율·회계명·확보 시기 명시. 미확보 시 [담당자 입력 필요]\n'
  + '② 재원조달능력 판단조서 작성 예정 여부\n'
  + '③ 경기도 중기지방재정계획 반영 여부: [담당자 입력 필요]\n'
  + '④ 경기도 공공건설심의 완료 여부 (공사비 5억↑ 복합공종)\n'
  + '부결 사유 사전 차단: 재원조달 미흡 / 주민수혜도 저조 / 준비 미비 / 타당성 저조',

  central:
    '\n\n▣ 행안부 중앙투자심사 특화 (200억 이상)\n'
  + '심사기관: 행정안전부 중앙투자심사위원회 (연 4회: 1·4·7·10월)\n'
  + '가장 엄격한 기준. 현지심사 가능성 고려하여 수치 중심 작성.\n'
  + '반드시 포함:\n'
  + '① 타당성조사 이행 여부 (5-5항 필수 명시)\n'
  + '   500억 이상: 전문기관 조사 완료 후 의뢰. [담당자 입력 필요: 조사결과]\n'
  + '   500억 미만: "총사업비 N억원으로 의무 타당성조사 대상 미해당 (500억↑)"\n'
  + '② 국비 확보 현황 (1-7항·5-6항 필수 명시)\n'
  + '   확보: "{부처} {사업명}, {연도}년 예산 반영 확정 공문번호: [담당자 입력]"\n'
  + '   미확보: [담당자 입력 필요: 신청 예정 부처·시기·공모사업명]\n'
  + '③ 재원조달능력 판단조서 반드시 작성 명시\n'
  + '④ 유사·중복시설 검토 (5-8항): 인근 유사시설 현황 [담당자 입력 필요]\n'
  + '⑤ 연도별 투자계획: [담당자 작성 필요] — 임의 배분 금지\n'
  + '부결 사유 차단: 국비 미확보 / B/C 1.0 미만 시 정책 타당성 보완 / 운영 적자 해소방안'
};

// ── PERIOD12_ITEMS ──
var PERIOD12_ITEMS = [
  ['pp_basic_plan','기본계획 수립',2,'사업계획 입안','사업부서'],
  ['pp_midterm','중기지방재정계획 반영',2,'중기지방재정계획','예산부서'],
  ['pp_property','공유재산 심의',2,'공유재산 및 물품 관리법','재산관리부서'],
  ['pp_feasibility','타당성조사·검토',6,'지방재정법 제37조의2','전문기관'],
  ['pp_review','투자심사',3,'지방재정투자사업 심사규칙 제4조','심사기관'],
  ['pp_design_comp','설계공모·계약',3,'건축서비스산업진흥법','사업부서'],
  ['pp_design','기본·실시설계',9,'설계용역','사업부서'],
  ['pp_consult','인증·관계기관 협의',3,'BF·녹색·에너지·교통 등','관계기관'],
  ['pp_permit','인허가',2,'건축허가 등','인허가부서'],
  ['pp_bid','발주·계약',2,'지방계약법','계약부서'],
  ['pp_construct','공사',24,'착공~준공','시공사'],
  ['pp_closeout','준공·개관 준비',2,'준공검사·이전·개관','사업부서']
];

// ── UNIT_PRICE_DB ──
var UNIT_PRICE_DB = {
  /* ══════════════════════════════════════════════════════
     서울시 공공건축물 건립 공사비 책정 가이드라인 (2024)
     서울특별시 기술심사담당관
     단위: 천원/㎡ (부가세 포함 / 신축 기준)
     규모 구간별 대표값 적용
     ══════════════════════════════════════════════════════ */

  /* 2-1. 업무시설 */
  office: [
    {sub:'동청사·행정복지센터',
     name:'행정복지센터 소형 (1,500㎡ 이하)',
     price:4179, range:'1,500㎡ 이하 신축',
     note:'서울시 가이드라인 동청사(자치회관) 1,500㎡ 미만 평균', selected:true},
    {sub:'동청사·행정복지센터',
     name:'행정복지센터 중형 (1,500~2,000㎡)',
     price:4067, range:'1,500~2,000㎡ 신축',
     note:'서울시 가이드라인 동청사(자치회관) 1,500~2,000㎡'},
    {sub:'동청사·행정복지센터',
     name:'행정복지센터 대형 (2,000㎡ 초과)',
     price:3974, range:'2,000㎡ 초과 신축',
     note:'서울시 가이드라인 동청사(자치회관) 2,000㎡ 초과'},
    {sub:'복지지원센터',
     name:'복지지원센터·주민센터 (5,000㎡ 미만)',
     price:4417, range:'5,000㎡ 미만 신축',
     note:'서울시 가이드라인 복지지원센터 5,000㎡ 미만'},
    {sub:'복지지원센터',
     name:'복지지원센터·주민센터 (5,000㎡ 이상)',
     price:4243, range:'5,000~15,000㎡ 신축',
     note:'서울시 가이드라인 복지지원센터 5,000~15,000㎡'},
    {sub:'복합청사·대형청사',
     name:'복합청사·대형청사 (4,000㎡ 미만)',
     price:3883, range:'3,000~4,000㎡ 신축',
     note:'서울시 가이드라인 복합청사(대형청사) 3,000~4,000㎡'},
    {sub:'복합청사·대형청사',
     name:'복합청사·대형청사 (4,000~10,000㎡)',
     price:3835, range:'4,000~10,000㎡ 신축',
     note:'서울시 가이드라인 복합청사(대형청사) 4,000~10,000㎡'},
    {sub:'공공업무사무소',
     name:'공공업무사무소 (1,500~5,000㎡)',
     price:4161, range:'1,500~5,000㎡ 신축',
     note:'서울시 가이드라인 공공업무사무소 평균 4,175'},
  ],

  /* 2-6. 운동시설 + 2-2. 문화·집회 + 2-4. 도서관 + 2-5. 청소년 */
  culture: [
    {sub:'체육관·체육센터',
     name:'국민체육센터 (3,500㎡ 미만)',
     price:4352, range:'3,500㎡ 미만 신축',
     note:'서울시 가이드라인 체육관(체육센터) 3,500㎡ 미만', selected:true},
    {sub:'체육관·체육센터',
     name:'국민체육센터 (3,500~5,000㎡)',
     price:4313, range:'3,500~5,000㎡ 신축',
     note:'서울시 가이드라인 체육관(체육센터) 3,500~5,000㎡'},
    {sub:'체육관·체육센터',
     name:'국민체육센터 (5,000~10,000㎡)',
     price:4222, range:'5,000~10,000㎡ 신축',
     note:'서울시 가이드라인 체육관(체육센터) 5,000~10,000㎡'},
    {sub:'체육관·체육센터',
     name:'국민체육센터 (10,000㎡ 초과)',
     price:4127, range:'10,000㎡ 초과 신축',
     note:'서울시 가이드라인 체육관(체육센터) 10,000㎡ 초과'},
    {sub:'문화·집회시설',
     name:'문화예술회관·문화집회시설 (3,000㎡ 미만)',
     price:5084, range:'3,000㎡ 미만 신축',
     note:'서울시 가이드라인 문화예술회관 3,000㎡ 미만'},
    {sub:'문화·집회시설',
     name:'문화예술회관·문화집회시설 (4,000~10,000㎡)',
     price:4916, range:'4,000~10,000㎡ 신축',
     note:'서울시 가이드라인 문화예술회관 4,000~10,000㎡'},
    {sub:'전시·박물관',
     name:'전시·박물관 (5,000~10,000㎡)',
     price:4643, range:'5,000~10,000㎡ 신축',
     note:'서울시 가이드라인 전시·박물관 5,000~10,000㎡'},
    {sub:'도서관',
     name:'공공도서관 (2,000~6,000㎡)',
     price:4354, range:'2,000~6,000㎡ 신축',
     note:'서울시 가이드라인 도서관 2,000~6,000㎡'},
    {sub:'도서관',
     name:'공공도서관 (6,000㎡ 초과)',
     price:4230, range:'6,000㎡ 초과 신축',
     note:'서울시 가이드라인 도서관 6,000㎡ 초과'},
    {sub:'청소년시설',
     name:'청소년·문화수련시설 (2,000~6,000㎡)',
     price:3860, range:'2,000~6,000㎡ 신축',
     note:'서울시 가이드라인 청소년·문화수련시설 2,000~6,000㎡'},
  ],

  /* 복합시설: 구성 비중 가중 평균 적용 */
  complex: [
    {sub:'복합시설',
     name:'행정복지센터 + 체육센터 (규모 중형, 50:50)',
     price:4200, range:'각 단가 평균',
     note:'동청사 4,061 + 체육관 4,352 평균 (면적 가중)', selected:true},
    {sub:'복합시설',
     name:'행정복지센터 + 체육센터 (청사 비중 높음 60%)',
     price:4150, range:'청사 60% + 체육 40%',
     note:'청사 4,061×0.6 + 체육 4,352×0.4 = 4,178 근사'},
    {sub:'복합시설',
     name:'복지지원센터 + 체육센터 (50:50)',
     price:4380, range:'각 단가 평균',
     note:'복지지원센터 4,417 + 체육관 4,352 평균'},
    {sub:'복합시설',
     name:'행정복지센터 + 문화·집회시설',
     price:4500, range:'청사+문화 면적 가중',
     note:'동청사 4,061 + 문화예술회관 4,916 평균'},
  ],

  /* 2-3. 복지시설 + 2-4. 보건·의료·교육 + 2-5. 노유자시설 */
  general: [
    {sub:'사회복지관',
     name:'종합사회복지관 (1,000~3,000㎡)',
     price:4298, range:'1,000~3,000㎡ 신축',
     note:'서울시 가이드라인 종합사회복지관 1,000~3,000㎡', selected:true},
    {sub:'사회복지관',
     name:'종합사회복지관 (3,000~5,000㎡)',
     price:4188, range:'3,000~5,000㎡ 신축',
     note:'서울시 가이드라인 종합사회복지관 3,000~5,000㎡'},
    {sub:'사회복지관',
     name:'장애인복지관 (1,000~3,000㎡)',
     price:3947, range:'1,000~3,000㎡ 신축',
     note:'서울시 가이드라인 장애인복지관 1,000~3,000㎡'},
    {sub:'노인복지시설',
     name:'노인복지센터 (1,000~3,000㎡)',
     price:4477, range:'1,000~3,000㎡ 신축',
     note:'서울시 가이드라인 노인복지센터 1,000~3,000㎡'},
    {sub:'노인복지시설',
     name:'노인요양시설 (2,000~5,000㎡)',
     price:4157, range:'2,000~5,000㎡ 신축',
     note:'서울시 가이드라인 노인요양 2,000~5,000㎡'},
    {sub:'보건·의료',
     name:'보건소 (2,000~3,000㎡)',
     price:3815, range:'2,000~3,000㎡ 신축',
     note:'서울시 가이드라인 보건소 2,000~3,000㎡'},
    {sub:'노유자시설',
     name:'어린이집·보육시설 (500~800㎡)',
     price:4902, range:'500~800㎡ 신축',
     note:'서울시 가이드라인 어린이집 500~800㎡'},
    {sub:'노유자시설',
     name:'어린이집·보육시설 (1,000㎡ 초과)',
     price:4615, range:'1,000㎡ 초과 신축',
     note:'서울시 가이드라인 어린이집 1,000㎡ 초과'},
    {sub:'노유자시설',
     name:'주민공동이용시설 (400㎡ 초과)',
     price:4365, range:'400㎡ 초과 신축',
     note:'서울시 가이드라인 주민공동이용시설'},
  ],

  /* 2-2. 전시·박물관 */
  promo: [
    {sub:'전시·홍보시설',
     name:'홍보관·전시관 (3,000~5,000㎡)',
     price:4712, range:'3,000~5,000㎡ 신축',
     note:'서울시 가이드라인 전시·박물관 3,000~5,000㎡', selected:true},
    {sub:'전시·홍보시설',
     name:'홍보관·전시관 소형 (3,000㎡ 미만)',
     price:4880, range:'3,000㎡ 미만 신축',
     note:'서울시 가이드라인 전시·박물관 3,000㎡ 미만'},
  ],
}

function showUnitPriceBox(type) {
  var box = document.getElementById('unit-price-box');
  if (!box) return;
  var db = UNIT_PRICE_DB[type];
  if (!db || db.length === 0) {
    box.className = 'unit-price-box';
    return;
  }
  var h = '<div class="unit-price-title">&#128200; 서울시 건축공사비 단가 (2024) — 클릭하면 자동 적용</div>';
  h += '<div class="unit-price-grid">';
  db.forEach(function(item, i) {
    var sel = item.selected ? ' selected' : '';
    h += '<div class="unit-price-card' + sel + '" onclick="applyUnitPrice(' + item.price + ',this)">';
    h += '<div class="upc-sub">' + item.sub + '</div>';
    h += '<div class="upc-name">' + item.name + '</div>';
    h += '<div class="upc-price">' + item.price.toLocaleString() + '<span class="upc-unit">천원/㎡</span></div>';
    h += '<div class="upc-range">' + item.range + '</div>';
    h += '<div style="font-size:9px;color:var(--g400);margin-top:2px">' + (item.note||'') + '</div>';
    h += '</div>';
  });
  h += '</div>';
  h += '<div class="upc-source">출처: 서울시 공공건축물 건립 공사비 책정 가이드라인(2024, 기술심사담당관) | 부가세 포함·신축 기준 | 지하층 포함 시 상향 적용</div>';
  h += '<div class="unit-price-note">&#9432; 위 단가는 지상층 기준 평균값입니다. 지하주차장 포함 시 15~20% 상향, 특수시설(수영장·대형체육관 등) 포함 시 별도 검토하세요.</div>';
  box.innerHTML = h;
  box.className = 'unit-price-box show';
  /* 기본 선택 단가 자동 적용 */
  var defItem = db.find(function(d){ return d.selected; }) || db[0];
  if (defItem) applyUnitPriceSilent(defItem.price);
}

function applyUnitPrice(price, cardEl) {
  /* 카드 선택 표시 */
  var box = document.getElementById('unit-price-box');
  if (box) {
    var cards = box.querySelectorAll('.unit-price-card');
    cards.forEach(function(c){ c.classList.remove('selected'); });
    if (cardEl) cardEl.classList.add('selected');
  }
  applyUnitPriceSilent(price);
  /* 계산기 탭으로 이동하지 않고 안내만 */
  var note = document.getElementById('unit-applied-note');
  if (note) {
    note.textContent = '✅ ' + price.toLocaleString() + '천원/㎡ 적용됨 — 사업비 계산기에서 연면적을 입력하면 공사비가 자동 산출됩니다';
    note.style.display = 'block';
    setTimeout(function(){ note.style.display='none'; }, 4000);
  }
}

function applyUnitPriceSilent(price) {
  window.gLastUnit = price;
  /* ci_unit은 정적 DOM — 항상 존재 */
  var el = document.getElementById('ci_unit');
  if (el) {
    el.value = price;
    var hint = document.getElementById('ci_unit_hint');
    if (hint) hint.textContent = '서울시 가이드라인 자동 적용: ' + price.toLocaleString() + ' 천원/㎡';
    if (typeof recalcCost === 'function') recalcCost();
  }
  /* renderCalc 내 표시용 div도 동기화 */
  var disp = document.getElementById('ci_unit_display');
  if (disp) disp.textContent = price.toLocaleString();
}
function getCalcMode(){
  var r=document.querySelector('input[name="f_calc_mode"]:checked');
  return r?r.value:'simple';
}
function applyCalcModeVis(){
  var detail=(getCalcMode()==='detail');
  var uw=document.getElementById('ci_unit_wrap'); if(uw) uw.style.display=detail?'none':'';
  var ub=document.getElementById('unit-price-box'); if(ub) ub.style.display=detail?'none':'';
  if(detail){ var un=document.getElementById('unit-applied-note'); if(un) un.style.display='none'; }
}
function onCalcModeChange(){
  applyCalcModeVis();
  if(typeof gResult!=='undefined' && gResult && typeof renderCalc==='function') renderCalc(gResult);
  else if(typeof recalcCost==='function') recalcCost();
}
function onTypeChange() {
  var type = document.getElementById('f_type') ?
    document.getElementById('f_type').value : '';
  showUnitPriceBox(type);
  if(typeof applyCalcModeVis==='function') applyCalcModeVis();
  var erw=document.getElementById('event-regular-wrap');
  if(erw) erw.style.display=(type==='event')?'':'none';
  /* calc 탭이 이미 활성화된 상태이면 ci_unit 즉시 반영 */
  setTimeout(function(){
    var el=document.getElementById('ci_unit');
    if(el && window.gLastUnit){
      el.value=window.gLastUnit;
      var hint=document.getElementById('ci_unit_hint');
      if(hint) hint.textContent='서울시 가이드라인 자동 적용: '+window.gLastUnit.toLocaleString()+'천원/㎡';
      if(typeof recalcCost==='function') recalcCost();
    }
  },30);
  if(typeof calcAll==='function') calcAll();
}

/* 계산기 탭 렌더링 후 gLastUnit 복원 */
function restoreUnitFromType() {
  var el = document.getElementById('ci_unit');
  if (!el || !window.gLastUnit) return;
  /* 사업유형 선택 단가를 항상 우선 적용
     (담당자가 직접 수정했을 경우: 수정값 유지하고 싶으면 gLastUnit을 0으로 초기화) */
  if (!el.value || el.value === '') {
    el.value = window.gLastUnit;
    if (typeof recalcCost === 'function') recalcCost();
  }
  /* ci_unit 필드 하단에 출처 안내 표시 */
  var hint = document.getElementById('ci_unit_hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'ci_unit_hint';
    hint.style.cssText = 'font-size:10px;color:var(--pb);margin-top:3px;font-weight:600';
    if (el.parentNode && el.parentNode.parentNode)
      el.parentNode.parentNode.appendChild(hint);
  }
  hint.textContent = '서울시 가이드라인 자동 적용: ' + window.gLastUnit.toLocaleString() + '천원/㎡ (클릭하여 변경 가능)';
}

var COST37_GROUPS = [
  {key:'land', title:'용지·보상비 6항목', items:[
    ['c37_land_buy','부지매입비','필지별 취득가액','억원'],
    ['c37_land_comp','영업·지장물 보상비','감정평가 또는 보상계획','억원'],
    ['c37_land_reloc','이주·생활대책비','보상계획','억원'],
    ['c37_land_survey','측량·감정평가비','용역 견적','억원'],
    ['c37_land_tax','취득세·등기 등 제세공과금','세율 적용','억원'],
    ['c37_land_public','지방비 미수반 공유재산 가액','총사업비 포함, 예비비 제외 가능','억원']
  ]},
  {key:'construction', title:'공사비 8항목', items:[
    ['c37_const_civil','토목공사비','수량×단가','억원'],
    ['c37_const_arch','건축공사비','연면적×단위공사비 자동 산정 가능','억원'],
    ['c37_const_mech','기계설비공사비','공사비 산출내역','억원'],
    ['c37_const_elec','전기공사비','공사비 산출내역','억원'],
    ['c37_const_comm','통신·전산공사비','공사비 산출내역','억원'],
    ['c37_const_fire','소방공사비','공사비 산출내역','억원'],
    ['c37_const_landscape','조경·외부공사비','공사비 산출내역','억원'],
    ['c37_const_zeb','제로에너지·녹색건축 추가비','ZEB 적용 시 자동 산정 가능','억원']
  ]},
  {key:'design', title:'설계·용역비 8항목', items:[
    ['c37_design_basic','기본설계비','요율 또는 견적','억원'],
    ['c37_design_detail','실시설계비','요율 또는 견적','억원'],
    ['c37_design_intent','설계의도 구현비','건축서비스산업진흥법 관련','억원'],
    ['c37_design_comp','설계공모 보상비','공모 지침','억원'],
    ['c37_design_survey','현황측량·지반조사비','용역 견적','억원'],
    ['c37_design_cert','인증·BF·녹색·에너지 용역비','인증 수수료 및 용역','억원'],
    ['c37_design_ve','VE·기술검토비','용역 견적','억원'],
    ['c37_design_pm','사업관리·기본계획 용역비','기본계획·타당성 검토','억원']
  ]},
  {key:'supervision', title:'감리·CM 3항목', items:[
    ['c37_cm_normal','건설사업관리·감리비','CM 방식별 자동 산정 가능','억원'],
    ['c37_cm_safety','안전점검·품질관리비','법정 점검','억원'],
    ['c37_cm_commission','공사감독 위탁수수료','위탁계약','억원']
  ]},
  {key:'facility', title:'시설부대경비 6항목', items:[
    ['c37_facility_impact','교통·환경·재해 영향평가비','대상 시 산정','억원'],
    ['c37_facility_permit','인허가·심의 수수료','법정 수수료','억원'],
    ['c37_facility_art','미술작품 설치비','문화예술진흥법 검토','억원'],
    ['c37_facility_insurance','보험·보증·안전관리비','공사 관련 보험','억원'],
    ['c37_facility_open','개관·이전 준비비','이전·개관 준비','억원'],
    ['c37_facility_misc','기타 시설부대비','산출근거 직접 입력','억원']
  ]},
  {key:'equipment', title:'운영설비비 6항목', items:[
    ['c37_equip_furniture','집기·비품 구입비','품목별 견적','억원'],
    ['c37_equip_it','전산·통신 장비비','서버·네트워크·PC','억원'],
    ['c37_equip_security','보안·관제·방송설비비','CCTV·방송·출입통제','억원'],
    ['c37_equip_special','특수설비·전문장비비','시설유형별 장비','억원'],
    ['c37_equip_book','도서·콘텐츠·자료 구입비','도서관 등 해당 시','억원'],
    ['c37_equip_ops','운영 개시 초기물품비','소모품·초기 운영물품','억원']
  ]}
];

// ── BENEFIT_UNIT ──
var BENEFIT_UNIT = {
  office:  180,   /* 행정서비스 이동시간 절감 편익 */
  culture: 250,   /* 체육시설 건강증진 편익 */
  complex: 210,   /* 복합시설 평균 */
  general: 200,   /* 일반시설 */
  promo:   150,
  joint:   200
};

// ── USER_UNIT ──
var USER_UNIT = {
  office:  8,    /* 행정복지센터 */
  culture: 15,   /* 체육관·문화시설 */
  complex: 11,   /* 복합 평균 */
  general: 10,
  promo:   12,
  joint:   10
};

// ── CHECKS_META_ANCHOR ──
var CHECKS_META_ANCHOR=1;

