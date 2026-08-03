/* ═══════════════════════════════════════════════════════════════
   영상 안내 — 소개 영상 / 사용 안내 영상

   ▸ 경연 기간에는 접속 시 자동으로 선택 창을 띄우고,
     경연 종료 후에는 아래 VIDEO_INTRO_MODE 를 'header' 로만 바꾸면
     자동 노출이 꺼지고 헤더의 [영상 안내] 버튼만 남는다.
   ▸ 유튜브 영상 ID 는 VIDEO_LIST 의 id 값에만 넣으면 되고,
     비어 있는 동안에는 자동 노출을 하지 않고 '준비 중'으로 안내한다.
   ═══════════════════════════════════════════════════════════════ */

/* 'contest' = 접속 시 자동 노출(경연용)  /  'header' = 헤더 버튼으로만 열기 */
var VIDEO_INTRO_MODE = 'contest';

/* 유튜브 영상 ID (주소 https://youtu.be/XXXXXXXXXXX 의 XXXXXXXXXXX 11자리) */
var VIDEO_LIST = [
  { key:'promo', id:'dS3gZgr2aKo', title:'소개 영상', dur:'2:25', primary:true,
    desc:'담당자의 막막함이 어떻게 완성된 의뢰서가 되는지<br>2분 25초 영상으로 보여드립니다.',
    grad:'linear-gradient(135deg,#0f172a,#c2410c)', accent:'#c2410c' },
  { key:'guide', id:'zJqurHe0yPo', title:'사용 안내 영상', dur:'3:55', primary:false,
    desc:'AI 설정부터 출력까지 9단계 사용법을<br>순서대로 안내합니다.',
    grad:'linear-gradient(135deg,#1e3a5f,#2563eb)', accent:'#2563eb' }
];

/* 영상 파일 직접 내려받기 주소(사내망에서 유튜브가 막힌 경우 대비). 비우면 안내문만 표시 */
var VIDEO_DOWNLOAD_URL = '';

var VIDEO_SKIP_KEY = 'ace_video_intro_skip';

function hasAnyVideo(){
  for (var i=0;i<VIDEO_LIST.length;i++){ if (VIDEO_LIST[i].id) return true; }
  return false;
}

/* 표시 순서 — 준비된 영상을 먼저(크게) 보여준다.
   둘 다 준비되면 primary 로 지정한 영상(소개 영상)이 앞으로 온다. */
function videoDisplayOrder(){
  var ready = [], soon = [];
  VIDEO_LIST.forEach(function(vd, i){ (vd.id ? ready : soon).push(i); });
  ready.sort(function(a,b){ return (VIDEO_LIST[b].primary?1:0) - (VIDEO_LIST[a].primary?1:0); });
  return ready.concat(soon);
}

/* ── 목록(카드) 화면 ── */
function renderVideoList(){
  var body = v('video-modal-body');
  if (!body) return;
  var h = '<div class="vid-head">'
    + '<div class="vid-brand">A I &nbsp; C O R E &nbsp; E X P E R T</div>'
    + '<div class="vid-title">재정투자 사전판단 · 의뢰서 작성 에이전트</div>'
    + '<div class="vid-sub">빈 화면 앞의 막막함을 <b>3분</b> 만에 확인해 보세요</div>'
    + '</div><div class="vid-cards">';

  var order = videoDisplayOrder();
  order.forEach(function(i, pos){
    var vd = VIDEO_LIST[i];
    var lead = (pos === 0 && vd.id);   /* 준비된 영상 중 첫 번째만 강조 */
    h += '<div class="vid-card' + (lead ? ' primary' : '') + (vd.id ? '' : ' soon')
      + '" data-vid="' + i + '" role="button" tabindex="0">'
      + (lead ? '<span class="vid-tag">먼저 보기</span>' : '')
      + '<div class="vid-thumb" style="background:' + vd.grad + '">'
      + '<div class="vid-play" style="color:' + vd.accent + '">&#9654;</div>'
      + '<span class="vid-dur">' + (vd.id ? vd.dur : '준비 중') + '</span></div>'
      + '<div class="vid-meta"><div class="vid-name">' + esc(vd.title) + '</div>'
      + '<div class="vid-desc">' + vd.desc + '</div></div></div>';
  });
  h += '</div>';

  if (!hasAnyVideo()) {
    h += '<div class="vid-note">&#9432; 영상을 준비 중입니다. 곧 이 화면에서 시청하실 수 있습니다.</div>';
  }
  body.innerHTML = h;

  Array.prototype.forEach.call(body.querySelectorAll('.vid-card'), function(el){
    el.addEventListener('click', function(){ playVideo(+el.getAttribute('data-vid')); });
    el.addEventListener('keydown', function(e){
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); playVideo(+el.getAttribute('data-vid')); }
    });
  });
}

