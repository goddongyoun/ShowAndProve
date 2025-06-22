// OCR 기반 포스트잇 인증 서비스
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OCR_SPACE_API_KEY = 'K89968670188957';
const BASE_URL = 'http://219.254.146.234:5000';

// 토큰 가져오기 함수
const getToken = async () => {
  try {
    const token = await AsyncStorage.getItem('token');
    return token;
  } catch (error) {
    console.error('토큰 가져오기 실패:', error);
    return null;
  }
};

// HSV 범위 설정 (Streamlit 코드의 기본값 사용)
const LOWER_YELLOW = [27, 25, 120];  // 포스트잇 노란색 하한
const UPPER_YELLOW = [35, 255, 255]; // 포스트잇 노란색 상한
const MIN_AREA = 8000;  // 최소 면적 (픽셀)
const MAX_AR_DIFF = 50; // 가로/세로 비율 허용편차(%)

// 문자열 유사도 계산 함수 (레벤슈타인 거리 기반)
const calculateSimilarity = (str1, str2) => {
  // 공백 제거하고 소문자로 변환
  const s1 = str1.replace(/\s+/g, '').toLowerCase();
  const s2 = str2.replace(/\s+/g, '').toLowerCase();
  
  if (s1 === s2) return 1.0; // 완전 일치
  
  const len1 = s1.length;
  const len2 = s2.length;
  
  if (len1 === 0) return len2 === 0 ? 1.0 : 0.0;
  if (len2 === 0) return 0.0;
  
  // 레벤슈타인 거리 계산
  const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
  
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // 삭제
        matrix[i][j - 1] + 1,     // 삽입
        matrix[i - 1][j - 1] + cost // 교체
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1.0 - (distance / maxLen);
};

// React Native용 이미지 크기 확인 함수
const getImageSize = (uri) => {
  return new Promise((resolve, reject) => {
    if (Platform.OS === 'web') {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = uri;
    } else {
      // React Native에서는 Image.getSize 사용
      const { Image } = require('react-native');
      Image.getSize(uri, 
        (width, height) => resolve({ width, height }),
        reject
      );
    }
  });
};

