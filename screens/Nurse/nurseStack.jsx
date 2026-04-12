// AppNavigation/NurseStack.js
// ضيف هذا الـ Stack في AppNavigation الرئيسي بدل NursePages مباشرة
 
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NursePages from "../screens/Nurse/NursePages";
import PatientState from "../screens/Nurse/PatientState";
import SessionForm from "../screens/Nurse/SessionForm"; // صفحة جلسة الغسيل (موجودة عندك)
 
const Stack = createNativeStackNavigator();
 
const NurseStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    {/* الـ Tabs هي الصفحة الأساسية */}
    <Stack.Screen name="NurseHome" component={NursePages} />
 
    {/* هذه الصفحات تُفتح فوق الـ Tabs (بدون شريط التبويب) */}
    <Stack.Screen name="PatientState" component={PatientState} />
    <Stack.Screen name="SessionForm"  component={SessionForm} />
  </Stack.Navigator>
);
 
export default NurseStack;
 