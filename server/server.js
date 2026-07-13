const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// CORS 설정 (안전하게 다 열어두기)
app.use(cors());
app.use(express.json());

// 렌더에서 정적 파일(HTML, CSS, JS)을 정상적으로 읽을 수 있도록 경로 설정
app.use(express.static(path.join(__dirname, '../client')));

// 몽고DB 대신 서버 메모리에 임시로 유저와 메시지를 저장하는 가짜(Mock) 데이터베이스
const users = [
  { id: "1", password: "1", name: "테스터1" },
  { id: "2", password: "2", name: "테스터2" }
];
const messages = [];

// 1. 로그인 API (가짜 DB 사용)
app.post('/api/auth/login', (req, res) => {
  const { id, password } = req.body;
  const user = users.find(u => u.id === id && u.password === password);
  
  if (user) {
    return res.status(200).json({ success: true, token: 'fake-jwt-token', user: { id: user.id, name: user.name } });
  } else {
    return res.status(401).json({ success: false, message: '아이디 또는 비밀번호가 틀렸습니다.' });
  }
});

// 2. 과거 메시지 불러오기 API
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// 소켓.아이오 (실시간 채팅 핵심 엔진)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('유저 접속됨:', socket.id);

  // 채팅방 입장
  socket.on('join', (username) => {
    socket.username = username;
    console.log(`${username}님이 채팅방에 들어옴`);
  });

  // 메시지 받기 및 모든 유저에게 브로드캐스팅
  socket.on('sendMessage', (messageData) => {
    const fullMessage = {
      ...messageData,
      timestamp: new Date().toLocaleTimeString()
    };
    messages.push(fullMessage); // 임시 메모리에 저장
    io.emit('message', fullMessage); // 모두에게 전송
  });

  socket.on('disconnect', () => {
    console.log('유저 나감:', socket.id);
  });
});

// 렌더 전용 포트(10000) 또는 로컬 포트(3000) 자동 설정
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});