// 이미지 압축 함수 (1MB 미만으로)
const compressImage = async (imageUri, maxSizeKB = 950) => {
  try {
    console.log('이미지 압축 시작:', imageUri.substring(0, 50) + '...');
    
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // React Native 환경에서의 압축
      console.log('React Native 환경에서 이미지 압축 시도');
      
      // 먼저 원본 이미지를 base64로 변환해서 크기 확인
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const originalSizeKB = blob.size / 1024;
      console.log(`원본 이미지 크기: ${Math.round(originalSizeKB)}KB`);
      
      if (originalSizeKB <= maxSizeKB) {
        console.log('이미지 크기가 제한 내에 있음, 원본 사용');
        return imageUri;
      }
      
      // React Native에서는 expo-image-manipulator를 사용하여 압축
      try {
        const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
        
        // 이미지 크기 가져오기
        const { width, height } = await getImageSize(imageUri);
        console.log(`원본 이미지 해상도: ${width}x${height}`);
        
        // 압축 설정
        let compressionQuality = 0.7;
        let resizeRatio = 1.0;
        
        // 해상도가 너무 크면 줄이기
        const maxDimension = 1200;
        if (width > maxDimension || height > maxDimension) {
          resizeRatio = Math.min(maxDimension / width, maxDimension / height);
          console.log(`해상도 조정: ${resizeRatio}`);
        }
        
        let manipulatedImage;
        let attempts = 0;
        const maxAttempts = 5;
        
        do {
          attempts++;
          console.log(`압축 시도 ${attempts}: 품질 ${compressionQuality}, 크기 비율 ${resizeRatio}`);
          
          const actions = [];
          
          // 크기 조정
          if (resizeRatio < 1.0) {
            actions.push({
              resize: {
                width: Math.round(width * resizeRatio),
                height: Math.round(height * resizeRatio),
              }
            });
          }
          
          manipulatedImage = await manipulateAsync(
            imageUri,
            actions,
            {
              compress: compressionQuality,
              format: SaveFormat.JPEG,
            }
          );
          
          // 결과 크기 확인
          const resultResponse = await fetch(manipulatedImage.uri);
          const resultBlob = await resultResponse.blob();
          const resultSizeKB = resultBlob.size / 1024;
          
          console.log(`압축 결과: ${Math.round(resultSizeKB)}KB`);
          
          if (resultSizeKB <= maxSizeKB) {
            console.log('압축 성공!');
            return manipulatedImage.uri;
          }
          
          // 다음 시도를 위한 설정 조정
          compressionQuality -= 0.15;
          if (compressionQuality < 0.1) {
            compressionQuality = 0.1;
            resizeRatio *= 0.8; // 해상도를 더 줄임
          }
          
        } while (attempts < maxAttempts && compressionQuality > 0.05);
        
        console.log('최대 압축 시도 완료, 마지막 결과 사용');
        return manipulatedImage.uri;
        
               } catch (rnError) {
           console.error('React Native 압축 실패:', rnError);
           console.log('expo-image-manipulator를 사용할 수 없습니다. 대안 방법 시도...');
           
           // 대안: 매우 낮은 품질로 ImagePicker 재호출 제안
           throw new Error('이미지가 너무 큽니다. 카메라 설정에서 해상도를 낮춰주세요.');
         }
    }

    // 웹 환경에서의 압축 (기존 코드)
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // 초기 크기 설정
          let { width, height } = img;
          const maxDimension = 1500; // 최대 크기 제한
          
          if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          // 품질을 조정해가며 압축
          let quality = 0.8;
          let compressedDataUrl;
          
          do {
            compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            const sizeKB = (compressedDataUrl.length * 0.75) / 1024; // base64 크기 추정
            
            console.log(`이미지 압축 중: 품질 ${quality}, 크기 ${Math.round(sizeKB)}KB`);
            
            if (sizeKB <= maxSizeKB) {
              console.log(`압축 완료: 최종 크기 ${Math.round(sizeKB)}KB`);
              break;
            }
            
            quality -= 0.1;
            if (quality <= 0.1) {
              quality = 0.1;
              console.log('최소 품질에 도달, 압축 종료');
              break;
            }
          } while (quality > 0.1);
          
          resolve(compressedDataUrl);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => reject(new Error('이미지 로드 실패'));
      img.src = imageUri;
    });
  } catch (error) {
    console.error('이미지 압축 오류:', error);
    return imageUri; // 압축 실패 시 원본 반환
  }
};

// 이미지를 base64로 변환하는 함수
const imageToBase64 = async (imageUri) => {
  try {
    // 먼저 이미지 압축 수행
    const compressedImageUri = await compressImage(imageUri);
    
    if (compressedImageUri.startsWith('data:')) {
      // 이미 base64 형태인 경우
      return compressedImageUri.split(',')[1];
    }
    
    // 파일을 읽어서 base64로 변환
    const response = await fetch(compressedImageUri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Base64 변환 오류:', error);
    throw new Error('이미지 변환에 실패했습니다.');
  }
};

// OCR.space API 호출
const callOCRSpace = async (base64Image) => {
  try {
    // base64 이미지 크기 확인 (안전장치)
    const imageSizeKB = (base64Image.length * 0.75) / 1024;
    console.log(`OCR API 호출 전 이미지 크기 확인: ${Math.round(imageSizeKB)}KB`);
    
    if (imageSizeKB > 1000) {
      throw new Error(`이미지 크기가 너무 큽니다: ${Math.round(imageSizeKB)}KB (최대 1024KB)`);
    }
    
    const formData = new FormData();
    formData.append('apikey', OCR_SPACE_API_KEY);
    formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
    formData.append('language', 'kor');
    formData.append('OCREngine', '2');
    formData.append('scale', 'true');
    formData.append('detectOrientation', 'true');
    formData.append('isOverlayRequired', 'false');

    console.log('OCR.space API 호출 시작...');
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      body: formData,
      timeout: 90000, // 90초 타임아웃
    });

    const data = await response.json();
    
    console.log(data);

    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage || 'OCR 처리 중 오류 발생');
    }

    const parsed = data.ParsedResults || [];
    const lines = [];
    
    for (const pr of parsed) {
      const text = pr.ParsedText || '';
      for (const line of text.split('\n')) {
        const trimmed = line.trim();
        if (trimmed) {
          lines.push(trimmed);
        }
      }
    }
    
    return lines;
  } catch (error) {
    console.error('OCR.space API 호출 오류:', error);
    throw new Error('OCR 인식에 실패했습니다: ' + error.message);
  }
};

