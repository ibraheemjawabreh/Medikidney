import React, { useState, useEffect } from "react";
import { 
  View, TextInput, TouchableOpacity, Text, Alert, ScrollView, 
  ActivityIndicator, StyleSheet, StatusBar, KeyboardAvoidingView, 
  Platform, TouchableWithoutFeedback, Keyboard 
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../../services/api";
import { Icon } from "@rneui/base";
import DateTimePicker from '@react-native-community/datetimepicker';

const NutritionistTable = ({ route, navigation }) => {
  const patientId = route.params?.patientId;

  // --- States ---
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [forbiddenItems, setForbiddenItems] = useState("");
  const [allowedItems, setAllowedItems] = useState("");
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");
  const [mealNotes, setMealNotes] = useState(""); // استعادة حالة الملاحظات
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
  
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [loading, setLoading] = useState(true);
  const [programId, setProgramId] = useState(null);

  useEffect(() => {
    fetchCurrentPlan();
  }, [patientId]);

  const fetchCurrentPlan = async () => {
    try {
      const response = await api.get(`/nutrition-programs?patientId=${patientId}`);
      const data = response.data;

      if (Array.isArray(data) && data.length > 0) {
        const plan = data.sort((a, b) => (b.id || 0) - (a.id || 0))[0];
        setProgramId(plan.id || plan.program_id);
        setTitle(plan.title || "");
        setDescription(plan.description || "");
        setForbiddenItems(plan.forbidden_items || plan.forbiddenItems || "");
        setAllowedItems(plan.allowed_items || plan.allowedItems || "");
        setBreakfast(plan.breakfast || "");
        setLunch(plan.lunch || "");
        setDinner(plan.dinner || "");
        setMealNotes(plan.meal_notes || plan.mealNotes || ""); // تعبئة الملاحظات من السيرفر
        
        if (plan.startDate || plan.start_date) setStartDate(new Date(plan.startDate || plan.start_date));
        if (plan.endDate || plan.end_date) setEndDate(new Date(plan.endDate || plan.end_date));
      }
    } catch (error) { console.log(error); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const nutritionistId = await AsyncStorage.getItem("userId");
      
      const bodyData = {
        patientId: Number(patientId),
        nutritionistId: Number(nutritionistId),
        title,
        description,
        forbiddenItems,
        allowedItems,
        breakfast,
        lunch,
        dinner,
        mealNotes,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      };

      const endpoint = `/nutrition-programs${programId ? `/${programId}` : ""}`;
      const response = programId 
        ? await api.patch(endpoint, bodyData)
        : await api.post(endpoint, bodyData);

      if (response.status === 200 || response.status === 201) {
        Alert.alert("✅ تم", "تم حفظ البرنامج بنجاح", [{ text: "تم", onPress: () => navigation.goBack() }]);
      }
    } catch (error) { Alert.alert("خطأ", "فشل الاتصال بالسيرفر"); }
  };

  const onStartChange = (event, selectedDate) => {
    setShowStartPicker(false);
    if (selectedDate) setStartDate(selectedDate);
  };

  const onEndChange = (event, selectedDate) => {
    setShowEndPicker(false);
    if (selectedDate) setEndDate(selectedDate);
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#059669" /></View>;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.headerTitle}>{programId ? "تعديل البرنامج الغذائي" : "إنشاء برنامج جديد"}</Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>عنوان البرنامج</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="مثال: دايت الأسبوع 2" />

            <Text style={styles.label}>الوصف العام (الوصفة)</Text>
            <TextInput value={description} onChangeText={setDescription} style={[styles.input, { height: 60 }]} multiline />

            <View style={styles.rowBetween}>
              <View style={{ width: '48%' }}>
                <Text style={styles.label}>تاريخ البدء</Text>
                <TouchableOpacity onPress={() => setShowStartPicker(true)} style={styles.dateSelector}>
                  <Icon name="calendar-edit" type="material-community" size={18} color="#204a42" />
                  <Text style={styles.dateText}>{startDate.toLocaleDateString('ar-EG')}</Text>
                </TouchableOpacity>
              </View>

              <View style={{ width: '48%' }}>
                <Text style={styles.label}>تاريخ الانتهاء</Text>
                <TouchableOpacity onPress={() => setShowEndPicker(true)} style={styles.dateSelector}>
                  <Icon name="calendar-check" type="material-community" size={18} color="#204a42" />
                  <Text style={styles.dateText}>{endDate.toLocaleDateString('ar-EG')}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showStartPicker && <DateTimePicker value={startDate} mode="date" display="default" onChange={onStartChange} />}
            {showEndPicker && <DateTimePicker value={endDate} mode="date" display="default" onChange={onEndChange} />}

            <View style={styles.rowBetween}>
                <View style={{ width: '48%' }}><Text style={[styles.label, {color: 'red'}]}>الممنوعات</Text><TextInput value={forbiddenItems} onChangeText={setForbiddenItems} style={[styles.input, {height: 80}]} multiline/></View>
                <View style={{ width: '48%' }}><Text style={[styles.label, {color: 'green'}]}>المسموحات</Text><TextInput value={allowedItems} onChangeText={setAllowedItems} style={[styles.input, {height: 80}]} multiline/></View>
            </View>

            <Text style={styles.sectionTitle}>الوجبات</Text>
            <MealInput label="فطور" value={breakfast} onChange={setBreakfast} />
            <MealInput label="غداء" value={lunch} onChange={setLunch} />
            <MealInput label="عشاء" value={dinner} onChange={setDinner} />

            {/* --- حقل الملاحظات الإضافية --- */}
            <Text style={styles.label}>ملاحظات إضافية على الوجبات</Text>
            <TextInput 
              value={mealNotes} 
              onChangeText={setMealNotes} 
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
              placeholder="اكتب أي تعليمات خاصة هنا..."
              multiline 
            />

            <TouchableOpacity onPress={handleSave} style={[styles.saveBtn, { backgroundColor: programId ? '#0ea5e9' : '#204a42' }]}>
              <Text style={styles.saveBtnText}>{programId ? "تحديث الخطة" : "اعتماد الخطة"}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const MealInput = ({ label, value, onChange }) => (
  <View style={{ marginBottom: 10 }}>
    <Text style={styles.label}>{label}</Text>
    <TextInput value={value} onChangeText={onChange} style={[styles.input, { height: 50 }]} multiline />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9', padding: 15 },
  loadingContainer: { flex: 1, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginVertical: 15 },
  formCard: { backgroundColor: '#fff', borderRadius: 20, padding: 20, elevation: 5 },
  label: { textAlign: 'right', fontWeight: 'bold', marginBottom: 5, fontSize: 13, color: '#475569' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, textAlign: 'right', backgroundColor: '#f8fafc', marginBottom: 15 },
  rowBetween: { flexDirection: 'row-reverse', justifyContent: 'space-between', marginBottom: 10 },
  dateSelector: { flexDirection: 'row-reverse', alignItems: 'center', backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1' },
  dateText: { marginRight: 10, color: '#204a42', fontWeight: 'bold' },
  sectionTitle: { textAlign: 'right', fontWeight: 'bold', fontSize: 16, color: '#204a42', marginVertical: 10 },
  saveBtn: { padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: 'bold' }
});

export default NutritionistTable;