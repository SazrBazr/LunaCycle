// main.js
import { auth } from './firebaseConfig.js';
import { login, signup, logout, onAuthChanged, checkEmailExists } from './auth.js';
import { getUserData, setUserData, checkSymptomsForDate, addCycleData, addSymptomData, getCycleHistory, getCycleHistoryWithId, getUserIdByEmail, sendInvitation, updateUserPartner, getSymptomsHistory } from './firestore.js';
import { showDashboard, showAuth, renderCycleHistory, updateUi} from './ui.js';
import { predictNextPeriod, calculateAveragePeriodLength, calculateOvulationWindow } from './utils.js';
import { updateDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";
import { generateKey, encryptData, decryptData, encryptKey, decryptKey, addEncCycleData, getEncCycleHistory, exportKey, importKey } from './encryption.js';


document.addEventListener('DOMContentLoaded', () =>{
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const signupEmail = document.getElementById('signup-email');
    const signupUsername = document.getElementById('signup-username');
    const signupPassword = document.getElementById('signup-password');
    const signupConfirmPassword = document.getElementById('signup-confirm-password');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const shareEmailInput = document.getElementById('messageInput');
    const sendInvitationBtn = document.getElementById('sendButton');
    const startPeriodBtn = document.getElementById('start-period-btn');
    const endPeriodBtn = document.getElementById('end-period-btn');
    const symptomsModal = document.getElementById('symptoms-modal');
    const saveSymptomsBtn = document.getElementById('save-day-btn');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const infoIcons = document.querySelectorAll('.info');

    //*authintication start*
    // Toggle between login and signup forms
    showSignup.addEventListener('click', () => {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    });

    showLogin.addEventListener('click', () => {
        signupForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Event Listeners
    loginBtn.addEventListener('click', async () => {
        const email = loginEmail.value.trim();
        const password = loginPassword.value.trim();

        if (!email || !password) {
            alert('Please enter both email and password.');
            return;
        }
        
        try {
            const user = await login(email, password);
            if (user) {
                // Retrieve the exported key from localStorage
                const exportedKey = localStorage.getItem('encryptionKey');
                if (!exportedKey) {
                    throw new Error("Encryption key not found.");
                }

                // Import the key
                const key = await importKey(exportedKey);
                const userData = await getUserData(user.uid);
                showDashboard(userData);
                if (userData.gender === 'Female') {
                    document.getElementById('day-details').style.display = 'block';
                    document.getElementById('female-only').style.display = 'block';
                    document.getElementById('invitations-section').style.display = 'block';
                }
                else{
                    document.getElementById('day-details').style.display = 'none';
                    document.getElementById('female-only').style.display = 'none';
                    document.getElementById('invitations-section').style.display = 'none';
                }
            }
        } catch (error) {
            alert(error.message);
        }
        updateUi();
        renderCalendar();
        if (!encryptionKey) {
            return encryptionKey;
        }
    });

    signupBtn.addEventListener('click', async () => {
        const email = signupEmail.value.trim();
        const username = signupUsername.value.trim();
        const password = signupPassword.value.trim();
        const confirmPassword = signupConfirmPassword.value.trim();

        const genderRadios = document.querySelectorAll('input[name="gender"]');
        let selectedGender = null;
        genderRadios.forEach(radio => {
            if (radio.checked) {
                selectedGender = radio.value;
            }
        });

        if (!email || !username || !password || !confirmPassword || !selectedGender) {
            alert('Please fill in all fields.');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        try {
            const user = await signup(email, password);
            const key = await generateKey();

            // Export the key as a string
            const exportedKey = await exportKey(key);
        
            // Store the exported key in localStorage
            localStorage.setItem('encryptionKey', exportedKey);
            await setUserData(user.uid, {
                email: email,
                username: username,
                gender: selectedGender,
                uid: user.uid
            });
            const userData = await getUserData(user.uid);
            showDashboard(userData);
        } catch (error) {
            alert(error.message);
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await logout();
        } catch (error) {
            alert(error.message);
        }
    });

    onAuthChanged(async (user) => {
        if (user) {
            //if (user.emailVerified) {
                const userData = await getUserData(user.uid);
                showDashboard(userData);
                if (userData.gender === 'Female') {
                    document.getElementById('day-details').style.display = 'block';
                    document.getElementById('female-only').style.display = 'block';
                    document.getElementById('invitations-section').style.display = 'block';
                }
                else{
                    document.getElementById('day-details').style.display = 'none';
                    document.getElementById('female-only').style.display = 'none';
                    document.getElementById('invitations-section').style.display = 'none';
                }
            //} else {
                console.log("Email is not verified.");
                
            //}

        } else {
            showAuth();
            //alert("Please verify your email first");
        }

        updateUi();
        renderCalendar();
    });
    //*authintication End*

});