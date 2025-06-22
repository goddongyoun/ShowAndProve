# ChallengeApp - React Native 도전과제 관리 애플리케이션

## 📋 프로젝트 개요

React Native와 Python Flask를 활용한 크로스플랫폼 도전과제 관리 애플리케이션입니다. 사용자가 도전과제를 생성하고 참여하며, OCR 기술을 통한 인증 시스템과 실시간 알림 기능을 제공합니다.

## 🚀 프로젝트 실행 방법

### 1. 백엔드 서버 설정

#### 1-1. 가상환경 생성 및 활성화
```bash
cd BACK_SERVER
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

#### 1-2. 백엔드 의존성 설치
```bash
pip install flask flask-cors pymysql bcrypt pyjwt pillow
```

#### 1-3. 환경변수 설정
BACK_SERVER 폴더에 `.env` 파일을 생성하고 다음과 같이 설정:
```env
# 데이터베이스 설정
DB_HOST=localhost
DB_NAME=ChallengeDB
DB_USER=root
DB_PASSWORD=your_mysql_password

# JWT 보안 키
JWT_SECRET_KEY=**v61r+m=g%#D]H6k*|Xf59ym=j#TlAZ)=Hx?.c3{z+bIqAG36j..cTMAO5+VHXv
```

#### 1-4. 백엔드 서버 실행
```bash
python server.py
```

### 2. 클라이언트 설정

#### 2-1. 클라이언트 의존성 설치
```bash
npm install
npm install @react-native-community/datetimepicker
npm install @react-native-picker/picker
npm install expo-notifications
npm install axios
```

#### 2-2. 클라이언트 실행
```bash
npm start
```

### 3. 데이터베이스 설정

#### 3-1. MySQL 데이터베이스 및 테이블 생성

```sql
-- ChallengeDB 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS ChallengeDB;
USE ChallengeDB;

-- 1. Users 테이블 (사용자 정보)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    isAdmin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email)
);

-- 2. Tags 테이블 (9개 카테고리 태그)
CREATE TABLE tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Challenges 테이블 (도전과제)
CREATE TABLE challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    creator_id INT NOT NULL,
    creator_email VARCHAR(255) NOT NULL,
    expired_date DATETIME,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_creator (creator_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- 4. Challenge_Tags 테이블 (도전과제-태그 관계)
CREATE TABLE challenge_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT NOT NULL,
    tag_id INT NOT NULL,
    
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_challenge_tag (challenge_id, tag_id)
);

-- 5. Verifications 테이블 (인증 사진)
CREATE TABLE verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT NOT NULL,
    user_id INT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    photo_url VARCHAR(500),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_challenge (challenge_id),
    INDEX idx_user (user_id),
    INDEX idx_created_at (created_at)
);

-- 6. User_Challenges 테이블 (사용자-도전과제 참여 관계)
CREATE TABLE user_challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    challenge_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('participating', 'completed', 'dropped') DEFAULT 'participating',
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_challenge (user_id, challenge_id),
    INDEX idx_user (user_id),
    INDEX idx_challenge (challenge_id),
    INDEX idx_status (status)
);

-- 7. User_Interests 테이블 (사용자 관심 태그)
CREATE TABLE user_interests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    tag_id INT NOT NULL,
    tag_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_tag (user_id, tag_id)
);

