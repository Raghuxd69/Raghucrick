import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getDatabase, ref, set, update, onValue, serverTimestamp, get } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

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

// Sign in anonymously
signInAnonymously(auth)
  .then(() => {
    console.log('Signed in anonymously');
  })
  .catch((error) => {
    console.error(`Error signing in: ${error.code}, ${error.message}`);
  });

onAuthStateChanged(auth, (user) => {
  if (user) {
    const uid = user.uid;
    console.log(`User ID: ${uid}`);
  } else {
    console.log('User is signed out');
  }
});

let currentRoom = null;
let isPlayer1 = false;
let isSecondInnings = false;
let isComputer = false;
let runInput = null;
let timer = null;

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
}

window.createRoom = function () {
  const room = generateRoomCode();
  const roomRef = ref(database, `rooms/${room}`);

  set(roomRef, {
    player1: serverTimestamp(),
    player2: null,
    player1Score: 0,
    player2Score: 0,
    target: null,
    player1Run: null,
    player2Run: null
  }).then(() => {
    currentRoom = room;
    isPlayer1 = true;
    document.getElementById('multiplayerOptions').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('game').innerText = `Room ${room} created. Waiting for another player...`;
  });
}

window.joinRoom = function () {
  const room = document.getElementById('roomInput').value;
  const roomRef = ref(database, `rooms/${room}`);

  get(roomRef).then(snapshot => {
    if (snapshot.exists() && !snapshot.val().player2) {
      update(roomRef, { player2: serverTimestamp() }).then(() => {
        currentRoom = room;
        document.getElementById('multiplayerOptions').style.display = 'none';
        document.getElementById('gameArea').style.display = 'block';
        document.getElementById('game').innerText = `Joined room ${room}. Waiting for the game to start...`;
      });
    } else {
      document.getElementById('game').innerText = `Room ${room} is not available or already has two players.`;
    }
  });
}

window.submitRun = function () {
  const run = parseInt(document.getElementById('runInput').value);
  if (run < 1 || run > 6) {
    alert('Enter a valid run between 1 and 6');
    return;
  }
  runInput = run;
  if (!isComputer) {
    const roomRef = ref(database, `rooms/${currentRoom}`);
    if (isPlayer1) {
      update(roomRef, { player1Run: run });
    } else {
      update(roomRef, { player2Run: run });
    }
  } else {
    playTurnWithComputer();
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
      if (runInput !== null) {
        if (!isComputer) {
          playTurnWithPlayer();
        } else {
          playTurnWithComputer();
        }
      }
    }
  }, 1000);
}

function playTurnWithPlayer() {
  const roomRef = ref(database, `rooms/${currentRoom}`);
  get(roomRef).then(snapshot => {
    const data = snapshot.val();
    const player1Run = data.player1Run;
    const player2Run = data.player2Run;

    if (player1Run === player2Run) {
      if (!isSecondInnings) {
        document.getElementById('game').innerText += '\nOut! Player 1\'s innings over.';
        update(roomRef, {
          player1Run: null,
          player2Run: null,
          target: data.player1Score + 1
        });
        isSecondInnings = true;
      } else {
        document.getElementById('game').innerText += '\nOut! Player 2\'s innings over.';
        determineWinner(data);
      }
    } else {
      if (!isSecondInnings) {
        update(roomRef, {
          player1Score: data.player1Score + player1Run,
          player1Run: null,
          player2Run: null
        });
        document.getElementById('game').innerText += `\nPlayer 1 scored ${player1Run}, total score: ${data.player1Score + player1Run}`;
      } else {
        update(roomRef, {
          player2Score: data.player2Score + player2Run,
          player1Run: null,
          player2Run: null
        });
        document.getElementById('game').innerText += `\nPlayer 2 scored ${player2Run}, total score: ${data.player2Score + player2Run}`;

        if (data.player2Score + player2Run >= data.target) {
          determineWinner(data);
        }
      }
    }
  });
}

function playTurnWithComputer() {
  const computerRun = Math.floor(Math.random() * 6) + 1;
  document.getElementById('game').innerText += `\nYou chose ${runInput}, computer chose ${computerRun}`;

  if (runInput === computerRun) {
    if (!isSecondInnings) {
      document.getElementById('game').innerText += '\nOut! Your innings is over.';
      isSecondInnings = true;
      runInput = null;
    } else {
      document.getElementById('game').innerText += '\nOut! Computer\'s innings is over.';
      determineWinner();
    }
  } else {
    if (!isSecondInnings) {
      document.getElementById('game').innerText += `\nYou scored ${runInput}`;
    } else {
      document.getElementById('game').innerText += `\nComputer scored ${computerRun}`;

      if (computerRun >= runInput) {
        determineWinner();
      }
    }
  }
}

function determineWinner(data) {
  let winner;
  if (isComputer) {
    winner = data.player2Score > data.target ? 'Computer wins!' : 'You win!';
  } else {
    if (data.player1Score > data.player2Score) {
      winner = 'Player 1 wins!';
    } else if (data.player1Score < data.player2Score) {
      winner = 'Player 2 wins!';
    } else {
      winner = 'It\'s a tie!';
    }
  }
  document.getElementById('game').innerText += `\n${winner}`;
}

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
