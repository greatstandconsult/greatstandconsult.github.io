/* GREAT STAND PORTAL V27 - Course Builder Wizard */
import {auth,db} from "./firebase.js?v=17.1"; import {initializeApp,getApps} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js"; import {getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut,createUserWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js"; import {createClient} from "https://esm.sh/@supabase/supabase-js@2"; import {doc,getDoc,collection,getDocs,addDoc,updateDoc,deleteDoc,setDoc,serverTimestamp,query,orderBy,where} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const $=id=>document.getElementById(id),loginView=$("loginView"),dashboardView=$("dashboardView"),logoutBtn=$("logoutBtn"),adminPanel=$("adminPanel"),noteForm=$("noteForm"),notesList=$("notesList");
const SUPABASE_URL="https://njwjjtxvckemejaezwtd.supabase.co";
const SUPABASE_ANON_KEY="sb_publishable_bCsJSYS7ggDTnwvAYW_JUA_HJvtGl5f";
const SUPABASE_BUCKET="materials";
const supabase=createClient(SUPABASE_URL,SUPABASE_ANON_KEY);
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginMessage").textContent="Logging in...";try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(err){console.error(err);$("loginMessage").textContent="Login failed: "+(err.code||err.message)}}); logoutBtn.addEventListener("click",()=>signOut(auth));
async function getCount(n){try{return(await getDocs(collection(db,n))).size}catch(e){console.error(e);return 0}}
async function loadNotes(){notesList.innerHTML='<p class="muted">Loading notes...</p>';try{let s;try{s=await getDocs(query(collection(db,"notes"),orderBy("createdAt","desc")))}catch(e){s=await getDocs(collection(db,"notes"))}if(s.empty){notesList.innerHTML='<p class="muted">No notes published yet.</p>';return}notesList.innerHTML="";s.forEach(d=>{let n=d.data(),c=document.createElement("article");c.className="note-card";let h=document.createElement("h3");h.textContent=n.title||"Untitled Note";let sub=document.createElement("p");sub.className="subject";sub.textContent=n.subject||"General";let body=document.createElement("div");body.className="note-content";body.textContent=n.content||"";c.append(h,sub,body);notesList.appendChild(c)})}catch(e){console.error(e);notesList.innerHTML='<p class="message">Could not load notes.</p>'}}
noteForm.addEventListener("submit",async e=>{e.preventDefault();$("noteMessage").textContent="Publishing...";try{await addDoc(collection(db,"notes"),{title:$("noteTitle").value.trim(),subject:$("noteSubject").value.trim(),category:$("noteCategory").value,content:$("noteContent").value.trim(),createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});noteForm.reset();$("noteMessage").textContent="Note published successfully ✅";$("notesCount").textContent=await getCount("notes");await loadNotes();await loadAssignments();await loadTests();await loadStudentResultsIfNeeded();await loadLearningCentre()}catch(e){console.error(e);$("noteMessage").textContent="Could not publish note: "+(e.code||e.message)}});

const assignmentAdminPanel=$("assignmentAdminPanel"),assignmentForm=$("assignmentForm"),assignmentsList=$("assignmentsList");
const assignmentModal=$("assignmentModal"),closeAssignmentBtn=$("closeAssignmentBtn"),submissionForm=$("submissionForm");
let currentAssignmentId=null,currentStudentProfile=null;

function closeAssignment(){
  assignmentModal.classList.add("hidden");
  currentAssignmentId=null;
  submissionForm.reset();
  $("submissionMessage").textContent="";
}
closeAssignmentBtn.addEventListener("click",closeAssignment);
assignmentModal.addEventListener("click",e=>{if(e.target===assignmentModal)closeAssignment()});

async function openAssignment(id,a){
  currentAssignmentId=id;
  $("openAssignmentTitle").textContent=a.title||"Assignment";
  $("openAssignmentSubject").textContent=a.subject||"General";
  $("openAssignmentContent").textContent=a.content||"";
  if(a.deadline){
    const dl=a.deadline?.toDate?a.deadline.toDate():new Date(a.deadline);
    $("openAssignmentDeadline").textContent="Deadline: "+(isNaN(dl.getTime())?"Not specified":dl.toLocaleString());
  }else $("openAssignmentDeadline").textContent="No deadline specified.";
  $("submissionMessage").textContent="";
  $("submissionAnswer").value="";
  const role=(window.currentUserRole||"student").toLowerCase();
  submissionForm.style.display=role==="student"?"block":"none";
  assignmentModal.classList.remove("hidden");
}
submissionForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!currentAssignmentId||!auth.currentUser)return;
  $("submissionMessage").textContent="Submitting...";
  try{
    await addDoc(collection(db,"submissions"),{
      assignmentId:currentAssignmentId,
      studentId:auth.currentUser.uid,
      studentEmail:auth.currentUser.email||"",
      answer:$("submissionAnswer").value.trim(),
      submittedAt:serverTimestamp()
    });
    $("submissionMessage").className="message submission-success";
    $("submissionMessage").textContent="Assignment submitted successfully ✅";
    $("submissionAnswer").disabled=true;
  }catch(e){
    console.error(e);
    $("submissionMessage").className="message submission-error";
    $("submissionMessage").textContent="Could not submit assignment: "+(e.code||e.message);
  }
});
async function loadAssignments(){
  assignmentsList.innerHTML='<p class="muted">Loading assignments...</p>';
  try{
    let s;
    try{s=await getDocs(query(collection(db,"assignments"),orderBy("createdAt","desc")))}
    catch(e){s=await getDocs(collection(db,"assignments"))}
    if(s.empty){assignmentsList.innerHTML='<p class="muted">No assignments published yet.</p>';return}
    assignmentsList.innerHTML="";
    s.forEach(d=>{
      const a=d.data(), c=document.createElement("article");
      c.className="note-card";
      const h=document.createElement("h3"); h.textContent=a.title||"Untitled Assignment";
      const sub=document.createElement("p"); sub.className="subject"; sub.textContent=a.subject||"General";
      const body=document.createElement("div"); body.className="note-content"; body.textContent=a.content||"";
      const actions=document.createElement("div"); actions.className="assignment-actions";
      const btn=document.createElement("button"); btn.type="button"; btn.className="primary-btn open-assignment-btn"; btn.textContent="Open Assignment";
      btn.addEventListener("click",()=>openAssignment(d.id,a));
      actions.appendChild(btn);
      c.append(h,sub,body);
      if(a.deadline){
        const dl=document.createElement("p"); dl.className="muted";
        const date=a.deadline?.toDate?a.deadline.toDate():new Date(a.deadline);
        dl.textContent="Deadline: "+(isNaN(date.getTime())?"Not specified":date.toLocaleString());
        c.append(dl);
      }
      if(isAdminRole()){
        const del=document.createElement("button"); del.type="button"; del.className="secondary-btn"; del.textContent="Delete";
        del.addEventListener("click",async()=>{if(!confirm("Delete this assignment and its student submissions/results? This cannot be undone."))return;del.disabled=true;try{const subs=await getDocs(query(collection(db,"submissions"),where("assignmentId","==",d.id)));for(const sd of subs.docs)await deleteDoc(doc(db,"submissions",sd.id));const results=await getDocs(query(collection(db,"results"),where("assignmentId","==",d.id)));for(const rd of results.docs)await deleteDoc(doc(db,"results",rd.id));await deleteDoc(doc(db,"assignments",d.id));await loadAssignments();await loadLearningCentre();$("assignmentsCount").textContent=await getCount("assignments");await loadAdminResultsIfNeeded();$("resultsCount").textContent=await getCount("results") }catch(e){console.error(e);alert("Could not delete assignment: "+(e.code||e.message));del.disabled=false}});
        actions.appendChild(del);
      }
      c.append(actions);
      assignmentsList.appendChild(c);
    });
  }catch(e){
    console.error(e);
    assignmentsList.innerHTML='<p class="message">Could not load assignments: '+(e.code||e.message)+'</p>';
  }
}
async function loadSubmissions(){
  const list=$("submissionsList"); list.innerHTML='<p class="muted">Loading submissions...</p>';
  try{
    const s=await getDocs(collection(db,"submissions"));
    if(s.empty){list.innerHTML='<p class="muted">No student submissions yet.</p>';return}
    const cache={}; list.innerHTML="";
    for(const d of s.docs){
      const sub=d.data(); let title="Assignment";
      if(sub.assignmentId){try{if(!cache[sub.assignmentId]){const ad=await getDoc(doc(db,"assignments",sub.assignmentId));cache[sub.assignmentId]=ad.exists()?ad.data():null}if(cache[sub.assignmentId])title=cache[sub.assignmentId].title||title}catch(e){console.error(e)}}
      const card=document.createElement("article");card.className="submission-card";
      const h=document.createElement("h3");h.textContent=title;
      const meta=document.createElement("div");meta.className="submission-meta";meta.textContent="Student: "+(sub.studentEmail||sub.studentId||"Unknown");
      const time=document.createElement("div");time.className="submission-meta";time.textContent=sub.submittedAt?.toDate?"Submitted: "+sub.submittedAt.toDate().toLocaleString():"Submitted: Pending timestamp";
      const answer=document.createElement("div");answer.className="submission-answer";answer.textContent=sub.answer||"(No answer provided)";
      const box=document.createElement("div");box.className="marking-box";
      const grid=document.createElement("div");grid.className="marking-grid";
      const score=document.createElement("input");score.type="number";score.min="0";score.max="100";score.step="1";score.placeholder="Score / 100";score.value=sub.score!==undefined?sub.score:"";
      const feedback=document.createElement("textarea");feedback.rows=4;feedback.placeholder="Feedback for the student...";feedback.value=sub.feedback||"";grid.append(score,feedback);
      const btn=document.createElement("button");btn.type="button";btn.className="primary-btn mark-btn";btn.textContent=sub.markedAt?"Update Mark":"Save Mark";
      const msg=document.createElement("p");msg.className="message";
      btn.addEventListener("click",async()=>{const value=Number(score.value);if(score.value===""||Number.isNaN(value)||value<0||value>100){msg.textContent="Enter a score from 0 to 100.";return}btn.disabled=true;msg.textContent="Saving mark...";try{await updateDoc(doc(db,"submissions",d.id),{score:value,feedback:feedback.value.trim(),markedAt:serverTimestamp(),markedBy:auth.currentUser.uid});const rs=await getDocs(collection(db,"results"));let rid=null;rs.forEach(rd=>{if(rd.data().submissionId===d.id)rid=rd.id});const data={submissionId:d.id,assignmentId:sub.assignmentId||"",assignmentTitle:title,studentId:sub.studentId,studentEmail:sub.studentEmail||"",score:value,feedback:feedback.value.trim(),updatedAt:serverTimestamp(),markedBy:auth.currentUser.uid};if(rid)await updateDoc(doc(db,"results",rid),data);else await addDoc(collection(db,"results"),{...data,createdAt:serverTimestamp()});msg.className="message submission-success";msg.textContent="Mark saved successfully ✅";btn.textContent="Update Mark";await loadStudentResultsIfNeeded()}catch(e){console.error(e);msg.className="message submission-error";msg.textContent="Could not save mark: "+(e.code||e.message)}finally{btn.disabled=false}});
      box.append(grid,btn,msg);card.append(h,meta,time,answer,box);list.appendChild(card);
    }
  }catch(e){console.error(e);list.innerHTML='<p class="message">Could not load submissions: '+(e.code||e.message)+'</p>'}
}
async function loadStudentResultsIfNeeded(){
  if((window.currentUserRole||"student").toLowerCase()!=="student")return;
  const list=$("studentResultsList");
  list.innerHTML='<p class="muted">Loading results...</p>';
  try{
    if(!auth.currentUser){list.innerHTML='<p class="muted">Please log in to view results.</p>';return}
    const q=query(collection(db,"results"),where("studentId","==",auth.currentUser.uid));
    const s=await getDocs(q);
    list.innerHTML="";
    if(s.empty){list.innerHTML='<p class="muted">No results available yet.</p>';return}
    s.forEach(d=>{
      const r=d.data();
      const c=document.createElement("article");c.className="result-card";
      const h=document.createElement("h3");h.textContent=r.resultType==="cbt"?(r.testTitle||"CBT Test"):(r.assignmentTitle||"Assignment Result");
      const type=document.createElement("p");type.className="submission-meta";type.textContent=r.resultType==="cbt"?"CBT Test":"Assignment";
      const sc=document.createElement("div");sc.className="score";sc.textContent=String(r.score??0)+"/100";
      const fb=document.createElement("div");fb.className="feedback";fb.textContent=r.resultType==="cbt"?((r.correctAnswers??0)+" / "+(r.totalQuestions??0)+" correct"): (r.feedback||"No feedback provided.");
      c.append(h,type,sc,fb);
      if(r.resultType==="cbt"){
        const corrections=r.corrections||[];
        if(corrections.length){
          const btn=document.createElement("button");btn.type="button";btn.className="secondary-btn correction-toggle";btn.textContent="📖 View Corrections";
          const box=document.createElement("div");box.className="corrections-result-box hidden";
          corrections.forEach((q,i)=>{
            const item=document.createElement("div");item.className="correction-result-item";
            const qh=document.createElement("h4");qh.textContent=(i+1)+". "+q.text;
            const yours=document.createElement("p");yours.className=q.yourAnswer===q.correct?"correction-correct":"correction-wrong";yours.textContent="Your answer: "+(q.yourAnswer?(q.yourAnswer+". "+(q.options?.[q.yourAnswer]||"")):"Not answered");
            const correct=document.createElement("p");correct.className="correction-answer";correct.textContent="Correct answer: "+q.correct+". "+(q.options?.[q.correct]||"");
            item.append(qh,yours,correct);
            if(q.explanation){const exp=document.createElement("p");exp.className="correction-explanation";exp.textContent="Correction: "+q.explanation;item.appendChild(exp)}
            box.appendChild(item);
          });
          btn.addEventListener("click",()=>{box.classList.toggle("hidden");btn.textContent=box.classList.contains("hidden")?"📖 View Corrections":"📕 Hide Corrections"});
          c.append(btn,box);
        }
      }
      list.appendChild(c);
    });
  }catch(e){
    console.error(e);
    list.innerHTML='<p class="message">Could not load results: '+(e.code||e.message)+'</p>';
  }
}


assignmentForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!isAdminRole()){ $("assignmentMessage").textContent="Only admins can publish assignments."; return; }
  $("assignmentMessage").textContent="Publishing...";
  try{
    const deadline=$("assignmentDeadline").value;
    await addDoc(collection(db,"assignments"),{
      title:$("assignmentTitle").value.trim(),
      subject:$("assignmentSubject").value.trim(),
      category:$("assignmentCategory").value,
      content:$("assignmentContent").value.trim(),
      deadline:deadline?new Date(deadline):null,
      createdAt:serverTimestamp(),
      createdBy:auth.currentUser.uid
    });
    assignmentForm.reset();
    $("assignmentMessage").textContent="Assignment published successfully ✅";
    $("assignmentsCount").textContent=await getCount("assignments");
    await loadAssignments();
  }catch(e){
    console.error(e);
    $("assignmentMessage").textContent="Could not publish assignment: "+(e.code||e.message);
  }
});


// ===== CBT / TEST SYSTEM (V14) =====
const testAdminPanel=$('testAdminPanel'),testForm=$('testForm'),questionBuilder=$('questionBuilder'),testsList=$('testsList'),testModal=$('testModal');
function isAdminRole(){const r=String(window.currentUserRole||"student").trim().toLowerCase();return r==="admin"||r==="superadmin";}
function setAdminPanelsVisible(show){["adminPanel","assignmentAdminPanel","testAdminPanel","studentAdminPanel","submissionsAdminPanel","testResultsAdminPanel","materialsAdminPanel","courseAdminPanel"].forEach(id=>{const el=$(id);if(el)el.style.display=show?"block":"none";});}
setAdminPanelsVisible(false);
let questionCount=0,currentTest=null,currentQuestionIndex=0,testAnswers=[],testTimerInterval=null,testAutoSubmitTimeout=null,testSecondsLeft=0;
function addQuestion(){
  questionCount++;
  const n=questionCount,wrap=document.createElement('div');wrap.className='question-builder-card';wrap.dataset.question=n;
  wrap.innerHTML=`<div class="question-builder-head"><strong>Question ${n}</strong><button type="button" class="remove-question secondary-btn">Remove</button></div>
  <label>Question</label><textarea class="q-text" required placeholder="Enter question ${n}..."></textarea>
  <div class="options-grid">
    <input class="q-option" data-option="A" required placeholder="Option A">
    <input class="q-option" data-option="B" required placeholder="Option B">
    <input class="q-option" data-option="C" required placeholder="Option C">
    <input class="q-option" data-option="D" required placeholder="Option D">
  </div>
  <label>Correct Answer</label><select class="q-answer" required><option value="">Select correct option</option><option>A</option><option>B</option><option>C</option><option>D</option></select>
  <label>Explanation / Correction (optional)</label><textarea class="q-explanation" placeholder="Optional explanation shown after the test..."></textarea>`;
  wrap.querySelector('.remove-question').addEventListener('click',()=>{wrap.remove();renumberQuestions()});
  questionBuilder.appendChild(wrap);
}
function renumberQuestions(){[...questionBuilder.children].forEach((el,i)=>{el.dataset.question=i+1;el.querySelector('strong').textContent='Question '+(i+1)})}
$('addQuestionBtn').addEventListener('click',addQuestion); addQuestion();
let bulkParsedQuestions=[];
let csvParsedQuestions=[];
let cbtCreateMode="manual";
function collectQuestions(){
  if(cbtCreateMode==="paste")return bulkParsedQuestions;
  if(cbtCreateMode==="csv")return csvParsedQuestions;
  return [...questionBuilder.children].map(card=>({text:card.querySelector('.q-text').value.trim(),options:Object.fromEntries([...card.querySelectorAll('.q-option')].map(x=>[x.dataset.option,x.value.trim()])),correct:card.querySelector('.q-answer').value,explanation:(card.querySelector('.q-explanation')?.value||'').trim()})).filter(q=>q.text)
}