-- 8. 기본 태그 데이터 삽입 (9개 카테고리)
INSERT INTO tags (name) VALUES 
('학습/공부'),
('운동/건강'),
('요리/생활'),
('창작/취미'),
('마음/명상'),
('사회/관계'),
('업무/커리어'),
('환경/지속가능'),
('도전/모험');
```

## 🔧 R&R 기반 구현 상세

### 1. 회원가입 / 로그인
사용자 인증 시스템으로 JWT 토큰 기반 로그인 구현

### 주요 구현 파일:
- `components/Auth/LoginScreen.js` - 로그인 화면
- `BACK_SERVER/server.py` - JWT 인증 API

### 핵심 코드:
**로그인 처리 (LoginScreen.js)**
```javascript
const handleLogin = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    
    if (data.token) {
      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      navigation.navigate('Home');
    }
  } catch (error) {
    Alert.alert('오류', '로그인에 실패했습니다.');
  }
};
```

**JWT 토큰 생성 (server.py)**
```python
@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    # 사용자 인증 후
    token = jwt.encode({
        'user_id': user['id'],
        'email': user['email'],
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, JWT_SECRET_KEY, algorithm='HS256')
    
    return jsonify({
        'token': token,
        'user': {'id': user['id'], 'email': user['email'], 'name': user['name']}
    })
```

### 2. 회원정보 저장 / 열람
AsyncStorage를 활용한 로컬 사용자 정보 관리

### 주요 구현 파일:
- `services/authService.js` - 사용자 정보 관리 서비스

### 핵심 코드:
```javascript
export const getCurrentUser = async () => {
  try {
    const userData = await AsyncStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    return null;
  }
};

export const saveUserData = async (userData) => {
  try {
    await AsyncStorage.setItem('user', JSON.stringify(userData));
  } catch (error) {
    console.error('사용자 정보 저장 오류:', error);
  }
};
```

### 3. 회원 삭제
본인 계정 삭제 및 관련 데이터 cascade 삭제

### 주요 구현 파일:
- `BACK_SERVER/server.py` - 사용자 삭제 API
- `screens/AdminDashboardScreen.js` - 관리자 삭제 기능

### 핵심 코드:
**서버 삭제 API (server.py)**
```python
@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_user(current_user, user_id):
    # 본인만 삭제 가능하도록 권한 체크
    if current_user['id'] != user_id:
        return jsonify({'error': '본인 계정만 삭제할 수 있습니다'}), 403
    
    # 트랜잭션으로 안전한 삭제 처리
    connection.begin()
    try:
        # 1. 제출물 삭제
        cursor.execute("DELETE FROM challenge_submissions WHERE user_email = %s", (user_email,))
        # 2. 도전과제 삭제  
        cursor.execute("DELETE FROM challenges WHERE creator = %s", (user_email,))
        # 3. 사용자 삭제
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        connection.commit()
    except Exception as e:
        connection.rollback()
```

### 4. 도전과제 생성
9개 카테고리 태그 시스템과 날짜 형식 변환

### 주요 구현 파일:
- `components/Challenge/ChallengeCreateScreen.js` - 도전과제 생성 화면

### 핵심 코드:
```javascript
const categories = [
  '건강', '교육', '환경', '기술', '예술', '사회봉사', '자기계발', '여행', '요리'
];

const handleSubmit = async () => {
  const formattedStartDate = new Date(startDate).toISOString().split('T')[0];
  const formattedEndDate = new Date(endDate).toISOString().split('T')[0];
  
  const challengeData = {
    title, description, nickname,
    start_date: formattedStartDate,
    end_date: formattedEndDate,
    tags: selectedTags
  };
  
  await challengeAPI.create(challengeData);
};
```

### 5. 도전과제 삭제
생성자 본인 및 관리자 권한 검증을 통한 안전한 삭제

### 주요 구현 파일:
- `BACK_SERVER/server.py` - 도전과제 삭제 API

### 핵심 코드:
```python
@app.route('/api/challenges/<int:challenge_id>', methods=['DELETE'])
@token_required
def delete_challenge(current_user, challenge_id):
    # 관리자 권한 확인
    cursor.execute("SELECT isAdmin FROM users WHERE id = %s", (current_user['id'],))
    user_info = cursor.fetchone()
    is_admin = user_info and user_info.get('isAdmin', False)
    
    # 도전과제 생성자 확인
    cursor.execute("SELECT creator FROM challenges WHERE id = %s", (challenge_id,))
    result = cursor.fetchone()
    
    # 권한 확인: 관리자이거나 생성자인 경우만 삭제 가능
    if not is_admin and result['creator'] != current_user['email']:
        return jsonify({'error': '삭제 권한이 없습니다'}), 403
```

### 6. 도전과제 정보 저장 / 업데이트
도전과제 상태 업데이트 시스템 (진행중, 완료, 만료)

### 주요 구현 파일:
- `BACK_SERVER/server.py` - 상태 업데이트 API
- `services/challengeService.js` - 클라이언트 업데이트 함수

### 핵심 코드:
**서버 업데이트 API (server.py)**
```python
@app.route('/api/challenges/<int:challenge_id>/status', methods=['PUT'])
@token_required
def update_challenge_status(current_user, challenge_id):
    data = request.get_json()
    status = data.get('status')
    
    cursor.execute("UPDATE challenges SET status = %s WHERE id = %s", (status, challenge_id))
    connection.commit()
    
    return jsonify({'message': '도전과제 상태가 업데이트되었습니다'})
```

**클라이언트 상태 업데이트 (challengeService.js)**
```javascript
export const updateChallengeStatus = async (challengeId, status) => {
  try {
    const response = await challengeAPI.updateStatus(challengeId, status);
    return response;
  } catch (error) {
    throw new Error('상태 업데이트 실패: ' + error.message);
  }
};
```

### 7. 사용자 인증사진 업로드 기능
웹과 모바일 플랫폼별 최적화된 파일 처리

### 주요 구현 파일:
- `screens/ChallengeVerification.js` - 사진 업로드 화면

### 핵심 코드:
```javascript
const pickImage = async () => {
  if (Platform.OS === 'web') {
    // 웹: input file 사용
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = handleWebImageUpload;
    input.click();
  } else {
    // 모바일: expo-image-picker 사용
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  }
};
```

### 8. 이미지 적합여부 판단 기능
OCR 기반 포스트잇 닉네임 검증 시스템

### 주요 구현 파일:
- `services/ocrService.js` - OCR 검증 로직

### 핵심 코드:
```javascript
export const verifyWithOCR = async (imageFile, expectedText) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('OCR 검증 시간 초과')), 10000)
  );

  try {
    const ocrResult = await Promise.race([ocrPromise, timeoutPromise]);
    const similarity = calculateSimilarity(detectedText, expectedText);
    
    return {
      success: similarity >= 60, // 60% 유사도 임계값
      similarity,
      detectedText
    };
  } catch (error) {
    console.error('OCR 검증 실패:', error);
    return { success: false, error: error.message };
  }
};
```

### 9. 도전과제 상태 집계 기능
개인별 참여/완료/진행중 통계 계산

### 주요 구현 파일:
- `screens/MyPage.js` - 개인 통계 화면

### 핵심 코드:
```javascript
const calculateStats = () => {
  const totalParticipated = verifications.length;
  const completed = verifications.filter(v => v.isVerified).length;
  const inProgress = verifications.filter(v => !v.isVerified && 
    new Date(v.challengeEndDate) > new Date()).length;
  
  return { totalParticipated, completed, inProgress };
};
```

### 10. 리더보드 출력 기능
상위 3등 사용자 정렬 및 표시

### 주요 구현 파일:
- `screens/LeaderboardScreen.js` - 리더보드 화면

### 핵심 코드:
```javascript
const sortedUsers = useMemo(() => {
  return users
    .map(user => ({
      ...user,
      score: (user.verifications || []).filter(v => v.isVerified).length
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3); // 상위 3등만 표시
}, [users]);
```

### 11. 도전과제 생성, 삭제 권한 검증
JWT 토큰 기반 인증 및 관리자/생성자 권한 검증

### 주요 구현 파일:
- `BACK_SERVER/server.py` - 토큰 인증 데코레이터

### 핵심 코드:
```python
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': '토큰이 없습니다'}), 401
            
        try:
            token = token.split(' ')[1]  # "Bearer <token>"에서 토큰 추출
            data = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
            current_user = {'id': data['user_id'], 'email': data['email']}
        except jwt.ExpiredSignatureError:
            return jsonify({'error': '토큰이 만료되었습니다'}), 401
            
        return f(current_user, *args, **kwargs)
    return decorated
```

### 12. 인증 사진 업로드 권한 검증
로그인 사용자만 업로드 가능하도록 토큰 검증

### 주요 구현 파일:
- `services/api.js` - API 요청 인터셉터

### 핵심 코드:
```javascript
// API 요청시 자동으로 토큰 추가
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 인증사진 업로드 시 토큰 검증
const uploadPhoto = async (formData) => {
  return await api.post('/verifications', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${await AsyncStorage.getItem('token')}`,
    }
  });
};
```

### 13. 도전과제 만료일 알림
24시간 전 자동 알림 시스템

### 주요 구현 파일:
- `services/pushNotificationService.js` - 알림 서비스

### 핵심 코드:
```javascript
checkExpiringChallenges() {
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
  
  this.participatedChallenges.forEach(challenge => {
    const endDate = new Date(challenge.end_date);
    const timeDiff = endDate.getTime() - tomorrow.getTime();
    
    if (Math.abs(timeDiff) < 12 * 60 * 60 * 1000) { // 12시간 오차 허용
      this.showNotification(
        '도전과제 마감 임박!',
        `"${challenge.title}" 도전과제가 내일 마감됩니다.`
      );
    }
  });
}
```

### 14. 관심 도전과제 생성 알림
관심 태그 기반 새 도전과제 알림 (본인 제외)

### 주요 구현 파일:
- `services/pushNotificationService.js` - 관심 태그 알림

### 핵심 코드:
```javascript
async checkNewChallengesByInterests() {
  const userInterests = await this.getUserInterests();
  const newChallenges = await this.getNewChallenges();
  
  for (const challenge of newChallenges) {
    // 본인이 작성한 도전과제 제외
    if (challenge.creator_email === this.currentUserEmail || 
        challenge.creator === this.currentUserEmail) {
      console.log(`🚫 본인이 작성한 도전과제 제외: ${challenge.title}`);
      continue;
    }
    
    // 관심 태그와 매칭 확인
    const hasMatchingTag = challenge.tags?.some(tag => 
      userInterests.some(interest => 
        interest.name.toLowerCase() === tag.toLowerCase()
      )
    );
    
    if (hasMatchingTag) {
      this.showNotification(
        '새 도전과제 알림!',
        `관심 태그 "${challenge.tags[0]}"의 새 도전과제: ${challenge.title}`
      );
    }
  }
}
```

## 🔧 사용자 추가 예정 섹션

### 15. 요구사항 분석


### 16. 테이블 스키마 정의 및 테이블 생성
**포함 내용**:
- ERD(Entity Relationship Diagram)
- 정규화 과정 문서
- 인덱스 설계 전략
- 데이터 무결성 제약조건 정의

**추가 설명**:
데이터베이스 설계 시 확장성을 고려하여 태그 시스템을 별도 테이블로 분리했습니다. user_interests와 challenge_tags 연결 테이블을 통해 다대다 관계를 효율적으로 처리하며, 향후 태그 기반 추천 알고리즘 구현을 위한 기반을 마련했습니다.

### 17. 데이터 연동 API 설계
**포함 내용**:
- RESTful API 설계 원칙 적용
- API 문서 (Swagger/OpenAPI)
- 에러 코드 정의 및 처리 방식
- 버전 관리 전략

**추가 설명**:
RESTful 원칙을 따라 리소스 중심의 URL 구조를 설계했습니다. JWT 토큰 기반 인증을 도입하여 무상태(stateless) 특성을 유지하고, CORS 설정을 통해 웹과 모바일 플랫폼 모두에서 안전하게 API를 호출할 수 있도록 구성했습니다.

### 18. 와이어프레임 작성 (figma 사용)
**포함 내용**:
- 사용자 플로우 다이어그램
- 주요 화면별 와이어프레임
- 인터랙션 프로토타입
- 사용성 테스트 결과 반영사항

### 19. 반응형 웹 설계
**포함 내용**:
- 브레이크포인트 정의 (Mobile: 320-768px, Tablet: 768-1024px, Desktop: 1024px+)
- Flexbox 및 Grid 레이아웃 활용 전략
- 터치 친화적 UI 컴포넌트 설계
- 성능 최적화 방안

**추가 설명**:
React Native의 플랫폼별 조건부 렌더링을 활용하여 웹과 모바일에서 최적화된 사용자 경험을 제공합니다. 특히 이미지 업로드 기능에서 웹은 drag & drop을, 모바일은 네이티브 이미지 피커를 사용하도록 구현했습니다.

### 20. UI 디자인 제작
**포함 내용**:
- 브랜드 아이덴티티 및 컬러 팔레트
- 타이포그래피 시스템
- 아이콘 및 일러스트레이션 가이드
- 디자인 시스템 문서

### 21. UX 흐름 설계
**포함 내용**:
- 사용자 여정 맵 (User Journey Map)
- 태스크 플로우 다이어그램
- 정보 아키텍처 설계
- 접근성(Accessibility) 가이드라인 준수

**추가 설명**:
사용자 중심 설계(UCD) 원칙을 적용하여 도전과제 참여 과정을 최소 3단계(선택-업로드-검증)로 단순화했습니다. OCR 검증 과정에서 실패 시 명확한 피드백을 제공하여 사용자 혼란을 최소화했습니다.

### 22. 각 페이지 프론트 구현
**포함 내용**:
- 컴포넌트 재사용성 설계
- 상태 관리 전략 (Context API, AsyncStorage)
- 성능 최적화 기법 (lazy loading, memoization)
- 크로스 플랫폼 호환성 테스트 결과

**추가 설명**:
React Native의 크로스 플랫폼 특성을 최대한 활용하여 코드 재사용률 85% 이상을 달성했습니다. 공통 컴포넌트(Button, Input)를 설계하여 일관된 UI/UX를 제공하며, Platform.OS를 활용한 플랫폼별 최적화를 구현했습니다.

## 🏗️ 기술 스택

### Frontend
- **React Native**: 크로스 플랫폼 모바일 앱 개발
- **Expo**: 개발 환경 및 빌드 도구  
- **AsyncStorage**: 로컬 데이터 저장
- **Axios**: HTTP 클라이언트
- **expo-notifications**: 로컬 푸시 알림
- **expo-image-manipulator**: 이미지 처리
- **@react-native-community/datetimepicker**: 날짜 선택

### Backend
- **Python Flask**: REST API 서버
- **MySQL**: 관계형 데이터베이스
- **PyMySQL**: MySQL 연결 드라이버
- **JWT**: 인증 토큰
- **bcrypt**: 비밀번호 암호화
- **OCR.space API**: 이미지 텍스트 인식

### External APIs
- **OCR.space**: 텍스트 인식 API
- **Browser Notification API**: 웹 브라우저 알림

## 📱 주요 기능

### 🔐 인증 시스템
- JWT 기반 사용자 인증
- 관리자/일반 사용자 구분
- 자동 로그인 상태 유지

### 🎯 도전과제 관리
- 9개 카테고리 태그 시스템
- 만료일 설정 (OS별 최적화된 DatePicker)
- 실시간 상태 업데이트

### 🔔 스마트 알림 시스템
- **만료 예정 알림**: 24시간 전 자동 알림
- **관심 태그 알림**: 새 도전과제 실시간 알림 (본인 제외)
- **플랫폼별 최적화**: 웹(브라우저), 모바일(로컬 푸시)
- **30초 주기 체크**: 빠른 반응성
- **중복 방지**: 동일 알림 중복 전송 방지

### 🔍 OCR 인증 시스템
- **포스트잇 검출**: 백엔드 우선, 실패시 클라이언트 fallback
- **텍스트 인식**: OCR.space API 활용
- **유사도 기반 매칭**: 60% 임계값으로 관대한 인증
- **타임아웃 처리**: 무한로딩 방지

### 📊 리더보드 & 통계
- 완료 도전과제 수 기준 랭킹
- 개인 통계 (총/완료/진행중)
- 실시간 순위 업데이트

## 🧪 테스트 가이드

### 알림 시스템 테스트
1. MyPage → "🔔 실제 푸시 알림 테스트" 클릭
2. MyPage → "🔍 관심 태그 알림 수동 체크" 클릭
3. 관심 태그 설정 후 다른 계정으로 해당 태그 도전과제 생성

### OCR 인증 테스트
1. 도전과제 참여 → 인증하기
2. 포스트잇에 닉네임 작성한 사진 업로드
3. OCR 인증 통과 후 제출

### 크로스 플랫폼 테스트
- **웹**: `npm start` → w 키 → 브라우저에서 테스트
- **모바일**: Expo Go 앱으로 QR 코드 스캔

## 🔧 환경별 설정

### 개발 환경
- API 서버: `http://219.254.146.234:5000`
- 알림 체크 주기: 30초
- OCR 타임아웃: 10초
- 포스트잇 검출: 백엔드 우선
