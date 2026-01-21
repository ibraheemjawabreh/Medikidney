import { Picker } from "@react-native-picker/picker";
import { useState } from "react";
import {Text,View,TouchableOpacity,FlatList,StyleSheet} 
from "react-native";
import { Button } from "@rneui/themed";
import DateTimePicker from "@react-native-community/datetimepicker";

const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];

const DatesDoctor = () => {
  const [selectDoctor, setSelectDoctor] = useState("");
  const [date, setDate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event?.type === "dismissed") return;

    if (selectedDate) {
      setDate(selectedDate);
      setSelectedSlot(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>حجز موعد طبي</Text>

      {/* اختيار الطبيب */}
      <View style={styles.card}>
        <Text style={styles.label}>الطبيب</Text>
        <Picker
          selectedValue={selectDoctor}
          onValueChange={(value) => {
            setSelectDoctor(value);
            setDate(null);
            setSelectedSlot(null);
          }}
        >
          <Picker.Item label="اختر الطبيب" value="" />
          <Picker.Item label="Ahmed" value="ahmed" />
          <Picker.Item label="Samer" value="samer" />
        </Picker>
      </View>

      {/* اختيار اليوم */}
      {selectDoctor !== "" && (
        <View style={styles.card}>
          <Text style={styles.label}>اليوم</Text>

          <Button
            title="اختيار اليوم"
            onPress={() => setShowDatePicker(true)}
            buttonStyle={styles.button}
          />

          {date && (
            <Text style={styles.selectedText}>
              {date.toDateString()}
            </Text>
          )}
        </View>
      )}

      {/* اختيار الوقت */}
      {date && (
        <View style={styles.card}>
          <Text style={styles.label}>وقت الحجز</Text>

          <FlatList
            data={slots}
            numColumns={3}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.slot,
                  selectedSlot === item && styles.selectedSlot
                ]}
                onPress={() => setSelectedSlot(item)}
              >
                <Text
                  style={
                    selectedSlot === item
                      ? styles.selectedSlotText
                      : styles.slotText
                  }
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={date || new Date()}
          mode="date"
          display="calendar"
          onChange={onChangeDate}
        />
      )}

        {/* زر تأكيد الحجز */}
{selectedSlot && (
  <View style={styles.card}>
    <TouchableOpacity
      style={styles.confirmButton}
      onPress={() => {
        console.log("Doctor:", selectDoctor);
        console.log("Date:", date.toDateString());
        console.log("Time:", selectedSlot);
      }}
    >
      <Text style={styles.confirmText}>تأكيد الحجز</Text>
    </TouchableOpacity>
  </View>
)}

    

    </View>
  );
};

export default DatesDoctor;

const styles = StyleSheet.create({
  container: {
    width:'100%',
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16
  },

  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2563EB",
    textAlign: "center",
    marginBottom: 24
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    elevation: 3
  },

  label: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 8
  },

  button: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12
  },

  selectedText: {
    marginTop: 12,
    fontSize: 14,
    color: "#374151",
    textAlign: "center"
  },

  slot: {
    flex: 1,
    margin: 6,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
    alignItems: "center"
  },

  selectedSlot: {
    backgroundColor: "#2563EB"
  },

  slotText: {
    color: "#111827",
    fontSize: 14
  },

  selectedSlotText: {
    color: "#FFFFFF",
    fontWeight: "bold",
    fontSize: 14
  },

  confirmButton: {
  backgroundColor: "#16A34A",
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center"
},

confirmText: {
  color: "#FFFFFF",
  fontSize: 16,
  fontWeight: "bold"
}

});
