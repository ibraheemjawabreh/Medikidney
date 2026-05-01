import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet,
  Alert, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import api from "../../services/api";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

// ── الأدوية الشائعة (أزرار جاهزة) ────────────────────────────
const PRESET_MEDS = [
  { name: "HEPARIN",  icon: "needle",       color: "#ef4444", dosage: 5000, unit: "IU",  label: "هيبارين" },
  { name: "EPO",      icon: "blood-bag",     color: "#3b82f6", dosage: 4000, unit: "IU",  label: "EPO" },
  { name: "IRON",     icon: "pill",          color: "#f59e0b", dosage: 100,  unit: "mg",  label: "حديد" },
  { name: "SALINE",   icon: "water",         color: "#0ea5e9", dosage: 500,  unit: "ml",  label: "محلول ملحي" },
];

// ── تنسيق الوقت ──────────────────────────────────────────────
const formatTime = (dateStr, t) => {
  if (!dateStr) return "";
  const locale = t.vitalSigns.now === 'الآن' ? 'ar-SA' : 'en-US';
  return new Date(dateStr).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
};

// ── مساعد للتأكيد (ويب + Expo Go + Native) ──────────────────
const confirmAction = async (msg, t) => {
  if (Platform.OS === 'web') {
    return window.confirm(msg);
  }
  return new Promise(resolve => {
    Alert.alert(t.medications.deleteConfirm.split('?')[0] + '?', msg, [
      { text: t.cancel, onPress: () => resolve(false), style: "cancel" },
      { text: t.yes,    onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
};

const showAlert = (title, msg) => {
  if (Platform.OS === 'web') {
    alert(`${title}: ${msg}`);
  } else {
    Alert.alert(title, msg);
  }
};

// ══════════════════════════════════════════════════════════════════
const MedicationsTab = ({ route }) => {
  const { t } = useLanguage();
  const sessionId = route?.params?.sessionId;

  const [meds,           setMeds]           = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [isSubmitting,   setIsSubmitting]   = useState(false);
  const [showCustom,     setShowCustom]     = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null); // الدواء الشائع المختار
  const [presetDosage,   setPresetDosage]   = useState('');   // الجرعة المعدلة
  const [presetNotes,    setPresetNotes]    = useState('');
  const [customForm,     setCustomForm]     = useState({ name: '', dosage: '', unit: 'mg', notes: '' });

  // ── جلب الأدوية المسجلة ─────────────────────────────────────
  const fetchMeds = async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const { data } = await api.get(
        `/dialysis-sessions/${sessionId}/details/medications`
      );
      const list = Array.isArray(data) ? data : data?.data || [];
      if (list.length > 0) console.log("💊 Medication sample object:", JSON.stringify(list[0]));
      setMeds([...list].reverse());
    } catch (err) {
      console.log("Fetch meds err:", err.response?.data || err.message);
      setMeds([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeds(); }, [sessionId]);

  // ── إرسال دواء (من الأزرار الجاهزة أو المخصص) ──────────────
  const postMed = async (medData) => {
    try {
      setIsSubmitting(true);
      await api.post(
        `/dialysis-sessions/${sessionId}/details/medications`,
        {
          medicationName: medData.name,
          dosage:         Number(medData.dosage),
          unit:           medData.unit,
          notes:          medData.notes || t.medications.saveSuccess,
        }
      );
      showAlert(t.success, `${t.medications.saveSuccess} ${medData.label || medData.name}`);
      fetchMeds();
    } catch (err) {
      console.log("Post med err:", err.response?.data || err.message);
      showAlert(t.error, err.response?.data?.message || t.medications.saveFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── حذف دواء ────────────────────────────────────────────────
  const deleteMed = async (medicationId) => {
    const numId = parseInt(medicationId, 10);
    if (isNaN(numId)) return;

    const confirmed = await confirmAction(t.medications.deleteConfirm, t);
    if (!confirmed) return;

    try {
      await api.delete(
        `/dialysis-sessions/${sessionId}/details/medications/${numId}`
      );
      setMeds(prev => prev.filter(m => parseInt(m.id || m.medicationId, 10) !== numId));
    } catch (err) {
      console.log("Delete med err:", err.response?.data || err.message);
      showAlert(t.error, t.medications.deleteFailed);
    }
  };

  // ── إرسال الدواء المخصص ─────────────────────────────────────
  const handleCustomSubmit = () => {
    if (!customForm.name || !customForm.dosage) {
      return showAlert(t.error, t.medications.customRequired);
    }
    postMed(customForm);
    setCustomForm({ name: '', dosage: '', unit: 'mg', notes: '' });
    setShowCustom(false);
  };

  const setField = (key, val) => setCustomForm(p => ({ ...p, [key]: val }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── العنوان ── */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => setShowCustom(v => !v)}
          style={[styles.customBtn, showCustom && styles.customBtnActive]}
        >
          <MaterialCommunityIcons name={showCustom ? "close" : "plus"} size={18} color="#fff" />
          <Text style={styles.customBtnText}>{showCustom ? t.cancel : t.medications.customMed}</Text>
        </Pressable>
        <Text style={styles.pageTitle}>{t.medications.title}</Text>
      </View>

      {/* ── أزرار الأدوية الشائعة ── */}
      {!showCustom && (
        <View style={styles.presetSection}>
          <Text style={styles.sectionLabel}>{t.medications.presetLabel}</Text>
          <View style={styles.presetGrid}>
            {PRESET_MEDS.map((med) => {
              const isActive = selectedPreset?.name === med.name;
              return (
                <Pressable
                  key={med.name}
                  style={[
                    styles.presetCard,
                    { borderTopColor: med.color },
                    isActive && { borderWidth: 2, borderColor: med.color }
                  ]}
                  onPress={() => {
                    if (isActive) {
                      setSelectedPreset(null);
                      setPresetDosage('');
                      setPresetNotes('');
                    } else {
                      setSelectedPreset(med);
                      setPresetDosage(String(med.dosage));
                      setPresetNotes('');
                    }
                  }}
                >
                  <View style={[styles.presetIconWrap, { backgroundColor: med.color + '15' }]}>
                    <MaterialCommunityIcons name={med.icon} size={26} color={med.color} />
                  </View>
                  <Text style={styles.presetName}>{med.label}</Text>
                  <Text style={styles.presetDose}>{med.dosage} {med.unit}</Text>
                  {isActive ? (
                    <View style={[styles.presetChip, { backgroundColor: med.color }]}>
                      <Text style={[styles.presetChipText, { color: '#fff' }]}>{t.medications.selected}</Text>
                    </View>
                  ) : (
                    <View style={[styles.presetChip, { backgroundColor: med.color + '15' }]}>
                      <Text style={[styles.presetChipText, { color: med.color }]}>{t.medications.select}</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* ── حقل الجرعة بعد اختيار دواء شائع ── */}
          {selectedPreset && (
            <View style={[styles.formCard, { borderTopColor: selectedPreset.color }]}>
              <Text style={styles.formTitle}>
                {t.medications.dosageLabel} {selectedPreset.label}
              </Text>

              <Text style={styles.fieldLabel}>{t.medications.dosageField} ({selectedPreset.unit}) *</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name={selectedPreset.icon} size={18} color={selectedPreset.color} style={{ marginLeft: 6 }} />
                <TextInput
                  style={styles.inp}
                  placeholder={String(selectedPreset.dosage)}
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={presetDosage}
                  onChangeText={setPresetDosage}
                />
                <Text style={styles.unitSuffix}>{selectedPreset.unit}</Text>
              </View>

              <Text style={styles.fieldLabel}>{t.medications.notesOptional}</Text>
              <View style={[styles.inputBox, { height: 60, alignItems: 'flex-start', paddingTop: 10 }]}>
                <TextInput
                  style={[styles.inp, { textAlignVertical: 'top' }]}
                  placeholder="مثال: تم إعطاء الدواء..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  value={presetNotes}
                  onChangeText={setPresetNotes}
                />
              </View>

              <Pressable
                style={[styles.saveBtn, { backgroundColor: selectedPreset.color }, isSubmitting && { opacity: 0.6 }]}
                onPress={() => {
                  if (!presetDosage) return showAlert(t.error, t.medications.dosageRequired);
                  postMed({
                    name: selectedPreset.name,
                    label: selectedPreset.label,
                    dosage: presetDosage,
                    unit: selectedPreset.unit,
                    notes: presetNotes,
                  });
                  setSelectedPreset(null);
                  setPresetDosage('');
                  setPresetNotes('');
                }}
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.saveBtnText}>{t.medications.register} {selectedPreset.label}</Text>
                }
              </Pressable>
            </View>
          )}
        </View>
      )}

      {/* ── فورم الدواء المخصص ── */}
      {showCustom && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{t.medications.customTitle}</Text>

          <Text style={styles.fieldLabel}>{t.medications.medName}</Text>
          <View style={styles.inputBox}>
            <MaterialCommunityIcons name="pill" size={18} color="#059669" style={{ marginLeft: 6 }} />
            <TextInput
              style={styles.inp}
              placeholder="مثال: Paracetamol"
              placeholderTextColor="#9ca3af"
              value={customForm.name}
              onChangeText={t => setField('name', t)}
            />
          </View>

          <View style={styles.twoCol}>
            <View style={{ flex: 2 }}>
              <Text style={styles.fieldLabel}>{t.medications.dosage}</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inp}
                  placeholder="500"
                  placeholderTextColor="#9ca3af"
                  keyboardType="numeric"
                  value={customForm.dosage}
                  onChangeText={t => setField('dosage', t)}
                />
              </View>
            </View>
            <View style={{ width: 10 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{t.medications.unit}</Text>
              <View style={styles.inputBox}>
                <TextInput
                  style={styles.inp}
                  placeholder="mg"
                  placeholderTextColor="#9ca3af"
                  value={customForm.unit}
                  onChangeText={t => setField('unit', t)}
                />
              </View>
            </View>
          </View>

          <Text style={styles.fieldLabel}>{t.medications.notesOptional}</Text>
          <View style={[styles.inputBox, { height: 70, alignItems: 'flex-start', paddingTop: 10 }]}>
            <TextInput
              style={[styles.inp, { textAlignVertical: 'top' }]}
              placeholder="أي ملاحظة حول الدواء..."
              placeholderTextColor="#9ca3af"
              multiline
              value={customForm.notes}
              onChangeText={t => setField('notes', t)}
            />
          </View>

          <Pressable
            style={[styles.saveBtn, isSubmitting && { backgroundColor: '#6ee7b7' }]}
            onPress={handleCustomSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>{t.medications.saveMed}</Text>
            }
          </Pressable>
        </View>
      )}

      {/* ── سجل الأدوية المعطاة ── */}
      <Text style={styles.historyLabel}>
        {t.medications.registered} ({meds.length})
      </Text>

      {loading ? (
        <ActivityIndicator color="#059669" style={{ marginTop: 20 }} />
      ) : meds.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="pill-off" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>{t.medications.noMeds}</Text>
          <Text style={styles.emptySub}>{t.medications.noMedsSub}</Text>
        </View>
      ) : (
        meds.map((med, index) => {
          const medId = med.medication_id || med.medicationId || med.id;
          return (
            <View key={medId || index} style={styles.medCard}>
              <View style={styles.medHeader}>
                {/* اسم الدواء + الوقت */}
                <View style={styles.medRight}>
                  <View style={styles.medIconCircle}>
                    <MaterialCommunityIcons name="pill" size={18} color="#059669" />
                  </View>
                  <View>
                    <Text style={styles.medName}>{med.medication_name || med.medicationName}</Text>
                    <Text style={styles.medTime}>{formatTime(med.recorded_at || med.administered_at || med.createdAt || med.administeredAt, t)}</Text>
                  </View>
                </View>
                {/* الجرعة + حذف */}
                <View style={styles.medLeft}>
                  <View style={styles.doseBadge}>
                    <Text style={styles.doseText}>{med.dosage} {med.unit}</Text>
                  </View>
                  <Pressable onPress={() => deleteMed(medId)} style={styles.deleteBtn}>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#ef4444" />
                  </Pressable>
                </View>
              </View>
              {/* الملاحظات */}
              {med.notes ? (
                <View style={styles.noteRow}>
                  <Text style={styles.noteText}>{med.notes}</Text>
                  <MaterialCommunityIcons name="note-text-outline" size={14} color="#9ca3af" />
                </View>
              ) : null}
            </View>
          );
        })
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

export default MedicationsTab;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  content:   { padding: 16, paddingBottom: 40 },

  // شريط العنوان
  topBar: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#111827' },
  customBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: '#059669', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  customBtnActive: { backgroundColor: '#dc2626' },
  customBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // الأدوية الشائعة
  presetSection: { marginBottom: 20 },
  sectionLabel: { textAlign: 'right', color: '#6b7280', fontSize: 12, fontWeight: '600', marginBottom: 10 },
  presetGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  presetCard: {
    backgroundColor: '#fff', width: '48%', padding: 16, borderRadius: 14,
    alignItems: 'center', marginBottom: 12, elevation: 2,
    borderTopWidth: 3, borderTopColor: '#059669',
  },
  presetIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  presetName: { fontWeight: '800', color: '#1f2937', fontSize: 14, marginBottom: 2 },
  presetDose: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 8 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  presetChipText: { fontSize: 12, fontWeight: '800' },

  // فورم مخصص
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16,
    elevation: 2, borderTopWidth: 3, borderTopColor: '#059669',
  },
  formTitle: { fontSize: 15, fontWeight: '800', color: '#111827', textAlign: 'right', marginBottom: 12 },
  fieldLabel: { textAlign: 'right', color: '#374151', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  twoCol: { flexDirection: 'row-reverse', marginTop: 4 },
  inputBox: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 10, height: 48,
  },
  inp: { flex: 1, textAlign: 'right', fontSize: 15, color: '#1f2937', fontWeight: '600' },
  unitSuffix: { color: '#6b7280', fontSize: 13, fontWeight: '800', marginRight: 6 },
  saveBtn: {
    backgroundColor: '#059669', padding: 14, borderRadius: 10,
    alignItems: 'center', marginTop: 18, minHeight: 50, justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // السجل
  historyLabel: { textAlign: 'right', fontSize: 14, fontWeight: '800', color: '#374151', marginBottom: 12 },
  medCard: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, padding: 14,
    borderWidth: 1, borderColor: '#e5e7eb', elevation: 1,
  },
  medHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
  },
  medRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  medLeft:  { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  medIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
  },
  medName: { fontSize: 14, fontWeight: '800', color: '#111827', textAlign: 'right' },
  medTime: { fontSize: 11, color: '#9ca3af', textAlign: 'right', marginTop: 2 },
  doseBadge: {
    backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  doseText: { color: '#3b82f6', fontSize: 12, fontWeight: '800' },
  deleteBtn: { padding: 5, backgroundColor: '#fef2f2', borderRadius: 8 },
  noteRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  noteText: { color: '#6b7280', fontSize: 12, flex: 1, textAlign: 'right' },

  // فارغ
  emptyBox:  { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 15, color: '#6b7280', fontWeight: '700' },
  emptySub:  { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
});