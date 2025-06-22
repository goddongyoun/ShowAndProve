"""
명령어의 나열만 보기 위함이라면 직접 필요 모듈만 인스톨 하고 로컬로 실행시키시면 됩니다. 단 mysql에 DB와 테이블이 존재하지 않으면 백엔드 서버로서 활동하지 못합니다.

필요한 모듈을 인스톨 하시고 서버를 파이썬으로 실행시킨 후에
http://127.0.0.1:5000/
or
http://219.254.146.234:5000/
여기로 들어가시면 모든 엔드포인트가 출력될겁니다. 만약 글씨가 깨져보이거나 한국어가 보이지 않는다면, 크롬 기준 화면 위쪽에 pretty print 적용 누르시면 한국어 표시될 겁니다.
description : 어떤 행위를 하는 함수(엔드포인트)인지
request : 함수(엔드포인트)가 필요로 하는 입력값
response_error : 제대로 실행되지 않았을때 반환하는 json 형태
response_success : 제대로 실행되었을때 반환하는 json 형태
"""
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
import base64
import io
from PIL import Image
import threading  # threading 모듈 추가
from app_umai import find_postit  # 기존 함수 그대로 사용


# 메모리 기반 알림 저장소
notification_store = {}
# 구조: {'user_email@example.com': [notification1, notification2, ...]}

def add_notification(user_email, notification_data):
    """
    특정 사용자에게 알림 추가
    """
    if user_email not in notification_store:
        notification_store[user_email] = []
    
    notification_store[user_email].append(notification_data)
    print(f"📢 알림 추가: {user_email} -> {notification_data}")

def get_and_clear_notifications(user_email):
    """
    사용자의 알림을 가져오고 메모리에서 삭제
    """
    notifications = notification_store.get(user_email, [])
    if user_email in notification_store:
        del notification_store[user_email]
        print(f"🗑️  알림 전송 후 삭제: {user_email} ({len(notifications)}개)")
    return notifications

def notify_users_for_tag_challenge(challenge_id, challenge_title, tag_ids):
    """
    태그에 관심 있는 사용자들에게 새로운 도전과제 알림을 보내는 함수
    백그라운드 스레드에서 실행됩니다.
    """
    try:
        print(f"🔔 태그 알림 처리 시작: 도전과제 ID={challenge_id}, 태그 IDs={tag_ids}")
        
        connection = get_db_connection()
        if connection is None:
            print("❌ 알림 처리 중 데이터베이스 연결 실패")
            return
            
        cursor = connection.cursor()
        
        # 해당 태그들에 관심 있는 사용자들 조회
        if tag_ids:
            tag_ids_str = ', '.join(['%s'] * len(tag_ids))
            query = f"""
            SELECT DISTINCT u.email, u.name, t.name as tag_name
            FROM users u
            JOIN user_interests ui ON u.id = ui.user_id
            JOIN tags t ON ui.tag_id = t.id
            WHERE ui.tag_id IN ({tag_ids_str})
            """
            cursor.execute(query, tag_ids)
            interested_users = cursor.fetchall()
            
            print(f"📋 관심 있는 사용자 {len(interested_users)}명 발견")
            
            # 각 사용자에게 알림 추가
            for user in interested_users:
                notification_data = {
                    'type': 'new_challenge',
                    'title': f'새로운 도전과제: {challenge_title}',
                    'message': f'관심 태그 "{user["tag_name"]}"의 새로운 도전과제가 등록되었습니다!',
                    'challenge_id': challenge_id,
                    'created_at': datetime.datetime.now().isoformat()
                }
                add_notification(user['email'], notification_data)
                print(f"✅ 알림 전송: {user['email']} ({user['name']})")
        
        cursor.close()
        connection.close()
        print(f"🎉 태그 알림 처리 완료: 도전과제 ID={challenge_id}")
        
    except Exception as e:
        print(f"❌ 태그 알림 처리 오류: {e}")

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
                'name': user['name'],
                'isAdmin': user['isAdmin']  # isAdmin 필드 추가
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
                'name': user['name'],
                'isAdmin': user['isAdmin'],
            }
        })
        
    except Error as e:
        print(f"로그인 오류: {e}")
        return jsonify({'error': '로그인 실패'}), 500
    finally:
        cursor.close()
        connection.close()

@app.route('/api/users', methods=['GET'])
@token_required
def get_all_users(current_user):
    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 비밀번호를 제외한 모든 사용자 정보 조회
        query = """
        SELECT id, email, name, isAdmin, created_at
        FROM users
        ORDER BY id
        """
        cursor.execute(query)
        users = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify(users), 200
        
    except Exception as e:
        print(f"사용자 조회 오류: {e}")
        return jsonify({'error': '사용자 조회 중 오류가 발생했습니다'}), 500

# 도전과제 생성 API (사진 없이 기본 정보만)
@app.route('/api/challenges', methods=['POST'])
@token_required
def create_challenge(current_user):
    try:
        data = request.get_json()
        title = data.get('title')
        content = data.get('content')
        tags = data.get('tags', [])  # 태그 목록 가져오기 (없으면 빈 배열)
        expired_date = data.get('expired_date')  # 만기일 가져오기
        
        if not title or not content:
            return jsonify({'error': '제목과 내용을 모두 입력해주세요'}), 400
        
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 트랜잭션 시작
        connection.begin()
        
        try:
            # 현재 시간 계산
            now = datetime.datetime.now()
            
            # expired_date가 없거나 null이면 기본값으로 생성일 + 7일 설정
            if not expired_date:
                expired_date = now + datetime.timedelta(days=7)
            else:
                # 문자열로 받은 경우 datetime 객체로 변환
                try:
                    expired_date = datetime.datetime.fromisoformat(expired_date.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    # 유효하지 않은 날짜 형식인 경우 기본값 사용
                    expired_date = now + datetime.timedelta(days=7)
            
            # 1. challenges 테이블에 기본 정보와 만기일 저장
            query = """
            INSERT INTO challenges (title, content, creator, creator_name, created_at, expired_date) 
            VALUES (%s, %s, %s, %s, %s, %s)
            """
            cursor.execute(query, (
                title, 
                content, 
                current_user['email'], 
                current_user['name'],
                now,
                expired_date
            ))
            
            challenge_id = cursor.lastrowid
            
            # 2. 태그 처리
            if tags and len(tags) > 0:
                for tag_name in tags:
                    # 2-1. 태그가 이미 존재하는지 확인
                    cursor.execute("SELECT id FROM tags WHERE name = %s", (tag_name,))
                    tag_result = cursor.fetchone()
                    
                    if tag_result:
                        # 기존 태그인 경우
                        tag_id = tag_result['id']
                    else:
                        # 새 태그인 경우, 추가
                        cursor.execute("INSERT INTO tags (name) VALUES (%s)", (tag_name,))
                        tag_id = cursor.lastrowid
                    
                    # 2-2. 챌린지-태그 연결 정보 저장
                    cursor.execute(
                        "INSERT INTO challenge_tags (challenge_id, tag_id) VALUES (%s, %s)",
                        (challenge_id, tag_id)
                    )
            
            # 트랜잭션 커밋
            connection.commit()
            
            # 3. 태그에 관심 있는 사용자들에게 알림 보내기 (트랜잭션 외부에서 처리)
            if tags and len(tags) > 0:
                # 처리된 태그 ID들 가져오기
                tag_names_str = ', '.join(['%s'] * len(tags))
                cursor.execute(f"SELECT id FROM tags WHERE name IN ({tag_names_str})", tags)
                tag_ids = [row['id'] for row in cursor.fetchall()]
                
                # 백그라운드에서 알림 처리
                threading.Thread(
                    target=notify_users_for_tag_challenge,
                    args=(challenge_id, title, tag_ids)
                ).start()
            
            # 만기일 포맷 변환 (응답용)
            formatted_expired_date = expired_date.isoformat() if expired_date else None
            
            return jsonify({
                'message': '도전과제가 성공적으로 생성되었습니다',
            }), 201
            
        except Exception as e:
            # 오류 발생 시 롤백
            connection.rollback()
            print(f"도전과제 생성 오류: {e}")
            return jsonify({'error': '도전과제 생성 중 오류가 발생했습니다'}), 500
        finally:
            cursor.close()
            connection.close()
            
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
        
        # challenges 테이블에서 기본 정보 조회 (expired_date 추가)
        query = """
        SELECT c.id as _id, c.title, c.content, c.creator, c.creator_name as creatorName, 
               c.created_at, c.expired_date, c.status,
               COUNT(cs.id) as submission_count
        FROM challenges c
        LEFT JOIN challenge_submissions cs ON c.id = cs.challenge_id
        GROUP BY c.id, c.title, c.content, c.creator, c.creator_name, c.created_at, c.expired_date, c.status
        ORDER BY c.created_at DESC
        """
        cursor.execute(query)
        challenges = cursor.fetchall()
        
        # 현재 시간 가져오기 (만료 여부 계산용)
        now = datetime.datetime.now()
        
        # 딕셔너리로 변환
        challenge_list = []
        for challenge in challenges:
            # 만료 여부 계산
            is_expired = False
            days_left = None
            
            if challenge['expired_date']:
                is_expired = challenge['expired_date'] < now
                if not is_expired:
                    # 남은 일수 계산
                    delta = challenge['expired_date'] - now
                    days_left = delta.days
                    if delta.seconds > 0 and days_left == 0:
                        # 24시간 미만이지만 아직 만료되지 않은 경우
                        days_left = 0
            
            # 각 도전과제의 태그 정보 조회
            tag_query = """
            SELECT t.name
            FROM tags t
            JOIN challenge_tags ct ON t.id = ct.tag_id
            WHERE ct.challenge_id = %s
            """
            cursor.execute(tag_query, (challenge['_id'],))
            tag_results = cursor.fetchall()
            tags = [tag['name'] for tag in tag_results] if tag_results else []
            
            challenge_dict = {
                '_id': challenge['_id'],
                'title': challenge['title'], 
                'content': challenge['content'],
                'creator': challenge['creator'],
                'creatorName': challenge['creatorName'],
                'created_at': challenge['created_at'],
                'expired_date': challenge['expired_date'],  # 만기일 추가
                'status': challenge['status'],  # 상태 추가
                'is_expired': is_expired,  # 만료 여부 추가
                'days_left': days_left,  # 남은 일수 추가 (만료된 경우 null)
                'submission_count': challenge['submission_count'],  # 참여자 수
                'tags': tags  # 태그 정보 추가
            }
            challenge_list.append(challenge_dict)
        
        cursor.close()
        connection.close()
        
        return jsonify(challenge_list), 200
        
    except Exception as e:
        print(f"도전과제 조회 오류: {e}")
        return jsonify({'error': '도전과제 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/tags', methods=['GET'])
def get_all_tags():
    try:
        # 정렬 및 필터링 옵션
        sort_by = request.args.get('sort', 'name')  # 기본값: 이름순
        sort_order = request.args.get('order', 'asc')  # 기본값: 오름차순
        
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 기본 쿼리: 태그 목록 조회
        query = """
        SELECT t.id, t.name, t.created_at, 
               COUNT(DISTINCT ct.challenge_id) as challenge_count
        FROM tags t
        LEFT JOIN challenge_tags ct ON t.id = ct.tag_id
        GROUP BY t.id, t.name, t.created_at
        """
        
        # 정렬 기준 적용
        if sort_by == 'name':
            query += " ORDER BY t.name"
        elif sort_by == 'popular':
            query += " ORDER BY challenge_count"
        elif sort_by == 'recent':
            query += " ORDER BY t.created_at"
        else:
            query += " ORDER BY t.name"  # 기본값
        
        # 정렬 방향 적용
        query += " DESC" if sort_order.lower() == 'desc' else " ASC"
        
        cursor.execute(query)
        tags = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'tags': tags,
            'count': len(tags)
        }), 200
        
    except Exception as e:
        print(f"태그 목록 조회 오류: {e}")
        return jsonify({'error': '태그 목록 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/tags/<tag_name>/challenges', methods=['GET'])
def get_challenges_by_tag(tag_name):
    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 1. 태그 존재 여부 확인
        cursor.execute("SELECT id FROM tags WHERE name = %s", (tag_name,))
        tag_result = cursor.fetchone()
        
        if not tag_result:
            return jsonify({
                'exists': False,
                'message': f'"{tag_name}" 태그가 존재하지 않습니다.',
                'challenges': []
            }), 404
            
        tag_id = tag_result['id']
        
        # 2. 해당 태그를 가진 도전과제 조회
        query = """
        SELECT c.id as _id, c.title, c.content, c.creator, c.creator_name as creatorName, 
               c.status, c.created_at, c.expired_date,
               COUNT(DISTINCT cs.id) as submission_count
        FROM challenges c
        JOIN challenge_tags ct ON c.id = ct.challenge_id
        LEFT JOIN challenge_submissions cs ON c.id = cs.challenge_id
        WHERE ct.tag_id = %s
        GROUP BY c.id, c.title, c.content, c.creator, c.creator_name, c.status, c.created_at, c.expired_date
        ORDER BY c.created_at DESC
        """
        cursor.execute(query, (tag_id,))
        challenges = cursor.fetchall()
        
        # 3. 각 도전과제의 모든 태그 정보 추가 (선택적)
        for challenge in challenges:
            tag_query = """
            SELECT t.id, t.name
            FROM tags t
            JOIN challenge_tags ct ON t.id = ct.tag_id
            WHERE ct.challenge_id = %s
            """
            cursor.execute(tag_query, (challenge['_id'],))
            challenge['tags'] = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'exists': True,
            'tag': {
                'id': tag_id,
                'name': tag_name
            },
            'challenges': challenges,
            'count': len(challenges)
        }), 200
        
    except Exception as e:
        print(f"태그별 도전과제 조회 오류: {e}")
        return jsonify({'error': '태그별 도전과제 조회 중 오류가 발생했습니다'}), 500

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
        
        # 🔔 알림 생성 로직 추가
        # 알림을 위해 도전과제 정보 조회
        cursor.execute("SELECT title, creator, creator_name FROM challenges WHERE id = %s", (challenge_id,))
        challenge = cursor.fetchone()
        
        # 1. 도전과제 생성자에게 알림 (본인이 아닌 경우)
        if challenge['creator'] != current_user['email']:
            creator_notification = {
                'type': 'new_submission',
                'title': '새로운 인증 사진!',
                'message': f'{current_user["name"]}님이 "{challenge["title"]}" 도전과제에 인증 사진을 올렸습니다.',
                'challenge_id': challenge_id,
                'challenge_title': challenge['title'],
                'submitter_name': current_user['name'],
                'submitter_email': current_user['email'],
                'photo_path': photo_path,
                'comment': comment,
                'timestamp': datetime.datetime.now().isoformat()
            }
            add_notification(challenge['creator'], creator_notification)
        
        # 2. 해당 도전과제에 참여한 다른 사람들에게도 알림
        cursor.execute("""
            SELECT DISTINCT user_email, user_name 
            FROM challenge_submissions 
            WHERE challenge_id = %s AND user_email != %s
        """, (challenge_id, current_user['email']))
        
        other_participants = cursor.fetchall()
        
        for participant in other_participants:
            participant_notification = {
                'type': 'peer_submission',
                'title': '동료의 새 인증!',
                'message': f'{current_user["name"]}님이 "{challenge["title"]}" 도전과제에 새로운 인증을 올렸습니다.',
                'challenge_id': challenge_id,
                'challenge_title': challenge['title'],
                'submitter_name': current_user['name'],
                'submitter_email': current_user['email'],
                'photo_path': photo_path,
                'comment': comment,
                'timestamp': datetime.datetime.now().isoformat()
            }
            add_notification(participant['user_email'], participant_notification)
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': '도전과제 참여가 완료되었습니다',
            'submission_id': submission_id,
            'photo_path': photo_path,
            'notifications_sent': {
                'creator': challenge['creator'] if challenge['creator'] != current_user['email'] else None,
                'participants': len(other_participants)
            }
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
        
        # 사용자 정보에서 관리자 여부 확인
        cursor.execute("SELECT isAdmin FROM users WHERE id = %s", (current_user['id'],))
        user_info = cursor.fetchone()
        is_admin = user_info and user_info.get('isAdmin', False)
        
        # 도전과제 정보 조회
        cursor.execute("SELECT creator FROM challenges WHERE id = %s", (challenge_id,))
        result = cursor.fetchone()
        
        if not result:
            cursor.close()
            connection.close()
            return jsonify({'error': '존재하지 않는 도전과제입니다'}), 404
        
        # 권한 확인: 관리자이거나 생성자인 경우만 삭제 가능
        if not is_admin and result['creator'] != current_user['email']:
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