function normalizeAnswer(v){const m=String(v||'').trim().toUpperCase().match(/[ABCD]/);return m?m[0]:''}
function parsePastedQuestions(raw){
  const lines=String(raw||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(x=>x!=='');
  const out=[]; let current=null; let lastField='text';
  const finish=()=>{if(current&&current.text){current.text=current.text.trim();current.correct=normalizeAnswer(current.correct);if(!current.explanation)current.explanation='';out.push(current)}current=null};
  for(const line of lines){
    const qm=line.match(/^(\d+)[\.)]\s*(.+)$/);
    if(qm){finish();current={text:qm[2].trim(),options:{A:'',B:'',C:'',D:''},correct:'',explanation:''};lastField='text';continue}
    if(!current)continue;
    const om=line.match(/^([ABCD])[\.)\:\-]\s*(.+)$/i);
    if(om){const letter=om[1].toUpperCase();current.options[letter]=om[2].trim();lastField=letter;continue}
    const am=line.match(/^(?:ANSWER|ANS|CORRECT\s*ANSWER|CORRECT)\s*[:=\-]?\s*([ABCD])\b/i);
    if(am){current.correct=normalizeAnswer(am[1]);lastField='answer';continue}
    const em=line.match(/^(?:EXPLANATION|CORRECTION)\s*[:=\-]?\s*(.*)$/i);
    if(em){current.explanation=em[1].trim();lastField='explanation';continue}
    if(lastField==='text')current.text+=' '+line;
    else if(lastField==='explanation')current.explanation+=' '+line;
    else if(lastField==='answer'){continue}
    else if(current.options[lastField])current.options[lastField]+=' '+line;
  }
  finish();
  return out;
}
function validateImportedQuestions(qs){
  if(!qs.length)return 'No questions were detected. Make sure each question starts with 1., 2., 3., etc.';
  const bad=qs.findIndex(q=>!q.text||!q.options.A||!q.options.B||!q.options.C||!q.options.D||!normalizeAnswer(q.correct));
  if(bad>=0)return `Question ${bad+1} is incomplete. Check the question, A-D options and ANSWER.`;
  return '';
}
function renderImportedPreview(containerId,qs){
  const box=$(containerId);box.innerHTML='';
  const head=document.createElement('div');head.className='import-preview-head';head.innerHTML=`<strong>${qs.length} question${qs.length===1?'':'s'} detected</strong><span>Ready to publish</span>`;box.appendChild(head);
  qs.slice(0,8).forEach((q,i)=>{const c=document.createElement('div');c.className='import-preview-card';c.innerHTML=`<strong>${i+1}. ${q.text}</strong><div>A. ${q.options.A}</div><div>B. ${q.options.B}</div><div>C. ${q.options.C}</div><div>D. ${q.options.D}</div><div class="preview-answer">Answer: ${q.correct}</div>`;box.appendChild(c)});
  if(qs.length>8){const more=document.createElement('p');more.className='muted';more.textContent=`Showing first 8 of ${qs.length} questions.`;box.appendChild(more)}
}
function parseCsvLine(line){
  const cells=[];let cur='',quoted=false;
  for(let i=0;i<line.length;i++){const ch=line[i];if(ch==='"'){if(quoted&&line[i+1]==='"'){cur+='"';i++;}else quoted=!quoted;}else if(ch===','&&!quoted){cells.push(cur.trim());cur='';}else cur+=ch;}cells.push(cur.trim());return cells;
}
function parseCsvQuestions(raw){
  const lines=String(raw||'').replace(/\r/g,'').split('\n').filter(x=>x.trim()!=='');
  if(!lines.length)return [];
  let rows=lines.map(parseCsvLine);const first=rows[0].map(x=>x.toLowerCase());
  if(first.includes('question')||first.includes('answer'))rows=rows.slice(1);
  return rows.map(r=>({text:r[0]||'',options:{A:r[1]||'',B:r[2]||'',C:r[3]||'',D:r[4]||''},correct:normalizeAnswer(r[5]||''),explanation:r[6]||''})).filter(q=>q.text);
}
function setCbtMode(mode){
  cbtCreateMode=mode;
  $('manualCbtMode').classList.toggle('hidden',mode!=='manual');
  $('pasteCbtMode').classList.toggle('hidden',mode!=='paste');
  $('csvCbtMode').classList.toggle('hidden',mode!=='csv');
  // Disable required manual fields when using Paste/CSV so they cannot block Publish.
  questionBuilder.querySelectorAll('input,textarea,select').forEach(el=>{
    if(mode==='manual'){
      el.disabled=false;
      el.required=true;
    }else{
      el.disabled=true;
      el.required=false;
    }
  });
  ['manualCbtTab','pasteCbtTab','csvCbtTab'].forEach(id=>$(id).classList.remove('active'));
  $(mode==='manual'?'manualCbtTab':mode==='paste'?'pasteCbtTab':'csvCbtTab').classList.add('active');
}
$('manualCbtTab').addEventListener('click',()=>setCbtMode('manual'));
$('pasteCbtTab').addEventListener('click',()=>setCbtMode('paste'));
$('csvCbtTab').addEventListener('click',()=>setCbtMode('csv'));
$('parseBulkQuestionsBtn').addEventListener('click',()=>{
  bulkParsedQuestions=parsePastedQuestions($('bulkQuestionsText').value);
  const error=validateImportedQuestions(bulkParsedQuestions);$('bulkParseMessage').textContent=error||'Questions parsed successfully ✅';$('bulkParseMessage').className='message '+(error?'submission-error':'submission-success');
  if(!error)renderImportedPreview('bulkQuestionsPreview',bulkParsedQuestions);else $('bulkQuestionsPreview').innerHTML='';
});
$('parseCsvQuestionsBtn').addEventListener('click',()=>{
  csvParsedQuestions=parseCsvQuestions($('csvQuestionsText').value);
  const error=validateImportedQuestions(csvParsedQuestions);$('csvParseMessage').textContent=error||'CSV questions parsed successfully ✅';$('csvParseMessage').className='message '+(error?'submission-error':'submission-success');
  if(!error)renderImportedPreview('csvQuestionsPreview',csvParsedQuestions);else $('csvQuestionsPreview').innerHTML='';
});
setCbtMode('manual');
testForm.addEventListener('submit',async e=>{e.preventDefault();if(!isAdminRole()){ $('testMessage').textContent='Only admins can publish CBT tests.'; return; }$('testMessage').textContent='Publishing CBT test...';try{const questions=collectQuestions();if(!questions.length)throw new Error('Add at least one question.');if(questions.some(q=>!q.text||Object.values(q.options).some(v=>!v)||!q.correct))throw new Error('Complete every question, all four options, and the correct answer.');await addDoc(collection(db,'tests'),{title:$('testTitle').value.trim(),subject:$('testSubject').value.trim(),category:$('testCategory').value,duration:Number($('testDuration').value),questions,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});testForm.reset();questionBuilder.innerHTML='';questionCount=0;addQuestion();bulkParsedQuestions=[];csvParsedQuestions=[];$('bulkQuestionsPreview').innerHTML='';$('csvQuestionsPreview').innerHTML='';$('bulkParseMessage').textContent='';$('csvParseMessage').textContent='';setCbtMode('manual');$('testDuration').value=30;$('testMessage').className='message submission-success';$('testMessage').textContent='CBT test published successfully ✅';$('testsCount').textContent=await getCount('tests');await loadTests()}catch(e){console.error(e);$('testMessage').className='message submission-error';$('testMessage').textContent='Could not publish test: '+(e.code||e.message)}});
async function loadTests(){testsList.innerHTML='<p class="muted">Loading tests...</p>';try{let s;try{s=await getDocs(query(collection(db,'tests'),orderBy('createdAt','desc')))}catch(e){s=await getDocs(collection(db,'tests'))}if(s.empty){testsList.innerHTML='<p class="muted">No CBT tests published yet.</p>';return}testsList.innerHTML='';s.forEach(d=>{const t=d.data(),card=document.createElement('article');card.className='note-card test-card';const h=document.createElement('h3');h.textContent=t.title||'Untitled Test';const sub=document.createElement('p');sub.className='subject';sub.textContent=(t.subject||'General')+' • '+(t.questions?.length||0)+' questions • '+(t.duration||30)+' mins';const actions=document.createElement('div');actions.className='card-actions';const btn=document.createElement('button');btn.type='button';btn.className='primary-btn open-assignment-btn';btn.textContent=(window.currentUserRole||'student')==='student'?'Start Test':'Preview Test';btn.addEventListener('click',()=>openTest(d.id,t));actions.appendChild(btn);if(isAdminRole()){const del=document.createElement('button');del.type='button';del.className='secondary-btn';del.textContent='Delete';del.addEventListener('click',async()=>{if(!confirm('Delete this CBT test and its student results? This cannot be undone.'))return;del.disabled=true;try{const results=await getDocs(query(collection(db,'results'),where('testId','==',d.id)));for(const rd of results.docs)await deleteDoc(doc(db,'results',rd.id));await deleteDoc(doc(db,'tests',d.id));await loadTests();await loadLearningCentre();$('testsCount').textContent=await getCount('tests');if(isAdminRole()){await loadCbtResultsIfNeeded();await loadAdminResultsIfNeeded();$('resultsCount').textContent=await getCount('results')}}catch(e){console.error(e);alert('Could not delete test: '+(e.code||e.message));del.disabled=false}});actions.appendChild(del)}card.append(h,sub,actions);testsList.appendChild(card)})}catch(e){console.error(e);testsList.innerHTML='<p class="message">Could not load tests: '+(e.code||e.message)+'</p>'}}
function closeTest(){clearInterval(testTimerInterval);testTimerInterval=null;if(testAutoSubmitTimeout){clearTimeout(testAutoSubmitTimeout);testAutoSubmitTimeout=null}currentTest=null;testModal.classList.add('hidden');$('testSubmitMessage').textContent=''}
$('closeTestBtn').addEventListener('click',closeTest);testModal.addEventListener('click',e=>{if(e.target===testModal)closeTest()});
function renderQuestion(){if(!currentTest)return;const qs=currentTest.questions||[];const q=qs[currentQuestionIndex];$('testProgress').textContent=`Question ${currentQuestionIndex+1} of ${qs.length}`;const area=$('testQuestionArea');area.innerHTML='';const card=document.createElement('div');card.className='cbt-question-card';const title=document.createElement('h3');title.textContent=q.text;card.appendChild(title);const opts=document.createElement('div');opts.className='cbt-options';['A','B','C','D'].forEach(letter=>{const label=document.createElement('label');label.className='cbt-option';const radio=document.createElement('input');radio.type='radio';radio.name='currentQuestion';radio.value=letter;radio.checked=testAnswers[currentQuestionIndex]===letter;radio.addEventListener('change',()=>testAnswers[currentQuestionIndex]=letter);const span=document.createElement('span');span.textContent=letter+'. '+q.options[letter];label.append(radio,span);opts.appendChild(label)});card.appendChild(opts);area.appendChild(card);$('prevQuestionBtn').disabled=currentQuestionIndex===0;$('nextQuestionBtn').classList.toggle('hidden',currentQuestionIndex===qs.length-1);$('submitTestBtn').classList.toggle('hidden',currentQuestionIndex!==qs.length-1)}
function startTimer(minutes){clearInterval(testTimerInterval);if(testAutoSubmitTimeout)clearTimeout(testAutoSubmitTimeout);testAutoSubmitTimeout=null;testSecondsLeft=Math.max(1,Number(minutes||30)*60);updateTimer();testAutoSubmitTimeout=setTimeout(()=>{testAutoSubmitTimeout=null;clearInterval(testTimerInterval);testTimerInterval=null;$('testSubmitMessage').textContent='Time is up. Submitting your test...';submitTest(true)},testSecondsLeft*1000);testTimerInterval=setInterval(()=>{testSecondsLeft--;if(testSecondsLeft<0)testSecondsLeft=0;updateTimer();if(testSecondsLeft<=0){clearInterval(testTimerInterval);testTimerInterval=null}},1000)}
function updateTimer(){const m=Math.floor(testSecondsLeft/60).toString().padStart(2,'0'),s=(testSecondsLeft%60).toString().padStart(2,'0');$('testTimer').textContent=m+':'+s;$('testTimer').classList.toggle('timer-warning',testSecondsLeft<=60)}
function openTest(id,t){currentTest={id,...t};currentQuestionIndex=0;testAnswers=new Array((t.questions||[]).length);$('submitTestBtn').dataset.submitted='false';$('submitTestBtn').disabled=false;$('submitTestBtn').textContent='Submit Test';$('openTestTitle').textContent=t.title||'Test';$('openTestSubject').textContent=(t.subject||'General')+' • '+(t.questions?.length||0)+' questions';$('testSubmitMessage').textContent='';$('testModal').classList.remove('hidden');const isStudent=(window.currentUserRole||'student').toLowerCase()==='student';$('prevQuestionBtn').style.display=isStudent?'block':'none';$('nextQuestionBtn').style.display=isStudent?'block':'none';$('submitTestBtn').style.display=isStudent?'block':'none';if(isStudent){renderQuestion();startTimer(t.duration||30)}else{$('testTimer').textContent=(t.duration||30)+' min';$('testProgress').textContent='Preview';$('testQuestionArea').innerHTML='';(t.questions||[]).forEach((q,i)=>{const c=document.createElement('div');c.className='cbt-question-card';const h=document.createElement('h3');h.textContent=(i+1)+'. '+q.text;c.appendChild(h);['A','B','C','D'].forEach(x=>{const p=document.createElement('p');p.textContent=x+'. '+q.options[x]+(x===q.correct?' ✓':'');c.appendChild(p)});$('testQuestionArea').appendChild(c)})}}
$('prevQuestionBtn').addEventListener('click',()=>{if(currentQuestionIndex>0){currentQuestionIndex--;renderQuestion()}});$('nextQuestionBtn').addEventListener('click',()=>{if(currentQuestionIndex<(currentTest.questions.length-1)){currentQuestionIndex++;renderQuestion()}});$('submitTestBtn').addEventListener('click',()=>submitTest(false));
function showTestCorrections(){
  if(!currentTest)return;
  const qs=currentTest.questions||[];
  $('testProgress').textContent='Corrections / Review';
  $('testQuestionArea').innerHTML='';
  qs.forEach((q,i)=>{
    const card=document.createElement('div');card.className='cbt-question-card correction-card';
    const h=document.createElement('h3');h.textContent=(i+1)+'. '+q.text;card.appendChild(h);
    const yours=document.createElement('p');yours.className=testAnswers[i]===q.correct?'correction-correct':'correction-wrong';
    yours.textContent='Your answer: '+(testAnswers[i]?testAnswers[i]+'. '+(q.options?.[testAnswers[i]]||''):'Not answered');card.appendChild(yours);
    const correct=document.createElement('p');correct.className='correction-answer';correct.textContent='Correct answer: '+q.correct+'. '+(q.options?.[q.correct]||'');card.appendChild(correct);
    if(q.explanation){const exp=document.createElement('p');exp.className='correction-explanation';exp.textContent='Correction: '+q.explanation;card.appendChild(exp)}
    $('testQuestionArea').appendChild(card);
  });
  $('prevQuestionBtn').style.display='none';$('nextQuestionBtn').style.display='none';$('submitTestBtn').style.display='none';
}
async function submitTest(autoSubmit){
  if(!currentTest||!auth.currentUser)return;
  if(testAutoSubmitTimeout){clearTimeout(testAutoSubmitTimeout);testAutoSubmitTimeout=null}
  if(String(window.currentUserRole||'student').toLowerCase()!=='student')return;
  if($('submitTestBtn').dataset.submitted==='true')return;
  clearInterval(testTimerInterval);testTimerInterval=null;
  $('submitTestBtn').disabled=true;
  $('testSubmitMessage').textContent=autoSubmit?'Submitting...':'Submitting test...';
  try{
    const qs=Array.isArray(currentTest.questions)?currentTest.questions:[];
    const safeAnswers=qs.map((q,i)=>String(testAnswers[i]||'').trim());
    let correct=0;
    qs.forEach((q,i)=>{if(safeAnswers[i]===String(q.correct||'').trim())correct++});
    const score=qs.length?Math.round(correct/qs.length*100):0;
    const corrections=qs.map((q,i)=>({
      text:String(q.text||''),
      options:{
        A:String(q.options?.A||''),
        B:String(q.options?.B||''),
        C:String(q.options?.C||''),
        D:String(q.options?.D||'')
      },
      correct:String(q.correct||''),
      yourAnswer:safeAnswers[i],
      explanation:String(q.explanation||'')
    }));
    await addDoc(collection(db,'results'),{
      resultType:'cbt',
      testId:String(currentTest.id||''),
      testTitle:String(currentTest.title||'CBT Test'),
      subject:String(currentTest.subject||'General'),
      studentId:String(auth.currentUser.uid||''),
      studentEmail:String(auth.currentUser.email||''),
      score:Number(score),
      correctAnswers:Number(correct),
      totalQuestions:Number(qs.length),
      answers:safeAnswers,
      corrections:corrections,
      submittedAt:serverTimestamp(),
      updatedAt:serverTimestamp(),
      createdAt:serverTimestamp()
    });
    $('testSubmitMessage').className='message submission-success';
    $('testSubmitMessage').textContent=`Test submitted successfully ✅ Score: ${score}/100 (${correct}/${qs.length})`;
    $('submitTestBtn').textContent='Submitted';
    $('submitTestBtn').dataset.submitted='true';
    showTestCorrections();
    await loadStudentResultsIfNeeded();
    await loadCbtResultsIfNeeded();
    await loadAdminResultsIfNeeded();
  }catch(e){
    console.error(e);
    $('testSubmitMessage').className='message submission-error';
    $('testSubmitMessage').textContent='Could not submit test: '+(e.code||e.message);
  }finally{
    $('submitTestBtn').disabled=false;
  }
}
async function loadCbtResultsIfNeeded(){
  const list=$("testResultsList");
  if(!list||!isAdminRole())return;
  list.innerHTML='<p class="muted">Loading CBT results...</p>';
  try{
    const s=await getDocs(collection(db,"results"));
    const rows=s.docs.map(d=>({id:d.id,...d.data()})).filter(r=>r.resultType==="cbt");
    if(!rows.length){list.innerHTML='<p class="muted">No CBT results yet.</p>';return}
    list.innerHTML="";
    rows.forEach(r=>{
      const c=document.createElement("article");c.className="result-card";
      const h=document.createElement("h3");h.textContent=r.testTitle||"CBT Test";
      const meta=document.createElement("p");meta.className="submission-meta";meta.textContent="Student: "+(r.studentEmail||r.studentId||"Unknown");
      const sc=document.createElement("div");sc.className="score";sc.textContent=String(r.score??0)+"/100";
      const detail=document.createElement("div");detail.className="feedback";detail.textContent=(r.correctAnswers??0)+" / "+(r.totalQuestions??0)+" correct";
      const del=document.createElement("button");del.type="button";del.className="secondary-btn delete-result-btn";del.textContent="🗑️ Delete Result";
      del.addEventListener("click",async()=>{
        if(!confirm("Delete this CBT result? This cannot be undone."))return;
        del.disabled=true;
        try{await deleteDoc(doc(db,"results",r.id));await loadCbtResultsIfNeeded();await loadAdminResultsIfNeeded();$("resultsCount").textContent=await getCount("results");}
        catch(e){console.error(e);alert("Could not delete result: "+(e.code||e.message));del.disabled=false}
      });
      c.append(h,meta,sc,detail,del);list.appendChild(c);
    });
  }catch(e){console.error(e);list.innerHTML='<p class="message">Could not load CBT results: '+(e.code||e.message)+'</p>'}
}


