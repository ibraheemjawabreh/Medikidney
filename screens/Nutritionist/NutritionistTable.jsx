import { Card, Tab, TabView } from "@rneui/base";
import { useState } from "react";
import { Text, View, StyleSheet, TextInput, ScrollView, TouchableOpacity } from "react-native";

const NutritionistTable = () => {
  const [tabIndex, setTabIndex] = useState(0);

  const meals = [
    { id: 1, title: "الفطور" },
    { id: 2, title: "الغداء" },
    { id: 3, title: "العشاء" },
    { id: 4, title: "سناك" },
  ];

  return (
    <View style={styles.container}>
     

      <TabView
        value={tabIndex}
        onChange={setTabIndex}
        animationType="spring"
      >
        <TabView.Item style={styles.tabContent}>
          <TouchableOpacity style={styles.DeleteButton}>
            <Text>حذف الجدول الغذائي</Text>
          </TouchableOpacity>
        </TabView.Item>

        
        <TabView.Item style={styles.tabContent}>
          <ScrollView>
            {meals.map((meal) => (
              <Card key={meal.id} containerStyle={styles.card}>
                <Card.Title>{meal.title}</Card.Title>
                <Card.Divider />
                <TextInput
                  placeholder={`أدخل تفاصيل ${meal.title}`}
                  style={styles.input}
                />
              </Card>
            ))}
          </ScrollView>
        </TabView.Item>
      </TabView>
      <Tab
        value={tabIndex}
        onChange={setTabIndex}
        indicatorStyle={styles.indicator}
      >
        <Tab.Item title="الجدول الغذائي" />
        <Tab.Item title="تعديل الجدول الغذائي" />
      </Tab>
    </View>
  );
};

export default NutritionistTable;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    width: "100%",
    marginBottom:"30",
  },
  indicator: {
    backgroundColor: "#2ecc71",
    height: 3,
  },
  tabContent: {
    width: "100%",
    paddingTop: 30,
  },
  card: {
    borderRadius: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
  },
  DeleteButton: {
  backgroundColor: "#16A34A",
  paddingVertical: 10,
  borderRadius: 10,
  marginRight:10,
  alignItems: "center",
  alignSelf:"flex-end",
  marginTop:30,
},
});