@app.route('/api/detect-postit', methods=['POST'])
@token_required
def detect_postit_endpoint(current_user):
    """
    포스트잇 검출 API
    app_umai.py의 find_postit 함수를 그대로 활용
    """
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({
                'success': False,
                'message': '이미지 데이터가 필요합니다.'
            }), 400
        
        # Base64를 PIL Image로 변환
        try:
            # "data:image/jpeg;base64," 제거
            if ',' in image_base64:
                image_base64 = image_base64.split(',')[1]
            
            # Base64 디코딩
            image_data = base64.b64decode(image_base64)
            pil_image = Image.open(io.BytesIO(image_data))
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'이미지 변환 오류: {str(e)}'
            }), 400
        
        # 기존 app_umai.py의 find_postit 함수 사용
        try:
            postit_roi = find_postit(pil_image)
            
            if postit_roi is None:
                return jsonify({
                    'success': False,
                    'message': '포스트잇을 찾지 못했습니다.',
                    'postit_found': False
                })
            
            # 검출된 포스트잇 영역을 다시 Base64로 변환
            buffer = io.BytesIO()
            postit_roi.save(buffer, format='JPEG', quality=90)
            postit_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return jsonify({
                'success': True,
                'message': '포스트잇 검출 성공',
                'postit_found': True,
                'postit_image': f'data:image/jpeg;base64,{postit_base64}'
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'포스트잇 검출 오류: {str(e)}',
                'postit_found': False
            })
            
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'서버 오류: {str(e)}'
        }), 500

