import { db } from './firebaseConfig.js';
import { collection, query, orderBy, getDocs, getDoc, addDoc, doc, setDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";


// Universal date formatter - stores as YYYY-MM-DD
export function formatFirestoreDate(dateInput) {
    // Handle empty/undefined
    if (!dateInput) return null;
    
    // If already in correct format
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return dateInput;
    }
    
    // If it's a JavaScript Date object
    if (dateInput instanceof Date) {
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
    }
    
    // If it's a Firestore Timestamp
    if (dateInput.toDate) {
    const jsDate = dateInput.toDate();
    return formatFirestoreDate(jsDate);
    }
    
    // If it's in DD-MM-YYYY format (backward compatibility)
    if (typeof dateInput === 'string' && /^\d{2}-\d{2}-\d{4}$/.test(dateInput)) {
    const [day, month, year] = dateInput.split('-');
    return `${year}-${month}-${day}`;
    }
    
    return null;
}
  

// Date formatting helper (same as in main.js)
function formatDateLocal(date) {
  const d = new Date(date);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
}

export async function getUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
            return userDoc.data();
        } else {
            console.error("User document does not exist.");
            return null;
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
    }
}

export async function setUserData(uid, data) {
    await setDoc(doc(db, 'users', uid), data);
}

export async function updateUserData(uid, data){
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
}

export async function addCycleData(uid, data) {
    await addDoc(collection(db, 'users', uid, 'cycles'), {
        ...data,
        startDate: formatDateLocal(data.startDate),
        endDate: data.endDate ? formatDateLocal(data.endDate) : null,
        timestamp: new Date()
    });
}

export async function addSymptomData(uid, data) {
    const docRef = await addDoc(collection(db, 'users', uid, 'symptoms'), {
      ...data,
      date: formatFirestoreDate(data.date) || formatFirestoreDate(new Date()),
      timestamp: new Date()
    });
    return docRef;
}
  

export async function getCycleHistory(uid) {
    const cyclesQuery = query(
        collection(db, 'users', uid, 'cycles'),
        orderBy('timestamp', 'desc')
    );

    const querySnapshot = await getDocs(cyclesQuery);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Convert string dates back to Date objects for calculations
        startDate: new Date(doc.data().startDate),
        endDate: doc.data().endDate ? new Date(doc.data().endDate) : null
    }));
}

export async function getCycleHistoryWithId(uid) {
    const cyclesQuery = query(
        collection(db, 'users', uid, 'cycles'),
        orderBy('timestamp', 'desc')
    );
    const querySnapshot = await getDocs(cyclesQuery);
    return querySnapshot.docs.map(doc => ({ 
        id: doc.id,
        ...doc.data(),
        startDate: new Date(doc.data().startDate),
        endDate: doc.data().endDate ? new Date(doc.data().endDate) : null
    }));
}

export async function getSymptomsHistory(uid) {
    const querySnapshot = await getDocs(
    query(collection(db, 'users', uid, 'symptoms'), orderBy('date', 'desc'))
    );
    
    return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
        id: doc.id,
        ...data,
        date: formatFirestoreDate(data.date) // Ensure consistent format
    };
    });
}

export async function checkSymptomsForDate(uid, date) {
    const formattedDate = formatDateLocal(date);
    const symptomsQuery = query(
        collection(db, 'users', uid, 'symptoms'),
        where('date', '==', formattedDate)
    );
    const querySnapshot = await getDocs(symptomsQuery);
    return !querySnapshot.empty;
}

export async function getSymptomsForDate(uid, date) {
    const formattedDate = formatDateLocal(date);
    const symptomsQuery = query(
        collection(db, 'users', uid, 'symptoms'),
        where('date', '==', formattedDate)
    );
    return await getDocs(symptomsQuery);
}

export async function getUserIdByEmail(email) {
    const usersQuery = query(collection(db, 'users'), where('email', '==', email));
    const querySnapshot = await getDocs(usersQuery);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
    }
    throw new Error('User not found in Firestore.');
}

export async function sendInvitation(fromUserId, toUserId) {
    await addDoc(collection(db, 'invitations'), {
        fromUserId,
        toUserId,
        status: 'pending',
        timestamp: new Date()
    });
}

export async function updateInvitationStatus(invitationId, status) {
    await updateDoc(doc(db, 'invitations', invitationId), { status });
}

export async function updateUserPartner(uid, partnerId) {
    await updateDoc(doc(db, 'users', uid), { partner: partnerId });
}

export async function getPendingInvitations(userId) {
    const invitationsQuery = query(
        collection(db, 'invitations'),
        where('toUserId', '==', userId),
        where('status', '==', 'pending')
    );
    const querySnapshot = await getDocs(invitationsQuery);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}