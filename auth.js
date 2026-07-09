// Firebase Configuration
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "office-charger-system.firebaseapp.com",
    databaseURL: "https://office-charger-system-default-rtdb.firebaseio.com",
    projectId: "office-charger-system",
    storageBucket: "office-charger-system.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
// Login
document.getElementById('login-btn').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            document.getElementById('user-email').textContent = userCredential.user.email;
            initDashboard(userCredential.user);
        })
        .catch((error) => {
            document.getElementById('auth-error').textContent = error.message;
        });
});
// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut().then(() => {
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('login-screen').style.display = 'flex';
    });
});
// Auto-login if session exists
auth.onAuthStateChanged((user) => {
    if (user) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('dashboard').style.display = 'block';
        document.getElementById('user-email').textContent = user.email;
        initDashboard(user);
    }
});
