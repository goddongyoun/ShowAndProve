const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const sharp = require('sharp');
const { spawn } = require('child_process');

const app = express();

// CORS 설정
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://203.234.62.50:19006',
      'http://localhost:19006',
      'http://localhost:19000',
      'http://203.234.62.50:8081',
      'http://localhost:8081',
      'http://203.234.62.50:5000',
      // 모바일 환경에서 Expo Go 앱의 요청 도메인 추가
      'http://*.ngrok.io',
      'exp://*',
    ];
    console.log('CORS Request Origin:', origin);
    if (!origin || allowedOrigins.some(allowed => allowed === origin || (allowed.includes('*') && origin.match(allowed.replace('*', '.*'))))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

app.use(express.json());

// 파일 크기 제한 설정 (10MB로 설정)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB 제한
});

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

mongoose.connect('mongodb://localhost:27017/ChallengeAppDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB 연결 성공'))
  .catch(err => console.error('MongoDB 연결 실패:', err));

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  name: String,
});
const User = mongoose.model('User', userSchema);

const challengeSchema = new mongoose.Schema({
  title: String,
  description: String,
  creator: String,
  creatorName: String,
  status: { type: String, default: '진행 중' },
  createdAt: { type: Date, default: Date.now },
});
const Challenge = mongoose.model('Challenge', challengeSchema);

const verificationSchema = new mongoose.Schema({
  challengeId: String,
  userId: String,
  photoUrl: String,
  extractedText: String,
  createdAt: { type: Date, default: Date.now },
});
const Verification = mongoose.model('Verification', verificationSchema);

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: '인증 토큰이 없습니다.' });

  jwt.verify(token, 'your-secret-key', (err, user) => {
    if (err) return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    req.user = user;
    next();
  });
};

const extractTextWithGOTOCR = (imagePath) => {
  return new Promise((resolve, reject) => {
    const pythonProcess = spawn('C:\\Users\\SODA\\Desktop\\Project\\ChallengeApp\\backend\\venv\\Scripts\\python.exe', ['./extract_text_got_ocr.py', imagePath]);
    let extractedText = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => {
      extractedText += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        resolve(extractedText.trim());
      } else {
        console.error('GOT-OCR Error Output:', errorOutput);
        reject(new Error(`GOT-OCR processing failed: ${errorOutput}`));
      }
    });
  });
};

app.post('/api/register', async (req, res) => {
  console.log('Register Request:', req.body);
  const { email, password, name } = req.body;
  try {
    const user = new User({ email, password, name });
    await user.save();
    res.status(201).json({ message: '회원가입 성공' });
  } catch (error) {
    console.error('Register Error:', error);
    res.status(500).json({ error: '회원가입 실패: ' + error.message });
  }
});

app.post('/api/login', async (req, res) => {
  console.log('Login Request:', req.body);
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password });
    if (user) {
      const token = jwt.sign({ email: user.email, name: user.name }, 'your-secret-key', { expiresIn: '1h' });
      res.status(200).json({ message: '로그인 성공', token, user });
    } else {
      res.status(401).json({ error: '로그인 실패: 잘못된 이메일 또는 비밀번호' });
    }
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: '로그인 실패: ' + error.message });
  }
});

app.post('/api/challenges', authenticateToken, async (req, res) => {
  console.log('Create Challenge Request:', req.body);
  const { title, description } = req.body;
  try {
    const challenge = new Challenge({
      title,
      description,
      creator: req.user.email,
      creatorName: req.user.name,
    });
    await challenge.save();
    res.status(201).json({ message: '도전과제 생성 성공' });
  } catch (error) {
    console.error('Create Challenge Error:', error);
    res.status(500).json({ error: '도전과제 생성 실패: ' + error.message });
  }
});

app.get('/api/challenges', async (req, res) => {
  try {
    const challenges = await Challenge.find();
    res.status(200).json(challenges);
  } catch (error) {
    console.error('Get Challenges Error:', error);
    res.status(500).json({ error: '도전과제 목록 가져오기 실패: ' + error.message });
  }
});

