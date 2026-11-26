import { formatPrice } from "@mini/core";
import { Text } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";
import { ltr } from "./ltr.ts";

export interface PriceTextProps {
  asOf?: string | undefined;
  price: string;
  stale: boolean;
  testID: string;
  display?: boolean;
}

export function PriceText({ asOf, price, stale, testID, display = false }: PriceTextProps) {
  const palette = usePalette();
  return (
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
  );
}
