import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet,
  Alert, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import api from "../../services/api";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

// ── وحدات الأدوية المتاحة ─────────────────────────────────────
const UNITS = ['IU', 'mg', 'ml', 'mcg', 'g'];

// ── الأدوية الشائعة (أزرار جاهزة) ────────────────────────────
const PRESET_MEDS = [
  { name: "HEPARIN", icon: "needle", color: "#DE1A1C", dosage: 5000, unit: "IU", label: "هيبارين" },
  { name: "EPO", icon: "blood-bag", color: "#26CDD6", dosage: 4000, unit: "IU", label: "EPO" },
  { name: "IRON", icon: "pill", color: "#A32D2F", dosage: 100, unit: "mg", label: "حديد" },
  { name: "SALINE", icon: "water", color: "#26CDD6", dosage: 500, unit: "ml", label: "محلول ملحي" },
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
      { text: t.yes, onPress: () => resolve(true) },
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
const getMedicationRecordId = (med) => {
  if (!med) return null;

  return (
    med.id ??
    med.session_medication_id ??
    med.sessionMedicationId ??
    med.dialysis_session_medication_id ??
    med.dialysisSessionMedicationId ??
    med.medication_record_id ??
    med.medicationRecordId ??
    med.record_id ??
    med.recordId ??
    med.detail_id ??
    med.detailId ??
    med.medication_detail_id ??
    med.medicationDetailId ??
    med.med_id ??
    med.medId ??
    med.medication_id ??
    med.medicationId ??
    null
  );
};

const MedicationsTab = ({ route }) => {
  const { t } = useLanguage();
  const sessionId = route?.params?.sessionId;

  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [showCustom, setShowCustom] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(null); // الدواء الشائع المختار
  const [presetDosage, setPresetDosage] = useState('');   // الجرعة المعدلة
  const [presetUnit, setPresetUnit] = useState('IU');     // وحدة الدواء الجاهز
  const [presetNotes, setPresetNotes] = useState('');
  const [customForm, setCustomForm] = useState({ name: '', dosage: '', unit: 'IU', notes: '' });

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
          dosage: Number(medData.dosage),
          unit: medData.unit,
          notes: medData.notes || t.medications.saveSuccess,
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
  const deleteMed = async (med) => {
    const medicationId = getMedicationRecordId(med);
    const numId = medicationId == null ? NaN : Number(medicationId);
    if (!sessionId) {
      return showAlert(t.error, 'Session ID is missing.');
    }
    if (!Number.isFinite(numId)) {
      console.log("Medication object without deletable id:", med);
      return showAlert(t.error, 'Medication ID is missing.');
    }

    const confirmed = await confirmAction(t.medications.deleteConfirm, t);
    if (!confirmed) return;

    try {
      setDeletingId(numId);
      console.log("Deleting medication record:", { sessionId, medicationId: numId, med });
      await api.delete(
        `/dialysis-sessions/${sessionId}/details/medications/${numId}`
      );
      await fetchMeds();
    } catch (err) {
      console.log("Delete med err:", err.response?.data || err.message);
      showAlert(t.error, t.medications.deleteFailed);
    } finally {
      setDeletingId(null);
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
                      setPresetUnit('IU');
                      setPresetNotes('');
                    } else {
                      setSelectedPreset(med);
                      setPresetDosage(String(med.dosage));
                      setPresetUnit(med.unit);   // ضبط الوحدة الافتراضية من الدواء
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

              <Text style={styles.fieldLabel}>{t.medications.dosageField} *</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name={selectedPreset.icon} size={18} color={selectedPreset.color} style={{ marginLeft: 6 }} />
                <TextInput
                  style={styles.inp}
                  placeholder={String(selectedPreset.dosage)}
                  placeholderTextColor="#8296B1"
                  keyboardType="numeric"
                  value={presetDosage}
                  onChangeText={setPresetDosage}
                />
                <Text style={styles.unitSuffix}>{presetUnit}</Text>
              </View>

              {/* ── اختيار الوحدة ── */}
              <Text style={styles.fieldLabel}>{t.medications.unit}</Text>
              <View style={styles.unitPicker}>
                {UNITS.map(u => (
                  <Pressable
                    key={u}
                    style={[
                      styles.unitChip,
                      presetUnit === u && { backgroundColor: selectedPreset.color, borderColor: selectedPreset.color },
                    ]}
                    onPress={() => setPresetUnit(u)}
                  >
                    <Text style={[styles.unitChipText, presetUnit === u && { color: '#fff' }]}>{u}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>{t.medications.notesOptional}</Text>
              <View style={[styles.inputBox, { height: 60, alignItems: 'flex-start', paddingTop: 10 }]}>
                <TextInput
                  style={[styles.inp, { textAlignVertical: 'top' }]}
                  placeholder="مثال: تم إعطاء الدواء..."
                  placeholderTextColor="#8296B1"
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
                    unit: presetUnit,          // الوحدة المختارة من المستخدم
                    notes: presetNotes,
                  });
                  setSelectedPreset(null);
                  setPresetDosage('');
                  setPresetUnit('IU');
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
            <MaterialCommunityIcons name="pill" size={18} color="#26CDD6" style={{ marginLeft: 6 }} />
            <TextInput
              style={styles.inp}
              placeholder="مثال: Paracetamol"
              placeholderTextColor="#8296B1"
              value={customForm.name}
              onChangeText={t => setField('name', t)}
            />
          </View>

          <Text style={styles.fieldLabel}>{t.medications.dosage}</Text>
          <View style={styles.inputBox}>
            <TextInput
              style={styles.inp}
              placeholder="500"
              placeholderTextColor="#8296B1"
              keyboardType="numeric"
              value={customForm.dosage}
              onChangeText={t => setField('dosage', t)}
            />
          </View>

          <Text style={styles.fieldLabel}>{t.medications.unit}</Text>
          <View style={styles.unitPicker}>
            {UNITS.map(u => (
              <Pressable
                key={u}
                style={[
                  styles.unitChip,
                  customForm.unit === u && { backgroundColor: '#26CDD6', borderColor: '#26CDD6' },
                ]}
                onPress={() => setField('unit', u)}
              >
                <Text style={[styles.unitChipText, customForm.unit === u && { color: '#fff' }]}>{u}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>{t.medications.notesOptional}</Text>
          <View style={[styles.inputBox, { height: 70, alignItems: 'flex-start', paddingTop: 10 }]}>
            <TextInput
              style={[styles.inp, { textAlignVertical: 'top' }]}
              placeholder="أي ملاحظة حول الدواء..."
              placeholderTextColor="#8296B1"
              multiline
              value={customForm.notes}
              onChangeText={t => setField('notes', t)}
            />
          </View>

          <Pressable
            style={[styles.saveBtn, isSubmitting && { backgroundColor: '#BCEFF3' }]}
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
        <ActivityIndicator color="#26CDD6" style={{ marginTop: 20 }} />
      ) : meds.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="pill-off" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>{t.medications.noMeds}</Text>
          <Text style={styles.emptySub}>{t.medications.noMedsSub}</Text>
        </View>
      ) : (
        meds.map((med, index) => {
          const medId = getMedicationRecordId(med);
          const numericMedId = Number(medId);
          const isDeleting = Number.isFinite(numericMedId) && deletingId === numericMedId;
          return (
            <View key={medId || index} style={styles.medCard}>
              <View style={styles.medHeader}>
                {/* اسم الدواء + الوقت */}
                <View style={styles.medRight}>
                  <View style={styles.medIconCircle}>
                    <MaterialCommunityIcons name="pill" size={18} color="#26CDD6" />
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
                  <Pressable
                    onPress={() => deleteMed(med)}
                    style={[styles.deleteBtn, isDeleting && styles.deleteBtnDisabled]}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#DE1A1C" />
                    ) : (
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#DE1A1C" />
                    )}
                  </Pressable>
                </View>
              </View>
              {/* الملاحظات */}
              {med.notes ? (
                <View style={styles.noteRow}>
                  <Text style={styles.noteText}>{med.notes}</Text>
                  <MaterialCommunityIcons name="note-text-outline" size={14} color="#8296B1" />
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
  container: { flex: 1, backgroundColor: '#F1FCFD' },
  content: { padding: 16, paddingBottom: 40 },

  // شريط العنوان
  topBar: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#193B6B' },
  customBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: '#26CDD6', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
  },
  customBtnActive: { backgroundColor: '#DE1A1C' },
  customBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // الأدوية الشائعة
  presetSection: { marginBottom: 20 },
  sectionLabel: { textAlign: 'right', color: '#8296B1', fontSize: 12, fontWeight: '600', marginBottom: 10 },
  presetGrid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  presetCard: {
    backgroundColor: '#fff', width: '48%', padding: 16, borderRadius: 14,
    alignItems: 'center', marginBottom: 12, elevation: 2,
    borderTopWidth: 3, borderTopColor: '#26CDD6',
  },
  presetIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  presetName: { fontWeight: '800', color: '#193B6B', fontSize: 14, marginBottom: 2 },
  presetDose: { fontSize: 12, color: '#8296B1', fontWeight: '600', marginBottom: 8 },
  presetChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  presetChipText: { fontSize: 12, fontWeight: '800' },

  // فورم مخصص
  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 16,
    elevation: 2, borderTopWidth: 3, borderTopColor: '#26CDD6',
  },
  formTitle: { fontSize: 15, fontWeight: '800', color: '#193B6B', textAlign: 'right', marginBottom: 12 },
  fieldLabel: { textAlign: 'right', color: '#193B6B', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  twoCol: { flexDirection: 'row-reverse', marginTop: 4 },
  inputBox: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 10, minHeight: 48, paddingVertical: 4,
  },
  inp: { flex: 1, textAlign: 'right', fontSize: 15, color: '#193B6B', fontWeight: '600' },
  unitSuffix: { color: '#8296B1', fontSize: 13, fontWeight: '800', marginRight: 6 },

  // منتقي الوحدة
  unitPicker: {
    flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 8, marginTop: 2,
  },
  unitChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  unitChipText: { fontSize: 13, fontWeight: '800', color: '#193B6B' },

  saveBtn: {
    backgroundColor: '#26CDD6', padding: 14, borderRadius: 10,
    alignItems: 'center', marginTop: 18, minHeight: 50, justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  // السجل
  historyLabel: { textAlign: 'right', fontSize: 14, fontWeight: '800', color: '#193B6B', marginBottom: 12 },
  medCard: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 10, padding: 14,
    borderWidth: 1, borderColor: '#e5e7eb', elevation: 1,
  },
  medHeader: {
    flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center',
  },
  medRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  medLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  medIconCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E9FAFB', alignItems: 'center', justifyContent: 'center',
  },
  medName: { fontSize: 14, fontWeight: '800', color: '#193B6B', textAlign: 'right' },
  medTime: { fontSize: 11, color: '#8296B1', textAlign: 'right', marginTop: 2 },
  doseBadge: {
    backgroundColor: '#E9FAFB', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  doseText: { color: '#26CDD6', fontSize: 12, fontWeight: '800' },
  deleteBtn: { padding: 5, backgroundColor: '#FBEAEA', borderRadius: 8 },
  deleteBtnDisabled: { opacity: 0.65 },
  noteRow: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f3f4f6',
  },
  noteText: { color: '#8296B1', fontSize: 12, flex: 1, textAlign: 'right' },

  // فارغ
  emptyBox: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 15, color: '#8296B1', fontWeight: '700' },
  emptySub: { fontSize: 12, color: '#8296B1', textAlign: 'center' },
});
