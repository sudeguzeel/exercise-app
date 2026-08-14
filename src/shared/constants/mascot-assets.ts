import type { ImageSourcePropType } from "react-native";

export const HOME_MASCOTS: readonly ImageSourcePropType[] = [
  require("../../../assets/images/mascots/home/bunny_01.png"),
  require("../../../assets/images/mascots/home/bunny_02.png"),
  require("../../../assets/images/mascots/home/bunny_03.png"),
];

export const PROGRESS_MASCOTS: readonly ImageSourcePropType[] = [
  require("../../../assets/images/mascots/progress/bunny_06.png"),
  require("../../../assets/images/mascots/progress/bunny_07.png"),
  require("../../../assets/images/mascots/progress/bunny_08.png"),
];

export const WORKOUT_MASCOTS: readonly ImageSourcePropType[] = [
  require("../../../assets/images/mascots/workout/bunny_10.png"),
  require("../../../assets/images/mascots/workout/bunny_11.png"),
  require("../../../assets/images/mascots/workout/bunny_12.png"),
];

export const REST_MASCOTS: readonly ImageSourcePropType[] = [
  require("../../../assets/images/mascots/rest/bunny_14.png"),
  require("../../../assets/images/mascots/rest/bunny_15.png"),
  require("../../../assets/images/mascots/rest/bunny_16.png"),
];

export const WORKOUT_DETAIL_MASCOTS = {
  standing: PROGRESS_MASCOTS[2],
  shakerThumbsUp: require("../../../assets/images/mascots/workout-detail/harika_antrenman_bunny.png"),
} as const satisfies Record<string, ImageSourcePropType>;

export const WORKOUT_COMPLETE_MASCOT: ImageSourcePropType = require("../../../assets/images/mascots/workout-complete/bunny_celebration.png");
