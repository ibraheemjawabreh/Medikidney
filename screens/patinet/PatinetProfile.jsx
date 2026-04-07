import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  TouchableOpacity
} from "react-native";
import { Tab, TabView, Button, Icon, Divider } from "@rneui/base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const { width } = Dimensions.get("window");

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

      if (patientInfo?.patient_id) {
        fetchNutritionPlan(patientInfo.patient_id);
        fetchSessions(patientInfo.patient_id);
      }
    } catch (error) {
      console.log("Error:", error.message);
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
        `https://medikidneysys.onrender.com/nutrition-programs?patientId=${id}&t=${new Date().getTime()}`,
        { headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' } }
      );
      
      if (response.data && response.data.length > 0) {
        const sortedPlans = response.data.sort((a, b) => (b.id || 0) - (a.id || 0));
        setNutritionPlan(sortedPlans[0]); 
      }
    } catch (e) { 
      setNutritionPlan(null); 
    }
  };

  const fetchSessions = async (id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        `https://medikidneysys.onrender.com/dialysis-sessions?patientId=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSessions(response.data || []);
    } catch (e) { setSessions([]); }
  };

  const formatDate = (date) => {
    if (!date) return "غير محدد";
    const d = new Date(date);
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const InfoItem = ({ label, value, icon, color = "#059669" }) => (
    <View style={styles.infoBox}>
      <Icon name={icon} type="material-community" size={18} color={color} />
      <View style={{ marginRight: 10, flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoTextValue}>{value || "-"}</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={{ marginTop: 10, color: '#64748b' }}>جاري تحميل ملف المريض...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#204a42" />
      
      <View style={styles.headerContainer}>
        <View style={styles.avatarCircle}>
          <Icon name="account-circle" size={70} color="#cbd5e1" />
        </View>
        <Text style={styles.patientName}>{patient?.full_name}</Text>
        <View style={styles.idBadge}>
          <Text style={styles.idText}>رقم المريض: {patient?.patient_id}</Text>
        </View>

        <View style={styles.quickStats}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>فصيلة الدم</Text>
            <Text style={styles.statValue}>{patient?.blood_type || "N/A"}</Text>
          </View>
          <Divider orientation="vertical" width={1} color="rgba(255,255,255,0.2)" />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>الجنس</Text>
            <Text style={styles.statValue}>{patient?.gender === 'MALE' || patient?.gender === 'Male' ? 'ذكر' : 'أنثى'}</Text>
          </View>
          <Divider orientation="vertical" width={1} color="rgba(255,255,255,0.2)" />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>الهوية</Text>
            <Text style={[styles.statValue, {fontSize: 12}]}>{patient?.national_id}</Text>
          </View>
        </View>
      </View>

      <Tab value={tabIndex} onChange={setTabIndex} indicatorStyle={styles.tabIndicator} containerStyle={styles.tabBar} scrollable>
        <Tab.Item title="التغذية" titleStyle={styles.tabTitle} icon={{ name: "food-apple", type: "material-community", color: tabIndex === 0 ? "#059669" : "#94a3b8" }} />
        <Tab.Item title="الفحوصات" titleStyle={styles.tabTitle} icon={{ name: "flask-outline", type: "material-community", color: tabIndex === 1 ? "#059669" : "#94a3b8" }} />
        <Tab.Item title="الجلسات" titleStyle={styles.tabTitle} icon={{ name: "water-sync", type: "material-community", color: tabIndex === 2 ? "#059669" : "#94a3b8" }} />
        <Tab.Item title="المواعيد" titleStyle={styles.tabTitle} icon={{ name: "calendar-clock", type: "material-community", color: tabIndex === 3 ? "#059669" : "#94a3b8" }} />
      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex} animationType="spring">
        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.sectionHeading}>الخطة الغذائية الحالية</Text>
            {nutritionPlan ? (
              <View style={styles.nutritionCard}>
                <View style={styles.planHeader}>
                  <Icon name="restaurant" color="#fff" size={20} />
                  <Text style={styles.planTitle}>{nutritionPlan.title}</Text>
                </View>
                
                <View style={styles.planBody}>
                  {/* عرض التواريخ بشكل منفصل */}
                  <View style={styles.dateInfoContainer}>
                    <View style={styles.dateSubBox}>
                      <Text style={styles.dateLabelText}>من تاريخ:</Text>
                      <Text style={styles.dateValueText}>{formatDate(nutritionPlan.startDate || nutritionPlan.start_date)}</Text>
                    </View>
                    <Icon name="arrow-left-thin" type="material-community" size={20} color="#cbd5e1" />
                    <View style={styles.dateSubBox}>
                      <Text style={styles.dateLabelText}>إلى تاريخ:</Text>
                      <Text style={styles.dateValueText}>{formatDate(nutritionPlan.endDate || nutritionPlan.end_date)}</Text>
                    </View>
                  </View>

                  {/* عرض وصف البرنامج */}
                  <View style={styles.descriptionSection}>
                    <Text style={styles.descTitle}>وصف البرنامج:</Text>
                    <Text style={styles.descContent}>{nutritionPlan.description || "لا يوجد وصف لهذه الخطة"}</Text>
                  </View>

                  <Divider style={{ marginVertical: 10 }} />
                  
                  <InfoItem label="المسموحات" value={nutritionPlan.allowedItems || nutritionPlan.allowed_items} icon="check-circle-outline" />
                  <InfoItem label="الممنوعات" value={nutritionPlan.forbiddenItems || nutritionPlan.forbidden_items} icon="close-circle-outline" color="#ef4444" />
                  
                  <View style={styles.mealsGrid}>
                    <View style={styles.mealSmallBox}><Text style={styles.mealLabel}>الفطور</Text><Text style={styles.mealText}>{nutritionPlan.breakfast || "---"}</Text></View>
                    <View style={styles.mealSmallBox}><Text style={styles.mealLabel}>الغداء</Text><Text style={styles.mealText}>{nutritionPlan.lunch || "---"}</Text></View>
                    <View style={styles.mealSmallBox}><Text style={styles.mealLabel}>العشاء</Text><Text style={styles.mealText}>{nutritionPlan.dinner || "---"}</Text></View>
                  </View>

                  {(nutritionPlan.mealNotes || nutritionPlan.meal_notes) && (
                    <View style={styles.noteContainer}>
                      <Text style={styles.noteText}>💡 {nutritionPlan.mealNotes || nutritionPlan.meal_notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="food-off" type="material-community" size={50} color="#cbd5e1" />
                <Text style={styles.emptyText}>لا توجد خطة غذائية مسجلة حالياً</Text>
              </View>
            )}
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.sectionHeading}>الفحوصات المخبرية</Text>
            <View style={styles.emptyState}>
              <Icon name="biotech" type="material-icons" size={50} color="#cbd5e1" />
              <Text style={styles.emptyText}>قريباً: عرض نتائج الفحوصات والتحاليل</Text>
            </View>
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20 }}>
            <Text style={styles.sectionHeading}>سجل جلسات الغسيل</Text>
            {sessions.length > 0 ? (
              [...sessions].reverse().map((session, index) => (
                <View key={index} style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                    <Text style={styles.sessionId}>جلسة #{session.session_id}</Text>
                  </View>
                  <View style={styles.sessionStatsGrid}>
                    <View style={styles.miniStat}>
                      <Text style={styles.miniLabel}>الضغط (قبل/بعد)</Text>
                      <Text style={styles.miniValue}>{session.blood_pressure_before} / {session.blood_pressure_after}</Text>
                    </View>
                    <View style={styles.miniStat}>
                      <Text style={styles.miniLabel}>الوزن (قبل/بعد)</Text>
                      <Text style={styles.miniValue}>{session.weight_before}kg / {session.weight_after}kg</Text>
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>لم يتم تسجيل أي جلسات بعد</Text>
            )}
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabViewContent}>
          <View style={styles.appointmentContainer}>
            <Icon name="calendar-search" type="material-community" size={80} color="#059669" />
            <Text style={styles.sectionHeading}>إدارة المواعيد</Text>
            <Button
              title="احجز موعداً الآن"
              buttonStyle={styles.actionButton}
              containerStyle={{ width: '80%', marginTop: 20 }}
              onPress={() => navigation.navigate("DatesDoctor", { patientId: patient?.patient_id })}
            />
          </View>
        </TabView.Item>
      </TabView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#fff' },
  headerContainer: { backgroundColor: "#204a42", paddingTop: 40, paddingBottom: 25, alignItems: "center", borderBottomRightRadius: 30, borderBottomLeftRadius: 30, elevation: 10 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#059669" },
  patientName: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 10 },
  idBadge: { backgroundColor: "#1e293b", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 5 },
  idText: { color: "#94a3b8", fontSize: 12, fontWeight: "bold" },
  quickStats: { flexDirection: "row-reverse", width: "90%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 15, marginTop: 20, padding: 15, justifyContent: "space-around" },
  statBox: { alignItems: "center" },
  statLabel: { color: "#94a3b8", fontSize: 10, marginBottom: 4 },
  statValue: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  tabBar: { backgroundColor: "#fff", elevation: 0, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabIndicator: { backgroundColor: "#204a42", height: 3 },
  tabTitle: { fontSize: 11, fontWeight: "bold", color: "#64748b" },
  tabViewContent: { flex: 1, width: width },
  sectionHeading: { fontSize: 18, fontWeight: "900", color: "#1e293b", textAlign: "right", marginBottom: 15 },
  nutritionCard: { backgroundColor: "#fff", borderRadius: 20, overflow: "hidden", elevation: 3, borderWidth: 1, borderColor: '#e2e8f0' },
  planHeader: { backgroundColor: "#204a42", padding: 12, flexDirection: "row-reverse", alignItems: "center" },
  planTitle: { color: "#fff", fontWeight: "bold", marginRight: 10, fontSize: 16 },
  planBody: { padding: 15 },
  
  // ستايلات التاريخ والوصف المضافة
  dateInfoContainer: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#f0f9ff', borderRadius: 15, padding: 10, marginBottom: 15 },
  dateSubBox: { alignItems: 'center' },
  dateLabelText: { fontSize: 10, color: '#0369a1', fontWeight: 'bold' },
  dateValueText: { fontSize: 12, color: '#1e293b', fontWeight: '800' },
  descriptionSection: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderRightWidth: 4, borderRightColor: '#0ea5e9', marginBottom: 15 },
  descTitle: { fontSize: 11, color: '#64748b', fontWeight: 'bold', textAlign: 'right' },
  descContent: { fontSize: 13, color: '#334155', textAlign: 'right', marginTop: 4, lineHeight: 18 },

  infoBox: { flexDirection: "row-reverse", alignItems: "center", marginBottom: 12 },
  infoLabel: { fontSize: 12, color: "#64748b", textAlign: "right" },
  infoTextValue: { fontSize: 14, fontWeight: "bold", color: "#1e293b", textAlign: "right" },
  mealsGrid: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginTop: 10 },
  mealSmallBox: { width: '30%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  mealLabel: { fontSize: 11, color: '#059669', fontWeight: 'bold', marginBottom: 5 },
  mealText: { fontSize: 12, color: '#334155', textAlign: 'center' },
  noteContainer: { backgroundColor: '#fff7ed', padding: 10, borderRadius: 10, marginTop: 15, borderRightWidth: 4, borderRightColor: '#f97316' },
  noteText: { fontSize: 13, color: '#9a3412', textAlign: 'right' },
  sessionCard: { backgroundColor: "#fff", borderRadius: 18, padding: 18, marginBottom: 15, elevation: 2, borderRightWidth: 5, borderRightColor: '#204a42' },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' },
  sessionDate: { fontSize: 13, color: '#64748b', fontWeight: 'bold' },
  sessionId: { fontSize: 14, fontWeight: '900', color: '#0f172a' },
  sessionStatsGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  miniStat: { width: '48%', marginBottom: 10 },
  miniLabel: { fontSize: 10, color: '#94a3b8', textAlign: 'right' },
  miniValue: { fontSize: 13, fontWeight: 'bold', color: '#334155', textAlign: 'right' },
  appointmentContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  actionButton: { backgroundColor: "#0f172a", paddingVertical: 15, borderRadius: 15 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: "#94a3b8", textAlign: "center", marginTop: 10, fontSize: 14 }
});

export default PatientProfile;