async function loadAdminResultsIfNeeded(){
  const panel=$("adminResultsPanel"),list=$("adminResultsList");
  if(!panel||!list||!isAdminRole())return;
  list.innerHTML='<p class="muted">Loading recent results...</p>';
  try{
    const s=await getDocs(collection(db,"results"));
    const rows=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>{
      const ta=(a.updatedAt?.toDate?a.updatedAt.toDate():new Date(a.updatedAt||0)).getTime();
      const tb=(b.updatedAt?.toDate?b.updatedAt.toDate():new Date(b.updatedAt||0)).getTime();
      return tb-ta;
    });
    if(!rows.length){list.innerHTML='<p class="muted">No recent results.</p>';return}
    list.innerHTML="";
    rows.forEach(r=>{
      const c=document.createElement("article");c.className="result-card";
      const h=document.createElement("h3");h.textContent=r.resultType==="cbt"?(r.testTitle||"CBT Test"):(r.assignmentTitle||"Assignment Result");
      const meta=document.createElement("p");meta.className="submission-meta";meta.textContent=(r.resultType==="cbt"?"CBT":"Assignment")+" • Student: "+(r.studentEmail||r.studentId||"Unknown");
      const sc=document.createElement("div");sc.className="score";sc.textContent=String(r.score??0)+"/100";
      const detail=document.createElement("div");detail.className="feedback";detail.textContent=r.resultType==="cbt"?((r.correctAnswers??0)+" / "+(r.totalQuestions??0)+" correct"): (r.feedback||"No feedback provided.");
      const del=document.createElement("button");del.type="button";del.className="secondary-btn delete-result-btn";del.textContent="🗑️ Delete Result";
      del.addEventListener("click",async()=>{
        if(!confirm("Delete this result? This cannot be undone."))return;
        del.disabled=true;
        try{await deleteDoc(doc(db,"results",r.id));await loadAdminResultsIfNeeded();await loadCbtResultsIfNeeded();$("resultsCount").textContent=await getCount("results");}
        catch(e){console.error(e);alert("Could not delete result: "+(e.code||e.message));del.disabled=false}
      });
      c.append(h,meta,sc,detail,del);list.appendChild(c);
    });
  }catch(e){console.error(e);list.innerHTML='<p class="message">Could not load recent results: '+(e.code||e.message)+'</p>'}
}



// ===== STUDY MATERIALS (V17) =====
const materialsAdminPanel=$('materialsAdminPanel'),materialForm=$('materialForm'),materialsList=$('materialsList');
let materialFilter='All';
async function loadMaterials(){
  if(!materialsList)return;
  materialsList.innerHTML='<p class="muted">Loading study materials...</p>';
  try{
    let s;
    try{s=await getDocs(query(collection(db,'materials'),orderBy('createdAt','desc')))}catch(e){s=await getDocs(collection(db,'materials'))}
    const rows=s.docs.map(d=>({id:d.id,...d.data()})).filter(m=>materialFilter==='All'||String(m.category||'General')===materialFilter);
    if(!rows.length){materialsList.innerHTML='<p class="muted">No study materials published yet.</p>';return}
    materialsList.innerHTML='';
    rows.forEach(m=>{
      const c=document.createElement('article');c.className='material-card';
      const h=document.createElement('h3');h.textContent=m.title||'Untitled Material';
      const meta=document.createElement('p');meta.className='subject';meta.textContent=(m.category||'General')+' • '+(m.subject||'General');
      const desc=document.createElement('p');desc.className='muted';desc.textContent=m.description||'Study material / PDF resource.';
      const actions=document.createElement('div');actions.className='material-actions';
      const open=document.createElement('a');open.className='primary-btn material-link';open.href=m.url||'#';open.target='_blank';open.rel='noopener noreferrer';open.textContent='👁️ View PDF';actions.appendChild(open);
      if(m.storageProvider==='supabase' && m.storagePath){
        const dl=document.createElement('button');dl.className='secondary-btn material-download-btn';dl.type='button';dl.textContent='⬇️ Download PDF';
        dl.addEventListener('click',async()=>{
          const oldText=dl.textContent;dl.disabled=true;dl.textContent='⏳ Downloading...';
          try{
            const filename=m.fileName||((m.title||'study-material')+'.pdf');
            const {data:urlData,error:urlError}=supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(m.storagePath,{download:filename});
            if(urlError)throw urlError;
            const downloadUrl=urlData?.publicUrl;
            if(!downloadUrl)throw new Error('Could not create download URL.');
            const a=document.createElement('a');a.href=downloadUrl;a.download=filename;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
          }catch(e){console.error('PDF download error:',e);alert('Could not download this PDF: '+(e?.message||e));}
          finally{dl.disabled=false;dl.textContent=oldText;}
        });
        actions.appendChild(dl);
      }
      if(isAdminRole()){
        const del=document.createElement('button');del.className='danger-btn';del.type='button';del.textContent='🗑 Delete';
        del.addEventListener('click',async()=>{
          if(!confirm('Delete this study material? This cannot be undone.'))return;
          del.disabled=true;
          try{
            if(m.storageProvider==='supabase' && m.storagePath){
              const {error:storageErr}=await supabase.storage.from(SUPABASE_BUCKET).remove([m.storagePath]);
              if(storageErr)console.warn('Supabase storage delete warning:',storageErr);
            }
            await deleteDoc(doc(db,'materials',m.id));await loadMaterials();await loadLearningCentre();
          }catch(e){console.error(e);alert('Could not delete material: '+(e.code||e.message));del.disabled=false}
        });actions.appendChild(del);
      }
      c.append(h,meta,desc,actions);materialsList.appendChild(c);
    });
  }catch(e){console.error(e);materialsList.innerHTML='<p class="message">Could not load study materials: '+(e.code||e.message)+'</p>'}
}

materialForm?.addEventListener('submit',async e=>{
  e.preventDefault();
  if(!isAdminRole()){ $('materialMessage').textContent='Only admins can publish study materials.';return; }
  const file=$('materialFile')?.files?.[0];
  if(!file){$('materialMessage').className='message submission-error';$('materialMessage').textContent='Please select a PDF file.';return;}
  const looksLikePdf=file.type==='application/pdf' || !file.type || file.type==='application/octet-stream' || /\.pdf$/i.test(file.name);
  if(!looksLikePdf){ $('materialMessage').className='message submission-error';$('materialMessage').textContent='Only PDF files are supported for now.';return; }
  if(file.size>50*1024*1024){ $('materialMessage').className='message submission-error';$('materialMessage').textContent='File is too large. Maximum size is 50 MB on the free storage plan.';return; }
  const submitBtn=materialForm.querySelector('button[type="submit"]');if(submitBtn)submitBtn.disabled=true;
  $('materialMessage').className='message';$('materialMessage').textContent='Uploading PDF to free storage...';
  let uploadedPath=null;
  try{
    const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
    const storagePath='materials/'+auth.currentUser.uid+'/'+Date.now()+'_'+safeName;
    uploadedPath=storagePath;
    const {error:uploadError}=await supabase.storage.from(SUPABASE_BUCKET).upload(storagePath,file,{contentType:'application/pdf',upsert:false,cacheControl:'3600'});
    if(uploadError)throw uploadError;
    const {data:urlData}=supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(storagePath);
    const url=urlData?.publicUrl;
    if(!url)throw new Error('Could not create the public download link.');
    await addDoc(collection(db,'materials'),{title:$('materialTitle').value.trim(),subject:$('materialSubject').value.trim(),category:$('materialCategory').value,description:$('materialDescription').value.trim(),url,storagePath,fileName:file.name,fileSize:file.size,storageProvider:'supabase',createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});
    materialForm.reset();$('materialCategory').value='General';$('materialMessage').className='message submission-success';$('materialMessage').textContent='Study material uploaded and published successfully ✅';await loadMaterials();await loadLearningCentre();
  }catch(e){
    console.error(e);
    if(uploadedPath){try{await supabase.storage.from(SUPABASE_BUCKET).remove([uploadedPath])}catch(cleanErr){console.warn('Upload cleanup warning:',cleanErr)}}
    const msg=e?.message||e?.error_description||e?.error||'Unknown error';
    $('materialMessage').className='message submission-error';
    $('materialMessage').textContent='Could not upload material: '+msg+' — check that the Supabase “materials” bucket exists and allows uploads.';
  }finally{if(submitBtn)submitBtn.disabled=false;}
});

document.querySelectorAll('.material-filter').forEach(btn=>btn.addEventListener('click',()=>{materialFilter=btn.dataset.filter;document.querySelectorAll('.material-filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');loadMaterials()}));

const studentAdminPanel=$("studentAdminPanel"),studentForm=$("studentForm"),studentsList=$("studentsList"),studentMessage=$("studentMessage");
const firebaseConfigForStudentCreation={apiKey:"AIzaSyCX_ZC18wviACEbGwTLBQiD95HVZg2oxDY",authDomain:"great-stand-consult.firebaseapp.com",projectId:"great-stand-consult",storageBucket:"great-stand-consult.firebasestorage.app",messagingSenderId:"759290092567",appId:"1:759290092567:web:4e873f1ad166cb54d11052",measurementId:"G-BPTN65KHK7"};
let studentCreatorApp=null,studentCreatorAuth=null;
function getStudentCreatorAuth(){
  if(!studentCreatorApp){
    const name="studentCreator";
    studentCreatorApp=getApps().find(a=>a.name===name)||initializeApp(firebaseConfigForStudentCreation,name);
    studentCreatorAuth=getAuth(studentCreatorApp);
  }
  return studentCreatorAuth;
}
async function loadStudents(){
  if(!isAdminRole())return;
  studentsList.innerHTML='<p class="muted">Loading students...</p>';
  try{
    const s=await getDocs(query(collection(db,"users"),where("role","==","student")));
    const docs=s.docs.sort((a,b)=>String(a.data().name||"").localeCompare(String(b.data().name||"")));
    if(!docs.length){studentsList.innerHTML='<p class="muted">No students registered yet.</p>';return;}
    studentsList.innerHTML="";
    docs.forEach(d=>{
      const st=d.data(),card=document.createElement("article");card.className="student-card";
      const h=document.createElement("h3");h.textContent=st.name||"Unnamed Student";
      const meta=document.createElement("p");meta.className="student-meta";meta.textContent=(st.email||"No email")+" • "+(st.category||"JAMB & WAEC")+(st.level?" • "+st.level:"");
      const status=document.createElement("span");status.className=st.active===false?"status-badge inactive":"status-badge active";status.textContent=st.active===false?"Inactive":"Active";
      const actions=document.createElement("div");actions.className="card-actions";
      const toggle=document.createElement("button");toggle.type="button";toggle.className="secondary-btn";toggle.textContent=st.active===false?"Activate":"Deactivate";
      toggle.addEventListener("click",async()=>{toggle.disabled=true;try{await updateDoc(doc(db,"users",d.id),{active:st.active===false});await loadStudents();}catch(e){console.error(e);alert("Could not update student: "+(e.code||e.message));toggle.disabled=false}});
      actions.appendChild(toggle);card.append(h,meta,status,actions);studentsList.appendChild(card);
    });
  }catch(e){console.error(e);studentsList.innerHTML='<p class="message">Could not load students: '+(e.code||e.message)+'</p>';}
}
studentForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!isAdminRole()||!auth.currentUser)return;
  studentMessage.textContent="Creating student account...";studentMessage.className="message";
  const name=$("studentName").value.trim(),email=$("studentEmail").value.trim(),password=$("studentPassword").value,category=$("studentCategory").value,level=$("studentLevel").value.trim();
  if(password.length<6){studentMessage.textContent="Password must be at least 6 characters.";return;}
  try{
    const sa=getStudentCreatorAuth();
    const cred=await createUserWithEmailAndPassword(sa,email,password);
    await (async()=>{const uid=cred.user.uid;await setDoc(doc(db,"users",uid),{name,email,role:"student",category,level,active:true,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});})();
    await signOut(sa);
    studentForm.reset();studentMessage.className="message submission-success";studentMessage.textContent="Student account created successfully ✅";
    await loadStudents();
    const count=await getDocs(query(collection(db,"users"),where("role","==","student")));$("studentsCount").textContent=count.size;
  }catch(e){console.error(e);studentMessage.className="message submission-error";studentMessage.textContent="Could not create student: "+(e.code||e.message);}
});

