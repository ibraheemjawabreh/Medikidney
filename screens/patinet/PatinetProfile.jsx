import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator,TouchableOpacity } from "react-native";
import { Tab, TabView, Button } from "@rneui/base";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const PatientProfile = ({ route, navigation }) => {
  const [tabIndex, setTabIndex] = useState(0);
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [nutritionPlan, setNutritionPlan] = useState([]);
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
      }

    } catch (error) {
      console.log("Error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchPatientData();
    fetchNutritionPlan();
    fetchSessions();
  }, [patientId]);

// --------------------------------------------------------
// --------------------------------------------------------

const fetchNutritionPlan = async () => {
  try {
    setLoading(true); 
    const token = await AsyncStorage.getItem("token");

    const url = `https://medikidneysys.onrender.com/nutrition-programs`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setNutritionPlan(response.data); 

  } catch (error) {
    console.log("Error fetching nutrition plan:", error.response?.data || error.message);
  } finally {
    setLoading(false);
  }
};

// --------------------------------------------------------
// --------------------------------------------------------


const fetchSessions = async () => {
  try {
    const token = await AsyncStorage.getItem("token");
    
    const response = await axios.get(
      `https://medikidneysys.onrender.com/dialysis-sessions`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

   
    console.log("البيانات القادمة من السيرفر:", response.data);
    setSessions(response.data); 


  } catch (error) {
    console.log("Error fetching real sessions:", error.response?.data || error.message);
    setSessions([]); 
  }
};

const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('ar-EG', options);
};

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center' }}>
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
        <Tab.Item title="البرنامج الغذائي"
         icon={{ name: "restaurant",
         color: "#2A7FFF" }}
          titleStyle={styles.tabText}
        />

        <Tab.Item title="الفحوصات"
         icon={{ name: "science",
        color: "#2A7FFF" }}
         titleStyle={styles.tabText}
          />

        <Tab.Item title="مواعيد الطبيب"
         icon={{ name: "event", color: "#2A7FFF" }}
          titleStyle={styles.tabText} 
          />

        <Tab.Item title="الجلسات" 
        icon={{ name: "opacity", 
        color: "#2A7FFF" }} 
        titleStyle={styles.tabText} 
        />
      </Tab>

      <TabView value={tabIndex} onChange={setTabIndex}>
     <TabView.Item style={styles.tabItem}>
  <ScrollView contentContainerStyle={styles.tabContent}>
    <Text style={styles.sectionTitle}>البرنامج الغذائي للمريض </Text>

    {nutritionPlan.length > 0 ? (
      nutritionPlan.map((item, index) => (
        <View key={index} style={styles.nutritionCard}>
          <View style={styles.cardHeader}>
            {/* تأكد من مسميات الحقول حسب الـ API تبعك (مثلاً day_name أو meal_type) */}
            <Text style={styles.mealType}>{item.day_name || "وجبة يومية"}</Text> 
            <Text style={styles.mealTime}>{item.meal_time}</Text>
          </View>
          
          <Text style={styles.mealContent}>
            <Text style={{fontWeight: 'bold'}}>الوصف: </Text>
            {item.description || "لا يوجد وصف"}
          </Text>

          {item.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.mealNotes}>📝 {item.notes}</Text>
            </View>
          )}
        </View>
      ))
    ) : (
      <View style={{ marginTop: 40, alignItems: 'center' }}>
        <Text style={styles.infoText}>لا يوجد برنامج غذائي مضاف حالياً</Text>
      </View>
    )}
  </ScrollView>
</TabView.Item>




        <TabView.Item style={styles.tabItem}>
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>الفحوصات المخبرية</Text>
          </View>
        </TabView.Item>

        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>المواعيد مع الطبيب و ملاحظاته</Text>
            <Button
              title="المواعيد مع الطبيب"
              icon={{ name: "plus", type: "font-awesome", color: "white", size: 15 }}
              buttonStyle={styles.addButton}
              onPress={() => navigation.navigate("DatesDoctor")}
            />
          </ScrollView>
        </TabView.Item>

        <TabView.Item style={styles.tabItem}>
          <ScrollView contentContainerStyle={styles.tabContent}>
            <Text style={styles.sectionTitle}>إدارة الجلسات وبياناتها</Text>
            <Button
              title="إدخال الوزن"
              icon={{ name: "plus", type: "font-awesome", color: "white", size: 15 }}
              buttonStyle={styles.addButton}
              onPress={() => navigation.navigate("WeightInput")}
            />
            <Text style={styles.sectionTitle}>سجل جلسات غسيل الكلى 🏥</Text>

    {sessions.map((session, index) => (
  <TouchableOpacity 
    key={index} 
    style={styles.sessionCard}
    // تأكد أن الـ ID في الـ API اسمه id وليس sessionId حسب الـ Response
    onPress={() => navigation.navigate("ShowSessions", { sessionId: session.id })}
  >
    <View style={styles.sessionHeader}>
      <Text style={styles.sessionDate}>{formatDate(session.date)}</Text>
      <Text style={styles.sessionIdText}>جلسة #{session.id || index + 1}</Text>
    </View>
    
    <View style={styles.sessionSummary}>
      <Text style={styles.summaryItem}>الوزن قبل: {session.weightBefore} كغم</Text>
      <Text style={styles.summaryLink}>عرض التفاصيل ←</Text>
    </View>
  </TouchableOpacity>
))}
          </ScrollView>
        </TabView.Item>
      </TabView>
    </View>
  );
};

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
  },
  // كرت الوجبة نفسه
  nutritionCard: {
    backgroundColor: "#fff",
    width: '95%',
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
    elevation: 3, // ظل للأندرويد
    shadowColor: "#000", // ظل للآيفون
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderRightWidth: 6, // خط جانبي يعطي شكل جمالي
    borderRightColor: "#2A7FFF", 
  },
  // هيدر الكرت (اليوم والوقت)
  cardHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F2F5",
    paddingBottom: 8,
  },
  // نص اليوم (فطور، غداء، أو السبت، الأحد...)
  mealType: {
    fontSize: 17,
    fontWeight: "800",
    color: "#2A7FFF",
  },
  // نص الوقت (مثلاً: 09:00 AM)
  mealTime: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "700",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden'
  },
  // محتوى الوجبة (شو يوكل المريض)
  mealContent: {
    fontSize: 15,
    color: "#334155",
    textAlign: "right",
    lineHeight: 24, // تباعد الأسطر لراحة العين
  },
  // صندوق الملاحظات (بيطلع بلون مختلف)
  notesBox: {
    backgroundColor: "#FFF9E6", // أصفر خفيف جداً
    padding: 10,
    borderRadius: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#FEF3C7",
  },
  // نص الملاحظة
  mealNotes: {
    fontSize: 13,
    color: "#D97706", // برتقالي غامق
    textAlign: "right",
    fontWeight: "600",
  },
  // الستايل في حال ما في بيانات
  infoText: {
    fontSize: 15,
    color: "#94A3B8",
    textAlign: 'center',
    marginTop: 20,
    fontWeight: "500"
  },
  sessionCard: {
    backgroundColor: "#fff",
    width: '95%',
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
    borderLeftWidth: 5,
    borderLeftColor: "#2A7FFF", // خط أزرق جهة اليسار
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sessionDate: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1A1A1A",
  },
  sessionIdText: {
    fontSize: 14,
    color: "#64748B",
  },
  sessionSummary: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 5,
  },
  summaryItem: {
    fontSize: 14,
    color: "#475569",
  },
  summaryLink: {
    fontSize: 13,
    color: "#2A7FFF",
    fontWeight: "600",
  }
});

export default PatientProfile;