import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, set, update, onValue, get } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

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

signInAnonymously(auth)
  .then(() => console.log('Signed in anonymously'))
  .catch((error) => console.error(`Error signing in: ${error.code}, ${error.message}`));

onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log(`User ID: ${user.uid}`);
  } else {
    console.log('User is signed out');
  }
});

let currentRoom = null;
let isPlayer1 = false;
let isComputer = false;
let playerName = '';
let timer = null;
let player1Score = 0;
let player2Score = 0;

window.startMultiplayer = function () {
  document.getElementById('container').style.display = 'none';
  document.getElementById('multiplayerOptions').style.display = 'block';
}

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

window.submitName = function () {
  playerName = document.getElementById('nameInput').value;
  if (playerName.trim() === '') {
    alert('Please enter your name.');
    return;
  }
  document.getElementById('nameInput').style.display = 'none';
}

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
        update(roomRef, { player1Run: null, target: (data.target || 0) + player1Run });
        document.getElementById('game').innerText += `\nYou scored ${player1Run} run(s).`;
      } else {
        player2Score += player2Run;
        update(roomRef, { player2Run: null, target: (data.target || 0) + player2Run });
        document.getElementById('game').innerText += `\nYou scored ${player2Run} run(s).`;
      }
    }
    updateScores();
    if (isComputer) {
      playTurnWithComputer(player1Run);
    }
  });
}

function playTurnWithComputer(playerRun) {
  const computerRun = Math.floor(Math.random() * 6) + 1;
  document.getElementById('game').innerText = `You: ${playerRun} - Computer: ${computerRun}`;
  if (playerRun === computerRun) {
    document.getElementById('game').innerText += '\nYou are out!';
  } else {
    player1Score += playerRun;
    updateScores();
    document.getElementById('game').innerText += `\nYou scored ${playerRun} run(s).`;
    startTimer();
  }
}

function updateScores() {
  document.getElementById('scores').innerText = `Player 1: ${player1Score} - Player 2: ${player2Score}`;
}

function generateRoomCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function displayWaitingForOtherPlayer() {
  const roomRef = ref(database, `rooms/${currentRoom}`);
  onValue(roomRef, (snapshot) => {
    const data = snapshot.val();
    if (data.player1 && data.player2) {
      document.getElementById('game').innerText = `Player 2 joined: ${data.player2.name}. Game starting...`;
      document.getElementById('runButtons').style.display = 'block';
    }
  });
}

window.goBack = function (page) {
  document.getElementById('container').style.display = 'none';
  document.getElementById('multiplayerOptions').style.display = 'none';
  document.getElementById('gameArea').style.display = 'none';
  document.getElementById(page).style.display = 'block';
}
