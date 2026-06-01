// Constants
const TOTAL_CHARGERS = 12;
const MAX_CHARGE_HOURS = 3;

let currentUser = null;

// Initialize Dashboard
function initDashboard(user) {
    currentUser = user;
    initializeChargers();
    listenToChargers();
    listenToQueue();
    setupQueueButtons();
}


// Custom charger names - EDIT THESE TO YOUR LIKING
const CHARGER_NAMES = {
    1: "Parking A1 - Ground Floor",
    2: "Parking A2 - Ground Floor",
    3: "Parking A3 - Ground Floor",
    4: "Parking B1 - Ground Floor",
    5: "Parking B2 - Ground Floor",
    6: "Parking B3 - Ground Floor",
    7: "Parking C1 - Level 1",
    8: "Parking C2 - Level 1",
    9: "Parking C3 - Level 1",
    10: "Parking D1 - Level 1",
    11: "Parking D2 - Level 1",
    12: "Parking D3 - Level 1"
};

// Initialize chargers in database (run once)
function initializeChargers() {
    const chargersRef = db.ref('chargers');
    chargersRef.once('value', (snapshot) => {
        if (!snapshot.exists()) {
            const chargers = {};
            for (let i = 1; i <= TOTAL_CHARGERS; i++) {
                chargers[`charger_${i}`] = {
                    id: i,
                    name: CHARGER_NAMES[i],
                    status: 'available',
                    user: null,
                    userEmail: null,
                    startTime: null
                };
            }
            chargersRef.set(chargers);
        }
    });
}

// Listen to real-time charger updates
function listenToChargers() {
    db.ref('chargers').on('value', (snapshot) => {
        const chargers = snapshot.val();
        renderChargers(chargers);
        updateStats(chargers);
    });
}

// Render charger cards
function renderChargers(chargers) {
    const grid = document.getElementById('charger-grid');
    grid.innerHTML = '';

    for (const key in chargers) {
        const charger = chargers[key];
        const card = document.createElement('div');
        card.className = `charger-card ${charger.status}`;

        const timeInfo = charger.startTime
            ? getTimeElapsed(charger.startTime)
            : '';

        const isMyCharger = charger.user === currentUser.uid;

        card.innerHTML = `
            <div class="charger-header">
                <span class="charger-name">${charger.name}</span>
                <span class="status-badge ${charger.status}">
                    ${charger.status === 'in-use' ? 'In Use' : charger.status === 'available' ? 'Available' : 'Out of Order'}
                </span>
            </div>
            <div class="charger-info">
                ${charger.status === 'in-use' ? `
                    <p>👤 ${charger.userEmail || 'Unknown'}</p>
                    <p>⏱️ Started: ${timeInfo}</p>
                ` : '<p>Ready to use</p>'}
            </div>
            ${charger.status === 'available' ? `
                <button class="start-btn" onclick="startCharging('${key}')">
                    ⚡ Start Charging
                </button>
            ` : ''}
            ${charger.status === 'in-use' && isMyCharger ? `
                <button class="stop-btn" onclick="stopCharging('${key}')">
                    ✋ Stop Charging
                </button>
            ` : ''}
        `;

        grid.appendChild(card);
    }
}

// Start charging
async function startCharging(chargerKey) {
    // Check if user is already charging somewhere
    const snapshot = await db.ref('chargers').once('value');
    const chargers = snapshot.val();

    for (const key in chargers) {
        if (chargers[key].user === currentUser.uid) {
            alert('You are already using a charger! Please stop your current session first.');
            return;
        }
    }

    // Remove from queue if in queue
    await removeFromQueue(currentUser.uid);

    // Start charging
    await db.ref(`chargers/${chargerKey}`).update({
        status: 'in-use',
        user: currentUser.uid,
        userEmail: currentUser.email,
        startTime: Date.now()
    });
}

// Stop charging
// Stop charging
async function stopCharging(chargerKey) {
    // Get charger info for history
    const snap = await db.ref(`chargers/${chargerKey}`).once('value');
    const charger = snap.val();

    // Save to history
    if (charger.user) {
        await db.ref('history').push({
            userId: charger.user,
            userEmail: charger.userEmail,
            chargerKey: chargerKey,
            chargerName: charger.name,
            startTime: charger.startTime,
            endTime: Date.now(),
            forceStopped: false
        });
    }

    // Reset charger
    await db.ref(`chargers/${chargerKey}`).update({
        status: 'available',
        user: null,
        userEmail: null,
        startTime: null
    });

    // Notify next person in queue
    notifyNextInQueue();
}

