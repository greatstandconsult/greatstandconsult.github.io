import {auth,db} from "./firebase.js"; import {signInWithEmailAndPassword,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js"; import {doc,getDoc,collection,getDocs,addDoc,serverTimestamp,query,orderBy} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const $=id=>document.getElementById(id),loginView=$("loginView"),dashboardView=$("dashboardView"),logoutBtn=$("logoutBtn"),adminPanel=$("adminPanel"),noteForm=$("noteForm"),notesList=$("notesList");
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginMessage").textContent="Logging in...";try{await signInWithEmailAndPassword(auth,$("email").value.trim(),$("password").value)}catch(err){console.error(err);$("loginMessage").textContent="Login failed: "+(err.code||err.message)}}); logoutBtn.addEventListener("click",()=>signOut(auth));
async function getCount(n){try{return(await getDocs(collection(db,n))).size}catch(e){console.error(e);return 0}}
async function loadNotes(){notesList.innerHTML='<p class="muted">Loading notes...</p>';try{let s;try{s=await getDocs(query(collection(db,"notes"),orderBy("createdAt","desc")))}catch(e){s=await getDocs(collection(db,"notes"))}if(s.empty){notesList.innerHTML='<p class="muted">No notes published yet.</p>';return}notesList.innerHTML="";s.forEach(d=>{let n=d.data(),c=document.createElement("article");c.className="note-card";let h=document.createElement("h3");h.textContent=n.title||"Untitled Note";let sub=document.createElement("p");sub.className="subject";sub.textContent=n.subject||"General";let body=document.createElement("div");body.className="note-content";body.textContent=n.content||"";c.append(h,sub,body);notesList.appendChild(c)})}catch(e){console.error(e);notesList.innerHTML='<p class="message">Could not load notes.</p>'}}
noteForm.addEventListener("submit",async e=>{e.preventDefault();$("noteMessage").textContent="Publishing...";try{await addDoc(collection(db,"notes"),{title:$("noteTitle").value.trim(),subject:$("noteSubject").value.trim(),content:$("noteContent").value.trim(),createdAt:serverTimestamp(),createdBy:auth.currentUser.uid});noteForm.reset();$("noteMessage").textContent="Note published successfully ✅";$("notesCount").textContent=await getCount("notes");await loadNotes();await loadAssignments()}catch(e){console.error(e);$("noteMessage").textContent="Could not publish note: "+(e.code||e.message)}});

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

onAuthStateChanged(auth,async user=>{if(!user){loginView.classList.remove("hidden");dashboardView.classList.add("hidden");logoutBtn.classList.add("hidden");return}loginView.classList.add("hidden");dashboardView.classList.remove("hidden");logoutBtn.classList.remove("hidden");try{const s=await getDoc(doc(db,"users",user.uid));if(!s.exists()){adminPanel.style.display="none";$("welcomeTitle").textContent="PROFILE NOT FOUND";return}const p=s.data(),role=String(p.role||"student").trim().toLowerCase(),allowed=role==="admin"||role==="superadmin";$("welcomeTitle").textContent="Welcome, "+(p.name||user.email);$("roleText").textContent="Signed in as "+role;adminPanel.style.display=allowed?"block":"none";assignmentAdminPanel.style.display=allowed?"block":"none";$("statusText").textContent=role==="superadmin"?"SUPERADMIN ACCOUNT DETECTED ✅":role==="admin"?"ADMIN ACCOUNT DETECTED ✅":"Student account detected.";$("notesCount").textContent=await getCount("notes");$("assignmentsCount").textContent=await getCount("assignments");$("testsCount").textContent=await getCount("tests");$("resultsCount").textContent=await getCount("results");await loadNotes();await loadAssignments()}catch(e){console.error(e);adminPanel.style.display="none";assignmentAdminPanel.style.display="none";$("statusText").textContent="Firestore error: "+(e.code||e.message)}});
