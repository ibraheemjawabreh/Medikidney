import React, { useState, useEffect } from "react";
import { View, TextInput, TouchableOpacity, Text, Alert, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const NutritionistTable = ({ route }) => {
  const patientId = route.params?.patientId;
  if (!patientId) {
  Alert.alert("خطأ", "لم يتم تمرير رقم المريض");
  }

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [forbiddenItems, setForbiddenItems] = useState("");
  const [allowedItems, setAllowedItems] = useState("");
  const [breakfast, setBreakfast] = useState("");
  const [lunch, setLunch] = useState("");
  const [dinner, setDinner] = useState("");
  const [mealNotes, setMealNotes] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentPlan = async () => {
      try {
        if (!patientId) return;

        const token = await AsyncStorage.getItem("token");
        if (!token) throw new Error("لم يتم تسجيل الدخول");

        const response = await fetch(
          `https://medikidneysys.onrender.com/nutrition-programs?patientId=${patientId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const data = await response.json();
        if (data.length > 0) {
          const plan = data[0];
          setTitle(plan.title || "");
          setDescription(plan.description || "");
          setForbiddenItems(plan.forbiddenItems || "");
          setAllowedItems(plan.allowedItems || "");
          setBreakfast(plan.breakfast || "");
          setLunch(plan.lunch || "");
          setDinner(plan.dinner || "");
          setMealNotes(plan.mealNotes || "");
        }
      } catch (error) {
        console.log("Fetch Plan Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentPlan();
  }, [patientId]);

  const savePlan = async () => {
    try {
      if (!patientId) return Alert.alert("خطأ", "لم يتم اختيار المريض");

      const token = await AsyncStorage.getItem("token");
      if (!token) return Alert.alert("خطأ", "لم يتم تسجيل الدخول");

      const response = await fetch(
        "https://medikidneysys.onrender.com/nutrition-programs",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ patientId, title, description, forbiddenItems, allowedItems, breakfast, lunch, dinner, mealNotes, startDate: new Date().toISOString(), endDate: new Date().toISOString() })
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "تعذر حفظ الخطة");
      }

      Alert.alert("نجاح ", "تم حفظ الخطة بنجاح!");
    } catch (error) {
      console.log("Save Plan Error:", error);
      Alert.alert("خطأ ", error.message);
    }
  };

  if (loading) return <Text style={{ textAlign: "center", marginTop: 50 }}>جاري تحميل البيانات...</Text>;

  return (
    <ScrollView style={{ padding: 20 }}>
      <TextInput placeholder="عنوان الخطة" value={title} onChangeText={setTitle} style={styles.input} />
      <TextInput placeholder="الوصف" value={description} onChangeText={setDescription} style={styles.input} />
      <TextInput placeholder="الممنوعات" value={forbiddenItems} onChangeText={setForbiddenItems} style={styles.input} />
      <TextInput placeholder="المسموحات" value={allowedItems} onChangeText={setAllowedItems} style={styles.input} />
      <TextInput placeholder="الفطور" value={breakfast} onChangeText={setBreakfast} style={styles.input} />
      <TextInput placeholder="الغداء" value={lunch} onChangeText={setLunch} style={styles.input} />
      <TextInput placeholder="العشاء" value={dinner} onChangeText={setDinner} style={styles.input} />
      <TextInput placeholder="ملاحظات" value={mealNotes} onChangeText={setMealNotes} style={styles.input} />

      <TouchableOpacity onPress={savePlan} style={styles.button}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>حفظ الخطة</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = {
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, marginBottom: 12, padding: 10, textAlign: "right" },
  button: { backgroundColor: "#2ecc71", padding: 15, borderRadius: 8, alignItems: "center", marginTop: 10 },
};

export default NutritionistTable;