import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from '../components/Auth/LoginScreen';
import RegisterScreen from '../components/Auth/RegisterScreen';
import ChallengeCreateScreen from '../components/Challenge/ChallengeCreateScreen';
import ChallengeListScreen from '../components/Challenge/ChallengeListScreen';
import HomeScreen from '../screens/HomeScreen';
import ChallengeVerificationScreen from '../screens/ChallengeVerification';
import MyPage from '../screens/MyPage';
import ChallengeDetail from '../screens/ChallengeDetail';
import { TouchableOpacity, Text } from 'react-native';

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="MyPage"
        screenOptions={({ navigation }) => ({
          headerBackImage: () => null,
          headerBackTitleVisible: false,
          headerRight: () => (
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={{ marginRight: 15, backgroundColor: '#eee', padding: 8, borderRadius: 8 }}
            >
              <Text>로그인</Text>
            </TouchableOpacity>
          ),
        })}
      >
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="ChallengeCreate" component={ChallengeCreateScreen} />
        <Stack.Screen name="ChallengeList" component={ChallengeListScreen} />
        <Stack.Screen name="ChallengeVerification" component={ChallengeVerificationScreen} />
        <Stack.Screen name="MyPage" component={MyPage} />
        <Stack.Screen name="ChallengeDetail" component={ChallengeDetail} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}