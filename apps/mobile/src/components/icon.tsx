import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

const paths = {
  star: "M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z",
  markets: "M4 16.5l4.5-4.5 3.5 3 7.5-8M15 7h4.5v4.5",
  search: "M10.5 4.5a6 6 0 1 0 0 12a6 6 0 1 0 0-12zM15 15l4.5 4.5",
  chevronStart: "M14.5 5.5L8 12l6.5 6.5",
  close: "M6.5 6.5l11 11M17.5 6.5l-11 11",
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
