// screens/dialysisSessions/SymptomsTab.jsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = "https://medikidneysys.onrender.com";

const SYMPTOMS_LIST = [
  { id: 'LOW_BP', label: 'هبوط ضغط', icon: 'arrow-down-bold-circle-outline', color: '#ef4444' },
  { id: 'CRAMPS', label: 'تشنجات عضليّة', icon: 'lightning-bolt-outline', color: '#f59e0b' },
  { id: 'NAUSEA', label: 'غثيان / إقياء', icon: 'emoticon-confused-outline', color: '#10b981' },
  { id: 'HEADACHE', label: 'صداع', icon: 'head-flash-outline', color: '#3b82f6' },
  { id: 'CHEST_PAIN', label: 'ألم في الصدر', icon: 'heart-pulse', color: '#ec4899' },
  { id: 'DIZZINESS', label: 'دوخة / دوار', icon: 'rotate-3d-variant', color: '#8b5cf6' },
  { id: 'ITCHING', label: 'حكة جلدية', icon: 'hand-back-right-outline', color: '#06b6d4' },
];

const SymptomsTab = ({ route }) => {
  const { sessionId } = route.params;

  const [selectedIds, setSelectedIds] = useState([]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── جلب البيانات الحالية (الأعراض والملاحظات) ────────────────
  const fetchData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      
      // جلب الأعراض المسجلة
      const sympRes = await axios.get(
        `${API}/dialysis-sessions/${sessionId}/details/symptoms`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setHistory(Array.isArray(sympRes.data) ? sympRes.data : sympRes.data?.data || []);

      // جلب الملاحظات العامة للجلسة
      const sessionRes = await axios.get(
        `${API}/dialysis-sessions/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (sessionRes.data?.notes) setNote(sessionRes.data.notes);
      
    } catch (err) {
      console.log("Fetch symptoms/notes error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [sessionId]);

  // ── تبديل اختيار عرض ─────────────────────────────────────────
  const toggleSymptom = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ── حفظ الكل (الأعراض والملاحظات) ──────────────────────────
  const handleSaveAll = async () => {
    if (selectedIds.length === 0 && !note.trim()) {
      return Alert.alert("تنبيه", "يرجى اختيار عرض واحد على الأقل أو كتابة ملاحظة.");
    }

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem("token");

      // 1. تسجيل الأعراض (إرسال كل عرض مختار في طلب منفصل)
      const symptomPromises = selectedIds.map(type => 
        axios.post(
          `${API}/dialysis-sessions/${sessionId}/details/symptoms`,
          { symptomType: type, severity: "MILD", notes: "مسجل عبر القائمة السريعة" },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      // 2. تحديث ملاحظات الجلسة
      const notePromise = axios.patch(
        `${API}/dialysis-sessions/${sessionId}`,
        { notes: note },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await Promise.all([...symptomPromises, notePromise]);

      Alert.alert("تم الحفظ ✅", "تم تسجيل الأعراض والملاحظات بنجاح");
      setSelectedIds([]);
      fetchData(); // تحديث السجل
    } catch (err) {
      console.log("Save All Error:", err.response?.data || err.message);
      Alert.alert("خطأ", "فشل في حفظ البيانات");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSymptom = async (id) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(
        `${API}/dialysis-sessions/${sessionId}/details/symptoms/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData();
    } catch (err) {
      Alert.alert("خطأ", "فشل الحذف");
    }
  };

  if (loading && history.length === 0) {
    return <View style={styles.centered}><ActivityIndicator color="#059669" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      
      {/* ── قسم الاختيارات ── */}
      <Text style={styles.sectionTitle}>الأعراض الظاهرة الآن</Text>
      <View style={styles.grid}>
        {SYMPTOMS_LIST.map((item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <Pressable
              key={item.id}
              onPress={() => toggleSymptom(item.id)}
              style={[
                styles.symptomChip,
                isSelected && { backgroundColor: item.color, borderColor: item.color }
              ]}
            >
              <MaterialCommunityIcons 
                name={isSelected ? "check-circle" : item.icon} 
                size={20} 
                color={isSelected ? "#fff" : item.color} 
              />
              <Text style={[styles.chipText, isSelected && { color: '#fff' }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* ── قسم الملاحظات ── */}
      <Text style={[styles.sectionTitle, { marginTop: 25 }]}>ملاحظات الممرض</Text>
      <View style={styles.noteBox}>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          placeholder="اكتب أي ملاحظات إضافية هنا حول حالة المريض..."
          placeholderTextColor="#9ca3af"
          value={note}
          onChangeText={setNote}
          textAlignVertical="top"
        />
      </View>

      <Pressable 
        style={[styles.saveBtn, isSubmitting && { opacity: 0.7 }]} 
        onPress={handleSaveAll}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <MaterialCommunityIcons name="content-save-check" size={20} color="#fff" />
            <Text style={styles.saveBtnText}>حفظ الأعراض والملاحظات</Text>
          </>
        )}
      </Pressable>

      {/* ── سجل الأعراض الحالية ── */}
      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>الأعراض المسجلة سابقاً ({history.length})</Text>
          {history.map((h, i) => (
            <View key={i} style={styles.historyRow}>
              <Pressable onPress={() => handleDeleteSymptom(h.id || h.symptom_id)}>
                <MaterialCommunityIcons name="close-circle" size={18} color="#ef4444" />
              </Pressable>
              <Text style={styles.historyText}>
                 - {SYMPTOMS_LIST.find(s => s.id === h.symptomType)?.label || h.symptomType}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

export default SymptomsTab;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#111827', textAlign: 'right', marginBottom: 15 },
  
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  symptomChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05,
    minWidth: '45%'
  },
  chipText: { fontSize: 13, fontWeight: '700', color: '#374151' },

  noteBox: { 
    backgroundColor: '#fff', borderRadius: 15, padding: 15, 
    borderWidth: 1, borderColor: '#e5e7eb', elevation: 1 
  },
  textArea: { height: 120, textAlign: 'right', fontSize: 14, color: '#1f2937' },

  saveBtn: {
    backgroundColor: '#059669', flexDirection: 'row-reverse',
    justifyContent: 'center', alignItems: 'center', gap: 10,
    padding: 15, borderRadius: 12, marginTop: 25, elevation: 3
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  historySection: { marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  historyTitle: { fontSize: 14, fontWeight: '800', color: '#6b7280', textAlign: 'right', marginBottom: 10 },
  historyRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, backgroundColor: '#fff', padding: 10, borderRadius: 8 },
  historyText: { fontSize: 13, color: '#374151', fontWeight: '600' }
});