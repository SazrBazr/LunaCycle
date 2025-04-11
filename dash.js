// main.js
import { auth, db } from './firebaseConfig.js';
import { logout, checkEmailExists } from './auth.js';
import { getUserData, setUserData, checkSymptomsForDate, getSymptomsForDate, addCycleData, addSymptomData, getCycleHistory, getCycleHistoryWithId, getUserIdByEmail, sendInvitation, updateUserPartner, getSymptomsHistory } from './firestore.js';
import { showDashboard, renderCycleHistory, updateUi} from './ui.js';
import { predictNextPeriod, calculateAveragePeriodLength, calculateOvulationWindow } from './utils.js';
import { updateDoc, deleteDoc, doc  } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

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

    // Get initial local date
    const now = new Date();
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let clickedDate = formatDateLocal(localDate);
    
    document.getElementById('selected-date').textContent = formatDateDDMMYYYY(localDate);
    
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
        } else {
            document.getElementById('day-details').style.display = 'none';
            document.getElementById('female-only').style.display = 'none';
            document.getElementById('invitations-section').style.display = 'none';
        }

        updateUi();
        renderCalendar();
    }

    // Date formatting functions
    function formatDateLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
    }

    function formatDateDDMMYYYY(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${day}-${month}-${year}`;
    }

    function formatDateDisplay(date) {
        return date.toLocaleDateString(undefined, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    // Calendar rendering functions
    async function renderCalendar(year = null, month = null) {
        const calendar = document.getElementById('calendar');
        calendar.innerHTML = '';
    
        const today = new Date();
        const currentYear = year ?? today.getFullYear();
        const currentMonth = month ?? today.getMonth();
    
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDay = firstDay.getDay();
    
        // Calendar header
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
    
        const monthYear = new Intl.DateTimeFormat(undefined, { 
            month: 'long', 
            year: 'numeric' 
        }).format(firstDay);
        
        const monthYearSpan = document.createElement('h2');
        monthYearSpan.textContent = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    
        header.appendChild(prevMonthBtn);
        header.appendChild(monthYearSpan);
        header.appendChild(nextMonthBtn);
        calendar.appendChild(header);
    
        // Calendar grid
        const grid = document.createElement('div');
        grid.id = 'calendar-grid';
        grid.className = 'calendar-grid';
    
        // Empty cells for days before the first of the month
        for (let i = 0; i < startingDay; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'calendar-cell empty';
            grid.appendChild(emptyCell);
        }
    
        // Day cells
        for (let day = 1; day <= daysInMonth; day++) {
            const cell = document.createElement('div');
            const cellDate = new Date(currentYear, currentMonth, day);
            
            cell.className = 'calendar-day';
            if(cellDate > new Date()) cell.classList.add('disabled');
            
            cell.innerHTML = `
                <span class="date">${day}</span>
                <div class="indicators"></div>
            `;

            cell.addEventListener('click', () => {
                document.querySelectorAll('.calendar-day').forEach(c => c.classList.remove('active'));
                cell.classList.add('active');
                showDayDetails(currentYear, currentMonth, day);
            });
    
            grid.appendChild(cell);
        }
    
        calendar.appendChild(grid);
        await fillCalendar(currentYear, currentMonth);
    }

    async function fillCalendar(currentYear, currentMonth) {
        const user = auth.currentUser;
        if (!user) return;
    
        const userData = await getUserData(user.uid);
        const cycles = userData.gender === "Female" 
            ? await getCycleHistory(user.uid) 
            : userData.partner ? await getCycleHistory(userData.partner) : [];
    
        const today = new Date();
        const currentDate = formatDateLocal(today);
    
        let predictionData = {};
        if (cycles.length > 0) {
            const lastCycle = cycles[0];
            predictionData = {
                expectedPeriodStart: predictNextPeriod(cycles),
                fertileWindow: calculateOvulationWindow(cycles)
            };
        }
    
        document.querySelectorAll('.calendar-day').forEach(async (cell, index) => {
            const dayNumber = index + 1 - (new Date(currentYear, currentMonth, 1).getDay() - 2);
            if (dayNumber < 1 || dayNumber > new Date(currentYear, currentMonth + 1, 0).getDate()) return;
    
            const cellDate = new Date(currentYear, currentMonth, dayNumber);
            const formattedDate = formatDateLocal(cellDate);
            const isToday = formattedDate === currentDate;
    
            // Check if date is in the future
            if (cellDate > today) {
                cell.classList.add('disabled');
                return;
            }
    
            // Get symptoms data
            const hasSymptoms = userData.gender === "Female" 
                ? await checkSymptomsForDate(user.uid, formattedDate)
                : await checkSymptomsForDate(userData.partner, formattedDate);
    
            // Prediction calculations
            let isPredictedPeriod = false;
            let isFertile = false;
            
            if (predictionData.expectedPeriodStart) {
                const periodStart = new Date(predictionData.expectedPeriodStart);
                const periodEnd = new Date(periodStart);
                periodEnd.setDate(periodStart.getDate() + calculateAveragePeriodLength(cycles));
                isPredictedPeriod = cellDate >= periodStart && cellDate <= periodEnd;
            }
    
            if (predictionData.fertileWindow) {
                isFertile = cellDate >= predictionData.fertileWindow.ferStartDate &&
                          cellDate <= predictionData.fertileWindow.ferEndDate;
            }
    
            // Update cell styling
            if (isToday) cell.classList.add('today');
            const indicators = cell.querySelector('.indicators');
            indicators.innerHTML = '';
    
            if (isPredictedPeriod) {
                const periodDot = document.createElement('span');
                periodDot.className = 'dot period';
                indicators.appendChild(periodDot);
            }
    
            if (isFertile) {
                const fertileDot = document.createElement('span');
                fertileDot.className = 'dot fertile';
                indicators.appendChild(fertileDot);
            }
    
            if (hasSymptoms) {
                const symptomDot = document.createElement('span');
                symptomDot.className = 'dot symptomsCell';
                indicators.appendChild(symptomDot);
            }
        });
    }

    async function showDayDetails(year, month, day) {
        const user = auth.currentUser;
        if (!user) return;
    
        const selectedDate = new Date(year, month, day);
        clickedDate = formatDateLocal(selectedDate);
    
        document.getElementById('selected-date').textContent = formatDateDDMMYYYY(selectedDate);
    
        // Fetch symptoms data
        const userData = await getUserData(user.uid);
        const querySnapshot = userData.gender === "Female" 
            ? await getSymptomsForDate(user.uid, clickedDate)
            : await getSymptomsForDate(userData.partner, clickedDate);
    
        if (!querySnapshot.empty) {
            const symptomsData = querySnapshot.docs[0].data();
            document.getElementById('dayEmotion').textContent = `Emotion: ${symptomsData.feeling || 'None'}`;
            document.getElementById('dayFlow').textContent = `Flow: ${symptomsData.flow || 'None'}`;
            document.getElementById('daySymptoms').textContent = `Symptoms: ${symptomsData.symptoms.join(', ') || 'None'}`;
            document.getElementById('symptoms-for-day').style.display = 'block';
        } else {
            document.getElementById('symptoms-for-day').style.display = 'none';
        }
    }

    // Event Listeners
    infoIcons.forEach(icon => {
        icon.addEventListener('click', (e) => {
            e.stopPropagation();
            const stat = icon.closest('.stat');
            stat.classList.toggle('active');
        });
    });

    document.addEventListener('click', () => {
        infoIcons.forEach(icon => {
            icon.closest('.stat').classList.remove('active');
        });
    });

    settingsBtn.addEventListener('click', () => {
        settingsSection.style.display = settingsSection.style.display === 'none' ? 'block' : 'none';
        document.getElementById('dash-data').style.display = 
            document.getElementById('dash-data').style.display === 'none' ? 'block' : 'none';
    });

    settingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const formData = {
            username: settingsUsername.value.trim(),
            gender: settingsGender.value,
            avgCycleLength: parseInt(settingsAvgCycleLength.value),
            avgPeriodLength: parseInt(settingsAvgPeriodLength.value)
        };

        if (!Object.values(formData).every(value => value)) {
            alert('Please fill all fields correctly');
            return;
        }

        try {
            await setUserData(user.uid, formData);
            alert('Settings updated successfully');
            settingsSection.style.display = 'none';
            updateUi();
        } catch (error) {
            alert('Error updating settings: ' + error.message);
        }
    });

    settingsBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const userData = await getUserData(user.uid);
        settingsUsername.value = userData.username || '';
        settingsGender.value = userData.gender || 'Female';
        settingsAvgCycleLength.value = userData.avgCycleLength || '';
        settingsAvgPeriodLength.value = userData.avgPeriodLength || '';
    });

    document.getElementById('edit-day-btn').addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user || !clickedDate) return;

        const querySnapshot = await getSymptomsForDate(user.uid, clickedDate);
        if (querySnapshot.empty) return alert("No symptoms logged for this day");

        const docRef = querySnapshot.docs[0].ref;
        const currentData = querySnapshot.docs[0].data();

        const newSymptoms = prompt("Edit symptoms (comma-separated):", currentData.symptoms.join(', '));
        const newFlow = prompt("Edit flow:", currentData.flow);
        const newFeeling = prompt("Edit feeling:", currentData.feeling);

        if (newSymptoms && newFlow && newFeeling) {
            await updateDoc(docRef, {
                symptoms: newSymptoms.split(',').map(s => s.trim()),
                flow: newFlow,
                feeling: newFeeling
            });
            showDayDetails(...clickedDate.split('-').map(Number));
        }
    });

    document.getElementById('delete-day-btn').addEventListener('click', async () => {
        if (!confirm("Are you sure you want to delete this day's data?")) return;
        
        const user = auth.currentUser;
        const querySnapshot = await getSymptomsForDate(user.uid, clickedDate);
        
        querySnapshot.docs.forEach(async doc => {
            await deleteDoc(doc.ref);
        });
        
        document.getElementById('symptoms-for-day').style.display = 'none';
        updateUi();
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
        const activeCycle = cycles.find(cycle => !cycle.endDate);

        if (activeCycle) return alert("There's already an active period");
        
        await addCycleData(user.uid, {
            startDate: clickedDate,
            endDate: null,
            timestamp: new Date()
        });
        
        alert(`Period started on ${formatDateDisplay(new Date(clickedDate))}`);
        updateUi();
    });

    endPeriodBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const cycles = await getCycleHistoryWithId(user.uid);
        const activeCycle = cycles.find(cycle => !cycle.endDate);

        if (!activeCycle) return alert("No active period to end");
        
        const cycleRef = doc(db, "users", user.uid, "cycles", activeCycle.id);
        await updateDoc(cycleRef, { endDate: clickedDate });
        
        alert(`Period ended on ${formatDateDisplay(new Date(clickedDate))}`);
        renderCycleHistory(await getCycleHistory(user.uid));
    });

    saveSymptomsBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;

        const symptoms = Array.from(document.querySelectorAll('input[name="symptoms"]:checked'))
                            .map(input => input.value);
        const flow = document.getElementById('flow').value;
        const feeling = document.getElementById('feeling').value;

        if (!symptoms.length || !flow) return alert('Please fill required fields');

        try {
            await addSymptomData(user.uid, {
                date: clickedDate,
                symptoms,
                flow,
                feeling,
                timestamp: new Date()
            });
            alert('Symptoms saved successfully');
            renderCalendar();
        } catch (error) {
            alert('Error saving symptoms: ' + error.message);
        }
    });

    sendInvitationBtn.addEventListener('click', async () => {
        const toEmail = shareEmailInput.value.trim();
        if (!toEmail) return alert('Please enter an email address');

        try {
            const emailExists = await checkEmailExists(toEmail);
            if (!emailExists) return alert("User doesn't exist");
            
            await sendInvitation(auth.currentUser.uid, toEmail);
            alert("Invitation sent successfully");
        } catch (error) {
            alert("Error sending invitation: " + error.message);
        }
    });
});