import React, { useState } from 'react';
import { View, TextInput, StyleSheet, Pressable, Text } from 'react-native';

const NotesTab = () => {
  const [note, setNote] = useState('');
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
      <Pressable style={styles.btn} onPress={() => alert("تم حفظ الملاحظة")}>
        <Text style={styles.btnText}>حفظ الملاحظة</Text>
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