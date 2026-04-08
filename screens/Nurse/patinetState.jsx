import React, { useState, useCallback } from "react";
import { 
  View, Text, StyleSheet, ScrollView, Pressable, 
  ActivityIndicator, RefreshControl 
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

const PatientState = ({ route }) => {
  const navigation = useNavigation();
  // استلام الـ IDs التي مررناها من صفحة الاختيار
  const { selectedPatientIds } = route.params || { selectedPatientIds: [] };

  const [loading, setLoading] = useState(false);
  const [myPatients, setMyPatients] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const response = await axios.get(
        "https://medikidneysys.onrender.com/dialysis-scheduling/nurse/today",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // منطق الفلترة: استخراج كل المرضى من كل الشفتات وتصفية المختارين فقط
      const allShifts = response.data.shifts || [];
      const filtered = allShifts
        .flatMap(shift => shift.patients)
        .filter(p => selectedPatientIds.includes(p.patientId));

      setMyPatients(filtered);
    } catch (error) {
      console.error("Error fetching patient status:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchStatus();
    }, [])
  );

  // دالة لتحديد لون وشكل الحالة
  const getStatusInfo = (status) => {
    switch (status) {
      case "COMPLETED":
        return { label: "مكتمل", color: "#059669", icon: "check-circle" };
      case "IN_PROGRESS":
        return { label: "قيد الغسيل", color: "#2563eb", icon: "sync" };
      case "PENDING":
        return { label: "بانتظار البيانات", color: "#d97706", icon: "clock-outline" };
      default:
        return { label: "لم يبدأ بعد", color: "#6b7280", icon: "play-circle-outline" };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header الصغير */}
      <View style={styles.subHeader}>
        <Text style={styles.subHeaderTitle}>المرضى القيد المتابعة ({myPatients.length})</Text>
        <Pressable onPress={() => navigation.navigate("SelectPatient")}>
          <Text style={styles.addMoreText}>+ تعديل القائمة</Text>
        </Pressable>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchStatus} />}
      >
        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#059669" />
        ) : myPatients.map((item) => {
          const statusInfo = getStatusInfo(item.sessionStatus);
          return (
            <Pressable 
              key={item.scheduleId} 
              style={styles.patientCard}
              onPress={() => navigation.navigate("SessionForm", { patient: item })}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '15' }]}>
                  <MaterialCommunityIcons name={statusInfo.icon} size={16} color={statusInfo.color} />
                  <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
                <Text style={styles.machineText}>جهاز #{item.machineNumber}</Text>
              </View>

              <Text style={styles.patientName}>{item.patientName}</Text>
              
              <View style={styles.cardFooter}>
                 <Text style={styles.tapPrompt}>اضغط لإدخال بيانات الجلسة</Text>
                 <MaterialCommunityIcons name="chevron-left" size={20} color="#9CA3AF" />
              </View>
            </Pressable>
          );
        })}

        {myPatients.length === 0 && !loading && (
          <View style={styles.empty}>
            <Text>لم يتم اختيار مرضى للمتابعة</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  subHeader: { 
    flexDirection: 'row-reverse', 
    justifyContent: 'space-between', 
    padding: 20, 
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  subHeaderTitle: { fontWeight: 'bold', color: '#374151' },
  addMoreText: { color: '#059669', fontWeight: '600' },
  scroll: { padding: 16 },
  patientCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    borderRightWidth: 5,
    borderRightColor: '#059669' // لون ثابت للممرض
  },
  cardHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 10 },
  statusBadge: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingVertical: 4, 
    borderRadius: 20 
  },
  statusText: { fontSize: 12, fontWeight: 'bold', marginRight: 5 },
  machineText: { color: '#6B7280', fontSize: 12 },
  patientName: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', textAlign: 'right' },
  cardFooter: { 
    marginTop: 15, 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    borderTopWidth: 1, 
    borderTopColor: '#F3F4F6',
    paddingTop: 10
  },
  tapPrompt: { fontSize: 12, color: '#9CA3AF', flex: 1, textAlign: 'right' },
  empty: { alignItems: 'center', marginTop: 50 }
});

export default PatientState;