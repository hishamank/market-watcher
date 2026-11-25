import { type ConnectionHealth, useT } from "@mini/core";

interface HealthTileProps {
  label: string;
  value: string;
  testId: string;
}

function HealthTile({ label, value, testId }: HealthTileProps) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-fill px-12 py-10">
      <bdi dir="ltr" data-testid={testId} className="text-heading-md">
        {value}
      </bdi>
      <span className="text-caption text-text-secondary">{label}</span>
    </div>
  );
}

export function HealthSection({ health }: { health: ConnectionHealth }) {
  const t = useT();
  const none = t("chaos.health.none");
  const latency =
    health.latencyMs === null ? none : t("chaos.health.latencyValue", { value: health.latencyMs });
  return (
    <div className="flex flex-col gap-12 border-t border-border pt-12">
      <h3 className="text-label text-text-secondary">{t("chaos.section.health")}</h3>
      <div className="grid grid-cols-2 gap-8">
        <HealthTile
          label={t("chaos.health.reconnects")}
          value={String(health.reconnects)}
          testId="health-reconnects"
        />
        <HealthTile
          label={t("chaos.health.fps")}
          value={String(health.framesPerSecond)}
          testId="health-fps"
        />
        <HealthTile label={t("chaos.health.latency")} value={latency} testId="health-latency" />
        <HealthTile
          label={t("chaos.health.skipped")}
          value={health.skippedFrames === null ? none : String(health.skippedFrames)}
          testId="health-skipped"
        />
      </div>
    </div>
  );
}