// ===== ADMIN POST UPDATES =====
async function loadAdminAnnouncements(){
  const list=$("adminAnnouncementsList"); if(!list)return;
  list.innerHTML='<p class="muted">Loading updates...</p>';
  try{let snap;try{snap=await getDocs(query(collection(db,"announcements"),orderBy("createdAt","desc")))}catch(e){snap=await getDocs(collection(db,"announcements"))}
    if(snap.empty){list.innerHTML='<p class="muted">No updates posted yet.</p>';return}
    list.innerHTML=""; snap.docs.slice(0,20).forEach(d=>{const a=d.data(),card=document.createElement("article");card.className="announcement-admin-item";
      const h=document.createElement("strong");h.textContent=(a.type||"announcement").toUpperCase()+" • "+(a.title||"Update");
      const msg=document.createElement("div");msg.textContent=a.message||"";msg.style.marginTop="7px";msg.style.color="#344054";
      const sm=document.createElement("small");sm.textContent=a.createdAt?.toDate?"Posted: "+a.createdAt.toDate().toLocaleString():"Posted recently";
      const del=document.createElement("button");del.type="button";del.className="secondary-btn";del.textContent="Delete";
      del.addEventListener("click",async()=>{if(!confirm("Delete this update?"))return;del.disabled=true;try{await deleteDoc(doc(db,"announcements",d.id));await loadAdminAnnouncements()}catch(e){alert("Could not delete update: "+(e.code||e.message));del.disabled=false}});
      card.append(h,msg,sm,del);list.appendChild(card);});
  }catch(e){console.error(e);list.innerHTML='<p class="message">Could not load posted updates: '+(e.code||e.message)+'</p>'}
}
const announcementForm=$("announcementForm");
announcementForm?.addEventListener("submit",async e=>{e.preventDefault();if(!auth.currentUser)return;const st=$("announcementMessageStatus");st.textContent="Publishing update...";try{await addDoc(collection(db,"announcements"),{title:$("announcementTitle").value.trim(),message:$("announcementMessage").value.trim(),type:$("announcementType").value,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});announcementForm.reset();st.textContent="Update published successfully ✅";await loadAdminAnnouncements()}catch(e){console.error(e);st.textContent="Could not publish update: "+(e.code||e.message)}});
$("refreshAnnouncementsBtn")?.addEventListener("click",loadAdminAnnouncements);

// ===== STUDENT NOTIFICATIONS (derived from existing published content; no new Firestore collection) =====
async function loadStudentNotifications(){
  const panel=$('gsNotificationsPanel'),list=$('gsNotificationList');
  if(!panel||!list)return;
  const role=String(window.currentUserRole||currentStudentProfile?.role||'').toLowerCase();
  panel.style.display=role==='student'?'block':'none';
  if(role!=='student')return;
  list.innerHTML='<div class="gs-notification-empty">Loading updates...</div>';
  try{
    const rows=[];
    const fetchCol=async(name,type,icon,label)=>{try{let snap;try{snap=await getDocs(query(collection(db,name),orderBy('createdAt','desc')))}catch(e){snap=await getDocs(collection(db,name))}snap.docs.slice(0,6).forEach(d=>{const x=d.data();rows.push({type,icon,label,title:x.title||label,time:x.createdAt?.toDate?x.createdAt.toDate():null})})}catch(e){console.warn('Notification source '+name,e)}};
    try{let snap;try{snap=await getDocs(query(collection(db,"announcements"),orderBy("createdAt","desc")))}catch(e){snap=await getDocs(collection(db,"announcements"))}snap.docs.slice(0,8).forEach(d=>{const x=d.data();rows.push({type:"announcement",icon:"📢",label:"Update",title:x.title||"New update",message:x.message||"",time:x.createdAt?.toDate?x.createdAt.toDate():null})})}catch(e){console.warn("Notification source announcements",e)}
    await Promise.all([
      fetchCol('notes','note','📖','New note'),
      fetchCol('assignments','assignment','📝','New assignment'),
      fetchCol('tests','test','🧠','New CBT / test'),
      fetchCol('materials','material','📚','New study material')
    ]);
    rows.sort((a,b)=>(b.time?.getTime?.()||0)-(a.time?.getTime?.()||0));
    if(!rows.length){list.innerHTML='<div class="gs-notification-empty">🎉 You are all caught up. New updates will appear here.</div>';return}
    list.innerHTML=rows.slice(0,12).map(x=>`<article class="gs-notification-item"><div class="gs-notification-icon">${x.icon}</div><div><b>${esc(x.label)}: ${esc(x.title)}</b>${x.message?`<div style="margin-top:5px;color:#344054">${esc(x.message)}</div>`:''}<small>${x.time?x.time.toLocaleString():'Recently published'} • Great Stand Educational Consult</small></div></article>`).join('');
  }catch(e){console.error(e);list.innerHTML='<div class="gs-notification-empty">Could not load notifications.</div>'}
}
window.gsRefreshNotifications=loadStudentNotifications;
$('gsRefreshNotificationsBtn')?.addEventListener('click',loadStudentNotifications);

onAuthStateChanged(auth,async user=>{
  if(!user){
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    setAdminPanelsVisible(false);
    return;
  }

  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  try{
    const s=await getDoc(doc(db,"users",user.uid));

    if(!s.exists()){
      setAdminPanelsVisible(false);
      $("welcomeTitle").textContent="PROFILE NOT FOUND";
      return;
    }

    const p=s.data();
    currentStudentProfile=p;
    const role=String(p.role||"student").trim().toLowerCase();
    const allowed=role==="admin"||role==="superadmin";

    window.currentUserRole=role;
    const studentQuick=$("studentQuickPanel");
    const adminStat=document.querySelector(".admin-stat");
    if(studentQuick)studentQuick.style.display=role==="student"?"block":"none";
    if(adminStat)adminStat.style.display=role==="student"?"none":"block";
    if(role==="student"){
      const cat=String(p.category||"Student").replace(/\s+/g," ").trim();
      $("studentCategoryPill").textContent=cat.toUpperCase();
      learningFilter = cat.toUpperCase()==="JAMB" || cat.toUpperCase()==="WAEC" ? cat.toUpperCase() : "all";
      document.querySelectorAll(".learning-tab").forEach(b=>b.classList.toggle("active",(b.dataset.learningFilter||"all").toUpperCase()===learningFilter.toUpperCase()));
    }

    if(p.active===false){
      await signOut(auth);
      loginView.classList.remove("hidden");
      dashboardView.classList.add("hidden");
      logoutBtn.classList.add("hidden");
      $("loginMessage").textContent="This student account is currently inactive. Please contact Great Stand Educational Consult.";
      return;
    }

    $("welcomeTitle").textContent="Welcome, "+(p.name||user.email);
    $("roleText").textContent="Signed in as "+role;
    $("statusText").textContent=role==="superadmin"
      ?"SUPERADMIN ACCOUNT DETECTED ✅"
      :role==="admin"
      ?"ADMIN ACCOUNT DETECTED ✅"
      :"Student account detected.";

    // Set admin panels immediately after role is confirmed.
    // This is intentionally before loading dashboard data so a later
    // non-critical loading error cannot hide the panels.
    setAdminPanelsVisible(allowed);
    if(allowed){ const cp=$("courseAdminPanel"); if(cp) cp.style.display="block"; }
    if(window.gsRefreshNavigation) window.gsRefreshNavigation();

    try{$("notesCount").textContent=await getCount("notes")}catch(e){}
    try{$("assignmentsCount").textContent=await getCount("assignments")}catch(e){}
    try{$("testsCount").textContent=await getCount("tests")}catch(e){}
    try{$("resultsCount").textContent=await getCount("results")}catch(e){}

    try{await loadNotes()}catch(e){console.error("Notes:",e)}
    try{await loadAssignments()}catch(e){console.error("Assignments:",e)}
    try{await loadTests()}catch(e){console.error("Tests:",e)}
    try{await loadMaterials();await loadLearningCentre()}catch(e){console.error("Materials:",e)}
    try{await loadLearningCentre()}catch(e){console.error("Learning Centre:",e)}

    if(allowed){
      try{await loadSubmissions()}catch(e){console.error("Submissions:",e)}
      try{await loadCbtResultsIfNeeded()}catch(e){console.error("CBT results:",e)}
      try{await loadAdminResultsIfNeeded()}catch(e){console.error("Admin results:",e)}
      try{await loadStudents()}catch(e){console.error("Students:",e)}
      try{
        $("studentsCount").textContent=
          (await getDocs(query(collection(db,"users"),where("role","==","student")))).size;
      }catch(e){
        $("studentsCount").textContent="0";
      }
    }

    try{await loadStudentResultsIfNeeded()}catch(e){console.error("Student results:",e)}
    try{await loadStudentNotifications()}catch(e){console.error("Notifications:",e)}

  }catch(e){
    console.error(e);
    // Do NOT hide already-authorized admin panels because of a
    // non-role-related Firestore/data loading problem.
    $("statusText").textContent="Firestore error: "+(e.code||e.message);
  }
});
/* V20.3 role-aware navigation layer — visual/navigation only; Firebase/Auth logic is untouched. */

// ===== V21 LEARNING CENTRE =====
const learningCourseGrid=$('learningCourseGrid');
let learningFilter='all';
const learningStore={notes:[],assignments:[],tests:[],materials:[]};
function normalizeText(v){return String(v||'').trim()}
function courseKey(category,subject){return (normalizeText(category)||'General')+'::'+(normalizeText(subject)||'General')}
function courseCategory(row){const c=normalizeText(row.category).toUpperCase();return c==='JAMB'||c==='WAEC'?''+c:(normalizeText(row.category)||'General')}
function makeLearningCourse(category,subject){return {category:category||'General',subject:subject||'General',notes:0,assignments:0,tests:0,materials:0}}
function renderLearningCentre(){
  if(!learningCourseGrid)return;
  const map=new Map();
  const add=(category,subject,type)=>{const key=courseKey(category,subject);if(!map.has(key))map.set(key,makeLearningCourse(category,subject));map.get(key)[type]++};
  learningStore.notes.forEach(n=>add(courseCategory(n),normalizeText(n.subject)||'General','notes'));
  learningStore.assignments.forEach(a=>add(courseCategory(a),normalizeText(a.subject)||'General','assignments'));
  learningStore.tests.forEach(t=>add(courseCategory(t),normalizeText(t.subject)||'General','tests'));
  learningStore.materials.forEach(m=>add(courseCategory(m),normalizeText(m.subject)||'General','materials'));
  let rows=[...map.values()];
  if(learningFilter!=='all')rows=rows.filter(x=>x.category===learningFilter);
  if(learningFilter==='all'){
    const tracks=['JAMB','WAEC'].map(cat=>({category:cat,subject:cat==='JAMB'?'JAMB Preparation':'WAEC Preparation',notes:learningStore.notes.filter(x=>courseCategory(x)===cat).length,assignments:learningStore.assignments.filter(x=>courseCategory(x)===cat).length,tests:learningStore.tests.filter(x=>courseCategory(x)===cat).length,materials:learningStore.materials.filter(x=>courseCategory(x)===cat).length,track:true}));
    rows=[...tracks,...rows.filter(x=>x.category!=='JAMB'&&x.category!=='WAEC')];
  }
  if(!rows.length){learningCourseGrid.innerHTML='<div class="learning-empty"><div>📚</div><h3>No courses yet</h3><p class="muted">Courses will appear here when learning resources are published for your JAMB or WAEC category.</p></div>';return}
  rows.sort((a,b)=>a.category.localeCompare(b.category)||a.subject.localeCompare(b.subject));
  learningCourseGrid.innerHTML='';
  rows.forEach(c=>{
    const total=c.notes+c.assignments+c.tests+c.materials;
    const card=document.createElement('article');card.className='learning-course-card'+(c.track?' learning-track-card':'');
    const icon=c.category==='JAMB'?'🎯':c.category==='WAEC'?'🎓':'📘';
    card.innerHTML=`<div class="learning-course-top"><span class="course-icon">${icon}</span><span class="course-category ${c.category.toLowerCase()}">${c.category}</span></div><h3>${c.subject}</h3><p class="muted">${total} learning resource${total===1?'':'s'} available</p><div class="course-resource-row"><span>📖 ${c.notes} Notes</span><span>📝 ${c.assignments} Assignments</span><span>🧠 ${c.tests} Tests</span><span>📚 ${c.materials} Materials</span></div><div class="course-actions"><button class="primary-btn course-open-btn" type="button">Open Course →</button></div>`;
    card.querySelector('.course-open-btn').addEventListener('click',()=>openCourseResources(c));
    learningCourseGrid.appendChild(card);
  });
}
function openCourseResources(course){
  const modal=$('courseModal'); if(!modal)return;
  $('courseModalTitle').textContent=course.subject||'Course';
  $('courseModalCategory').textContent=(course.category||'General').toUpperCase();
  $('courseModalSubtitle').textContent=course.track ? 'Preparation track' : 'Your learning resources for this subject';
  const icon=course.category==='JAMB'?'🎓':course.category==='WAEC'?'📘':'📚';
  $('courseModalIcon').textContent=icon;
  $('courseModalStats').innerHTML=`<div><b>${course.notes}</b><span>Notes</span></div><div><b>${course.assignments}</b><span>Assignments</span></div><div><b>${course.tests}</b><span>CBT Tests</span></div><div><b>${course.materials}</b><span>Materials</span></div>`;
  const resources=[];
  const same=(r)=>course.track ? courseCategory(r)===course.category : (courseCategory(r)===course.category && (normalizeText(r.subject)||'General')===course.subject);
  [
    [learningStore.notes,'notesPanel','📖','Notes','Read your published lessons'],
    [learningStore.assignments,'assignmentsPanel','📝','Assignments','Open and submit your work'],
    [learningStore.tests,'testsPanel','🧠','CBT / Tests','Take practice tests and get scored'],
    [learningStore.materials,'materialsPanel','📚','Study Materials','View or download PDF materials']
  ].forEach(([arr,target,ico,title,desc])=>{ const count=arr.filter(same).length; if(count)resources.push({target,ico,title,desc,count}); });
  if(!resources.length){
    $('courseModalResources').innerHTML='<div class="course-empty">No resources have been added to this course yet.<br><small>Check back when your tutor publishes new materials.</small></div>';
  }else{
    $('courseModalResources').innerHTML=resources.map(r=>`<button class="course-resource-btn" data-target="${r.target}" type="button"><span>${r.ico}</span><div><b>${r.title}</b><small>${r.count} available • ${r.desc}</small></div><strong>›</strong></button>`).join('');
    $('courseModalResources').querySelectorAll('.course-resource-btn').forEach(btn=>btn.addEventListener('click',()=>{modal.classList.add('hidden'); if(window.gsShowSection)window.gsShowSection(btn.dataset.target)}));
  }
  modal.classList.remove('hidden');
}
async function loadLearningCentre(){
  if(!learningCourseGrid)return;
  learningCourseGrid.innerHTML='<div class="learning-empty"><div>⏳</div><h3>Organizing your courses...</h3><p class="muted">Loading notes, assignments, tests and materials.</p></div>';
  try{
    const [ns,as,ts,ms]=await Promise.all([getDocs(collection(db,'notes')),getDocs(collection(db,'assignments')),getDocs(collection(db,'tests')),getDocs(collection(db,'materials'))]);
    learningStore.notes=ns.docs.map(d=>d.data());
    learningStore.assignments=as.docs.map(d=>d.data());
    learningStore.tests=ts.docs.map(d=>d.data());
    learningStore.materials=ms.docs.map(d=>d.data());
    renderLearningCentre();
  }catch(e){console.error('Learning Centre:',e);learningCourseGrid.innerHTML='<div class="learning-empty"><div>⚠️</div><h3>Could not load courses</h3><p class="muted">Please refresh and try again.</p></div>'}
}

document.querySelectorAll('.learning-tab').forEach(btn=>btn.addEventListener('click',()=>{learningFilter=btn.dataset.learningFilter||'all';document.querySelectorAll('.learning-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');renderLearningCentre()}));
$('refreshLearningBtn')?.addEventListener('click',loadLearningCentre);

