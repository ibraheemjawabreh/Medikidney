import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  Alert
} from "react-native";
import { Tab, TabView, Button, Icon, Divider } from "@rneui/base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const StaffPatientView = ({ route, navigation }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nutritionPlan, setNutritionPlan] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [userRole, setUserRole] = useState("");

  const { patientId } = route.params || {};

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const storedUser = await AsyncStorage.getItem("user");
      const storedRole = await AsyncStorage.getItem("userRole") || await AsyncStorage.getItem("role");
      
      let finalRole = "GUEST";
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          finalRole = parsed.role || parsed.user?.role || parsed.data?.user?.role || "GUEST";
        } catch (e) { 
          finalRole = storedRole || "GUEST"; 
        }
      } else if (storedRole) {
        finalRole = storedRole;
      }
      
      const roleUpper = finalRole.trim().toUpperCase();
      setUserRole(roleUpper);

      if (!patientId) {
        Alert.alert("خطأ", "لم يتم تمرير رقم المريض");
        navigation.goBack();
        return;
      }

      const response = await axios.get(
        `https://medikidneysys.onrender.com/users/profile/patients/${patientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPatient(response.data);

      if (response.data?.patient_id) {
        await Promise.all([
          fetchNutritionPlan(response.data.patient_id, token),
          fetchSessions(response.data.patient_id, token)
        ]);
      }
    } catch (error) {
      console.log("Error in fetching data:", error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchNutritionPlan = async (id, token) => {
    try {
      const response = await axios.get(
        `https://medikidneysys.onrender.com/nutrition-programs?patientId=${id}&t=${new Date().getTime()}`,
        { headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' } }
      );

      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        const sortedPlans = response.data.sort((a, b) => (b.id || 0) - (a.id || 0));
        setNutritionPlan(sortedPlans[0]);
      } else {
        setNutritionPlan(null);
      }
    } catch (e) {
      setNutritionPlan(null);
    }
  };

  const fetchSessions = async (id, token) => {
    try {
      const response = await axios.get(
        `https://medikidneysys.onrender.com/dialysis-sessions?patientId=${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSessions(response.data || []);
    } catch (e) {
      setSessions([]);
    }
  };

  const formatDate = (date) => {
    if (!date) return "غير محدد";
    const d = new Date(date);
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const InfoItem = ({ label, value, icon, color = "#059669" }) => (
    <View style={styles.infoBox}>
      <Icon name={icon} type="material-community" size={20} color={color} />
      <View style={{ marginRight: 12, flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoTextValue}>{value || "غير محدد"}</Text>
      </View>
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      fetchPatientData();
    }, [patientId])
  );

  const isNutritionist = userRole === "NUTRITIONIST";
  const isAdmin = userRole === "ADMIN";
  const canEditNutrition = isNutritionist || isAdmin;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>جاري تحديث البيانات...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#204a42" />
      
      {/* Header Section */}
      <View style={styles.headerContainer}>
        <View style={styles.avatarCircle}>
          <Icon name="account-circle" size={80} color="#cbd5e1" />
        </View>
        <Text style={styles.patientName}>{patient?.full_name}</Text>
        <View style={styles.idBadge}>
          <Text style={styles.idText}>رقم المريض: {patient?.patient_id} | {userRole}</Text>
        </View>
        <View style={styles.quickStats}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>فصيلة الدم</Text>
            <Text style={styles.statValue}>{patient?.blood_type || "N/A"}</Text>
          </View>
          <Divider orientation="vertical" width={1} color="rgba(255,255,255,0.2)" />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>الجنس</Text>
            <Text style={styles.statValue}>{patient?.gender === 'M' ? 'ذكر' : 'أنثى'}</Text>
          </View>
          <Divider orientation="vertical" width={1} color="rgba(255,255,255,0.2)" />
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>الهوية</Text>
            <Text style={[styles.statValue, {fontSize: 12}]}>{patient?.national_id || "---"}</Text>
          </View>
        </View>
      </View>

      <Tab value={tabIndex} onChange={setTabIndex} indicatorStyle={styles.tabIndicator} containerStyle={styles.tabBar} scrollable>
        <Tab.Item title="التغذية" titleStyle={(a) => [styles.tabTitle, { color: a ? "#204a42" : "#94a3b8" }]} icon={{ name: "food-apple", type: "material-community", color: tabIndex === 0 ? "#204a42" : "#94a3b8", size: 18 }} />
        <Tab.Item title="الجلسات" titleStyle={(a) => [styles.tabTitle, { color: a ? "#204a42" : "#94a3b8" }]} icon={{ name: "water-sync", type: "material-community", color: tabIndex === 1 ? "#204a42" : "#94a3b8", size: 18 }} />
        <Tab.Item title="الملاحظات" titleStyle={(a) => [styles.tabTitle, { color: a ? "#204a42" : "#94a3b8" }]} icon={{ name: "file-document-edit-outline", type: "material-community", color: tabIndex === 2 ? "#204a42" : "#94a3b8", size: 18 }} />
        <Tab.Item title="الفحوصات" titleStyle={(a) => [styles.tabTitle, { color: a ? "#204a42" : "#94a3b8" }]} icon={{ name: "flask-outline", type: "material-community", color: tabIndex === 3 ? "#204a42" : "#94a3b8", size: 18 }} />
      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex}>
        <TabView.Item style={styles.tabViewContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeading}>البرنامج الغذائي</Text>
              {canEditNutrition && (
                <TouchableOpacity 
                  onPress={() => navigation.navigate("NutritionistTable", { patientId: patient?.patient_id })} 
                  style={styles.editBtn}>
                  <Icon name="pencil-outline" type="material-community" size={16} color="#fff" />
                  <Text style={styles.editBtnText}>تعديل</Text>
                </TouchableOpacity>
              )}
            </View>

            {nutritionPlan ? (
              <View style={styles.nutritionCard}>
                <View style={styles.planHeader}>
                    <Text style={styles.planTitle}>{nutritionPlan.title || "الخطة الحالية"}</Text>
                    <Icon name="calendar-check" type="material-community" color="#fff" size={20} />
                </View>
                <View style={styles.planBody}>
                  
                  {/* --- التعديل: عرض التواريخ بشكل منفصل --- */}
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

                  {/* --- التعديل: عرض الوصف المعتمد --- */}
                  <View style={styles.descriptionSection}>
                    <Text style={styles.descTitle}>وصف البرنامج:</Text>
                    <Text style={styles.descContent}>{nutritionPlan.description || "لا يوجد وصف لهذه الخطة"}</Text>
                  </View>

                  <View style={styles.itemDivider} />
                  
                  <InfoItem label="المسموحات الغذائية" value={nutritionPlan.allowedItems || nutritionPlan.allowed_items} icon="check-decagram" color="#059669" />
                  <View style={styles.itemDivider} />
                  <InfoItem label="الممنوعات" value={nutritionPlan.forbiddenItems || nutritionPlan.forbidden_items} icon="alert-octagon" color="#ef4444" />
                  
                  <Text style={styles.mealTitle}>الوجبات اليومية</Text>
                  
                  <View style={styles.mealsGrid}>
                    <View style={styles.mealBox}><Text style={styles.mealLabel}>الفطور</Text><Text style={styles.mealText}>{nutritionPlan.breakfast || "---"}</Text></View>
                    <View style={styles.mealBox}><Text style={styles.mealLabel}>الغداء</Text><Text style={styles.mealText}>{nutritionPlan.lunch || "---"}</Text></View>
                    <View style={styles.mealBox}><Text style={styles.mealLabel}>العشاء</Text><Text style={styles.mealText}>{nutritionPlan.dinner || "---"}</Text></View>
                  </View>

                  {(nutritionPlan.mealNotes || nutritionPlan.meal_notes) && (
                    <View style={styles.noteContainer}>
                      <Icon name="lightbulb-on" type="material-community" size={18} color="#9a3412" />
                      <Text style={styles.noteText}>{nutritionPlan.mealNotes || nutritionPlan.meal_notes}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Icon name="food-off-outline" type="material-community" size={60} color="#cbd5e1" />
                <Text style={styles.emptyText}>لا يوجد برنامج غذائي حالياً</Text>
                {canEditNutrition && (
                    <Button 
                      title="إنشاء برنامج" 
                      onPress={() => navigation.navigate("NutritionistTable", { patientId: patient?.patient_id })} 
                      buttonStyle={styles.emptyStateBtn} 
                    />
                )}
              </View>
            )}
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabViewContent}>
           <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPadding}>
             <Text style={styles.sectionHeading}>سجل جلسات الغسيل</Text>
             {sessions.length > 0 ? (
               [...sessions].reverse().map((session, index) => (
                 <View key={index} style={styles.sessionCard}>
                   <View style={styles.sessionHeader}>
                     <View style={styles.sessionDateBox}>
                       <Icon name="calendar-range" type="material-community" size={14} color="#64748b" />
                       <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
                     </View>
                     <Text style={styles.sessionId}>#{session.session_id || session.id}</Text>
                   </View>
                   <View style={styles.sessionContent}>
                     <View style={styles.sessionMetric}><Text style={styles.metricLabel}>ضغط الدم</Text><Text style={styles.metricValue}>{session.blood_pressure_before} ← {session.blood_pressure_after}</Text></View>
                     <View style={styles.metricDivider} />
                     <View style={styles.sessionMetric}><Text style={styles.metricLabel}>الوزن</Text><Text style={styles.metricValue}>{session.weight_before}kg ← {session.weight_after}kg</Text></View>
                   </View>
                 </View>
               ))
             ) : (
               <View style={styles.emptyState}><Icon name="database-off" type="material-community" size={50} color="#cbd5e1" /><Text style={styles.emptyText}>لا توجد جلسات مسجلة</Text></View>
             )}
           </ScrollView>
        </TabView.Item>
        
        <TabView.Item style={styles.tabViewContent}><View style={styles.emptyState}><Text style={styles.emptyText}>سيتم التفعيل قريباً</Text></View></TabView.Item>
        <TabView.Item style={styles.tabViewContent}><View style={styles.emptyState}><Text style={styles.emptyText}>سيتم التفعيل قريباً</Text></View></TabView.Item>
      </TabView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: '#64748b' },
  headerContainer: { backgroundColor: "#204a42", paddingTop: 40, paddingBottom: 25, alignItems: "center", borderBottomRightRadius: 30, borderBottomLeftRadius: 30, elevation: 10 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#059669" },
  patientName: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 10 },
  idBadge: { backgroundColor: "#1e293b", paddingHorizontal: 12, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  idText: { color: "#94a3b8", fontSize: 12, fontWeight: "bold" },
  quickStats: { flexDirection: "row-reverse", width: "90%", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 15, marginTop: 20, padding: 15, justifyContent: "space-around" },
  statBox: { alignItems: "center", flex: 1 },
  statLabel: { color: "#94a3b8", fontSize: 10, marginBottom: 4 },
  statValue: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  tabBar: { backgroundColor: "#fff", elevation: 0, borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabIndicator: { backgroundColor: "#204a42", height: 3 },
  tabTitle: { fontSize: 11, fontWeight: "bold" },
  tabViewContent: { flex: 1, width: width },
  scrollPadding: { padding: 20 },
  sectionHeaderRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionHeading: { fontSize: 18, fontWeight: "800", color: "#1e293b", textAlign: "right" },
  editBtn: { flexDirection: 'row-reverse', backgroundColor: '#204a42', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, alignItems: 'center' },
  editBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginRight: 5 },
  nutritionCard: { backgroundColor: "#fff", borderRadius: 25, overflow: "hidden", elevation: 4, borderWidth: 1, borderColor: '#f1f5f9' },
  planHeader: { backgroundColor: "#204a42", padding: 15, flexDirection: "row-reverse", justifyContent: 'space-between', alignItems: "center" },
  planTitle: { color: "#fff", fontWeight: "bold" },
  planBody: { padding: 20 },
  
  // ستايلات التاريخ والوصف الجديدة
  dateInfoContainer: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center', backgroundColor: '#f0f9ff', borderRadius: 15, padding: 10, marginBottom: 15 },
  dateSubBox: { alignItems: 'center' },
  dateLabelText: { fontSize: 10, color: '#0369a1', fontWeight: 'bold' },
  dateValueText: { fontSize: 12, color: '#1e293b', fontWeight: '800' },
  descriptionSection: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 12, borderRightWidth: 4, borderRightColor: '#0ea5e9', marginBottom: 15 },
  descTitle: { fontSize: 11, color: '#64748b', fontWeight: 'bold', textAlign: 'right' },
  descContent: { fontSize: 13, color: '#334155', textAlign: 'right', marginTop: 4, lineHeight: 18 },

  infoBox: { flexDirection: "row-reverse", marginBottom: 5 },
  infoLabel: { fontSize: 12, color: "#64748b", textAlign: "right" },
  infoTextValue: { fontSize: 14, fontWeight: "700", color: "#334155", textAlign: "right" },
  itemDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  mealTitle: { textAlign: 'right', fontSize: 14, fontWeight: '800', color: '#1e293b', marginTop: 15, marginBottom: 12 },
  mealsGrid: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  mealBox: { width: '31%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  mealLabel: { fontSize: 11, color: '#059669', fontWeight: 'bold' },
  mealText: { fontSize: 12, color: '#475569', textAlign: 'center' },
  noteContainer: { backgroundColor: '#fff7ed', padding: 12, borderRadius: 12, marginTop: 15, flexDirection: 'row-reverse', alignItems: 'center' },
  noteText: { fontSize: 12, color: '#9a3412', textAlign: 'right', flex: 1, marginRight: 8 },
  sessionCard: { backgroundColor: "#fff", borderRadius: 20, padding: 15, marginBottom: 15, elevation: 2, borderRightWidth: 6, borderRightColor: '#204a42' },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sessionDateBox: { flexDirection: 'row', alignItems: 'center' },
  sessionDate: { fontSize: 12, color: '#64748b', marginLeft: 5 },
  sessionId: { fontSize: 13, fontWeight: '800' },
  sessionContent: { flexDirection: 'row-reverse', justifyContent: 'space-between' },
  sessionMetric: { flex: 1, alignItems: 'flex-end' },
  metricDivider: { width: 1, height: 20, backgroundColor: '#f1f5f9', marginHorizontal: 10 },
  metricLabel: { fontSize: 10, color: '#94a3b8' },
  metricValue: { fontSize: 13, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: "#94a3b8", textAlign: "center", marginTop: 10 },
  emptyStateBtn: { backgroundColor: '#204a42', borderRadius: 10, marginTop: 15 }
});

export default StaffPatientView;