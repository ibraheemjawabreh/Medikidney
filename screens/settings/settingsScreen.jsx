import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';

const SettingsScreen = () => {
    return (
        <ScrollView style={styles.container}>

            <Text style={styles.mainTitle}>MediKidney - الإعدادات</Text>

            {/* 1) إعدادات الحساب */}
            <View style={styles.box}>
                <Text style={styles.boxTitle}>🔑 الحساب</Text>
                <TouchableOpacity style={styles.row} onPress={() => Alert.alert('تغيير كلمة المرور')}>
                    <Text>تغيير كلمة المرور</Text>
                </TouchableOpacity>
                <View style={styles.row}>
                    <Text>البريد: user@uoh.edu.ps</Text>
                </View>
            </View>

            {/* 2) إعدادات التطبيق */}
            <View style={styles.box}>
                <Text style={styles.boxTitle}>⚙️ التطبيق</Text>
                <TouchableOpacity style={styles.row}>
                    <Text>تغيير الثيم (ليلي/نهاري)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.row}>
                    <Text>اللغة (العربية)</Text>
                </TouchableOpacity>
            </View>

            {/* 3) الأمان */}
            <View style={styles.box}>
                <Text style={styles.boxTitle}>🔒 الأمان</Text>
                <TouchableOpacity style={styles.row} onPress={() => Alert.alert('تم تسجيل الخروج')}>
                    <Text style={{ color: 'red' }}>تسجيل الخروج</Text>
                </TouchableOpacity>
            </View>

            {/* 4) معلومات التطبيق */}
            <View style={styles.box}>
                <Text style={styles.boxTitle}>ℹ️ عن التطبيق</Text>
                <Text style={styles.infoText}>إصدار 1.0.0</Text>
                <Text style={styles.infoText}>مشروع تخرج - جامعة الخليل</Text>
                <TouchableOpacity style={styles.row}>
                    <Text>سياسة الخصوصية</Text>
                </TouchableOpacity>
            </View>

            {/* 5) الدعم */}
            <View style={styles.box}>
                <Text style={styles.boxTitle}>📞 الدعم</Text>
                <TouchableOpacity style={styles.row}>
                    <Text>تواصل معنا</Text>
                </TouchableOpacity>
            </View>

        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f0f0', padding: 20 },
    mainTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginVertical: 20, color: '#2c3e50' },
    box: { backgroundColor: '#fff', borderRadius: 10, padding: 15, marginBottom: 15 },
    boxTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5, textAlign: 'right' },
    row: { paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#f9f9f9', alignItems: 'flex-end' },
    infoText: { fontSize: 14, color: '#7f8c8d', textAlign: 'right', marginVertical: 2 }
});

export default SettingsScreen;