"""
포스트잇 검출 전용 이미지 처리 서버
app_umai.py의 find_postit 함수를 활용
"""
import os
import io
import json
import cv2
import base64
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app)

# app_umai.py에서 가져온 설정값들
LOWER_YELLOW = (27, 25, 120)  # app_umai.py 최적값
UPPER_YELLOW = (35, 255, 255)
MIN_AREA = 8000
MAX_AR_DIFF = 50

def adaptive_inrange(hsv_img, base_low, base_up):
    """다양한 HSV 범위를 시도하여 최적의 마스크 확보"""
    low = list(base_low)
    up  = list(base_up)
    
    # 1단계: Saturation 하한을 단계적으로 낮춤
    for sat in (low[1], 40, 25, 10, 5):
        low[1] = sat
        mask = cv2.inRange(
            hsv_img, np.array(low, np.uint8), np.array(up, np.uint8)
        )
        if cv2.countNonZero(mask) > 2000:   # 2k 픽셀 이상이면 성공
            return mask
    
    # 2단계: Value 하한도 낮춰보기
    low = list(base_low)
    for val in (30, 20, 10):
        for sat in (5, 3, 1):
            low[1] = sat
            low[2] = val
            mask = cv2.inRange(
                hsv_img, np.array(low, np.uint8), np.array(up, np.uint8)
            )
            if cv2.countNonZero(mask) > 1000:   # 1k 픽셀 이상이면 성공
                return mask
    
    return mask  # 마지막 결과 반환

def find_postit(pil_img: Image.Image, debug=False):
    """노란 포스트잇 ROI 반환 (app_umai.py에서 가져온 함수)"""
    bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

    mask = adaptive_inrange(hsv, LOWER_YELLOW, UPPER_YELLOW)

    # 노이즈 제거를 위한 모폴로지 연산
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    kernel = np.ones((7, 7), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=3)
    
    # 추가: 더 큰 커널로 한 번 더 정리
    kernel_large = np.ones((10, 10), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_large, iterations=1)

    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        return (None, mask, None) if debug else None

    best, best_score = None, 0
    candidates = []
    
    for i, c in enumerate(cnts):
        # 기본 바운딩 박스
        x, y, cw, ch = cv2.boundingRect(c)
        area = cw * ch
        ar_diff = abs(cw - ch) / max(cw, ch) * 100
        
        # 윤곽선 approximation으로 사각형성 검사
        epsilon = 0.02 * cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, epsilon, True)
        rect_score = len(approx)
        
        # 컨벡스 헐과의 비교로 모양 검사
        hull = cv2.convexHull(c)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0
        
        # 이미지 중앙에서의 거리
        img_h, img_w = pil_img.size[1], pil_img.size[0]
        center_x, center_y = x + cw//2, y + ch//2
        center_dist = np.sqrt((center_x - img_w//2)**2 + (center_y - img_h//2)**2)
        normalized_center_dist = center_dist / np.sqrt(img_w**2 + img_h**2)
        
        # 마스크에서 실제 채워진 비율
        mask_roi = mask[y:y+ch, x:x+cw]
        fill_ratio = cv2.countNonZero(mask_roi) / (cw * ch) if cw * ch > 0 else 0
        
        # 종합 점수 계산
        score = 0
        if area >= MIN_AREA:
            # 1. 기본 면적 점수
            ideal_area = 50000
            area_score = max(0, 100 - abs(area - ideal_area) / ideal_area * 50)
            score += area_score
            
            # 2. 정사각형 점수
            square_score = max(0, 80 - ar_diff * 2)
            score += square_score
            
            # 3. 사각형 모양 점수
            rect_shape_score = min(40, (8 - abs(rect_score - 4)) * 10)
            score += rect_shape_score
            
            # 4. 채움 비율 점수
            fill_score = fill_ratio * 60
            score += fill_score
            
            # 5. 볼록도 점수
            solidity_score = solidity * 25
            score += solidity_score
            
            # 6. 중앙 위치 보너스
            center_score = max(0, 15 - normalized_center_dist * 30)
            score += center_score
            
            # 7. 크기 비율 보너스
            img_area = img_w * img_h
            size_ratio = area / img_area
            if 0.02 < size_ratio < 0.3:
                score += 20
        
        candidates.append({
            'bbox': (x, y, cw, ch),
            'area': area,
            'ar_diff': ar_diff,
            'rect_score': rect_score,
            'solidity': solidity,
            'center_dist': normalized_center_dist,
            'fill_ratio': fill_ratio,
            'total_score': score,
            'valid': area >= MIN_AREA and ar_diff <= MAX_AR_DIFF
        })
        
        if score > best_score:
            best_score = score
            best = (x, y, cw, ch)
    
    if debug:
        # 디버그 정보와 함께 반환
        bbox_img = np.array(pil_img.copy())
        for i, cand in enumerate(candidates):
            x, y, cw, ch = cand['bbox']
            color = (0, 255, 0) if cand == best else (255, 0, 0)
            cv2.rectangle(bbox_img, (x, y), (x + cw, y + ch), color, 3)
            cv2.putText(bbox_img, f"{i}: {cand['total_score']:.1f}", 
                       (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        
        return (
            pil_img.crop((best[0], best[1], best[0] + best[2], best[1] + best[3])) if best else None,
            mask,
            Image.fromarray(bbox_img)
        )
    
    return pil_img.crop((best[0], best[1], best[0] + best[2], best[1] + best[3])) if best else None

@app.route('/detect-postit', methods=['POST'])
def detect_postit():
    """포스트잇 검출 API"""
    try:
        data = request.get_json()
        image_base64 = data.get('image')
        
        if not image_base64:
            return jsonify({
                'success': False,
                'message': '이미지 데이터가 없습니다'
            })
        
        # Base64를 PIL Image로 변환
        try:
            image_data = base64.b64decode(image_base64)
            pil_img = Image.open(io.BytesIO(image_data))
            print(f"이미지 크기: {pil_img.size}")
        except Exception as e:
            return jsonify({
                'success': False,
                'message': f'이미지 디코딩 오류: {str(e)}'
            })
        
        # 포스트잇 검출
        postit_roi = find_postit(pil_img, debug=False)
        
        if postit_roi is not None:
            # ROI를 base64로 인코딩해서 반환
            buffer = io.BytesIO()
            postit_roi.save(buffer, format='JPEG', quality=90)
            roi_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            print(f"포스트잇 검출 성공! ROI 크기: {postit_roi.size}")
            
            return jsonify({
                'success': True,
                'roi_image': roi_base64,
                'original_size': pil_img.size,
                'roi_size': postit_roi.size
            })
        else:
            print("포스트잇을 찾을 수 없습니다")
            return jsonify({
                'success': False,
                'message': '포스트잇을 찾을 수 없습니다'
            })
            
    except Exception as e:
        print(f"서버 오류: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'서버 오류: {str(e)}'
        })

@app.route('/health', methods=['GET'])
def health_check():
    """서버 상태 확인"""
    return jsonify({
        'status': 'ok',
        'message': '포스트잇 검출 서버가 정상 작동 중입니다'
    })

if __name__ == '__main__':
    print("포스트잇 검출 서버 시작...")
    print("사용 가능한 엔드포인트:")
    print("  POST /detect-postit - 포스트잇 검출")
    print("  GET  /health        - 서버 상태 확인")
    app.run(host='127.0.0.1', port=5001, debug=True) 