app.post('/api/verifications', authenticateToken, upload.single('photo'), async (req, res) => {
  console.log('Received File:', req.file);
  console.log('Request Body:', req.body);

  const { challengeId, userId } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: '파일 업로드가 필요합니다.' });
  }

  try {
    const processedImagePath = path.join(__dirname, 'uploads', 'processed-' + req.file.filename);
    await sharp(req.file.path)
      .resize(800) // 해상도 유지
      .sharpen() // 선명도 향상
      .toFile(processedImagePath);

    const extractedText = await extractTextWithGOTOCR(processedImagePath);
    console.log('Extracted Text from Image (GOT-OCR):', extractedText);

    if (fs.existsSync(processedImagePath)) {
      fs.unlinkSync(processedImagePath);
    }

    const photoUrl = `/uploads/${req.file.filename}`;
    const verification = new Verification({ challengeId, userId, photoUrl, extractedText });
    await verification.save();

    res.status(201).json({ message: '사진 인증 성공', photoUrl, extractedText });
  } catch (error) {
    console.error('Verification Error:', error);
    res.status(500).json({ error: '사진 인증 실패: ' + error.message });
  }
});

app.delete('/api/challenges/:id', authenticateToken, async (req, res) => {
  console.log('Delete Challenge Request:', req.params);
  const { id } = req.params;
  try {
    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({ error: '도전과제를 찾을 수 없습니다.' });
    }
    if (challenge.creator !== req.user.email) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await Challenge.findByIdAndDelete(id);
    const verifications = await Verification.find({ challengeId: id });
    for (const verification of verifications) {
      const filePath = path.join(__dirname, verification.photoUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await Verification.deleteMany({ challengeId: id });

    res.status(200).json({ message: '도전과제 삭제 성공' });
  } catch (error) {
    console.error('Delete Challenge Error:', error);
    res.status(500).json({ error: '도전과제 삭제 실패: ' + error.message });
  }
});

app.get('/api/verifications/:challengeId', async (req, res) => {
  console.log('Get Verifications Request:', req.params);
  try {
    const verifications = await Verification.find({ challengeId: req.params.challengeId });
    res.status(200).json(verifications);
  } catch (error) {
    console.error('Get Verifications Error:', error);
    res.status(500).json({ error: '인증 사진 목록 가져오기 실패: ' + error.message });
  }
});

app.delete('/api/verifications/:id', authenticateToken, async (req, res) => {
  console.log('Delete Verification Request:', req.params);
  const { id } = req.params;
  try {
    const verification = await Verification.findById(id);
    if (!verification) {
      return res.status(404).json({ error: '인증 사진을 찾을 수 없습니다.' });
    }
    if (verification.userId !== req.user.email) {
      return res.status(403).json({ error: '삭제 권한이 없습니다.' });
    }

    await Verification.findByIdAndDelete(id);
    const filePath = path.join(__dirname, verification.photoUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(200).json({ message: '인증 사진 삭제 성공' });
  } catch (error) {
    console.error('Delete Verification Error:', error);
    res.status(500).json({ error: '인증 사진 삭제 실패: ' + error.message });
  }
});

app.patch('/api/challenges/:id/status', authenticateToken, async (req, res) => {
  console.log('Update Challenge Status Request:', req.params, req.body);
  const { id } = req.params;
  const { status } = req.body;
  try {
    const challenge = await Challenge.findById(id);
    if (!challenge) {
      return res.status(404).json({ error: '도전과제를 찾을 수 없습니다.' });
    }
    if (challenge.creator !== req.user.email) {
      return res.status(403).json({ error: '상태 변경 권한이 없습니다.' });
    }

    const updatedChallenge = await Challenge.findByIdAndUpdate(id, { status }, { new: true });
    res.status(200).json({ message: '도전과제 상태 업데이트 성공', challenge: updatedChallenge });
  } catch (error) {
    console.error('Update Challenge Status Error:', error);
    res.status(500).json({ error: '도전과제 상태 업데이트 실패: ' + error.message });
  }
});

app.use('/uploads', express.static('uploads'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`서버 실행 중: http://203.234.62.50:${PORT}`));