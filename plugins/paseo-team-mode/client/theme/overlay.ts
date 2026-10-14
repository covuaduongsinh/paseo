import type { ViewStyle } from "react-native";

/** react-native-web accepts `position: "fixed"`; the React Native types do not list it. */
export const FIXED_POSITION = "fixed" as unknown as NonNullable<ViewStyle["position"]>;
