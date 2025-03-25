// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyCUKI__XDO2uZuiodEDnwXiGLBQPlH8NG8",
    authDomain: "unknownanswers-8fb4e.firebaseapp.com",
    projectId: "unknownanswers-8fb4e",
    storageBucket: "unknownanswers-8fb4e.appspot.com",
    messagingSenderId: "220349774424",
    appId: "1:220349774424:web:8577c7611af75425d0682d"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };