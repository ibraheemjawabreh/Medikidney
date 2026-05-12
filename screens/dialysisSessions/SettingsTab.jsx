// screens/dialysisSessions/SettingsTab.jsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet,
  Alert, Pressable, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from "../../services/api";
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

const extractId = (obj) =>
  obj?.id || obj?.settingId || obj?.setting_id || obj?.setting_id;

const extractVal = (obj, key) => {
  if (!obj) return '—';
  const snake = key.replace(/([A-Z])/g, '_$1').toLowerCase();
  const val = obj[key] ?? obj[snake];
  return (val !== undefined && val !== null) ? String(val) : '—';
};

const SettingsTab = ({ route }) => {
  const { t } = useLanguage();
  const FIELDS = [
    { key: 'bloodFlowRate', label: t.deviceSettings.fields.bloodFlow, placeholder: '200', unit: 'ml/min', icon: 'water-pump', color: '#DE1A1C', hint: 'Blood Flow Rate — BFR' },
    { key: 'dialysateFlow', label: t.deviceSettings.fields.dialysateFlow, placeholder: '500', unit: 'ml/min', icon: 'beaker-outline', color: '#26CDD6', hint: 'Dialysate Flow — DF' },
    { key: 'ultrafiltrationRate', label: 'السوائل المسحوبة', placeholder: 'مثال: 2.5', unit: 'لتر/مل', icon: 'water-percent', color: '#26CDD6', hint: 'Fluid Removed / Ultrafiltration' },
  ];
  const sessionId = route?.params?.sessionId;

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState({
    bloodFlowRate: '200', dialysateFlow: '500', ultrafiltrationRate: '2.5',
  });
  const [prevWeightAfter, setPrevWeightAfter] = useState('—');
  const [currWeightBefore, setCurrWeightBefore] = useState('—');
  const [monthlyAverageUF, setMonthlyAverageUF] = useState(null);

  const fetchLatest = async () => {
    if (!sessionId) return false;
    try {
      setLoading(true);
      const { data } = await api.get(
        `/dialysis-sessions/${sessionId}/details/dialysis-settings/latest`
      );

      const obj = data?.data || data;
      // نتحقق من وجود بيانات (حتى لو لم نجد ID، طالما هناك قيم)
      if (obj && (extractVal(obj, 'bloodFlowRate') !== '—')) {
        setSaved(obj);
        setForm({
          bloodFlowRate: extractVal(obj, 'bloodFlowRate'),
          dialysateFlow: extractVal(obj, 'dialysateFlow'),
          ultrafiltrationRate: extractVal(obj, 'ultrafiltrationRate'),
        });
        return true; // يوجد إعدادات محفوظة لهذه الجلسة
      } else {
        setSaved(null);
        return false;
      }
    } catch (err) {
      if (err.response?.status !== 404) console.log("Fetch error:", err.message);
      setSaved(null);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionData = async (hasSaved = false) => {
    if (!sessionId) return;
    try {
      const sessionRes = await api.get(`/dialysis-sessions/${sessionId}`);
      const currentSession = sessionRes.data;

      const patientId = currentSession.patient_id;
      if (!patientId) return;

      const allSessionsRes = await api.get(`/dialysis-sessions?patientId=${patientId}`);
      const allSessions = Array.isArray(allSessionsRes.data) ? allSessionsRes.data : [];

      const pastSessions = allSessions
        .filter(s => new Date(s.date) < new Date(currentSession.date) && s.status === 'COMPLETED')
        .sort((a, b) => new Date(b.date) - new Date(a.date));
      if (pastSessions.length > 0 && pastSessions[0].weight_after) {
        setPrevWeightAfter(String(pastSessions[0].weight_after));
      }

      if (currentSession.weight_before != null) {
        setCurrWeightBefore(String(currentSession.weight_before));
      } else if (currentSession.weight != null) {
        setCurrWeightBefore(String(currentSession.weight));
      }

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentSessions = allSessions.filter(s => s.status === 'COMPLETED' && new Date(s.date) >= thirtyDaysAgo);

      if (recentSessions.length > 0) {
        let totalUF = 0;
        let count = 0;
        recentSessions.forEach(s => {
          let ufValue = parseFloat(s.fluid_removed);
          if (!isNaN(ufValue) && ufValue > 50) {
            ufValue = ufValue / 1000;
          }
          if (isNaN(ufValue) || ufValue <= 0) {
            const settingsWithUF = s.dialysisSettings?.filter(set => set.ultrafiltration_rate != null) || [];
            if (settingsWithUF.length > 0) {
              const rate = parseFloat(settingsWithUF[settingsWithUF.length - 1].ultrafiltration_rate);
              ufValue = rate > 50 ? rate / 1000 : rate;
            }
          }
          if (!isNaN(ufValue) && ufValue > 0) {
            totalUF += ufValue;
            count++;
          }
        });
        setMonthlyAverageUF(count > 0 ? (totalUF / count).toFixed(2) : '0.00');
      }

      // ─── حساب السوائل المسحوبة = الوزن الحالي - وزن بعد الجلسة السابقة ────
      const wBefore = currentSession.weight_before ?? currentSession.weight;
      const wAfterPrev = pastSessions.length > 0 ? pastSessions[0].weight_after : null;
      if (wBefore != null && wAfterPrev != null) {
        const diff = parseFloat(wBefore) - parseFloat(wAfterPrev);
        if (!isNaN(diff) && diff > 0) {
          const calculatedUF = diff.toFixed(1);
          // نضع القيمة المحسوبة دائماً إذا لم تكن هناك إعدادات محفوظة مسبقاً
          if (!hasSaved) {
            setForm(prev => ({ ...prev, ultrafiltrationRate: calculatedUF }));
          }
        }
      }
    } catch (err) {
      console.log("Error fetching supplementary session data:", err);
    }
  };

  useEffect(() => {
    // تسلسل مضمون: جلب الإعدادات أولاً ← ثم بيانات الجلسة مع علم hasSaved
    const init = async () => {
      const hasSaved = await fetchLatest();
      await fetchSessionData(hasSaved);
    };
    init();
  }, [sessionId]);


  const handleSave = async () => {
    const { bloodFlowRate, dialysateFlow, ultrafiltrationRate } = form;
    if (!bloodFlowRate || !dialysateFlow || !ultrafiltrationRate)
      return Alert.alert(t.error, t.deviceSettings.fillAll);

    try {
      setIsSubmitting(true);
      const payload = {
        bloodFlowRate: Number(bloodFlowRate),
        dialysateFlow: Number(dialysateFlow),
        ultrafiltrationRate: Number(ultrafiltrationRate),
      };

      const res = await api.post(
        `/dialysis-sessions/${sessionId}/details/dialysis-settings`,
        payload
      );

      // تحديث الحالة فوراً بالقيم المسجلة لضمان الظهور السريع
      const newObj = res.data?.data || res.data || payload;
      setSaved(newObj);

      Alert.alert(t.success, t.deviceSettings.saveSuccess);
      fetchLatest();
    } catch (err) {
      console.log("Save error:", err.response?.data);
      Alert.alert(t.error, t.deviceSettings.saveFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    const settingId = extractId(saved);
    if (!settingId) return Alert.alert(t.error, t.deviceSettings.deleteIdError);

    Alert.alert(t.deviceSettings.deleteTitle, t.deviceSettings.deleteMsg, [
      { text: t.cancel, style: "cancel" },
      {
        text: t.deviceSettings.deleteBtn, style: "destructive",
        onPress: async () => {
          try {
            setLoading(true);
            await api.delete(
              `/dialysis-sessions/${sessionId}/details/dialysis-settings/${settingId}`
            );
            setSaved(null);
            setForm({ bloodFlowRate: '200', dialysateFlow: '500', ultrafiltrationRate: '2.5' });
          } catch (err) {
            Alert.alert(t.error, t.deviceSettings.deleteFailed);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>{t.deviceSettings.title}</Text>

      {loading && !saved ? (
        <ActivityIndicator color="#26CDD6" style={{ marginVertical: 30 }} />
      ) : saved ? (
        <View style={styles.savedCard}>
          <View style={styles.savedHeader}>
            <Pressable onPress={handleDelete} style={styles.deleteBtn}>
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#DE1A1C" />
              <Text style={styles.deleteBtnText}>{t.deviceSettings.delete}</Text>
            </Pressable>
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>{t.deviceSettings.currentSettings}</Text>
            </View>
          </View>

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
          <Text style={styles.emptyText}>{t.deviceSettings.noSettings}</Text>
          <Text style={styles.emptySub}>{t.deviceSettings.noSettingsSub}</Text>
        </View>
      )}

      <View style={styles.formCard}>
        <Text style={styles.formTitle}>{saved ? t.deviceSettings.update : t.deviceSettings.addNew}</Text>
        {FIELDS.map(f => {
          if (f.key === 'ultrafiltrationRate') {
            return (
              <View key={f.key} style={styles.fieldWrap}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldHint}>{f.hint}</Text>
                  <View style={styles.fieldLabelLeft}>
                    <MaterialCommunityIcons name={f.icon} size={16} color={f.color} />
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'column', gap: 10 }}>
                  <View style={{ flexDirection: 'row-reverse', gap: 10 }}>
                    <View style={[styles.inputBox, { flex: 1, backgroundColor: '#f1f5f9', borderColor: '#e2e8f0', justifyContent: 'center' }]}>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#8296B1', marginBottom: 2, fontWeight: '700' }}>بعد الجلسة السابقة</Text>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 4 }}>
                          <Text style={[styles.input, { color: '#193B6B', flex: 0, textAlign: 'center' }]}>{prevWeightAfter}</Text>
                          <Text style={styles.unitLabel}>كجم</Text>
                        </View>
                      </View>
                    </View>

                    <View style={[styles.inputBox, { flex: 1, backgroundColor: '#E9FAFB', borderColor: '#BCEFF3', justifyContent: 'center' }]}>
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#26CDD6', marginBottom: 2, fontWeight: '700' }}>قبل الجلسة الحالية</Text>
                        <View style={{ flexDirection: 'row-reverse', alignItems: 'flex-end', gap: 4 }}>
                          <Text style={[styles.input, { color: '#26CDD6', flex: 0, textAlign: 'center' }]}>{currWeightBefore}</Text>
                          <Text style={styles.unitLabel}>كجم</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.inputBox, form[f.key] ? { borderColor: f.color } : {}]}>
                    <Text style={styles.unitLabel}>{f.unit}</Text>
                    <TextInput
                      style={styles.input}
                      placeholder={f.placeholder}
                      placeholderTextColor="#8296B1"
                      keyboardType="numeric"
                      value={form[f.key]}
                      onChangeText={t => setField(f.key, t)}
                      allowFontScaling={false}
                    />
                  </View>
                </View>

                {monthlyAverageUF !== null && (
                  <View style={styles.monthlyAvgBox}>
                    <MaterialCommunityIcons name="calculator-variant-outline" size={16} color="#26CDD6" />
                    <Text style={styles.monthlyAvgText}>معدل السحب لآخر شهر: {monthlyAverageUF} لتر</Text>
                  </View>
                )}
              </View>
            );
          }

          return (
            <View key={f.key} style={styles.fieldWrap}>
              <View style={styles.fieldLabelRow}>
                <Text style={styles.fieldHint}>{f.hint}</Text>
                <View style={styles.fieldLabelLeft}>
                  <MaterialCommunityIcons name={f.icon} size={16} color={f.color} />
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                </View>
              </View>
              <View style={[styles.inputBox, form[f.key] ? { borderColor: f.color } : {}]}>
                <Text style={styles.unitLabel}>{f.unit}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor="#8296B1"
                  keyboardType="numeric"
                  value={form[f.key]}
                  onChangeText={t => setField(f.key, t)}
                />
              </View>
            </View>
          );
        })}

        <Pressable
          style={[styles.saveBtn, isSubmitting && { backgroundColor: '#BCEFF3' }]}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : (
            <>
              <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>{saved ? t.deviceSettings.update : t.deviceSettings.save}</Text>
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
  container: { flex: 1, backgroundColor: '#F1FCFD' },
  content: { padding: 16, paddingBottom: 40 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#193B6B', textAlign: 'right', marginBottom: 16 },
  savedCard: { backgroundColor: '#193B6B', borderRadius: 18, padding: 18, marginBottom: 16, elevation: 4 },
  savedHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  activeBadge: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#26CDD6' },
  activeText: { color: '#8296B1', fontSize: 12, fontWeight: '700' },
  deleteBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 5, backgroundColor: '#ffffff15', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  deleteBtnText: { color: '#DE1A1C', fontWeight: '700', fontSize: 13 },
  savedValues: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center' },
  valuesDivider: { width: 1, height: 60, backgroundColor: '#193B6B' },
  valueItem: { alignItems: 'center', gap: 5, flex: 1 },
  valueBig: { fontSize: 24, fontWeight: '900' },
  valueUnit: { fontSize: 10, color: '#8296B1', fontWeight: '700' },
  valueLabel: { fontSize: 11, color: '#8296B1', fontWeight: '600', textAlign: 'center' },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', marginBottom: 16, gap: 6, borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed' },
  emptyText: { fontSize: 15, color: '#8296B1', fontWeight: '700' },
  emptySub: { fontSize: 12, color: '#8296B1' },
  formCard: { backgroundColor: '#fff', borderRadius: 18, padding: 18, elevation: 2, borderTopWidth: 3, borderTopColor: '#26CDD6' },
  formTitle: { fontSize: 15, fontWeight: '800', color: '#193B6B', textAlign: 'right', marginBottom: 16 },
  fieldWrap: { marginBottom: 16 },
  fieldLabelRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fieldLabelLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#193B6B' },
  fieldHint: { fontSize: 11, color: '#8296B1', fontWeight: '500' },
  inputBox: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f9fafb', borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, minHeight: 52, paddingVertical: 4 },
  input: { flex: 1, textAlign: 'right', fontSize: 17, color: '#193B6B', fontWeight: '700' },
  unitLabel: { color: '#8296B1', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  saveBtn: { backgroundColor: '#26CDD6', borderRadius: 12, minHeight: 52, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  monthlyAvgBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#E9FAFB',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: '#BCEFF3',
  },
  monthlyAvgText: {
    fontSize: 12,
    color: '#26CDD6',
    fontWeight: '700'
  },
});

