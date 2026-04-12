import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text, Alert, ActivityIndicator } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NotesTab = ({ route }) => {
  const { sessionId } = route.params;
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveNote = async () => {
    if (!note.trim()) return Alert.alert("تنبيه", "يرجى كتابة ملاحظة أولاً");
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      await axios.patch(
        `https://medikidneysys.onrender.com/dialysis-sessions/${sessionId}`,
        { notes: note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("تم الحفظ", "تم حفظ الملاحظة بنجاح");
    } catch (error) {
      Alert.alert("خطأ", "فشل حفظ الملاحظة");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.textArea}
        multiline
        numberOfLines={10}
        placeholder="اكتب ملاحظاتك هنا..."
        textAlignVertical="top"
        value={note}
        onChangeText={setNote}
      />
      <Pressable style={styles.btn} onPress={handleSaveNote} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>حفظ الملاحظة</Text>}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  textArea: { backgroundColor: '#fff', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#E5E7EB', height: 200, textAlign: 'right' },
  btn: { backgroundColor: '#059669', padding: 15, borderRadius: 10, marginTop: 20, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});

export default NotesTab;