// screens/dialysisSessions/SymptomsTab.jsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from "../../services/api";

const SYMPTOMS_LIST = [
  { id: 'LOW_BP', label: 'هبوط ضغط', icon: 'arrow-down-bold-circle-outline', color: '#ef4444' },
  { id: 'CRAMPS', label: 'تشنجات عضليّة', icon: 'lightning-bolt-outline', color: '#f59e0b' },
  { id: 'NAUSEA', label: 'غثيان / إقياء', icon: 'emoticon-confused-outline', color: '#10b981' },
  { id: 'HEADACHE', label: 'صداع', icon: 'head-flash-outline', color: '#3b82f6' },
  { id: 'CHEST_PAIN', label: 'ألم في الصدر', icon: 'heart-pulse', color: '#ec4899' },
  { id: 'DIZZINESS', label: 'دوخة / دوار', icon: 'rotate-3d-variant', color: '#8b5cf6' },
  { id: 'ITCHING', label: 'حكة جلدية', icon: 'hand-back-right-outline', color: '#06b6d4' },
  { id: 'MUSCLE_PAIN', label: 'ألم عضلات', icon: 'arm-flex-outline', color: '#f97316' },
  { id: 'OTHER', label: 'أخرى / ملاحظة', icon: 'dots-horizontal-circle-outline', color: '#6b7280' },
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
      // جلب الأعراض المسجلة
      const sympRes = await api.get(
        `/dialysis-sessions/${sessionId}/details/symptoms`
      );
      setHistory(Array.isArray(sympRes.data) ? sympRes.data : sympRes.data?.data || []);

      // جلب الملاحظات العامة للجلسة
      const sessionRes = await api.get(`/dialysis-sessions/${sessionId}`);
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
    const promises = [];

    // إرسال الأعراض المختارة
    selectedIds.forEach(type => {
      promises.push(
        api.post(`/dialysis-sessions/${sessionId}/details/symptoms`, {
          symptomType: type, // القيمة هنا ستكون مثلاً 'LOW_BP'
          severity: "MILD",  // قيمة مسموحة حسب رسالة الخطأ
          notes: "تم تسجيل العرض"
        })
      );
    });

    // إرسال الملاحظة العامة كنوع 'OTHER'
    if (note.trim()) {
      promises.push(
        api.post(`/dialysis-sessions/${sessionId}/details/symptoms`, {
          symptomType: "OTHER", // استخدمنا القيمة المسموحة للملاحظات
          severity: "MILD",
          notes: note 
        })
      );
    }

    await Promise.all(promises);

    Alert.alert("تم الحفظ ✅", "تم تسجيل البيانات بنجاح");
    setSelectedIds([]);
    setNote('');
    fetchData(); 

  } catch (err) {
    // طباعة الخطأ القادم من السيرفر للتأكد
    console.log("Detailed Error:", err.response?.data);
    Alert.alert("خطأ", "تأكد من اختيار قيم صحيحة");
  } finally {
    setIsSubmitting(false);
  }
};




  const handleDeleteSymptom = async (id) => {
    try {
      await api.delete(
        `/dialysis-sessions/${sessionId}/details/symptoms/${id}`
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
    <Text style={styles.historyTitle}>الأعراض والملحوظات المسجلة ({history.length})</Text>
    {history.map((h, i) => {
  // 1. التأكد من جلب النوع الصحيح (السيرفر غالباً يرسلها symptomType)
  const typeKey = h.symptomType || h.symptom_type;
  const noteContent = h.notes || h.note || "";
  
  // 2. البحث في المصفوفة المحلية
  const symptomInfo = SYMPTOMS_LIST.find(s => s.id === typeKey);
  
  return (
    <View key={i} style={styles.historyRow}>
      <Pressable onPress={() => handleDeleteSymptom(h.id || h.symptom_id)}>
        <MaterialCommunityIcons name="close-circle" size={18} color="#ef4444" />
      </Pressable>
      
      <Text style={styles.historyText}>
        {typeKey === 'OTHER' 
          ? `📝 ملاحظة: ${noteContent}` 
          : `- ${symptomInfo?.label || typeKey || 'عرض غير معروف'} ${noteContent ? `(${noteContent})` : ''}`
        }
      </Text>
    </View>
  );
})}
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