export const DEFAULT_PROGRAM_EXERCISE_REST_SECONDS = 60;
export const MAX_PROGRAM_EXERCISE_REST_SECONDS = 300;

export function clampRestSeconds(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_PROGRAM_EXERCISE_REST_SECONDS;
  return Math.min(
    MAX_PROGRAM_EXERCISE_REST_SECONDS,
    Math.max(0, Math.round(value)),
  );
}

export function resolveProgramExerciseRestSeconds({
  customRestSeconds,
  recommendedRestSeconds,
}: {
  customRestSeconds: number | null | undefined;
  recommendedRestSeconds: number | null | undefined;
}) {
  const selectedRestSeconds =
    customRestSeconds !== null && customRestSeconds !== undefined
      ? customRestSeconds
      : recommendedRestSeconds;

  return selectedRestSeconds === null || selectedRestSeconds === undefined
    ? DEFAULT_PROGRAM_EXERCISE_REST_SECONDS
    : clampRestSeconds(selectedRestSeconds);
}

export function formatRestDuration(seconds: number) {
  const normalizedSeconds = clampRestSeconds(seconds);
  const minutes = Math.floor(normalizedSeconds / 60);
  const remainingSeconds = normalizedSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

export function extendRestSeconds(
  currentRemainingSeconds: number,
  extensionSeconds = 15,
) {
  const current = Number.isFinite(currentRemainingSeconds)
    ? Math.min(
        MAX_PROGRAM_EXERCISE_REST_SECONDS,
        Math.max(0, Math.round(currentRemainingSeconds)),
      )
    : 0;
  const extension = Number.isFinite(extensionSeconds)
    ? Math.max(0, Math.round(extensionSeconds))
    : 0;
  return Math.min(
    current + extension,
    MAX_PROGRAM_EXERCISE_REST_SECONDS,
  );
}
