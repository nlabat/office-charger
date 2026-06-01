// 🔥 SAME FIREBASE CONFIG AS auth.js
const firebaseConfig = {
    apiKey: "AIzaSyAzoOCUHaQ9Q0YtKIgx4V-GLT4Lh2RWTCk",
    authDomain: "office-charger-system.firebaseapp.com",
    databaseURL: "https://office-charger-system-default-rtdb.firebaseio.com",
    projectId: "office-charger-system",
    storageBucket: "office-charger-system.firebasestorage.app",
    messagingSenderId: "443745620284",
    appId: "1:443745620284:web:54d41c3f9a0af798cb8e39"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const adminDashboard = document.getElementById('admin-dashboard');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');
const userEmailSpan = document.getElementById('user-email');

let currentUser = null;

// ===== AUTHENTICATION =====

loginBtn.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
        authError.textContent = '';
    } catch (error) {
        authError.textContent = error.message;
    }
});

logoutBtn.addEventListener('click', () => auth.signOut());

auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Check if user is admin
        const adminSnap = await db.ref(`admins/${user.uid}`).once('value');
        if (adminSnap.exists()) {
            currentUser = user;
            loginScreen.style.display = 'none';
            adminDashboard.style.display = 'block';
            userEmailSpan.textContent = user.email;
            initAdmin();
        } else {
            authError.textContent = '❌ You are not an admin. Access denied.';
            auth.signOut();
        }
    } else {
        loginScreen.style.display = 'flex';
        adminDashboard.style.display = 'none';
    }
});

// ===== TABS =====

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
}

// ===== INIT ADMIN =====

function initAdmin() {
    listenToChargers();
    listenToQueue();
    listenToHistory();
    listenToAdmins();
    loadSettings();
}

// ===== CHARGER MANAGEMENT =====

function listenToChargers() {
    db.ref('chargers').on('value', (snapshot) => {
        const chargers = snapshot.val();
        renderAdminChargers(chargers);
        updateAdminStats(chargers);
    });
}

function renderAdminChargers(chargers) {
    const grid = document.getElementById('admin-charger-grid');
    grid.innerHTML = '';

    for (const key in chargers) {
        const charger = chargers[key];
        const card = document.createElement('div');
        card.className = `admin-charger-card ${charger.status}`;

        const timeInfo = charger.startTime ? getTimeElapsed(charger.startTime) : '';

        card.innerHTML = `
            <h3>${charger.name}</h3>
            <div class="info">
                <p>Status: <strong>${charger.status.toUpperCase()}</strong></p>
                ${charger.status === 'in-use' ? `
                    <p>User: ${charger.userEmail || 'Unknown'}</p>
                    <p>Started: ${timeInfo}</p>
                ` : ''}
            </div>
            <div class="admin-card-actions">
                ${charger.status === 'in-use' ? `
                    <button class="btn-free" onclick="forceStopCharging('${key}')">✋ Force Stop</button>
                ` : ''}
                ${charger.status === 'available' ? `
                    <button class="btn-disable" onclick="markOutOfOrder('${key}')">🚫 Mark Out of Order</button>
                ` : ''}
                ${charger.status === 'out-of-order' ? `
                    <button class="btn-enable" onclick="markAvailable('${key}')">✅ Mark Available</button>
                ` : ''}
            </div>
        `;

        grid.appendChild(card);
    }
}

function updateAdminStats(chargers) {
    let available = 0, inUse = 0, outOfOrder = 0;

    for (const key in chargers) {
        if (chargers[key].status === 'available') available++;
        if (chargers[key].status === 'in-use') inUse++;
        if (chargers[key].status === 'out-of-order') outOfOrder++;
    }

    document.getElementById('available-count').textContent = available;
    document.getElementById('in-use-count').textContent = inUse;
    document.getElementById('out-of-order-count').textContent = outOfOrder;
}

async function forceStopCharging(chargerKey) {
    if (!confirm('Are you sure you want to force stop this session?')) return;

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
            forceStopped: true,
            stoppedBy: currentUser.email
        });
    }

    // Reset charger
    await db.ref(`chargers/${chargerKey}`).update({
        status: 'available',
        user: null,
        userEmail: null,
        startTime: null
    });
}