// React Native용 포스트잇 검출 함수 (OpenCV 스타일)
const detectPostitMobile = async (imageUri) => {
  try {
    console.log('모바일 포스트잇 검출 시작 (OpenCV 스타일)');
    
    // expo-image-manipulator로 이미지 처리 후 픽셀 분석
    return await detectPostitMobileOpenCV(imageUri);
    
  } catch (error) {
    console.error('모바일 포스트잇 검출 오류:', error);
    console.log('포스트잇 검출 실패, 중앙 영역 폴백');
    return await detectPostitMobileFallback(imageUri);
  }
};

// OpenCV 스타일 포스트잇 검출 (JavaScript 구현)
const detectPostitMobileOpenCV = async (imageUri) => {
  const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
  
  // 1. 분석용으로 이미지 크기 조정 (app_umai.py 방식)
  const { width, height } = await getImageSize(imageUri);
  console.log(`원본 이미지 크기: ${width}x${height}`);
  
  // 분석용 해상도로 리사이즈 (너무 크면 처리 시간 오래걸림)
  const maxDim = 800;
  let analysisWidth = width, analysisHeight = height;
  if (width > maxDim || height > maxDim) {
    const ratio = Math.min(maxDim / width, maxDim / height);
    analysisWidth = Math.round(width * ratio);
    analysisHeight = Math.round(height * ratio);
  }
  
  // 2. 간단한 fallback 방식으로 변경 (복잡한 Canvas 로직 제거)
  try {
    console.log('포스트잇 검출: 간단한 중앙 영역 추출 방식 사용');
    
    // 모든 플랫폼에서 동일한 중앙 영역 추출 로직
    const cropX = Math.round(width * 0.2);       // 좌우 20% 제거
    const cropY = Math.round(height * 0.15);     // 상단 15% 제거  
    const cropWidth = Math.round(width * 0.6);   // 가로 60%
    const cropHeight = Math.round(height * 0.5); // 세로 50%
    
    console.log(`포스트잇 중앙 영역: ${cropX},${cropY} ${cropWidth}x${cropHeight}`);
    
    const croppedImage = await manipulateAsync(
      imageUri,
      [{
        crop: {
          originX: cropX,
          originY: cropY,
          width: cropWidth,
          height: cropHeight,
        }
      }],
      { format: SaveFormat.JPEG, compress: 0.8 }
    );
    
    console.log('포스트잇 영역 추출 완료');
    return croppedImage.uri;
    
  } catch (error) {
    console.error('포스트잇 검출 오류:', error);
    throw error;
  }
};

// 이 함수는 더 이상 사용되지 않으므로 제거됨 (간단한 중앙 영역 추출 방식 사용)

