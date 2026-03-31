import React, { useEffect, useState, useCallback } from "react";
import {View,Text,StyleSheet,ScrollView,ActivityIndicator,TouchableOpacity} from "react-native";
import { Tab, TabView, Button } from "@rneui/base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons"; // مكتبة الأيقونات
import { useFocusEffect } from "@react-navigation/native";

const StaffPatientView = ({ route, navigation }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const { patientId } = route.params || {};

  const fetchPatientData = async () => {
  try {
    setLoading(true);
    const token = await AsyncStorage.getItem("token");
    
    // جرب الرابط الأول (البروفايل المباشر)
    console.log("Testing URL with ID:", patientId);
    
    const response = await axios.get(
      `https://medikidneysys.onrender.com/users/profile/patients/${patientId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    setPatient(response.data);
    fetchNutritionPlan(response.data.patient_id);
    fetchSessions(response.data.patient_id);

  } catch (error) {
    console.log("Primary URL Failed (404), trying Search URL...");
    
    // الخطة ب: جرب تجيب بيانات المريض من رابط البحث العام إذا الرابط المباشر فشل
    try {
      const token = await AsyncStorage.getItem("token");
      const searchRes = await axios.get(
        `https://medikidneysys.onrender.com/users/profile/patients/${patientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPatient(searchRes.data);
      fetchNutritionPlan(searchRes.data.patient_id);
      fetchSessions(searchRes.data.patient_id);
      
    } catch (finalError) {
      console.log("Final Error:", finalError.response?.data);
      alert("عذراً: السيرفر لا يجد مريضاً بهذا الرقم (ID: " + patientId + ")");
      navigation.goBack();
    }
  } finally {
    setLoading(false);
  }
};

  const fetchNutritionPlan = async (patientId) => {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await axios.get(
        `https://medikidneysys.onrender.com/nutrition-programs?patientId=${patientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const fixedData = response.data.map(item => ({
        ...item,
        allowedItems: item.allowedItems || item.allowed_items || "",
        forbiddenItems: item.forbiddenItems || item.forbidden_items || "",
        mealNotes: item.mealNotes || item.meal_notes || ""
      }));

      setNutritionPlan(fixedData.length > 0 ? fixedData[0] : null);

    } catch (error) {
      console.log("تفاصيل خطأ الممرض:", error.response?.status, error.response?.data);
      setNutritionPlan(null);
    }
  };

 const fetchSessions = async (pId) => {
  try {
    setSessionsLoading(true);
    const token = await AsyncStorage.getItem("token");

    const response = await axios.get(
      `https://medikidneysys.onrender.com/dialysis-sessions?patientId=${pId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    // التأكد من شكل المصفوفة
    const sessionsList = Array.isArray(response.data) ? response.data : [];
    setSessions(sessionsList);
  } catch (error) {
    console.log("Sessions Error:", error.message);
  } finally {
    setSessionsLoading(false);
  }
};
  useFocusEffect(
    useCallback(() => {
      fetchPatientData();
    }, [patientId])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2A7FFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topHeader}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-forward" size={28} color="#0f172a" /> 
        </TouchableOpacity>
        <Text style={styles.topHeaderText}>ملف المريض</Text>
      </View>

      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>بيانات المريض</Text>

        {patient ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoValue}>{patient.full_name || "اسم غير معروف"}</Text>
            <Text style={styles.infoValue}>رقم الهوية: {patient.national_id}</Text>
            <Text style={styles.infoValue}>الجنس: {patient.gender}</Text>
            <Text style={styles.infoValue}>فصيلة الدم: {patient.blood_type}</Text>
            <Text style={styles.infoValue}>رقم المريض: {patient.patient_id}</Text>
          </View>
        ) : (
          <Text style={styles.infoText}>المريض غير موجود</Text>
        )}
      </View>

      <Tab
        value={tabIndex}
        onChange={setTabIndex}
        scrollable
        indicatorStyle={styles.indicator}
      >
        <Tab.Item title="جدول التغذية" icon={{ name: "restaurant", color: "#2A7FFF" }} titleStyle={styles.tabText} />
        <Tab.Item title="الجلسات" icon={{ name: "opacity", color: "#2A7FFF" }} titleStyle={styles.tabText} />
        <Tab.Item title="ملاحظات الطبيب" icon={{ name: "description", color: "#2A7FFF" }} titleStyle={styles.tabText} />
        <Tab.Item title="الفحوصات" icon={{ name: "science", color: "#2A7FFF" }} titleStyle={styles.tabText} />
      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex}>

        {/* Nutrition */}
        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>البرنامج الغذائي</Text>

            {userRole === "NUTRITIONIST" && patient && (
              <Button
                title="تعديل البرنامج"
                buttonStyle={styles.addButton}
                onPress={() =>
                  navigation.navigate("NutritionistTable", {
                    patientId: patient.patient_id
                  })
                }
              />
            )}

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

        {/* Sessions */}
       {/* Sessions Tab Item - التعديل الأساسي هون */}
