import type { ColorValue } from "react-native";
import { Icon, type IconName } from "../components/icon.tsx";

export function TabIcon({ name, color }: { name: IconName; color: ColorValue }) {
  return <Icon name={name} color={color} size={24} />;
}
