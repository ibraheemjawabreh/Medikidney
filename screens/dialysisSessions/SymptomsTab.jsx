import React from 'react';
import { View, Text, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SymptomsTab = ({ route }) => {
  const { sessionId } = route.params;

  const symptoms = [
    { label: "هبوط ضغط", type: "LOW_BP", icon: "arrow-down-bold-circle" },
    { label: "تشنجات", type: "CRAMPS", icon: " some-icon" },
    { label: "غثيان", type: "NAUSEA", icon: "emoticon-confused" },
    { label: "صداع", type: "HEADACHE", icon: "head-flash" },
    { label: "ألم صدر", type: "CHEST_PAIN", icon: "heart-pulse" }
  ];

  const reportSymptom = async (type) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `https://medikidneysys.onrender.com/dialysis-sessions/${sessionId}/details/symptoms`,
        { symptomType: type, severity: "MILD", notes: "تم التسجيل من قبل الممرض" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("تم التبليغ", "تم تسجيل العارض الصحي بنجاح");
    } catch (error) {
      Alert.alert("خطأ", "فشل في تسجيل العارض");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>ما هي الأعراض التي ظهرت؟</Text>
      <View style={styles.list}>
        {symptoms.map((s, i) => (
          <Pressable key={i} style={styles.symptomItem} onPress={() => reportSymptom(s.type)}>
            <Text style={styles.symptomLabel}>{s.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  list: { gap: 10 },
  symptomItem: { backgroundColor: '#fff', padding: 20, borderRadius: 12, borderRightWidth: 5, borderRightColor: '#ef4444', elevation: 2 },
  symptomLabel: { textAlign: 'right', fontWeight: 'bold', fontSize: 16 }
});

export default SymptomsTab;