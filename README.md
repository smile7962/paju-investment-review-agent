# 파주시 지방재정 투자심사 사전판단·의뢰서 작성 보조 도구

**파주시청 AI 혁신동아리 ACE팀 | v3.0**

## 파일 구조

```
/
├── index.html          # 진입점 (HTML 구조만 포함)
├── css/
│   └── styles.css      # 전체 스타일 — UI 수정 시 편집
├── data/
│   └── data.js         # ★ 운영기준 데이터·상수 — 매년 개정 시 편집
└── js/
    ├── utils.js        # 전역변수·헬퍼 함수 (의존: 없음)
    ├── rules.js        # 심사기관·재심사 판정 (의존: utils, data)
    ├── calc.js         # 사업비 산출·기간 계산 (의존: utils, data)
    ├── render.js       # 화면 렌더링 (의존: utils, data, rules, calc)
    ├── draft.js        # 의뢰서·AI·Word 내보내기 (의존: utils, data, rules, render)
    ├── project.js      # 다중 사업 관리·자동저장·JSON (의존: utils)
    └── ui.js           # UI 제어·위저드·설정 모달 (의존: utils, project)
```

## 수정 가이드

| 상황 | 수정 파일 |
|------|-----------|
| 운영기준 개정 (심사기준 금액 변경) | `data/data.js` + `js/rules.js` |
| 서울시 공사비 단가 갱신 | `data/data.js` (UNIT_PRICE_DB 섹션) |
| 화면 UI 변경 | `css/styles.css` |
| 판정 로직 오류 수정 | `js/rules.js` |
| 사업비 계산 오류 수정 | `js/calc.js` |
| 의뢰서 내용 수정 | `js/render.js` + `js/draft.js` |
| 사업 관리 기능 수정 | `js/project.js` |
| 단계 위저드 수정 | `js/ui.js` |

## 근거 문서

- 지방재정 투자심사 및 타당성조사 운영기준 (행안부, 2025.4.30.)
- 지방재정법 시행령 제41조 제2항 (대통령령 제35186호, 2025.1.7.)
- 투자심사·타당성조사 심사규칙 (행안부령 제464호)
- 서울시 공공건축물 건립 공사비 책정 가이드라인 (2024)

## 배포 URL

`https://smile7962.github.io/paju-investment-review-agent/`

---
*본 도구는 참고용 보조 도구입니다. 최종 심사 판단은 운영기준 원문을 확인하시기 바랍니다.*
