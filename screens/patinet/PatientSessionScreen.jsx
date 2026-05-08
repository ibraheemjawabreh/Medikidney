// screens/patinet/PatientSessionScreen.jsx
// شاشة المريض أثناء الجلسة: تايمر حي + lock screen لإدخال الوزن بعد الجلسة

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ActivityIndicator, Alert, StatusBar, BackHandler,
  Vibration, Platform,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

// ── Validation ────────────────────────────────────────────────────────────────
const validateWeight = (val, t) => {
  if (!val || val.trim() === '') return t.patientSessionScreen.weightRequired;
  const num = parseFloat(val);
  if (isNaN(num)) return t.patientSessionScreen.invalidNumber;
  if (num < 20 || num > 300) return t.patientSessionScreen.invalidRange;
  return null;
};

// ── تنسيق الوقت (ساعات:دقائق:ثوانٍ) ─────────────────────────────────────────
const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return [
    h > 0 ? String(h).padStart(2, '0') : null,
    String(m).padStart(2, '0'),
    String(s).padStart(2, '0'),
  ].filter(Boolean).join(':');
};

// ── المكوّن الرئيسي ───────────────────────────────────────────────────────────
const PatientSessionScreen = ({ route, navigation }) => {
  const { t } = useLanguage();
  const { sessionId, patientName, startTime } = route.params || {};

  // ── حالة الجلسة ──
  const [sessionData, setSessionData] = useState(null);
  const [phase, setPhase] = useState('IN_SESSION'); // IN_SESSION | WEIGHT_INPUT | DONE
  const [elapsed, setElapsed] = useState(0);

  // ── وزن بعد الجلسة ──
  const [weightAfter, setWeightAfter] = useState('');
  const [weightError, setWeightError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [weightBefore, setWeightBefore] = useState(null);

  // ── Timer ──
  const timerRef = useRef(null);
  const reminderRef = useRef(null);

  // ── جلب بيانات الجلسة ──────────────────────────────────────────────────────
  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      const { data } = await api.get(`/dialysis-sessions/${sessionId}`);
      setSessionData(data);
      if (data?.weight_before != null) setWeightBefore(data.weight_before);

      // إذا كانت الجلسة منتهية بالفعل
      if (data?.status === 'COMPLETED') {
        // التحقق: هل الممرض أدخل الوزن بعد الجلسة؟
        if (data?.weight_after != null) {
          // ✅ الممرض أدخل الوزن → المريض لا يحتاج يدخل شي
          setPhase('DONE');
        } else {
          // ⚠️ الممرض تخطى الوزن → المريض مُلزم بإدخال الوزن
          // نتحقق أولاً إذا المريض سبق وأدخل الوزن
          const alreadyEntered = await AsyncStorage.getItem(`weight_entered_${sessionId}`);
          if (alreadyEntered) {
            setPhase('DONE');
          } else {
            setPhase('WEIGHT_INPUT');
          }
        }
      }
    } catch (err) {
      console.log('fetchSession err:', err.message);
    }
  }, [sessionId]);

  useFocusEffect(useCallback(() => { fetchSession(); }, [fetchSession]));

  // ── التايمر ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'IN_SESSION') {
      clearInterval(timerRef.current);
      return;
    }

    // حساب الوقت المنقضي من وقت بداية الجلسة
    const startTimestamp =
      startTime && !Number.isNaN(new Date(startTime).getTime())
        ? new Date(startTime).getTime()
        : sessionData?.created_at
          ? new Date(sessionData.created_at).getTime()
          : null;
    const base = startTimestamp
      ? Math.floor((Date.now() - startTimestamp) / 1000)
      : 0;
    setElapsed(Math.max(0, base));

    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [phase, sessionData?.created_at, startTime]);

  // ── تنبيه الوزن بعد ساعتين ────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'IN_SESSION') return;

    // تذكير بعد ساعتين (7200 ثانية)
    reminderRef.current = setTimeout(() => {
      if (phase === 'IN_SESSION') {
        Vibration.vibrate([500, 500, 500]);
        Alert.alert(
          t.patientSessionScreen.alertTitle,
          t.patientSessionScreen.alertMessage,
          [{ text: t.patientSessionScreen.ok, onPress: () => setPhase('WEIGHT_INPUT') }]
        );
      }
    }, 7200 * 1000);

    return () => clearTimeout(reminderRef.current);
  }, [phase]);

  // ── منع الرجوع للخلف أثناء إدخال الوزن (lock) ────────────────────────────
  useEffect(() => {
    if (phase !== 'WEIGHT_INPUT') return;

    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      Alert.alert(t.patientSessionScreen.lockAlertTitle, t.patientSessionScreen.lockAlertMessage);
      return true; // يمنع الرجوع
    });

    return () => handler.remove();
  }, [phase]);

  // ── انتهاء الجلسة → الانتقال لإدخال الوزن ──────────────────────────────
  const handleSessionEnd = () => {
    clearInterval(timerRef.current);
    setPhase('WEIGHT_INPUT');
    Vibration.vibrate(300);
  };

  // ── حفظ الوزن بعد الجلسة ──────────────────────────────────────────────────
  const handleSaveWeight = async () => {
    const err = validateWeight(weightAfter, t);
    if (err) { setWeightError(err); return; }
    setWeightError(null);

    try {
      setIsSaving(true);

      // تحديد البيانات حسب حالة الجلسة
      const body = {};
      if (sessionData?.status !== 'COMPLETED') {
        // المريض ينهي الجلسة بنفسه (الممرض ما أنهاها)
        body.status = 'COMPLETED';
      }
      body.weightAfter = parseFloat(weightAfter);

      await api.patch(`/dialysis-sessions/${sessionId}/status`, body);

      // حفظ في AsyncStorage أن المريض أدخل وزنه
      await AsyncStorage.setItem(`weight_entered_${sessionId}`, '1');

      setPhase('DONE');
      Alert.alert(t.patientSessionScreen.saveSuccessTitle, t.patientSessionScreen.saveSuccessMessage);
    } catch (err) {
      console.log('Save weight err:', err.response?.data);
      Alert.alert(t.patientSessionScreen.saveErrorTitle, t.patientSessionScreen.saveErrorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // ── انتهاء كل شيء ──────────────────────────────────────────────────────────
  const handleDone = () => {
    navigation.goBack();
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // ── مرحلة انتهاء الجلسة (done) ──────────────────────────────────────────
  if (phase === 'DONE') {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" backgroundColor="#059669" />
        <View style={styles.doneCard}>
          <MaterialCommunityIcons name="check-decagram" size={80} color="#059669" />
          <Text style={styles.doneTitle}>{t.patientSessionScreen.doneTitle}</Text>
          <Text style={styles.doneSub}>{t.patientSessionScreen.doneSub}</Text>
          {sessionData?.weight_before != null && (
            <View style={styles.doneSummary}>
              <View style={styles.doneSummaryRow}>
                <Text style={styles.doneSummaryVal}>{sessionData.weight_before} kg</Text>
                <Text style={styles.doneSummaryLabel}>{t.patientSessionScreen.weightBefore}</Text>
              </View>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#94a3b8" />
              <View style={styles.doneSummaryRow}>
                <Text style={[styles.doneSummaryVal, { color: '#059669' }]}>
                  {(sessionData?.weight_after ?? weightAfter) || '—'} kg
                </Text>
                <Text style={styles.doneSummaryLabel}>{t.patientSessionScreen.weightAfter}</Text>
              </View>
            </View>
          )}
          <Pressable style={styles.doneBtn} onPress={handleDone}>
            <Text style={styles.doneBtnText}>{t.patientSessionScreen.returnHome}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── مرحلة إدخال الوزن (lock screen) ─────────────────────────────────────
  if (phase === 'WEIGHT_INPUT') {
    return (
      <View style={styles.lockScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#1e293b" />

        {/* الرأس */}
        <View style={styles.lockHeader}>
          <MaterialCommunityIcons name="lock" size={32} color="#f59e0b" />
          <Text style={styles.lockTitle}>{t.patientSessionScreen.lockTitle}</Text>
          <Text style={styles.lockSub}>
            {t.patientSessionScreen.lockSub}
          </Text>
        </View>

        {/* معلومات الوزن قبل */}
        {weightBefore != null && (
          <View style={styles.lockWeightBefore}>
            <Text style={styles.lockWeightBeforeLabel}>{t.patientSessionScreen.weightBeforeLabel}</Text>
            <Text style={styles.lockWeightBeforeVal}>{weightBefore} kg</Text>
          </View>
        )}

        {/* مربع الإدخال */}
        <View style={styles.lockInputCard}>
          <Text style={styles.lockInputTitle}>{t.patientSessionScreen.weightNowLabel}</Text>
          <View style={[styles.lockInputRow, weightError && styles.lockInputErr]}>
            <MaterialCommunityIcons name="scale" size={24} color="#3b82f6" />
            <TextInput
              style={styles.lockInput}
              placeholder={t.patientSessionScreen.weightPlaceholder}
              placeholderTextColor="#94a3b8"
              keyboardType="decimal-pad"
              value={weightAfter}
              onChangeText={t => {
                setWeightAfter(t);
                setWeightError(null);
              }}
              autoFocus
            />
            <Text style={styles.lockUnit}>kg</Text>
          </View>
          {weightError && (
            <Text style={styles.lockErrText}>{weightError}</Text>
          )}

          {/* حساب الفرق التقريبي */}
          {weightBefore != null && weightAfter && !isNaN(parseFloat(weightAfter)) && (
            <View style={styles.lockDiff}>
              <Text style={styles.lockDiffLabel}>{t.patientSessionScreen.fluidRemoved}</Text>
              <Text style={styles.lockDiffVal}>
                {Math.abs(weightBefore - parseFloat(weightAfter)).toFixed(1)} لتر
              </Text>
            </View>
          )}

          <Pressable
            style={[styles.lockSaveBtn, isSaving && { backgroundColor: '#6ee7b7' }]}
            onPress={handleSaveWeight}
            disabled={isSaving}
          >
            {isSaving
              ? <ActivityIndicator color="#fff" size="small" />
              : <>
                <MaterialCommunityIcons name="content-save-check" size={20} color="#fff" />
                <Text style={styles.lockSaveBtnText}>{t.patientSessionScreen.saveBtn}</Text>
              </>
            }
          </Pressable>
        </View>
      </View>
    );
  }

  // ── مرحلة الجلسة الجارية ─────────────────────────────────────────────────
  return (
    <View style={styles.sessionScreen}>
      <StatusBar barStyle="light-content" backgroundColor="#065f46" />

      {/* Header */}
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionPatient}>{patientName || t.patientSessionScreen.sessionTitle}</Text>
        <Text style={styles.sessionSub}>{t.patientSessionScreen.sessionSub}</Text>
      </View>

      {/* التايمر */}
      <View style={styles.timerCard}>
        <View style={styles.timerCircle}>
          <MaterialCommunityIcons name="water-sync" size={36} color="#34d399" style={{ marginBottom: 8 }} />
          <Text style={styles.timerText}>{formatDuration(elapsed)}</Text>
          <Text style={styles.timerLabel}>{t.patientSessionScreen.sessionTimeLabel}</Text>
        </View>

        {/* نبضة متحركة */}
        <View style={styles.pulseRing} />
      </View>

      {weightBefore != null && (
        <View style={styles.weightBeforeCard}>
          <MaterialCommunityIcons name="scale" size={20} color="#3b82f6" />
          <Text style={styles.weightBeforeText}>
            {t.patientSessionScreen.weightBeforeLabel}: <Text style={{ fontWeight: '800', color: '#3b82f6' }}>{weightBefore} kg</Text>
          </Text>
        </View>
      )}

      <View style={styles.infoCard}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#94a3b8" />
        <Text style={styles.infoText}>
          {t.patientSessionScreen.infoText}
        </Text>
      </View>

      {/* زر العودة */}
      <View style={styles.sessionFooter}>
        <Pressable style={[styles.endBtn, { backgroundColor: '#334155' }]} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
          <Text style={styles.endBtnText}>{t.patientSessionScreen.returnBtn}</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default PatientSessionScreen;

const styles = StyleSheet.create({
  // ── IN_SESSION ──────────────────────────────────────────────────────────────
  sessionScreen: { flex: 1, backgroundColor: '#ecfdf5' },
  sessionHeader: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  sessionPatient: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center' },
  sessionSub: { fontSize: 14, color: '#a7f3d0', marginTop: 4 },

  timerCard: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    position: 'relative',
  },
  timerCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 4,
    borderColor: '#34d399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: { fontSize: 13, color: '#6ee7b7', marginTop: 4 },
  pulseRing: {
    position: 'absolute',
    width: 216,
    height: 216,
    borderRadius: 108,
    borderWidth: 2,
    borderColor: 'rgba(52,211,153,0.3)',
  },

  weightBeforeCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginHorizontal: 24,
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
  },
  weightBeforeText: { fontSize: 15, color: '#fff', textAlign: 'right' },

  infoCard: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: 24,
    padding: 14,
    borderRadius: 14,
  },
  infoText: { flex: 1, fontSize: 13, color: '#a7f3d0', textAlign: 'right', lineHeight: 20 },

  sessionFooter: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    padding: 24,
    paddingBottom: 36,
  },
  endBtn: {
    backgroundColor: '#dc2626',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    elevation: 4,
  },
  endBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' },

  // ── WEIGHT_INPUT (lock screen) ───────────────────────────────────────────────
  lockScreen: { flex: 1, backgroundColor: '#1e293b', padding: 24 },
  lockHeader: { alignItems: 'center', paddingTop: 60, marginBottom: 30 },
  lockTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginTop: 16, textAlign: 'center' },
  lockSub: { fontSize: 13, color: '#f59e0b', marginTop: 8, textAlign: 'center', lineHeight: 20 },

  lockWeightBefore: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  lockWeightBeforeLabel: { color: '#94a3b8', fontSize: 13 },
  lockWeightBeforeVal: { color: '#3b82f6', fontSize: 20, fontWeight: '800' },

  lockInputCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    elevation: 6,
  },
  lockInputTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', textAlign: 'right', marginBottom: 12 },
  lockInputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 58,
    gap: 10,
  },
  lockInputErr: { borderColor: '#ef4444' },
  lockInput: { flex: 1, textAlign: 'right', fontSize: 22, fontWeight: '700', color: '#1e293b' },
  lockUnit: { color: '#94a3b8', fontSize: 14, fontWeight: '700' },
  lockErrText: { color: '#ef4444', fontSize: 12, textAlign: 'right', marginTop: 6, fontWeight: '600' },

  lockDiff: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
  },
  lockDiffLabel: { fontSize: 12, color: '#166534' },
  lockDiffVal: { fontSize: 18, fontWeight: '800', color: '#059669' },

  lockSaveBtn: {
    backgroundColor: '#059669',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    marginTop: 20,
    elevation: 3,
  },
  lockSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  // ── DONE ──────────────────────────────────────────────────────────────────────
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0fdf4', padding: 24 },
  doneCard: { backgroundColor: '#fff', borderRadius: 24, padding: 30, alignItems: 'center', elevation: 6, width: '100%' },
  doneTitle: { fontSize: 24, fontWeight: '900', color: '#059669', marginTop: 16, textAlign: 'center' },
  doneSub: { fontSize: 14, color: '#64748b', marginTop: 8, textAlign: 'center' },

  doneSummary: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
    width: '100%',
  },
  doneSummaryRow: { alignItems: 'center', gap: 4 },
  doneSummaryVal: { fontSize: 22, fontWeight: '800', color: '#1e293b' },
  doneSummaryLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600' },

  doneBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    marginTop: 24,
  },
  doneBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
