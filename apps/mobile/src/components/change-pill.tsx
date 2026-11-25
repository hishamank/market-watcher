import {
  directionOf,
  formatSignedAmount,
  formatSignedPercent,
  type Direction,
  type FlashDirection,
} from "@mini/core";
import { radius, space } from "@mini/tokens";
import { StyleSheet, Text, View } from "react-native";
import { usePalette, type Palette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";
import { FlashRing } from "./flash-ring.tsx";
import { ltr } from "./ltr.ts";

export interface ChangePillProps {
  change: string;
  changePercent: string;
  stale: boolean;
  flash: FlashDirection | undefined;
  flashKey: number | undefined;
  testID: string;
}

const arrows: Record<Direction, string> = { up: "▲", down: "▼", flat: "–" };

function pillTone(direction: Direction, stale: boolean, palette: Palette) {
  if (stale) return { background: palette.fill, text: palette.textSecondary };
  if (direction === "up") return { background: palette.gainTint, text: palette.gain };
  if (direction === "down") return { background: palette.lossTint, text: palette.loss };
  return { background: palette.fill, text: palette.flat };
}

export function ChangePill(props: ChangePillProps) {
  const { change, changePercent, stale, flash, flashKey, testID } = props;
  const palette = usePalette();
  const direction = directionOf(change);
  const tone = pillTone(direction, stale, palette);
  const label = `${arrows[direction]} ${formatSignedAmount(change)} (${formatSignedPercent(changePercent)})`;
  return (
    <View testID={testID} style={[styles.pill, { backgroundColor: tone.background }]}>
      <Text style={[textStyles.change, { color: tone.text }]}>{ltr(label)}</Text>
      {flash === undefined ? null : <FlashRing key={flashKey} color={tone.text} />}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    paddingBlock: space[2],
    paddingInline: space[8],
  },
});
