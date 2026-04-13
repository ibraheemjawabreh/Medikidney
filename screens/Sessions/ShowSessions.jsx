import React, { useEffect, useState } from "react";
import { ScrollView, Text, View, StyleSheet, ActivityIndicator } from "react-native";
import api from "../../services/api";

const ShowSessions = ({ route }) => {
  const { sessionId } = route.params; 
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dialysis-sessions/${sessionId}`);

      // تعيين البيانات الحقيقية القادمة من السيرفر
      setSessionDetails(response.data);
    } catch (error) {
      console.log("Error fetching real session details:", error.response?.data || error.message);
      // في حال حدوث خطأ، نضع مصفوفة فارغة أو نتعامل مع الخطأ
      setSessionDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionDetails();
  }, [sessionId]);

  // دالة لتنسيق الوقت من صيغة ISO
  const formatTime = (timeString) => {
    if (!timeString) return "--:--";
    const date = new Date(timeString);
    return date.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <View style={styles.loaderContainer}>
      <ActivityIndicator size="large" color="#2A7FFF" />
      <Text style={styles.loaderText}>جاري تحميل تفاصيل الجلسة...</Text>
    </View>
  );

  if (!sessionDetails) return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>لم يتم العثور على بيانات الجلسة</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>تقرير جلسة الغسيل الكلوي 🏥</Text>
        <Text style={styles.subtitle}>رقم المرجع: #{sessionId}</Text>
        <View style={styles.divider} />
        
        {/* التاريخ والوقت */}
        <View style={styles.detailRow}>
          <Text style={styles.label}>التاريخ:</Text>
          <Text style={styles.value}>{new Date(sessionDetails.date).toLocaleDateString('ar-EG')}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>وقت البدء / الانتهاء:</Text>
          <Text style={styles.value}>{formatTime(sessionDetails.startTime)} - {formatTime(sessionDetails.endTime)}</Text>
        </View>

        <View style={styles.divider} />

        {/* قياسات الوزن */}
        <View style={styles.detailRow}>
          <Text style={styles.label}>الوزن قبل الجلسة:</Text>
          <Text style={styles.value}>{sessionDetails.weightBefore} كغم</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>الوزن بعد الجلسة:</Text>
          <Text style={styles.value}>{sessionDetails.weightAfter} كغم</Text>
        </View>

        {/* السوائل المستخلصة - تمييز بصري */}
        <View style={styles.highlightRow}>
          <Text style={styles.highlightLabel}>السوائل المستخلصة (Fluid Removed):</Text>
          <Text style={styles.highlightValue}>{sessionDetails.fluidRemoved} لتر</Text>
        </View>

        <View style={styles.divider} />

        {/* ضغط الدم */}
        <View style={styles.detailRow}>
          <Text style={styles.label}>الضغط قبل الجلسة:</Text>
          <Text style={styles.value}>{sessionDetails.bloodPressureBefore}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>الضغط بعد الجلسة:</Text>
          <Text style={styles.value}>{sessionDetails.bloodPressureAfter}</Text>
        </View>

        {/* ملاحظات الطاقم */}
        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>ملاحظات الطاقم الطبي:</Text>
          <Text style={styles.notesText}>{sessionDetails.notes || "لا توجد ملاحظات مسجلة لهذه الجلسة."}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 15 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 20, elevation: 5, marginBottom: 30 },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center", color: "#2A7FFF", marginBottom: 5 },
  subtitle: { fontSize: 14, color: "#64748B", textAlign: "center", marginBottom: 15 },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 15 },
  detailRow: { flexDirection: "row-reverse", justifyContent: "space-between", marginBottom: 15 },
  label: { fontSize: 15, color: "#64748B", fontWeight: "600" },
  value: { fontSize: 16, color: "#1E293B", fontWeight: "bold" },
  
  // تنسيق خاص للسوائل المستخلصة
  highlightRow: { 
    backgroundColor: "#EFF6FF", 
    padding: 12, 
    borderRadius: 12, 
    flexDirection: "row-reverse", 
    justifyContent: "space-between", 
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BFDBFE"
  },
  highlightLabel: { fontSize: 14, color: "#1E40AF", fontWeight: "700" },
  highlightValue: { fontSize: 18, color: "#1E40AF", fontWeight: "900" },
  
  notesBox: { marginTop: 10, padding: 15, backgroundColor: "#F1F5F9", borderRadius: 12 },
  notesLabel: { fontSize: 15, color: "#475569", fontWeight: "bold", marginBottom: 8, textAlign: 'right' },
  notesText: { textAlign: "right", color: "#475569", lineHeight: 22, fontSize: 14 },
  
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 10, color: '#2A7FFF' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' }
});

export default ShowSessions;