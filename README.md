DB TABLE INFO

-- ChallengeDB 데이터베이스 생성
CREATE DATABASE IF NOT EXISTS ChallengeDB;
USE ChallengeDB;

-- 1. Users 테이블 (사용자 정보)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_email (email)
);

-- 2. Challenges 테이블 (도전과제)
CREATE TABLE challenges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    creator_id INT NOT NULL,
    status ENUM('active', 'completed', 'cancelled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_creator (creator_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- 3. Verifications 테이블 (인증 사진)
CREATE TABLE verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    challenge_id INT NOT NULL,
    user_id INT NOT NULL,
    photo_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (challenge_id) REFERENCES challenges(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_challenge (challenge_id),
    INDEX idx_user (user_id),
    INDEX idx_created_at (created_at)
);

-- 4. User_Challenges 테이블 (사용자-도전과제 참여 관계)
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

-- 샘플 데이터 삽입 (테스트용)
INSERT INTO users (email, password, name) VALUES 
('test@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2RSYC.YO.y', '테스트 사용자'),
('admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj2RSYC.YO.y', '관리자');

INSERT INTO challenges (title, description, creator_id) VALUES 
('매일 물 2L 마시기', '건강한 생활을 위해 매일 물 2L를 마시는 도전', 1),
('일주일 운동하기', '일주일 동안 매일 30분씩 운동하기', 2);

INSERT INTO user_challenges (user_id, challenge_id) VALUES 
(1, 1),
(2, 1),
(2, 2);

-- 테이블 구조 확인
DESCRIBE users;
DESCRIBE challenges;
DESCRIBE verifications;
DESCRIBE user_challenges;

-- 외래키 관계 확인
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE REFERENCED_TABLE_SCHEMA = 'ChallengeDB';