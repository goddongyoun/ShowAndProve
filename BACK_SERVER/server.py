from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import pymysql
from pymysql import Error
import bcrypt
import jwt
import datetime
from functools import wraps
import os
from werkzeug.utils import secure_filename

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

# 사진 업로드 설정
UPLOAD_FOLDER = 'photos'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

# photos 폴더가 없으면 생성
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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

# JWT 토큰 검증 데코레이터 (수정됨)
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
            
            # 사용자 정보 가져오기
            connection = get_db_connection()
            if connection is None:
                return jsonify({'error': '데이터베이스 연결 실패'}), 500
                
            cursor = connection.cursor()
            cursor.execute("SELECT * FROM users WHERE id = %s", (data['user_id'],))
            user = cursor.fetchone()
            cursor.close()
            connection.close()
            
            if not user:
                return jsonify({'error': '사용자를 찾을 수 없습니다'}), 401
                
            current_user = {
                'id': user['id'],
                'email': user['email'],
                'name': user['name']
            }
            
        except jwt.ExpiredSignatureError:
            return jsonify({'error': '토큰이 만료되었습니다'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': '유효하지 않은 토큰입니다'}), 401
        
        return f(current_user, *args, **kwargs)
    
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

# 도전과제 생성 API (사진 없이 기본 정보만)
@app.route('/api/challenges', methods=['POST'])
@token_required
def create_challenge(current_user):
    try:
        data = request.get_json()
        title = data.get('title')
        content = data.get('content')
        
        if not title or not content:
            return jsonify({'error': '제목과 내용을 모두 입력해주세요'}), 400
        
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # challenges 테이블에 기본 정보만 저장 (사진 없음)
        query = """
        INSERT INTO challenges (title, content, creator, creator_name, created_at) 
        VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            title, 
            content, 
            current_user['email'], 
            current_user['name'],
            datetime.datetime.now()
        ))
        connection.commit()
        challenge_id = cursor.lastrowid
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': '도전과제가 성공적으로 생성되었습니다',
            'challenge_id': challenge_id
        }), 201
        
    except Exception as e:
        print(f"도전과제 생성 오류: {e}")
        return jsonify({'error': '도전과제 생성 중 오류가 발생했습니다'}), 500

# 도전과제 목록 조회 API
@app.route('/api/challenges', methods=['GET'])
def get_challenges():
    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # challenges 테이블에서 기본 정보 조회
        query = """
        SELECT c.id as _id, c.title, c.content, c.creator, c.creator_name as creatorName, c.created_at,
               COUNT(cs.id) as submission_count
        FROM challenges c
        LEFT JOIN challenge_submissions cs ON c.id = cs.challenge_id
        GROUP BY c.id, c.title, c.content, c.creator, c.creator_name, c.created_at
        ORDER BY c.created_at DESC
        """
        cursor.execute(query)
        challenges = cursor.fetchall()
        cursor.close()
        connection.close()
        
        # 딕셔너리로 변환
        challenge_list = []
        for challenge in challenges:
            challenge_dict = {
                '_id': challenge['_id'],
                'title': challenge['title'], 
                'content': challenge['content'],
                'creator': challenge['creator'],
                'creatorName': challenge['creatorName'],
                'created_at': challenge['created_at'],
                'submission_count': challenge['submission_count']  # 참여자 수
            }
            challenge_list.append(challenge_dict)
        
        return jsonify(challenge_list), 200
        
    except Exception as e:
        print(f"도전과제 조회 오류: {e}")
        return jsonify({'error': '도전과제 조회 중 오류가 발생했습니다'}), 500

# 도전과제 참여/사진 제출 API
@app.route('/api/challenges/<int:challenge_id>/submit', methods=['POST'])
@token_required
def submit_to_challenge(current_user, challenge_id):
    try:
        comment = request.form.get('comment', '')
        
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 도전과제 존재 확인
        cursor.execute("SELECT id FROM challenges WHERE id = %s", (challenge_id,))
        if not cursor.fetchone():
            cursor.close()
            connection.close()
            return jsonify({'error': '존재하지 않는 도전과제입니다'}), 404
        
        # 이미 참여했는지 확인
        #cursor.execute("""
        #    SELECT id FROM challenge_submissions 
        #    WHERE challenge_id = %s AND user_email = %s
        #""", (challenge_id, current_user['email']))
        #
        #if cursor.fetchone():
        #   cursor.close()
        #   connection.close()
        #   return jsonify({'error': '이미 이 도전과제에 참여하셨습니다'}), 400
        
        photo_path = None
        
        # 사진 파일 처리
        if 'photo' in request.files:
            file = request.files['photo']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S_')
                filename = timestamp + filename
                
                file_path = os.path.join(UPLOAD_FOLDER, filename)
                file.save(file_path)
                photo_path = f"/photos/{filename}"
        
        # challenge_submissions 테이블에 제출 정보 저장
        query = """
        INSERT INTO challenge_submissions (challenge_id, user_email, user_name, photo_path, comment, submitted_at) 
        VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (
            challenge_id,
            current_user['email'], 
            current_user['name'],
            photo_path,
            comment,
            datetime.datetime.now()
        ))
        connection.commit()
        submission_id = cursor.lastrowid
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': '도전과제 참여가 완료되었습니다',
            'submission_id': submission_id,
            'photo_path': photo_path
        }), 201
        
    except Exception as e:
        print(f"도전과제 참여 오류: {e}")
        return jsonify({'error': '도전과제 참여 중 오류가 발생했습니다'}), 500

# 특정 도전과제의 제출물들 조회 API
@app.route('/api/challenges/<int:challenge_id>/submissions', methods=['GET'])
def get_challenge_submissions(challenge_id):
    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        query = """
        SELECT cs.id, cs.user_email, cs.user_name, cs.photo_path, cs.comment, cs.submitted_at,
               c.title as challenge_title
        FROM challenge_submissions cs
        JOIN challenges c ON cs.challenge_id = c.id
        WHERE cs.challenge_id = %s
        ORDER BY cs.submitted_at DESC
        """
        cursor.execute(query, (challenge_id,))
        submissions = cursor.fetchall()
        cursor.close()
        connection.close()
        
        submission_list = []
        for submission in submissions:
            submission_dict = {
                'id': submission['id'],
                'user_email': submission['user_email'],
                'user_name': submission['user_name'],
                'photo_path': submission['photo_path'],
                'comment': submission['comment'],
                'submitted_at': submission['submitted_at'],
                'challenge_title': submission['challenge_title']
            }
            submission_list.append(submission_dict)
        
        return jsonify(submission_list), 200
        
    except Exception as e:
        print(f"제출물 조회 오류: {e}")
        return jsonify({'error': '제출물 조회 중 오류가 발생했습니다'}), 500

# 도전과제 상태 업데이트 API (누락되어 있던 엔드포인트)
@app.route('/api/challenges/<int:challenge_id>/status', methods=['PATCH'])
@token_required
def update_challenge_status(current_user, challenge_id):
    try:
        data = request.get_json()
        
        if not data or 'status' not in data:
            return jsonify({'error': '상태 값이 필요합니다'}), 400
        
        valid_statuses = ['완료', '실패', 'active', 'completed', 'cancelled']
        if data['status'] not in valid_statuses:
            return jsonify({'error': f'유효한 상태: {valid_statuses}'}), 400
        
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 도전과제 존재 및 권한 확인 (생성자만 상태 변경 가능)
        cursor.execute("SELECT creator FROM challenges WHERE id = %s", (challenge_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            connection.close()
            return jsonify({'error': '도전과제를 찾을 수 없습니다'}), 404
        
        if result['creator'] != current_user['email']:
            cursor.close()
            connection.close()
            return jsonify({'error': '상태 변경 권한이 없습니다'}), 403
        
        # 상태 업데이트 (challenges 테이블에 status 컬럼이 없다면 추가 필요)
        cursor.execute("UPDATE challenges SET status = %s WHERE id = %s", (data['status'], challenge_id))
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': '도전과제 상태 업데이트 성공', 
            'status': data['status']
        }), 200
        
    except Exception as e:
        print(f"도전과제 상태 업데이트 오류: {e}")
        return jsonify({'error': '도전과제 상태 업데이트 실패'}), 500

# 인증 사진 삭제 API (누락되어 있던 엔드포인트)
@app.route('/api/verifications/<int:verification_id>', methods=['DELETE'])
@token_required
def delete_verification(current_user, verification_id):
    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 권한 확인 (제출자만 삭제 가능)
        cursor.execute("SELECT user_email FROM challenge_submissions WHERE id = %s", (verification_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            connection.close()
            return jsonify({'error': '존재하지 않는 인증 사진입니다'}), 404
        
        if result['user_email'] != current_user['email']:
            cursor.close()
            connection.close()
            return jsonify({'error': '삭제 권한이 없습니다'}), 403
        
        # 인증 사진 삭제
        cursor.execute("DELETE FROM challenge_submissions WHERE id = %s", (verification_id,))
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'message': '인증 사진이 성공적으로 삭제되었습니다'}), 200
        
    except Exception as e:
        print(f"인증 사진 삭제 오류: {e}")
        return jsonify({'error': '인증 사진 삭제 중 오류가 발생했습니다'}), 500

# 도전과제 삭제 API
@app.route('/api/challenges/<int:challenge_id>', methods=['DELETE'])
@token_required
def delete_challenge(current_user, challenge_id):
    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 권한 확인 (생성자만 삭제 가능)
        cursor.execute("SELECT creator FROM challenges WHERE id = %s", (challenge_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            connection.close()
            return jsonify({'error': '존재하지 않는 도전과제입니다'}), 404
        
        if result['creator'] != current_user['email']:
            cursor.close()
            connection.close()
            return jsonify({'error': '삭제 권한이 없습니다'}), 403
        
        # 도전과제 삭제 (CASCADE로 관련 제출물도 자동 삭제)
        cursor.execute("DELETE FROM challenges WHERE id = %s", (challenge_id,))
        connection.commit()
        cursor.close()
        connection.close()
        
        return jsonify({'message': '도전과제가 성공적으로 삭제되었습니다'}), 200
        
    except Exception as e:
        print(f"도전과제 삭제 오류: {e}")
        return jsonify({'error': '도전과제 삭제 중 오류가 발생했습니다'}), 500

# 사진 파일 제공 API
@app.route('/photos/<filename>')
def uploaded_file(filename):
    print(f"=== Photo Request ===")
    print(f"Sending photo: {filename}")
    print(f"Request from: {request.remote_addr}")
    print(f"Full path: {os.path.join(UPLOAD_FOLDER, filename)}")
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/api/users/<user_email>/challenges', methods=['GET'])
def get_user_challenges(user_email):
    try:
        print(f"=== User Challenges Request ===")
        print(f"User Email: {user_email}")
        
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 사용자가 참여한 도전과제 조회 (MySQL 쿼리)
        query = """
        SELECT DISTINCT c.id as _id, c.title, c.content, c.creator, 
            c.creator_name as creatorName, c.created_at as createdAt, c.status
        FROM challenges c
        JOIN challenge_submissions cs ON c.id = cs.challenge_id
        WHERE cs.user_email = %s
        ORDER BY c.created_at DESC
        """
        cursor.execute(query, (user_email,))
        user_challenges = cursor.fetchall()
        cursor.close()
        connection.close()
        
        print(f"Found challenges: {len(user_challenges)}")
        print(f"Returning {len(user_challenges)} challenges")
        
        return jsonify(user_challenges), 200
        
    except Exception as e:
        print(f"Error in get_user_challenges: {str(e)}")
        return jsonify({"message": str(e)}), 500

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
            "POST /api/challenges/<id>/submit - 도전과제 참여/사진 제출",
            "GET /api/challenges/<id>/submissions - 특정 도전과제 제출물 조회",
            "PATCH /api/challenges/<id>/status - 도전과제 상태 업데이트",
            "DELETE /api/verifications/<id> - 인증 사진 삭제",
            "DELETE /api/challenges/<id> - 도전과제 삭제",
            "GET /photos/<filename> - 업로드된 사진 조회"
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