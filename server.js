// קוד השרת (server.js)
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

let players = {};
let gameStarted = false;
let bossId = null;

io.on('connection', (socket) => {
    console.log('שחקן חדש התחבר: ' + socket.id);

    // הוספת שחקן חדש לרשימה
    players[socket.id] = {
        id: socket.id,
        x: Math.random() * 300 + 50,
        y: Math.random() * 300 + 50,
        isBoss: false,
        emoji: '👨🏻'
    };

    // שליחת רשימת השחקנים הקיימת לשחקן החדש
    socket.emit('currentPlayers', players);
    // עדכון שאר השחקנים על השחקן החדש
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // תחילת משחק כשמגיעים למינימום שחקנים (למשל 3)
    const playerIds = Object.keys(players);
    if (playerIds.length >= 3 && !gameStarted) {
        gameStarted = true;
        // בחירת רשע באקראי
        bossId = playerIds[Math.floor(Math.random() * playerIds.length)];
        players[bossId].isBoss = true;
        players[bossId].emoji = '👨🏿';

        io.emit('gameStarted', { bossId: bossId, players: players });
    }

    // עדכון תנועה מהשחקנים
    socket.on('playerMovement', (movementData) => {
        if (players[socket.id]) {
            players[socket.id].x = movementData.x;
            players[socket.id].y = movementData.y;
            // שליחה לכולם על התנועה
            socket.broadcast.emit('playerMoved', players[socket.id]);
        }
    });

    // ניתוק שחקן
    socket.on('disconnect', () => {
        console.log('שחקן התנתק: ' + socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
        if (socket.id === bossId) {
            gameStarted = false;
            io.emit('bossLeft');
        }
    });
});

http.listen(3000, () => {
    console.log('השרת רץ על פורט 3000');
});