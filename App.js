import 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator } from 'react-native';
import AppNavigator from './navigation/AppNavigator';

export default function App() {
  const [fontsLoaded] = useFonts({
    'Cafe24Ssurround': require('./assets/fonts/Cafe24Ssurround.ttf'),
    'HakgyoansimPuzzle-Black': require('./assets/fonts/HakgyoansimPuzzle-Black.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#FFF44F" />
      </View>
    );
  }

  return <AppNavigator />;
}