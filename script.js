// --- 1. FIREBASE CONFIGURATION ---
// Apne Firebase Console se ye details copy karke yahan paste karein
const firebaseConfig = {
    apiKey: "AIzaSyCl2YEA5t02snLJCTpb-JtVRNPbPbCL4l4",
    databaseURL: "https://dear-chess-668c2-default-rtdb.firebaseio.com",
    projectId: "dear-chess-668c2"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// --- 2. GLOBAL VARIABLES ---
let myUID = localStorage.getItem('dear_chess_uid') || "DC-" + Math.floor(1000 + Math.random() * 9000);
localStorage.setItem('dear_chess_uid', myUID);

let myName = localStorage.getItem('dear_chess_name') || "";
let board = null, game = new Chess();
let squareSelected = null, currentMode = '', gameId = null, myRole = 'w';

// Official Move Sounds
const moveSound = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_standard/default/move-self.mp3');
const captureSound = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_standard/default/capture.mp3');

// --- 3. LOADING & INITIALIZATION ---
window.onload = () => {
    document.getElementById('display-uid').innerText = myUID;
    let bar = document.getElementById('loader-bar'), w = 0;
    let inv = setInterval(() => {
        w += 10; bar.style.width = w + "%";
        if (w >= 100) {
            clearInterval(inv);
            document.getElementById('loading-screen').classList.add('hidden');
            if (myName === "") document.getElementById('name-screen').classList.remove('hidden');
            else showMenu();
        }
    }, 40);
};

function submitName() {
    let input = document.getElementById('username-input').value.trim();
    if (input.length < 2) return alert("Enter a valid name!");
    myName = input;
    localStorage.setItem('dear_chess_name', myName);
    document.getElementById('name-screen').classList.add('hidden');
    showMenu();
}

function showMenu() {
    document.getElementById('main-menu').classList.remove('hidden');
    document.getElementById('display-name-top').innerText = myName;
}

// --- 4. PROFILE MENU & LOGOUT LOGIC ---
function toggleDropdown() {
    let dropdown = document.getElementById('profile-dropdown');
    dropdown.classList.toggle('hidden');
}

// Logout functionality to reset name and data
function logout() {
    if(confirm("Dost, kya aap sach mein Log Out karna chahte hain?")) {
        localStorage.clear();
        location.reload(); 
    }
}

// Dropdown ke bahar click karne par use band karna
window.onclick = function(event) {
    if (!event.target.matches('.profile-icon')) {
        let dropdown = document.getElementById('profile-dropdown');
        if (dropdown && !dropdown.classList.contains('hidden')) {
            dropdown.classList.add('hidden');
        }
    }
}

// --- 5. GAME MODES & MULTIPLAYER ---
function startGame(mode) {
    currentMode = mode;
    game.reset();
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');

    if (mode === 'friends') {
        let friend = prompt("Friend ka UID daalein:");
        if (!friend) return location.reload();
        gameId = [myUID, friend].sort().join("-");
        myRole = (myUID < friend) ? 'w' : 'b';
        
        database.ref('games/' + gameId).on('value', snap => {
            let data = snap.val();
            if (data && data.lastMoveBy !== myUID) {
                let m = game.move(data.move);
                if (m) {
                    board.position(game.fen());
                    playMoveSound(m);
                    updateStatus();
                }
            }
        });
    }
    initBoard();
}

// --- 6. BOARD LOGIC & INTERACTION ---
function initBoard() {
    board = Chessboard('board', {
        draggable: true,
        position: 'start',
        orientation: (currentMode === 'friends' && myRole === 'b') ? 'black' : 'white',
        pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
        onDrop: (s, t) => {
            if (currentMode === 'friends' && game.turn() !== myRole) return 'snapback';
            let move = game.move({ from: s, to: t, promotion: 'q' });
            if (!move) return 'snapback';
            processAfterMove(move);
        }
    });

    // Touch aur Click optimized Interaction
    $('#board').off('click').on('click', '.square-55d63', function() {
        if (currentMode === 'friends' && game.turn() !== myRole) return;
        let square = $(this).data('square');

        if (squareSelected === null) {
            let piece = game.get(square);
            if (piece && piece.color === game.turn()) {
                squareSelected = square;
                showLegalHighlights(square);
            }
        } else {
            let move = game.move({ from: squareSelected, to: square, promotion: 'q' });
            if (move) {
                board.position(game.fen());
                processAfterMove(move);
            }
            squareSelected = null;
            removeHighlights();
        }
    });
}

function processAfterMove(move) {
    playMoveSound(move);
    if (gameId) database.ref('games/' + gameId).set({ move: move, lastMoveBy: myUID });
    updateStatus();
    if (currentMode === 'robot' && !game.game_over()) {
        setTimeout(makeProRobotMove, 600);
    }
}

// --- 7. PRO ROBOT AI & STATUS ---
function makeProRobotMove() {
    let moves = game.moves();
    if (moves.length === 0) return;
    let captureMoves = moves.filter(m => m.includes('x'));
    let selected = captureMoves.length > 0 ? captureMoves[0] : moves[Math.floor(Math.random() * moves.length)];
    let m = game.move(selected);
    board.position(game.fen());
    playMoveSound(m);
    updateStatus();
}

function updateStatus() {
    $('.square-55d63').removeClass('check-square');
    if (game.in_check()) {
        let turn = game.turn();
        game.board().forEach((row, i) => {
            row.forEach((piece, j) => {
                if (piece && piece.type === 'k' && piece.color === turn) {
                    let sq = String.fromCharCode(97 + j) + (8 - i);
                    $('.square-' + sq).addClass('check-square');
                }
            });
        });
    }
    let status = game.turn() === 'w' ? "White's Turn" : "Black's Turn";
    if (game.in_checkmate()) status = "Checkmate! Game Over.";
    document.getElementById('status').innerText = status;
}

function playMoveSound(m) { (m.captured) ? captureSound.play() : moveSound.play(); }

function showLegalHighlights(square) {
    removeHighlights();
    $('.square-' + square).addClass('selected-square');
    game.moves({ square: square, verbose: true }).forEach(m => {
        $('.square-' + m.to).addClass('highlight-square');
    });
}

function removeHighlights() { 
    $('.square-55d63').removeClass('highlight-square selected-square'); 
}
