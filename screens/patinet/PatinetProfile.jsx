import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { Tab, TabView, Button } from "@rneui/base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const PatientProfile = ({ route, navigation }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [sessions, setSessions] = useState([]);

  const { patientId } = route.params || {};

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");

      const response = await axios.get(
        `https://medikidneysys.onrender.com/users/profile`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const patientInfo = response.data.patient;
      setPatient(patientInfo);

      if (patientInfo && patientInfo.patient_id) {
        fetchNutritionPlan(patientInfo.patient_id);
        fetchSessions(patientInfo.patient_id);
      }
    } catch (error) {
      console.log("Error fetching patient:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientData();
  }, [patientId]);

  const fetchNutritionPlan = async (id) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await axios.get(
        `https://medikidneysys.onrender.com/nutrition-programs?patientId=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const fixedData = response.data.map(item => ({
        ...item,
        allowedItems: item.allowedItems || item.allowed_items || "",
        forbiddenItems: item.forbiddenItems || item.forbidden_items || "",
        mealNotes: item.mealNotes || item.meal_notes || ""
      }));

      if (fixedData.length > 0) {
        const latestPlan = fixedData.reduce((prev, current) => {
          const prevDate = new Date(prev.updatedAt || prev.createdAt);
          const currDate = new Date(current.updatedAt || current.createdAt);
          return currDate > prevDate ? current : prev;
        });
        setNutritionPlan(latestPlan);
      } else {
        setNutritionPlan(null);
      }

    } catch (error) {
      console.log("Error fetching nutrition plan:", error.response?.data || error.message);
      setNutritionPlan(null);
    }
  };

  const fetchSessions = async (patientId) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await axios.get(
        `https://medikidneysys.onrender.com/dialysis-sessions?patientId=${patientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSessions(response.data || []);
    } catch (error) {
      console.log("Error fetching sessions:", error.response?.data || error.message);
      setSessions([]);
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2A7FFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>ملف المريض</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoValue}>{patient?.full_name || "اسم غير معروف"}</Text>
          <Text style={styles.infoValue}>رقم الهوية: {patient?.national_id}</Text>
          <Text style={styles.infoValue}>الجنس: {patient?.gender}</Text>
          <Text style={styles.infoValue}>فصيلة الدم: {patient?.blood_type}</Text>
          <Text style={styles.infoValue}>رقم المريض: {patient?.patient_id}</Text>
        </View>
      </View>

      <Tab
        value={tabIndex}
        onChange={setTabIndex}
        scrollable
        indicatorStyle={styles.indicator}
      >
        <Tab.Item title="جدول التغذية" icon={{ name: "restaurant", color: "#2A7FFF" }} titleStyle={styles.tabText} />
        <Tab.Item title="الفحوصات" icon={{ name: "science", color: "#2A7FFF" }} titleStyle={styles.tabText} />
        <Tab.Item title="المواعيد" icon={{ name: "event", color: "#2A7FFF" }} titleStyle={styles.tabText} />
        <Tab.Item title="الجلسات" icon={{ name: "opacity", color: "#2A7FFF" }} titleStyle={styles.tabText} />
      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex}>

        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>آخر برنامج غذائي</Text>
            {nutritionPlan ? (
              <View style={styles.nutritionCard}>
                <Text style={styles.mealType}>{nutritionPlan.title || "برنامج غذائي"}</Text>
                <Text style={styles.mealContent}><Text style={styles.bold}>الوصف: </Text>{nutritionPlan.description || "لا يوجد وصف"}</Text>
                <Text style={styles.mealContent}><Text style={styles.bold}>المسموحات: </Text>{nutritionPlan.allowedItems || "لا يوجد"}</Text>
                <Text style={styles.mealContent}><Text style={styles.bold}>الممنوعات: </Text>{nutritionPlan.forbiddenItems || "لا يوجد"}</Text>
                <Text style={styles.mealContent}><Text style={styles.bold}>الفطور: </Text>{nutritionPlan.breakfast || "غير محدد"}</Text>
                <Text style={styles.mealContent}><Text style={styles.bold}>الغداء: </Text>{nutritionPlan.lunch || "غير محدد"}</Text>
                <Text style={styles.mealContent}><Text style={styles.bold}>العشاء: </Text>{nutritionPlan.dinner || "غير محدد"}</Text>

                {nutritionPlan.mealNotes && (
                  <View style={styles.notesBox}>
                    <Text style={styles.mealNotes}>📝 {nutritionPlan.mealNotes}</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.infoText}>لا يوجد برنامج غذائي</Text>
            )}
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>الفحوصات المخبرية</Text>
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>المواعيد مع الطبيب</Text>
              <Button
                title="احجز موعدك "
                buttonStyle={styles.addButton}
                onPress={() =>
                    navigation.navigate("DatesDoctor", {
                        patientId: patient.patient_id
                      })
                  }
              />
          </ScrollView>
        </TabView.Item>

     
<TabView.Item style={styles.tabItem}>
  <ScrollView contentContainerStyle={styles.tabContent}>
    <Text style={styles.sectionTitle}>بيانات الجلسات</Text>
    {sessions.length > 0 ? (
      sessions.map((session, index) => (
        <View key={index} style={styles.sessionCard}>
          <Text style={styles.sessionTitle}>جلسة #{session.session_id}</Text>
          
          <Text style={styles.sessionText}><Text style={styles.bold}>التاريخ: </Text>{formatDate(session.date)}</Text>
          
          <Text style={styles.sessionText}><Text style={styles.bold}>وقت البدء: </Text>{session.start_time ? new Date(session.start_time).toLocaleTimeString() : "-"}</Text>
          <Text style={styles.sessionText}><Text style={styles.bold}>وقت الانتهاء: </Text>{session.end_time ? new Date(session.end_time).toLocaleTimeString() : "-"}</Text>
          
          <Text style={styles.sessionText}><Text style={styles.bold}>الوزن قبل: </Text>{session.weight_before ?? "-"}</Text>
          <Text style={styles.sessionText}><Text style={styles.bold}>الوزن بعد: </Text>{session.weight_after ?? "-"}</Text>
          
          <Text style={styles.sessionText}><Text style={styles.bold}>السوائل المسحوبة: </Text>{session.fluid_removed ?? "-"} لتر</Text>
          
          <Text style={styles.sessionText}><Text style={styles.bold}>الضغط قبل: </Text>{session.blood_pressure_before || "-"}</Text>
          <Text style={styles.sessionText}><Text style={styles.bold}>الضغط بعد: </Text>{session.blood_pressure_after || "-"}</Text>
          
          <Text style={styles.sessionText}><Text style={styles.bold}>الممرض: </Text>{session.nurse?.full_name || "-"}</Text>
          
          {session.notes && <Text style={styles.sessionText}>📝 {session.notes}</Text>}
        </View>
      ))
    ) : (
      <Text style={styles.infoText}>لا توجد جلسات حتى الآن</Text>
    )}
  </ScrollView>
</TabView.Item>

      </TabView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  loadingContainer: { flex: 1, justifyContent: "center" },
  headerCard: { backgroundColor: "#fff", padding: 20, marginHorizontal: 15, marginTop: 15, borderRadius: 20, elevation: 4 },
  headerTitle: { fontSize: 22, fontWeight: "800", textAlign: "right", marginBottom: 15 },
  infoRow: { flexDirection: "row-reverse", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" },
  infoValue: { fontSize: 15, fontWeight: "700", color: "#2A7FFF", backgroundColor: "#E0EBFF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginVertical: 4 },
  indicator: { backgroundColor: "#2A7FFF", height: 4, borderRadius: 2 },
  tabText: { fontSize: 12, color: "#2A7FFF", fontWeight: "700", textAlign: "center" },
  tabItem: { width: "100%", backgroundColor: "#F0F2F5" },
  tabContent: { padding: 20, alignItems: "center", paddingTop: 40 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 25, textAlign: "center" },
  addButton: { backgroundColor: "#2A7FFF", borderRadius: 12, paddingHorizontal: 35, paddingVertical: 15 },
  infoText: { fontSize: 16, color: "#FF4D4D", textAlign: "center", marginVertical: 10 },
  nutritionCard: { width: "100%", backgroundColor: "#fff", borderRadius: 15, padding: 15, marginVertical: 10 },
  mealType: { fontSize: 18, fontWeight: "bold", marginBottom: 10, textAlign: "right" },
  mealContent: { fontSize: 15, marginBottom: 6, textAlign: "right" },
  bold: { fontWeight: "bold" },
  notesBox: { marginTop: 10, backgroundColor: "#E8F0FE", padding: 10, borderRadius: 8 },
  mealNotes: { fontSize: 14, fontStyle: "italic", textAlign: "right" },
  sessionCard: { width: "100%", backgroundColor: "#fff", borderRadius: 15, padding: 15, marginVertical: 10, elevation: 3 },
  sessionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10, textAlign: "right", color: "#2A7FFF" },
  sessionText: { fontSize: 14, marginBottom: 5, textAlign: "right" }
  
});

export default PatientProfile;