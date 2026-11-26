import type { ColorValue } from "react-native";
import Svg, { Path } from "react-native-svg";

const paths = {
  star: "M12 3.6l2.5 5.2 5.7.8-4.1 4 1 5.7-5.1-2.7-5.1 2.7 1-5.7-4.1-4 5.7-.8z",
  markets: "M4 16.5l4.5-4.5 3.5 3 7.5-8M15 7h4.5v4.5",
} as const;

export type IconName = keyof typeof paths;

export interface IconProps {
  name: IconName;
  color: ColorValue;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, color, size = 20, filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
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
