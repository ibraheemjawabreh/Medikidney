import React from 'react'; // إضافة React
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { StyleSheet, View } from "react-native";

import PatientProfile from "./PatinetProfile";
import WeightInput from "./Weightinput";

const Tab = createBottomTabNavigator();

const PatinetPages = () => {
  return (
    <View style={styles.container}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: "#2563EB",
            tabBarInactiveTintColor: "#9CA3AF",
            tabBarLabelStyle: styles.tabLabel,
            tabBarIcon: ({ color, focused }) => {
              let iconName;

              if (route.name === "Profile")
                iconName = focused ? "person" : "person-outline";
              else if (route.name === "Weight")
                iconName = focused ? "barbell" : "barbell-outline";

              return <Ionicons name={iconName} size={24} color={color} />;
            },
          })}
        >
          <Tab.Screen
            name="Profile"
            component={PatientProfile}
            options={{ title: "ملفي" }}
          />

          <Tab.Screen
            name="Weight"
            component={WeightInput}
            options={{ title: "الوزن" }}
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
    width:'100%'
  },

  tabBar: {
    height: 70,
    paddingBottom: 8,
    paddingTop: 6,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 15,
  },

  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
});