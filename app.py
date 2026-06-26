from flask import Flask, render_template, request
from flask_socketio import SocketIO, join_room, leave_room, emit
from datetime import datetime

# ============================================
# Real Time Chat App — Flask + SocketIO
# Day 54 — 120 Days of Code | NIT Rourkela
# ============================================

app = Flask(__name__)
app.config['SECRET_KEY'] = 'day54-chat-secret'
socketio = SocketIO(app, cors_allowed_origins="*")

# In-memory store
rooms = {
    'general': {'messages': [], 'users': {}},
    'tech': {'messages': [], 'users': {}},
    'nit-rourkela': {'messages': [], 'users': {}},
    'random': {'messages': [], 'users': {}}
}

def get_time():
    return datetime.now().strftime('%H:%M')

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('join')
def on_join(data):
    username = data.get('username', 'Anonymous').strip()[:20]
    room = data.get('room', 'general')

    if room not in rooms:
        rooms[room] = {'messages': [], 'users': {}}

    join_room(room)
    rooms[room]['users'][request.sid] = username

    # Send last 20 messages to new user
    emit('message_history', {
        'messages': rooms[room]['messages'][-20:]
    })

    # Send online users
    emit('users_update', {
        'users': list(rooms[room]['users'].values()),
        'count': len(rooms[room]['users'])
    }, to=room)

    # Notify others
    emit('system_message', {
        'text': f'{username} joined the room',
        'time': get_time()
    }, to=room)

@socketio.on('leave')
def on_leave(data):
    room = data.get('room', 'general')
    username = rooms.get(room, {}).get('users', {}).get(request.sid, 'Someone')
    leave_room(room)

    if room in rooms and request.sid in rooms[room]['users']:
        del rooms[room]['users'][request.sid]

    emit('system_message', {
        'text': f'{username} left the room',
        'time': get_time()
    }, to=room)

    emit('users_update', {
        'users': list(rooms.get(room, {}).get('users', {}).values()),
        'count': len(rooms.get(room, {}).get('users', {}))
    }, to=room)

@socketio.on('send_message')
def on_message(data):
    room = data.get('room', 'general')
    username = rooms.get(room, {}).get('users', {}).get(request.sid, 'Anonymous')
    text = data.get('text', '').strip()[:500]

    if not text: return

    msg = {
        'username': username,
        'text': text,
        'time': get_time(),
        'sid': request.sid
    }

    if room in rooms:
        rooms[room]['messages'].append(msg)
        if len(rooms[room]['messages']) > 100:
            rooms[room]['messages'] = rooms[room]['messages'][-100:]

    emit('new_message', msg, to=room)

@socketio.on('typing')
def on_typing(data):
    room = data.get('room', 'general')
    username = rooms.get(room, {}).get('users', {}).get(request.sid, 'Someone')
    emit('user_typing', {'username': username}, to=room, include_self=False)

@socketio.on('disconnect')
def on_disconnect():
    for room, data in rooms.items():
        if request.sid in data['users']:
            username = data['users'][request.sid]
            del data['users'][request.sid]
            emit('system_message', {
                'text': f'{username} disconnected',
                'time': get_time()
            }, to=room)
            emit('users_update', {
                'users': list(data['users'].values()),
                'count': len(data['users'])
            }, to=room)
            break

if __name__ == '__main__':
    print("\n🚀 Chat App running at http://localhost:5000")
    print("   Open in multiple tabs to chat in real time!\n")
    socketio.run(app, debug=True)
