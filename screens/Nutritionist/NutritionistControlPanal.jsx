import React from 'react'; 
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import SearchPatient from "../patinet/searchPatinet"; 
import ProfileSettingsScreen from "../SettingsWithProfile/SettingWithProfile";

const Tab = createBottomTabNavigator();

const NutritionistPages = () => {
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
            } else if (route.name === "Weight") {
              iconName = focused ? "stats-chart" : "stats-chart-outline";
            } else if (route.name === "Search") {
              iconName = focused ? "search" : "search-outline";
            } else if (route.name === "Settings") {
              iconName = focused ? "settings" : "settings-outline";
            }

            return <Ionicons name={iconName} size={24} color={color} />;
          },
        })}
      >
        <Tab.Screen
          name="Search"
          component={SearchPatient}
          options={{ title: "بحث" }}
        />
        <Tab.Screen
          name="Settings"
          component={ProfileSettingsScreen}
          options={{ title: "الإعدادات" }}
        />
      </Tab.Navigator>
    </View>
  );
};

export default NutritionistPages;

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: "#F9FAFB",
    width: '100%'
  },
  tabBar: {
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 15,
    borderTopWidth: 0, 
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
});