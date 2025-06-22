// 앱 로드 전 expo-notifications 경고 완전 차단
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  const message = String(args[0] || '');
  if (message.includes('expo-notifications') || 
      message.includes('functionality is not fully supported') ||
      message.includes('Android Push notifications') ||
      message.includes('remote notifications') ||
      message.includes('development build instead') ||
      message.includes('Use a development build')) {
    return; // 완전 무시
  }
  originalWarn.apply(console, args);
};

console.error = (...args) => {
  const message = String(args[0] || '');
  if (message.includes('expo-notifications') || 
      message.includes('Android Push notifications') ||
      message.includes('remote notifications') ||
      message.includes('development build instead') ||
      message.includes('Use a development build') ||
      message.includes('SDK 53')) {
    return; // 완전 무시
  }
  originalError.apply(console, args);
};

import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
