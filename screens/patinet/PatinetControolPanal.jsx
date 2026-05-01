import React from 'react';
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import { useLanguage } from '../../context/LanguageContext';

import PatientProfile from "./PatinetProfile";
import WeightInput from "./Weightinput";
import ProfileSettingsScreen from "../SettingsWithProfile/SettingWithProfile";

const Tab = createBottomTabNavigator();

const PatinetPages = () => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: "#382120",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color, focused }) => {
            let iconName;
            if (route.name === "Profile") {
              iconName = focused ? "person" : "person-outline";
            } else if (route.name === "Settings") {
              iconName = focused ? "settings" : "settings-outline";
            }
            return <Ionicons name={iconName} size={24} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="Profile"
          component={PatientProfile}
          options={{ title: t.patientTabs.profile }}
        />
        <Tab.Screen
          name="Settings"
          component={ProfileSettingsScreen}
          options={{ title: t.patientTabs.settings }}
        />
      </Tab.Navigator>
    </View>
  );
};

export default PatinetPages;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    width: '100%'
  },
  tabBar: {
    height: 75,
    paddingBottom: 12,
    paddingTop: 8,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
    borderTopWidth: 0,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});