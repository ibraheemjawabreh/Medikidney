// screens/dialysisSessions/SymptomsTab.jsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, ActivityIndicator, Alert, Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from "../../services/api";
import { useLanguage } from '../../context/LanguageContext';

const SYMPTOMS_LIST = (t) => [
  { id: 'LOW_BP', label: t.symptoms.list.LOW_BP, icon: 'arrow-down-bold-circle-outline', color: '#DE1A1C' },
  { id: 'CRAMPS', label: t.symptoms.list.CRAMPS, icon: 'lightning-bolt-outline', color: '#A32D2F' },
  { id: 'NAUSEA', label: t.symptoms.list.NAUSEA, icon: 'emoticon-confused-outline', color: '#26CDD6' },
  { id: 'HEADACHE', label: t.symptoms.list.HEADACHE, icon: 'head-flash-outline', color: '#26CDD6' },
  { id: 'CHEST_PAIN', label: t.symptoms.list.CHEST_PAIN, icon: 'heart-pulse', color: '#DE1A1C' },
  { id: 'DIZZINESS', label: t.symptoms.list.DIZZINESS, icon: 'rotate-3d-variant', color: '#8296B1' },
  { id: 'ITCHING', label: t.symptoms.list.ITCHING, icon: 'hand-back-right-outline', color: '#26CDD6' },
  { id: 'MUSCLE_PAIN', label: t.symptoms.list.MUSCLE_PAIN, icon: 'arm-flex-outline', color: '#A32D2F' },
  { id: 'OTHER', label: t.symptoms.list.OTHER, icon: 'dots-horizontal-circle-outline', color: '#8296B1' },
];

const SymptomsTab = ({ route }) => {
  const { sessionId } = route.params;
  const { t } = useLanguage();
  const symptomsList = SYMPTOMS_LIST(t);

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
      return Alert.alert(t.error, t.symptoms.required);
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

      Alert.alert(t.symptoms.saveSuccessTitle, t.symptoms.saveSuccess);
      setSelectedIds([]);
      setNote('');
      fetchData();

    } catch (err) {
      // طباعة الخطأ القادم من السيرفر للتأكد
      console.log("Detailed Error:", err.response?.data);
      Alert.alert(t.error, t.symptoms.saveFailed);
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
      Alert.alert(t.error, t.symptoms.deleteFailed);
    }
  };

  if (loading && history.length === 0) {
    return <View style={styles.centered}><ActivityIndicator color="#26CDD6" /></View>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── قسم الاختيارات ── */}
      <Text style={styles.sectionTitle}>{t.symptoms.title}</Text>
      <View style={styles.grid}>
        {symptomsList.map((item) => {
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
      <Text style={[styles.sectionTitle, { marginTop: 25 }]}>{t.symptoms.nurseNotes}</Text>
      <View style={styles.noteBox}>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={4}
          placeholder={t.symptoms.notesPlaceholder}
          placeholderTextColor="#8296B1"
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
            <Text style={styles.saveBtnText}>{t.symptoms.saveBtn}</Text>
          </>
        )}
      </Pressable>

      {/* ── سجل الأعراض الحالية ── */}
      {history.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>{t.symptoms.historyTitle} ({history.length})</Text>
          {history.map((h, i) => {
            // 1. التأكد من جلب النوع الصحيح (السيرفر غالباً يرسلها symptomType)
            const typeKey = h.symptomType || h.symptom_type;
            const noteContent = h.notes || h.note || "";

            // 2. البحث في المصفوفة المحلية
            const symptomInfo = symptomsList.find(s => s.id === typeKey);

            return (
              <View key={i} style={styles.historyRow}>
                <Pressable onPress={() => handleDeleteSymptom(h.id || h.symptom_id)}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#DE1A1C" />
                </Pressable>

                <Text style={styles.historyText}>
                  {typeKey === 'OTHER'
                    ? `${t.symptoms.noteLabel} ${noteContent}`
                    : `- ${symptomInfo?.label || typeKey || t.symptoms.unknownSymptom} ${noteContent ? `(${noteContent})` : ''}`
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
  container: { flex: 1, backgroundColor: '#F1FCFD' },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#193B6B', textAlign: 'right', marginBottom: 15 },

  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 10 },
  symptomChip: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10,
    borderRadius: 20, borderWidth: 1, borderColor: '#e5e7eb',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.05,
    minWidth: '45%'
  },
  chipText: { fontSize: 13, fontWeight: '700', color: '#193B6B' },

  noteBox: {
    backgroundColor: '#fff', borderRadius: 15, padding: 15,
    borderWidth: 1, borderColor: '#e5e7eb', elevation: 1
  },
  textArea: { height: 120, textAlign: 'right', fontSize: 14, color: '#193B6B' },

  saveBtn: {
    backgroundColor: '#26CDD6', flexDirection: 'row-reverse',
    justifyContent: 'center', alignItems: 'center', gap: 10,
    padding: 15, borderRadius: 12, marginTop: 25, elevation: 3
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  historySection: { marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  historyTitle: { fontSize: 14, fontWeight: '800', color: '#8296B1', textAlign: 'right', marginBottom: 10 },
  historyRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, backgroundColor: '#fff', padding: 10, borderRadius: 8 },
  historyText: { fontSize: 13, color: '#193B6B', fontWeight: '600' }
});