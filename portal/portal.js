import { auth, db } from "./firebase.js";

import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const loginView = document.getElementById("loginView");
const dashboardView = document.getElementById("dashboardView");
const form = document.getElementById("loginForm");
const msg = document.getElementById("loginMessage");
const logout = document.getElementById("logoutBtn");

form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  msg.textContent = "Logging in...";

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    msg.textContent = "Login failed: " + error.code;
  }
});

logout.addEventListener("click", function () {
  signOut(auth);
});

async function count(collectionName) {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.size;
  } catch (error) {
    console.error("COUNT ERROR:", error);
    return 0;
  }
}

onAuthStateChanged(auth, async function (user) {

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

    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {

      document.getElementById("welcomeTitle").textContent =
        "PROFILE NOT FOUND";

      document.getElementById("roleText").textContent =
        "No Firestore profile was found.";

      document.getElementById("statusText").textContent =
        "Your login worked, but your user profile is missing.";

      return;
    }

    const profile = userSnapshot.data();

    const name = profile.name || user.email;
    const role = String(profile.role || "student").trim().toLowerCase();

    document.getElementById("welcomeTitle").textContent =
      "Welcome, " + name;

    document.getElementById("roleText").textContent =
      "Signed in as " + role;

    if (role === "superadmin") {

      document.getElementById("statusText").textContent =
        "SUPERADMIN ACCOUNT DETECTED ✅";

    } else if (role === "admin") {

      document.getElementById("statusText").textContent =
        "ADMIN ACCOUNT DETECTED ✅";

    } else {

      document.getElementById("statusText").textContent =
        "Student account detected.";

    }

    document.getElementById("notesCount").textContent =
      await count("notes");

    document.getElementById("assignmentsCount").textContent =
      await count("assignments");

    document.getElementById("testsCount").textContent =
      await count("tests");

    document.getElementById("resultsCount").textContent =
      await count("results");

  } catch (error) {

    console.error("FIRESTORE ERROR:", error);

    document.getElementById("welcomeTitle").textContent =
      "FIRESTORE ERROR";

    document.getElementById("roleText").textContent =
      error.code || error.message;

    document.getElementById("statusText").textContent =
      "There was a problem reading your profile.";

  }

});