# 유저 삭제 API
@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@token_required
def delete_user(current_user, user_id):
    try:
        # 본인만 삭제 가능하도록 권한 체크
        if current_user['id'] != user_id:
            return jsonify({'error': '본인 계정만 삭제할 수 있습니다'}), 403
        
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 트랜잭션 시작
        connection.begin()
        
        try:
            # 1. 해당 유저가 존재하는지 확인
            cursor.execute("SELECT email, name FROM users WHERE id = %s", (user_id,))
            user = cursor.fetchone()
            
            if not user:
                cursor.close()
                connection.close()
                return jsonify({'error': '존재하지 않는 사용자입니다'}), 404
            
            user_email = user['email']
            user_name = user['name']
            
            # 2. 외래키 관계 처리 - 순서가 중요함!
            
            # 2-1. challenge_submissions 테이블에서 해당 유저의 제출물 삭제
            cursor.execute("DELETE FROM challenge_submissions WHERE user_email = %s", (user_email,))
            deleted_submissions = cursor.rowcount
            
            # 2-2. challenges 테이블에서 해당 유저가 생성한 도전과제 삭제
            # (CASCADE 설정이 있다면 관련 submissions도 자동 삭제되지만 이미 위에서 처리함)
            cursor.execute("DELETE FROM challenges WHERE creator = %s", (user_email,))
            deleted_challenges = cursor.rowcount
            
            # 2-3. 마지막으로 users 테이블에서 유저 삭제
            cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
            
            # 트랜잭션 커밋
            connection.commit()
            
            return jsonify({
                'message': '사용자 계정이 성공적으로 삭제되었습니다',
                'deleted_user': {
                    'id': user_id,
                    'email': user_email,
                    'name': user_name
                },
                'deleted_data': {
                    'challenges': deleted_challenges,
                    'submissions': deleted_submissions
                }
            }), 200
            
        except Exception as e:
            # 오류 발생시 롤백
            connection.rollback()
            print(f"유저 삭제 중 오류 발생: {e}")
            return jsonify({'error': '사용자 삭제 중 오류가 발생했습니다'}), 500
            
        finally:
            cursor.close()
            connection.close()
            
    except Exception as e:
        print(f"유저 삭제 API 오류: {e}")
        return jsonify({'error': '서버 오류가 발생했습니다'}), 500

