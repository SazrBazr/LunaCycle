// main.js
import { auth } from './firebaseConfig.js';
import {logout, checkEmailExists } from './auth.js';
import { getUserData, setUserData, checkSymptomsForDate, getSymptomsForDate, addCycleData, addSymptomData, getCycleHistory, getCycleHistoryWithId, getUserIdByEmail, sendInvitation, updateUserPartner, getSymptomsHistory } from './firestore.js';
import { showDashboard, renderCycleHistory, updateUi} from './ui.js';
import { predictNextPeriod, calculateAveragePeriodLength, calculateOvulationWindow } from './utils.js';
import { updateDoc, deleteDoc  } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const shareEmailInput = document.getElementById('messageInput');
    const sendInvitationBtn = document.getElementById('sendButton');
    const startPeriodBtn = document.getElementById('start-period-btn');
    const endPeriodBtn = document.getElementById('end-period-btn');
    const symptomsModal = document.getElementById('symptoms-modal');
    const saveSymptomsBtn = document.getElementById('save-day-btn');
    const infoIcons = document.querySelectorAll('.info');
    const logoutBtn = document.getElementById('logout-btn');

    const settingsBtn = document.getElementById('settings-btn');
    const settingsSection = document.getElementById('settings-section');
    const settingsForm = document.getElementById('settings-form');
    const settingsUsername = document.getElementById('settings-username');
    const settingsGender = document.getElementById('settings-gender');
    const settingsAvgCycleLength = document.getElementById('settings-avg-cycle-length');
    const settingsAvgPeriodLength = document.getElementById('settings-avg-period-length');

    let clickedDate = new Date().toISOString().split('T')[0];
    document.getElementById('selected-date').textContent = new Date().toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    showDayDetails(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            await start();
        }
    });
    
    
    async function start() {
        let user = auth.currentUser;
        while(!user){
            user = auth.currentUser;
        }
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

        updateUi();
        renderCalendar();
    }

    // Add click event listener to each info icon
    infoIcons.forEach((icon) => {
        icon.addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent event bubbling
        const stat = icon.closest('.stat'); // Find the closest parent stat container
        stat.classList.toggle('active'); // Toggle the active class
        });
    });

    // Close tooltips when clicking outside
    document.addEventListener('click', () => {
        infoIcons.forEach((icon) => {
        const stat = icon.closest('.stat');
        stat.classList.remove('active');
        });
    });

    // Toggle settings section
    settingsBtn.addEventListener('click', () => {
        settingsSection.style.display = settingsSection.style.display === 'none' ? 'block' : 'none';
        document.getElementById('dash-data').style.display = document.getElementById('dash-data').style.display === 'none' ? 'block' : 'none';
    });

    // Handle settings form submission
    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) return;

        const newUsername = settingsUsername.value.trim();
        const newGender = settingsGender.value;
        const newAvgCycleLength = parseInt(settingsAvgCycleLength.value);
        const newAvgPeriodLength = parseInt(settingsAvgPeriodLength.value);

        if (!newUsername || !newGender || isNaN(newAvgCycleLength) || isNaN(newAvgPeriodLength)) {
            alert('Please fill in all fields correctly.');
            return;
        }

        try {
            await setUserData(user.uid, {
                username: newUsername,
                gender: newGender,
                avgCycleLength: newAvgCycleLength,
                avgPeriodLength: newAvgPeriodLength
            });

            alert('Settings updated successfully!');
            settingsSection.style.display = 'none';
            updateUi(); // Refresh the UI with new data
        } catch (error) {
            alert('Error updating settings: ' + error.message);
        }
    });

    // Load current settings when settings section is opened
    settingsBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const userData = await getUserData(user.uid);
        settingsUsername.value = userData.username || '';
        settingsGender.value = userData.gender || 'Female';
        settingsAvgCycleLength.value = userData.avgCycleLength || '';
        settingsAvgPeriodLength.value = userData.avgPeriodLength || '';
    });

    // Function to render the calendar
    async function renderCalendar(year = null, month = null) {
        const calendar = document.getElementById('calendar');
        calendar.innerHTML = ''; // Clear previous calendar
    
        const today = new Date();
        const currentYear = year ?? today.getFullYear();
        const currentMonth = month ?? today.getMonth();
    
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay(); // Correct calculation
    
        // Create calendar header
        const header = document.createElement('div');
        header.className = 'calendar-header';
    
        const prevMonthBtn = document.createElement('button');
        prevMonthBtn.id = 'prev-month';
        prevMonthBtn.textContent = '←';
        prevMonthBtn.onclick = () => renderCalendar(currentYear, currentMonth - 1);
    
        const nextMonthBtn = document.createElement('button');
        nextMonthBtn.id = 'next-month';
        nextMonthBtn.textContent = '→';
        nextMonthBtn.onclick = () => renderCalendar(currentYear, currentMonth + 1);
    
        const monthYear = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(firstDay);
        const monthYearSpan = document.createElement('h2');
        monthYearSpan.textContent = monthYear;
    
        header.appendChild(prevMonthBtn);
        header.appendChild(monthYearSpan);
        header.appendChild(nextMonthBtn);
        calendar.appendChild(header);
    
        // Create calendar grid
        const grid = document.createElement('div');
        grid.id = 'calendar-grid';
        grid.className = 'calendar-grid';
    
        // Add empty cells before the first day
        for (let i = 0; i < startingDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty';
            grid.appendChild(emptyCell);
        }
    
        // Add day cells
        for (let i = 1; i <= daysInMonth; i++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-day';
            if(new Date(currentYear, currentMonth, i) > new Date()){
                cell.classList.add('disabled');
            }
            cell.innerHTML = `<span class="date">${i}</span> <div class="indicators"></div>`;
    
            cell.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day').forEach(cell => cell.classList.remove('active'));
                cell.classList.add('active');
                showDayDetails(currentYear, currentMonth, i);
            });
    
            grid.appendChild(cell);
        }
    
        calendar.appendChild(grid);
        fillCalendar(currentYear, currentMonth); // Call fillCalendar after rendering
    }
    
    // Function to fill the calendar with cycle data
    async function fillCalendar(currentYear, currentMonth) {
        const user = auth.currentUser;
        if (!user) return;
    
        const userData = await getUserData(user.uid);
        let cycles = [];
    
        if (userData.gender === "Female") {
            cycles = await getCycleHistory(user.uid);
        } else if (userData.partner) {
            cycles = await getCycleHistory(userData.partner);
        }
    
        const currentDateServer = new Date();
        const localDateTime = currentDateServer.toLocaleString();
        let expectedPeriodStart, expectedPeriodEnd, fertileWindowStartDate, fertileWindowEndDate;
    
        if (cycles.length > 0) {
            expectedPeriodStart = new Date(currentDateServer);
            expectedPeriodStart.setDate(currentDateServer.getDate() + predictNextPeriod(cycles));
    
            expectedPeriodEnd = new Date(expectedPeriodStart);
            expectedPeriodEnd.setDate(expectedPeriodStart.getDate() + calculateAveragePeriodLength(cycles));
    
            const stats = calculateOvulationWindow(cycles);
            fertileWindowStartDate = stats['ferStartDate'];
            fertileWindowEndDate = stats['ferEndDate'];
        }
    
        document.querySelectorAll('.calendar-day').forEach(async (cell, inedx) => {
            const cellDate = new Date(currentYear, currentMonth, inedx + 2);
            const date = cellDate.toISOString().split('T')[0];

            const fyear = currentDateServer.getFullYear();
            const fmonth = String(currentDateServer.getMonth() + 1).padStart(2, '0'); // Ensure two digits
            const fday = String(currentDateServer.getDate()).padStart(2, '0');
            const localDateTimeFormated = `${fyear}-${fmonth}-${fday}`;
            const isToday = date === localDateTimeFormated;

            let isPredictedPeriod = false;
            let isFertile = false;
            let hasSymptoms
            if(userData.gender === "Female"){
                hasSymptoms = await checkSymptomsForDate(user.uid, date);
            }
            else{
                hasSymptoms = await checkSymptomsForDate(userData.partner, date);
            }
            
            if (expectedPeriodStart && expectedPeriodEnd && expectedPeriodStart.toISOString().split('T')[0] <= date && date <= expectedPeriodEnd.toISOString().split('T')[0]) {
                if(predictNextPeriod(cycles) != -1){
                    isPredictedPeriod = true;
                }
            }
            if (fertileWindowStartDate && fertileWindowEndDate && fertileWindowStartDate.toISOString().split('T')[0] <= date && date <= fertileWindowEndDate.toISOString().split('T')[0]) {
                isFertile = true;
            }

            if (isToday) cell.classList.add('today');
            const indicatorsDiv = cell.querySelector('.indicators');

            // Clear previous dots
            indicatorsDiv.innerHTML = ''; 
            if (isPredictedPeriod) {
                const periodDot = document.createElement('span');
                periodDot.className = 'dot period';
                indicatorsDiv.appendChild(periodDot);
            }

            if (isFertile) {
                const fertileDot = document.createElement('span');
                fertileDot.className = 'dot fertile';
                indicatorsDiv.appendChild(fertileDot);
            }

            if (hasSymptoms) {
                const symptomsDot = document.createElement('span');
                symptomsDot.className = 'dot symptomsCell';
                indicatorsDiv.appendChild(symptomsDot);
            }
        });        
    }

    // Function to show day details
    async function showDayDetails(year, month, day) {
        const user = auth.currentUser;
        if (!user) return;

        clickedDate = new Date(year, month, day + 1).toISOString().split('T')[0];
        // Fetch symptoms for the selected date
        alert(clickedDate);
        const querySnapshot = await getSymptomsForDate(user.uid, clickedDate);

        clickedDate = new Date(year, month, day).toLocaleString().split(',')[0];


        if (!querySnapshot.empty) {
            // Assuming each document contains symptoms as an array
            const symptomsData = querySnapshot.docs.map(doc => doc.data());
            const symptomsList = symptomsData.flatMap(entry => entry.symptoms).join(', ');
            const flowData = symptomsData.map(entry => entry.flow);
            const feelingData = symptomsData.map(entry => entry.feeling);
    
            document.getElementById('dayEmotion').textContent = "Emotion: " + feelingData;
            document.getElementById('dayFlow').textContent = "Flow: " + flowData;
            document.getElementById('daySymptoms').textContent = "Symptoms: " + symptomsList;
            document.getElementById('symptoms-for-day').style.display = 'block';
        }
        else{
            document.getElementById('symptoms-for-day').style.display = 'none';
        }
    
        const userData = await getUserData(user.uid);
        if (userData.gender === "Male") {
            document.getElementById('day-details').style.display = 'none';
            return;
        }
    
        document.getElementById('selected-date').textContent = `${day}-${month}-${year}`;
        document.getElementById('day-details').style.display = 'block';
    }    

    document.getElementById('edit-day-btn').addEventListener('click', async function () {
        const user = auth.currentUser;
        if (!user || !clickedDate) return;
    
        const querySnapshot = await getSymptomsForDate(user.uid, clickedDate);
    
        if (querySnapshot.empty) {
            alert("No symptoms logged for this day.");
            return;
        }
    
        const docRef = querySnapshot.docs[0].ref; // Assuming one entry per day
        const docData = querySnapshot.docs[0].data();
    
        // Pre-fill current data in a prompt (you can replace this with a better UI)
        const newSymptoms = prompt("Edit Symptoms (comma-separated):", docData.symptoms.join(', '));
        const newFlow = prompt("Edit Flow:", docData.flow);
        const newFeeling = prompt("Edit Feeling:", docData.feeling);
    
        if (newSymptoms !== null && newFlow !== null && newFeeling !== null) {
            await updateDoc(docRef, {
                symptoms: newSymptoms.split(',').map(s => s.trim()),
                flow: newFlow,
                feeling: newFeeling
            });
            alert("Symptoms updated successfully.");
            showDayDetails(new Date(clickedDate).getFullYear(), new Date(clickedDate).getMonth(), new Date(clickedDate).getDate()); // Refresh UI
        }
    });    

    // Function to delete symptoms for the selected day
    document.getElementById('delete-day-btn').addEventListener('click', async function () {
        const user = auth.currentUser;
        if (!user || !clickedDate) return;

        const querySnapshot = await getSymptomsForDate(user.uid, clickedDate);

        if (querySnapshot.empty) {
            alert("No symptoms logged for this day.");
            return;
        }

        if (confirm("Are you sure you want to delete this day's symptoms?")) {
            querySnapshot.docs.forEach(async (doc) => {
                await deleteDoc(doc.ref);
            });
            updateUi();
            alert("Symptoms deleted successfully.");
            document.getElementById('symptoms-for-day').style.display = 'none'; // Hide the section
        }
    });    

    logoutBtn.addEventListener('click', async () => {
        try {
            await logout();
            window.location.href = "auth.html";
        } catch (error) {
            alert(error.message);
        }
    });

    startPeriodBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;
    
        const cycles = await getCycleHistory(user.uid);
        const latestCycle = cycles.length > 0 ? cycles[0] : null;
    
        if (latestCycle && latestCycle.endDate === null) {
            alert("There is already an active Period")
        } else {
            // User is starting a new period    
            if (clickedDate) {                        
                const data = {
                    startDate: clickedDate,
                    endDate: null,
                    timestamp: new Date()
                }

                addCycleData(user.uid, data)
                alert('Period started on ' + clickedDate);
            }
        }
        updateUi();
    });

    endPeriodBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;
    
        const cycles = await getCycleHistory(user.uid);
        const latestCycle = cycles.length > 0 ? cycles[0] : null;
    
        if (latestCycle && latestCycle.endDate === null) {
            if (clickedDate) {
                try {
                    
                    if (!latestCycle || !latestCycle.id) {
                        console.error("Error: latestCycle ID is undefined");
                        return;
                    }
                    const cycleRef = doc(db, "users", user.uid, "cycles", latestCycle.id);
                    await updateDoc(cycleRef, { endDate: clickedDate });                    
    
                    console.log("Cycle updated successfully:", { endDate: clickedDate });
                } catch (error) {
                    console.error("Error updating Firestore document:", error);
                }
            }
        } else {
            alert("There is no active Period");
        }
    
        renderCycleHistory(await getCycleHistory(user.uid)); // Refresh history
    });    

    saveSymptomsBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;
    
        // Fetch the latest cycle using getCycleHistory
        const cycles = await getCycleHistoryWithId(user.uid);
    
        if (cycles.length === 0) {
            alert('No active cycle found. Please start a cycle first.');
            return;
        }

        const symptoms = Array.from(document.querySelectorAll('input[name="symptoms"]:checked')).map(input => input.value);
        const flow = document.getElementById('flow').value;
        const feeling = document.getElementById('feeling').value;

    
        if (!clickedDate || symptoms.length === 0 || !flow) {
            alert('Please fill in all fields.');
            return;
        }
    
        try {
            // Add symptoms to the symptoms subcollection under the latest cycle
            const [month, day, year] = clickedDate.split('/');
            const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

            await addSymptomData(user.uid, {
                date: formattedDate,
                symptoms: symptoms,
                flow: flow,
                feeling: feeling,
                timestamp: new Date()
            });
            alert('Symptoms and flow logged!');
            renderCalendar();
        } catch (error) {
            alert('Error logging symptoms and flow: ' + error.message);
        }
    });

    sendInvitationBtn.addEventListener('click', async () => {
        const fromUser = auth.currentUser;
        const toEmail = shareEmailInput.value.trim();
        
        if (fromUser && toEmail) {
            try {
                const emailExists = await checkEmailExists(toEmail);
                if (!emailExists) {
                    alert("User does not exist!");
                    return;
                }
    
                await sendInvitation(fromUser.uid, toEmail);
                alert("Invitation sent!");
            } catch (error) {
                alert("Error sending invitation: " + error.message);
            }
        }
    });    
    
});