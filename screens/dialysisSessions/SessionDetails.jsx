import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VitalSignsTab from './VitalSignsTab';
import MedicationsTab from './MedicationsTab';
import SettingsTab from './SettingsTab';
import SymptomsTab from './SymptomsTab';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../services/api';

const SessionDetails = ({ route, navigation }) => {
  const { patient } = route.params;
  const sessionId = patient.sessionId;

  // الحالة لتحديد المرحلة الحالية (1 إلى 5)
  const [step, setStep] = useState(1);

  const steps = [
    { id: 1, title: "العلامات الحيوية", component: <VitalSignsTab route={{ params: { sessionId } }} /> },
    { id: 2, title: "إعدادات الجهاز", component: <SettingsTab route={{ params: { sessionId } }} /> },
    { id: 3, title: "الأدوية", component: <MedicationsTab route={{ params: { sessionId } }} /> },
    { id: 4, title: "الأعراض والملاحظات", component: <SymptomsTab route={{ params: { sessionId } }} /> },
  ];

  const currentStepData = steps.find(s => s.id === step);
  const [isFinishing, setIsFinishing] = useState(false);

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

  const handleFinishSession = async () => {
    try {
      setIsFinishing(true);
      await api.patch(
        `/dialysis-sessions/${sessionId}/status`,
        { status: "COMPLETED" }
      );
      // مسح الخطوة المحفوظة لأن الجلسة انتهت
      await AsyncStorage.removeItem(`step_${sessionId}`);
      // بعد نجاح التحديث نغلق الصفحة
      navigation.goBack();
    } catch (error) {
      console.log('Error finishing session:', error.response?.data || error.message);
      alert('فشل في إنهاء الجلسة، يرجى المحاولة مرة أخرى.');
    } finally {
      setIsFinishing(false);
    }
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.stepTitle}>المرحلة {step}: {currentStepData.title}</Text>
      </View>

      {/* عرض الصفحة الحالية */}
      <View style={{ flex: 1 }}>
        {currentStepData.component}
      </View>

      {/* أزرار التحكم في المراحل */}
      <View style={styles.footer}>
        {step > 1 ? (
          <Pressable style={styles.backBtn} onPress={() => changeStep(step - 1)}>
            <Text style={styles.backBtnText}>السابق</Text>
          </Pressable>
        ) : <View style={{ flex: 1 }} />}

        {step < 4 ? (
          <Pressable style={styles.nextBtn} onPress={() => changeStep(step + 1)}>
            <Text style={styles.nextBtnText}>التالي</Text>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#fff" />
          </Pressable>
        ) : (
          <Pressable style={[styles.nextBtn, { backgroundColor: '#059669', opacity: isFinishing ? 0.7 : 1 }]} onPress={handleFinishSession} disabled={isFinishing}>
            <Text style={styles.nextBtnText}>{isFinishing ? "جاري الإنهاء..." : "إنهاء وإغلاق"}</Text>
          </Pressable>
        )}
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
  footer: { flexDirection: 'row-reverse', padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB', justifyContent: 'space-between' },
  nextBtn: { backgroundColor: '#2563eb', flexDirection: 'row-reverse', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10, alignItems: 'center' },
  nextBtnText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  backBtn: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 10, borderWidth: 1, borderColor: '#D1D5DB' },
  backBtnText: { color: '#4B5563', fontWeight: 'bold' },
});

export default SessionDetails;