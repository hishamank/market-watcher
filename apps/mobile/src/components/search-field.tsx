import { MAX_SEARCH_QUERY_LENGTH } from "@mini/contracts";
import { useT } from "@mini/core";
import { radius, space } from "@mini/tokens";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";
import { Icon, type IconName } from "./icon.tsx";

export interface SearchFieldProps {
  query: string;
  isFetching: boolean;
  rtl: boolean;
  onChangeQuery: (query: string) => void;
  onClear: () => void;
  onBack: () => void;
}

interface IconButtonProps {
  testID: string;
  label: string;
  icon: IconName;
  mirrored?: boolean;
  onPress: () => void;
}

function IconButton({ testID, label, icon, mirrored, onPress }: IconButtonProps) {
  const palette = usePalette();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: palette.hover }]}
    >
      <Icon name={icon} color={palette.textSecondary} size={22} mirrored={mirrored === true} />
    </Pressable>
  );
}

function FieldEnd({ query, isFetching, onClear }: SearchFieldProps) {
  const t = useT();
  const palette = usePalette();
  if (isFetching) {
    return (
      <View style={styles.iconButton}>
        <ActivityIndicator color={palette.textSecondary} />
      </View>
    );
  }
  if (query.length === 0) return null;
  return (
    <IconButton testID="search-clear" label={t("search.clear")} icon="close" onPress={onClear} />
  );
}

export function SearchField(props: SearchFieldProps) {
  const t = useT();
  const palette = usePalette();
  const textStyles = useTextStyles();
  const [focused, setFocused] = useState(false);
  const fieldStyle = focused
    ? { borderColor: palette.focus, outlineColor: palette.focus, outlineWidth: 1 }
    : { borderColor: palette.fill, outlineWidth: 0 };
  return (
    <View style={[styles.bar, { borderColor: palette.border }]}>
      <IconButton
        testID="search-back"
        label={t("chaos.close")}
        icon="chevronStart"
        mirrored={props.rtl}
        onPress={props.onBack}
      />
      <View style={[styles.field, { backgroundColor: palette.fill }, fieldStyle]}>
        <Icon name="search" color={palette.textSecondary} />
        <TextInput
          testID="search-input"
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          autoComplete="off"
          returnKeyType="search"
          maxLength={MAX_SEARCH_QUERY_LENGTH}
          accessibilityLabel={t("search.placeholder")}
          placeholder={t("search.placeholder")}
          placeholderTextColor={palette.textSecondary}
          value={props.query}
          onChangeText={props.onChangeQuery}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[textStyles.body, styles.input, { color: palette.text }]}
        />
        <FieldEnd {...props} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[6],
    paddingInline: space[10],
    paddingBlock: space[10],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: space[8],
    minHeight: 48,
    paddingStart: 14,
    paddingEnd: space[4],
    borderRadius: radius.lg,
    borderWidth: 1,
    outlineStyle: "solid",
  },
  input: { flex: 1, minWidth: 0, paddingBlock: space[10] },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
  },
});