# 알림 조회 후 삭제 API
@app.route('/api/notify/<user_email>', methods=['GET'])
def get_notifications(user_email):
    try:
        print(f"📬 알림 요청: {user_email}")
        
        # 해당 사용자의 알림 가져오고 메모리에서 삭제
        notifications = get_and_clear_notifications(user_email)
        
        return jsonify({
            'success': True,
            'count': len(notifications),
            'notifications': notifications,
            'timestamp': datetime.datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        print(f"알림 조회 오류: {e}")
        return jsonify({
            'success': False,
            'error': '알림 조회 중 오류가 발생했습니다',
            'notifications': []
        }), 500

# 기본 루트
# 기본 루트
# 사용자 관심 태그 관리 API
@app.route('/api/users/interests', methods=['POST'])
@token_required
def add_user_interest(current_user):
    """사용자 관심 태그 추가"""
    try:
        data = request.get_json()
        tag_name = data.get('tag_name')
        
        if not tag_name:
            return jsonify({'error': '태그 이름이 필요합니다'}), 400
        
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 태그 존재 여부 확인
        cursor.execute("SELECT id FROM tags WHERE name = %s", (tag_name,))
        tag_result = cursor.fetchone()
        
        if not tag_result:
            return jsonify({'error': '존재하지 않는 태그입니다'}), 404
            
        tag_id = tag_result['id']
        
        # 이미 관심 태그로 등록되어 있는지 확인
        cursor.execute(
            "SELECT id FROM user_interests WHERE user_id = %s AND tag_id = %s",
            (current_user['id'], tag_id)
        )
        existing = cursor.fetchone()
        
        if existing:
            return jsonify({'error': '이미 관심 태그로 등록되어 있습니다'}), 400
        
        # 관심 태그 추가
        cursor.execute(
            "INSERT INTO user_interests (user_id, tag_id) VALUES (%s, %s)",
            (current_user['id'], tag_id)
        )
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': '관심 태그가 추가되었습니다',
            'tag_name': tag_name
        }), 201
        
    except Exception as e:
        print(f"관심 태그 추가 오류: {e}")
        return jsonify({'error': '관심 태그 추가 중 오류가 발생했습니다'}), 500

