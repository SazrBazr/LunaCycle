// main.js
import { auth, db } from './firebaseConfig.js';
import { logout, checkEmailExists } from './auth.js';
import { getUserData, setUserData, checkSymptomsForDate, getSymptomsForDate, addCycleData, addSymptomData, getCycleHistory, getCycleHistoryWithId, getUserIdByEmail, sendInvitation, updateUserPartner, getSymptomsHistory } from './firestore.js';
import { showDashboard, renderCycleHistory, updateUi} from './ui.js';
import { predictNextPeriod, parseCycleDates,calculateAveragePeriodLength, calculateOvulationWindow } from './utils.js';
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
    // Add these utility functions at the top of your main.js
    function getLocalDate(date = new Date()) {
        // Creates a date without timezone offset issues
        return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }
    
    function formatDateLocal(date) {
        // Returns YYYY-MM-DD format for storage
        const localDate = getLocalDate(date);
        return [
        localDate.getFullYear(),
        String(localDate.getMonth() + 1).padStart(2, '0'),
        String(localDate.getDate()).padStart(2, '0')
        ].join('-');
    }
    
    function formatDateDDMMYYYY(date) {
        // For display purposes only
        const localDate = getLocalDate(date);
        return [
        String(localDate.getDate()).padStart(2, '0'),
        String(localDate.getMonth() + 1).padStart(2, '0'),
        localDate.getFullYear()
        ].join('.');
    }


    // Calendar rendering functions
    async function renderCalendar(year = null, month = null) {
        const calendar = document.getElementById('calendar');
        calendar.innerHTML = '';

        // Get dates in local timezone
        const today = getLocalDate();
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
            const cellDate = getLocalDate(new Date(currentYear, currentMonth, day));
            const isToday = cellDate.getTime() === today.getTime();
            const isFuture = cellDate > today;
        
            cell.className = `calendar-day ${isToday ? 'today' : ''} ${isFuture ? 'disabled' : ''}`;
            
            cell.innerHTML = `
              <span class="date">${day}</span>
              <div class="indicators"></div>
            `;
        
            cell.addEventListener('click', () => {
              if (!isFuture) {
                document.querySelectorAll('.calendar-day').forEach(c => c.classList.remove('active'));
                cell.classList.add('active');
                clickedDate = formatDateLocal(cellDate);
                showDayDetails(currentYear, currentMonth, day);
              }
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
        const today = getLocalDate();
    
        const cycles = userData.gender === "Female" 
            ? await getCycleHistory(user.uid) 
            : userData.partner ? await getCycleHistory(userData.partner) : [];
    
        // Parse cycle dates for predictions
        const parsedCycles = cycles.map(cycle => ({
            startDate: new Date(cycle.startDate),
            endDate: cycle.endDate ? new Date(cycle.endDate) : null
        }));
    
        let predictionData = {};
        if (parsedCycles.length > 0) {
            predictionData = {
                expectedPeriodStart: predictNextPeriod(parsedCycles),
                fertileWindow: calculateOvulationWindow(parsedCycles)
            };
        }
    
        // Process each calendar day
        document.querySelectorAll('.calendar-day').forEach(async (cell, index) => {
            const dayNumber = index + 1;
            const cellDate = getLocalDate(new Date(currentYear, currentMonth, dayNumber));
            
            // Skip invalid dates
            if (cellDate.getMonth() !== currentMonth) {
              cell.classList.add('invalid');
              return;
            }
        
            const cellDateFormatted = formatDateLocal(cellDate);
            const isToday = cellDate.getTime() === today.getTime();
            
            // Update today highlighting
            cell.classList.toggle('today', isToday);
            
            // Skip future dates
            if (cellDate > today) return;
    
            // Check symptoms
            const hasSymptoms = await checkSymptomsForDate(
                userData.gender === "Female" ? user.uid : userData.partner, 
                cellDateFormatted
            );
    
            // Add indicators
            if (hasSymptoms) {
                indicators.appendChild(createIndicatorDot('symptoms'));
            }
    
            // Add prediction indicators if available
            if (predictionData.expectedPeriodStart) {
                const periodStart = new Date(predictionData.expectedPeriodStart);
                const periodEnd = new Date(periodStart);
                periodEnd.setDate(periodStart.getDate() + calculateAveragePeriodLength(parsedCycles));
                
                if (cellDate >= periodStart && cellDate <= periodEnd) {
                    indicators.appendChild(createIndicatorDot('period'));
                }
            }
    
            if (predictionData.fertileWindow) {
                const ferStart = new Date(predictionData.fertileWindow.ferStartDate);
                const ferEnd = new Date(predictionData.fertileWindow.ferEndDate);
                
                if (cellDate >= ferStart && cellDate <= ferEnd) {
                    indicators.appendChild(createIndicatorDot('fertile'));
                }
            }
        });
    }
    
    // Helper function to create indicator dots
    function createIndicatorDot(type) {
        const dot = document.createElement('span');
        dot.className = `dot ${type}`;
        return dot;
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
      
        // Ensure clickedDate is properly formatted
        const startDate = formatDateLocal(new Date(clickedDate));
        
        await addCycleData(user.uid, {
          startDate: startDate,
          endDate: null,
          timestamp: new Date()
        });
        
        updateUi();
        renderCalendar();
    });

    endPeriodBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;
    
        const cycles = await getCycleHistoryWithId(user.uid);
        const activeCycle = cycles.find(cycle => !cycle.endDate);
    
        if (!activeCycle) return alert("No active period to end");
        
        await updateDoc(doc(db, "users", user.uid, "cycles", activeCycle.id), { 
            endDate: clickedDate // Already in YYYY-MM-DD format
        });
        
        updateUi();
        renderCalendar();
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