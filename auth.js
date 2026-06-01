// 🔥 REPLACE WITH YOUR FIREBASE CONFIG
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
const dashboard = document.getElementById('dashboard');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
// const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');
const userEmailSpan = document.getElementById('user-email');

// Login
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

// Register
// registerBtn.addEventListener('click', async () => {
//    const email = emailInput.value;
//    const password = passwordInput.value;


//    if (password.length < 6) {
//        authError.textContent = 'Password must be at least 6 characters';
//        return;
//    }


//    try {
//        await auth.createUserWithEmailAndPassword(email, password);
//        authError.textContent = '';
//    } catch (error) {
//        authError.textContent = error.message;
//    }
//});

// Logout
logoutBtn.addEventListener('click', () => {
    auth.signOut();
});

// Auth State Listener
auth.onAuthStateChanged((user) => {
    if (user) {
        loginScreen.style.display = 'none';
        dashboard.style.display = 'block';
        userEmailSpan.textContent = user.email;
        initDashboard(user);
    } else {
        loginScreen.style.display = 'flex';
        dashboard.style.display = 'none';
    }
});