@app.route('/api/users/interests', methods=['GET'])
@token_required
def get_user_interests(current_user):
    """사용자 관심 태그 조회"""
    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 사용자의 관심 태그들 조회
        query = """
        SELECT t.id, t.name, t.created_at, ui.created_at as interest_added_at,
               COUNT(DISTINCT ct.challenge_id) as challenge_count
        FROM user_interests ui
        JOIN tags t ON ui.tag_id = t.id
        LEFT JOIN challenge_tags ct ON t.id = ct.tag_id
        WHERE ui.user_id = %s
        GROUP BY t.id, t.name, t.created_at, ui.created_at
        ORDER BY ui.created_at DESC
        """
        cursor.execute(query, (current_user['id'],))
        interests = cursor.fetchall()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'interests': interests,
            'count': len(interests)
        }), 200
        
    except Exception as e:
        print(f"관심 태그 조회 오류: {e}")
        return jsonify({'error': '관심 태그 조회 중 오류가 발생했습니다'}), 500

@app.route('/api/users/interests/<int:tag_id>', methods=['DELETE'])
@token_required
def remove_user_interest(current_user, tag_id):
    """사용자 관심 태그 삭제"""
    try:
        connection = get_db_connection()
        if connection is None:
            return jsonify({'error': '데이터베이스 연결 실패'}), 500
            
        cursor = connection.cursor()
        
        # 관심 태그 존재 여부 확인
        cursor.execute(
            "SELECT ui.id, t.name FROM user_interests ui JOIN tags t ON ui.tag_id = t.id WHERE ui.user_id = %s AND ui.tag_id = %s",
            (current_user['id'], tag_id)
        )
        interest = cursor.fetchone()
        
        if not interest:
            return jsonify({'error': '등록되지 않은 관심 태그입니다'}), 404
        
        # 관심 태그 삭제
        cursor.execute(
            "DELETE FROM user_interests WHERE user_id = %s AND tag_id = %s",
            (current_user['id'], tag_id)
        )
        connection.commit()
        
        cursor.close()
        connection.close()
        
        return jsonify({
            'message': '관심 태그가 삭제되었습니다',
            'tag_name': interest['name']
        }), 200
        
    except Exception as e:
        print(f"관심 태그 삭제 오류: {e}")
        return jsonify({'error': '관심 태그 삭제 중 오류가 발생했습니다'}), 500