(function(){
  const menuBtn=document.getElementById("gsMenuBtn"), sideNav=document.getElementById("gsSideNav"), overlay=document.getElementById("gsNavOverlay"), links=document.getElementById("gsNavLinks"), navLogout=document.getElementById("gsNavLogout"), navClose=document.getElementById("gsNavClose"), nameEl=document.getElementById("gsNavName"), roleEl=document.getElementById("gsNavRole");
  if(!menuBtn||!sideNav||!links)return;

  const studentGroups=[
    {heading:"STUDENT MENU",items:[
      ["⌂","Dashboard","dashboardView","Return to your dashboard"],
      ["🎓","My Courses","learningCentrePanel","Learn by course, subject and topic"],
      ["📖","My Notes","notesPanel","Read your published notes"],
      ["📝","Assignments","assignmentsPanel","View and submit assignments"],
      ["🧠","CBT / Tests","testsPanel","Take practice tests and get scored"],
      ["📚","Study Materials","materialsPanel","Access your study resources"],
      ["🏆","My Results","studentResultsPanel","View your performance"],
      ["🔔","Notifications","gsNotificationsPanel","See your latest updates"],
      ["📊","Learning Progress","gsStudentProgressPanel","Track your course and lesson progress"],
      ["🏆","My Achievements","gsAchievementsPanel","View your learning milestones and badges"],
      ["👤","My Profile","gsProfilePanel","View your student information"]
    ]}
  ];
  const adminGroups=[
    {heading:"ADMIN MENU",items:[
      ["⌂","Dashboard","dashboardView","Portal overview"],
      ["👨‍🎓","Manage Students","studentAdminPanel","Create and manage student accounts"],
      ["🎓","Manage Courses & Lessons","courseAdminPanel","Build and publish learning content"],
      ["📚","Manage Notes","adminPanel","Publish notes for students"],
      ["📢","Post Updates","announcementAdminPanel","Create announcements for students"],
      ["📝","Manage Assignments","assignmentAdminPanel","Create and manage assignments"],
      ["🧠","Manage CBT / Tests","testAdminPanel","Create practice tests"],
      ["📖","Manage Study Materials","materialsAdminPanel","Manage downloadable materials"],
      ["📊","CBT Results","testResultsAdminPanel","Review students' CBT performance"],
      ["📥","Student Submissions","submissionsAdminPanel","Review and mark submissions"]
    ]},
    {heading:"STUDENT VIEW",items:[
      ["🎓","Learning Centre","learningCentrePanel"],["📖","Notes","notesPanel"],["📝","Assignments","assignmentsPanel"],["🧠","CBT / Tests","testsPanel"],["📚","Study Materials","materialsPanel"],["🏆","Results","studentResultsPanel"],["🔔","Notifications","gsNotificationsPanel","See your latest updates"]
    ]}
  ];
  const superadminGroups=[
    {heading:"SUPERADMIN CONTROL",items:[
      ["⌂","Dashboard","dashboardView","Full portal overview"],
      ["👑","Admin Management","superadminPanel","Superadmin-only controls"],
      ["👨‍🎓","Manage Students","studentAdminPanel","Create and manage student accounts"],
      ["🎓","Manage Courses & Lessons","courseAdminPanel","Build and publish learning content"],
      ["📚","Manage Notes","adminPanel","Publish notes for students"],
      ["📢","Post Updates","announcementAdminPanel","Create announcements for students"],
      ["📝","Manage Assignments","assignmentAdminPanel","Create and manage assignments"],
      ["🧠","Manage CBT / Tests","testAdminPanel","Create practice tests"],
      ["📖","Manage Study Materials","materialsAdminPanel","Manage downloadable materials"],
      ["📊","CBT Results","testResultsAdminPanel","Review students' CBT performance"],
      ["📥","Student Submissions","submissionsAdminPanel","Review and mark submissions"]
    ]},
    {heading:"STUDENT PORTAL VIEW",items:[
      ["🎓","Learning Centre","learningCentrePanel"],["📖","Notes","notesPanel"],["📝","Assignments","assignmentsPanel"],["🧠","CBT / Tests","testsPanel"],["📚","Study Materials","materialsPanel"],["🏆","Results","studentResultsPanel"],["🔔","Notifications","gsNotificationsPanel","See your latest updates"]
    ]}
  ];

  function closeNav(){
    sideNav.classList.remove("open"); overlay?.classList.remove("show"); sideNav.hidden=true; if(overlay)overlay.hidden=true;
    menuBtn.setAttribute("aria-expanded","false");menuBtn.setAttribute("aria-label","Open navigation");document.body.classList.remove("gs-nav-open");
  }
  function openNav(){
    sideNav.hidden=false;if(overlay)overlay.hidden=false;requestAnimationFrame(()=>{sideNav.classList.add("open");overlay?.classList.add("show")});
    menuBtn.setAttribute("aria-expanded","true");menuBtn.setAttribute("aria-label","Close navigation");document.body.classList.add("gs-nav-open");
  }
  menuBtn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();sideNav.classList.contains("open")?closeNav():openNav()});
  navClose?.addEventListener("click",closeNav);overlay?.addEventListener("click",closeNav);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!sideNav.hidden)closeNav()});
  navLogout?.addEventListener("click",()=>{document.getElementById("logoutBtn")?.click();closeNav()});

  function addHeading(text){const h=document.createElement("div");h.className="gs-nav-section-title";h.textContent=text;links.appendChild(h)}
  function addItem(item){
    const [icon,label,target,sub]=item,btn=document.createElement("button");btn.type="button";btn.className="gs-nav-link";btn.dataset.target=target;
    btn.innerHTML='<span aria-hidden="true">'+icon+'</span><div class="gs-nav-copy"><b>'+label+'</b>'+(sub?'<small>'+sub+'</small>':'')+'</div>';
    btn.addEventListener("click",()=>{if(target==="gsAchievementsPanel"&&typeof window.gsOpenAchievements==="function"){window.gsOpenAchievements()}else{showSection(target)}links.querySelectorAll(".gs-nav-link").forEach(x=>x.classList.remove("active"));btn.classList.add("active");closeNav()});links.appendChild(btn)
  }
  function buildNav(){
    const role=String(window.currentUserRole||currentStudentProfile?.role||"student").trim().toLowerCase(),isSuper=role==="superadmin",isAdmin=role==="admin"||isSuper;
    const groups=isSuper?superadminGroups:(isAdmin?adminGroups:studentGroups);links.innerHTML="";groups.forEach(g=>{addHeading(g.heading);g.items.forEach(addItem)});
    const first=links.querySelector(".gs-nav-link");first?.classList.add("active");
    if(nameEl){const n=document.getElementById("welcomeTitle")?.textContent||"Welcome";nameEl.textContent=n.replace(/^Welcome,\s*/i,"")||"Welcome"}
    if(roleEl){roleEl.textContent=isSuper?"SUPERADMIN":isAdmin?"ADMIN":"STUDENT";roleEl.className="gs-nav-role-badge "+(isSuper?"superadmin":isAdmin?"admin":"student")}
    sideNav.classList.toggle("gs-superadmin",isSuper);
  }
  function allSections(){return Array.from(document.querySelectorAll(".portal-section"))}
  function showSection(target){
    if(target==="gsNotificationsPanel" && String(window.currentUserRole||currentStudentProfile?.role||"").toLowerCase()==="student"){loadStudentNotifications();}
    if(target==="gsProfilePanel" && String(window.currentUserRole||currentStudentProfile?.role||"").toLowerCase()==="student"){loadStudentProfilePanel();}
    if(target==="gsAchievementsPanel" && String(window.currentUserRole||currentStudentProfile?.role||"").toLowerCase()==="student"){setTimeout(()=>window.gsRenderAchievements?.(),50);}
    if(target==="superadminPanel" && String(window.currentUserRole||"").toLowerCase()!=="superadmin")return;
    if(target==="superadminPanel"){loadSuperadminAccounts();}
    if(target==="announcementAdminPanel"){const ap=$("announcementAdminPanel");if(ap)ap.style.display="block";loadAdminAnnouncements();}else{const ap=$("announcementAdminPanel");if(ap)ap.style.display="none";}
    if(target==="dashboardView"){allSections().forEach(el=>el.classList.add("gs-section-hidden"));window.scrollTo({top:0,behavior:"smooth"});return}
    allSections().forEach(el=>el.classList.toggle("gs-section-hidden",el.id!==target));const el=document.getElementById(target);if(el&&!el.classList.contains("hidden"))setTimeout(()=>el.scrollIntoView({behavior:"smooth",block:"start"}),30)
  }
  window.gsShowSection=showSection;window.gsBuildNav=buildNav;window.gsRefreshNavigation=buildNav;
  closeNav();
  document.addEventListener("DOMContentLoaded",()=>{buildNav();allSections().forEach(el=>el.classList.add("gs-section-hidden"))});
  let lastRole="";setInterval(()=>{const role=String(window.currentUserRole||"").trim().toLowerCase();if(role&&role!==lastRole){lastRole=role;buildNav();allSections().forEach(el=>el.classList.add("gs-section-hidden"))}},500);
})();
document.querySelectorAll(".quick-action").forEach(btn=>btn.addEventListener("click",()=>{if(window.gsShowSection)window.gsShowSection(btn.dataset.target)}));
$("closeCourseModal")?.addEventListener("click",()=>$("courseModal").classList.add("hidden"));
$("courseModal")?.addEventListener("click",e=>{if(e.target===$("courseModal"))$("courseModal").classList.add("hidden")});



// ===== STUDENT PROFILE =====
async function loadStudentProfilePanel(){
  const role=String(window.currentUserRole||currentStudentProfile?.role||'').toLowerCase();
  const panel=$("gsProfilePanel");
  if(!panel || role!=="student" || !auth.currentUser)return;
  const p=currentStudentProfile||{};
  const name=p.name||auth.currentUser.email||"Student";
  const email=p.email||auth.currentUser.email||"—";
  const category=p.category||"JAMB & WAEC";
  const level=p.level||"Not specified";
  $("gsProfileName").textContent=name;
  $("gsProfileEmail").textContent=email;
  $("gsProfileFullName").textContent=name;
  $("gsProfileEmailValue").textContent=email;
  $("gsProfileCategory").textContent=category;
  $("gsProfileLevel").textContent=level;
  $("gsProfileStatus").textContent=p.active===false?"Inactive":"Active";
  $("gsProfileRole").textContent="STUDENT";
  $("gsProfileAvatar").textContent=name.trim().charAt(0).toUpperCase()||"G";
  if($("gsEditName")){ $("gsEditName").value=name; $("gsEditCategory").value=["JAMB","WAEC","JAMB & WAEC"].includes(category)?category:"JAMB & WAEC"; $("gsEditLevel").value=(p.level&&p.level!=="Not specified")?p.level:""; }
  try{
    const rs=await getDocs(query(collection(db,"results"),where("studentId","==",auth.currentUser.uid)));
    $("gsProfileResultCount").textContent=rs.size;
    const scores=rs.docs.map(d=>Number(d.data().score)).filter(n=>Number.isFinite(n));
    $("gsProfileAverage").textContent=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1)+"%":"—";
  }catch(e){console.warn("Profile results",e)}
  try{
    const cs=await getDocs(collection(db,"courses"));
    let count=0;cs.forEach(d=>{const c=d.data(),cat=String(c.category||"General").toUpperCase(),want=String(category).toUpperCase();if(want.includes("JAMB")&&want.includes("WAEC")||cat==="GENERAL"||cat===want)count++});
    $("gsProfileCourseCount").textContent=count;
  }catch(e){console.warn("Profile courses",e)}
}

function setupStudentProfileEditor(){
  // Keep exactly one edit button if a previous cached/rendered layer duplicated it.
  const editButtons=document.querySelectorAll("#gsEditProfileBtn");
  editButtons.forEach((btn,i)=>{if(i>0)btn.remove()});
  const editBtn=$("gsEditProfileBtn"),box=$("gsProfileEditBox"),form=$("gsProfileEditForm"),cancel=$("gsCancelProfileEdit"),msg=$("gsProfileEditMessage");
  if(!editBtn||!box||!form)return;
  const openEditor=()=>{box.style.display="block";box.hidden=false;msg.textContent="";setTimeout(()=>$("gsEditName")?.focus(),50)};
  const closeEditor=()=>{box.style.display="none";box.hidden=true;msg.textContent=""};
  editBtn.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();openEditor()});
  cancel?.addEventListener("click",e=>{e.preventDefault();closeEditor()});
  // Delegated fallback keeps the button working even if another portal script re-renders the profile panel.
  document.addEventListener("click",e=>{
    const b=e.target.closest?.("#gsEditProfileBtn");
    if(b && b!==editBtn){e.preventDefault();openEditor()}
  });
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!auth.currentUser || String(window.currentUserRole||currentStudentProfile?.role||"").toLowerCase()!=="student")return;
    const name=$("gsEditName").value.trim(),category=$("gsEditCategory").value,level=$("gsEditLevel").value.trim();
    if(name.length<2){msg.textContent="Please enter your full name.";return;}
    msg.textContent="Saving...";
    try{
      await updateDoc(doc(db,"users",auth.currentUser.uid),{name,category,level});
      currentStudentProfile={...(currentStudentProfile||{}),name,category,level};
      await loadStudentProfilePanel();
      box.style.display="none";
      msg.textContent="Profile updated successfully ✅";
    }catch(err){console.error("Profile update",err);msg.textContent="Could not update profile: "+(err.code||err.message)}
  });
}
setupStudentProfileEditor();

// ===== SUPERADMIN-ONLY ADMIN ACCOUNT OVERVIEW =====
async function loadSuperadminAccounts(){
  const panel=$("superadminPanel"),list=$("adminAccountsList");
  if(!panel||!list)return;
  if(String(window.currentUserRole||"").toLowerCase()!=="superadmin"){panel.style.display="none";return;}
  list.innerHTML='<p class="muted">Loading administrative accounts...</p>';
  try{
    const snap=await getDocs(collection(db,"users"));
    const admins=snap.docs.map(d=>({id:d.id,...d.data()})).filter(u=>["admin","superadmin"].includes(String(u.role||"").toLowerCase()));
    if(!admins.length){list.innerHTML='<p class="muted">No administrative accounts found.</p>';return;}
    list.innerHTML=admins.map(u=>{
      const role=String(u.role||"admin").toUpperCase();
      const cls=role==="SUPERADMIN"?"superadmin":"admin";
      return '<article class="note-card" style="border-left:4px solid '+(cls==="superadmin"?'#d6ad55':'#1e5ca8')+'"><h3>'+esc(u.name||"Unnamed administrator")+'</h3><p class="subject">'+role+'</p><p class="muted">User ID: '+esc(u.id)+'</p></article>';
    }).join("");
  }catch(e){console.error(e);list.innerHTML='<p class="message">Could not load administrative accounts: '+esc(e.code||e.message)+'</p>'}
}
$("refreshAdminsBtn")?.addEventListener("click",loadSuperadminAccounts);

