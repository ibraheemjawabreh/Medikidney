import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, StyleSheet,
  Alert, Pressable, ActivityIndicator, Platform,
} from 'react-native';
import api from "../../services/api";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLanguage } from '../../context/LanguageContext';

const validateWeight = (val, fieldName, required = true) => {
  if (!val || val.trim() === '') {
    return required ? `${fieldName} مطلوب` : null;
  }
  const num = parseFloat(val);
  if (isNaN(num)) return `${fieldName} يجب أن يكون رقماً صحيحاً`;
  if (num < 20 || num > 300) return `${fieldName} يجب أن يكون بين 20 و 300 كغ`;
  return null;
};

const formatDateTime = (dateStr, t) => {
  if (!dateStr) return { time: t.unknown, ago: "" };
  const date = new Date(dateStr);
  const now = new Date();

  const locale = t.vitalSigns.now === 'الآن' ? 'ar-SA' : 'en-US';
  const time = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);

  let ago = "";
  if (diffMin < 1) ago = t.vitalSigns.now;
  else if (diffMin < 60) ago = t.vitalSigns.minutesAgo.replace('{n}', diffMin);
  else if (diffMin < 120) ago = t.vitalSigns.hourAgo;
  else if (diffMin < 1440) ago = t.vitalSigns.hoursAgo.replace('{n}', Math.floor(diffMin / 60));
  else ago = t.vitalSigns.dayAgo.replace('{n}', Math.floor(diffMin / 1440));

  return { time, ago };
};

const getBpStatus = (sys, dia, t) => {
  if (sys > 140 || dia > 90) return { label: t.vitalSigns.status.high, color: "#DE1A1C", bg: "#FBEAEA" };
  if (sys < 90 || dia < 60) return { label: t.vitalSigns.status.low, color: "#A32D2F", bg: "#FBEAEA" };
  return { label: t.vitalSigns.status.normal, color: "#26CDD6", bg: "#E9FAFB" };
};

const VitalCard = ({ item, index, totalCount, onDelete, t }) => {
  const vitalId = item.vital_id || item.id;
  const { time, ago } = formatDateTime(item.recorded_at || item.createdAt, t);
  const bpStatus = getBpStatus(item.systolic, item.diastolic, t);
  const readingNumber = totalCount - index; 

  return (
    <View style={cardStyles.wrap}>

      <View style={cardStyles.header}>

        <View style={cardStyles.headerRight}>
          <View style={cardStyles.readingBadge}>
            <Text style={cardStyles.readingNum}>#{readingNumber}</Text>
          </View>
          <View>
            <Text style={cardStyles.timeText}>{time}</Text>
            <Text style={cardStyles.agoText}>{ago}</Text>
          </View>
        </View>

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
            <MaterialCommunityIcons name="trash-can-outline" size={17} color="#DE1A1C" />
          </Pressable>
        </View>
      </View>

      <View style={cardStyles.values}>

        <View style={cardStyles.valueBox}>
          <View style={cardStyles.bpRow}>
            <Text style={[cardStyles.bigNum, { color: '#26CDD6' }]}>{item.diastolic}</Text>
            <Text style={cardStyles.slash}>/</Text>
            <Text style={[cardStyles.bigNum, { color: '#DE1A1C' }]}>{item.systolic}</Text>
          </View>
          <Text style={cardStyles.unit}>mmHg ضغط الدم</Text>
        </View>

        <View style={cardStyles.divider} />

        <View style={cardStyles.valueBox}>
          <Text style={[cardStyles.bigNum, { color: '#A32D2F' }]}>{item.pulse}</Text>
          <Text style={cardStyles.unit}>bpm نبض</Text>
        </View>

        <View style={cardStyles.divider} />

        <View style={cardStyles.valueBox}>
          <Text style={[cardStyles.bigNum, { color: '#8296B1' }]}>{item.temperature}</Text>
          <Text style={cardStyles.unit}>°C حرارة</Text>
        </View>

        {item.oxygen_saturation != null && (
          <>
            <View style={cardStyles.divider} />
            <View style={cardStyles.valueBox}>
              <Text style={[cardStyles.bigNum, { color: '#26CDD6' }]}>{item.oxygen_saturation}</Text>
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
  headerLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },

  readingBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#193B6B', alignItems: 'center', justifyContent: 'center',
  },
  readingNum: { color: '#fff', fontSize: 12, fontWeight: '800' },

  timeText: { fontSize: 13, fontWeight: '700', color: '#193B6B', textAlign: 'right' },
  agoText: { fontSize: 11, color: '#8296B1', textAlign: 'right', marginTop: 1 },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },

  deleteBtn: { padding: 5, backgroundColor: '#FBEAEA', borderRadius: 8 },

  values: {
    flexDirection: 'row-reverse', paddingHorizontal: 14, paddingVertical: 14,
    justifyContent: 'space-around', alignItems: 'center',
  },
  valueBox: { alignItems: 'center', gap: 4, flex: 1 },
  bpRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 2 },
  bigNum: { fontSize: 20, fontWeight: '800', color: '#193B6B' },
  slash: { fontSize: 18, color: '#d1d5db', marginHorizontal: 2 },
  unit: { fontSize: 10, color: '#8296B1', fontWeight: '600', textAlign: 'center' },
  divider: { width: 1, height: 40, backgroundColor: '#f1f5f9' },
});

