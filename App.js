import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import LoginScreen from './login/loginScreen';
import SearchPatinet from './screens/patinet/searchPatinet';
import PatinetPages from './screens/patinet/PatinetControolPanal';
import ChangePassword from './screens/changePassword/changePassword';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import NursePages from './screens/Nurse/nurserControolPanal';
import NutritionistPages from './screens/Nutritionist/NutritionistControlPanal';
import AboutApp from './screens/aboutApplication/ApoutApplication'
const Stack = createNativeStackNavigator();

export default function App() {

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{headerShown:false}}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SearchPatient" component={SearchPatinet} />
        <Stack.Screen name="Patinet" component={PatinetPages} />
        <Stack.Screen name="NurseHome" component={NursePages} />
        <Stack.Screen name="NutritionistHome" component={NutritionistPages} />
        <Stack.Screen name='ChangePassword' component={ChangePassword} />
        <Stack.Screen name="AboutApp" component={AboutApp}/>
      </Stack.Navigator>
      </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
