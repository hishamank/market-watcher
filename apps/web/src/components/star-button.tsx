import { useT } from "../i18n/use-t.ts";
import { StarIcon } from "./icons.tsx";

export interface StarButtonProps {
  name: string;
  starred: boolean | undefined;
  onToggle: () => void;
  testId: string;
}

export function StarButton({ name, starred, onToggle, testId }: StarButtonProps) {
  const t = useT();
  return (
    <button
      type="button"
      data-testid={testId}
      aria-pressed={starred ?? false}
      aria-label={t("star.label", { name })}
      disabled={starred === undefined}
      onClick={onToggle}
      className="grid size-[44px] shrink-0 place-items-center rounded-md text-text-muted aria-pressed:text-accent-fill disabled:text-border"
    >
      <StarIcon
        filled={starred === true}
        className={starred === true ? "motion-safe:animate-star-on" : undefined}
      />
    </button>
  );
}
