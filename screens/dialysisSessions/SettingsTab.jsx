import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, Alert } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsTab = ({ route }) => {
  const { sessionId } = route.params;
  const [settings, setSettings] = useState({ bfr: '', df: '', ufr: '' });

  const handleSaveSettings = async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      await axios.post(
        `https://medikidneysys.onrender.com/dialysis-sessions/${sessionId}/details/dialysis-settings`,
        {
          bloodFlowRate: parseInt(settings.bfr),
          dialysateFlow: parseInt(settings.df),
          ultrafiltrationRate: parseInt(settings.ufr)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("نجاح", "تم حفظ إعدادات الجهاز");
    } catch (error) {
      Alert.alert("خطأ", "تأكد من إدخال أرقام صحيحة");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.label}>Blood Flow Rate (BFR):</Text>
        <TextInput style={styles.input} keyboardType="numeric" placeholder="200" value={settings.bfr} onChangeText={(t)=>setSettings({...settings, bfr: t})} />
        
        <Text style={styles.label}>Dialysate Flow (DF):</Text>
        <TextInput style={styles.input} keyboardType="numeric" placeholder="500" value={settings.df} onChangeText={(t)=>setSettings({...settings, df: t})} />
        
        <Text style={styles.label}>Ultrafiltration Rate (UFR):</Text>
        <TextInput style={styles.input} keyboardType="numeric" placeholder="300" value={settings.ufr} onChangeText={(t)=>setSettings({...settings, ufr: t})} />

        <Pressable style={styles.btn} onPress={handleSaveSettings}>
          <Text style={styles.btnText}>تحديث الإعدادات</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3 },
  label: { fontWeight: 'bold', color: '#374151', marginBottom: 5, textAlign: 'left' },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, marginBottom: 15 },
  btn: { backgroundColor: '#065f46', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});

export default SettingsTab;