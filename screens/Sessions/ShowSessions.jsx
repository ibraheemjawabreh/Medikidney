import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import api from "../../services/api";
import { formatSessionTime } from "../../utils/sessionTime";

const ShowSessions = ({ route }) => {
  const params = route?.params || {};
  const sessionId = params.sessionId || params.id;
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSessionDetails = async () => {
    try {
      setLoading(true);
      if (!sessionId) {
        console.log('⚠️ لا يوجد معرّف جلسة');
        setSessionDetails(null);
        return;
      }
      const response = await api.get(`/dialysis-sessions/${sessionId}`);
      setSessionDetails(response.data);
    } catch (error) {
      console.log(
        "Error fetching real session details:",
        error.response?.data || error.message
      );
      setSessionDetails(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId) {
      fetchSessionDetails();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#26CDD6" />
        <Text style={styles.loaderText}>جارِ تحميل تفاصيل الجلسة...</Text>
      </View>
    );
  }

  if (!sessionDetails) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>لم يتم العثور على بيانات الجلسة</Text>
      </View>
    );
  }

  const weightBefore =
    sessionDetails.weight_before ?? sessionDetails.weightBefore ?? "--";
  const weightAfter =
    sessionDetails.weight_after ?? sessionDetails.weightAfter ?? "--";
  const fluidRemoved =
    sessionDetails.fluid_removed ?? sessionDetails.fluidRemoved ?? "--";
  const bloodPressureBefore =
    sessionDetails.blood_pressure_before ??
    sessionDetails.bloodPressureBefore ??
    "--";
  const bloodPressureAfter =
    sessionDetails.blood_pressure_after ??
    sessionDetails.bloodPressureAfter ??
    "--";

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>تقرير جلسة الغسيل الكلوي</Text>
        <Text style={styles.subtitle}>رقم المرجع: #{sessionId}</Text>
        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.label}>التاريخ:</Text>
          <Text style={styles.value}>
            {new Date(sessionDetails.date).toLocaleDateString("ar-EG")}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>وقت البدء / الانتهاء:</Text>
          <Text style={styles.value}>
            {formatSessionTime(sessionDetails.start_time)} -{" "}
            {formatSessionTime(sessionDetails.end_time)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.label}>الوزن قبل الجلسة:</Text>
          <Text style={styles.value}>{weightBefore} كغم</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>الوزن بعد الجلسة:</Text>
          <Text style={styles.value}>{weightAfter} كغم</Text>
        </View>

        <View style={styles.highlightRow}>
          <Text style={styles.highlightLabel}>السوائل المستخلصة:</Text>
          <Text style={styles.highlightValue}>{fluidRemoved} لتر</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.label}>الضغط قبل الجلسة:</Text>
          <Text style={styles.value}>{bloodPressureBefore}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>الضغط بعد الجلسة:</Text>
          <Text style={styles.value}>{bloodPressureAfter}</Text>
        </View>

        <View style={styles.notesBox}>
          <Text style={styles.notesLabel}>ملاحظات الطاقم الطبي:</Text>
          <Text style={styles.notesText}>
            {sessionDetails.notes || "لا توجد ملاحظات مسجلة لهذه الجلسة."}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 15 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    marginBottom: 30,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    color: "#26CDD6",
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: "#8296B1",
    textAlign: "center",
    marginBottom: 15,
  },
  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 15 },
  detailRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  label: { fontSize: 15, color: "#8296B1", fontWeight: "600" },
  value: { fontSize: 16, color: "#193B6B", fontWeight: "bold" },
  highlightRow: {
    backgroundColor: "#E9FAFB",
    padding: 12,
    borderRadius: 12,
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#BCEFF3",
  },
  highlightLabel: { fontSize: 14, color: "#193B6B", fontWeight: "700" },
  highlightValue: { fontSize: 18, color: "#193B6B", fontWeight: "900" },
  notesBox: {
    marginTop: 10,
    padding: 15,
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
  },
  notesLabel: {
    fontSize: 15,
    color: "#8296B1",
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "right",
  },
  notesText: {
    textAlign: "right",
    color: "#8296B1",
    lineHeight: 22,
    fontSize: 14,
  },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { marginTop: 10, color: "#26CDD6" },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: { color: "#DE1A1C", fontSize: 16, fontWeight: "bold" },
});

export default ShowSessions;
