import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { doc, getDoc, collection, getDocs, addDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const $ = id => document.getElementById(id);
const loginView = $("loginView"), dashboardView = $("dashboardView"), form = $("loginForm");
const msg = $("loginMessage"), logout = $("logoutBtn"), adminPanel = $("adminPanel");
const noteForm = $("noteForm"), noteMsg = $("noteMessage"), notesList = $("notesList");

form.addEventListener("submit", async e => {
  e.preventDefault();
  msg.textContent = "Logging in...";
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (error) {
    console.error(error);
    msg.textContent = "Login failed: " + (error.code || error.message);
  }
});

logout.addEventListener("click", () => signOut(auth));

async function count(name) {
  try { return (await getDocs(collection(db, name))).size; }
  catch (e) { console.error(e); return 0; }
}

async function loadNotes() {
  try {
    let snap;
    try {
      snap = await getDocs(query(collection(db, "notes"), orderBy("createdAt", "desc")));
    } catch {
      snap = await getDocs(collection(db, "notes"));
    }
    if (snap.empty) {
      notesList.innerHTML = '<p class="muted">No notes published yet.</p>';
      return;
    }
    notesList.innerHTML = "";
    snap.forEach(d => {
      const n = d.data();
      const card = document.createElement("article");
      card.className = "note-card";
      card.innerHTML = '<h3></h3><p class="subject"></p><div class="note-content"></div>';
      card.querySelector("h3").textContent = n.title || "Untitled Note";
      card.querySelector(".subject").textContent = n.subject || "General";
      card.querySelector(".note-content").textContent = n.content || "";
      notesList.appendChild(card);
    });
  } catch (e) {
    console.error(e);
    notesList.innerHTML = '<p class="message">Could not load notes.</p>';
  }
}

noteForm.addEventListener("submit", async e => {
  e.preventDefault();
  noteMsg.textContent = "Publishing...";
  try {
    await addDoc(collection(db, "notes"), {
      title: $("noteTitle").value.trim(),
      subject: $("noteSubject").value.trim(),
      content: $("noteContent").value.trim(),
      createdAt: serverTimestamp(),
      createdBy: auth.currentUser.uid
    });
    noteForm.reset();
    noteMsg.textContent = "Note published successfully ✅";
    $("notesCount").textContent = await count("notes");
    await loadNotes();
  } catch (e) {
    console.error(e);
    noteMsg.textContent = "Could not publish note: " + (e.code || e.message);
  }
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    logout.classList.add("hidden");
    return;
  }

  loginView.classList.add("hidden");
  dashboardView.classList.remove("hidden");
  logout.classList.remove("hidden");

  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (!snap.exists()) {
      $("welcomeTitle").textContent = "PROFILE NOT FOUND";
      $("roleText").textContent = "No Firestore profile was found.";
      return;
    }

    const p = snap.data();
    const name = p.name || user.email;
    const role = String(p.role || "student").trim().toLowerCase();

    $("welcomeTitle").textContent = "Welcome, " + name;
    $("roleText").textContent = "Signed in as " + role;

    const canManageNotes = role === "admin" || role === "superadmin";
    adminPanel.classList.toggle("hidden", !canManageNotes);

    $("statusText").textContent =
      role === "superadmin" ? "SUPERADMIN ACCOUNT DETECTED ✅" :
      role === "admin" ? "ADMIN ACCOUNT DETECTED ✅" :
      "Student account detected.";

    $("notesCount").textContent = await count("notes");
    $("assignmentsCount").textContent = await count("assignments");
    $("testsCount").textContent = await count("tests");
    $("resultsCount").textContent = await count("results");
    await loadNotes();
  } catch (error) {
    console.error(error);
    $("welcomeTitle").textContent = "FIRESTORE ERROR";
    $("roleText").textContent = error.code || error.message;
    $("statusText").textContent = "There was a problem reading your profile.";
  }
});
