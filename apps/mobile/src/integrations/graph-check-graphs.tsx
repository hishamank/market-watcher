import { space } from "@mini/tokens";
import { StyleSheet, View } from "react-native";
import { LineGraph } from "react-native-graph";
import { useChartPalette } from "../theme/palette.ts";

const SAMPLE_CLOSES = [
  231.2, 231.9, 231.4, 232.6, 233.1, 232.8, 234.0, 233.6, 234.9, 235.4, 234.7, 236.1,
];
const SAMPLE_START = Date.UTC(2026, 10, 2, 14, 30);
const SAMPLE_STEP_MS = 30 * 60 * 1000;
const SAMPLE_POINTS = SAMPLE_CLOSES.map((value, index) => ({
  date: new Date(SAMPLE_START + index * SAMPLE_STEP_MS),
  value,
}));

export default function GraphCheckGraphs() {
  const palette = useChartPalette();
  return (
    <View testID="graph-check" style={styles.stack}>
      <View testID="graph-check-static">
        <LineGraph
          points={SAMPLE_POINTS}
          animated={false}
          color={palette.gainLine}
          style={styles.static}
        />
      </View>
      <View testID="graph-check-animated">
        <LineGraph
          points={SAMPLE_POINTS}
          animated
          enablePanGesture
          color={palette.gainLine}
          style={styles.animated}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[24] },
  static: { height: 96 },
  animated: { height: 176 },
});
