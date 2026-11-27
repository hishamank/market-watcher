import { StyleSheet, View } from "react-native";
import { ChaosButton } from "./chaos-button.tsx";
import { SearchButton } from "./search-button.tsx";
import { SettingsButton } from "./settings-button.tsx";

export function TabHeaderActions() {
  return (
    <View style={styles.row}>
      <SearchButton />
      <ChaosButton />
      <SettingsButton />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
});