const VitalSignsTab = ({ route }) => {
  const { t } = useLanguage();
  const sessionId = route?.params?.sessionId;

  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vitals, setVitals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    systolic: '120', diastolic: '80', pulse: '72', temperature: '36.5', oxygen: '98',
  });

  const fetchVitals = async () => {
    if (!sessionId) return;
    try {
      const { data } = await api.get(
        `/dialysis-sessions/${sessionId}/details/vital-signs`
      );
      const list = Array.isArray(data) ? data : data?.data || [];
      
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

  const handleSave = async () => {
    const { systolic, diastolic, pulse, temperature } = form;
    if (!systolic || !diastolic || !pulse || !temperature)
      return Alert.alert(t.error, t.vitalSigns.fillRequired);

    try {
      setIsSubmitting(true);
      await api.post(
        `/dialysis-sessions/${sessionId}/details/vital-signs`,
        {
          systolic: Number(systolic),
          diastolic: Number(diastolic),
          pulse: Number(pulse),
          temperature: Number(temperature),
          oxygenSaturation: form.oxygen ? Number(form.oxygen) : null,
        }
      );
      Alert.alert(t.success, t.vitalSigns.saveSuccess);
      setForm({ systolic: '120', diastolic: '80', pulse: '72', temperature: '36.5', oxygen: '98' });
      setShowForm(false);
      fetchVitals();
    } catch (err) {
      console.log("Save error:", err.response?.data);
      Alert.alert(t.error, t.vitalSigns.saveFailed);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (vitalId) => {
    const numericId = parseInt(vitalId, 10);
    if (isNaN(numericId)) return;

    const confirmed = Platform.OS === 'web'
      ? window.confirm(t.vitalSigns.deleteConfirmMsg)
      : await new Promise(resolve => {
        Alert.alert(
          t.vitalSigns.deleteConfirmTitle,
          t.vitalSigns.deleteConfirmMsg,
          [
            { text: t.cancel, onPress: () => resolve(false), style: "cancel" },
            { text: t.vitalSigns.deleteConfirmTitle.replace('تأكيد ', ''), onPress: () => resolve(true), style: "destructive" },
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
      Platform.OS === 'web' ? alert(t.vitalSigns.deleteFailed) : Alert.alert(t.error, t.vitalSigns.deleteFailed);
    }
  };

  const setField = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

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
            {showForm ? t.cancel : t.vitalSigns.newReading}
          </Text>
        </Pressable>
        <Text style={styles.pageTitle}>{t.vitalSigns.title}</Text>
      </View>

      {vitals.length > 0 && !showForm && (
        <View style={styles.latestCard}>
          <Text style={styles.latestLabel}>{t.vitalSigns.latestReading}</Text>
          <View style={styles.latestRow}>
            <View style={styles.latestItem}>
              <Text style={styles.latestVal}>
                <Text style={{ color: '#F2A0A1' }}>{vitals[0].systolic}</Text>
                <Text style={{ color: '#ffffff60' }}>/</Text>
                <Text style={{ color: '#BCEFF3' }}>{vitals[0].diastolic}</Text>
              </Text>
              <Text style={styles.latestUnit}>mmHg</Text>
            </View>
            <View style={styles.latestDivider} />
            <View style={styles.latestItem}>
              <Text style={[styles.latestVal, { color: '#BCEFF3' }]}>{vitals[0].pulse}</Text>
              <Text style={styles.latestUnit}>bpm</Text>
            </View>
            <View style={styles.latestDivider} />
            <View style={styles.latestItem}>
              <Text style={[styles.latestVal, { color: '#BCEFF3' }]}>{vitals[0].temperature}°</Text>
              <Text style={styles.latestUnit}>°C</Text>
            </View>
            {vitals[0].oxygen_saturation != null && (
              <>
                <View style={styles.latestDivider} />
                <View style={styles.latestItem}>
                  <Text style={[styles.latestVal, { color: '#BCEFF3' }]}>{vitals[0].oxygen_saturation}%</Text>
                  <Text style={styles.latestUnit}>O₂</Text>
                </View>
              </>
            )}
          </View>
          <Text style={styles.latestTime}>
            {formatDateTime(vitals[0].recorded_at || vitals[0].createdAt, t).ago}
          </Text>
        </View>
      )}

      {showForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{t.vitalSigns.recordReading}</Text>

          <Text style={styles.fieldLabel}>{t.vitalSigns.bloodPressure}</Text>
          <View style={styles.bpRow}>
            <View style={[styles.inputBox, { flex: 1 }]}>
              <Text style={styles.bpTag}>SYS</Text>
              <TextInput
                style={styles.inp} placeholder="120"
                placeholderTextColor="#8296B1"
                keyboardType="numeric" value={form.systolic}
                onChangeText={t => setField('systolic', t)}
                allowFontScaling={false}
              />
            </View>
            <Text style={styles.bpSlash}>/</Text>
            <View style={[styles.inputBox, { flex: 1 }]}>
              <Text style={styles.bpTag}>DIA</Text>
              <TextInput
                style={styles.inp} placeholder="80"
                placeholderTextColor="#8296B1"
                keyboardType="numeric" value={form.diastolic}
                onChangeText={t => setField('diastolic', t)}
                allowFontScaling={false}
              />
            </View>
          </View>

          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{t.vitalSigns.pulse}</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="pulse" size={16} color="#A32D2F" style={{ marginLeft: 4 }} />
                <TextInput
                  style={styles.inp} placeholder="72"
                  placeholderTextColor="#8296B1"
                  keyboardType="numeric" value={form.pulse}
                  onChangeText={t => setField('pulse', t)}
                  allowFontScaling={false}
                />
              </View>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>{t.vitalSigns.temperature}</Text>
              <View style={styles.inputBox}>
                <MaterialCommunityIcons name="thermometer" size={16} color="#8296B1" style={{ marginLeft: 4 }} />
                <TextInput
                  style={styles.inp} placeholder="36.5"
                  placeholderTextColor="#8296B1"
                  keyboardType="numeric" value={form.temperature}
                  onChangeText={t => setField('temperature', t)}
                  allowFontScaling={false}
                />
              </View>
            </View>
          </View>

          <Text style={styles.fieldLabel}>{t.vitalSigns.oxygen}</Text>
          <View style={styles.inputBox}>
            <MaterialCommunityIcons name="water-percent" size={16} color="#26CDD6" style={{ marginLeft: 4 }} />
            <TextInput
              style={styles.inp} placeholder="98"
              placeholderTextColor="#8296B1"
              keyboardType="numeric" value={form.oxygen}
              onChangeText={t => setField('oxygen', t)}
              allowFontScaling={false}
            />
            <Text style={styles.suffix}>%</Text>
          </View>

          <Pressable
            style={[styles.saveBtn, isSubmitting && { backgroundColor: '#BCEFF3' }]}
            onPress={handleSave} disabled={isSubmitting}
          >
            {isSubmitting
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.saveBtnText}>{t.vitalSigns.saveReading}</Text>
            }
          </Pressable>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color="#26CDD6" style={{ marginTop: 30 }} />
      ) : vitals.length === 0 ? (
        <View style={styles.emptyBox}>
          <MaterialCommunityIcons name="heart-pulse" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>{t.vitalSigns.noReadings}</Text>
          <Text style={styles.emptySub}>{t.vitalSigns.noReadingsSub}</Text>
        </View>
      ) : (
        <>
          <Text style={styles.historyLabel}>
            {t.vitalSigns.fullRecord} ({vitals.length} {t.vitalSigns.readings})
          </Text>
          {vitals.map((item, i) => (
            <VitalCard
              key={item.vital_id || item.id || i}
              item={item}
              index={i}
              totalCount={vitals.length}
              onDelete={handleDelete}
              t={t}
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
  container: { flex: 1, backgroundColor: '#F1FCFD' },
  content: { padding: 16, paddingBottom: 40 },

  topBar: {
    flexDirection: 'row-reverse', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  pageTitle: { fontSize: 18, fontWeight: '800', color: '#193B6B' },
  addBtn: {
    flexDirection: 'row-reverse', alignItems: 'center', gap: 6,
    backgroundColor: '#26CDD6', paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnActive: { backgroundColor: '#DE1A1C' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  latestCard: {
    backgroundColor: '#193B6B', borderRadius: 16, padding: 16,
    marginBottom: 16, elevation: 2,
  },
  latestLabel: { color: '#BCEFF3', fontSize: 11, fontWeight: '700', textAlign: 'right', marginBottom: 10 },
  latestRow: { flexDirection: 'row-reverse', justifyContent: 'space-around', alignItems: 'center' },
  latestItem: { alignItems: 'center', gap: 3 },
  latestVal: { fontSize: 22, fontWeight: '800', color: '#fff' },
  latestUnit: { fontSize: 10, color: '#BCEFF3', fontWeight: '600' },
  latestDivider: { width: 1, height: 36, backgroundColor: '#ffffff20' },
  latestTime: { color: '#BCEFF3', fontSize: 11, textAlign: 'left', marginTop: 10 },

  formCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18,
    marginBottom: 16, elevation: 2,
    borderTopWidth: 3, borderTopColor: '#26CDD6',
  },
  formTitle: { fontSize: 15, fontWeight: '800', color: '#193B6B', textAlign: 'right', marginBottom: 16 },
  fieldLabel: { textAlign: 'right', color: '#193B6B', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },

  bpRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  bpSlash: { fontSize: 24, color: '#d1d5db', lineHeight: 50 },
  bpTag: { fontSize: 11, color: '#8296B1', fontWeight: '800', marginLeft: 4, minWidth: 24, textAlign: 'center' },
  twoCol: { flexDirection: 'row-reverse', marginTop: 4 },

  inputBox: {
    flexDirection: 'row-reverse', alignItems: 'center',
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    borderRadius: 10, paddingHorizontal: 10, minHeight: 48, paddingVertical: 4,
  },
  inp: {
    flex: 1, textAlign: 'right', fontSize: 16,
    color: '#193B6B', fontWeight: '600',
  },
  suffix: { color: '#8296B1', fontSize: 12, fontWeight: '700' },

  saveBtn: {
    backgroundColor: '#26CDD6', padding: 14, borderRadius: 10,
    alignItems: 'center', marginTop: 18, minHeight: 50, justifyContent: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  historyLabel: {
    textAlign: 'right', fontSize: 14, fontWeight: '800',
    color: '#193B6B', marginBottom: 12,
  },

  emptyBox: { alignItems: 'center', paddingTop: 40, gap: 8 },
  emptyText: { fontSize: 15, color: '#8296B1', fontWeight: '700' },
  emptySub: { fontSize: 12, color: '#8296B1' },
});