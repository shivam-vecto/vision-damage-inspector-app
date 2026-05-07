import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import HomeScreen from "./components/HomeScreen";
import RoomItemsAndCrackDetections from "./components/RoomItemsAndCrackDetections";

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
          }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen
            name="Inspection"
            component={RoomItemsAndCrackDetections}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
};

export default App;
