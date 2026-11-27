import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

const paths = {
  star: "M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z",
  markets: "M4 16.5l4.5-4.5 3.5 3 7.5-8M15 7h4.5v4.5",
  search: "M10.5 4.5a6 6 0 1 0 0 12a6 6 0 1 0 0-12zM15 15l4.5 4.5",
  chevronStart: "M14.5 5.5L8 12l6.5 6.5",
  close: "M6.5 6.5l11 11M17.5 6.5l-11 11",
  moon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z",
  gear: "M18.7 9.5L21.3 10.1L21.3 13.9L18.7 14.5L18.6 15.0L19.9 17.2L17.2 19.9L15.0 18.6L14.5 18.7L13.9 21.3L10.1 21.3L9.5 18.7L9.0 18.6L6.8 19.9L4.1 17.2L5.4 15.0L5.3 14.5L2.7 13.9L2.7 10.1L5.3 9.5L5.4 9.0L4.1 6.8L6.8 4.1L9.0 5.4L9.5 5.3L10.1 2.7L13.9 2.7L14.5 5.3L15.0 5.4L17.2 4.1L19.9 6.8L18.6 9.0zM15 12a3 3 0 1 1-6 0a3 3 0 1 1 6 0z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  bolt: "M13 2L4.5 13.5H12L11 22l8.5-11.5H12L13 2z",
  clock: "M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 7.5V12l3 2",
} as const;

export type IconName = keyof typeof paths;

export interface IconProps {
  name: IconName;
  color: ColorValue;
  size?: number;
  filled?: boolean;
  mirrored?: boolean;
}

export function Icon({ name, color, size = 20, filled = false, mirrored = false }: IconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      style={mirrored ? mirror : undefined}
    >
      <Path
        d={paths[name]}
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={filled ? color : "none"}
      />
    </Svg>
  );
}

const mirror = { transform: [{ scaleX: -1 }] };
