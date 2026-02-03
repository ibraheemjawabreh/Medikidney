import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Input, Button, Card } from "@rneui/themed";

const WeightInput = () => {
  const [weight, setWeight] = useState("");

  const handleSubmit = () => {
    console.log("الوزن المدخل:", weight);
  };
  

  return (
    <View style={styles.container}>
      <Card containerStyle={styles.card}>
        <Text style={styles.title}>إدخال الوزن</Text>

        <Input
          placeholder="مثال: 70 كغ"
          value={weight}
          onChangeText={setWeight}
          keyboardType="numeric"
          containerStyle={styles.inputContainer}
        />

        <Button
          title="حفظ الوزن"
          onPress={handleSubmit}
          buttonStyle={styles.button}
          containerStyle={styles.buttonContainer}
        />
      </Card>
    </View>
  );
};

export default WeightInput;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#f5f7fa",
    width:'100%'
  },
  card: {
    borderRadius: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    color: "#2c3e50",
  },
  inputContainer: {
    marginBottom: 10,
  },
  buttonContainer: {
    marginTop: 10,
  },
  button: {
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 10,
  },
});
