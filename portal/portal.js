import{auth,db}from"./firebase.js";
import{signInWithEmailAndPassword,onAuthStateChanged,signOut}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import{doc,getDoc,collection,getDocs}from"https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const loginView=document.getElementById("loginView"),dashboardView=document.getElementById("dashboardView"),form=document.getElementById("loginForm"),msg=document.getElementById("loginMessage"),logout=document.getElementById("logoutBtn");
form.addEventListener("submit",async e=>{e.preventDefault();msg.textContent="Logging in...";try{await signInWithEmailAndPassword(auth,email.value.trim(),password.value)}catch(e){msg.textContent="Login failed. Check your email and password."}});
logout.onclick=()=>signOut(auth);
async function count(n){try{return(await getDocs(collection(db,n))).size}catch(e){return 0}}
onAuthStateChanged(auth,async user=>{if(!user){loginView.classList.remove("hidden");dashboardView.classList.add("hidden");logout.classList.add("hidden");return}
loginView.classList.add("hidden");dashboardView.classList.remove("hidden");logout.classList.remove("hidden");
const s=await getDoc(doc(db,"users",user.uid)),p=s.exists()?s.data():{},role=p.role||"student";
document.getElementById("welcomeTitle").textContent="Welcome, "+(p.name||user.email);document.getElementById("roleText").textContent="Signed in as "+role;document.getElementById("statusText").textContent='Account connected successfully. Your role is "'+role+'".';
document.getElementById("notesCount").textContent=await count("notes");document.getElementById("assignmentsCount").textContent=await count("assignments");document.getElementById("testsCount").textContent=await count("tests");document.getElementById("resultsCount").textContent=await count("results")});