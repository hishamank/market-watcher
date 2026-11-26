import { RestClientError, useStock, useT, useTrack } from "@mini/core";
import type { Range, Stock } from "@mini/contracts";
import { radius, space } from "@mini/tokens";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { EmptyState } from "../components/empty-state.tsx";
import { RangeTabs } from "../components/range-tabs.tsx";
import { SkeletonBlock } from "../components/skeleton.tsx";
import { useTrackStockOpened } from "../integrations/use-track-stock-opened.ts";
import { selectionHaptic } from "../platform/haptics.ts";
import { ConnectedStockStatistics } from "./connected-stock-statistics.tsx";
import { ConnectedStockNews } from "./connected-stock-news.tsx";
import { ConnectedStockEarnings } from "./connected-stock-earnings.tsx";
import { ConnectedCompanyProfile } from "./connected-company-profile.tsx";
import { ConnectedDetailFacts } from "./connected-detail-facts.tsx";
import { ConnectedDetailHeader } from "./connected-detail-header.tsx";
import { ConnectedPriceChart } from "./connected-price-chart.tsx";
import type { ScrubSelection } from "./scrub.ts";

function DetailContent({ stock }: { stock: Stock }) {
  const [range, setRange] = useState<Range>("1D");
  const [selection, setSelection] = useState<ScrubSelection | undefined>(undefined);
  const track = useTrack();
  const selectRange = (next: Range) => {
    if (next === range) return;
    selectionHaptic();
    track({ name: "range_changed", symbol: stock.symbol, range: next });
    setRange(next);
  };
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <ConnectedDetailHeader stock={stock} range={range} selection={selection} />
      <ConnectedPriceChart
        symbol={stock.symbol}
        range={range}
        selection={selection}
        onScrub={(index) => setSelection(index === undefined ? undefined : { range, index })}
      />
      <RangeTabs range={range} onSelect={selectRange} />
      <ConnectedDetailFacts stock={stock} />
      <ConnectedStockStatistics key={`statistics-${stock.symbol}`} symbol={stock.symbol} />
      <ConnectedStockEarnings key={`earnings-${stock.symbol}`} symbol={stock.symbol} />
      <ConnectedCompanyProfile key={stock.symbol} symbol={stock.symbol} />
      <ConnectedStockNews key={`news-${stock.symbol}`} symbol={stock.symbol} />
    </ScrollView>
  );
}

function DetailSkeleton() {
  return (
    <View testID="detail-skeleton" style={[styles.content, styles.skeleton]}>
      <SkeletonBlock style={styles.skeletonName} />
      <SkeletonBlock style={styles.skeletonPrice} />
      <SkeletonBlock style={styles.skeletonChart} />
    </View>
  );
}

function DetailFailure({
  symbol,
  error,
  onRetry,
}: {
  symbol: string;
  error: Error;
  onRetry: () => void;
}) {
  const t = useT();
  const router = useRouter();
  if (error instanceof RestClientError && error.code === "not_found") {
    return (
      <EmptyState
        testID="not-found"
        icon="?"
        title={t("detail.notFound.title")}
        help={t("detail.notFound.help", { symbol })}
        actionLabel={t("detail.notFound.action")}
        actionTestID="not-found-back"
        onAction={() => router.back()}
      />
    );
  }
  return (
    <EmptyState
      testID="detail-error"
      icon="!"
      title={t("detail.error.title")}
      help={t("detail.error.help")}
      actionLabel={t("detail.error.retry")}
      actionTestID="detail-retry"
      onAction={onRetry}
    />
  );
}

export function DetailScreen({ symbol }: { symbol: string }) {
  const query = useStock(symbol);
  useTrackStockOpened(symbol);
  const stock = query.data?.stock;
  return (
    <>
      <Stack.Screen options={{ title: symbol }} />
      {stock !== undefined ? (
        <DetailContent stock={stock} />
      ) : query.error === null ? (
        <DetailSkeleton />
      ) : (
        <DetailFailure symbol={symbol} error={query.error} onRetry={() => void query.refetch()} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[16], gap: space[16] },
  skeleton: { alignItems: "flex-start" },
  skeletonName: { width: 140, height: 16, borderRadius: radius.xs },
  skeletonPrice: { width: 180, height: 40, borderRadius: radius.xs },
  skeletonChart: { alignSelf: "stretch", height: 252, borderRadius: radius.lg },
});
