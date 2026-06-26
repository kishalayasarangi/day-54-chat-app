const socket = io();
let myUsername = '';
let currentRoom = 'general';
let typingTimeout = null;

const roomDescs = {
  'general': 'General discussion for everyone',
  'tech': 'Tech talk — code, projects, tools',
  'nit-rourkela': 'NIT Rourkela students only 🎓',
  'random': 'Random topics and fun stuff'
};

function selectRoom(room, btn) {
  currentRoom = room;
  document.querySelectorAll('.room-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

function joinChat() {
  const username = document.getElementById('usernameInput').value.trim();
  if (!username) { alert('Enter your name!'); return; }

  myUsername = username;
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('chatScreen').classList.remove('hidden');
  document.getElementById('myName').textContent = '👤 ' + username;
  document.getElementById('messageInput').placeholder =
    `Message #${currentRoom}...`;

  updateRoomUI(currentRoom);
  socket.emit('join', { username, room: currentRoom });
}

function leaveChat() {
  socket.emit('leave', { room: currentRoom });
  document.getElementById('chatScreen').classList.add('hidden');
  document.getElementById('loginScreen').classList.remove('hidden');
  document.getElementById('messages').innerHTML = '';
  document.getElementById('usernameInput').value = '';
}

function switchRoom(newRoom) {
  if (newRoom === currentRoom) return;
  socket.emit('leave', { room: currentRoom });
  document.getElementById('messages').innerHTML = '';

  currentRoom = newRoom;
  updateRoomUI(newRoom);

  socket.emit('join', { username: myUsername, room: newRoom });
  document.getElementById('messageInput').placeholder =
    `Message #${newRoom}...`;
}

function updateRoomUI(room) {
  document.querySelectorAll('.room-item').forEach(el => el.classList.remove('active'));
  const roomEl = document.getElementById(`room-${room}`);
  if (roomEl) roomEl.classList.add('active');
  document.getElementById('chatRoomName').textContent = `# ${room}`;
  document.getElementById('chatRoomDesc').textContent = roomDescs[room] || '';
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text) return;
  socket.emit('send_message', { room: currentRoom, text });
  input.value = '';
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function handleTyping() {
  socket.emit('typing', { room: currentRoom });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {}, 1000);
}

function getInitial(name) {
  return name.charAt(0).toUpperCase();
}

function getAvatarColor(name) {
  const colors = [
    'linear-gradient(135deg,#7c3aed,#10b981)',
    'linear-gradient(135deg,#3b82f6,#ec4899)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#10b981,#3b82f6)',
    'linear-gradient(135deg,#ec4899,#7c3aed)'
  ];
  let sum = 0;
  for (let c of name) sum += c.charCodeAt(0);
  return colors[sum % colors.length];
}

function appendMessage(msg, isSystem = false) {
  const messages = document.getElementById('messages');

  if (isSystem) {
    const div = document.createElement('div');
    div.className = 'system-msg';
    div.textContent = `${msg.text} · ${msg.time}`;
    messages.appendChild(div);
  } else {
    const isMine = msg.username === myUsername;
    const div = document.createElement('div');
    div.className = `message ${isMine ? 'mine' : ''}`;
    div.innerHTML = `
      <div class="msg-avatar"
           style="background:${getAvatarColor(msg.username)}">
        ${getInitial(msg.username)}
      </div>
      <div class="msg-content">
        <div class="msg-header">
          <span class="msg-username">${msg.username}</span>
          <span class="msg-time">${msg.time}</span>
        </div>
        <div class="msg-text">${escapeHtml(msg.text)}</div>
      </div>`;
    messages.appendChild(div);
  }

  messages.scrollTop = messages.scrollHeight;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== SOCKET EVENTS =====
socket.on('message_history', data => {
  data.messages.forEach(msg => appendMessage(msg));
});

socket.on('new_message', msg => {
  appendMessage(msg);
});

socket.on('system_message', msg => {
  appendMessage(msg, true);
});

socket.on('users_update', data => {
  document.getElementById('onlineCount').textContent = data.count;
  const list = document.getElementById('usersList');
  list.innerHTML = data.users.map(u => `
    <div class="user-item ${u === myUsername ? 'me' : ''}">
      <div class="user-dot"></div>
      ${u}${u === myUsername ? ' (you)' : ''}
    </div>`).join('');
});

socket.on('user_typing', data => {
  const indicator = document.getElementById('typingIndicator');
  const text = document.getElementById('typingText');
  text.textContent = `${data.username} is typing`;
  indicator.classList.remove('hidden');
  clearTimeout(window.typingClear);
  window.typingClear = setTimeout(() => {
    indicator.classList.add('hidden');
  }, 2000);
});