// ===== V25 COURSE → SUBJECT → TOPIC → LESSON LEARNING SYSTEM =====
const courseAdminPanel=$('courseAdminPanel'), courseForm=$('courseForm'), subjectForm=$('subjectForm'), topicForm=$('topicForm'), lessonForm=$('lessonForm');
const learningPathPanel=$('learningPathPanel'), learningPathContent=$('learningPathContent'), learningPathTitle=$('learningPathTitle'), learningPathSubtitle=$('learningPathSubtitle');
const courseData={courses:[],subjects:[],topics:[],lessons:[]};
let learningTrail=[];
function fsDate(v){try{return v?.toDate?v.toDate():new Date(v)}catch(e){return null}}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
async function readCollectionSafe(name){
  try{return await getDocs(collection(db,name))}
  catch(e){console.error('Could not read '+name,e);return null}
}
async function loadCourseStructure(){
  if(!courseAdminPanel && !learningPathPanel)return;
  try{
    const [cs,ss,ts,ls]=await Promise.all([
      readCollectionSafe('courses'),readCollectionSafe('subjects'),
      readCollectionSafe('topics'),readCollectionSafe('lessons')
    ]);
    courseData.courses=cs?cs.docs.map(d=>({id:d.id,...d.data()})):[];
    courseData.subjects=ss?ss.docs.map(d=>({id:d.id,...d.data()})):[];
    courseData.topics=ts?ts.docs.map(d=>({id:d.id,...d.data()})):[];
    courseData.lessons=ls?ls.docs.map(d=>({id:d.id,...d.data()})):[];
    populateCourseSelectors(); renderCourseAdminList();
    if(!cs && courseAdminPanel)$('courseAdminList').innerHTML='<p class="message">Could not read courses. Please check that you are logged in and that the Firestore courses rule is published.</p>';
  }catch(e){console.error('Course structure:',e); if(courseAdminPanel)$('courseAdminList').innerHTML='<p class="message">Could not load course structure: '+(e.code||e.message)+'</p>'}
}
function populateCourseSelectors(){
  const c=$('subjectCourse'), s=$('topicSubject'), t=$('lessonTopic'); if(!c||!s||!t)return;
  c.innerHTML=courseData.courses.length?courseData.courses.map(x=>`<option value="${x.id}">${esc(x.name)} (${esc(x.category||'General')})</option>`).join(''):'<option value="">Create a course first</option>';
  s.innerHTML=courseData.subjects.length?courseData.subjects.map(x=>{const c0=courseData.courses.find(c=>c.id===x.courseId);return `<option value="${x.id}">${esc(x.name)} — ${esc(c0?.name||'Course')}</option>`}).join(''):'<option value="">Create a subject first</option>';
  t.innerHTML=courseData.topics.length?courseData.topics.map(x=>{const s0=courseData.subjects.find(s=>s.id===x.subjectId);return `<option value="${x.id}">${esc(x.name)} — ${esc(s0?.name||'Subject')}</option>`}).join(''):'<option value="">Create a topic first</option>';
}
function renderCourseAdminList(){
  const box=$('courseAdminList'); if(!box)return;
  if(!courseData.courses.length){box.innerHTML='<p class="muted">No courses created yet.</p>';return}
  box.innerHTML=courseData.courses.map(c=>{const subs=courseData.subjects.filter(s=>s.courseId===c.id); return `<div class="admin-course-block"><div class="admin-course-title"><b>🎓 ${esc(c.name)}</b><span>${esc(c.category||'General')}</span></div>${subs.length?subs.map(s=>{const tops=courseData.topics.filter(t=>t.subjectId===s.id);return `<div class="admin-subject-block"><b>📘 ${esc(s.name)}</b>${tops.length?'<ul>'+tops.map(t=>{const ls=courseData.lessons.filter(l=>l.topicId===t.id);return `<li>📌 ${esc(t.name)} <small>${ls.length} lesson${ls.length===1?'':'s'}</small></li>`}).join('')+'</ul>':'<small class="muted">No topics yet</small>'}</div>`}).join(''):'<p class="muted">No subjects yet.</p>'}</div>`}).join('');
}
async function addStructureDoc(col,payload,msgEl,form){
  msgEl.className='message'; msgEl.textContent='Saving...';
  try{await addDoc(collection(db,col),{...payload,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid}); msgEl.className='message submission-success';msgEl.textContent='Saved successfully ✅';form.reset();await loadCourseStructure();await loadLearningCentre();}
  catch(e){console.error(e);msgEl.className='message submission-error';msgEl.textContent='Could not save: '+(e.code||e.message)}
}
courseForm?.addEventListener('submit',e=>{e.preventDefault();addStructureDoc('courses',{name:$('courseName').value.trim(),category:$('courseCategory').value},$('courseMessage'),courseForm)});
subjectForm?.addEventListener('submit',e=>{e.preventDefault();if(!$('subjectCourse').value)return;addStructureDoc('subjects',{name:$('subjectName').value.trim(),courseId:$('subjectCourse').value},$('subjectMessage'),subjectForm)});
topicForm?.addEventListener('submit',e=>{e.preventDefault();if(!$('topicSubject').value)return;addStructureDoc('topics',{name:$('topicName').value.trim(),subjectId:$('topicSubject').value},$('topicMessage'),topicForm)});
lessonForm?.addEventListener('submit',e=>{e.preventDefault();if(!$('lessonTopic').value)return;addStructureDoc('lessons',{title:$('lessonTitle').value.trim(),content:$('lessonContent').value.trim(),pdfUrl:$('lessonPdfUrl').value.trim(),topicId:$('lessonTopic').value},$('lessonMessage'),lessonForm)});
function openLearningPath(type,id){
  learningTrail.push({type,id});
  const c=courseData.courses.find(x=>x.id===id), s=courseData.subjects.find(x=>x.id===id), t=courseData.topics.find(x=>x.id===id), l=courseData.lessons.find(x=>x.id===id);
  if(type==='course'){
    learningPathTitle.textContent=c?.name||'Course';learningPathSubtitle.textContent='Choose a subject';
    const rows=courseData.subjects.filter(x=>x.courseId===id); renderPathCards(rows,'subject');
  }else if(type==='subject'){
    learningPathTitle.textContent=s?.name||'Subject';learningPathSubtitle.textContent='Choose a topic';
    const rows=courseData.topics.filter(x=>x.subjectId===id);renderPathCards(rows,'topic');
  }else if(type==='topic'){
    learningPathTitle.textContent=t?.name||'Topic';learningPathSubtitle.textContent='Choose a lesson';
    const rows=publishedLessons().filter(x=>x.topicId===id);renderPathCards(rows,'lesson');
  }else if(type==='lesson'){
    learningPathTitle.textContent=l?.title||'Lesson';learningPathSubtitle.textContent='Lesson';
    const lessonHtml=String(l?.contentFormat||'').toLowerCase()==='html'?sanitizeRichHtml(l?.content||''):esc(l?.content||'').replace(/\n/g,'<br>'); learningPathContent.innerHTML=`<article class="lesson-view"><div class="lesson-badge">LESSON</div><div class="lesson-body">${lessonHtml}</div>${l?.pdfUrl?`<div class="lesson-file-actions"><a class="primary-btn" href="${esc(l.pdfUrl)}" target="_blank" rel="noopener">📖 View PDF</a><a class="secondary-btn" href="${esc(l.pdfUrl)}" download>⬇️ Download PDF</a></div>`:''}</article>`;
  }
  // Navigation hides every portal section when switching views. The lesson path is a separate section, so explicitly remove both hidden states before opening it.
  learningPathPanel?.classList.remove('hidden','gs-section-hidden');
  learningPathPanel?.scrollIntoView({behavior:'smooth',block:'start'});
}
window.openLearningPath=openLearningPath;
function renderPathCards(rows,type){
  if(!rows.length){learningPathContent.innerHTML=`<div class="learning-empty"><div>📚</div><h3>No ${type}s yet</h3><p class="muted">Your tutor will add content here.</p></div>`;return}
  learningPathContent.innerHTML=rows.map(x=>{const count=type==='subject'?courseData.topics.filter(t=>t.subjectId===x.id).length:type==='topic'?courseData.lessons.filter(l=>l.topicId===x.id).length:0;return `<button class="path-card" type="button" data-id="${esc(x.id)}" data-type="${esc(type)}" style="position:relative;z-index:20;pointer-events:auto;cursor:pointer;"><span>${type==='subject'?'📘':type==='topic'?'📌':'📖'}</span><div><b>${esc(x.name||x.title)}</b><small>${type==='lesson'?'Open lesson':count+' '+(type==='subject'?'topics':'lessons')}</small></div><strong>›</strong></button>`}).join('');
  learningPathContent.querySelectorAll('.path-card').forEach(b=>{b.onclick=(ev)=>{ev.preventDefault();ev.stopPropagation();openLearningPath(b.dataset.type,b.dataset.id)}});
}
function publishedLessons(){return courseData.lessons.filter(l=>String(l.status||'published').toLowerCase()==='published' || !l.status)}
function renderLearningCoursesV25(){
  if(!learningCourseGrid)return;
  let rows=courseData.courses.filter(c=>learningFilter==='all'||c.category===learningFilter);
  if(!rows.length){learningCourseGrid.innerHTML='<div class="learning-empty"><div>🎓</div><h3>No courses yet</h3><p class="muted">Your tutor will publish courses here.</p></div>';return}
  const liveLessons=publishedLessons();
  learningCourseGrid.innerHTML=rows.map(c=>{const subs=courseData.subjects.filter(s=>s.courseId===c.id),topics=subs.reduce((n,s)=>n+courseData.topics.filter(t=>t.subjectId===s.id).length,0),lessons=liveLessons.filter(l=>l.courseId===c.id).length;return `<article class="learning-course-card learning-track-card"><div class="learning-course-top"><span class="course-icon">${c.category==='JAMB'?'🎓':c.category==='WAEC'?'📘':'📚'}</span><span class="course-category ${String(c.category||'general').toLowerCase()}">${esc(c.category||'General')}</span></div><h3>${esc(c.name)}</h3><p class="muted">${subs.length} subject${subs.length===1?'':'s'} • ${topics} topics • ${lessons} lessons</p><div class="course-resource-row"><span>📘 ${subs.length} Subjects</span><span>📌 ${topics} Topics</span><span>📖 ${lessons} Lessons</span></div><div class="course-actions"><button class="primary-btn" type="button" data-course-id="${c.id}">Open Course →</button></div></article>`}).join('');
  learningCourseGrid.querySelectorAll('[data-course-id]').forEach(b=>b.addEventListener('click',()=>{learningPathPanel?.classList.remove('hidden');openLearningPath('course',b.dataset.courseId)}));
}
$('learningBackBtn')?.addEventListener('click',()=>{learningTrail.pop();const prev=learningTrail[learningTrail.length-1];if(prev)openLearningPath(prev.type,prev.id);else{learningPathPanel?.classList.add('hidden');learningTrail=[];$('learningCentrePanel')?.scrollIntoView({behavior:'smooth'})}});
// Override course rendering/loading so V25 courses are first-class while preserving V24 resources.
const _v24RenderLearningCentre=renderLearningCentre;
renderLearningCentre=function(){ if(courseData.courses.length){renderLearningCoursesV25()} else {_v24RenderLearningCentre()} };
const _v24LoadLearningCentre=loadLearningCentre;
loadLearningCentre=async function(){await _v24LoadLearningCentre();await loadCourseStructure();if(courseData.courses.length)renderLearningCoursesV25();};

