// screens/dialysisSessions/SettingsTab.jsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet,
  Alert, Pressable, ActivityIndicator,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const API = "https://medikidneysys.onrender.com";

// ── الحقول الثلاثة — تعريف مركزي ────────────────────────────────────────────
const FIELDS = [
  {
    key: 'bloodFlowRate',
    label: 'تدفق الدم',
    placeholder: '200',
    unit: 'ml/min',
    icon: 'water-pump',
    color: '#ef4444',
    hint: 'Blood Flow Rate — BFR',
  },
  {
    key: 'dialysateFlow',
    label: 'تدفق السائل',
    placeholder: '500',
    unit: 'ml/min',
    icon: 'beaker-outline',
    color: '#3b82f6',
    hint: 'Dialysate Flow — DF',
  },
  {
    key: 'ultrafiltrationRate',
    label: 'معدل الترشيح',
    placeholder: '300',
    unit: 'ml/hr',
    icon: 'filter-variant',
    color: '#8b5cf6',
    hint: 'Ultrafiltration Rate — UFR',
  },
];

// ── دالة مساعدة: استخراج ID من الكائن ───────────────────────────────────────
const extractId = (obj) =>
  obj?.id || obj?.settingId || obj?.setting_id || null;

// ── دالة مساعدة: استخراج قيمة حقل (snake_case أو camelCase) ─────────────────
const extractVal = (obj, key) => {
  if (!obj) return '—';
  // camelCase أولاً، ثم snake_case
  const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase();
  const val = obj[key] ?? obj[snake];
  return val != null ? String(val) : '—';
};

