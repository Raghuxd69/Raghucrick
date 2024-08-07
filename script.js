import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, set, update, onValue, get } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBjpFuQ0Mg9KnthmToMXMw_c0tXIBY2rKo",
    authDomain: "mycrick88497.firebaseapp.com",
    databaseURL: "https://mycrick88497-default-rtdb.firebaseio.com",
    projectId: "mycrick88497",
    storageBucket: "mycrick88497.appspot.com",
    messagingSenderId: "731647894608",
    appId: "1:731647894608:web:3a9267b6b77074a95f9d55",
    measurementId: "G-RDSDMX8ZZ9"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const database = getDatabase(app);

let currentRoom = null;
let isPlayer1 = false;
let isComputer = false;
let playerName = '';
let timer = null;
let player1Score = 0;
let player2Score = 0;

// Sign in anonymously
signInAnonymously(auth)
    .then(() => console.log('Signed in anonymously'))
    .catch((error) => console.error(`Error signing in: ${error.code}, ${error.message}`));

// Check authentication state
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log(`User ID: ${user.uid}`);
    } else {
        console.log('User is signed out');
    }
});

// Handle name submission
window.submitName = function () {
    playerName = document.getElementById('nameInput').value;
    if (playerName.trim() === '') {
        alert('Please enter your name.');
        return;
    }
    document.getElementById('nameInput').style.display = 'none';
    document.getElementById('container').style.display = 'none';
    document.getElementById('multiplayerOptions').style.display = 'block';
}

// Start multiplayer game
window.startMultiplayer = function () {
    document.getElementById('container').style.display = 'none';
    document.getElementById('multiplayerOptions').style.display = 'block';
}

// Start game against computer
window.startComputer = function () {
    currentRoom = 'computer';
    isPlayer1 = true;
    isComputer = true;
    document.getElementById('container').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('game').innerText = 'Playing against the computer. You bat first.';
    document.getElementById('runButtons').style.display = 'block';
    updateScores();
}

// Create a new room
window.createRoom = function () {
    const room = generateRoomCode();
    const roomRef = ref(database, `rooms/${room}`);

    set(roomRef, {
        player1: {
            name: playerName,
            score: 0
        },
        player2: null,
        target: null,
        player1Run: null,
        player2Run: null
    }).then(() => {
        currentRoom = room;
        isPlayer1 = true;
        document.getElementById('multiplayerOptions').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
        document.getElementById('game').innerText = `Room ${room} created. Waiting for another player...`;
        displayWaitingForOtherPlayer();
    });
}

// Join an existing room
window.joinRoom = function () {
    const room = document.getElementById('roomInput').value;
    const roomRef = ref(database, `rooms/${room}`);

    get(roomRef).then(snapshot => {
        if (snapshot.exists() && !snapshot.val().player2) {
            update(roomRef, {
                player2: {
                    name: playerName,
                    score: 0
                }
            }).then(() => {
                currentRoom = room;
                isPlayer1 = false;
                document.getElementById('multiplayerOptions').style.display = 'none';
                document.getElementById('gameArea').style.display = 'block';
                document.getElementById('game').innerText = `Joined room ${room}. Waiting for the game to start...`;
                displayWaitingForOtherPlayer();
            });
        } else {
            document.getElementById('game').innerText = `Room ${room} is not available or already has two players.`;
        }
    });
}

// Submit run value
window.submitRun = function (run) {
    if (run < 1 || run > 6) {
        alert('Enter a valid run between 1 and 6');
        return;
    }

    const roomRef = ref(database, `rooms/${currentRoom}`);
    if (isComputer) {
        playTurnWithComputer(run);
    } else {
        if (isPlayer1) {
            update(roomRef, { player1Run: run });
        } else {
            update(roomRef, { player2Run: run });
        }
    }

    startTimer();
}

// Start the timer
function startTimer() {
    document.getElementById('timer').style.display = 'block';
    let timeLeft = 3;
    document.getElementById('timer').innerText = `Time left: ${timeLeft} seconds`;

    timer = setInterval(() => {
        timeLeft -= 1;
        document.getElementById('timer').innerText = `Time left: ${timeLeft} seconds`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            document.getElementById('timer').style.display = 'none';
            processTurns();
        }
    }, 1000);
}

// Process player turns
function processTurns() {
    const roomRef = ref(database, `rooms/${currentRoom}`);
    get(roomRef).then(snapshot => {
        const data = snapshot.val();
        const player1Run = data.player1Run;
        const player2Run = data.player2Run;

        if (player1Run === player2Run) {
            if (isPlayer1) {
                document.getElementById('game').innerText += '\nYou are out!';
                update(roomRef, { player1Run: null });
                player1Score = 0;
            } else {
                document.getElementById('game').innerText += '\nYou are out!';
                update(roomRef, { player2Run: null });
                player2Score = 0;
            }
        } else {
            if (isPlayer1) {
                player1Score += player1Run;
                update(roomRef, { player1Score: player1Score });
                document.getElementById('game').innerText = `You scored ${player1Run}. Your total score: ${player1Score}`;
            } else {
                player2Score += player2Run;
                update(roomRef, { player2Score: player2Score });
                document.getElementById('game').innerText = `Opponent scored ${player2Run}. Opponent total score: ${player2Score}`;
            }
        }

        updateScores();
    });
}

// Display waiting for another player message
function displayWaitingForOtherPlayer() {
    const roomRef = ref(database, `rooms/${currentRoom}`);
    onValue(roomRef, snapshot => {
        const data = snapshot.val();
        if (data.player2 && data.player2.name) {
            document.getElementById('game').innerText = `Player 2 (${data.player2.name}) has joined. Ready to start!`;
        }
    });
}

// Generate a random room code
function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Play a turn with the computer
function playTurnWithComputer(run) {
    const computerRun = Math.floor(Math.random() * 6) + 1;
    if (run === computerRun) {
        document.getElementById('game').innerText = `You are out! Computer scored ${computerRun}`;
        player1Score = 0;
    } else {
        player1Score += run;
        document.getElementById('game').innerText = `You scored ${run}. Computer scored ${computerRun}. Your total score: ${player1Score}`;
    }
}

// Update scores display
function updateScores() {
    if (currentRoom === 'computer') {
        document.getElementById('scores').innerText = `Your Score: ${player1Score}`;
    } else {
        const roomRef = ref(database, `rooms/${currentRoom}`);
        get(roomRef).then(snapshot => {
            const data = snapshot.val();
            document.getElementById('scores').innerText = `Player 1 Score: ${data.player1Score || 0}\nPlayer 2 Score: ${data.player2Score || 0}`;
        });
    }
}

// Go back to the previous page
window.goBack = function (page) {
    document.getElementById('container').style.display = page === 'home' ? 'block' : 'none';
    document.getElementById('multiplayerOptions').
      // Go back to the previous page
window.goBack = function (page) {
    document.getElementById('container').style.display = page === 'home' ? 'block' : 'none';
    document.getElementById('multiplayerOptions').style.display = page === 'multiplayer' ? 'block' : 'none';
    document.getElementById('gameArea').style.display = page === 'game' ? 'block' : 'none';
}

// Initialize game elements
function initializeGame() {
    document.getElementById('container').style.display = 'block';
    document.getElementById('multiplayerOptions').style.display = 'none';
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('timer').style.display = 'none';
    document.getElementById('runButtons').style.display = 'none';
    document.getElementById('scores').innerText = '';
}

// Set up the initial page
initializeGame();
