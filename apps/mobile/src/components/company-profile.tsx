import { useT, type CompanyProfileView } from "@mini/core";
import { space } from "@mini/tokens";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

export function CompanyProfile({ view }: { view: CompanyProfileView }) {
  const t = useT();
  const palette = usePalette();
  const textStyles = useTextStyles();
  const body = [textStyles.body, { color: palette.textSecondary }];
  return (
    <View testID="company-profile" style={[styles.section, { borderColor: palette.border }]}>
      <Text accessibilityRole="header" style={[textStyles.headingMd, { color: palette.text }]}>
        {view.status === "ready" ? view.heading : t("profile.about")}
      </Text>
      {view.status === "ready" ? (
        <>
          <Text testID="company-description" style={[body, styles.description]}>
            {view.description}
          </Text>
          {view.hasMore && (
            <Pressable
              testID="company-profile-toggle"
              accessibilityRole="button"
              accessibilityState={{ expanded: view.expanded }}
              onPress={view.toggle}
              style={styles.action}
            >
              <Text style={[textStyles.label, { color: palette.text }]}>
                {t(view.expanded ? "profile.less" : "profile.more")}
              </Text>
            </Pressable>
          )}
          <ProfileFacts view={view} />
          <Text
            testID="company-profile-source"
            style={[textStyles.caption, { color: palette.textMuted }]}
          >
            {view.attribution}
            {view.retrieved ? `\n${view.retrieved}` : ""}
          </Text>
        </>
      ) : (
        <>
          <Text style={body}>
            {t(
              view.status === "loading"
                ? "profile.loading"
                : view.status === "error"
                  ? "profile.error"
                  : "profile.empty",
            )}
          </Text>
          {view.status === "error" && (
            <Pressable
              accessibilityRole="button"
              testID="company-profile-retry"
              onPress={view.retry}
              style={styles.action}
            >
              <Text style={[textStyles.label, { color: palette.text }]}>{t("profile.retry")}</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

function ProfileFacts({ view }: { view: Extract<CompanyProfileView, { status: "ready" }> }) {
  const t = useT();
  const palette = usePalette();
  const textStyles = useTextStyles();
  return (
    <View style={[styles.facts, { borderColor: palette.border }]}>
      {view.facts.map((fact) => (
        <View key={fact.id} style={styles.fact}>
          <Text style={[textStyles.label, { color: palette.textMuted }]}>{fact.label}</Text>
          <Text
            testID={`company-profile-${fact.id}`}
            style={[textStyles.bodyStrong, { color: palette.text }]}
          >
            {fact.value}
          </Text>
        </View>
      ))}
      {view.website && (
        <View style={styles.fact}>
          <Text style={[textStyles.label, { color: palette.textMuted }]}>
            {t("profile.website")}
          </Text>
          <Pressable
            accessibilityRole="link"
            testID="company-profile-website"
            onPress={() => {
              if (view.website) void Linking.openURL(view.website.url);
            }}
            style={styles.action}
          >
            <Text style={[textStyles.bodyStrong, { color: palette.text }]}>
              {view.website.label} ↗
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { borderTopWidth: 1, paddingTop: space[24], marginTop: space[8], gap: space[16] },
  description: { lineHeight: 27 },
  action: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  facts: {
    borderTopWidth: 1,
    paddingTop: space[20],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space[20],
  },
  fact: { width: "45%", gap: space[6] },
});
