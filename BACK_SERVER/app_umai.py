"""
 한글 손글씨 OCR Playground  v3.4
 ----------------------------------------------------------
 • EasyOCR / OCR.space / Google Vision 3개 엔진을 한 화면에서 비교
 • 노란 포스트잇 자동 검출(Adaptive HSV) + 디버깅(마스크, BBox)
 • OCR.space API Key 직접 입력, Google Vision JSON 업로드 지원
 • ROI 업스케일링(1×~4×)로 난해한 손글씨 가독성 향상
 • Pillow 10 대응 몽키패치  (Image.ANTIALIAS → Image.Resampling.LANCZOS)
"""

# ──────────────────────────────  import  ──────────────────────────────
import os, io, json, cv2, requests
import numpy as np
import streamlit as st
from PIL import Image
import easyocr
from google.cloud import vision
from dotenv import load_dotenv

# ──────────────────────  Pillow 10 대응 몽키패치  ─────────────────────
if not hasattr(Image, "ANTIALIAS"):  # Pillow ≥10
    Image.ANTIALIAS = Image.Resampling.LANCZOS

# ─────────────────────────  기본 환경 설정  ─────────────────────────
load_dotenv()
st.set_page_config(page_title="🖋️ Korean Handwriting OCR Playground", layout="centered")
st.title("🖋️ 한글 손글씨 OCR Playground")

# ──────────────────────────────  Sidebar  ────────────────────────────
st.sidebar.header("⚙️ 설정")

# --- OCR.space Key 입력
OCR_SPACE_API_KEY = st.sidebar.text_input(
    "OCR.space API Key", value=os.getenv("OCR_SPACE_API_KEY", ""),
    type="password", placeholder="빈 칸이면 호출 안 함",
)

# --- Google Vision JSON 업로드
uploaded_json = st.sidebar.file_uploader(
    "Google Vision service-account JSON", type=["json"], accept_multiple_files=False
)
VISION_JSON_DATA = json.load(uploaded_json) if uploaded_json else None

# --- 업스케일 배율
upscale_factor = st.sidebar.slider("ROI 업스케일 배율", 1, 4, 1)

# --- Post-it HSV 범위 & 필터
st.sidebar.markdown("### ✏️ 포스트잇 HSV 초기값")
LOWER_YELLOW = (
    st.sidebar.slider("Lower Hue", 10, 35, 27),     # 포스트잇 색상에 맞춤 (최적값 27)
    st.sidebar.slider("Lower Sat", 0, 255, 25),     # 연한 노란색 포함
    st.sidebar.slider("Lower Val", 0, 255, 120),    # 밝은 노란색 위주
)
UPPER_YELLOW = (
    st.sidebar.slider("Upper Hue", 30, 60, 35),     # 노란색 범위
    st.sidebar.slider("Upper Sat", 0, 255, 255),
    st.sidebar.slider("Upper Val", 0, 255, 255),
)
MIN_AREA    = st.sidebar.number_input("최소 면적(px)", 1000, 500000, 8000, step=1000)  # 포스트잇 크기에 맞춤
MAX_AR_DIFF = st.sidebar.slider("가로/세로 비율 허용편차(%)", 0, 100, 50)  # 정사각형에 가깝게

show_debug = st.sidebar.checkbox("🩺 디버그 모드 (Raw JSON / 마스크 출력)")
st.sidebar.markdown("---\nMade with ❤️ 2025")

# ────────────────────────  유틸리티 함수  ────────────────────────────
def pil_to_bytes(pil_img: Image.Image, fmt="JPEG") -> bytes:
    buf = io.BytesIO()
    pil_img.save(buf, format=fmt)
    return buf.getvalue()

# ---------- Adaptive HSV 마스크 ----------
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

