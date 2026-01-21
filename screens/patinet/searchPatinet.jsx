import { Button, Input } from "@rneui/base";
import { useState } from "react";
import { View, StyleSheet, Text } from "react-native";
import ValidationSearch from "./validationsearch/validationSearch";

const SearchPatient = () => {
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const handleSearch = async () => {
    try {
      await ValidationSearch.validate(
        { search },
        { abortEarly: false }
      );

      setError("");
      console.log("Searching for:", search);
    } catch (err) {
      setError(err.errors[0]);
    }
  };

  const handleChangeSearch = (text) => {
    setSearch(text);
    setError("");
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
          onPress={handleSearch}
          buttonStyle={styles.button}
        />
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
  }
});
