import React, { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, LayoutAnimation, Platform, UIManager, ScrollView
} from "react-native";
import api from "../../services/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from '@react-navigation/native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DailySchedules = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [shifts, setShifts] = useState([]);
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [activeShift, setActiveShift] = useState(null);

  const fetchTodaySchedules = async () => {
    try {
      setLoading(true);
      const response = await api.get("/dialysis-scheduling/nurse/today");

      setShifts(response.data.shifts);

      if (!activeShift) {
        const firstActiveShift = response.data.shifts.find(s => s.patientCount > 0);
        if (firstActiveShift) setActiveShift(firstActiveShift.shiftNumber);
        else setActiveShift(1);
      }

    } catch (error) {
      console.log("Error fetching shifts:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchTodaySchedules();
    }, [activeShift])
  );

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPatientId(expandedPatientId === id ? null : id);
  };

  const renderPatient = ({ item }) => {
    const isExpanded = expandedPatientId === item.patientId;

    return (
      <View style={[styles.card, isExpanded && styles.expandedCard]}>
        <TouchableOpacity
          style={styles.cardHeader}
          onPress={() => toggleExpand(item.patientId)}
          activeOpacity={0.7}
        >
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <View style={styles.badgeRow}>
              <View style={styles.machineBadge}>
                <Text style={styles.machineText}>ماكينة: {item.machineNumber}</Text>
              </View>
              {item.hasSessionToday && (
                <View style={styles.doneBadge}>
                  <Text style={styles.doneText}>تمت الجلسة</Text>
                </View>
              )}
            </View>
          </View>
          <MaterialCommunityIcons
            name={isExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color="#8296B1"
          />
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionButton, styles.disabledProfileButton]}
              onPress={() => alert("قريباً: سيتم تفعيل عرض الملف بعد ربط الـ API الجديد")}
            >
              <MaterialCommunityIcons name="account-details" size={20} color="#8296B1" />
              <Text style={styles.disabledProfileButtonText}>عرض الملف</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.actionButton,
                item.hasSessionToday ? styles.disabledButton : styles.sessionButton
              ]}
              disabled={item.hasSessionToday}
              onPress={() => navigation.navigate("NurseTasks", {
                patientId: item.patientId,
                scheduleId: item.scheduleId
              })}
            >
              <MaterialCommunityIcons
                name={item.hasSessionToday ? "check-circle" : "play-circle"}
                size={20}
                color="#fff"
              />
              <Text style={styles.sessionButtonText}>
                {item.hasSessionToday ? "تم التسجيل" : "بدء الجلسة"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>جدول الشفتات</Text>
        <Text style={styles.headerDate}>{new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
      </View>

      <View style={styles.shiftSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
          {shifts.map((shift) => (
            <TouchableOpacity
              key={shift.shiftNumber}
              style={[styles.shiftTab, activeShift === shift.shiftNumber && styles.activeShiftTab]}
              onPress={() => setActiveShift(shift.shiftNumber)}
            >
              <Text style={[styles.shiftTabText, activeShift === shift.shiftNumber && styles.activeShiftTabText]}>
                شفت {shift.shiftNumber}
              </Text>
              <View style={[styles.countBadge, activeShift === shift.shiftNumber && styles.activeCountBadge]}>
                <Text style={styles.countText}>{shift.patientCount}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && shifts.length === 0 ? (
        <ActivityIndicator size="large" color="#26CDD6" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={shifts.find(s => s.shiftNumber === activeShift)?.patients || []}
          keyExtractor={(item) => item.scheduleId.toString()}
          renderItem={renderPatient}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="account-off-outline" size={60} color="#cbd5e1" />
              <Text style={styles.emptyText}>لا يوجد مرضى في هذا الشفت</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default DailySchedules;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1FCFD" },
  header: { padding: 20, backgroundColor: "#193B6B", borderBottomWidth: 1, borderBottomColor: "#193B6B", borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitle: { fontSize: 22, fontWeight: "900", color: "#fff", textAlign: 'right' },
  headerDate: { fontSize: 14, color: "#8296B1", textAlign: 'right', marginTop: 4 },

  shiftSelector: { backgroundColor: '#f8fafc', paddingVertical: 12 },
  shiftTab: { flexDirection: 'row-reverse', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', marginLeft: 10 },
  activeShiftTab: { backgroundColor: '#26CDD6' },
  shiftTabText: { fontSize: 14, fontWeight: '600', color: '#8296B1' },
  activeShiftTabText: { color: '#fff' },
  countBadge: { backgroundColor: '#cbd5e1', borderRadius: 10, paddingHorizontal: 6, marginRight: 8 },
  activeCountBadge: { backgroundColor: 'rgba(255,255,255,0.3)' },
  countText: { fontSize: 11, fontWeight: 'bold', color: '#193B6B' },

  listContent: { padding: 15 },
  card: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
  expandedCard: { borderColor: '#26CDD6', borderWidth: 1.5 },
  cardHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", padding: 18 },
  patientInfo: { alignItems: 'flex-end', flex: 1 },
  patientName: { fontSize: 16, fontWeight: "700", color: "#193B6B", marginBottom: 6 },
  badgeRow: { flexDirection: 'row-reverse' },
  machineBadge: { backgroundColor: '#E9FAFB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  machineText: { fontSize: 12, color: "#26CDD6", fontWeight: '600' },
  doneBadge: { backgroundColor: '#E9FAFB', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 },
  doneText: { fontSize: 12, color: "#26CDD6", fontWeight: '600' },

  actionRow: { flexDirection: "row-reverse", padding: 15, backgroundColor: "#f8fafc", borderTopWidth: 1, borderTopColor: "#e2e8f0", justifyContent: 'space-between' },
  actionButton: { flexDirection: 'row-reverse', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10, width: '48%', justifyContent: 'center' },
  disabledProfileButton: { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  disabledProfileButtonText: { color: "#8296B1", fontWeight: "bold", marginRight: 8 },
  sessionButton: { backgroundColor: "#26CDD6" },
  disabledButton: { backgroundColor: "#cbd5e1" },
  sessionButtonText: { color: "#fff", fontWeight: "bold", marginRight: 8 },

  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { textAlign: 'center', marginTop: 10, color: '#8296B1', fontSize: 16 }
});