import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert 
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const NurseTasks = ({ route, navigation }) => {
  const { patientId, patientName } = route.params || {};
  
  const [loading, setLoading] = useState(false);
  const [isStarted, setIsStarted] = useState(false); // حالة الجلسة محلياً

  // بيانات البداية (تخزن محلياً)
  const [weightBefore, setWeightBefore] = useState("");
  const [bpBefore, setBpBefore] = useState("");
  const [startTime, setStartTime] = useState("");

  // بيانات النهاية (تجمع مع البداية وترسل للسيرفر)
  const [weightAfter, setWeightAfter] = useState("");
  const [bpAfter, setBpAfter] = useState("");
  const [fluidRemoved, setFluidRemoved] = useState("");
  const [scheduleId, setScheduleId] = useState(route.params?.scheduleId?.toString() || "");

  // 1. التحقق من وجود جلسة مخزنة في ذاكرة الموبايل عند فتح الصفحة
useEffect(() => {
    const checkLocalSession = async () => {
      try {
        const savedSession = await AsyncStorage.getItem(`active_session_${patientId}`);
        if (savedSession) {
          const data = JSON.parse(savedSession);
          setWeightBefore(data.weightBefore);
          setBpBefore(data.bpBefore);
          setStartTime(data.startTime);
          // أضف هذا السطر لضمان بقاء الـ ID
          if(data.scheduleId) setScheduleId(data.scheduleId.toString()); 
          setIsStarted(true);
        }
      } catch (e) {
        console.error("خطأ في قراءة الذاكرة المحلية", e);
      }
    };
    checkLocalSession();
  }, [patientId]);

  // 2. دالة بدء الجلسة "محلياً"
const handleStartSessionLocally = async () => {
  if (!weightBefore || !bpBefore || !scheduleId) {
    Alert.alert("تنبيه", "يرجى إدخال الوزن والضغط ورقم الموعد (Schedule ID)");
    return;
  }

  const sessionData = {
    weightBefore,
    bpBefore,
    scheduleId: Number(scheduleId), // تأكدنا أنه رقم هنا
    startTime: new Date().toISOString(),
  };

  try {
    await AsyncStorage.setItem(`active_session_${patientId}`, JSON.stringify(sessionData));
    setStartTime(sessionData.startTime);
    setIsStarted(true);
    Alert.alert("تم البدء", "تم حفظ بيانات البداية ورقم الموعد محلياً.");
  } catch (e) {
    Alert.alert("خطأ", "فشل حفظ البيانات محلياً");
  }
};

  // 3. دالة إنهاء الجلسة وإرسال الـ POST للسيرفر
 const handleFinalSubmit = async () => {
  if (!weightAfter || !bpAfter || !fluidRemoved) {
    Alert.alert("تنبيه", "يرجى إكمال بيانات نهاية الجلسة");
    return;
  }

  try {
    setLoading(true);
    const token = await AsyncStorage.getItem("token");
    
    // جلب البيانات المخزنة للتأكد من الـ scheduleId
    const savedSession = await AsyncStorage.getItem(`active_session_${patientId}`);
    const localData = JSON.parse(savedSession);

    const finalPayload = {
      patientId: Number(patientId),
      scheduleId: Number(localData.scheduleId || scheduleId), // نأخذه من الذاكرة أو الحالة
      date: new Date().toISOString().split('T')[0],
      startTime: startTime,
      endTime: new Date().toISOString(),
      weightBefore: Number(weightBefore),
      weightAfter: Number(weightAfter),
      bloodPressureBefore: bpBefore,
      bloodPressureAfter: bpAfter,
      fluidRemoved: Number(fluidRemoved)
    };

    console.log("إرسال البيانات النهائية:", finalPayload);

    await axios.post(
      "https://medikidneysys.onrender.com/dialysis-sessions", 
      finalPayload, 
      { headers: { Authorization: `Bearer ${token}` } }
    );

    await AsyncStorage.removeItem(`active_session_${patientId}`);
    Alert.alert("نجاح", "تم تسجيل الجلسة بالكامل.");
    navigation.goBack(); 
  } catch (error) {
    console.log("❌ خطأ السيرفر:", error.response?.data);
    Alert.alert("فشل الإرسال", error.response?.data?.message?.toString() || "تأكد من رقم الموعد (Schedule ID)");
  } finally {
    setLoading(false);
  }
};

  // 4. دالة لإلغاء الجلسة المحلية (في حال الخطأ)
  const handleCancelLocal = async () => {
    Alert.alert("تنبيه", "هل أنت متأكد من إلغاء الجلسة الحالية ومسح البيانات؟", [
      { text: "تراجع", style: "cancel" },
      { text: "نعم، إلغاء", onPress: async () => {
          await AsyncStorage.removeItem(`active_session_${patientId}`);
          setIsStarted(false);
          setWeightBefore("");
          setBpBefore("");
      }}
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Text style={styles.patientName}>{patientName || "ملف المريض"}</Text>
        <Text style={styles.subHeader}>إدارة جلسة الغسيل الكلوي</Text>
      </View>

      {!isStarted ? (
        // واجهة البداية
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="play-circle" size={24} color="#2563eb" />
            <Text style={styles.cardTitle}>بيانات ما قبل الجلسة</Text>
          </View>
          
          <Text style={styles.label}>الوزن قبل الجلسة (kg)</Text>
          <TextInput style={styles.input} value={weightBefore} onChangeText={setWeightBefore} keyboardType="numeric" placeholder="مثلاً 75.5" />

          <Text style={styles.label}>الضغط قبل الجلسة</Text>
          <TextInput style={styles.input} value={bpBefore} onChangeText={setBpBefore} placeholder="120/80" />

          <TouchableOpacity style={styles.primaryButton} onPress={handleStartSessionLocally}>
            <Text style={styles.buttonText}>بدء الجلسة الآن</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // واجهة الإنهاء
        <View style={[styles.card, {borderColor: '#10b981'}]}>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#10b981" />
            <Text style={[styles.cardTitle, {color: '#10b981'}]}>بيانات ما بعد الجلسة</Text>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>وقت البدء المسجل: {new Date(startTime).toLocaleTimeString('ar-EG')}</Text>
            <Text style={styles.infoText}>الوزن الأولي: {weightBefore} kg</Text>
          </View>

          <Text style={styles.label}>الوزن بعد الجلسة (kg)</Text>
          <TextInput style={styles.input} value={weightAfter} onChangeText={setWeightAfter} keyboardType="numeric" placeholder="مثلاً 72.0" />

          <Text style={styles.label}>الضغط بعد الجلسة</Text>
          <TextInput style={styles.input} value={bpAfter} onChangeText={setBpAfter} placeholder="110/70" />

          <Text style={styles.label}>كمية السوائل المسحوبة (L)</Text>
          <TextInput style={styles.input} value={fluidRemoved} onChangeText={setFluidRemoved} keyboardType="numeric" placeholder="3.0" />

          <TouchableOpacity style={styles.successButton} onPress={handleFinalSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>إرسال وحفظ الجلسة</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelLink} onPress={handleCancelLocal}>
            <Text style={styles.cancelText}>إلغاء ومسح البيانات الحالية</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

export default NurseTasks;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9", padding: 15 },
  headerCard: { backgroundColor: "#1e3a8a", padding: 25, borderRadius: 20, marginBottom: 20, alignItems: 'center' },
  patientName: { color: "#fff", fontSize: 22, fontWeight: "bold" },
  subHeader: { color: "#bfdbfe", fontSize: 14, marginTop: 5 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#e2e8f0', elevation: 3 },
  titleRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 20 },
  cardTitle: { fontSize: 18, fontWeight: "bold", marginRight: 10, color: '#1e293b' },
  label: { fontSize: 14, color: "#64748b", marginBottom: 8, textAlign: 'right', fontWeight: '600' },
  input: { backgroundColor: "#f8fafc", padding: 15, borderRadius: 12, borderWidth: 1, borderColor: "#cbd5e1", textAlign: 'right', marginBottom: 20, fontSize: 16 },
  primaryButton: { backgroundColor: "#2563eb", padding: 18, borderRadius: 15, alignItems: "center" },
  successButton: { backgroundColor: "#10b981", padding: 18, borderRadius: 15, alignItems: "center" },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  infoBox: { backgroundColor: '#f0fdf4', padding: 15, borderRadius: 12, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#10b981' },
  infoText: { textAlign: 'right', color: '#166534', fontSize: 13, marginBottom: 5 },
  cancelLink: { marginTop: 20, alignItems: 'center' },
  cancelText: { color: '#ef4444', fontSize: 14, textDecorationLine: 'underline' }
});