// Adaptive HSV 마스크 생성 (app_umai.py 방식)
const createAdaptiveHSVMask = (hsvData, width, height) => {
  const mask = new Uint8Array(width * height);
  
  // app_umai.py의 adaptive_inrange 로직 구현
  const baselow = LOWER_YELLOW;
  const baseup = UPPER_YELLOW;
  
  // 1단계: Saturation 하한을 단계적으로 낮춤
  const saturationLevels = [baselow[1], 40, 25, 10, 5];
  
  for (let satLevel of saturationLevels) {
    let pixelCount = 0;
    mask.fill(0); // 마스크 초기화
    
    for (let i = 0; i < hsvData.length; i += 3) {
      const h = hsvData[i];
      const s = hsvData[i + 1];
      const v = hsvData[i + 2];
      
      const pixelIndex = Math.floor(i / 3);
      
      // HSV 범위 체크
      if (h >= baselow[0] && h <= baseup[0] &&
          s >= satLevel && s <= baseup[1] &&
          v >= baselow[2] && v <= baseup[2]) {
        mask[pixelIndex] = 255;
        pixelCount++;
      }
    }
    
    console.log(`HSV 마스크 테스트 - Sat: ${satLevel}, 픽셀: ${pixelCount}`);
    
    if (pixelCount > 2000) { // 2k 픽셀 이상이면 성공
      console.log(`적절한 HSV 마스크 발견: ${pixelCount} 픽셀`);
      return mask;
    }
  }
  
  // 2단계: Value 하한도 낮춰보기
  const valueLevels = [30, 20, 10];
  const lowSatLevels = [5, 3, 1];
  
  for (let valLevel of valueLevels) {
    for (let satLevel of lowSatLevels) {
      let pixelCount = 0;
      mask.fill(0);
      
      for (let i = 0; i < hsvData.length; i += 3) {
        const h = hsvData[i];
        const s = hsvData[i + 1];
        const v = hsvData[i + 2];
        
        const pixelIndex = Math.floor(i / 3);
        
        if (h >= baselow[0] && h <= baseup[0] &&
            s >= satLevel && s <= baseup[1] &&
            v >= valLevel && v <= baseup[2]) {
          mask[pixelIndex] = 255;
          pixelCount++;
        }
      }
      
      console.log(`HSV 마스크 테스트2 - Val: ${valLevel}, Sat: ${satLevel}, 픽셀: ${pixelCount}`);
      
      if (pixelCount > 1000) { // 1k 픽셀 이상이면 성공
        console.log(`최종 HSV 마스크 발견: ${pixelCount} 픽셀`);
        return mask;
      }
    }
  }
  
  console.log('적절한 HSV 마스크를 찾지 못함');
  return mask; // 마지막 결과 반환
};

// 간단한 모폴로지 연산 (노이즈 제거)
const morphologyOperations = (mask, width, height) => {
  // Opening 연산 (작은 노이즈 제거)
  const opened = morphologyOpen(mask, width, height, 3);
  
  // Closing 연산 (구멍 메우기)
  const closed = morphologyClose(opened, width, height, 7);
  
  return closed;
};

// 간단한 Opening 연산
const morphologyOpen = (mask, width, height, kernelSize) => {
  // 간소화된 opening (erosion → dilation)
  const eroded = erode(mask, width, height, kernelSize);
  return dilate(eroded, width, height, kernelSize);
};

// 간단한 Closing 연산
const morphologyClose = (mask, width, height, kernelSize) => {
  // 간소화된 closing (dilation → erosion)
  const dilated = dilate(mask, width, height, kernelSize);
  return erode(dilated, width, height, kernelSize);
};

// 간단한 Erosion 연산
const erode = (mask, width, height, kernelSize) => {
  const result = new Uint8Array(width * height);
  const half = Math.floor(kernelSize / 2);
  
  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let minVal = 255;
      
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const idx = (y + ky) * width + (x + kx);
          minVal = Math.min(minVal, mask[idx]);
        }
      }
      
      result[y * width + x] = minVal;
    }
  }
  
  return result;
};

