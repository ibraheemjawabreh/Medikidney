import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const MedicationsTab = ({ route }) => {
  const { sessionId } = route.params;
  const [loading, setLoading] = useState(false);
  const [medForm, setMedForm] = useState({ name: '', dosage: '', unit: 'IU', notes: '' });

  const commonMeds = [
    { name: 'HEPARIN', dosage: '5000', unit: 'IU' },
    { name: 'EPO', dosage: '4000', unit: 'IU' },
    { name: 'IRON', dosage: '100', unit: 'mg' },
    { name: 'SALINE', dosage: '500', unit: 'ml' }
  ];

  const handlePostMed = async (medData) => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `https://medikidneysys.onrender.com/dialysis-sessions/${sessionId}/details/medications`,
        {
          medicationName: medData.name,
          dosage: parseFloat(medData.dosage),
          unit: medData.unit,
          notes: medData.notes || "تم الإعطاء"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("تم", `تم تسجيل ${medData.name} بنجاح`);
    } catch (error) {
      Alert.alert("خطأ", "فشل تسجيل الدواء");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>أدوية شائعة (ضغط سريع):</Text>
      <View style={styles.grid}>
        {commonMeds.map((med, index) => (
          <Pressable key={index} style={styles.medBtn} onPress={() => handlePostMed(med)}>
            <MaterialCommunityIcons name="pill" size={20} color="#059669" />
            <Text style={styles.medBtnText}>{med.name}</Text>
            <Text style={styles.medBtnSub}>{med.dosage} {med.unit}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.customForm}>
        <Text style={styles.sectionTitle}>دواء مخصص:</Text>
        <TextInput style={styles.input} placeholder="اسم الدواء" value={medForm.name} onChangeText={(t)=>setMedForm({...medForm, name: t})} />
        <View style={styles.row}>
          <TextInput style={[styles.input, {flex: 2}]} placeholder="الجرعة" keyboardType="numeric" onChangeText={(t)=>setMedForm({...medForm, dosage: t})} />
          <TextInput style={[styles.input, {flex: 1}]} placeholder="الوحدة" onChangeText={(t)=>setMedForm({...medForm, unit: t})} />
        </View>
        <Pressable style={styles.submitBtn} onPress={() => handlePostMed(medForm)}>
          <Text style={styles.submitBtnText}>تسجيل الدواء المخصص</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#F3F4F6' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, textAlign: 'right', color: '#4b5563' },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'space-between' },
  medBtn: { backgroundColor: '#fff', width: '48%', padding: 15, borderRadius: 12, alignItems: 'center', marginBottom: 10, elevation: 2 },
  medBtnText: { fontWeight: 'bold', color: '#1f2937', marginTop: 5 },
  medBtnSub: { fontSize: 11, color: '#6b7280' },
  customForm: { backgroundColor: '#fff', padding: 15, borderRadius: 15, marginTop: 10 },
  input: { backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 10, marginBottom: 10, textAlign: 'right' },
  row: { flexDirection: 'row-reverse', gap: 10 },
  submitBtn: { backgroundColor: '#059669', padding: 15, borderRadius: 10, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default MedicationsTab;