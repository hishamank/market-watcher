import { radius, space } from "@mini/tokens";
import { Component, lazy, Suspense, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { usePalette, type Palette } from "../theme/palette.ts";

const GraphCheckGraphs = lazy(() => import("./graph-check-graphs.tsx"));

interface BoundaryState {
  readonly error: Error | null;
}

interface BoundaryProps {
  readonly palette: Palette;
  readonly children: ReactNode;
}

class GraphCheckBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  override render() {
    const { palette, children } = this.props;
    if (this.state.error === null) return children;
    return (
      <View
        testID="graph-check-error"
        style={[styles.error, { borderColor: palette.borderStrong }]}
      >
        <Text style={{ color: palette.text }}>{this.state.error.message}</Text>
      </View>
    );
  }
}

export function GraphCheck() {
  const palette = usePalette();
  return (
    <GraphCheckBoundary palette={palette}>
      <Suspense fallback={null}>
        <GraphCheckGraphs />
      </Suspense>
    </GraphCheckBoundary>
  );
}

const styles = StyleSheet.create({
  error: {
    padding: space[12],
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: radius.lg,
  },
});
