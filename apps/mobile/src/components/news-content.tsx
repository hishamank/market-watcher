import { useT, type StockNewsView } from "@mini/core";
import { space, radius } from "@mini/tokens";
import { Image, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { usePalette } from "../theme/palette.ts";
import { useTextStyles } from "../theme/text-styles.ts";

type ReadyNews = Extract<StockNewsView, { status: "ready" }>;
type ArticleView = ReadyNews["articles"][number];

function Headline({ article }: { article: ArticleView }) {
  const palette = usePalette();
  const text = useTextStyles();
  return (
    <>
      <View style={styles.words}>
        <Text style={[text.caption, { color: palette.textMuted }]}>
          {article.publisher} · {article.publishedLabel}
        </Text>
        <Text style={[text.bodyStrong, { color: palette.text }]}>{article.title}</Text>
      </View>
      {article.thumbnail && (
        <Image
          source={{ uri: article.thumbnail }}
          accessible={false}
          onError={article.onImageError}
          style={styles.image}
        />
      )}
      {article.href && (
        <Text accessible={false} style={{ color: palette.textMuted }}>
          ↗
        </Text>
      )}
    </>
  );
}

export function NewsContent({ view }: { view: ReadyNews }) {
  const palette = usePalette();
  const text = useTextStyles();
  const t = useT();
  return (
    <>
      <View>
        {view.articles.map((article) => (
          <View
            key={article.id}
            testID="news-story"
            style={{ borderBottomWidth: 1, borderColor: palette.border }}
          >
            {article.href ? (
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={article.title}
                onPress={() => {
                  if (article.href) void Linking.openURL(article.href);
                }}
                style={styles.row}
              >
                <Headline article={article} />
              </Pressable>
            ) : (
              <View style={styles.row}>
                <Headline article={article} />
              </View>
            )}
          </View>
        ))}
      </View>
      {view.hasMore && (
        <Pressable
          testID="news-more"
          accessibilityRole="button"
          accessibilityState={{ expanded: view.expanded }}
          onPress={view.toggle}
          style={styles.action}
        >
          <Text style={[text.label, { color: palette.text, textDecorationLine: "underline" }]}>
            {t(view.expanded ? "news.less" : "news.more")}
          </Text>
        </Pressable>
      )}
      {view.sourceUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            if (view.sourceUrl) void Linking.openURL(view.sourceUrl);
          }}
          style={styles.action}
        >
          <Text style={[text.caption, { color: palette.textMuted }]}>{view.attribution}</Text>
        </Pressable>
      ) : (
        <Text style={[text.caption, { color: palette.textMuted }]}>{view.attribution}</Text>
      )}
      {view.retrieved && (
        <Text style={[text.caption, { color: palette.textMuted }]}>{view.retrieved}</Text>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: space[12], paddingVertical: space[20] },
  words: { flex: 1, gap: space[8] },
  image: { width: 80, height: 64, borderRadius: radius.md },
  action: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
});
