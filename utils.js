// utils.js
import { crossbrowserName } from './constants.js';

export function determineBrowser() {
    console.log('Running on:', crossbrowserName);
}

export function predictNextPeriod(cycles) {
    console.log("Cycles in predictNextPeriod:", cycles); // Log cycles
    if (cycles.length < 2) {
        return -1;
    }

    const averageCycleLength = calculateCycleLength(cycles);
    const lastPeriodEnd = new Date(cycles[0].endDate);

    if (cycles[0].endDate === null || lastPeriodEnd === null) {
        return 0;
    }

    const nextPeriodStart = new Date(lastPeriodEnd);
    nextPeriodStart.setDate(lastPeriodEnd.getDate() + averageCycleLength);
    const currentDate = new Date();
    const diffTime = Math.abs(nextPeriodStart - currentDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

export function calculateCycleStats(cycles) {
    if (cycles.length < 2) {
        return {
            avgCycleLength: "Not enough data",
            avgPeriodLength: "Not enough data",
            ovulationWindow: "Not enough data",
            fertileDays: "Not enough data"
        };
    }

    const avgCycleLength = calculateCycleLength(cycles);
    const avgPeriodLength = calculateAveragePeriodLength(cycles);
    const ovulationDay = Math.round(avgCycleLength - 14);
    const ovulationWindow = `Day ${ovulationDay - 2} to Day ${ovulationDay + 2}`;
    const fertileDays = `Day ${ovulationDay - 5} to Day ${ovulationDay + 1}`;

    return {
        avgCycleLength: `${avgCycleLength} days`,
        avgPeriodLength: `${avgPeriodLength} days`,
        ovulationWindow,
        fertileDays
    };
}

export function calculateOvulationWindow(cycles){
    // Predict next period start date
    const nextPeriodStartDate = new Date();
    nextPeriodStartDate.setDate(new Date().getDate() + predictNextPeriod(cycles));

    // Calculate ovulation date (typically 14 days before next period)
    const ovulationDate = new Date(nextPeriodStartDate);
    ovulationDate.setDate(nextPeriodStartDate.getDate() - 14);

    // Calculate ovulation window (2 days before and after ovulation)
    const ovulationWindowStartDate = new Date(ovulationDate);
    const ovulationWindowEndDate = new Date(ovulationDate);
    ovulationWindowStartDate.setDate(ovulationDate.getDate() - 2);
    ovulationWindowEndDate.setDate(ovulationDate.getDate() + 2);

    // Calculate fertile window (5 days before ovulation and 1 day after)
    const fertileWindowStartDate = new Date(ovulationDate);
    const fertileWindowEndDate = new Date(ovulationDate);
    fertileWindowStartDate.setDate(ovulationDate.getDate() - 5);
    fertileWindowEndDate.setDate(ovulationDate.getDate() + 1);

    return{
        ovStartDate: ovulationWindowStartDate,
        ovEndDate: ovulationWindowEndDate,
        ferStartDate: fertileWindowStartDate,
        ferEndDate: fertileWindowEndDate
    };
}

export function calculateCycleLength(cycles) {
    if (cycles.length < 2) {
        return "Not enough data to calculate cycle length.";
    }

    let totalDays = 0;
    for (let i = 0; i < cycles.length - 1; i++) {
        const endDate1 = new Date(cycles[i].startDate);
        const startDate2 = new Date(cycles[i + 1].startDate);
        const diffTime = Math.abs(startDate2 - endDate1);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        totalDays += diffDays;
    }

    return Math.round(totalDays / (cycles.length - 1)) - 1;
}

export function calculateAveragePeriodLength(cycles) {
    if (cycles.length === 0) {
        return "Not enough data to calculate average period length.";
    }

    let totalDays = 0;


    if(cycles[0].endDate === null){
        for(let i = 1; i < cycles.length; i++){
            const startDate = new Date(cycles[i].startDate);
            const endDate = new Date(cycles[i].endDate);
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            totalDays += diffDays + 1;
        }
        return Math.round(totalDays / (cycles.length - 1));
    }
    else{
        for (const cycle of cycles) {
            const startDate = new Date(cycle.startDate);
            const endDate = new Date(cycle.endDate);
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            totalDays += diffDays + 1;
        }
        return Math.round(totalDays / cycles.length);
    }
}

export function getRecentSymptoms(symptoms){
    
}

export function getCurrentCyclePhase(cycles) {
    if (cycles.length < 1) {
        return "Not enough data to determine cycle phase.";
    }

    const lastPeriodEnd = new Date(cycles[0].endDate);
    const currentDate = new Date();
    const daysSinceLastPeriod = Math.floor((currentDate - lastPeriodEnd) / (1000 * 60 * 60 * 24));

    const averageCycleLength = parseInt(calculateCycleLength(cycles));

    if (daysSinceLastPeriod < 0) {
        return "unknown"; // Invalid data
    } else if (daysSinceLastPeriod <= 5) {
        return "menstrual";
    } else if (daysSinceLastPeriod <= 14) {
        return "follicular";
    } else if (daysSinceLastPeriod <= 16) {
        return "ovulation";
    } else if (daysSinceLastPeriod <= averageCycleLength) {
        return "luteal";
    } else {
        return "unknown"; // Outside the cycle range
    }
}

export function getNutritionTips(cyclePhase) {
    const nutritionTips = {
        follicular: [
            "Focus on iron-rich foods like spinach, lentils, and lean red meat.",
            "Add vitamin C-rich foods (oranges, bell peppers) to enhance iron absorption.",
            "Incorporate whole grains like quinoa and oats for energy.",
            "Include probiotic-rich foods like yogurt and kefir for gut health.",
            "Start introducing complex carbohydrates to support energy levels."
        ],
        ovulation: [
            "Increase intake of omega-3 fatty acids (salmon, chia seeds, walnuts).",
            "Add antioxidant-rich foods like berries and dark leafy greens.",
            "Include zinc sources like pumpkin seeds and chickpeas.",
            "Stay hydrated with water and herbal teas.",
            "Focus on fiber-rich foods like vegetables and whole grains."
        ],
        luteal: [
            "Eat magnesium-rich foods like almonds, spinach, and dark chocolate.",
            "Include complex carbs like sweet potatoes and brown rice for stable energy.",
            "Boost vitamin B6 with foods like bananas, sunflower seeds, and poultry.",
            "Reduce bloating with potassium-rich foods like avocados and coconut water.",
            "Incorporate calming herbal teas like chamomile or peppermint."
        ],
        menstrual: [
            "Replenish iron with foods like red meat, lentils, and fortified cereals.",
            "Increase calcium intake with yogurt, leafy greens, or fortified plant milk.",
            "Add vitamin E sources like almonds, sunflower seeds, and spinach.",
            "Include anti-inflammatory foods like ginger, turmeric, and fatty fish.",
            "Stay hydrated with warm liquids like herbal teas and broths."
        ]
    };

    return nutritionTips[cyclePhase.toLowerCase()] || ["Maintain a balanced diet with whole foods, lean proteins, and plenty of vegetables."];
}