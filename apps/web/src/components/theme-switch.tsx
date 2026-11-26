import { useId } from "react";

interface ThemeSwitchProps {
  dark: boolean;
  label: string;
  onToggle: () => void;
}

export function ThemeSwitch({ dark, label, onToggle }: ThemeSwitchProps) {
  const maskId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={label}
      title={label}
      data-testid="theme-switch"
      className="theme-switch"
      onClick={onToggle}
    >
      <span className="theme-switch-orbit" aria-hidden="true" />
      <svg className="theme-switch-sky" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect width="32" height="32" fill="white" />
            <circle className="theme-switch-shadow" cx="32" cy="0" r="8" fill="black" />
          </mask>
        </defs>
        <g
          className="theme-switch-rays"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <path d="M16 3v3m0 20v3M3 16h3m20 0h3M6.8 6.8l2.1 2.1m14.2 14.2 2.1 2.1M6.8 25.2l2.1-2.1M23.1 8.9l2.1-2.1" />
        </g>
        <circle
          className="theme-switch-body"
          cx="16"
          cy="16"
          r="7"
          fill="currentColor"
          mask={`url(#${maskId})`}
        />
        <path
          className="theme-switch-star"
          d="m25 5 .9 2.6L28.5 8l-2.6.9L25 11.5l-.9-2.6L21.5 8l2.6-.4Z"
          fill="currentColor"
        />
      </svg>
    </button>
  );
}
