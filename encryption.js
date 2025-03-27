import { db } from './firebaseConfig.js';
import { collection, query, orderBy, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Generate a symmetric encryption key
export async function generateKey() {
    return await crypto.subtle.generateKey(
        { name: "AES-GCM", length: 256 }, // AES-GCM with 256-bit key
        true, // Key is extractable
        ["encrypt", "decrypt"] // Key usage
    );
}

export async function exportKey(key) {
    const exported = await crypto.subtle.exportKey("jwk", key);
    return JSON.stringify(exported);
}

export async function importKey(jwk) {
    const keyData = JSON.parse(jwk);
    return await crypto.subtle.importKey(
        "jwk",
        keyData,
        { name: "AES-GCM", length: 256 },
        true,
        ["encrypt", "decrypt"]
    );
}

export async function encryptData(data, key) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));

    const iv = crypto.getRandomValues(new Uint8Array(12)); // Initialization vector
    const encryptedData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        encodedData
    );

    return { iv, encryptedData };
}

export async function decryptData(encryptedData, key, iv) {
    const decryptedData = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        key,
        encryptedData
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedData));
}

// Example: Encrypt the symmetric key with the partner's public key
export async function encryptKey(symmetricKey, publicKey) {
    return await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        symmetricKey
    );
}

// Example: Decrypt the symmetric key with the user's private key
export async function decryptKey(encryptedKey, privateKey) {
    return await crypto.subtle.decrypt(
        { name: "RSA-OAEP" },
        privateKey,
        encryptedKey
    );
}

export async function addEncCycleData(uid, data, key) {
    const { iv, encryptedData } = await encryptData(data, key);
    await addDoc(collection(db, 'users', uid, 'cycles'), {
        encryptedData: Array.from(encryptedData), // Convert to array for Firestore
        iv: Array.from(iv) // Store IV for decryption
    });
}

export async function getEncCycleHistory(uid, key) {
    const cyclesQuery = query(collection(db, 'users', uid, 'cycles'), orderBy('startDate', 'desc'));
    const querySnapshot = await getDocs(cyclesQuery);

    const cycles = [];
    for (const doc of querySnapshot.docs) {
        const { encryptedData, iv } = doc.data();
        const decryptedData = await decryptData(
            new Uint8Array(encryptedData),
            key,
            new Uint8Array(iv)
        );
        cycles.push({ ...decryptedData, ref: doc.ref });
    }

    return cycles;
}