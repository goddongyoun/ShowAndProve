from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
from pymysql import Error
import bcrypt
import jwt
import datetime
from functools import wraps
import os

app = Flask(__name__)
CORS(app)

# 환경변수에서 설정값 가져오기
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', '**v61r+m=g%#D]H6k*|Xf59ym=j#TlAZ)=Hx?.c3{z+bIqAG36j..cTMAO5+VHXv')

# MySQL 데이터베이스 연결 설정
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'database': os.getenv('DB_NAME', 'ChallengeDB'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD')  # 환경변수에서 가져옴 (필수)
}

# 데이터베이스 연결 함수
def get_db_connection():
    try:
        # DB_PASSWORD 환경변수 체크
        if not DB_CONFIG['password']:
            print("❌ DB_PASSWORD 환경변수가 설정되지 않았습니다!")
            print("다음 명령어로 설정하세요:")
            print("Windows: set DB_PASSWORD=your_mysql_password")
            print("Linux/Mac: export DB_PASSWORD=your_mysql_password")
            return None
            
        connection = pymysql.connect(
            host=DB_CONFIG['host'],
            user=DB_CONFIG['user'],
            password=DB_CONFIG['password'],
            database=DB_CONFIG['database'],
            charset='utf8mb4',
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False
        )
        return connection
    except Error as e:
        print(f"데이터베이스 연결 오류: {e}")
        return None

# JWT 토큰 검증 데코레이터
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        
        if not token:
            return jsonify({'error': '토큰이 필요합니다'}), 401
        
        try:
            if token.startswith('Bearer '):
                token = token[7:]
            data = jwt.decode(token, app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            current_user_id = data['user_id']
        except jwt.ExpiredSignatureError:
            return jsonify({'error': '토큰이 만료되었습니다'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': '유효하지 않은 토큰입니다'}), 401
        
        return f(current_user_id, *args, **kwargs)
    
    return decorated

# 요청 로깅 함수
def log_request():
    print(f"\n=== {request.method} {request.url} ===")
    print(f"Headers: {dict(request.headers)}")
    if request.method in ['POST', 'PUT', 'PATCH']:
        if request.is_json:
            print(f"JSON Body: {request.get_json()}")
        elif request.form:
            print(f"Form Data: {dict(request.form)}")
        elif request.files:
            print(f"Files: {list(request.files.keys())}")
    print("=" * 50)

@app.before_request
def before_request():
    log_request()



# 회원가입
@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'error': '이메일, 비밀번호, 이름이 필요합니다'}), 400
    
    connection = get_db_connection()
    if connection is None:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    
    cursor = connection.cursor()
    
    try:
        # 이메일 중복 체크
        cursor.execute("SELECT id FROM users WHERE email = %s", (data['email'],))
        if cursor.fetchone():
            return jsonify({'error': '이미 존재하는 이메일입니다'}), 400
        
        # 비밀번호 해시화
        hashed_password = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt())
        
        # 사용자 생성
        insert_query = "INSERT INTO users (email, password, name) VALUES (%s, %s, %s)"
        cursor.execute(insert_query, (data['email'], hashed_password, data['name']))
        connection.commit()
        
        user_id = cursor.lastrowid
        
        return jsonify({
            'message': '회원가입 성공',
            'user': {
                'id': user_id,
                'email': data['email'],
                'name': data['name']
            }
        }), 201
        
    except Error as e:
        print(f"회원가입 오류: {e}")
        return jsonify({'error': '회원가입 실패'}), 500
    finally:
        cursor.close()
        connection.close()

# 로그인
@app.route('/api/login', methods=['POST'])
def login_user():
    data = request.get_json()
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': '이메일과 비밀번호가 필요합니다'}), 400
    
    connection = get_db_connection()
    if connection is None:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    
    cursor = connection.cursor()
    
    try:
        # 사용자 조회
        cursor.execute("SELECT * FROM users WHERE email = %s", (data['email'],))
        user = cursor.fetchone()
        
        if not user or not bcrypt.checkpw(data['password'].encode('utf-8'), user['password'].encode('utf-8')):
            return jsonify({'error': '이메일 또는 비밀번호가 잘못되었습니다'}), 401
        
        # JWT 토큰 생성
        token = jwt.encode({
            'user_id': user['id'],
            'email': user['email'],
            'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
        }, app.config['JWT_SECRET_KEY'], algorithm='HS256')
        
        return jsonify({
            'message': '로그인 성공',
            'token': token,
            'user': {
                'id': user['id'],
                'email': user['email'],
                'name': user['name']
            }
        })
        
    except Error as e:
        print(f"로그인 오류: {e}")
        return jsonify({'error': '로그인 실패'}), 500
    finally:
        cursor.close()
        connection.close()

