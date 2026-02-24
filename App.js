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
import NurseTasks from './screens/Nurse/NurseTasks'
import WeightInput from './screens/patinet/Weightinput'
import DatesDoctor from './screens/patinet/DatesDoctor'
import EmailInput from './screens/resetPassword/EmailInput';
import OtpCode from './screens/resetPassword/OtpCode';
import ResetPassword from './screens/resetPassword/ResetPassword';
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
        <Stack.Screen name="NurseTasks" component={NurseTasks} />
        <Stack.Screen name="WeightInput" component={WeightInput}/>
        <Stack.Screen name="DatesDoctor" component={DatesDoctor}/>
        <Stack.Screen name="EmailInput" component={EmailInput}/>
        <Stack.Screen name="OtpCode" component={OtpCode}/>
        <Stack.Screen name="ResetPassword" component={ResetPassword}/>
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
