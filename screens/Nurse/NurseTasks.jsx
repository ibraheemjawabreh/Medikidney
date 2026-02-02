import { useState } from "react";
import { Text, View, StyleSheet, Button, TextInput, ScrollView, TouchableOpacity } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

const NurceTasks = () => {
  const [date, setDate] = useState(new Date());
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [weightBefore, setWeightBefore] = useState("");
  const [weightAfter, setWeightAfter] = useState("");
  const [notes, setNotes] = useState("");

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event?.type === "dismissed") return;
    if (selectedDate) setDate(selectedDate);
  };

  const onChangeStartTime = (event, selectedTime) => {
    setShowStartTimePicker(false);
    if (event?.type === "dismissed") return;
    if (selectedTime) setStartTime(selectedTime);
  };

  const onChangeEndTime = (event, selectedTime) => {
    setShowEndTimePicker(false);
    if (event?.type === "dismissed") return;
    if (selectedTime) setEndTime(selectedTime);
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>ادخال تفاصيل جلسة الغسيل للمريض</Text>

      {/* تاريخ الجلسة */}
      <View style={styles.form}>
        <Text style={styles.label}>تاريخ الجلسة</Text>
        <Button title="اختيار التاريخ" onPress={() => setShowDatePicker(true)} />
        <Text style={styles.selectedText}>{date.toDateString()}</Text>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="calendar"
            onChange={onChangeDate}
          />
        )}
      </View>

      {/* وقت البدء */}
      <View style={styles.form}>
        <Text style={styles.label}>وقت البدء</Text>
        <Button title="اختيار الوقت" onPress={() => setShowStartTimePicker(true)} />
        <Text style={styles.selectedText}>
          {startTime.getHours().toString().padStart(2, "0")}:
          {startTime.getMinutes().toString().padStart(2, "0")}
        </Text>
        {showStartTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={onChangeStartTime}
          />
        )}
      </View>

      {/* وقت الانتهاء */}
      <View style={styles.form}>
        <Text style={styles.label}>وقت الانتهاء</Text>
        <Button title="اختيار الوقت" onPress={() => setShowEndTimePicker(true)} />
        <Text style={styles.selectedText}>
          {endTime.getHours().toString().padStart(2, "0")}:
          {endTime.getMinutes().toString().padStart(2, "0")}
        </Text>
        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            is24Hour={true}
            display="spinner"
            onChange={onChangeEndTime}
          />
        )}
      </View>

      {/* وزن قبل الجلسة */}
      <View style={styles.form}>
        <Text style={styles.label}>وزن قبل الجلسة</Text>
        <TextInput
          style={styles.input}
          placeholder="ادخل الوزن قبل الجلسة"
          keyboardType="numeric"
          value={weightBefore}
          onChangeText={setWeightBefore}
        />
      </View>

      {/* وزن بعد الجلسة */}
      <View style={styles.form}>
        <Text style={styles.label}>وزن بعد الجلسة</Text>
        <TextInput
          style={styles.input}
          placeholder="ادخل الوزن بعد الجلسة"
          keyboardType="numeric"
          value={weightAfter}
          onChangeText={setWeightAfter}
        />
      </View>

      {/* ملاحظات */}
      <View style={styles.form}>
        <Text style={styles.label}>ملاحظات</Text>
        <TextInput
          style={[styles.input, { height: 80 }]}
          placeholder="ادخل ملاحظات"
          multiline
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* زر حفظ البيانات */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={() => {
          console.log("تاريخ الجلسة:", date.toDateString());
          console.log(
            "وقت البدء:",
            `${startTime.getHours()}:${startTime.getMinutes()}`
          );
          console.log(
            "وقت الانتهاء:",
            `${endTime.getHours()}:${endTime.getMinutes()}`
          );
          console.log("وزن قبل الجلسة:", weightBefore);
          console.log("وزن بعد الجلسة:", weightAfter);
          console.log("ملاحظات:", notes);
          alert("تم حفظ البيانات بنجاح!");
        }}
      >
        <Text style={styles.saveButtonText}>حفظ البيانات</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default NurceTasks;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2563EB",
    textAlign: "center",
    marginBottom: 24,
  },
  form: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    alignItems: "center",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563EB",
    marginBottom: 8,
  },
  selectedText: {
    marginTop: 8,
    fontSize: 16,
    color: "#111827",
    textAlign: "center",
  },
  input: {
    width: "100%",
    backgroundColor: "#F3F4F6",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  saveButton: {
    backgroundColor: "#16A34A",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
    marginBottom: 30
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