# 도전과제 생성
@app.route('/api/challenges', methods=['POST'])
@token_required
def create_challenge(current_user_id):
    data = request.get_json()
    
    if not data or not data.get('title'):
        return jsonify({'error': '제목이 필요합니다'}), 400
    
    connection = get_db_connection()
    if connection is None:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    
    cursor = connection.cursor()
    
    try:
        insert_query = "INSERT INTO challenges (title, description, creator_id) VALUES (%s, %s, %s)"
        cursor.execute(insert_query, (data['title'], data.get('description', ''), current_user_id))
        connection.commit()
        
        challenge_id = cursor.lastrowid
        
        return jsonify({
            'message': '도전과제 생성 성공',
            'challenge': {
                'id': challenge_id,
                'title': data['title'],
                'description': data.get('description', ''),
                'creator_id': current_user_id,
                'status': 'active'
            }
        }), 201
        
    except Error as e:
        print(f"도전과제 생성 오류: {e}")
        return jsonify({'error': '도전과제 생성 실패'}), 500
    finally:
        cursor.close()
        connection.close()

# 도전과제 목록 조회 (로그인 불필요)
@app.route('/api/challenges', methods=['GET'])
def get_challenges():
    connection = get_db_connection()
    if connection is None:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    
    cursor = connection.cursor()
    
    try:
        query = """
        SELECT c.*, u.name as creator_name 
        FROM challenges c 
        JOIN users u ON c.creator_id = u.id 
        ORDER BY c.created_at DESC
        """
        cursor.execute(query)
        challenges = cursor.fetchall()
        
        return jsonify({
            'message': '도전과제 목록 조회 성공',
            'challenges': challenges
        })
        
    except Error as e:
        print(f"도전과제 목록 조회 오류: {e}")
        return jsonify({'error': '도전과제 목록 조회 실패'}), 500
    finally:
        cursor.close()
        connection.close()

# 사진 인증 업로드
@app.route('/api/verifications', methods=['POST'])
@token_required
def upload_verification(current_user_id):
    challenge_id = request.form.get('challengeId')
    
    if not challenge_id:
        return jsonify({'error': '도전과제 ID가 필요합니다'}), 400
    
    # 파일 처리 (실제 파일 저장 로직은 별도 구현 필요)
    photo_url = f"mock-photo-{challenge_id}-{current_user_id}.jpg"
    
    connection = get_db_connection()
    if connection is None:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    
    cursor = connection.cursor()
    
    try:
        insert_query = "INSERT INTO verifications (challenge_id, user_id, photo_url) VALUES (%s, %s, %s)"
        cursor.execute(insert_query, (challenge_id, current_user_id, photo_url))
        connection.commit()
        
        verification_id = cursor.lastrowid
        
        return jsonify({
            'message': '인증 사진 업로드 성공',
            'verification': {
                'id': verification_id,
                'challenge_id': challenge_id,
                'user_id': current_user_id,
                'photo_url': photo_url
            }
        }), 201
        
    except Error as e:
        print(f"인증 사진 업로드 오류: {e}")
        return jsonify({'error': '인증 사진 업로드 실패'}), 500
    finally:
        cursor.close()
        connection.close()

