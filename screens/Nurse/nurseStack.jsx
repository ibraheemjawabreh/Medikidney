
import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import NursePages from "./nurserControolPanal";
import PatientState from "./patinetState";
import SessionDetails from "../dialysisSessions/SessionDetails";

const Stack = createNativeStackNavigator();

const NurseStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="NurseHome" component={NursePages} />
    <Stack.Screen name="PatientState" component={PatientState} />
    <Stack.Screen name="SessionDetails" component={SessionDetails} />
  </Stack.Navigator>
);

export default NurseStack;