// Update stats
function updateStats(chargers) {
    let available = 0;
    let inUse = 0;

    for (const key in chargers) {
        if (chargers[key].status === 'available') available++;
        if (chargers[key].status === 'in-use') inUse++;
    }

    document.getElementById('available-count').textContent = available;
    document.getElementById('in-use-count').textContent = inUse;
}

// Time elapsed helper
function getTimeElapsed(startTime) {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
        return `${hours}h ${minutes % 60}m ago`;
    }
    return `${minutes}m ago`;
}

// ===== QUEUE SYSTEM =====

function setupQueueButtons() {
    document.getElementById('join-queue-btn').addEventListener('click', joinQueue);
    document.getElementById('leave-queue-btn').addEventListener('click', () => {
        removeFromQueue(currentUser.uid);
    });
}

async function joinQueue() {
    // Check if already charging
    const chargerSnap = await db.ref('chargers').once('value');
    const chargers = chargerSnap.val();
    for (const key in chargers) {
        if (chargers[key].user === currentUser.uid) {
            alert('You are already charging!');
            return;
        }
    }

    // Check if already in queue
    const queueSnap = await db.ref('queue').once('value');
    const queue = queueSnap.val() || {};
    for (const key in queue) {
        if (queue[key].userId === currentUser.uid) {
            alert('You are already in the queue!');
            return;
        }
    }

    // Add to queue
    await db.ref('queue').push({
        userId: currentUser.uid,
        email: currentUser.email,
        joinedAt: Date.now()
    });
}

async function removeFromQueue(userId) {
    const snapshot = await db.ref('queue').once('value');
    const queue = snapshot.val() || {};

    for (const key in queue) {
        if (queue[key].userId === userId) {
            await db.ref(`queue/${key}`).remove();
            break;
        }
    }
}

function listenToQueue() {
    db.ref('queue').orderByChild('joinedAt').on('value', (snapshot) => {
        const queue = snapshot.val() || {};
        const queueList = document.getElementById('queue-list');
        const queueCountEl = document.getElementById('queue-count');

        const entries = Object.values(queue).sort((a, b) => a.joinedAt - b.joinedAt);
        queueCountEl.textContent = entries.length;

        // Show/hide buttons
        const isInQueue = entries.some(e => e.userId === currentUser.uid);
        document.getElementById('join-queue-btn').style.display = isInQueue ? 'none' : 'inline-block';
        document.getElementById('leave-queue-btn').style.display = isInQueue ? 'inline-block' : 'none';

        // Render queue
        queueList.innerHTML = '';
        entries.forEach((entry, index) => {
            const item = document.createElement('div');
            item.className = 'queue-item';
            item.innerHTML = `
                <span class="queue-position">#${index + 1}</span>
                <span>${entry.email}</span>
                <span>${getTimeElapsed(entry.joinedAt)} in queue</span>
            `;
            queueList.appendChild(item);
        });
    });
}

// Notify next in queue (simplified - stores notification in DB)
async function notifyNextInQueue() {
    const snapshot = await db.ref('queue').orderByChild('joinedAt').limitToFirst(1).once('value');
    const queue = snapshot.val();

    if (queue) {
        const firstKey = Object.keys(queue)[0];
        const nextUser = queue[firstKey];

        // Store notification
        await db.ref('notifications').push({
            userId: nextUser.userId,
            email: nextUser.email,
            message: 'A charger is now available! Please start your session within 10 minutes.',
            timestamp: Date.now(),
            read: false
        });

        // In Phase 2, this is where we'd trigger Teams/Email/WhatsApp
        console.log(`Notification: ${nextUser.email} - A charger is available!`);
    }
}

// Auto-check for overtime sessions (every minute)
setInterval(async () => {
    const snapshot = await db.ref('chargers').once('value');
    const chargers = snapshot.val();

    for (const key in chargers) {
        if (chargers[key].status === 'in-use' && chargers[key].startTime) {
            const hoursElapsed = (Date.now() - chargers[key].startTime) / 3600000;
            if (hoursElapsed >= MAX_CHARGE_HOURS) {
                // Store overtime notification
                await db.ref('notifications').push({
                    userId: chargers[key].user,
                    email: chargers[key].userEmail,
                    message: `Your charging session on ${chargers[key].name} has exceeded ${MAX_CHARGE_HOURS} hours. Please move your car.`,
                    timestamp: Date.now(),
                    read: false
                });
            }
        }
    }
}, 60000); // Check every minute
// ===== MAP MODAL =====
function openMapModal() {
    document.getElementById('map-modal').style.display = 'flex';
}

function closeMapModal() {
    document.getElementById('map-modal').style.display = 'none';
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('map-modal');
    if (e.target === modal) {
        closeMapModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeMapModal();
    }
});
