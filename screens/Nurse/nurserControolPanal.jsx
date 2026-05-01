import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";
import SelectPatient from "./selectPatinet";
import ProfileSettingsScreen from "../SettingsWithProfile/SettingWithProfile";
import SearchPatient from "../patinet/searchPatinet";
import { useLanguage } from "../../context/LanguageContext";

const Tab = createBottomTabNavigator();

const NursePages = () => {
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Tab.Navigator
        initialRouteName="SelectPatient"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: "#059669",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color, focused }) => {
            const icons = {
              SelectPatient: focused ? "calendar" : "calendar-outline",
              Search: focused ? "search" : "search-outline",
              Settings: focused ? "settings" : "settings-outline",
            };
            return <Ionicons name={icons[route.name]} size={24} color={color} />;
          },
        })}
      >
        <Tab.Screen name="SelectPatient" component={SelectPatient} options={{ title: t.nurseTabs.sessions }} />
        <Tab.Screen name="Search" component={SearchPatient} options={{ title: t.nurseTabs.search }} />
        <Tab.Screen name="Settings" component={ProfileSettingsScreen} options={{ title: t.nurseTabs.settings }} />
      </Tab.Navigator>
    </View>
  );
};

export default NursePages;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  tabBar: {
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: "#fff",
    borderTopWidth: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 15,
  },
  tabLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
});