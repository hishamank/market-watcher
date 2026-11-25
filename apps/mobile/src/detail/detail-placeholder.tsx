import { useQuote, useStock } from "@mini/core";
import { space } from "@mini/tokens";
import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PriceText } from "../components/price-text.tsx";
import { GraphCheck } from "../integrations/graph-check.tsx";
import { usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";

export function DetailPlaceholder({ symbol }: { symbol: string }) {
  const palette = usePalette();
  const stock = useStock(symbol);
  const quote = useQuote(symbol) ?? stock.data?.stock.quote;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: symbol }} />
      <View testID="detail-header" style={styles.header}>
        <Text testID="detail-name" style={[textStyles.body, { color: palette.textSecondary }]}>
          {stock.data?.stock.name}
        </Text>
        {quote === undefined ? null : (
          <PriceText price={quote.price} stale={false} testID="detail-price" display />
        )}
      </View>
      <GraphCheck />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[16], gap: space[24] },
  header: { alignItems: "flex-start", gap: space[4] },
});
