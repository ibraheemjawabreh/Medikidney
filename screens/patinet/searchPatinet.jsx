import { Button, Input } from "@rneui/base";
import { useState } from "react";
import { View, StyleSheet, Text, FlatList, TouchableOpacity } from "react-native";import ValidationSearch from "./validationsearch/validationSearch";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const SearchPatient = () => {
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [patient, setPatient] = useState(null);

const handleSearch = async (queryText,navigation) => {
  try {
    const token = await AsyncStorage.getItem("token");
    const response = await axios.get(
      `https://medikidneysys.onrender.com/users/profile/patients/search?name=${queryText}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setPatient(response.data);
  } catch (err) {
    console.log("Search Error:", err);
  }
};



  const handleChangeSearch = (text) => {
  setSearch(text);
  setError("");

    if (text.length >= 2) {
      handleSearch(text); 
    } else {
      setPatient([]); 
    }
};

  return (
    <View style={styles.container}>
      <Text style={styles.header}>البحث عن مريض</Text>
      <View style={styles.card}>
        <Input
          placeholder="اكتب اسم المريض"
          value={search}
          onChangeText={handleChangeSearch}
          errorMessage={error}
          leftIcon={{ type: "feather", name: "search", color: "#2A7FFF" }}
          inputContainerStyle={styles.inputContainer}
        />

        <Button
          title="بحث"
          onPress={() => handleSearch(search)} 
          buttonStyle={styles.button}
      />

{patient && patient.length > 0 && (
  <View style={styles.dropdownContainer}>
    <FlatList
      data={patient}
      renderItem={({ item }) => (
        <TouchableOpacity 
          style={styles.dropdownItem} 
          onPress={() => {
            setSearch(item.name); 
            setPatient([]);
            // navigation.navigate("PatientProfile", { patientId: item.id });
          }}
        >
          <Text>{item.name}</Text>
        </TouchableOpacity>
      )}
    />
  </View>
)}
      </View>
    </View>
  );
};

export default SearchPatient;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 16,
    justifyContent: "center"
  },

  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2A7FFF",
    textAlign: "center",
    marginBottom: 24
  },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    elevation: 4
  },

  inputContainer: {
    borderBottomWidth: 0
  },

  button: {
    backgroundColor: "#2A7FFF",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 10
  },
resultItem: {
    backgroundColor: "#F3F4F6",
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  patientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    textAlign: "right"
  },
  patientPhone: {
    fontSize: 14,
    color: "#666",
    textAlign: "right",
    marginTop: 4
  },
  dropdownContainer: {
    maxHeight: 200, // عشان ما تغطي كل الشاشة
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  dropdownItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff'
  },
});