@app.route('/')
def home():
    return jsonify({
        "message": "Challenge API Server with MySQL 실행 중",
        "database": "ChallengeDB",
        "endpoints": {
            "인증": {
                "POST /api/register": {
                    "description": "회원가입",
                    "request": {"email": "string", "password": "string", "name": "string"},
                    "response_success": {"message": "회원가입 성공", "user": {"id": "int", "email": "string", "name": "string"}},
                    "response_error": {"error": "이미 존재하는 이메일입니다"}
                },
                "POST /api/login": {
                    "description": "로그인",
                    "request": {"email": "string", "password": "string"},
                    "response_success": {"message": "로그인 성공", "token": "string", "user": {"id": "int", "email": "string", "name": "string", "isAdmin": "boolean"}},
                    "response_error": {"error": "이메일 또는 비밀번호가 잘못되었습니다"}
                }
            },
            "도전과제": {
                "POST /api/challenges": {
                    "description": "도전과제 생성",
                    "request": {"title": "string", "content": "string", "tags": ["string"], "expired_date": "string (ISO 8601 형식, 선택적)"},
                    "response_success": {"message": "도전과제가 성공적으로 생성되었습니다"},
                    "response_error": {"error": "제목과 내용을 모두 입력해주세요"}
                },
                "GET /api/challenges": {
                    "description": "도전과제 목록 조회",
                    "request": "없음",
                    "response_success": [{"_id": "int", "title": "string", "content": "string", "creator": "string", "creatorName": "string", "created_at": "datetime", "expired_date": "datetime", "status": "string", "is_expired": "boolean", "days_left": "int|null", "submission_count": "int"}],
                    "response_error": {"error": "도전과제 조회 중 오류가 발생했습니다"}
                },
                "DELETE /api/challenges/{id}": {
                    "description": "도전과제 삭제",
                    "request": "없음 (토큰 필요)",
                    "response_success": {"message": "도전과제가 성공적으로 삭제되었습니다"},
                    "response_error": {"error": "삭제 권한이 없습니다"}
                },
                "PATCH /api/challenges/{id}/status": {
                    "description": "도전과제 상태 업데이트",
                    "request": {"status": "string"},
                    "response_success": {"message": "도전과제 상태 업데이트 성공", "status": "string"},
                    "response_error": {"error": "상태 변경 권한이 없습니다"}
                }
            },
            "태그": {
                "GET /api/tags": {
                    "description": "모든 태그 목록 조회",
                    "request": "없음 (정렬: ?sort=name|popular|recent&order=asc|desc)",
                    "response_success": {"tags": [{"id": "int", "name": "string", "created_at": "datetime", "challenge_count": "int"}], "count": "int"},
                    "response_error": {"error": "태그 목록 조회 중 오류가 발생했습니다"}
                },
                "GET /api/tags/{tag_name}/challenges": {
                    "description": "특정 태그의 도전과제 목록 조회",
                    "request": "없음",
                    "response_success": {"exists": "true", "tag": {"id": "int", "name": "string"}, "challenges": [], "count": "int"},
                    "response_error": {"error": "태그별 도전과제 조회 중 오류가 발생했습니다"}
                }
            },
            "참여/제출": {
                "POST /api/challenges/{id}/submit": {
                    "description": "도전과제 참여/사진 제출",
                    "request": {"comment": "string", "photo": "file"},
                    "response_success": {"message": "도전과제 참여가 완료되었습니다", "submission_id": "int", "photo_path": "string", "notifications_sent": {"creator": "string|null", "participants": "int"}},
                    "response_error": {"error": "존재하지 않는 도전과제입니다"}
                },
                "GET /api/challenges/{id}/submissions": {
                    "description": "특정 도전과제 제출물 조회",
                    "request": "없음",
                    "response_success": [{"id": "int", "user_email": "string", "user_name": "string", "photo_path": "string", "comment": "string", "submitted_at": "datetime", "challenge_title": "string"}],
                    "response_error": {"error": "제출물 조회 중 오류가 발생했습니다"}
                },
                "DELETE /api/verifications/{id}": {
                    "description": "인증 사진 삭제",
                    "request": "없음 (토큰 필요)",
                    "response_success": {"message": "인증 사진이 성공적으로 삭제되었습니다"},
                    "response_error": {"error": "삭제 권한이 없습니다"}
                }
            },
            "사용자": {
                "GET /api/users": {
                    "description": "전체 사용자 목록 조회",
                    "request": "없음 (토큰 필요)",
                    "response_success": [{"id": "int", "email": "string", "name": "string", "isAdmin": "boolean", "created_at": "datetime"}],
                    "response_error": {"error": "사용자 조회 중 오류가 발생했습니다"}
                },
                "GET /api/users/{user_email}/challenges": {
                    "description": "사용자 참여 도전과제 조회",
                    "request": "없음",
                    "response_success": [{"_id": "int", "title": "string", "content": "string", "creator": "string", "creatorName": "string", "createdAt": "datetime", "status": "string"}],
                    "response_error": {"message": "에러 메시지"}
                },
                "DELETE /api/users/{user_id}": {
                    "description": "사용자 계정 삭제",
                    "request": "없음 (토큰 필요, 본인만 가능)",
                    "response_success": {"message": "사용자 계정이 성공적으로 삭제되었습니다", "deleted_user": {"id": "int", "email": "string", "name": "string"}, "deleted_data": {"challenges": "int", "submissions": "int"}},
                    "response_error": {"error": "본인 계정만 삭제할 수 있습니다"}
                },
                "POST /api/users/interests": {
                    "description": "사용자 관심 태그 추가",
                    "request": {"tag_name": "string"},
                    "response_success": {"message": "관심 태그가 추가되었습니다", "tag_name": "string"},
                    "response_error": {"error": "이미 관심 태그로 등록되어 있습니다"}
                },
                "GET /api/users/interests": {
                    "description": "사용자 관심 태그 조회",
                    "request": "없음 (토큰 필요)",
                    "response_success": {"interests": [{"id": "int", "name": "string", "created_at": "datetime", "interest_added_at": "datetime", "challenge_count": "int"}], "count": "int"},
                    "response_error": {"error": "관심 태그 조회 중 오류가 발생했습니다"}
                },
                "DELETE /api/users/interests/{tag_id}": {
                    "description": "사용자 관심 태그 삭제",
                    "request": "없음 (토큰 필요)",
                    "response_success": {"message": "관심 태그가 삭제되었습니다", "tag_name": "string"},
                    "response_error": {"error": "등록되지 않은 관심 태그입니다"}
                }
            },
            "알림": {
                "GET /api/notify/{user_email}": {
                    "description": "사용자 알림 조회 후 삭제",
                    "request": "없음",
                    "response_success": {"success": "true", "count": "int", "notifications": [{"type": "string", "title": "string", "message": "string", "challenge_id": "int", "timestamp": "string"}], "timestamp": "string"},
                    "response_error": {"success": "false", "error": "알림 조회 중 오류가 발생했습니다", "notifications": []}
                },
                "GET /api/notify/status": {
                    "description": "전체 알림 상태 확인 (디버깅용)",
                    "request": "없음",
                    "response_success": {"total_users_with_notifications": "int", "notification_store": {}, "timestamp": "string"},
                    "response_error": {"error": "에러 메시지"}
                },
                "POST /api/notify/test/{user_email}": {
                    "description": "테스트용 알림 생성",
                    "request": {"title": "string", "message": "string"},
                    "response_success": {"message": "테스트 알림이 추가되었습니다", "notification": {}},
                    "response_error": {"error": "에러 메시지"}
                }
            },
            "AI 기능": {
                "POST /api/detect-postit": {
                    "description": "포스트잇 검출 API",
                    "request": {"image": "base64 string"},
                    "response_success": {"success": "true", "message": "포스트잇 검출 성공", "postit_found": "true", "postit_image": "base64 string"},
                    "response_error": {"success": "false", "message": "포스트잇을 찾지 못했습니다", "postit_found": "false"}
                }
            },
            "파일": {
                "GET /photos/{filename}": {
                    "description": "업로드된 사진 조회",
                    "request": "없음",
                    "response_success": "파일 데이터",
                    "response_error": "404 Not Found"
                }
            }
        },
        "features": {
            "알림 시스템": "메모리 기반 실시간 알림 (새 인증 사진 업로드시 자동 발송)",
            "포스트잇 검출": "AI 기반 이미지 처리 (app_umai.py 연동)",
            "사용자 관리": "회원가입, 로그인, 계정 삭제, 전체 사용자 목록 조회",
            "도전과제 관리": "생성, 조회, 삭제, 상태 업데이트, 만기일 설정",
            "태그 시스템": "태그 기반 도전과제 분류 및 검색",
            "사진 업로드": "인증 사진 업로드 및 관리"
        },
        "upload_settings": {
            "allowed_extensions": ["png", "jpg", "jpeg", "gif"],
            "upload_folder": "photos",
            "max_file_size": "제한 없음"
        },
        "notification_system": {
            "storage": "메모리 기반 (서버 재시작시 초기화)",
            "triggers": ["새 인증 사진 제출", "관심 태그 관련 새 도전과제"],
            "recipients": ["도전과제 생성자", "기존 참여자들", "관심 태그 설정한 사용자"],
            "polling_endpoint": "GET /api/notify/{user_email}"
        },
        "tag_system": {
            "features": ["도전과제에 태그 추가", "태그별 도전과제 조회", "인기 태그 확인"],
            "endpoints": ["GET /api/tags", "GET /api/tags/{tag_name}/challenges"]
        },
        "challenge_updates": {
            "expired_date": "도전과제 생성 시 만기일 설정 가능 (기본값: 생성일+7일)",
            "status_info": "is_expired, days_left 필드를 통한 만료 정보 제공"
        },
        "required_database_tables": {
            "user_interests": {
                "description": "사용자 관심 태그 저장 테이블",
                "schema": {
                    "id": "INT PRIMARY KEY AUTO_INCREMENT",
                    "user_id": "INT NOT NULL (users.id 외래키)",
                    "tag_id": "INT NOT NULL (tags.id 외래키)",
                    "created_at": "DATETIME DEFAULT CURRENT_TIMESTAMP",
                    "UNIQUE KEY": "unique_user_tag (user_id, tag_id)"
                },
                "create_sql": "CREATE TABLE user_interests (id INT PRIMARY KEY AUTO_INCREMENT, user_id INT NOT NULL, tag_id INT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE KEY unique_user_tag (user_id, tag_id), FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE);"
            }
        }
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
    print("서버 주소: http://219.254.146.234:5000")
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