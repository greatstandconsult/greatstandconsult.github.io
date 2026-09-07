import {auth,db} from "./firebase.js"; import {signInWithEmailAndPassword,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js"; import {doc,getDoc,collection,getDocs,addDoc,updateDoc,serverTimestamp,query,orderBy,where} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const $=id=>document.getElementById(id),loginView=$("loginView"),dashboardView=$("dashboardView"),logoutBtn=$("logoutBtn"),adminPanel=$("adminPanel"),noteForm=$("noteForm"),notesList=$("notesList");
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginMessage").textContent="Logging in...";try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(err){console.error(err);$("loginMessage").textContent="Login failed: "+(err.code||err.message)}}); logoutBtn.addEventListener("click",()=>signOut(auth));
async function getCount(n){try{return(await getDocs(collection(db,n))).size}catch(e){console.error(e);return 0}}
async function loadNotes(){notesList.innerHTML='<p class="muted">Loading notes...</p>';try{let s;try{s=await getDocs(query(collection(db,"notes"),orderBy("createdAt","desc")))}catch(e){s=await getDocs(collection(db,"notes"))}if(s.empty){notesList.innerHTML='<p class="muted">No notes published yet.</p>';return}notesList.innerHTML="";s.forEach(d=>{let n=d.data(),c=document.createElement("article");c.className="note-card";let h=document.createElement("h3");h.textContent=n.title||"Untitled Note";let sub=document.createElement("p");sub.className="subject";sub.textContent=n.subject||"General";let body=document.createElement("div");body.className="note-content";body.textContent=n.content||"";c.append(h,sub,body);notesList.appendChild(c)})}catch(e){console.error(e);notesList.innerHTML='<p class="message">Could not load notes.</p>'}}
noteForm.addEventListener("submit",async e=>{e.preventDefault();$("noteMessage").textContent="Publishing...";try{await addDoc(collection(db,"notes"),{title:$("noteTitle").value.trim(),subject:$("noteSubject").value.trim(),content:$("noteContent").value.trim(),createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});noteForm.reset();$("noteMessage").textContent="Note published successfully ✅";$("notesCount").textContent=await getCount("notes");await loadNotes();await loadAssignments();if(allowed)await loadSubmissions();await loadStudentResultsIfNeeded()}catch(e){console.error(e);$("noteMessage").textContent="Could not publish note: "+(e.code||e.message)}});

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
    let s;
    try{s=await getDocs(q)}
    catch(e){
      // If the composite index is not ready, use the secure student-only query without ordering.
      s=await getDocs(query(collection(db,"results"),where("studentId","==",auth.currentUser.uid)));
    }
    list.innerHTML="";
    if(s.empty){list.innerHTML='<p class="muted">No results available yet.</p>';return}
    s.forEach(d=>{
      const r=d.data();
      const c=document.createElement("article");c.className="result-card";
      const h=document.createElement("h3");h.textContent=r.assignmentTitle||"Assignment Result";
      const sc=document.createElement("div");sc.className="score";sc.textContent=String(r.score??0)+"/100";
      const fb=document.createElement("div");fb.className="feedback";fb.textContent=r.feedback||"No feedback provided.";
      c.append(h,sc,fb);list.appendChild(c);
    });
  }catch(e){
    console.error(e);
    list.innerHTML='<p class="message">Could not load results: '+(e.code||e.message)+'</p>';
  }
}


assignmentForm.addEventListener("submit",async e=>{
  e.preventDefault();
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

onAuthStateChanged(auth,async user=>{if(!user){loginView.classList.remove("hidden");dashboardView.classList.add("hidden");logoutBtn.classList.add("hidden");return}loginView.classList.add("hidden");dashboardView.classList.remove("hidden");logoutBtn.classList.remove("hidden");try{const s=await getDoc(doc(db,"users",user.uid));if(!s.exists()){adminPanel.style.display="none";$("welcomeTitle").textContent="PROFILE NOT FOUND";return}const p=s.data(),role=String(p.role||"student").trim().toLowerCase(),allowed=role==="admin"||role==="superadmin";window.currentUserRole=role;window.currentUserRole=role;$("welcomeTitle").textContent="Welcome, "+(p.name||user.email);$("roleText").textContent="Signed in as "+role;adminPanel.style.display=allowed?"block":"none";assignmentAdminPanel.style.display=allowed?"block":"none";$("submissionsAdminPanel").style.display=allowed?"block":"none";$("statusText").textContent=role==="superadmin"?"SUPERADMIN ACCOUNT DETECTED ✅":role==="admin"?"ADMIN ACCOUNT DETECTED ✅":"Student account detected.";$("notesCount").textContent=await getCount("notes");$("assignmentsCount").textContent=await getCount("assignments");$("testsCount").textContent=await getCount("tests");$("resultsCount").textContent=await getCount("results");await loadNotes();await loadAssignments();if(allowed)await loadSubmissions();await loadStudentResultsIfNeeded()}catch(e){console.error(e);adminPanel.style.display="none";assignmentAdminPanel.style.display="none";$("submissionsAdminPanel").style.display="none";$("statusText").textContent="Firestore error: "+(e.code||e.message)}});