async function markOutOfOrder(chargerKey) {
    if (!confirm('Mark this charger as out of order?')) return;

    await db.ref(`chargers/${chargerKey}`).update({
        status: 'out-of-order',
        user: null,
        userEmail: null,
        startTime: null
    });
}

async function markAvailable(chargerKey) {
    await db.ref(`chargers/${chargerKey}`).update({
        status: 'available',
        user: null,
        userEmail: null,
        startTime: null
    });
}

async function resetAllChargers() {
    if (!confirm('⚠️ This will reset ALL chargers to available and clear all sessions. Are you sure?')) return;
    if (!confirm('⚠️ FINAL WARNING: This cannot be undone. Continue?')) return;

    const snapshot = await db.ref('chargers').once('value');
    const chargers = snapshot.val();

    for (const key in chargers) {
        await db.ref(`chargers/${key}`).update({
            status: 'available',
            user: null,
            userEmail: null,
            startTime: null
        });
    }

    alert('All chargers have been reset.');
}

// ===== QUEUE MANAGEMENT =====

function listenToQueue() {
    db.ref('queue').orderByChild('joinedAt').on('value', (snapshot) => {
        const queue = snapshot.val() || {};
        const entries = Object.entries(queue).sort((a, b) => a[1].joinedAt - b[1].joinedAt);

        document.getElementById('queue-count').textContent = entries.length;

        const list = document.getElementById('admin-queue-list');
        list.innerHTML = '';

        if (entries.length === 0) {
            list.innerHTML = '<p style="color: #aaa;">Queue is empty</p>';
            return;
        }

        entries.forEach(([key, entry], index) => {
            const item = document.createElement('div');
            item.className = 'admin-queue-item';
            item.innerHTML = `
                <div>
                    <strong>#${index + 1}</strong> — ${entry.email}
                    <span style="color:#aaa; margin-left:10px;">(${getTimeElapsed(entry.joinedAt)} in queue)</span>
                </div>
                <button onclick="removeFromQueue('${key}')">Remove</button>
            `;
            list.appendChild(item);
        });
    });
}

async function removeFromQueue(key) {
    await db.ref(`queue/${key}`).remove();
}

async function clearQueue() {
    if (!confirm('Clear the entire queue? All waiting users will be removed.')) return;
    await db.ref('queue').remove();
}

// ===== HISTORY =====

function listenToHistory() {
    db.ref('history').orderByChild('endTime').limitToLast(50).on('value', (snapshot) => {
        const history = snapshot.val() || {};
        const entries = Object.values(history).sort((a, b) => b.endTime - a.endTime);
        renderHistory(entries);
    });
}

function renderHistory(entries) {
    const tbody = document.getElementById('history-tbody');
    tbody.innerHTML = '';

    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="color:#aaa; text-align:center;">No history yet</td></tr>';
        return;
    }

    entries.forEach(entry => {
        const row = document.createElement('tr');
        const duration = entry.endTime - entry.startTime;
        const durationMin = Math.floor(duration / 60000);
        const hours = Math.floor(durationMin / 60);
        const mins = durationMin % 60;

        row.innerHTML = `
            <td>${entry.userEmail}${entry.forceStopped ? ' ⚠️' : ''}</td>
            <td>${entry.chargerName || entry.chargerKey}</td>
            <td>${new Date(entry.startTime).toLocaleString()}</td>
            <td>${new Date(entry.endTime).toLocaleString()}</td>
            <td>${hours > 0 ? hours + 'h ' : ''}${mins}m</td>
        `;
        tbody.appendChild(row);
    });
}

function filterHistory() {
    const dateInput = document.getElementById('history-date').value;
    if (!dateInput) return;

    const startOfDay = new Date(dateInput).getTime();
    const endOfDay = startOfDay + 86400000;

    db.ref('history').orderByChild('startTime')
        .startAt(startOfDay).endAt(endOfDay)
        .once('value', (snapshot) => {
            const history = snapshot.val() || {};
            const entries = Object.values(history).sort((a, b) => b.endTime - a.endTime);
            renderHistory(entries);
        });
}