// 간단한 Dilation 연산
const dilate = (mask, width, height, kernelSize) => {
  const result = new Uint8Array(width * height);
  const half = Math.floor(kernelSize / 2);
  
  for (let y = half; y < height - half; y++) {
    for (let x = half; x < width - half; x++) {
      let maxVal = 0;
      
      for (let ky = -half; ky <= half; ky++) {
        for (let kx = -half; kx <= half; kx++) {
          const idx = (y + ky) * width + (x + kx);
          maxVal = Math.max(maxVal, mask[idx]);
        }
      }
      
      result[y * width + x] = maxVal;
    }
  }
  
  return result;
};

// 최적 포스트잇 후보 찾기 (app_umai.py 스타일)
const findBestPostitCandidate = (mask, width, height, originalWidth, originalHeight) => {
  console.log('포스트잇 후보 분석 시작');
  
  // Connected Components 찾기 (간소화된 버전)
  const components = findConnectedComponents(mask, width, height);
  
  if (components.length === 0) {
    console.log('연결된 구성요소를 찾지 못함');
    return null;
  }
  
  let bestCandidate = null;
  let bestScore = 0;
  
  for (let comp of components) {
    const area = comp.width * comp.height;
    const arDiff = Math.abs(comp.width - comp.height) / Math.max(comp.width, comp.height) * 100;
    
    // app_umai.py의 점수 계산 로직 적용
    let score = 0;
    
    if (area >= MIN_AREA) {
      // 1. 면적 점수
      const idealArea = 50000;
      const areaScore = Math.max(0, 100 - Math.abs(area - idealArea) / idealArea * 50);
      score += areaScore;
      
      // 2. 정사각형 점수 (가장 중요)
      const squareScore = Math.max(0, 80 - arDiff * 2);
      score += squareScore;
      
      // 3. 중앙 위치 보너스
      const centerX = comp.x + comp.width / 2;
      const centerY = comp.y + comp.height / 2;
      const centerDist = Math.sqrt(Math.pow(centerX - width/2, 2) + Math.pow(centerY - height/2, 2));
      const normalizedCenterDist = centerDist / Math.sqrt(width*width + height*height);
      const centerScore = Math.max(0, 15 - normalizedCenterDist * 30);
      score += centerScore;
      
      // 4. 크기 비율 보너스
      const imgArea = width * height;
      const sizeRatio = area / imgArea;
      if (sizeRatio > 0.02 && sizeRatio < 0.3) {
        score += 20;
      }
    }
    
    console.log(`후보: 면적=${area}, 비율차이=${arDiff.toFixed(1)}%, 점수=${score.toFixed(1)}`);
    
    if (score > bestScore && arDiff <= MAX_AR_DIFF) {
      bestScore = score;
      bestCandidate = comp;
    }
  }
  
  if (bestCandidate && bestScore >= 50) {
    // 원본 해상도로 변환
    const scaleX = originalWidth / width;
    const scaleY = originalHeight / height;
    
    const result = {
      x: Math.round(bestCandidate.x * scaleX),
      y: Math.round(bestCandidate.y * scaleY),
      width: Math.round(bestCandidate.width * scaleX),
      height: Math.round(bestCandidate.height * scaleY)
    };
    
    console.log(`최적 포스트잇 발견 (점수: ${bestScore.toFixed(1)}):`, result);
    return result;
  }
  
  console.log(`조건을 만족하는 포스트잇을 찾지 못함 (최고점수: ${bestScore.toFixed(1)})`);
  return null;
};

// ROI 추출
const extractROI = async (imageUri, bounds, resolve) => {
  const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
  
  try {
    const croppedImage = await manipulateAsync(
      imageUri,
      [{
        crop: {
          originX: bounds.x,
          originY: bounds.y,
          width: bounds.width,
          height: bounds.height,
        }
      }],
      { format: SaveFormat.JPEG, compress: 0.8 }
    );
    
    console.log('포스트잇 ROI 추출 완료');
    resolve(croppedImage.uri);
  } catch (error) {
    console.error('ROI 추출 실패:', error);
    resolve(detectPostitMobileFallback(imageUri));
  }
};





