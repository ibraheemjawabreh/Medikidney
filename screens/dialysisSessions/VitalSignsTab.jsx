// screens/Nurse/dialysisSessions/VitalSignsTab.jsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet,
  Alert, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import api from "../../services/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// ── Validate Weight ─────────────────────────────────────────────────────────
const validateWeight = (val, fieldName, required = true) => {
  if (!val || val.trim() === '') {
    return required ? `${fieldName} مطلوب` : null;
  }
  const num = parseFloat(val);
  if (isNaN(num)) return `${fieldName} يجب أن يكون رقماً صحيحاً`;
  if (num < 20 || num > 300) return `${fieldName} يجب أن يكون بين 20 و 300 كغ`;
  return null;
};

// ── تنسيق الوقت بشكل واضح ────────────────────────────────────────────────────
const formatDateTime = (dateStr) => {
  if (!dateStr) return { time: "غير محدد", ago: "" };
  const date = new Date(dateStr);
  const now  = new Date();

  const time = date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

  const diffMs  = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  let ago = "";
  if      (diffMin < 1)   ago = "الآن";
  else if (diffMin < 60)  ago = `منذ ${diffMin} دقيقة`;
  else if (diffMin < 120) ago = "منذ ساعة تقريباً";
  else if (diffMin < 1440) ago = `منذ ${Math.floor(diffMin / 60)} ساعات`;
  else ago = `منذ ${Math.floor(diffMin / 1440)} يوم`;

  return { time, ago };
};

// ── تحديد حالة الضغط ─────────────────────────────────────────────────────────
const getBpStatus = (sys, dia) => {
  if (sys > 140 || dia > 90) return { label: "مرتفع",  color: "#ef4444", bg: "#fef2f2" };
  if (sys < 90  || dia < 60) return { label: "منخفض",  color: "#f59e0b", bg: "#fffbeb" };
  return                             { label: "طبيعي",  color: "#059669", bg: "#f0fdf4" };
};

// ── بطاقة قراءة واحدة ────────────────────────────────────────────────────────
const VitalCard = ({ item, index, totalCount, onDelete }) => {
  const vitalId        = item.vital_id || item.id;
  const { time, ago }  = formatDateTime(item.recorded_at || item.createdAt);
  const bpStatus       = getBpStatus(item.systolic, item.diastolic);
  const readingNumber  = totalCount - index; // رقم القراءة (الأحدث = الأكبر)

  return (
    <View style={cardStyles.wrap}>

      {/* ── رأس البطاقة ── */}
      <View style={cardStyles.header}>

        {/* يمين: رقم القراءة + الوقت */}
        <View style={cardStyles.headerRight}>
          <View style={cardStyles.readingBadge}>
            <Text style={cardStyles.readingNum}>#{readingNumber}</Text>
          </View>
          <View>
            <Text style={cardStyles.timeText}>{time}</Text>
            <Text style={cardStyles.agoText}>{ago}</Text>
          </View>
        </View>

        {/* يسار: حالة الضغط + زر الحذف */}
        <View style={cardStyles.headerLeft}>
          <View style={[cardStyles.statusBadge, { backgroundColor: bpStatus.bg }]}>
            <Text style={[cardStyles.statusText, { color: bpStatus.color }]}>
              {bpStatus.label}
            </Text>
          </View>
          <Pressable
            onPress={() => onDelete(vitalId)}
            style={cardStyles.deleteBtn}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={17} color="#ef4444" />
          </Pressable>
        </View>
      </View>

      {/* ── القيم ── */}
      <View style={cardStyles.values}>

        {/* الضغط */}
        <View style={cardStyles.valueBox}>
          <View style={cardStyles.bpRow}>
            <Text style={[cardStyles.bigNum, { color: '#3b82f6' }]}>{item.diastolic}</Text>
            <Text style={cardStyles.slash}>/</Text>
            <Text style={[cardStyles.bigNum, { color: '#ef4444' }]}>{item.systolic}</Text>
          </View>
          <Text style={cardStyles.unit}>mmHg ضغط الدم</Text>
        </View>

        <View style={cardStyles.divider} />

        {/* النبض */}
        <View style={cardStyles.valueBox}>
          <Text style={[cardStyles.bigNum, { color: '#f59e0b' }]}>{item.pulse}</Text>
          <Text style={cardStyles.unit}>bpm نبض</Text>
        </View>

        <View style={cardStyles.divider} />

        {/* الحرارة */}
        <View style={cardStyles.valueBox}>
          <Text style={[cardStyles.bigNum, { color: '#8b5cf6' }]}>{item.temperature}</Text>
          <Text style={cardStyles.unit}>°C حرارة</Text>
        </View>

        {/* الأكسجين (لو موجود) */}
        {item.oxygen_saturation != null && (
          <>
            <View style={cardStyles.divider} />
            <View style={cardStyles.valueBox}>
              <Text style={[cardStyles.bigNum, { color: '#0ea5e9' }]}>{item.oxygen_saturation}</Text>
              <Text style={cardStyles.unit}>% أكسجين</Text>
            </View>
          </>
        )}
      </View>
    </View>
  );
};

const cardStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: '#fafafa', borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  headerLeft:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },

  readingBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#065f46', alignItems: 'center', justifyContent: 'center',
  },
  readingNum: { color: '#fff', fontSize: 12, fontWeight: '800' },

  timeText: { fontSize: 13, fontWeight: '700', color: '#1f2937', textAlign: 'right' },
  agoText:  { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 1 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText:  { fontSize: 11, fontWeight: '700' },

  deleteBtn: { padding: 5, backgroundColor: '#fef2f2', borderRadius: 8 },

  values: {
    flexDirection: 'row-reverse', paddingHorizontal: 14, paddingVertical: 14,
    justifyContent: 'space-around', alignItems: 'center',
  },
  valueBox:  { alignItems: 'center', gap: 4, flex: 1 },
  bpRow:     { flexDirection: 'row-reverse', alignItems: 'center', gap: 2 },
  bigNum:    { fontSize: 20, fontWeight: '800', color: '#111827' },
  slash:     { fontSize: 18, color: '#d1d5db', marginHorizontal: 2 },
  unit:      { fontSize: 10, color: '#9ca3af', fontWeight: '600', textAlign: 'center' },
  divider:   { width: 1, height: 40, backgroundColor: '#f1f5f9' },
});

// ── المكوّن الرئيسي ───────────────────────────────────────────────────────────
const VitalSignsTab = ({ route }) => {
  const sessionId = route?.params?.sessionId;

  const [loading,      setLoading]      = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vitals,       setVitals]       = useState([]);
  const [showForm,     setShowForm]     = useState(false);
  const [form, setForm] = useState({
    systolic: '', diastolic: '', pulse: '', temperature: '', oxygen: '',
  });

  const fetchVitals = async () => {
    if (!sessionId) return;
    try {
      const { data } = await api.get(
        `/dialysis-sessions/${sessionId}/details/vital-signs`
      );
      const list = Array.isArray(data) ? data : data?.data || [];
      // الأحدث أولاً
      setVitals([...list].reverse());
    } catch {
      setVitals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVitals();
  }, [sessionId]);

  // ── حفظ قراءة جديدة ──────────────────────────────────────────
  const handleSave = async () => {
    const { systolic, diastolic, pulse, temperature } = form;
    if (!systolic || !diastolic || !pulse || !temperature)
      return Alert.alert("تنبيه", "يرجى تعبئة الضغط والنبض والحرارة على الأقل.");

    try {
      setIsSubmitting(true);
      await api.post(
        `/dialysis-sessions/${sessionId}/details/vital-signs`,
        {
          systolic:         Number(systolic),
          diastolic:        Number(diastolic),
          pulse:            Number(pulse),
          temperature:      Number(temperature),
          oxygenSaturation: form.oxygen ? Number(form.oxygen) : null,
        }
      );
      Alert.alert("تم ✅", "تم حفظ القراءة بنجاح");
      setForm({ systolic: '', diastolic: '', pulse: '', temperature: '', oxygen: '' });
      setShowForm(false);
      fetchVitals();
    } catch (err) {
      console.log("Save error:", err.response?.data);
      Alert.alert("خطأ", "فشل الحفظ، تأكد من القيم المدخلة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── حذف قراءة (يعمل على الويب + Expo Go + Native) ──────────
  const handleDelete = async (vitalId) => {
    const numericId = parseInt(vitalId, 10);
    if (isNaN(numericId)) return;

    const confirmed = Platform.OS === 'web'
      ? window.confirm("هل تريد حذف هذه القراءة نهائياً؟")
      : await new Promise(resolve => {
          Alert.alert(
            "تأكيد الحذف",
            "هل تريد حذف هذه القراءة نهائياً؟",
            [
              { text: "إلغاء", onPress: () => resolve(false), style: "cancel" },
              { text: "حذف",   onPress: () => resolve(true) },
            ],
            { cancelable: true, onDismiss: () => resolve(false) }
          );
        });

    if (!confirmed) return;

    try {
      await api.delete(
        `/dialysis-sessions/${sessionId}/details/vital-signs/${numericId}`
      );
      setVitals(prev => prev.filter(v => (v.vital_id || v.id) !== numericId));
    } catch (err) {
      console.log("Delete vital err:", err.response?.data || err.message);
      Platform.OS === 'web' ? alert("لم ينجح الحذف") : Alert.alert("خطأ", "لم ينجح الحذف.");
    }
  };

  // ── update حقل في الفورم ─────────────────────────────────────
  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ══════════════════════════════════════════════════════════════
          شريط العلامات الحيوية
      ══════════════════════════════════════════════════════════════ */}

      {/* ── شريط العنوان + زر الإضافة ── */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => setShowForm(v => !v)}
          style={[styles.addBtn, showForm && styles.addBtnActive]}
        >
          <MaterialCommunityIcons
            name={showForm ? "close" : "plus"}
            size={18} color="#fff"
          />
          <Text style={styles.addBtnText}>
            {showForm ? "إلغاء" : "قراءة جديدة"}
          </Text>
        </Pressable>
        <Text style={styles.pageTitle}>العلامات الحيوية</Text>
      </View>

      {/* ── آخر قراءة (ملخص سريع) ── */}
      {vitals.length > 0 && !showForm && (
        <View style={styles.latestCard}>
          <Text style={styles.latestLabel}>آخر قراءة</Text>
          <View style={styles.latestRow}>
            <View style={styles.latestItem}>
              <Text style={styles.latestVal}>
                <Text style={{ color: '#fca5a5' }}>{vitals[0].systolic}</Text>
                <Text style={{ color: '#ffffff60' }}>/</Text>
                <Text style={{ color: '#93c5fd' }}>{vitals[0].diastolic}</Text>
              </Text>
              <Text style={styles.latestUnit}>mmHg</Text>
            </View>
            <View style={styles.latestDivider} />
            <View style={styles.latestItem}>
              <Text style={[styles.latestVal, { color: '#fcd34d' }]}>{vitals[0].pulse}</Text>
              <Text style={styles.latestUnit}>bpm</Text>
            </View>
            <View style={styles.latestDivider} />
            <View style={styles.latestItem}>
              <Text style={[styles.latestVal, { color: '#c4b5fd' }]}>{vitals[0].temperature}°</Text>
              <Text style={styles.latestUnit}>°C</Text>
            </View>
            {vitals[0].oxygen_saturation != null && (
              <>
                <View style={styles.latestDivider} />
                <View style={styles.latestItem}>
                  <Text style={[styles.latestVal, { color: '#7dd3fc' }]}>{vitals[0].oxygen_saturation}%</Text>
                  <Text style={styles.latestUnit}>O₂</Text>
                </View>
              </>
            )}
          </View>
          <Text style={styles.latestTime}>
            {formatDateTime(vitals[0].recorded_at || vitals[0].createdAt).ago}
          </Text>
        </View>
      )}

      {/* ── فورم الإدخال ── */}
      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>تسجيل قراءة جديدة</Text>

          {/* ضغط الدم */}
          <Text style={styles.fieldLabel}>ضغط الدم (mmHg) *</Text>
          <View style={styles.bpRow}>
            <View style={[styles.inputBox, { flex: 1 }]}>
              <Text style={styles.bpTag}>SYS</Text>
              <TextInput
                style={styles.inp} placeholder="120"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric" value={form.systolic}
                onChangeText={t => setField('systolic', t)}
              />
            </View>
            <Text style={styles.bpSlash}>/</Text>
            <View style={[styles.inputBox, { flex: 1 }]}>
              <Text style={styles.bpTag}>DIA</Text>
              <TextInput
                style={styles.inp} placeholder="80"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric" value={form.diastolic}
                onChangeText={t => setField('diastolic', t)}
              />
            </View>
          </View>

          {/* نبض + حرارة */}
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>النبض (bpm) *</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="pulse" size={16} color="#f59e0b" style={{ marginLeft: 4 }} />
                <TextInput
                  style={styles.inp} placeholder="72"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric" value={form.pulse}
                  onChangeText={t => setField('pulse', t)}
                />
              </View>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>الحرارة (°C) *</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="thermometer" size={16} color="#8b5cf6" style={{ marginLeft: 4 }} />
                <TextInput
                  style={styles.inp} placeholder="36.5"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric" value={form.temperature}
                  onChangeText={t => setField('temperature', t)}
                />
              </View>
            </View>
          </View>

          {/* أكسجين */}
          <Text style={styles.fieldLabel}>نسبة الأكسجين % (اختياري)</Text>
          <View style={styles.inputBox}>
            <MaterialCommunityIcons name="water-percent" size={16} color="#0ea5e9" style={{ marginLeft: 4 }} />
            <TextInput
              style={styles.inp} placeholder="98"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric" value={form.oxygen}
              onChangeText={t => setField('oxygen', t)}
            />
            <Text style={styles.suffix}>%</Text>
          </View>

          <Pressable
            style={[styles.saveBtn, isSubmitting && { backgroundColor: '#6ee7b7' }]}
            onPress={handleSave} disabled={isSubmitting}
          >
            {isSubmitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>حفظ القراءة</Text>
            }
          </Pressable>
        </View>
      )}

      {/* ── سجل القراءات ── */}
      {loading ? (
        <ActivityIndicator color="#059669" style={{ marginTop: 30 }} />
      ) : vitals.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="heart-pulse" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>لا توجد قراءات بعد</Text>
          <Text style={styles.emptySub}>اضغط "قراءة جديدة" للبدء</Text>
        </View>
      ) : (
        <>
          <Text style={styles.historyLabel}>
            السجل الكامل ({vitals.length} قراءة)
          </Text>
          {vitals.map((item, i) => (
            <VitalCard
              key={item.vital_id || item.id || i}
              item={item}
              index={i}
              totalCount={vitals.length}
              onDelete={handleDelete}
            />
          ))}
        </>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

export default VitalSignsTab;


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content:   { padding: 16, paddingBottom: 40 },

  // شريط العنوان
  topBar: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  addBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: '#059669', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnActive: { backgroundColor: '#dc2626' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // آخر قراءة
  latestCard: {
    backgroundColor: '#065f46', borderRadius: 16, padding: 16,
    marginBottom: 16, elevation: 2,
  },
  latestLabel:   { color: '#a7f3d0', fontSize: 11, fontWeight: '700', textAlign: 'right', marginBottom: 10 },
  latestRow:     { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center' },
  latestItem:    { alignItems: 'center', gap: 3 },
  latestVal:     { fontSize: 22, fontWeight: '800', color: '#fff' },
  latestUnit:    { fontSize: 10, color: '#6ee7b7', fontWeight: '600' },
  latestDivider: { width: 1, height: 36, backgroundColor: '#ffffff20' },
  latestTime:    { color: '#6ee7b7', fontSize: 11, textAlign: 'left', marginTop: 10 },

  // فورم
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    marginBottom: 16, elevation: 2,
    borderTopWidth: 3, borderTopColor: '#059669',
  },
  formTitle:  { fontSize: 15, fontWeight: '800', color: '#111827', textAlign: 'right', marginBottom: 16 },
  fieldLabel: { textAlign: 'right', color: '#374151', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },

  bpRow:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  bpSlash: { fontSize: 24, color: '#d1d5db', lineHeight: 50 },
  bpTag:  { fontSize: 11, color: '#6b7280', fontWeight: '800', marginLeft: 4, minWidth: 24, textAlign: 'center' },
  twoCol: { flexDirection: 'row-reverse', marginTop: 4 },

  inputBox: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 10, height: 48,
  },
  inp: {
    flex: 1, textAlign: 'right', fontSize: 16,
    color: '#1f2937', fontWeight: '600',
  },
  suffix: { color: '#9ca3af', fontSize: 12, fontWeight: '700' },

  saveBtn: {
    backgroundColor: '#059669', padding: 14, borderRadius: 10,
    alignItems: 'center', marginTop: 18, minHeight: 50, justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // سجل
  historyLabel: {
    textAlign: 'right', fontSize: 14, fontWeight: '800',
    color: '#374151', marginBottom: 12,
  },

  // فارغ
  emptyBox:  { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 15, color: '#6b7280', fontWeight: '700' },
  emptySub:  { fontSize: 12, color: '#9ca3af' },
});