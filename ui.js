// ui.js
import {getUserData, getCycleHistory, getSymptomsHistory, updateInvitationStatus, updateUserPartner, getPendingInvitations} from './firestore.js';
import { auth } from './firebaseConfig.js';
import { predictNextPeriod, calculateCycleStats, getCurrentCyclePhase, getNutritionTips } from './utils.js';

export function showDashboard(userData) {
    if (!userData) {
        console.error("User data is null or undefined.");
        return; // Exit the function if userData is null
    }
    document.getElementById('auth-container').style.display = 'none';
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
        const startString = cycle.startDate;
        const endString = cycle.endDate === null? "active" : cycle.endDate;
        li.innerHTML = `
            <strong>Start:</strong> ${startString},<br> <strong>End:</strong> ${endString}<br>
        `;
        cycleHistory.appendChild(li);

    });
}

export function renderSymptomsHistory(symptoms) {
    const symptomsHistory = document.getElementById('symptoms-history');
    symptomsHistory.innerHTML = '';
    let counter = 0;
    symptoms.forEach(symptom => {
        counter++;
        if(counter >= 4){
            return;
        }
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>Date:</strong> ${symptom.date|| 'None'}<br>
            <strong>Symptoms:</strong> ${symptom.symptoms?.join(', ') || 'None'}<br>
            <strong>Flow:</strong> ${symptom.flow || 'Not specified'}
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
