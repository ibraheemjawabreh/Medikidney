import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  Alert, ActivityIndicator, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VitalSignsTab from './VitalSignsTab';
import MedicationsTab from './MedicationsTab';
import SettingsTab from './SettingsTab';
import SymptomsTab from './SymptomsTab';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const SessionDetails = ({ route, navigation }) => {
  const { patient } = route.params;
  const sessionId = patient.sessionId;
  const { t } = useLanguage();

  const [step, setStep] = useState(1);

  const steps = [
    { id: 1, title: t.sessionDetails.steps.vitals, component: <VitalSignsTab route={{ params: { sessionId } }} /> },
    { id: 2, title: t.sessionDetails.steps.settings, component: <SettingsTab route={{ params: { sessionId } }} /> },
    { id: 3, title: t.sessionDetails.steps.medications, component: <MedicationsTab route={{ params: { sessionId } }} /> },
    { id: 4, title: t.sessionDetails.steps.symptoms, component: <SymptomsTab route={{ params: { sessionId } }} /> },
  ];

  const currentStepData = steps.find(s => s.id === step);
  const [isFinishing, setIsFinishing] = useState(false);

  // ─── Modal إنهاء الجلسة ───────────────────────────────────
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [endModalPhase, setEndModalPhase] = useState('choice'); // 'choice' | 'weight_input'
  const [weightAfter, setWeightAfter] = useState('');
  const [weightInputError, setWeightInputError] = useState('');

  React.useEffect(() => {
    const loadStep = async () => {
      try {
        const savedStep = await AsyncStorage.getItem(`step_${sessionId}`);
        if (savedStep) {
          setStep(parseInt(savedStep, 10));
        }
      } catch (e) {
        console.log("Error loading step:", e);
      }
    };
    loadStep();
  }, [sessionId]);

  const changeStep = async (newStep) => {
    setStep(newStep);
    try {
      await AsyncStorage.setItem(`step_${sessionId}`, newStep.toString());
    } catch (e) {
      console.log("Error saving step:", e);
    }
  };

  // ─── فتح Modal إنهاء الجلسة ───────────────────────────────
  const handleOpenEndModal = () => {
    setEndModalPhase('choice');
    setWeightAfter('');
    setWeightInputError('');
    setEndModalVisible(true);
  };

  // ─── إنهاء الجلسة مع الوزن ────────────────────────────────
  const handleFinishWithWeight = async () => {
    // Validation
    const num = parseFloat(weightAfter);
    if (!weightAfter.trim()) {
      setWeightInputError(t.sessionDetails.weightRequired);
      return;
    }
    if (isNaN(num) || num < 20 || num > 300) {
      setWeightInputError(t.sessionDetails.weightInvalid);
      return;
    }
    setWeightInputError('');

    try {
      setIsFinishing(true);
      await api.patch(
        `/dialysis-sessions/${sessionId}/status`,
        { status: "COMPLETED", weightAfter: num }
      );
      await AsyncStorage.removeItem(`step_${sessionId}`);
      setEndModalVisible(false);
      Alert.alert(t.success, t.sessionDetails.sessionEndSuccess);
      navigation.goBack();
    } catch (error) {
      console.log('Error finishing session:', error.response?.data || error.message);
      setWeightInputError(t.sessionDetails.weightSaveFailed);
    } finally {
      setIsFinishing(false);
    }
  };

  // ─── إنهاء الجلسة بدون وزن (تخطي) ────────────────────────
  const handleFinishSkipWeight = async () => {
    try {
      setIsFinishing(true);
      await api.patch(
        `/dialysis-sessions/${sessionId}/status`,
        { status: "COMPLETED" }
      );
      // مسح الخطوة المحفوظة لأن الجلسة انتهت
      await AsyncStorage.removeItem(`step_${sessionId}`);
      setEndModalVisible(false);
      Alert.alert(
        t.sessionDetails.endSession,
        t.sessionDetails.sessionEndSkipSuccess
      );
      navigation.goBack();
    } catch (error) {
      console.log('Error finishing session:', error.response?.data || error.message);
      Alert.alert(t.error, t.sessionDetails.sessionEndError);
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <View style={styles.container}>

      {/* ══════ Modal إنهاء الجلسة ══════════════════════════════ */}
      <Modal
        visible={endModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isFinishing && setEndModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={modalStyles.overlay}
        >
          <View style={modalStyles.sheet}>

            {/* ── مرحلة الاختيار ── */}
            {endModalPhase === 'choice' && (
              <>
                {/* الأيقونة والعنوان */}
                <View style={modalStyles.headerIcon}>
                  <View style={modalStyles.iconCircle}>
                    <MaterialCommunityIcons name="check-circle-outline" size={40} color="#059669" />
                  </View>
                </View>
                <Text style={modalStyles.title}>{t.sessionDetails.endSessionTitle}</Text>
                <Text style={modalStyles.subtitle}>{t.sessionDetails.endSessionSubtitle}</Text>

                {/* زر إدخال الوزن */}
                <Pressable
                  style={modalStyles.optionBtn}
                  onPress={() => setEndModalPhase('weight_input')}
                >
                  <View style={modalStyles.optionIconBox}>
                    <MaterialCommunityIcons name="scale" size={24} color="#3b82f6" />
                  </View>
                  <View style={modalStyles.optionTextBox}>
                    <Text style={modalStyles.optionTitle}>{t.sessionDetails.enterWeightOption}</Text>
                    <Text style={modalStyles.optionDesc}>{t.sessionDetails.enterWeightDesc}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-left" size={22} color="#94a3b8" />
                </Pressable>

                {/* زر التخطي */}
                <Pressable
                  style={[modalStyles.optionBtn, { borderColor: '#fef3c7' }]}
                  onPress={() => {
                    Alert.alert(
                      t.sessionDetails.skipConfirmTitle,
                      t.sessionDetails.skipConfirmMsg,
                      [
                        { text: t.sessionDetails.goBack, style: "cancel" },
                        { text: t.sessionDetails.skipAndEnd, onPress: handleFinishSkipWeight, style: "destructive" },
                      ]
                    );
                  }}
                  disabled={isFinishing}
                >
                  <View style={[modalStyles.optionIconBox, { backgroundColor: '#fffbeb' }]}>
                    <MaterialCommunityIcons name="account-arrow-right" size={24} color="#f59e0b" />
                  </View>
                  <View style={modalStyles.optionTextBox}>
                    <Text style={modalStyles.optionTitle}>{t.sessionDetails.skipWeightOption}</Text>
                    <Text style={modalStyles.optionDesc}>{t.sessionDetails.skipWeightDesc}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-left" size={22} color="#94a3b8" />
                </Pressable>

                {/* زر الإلغاء */}
                <Pressable
                  style={modalStyles.cancelBtn}
                  onPress={() => setEndModalVisible(false)}
                  disabled={isFinishing}
                >
                  <Text style={modalStyles.cancelBtnText}>{t.sessionDetails.goBack}</Text>
                </Pressable>
              </>
            )}

            {/* ── مرحلة إدخال الوزن ── */}
            {endModalPhase === 'weight_input' && (
              <>
                <View style={modalStyles.headerIcon}>
                  <View style={[modalStyles.iconCircle, { backgroundColor: '#eff6ff' }]}>
                    <MaterialCommunityIcons name="scale" size={36} color="#3b82f6" />
                  </View>
                </View>
                <Text style={modalStyles.title}>{t.sessionDetails.weightTitle}</Text>
                {patient?.patientName && (
                  <Text style={modalStyles.patientName}>{patient.patientName}</Text>
                )}

                {/* حقل الإدخال */}
                <View style={[modalStyles.inputRow, weightInputError ? modalStyles.inputErr : null]}>
                  <MaterialCommunityIcons name="scale" size={20} color="#3b82f6" />
                  <TextInput
                    style={modalStyles.input}
                    placeholder="مثال: 72.5"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                    value={weightAfter}
                    onChangeText={t => { setWeightAfter(t); setWeightInputError(''); }}
                    autoFocus
                  />
                  <Text style={modalStyles.unit}>kg</Text>
                </View>
                {weightInputError ? (
                  <Text style={modalStyles.errText}>{weightInputError}</Text>
                ) : null}

                {/* الأزرار */}
                <View style={modalStyles.btnRow}>
                  <Pressable
                    style={modalStyles.backChoiceBtn}
                    onPress={() => { setEndModalPhase('choice'); setWeightInputError(''); }}
                    disabled={isFinishing}
                  >
                    <MaterialCommunityIcons name="arrow-right" size={18} color="#64748b" />
                    <Text style={modalStyles.backChoiceBtnText}>{t.back}</Text>
                  </Pressable>

                  <Pressable
                    style={[modalStyles.confirmBtn, isFinishing && { backgroundColor: '#6ee7b7' }]}
                    onPress={handleFinishWithWeight}
                    disabled={isFinishing}
                  >
                    {isFinishing
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <>
                          <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                          <Text style={modalStyles.confirmBtnText}>{t.sessionDetails.saveAndEnd}</Text>
                        </>
                    }
                  </Pressable>
                </View>
              </>
            )}

          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Header مع مؤشر التقدم */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row-reverse', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
          <Pressable onPress={() => navigation.goBack()} style={{ padding: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10 }}>
            <MaterialCommunityIcons name="arrow-right" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.patientName}>{patient.patientName}</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.stepIndicatorContainer}>
          {steps.map((s) => (
            <View
              key={s.id}
              style={[styles.stepDot, step >= s.id ? styles.activeDot : styles.inactiveDot]}
            />
          ))}
        </View>
        <Text style={styles.stepTitle}>{t.sessionDetails.step} {step}: {currentStepData.title}</Text>
      </View>

      {/* عرض الصفحة الحالية */}
      <View style={{ flex: 1 }}>
        {currentStepData.component}
      </View>

      {/* أزرار التحكم في المراحل + زر إنهاء الجلسة */}
      <View style={styles.footerWrapper}>
        {/* زر إنهاء الجلسة - يظهر فقط في المرحلة الأخيرة (الأعراض) */}
        {step === 4 && (
          <Pressable
            style={styles.endSessionBtn}
            onPress={handleOpenEndModal}
            disabled={isFinishing}
          >
            <MaterialCommunityIcons name="stop-circle-outline" size={20} color="#fff" />
            <Text style={styles.endSessionBtnText}>{t.sessionDetails.endSession}</Text>
          </Pressable>
        )}

        {/* أزرار التنقل بين المراحل */}
        <View style={styles.footer}>
          {step > 1 ? (
            <Pressable style={styles.backBtn} onPress={() => changeStep(step - 1)}>
              <Text style={styles.backBtnText}>{t.sessionDetails.previous}</Text>
            </Pressable>
          ) : <View style={{ flex: 1 }} />}

          {step < 4 ? (
            <Pressable style={styles.nextBtn} onPress={() => changeStep(step + 1)}>
              <Text style={styles.nextBtnText}>{t.sessionDetails.next}</Text>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
            </Pressable>
          ) : <View style={{ flex: 1 }} />}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { backgroundColor: '#065f46', padding: 20, paddingTop: 50, alignItems: 'center' },
  patientName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  stepIndicatorContainer: { flexDirection: 'row-reverse', gap: 8, marginBottom: 10 },
  stepDot: { width: 30, height: 6, borderRadius: 3 },
  activeDot: { backgroundColor: '#34D399' },
  inactiveDot: { backgroundColor: '#064e3b' },
  stepTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  footerWrapper: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 8,
  },
  endSessionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#dc2626',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 13,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  endSessionBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'space-between',
  },
  nextBtn: { backgroundColor: '#2563eb', flexDirection: 'row-reverse', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB' },
  backBtnText: { color: '#4B5563', fontWeight: 'bold' },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  sheet: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },

  // Header
  headerIcon: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  patientName: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },

  // Option buttons
  optionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  optionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextBox: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    textAlign: 'right',
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
  },

  // Cancel
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  cancelBtnText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '700',
  },

  // Weight input phase
  inputRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 58,
    gap: 10,
    marginTop: 8,
  },
  inputErr: {
    borderColor: '#ef4444',
  },
  input: {
    flex: 1,
    textAlign: 'right',
    fontSize: 22,
    fontWeight: '700',
    color: '#1e293b',
  },
  unit: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
  },
  errText: {
    color: '#ef4444',
    fontSize: 13,
    textAlign: 'right',
    marginTop: 8,
    fontWeight: '600',
  },

  // Buttons
  btnRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  backChoiceBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 12,
  },
  backChoiceBtnText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '700',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 12,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});

export default SessionDetails;