// ═══════════════════════════════════════════════════════════════════════════════
const SettingsTab = ({ route }) => {
  const sessionId = route?.params?.sessionId;

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(null);   // آخر إعداد محفوظ
  const [form, setForm] = useState({
    bloodFlowRate: '', dialysateFlow: '', ultrafiltrationRate: '',
  });

  // ── جلب آخر إعداد ────────────────────────────────────────────
  const fetchLatest = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      const { data } = await axios.get(
        `${API}/dialysis-sessions/${sessionId}/details/dialysis-settings/latest`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const obj = data?.data || data;
      if (obj && extractId(obj)) {
        setSaved(obj);
        // نملأ الفورم بالقيم الحالية لسهولة التعديل
        setForm({
          bloodFlowRate: extractVal(obj, 'bloodFlowRate'),
          dialysateFlow: extractVal(obj, 'dialysateFlow'),
          ultrafiltrationRate: extractVal(obj, 'ultrafiltrationRate'),
        });
      } else {
        setSaved(null);
      }
    } catch (err) {
      // 404 = لا يوجد إعداد بعد — مش خطأ
      if (err.response?.status !== 404) console.log("Fetch error:", err.message);
      setSaved(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLatest(); }, [sessionId]);

  // ── حفظ إعداد جديد (POST) ────────────────────────────────────
  const handleSave = async () => {
    const { bloodFlowRate, dialysateFlow, ultrafiltrationRate } = form;
    if (!bloodFlowRate || !dialysateFlow || !ultrafiltrationRate)
      return Alert.alert("تنبيه", "يرجى تعبئة جميع الحقول.");

    try {
      setIsSubmitting(true);
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `${API}/dialysis-sessions/${sessionId}/details/dialysis-settings`,
        {
          bloodFlowRate: Number(bloodFlowRate),
          dialysateFlow: Number(dialysateFlow),
          ultrafiltrationRate: Number(ultrafiltrationRate),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("تم ✅", "تم حفظ الإعدادات بنجاح");
      fetchLatest();
    } catch (err) {
      console.log("Save error:", err.response?.data);
      Alert.alert("خطأ", "فشل الحفظ، تأكد من القيم المدخلة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── حذف الإعداد (DELETE) ─────────────────────────────────────
  const handleDelete = () => {
    const settingId = extractId(saved);
    if (!settingId) return Alert.alert("خطأ", "لا يوجد سجل للحذف.");

    Alert.alert("تأكيد الحذف", "هل تريد حذف هذه الإعدادات؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف", style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            const token = await AsyncStorage.getItem("token");
            await axios.delete(
              `${API}/dialysis-sessions/${sessionId}/details/dialysis-settings/${settingId}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            setSaved(null);
            setForm({ bloodFlowRate: '', dialysateFlow: '', ultrafiltrationRate: '' });
          } catch (err) {
            console.log("Delete error:", err.response?.data);
            Alert.alert("خطأ", "تعذر الحذف.");
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  // ── تحديث حقل في الفورم ──────────────────────────────────────
  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  // ═══════════════════════════════════════════════════════════════
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── عنوان الصفحة ── */}
      <Text style={styles.pageTitle}>إعدادات جهاز الغسيل</Text>

      {/* ── بطاقة الإعدادات المحفوظة ── */}
      {loading ? (
        <ActivityIndicator color="#059669" style={{ marginVertical: 30 }} />
      ) : saved ? (
        <View style={styles.savedCard}>
          {/* رأس البطاقة */}
          <View style={styles.savedHeader}>
            <Pressable onPress={handleDelete} style={styles.deleteBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
              <Text style={styles.deleteBtnText}>حذف</Text>
            </Pressable>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>الإعدادات الحالية</Text>
            </View>
          </View>

          {/* القيم الثلاثة */}
          <View style={styles.savedValues}>
            {FIELDS.map((f, i) => (
              <React.Fragment key={f.key}>
                {i > 0 && <View style={styles.valuesDivider} />}
                <View style={styles.valueItem}>
                  <MaterialCommunityIcons name={f.icon} size={22} color={f.color} />
                  <Text style={[styles.valueBig, { color: f.color }]}>
                    {extractVal(saved, f.key)}
                  </Text>
                  <Text style={styles.valueUnit}>{f.unit}</Text>
                  <Text style={styles.valueLabel}>{f.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <MaterialCommunityIcons name="cog-off-outline" size={44} color="#d1d5db" />
          <Text style={styles.emptyText}>لا توجد إعدادات مسجلة بعد</Text>
          <Text style={styles.emptySub}>أدخل البيانات أدناه وسيتم حفظها</Text>
        </View>
      )}

      {/* ── فورم الإدخال ── */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>
          {saved ? "تحديث الإعدادات" : "إدخال إعدادات جديدة"}
        </Text>

        {FIELDS.map(f => (
          <View key={f.key} style={styles.fieldWrap}>
            {/* اسم الحقل */}
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldHint}>{f.hint}</Text>
              <View style={styles.fieldLabelLeft}>
                <MaterialCommunityIcons name={f.icon} size={16} color={f.color} />
                <Text style={styles.fieldLabel}>{f.label}</Text>
              </View>
            </View>

            {/* حقل الإدخال */}
            <View style={[
              styles.inputBox,
              form[f.key] ? { borderColor: f.color } : {},
            ]}>
              <Text style={styles.unitLabel}>{f.unit}</Text>
              <TextInput
                style={styles.input}
                placeholder={f.placeholder}
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
                value={form[f.key]}
                onChangeText={t => setField(f.key, t)}
              />
            </View>
          </View>
        ))}

        {/* زر الحفظ */}
        <Pressable
          style={[styles.saveBtn, isSubmitting && { backgroundColor: '#6ee7b7' }]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>
                {saved ? "تحديث الإعدادات" : "حفظ الإعدادات"}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

export default SettingsTab;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: {
    fontSize: 18, fontWeight: '800', color: '#111827',
    textAlign: 'right', marginBottom: 16,
  },

  // ── بطاقة المحفوظ ──
  savedCard: {
    backgroundColor: '#0f172a', borderRadius: 18, padding: 18,
    marginBottom: 16, elevation: 4,
  },
  savedHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 20,
  },
  activeBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e' },
  activeText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 5,
    backgroundColor: '#ffffff15', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10,
  },
  deleteBtnText: { color: '#ef4444', fontWeight: '700', fontSize: 13 },

  savedValues: {
    flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center',
  },
  valuesDivider: { width: 1, height: 60, backgroundColor: '#1e293b' },
  valueItem: { alignItems: 'center', gap: 5, flex: 1 },
  valueBig: { fontSize: 24, fontWeight: '900' },
  valueUnit: { fontSize: 10, color: '#475569', fontWeight: '700' },
  valueLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },

  // ── فارغ ──
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 30,
    alignItems: 'center', marginBottom: 16, gap: 6,
    borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed',
  },
  emptyText: { fontSize: 15, color: '#6b7280', fontWeight: '700' },
  emptySub: { fontSize: 12, color: '#9ca3af' },

  // ── فورم ──
  formCard: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18,
    elevation: 2, borderTopWidth: 3, borderTopColor: '#059669',
  },
  formTitle: {
    fontSize: 15, fontWeight: '800', color: '#111827',
    textAlign: 'right', marginBottom: 16,
  },

  fieldWrap: { marginBottom: 16 },
  fieldLabelRow: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 6,
  },
  fieldLabelLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  fieldHint: { fontSize: 11, color: '#9ca3af', fontWeight: '500' },

  inputBox: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb',
    borderRadius: 12, paddingHorizontal: 12, height: 52,
  },
  input: {
    flex: 1, textAlign: 'right', fontSize: 17,
    color: '#111827', fontWeight: '700',
  },
  unitLabel: { color: '#9ca3af', fontSize: 12, fontWeight: '700', marginLeft: 4 },

  saveBtn: {
    backgroundColor: '#059669', borderRadius: 12, height: 52,
    flexDirection: 'row-reverse', justifyContent: 'center',
    alignItems: 'center', gap: 8, marginTop: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});