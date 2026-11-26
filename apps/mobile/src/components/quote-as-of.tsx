import { radius, space } from "@mini/tokens";
import { Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { textStyles } from "../theme/text-styles.ts";
import { ltr } from "./ltr.ts";

export function QuoteAsOf({ label, help }: { label: string; help: string }) {
  const palette = usePalette();
  return (
    <View testID="detail-price-as-of">
      <Text
        style={[
          textStyles.caption,
          {
            alignSelf: "flex-start",
            backgroundColor: palette.staleTint,
            color: palette.text,
            borderRadius: radius.pill,
            paddingInline: space[10],
            paddingBlock: 3,
          },
        ]}
      >
        <Text style={{ color: palette.stale }}>{ltr("◷ ")}</Text>
        {label}
      </Text>
      <Text style={[textStyles.caption, { color: palette.textSecondary }]}>{help}</Text>
    </View>
  );
}
