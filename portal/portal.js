import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const loginView=document.getElementById("loginView"), dashboardView=document.getElementById("dashboardView"), form=document.getElementById("loginForm"), msg=document.getElementById("loginMessage"), logout=document.getElementById("logoutBtn");

form.addEventListener("submit",async e=>{e.preventDefault();msg.textContent="Logging in...";try{await signInWithEmailAndPassword(auth,document.getElementById("email").value.trim(),document.getElementById("password").value);msg.textContent="";}catch(error){console.error(error);msg.textContent="Login failed: "+(error.code||error.message);}});
logout.addEventListener("click",()=>signOut(auth));

async function count(name){try{return (await getDocs(collection(db,name))).size}catch(e){console.error(e);return 0}}

onAuthStateChanged(auth,async user=>{
 if(!user){loginView.classList.remove("hidden");dashboardView.classList.add("hidden");logout.classList.add("hidden");return}
 loginView.classList.add("hidden");dashboardView.classList.remove("hidden");logout.classList.remove("hidden");
 try{
  const snap=await getDoc(doc(db,"users",user.uid));
  if(!snap.exists()){document.getElementById("welcomeTitle").textContent="PROFILE NOT FOUND";document.getElementById("roleText").textContent="No Firestore profile was found.";document.getElementById("statusText").textContent="Your login worked, but your user profile is missing.";return}
  const p=snap.data(), name=p.name||user.email, role=String(p.role||"student").trim().toLowerCase();
  document.getElementById("welcomeTitle").textContent="Welcome, "+name;
  document.getElementById("roleText").textContent="Signed in as "+role;
  document.getElementById("statusText").textContent=role==="superadmin"?"SUPERADMIN ACCOUNT DETECTED ✅":role==="admin"?"ADMIN ACCOUNT DETECTED ✅":"Student account detected.";
  document.getElementById("notesCount").textContent=await count("notes");
  document.getElementById("assignmentsCount").textContent=await count("assignments");
  document.getElementById("testsCount").textContent=await count("tests");
  document.getElementById("resultsCount").textContent=await count("results");
 }catch(error){console.error(error);document.getElementById("welcomeTitle").textContent="FIRESTORE ERROR";document.getElementById("roleText").textContent=error.code||error.message;document.getElementById("statusText").textContent="There was a problem reading your profile."}
});
