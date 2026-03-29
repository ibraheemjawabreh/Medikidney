import React, { useState, useEffect } from "react";
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, Animated, LayoutAnimation, Platform, UIManager 
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// تفعيل الأنيميشن للـ Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DailySchedules = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [expandedId, setExpandedId] = useState(null); // لتحديد أي مريض تم الضغط عليه

  const fetchTodaySchedules = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const today = new Date().toISOString().split('T')[0];

      const response = await axios.get(
        "https://medikidneysys.onrender.com/schedules",
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // فلترة مواعيد اليوم فقط
      const todayData = response.data.filter(item => item.date === today);
      setSchedules(todayData);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySchedules();
  }, []);

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const renderItem = ({ item }) => {
    const isExpanded = expandedId === item.id;

    return (
      <View style={[styles.card, isExpanded && styles.expandedCard]}>
        <TouchableOpacity 
          style={styles.cardHeader} 
          onPress={() => toggleExpand(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patient_name || `مريض رقم ${item.patient_id}`}</Text>
            <View style={styles.timeBadge}>
              <Text style={styles.timeText}>{item.startTime || "08:00"}</Text>
              <MaterialCommunityIcons name="clock-outline" size={14} color="#64748b" />
            </View>
          </View>
          <MaterialCommunityIcons 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#94a3b8" 
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.actionRow}>
            {/* الزر الأول: ملف المريض */}
            <TouchableOpacity 
              style={[styles.actionButton, styles.profileButton]}
              onPress={() => navigation.navigate("PatientProfile", { patientId: item.patient_id })}
            >
              <MaterialCommunityIcons name="account-details" size={20} color="#2563eb" />
              <Text style={styles.profileButtonText}>عرض الملف</Text>
            </TouchableOpacity>

            {/* الزر الثاني: بيانات الجلسة */}
            <TouchableOpacity 
              style={[styles.actionButton, styles.sessionButton]}
              onPress={() => navigation.navigate("NurseTasks", { 
                patientId: item.patient_id,
                scheduleId: item.id 
              })}
            >
              <MaterialCommunityIcons name="play-circle" size={20} color="#fff" />
              <Text style={styles.sessionButtonText}>بدء الجلسة</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>جلسات اليوم</Text>
        <Text style={styles.headerDate}>{new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={schedules}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<Text style={styles.emptyText}>لا توجد مواعيد مجدولة اليوم</Text>}
        />
      )}
    </View>
  );
};

export default DailySchedules;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: { padding: 25, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1e293b", textAlign: 'right' },
  headerDate: { fontSize: 14, color: "#64748b", textAlign: 'right', marginTop: 5 },
  listContent: { padding: 15 },
  card: { 
    backgroundColor: "#fff", 
    borderRadius: 16, 
    marginBottom: 12, 
    elevation: 2, 
    shadowColor: "#000", 
    shadowOpacity: 0.05, 
    shadowRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  expandedCard: { borderColor: '#2563eb', borderWidth: 1.5 },
  cardHeader: { 
    flexDirection: "row-reverse", 
    justifyContent: "space-between", 
    alignItems: "center", 
    padding: 18 
  },
  patientInfo: { alignItems: 'flex-end' },
  patientName: { fontSize: 17, fontWeight: "700", color: "#334155" },
  timeBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  timeText: { fontSize: 12, color: "#64748b", marginRight: 4, fontWeight: '600' },
  actionRow: { 
    flexDirection: "row-reverse", 
    padding: 15, 
    backgroundColor: "#f8fafc", 
    borderTopWidth: 1, 
    borderTopColor: "#e2e8f0",
    justifyContent: 'space-between'
  },
  actionButton: { 
    flexDirection: 'row-reverse', 
    alignItems: 'center', 
    paddingVertical: 10, 
    paddingHorizontal: 15, 
    borderRadius: 10,
    width: '48%',
    justifyContent: 'center'
  },
  profileButton: { backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#dbeafe" },
  profileButtonText: { color: "#2563eb", fontWeight: "bold", marginRight: 8 },
  sessionButton: { backgroundColor: "#2563eb" },
  sessionButtonText: { color: "#fff", fontWeight: "bold", marginRight: 8 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#94a3b8' }
});