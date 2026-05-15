import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../login/loginScreen';
import SearchPatinet from '../screens/patinet/searchPatinet';
import PatinetPages from '../screens/patinet/PatinetControolPanal';
import ChangePassword from '../screens/changePassword/changePassword';
import NursePages from '../screens/Nurse/nurserControolPanal';
import NutritionistPages from '../screens/Nutritionist/NutritionistControlPanal';
import AboutApp from '../screens/aboutApplication/ApoutApplication';
import NurseTasks from '../screens/Nurse/NurseTasks';
import WeightInput from '../screens/patinet/Weightinput';
import DatesDoctor from '../screens/patinet/DatesDoctor';
import EmailInput from '../screens/resetPassword/EmailInput';
import OtpCode from '../screens/resetPassword/OtpCode';
import ResetPassword from '../screens/resetPassword/ResetPassword';
import NutritionistTable from '../screens/Nutritionist/NutritionistTable';
import PatientProfile from '../screens/patinet/PatinetProfile';
import StaffPatientView from '../screens/patinet/NurseNutritionsitTOpatint';
import ShowSessions from '../screens/Sessions/ShowSessions'
import DailySchedules from '../screens/Nurse/DailySchedules'
import SelectPatient from '../screens/Nurse/selectPatinet'
import PatientState from '../screens/Nurse/patinetState'
import ChangePasswordFirstTime from '../screens/changePassword/changepasswordafteerlogin'
import MedicationsTab from '../screens/dialysisSessions/MedicationsTab'
import NotesTab from '../screens/dialysisSessions/NotesTab'
import SessionDetails from '../screens/dialysisSessions/SessionDetails'
import SettingsTab from '../screens/dialysisSessions/SettingsTab'
import SymptomsTab from '../screens/dialysisSessions/SymptomsTab'
import VitalSignsTab from '../screens/dialysisSessions/VitalSignsTab'
import NurseStack from '../screens/Nurse/nurseStack'
import PatientSessionStatistics from '../screens/patinet/PatientSessionStatistics'
import PatinetInfo from '../screens/patinet/patientInformation'
import PatientSessionDetailView from '../screens/patinet/PatientSessionDetailView'
import PatientSessionScreen from '../screens/patinet/PatientSessionScreen'
import NotificationsScreen from '../screens/notifications/NotificationsScreen'
import ConsultationDetails from '../screens/patinet/ConsultationDetails'

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SearchPatient" component={SearchPatinet} />
      <Stack.Screen name="PatinetPages" component={PatinetPages} />
      <Stack.Screen name="NurseHome" component={NursePages} />
      <Stack.Screen name="NutritionistHome" component={NutritionistPages} />
      <Stack.Screen name="ChangePassword" component={ChangePassword} />
      <Stack.Screen name="AboutApp" component={AboutApp} />
      <Stack.Screen name="NurseTasks" component={NurseTasks} />
      <Stack.Screen name="WeightInput" component={WeightInput} />
      <Stack.Screen name="DatesDoctor" component={DatesDoctor} />
      <Stack.Screen name="EmailInput" component={EmailInput} />
      <Stack.Screen name="OtpCode" component={OtpCode} />
      <Stack.Screen name="ResetPassword" component={ResetPassword} />
      <Stack.Screen name="NutritionistTable" component={NutritionistTable} />
      <Stack.Screen name="PatientProfile" component={PatientProfile} />
      <Stack.Screen name="StaffPatientView" component={StaffPatientView} options={{ headerShown: false }} />
      <Stack.Screen name='ShowSessions' component={ShowSessions} />
      <Stack.Screen name='DailySchedules' component={DailySchedules} />
      <Stack.Screen name='SelectPatient' component={SelectPatient} />
      <Stack.Screen name='PatientState' component={PatientState} />
      <Stack.Screen name="ChangePasswordFirstTime" component={ChangePasswordFirstTime} />
      <Stack.Screen name='MedicationsTab' component={MedicationsTab} />
      <Stack.Screen name='NotesTab' component={NotesTab} />
      <Stack.Screen name='SessionDetails' component={SessionDetails} />
      <Stack.Screen name='SettingsTab' component={SettingsTab} />
      <Stack.Screen name='SymptomsTab' component={SymptomsTab} />
      <Stack.Screen name='VitalSignsTab' component={VitalSignsTab} />
      
      <Stack.Screen name='PatientSessionStatistics' component={PatientSessionStatistics} />
      <Stack.Screen name='PatinetInfo' component={PatinetInfo} />
      <Stack.Screen name='PatientSessionDetailView' component={PatientSessionDetailView} />
      <Stack.Screen name='PatientSessionScreen' component={PatientSessionScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name='Notifications' component={NotificationsScreen} />
      <Stack.Screen name='ConsultationDetails' component={ConsultationDetails} options={{ headerShown: false }} />

    </Stack.Navigator>
  );
};

export default AppNavigator;