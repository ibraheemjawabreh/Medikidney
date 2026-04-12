import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, StyleSheet, Alert, Pressable, FlatList } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const VitalSignsTab = ({ route }) => {
  const { sessionId } = route.params;
  const [vitals, setVitals] = useState([]);
  const [form, setForm] = useState({ systolic: '', diastolic: '', pulse: '', temperature: '', oxygen: '' });

  // 1. إرسال قراءة جديدة
  const handleAddVital = async () => {
    if (!form.systolic || !form.diastolic) return Alert.alert("خطأ", "يرجى إدخال الضغط على الأقل");
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await axios.post(
        `https://medikidneysys.onrender.com/dialysis-sessions/${sessionId}/details/vital-signs`,
        {
          systolic: parseInt(form.systolic),
          diastolic: parseInt(form.diastolic),
          pulse: parseInt(form.pulse),
          temperature: parseFloat(form.temperature),
          oxygenSaturation: parseInt(form.oxygen)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      Alert.alert("تم", "تم تسجيل القراءة بنجاح");
      setForm({ systolic: '', diastolic: '', pulse: '', temperature: '', oxygen: '' });
      // هنا يفضل إعادة جلب القراءات لتظهر في القائمة
    } catch (error) {
      Alert.alert("خطأ", "فشل في حفظ البيانات");
    }
  };

  // 2. حذف قراءة
  const handleDeleteVital = async (vitalSignId) => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.delete(
        `https://medikidneysys.onrender.com/dialysis-sessions/${sessionId}/details/vital-signs/${vitalSignId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("تم", "تم حذف القراءة");
    } catch (error) {
        Alert.alert("خطأ", "فشل الحذف");
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* نموذج الإدخال */}
      <View style={styles.formCard}>
        <Text style={styles.cardTitle}>إضافة قراءة جديدة</Text>
        <View style={styles.row}>
            <TextInput style={styles.input} placeholder="SYS (120)" keyboardType="numeric" value={form.systolic} onChangeText={(t)=>setForm({...form, systolic: t})} />
            <TextInput style={styles.input} placeholder="DIA (80)" keyboardType="numeric" value={form.diastolic} onChangeText={(t)=>setForm({...form, diastolic: t})} />
        </View>
        <View style={styles.row}>
            <TextInput style={styles.input} placeholder="نبض" keyboardType="numeric" value={form.pulse} onChangeText={(t)=>setForm({...form, pulse: t})} />
            <TextInput style={styles.input} placeholder="حرارة" keyboardType="numeric" value={form.temperature} onChangeText={(t)=>setForm({...form, temperature: t})} />
        </View>
        <Pressable style={styles.addBtn} onPress={handleAddVital}>
            <Text style={styles.addBtnText}>حفظ القراءة</Text>
        </Pressable>
      </View>

      {/* ملاحظة: هنا سنضع لاحقاً الـ Graph والقراءات السابقة */}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: '#F3F4F6' },
  formCard: { backgroundColor: '#fff', padding: 15, borderRadius: 15, elevation: 3, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'right', color: '#374151' },
  row: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 10 },
  input: { flex: 1, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 10, marginHorizontal: 5, textAlign: 'center' },
  addBtn: { backgroundColor: '#059669', padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  addBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default VitalSignsTab;