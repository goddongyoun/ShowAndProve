import sys
import torch
from transformers import TrOCRProcessor, VisionEncoderDecoderModel
from PIL import Image

try:
    # 모델 및 프로세서 로드
    print("Loading ko-trocr model and processor...")
    processor = TrOCRProcessor.from_pretrained("ddobokki/ko-trocr")
    model = VisionEncoderDecoderModel.from_pretrained("ddobokki/ko-trocr")
    print("Model and processor loaded successfully.")

    # 이미지 경로 받기
    image_path = sys.argv[1]
    print(f"Processing image: {image_path}")

    # 이미지 로드 및 품질 확인
    image = Image.open(image_path).convert('RGB')
    print(f"Image size: {image.size}, Mode: {image.mode}")

    # 이미지 전처리 (최소한의 변환)
    pixel_values = processor(images=image, return_tensors="pt").pixel_values
    print(f"Pixel values shape: {pixel_values.shape}")

    # 텍스트 생성
    generated_ids = model.generate(
        pixel_values,
        max_new_tokens=200,  # 더 긴 텍스트 추출 가능하도록 조정
        num_beams=5,  # 빔 서치로 품질 향상
        early_stopping=False  # 조기 종료 비활성화
    )
    print(f"Generated IDs: {generated_ids}")

    extracted_text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    print(f"Extracted Text: {extracted_text}")

    # 결과 출력
    print(extracted_text)
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)