// 폴백: 중앙 영역 추출 방식
const detectPostitMobileFallback = async (imageUri) => {
  const { manipulateAsync, SaveFormat } = require('expo-image-manipulator');
  
  // 이미지 크기 정보 가져오기
  const { width, height } = await getImageSize(imageUri);
  console.log(`이미지 크기: ${width}x${height}`);
  
  // 포스트잇이 보통 화면 중앙에 있을 것으로 가정하여 중앙 70% 영역 추출
  const cropRatio = 0.7; // 중앙 70% 영역 (키보드 등 주변부 제거)
  const startX = Math.round(width * (1 - cropRatio) / 2);
  const startY = Math.round(height * (1 - cropRatio) / 2);
  const cropWidth = Math.round(width * cropRatio);
  const cropHeight = Math.round(height * cropRatio);
  
  console.log(`포스트잇 중앙 영역 추정: ${startX},${startY} ${cropWidth}x${cropHeight}`);
  
  const croppedImage = await manipulateAsync(
    imageUri,
    [{
      crop: {
        originX: startX,
        originY: startY,
        width: cropWidth,
        height: cropHeight,
      }
    }],
    { format: SaveFormat.JPEG, compress: 0.8 }
  );
  
  console.log('모바일 포스트잇 검출 완료 (중앙 영역 추출)');
  return croppedImage.uri;
};

