import { auth } from './firebaseConfig.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async (user) => {
        setTimeout(() => {
            if (user) {
                localStorage.setItem("isLoggedIn", "true"); // Use string
                window.location.href = "dashboard.html"; // Redirect only if logged in
            } else {
                localStorage.setItem("isLoggedIn", "false");
                window.location.href = "auth.html"; // Redirect to login page
            }
        }, 2000);
    });
});
