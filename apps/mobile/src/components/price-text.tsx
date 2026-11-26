import { formatPrice, type FlashDirection } from "@mini/core";
import { StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";
import { FlashTint } from "./flash-tint.tsx";
import { ltr } from "./ltr.ts";

export interface PriceTextProps {
  asOf?: string | undefined;
  price: string;
  stale: boolean;
  testID: string;
  display?: boolean;
  flash?: FlashDirection | undefined;
  flashKey?: number | undefined;
}

export function PriceText(props: PriceTextProps) {
  const { asOf, price, stale, testID, display = false, flash, flashKey } = props;
  const palette = usePalette();
  return (
    <View style={display && styles.display}>
      {flash === undefined ? null : <FlashTint key={flashKey} direction={flash} />}
      <Text
        testID={testID}
        style={[
          display ? textStyles.display : textStyles.price,
          { color: stale ? palette.textMuted : palette.text, writingDirection: "ltr" },
        ]}
      >
        {asOf ? (
          <Text
            testID={testID.replace("price-", "as-of-")}
            style={{ color: palette.stale, fontSize: 14 }}
          >
            {ltr("◷ ")}
          </Text>
        ) : null}
        {ltr(formatPrice(price))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  display: { alignSelf: "flex-start" },
});
