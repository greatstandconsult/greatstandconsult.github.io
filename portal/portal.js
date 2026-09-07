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


form.addEventListener("submit", async (e) => {
  e.preventDefault();

  msg.textContent = "Logging in...";

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error(error);
    msg.textContent = "Login failed: " + error.message;
  }
});


logout.onclick = () => signOut(auth);


async function count(collectionName) {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return snapshot.size;
  } catch (error) {
    console.error("Count error:", error);
    return 0;
  }
}


onAuthStateChanged(auth, async (user) => {

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

    console.log("Logged-in UID:", user.uid);

    const userRef = doc(db, "users", user.uid);
    const userSnapshot = await getDoc(userRef);

    console.log("Profile exists:", userSnapshot.exists());

    if (!userSnapshot.exists()) {

      document.getElementById("welcomeTitle").textContent =
        "PROFILE NOT FOUND";

      document.getElementById("roleText").textContent =
        "No user profile was found in Firestore.";

      document.getElementById("statusText").textContent =
        "Your Firebase account is working, but your users document was not found.";

      return;
    }


    const profile = userSnapshot.data();

    const name = profile.name || user.email;

    const role = String(profile.role || "student")
      .trim()
      .toLowerCase();


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

    console.error(error);

    document.getElementById("welcomeTitle").textContent =
      "FIRESTORE ERROR";

    document.getElementById("roleText").textContent =
      error.message;

    document.getElementById("statusText").textContent =
      "There was a problem reading your Firestore profile.";

  }

});