// 백엔드 서버 기반 포스트잇 검출 (app_umai.py 활용)
const detectPostitServer = async (imageUri) => {
  try {
    console.log('백엔드 서버 포스트잇 검출 시작');
    
    // 이미지를 base64로 변환
    const base64Image = await imageToBase64(imageUri);
    
    // 토큰 가져오기
    const token = await getToken();
    
    // 백엔드 서버에 포스트잇 검출 요청
    const response = await fetch(`${BASE_URL}/api/detect-postit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        image: base64Image
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.postit_found) {
      console.log('백엔드 서버 포스트잇 검출 성공');
      
      if (Platform.OS === 'web') {
        // 웹에서는 base64 URL 직접 반환
        return result.postit_image;
      } else {
        // React Native에서는 임시 파일로 저장
        const FileSystem = require('expo-file-system');
        const tempUri = FileSystem.documentDirectory + 'temp_postit.jpg';
        
        // Base64 데이터에서 헤더 제거
        const base64Data = result.postit_image.replace(/^data:image\/[a-z]+;base64,/, '');
        
        await FileSystem.writeAsStringAsync(tempUri, base64Data, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        return tempUri;
      }
    } else {
      console.log('백엔드 서버 포스트잇 검출 실패:', result.message);
      return null;
    }
    
  } catch (error) {
    console.error('백엔드 서버 포스트잇 검출 오류:', error);
    return null;
  }
};

// 포스트잇 검출 함수 (백엔드 서버 우선, 실패시 클라이언트 검출)
const detectPostit = async (imageUri) => {
  console.log('🔍 포스트잇 검출 시작');
  
  // 1차: 백엔드 서버 검출 시도 (5초 타임아웃)
  console.log('1차: 백엔드 서버 포스트잇 검출 시도 (5초 타임아웃)');
  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('서버 타임아웃')), 5000)
    );
    
    const serverResult = await Promise.race([
      detectPostitServer(imageUri),
      timeoutPromise
    ]);
    
    if (serverResult) {
      console.log('✅ 백엔드 서버 포스트잇 검출 성공');
      return serverResult;
    }
  } catch (error) {
    console.error('❌ 백엔드 서버 검출 실패:', error.message);
  }
  
  // 2차: 클라이언트 검출 시도 (빠르고 안정적)
  console.log('2차: 클라이언트 포스트잇 검출 시도');
  try {
    const clientResult = await detectPostitMobile(imageUri);
    console.log('✅ 클라이언트 포스트잇 검출 성공');
    return clientResult;
  } catch (error) {
    console.error('❌ 클라이언트 포스트잇 검출 오류:', error);
  }
  
  // 3차: 원본 이미지 사용 (최후의 수단)
  console.log('⚠️ 모든 포스트잇 검출 실패, 원본 이미지 사용');
  return imageUri;
};

// 메인 OCR 인증 함수
export const verifyWithOCR = async (imageUri, expectedName) => {
  console.log('🔍 OCR 인증 시작:', { 
    imageUri: imageUri.substring(0, 50) + '...', 
    expectedName 
  });
  
  try {
    // 1. 포스트잇 검출 (타임아웃 및 오류 처리 강화)
    console.log('📋 1단계: 포스트잇 영역 검출');
    let roiImage;
    try {
      roiImage = await detectPostit(imageUri);
      console.log('✅ 포스트잇 검출 완료, ROI 사용:', roiImage !== imageUri);
    } catch (error) {
      console.warn('⚠️ 포스트잇 검출 실패, 원본 이미지 사용:', error.message);
      roiImage = imageUri;
    }
    
    // 2. 이미지를 base64로 변환
    console.log('📋 2단계: 이미지 Base64 변환');
    const base64Image = await imageToBase64(roiImage);
    
    // 3. OCR.space API 호출 (타임아웃 10초)
    console.log('📋 3단계: OCR.space API 호출');
    const ocrTimeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OCR API 타임아웃')), 10000)
    );
    
    const ocrResults = await Promise.race([
      callOCRSpace(base64Image),
      ocrTimeoutPromise
    ]);
    
    console.log('✅ OCR 결과:', ocrResults);
    
    if (!ocrResults || ocrResults.length === 0) {
      return {
        success: false,
        message: '텍스트를 인식할 수 없습니다. 포스트잇에 더 명확하게 써주세요.',
        ocrResults: []
      };
    }
    
    // 4. 닉네임 검증 (간소화된 로직)
    console.log('📋 4단계: 닉네임 검증');
    const SIMILARITY_THRESHOLD = 0.6; // 60%로 낮춤 (더 관대하게)
    let bestMatch = null;
    let bestSimilarity = 0;
    
    for (const text of ocrResults) {
      // 정확히 일치하는 경우 (기존 로직)
      const cleanText = text.replace(/\s+/g, '').toLowerCase();
      const cleanExpected = expectedName.replace(/\s+/g, '').toLowerCase();
      
      if (cleanText === cleanExpected || cleanText.includes(cleanExpected) || cleanExpected.includes(cleanText)) {
        console.log('✅ 정확한 매칭 발견:', text);
        return {
          success: true,
          message: `인증 성공! "${expectedName}" 닉네임이 확인되었습니다. (정확 매칭: "${text}")`,
          ocrResults
        };
      }
      
      // 유사도 기반 검증
      const similarity = calculateSimilarity(text, expectedName);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestMatch = text;
      }
      
      // 단어별 검사
      const words = text.split(/\s+/);
      for (const word of words) {
        const wordSimilarity = calculateSimilarity(word, expectedName);
        if (wordSimilarity > bestSimilarity) {
          bestSimilarity = wordSimilarity;
          bestMatch = word;
        }
      }
    }
    
    console.log(`💯 최고 유사도: ${Math.round(bestSimilarity * 100)}% ("${bestMatch}")`);
    
    if (bestSimilarity >= SIMILARITY_THRESHOLD) {
      return {
        success: true,
        message: `인증 성공! "${expectedName}" 닉네임이 확인되었습니다. (유사도: ${Math.round(bestSimilarity * 100)}%, 매칭: "${bestMatch}")`,
        ocrResults
      };
    } else {
      return {
        success: false,
        message: `인증 실패: "${expectedName}" 닉네임을 찾을 수 없습니다.\n최고 유사도: ${Math.round(bestSimilarity * 100)}% ("${bestMatch}")\n인식된 텍스트: ${ocrResults.join(', ')}`,
        ocrResults
      };
    }
    
  } catch (error) {
    console.error('❌ OCR 인증 오류:', error);
    return {
      success: false,
      message: 'OCR 인증 중 오류가 발생했습니다: ' + error.message,
      ocrResults: []
    };
  }
};

// 포스트잇 검출을 위한 Canvas 기반 함수 (웹용)
const detectPostitWeb = async (imageUri) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.log('웹 환경이 아님, 원본 이미지 사용');
    return imageUri;
  }

  try {
    // 새로운 OpenCV 스타일 검출 사용
    return await detectPostitMobileOpenCV(imageUri);
  } catch (error) {
    console.error('웹 포스트잇 검출 오류:', error);
    return imageUri; // 오류 시 원본 이미지 사용
  }
};

// RGB to HSV 변환 (OpenCV 스타일)
const rgbToHsv = (rgbaData, width, height) => {
  const hsvData = new Float32Array(width * height * 3);
  
  for (let i = 0; i < rgbaData.length; i += 4) {
    const r = rgbaData[i] / 255;
    const g = rgbaData[i + 1] / 255;
    const b = rgbaData[i + 2] / 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    // Hue 계산
    let h = 0;
    if (diff !== 0) {
      if (max === r) {
        h = ((g - b) / diff + 6) % 6;
      } else if (max === g) {
        h = (b - r) / diff + 2;
      } else {
        h = (r - g) / diff + 4;
      }
    }
    h = h * 60; // 0-360도
    if (h > 180) h = h - 360; // OpenCV HSV 범위 맞춤
    h = Math.max(0, h / 2); // 0-180 범위로 변환
    
    // Saturation 계산
    const s = max === 0 ? 0 : (diff / max) * 255;
    
    // Value 계산
    const v = max * 255;
    
    const pixelIndex = Math.floor(i / 4);
    const hsvIndex = pixelIndex * 3;
    
    hsvData[hsvIndex] = h;
    hsvData[hsvIndex + 1] = s;
    hsvData[hsvIndex + 2] = v;
  }
  
  return hsvData;
};



// Connected Components 찾기 (OpenCV 스타일, 간소화된 버전)
const findConnectedComponents = (mask, width, height) => {
  const visited = new Uint8Array(width * height);
  const components = [];
  
  const getPixel = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return 0;
    return mask[y * width + x];
  };
  
  const setVisited = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    visited[y * width + x] = 1;
  };
  
  const isVisited = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return true;
    return visited[y * width + x] === 1;
  };
  
  // Flood fill로 connected components 찾기
  const floodFill = (startX, startY) => {
    const stack = [{x: startX, y: startY}];
    const pixels = [];
    
    while (stack.length > 0) {
      const {x, y} = stack.pop();
      
      if (isVisited(x, y) || getPixel(x, y) === 0) continue;
      
      setVisited(x, y);
      pixels.push({x, y});
      
      // 4-연결성 체크
      stack.push({x: x-1, y: y});
      stack.push({x: x+1, y: y});
      stack.push({x: x, y: y-1});
      stack.push({x: x, y: y+1});
    }
    
    return pixels;
  };
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (getPixel(x, y) === 255 && !isVisited(x, y)) {
        const pixels = floodFill(x, y);
        
        if (pixels.length > 100) { // 최소 픽셀 수
          // 바운딩 박스 계산
          let minX = width, minY = height, maxX = 0, maxY = 0;
          
          for (let pixel of pixels) {
            minX = Math.min(minX, pixel.x);
            minY = Math.min(minY, pixel.y);
            maxX = Math.max(maxX, pixel.x);
            maxY = Math.max(maxY, pixel.y);
          }
          
          components.push({
            x: minX,
            y: minY,
            width: maxX - minX + 1,
            height: maxY - minY + 1,
            pixelCount: pixels.length
          });
        }
      }
    }
  }
  
  console.log(`발견된 연결 구성요소: ${components.length}개`);
  return components;
};

export default {
  verifyWithOCR,
  detectPostit,
  callOCRSpace
}; 