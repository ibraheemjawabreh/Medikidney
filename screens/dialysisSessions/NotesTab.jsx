import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text, Alert, ActivityIndicator } from 'react-native';
import api from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

const NotesTab = ({ route }) => {
  const { t } = useLanguage();
  const { sessionId } = route.params;
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSaveNote = async () => {
    if (!note.trim()) return Alert.alert(t.error, t.notes.required);
    try {
      setLoading(true);
      await api.patch(
        `/dialysis-sessions/${sessionId}`,
        { notes: note }
      );
      Alert.alert(t.success, t.notes.saveSuccess);
    } catch (error) {
      Alert.alert(t.error, t.notes.saveFailed);
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
        placeholder={t.notes.placeholder}
        textAlignVertical="top"
        value={note}
        onChangeText={setNote}
      />
      <Pressable style={styles.btn} onPress={handleSaveNote} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>{t.notes.saveBtn}</Text>}
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