/* ── 재생 화면 ── */
function playVideo(idx){
  var vd = VIDEO_LIST[idx];
  var body = v('video-modal-body');
  if (!vd || !body) return;

  var h = '<div class="vid-player-hd">'
    + '<button type="button" class="vid-back" onclick="renderVideoList()">&#8592; 목록</button>'
    + '<span class="vid-player-name">' + esc(vd.title) + '</span>'
    + '<span class="vid-player-dur">' + vd.dur + '</span></div>';

  if (vd.id) {
    /* 개인정보 보호 모드(youtube-nocookie)로 임베드 */
    var src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(vd.id)
      + '?rel=0&modestbranding=1&cc_load_policy=1&autoplay=1';
    h += '<div class="vid-frame"><iframe src="' + src + '" title="' + esc(vd.title) + '" '
      + 'frameborder="0" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" '
      + 'allowfullscreen></iframe></div>';
  } else {
    h += '<div class="vid-frame vid-frame-empty" style="background:' + vd.grad + '">'
      + '<div><div class="vid-play vid-play-lg">&#9654;</div>'
      + '<div class="vid-empty-txt">영상을 준비 중입니다</div></div></div>';
  }

  h += '<div class="vid-note">&#9432; 재생되지 않는 경우 '
    + (VIDEO_DOWNLOAD_URL
        ? '<a href="' + VIDEO_DOWNLOAD_URL + '" target="_blank" rel="noopener">파일 다운로드</a>를 이용하세요.'
        : '사내망에서 유튜브 접속이 제한되었을 수 있습니다.')
    + '</div>';
  body.innerHTML = h;
}

/* ── 열기 / 닫기 ── */
function openVideoModal(){
  var ov = v('videoModal');
  if (!ov) return;
  renderVideoList();
  ov.classList.add('open');
  document.addEventListener('keydown', videoEscHandler);
  var first = ov.querySelector('.vid-card');
  if (first) first.focus();
}

function closeVideoModal(){
  var ov = v('videoModal');
  if (!ov) return;
  ov.classList.remove('open');
  /* iframe 을 비워 재생을 확실히 중단 */
  var body = v('video-modal-body');
  if (body) body.innerHTML = '';
  document.removeEventListener('keydown', videoEscHandler);
  var chk = v('video-skip-chk');
  if (chk && chk.checked) { try { localStorage.setItem(VIDEO_SKIP_KEY, '1'); } catch(e){} }
}

function videoEscHandler(e){ if (e.key === 'Escape') closeVideoModal(); }

/* ── 첫 진입 시 자동 노출 판단 ── */
function initVideoIntro(){
  var forced = false;
  try { forced = /[?&]intro=1(&|$)/.test(location.search); } catch(e){}

  if (!forced) {
    if (VIDEO_INTRO_MODE !== 'contest') return;   /* 경연 종료 후엔 헤더 버튼만 */
    if (!hasAnyVideo()) return;                   /* 영상 ID 가 없으면 띄우지 않음 */
    var skip = false;
    try { skip = localStorage.getItem(VIDEO_SKIP_KEY) === '1'; } catch(e){}
    if (skip) return;
  }
  setTimeout(openVideoModal, 350);
}

/* ── 초기화 (본 스크립트는 ui.js 뒤에서 로드된다) ── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initVideoIntro);
} else {
  initVideoIntro();
}
