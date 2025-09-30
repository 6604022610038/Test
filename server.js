const express = require('express'); // เรียกใช้ Express
const http = require('http');     // เรียกใช้โมดูล HTTP
const WebSocket = require('ws');
const path = require('path');     // เรียกใช้โมดูล path

const PORT = process.env.PORT || 8080;

// 1. สร้าง Express App
const app = express();

// 2. กำหนดให้ Express เสิร์ฟไฟล์คงที่ (static files) จาก directory ปัจจุบัน (รวมถึง index.html และ renderer.js)
app.use(express.static(path.join(__dirname, '/')));

// 3. สร้าง HTTP Server โดยใช้ Express App
const server = http.createServer(app);

// 4. สร้าง WebSocket Server โดยผสานรวมกับ HTTP Server
// WebSocket จะสามารถแชร์พอร์ตเดียวกับ Express ได้
const wss = new WebSocket.Server({ server }); // เปลี่ยนจากการกำหนด port มาเป็นการใช้ server instance

let users = {}; // { username: password }
let clients = []; // { ws, username, room }
let rooms = {}; // { roomName: [username,...] }

// 5. ให้ HTTP Server เริ่มฟังการเชื่อมต่อบนพอร์ตที่กำหนด (สำคัญสำหรับ Render)
server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

// --- ส่วนนี้คือ WebSocket Logic เดิมของคุณ ---

wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
        let data;
        try { data = JSON.parse(msg); } 
        catch(e) { return; }

        // ===== Register =====
        if(data.type === 'register') {
            if(users[data.username]) {
                ws.send(JSON.stringify({ type: 'register', success:false, message:'มีผู้ใช้นี้แล้ว' }));
            } else {
                users[data.username] = data.password;
                ws.send(JSON.stringify({ type: 'register', success:true }));
            }
        }

        // ===== Login =====
        if(data.type === 'login') {
            if(users[data.username] && users[data.username] === data.password) {
                ws.username = data.username;
                clients.push({ ws, username:data.username, room:null });
                ws.send(JSON.stringify({ type:'login', success:true }));
            } else {
                ws.send(JSON.stringify({ type:'login', success:false, message:'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' }));
            }
        }

        // ===== Create Room =====
        if(data.type === 'createRoom' && ws.username) {
            const roomName = data.room;
            if(!rooms[roomName]) rooms[roomName] = [];
            rooms[roomName].push(ws.username);
            ws.room = roomName;
            broadcastRooms();
        }

        // ===== Send Message =====
        if((data.type === 'message' || data.type === 'file') && ws.username && ws.room) {
            const msgData = {
                type: data.type,
                from: ws.username,
                room: ws.room,
                content: data.content || null,
                filename: data.filename || null
            };

            clients.forEach(c => {
                if(c.ws.readyState === WebSocket.OPEN && c.room === ws.room) {
                    c.ws.send(JSON.stringify(msgData));
                }
            });
        }
    });

    ws.on('close', () => {
        clients = clients.filter(c => c.ws !== ws);
        if(ws.room && rooms[ws.room]) {
            rooms[ws.room] = rooms[ws.room].filter(u => u !== ws.username);
        }
    });
});

function broadcastRooms() {
    const roomNames = Object.keys(rooms);
    clients.forEach(c => {
        if(c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(JSON.stringify({ type:'roomList', rooms:roomNames }));
        }
    });
}