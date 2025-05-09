import {getUserData, getCycleHistory, getSymptomsHistory, updateInvitationStatus, updateUserPartner, getPendingInvitations} from './firestore.js';
import { auth } from './firebaseConfig.js';
import { predictNextPeriod, calculateCycleStats, getCurrentCyclePhase, getNutritionTips } from './utils.js';

export function showDashboard(userData) {
    if (!userData) {
        console.error("User data is null or undefined.");
        return;
    }
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('username').textContent = userData.username;
    document.body.classList.add(userData.gender);
}

export function showAuth() {
    document.getElementById('auth-container').style.display = 'block';
    document.getElementById('dashboard').style.display = 'none';
}

export function renderCycleHistory(cycles) {
    const cycleHistory = document.getElementById('cycle-history');
    let counter = 0;
    if(cycles.length != 0) cycleHistory.innerHTML = '';
    
    cycles.forEach(cycle => {
        counter++;
        if(counter >= 4){
            return;
        }
        const li = document.createElement('li');
        
        // Handle Date object or string
        const startDate = cycle.startDate instanceof Date ? cycle.startDate : new Date(cycle.startDate);
        const startString = formatDateDDMMYYYY(startDate);
        
        let endString = "active";
        if(cycle.endDate !== null){
            const endDate = cycle.endDate instanceof Date ? cycle.endDate : new Date(cycle.endDate);
            endString = formatDateDDMMYYYY(endDate);
        }
        
        li.innerHTML = `
            <strong>Start:</strong> ${startString},<br> <strong>End:</strong> ${endString}<br>
        `;
        cycleHistory.appendChild(li);
    });
}

// Add this helper function if not already in your file
function formatDateDDMMYYYY(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

export function renderSymptomsHistory(symptoms) {
    const symptomsHistory = document.getElementById('symptoms-history');
    symptomsHistory.innerHTML = '';
    
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    symptomsHistory.innerHTML = '<li class="no-symptoms">No symptoms recorded yet</li>';
    return;
    }

    symptoms.slice(0, 4).forEach(symptom => {
    const li = document.createElement('li');
    li.className = 'symptom-entry';
    
    // Date display logic
    let displayDate = 'Date not available';
    try {
        if (symptom.date) {
        // Handle all possible date formats
        let dateParts;
        
        if (typeof symptom.date === 'string') {
            if (symptom.date.includes('-')) {
            dateParts = symptom.date.split('-');
            // Reformat YYYY-MM-DD to DD-MM-YYYY
            if (dateParts.length === 3) {
                displayDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            }
            } else if (symptom.date.includes('/')) {
            dateParts = symptom.date.split('/');
            // Handle DD/MM/YYYY format
            if (dateParts.length === 3) {
                displayDate = `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`;
            }
            }
        } else if (symptom.date instanceof Date) {
            // Format JS Date object directly
            displayDate = `${String(symptom.date.getDate()).padStart(2, '0')}-${
            String(symptom.date.getMonth() + 1).padStart(2, '0')}-${
            symptom.date.getFullYear()}`;
        }
        }
    } catch (error) {
        console.error('Date formatting error:', error);
    }

    li.innerHTML = `
        <div class="symptom-date">📅 ${displayDate}</div>
        <div class="symptom-details">
        <div>😊 ${symptom.feeling || 'No emotion recorded'}</div>
        <div>🩺 ${symptom.symptoms?.join(', ') || 'No symptoms'}</div>
        <div>🔴 ${symptom.flow || 'Flow not specified'}</div>
        </div>
    `;
    symptomsHistory.appendChild(li);
    });
}