# ---------- Post-it 탐지 ----------
def find_postit(pil_img: Image.Image, debug=False):
    """노란 포스트잇 ROI 반환, debug=True면 (roi, mask, bbox_img)"""
    bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV)

    mask = adaptive_inrange(hsv, LOWER_YELLOW, UPPER_YELLOW)

    # 노이즈 제거를 위한 모폴로지 연산
    kernel = np.ones((3, 3), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)  # 작은 노이즈 제거
    kernel = np.ones((7, 7), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=3)  # 더 강한 구멍 메우기
    
    # 추가: 더 큰 커널로 한 번 더 정리
    kernel_large = np.ones((10, 10), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel_large, iterations=1)

    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not cnts:
        if debug:
            st.warning(f"윤곽선을 찾지 못했습니다. 마스크 픽셀 수: {cv2.countNonZero(mask)}")
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
        rect_score = len(approx)  # 4에 가까울수록 사각형
        
        # 컨벡스 헐과의 비교로 모양 검사
        hull = cv2.convexHull(c)
        hull_area = cv2.contourArea(hull)
        solidity = area / hull_area if hull_area > 0 else 0
        
        # 이미지 중앙에서의 거리 (포스트잇은 보통 중앙 근처에 있음)
        img_h, img_w = pil_img.size[1], pil_img.size[0]
        center_x, center_y = x + cw//2, y + ch//2
        center_dist = np.sqrt((center_x - img_w//2)**2 + (center_y - img_h//2)**2)
        normalized_center_dist = center_dist / np.sqrt(img_w**2 + img_h**2)
        
        # 마스크에서 실제 채워진 비율
        mask_roi = mask[y:y+ch, x:x+cw]
        fill_ratio = cv2.countNonZero(mask_roi) / (cw * ch) if cw * ch > 0 else 0
        
        # 종합 점수 계산 (포스트잇 특징에 맞춰 가중치 조정)
        score = 0
        if area >= MIN_AREA:
            # 1. 기본 면적 점수 (크기가 적당해야 함)
            ideal_area = 50000  # 대략적인 포스트잇 이상적 크기
            area_score = max(0, 100 - abs(area - ideal_area) / ideal_area * 50)
            score += area_score
            
            # 2. 정사각형 점수 (가장 중요한 요소)
            square_score = max(0, 80 - ar_diff * 2)  # 가중치 증가
            score += square_score
            
            # 3. 사각형 모양 점수
            rect_shape_score = min(40, (8 - abs(rect_score - 4)) * 10)  # 가중치 증가
            score += rect_shape_score
            
            # 4. 채움 비율 점수 (매우 중요)
            fill_score = fill_ratio * 60  # 가중치 증가
            score += fill_score
            
            # 5. 볼록도 점수
            solidity_score = solidity * 25
            score += solidity_score
            
            # 6. 중앙 위치 보너스 (포스트잇은 보통 중앙 근처)
            center_score = max(0, 15 - normalized_center_dist * 30)
            score += center_score
            
            # 7. 크기 비율 보너스 (이미지 대비 적당한 크기)
            img_area = img_w * img_h
            size_ratio = area / img_area
            if 0.02 < size_ratio < 0.3:  # 이미지의 2%~30% 크기가 적당
                score += 20
        
        candidates.append({
            'bbox': (x, y, cw, ch),
            'area': area,
            'ar_diff': ar_diff,
            'rect_score': rect_score,
            'solidity': solidity,
            'center_dist': normalized_center_dist,
            'fill_ratio': fill_ratio if 'fill_ratio' in locals() else 0,
            'total_score': score,
            'valid': area >= MIN_AREA and ar_diff <= MAX_AR_DIFF
        })
        
        if score > best_score:
            best_score = score
            best = (x, y, cw, ch)

    # 후보들을 점수순으로 정렬
    candidates.sort(key=lambda x: x['total_score'], reverse=True)

    if debug:
        st.write(f"총 {len(candidates)}개 윤곽선 발견 (점수순 정렬):")
        for i, cand in enumerate(candidates[:5]):  # 상위 5개만 표시
            st.write(f"  {i+1}: 면적={cand['area']}, 비율차이={cand['ar_diff']:.1f}%, "
                    f"사각형점수={cand['rect_score']}, 볼록도={cand['solidity']:.2f}, "
                    f"중심거리={cand['center_dist']:.2f}, 채움비율={cand['fill_ratio']:.2f}, "
                    f"**총점={cand['total_score']:.1f}**, 유효={cand['valid']}")

    if best is None or best_score < 50:  # 최소 점수 기준
        if debug:
            st.warning(f"조건을 만족하는 포스트잇을 찾지 못했습니다. (최고점수: {best_score:.1f})")
        return (None, mask, None) if debug else None

    x, y, cw, ch = best
    roi = pil_img.crop((x, y, x + cw, y + ch))

    if debug:
        bbox_img = bgr.copy()
        # 모든 후보를 연한 색으로 표시
        for i, cand in enumerate(candidates[:3]):
            cx, cy, ccw, cch = cand['bbox']
            color = (100, 100, 255) if i > 0 else (0, 0, 255)  # 최고점수는 빨간색, 나머지는 연한 파란색
            thickness = 3 if i == 0 else 1
            cv2.rectangle(bbox_img, (cx, cy), (cx + ccw, cy + cch), color, thickness)
            cv2.putText(bbox_img, f"{cand['total_score']:.0f}", 
                       (cx, cy-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        
        bbox_img = cv2.cvtColor(bbox_img, cv2.COLOR_BGR2RGB)
        st.success(f"포스트잇 검출 성공! 점수: {best_score:.1f}, 크기: {cw}×{ch}")
        return roi, mask, bbox_img
    return roi

# ---------- ROI 업스케일 ----------
def upscale(pil_img: Image.Image, factor: int):
    if factor == 1:
        return pil_img
    w, h = pil_img.size
    return pil_img.resize((w * factor, h * factor), Image.ANTIALIAS)

# ---------- EasyOCR ----------
@st.cache_resource(show_spinner=False)
def get_easyocr_reader():
    return easyocr.Reader(['ko'], gpu=False)

def run_easyocr(pil_img: Image.Image):
    reader = get_easyocr_reader()
    result = reader.readtext(np.array(pil_img))
    return [
        {"text": t, "conf": f"{c * 100:.1f}%", "bbox": b}
        for b, t, c in result
    ]

# ---------- OCR.space ----------
def run_ocrspace(pil_img: Image.Image, api_key: str):
    if not api_key:
        st.warning("🔑 OCR.space API Key가 없습니다.")
        return []

    # (용량 초과 방지) 2048 px 이하로 리사이즈
    max_side = 2048
    w, h = pil_img.size
    if max(w, h) > max_side:
        ratio = max_side / max(w, h)
        pil_img = pil_img.resize((int(w * ratio), int(h * ratio)), Image.ANTIALIAS)

    img_bytes = pil_to_bytes(pil_img, "JPEG")
    if len(img_bytes) > 1.5 * 1024 * 1024:  # 1.5 MB 이상 → 품질 75
        buf = io.BytesIO()
        pil_img.save(buf, format="JPEG", quality=75, optimize=True)
        img_bytes = buf.getvalue()

    payload = {
        "apikey": api_key,
        "language": "kor",
        "OCREngine": 2,             # 2가 비교적 안정
        "scale": True,
        "detectOrientation": True,
        "isOverlayRequired": False,
        "filetype": "JPG",
    }
    files = {"file": ("image.jpg", img_bytes, "image/jpeg")}

    try:
        res = requests.post(
            "https://api.ocr.space/parse/image",
            data=payload, files=files, timeout=90
        )
        data = res.json()
    except Exception as e:
        st.error(f"OCR.space 호출 실패: {e}")
        return []

    if show_debug:
        st.expander("🔍 OCR.space Raw JSON").json(data)

    if data.get("IsErroredOnProcessing"):
        err = data.get("ErrorMessage", "Unknown error")
        st.error(f"OCR.space Error: {err}")
        return []

    parsed = data.get("ParsedResults", [])
    lines = []
    for pr in parsed:
        for line in pr.get("ParsedText", "").splitlines():
            t = line.strip()
            if t:
                lines.append({"text": t, "conf": "-", "bbox": None})
    return lines

# ---------- Google Vision ----------
@st.cache_resource(show_spinner=False)
def get_vision_client(json_dict):
    from google.oauth2 import service_account
    creds = service_account.Credentials.from_service_account_info(
        json_dict, scopes=["https://www.googleapis.com/auth/cloud-platform"]
    )
    return vision.ImageAnnotatorClient(credentials=creds)

def run_vision(pil_img: Image.Image, json_dict):
    if json_dict is None:
        st.warning("🔑 Google Vision JSON이 없습니다.")
        return []

    client = get_vision_client(json_dict)
    img = vision.Image(content=pil_to_bytes(pil_img, "PNG"))
    resp = client.document_text_detection(image=img)

    if show_debug:
        st.expander("🔍 Google Vision Raw").json(
            resp._pb.SerializeToString().hex()[:2000] + "..."
        )

    lines = []
    for page in resp.full_text_annotation.pages:
        for block in page.blocks:
            for para in block.paragraphs:
                txt = "".join([s.text for w in para.words for s in w.symbols])
                conf = f"{para.confidence * 100:.1f}%"
                lines.append({"text": txt, "conf": conf, "bbox": None})
    return lines

# ──────────────────────────  메인 UI 영역  ───────────────────────────
st.markdown("**① 엔진 선택 → ② 이미지 업로드 → ③ [🔍 OCR 실행]** 순서로 이용하세요.")

engine     = st.selectbox("엔진", ["EasyOCR", "OCR.space", "Google Vision"])
use_postit = st.checkbox("포스트잇 자동 검출", value=True)

uploaded = st.file_uploader("이미지 업로드 (jpg / png)", ["jpg", "jpeg", "png"])

if uploaded:
    pil_img = Image.open(uploaded).convert("RGB")

    # ───── 포스트잇 탐지 ─────
    roi = None
    if use_postit:
        res = find_postit(pil_img, debug=show_debug)
        if isinstance(res, tuple):
            roi, mask_img, bbox_img = res
            if show_debug and mask_img is not None:
                st.image(mask_img, caption="Yellow Mask", use_column_width=True)
            if show_debug and bbox_img is not None:
                st.image(bbox_img, caption="Detected BBox", use_column_width=True)
        else:
            roi = res

        if roi is None:
            st.info("포스트잇을 찾지 못해 **원본 전체**로 OCR을 수행합니다.")
            target_img = pil_img
        else:
            target_img = roi
    else:
        target_img = pil_img

    # ───── 업스케일 ─────
    target_img = upscale(target_img, upscale_factor)
    st.image(target_img, caption="OCR 대상 이미지", use_column_width=True)

    if st.button("🔍 OCR 실행"):
        with st.spinner(f"{engine} 분석 중..."):
            if engine == "EasyOCR":
                lines = run_easyocr(target_img)
            elif engine == "OCR.space":
                lines = run_ocrspace(target_img, OCR_SPACE_API_KEY)
            else:
                lines = run_vision(target_img, VISION_JSON_DATA)

        if not lines:
            st.warning("텍스트를 찾지 못했습니다.")
        else:
            st.subheader("✅ 인식 결과")
            for l in lines:
                st.write(f"- **{l['text']}**  ({l['conf']})")

            # EasyOCR BBox 시각화
            if engine == "EasyOCR":
                img_np = np.array(target_img).copy()
                for l in lines:
                    if l["bbox"] is not None:
                        pts = np.array(l["bbox"], np.int32)
                        cv2.polylines(img_np, [pts], True, (0, 255, 0), 2)
                st.image(img_np, caption="EasyOCR Bounding Boxes",
                         use_column_width=True)

