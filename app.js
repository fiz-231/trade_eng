(() => {
'use strict';
const DATA = window.TRADE_ENGLISH_DATA;
const root = document.querySelector('#app');
const LS_PREFIX = 'trade_english_cbt_v4_';
const LIMIT_MS = 90*60*1000;
const SUBJECTS = ['영문해석','영작문','무역실무'];
const examMap = new Map((DATA?.exams || []).map(e => [e.exam_id,e]));
const allQuestions = (DATA?.exams || []).flatMap(e=>e.questions);
const qMap = new Map(allQuestions.map(q=>[q.id,q]));
const passageMap = new Map((DATA?.exams || []).flatMap(e=>e.shared_passages||[]).map(p=>[p.id,p]));
const state = {mode:'home', examId:null, current:0, reviewId:null, reviewExam:'ALL', reviewFilter:'priority', reviewQuery:'',reviewLimit:100,pdfVisible:false};
let fallbackStorage={};
const readStore=(key,def)=>{try{const v=localStorage.getItem(LS_PREFIX+key);return v?JSON.parse(v):def;}catch(e){return fallbackStorage[key]??def;}};
const writeStore=(key,v)=>{fallbackStorage[key]=v;try{localStorage.setItem(LS_PREFIX+key,JSON.stringify(v));}catch(e){toast('저장소 사용 제한: 내보내기로 기록을 보존하세요.');}};
let edits = readStore('edits',{question_edits:{},passage_edits:{},review_status:{}});
if(!edits || typeof edits!=='object')edits={question_edits:{},passage_edits:{},review_status:{}};
edits.question_edits ||= {};edits.passage_edits ||= {};edits.review_status ||= {};
let toastTimer;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attr=esc;
const formatNum=x=>Number(x).toLocaleString('ko-KR');
const dateText=e=>`${e.year}년 제${e.session}회 · ${e.form}형`;
const toYear=e=>`${e.year} · ${e.session}회 · ${e.form}형`;
function toast(s){const el=document.querySelector('#toast');el.textContent=s;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3500);}
function getSession(id){return readStore('exam_'+id,null);}
function saveSession(id,s){writeStore('exam_'+id,s);}
function getQEdit(q){return edits.question_edits[q.id]||{};}
function getPassageLead(q){return q.shared_passage_id?(passageMap.get(q.shared_passage_id)?.lead_in||''):'';}
function getPassage(q){if(!q.shared_passage_id)return '';const x=edits.passage_edits[q.shared_passage_id];return x!==undefined?x:(q.shared_passage_text||passageMap.get(q.shared_passage_id)?.text||'');}
function getQuestionText(q){return getQEdit(q).question_text??q.question_text;}
function getOptionText(q,n){const x=getQEdit(q);return x.options?.[n]??q.options.find(o=>o.number===n)?.text??'';}
function getAccepted(q){return getQEdit(q).accepted??q.answer.accepted??[];}
function isScoring(q){return getQEdit(q).scoring_enabled??q.scoring_enabled;}
function reviewStatus(id){return edits.review_status[id]?.status||'pending';}
function statusLabel(s){return ({pending:'미검수',confirmed:'원문 확인',corrected:'수정 완료',hold:'보류'})[s]||'미검수';}
function statusChip(s){return s==='confirmed'||s==='corrected'?'green':s==='hold'?'warning':'grey';}
function pdfUrl(q){return 'original_pdfs/'+encodeURI(q.source.file)+'#page='+q.source.page;}
function imageTag(file,alt,cls='source-image'){return `<a href="${attr(file)}" target="_blank" rel="noopener" title="이미지를 새 탭에서 확대"><img class="${cls}" src="${attr(file)}" alt="${attr(alt)}" loading="lazy"></a>`;}
function questionAnswerClass(q,n,selected,reveal){let c='choice';if(selected===n)c+=' chosen';if(reveal&&isScoring(q)){if(getAccepted(q).includes(n))c+=' correct';else if(selected===n)c+=' incorrect';}return c;}
function currentExam(){return examMap.get(state.examId);}
function activeQuestion(){return currentExam()?.questions[state.current];}
function redraw(){if(!DATA){root.innerHTML='<div class="alert">문제은행을 불러올 수 없습니다. data.js 파일이 index.html과 같은 폴더에 있어야 합니다.</div>';return;}document.querySelector('#nav-home').classList.toggle('active',state.mode==='home'||state.mode==='exam');document.querySelector('#nav-review').classList.toggle('active',state.mode==='review');if(state.mode==='home')renderHome();else if(state.mode==='exam')renderExam();else if(state.mode==='review')renderReview();}
function renderHome(){const exams=[...DATA.exams].sort((a,b)=>a.year-b.year||a.session-b.session||a.form.localeCompare(b.form));
root.innerHTML=`<section class="hero"><div><div class="hero-kicker">TRADE ENGLISH · CERTIFICATION PRACTICE</div><h1>기출문제, 실제 시험처럼.</h1><p>원본 시험지 기반 1급 문제은행. 회차별 90분 모의시험과 자동 채점, 오답 확인, PDF 원본 검수를 한곳에서 이용할 수 있습니다.</p></div><span class="hero-tag">오프라인 브라우저 실행 · 계정 불필요</span></section>
<div class="stats"><div class="panel stat"><div class="val">26</div><div class="lbl">시험지 · A/B형 각각</div></div><div class="panel stat"><div class="val">1,942</div><div class="lbl">모두정답 8문항 제외</div></div><div class="panel stat"><div class="val">290</div><div class="lbl">원본 대조 우선 문항</div></div><div class="panel stat"><div class="val">2</div><div class="lbl">정답 검토로 채점 보류</div></div></div>
<div class="alert info">원문 자동 검증 단계의 결과물이므로 모든 문항의 육안 교정이 완료된 것은 아닙니다. 원본 대조가 필요한 문항은 <strong>원본 검수</strong>에서 확인·수정할 수 있습니다. 정답이 불확실한 2문항은 점수에 포함하지 않습니다.</div>
<div class="rowbuttons" style="margin:14px 0 18px"><button class="btn" data-action="export-progress">풀이 기록 JSON 백업</button><button class="btn" data-action="import-progress">풀이 기록 불러오기</button></div>
<div class="between section-head"><div><h2>회차별 시험 선택</h2><p>각 시험지에서 모두정답 문항은 제거되었으므로 일부 회차는 74문항으로 출제됩니다.</p></div><button class="btn ghost" data-action="review">검수 화면 열기</button></div>
<section class="exam-grid">${exams.map(e=>{const s=getSession(e.exam_id),n=e.questions.length,ans=s?Object.keys(s.answers||{}).length:0;return `<article class="exam-card panel"><div class="exam-card-top"><div><div class="date">${esc(e.year)}년 제${e.session}회</div><div class="meta">무역영어 1급 · 90분 · ${n}문항</div></div><span class="chip">${e.form}형</span></div><div class="between"><span class="muted small">영문해석 · 영작문 · 무역실무</span>${e.excluded_all_correct_count?`<span class="chip warning">모두정답 ${e.excluded_all_correct_count} 제외</span>`:''}</div><div class="card-actions"><button class="btn primary" style="flex:1" data-action="${s?(s.submittedAt?'result':'resume'):'start'}" data-exam="${e.exam_id}">${!s?'시험 시작':s.submittedAt?'결과 보기':`이어 풀기 (${ans}/${n})`}</button><button class="btn" data-action="review-exam" data-exam="${e.exam_id}">원본 검수</button></div></article>`}).join('')}</section>
<p class="footer-note">출처: 사용자가 제공한 대한상공회의소 기출 PDF와 정답 엑셀. 2015~2020년 당시의 시험기준으로 제작된 자료이며, 법령·국제규칙의 현재 내용과 차이가 있을 수 있습니다. 개인 학습용 웹 시제품입니다.</p>`;
}
function startExam(id,reset=false){const e=examMap.get(id);if(!e)return;const existing=getSession(id);if(reset&&existing&&!confirm('이 회차의 기존 답안과 결과를 삭제하고 다시 시작할까요?'))return;
let s=(!reset&&existing)?existing:{startedAt:Date.now(),answers:{},bookmarks:{},submittedAt:null};if(!s.startedAt)s.startedAt=Date.now();saveSession(id,s);state.mode='exam';state.examId=id;state.current=0;redraw();window.scrollTo(0,0);}
function secondsRemaining(s){if(s.submittedAt)return Math.max(0,Math.ceil((LIMIT_MS-(s.submittedAt-s.startedAt))/1000));return Math.max(0,Math.ceil((LIMIT_MS-(Date.now()-s.startedAt))/1000));}
function timerLabel(secs){const h=Math.floor(secs/3600),m=Math.floor((secs%3600)/60),ss=Math.floor(secs%60);return [h,m,ss].map(x=>String(x).padStart(2,'0')).join(':');}
function scoreExam(e,s){const rows=e.questions.map(q=>{const picked=s.answers[q.id]??null,eligible=!!isScoring(q),accepted=getAccepted(q),correct=eligible&&picked!==null&&accepted.includes(Number(picked));return {q,selected:picked,eligible,correct};});const eligible=rows.filter(x=>x.eligible),correct=eligible.filter(x=>x.correct);const bySubject=SUBJECTS.map(k=>{const a=rows.filter(r=>r.q.subject===k&&r.eligible);return {subject:k,total:a.length,correct:a.filter(r=>r.correct).length};});return {rows,eligible:eligible.length,correct:correct.length,percentage:eligible.length?Math.round(correct.length/eligible.length*1000)/10:0,bySubject,pending:rows.filter(r=>!r.eligible).length, unanswered:rows.filter(r=>r.selected===null).length};}
function confirmSubmit(){const e=currentExam(),s=getSession(e.exam_id);if(!s||s.submittedAt)return;const n=e.questions.filter(q=>s.answers[q.id]===undefined).length;if(n&&!confirm(`아직 답하지 않은 문제가 ${n}개 있습니다. 제출할까요?`))return;finishExam();}
function finishExam(){const e=currentExam(),s=getSession(e?.exam_id);if(!s||s.submittedAt)return;s.submittedAt=Date.now();saveSession(e.exam_id,s);redraw();window.scrollTo(0,0);}
function questionMarkup(q,s,idx,reveal=false){const picked=s?.answers[q.id]??null;const p=getPassage(q);const visuals=q.visual_assets||[];const ref=q.source_reference_images||[];
return `<div class="between"><span class="subject-label">${esc(q.subject)}</span><span class="qnum">문제 ${q.number} · ${idx+1}/${currentExam().questions.length}</span></div>
${p?`<div class="passage"><div class="passage-lead">${esc(getPassageLead(q)||'공통 지문')}</div>${esc(p)}</div>`:''}
<div class="question-text">${esc(getQuestionText(q))}</div>
<div class="choices" role="group" aria-label="${q.number}번 선택지">${[1,2,3,4].map(n=>{const opt=getOptionText(q,n);const img=visuals.find(a=>a.choice===n);return `<button type="button" class="${questionAnswerClass(q,n,picked,reveal)}" data-choice="${n}" ${reveal?'disabled':''} aria-pressed="${picked===n}"><span class="choice-index">${n}</span><span class="choice-text">${esc(opt)}${img?`<img class="choice-img" src="${attr(img.file)}" alt="${n}번 그래프 보기">`:''}</span>${reveal&&isScoring(q)&&getAccepted(q).includes(n)?'<span class="choice-right">정답</span>':''}${reveal&&picked===n&&isScoring(q)&&!getAccepted(q).includes(n)?'<span class="choice-wrong">선택</span>':''}</button>`}).join('')}</div>
${!isScoring(q)?`<div class="alert" style="margin-top:15px">이 문항은 정답 검토 중으로, 최종 성적의 채점 문항 수에서 제외됩니다.${reveal?' 원본 답안 표기: '+esc(q.answer.raw||'미확인'):''}</div>`:''}
${ref.length?`<details class="image-preview"><summary>원본 이미지 보기 · 서식/본문 대조 필요</summary>${ref.map(a=>`<figure><img src="${attr(a.file)}" alt="${q.number}번 PDF ${a.page}페이지 원본 이미지" loading="lazy"><figcaption>원본 PDF ${a.page}페이지 · ${esc(a.kind||'문항')}</figcaption></figure>`).join('')}</details>`:''}`;
}
function renderExam(){const e=currentExam(),s=getSession(e?.exam_id);if(!e||!s){state.mode='home';renderHome();return;}if(!s.submittedAt&&secondsRemaining(s)===0){finishExam();return;}const done=!!s.submittedAt;const q=activeQuestion();const sc=scoreExam(e,s);const progress=Object.keys(s.answers).length;
let report='';if(done){report=`<div class="panel pad" style="margin-bottom:18px"><div class="between"><div><span class="eyebrow">EXAM RESULT</span><h1 style="margin-top:6px">${esc(dateText(e))} 채점 결과</h1></div><button class="btn" data-action="reset-exam" data-exam="${e.exam_id}">다시 풀기</button></div><div class="scoreboard"><div class="panel score"><div class="big">${sc.percentage}%</div><div class="label">총 정답률 · 채점 가능 기준</div></div><div class="panel score"><div class="big">${sc.correct} / ${sc.eligible}</div><div class="label">정답 / 채점 가능 문항</div></div><div class="panel score"><div class="big">${sc.unanswered}</div><div class="label">미응답 문항</div></div></div><table><thead><tr><th>과목</th><th>정답/채점문항</th><th>정답률</th></tr></thead><tbody>${sc.bySubject.map(r=>`<tr><td>${r.subject}</td><td>${r.correct} / ${r.total}</td><td>${r.total?Math.round(r.correct/r.total*100):0}%</td></tr>`).join('')}</tbody></table><div class="results-note">원문 교정이 완료되지 않은 문항이 있을 수 있습니다. ${sc.pending?`정답 확인 보류 <strong>${sc.pending}문항</strong>은 분모에서도 제외했어요.`:'채점 보류 문항은 없습니다.'} 아래에서 각 문제를 선택하면 정답과 내 답을 대조할 수 있습니다.</div><div class="rowbuttons"><button class="btn ghost" data-action="show-wrong">첫 오답으로 이동</button><button class="btn" data-action="review-exam" data-exam="${e.exam_id}">이 회차 원본 검수</button></div></div>`;}
root.innerHTML=`<div class="exam-titlebar"><div><div class="eyebrow">${done?'REVIEW YOUR ANSWERS':'TIMED PRACTICE · 90 MINUTES'}</div><h1>${esc(dateText(e))}</h1><p class="muted small">무역영어 1급 · ${e.questions.length}문항 · ${e.form}형</p></div><button class="btn" data-action="home">← 시험 선택</button></div>${report}
<div class="exam-layout"><div class="exam-main panel exam-question">${questionMarkup(q,s,state.current,done)}<div class="q-footer"><button class="btn" data-action="prev" ${state.current===0?'disabled':''}>← 이전 문제</button><div class="rowbuttons"><button class="btn ghost" data-action="bookmark">${s.bookmarks?.[q.id]?'◆ 표시 해제':'◇ 다시 보기'}</button>${done?'':`<button class="btn danger" data-action="submit">시험 제출</button>`}<button class="btn primary" data-action="next" ${state.current===e.questions.length-1?'disabled':''}>다음 문제 →</button></div></div>${done?`<p class="footer-note">정답: ${isScoring(q)?getAccepted(q).map(n=>n+'번').join(' / '):'채점 보류'} · 내 답: ${s.answers[q.id]===undefined?'미응답':s.answers[q.id]+'번'}</p>`:''}</div>
<aside class="exam-right panel pad"><div class="side-summary"><div><div class="muted small">${done?'풀이 종료':'남은 시간'}</div><div class="timer" id="examTimer">${timerLabel(secondsRemaining(s))}</div></div><span class="chip ${done?'green':'grey'}">${progress}/${e.questions.length} 응답</span></div><div class="progressbar" style="margin-top:15px"><span style="width:${progress/e.questions.length*100}%"></span></div><div class="subtle-sep"></div><div class="between"><h3>문항 바로가기</h3><span class="muted tiny">파랑: 응답 완료</span></div><div class="navgrid">${e.questions.map((x,i)=>`<button type="button" class="navq ${s.answers[x.id]!==undefined?'answered':''} ${i===state.current?'current':''} ${s.bookmarks?.[x.id]?'bookmark':''}" data-jump="${i}" aria-label="${x.number}번 문제">${x.number}</button>`).join('')}</div><div class="subtle-sep"></div><div class="between"><span class="small muted">미응답 ${e.questions.length-progress}개</span><span class="small muted">다시 보기 ${Object.values(s.bookmarks||{}).filter(Boolean).length}개</span></div>${done?'':`<button class="btn primary full" style="margin-top:18px" data-action="submit">제출하고 채점하기</button>`}<p class="footer-note">답안은 이 브라우저에 자동 저장됩니다. 브라우저 데이터를 삭제하면 기록도 사라질 수 있습니다.</p></aside></div>`;
}
function reviewItems(){let qs=allQuestions;if(state.reviewExam!=='ALL')qs=qs.filter(q=>q.exam_id===state.reviewExam);
if(state.reviewFilter==='priority')qs=qs.filter(q=>(q.source_reference_images||[]).length>0);
else if(state.reviewFilter==='pending')qs=qs.filter(q=>reviewStatus(q.id)==='pending');
else if(state.reviewFilter==='done')qs=qs.filter(q=>['confirmed','corrected'].includes(reviewStatus(q.id)));
else if(state.reviewFilter==='hold')qs=qs.filter(q=>reviewStatus(q.id)==='hold');
else if(state.reviewFilter==='scoring')qs=qs.filter(q=>!isScoring(q));
if(state.reviewQuery){const query=state.reviewQuery.toLowerCase();qs=qs.filter(q=>q.id.toLowerCase().includes(query)||getQuestionText(q).toLowerCase().includes(query)||q.subject.includes(query));}
return qs;
}
function toReview(examId='ALL'){state.mode='review';state.reviewExam=examId;state.reviewFilter='priority';state.reviewId=null;state.reviewQuery='';state.reviewLimit=100;state.pdfVisible=false;redraw();window.scrollTo(0,0);}
function renderReview(){const items=reviewItems();if(!items.some(q=>q.id===state.reviewId)){state.reviewId=items[0]?.id||null;state.pdfVisible=false;}const q=qMap.get(state.reviewId);const completed=Object.keys(edits.review_status).filter(id=>['confirmed','corrected'].includes(reviewStatus(id))).length;const fixed=Object.keys(edits.question_edits).length;const ptotal=Object.keys(edits.passage_edits).length;
root.innerHTML=`<div class="review-head"><div><div class="eyebrow">SOURCE VALIDATION WORKSPACE</div><h1>원본 검수 · 텍스트 보정</h1><p class="muted" style="font-size:13px;margin-top:6px">추출 텍스트와 원본 PDF 이미지/PDF를 비교하여 수정하고, 수정 결과를 별도 파일로 내보냅니다.</p></div><div class="review-actions"><button class="btn" data-action="import-patch">검수자료 불러오기</button><button class="btn" data-action="export-patch">검수자료 JSON</button><button class="btn" data-action="export-review-csv">검수 상태 CSV</button><button class="btn primary" data-action="export-complete">보정 반영 전체 JSON</button></div></div>
<div class="panel pad" style="margin-bottom:17px"><div class="review-stats"><div>전체 문항 <span class="num">1,942</span></div><div>원본 우선 검토 <span class="num">290</span></div><div>검증 완료 <span class="num">${completed}</span></div><div>개별 문항 보정 <span class="num">${fixed}</span></div><div>공통 지문 보정 <span class="num">${ptotal}</span></div></div><p class="footer-note" style="margin-top:8px">검증 완료는 검수자가 직접 저장한 상태만 집계합니다. 처음에는 전체 문항이 ‘미검수’로 시작합니다.</p></div>
<div class="review-layout"><aside class="panel pad review-left"><h3 class="pane-title">대조 대상 찾기</h3><div class="controls"><select id="reviewExam" class="select" aria-label="회차 선택"><option value="ALL">전체 회차 (26개)</option>${[...DATA.exams].sort((a,b)=>a.year-b.year||a.session-b.session||a.form.localeCompare(b.form)).map(e=>`<option value="${e.exam_id}" ${state.reviewExam===e.exam_id?'selected':''}>${esc(toYear(e))}</option>`).join('')}</select><select id="reviewFilter" class="select" aria-label="검수 상태 필터">${[['priority','원본 대조 우선 (290)'],['all','전체 문항'],['pending','미검수'],['done','검수 완료'],['hold','보류'],['scoring','채점 보류 (2)']].map(([v,l])=>`<option value="${v}" ${state.reviewFilter===v?'selected':''}>${l}</option>`).join('')}</select><div class="rowbuttons"><input id="reviewSearch" class="input" style="flex:1;min-width:100px" placeholder="문항 ID 또는 본문 검색" value="${attr(state.reviewQuery)}"><button class="btn smallbtn" data-action="review-search">검색</button></div></div><div class="between"><span class="muted small">검색 결과 ${formatNum(items.length)}문항</span><button class="btn smallbtn" data-action="review-clear">초기화</button></div><div class="divider"></div><div class="review-list">${items.slice(0,state.reviewLimit).map(x=>{const s=reviewStatus(x.id);return `<button data-review-pick="${x.id}" class="${state.reviewId===x.id?'selected':''}"><span><strong>${x.year}·${x.session}회 ${x.form} ${x.number}번</strong><br><small>${esc(x.subject)} ${x.source_reference_images.length?'· 원본 이미지':''}</small></span><span class="chip ${statusChip(s)}">${statusLabel(s)}</span></button>`}).join('')}</div>${items.length>state.reviewLimit?`<button class="btn full" style="margin-top:12px" data-action="review-more">더 보기 (${items.length-state.reviewLimit}문항 남음)</button>`:''}${!items.length?'<div class="blank">일치하는 문항이 없습니다.</div>':''}</aside>
${q?renderEditor(q):'<section class="panel pad"><div class="blank">대조할 문항을 선택하세요.</div></section>'}
${q?renderSources(q):'<section class="panel pad"><div class="blank">선택된 원본이 없습니다.</div></section>'}</div>`;
}
function renderEditor(q){const qe=getQEdit(q),ans=getAccepted(q);const passage=getPassage(q);const info=edits.review_status[q.id]||{};const hasShared=!!q.shared_passage_id;
return `<section class="panel pad review-editor"><div class="between" style="margin-bottom:12px"><div><div class="eyebrow">EXTRACTED TEXT</div><h2>${esc(dateText(q))} · ${q.number}번</h2></div><span class="chip ${statusChip(reviewStatus(q.id))}">${statusLabel(reviewStatus(q.id))}</span></div><p class="review-info">${esc(q.subject)} · 원본 PDF ${q.source.page}페이지 · ${q.source.column==='left'?'왼쪽':q.source.column==='right'?'오른쪽':'본문'}열 · ${q.source_reference_images.length?'원본 이미지 연결':'원본 PDF 참조'}</p>
${q.issues.length?`<div class="alert" style="margin:14px 0">${esc(q.issues.join(' / '))}</div>`:''}
${hasShared?`<div class="field"><label for="editPassage">공통 지문 · ${esc(q.shared_passage_id)}</label><textarea class="textarea tall" id="editPassage" spellcheck="false">${esc(passage)}</textarea><p class="review-info">공통 지문을 수정하면 같은 지문을 사용하는 문항 모두에 적용됩니다.</p></div>`:''}
<div class="field"><label for="editQuestion">문제 본문</label><textarea id="editQuestion" class="textarea tall" spellcheck="false">${esc(getQuestionText(q))}</textarea></div>
${[1,2,3,4].map(n=>`<div class="field"><label for="opt${n}">${n}번 선택지${q.visual_assets.some(x=>x.choice===n)?' · 아래에 원본 그래프 연결됨':''}</label><textarea id="opt${n}" class="textarea short" spellcheck="false">${esc(getOptionText(q,n))}</textarea></div>`).join('')}
<div class="divider"></div><div class="field"><label for="editAccepted">인정 정답 (1~4, 쉼표 구분 · 복수정답 허용)</label><input class="input" id="editAccepted" value="${attr(ans.join(', '))}" inputmode="numeric"><p class="review-info">원본 답안 표기: <strong>${esc(q.answer.raw)}</strong> · ${esc(q.answer_source.status)} · ${esc(q.answer_source.file)}</p></div>
<div class="field"><label><input id="editScoring" type="checkbox" ${isScoring(q)?'checked':''}> 자동 채점 허용</label><p class="review-info">정답이 불확실하면 해제. 원래 채점 보류인 2020년 1회 50번은 검증 전까지 체크하지 않는 것이 좋습니다.</p></div>
<div class="field"><label for="editReviewStatus">대조 처리 상태</label><select id="editReviewStatus" class="select">${[['pending','미검수'],['confirmed','원문 확인 완료'],['corrected','보정 완료'],['hold','검토 보류']].map(([v,n])=>`<option value="${v}" ${reviewStatus(q.id)===v?'selected':''}>${n}</option>`).join('')}</select></div>
<div class="field"><label for="editReviewNote">검수 메모</label><textarea id="editReviewNote" class="textarea short" placeholder="어떤 부분을 대조했는지 기록">${esc(info.note||'')}</textarea></div>
<div class="review-actions"><button class="btn primary" data-action="review-save">수정·검수 상태 저장</button><button class="btn" data-action="review-revert">이 문항의 수정 취소</button></div>
<p class="footer-note">저장은 현재 브라우저의 로컬 저장소에만 적용됩니다. 다른 기기에서 이용하거나 수정한 결과를 장기 보관하려면 상단의 ‘검수자료 JSON’을 내보내세요.</p></section>`;
}
function renderSources(q){const imgs=q.source_reference_images||[];const visuals=q.visual_assets||[];return `<section class="panel pad review-source"><div class="between" style="margin-bottom:12px"><div><div class="eyebrow">ORIGINAL EXAM SOURCE</div><h2>PDF 원본 대조</h2></div><span class="chip grey">${q.source.page}페이지</span></div><p class="review-info">원본: ${esc(q.source.file)}</p><div class="rowbuttons" style="margin:13px 0"><a class="btn smallbtn" href="${attr(pdfUrl(q))}" target="_blank" rel="noopener">원본 PDF 해당 페이지 ↗</a><button class="btn smallbtn" data-action="toggle-pdf">${state.pdfVisible?'PDF 미리보기 접기':'페이지 전체 미리보기'}</button></div>
${imgs.length?`<div class="source-gallery">${imgs.map((a,i)=>`<figure>${imageTag(a.file,'원본 '+q.id+' 대조 이미지 '+(i+1))}<figcaption>${esc(a.kind||'문항')} · ${a.page}페이지 / ${a.column==='left'?'왼쪽':a.column==='right'?'오른쪽':'본문'}열 · 클릭하여 확대</figcaption></figure>`).join('')}</div>`:'<div class="alert info">이 문항은 개별 잘라낸 이미지가 없습니다. 위 버튼으로 원본 PDF 해당 페이지를 열어 대조하세요.</div>'}
${visuals.length?`<div class="divider"></div><h3 style="margin-bottom:11px">그림 보기 (${visuals.length}개)</h3><div class="source-gallery">${visuals.map(x=>`<figure>${imageTag(x.file,'그림 보기 '+x.choice)}<figcaption>${x.choice}번 이미지 보기</figcaption></figure>`).join('')}</div>`:''}
${state.pdfVisible?`<iframe class="source-pdf" src="${attr(pdfUrl(q))}" title="${esc(q.id)} 전체 PDF 페이지"></iframe><p class="image-hint">일부 브라우저의 파일 보안 정책에 따라 PDF가 열리지 않으면 ‘원본 PDF 해당 페이지’를 클릭하세요.</p>`:''}<div class="divider"></div><p class="review-info">문항 ID: <strong>${esc(q.id)}</strong><br>공통 지문: <strong>${esc(q.shared_passage_id||'없음')}</strong><br>시각 원문 상태: <strong>${esc(q.proofread_status)}</strong></p></section>`;}
function saveReview(){const q=qMap.get(state.reviewId);if(!q)return;
const qt=document.querySelector('#editQuestion')?.value||'';const opts=Object.fromEntries([1,2,3,4].map(n=>[n,document.querySelector('#opt'+n)?.value||'']));
if(!qt.trim()){toast('문제 본문은 비워둘 수 없습니다.');return;}
for(const n of [1,2,3,4]){if(!opts[n].trim()&&!q.visual_assets.some(a=>a.choice===n)){toast(`${n}번 선택지가 비어 있습니다. 내용을 확인하세요.`);return;}}
const acceptedStr=document.querySelector('#editAccepted').value.trim();const rawArr=acceptedStr.split(/[,/;\s]+/).filter(Boolean);const accepted=rawArr.map(Number);const scoring=!!document.querySelector('#editScoring').checked;
if(accepted.some(n=>![1,2,3,4].includes(n))||new Set(accepted).size!==accepted.length||accepted.length>4||(scoring&&!accepted.length)){toast('인정 정답은 1~4 중에서 쉼표로 구분해 입력하세요.');return;}
if(scoring&&accepted.length===4){toast('모두정답(1,2,3,4)은 제외 대상이므로 채점 가능 상태로 설정할 수 없습니다.');return;}
const changes={};if(qt!==q.question_text)changes.question_text=qt;
const optChanges={};for(const n of [1,2,3,4])if(opts[n]!==q.options.find(o=>o.number===n)?.text)optChanges[n]=opts[n];if(Object.keys(optChanges).length)changes.options=optChanges;
if(JSON.stringify(accepted)!==JSON.stringify(q.answer.accepted))changes.accepted=accepted;if(scoring!==q.scoring_enabled)changes.scoring_enabled=scoring;
if(Object.keys(changes).length)edits.question_edits[q.id]=changes;else delete edits.question_edits[q.id];
if(q.shared_passage_id){const base=q.shared_passage_text||passageMap.get(q.shared_passage_id)?.text||'';const p=document.querySelector('#editPassage').value;if(p!==base)edits.passage_edits[q.shared_passage_id]=p;else delete edits.passage_edits[q.shared_passage_id];}
const status=document.querySelector('#editReviewStatus').value, note=document.querySelector('#editReviewNote').value;
if(status!=='pending'||note.trim())edits.review_status[q.id]={status,note,updatedAt:new Date().toISOString()};else delete edits.review_status[q.id];
writeStore('edits',edits);renderReview();toast('문항 수정과 검수 상태를 저장했습니다.');}
function revertReview(){if(!state.reviewId)return;if(!confirm('이 문항에 저장한 본문·보기·정답 수정을 취소할까요? 검수 상태는 유지됩니다.'))return;const q=qMap.get(state.reviewId);delete edits.question_edits[q.id];if(q.shared_passage_id)delete edits.passage_edits[q.shared_passage_id];writeStore('edits',edits);renderReview();toast('수정 내용을 원본 추출 데이터로 되돌렸습니다.');}
function csvCell(x){return '"'+String(x??'').replace(/"/g,'""')+'"';}
function downloadFile(name,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
// 시험 답안·책갈피는 검수 패치와 구분하여 백업한다. 저장 데이터의 문항 ID/보기값을 검증한다.
function exportProgress(){
 const sessions={};for(const e of DATA.exams){const v=getSession(e.exam_id);if(v)sessions[e.exam_id]=v;}
 const payload={format:'trade-english-cbt-progress-v1',base_schema:DATA.schema_version,exported_at:new Date().toISOString(),sessions};
 downloadFile('무역영어_CBT_풀이기록_백업.json',JSON.stringify(payload,null,2),'application/json;charset=utf-8');toast('풀이 기록 백업을 내보냈습니다.');
}
function importProgress(raw){
 let obj;try{obj=JSON.parse(raw);}catch(_){toast('유효한 JSON 파일이 아닙니다.');return;}
 if(obj?.format!=='trade-english-cbt-progress-v1'||obj.base_schema!==DATA.schema_version||!obj.sessions||Array.isArray(obj.sessions)||typeof obj.sessions!=='object'){
  toast('이 CBT의 풀이기록 백업 파일이 아닙니다.');return;}
 const entries=Object.entries(obj.sessions);
 for(const [id,s] of entries){
  const e=examMap.get(id);if(!e||!s||typeof s!=='object'||!Number.isFinite(s.startedAt)||s.startedAt<=0||!s.answers||typeof s.answers!=='object'||Array.isArray(s.answers)||!s.bookmarks||typeof s.bookmarks!=='object'||Array.isArray(s.bookmarks)||!(s.submittedAt===null||s.submittedAt===undefined||Number.isFinite(s.submittedAt))){toast('백업에 형식이 잘못된 시험 기록이 있습니다.');return;}
  const allowed=new Set(e.questions.map(q=>q.id));
  if(Object.entries(s.answers).some(([qid,v])=>!allowed.has(qid)||![1,2,3,4].includes(v))||Object.entries(s.bookmarks).some(([qid,v])=>!allowed.has(qid)||typeof v!=='boolean')){toast('백업에 현재 시험지와 맞지 않는 문항 기록이 있습니다.');return;}
 }
 if(!confirm(`${entries.length}개 회차의 풀이 기록을 불러올까요? 해당 회차에 저장된 기존 기록은 덮어씁니다.`))return;
 for(const [id,s] of entries)saveSession(id,s);
 state.mode='home';redraw();toast(`${entries.length}개 회차 기록을 복원했습니다.`);
}
function exportPatch(){const payload={format:'trade-english-cbt-patch-v1',base_schema:DATA.schema_version,exported_at:new Date().toISOString(),...edits};downloadFile('무역영어_CBT_검수수정_백업.json',JSON.stringify(payload,null,2),'application/json;charset=utf-8');toast('수정·검수 JSON을 내보냈습니다.');}
function exportReviewCsv(){const lines=[['문항ID','연도','회차','형','번호','과목','원본페이지','원본이미지','검수상태','검수메모','변경여부','정답원문','채점사용'].map(csvCell).join(',')];for(const q of allQuestions){const s=edits.review_status[q.id]||{};lines.push([q.id,q.year,q.session,q.form,q.number,q.subject,q.source.page,q.source_reference_images.length>0?'있음':'없음',statusLabel(s.status),s.note||'',edits.question_edits[q.id]?'예':'아니오',q.answer.raw,isScoring(q)?'사용':'보류'].map(csvCell).join(','));}downloadFile('무역영어_CBT_검수상태_전체.csv','\ufeff'+lines.join('\r\n'),'text/csv;charset=utf-8');toast('1,942문항 검수 상태 CSV를 내보냈습니다.');}
function exportAllJson(){const dataset=JSON.parse(JSON.stringify(DATA));for(const ex of dataset.exams){for(const p of ex.shared_passages||[]){if(edits.passage_edits[p.id]!==undefined)p.text=edits.passage_edits[p.id];}for(const q of ex.questions){const e=edits.question_edits[q.id]||{};if(e.question_text!==undefined)q.question_text=e.question_text;if(e.options)for(const o of q.options)if(e.options[o.number]!==undefined)o.text=e.options[o.number];if(e.accepted!==undefined){q.answer.accepted=e.accepted;q.answer.kind=e.accepted.length>1?'multiple':'single';q.answer.needs_review=false;q.answer.manual_answer_review=true;}if(e.scoring_enabled!==undefined)q.scoring_enabled=e.scoring_enabled;if(q.shared_passage_id&&edits.passage_edits[q.shared_passage_id]!==undefined)q.shared_passage_text=edits.passage_edits[q.shared_passage_id];q.review_record=edits.review_status[q.id]||{status:'pending'};}}
dataset.schema_version='4.0-user-corrections-export';dataset.exported_at=new Date().toISOString();downloadFile('무역영어_CBT_검수반영_전체문제은행.json',JSON.stringify(dataset,null,2),'application/json;charset=utf-8');toast('수정사항을 반영한 전체 문제은행 JSON을 내보냈습니다.');}
function moveCurrent(i){const e=currentExam();state.current=Math.max(0,Math.min(e.questions.length-1,i));redraw();window.scrollTo(0,0);}
function clickAction(btn){const action=btn.dataset.action,id=btn.dataset.exam;
if(action==='home'){state.mode='home';redraw();window.scrollTo(0,0);}
else if(action==='review')toReview();
else if(action==='review-exam')toReview(id);
else if(action==='start'||action==='resume'||action==='result')startExam(id);
else if(action==='reset-exam')startExam(id,true);
else if(action==='prev')moveCurrent(state.current-1);
else if(action==='next')moveCurrent(state.current+1);
else if(action==='bookmark'){const s=getSession(state.examId),q=activeQuestion();s.bookmarks||={};s.bookmarks[q.id]=!s.bookmarks[q.id];saveSession(state.examId,s);redraw();}
else if(action==='submit')confirmSubmit();
else if(action==='show-wrong'){const e=currentExam(),s=getSession(e.exam_id),sc=scoreExam(e,s);const first=sc.rows.findIndex(r=>r.eligible&&!r.correct);if(first!==-1)moveCurrent(first);else toast('틀린 문제가 없습니다.');}
else if(action==='review-search'){state.reviewQuery=document.querySelector('#reviewSearch')?.value.trim()||'';state.reviewId=null;state.reviewLimit=100;state.pdfVisible=false;renderReview();}
else if(action==='review-clear'){state.reviewQuery='';state.reviewExam='ALL';state.reviewFilter='priority';state.reviewId=null;state.reviewLimit=100;renderReview();}
else if(action==='review-more'){state.reviewLimit+=100;renderReview();}
else if(action==='toggle-pdf'){state.pdfVisible=!state.pdfVisible;renderReview();}
else if(action==='review-save')saveReview();
else if(action==='review-revert')revertReview();
else if(action==='import-patch')document.querySelector('#patchImport').click();
else if(action==='export-patch')exportPatch();
else if(action==='export-progress')exportProgress();
else if(action==='import-progress')document.querySelector('#progressImport').click();
else if(action==='export-review-csv')exportReviewCsv();
else if(action==='export-complete')exportAllJson();
}
document.addEventListener('click',e=>{const a=e.target.closest('[data-action]');if(a){e.preventDefault();clickAction(a);return;}const choice=e.target.closest('[data-choice]');if(choice){const ex=currentExam(),q=activeQuestion(),s=getSession(ex.exam_id);if(s.submittedAt)return;s.answers[q.id]=Number(choice.dataset.choice);saveSession(ex.exam_id,s);redraw();return;}const j=e.target.closest('[data-jump]');if(j){moveCurrent(+j.dataset.jump);return;}const r=e.target.closest('[data-review-pick]');if(r){state.reviewId=r.dataset.reviewPick;state.pdfVisible=false;renderReview();window.scrollTo(0,0);return;}});
document.addEventListener('change',e=>{if(e.target.id==='progressImport'){
 const f=e.target.files?.[0];if(!f)return;
 f.text().then(importProgress).catch(()=>toast('풀이 기록 JSON 파일을 읽지 못했습니다.'));
 e.target.value='';return;
}if(e.target.id==='patchImport'){
 const f=e.target.files?.[0];if(!f)return;
 f.text().then(raw=>{
   let obj;try{obj=JSON.parse(raw);}catch(_){toast('유효한 JSON 파일이 아닙니다.');return;}
   if(obj.format!=='trade-english-cbt-patch-v1'||obj.base_schema!==DATA.schema_version||!obj.question_edits||!obj.passage_edits||!obj.review_status){toast('이 프로젝트와 호환되는 검수 백업 파일이 아닙니다.');return;}
   const unknown=Object.keys(obj.question_edits).filter(id=>!qMap.has(id));if(unknown.length){toast('알 수 없는 문항 ID가 포함되어 불러오기를 중단했습니다.');return;}
   if(!confirm('선택한 검수 백업을 불러올까요? 기존에 저장된 검수·수정 기록은 같은 항목의 백업 내용으로 덮어씁니다.'))return;
   edits.question_edits={...edits.question_edits,...obj.question_edits};
   edits.passage_edits={...edits.passage_edits,...obj.passage_edits};
   edits.review_status={...edits.review_status,...obj.review_status};
   writeStore('edits',edits);redraw();toast('검수 백업을 불러왔습니다.');
 }).catch(()=>toast('JSON 파일을 읽지 못했습니다.'));
 e.target.value='';return;
}if(e.target.id==='reviewExam'){state.reviewExam=e.target.value;state.reviewId=null;state.pdfVisible=false;state.reviewLimit=100;renderReview();}else if(e.target.id==='reviewFilter'){state.reviewFilter=e.target.value;state.reviewId=null;state.pdfVisible=false;state.reviewLimit=100;renderReview();}});
document.addEventListener('keydown',e=>{if(e.target.id==='reviewSearch'&&e.key==='Enter'){e.preventDefault();state.reviewQuery=e.target.value.trim();state.reviewLimit=100;state.reviewId=null;renderReview();}if(state.mode==='exam'&&!e.target.matches('input,textarea,select')){if(e.key==='ArrowRight'&&state.current<currentExam().questions.length-1)moveCurrent(state.current+1);if(e.key==='ArrowLeft'&&state.current>0)moveCurrent(state.current-1);if(['1','2','3','4'].includes(e.key)){const ex=currentExam(),q=activeQuestion(),s=getSession(ex.exam_id);if(!s.submittedAt){s.answers[q.id]=Number(e.key);saveSession(ex.exam_id,s);redraw();}}}});
setInterval(()=>{if(state.mode!=='exam')return;const e=currentExam(),s=getSession(e?.exam_id);if(!e||!s||s.submittedAt)return;const left=secondsRemaining(s),el=document.querySelector('#examTimer');if(el){el.textContent=timerLabel(left);el.classList.toggle('low',left<=300);}if(left===0){finishExam();toast('시험 시간이 종료되어 자동 제출했습니다.');}},1000);
if(!DATA){redraw();return;}
window.CBT_TEST_API={scoreExam,getSession,saveSession,allQuestions,edits,state,examMap,reviewItems,saveReview,renderReview,startExam};
redraw();
})();