export async function updateUi() {
    const user = auth.currentUser;
    if (!user) return;

    const userData = await getUserData(user.uid);
    document.getElementById('username').textContent = userData.username || 'User';

    const invitations = await getPendingInvitations(user.uid);
    document.getElementById('invitations-section').style.display = 'none';
    let symptoms;
    if(userData.gender === "Female"){
        symptoms = await getSymptomsHistory(user.uid);
    }
    else{
        symptoms = await getSymptomsHistory(userData.partner);
    }

    let cycles;
    if(!userData) return;
    if (userData.gender === "Female") {
        cycles = await getCycleHistory(user.uid);
    } else if (userData.partner) {
        cycles = await getCycleHistory(userData.partner);
    } else {
        cycles = []; // No partner, so no cycles to display
    }

    console.log("Cycles:", cycles); // Log cycles

    if (invitations.length > 0) {
        document.getElementById('invitations-section').style.display = 'block';
        renderInvitations(invitations);
    }
    if (cycles.length > 0) { // Ensure cycles is not empty
        renderCycleHistory(cycles);
        showPrediction(predictNextPeriod(cycles));
        showCycleStats(calculateCycleStats(cycles));
        const phase = getCurrentCyclePhase(cycles);
        console.log("Detected cycle phase:", phase);
        const tips = getNutritionTips(phase);
        console.log("Nutrition tips:", tips);
        showNutritionTips(tips);
    } else {
        console.log("No cycles found for the user."); // Log if cycles are empty
    }
    if (symptoms.length > 0) {
        renderSymptomsHistory(symptoms);
    }
}

export function renderInvitations(invitations) {
    const invitationsList = document.getElementById('invitations-list');
    invitationsList.innerHTML = '';
    invitations.forEach(invitation => {
        const li = document.createElement('li');
        li.innerHTML = `
            Invitation from: ${invitation.fromUserId}
            <button class="accept-btn" data-invitation-id="${invitation.id}" data-from-user-id="${invitation.fromUserId}">Accept</button>
            <button class="reject-btn" data-invitation-id="${invitation.id}">Reject</button>
        `;
        invitationsList.appendChild(li);
    });

    // Add event listeners for accept buttons
    const acceptButtons = document.querySelectorAll('.accept-btn');
    acceptButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const invitationId = button.getAttribute('data-invitation-id');
            const fromUserId = button.getAttribute('data-from-user-id');
            const currentUserId = auth.currentUser.uid;

            try {
                // Add the sender as a partner to the current user
                await updateUserPartner(currentUserId, fromUserId);

                // Update the invitation status to "accepted"
                await updateInvitationStatus(invitationId, 'accepted');

                // Refresh the invitations list
                const updatedInvitations = await getPendingInvitations(currentUserId);
                renderInvitations(updatedInvitations);

                alert('Invitation accepted! Partner added.');
            } catch (error) {
                console.error('Error accepting invitation:', error);
                alert('Failed to accept invitation. Please try again.');
            }
        });
    });

    // Add event listeners for reject buttons
    const rejectButtons = document.querySelectorAll('.reject-btn');
    rejectButtons.forEach(button => {
        button.addEventListener('click', async () => {
            const invitationId = button.getAttribute('data-invitation-id');
            const currentUserId = auth.currentUser.uid;

            try {
                // Update the invitation status to "rejected"
                await updateInvitationStatus(invitationId, 'rejected');

                // Refresh the invitations list
                const updatedInvitations = await getPendingInvitations(currentUserId);
                renderInvitations(updatedInvitations);

                alert('Invitation rejected.');
            } catch (error) {
                console.error('Error rejecting invitation:', error);
                alert('Failed to reject invitation. Please try again.');
            }
        });
    });
}

export function showPrediction(prediction) {
    document.getElementById('days-until-period').textContent = prediction;
}

export function showCycleStats(stats) {
    document.getElementById('avg-cycle-length-stat').textContent = stats.avgCycleLength;
    document.getElementById('avg-period-length-stat').textContent = stats.avgPeriodLength;
    document.getElementById('ovulation-window-stat').textContent = stats.ovulationWindow;
    document.getElementById('fertile-days-stat').textContent = stats.fertileDays;
}

export function showNutritionTips(tips) {
    const tipsContainer = document.getElementById('nutrition-tips-content');
    let currentIndex = 0;

    // Function to update the displayed tip
    function displayNextTip() {
        if (currentIndex < tips.length) {
            tipsContainer.innerHTML = `<p>${tips[currentIndex]}</p>`;
            currentIndex++;
        } else {
            // Reset to the first tip if the end is reached
            currentIndex = 0;
            tipsContainer.innerHTML = `<p>${tips[currentIndex]}</p>`;
            currentIndex++;
        }
    }

    // Display the first tip immediately
    displayNextTip();

    // Set up auto-scroll every 10 seconds
    const intervalId = setInterval(displayNextTip, 10000);

    // Optional: Clear the interval when needed (e.g., when leaving the page)
    return intervalId;
}
