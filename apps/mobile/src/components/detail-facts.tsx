import { space } from "@mini/tokens";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { ltr } from "./ltr.ts";

export interface DetailFact {
  readonly label: string;
  readonly value: ReactNode;
  readonly testID: string;
}

function FactRow({ fact }: { fact: DetailFact }) {
  const textStyles = useTextStyles();
  const palette = usePalette();
  return (
    <View style={[styles.row, { borderColor: palette.border }]}>
      <Text style={[textStyles.label, { color: palette.textSecondary }]}>{fact.label}</Text>
      <View testID={fact.testID}>
        {typeof fact.value === "string" ? (
          <Text style={[textStyles.price, { color: palette.text }]}>{ltr(fact.value)}</Text>
        ) : (
          fact.value
        )}
      </View>
    </View>
  );
}

export function DetailFacts({ facts }: { facts: readonly DetailFact[] }) {
  return (
    <View>
      {facts.map((fact) => (
        <FactRow key={fact.testID} fact={fact} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 48,
    paddingBlock: space[8],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
