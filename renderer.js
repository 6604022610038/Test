let ws;
let username;
let currentRoom;

const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const chatContainer = document.getElementById('chatContainer');
const roomInput = document.getElementById('roomInput');
const createRoomBtn = document.getElementById('createRoomBtn');
const roomList = document.getElementById('roomList');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.createElement('input');
fileInput.type = 'file';

const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
const host = window.location.host;

// สร้างการเชื่อมต่อไปยังโฮสต์ปัจจุบัน
ws = new WebSocket(`${protocol}://${host}`);  

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // Login / Register Response
    if(data.type === 'login') {
        if(data.success) {
            document.getElementById('loginArea').style.display='none';
            chatContainer.style.display='flex';
        } else alert(data.message);
    }
    if(data.type === 'register') {
        if(data.success) alert('สมัครสมาชิกสำเร็จ!');
        else alert(data.message);
    }

    // Rooms
    if(data.type === 'roomList') {
        roomList.innerHTML = '';
        data.rooms.forEach(r => {
            const div = document.createElement('div');
            div.classList.add('friend');
            div.textContent = r;
            div.addEventListener('click', () => {
                currentRoom = r;
                messagesDiv.innerHTML='';
            });
            roomList.appendChild(div);
        });
    }

    // Messages
    if((data.type === 'message' || data.type === 'file') && data.room === currentRoom) {
        const div = document.createElement('div');
        div.classList.add('message', data.from===username?'from-me':'from-friend');

        if(data.type === 'message') {
            div.textContent = `${data.from}: ${data.content}`;
        } else if(data.type === 'file') {
            const label = document.createElement('div');
            label.textContent = `${data.from} ส่งไฟล์: ${data.filename}`;
            div.appendChild(label);

            if(data.filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
                const img = document.createElement('img');
                img.src = data.content;
                img.style.maxWidth = '200px';
                div.appendChild(img);
            }

            const downloadLink = document.createElement('a');
            downloadLink.href = data.content;
            downloadLink.download = data.filename;
            downloadLink.textContent = 'ดาวน์โหลด';
            div.appendChild(downloadLink);
        }

        messagesDiv.appendChild(div);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
};

// ======= Events =======
registerBtn.addEventListener('click', () => {
    username = usernameInput.value.trim();
    const password = passwordInput.value;
    if(!username || !password) return alert('กรอกข้อมูลให้ครบ');
    ws.send(JSON.stringify({ type:'register', username, password }));
});

loginBtn.addEventListener('click', () => {
    username = usernameInput.value.trim();
    const password = passwordInput.value;
    if(!username || !password) return alert('กรอกข้อมูลให้ครบ');
    ws.send(JSON.stringify({ type:'login', username, password }));
});

createRoomBtn.addEventListener('click', () => {
    const room = roomInput.value.trim();
    if(!room) return;
    ws.send(JSON.stringify({ type:'createRoom', room }));
    roomInput.value='';
});

sendBtn.addEventListener('click', () => {
    const content = messageInput.value.trim();
    if(!content || !currentRoom) return alert('เลือกห้องหรือกรอกข้อความ');
    ws.send(JSON.stringify({ type:'message', content }));
    messageInput.value='';
});

// ส่งไฟล์
document.addEventListener('keydown', (e) => {
    if(e.key === 'Enter') sendBtn.click();
});

const sendFileBtn = document.createElement('button');
sendFileBtn.textContent = 'ส่งไฟล์';
sendFileBtn.addEventListener('click', () => {
    if(!currentRoom) return alert('เลือกห้องก่อนส่งไฟล์');
    fileInput.click();
});

fileInput.addEventListener('change', () => {
    if(!fileInput.files[0]) return;
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        ws.send(JSON.stringify({
            type:'file',
            filename: file.name,
            content: reader.result
        }));
    };
    reader.readAsDataURL(file);
});

document.body.appendChild(sendFileBtn);
