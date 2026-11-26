import { useLocale } from "@mini/core";
import { numeric, type, type TextStyle as TypeTextStyle, type TypeStyle } from "@mini/tokens";
import { StyleSheet, type TextStyle } from "react-native";

function toTextStyle(token: TypeStyle, lineHeight = token.lineHeight): TextStyle {
  return {
    fontSize: token.size,
    lineHeight,
    fontWeight: token.weight as TextStyle["fontWeight"],
  };
}

function toWordStyle(token: TypeTextStyle, arabic: boolean): TextStyle {
  return toTextStyle(token, arabic ? token.arabicLineHeight : token.lineHeight);
}

function toNumericStyle(token: TypeStyle): TextStyle {
  return { ...toTextStyle(token), fontVariant: ["tabular-nums"], writingDirection: "ltr" };
}

function createTextStyles(arabic: boolean) {
  return StyleSheet.create({
    headingMd: toWordStyle(type.headingMd, arabic),
    body: toWordStyle(type.body, arabic),
    bodyStrong: toWordStyle(type.bodyStrong, arabic),
    label: toWordStyle(type.label, arabic),
    caption: arabic
      ? toWordStyle(type.caption, true)
      : { ...toWordStyle(type.caption, false), writingDirection: "ltr" },
    price: toNumericStyle(numeric.price),
    change: toNumericStyle(numeric.change),
    display: toNumericStyle(numeric.display),
  });
}

const latinTextStyles = createTextStyles(false);
const arabicTextStyles = createTextStyles(true);

export function useTextStyles(): typeof latinTextStyles {
  return useLocale() === "ar" ? arabicTextStyles : latinTextStyles;
}