// ===== V27 COURSE BUILDER WIZARD =====
const qbCourse=$('qbCourse'),qbSubject=$('qbSubject'),qbTopic=$('qbTopic');
let qbCurrentStep=1;
function qbSetMsg(id,text,ok=false){const el=$(id);if(!el)return;el.className='message '+(ok?'submission-success':'');el.textContent=text||''}
function qbToggle(id){$(id)?.classList.toggle('hidden')}
function qbSelectedCourse(){return courseData.courses.find(c=>c.id===qbCourse?.value)}
function qbSelectedSubject(){return courseData.subjects.find(s=>s.id===qbSubject?.value)}
function qbSelectedTopic(){return courseData.topics.find(t=>t.id===qbTopic?.value)}
function qbUpdateContext(){const c=qbSelectedCourse(),s=qbSelectedSubject(),t=qbSelectedTopic();if($('qbContextCourse'))$('qbContextCourse').textContent=c?.name||'—';if($('qbContextSubject'))$('qbContextSubject').textContent=s?.name||'—';if($('qbContextTopic'))$('qbContextTopic').textContent=t?.name||'—'}
function qbCanStep(step){if(step===1)return true;if(step===2)return !!qbSelectedCourse();if(step===3)return !!qbSelectedCourse()&&!!qbSelectedSubject();if(step===4)return !!qbSelectedCourse()&&!!qbSelectedSubject()&&!!qbSelectedTopic();return false}
function qbSummary(step){const c=qbSelectedCourse(),s=qbSelectedSubject(),t=qbSelectedTopic();if(step===1)return c?`<b>${esc(c.name)}</b><small>${esc(c.category||'General')} course</small>`:'';if(step===2)return s?`<b>${esc(s.name)}</b><small>Subject in ${esc(c?.name||'Course')}</small>`:'';if(step===3)return t?`<b>${esc(t.name)}</b><small>Topic in ${esc(s?.name||'Subject')}</small>`:'';return ''}
function qbRefreshSummaries(){
  [['qbCourseSummary',1,'qbEditCourse'],['qbSubjectSummary',2,'qbEditSubject'],['qbTopicSummary',3,'qbEditTopic']].forEach(([sid,step,eid])=>{const el=$(sid),edit=$(eid),txt=qbSummary(step);if(el){el.innerHTML=txt;el.classList.toggle('hidden',!txt)}if(edit)edit.classList.toggle('hidden',!txt)});
  qbUpdateContext();
}
function qbSetStep(step,force=false){
  if(!force&&!qbCanStep(step))return;
  qbCurrentStep=step;
  document.querySelectorAll('#courseAdminPanel .builder-step-card').forEach(card=>{const n=Number(card.dataset.builderStep);card.classList.toggle('active',n===step);card.classList.toggle('locked',n>step&&!qbCanStep(n));card.classList.toggle('collapsed',n<step&&qbCanStep(n));});
  document.querySelectorAll('#courseAdminPanel [data-qb-step]').forEach(btn=>{const n=Number(btn.dataset.qbStep);btn.classList.toggle('active',n===step);btn.classList.toggle('done',n<step&&qbCanStep(n));btn.classList.toggle('locked',n>step&&!qbCanStep(n));btn.disabled=n>step&&!qbCanStep(n)});
  qbRefreshSummaries();
  const card=$('qbStep'+step);if(card)card.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function refreshQuickBuilder(){
  if(!qbCourse)return;
  qbCourse.innerHTML=courseData.courses.length?courseData.courses.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} — ${esc(c.category||'General')}</option>`).join(''):'<option value="">No courses yet — create one</option>';
  refreshQBSubjects();qbSetStep(Math.min(qbCurrentStep,1),true);
}
function refreshQBSubjects(){
  if(!qbSubject)return;
  const cid=qbCourse?.value,rows=courseData.subjects.filter(s=>s.courseId===cid);
  qbSubject.innerHTML=rows.length?rows.map(s=>`<option value="${esc(s.id)}">${esc(s.name)}</option>`).join(''):'<option value="">No subjects yet — create one</option>';
  refreshQBTopics();qbRefreshSummaries();
}
function refreshQBTopics(){
  if(!qbTopic)return;
  const sid=qbSubject?.value,rows=courseData.topics.filter(t=>t.subjectId===sid);
  qbTopic.innerHTML=rows.length?rows.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join(''):'<option value="">No topics yet — create one</option>';
  qbRefreshSummaries();
}
function renderCourseAdminListV27(){
  const box=$('courseAdminList');if(!box)return;
  if(!courseData.courses.length){box.innerHTML='<div class="learning-empty"><div>🎓</div><h3>No courses yet</h3><p class="muted">Start with a course above.</p></div>';return;}
  box.innerHTML=courseData.courses.map(c=>{
    const subs=courseData.subjects.filter(s=>s.courseId===c.id);
    return `<div class="admin-course-block"><div class="admin-course-title"><b>🎓 ${esc(c.name)}</b><span>${esc(c.category||'General')}</span></div>${subs.length?subs.map(s=>{
      const tops=courseData.topics.filter(t=>t.subjectId===s.id);
      return `<div class="admin-subject-block"><div class="admin-course-title"><b>📘 ${esc(s.name)}</b><span>${tops.length} topic${tops.length===1?'':'s'}</span></div>${tops.length?tops.map(t=>{const ls=courseData.lessons.filter(l=>l.topicId===t.id);return `<div class="admin-topic-block"><div class="admin-course-title"><b>📌 ${esc(t.name)}</b><span>${ls.length} lesson${ls.length===1?'':'s'}</span></div>${ls.length?ls.map(l=>`<div class="lesson-row"><div><b>📖 ${esc(l.title||'Untitled Lesson')}</b>${String(l.status||'published').toLowerCase()==='draft'?'<span class="draft-badge">DRAFT</span>':'<span class="published-badge">PUBLISHED</span>'}${l.pdfUrl?'<small> • PDF attached</small>':''}</div><div class="lesson-row-actions"><button type="button" class="secondary-btn admin-delete-mini" data-del-type="lesson" data-del-id="${esc(l.id)}">Delete</button></div></div>`).join(''):'<small class="muted">No lessons yet</small>'}</div>`}).join(''):'<small class="muted">No topics yet</small>'}</div>`;
    }).join(''):'<p class="muted">No subjects yet.</p>'}</div>`;
  }).join('');
  box.querySelectorAll('[data-del-type="lesson"]').forEach(btn=>btn.addEventListener('click',()=>qbDeleteLesson(btn.dataset.delId)));
}
async function qbReload(){await loadCourseStructure();refreshQuickBuilder();renderCourseAdminListV27()}
qbCourse?.addEventListener('change',()=>{refreshQBSubjects();qbSetStep(2);});
qbSubject?.addEventListener('change',()=>{refreshQBTopics();qbSetStep(3);});
qbTopic?.addEventListener('change',()=>{qbRefreshSummaries();qbSetStep(4);});
$('qbNewCourse')?.addEventListener('click',()=>qbToggle('qbCourseNew'));
$('qbNewSubject')?.addEventListener('click',()=>qbToggle('qbSubjectNew'));
$('qbNewTopic')?.addEventListener('click',()=>qbToggle('qbTopicNew'));
$('qbContinue1')?.addEventListener('click',()=>{if(qbCanStep(2))qbSetStep(2);else qbSetMsg('qbCourseMsg','Create or select a course first.')});
$('qbContinue2')?.addEventListener('click',()=>{if(qbCanStep(3))qbSetStep(3);else qbSetMsg('qbSubjectMsg','Create or select a subject first.')});
$('qbContinue3')?.addEventListener('click',()=>{if(qbCanStep(4))qbSetStep(4);else qbSetMsg('qbTopicMsg','Create or select a topic first.')});
$('qbEditCourse')?.addEventListener('click',()=>qbSetStep(1,true));
$('qbEditSubject')?.addEventListener('click',()=>qbSetStep(2,true));
$('qbEditTopic')?.addEventListener('click',()=>qbSetStep(3,true));
document.querySelectorAll('#courseAdminPanel [data-qb-step]').forEach(btn=>btn.addEventListener('click',()=>{const n=Number(btn.dataset.qbStep);if(qbCanStep(n))qbSetStep(n,true)}));
$('qbSaveCourse')?.addEventListener('click',async()=>{
  const name=$('qbCourseName').value.trim(),category=$('qbCourseCategory').value;
  if(!name){qbSetMsg('qbCourseMsg','Enter a course name.');return}
  qbSetMsg('qbCourseMsg','Creating course...');
  try{const ref=await addDoc(collection(db,'courses'),{name,category,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});$('qbCourseName').value='';$('qbCourseNew').classList.add('hidden');await qbReload();qbCourse.value=ref.id;refreshQBSubjects();qbSetStep(2,true);qbSetMsg('qbCourseMsg','Course created successfully ✅',true)}catch(e){console.error(e);qbSetMsg('qbCourseMsg','Could not create course: '+(e.code||e.message))}
});
$('qbSaveSubject')?.addEventListener('click',async()=>{
  const courseId=qbCourse?.value,name=$('qbSubjectName').value.trim();
  if(!courseId){qbSetMsg('qbSubjectMsg','Create or select a course first.');return}
  if(!name){qbSetMsg('qbSubjectMsg','Enter a subject name.');return}
  qbSetMsg('qbSubjectMsg','Creating subject...');
  try{const ref=await addDoc(collection(db,'subjects'),{name,courseId,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});$('qbSubjectName').value='';$('qbSubjectNew').classList.add('hidden');await qbReload();qbCourse.value=courseId;refreshQBSubjects();qbSubject.value=ref.id;refreshQBTopics();qbSetStep(3,true);qbSetMsg('qbSubjectMsg','Subject created successfully ✅',true)}catch(e){console.error(e);qbSetMsg('qbSubjectMsg','Could not create subject: '+(e.code||e.message))}
});
$('qbSaveTopic')?.addEventListener('click',async()=>{
  const subjectId=qbSubject?.value,name=$('qbTopicName').value.trim();
  if(!subjectId){qbSetMsg('qbTopicMsg','Create or select a subject first.');return}
  if(!name){qbSetMsg('qbTopicMsg','Enter a topic title.');return}
  qbSetMsg('qbTopicMsg','Creating topic...');
  try{const ref=await addDoc(collection(db,'topics'),{name,subjectId,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});$('qbTopicName').value='';$('qbTopicNew').classList.add('hidden');await qbReload();qbSubject.value=subjectId;refreshQBTopics();qbTopic.value=ref.id;qbRefreshSummaries();qbSetStep(4,true);qbSetMsg('qbTopicMsg','Topic created successfully ✅',true)}catch(e){console.error(e);qbSetMsg('qbTopicMsg','Could not create topic: '+(e.code||e.message))}
});

// ===== V28 RICH TEXT EDITOR =====
function qbEditorText(){
  return ($('qbLessonContent')?.innerText || $('qbLessonContent')?.textContent || '').replace(/\u00a0/g,' ').trim();
}
function sanitizeRichHtml(html){
  const template=document.createElement('template');
  template.innerHTML=String(html||'');
  const allowed=new Set(['B','STRONG','I','EM','U','H2','H3','H4','P','BR','UL','OL','LI','BLOCKQUOTE','A','CODE','PRE','SUB','SUP','DIV','SPAN','IMG','FIGURE','FIGCAPTION','IFRAME']);
  const walk=node=>{
    [...node.childNodes].forEach(child=>{
      if(child.nodeType===Node.ELEMENT_NODE){
        if(!allowed.has(child.tagName)){
          const frag=document.createDocumentFragment();
          while(child.firstChild)frag.appendChild(child.firstChild);
          child.replaceWith(frag); return;
        }
        const tag=child.tagName;
        const keep=new Set(tag==='A'?['href','target','rel']:tag==='IMG'?['src','alt','title']:tag==='IFRAME'?['src','title','allow','allowfullscreen','frameborder']:[]);
        [...child.attributes].forEach(attr=>{if(!keep.has(attr.name.toLowerCase()))child.removeAttribute(attr.name)});
        if(tag==='A'){
          const href=child.getAttribute('href')||'';
          if(!/^https?:\/\//i.test(href)){child.removeAttribute('href')}else{child.setAttribute('target','_blank');child.setAttribute('rel','noopener noreferrer')}
        }
        if(tag==='IMG'){
          const src=child.getAttribute('src')||'';
          if(!/^https?:\/\//i.test(src)){child.remove();return}
          child.setAttribute('loading','lazy');
        }
        if(tag==='IFRAME'){
          const src=child.getAttribute('src')||'';
          if(!/^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\//i.test(src)){child.remove();return}
          child.setAttribute('loading','lazy');
          child.setAttribute('allow','accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
          child.setAttribute('allowfullscreen','');
        }
        walk(child);
      }else if(child.nodeType!==Node.TEXT_NODE){child.remove()}
    });
  };
  walk(template.content);
  return template.innerHTML.trim();
}
function qbRichExec(cmd,value=null){
  $('qbLessonContent')?.focus();
  try{document.execCommand(cmd,false,value)}catch(e){console.warn('Formatting command failed',cmd,e)}
}

// Fast formatting shortcuts: admins can format while typing without returning to the toolbar.
document.getElementById('qbLessonContent')?.addEventListener('keydown',e=>{
  if(!(e.ctrlKey||e.metaKey))return;
  const k=e.key.toLowerCase();
  if(['b','i','u'].includes(k)){e.preventDefault();qbRichExec(k==='b'?'bold':k==='i'?'italic':'underline');}
});
document.querySelectorAll('#qbLessonToolbar [data-cmd]').forEach(btn=>btn.addEventListener('mousedown',e=>e.preventDefault()));
document.querySelectorAll('#qbLessonToolbar [data-cmd]').forEach(btn=>btn.addEventListener('click',()=>qbRichExec(btn.dataset.cmd)));
$('qbLessonToolbar [data-block]')?.addEventListener('change',e=>{
  const value=e.target.value;
  $('qbLessonContent')?.focus();
  qbRichExec('formatBlock',value);
  e.target.value='p';
});
$('qbLessonToolbar [data-link]')?.addEventListener('mousedown',e=>e.preventDefault());
$('qbLessonToolbar [data-link]')?.addEventListener('click',()=>{
  const url=prompt('Enter the full link (https://...)');
  if(url && /^https?:\/\//i.test(url.trim()))qbRichExec('createLink',url.trim());
});

function qbYoutubeEmbed(url){
  try{
    const u=new URL(url); let id='';
    if(u.hostname==='youtu.be') id=u.pathname.slice(1);
    if(u.hostname.includes('youtube.com')) id=u.searchParams.get('v')||u.pathname.split('/').filter(Boolean).pop();
    id=(id||'').replace(/[^a-zA-Z0-9_-]/g,'');
    return id?`https://www.youtube-nocookie.com/embed/${id}`:'';
  }catch(e){return ''}
}
function qbInsertHtml(html){const editor=$('qbLessonContent');if(!editor)return;editor.focus();document.execCommand('insertHTML',false,html);}
function qbInsertImage(){
  const url=prompt('Paste the image URL (https://...)');
  if(!url||!/^https?:\/\//i.test(url.trim()))return;
  const alt=prompt('Image description (optional)')||'Lesson image';
  qbInsertHtml(`<figure class="lesson-media image-media"><img src="${esc(url.trim())}" alt="${esc(alt)}"><figcaption>${esc(alt)}</figcaption></figure><p><br></p>`);
}
function qbInsertVideo(){
  const url=prompt('Paste a YouTube video link (https://youtube.com/... or https://youtu.be/...)');
  const embed=qbYoutubeEmbed((url||'').trim());
  if(!embed){if(url)alert('Please enter a valid YouTube link.');return}
  qbInsertHtml(`<div class="lesson-media video-media"><iframe src="${embed}" title="Lesson video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><p><br></p>`);
}
$('qbInsertImage')?.addEventListener('click',qbInsertImage);
$('qbInsertVideo')?.addEventListener('click',qbInsertVideo);

async function qbSaveLesson(status){
  const topicId=qbTopic?.value,title=$('qbLessonTitle').value.trim(),rawHtml=$('qbLessonContent')?.innerHTML||'',content=sanitizeRichHtml(rawHtml),file=$('qbLessonFile')?.files?.[0];
  if(!topicId){qbSetMsg('qbLessonMsg','Create or select a topic first.');return}
  if(!title||!qbEditorText()){qbSetMsg('qbLessonMsg','Enter both a lesson title and lesson content.');return}
  if(file && (file.type!=='application/pdf' && !/\.pdf$/i.test(file.name))){qbSetMsg('qbLessonMsg','Only PDF files are allowed.');return}
  if(file && file.size>50*1024*1024){qbSetMsg('qbLessonMsg','PDF must be 50 MB or smaller.');return}
  const topic=courseData.topics.find(t=>t.id===topicId),subject=courseData.subjects.find(s=>s.id===topic?.subjectId),course=courseData.courses.find(c=>c.id===subject?.courseId);
  const btn=status==='draft'?$('qbSaveDraft'):$('qbPublishLesson');btn.disabled=true;qbSetMsg('qbLessonMsg',file&&status==='published'?'Uploading PDF and publishing lesson...':status==='draft'?'Saving draft...':'Publishing lesson...');
  let uploadedPath='';
  try{
    let pdfUrl='';
    if(file){const safeName=file.name.replace(/[^a-zA-Z0-9._-]+/g,'_');uploadedPath='materials/lessons/'+auth.currentUser.uid+'/'+Date.now()+'_'+safeName;const {error}=await supabase.storage.from(SUPABASE_BUCKET).upload(uploadedPath,file,{contentType:'application/pdf',upsert:false,cacheControl:'3600'});if(error)throw error;const {data}=supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(uploadedPath);pdfUrl=data.publicUrl}
    await addDoc(collection(db,'lessons'),{title,content,pdfUrl,storagePath:uploadedPath||'',storageProvider:uploadedPath?'supabase':'',topicId,subjectId:subject?.id||'',courseId:course?.id||'',category:course?.category||'General',status,contentFormat:'html',createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});
    $('qbLessonTitle').value='';$('qbLessonContent').innerHTML='';if($('qbLessonFile'))$('qbLessonFile').value='';await qbReload();qbSetMsg('qbLessonMsg',status==='draft'?'Draft saved successfully ✅':'Lesson published successfully ✅',true);
  }catch(e){console.error(e);if(uploadedPath){try{await supabase.storage.from(SUPABASE_BUCKET).remove([uploadedPath])}catch(cleanErr){console.warn(cleanErr)}}qbSetMsg('qbLessonMsg','Could not '+(status==='draft'?'save draft':'publish lesson')+': '+(e.code||e.message))}finally{btn.disabled=false}
}
$('qbSaveDraft')?.addEventListener('click',()=>qbSaveLesson('draft'));
$('qbPublishLesson')?.addEventListener('click',()=>qbSaveLesson('published'));
async function qbDeleteLesson(id){
  const lesson=courseData.lessons.find(l=>l.id===id);if(!lesson)return;
  if(!confirm('Delete this lesson? This cannot be undone.'))return;
  try{if(lesson.storagePath)await supabase.storage.from(SUPABASE_BUCKET).remove([lesson.storagePath]);await deleteDoc(doc(db,'lessons',id));await qbReload();await loadLearningCentre();alert('Lesson deleted successfully.')}catch(e){console.error(e);alert('Could not delete lesson: '+(e.code||e.message))}
}
$('qbRefresh')?.addEventListener('click',qbReload);
const _v25RenderCourseAdminList=renderCourseAdminList;renderCourseAdminList=function(){renderCourseAdminListV27()};
const _v25LoadCourseStructure=loadCourseStructure;loadCourseStructure=async function(){await _v25LoadCourseStructure();refreshQuickBuilder();renderCourseAdminListV27()};
qbSetStep(1,true);




/* ===== V37 STUDENT LESSON VIEWER + LOCAL LEARNING PROGRESS =====
   This layer is intentionally self-contained: it does not alter Firebase
   data or existing admin/course-builder behavior. Progress is stored locally
   per signed-in user so no Firestore rule change is required. */
(function(){
  const GS_PROGRESS_PREFIX='gs_learning_progress_v1_';
  function gsProgressKey(){return GS_PROGRESS_PREFIX+(auth?.currentUser?.uid||'guest')}
  function gsGetProgress(){
    try{return JSON.parse(localStorage.getItem(gsProgressKey())||'{}')}catch(e){return {}}
  }
  function gsSaveProgress(obj){try{localStorage.setItem(gsProgressKey(),JSON.stringify(obj||{}))}catch(e){}}
  function gsCompleted(id){return !!gsGetProgress()[id]}
  function gsSetCompleted(id,value){const p=gsGetProgress();if(value)p[id]={completedAt:Date.now()};else delete p[id];gsSaveProgress(p)}
  function gsPublished(){return courseData.lessons.filter(l=>String(l.status||'published').toLowerCase()==='published'||!l.status)}
  function gsCourseLessons(courseId){return gsPublished().filter(l=>l.courseId===courseId)}
  function gsPct(courseId){const all=gsCourseLessons(courseId);if(!all.length)return 0;const done=all.filter(l=>gsCompleted(l.id)).length;return Math.round(done/all.length*100)}
  function gsFindCourseForLesson(l){
    const t=courseData.topics.find(x=>x.id===l?.topicId), s=courseData.subjects.find(x=>x.id===t?.subjectId);
    return courseData.courses.find(x=>x.id===s?.courseId || x.id===l?.courseId);
  }
  function gsPreviousLesson(l){
    if(!l)return null;
    const list=gsPublished();
    const sameTopic=list.filter(x=>x.topicId===l.topicId);
    let i=sameTopic.findIndex(x=>x.id===l.id); if(i>0)return sameTopic[i-1];
    const c=gsFindCourseForLesson(l); if(!c)return null;
    const all=gsCourseLessons(c.id); i=all.findIndex(x=>x.id===l.id); return i>0?all[i-1]||null:null;
  }
  function gsNextLesson(l){
    if(!l)return null;
    const list=gsPublished();
    const sameTopic=list.filter(x=>x.topicId===l.topicId);
    let i=sameTopic.findIndex(x=>x.id===l.id); if(i>=0&&sameTopic[i+1])return sameTopic[i+1];
    const c=gsFindCourseForLesson(l); if(!c)return null;
    const all=gsCourseLessons(c.id); i=all.findIndex(x=>x.id===l.id); return i>=0?all[i+1]||null:null;
  }
  function gsCoursePosition(l){
    const c=gsFindCourseForLesson(l), all=c?gsCourseLessons(c.id):[]; const i=all.findIndex(x=>x.id===l?.id);
    return {course:c,total:all.length,index:i<0?1:i+1}
  }
  function gsRenderCourseProgress(){
    document.querySelectorAll('#learningCourseGrid [data-course-id]').forEach(btn=>{
      const card=btn.closest('.learning-course-card'); const id=btn.dataset.courseId; if(!card||!id)return;
      const pct=gsPct(id), total=gsCourseLessons(id).length, done=gsCourseLessons(id).filter(l=>gsCompleted(l.id)).length;
      let box=card.querySelector('.gs-progress-wrap');
      if(!box){box=document.createElement('div');box.className='gs-progress-wrap';btn.closest('.course-actions')?.before(box)}
      box.innerHTML=`<div class="gs-progress-top"><span>Learning progress</span><span class="gs-progress-percent">${pct}%</span></div><div class="gs-progress-track"><div class="gs-progress-fill" style="width:${pct}%"></div></div><div class="gs-progress-note">${done} of ${total} lesson${total===1?'':'s'} completed</div>`;
    });
  }
  function gsRenderPathCards(rows,type){
    if(!rows.length){learningPathContent.innerHTML=`<div class="learning-empty"><div>📚</div><h3>No ${type}s yet</h3><p class="muted">Your tutor will add content here.</p></div>`;return}
    if(type==='lesson'){
      const topic=rows.length?courseData.topics.find(t=>t.id===rows[0].topicId):null;
      const subject=courseData.subjects.find(s=>s.id===topic?.subjectId), course=courseData.courses.find(c=>c.id===subject?.courseId);
      const pct=course?gsPct(course.id):0, done=course?gsCourseLessons(course.id).filter(l=>gsCompleted(l.id)).length:0, total=course?gsCourseLessons(course.id).length:rows.length;
      learningPathContent.innerHTML=`<div class="gs-path-header"><span class="badge">LESSON CENTRE</span><span class="gs-path-count">${done}/${total} completed • ${pct}%</span></div><div class="gs-progress-wrap"><div class="gs-progress-top"><span>${esc(course?.name||'Your course')}</span><span class="gs-progress-percent">${pct}%</span></div><div class="gs-progress-track"><div class="gs-progress-fill" style="width:${pct}%"></div></div></div>`+
        rows.map((x,i)=>`<button class="path-card" type="button" data-id="${esc(x.id)}" data-type="lesson" style="position:relative;z-index:20;pointer-events:auto;cursor:pointer;"><span>${gsCompleted(x.id)?'✅':'📖'}</span><div><b>${esc(x.title||'Untitled Lesson')}</b><small>${gsCompleted(x.id)?'Completed':'Start lesson'}${i===0?' • First lesson':''}</small></div><strong>›</strong></button>`).join('');
    }else{
      learningPathContent.innerHTML=rows.map(x=>{const count=type==='subject'?courseData.topics.filter(t=>t.subjectId===x.id).length:type==='topic'?gsPublished().filter(l=>l.topicId===x.id).length:0;return `<button class="path-card" type="button" data-id="${esc(x.id)}" data-type="${esc(type)}" style="position:relative;z-index:20;pointer-events:auto;cursor:pointer;"><span>${type==='subject'?'📘':'📌'}</span><div><b>${esc(x.name||x.title)}</b><small>${count} ${type==='subject'?'topics':'lessons'}</small></div><strong>›</strong></button>`}).join('');
    }
    learningPathContent.querySelectorAll('.path-card').forEach(b=>b.onclick=(ev)=>{ev.preventDefault();ev.stopPropagation();openLearningPath(b.dataset.type,b.dataset.id)});
  }
  function gsOpenLearningPath(type,id){
    learningTrail.push({type,id});
    const c=courseData.courses.find(x=>x.id===id), s=courseData.subjects.find(x=>x.id===id), t=courseData.topics.find(x=>x.id===id), l=courseData.lessons.find(x=>x.id===id);
    if(type==='course'){
      learningPathTitle.textContent=c?.name||'Course';learningPathSubtitle.textContent='Choose a subject';gsRenderPathCards(courseData.subjects.filter(x=>x.courseId===id),'subject');
    }else if(type==='subject'){
      learningPathTitle.textContent=s?.name||'Subject';learningPathSubtitle.textContent='Choose a topic';gsRenderPathCards(courseData.topics.filter(x=>x.subjectId===id),'topic');
    }else if(type==='topic'){
      learningPathTitle.textContent=t?.name||'Topic';learningPathSubtitle.textContent='Choose a lesson';gsRenderPathCards(gsPublished().filter(x=>x.topicId===id),'lesson');
    }else if(type==='lesson'){
      const pos=gsCoursePosition(l), pct=pos.course?gsPct(pos.course.id):0, done=gsCompleted(l?.id), prev=gsPreviousLesson(l), next=gsNextLesson(l);
      try{localStorage.setItem('gs_last_lesson_'+(auth?.currentUser?.uid||'guest'),JSON.stringify({lessonId:l?.id,courseId:pos.course?.id||null,updatedAt:Date.now()}))}catch(e){}
      const lessonHtml=String(l?.contentFormat||'').toLowerCase()==='html'?sanitizeRichHtml(l?.content||''):esc(l?.content||'').replace(/\n/g,'<br>');
      learningPathTitle.textContent=l?.title||'Lesson';learningPathSubtitle.textContent=pos.course?.name||'Lesson';
      learningPathContent.innerHTML=`<article class="lesson-view"><div class="gs-lesson-hero"><div class="lesson-badge">LESSON ${pos.index} OF ${pos.total||1}</div><h2 style="margin:0;color:#fff">${esc(l?.title||'Lesson')}</h2><div class="gs-lesson-meta"><span>📚 ${esc(pos.course?.name||'Learning')}</span><span>${done?'✅ Completed':'▶ In progress'}</span></div></div><div class="gs-lesson-progress"><div class="gs-progress-top"><span>Course progress</span><span class="gs-progress-percent">${pct}%</span></div><div class="gs-progress-track"><div class="gs-progress-fill" style="width:${pct}%"></div></div></div><div class="lesson-body">${lessonHtml}</div>${l?.pdfUrl?`<div class="lesson-file-actions"><a class="primary-btn" href="${esc(l.pdfUrl)}" target="_blank" rel="noopener">📖 View PDF</a><a class="secondary-btn" href="${esc(l.pdfUrl)}" download>⬇️ Download PDF</a></div>`:''}<div class="gs-lesson-actions"><button type="button" class="secondary-btn gs-topic-back" id="gsBackTopic">← Back to Topic</button>${prev?`<button type="button" class="secondary-btn gs-prev-btn" id="gsPrevLesson">← Previous Lesson</button>`:''}<button type="button" class="primary-btn gs-complete-btn ${done?'completed':''}" id="gsCompleteLesson">${done?'✓ Completed':'✓ Mark as Completed'}</button>${next?`<button type="button" class="secondary-btn gs-next-btn" id="gsNextLesson">Next Lesson →</button>`:''}<div class="gs-lesson-footnote">Mark this lesson complete to update your learning progress. Your progress is saved for this account on this device.</div></div></article>`;
      $('gsCompleteLesson')?.addEventListener('click',()=>{gsSetCompleted(l.id,!gsCompleted(l.id));gsOpenLearningPath('lesson',l.id);learningTrail.pop();if(window.gsRefreshLearningProgress)window.gsRefreshLearningProgress()});
      $('gsBackTopic')?.addEventListener('click',()=>{if(l?.topicId)gsOpenLearningPath('topic',l.topicId)});
      $('gsPrevLesson')?.addEventListener('click',()=>{if(prev)gsOpenLearningPath('lesson',prev.id)});
      $('gsNextLesson')?.addEventListener('click',()=>{if(next)gsOpenLearningPath('lesson',next.id)});
    }
    learningPathPanel?.classList.remove('hidden','gs-section-hidden');learningPathPanel?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function gsRefreshLearningProgress(){gsRenderCourseProgress()}
  window.gsRefreshLearningProgress=gsRefreshLearningProgress;
  // Override only the learning viewer functions. Admin builder and Firebase writes remain untouched.
  window.openLearningPath=gsOpenLearningPath;
  openLearningPath=gsOpenLearningPath;
  window.renderPathCards=gsRenderPathCards;
  renderPathCards=gsRenderPathCards;
  const oldRender=renderLearningCoursesV25;
  renderLearningCoursesV25=function(){oldRender();gsRenderCourseProgress()};
  // Refresh after the existing async course loader finishes.
  const oldLoad=loadCourseStructure;
  loadCourseStructure=async function(){await oldLoad();gsRenderCourseProgress()};
  // Keep progress visible after normal Learning Centre refreshes.
  const oldCentre=loadLearningCentre;
  loadLearningCentre=async function(){await oldCentre();gsRenderCourseProgress()};
  window.addEventListener('storage',gsRefreshLearningProgress);
})();

/* ===== STUDENT LEARNING PROGRESS DASHBOARD ===== */
(function(){
  function renderStudentProgressDashboard(){
    const panel=document.getElementById('gsStudentProgressPanel');
    const grid=document.getElementById('gsStudentProgressGrid');
    if(!panel||!grid)return;
    const role=String(window.currentUserRole||currentStudentProfile?.role||'').toLowerCase();
    panel.style.display=role==='student'?'block':'none';
    if(role!=='student')return;

    const courses=courseData.courses||[];
    const published=(courseData.lessons||[]).filter(l=>String(l.status||'published').toLowerCase()==='published'||!l.status);
    const store=(()=>{try{return JSON.parse(localStorage.getItem('gs_learning_progress_v1_'+(auth?.currentUser?.uid||'guest'))||'{}')}catch(e){return {}}})();
    const courseLessons=c=>published.filter(l=>l.courseId===c.id);
    const coursePct=c=>{const ls=courseLessons(c);return ls.length?Math.round(ls.filter(l=>store[l.id]).length/ls.length*100):0};
    const allTotal=published.length, allDone=published.filter(l=>store[l.id]).length;
    const overall=allTotal?Math.round(allDone/allTotal*100):0;

    // Find the most recently opened lesson, then fall back to the first incomplete lesson.
    let last=null;
    try{last=JSON.parse(localStorage.getItem('gs_last_lesson_'+(auth?.currentUser?.uid||'guest'))||'null')}catch(e){}
    const lastLesson=last?.lessonId?published.find(l=>l.id===last.lessonId):null;
    const fallbackLesson=published.find(l=>!store[l.id])||published[0]||null;
    const continueLesson=lastLesson||fallbackLesson;
    const continueCourse=continueLesson?gsFindCourseForLesson(continueLesson):null;

    if(!courses.length){
      grid.innerHTML='<div class="gs-student-progress-card"><h3>No courses available yet</h3><p class="muted">Your tutor will publish courses here.</p></div>';
      return;
    }

    const overallCard=`<div class="gs-progress-overview">
      <div class="gs-progress-overview-main"><span class="gs-progress-kicker">OVERALL LEARNING</span><strong>${overall}%</strong><span>${allDone} of ${allTotal} published lesson${allTotal===1?'':'s'} completed</span></div>
      <div class="gs-progress-overview-track"><div style="width:${overall}%"></div></div>
      <div class="gs-progress-continue">
        ${continueLesson?`<div><small>CONTINUE WHERE YOU STOPPED</small><b>${esc(continueLesson.title||'Continue lesson')}</b><span>${esc(continueCourse?.name||'Learning Centre')}</span></div><button type="button" class="primary-btn gs-continue-last" data-lesson-id="${esc(continueLesson.id)}">Continue →</button>`:`<div><b>No lesson available yet.</b><span>Your tutor will publish learning content here.</span></div>`}
      </div>
    </div>`;

    const courseCards=courses.map(c=>{
      const ls=courseLessons(c), done=ls.filter(l=>store[l.id]).length, pct=coursePct(c);
      const subjectMap={};
      ls.forEach(l=>{const t=courseData.topics.find(x=>x.id===l.topicId),sub=courseData.subjects.find(x=>x.id===t?.subjectId);if(sub){(subjectMap[sub.id]??={name:sub.name||'Subject',total:0,done:0});subjectMap[sub.id].total++;if(store[l.id])subjectMap[sub.id].done++}});
      const subjects=Object.values(subjectMap).slice(0,4).map(x=>{const sp=x.total?Math.round(x.done/x.total*100):0;return `<div class="gs-subject-progress"><div><span>${esc(x.name)}</span><b>${sp}%</b></div><div class="gs-mini-track"><i style="width:${sp}%"></i></div><small>${x.done}/${x.total} lessons</small></div>`}).join('');
      return `<article class="gs-student-progress-card"><div class="gs-course-progress-title"><div><h3>${esc(c.name||'Course')}</h3><small>${esc(c.category||'General')}</small></div><b>${pct}%</b></div><div class="gs-student-progress-track"><div class="gs-student-progress-fill" style="width:${pct}%"></div></div><div class="gs-student-progress-meta" style="margin-top:7px"><span>${done} of ${ls.length} lessons completed</span></div>${subjects?`<div class="gs-subject-progress-list">${subjects}</div>`:''}<button class="secondary-btn gs-progress-open" type="button" data-course-id="${esc(c.id)}">Open Course →</button></article>`;
    }).join('');

    grid.innerHTML=overallCard+`<div class="gs-progress-course-grid">${courseCards}</div>`;
    grid.querySelectorAll('.gs-progress-open').forEach(b=>b.addEventListener('click',()=>{if(window.gsShowSection)window.gsShowSection('learningCentrePanel');setTimeout(()=>window.openLearningPath?.('course',b.dataset.courseId),80)}));
    grid.querySelector('.gs-continue-last')?.addEventListener('click',()=>{
      const id=grid.querySelector('.gs-continue-last')?.dataset.lessonId;
      const lesson=id?published.find(l=>l.id===id):null;
      if(lesson){if(window.gsShowSection)window.gsShowSection('learningCentrePanel');setTimeout(()=>window.openLearningPath?.('lesson',lesson.id),80)}
    });
  }
  window.gsRenderStudentProgressDashboard=renderStudentProgressDashboard;
  document.getElementById('gsContinueLearningBtn')?.addEventListener('click',()=>window.gsShowSection?.('learningCentrePanel'));
  const old=window.gsRefreshLearningProgress;
  window.gsRefreshLearningProgress=function(){old?.();renderStudentProgressDashboard()};
  setTimeout(renderStudentProgressDashboard,300);
  setInterval(renderStudentProgressDashboard,2000);
})();


/* ===== V34 STUDENT ACHIEVEMENTS ===== */
(function(){
  const panel=document.getElementById('gsAchievementsPanel');
  if(!panel)return;
  function progressStore(){try{return JSON.parse(localStorage.getItem('gs_learning_progress_v1_'+(auth?.currentUser?.uid||'guest'))||'{}')}catch(e){return {}}}
  function publishedLessons(){return (courseData.lessons||[]).filter(l=>String(l.status||'published').toLowerCase()==='published'||!l.status)}
  function lessonDone(v){return !!v}
  function completionDates(store){return Object.values(store).map(v=>v&&typeof v==='object'&&v.completedAt?new Date(v.completedAt):null).filter(Boolean)}
  function streak(store){
    const dates=completionDates(store).map(d=>{const x=new Date(d);x.setHours(0,0,0,0);return x.getTime()});
    const unique=[...new Set(dates)].sort((a,b)=>b-a); if(!unique.length)return 0;
    const today=new Date();today.setHours(0,0,0,0);const t=today.getTime();
    if(unique[0]!==t && unique[0]!==t-86400000)return 0;
    let count=1; for(let i=1;i<unique.length;i++){if(unique[i]===unique[i-1]-86400000)count++;else break} return count;
  }
  async function getStudentStats(){
    const uid=auth?.currentUser?.uid; if(!uid)return {assignments:0,tests:0,average:0};
    let assignments=0,tests=0,average=0;
    try{const sub=await getDocs(query(collection(db,'submissions'),where('studentId','==',uid)));assignments=sub.size}catch(e){console.warn('achievement submissions',e)}
    try{const rs=await getDocs(query(collection(db,'results'),where('studentId','==',uid)));let scores=[];rs.forEach(d=>{const r=d.data()||{};if(String(r.resultType||'').toLowerCase()==='cbt'){tests++;let n=Number(r.percentage);if(!Number.isFinite(n))n=Number(r.score);if(Number.isFinite(n)){if(n<=1)n*=100;scores.push(n)}}});average=scores.length?Math.round(scores.reduce((a,b)=>a+b,0)/scores.length):0}catch(e){console.warn('achievement results',e)}
    return {assignments,tests,average};
  }
  function badge(icon,title,desc,unlocked){return `<div class="gs-achievement-badge ${unlocked?'':'locked'}"><div class="icon">${icon}</div><b>${title}</b><small>${unlocked?desc:'Locked • '+desc}</small></div>`}
  window.gsOpenAchievements=function(){
    try{
      const dashboard=document.getElementById('dashboardView');
      document.querySelectorAll('.portal-section').forEach(el=>{if(el.id!=='gsAchievementsPanel')el.classList.add('gs-section-hidden');});
      if(dashboard){dashboard.style.display='none';dashboard.classList.add('hidden');}
      panel.style.display='block';
      panel.classList.remove('gs-section-hidden','hidden');
      panel.setAttribute('aria-hidden','false');
      panel.scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(()=>window.gsRenderAchievements?.(),40);
    }catch(e){console.error('open achievements',e);}
  };

  async function render(){
    const role=String(window.currentUserRole||currentStudentProfile?.role||'').toLowerCase();
    panel.style.display=role==='student'?'block':'none'; if(role!=='student')return;
    const store=progressStore(), lessons=publishedLessons(), doneLessons=lessons.filter(l=>lessonDone(store[l.id])).length;
    const courses=(courseData.courses||[]).filter(c=>lessons.some(l=>l.courseId===c.id));
    const completedCourses=courses.filter(c=>{const ls=lessons.filter(l=>l.courseId===c.id);return ls.length&&ls.every(l=>lessonDone(store[l.id]))}).length;
    const stats=await getStudentStats(), st=streak(store);
    document.getElementById('gsAchLessons').textContent=doneLessons;document.getElementById('gsAchCourses').textContent=completedCourses;document.getElementById('gsAchAssignments').textContent=stats.assignments;document.getElementById('gsAchTests').textContent=stats.tests;document.getElementById('gsAchAverage').textContent=stats.average+'%';document.getElementById('gsAchStreak').textContent=st+' 🔥';
    const milestones=[['📖','Lesson Explorer',doneLessons,5,'Complete 5 lessons'],['📚','Course Finisher',completedCourses,1,'Complete 1 full course'],['📝','Assignment Ready',stats.assignments,5,'Submit 5 assignments'],['🧠','CBT Challenger',stats.tests,5,'Take 5 CBTs'],['🎯','High Scorer',stats.average,70,'Reach a 70%+ average CBT score'],['🔥','Consistency',st,7,'Learn on 7 consecutive days']];
    document.getElementById('gsAchievementMilestones').innerHTML=milestones.map(m=>{const pct=Math.min(100,Math.round((Number(m[2])||0)/m[3]*100));return `<article class="gs-achievement-card"><h3>${m[0]} ${m[1]}</h3><p>${m[4]} • <b>${m[2]}/${m[3]}</b></p><div class="gs-achievement-progress"><i style="width:${pct}%"></i></div></article>`}).join('');
    document.getElementById('gsAchievementBadges').innerHTML=[
      badge('📖','First Lesson','Complete your first lesson',doneLessons>=1),badge('📚','Course Starter','Complete your first course',completedCourses>=1),badge('📝','Assignment Pro','Submit 5 assignments',stats.assignments>=5),badge('🧠','Test Taker','Take 5 CBTs',stats.tests>=5),badge('🎯','Smart Performer','Reach 70%+ average',stats.average>=70),badge('🔥','7-Day Streak','Learn 7 days in a row',st>=7)
    ].join('');
  }
  window.gsRenderAchievements=render;
  const oldShow=window.gsShowSection;
  window.gsShowSection=function(id){if(id==='gsAchievementsPanel'){window.gsOpenAchievements();return}oldShow?.(id)};
  setTimeout(render,700);
  setInterval(()=>{if(String(window.currentUserRole||'').toLowerCase()==='student'&&panel.style.display!=='none')render()},15000);
})();

setInterval(()=>{if(String(window.currentUserRole||'').toLowerCase()==='student')loadStudentNotifications()},30000);
