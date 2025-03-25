// auth.js
import { auth } from './firebaseConfig.js';
import { signInWithEmailAndPassword, sendEmailVerification , createUserWithEmailAndPassword, signOut, onAuthStateChanged, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-auth.js";

export async function login(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
}

export async function signup(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await sendEmailVerification(user);
        return userCredential.user;
    } catch (error) {
        throw error;
    }
}

export async function logout() {
    try {
        await signOut(auth);
    } catch (error) {
        throw error;
    }
}

export function onAuthChanged(callback) {
    onAuthStateChanged(auth, callback);
}

export async function checkEmailExists(email) {
    try {
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        return signInMethods.length > 0;
    } catch (error) {
        throw error;
    }
}