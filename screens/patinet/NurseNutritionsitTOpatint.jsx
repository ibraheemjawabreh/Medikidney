import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Tab, TabView, Button } from "@rneui/base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const StaffPatientView = ({ route, navigation }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");

  const { patientId } = route.params || {};

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const role = await AsyncStorage.getItem("role");
      setUserRole(role);

      if (!patientId) {
        alert("خطأ: لم يتم تمرير رقم المريض");
        navigation.goBack();
        return;
      }

      const response = await axios.get(
        `https://medikidneysys.onrender.com/users/profile/patients/${patientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPatient(response.data);
    } catch (error) {
      console.log("Error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  if (loading) return <ActivityIndicator size="large" color="#2A7FFF" style={{flex:1}} />;

  return (
    <View style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>بيانات المريض </Text>
        <View style={styles.infoRow}>
                 <Text style={styles.infoValue}>{patient?.full_name || "اسم غير معروف"}</Text>
                  <Text style={styles.infoValue}>رقم الهوية: {patient?.national_id}</Text>
                  <Text style={styles.infoValue}>الجنس: {patient?.gender}</Text>
                  <Text style={styles.infoValue}>فصيلة الدم: {patient?.blood_type}</Text>
                  <Text style={styles.infoValue}>رقم المريض: {patient?.patient_id}</Text>
        </View>
      </View>

      <Tab value={tabIndex} onChange={setTabIndex} scrollable indicatorStyle={styles.indicator}>
        <Tab.Item title="الغذاء" icon={{ name: "restaurant", color: "#2A7FFF" }} titleStyle={styles.tabText} />
        <Tab.Item title="الجلسات" icon={{ name: "opacity", color: "#2A7FFF" }} titleStyle={styles.tabText} />
        <Tab.Item title="ملاحظات الطبيب" icon={{ name: "description", color: "#2A7FFF" }} titleStyle={styles.tabText} />
      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex}>
        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>البرنامج الغذائي</Text>
            {userRole === "NUTRITIONIST" && (
              <Button title="تعديل البرنامج" buttonStyle={styles.addButton} onPress={() => navigation.navigate("NutritionistTable", { patientId })} />
            )}
            {userRole === "NURSE" && <Text>عرض البرنامج الغذائي للمريض فقط</Text>}
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>بيانات الجلسات</Text>
            {userRole === "NURSE" && (
              <Button title="إضافة بيانات جلسة" buttonStyle={styles.addButton} onPress={() => navigation.navigate("NurseSessionInput", { patientId })} />
            )}
            {userRole === "NUTRITIONIST" && <Text>مراقبة أوزان المريض قبل وبعد الجلسة</Text>}
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabItem}>
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>ملاحظات الطبيب</Text>
            <Text>هنا تظهر تقارير الطبيب الموجهة للطاقم</Text>
          </View>
        </TabView.Item>
      </TabView>
    </View>
  );
};


export default StaffPatientView


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5", 
  },
  headerCard: { 
    backgroundColor: "#fff", 
    padding: 20, 
    marginHorizontal: 15, 
    marginTop: 15,
    borderRadius: 20, 
    alignSelf: 'stretch',
    elevation: 4, 
    shadowColor: "#000", 
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "right",
    marginBottom: 15,
    color: "#1A1A1A",
    letterSpacing: 0.5,
  },
  infoRow: { 
    flexDirection: "row-reverse", 
    justifyContent: "space-between",
    flexWrap: "wrap", 
    alignItems: "center"
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2A7FFF", 
    backgroundColor: "#E0EBFF", 
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginVertical: 4,
    overflow: 'hidden',
  },
  indicator: { 
    backgroundColor: "#2A7FFF", 
    height: 4,
    borderRadius: 2,
  },
  tabText: { 
    fontSize: 12, 
    color: "#2A7FFF",
    fontWeight: "700",
    textAlign: 'center'
  },
  tabItem: { 
    width: "100%", 
    backgroundColor: "#F0F2F5",
  },
  tabContent: { 
    padding: 20, 
    alignItems: "center",
    paddingTop: 40,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 25,
    color: "#333",
    textAlign: 'center'
  },
  addButton: { 
    backgroundColor: "#2A7FFF", 
    borderRadius: 12, 
    paddingHorizontal: 35,
    paddingVertical: 15,
    elevation: 2,
  },
  infoText: { 
    fontSize: 14,
    color: "#64748B",
    fontStyle: "italic",
    marginTop: 15,
    textAlign: 'center'
  }
});