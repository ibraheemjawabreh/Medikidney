import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity
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

  const fetchSessions = async () => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await axios.get(
        `https://medikidneysys.onrender.com/dialysis-sessions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSessions(response.data);
    } catch (error) {
      console.log("Error fetching sessions:", error.response?.data || error.message);
      setSessions([]);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
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

      {/* Header */}
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

      {/* Tabs */}
      <Tab
        value={tabIndex}
        onChange={setTabIndex}
        scrollable
        indicatorStyle={styles.indicator}
      >
        <Tab.Item title="البرنامج الغذائي" icon={{ name: "restaurant", color: "#2A7FFF" }} titleStyle={styles.tabText} />
        <Tab.Item title="الفحوصات" icon={{ name: "science", color: "#2A7FFF" }} titleStyle={styles.tabText} />
        <Tab.Item title="مواعيد الطبيب" icon={{ name: "event", color: "#2A7FFF" }} titleStyle={styles.tabText} />
        <Tab.Item title="الجلسات" icon={{ name: "opacity", color: "#2A7FFF" }} titleStyle={styles.tabText} />
      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex}>

        {/* Nutrition */}
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

        {/* Lab */}
        <TabView.Item style={styles.tabItem}>
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>الفحوصات المخبرية</Text>
          </View>
        </TabView.Item>

        {/* Dates */}
        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>المواعيد مع الطبيب</Text>
            <Button
              title="المواعيد"
              buttonStyle={styles.addButton}
              onPress={() => navigation.navigate("DatesDoctor")}
            />
          </ScrollView>
        </TabView.Item>

        {/* Sessions */}
        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            {sessions.map((session, index) => (
              <TouchableOpacity key={index} style={styles.sessionCard}>
                <Text>{formatDate(session.date)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </TabView.Item>

      </TabView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  loadingContainer: { flex: 1, justifyContent: "center" },
  headerCard: { backgroundColor: "#fff", padding: 20, margin: 15, borderRadius: 20 },
  headerTitle: { fontSize: 22, fontWeight: "bold", textAlign: "right" },
  infoRow: { flexDirection: "row-reverse", flexWrap: "wrap" },
  infoValue: { margin: 5, color: "#2A7FFF" },
  indicator: { backgroundColor: "#2A7FFF" },
  tabText: { fontSize: 12 },
  tabItem: { width: "100%" },
  tabContent: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 20 },
  addButton: { backgroundColor: "#2A7FFF" },
  infoText: { textAlign: "center" },
  nutritionCard: { backgroundColor: "#fff", padding: 15, marginBottom: 10, borderRadius: 10 },
  mealType: { fontWeight: "bold", marginBottom: 10 },
  mealContent: { textAlign: "right", marginBottom: 5, fontSize: 20 },
  bold: { fontWeight: "bold" },
  notesBox: { backgroundColor: "#FFF9E6", padding: 10, borderRadius: 10 },
  mealNotes: { color: "#D97706", textAlign: "right", fontWeight: "bold" },
  sessionCard: { backgroundColor: "#fff", padding: 10, marginBottom: 10 }
});

export default PatientProfile;