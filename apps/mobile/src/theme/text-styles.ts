import { numeric, type, type TypeStyle } from "@mini/tokens";
import { StyleSheet, type TextStyle } from "react-native";

function toTextStyle(token: TypeStyle): TextStyle {
  return {
    fontSize: token.size,
    lineHeight: token.lineHeight,
    fontWeight: token.weight as TextStyle["fontWeight"],
  };
}

function toNumericStyle(token: TypeStyle): TextStyle {
  return { ...toTextStyle(token), fontVariant: ["tabular-nums"], writingDirection: "ltr" };
}

export const textStyles = StyleSheet.create({
  headingMd: toTextStyle(type.headingMd),
  body: toTextStyle(type.body),
  bodyStrong: toTextStyle(type.bodyStrong),
  label: toTextStyle(type.label),
  caption: { ...toTextStyle(type.caption), writingDirection: "ltr" },
  price: toNumericStyle(numeric.price),
  change: toNumericStyle(numeric.change),
  display: toNumericStyle(numeric.display),
});