# 도전과제 삭제
@app.route('/api/challenges/<int:challenge_id>', methods=['DELETE'])
@token_required
def delete_challenge(current_user_id, challenge_id):
    connection = get_db_connection()
    if connection is None:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    
    cursor = connection.cursor()
    
    try:
        # 도전과제 소유자 확인
        cursor.execute("SELECT creator_id FROM challenges WHERE id = %s", (challenge_id,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({'error': '도전과제를 찾을 수 없습니다'}), 404
        
        if result[0] != current_user_id:
            return jsonify({'error': '삭제 권한이 없습니다'}), 403
        
        # 도전과제 삭제 (외래키로 연결된 데이터도 자동 삭제됨)
        cursor.execute("DELETE FROM challenges WHERE id = %s", (challenge_id,))
        connection.commit()
        
        return jsonify({'message': '도전과제 삭제 성공'})
        
    except Error as e:
        print(f"도전과제 삭제 오류: {e}")
        return jsonify({'error': '도전과제 삭제 실패'}), 500
    finally:
        cursor.close()
        connection.close()

# 인증 사진 목록 조회 (로그인 불필요)
@app.route('/api/verifications/<int:challenge_id>', methods=['GET'])
def get_verifications(challenge_id):
    connection = get_db_connection()
    if connection is None:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    
    cursor = connection.cursor()
    
    try:
        query = """
        SELECT v.*, u.name as user_name 
        FROM verifications v 
        JOIN users u ON v.user_id = u.id 
        WHERE v.challenge_id = %s 
        ORDER BY v.created_at DESC
        """
        cursor.execute(query, (challenge_id,))
        verifications = cursor.fetchall()
        
        return jsonify({
            'message': '인증 사진 목록 조회 성공',
            'verifications': verifications
        })
        
    except Error as e:
        print(f"인증 사진 목록 조회 오류: {e}")
        return jsonify({'error': '인증 사진 목록 조회 실패'}), 500
    finally:
        cursor.close()
        connection.close()

# 인증 사진 삭제
@app.route('/api/verifications/<int:verification_id>', methods=['DELETE'])
@token_required
def delete_verification(current_user_id, verification_id):
    connection = get_db_connection()
    if connection is None:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    
    cursor = connection.cursor()
    
    try:
        # 인증 사진 소유자 확인
        cursor.execute("SELECT user_id FROM verifications WHERE id = %s", (verification_id,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({'error': '인증 사진을 찾을 수 없습니다'}), 404
        
        if result[0] != current_user_id:
            return jsonify({'error': '삭제 권한이 없습니다'}), 403
        
        cursor.execute("DELETE FROM verifications WHERE id = %s", (verification_id,))
        connection.commit()
        
        return jsonify({'message': '인증 사진 삭제 성공'})
        
    except Error as e:
        print(f"인증 사진 삭제 오류: {e}")
        return jsonify({'error': '인증 사진 삭제 실패'}), 500
    finally:
        cursor.close()
        connection.close()

# 도전과제 상태 업데이트
@app.route('/api/challenges/<int:challenge_id>/status', methods=['PATCH'])
@token_required
def update_challenge_status(current_user_id, challenge_id):
    data = request.get_json()
    
    if not data or 'status' not in data:
        return jsonify({'error': '상태 값이 필요합니다'}), 400
    
    valid_statuses = ['active', 'completed', 'cancelled']
    if data['status'] not in valid_statuses:
        return jsonify({'error': f'유효한 상태: {valid_statuses}'}), 400
    
    connection = get_db_connection()
    if connection is None:
        return jsonify({'error': '데이터베이스 연결 실패'}), 500
    
    cursor = connection.cursor()
    
    try:
        # 도전과제 소유자 확인
        cursor.execute("SELECT creator_id FROM challenges WHERE id = %s", (challenge_id,))
        result = cursor.fetchone()
        
        if not result:
            return jsonify({'error': '도전과제를 찾을 수 없습니다'}), 404
        
        if result[0] != current_user_id:
            return jsonify({'error': '수정 권한이 없습니다'}), 403
        
        cursor.execute("UPDATE challenges SET status = %s WHERE id = %s", (data['status'], challenge_id))
        connection.commit()
        
        return jsonify({'message': '도전과제 상태 업데이트 성공', 'status': data['status']})
        
    except Error as e:
        print(f"도전과제 상태 업데이트 오류: {e}")
        return jsonify({'error': '도전과제 상태 업데이트 실패'}), 500
    finally:
        cursor.close()
        connection.close()

# 기본 루트
@app.route('/')
def home():
    return jsonify({
        "message": "Challenge API Server with MySQL 실행 중",
        "database": "ChallengeDB",
        "endpoints": [
            "POST /api/register - 회원가입",
            "POST /api/login - 로그인",
            "POST /api/challenges - 도전과제 생성",
            "GET /api/challenges - 도전과제 목록 조회", 
            "POST /api/verifications - 사진 인증 업로드",
            "DELETE /api/challenges/<id> - 도전과제 삭제",
            "GET /api/verifications/<challenge_id> - 인증 사진 목록 조회",
            "DELETE /api/verifications/<id> - 인증 사진 삭제",
            "PATCH /api/challenges/<id>/status - 도전과제 상태 업데이트"
        ]
    })

# 에러 핸들러
@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "error": "엔드포인트를 찾을 수 없습니다",
        "requested_url": request.url
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "error": "서버 내부 오류가 발생했습니다",
        "details": str(error)
    }), 500

if __name__ == '__main__':
    print("Challenge API Server with MySQL 시작...")
    print("서버 주소: http://203.234.62.50:5000")
    print("로컬 테스트: http://localhost:5000")
    print("🔧 필요 패키지:")
    print("  pip install flask flask-cors pymysql bcrypt pyjwt")
    print("\n🔧 환경변수 설정:")
    print("Windows:")
    print("  set DB_PASSWORD=your_mysql_password")
    print("  set JWT_SECRET_KEY=your_jwt_secret_key")
    print("\nLinux/Mac:")
    print("  export DB_PASSWORD=your_mysql_password")
    print("  export JWT_SECRET_KEY=your_jwt_secret_key")
    print("\n📋 현재 설정:")
    print(f"  DB_HOST: {DB_CONFIG['host']}")
    print(f"  DB_NAME: {DB_CONFIG['database']}")
    print(f"  DB_USER: {DB_CONFIG['user']}")
    print(f"  DB_PASSWORD: {'✅ 설정됨' if DB_CONFIG['password'] else '❌ 설정 필요'}")
    print(f"  JWT_SECRET_KEY: {'✅ 설정됨' if os.getenv('JWT_SECRET_KEY') else '⚠️  기본값 사용'}")
    
    app.run(host='0.0.0.0', port=5000, debug=True)