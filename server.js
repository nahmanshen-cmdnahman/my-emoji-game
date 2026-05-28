const express = require('express');
const app = express();
const http = require('http').createServer(app);

const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

let players = {};
let gameStarted = false;
let bossId = null;
let bossHp = 100; // החיים של הבוס באחוזים

app.get('/', (req, res) => {
    res.send('<h1>שרת המשחק רץ בהצלחה ב-Render! 🚀</h1>');
});

io.on('connection', (socket) => {
    console.log('שחקן חדש התחבר: ' + socket.id);

    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 400 + 50,
        y: Math.random() * 400 + 50,
        isBoss: false,
        emoji: '👨🏻',
        hp: 100
    };

    socket.emit('currentPlayers', { players, gameStarted, bossHp });
    socket.broadcast.emit('newPlayer', players[socket.id]);

    const playerIds = Object.keys(players);
    if (playerIds.length >= 3 && !gameStarted) {
        startGame(playerIds);
    }

    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // טיפול ביריות ופגיעות
    socket.on('shoot', (data) => {
        if (!gameStarted || !bossId || !players[socket.id]) return;
        
        // רק שחקן רגיל יכול לירות על הבוס
        if (socket.id !== bossId) {
            bossHp -= data.damage;
            if (bossHp < 0) bossHp = 0;

            // עדכון כל השחקנים על הנזק שנגרם ומי ירה
            io.emit('bossDamaged', { bossHp: bossHp, shooterId: socket.id, weapon: data.weapon, bulletX: data.x, bulletY: data.y });

            // בדיקה אם הבוס מת
            if (bossHp <= 0) {
                gameStarted = false;
                io.emit('gameOver', { winner: 'players' });
                resetToLobby();
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('שחקן התנתק: ' + socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
        
        if (socket.id === bossId) {
            gameStarted = false;
            bossId = null;
            io.emit('gameOver', { winner: 'disconnected' });
            resetToLobby();
        }
    });
});

function startGame(playerIds) {
    gameStarted = true;
    bossHp = 100;
    bossId = playerIds[Math.floor(Math.random() * playerIds.length)];
    
    Object.keys(players).forEach(id => {
        if (id === bossId) {
            players[id].isBoss = true;
            players[id].emoji = '👨🏿';
        } else {
            players[id].isBoss = false;
            players[id].emoji = '👨🏻';
        }
        players[id].hp = 100;
    });

    io.emit('gameStarted', { bossId: bossId, players: players });
}

function resetToLobby() {
    gameStarted = false;
    bossId = null;
    bossHp = 100;
    Object.keys(players).forEach(id => {
        players[id].isBoss = false;
        players[id].emoji = '👨🏻';
    });
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log('השרת רץ על פורט: ' + PORT);
});
