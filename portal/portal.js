import {auth,db} from "./firebase.js"; import {initializeApp,getApps} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js"; import {getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut,createUserWithEmailAndPassword} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js"; import {doc,getDoc,collection,getDocs,addDoc,updateDoc,deleteDoc,serverTimestamp,query,orderBy,where} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const $=id=>document.getElementById(id),loginView=$("loginView"),dashboardView=$("dashboardView"),logoutBtn=$("logoutBtn"),adminPanel=$("adminPanel"),noteForm=$("noteForm"),notesList=$("notesList");
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginMessage").textContent="Logging in...";try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(err){console.error(err);$("loginMessage").textContent="Login failed: "+(err.code||err.message)}}); logoutBtn.addEventListener("click",()=>signOut(auth));
async function getCount(n){try{return(await getDocs(collection(db,n))).size}catch(e){console.error(e);return 0}}
async function loadNotes(){notesList.innerHTML='<p class="muted">Loading notes...</p>';try{let s;try{s=await getDocs(query(collection(db,"notes"),orderBy("createdAt","desc")))}catch(e){s=await getDocs(collection(db,"notes"))}if(s.empty){notesList.innerHTML='<p class="muted">No notes published yet.</p>';return}notesList.innerHTML="";s.forEach(d=>{let n=d.data(),c=document.createElement("article");c.className="note-card";let h=document.createElement("h3");h.textContent=n.title||"Untitled Note";let sub=document.createElement("p");sub.className="subject";sub.textContent=n.subject||"General";let body=document.createElement("div");body.className="note-content";body.textContent=n.content||"";c.append(h,sub,body);notesList.appendChild(c)})}catch(e){console.error(e);notesList.innerHTML='<p class="message">Could not load notes.</p>'}}
noteForm.addEventListener("submit",async e=>{e.preventDefault();$("noteMessage").textContent="Publishing...";try{await addDoc(collection(db,"notes"),{title:$("noteTitle").value.trim(),subject:$("noteSubject").value.trim(),content:$("noteContent").value.trim(),createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});noteForm.reset();$("noteMessage").textContent="Note published successfully ✅";$("notesCount").textContent=await getCount("notes");await loadNotes();await loadAssignments();await loadTests();if(allowed){await loadSubmissions();await loadCbtResultsIfNeeded();await loadAdminResultsIfNeeded();await loadStudents();try{$("studentsCount").textContent=(await getDocs(query(collection(db,"users"),where("role","==","student")))).size}catch(e){$("studentsCount").textContent="0"}}else{studentAdminPanel.style.display="none"}await loadStudentResultsIfNeeded()}catch(e){console.error(e);$("noteMessage").textContent="Could not publish note: "+(e.code||e.message)}});

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
        del.addEventListener("click",async()=>{if(!confirm("Delete this assignment and its student submissions/results? This cannot be undone."))return;del.disabled=true;try{const subs=await getDocs(query(collection(db,"submissions"),where("assignmentId","==",d.id)));for(const sd of subs.docs)await deleteDoc(doc(db,"submissions",sd.id));const results=await getDocs(query(collection(db,"results"),where("assignmentId","==",d.id)));for(const rd of results.docs)await deleteDoc(doc(db,"results",rd.id));await deleteDoc(doc(db,"assignments",d.id));await loadAssignments();$("assignmentsCount").textContent=await getCount("assignments");await loadAdminResultsIfNeeded();$("resultsCount").textContent=await getCount("results") }catch(e){console.error(e);alert("Could not delete assignment: "+(e.code||e.message));del.disabled=false}});
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
function setAdminPanelsVisible(show){["adminPanel","assignmentAdminPanel","testAdminPanel","submissionsAdminPanel","testResultsAdminPanel"].forEach(id=>{const el=$(id);if(el)el.style.display=show?"block":"none";});}
setAdminPanelsVisible(false);
let questionCount=0,currentTest=null,currentQuestionIndex=0,testAnswers=[],testTimerInterval=null,testSecondsLeft=0;
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
  <label>Correct Answer</label><select class="q-answer" required><option value="">Select correct option</option><option>A</option><option>B</option><option>C</option><option>D</option></select>`;
  wrap.querySelector('.remove-question').addEventListener('click',()=>{wrap.remove();renumberQuestions()});
  questionBuilder.appendChild(wrap);
}
function renumberQuestions(){[...questionBuilder.children].forEach((el,i)=>{el.dataset.question=i+1;el.querySelector('strong').textContent='Question '+(i+1)})}
$('addQuestionBtn').addEventListener('click',addQuestion); addQuestion();
function collectQuestions(){return [...questionBuilder.children].map(card=>({text:card.querySelector('.q-text').value.trim(),options:Object.fromEntries([...card.querySelectorAll('.q-option')].map(x=>[x.dataset.option,x.value.trim()])),correct:card.querySelector('.q-answer').value})).filter(q=>q.text)}
testForm.addEventListener('submit',async e=>{e.preventDefault();if(!isAdminRole()){ $('testMessage').textContent='Only admins can publish CBT tests.'; return; }$('testMessage').textContent='Publishing CBT test...';try{const questions=collectQuestions();if(!questions.length)throw new Error('Add at least one question.');if(questions.some(q=>!q.text||Object.values(q.options).some(v=>!v)||!q.correct))throw new Error('Complete every question, all four options, and the correct answer.');await addDoc(collection(db,'tests'),{title:$('testTitle').value.trim(),subject:$('testSubject').value.trim(),duration:Number($('testDuration').value),questions,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});testForm.reset();questionBuilder.innerHTML='';questionCount=0;addQuestion();$('testDuration').value=30;$('testMessage').className='message submission-success';$('testMessage').textContent='CBT test published successfully ✅';$('testsCount').textContent=await getCount('tests');await loadTests()}catch(e){console.error(e);$('testMessage').className='message submission-error';$('testMessage').textContent='Could not publish test: '+(e.code||e.message)}});
async function loadTests(){testsList.innerHTML='<p class="muted">Loading tests...</p>';try{let s;try{s=await getDocs(query(collection(db,'tests'),orderBy('createdAt','desc')))}catch(e){s=await getDocs(collection(db,'tests'))}if(s.empty){testsList.innerHTML='<p class="muted">No CBT tests published yet.</p>';return}testsList.innerHTML='';s.forEach(d=>{const t=d.data(),card=document.createElement('article');card.className='note-card test-card';const h=document.createElement('h3');h.textContent=t.title||'Untitled Test';const sub=document.createElement('p');sub.className='subject';sub.textContent=(t.subject||'General')+' • '+(t.questions?.length||0)+' questions • '+(t.duration||30)+' mins';const actions=document.createElement('div');actions.className='card-actions';const btn=document.createElement('button');btn.type='button';btn.className='primary-btn open-assignment-btn';btn.textContent=(window.currentUserRole||'student')==='student'?'Start Test':'Preview Test';btn.addEventListener('click',()=>openTest(d.id,t));actions.appendChild(btn);if(isAdminRole()){const del=document.createElement('button');del.type='button';del.className='secondary-btn';del.textContent='Delete';del.addEventListener('click',async()=>{if(!confirm('Delete this CBT test and its student results? This cannot be undone.'))return;del.disabled=true;try{const results=await getDocs(query(collection(db,'results'),where('testId','==',d.id)));for(const rd of results.docs)await deleteDoc(doc(db,'results',rd.id));await deleteDoc(doc(db,'tests',d.id));await loadTests();$('testsCount').textContent=await getCount('tests');if(isAdminRole()){await loadCbtResultsIfNeeded();await loadAdminResultsIfNeeded();$('resultsCount').textContent=await getCount('results')}}catch(e){console.error(e);alert('Could not delete test: '+(e.code||e.message));del.disabled=false}});actions.appendChild(del)}card.append(h,sub,actions);testsList.appendChild(card)})}catch(e){console.error(e);testsList.innerHTML='<p class="message">Could not load tests: '+(e.code||e.message)+'</p>'}}
function closeTest(){clearInterval(testTimerInterval);testTimerInterval=null;currentTest=null;testModal.classList.add('hidden');$('testSubmitMessage').textContent=''}
$('closeTestBtn').addEventListener('click',closeTest);testModal.addEventListener('click',e=>{if(e.target===testModal)closeTest()});
function renderQuestion(){if(!currentTest)return;const qs=currentTest.questions||[];const q=qs[currentQuestionIndex];$('testProgress').textContent=`Question ${currentQuestionIndex+1} of ${qs.length}`;const area=$('testQuestionArea');area.innerHTML='';const card=document.createElement('div');card.className='cbt-question-card';const title=document.createElement('h3');title.textContent=q.text;card.appendChild(title);const opts=document.createElement('div');opts.className='cbt-options';['A','B','C','D'].forEach(letter=>{const label=document.createElement('label');label.className='cbt-option';const radio=document.createElement('input');radio.type='radio';radio.name='currentQuestion';radio.value=letter;radio.checked=testAnswers[currentQuestionIndex]===letter;radio.addEventListener('change',()=>testAnswers[currentQuestionIndex]=letter);const span=document.createElement('span');span.textContent=letter+'. '+q.options[letter];label.append(radio,span);opts.appendChild(label)});card.appendChild(opts);area.appendChild(card);$('prevQuestionBtn').disabled=currentQuestionIndex===0;$('nextQuestionBtn').classList.toggle('hidden',currentQuestionIndex===qs.length-1);$('submitTestBtn').classList.toggle('hidden',currentQuestionIndex!==qs.length-1)}
function startTimer(minutes){clearInterval(testTimerInterval);testSecondsLeft=Math.max(1,Number(minutes||30)*60);updateTimer();testTimerInterval=setInterval(()=>{testSecondsLeft--;updateTimer();if(testSecondsLeft<=0){clearInterval(testTimerInterval);$('testSubmitMessage').textContent='Time is up. Submitting your test...';submitTest(true)}},1000)}
function updateTimer(){const m=Math.floor(testSecondsLeft/60).toString().padStart(2,'0'),s=(testSecondsLeft%60).toString().padStart(2,'0');$('testTimer').textContent=m+':'+s;$('testTimer').classList.toggle('timer-warning',testSecondsLeft<=60)}
function openTest(id,t){currentTest={id,...t};currentQuestionIndex=0;testAnswers=new Array((t.questions||[]).length);$('openTestTitle').textContent=t.title||'Test';$('openTestSubject').textContent=(t.subject||'General')+' • '+(t.questions?.length||0)+' questions';$('testSubmitMessage').textContent='';$('testModal').classList.remove('hidden');const isStudent=(window.currentUserRole||'student').toLowerCase()==='student';$('prevQuestionBtn').style.display=isStudent?'block':'none';$('nextQuestionBtn').style.display=isStudent?'block':'none';$('submitTestBtn').style.display=isStudent?'block':'none';if(isStudent){renderQuestion();startTimer(t.duration||30)}else{$('testTimer').textContent=(t.duration||30)+' min';$('testProgress').textContent='Preview';$('testQuestionArea').innerHTML='';(t.questions||[]).forEach((q,i)=>{const c=document.createElement('div');c.className='cbt-question-card';const h=document.createElement('h3');h.textContent=(i+1)+'. '+q.text;c.appendChild(h);['A','B','C','D'].forEach(x=>{const p=document.createElement('p');p.textContent=x+'. '+q.options[x]+(x===q.correct?' ✓':'');c.appendChild(p)});$('testQuestionArea').appendChild(c)})}}
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
async function submitTest(autoSubmit){if(!currentTest||!auth.currentUser)return;if(String(window.currentUserRole||'student').toLowerCase()!=='student'){return;}if($('submitTestBtn').dataset.submitted==='true')return;clearInterval(testTimerInterval);$('submitTestBtn').disabled=true;$('testSubmitMessage').textContent=autoSubmit?'Submitting...':'Submitting test...';try{const qs=currentTest.questions||[];let correct=0;qs.forEach((q,i)=>{if(testAnswers[i]===q.correct)correct++});const score=qs.length?Math.round(correct/qs.length*100):0;await addDoc(collection(db,'results'),{resultType:'cbt',testId:currentTest.id,testTitle:currentTest.title||'CBT Test',subject:currentTest.subject||'General',studentId:auth.currentUser.uid,studentEmail:auth.currentUser.email||'',score,correctAnswers:correct,totalQuestions:qs.length,answers:testAnswers,corrections:qs.map((q,i)=>({text:q.text,options:q.options,correct:q.correct,yourAnswer:testAnswers[i]||'',explanation:q.explanation||''})),submittedAt:serverTimestamp(),updatedAt:serverTimestamp(),createdAt:serverTimestamp()});$('testSubmitMessage').className='message submission-success';$('testSubmitMessage').textContent=`Test submitted successfully ✅ Score: ${score}/100 (${correct}/${qs.length})`;$('submitTestBtn').textContent='Submitted';$('submitTestBtn').dataset.submitted='true';showTestCorrections();await loadStudentResultsIfNeeded();await loadCbtResultsIfNeeded();await loadAdminResultsIfNeeded();}catch(e){console.error(e);$('testSubmitMessage').className='message submission-error';$('testSubmitMessage').textContent='Could not submit test: '+(e.code||e.message)}finally{$('submitTestBtn').disabled=false}}
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
    await addDoc(collection(db,"users"),{name,email,role:"student",category,level,active:true,createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});
    await signOut(sa);
    studentForm.reset();studentMessage.className="message submission-success";studentMessage.textContent="Student account created successfully ✅";
    await loadStudents();
    const count=await getDocs(query(collection(db,"users"),where("role","==","student")));$("studentsCount").textContent=count.size;
  }catch(e){console.error(e);studentMessage.className="message submission-error";studentMessage.textContent="Could not create student: "+(e.code||e.message);}
});

onAuthStateChanged(auth,async user=>{if(!user){loginView.classList.remove("hidden");dashboardView.classList.add("hidden");logoutBtn.classList.add("hidden");return}loginView.classList.add("hidden");dashboardView.classList.remove("hidden");logoutBtn.classList.remove("hidden");try{const s=await getDoc(doc(db,"users",user.uid));if(!s.exists()){adminPanel.style.display="none";$("welcomeTitle").textContent="PROFILE NOT FOUND";return}const p=s.data(),role=String(p.role||"student").trim().toLowerCase(),allowed=role==="admin"||role==="superadmin";window.currentUserRole=role;if(p.active===false){await signOut(auth);loginView.classList.remove("hidden");dashboardView.classList.add("hidden");logoutBtn.classList.add("hidden");$("loginMessage").textContent="This student account is currently inactive. Please contact Great Stand Educational Consult.";return;}$("welcomeTitle").textContent="Welcome, "+(p.name||user.email);$("roleText").textContent="Signed in as "+role;setAdminPanelsVisible(allowed);$("statusText").textContent=role==="superadmin"?"SUPERADMIN ACCOUNT DETECTED ✅":role==="admin"?"ADMIN ACCOUNT DETECTED ✅":"Student account detected.";$("notesCount").textContent=await getCount("notes");$("assignmentsCount").textContent=await getCount("assignments");$("testsCount").textContent=await getCount("tests");$("resultsCount").textContent=await getCount("results");await loadNotes();await loadAssignments();await loadTests();if(allowed){await loadSubmissions();await loadCbtResultsIfNeeded();await loadAdminResultsIfNeeded();await loadStudents();try{$("studentsCount").textContent=(await getDocs(query(collection(db,"users"),where("role","==","student")))).size}catch(e){$("studentsCount").textContent="0"}}else{studentAdminPanel.style.display="none"}await loadStudentResultsIfNeeded()}catch(e){console.error(e);setAdminPanelsVisible(false);$("statusText").textContent="Firestore error: "+(e.code||e.message)}});