function exportHistory() {
    db.ref('history').once('value', (snapshot) => {
        const history = snapshot.val() || {};
        const entries = Object.values(history).sort((a, b) => b.endTime - a.endTime);

        let csv = 'User,Charger,Start Time,End Time,Duration (min),Force Stopped\n';
        entries.forEach(entry => {
            const duration = Math.floor((entry.endTime - entry.startTime) / 60000);
            csv += `${entry.userEmail},${entry.chargerName || entry.chargerKey},${new Date(entry.startTime).toLocaleString()},${new Date(entry.endTime).toLocaleString()},${duration},${entry.forceStopped ? 'Yes' : 'No'}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'charger_history.csv';
        a.click();
    });
}

async function clearHistory() {
    if (!confirm('Delete all history? This cannot be undone.')) return;
    await db.ref('history').remove();
}

// ===== SETTINGS =====

function loadSettings() {
    // Load max hours
    db.ref('settings/maxHours').once('value', (snapshot) => {
        const maxHours = snapshot.val() || 3;
        document.getElementById('max-hours').value = maxHours;
    });

    // Load charger names for renaming
    db.ref('chargers').once('value', (snapshot) => {
        const chargers = snapshot.val() || {};
        const container = document.getElementById('rename-chargers-list');
        container.innerHTML = '';

        for (const key in chargers) {
            const item = document.createElement('div');
            item.className = 'rename-item';
            item.innerHTML = `
                <label>Charger ${chargers[key].id}:</label>
                <input type="text" id="rename-${key}" value="${chargers[key].name}" />
            `;
            container.appendChild(item);
        }
    });
}

async function saveMaxHours() {
    const hours = parseInt(document.getElementById('max-hours').value);
    if (hours < 1 || hours > 12) {
        alert('Please enter a value between 1 and 12');
        return;
    }
    await db.ref('settings/maxHours').set(hours);
    alert('Max hours saved!');
}

async function saveChargerNames() {
    const snapshot = await db.ref('chargers').once('value');
    const chargers = snapshot.val() || {};

    for (const key in chargers) {
        const input = document.getElementById(`rename-${key}`);
        if (input) {
            await db.ref(`chargers/${key}/name`).set(input.value);
        }
    }
    alert('Charger names saved!');
}

// ===== ADMIN MANAGEMENT =====

function listenToAdmins() {
    db.ref('admins').on('value', (snapshot) => {
        const admins = snapshot.val() || {};
        const list = document.getElementById('admin-list');
        list.innerHTML = '';

        // Count total users
        db.ref('users').once('value', (userSnap) => {
            const users = userSnap.val() || {};
            document.getElementById('total-users-count').textContent = Object.keys(users).length;
        });

        for (const uid in admins) {
            const item = document.createElement('div');
            item.className = 'admin-item';
            item.innerHTML = `
                <span>${admins[uid].email}</span>
                ${uid !== currentUser.uid ? `<button onclick="removeAdmin('${uid}')">Remove</button>` : '<span style="color:#4CAF50;">(You)</span>'}
            `;
            list.appendChild(item);
        }
    });
}

async function addAdmin() {
    const email = document.getElementById('new-admin-email').value.trim();
    if (!email) {
        alert('Please enter an email');
        return;
    }

    // We'll store by a generated key since we might not have the UID
    // Better approach: store admin emails and check on login
    await db.ref('adminEmails').push({ email: email });

    // Also check if user exists and add by UID
    alert(`Admin added: ${email}\nThey will have admin access on next login.`);
    document.getElementById('new-admin-email').value = '';
}

async function removeAdmin(uid) {
    if (!confirm('Remove this admin?')) return;
    await db.ref(`admins/${uid}`).remove();
}

// ===== HELPERS =====

function getTimeElapsed(startTime) {
    const elapsed = Date.now() - startTime;
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m ago`;
    return `${minutes}m ago`;
}