<TabView.Item style={styles.tabItem}>
  <ScrollView contentContainerStyle={styles.tabContent}>
    <Text style={styles.sectionTitle}>بيانات الجلسات</Text>

    {sessionsLoading ? (
      <ActivityIndicator size="large" color="#2A7FFF" style={{ marginTop: 20 }} />
    ) : sessions.length > 0 ? (
      sessions.map((session, index) => (
        <View key={index} style={styles.sessionCard}>
          {/* تم التعديل لـ session_id */}
          <Text style={styles.sessionTitle}>جلسة #{session.session_id}</Text>

          <Text style={styles.sessionText}>
            <Text style={styles.bold}>التاريخ: </Text>
            {session.date ? new Date(session.date).toLocaleDateString('en-GB') : "غير متوفر"}
          </Text>
          
          {/* تم التعديل لـ start_time و end_time */}
          <Text style={styles.sessionText}>
            <Text style={styles.bold}>وقت البدء: </Text>
            {session.start_time ? new Date(session.start_time).toLocaleTimeString() : "غير متوفر"}
          </Text>
          <Text style={styles.sessionText}>
            <Text style={styles.bold}>وقت الانتهاء: </Text>
            {session.end_time ? new Date(session.end_time).toLocaleTimeString() : "قيد التنفيذ..."}
          </Text>

          {/* تم التعديل لـ weight_before و weight_after و fluid_removed */}
          <Text style={styles.sessionText}>
            <Text style={styles.bold}>الوزن قبل: </Text>
            {session.weight_before ?? "غير متوفر"} كغم
          </Text>
          <Text style={styles.sessionText}>
            <Text style={styles.bold}>الوزن بعد: </Text>
            {session.weight_after ?? "غير متوفر"} كغم
          </Text>
          <Text style={styles.sessionText}>
            <Text style={styles.bold}>السوائل المسحوبة: </Text>
            {session.fluid_removed ?? "0"} لتر
          </Text>

          {/* تم التعديل لـ blood_pressure_before و blood_pressure_after */}
          <Text style={styles.sessionText}>
            <Text style={styles.bold}>الضغط قبل: </Text>
            {session.blood_pressure_before || "غير متوفر"}
          </Text>
          <Text style={styles.sessionText}>
            <Text style={styles.bold}>الضغط بعد: </Text>
            {session.blood_pressure_after || "غير متوفر"}
          </Text>

          {/* إضافة اسم الممرض من الكائن الفرعي nurse */}
          <Text style={styles.sessionText}>
            <Text style={styles.bold}>الممرض المسؤول: </Text>
            {session.nurse?.full_name || "غير محدد"}
          </Text>

          <Text style={styles.sessionText}>
            <Text style={styles.bold}>ملاحظات: </Text>
            {session.notes || "لا يوجد ملاحظات"}
          </Text>
        </View>
      ))
    ) : (
      <Text style={styles.infoText}>لا توجد جلسات مسجلة لهذا المريض</Text>
    )}
  </ScrollView>
</TabView.Item>

        {/* Notes */}
        <TabView.Item style={styles.tabItem}>
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>ملاحظات الطبيب</Text>
          </View>
        </TabView.Item>

        {/* Labs */}
        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>الفحوصات</Text>
          </ScrollView>
        </TabView.Item>

      </TabView>
    </View>
  );
};

export default StaffPatientView;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  loadingContainer: { flex: 1, justifyContent: "center" },
  headerCard: { backgroundColor: "#fff", padding: 20, marginHorizontal: 15, marginTop: 15, borderRadius: 20, elevation: 4 },
  topHeader: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 15,
    backgroundColor: '#fff'
  },
  headerTitle: { fontSize: 22, fontWeight: "800", textAlign: "right", marginBottom: 15 },
  infoRow: { flexDirection: "row-reverse", justifyContent: "space-between", flexWrap: "wrap", alignItems: "center" },
  infoValue: { fontSize: 15, fontWeight: "700", color: "#2A7FFF", backgroundColor: "#E0EBFF", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, marginVertical: 4 },
  infoText: { fontSize: 16, color: "#FF4D4D", textAlign: "center", marginVertical: 10 },
  indicator: { backgroundColor: "#2A7FFF", height: 4, borderRadius: 2 },
  tabText: { fontSize: 12, color: "#2A7FFF", fontWeight: "700", textAlign: "center" },
  tabItem: { width: "100%", backgroundColor: "#F0F2F5" },
  tabContent: { padding: 20, alignItems: "center", paddingTop: 40 },
  sectionTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 25, textAlign: "center" },
  addButton: { backgroundColor: "#2A7FFF", borderRadius: 12, paddingHorizontal: 35, paddingVertical: 15 },
  nutritionCard: { width: "100%", backgroundColor: "#fff", borderRadius: 15, padding: 15, marginVertical: 10 },

  sessionCard: { width: "100%", backgroundColor: "#fff", borderRadius: 15, padding: 15, marginVertical: 10, elevation: 3 },
  sessionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10, textAlign: "right", color: "#2A7FFF" },
  sessionText: { fontSize: 14, marginBottom: 5, textAlign: "right" },

  mealType: { fontSize: 18, fontWeight: "bold", marginBottom: 10, textAlign: "right" },
  mealContent: { fontSize: 15, marginBottom: 6, textAlign: "right" },
  bold: { fontWeight: "bold" },
  notesBox: { marginTop: 10, backgroundColor: "#E8F0FE", padding: 10, borderRadius: 8 },
  mealNotes: { fontSize: 14, fontStyle: "italic", textAlign: "right" }
});