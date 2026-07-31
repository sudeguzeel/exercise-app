export type CustomExerciseValueKey = "sets" | "reps" | "restSeconds";

export type CustomExerciseValues = Record<CustomExerciseValueKey, string>;

export type CustomExerciseValueErrors = Partial<
  Record<CustomExerciseValueKey, string>
>;

export type ParsedCustomExerciseValues = {
  sets: number;
  reps: number;
  restSeconds: number;
};

const FIELD_RULES: Record<
  CustomExerciseValueKey,
  { min: number; max: number; message: string }
> = {
  sets: {
    min: 1,
    max: 10,
    message: "Set değeri 1 ile 10 arasında olmalıdır.",
  },
  reps: {
    min: 1,
    max: 100,
    message: "Tekrar değeri 1 ile 100 arasında olmalıdır.",
  },
  restSeconds: {
    min: 0,
    max: 600,
    message: "Dinlenme süresi 0 ile 600 saniye arasında olmalıdır.",
  },
};

export function validateCustomExerciseValue(
  field: CustomExerciseValueKey,
  value: string,
): string | undefined {
  const trimmedValue = value.trim();
  const rule = FIELD_RULES[field];

  if (
    trimmedValue.length === 0 ||
    !/^\d+$/.test(trimmedValue)
  ) {
    return rule.message;
  }

  const parsedValue = Number(trimmedValue);
  if (
    !Number.isSafeInteger(parsedValue) ||
    parsedValue < rule.min ||
    parsedValue > rule.max
  ) {
    return rule.message;
  }

  return undefined;
}

export function validateCustomExerciseValues(
  values: CustomExerciseValues,
):
  | { success: true; values: ParsedCustomExerciseValues }
  | { success: false; errors: CustomExerciseValueErrors } {
  const errors: CustomExerciseValueErrors = {};

  (Object.keys(FIELD_RULES) as CustomExerciseValueKey[]).forEach((field) => {
    const error = validateCustomExerciseValue(field, values[field]);
    if (error) errors[field] = error;
  });

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    values: {
      sets: Number(values.sets.trim()),
      reps: Number(values.reps.trim()),
      restSeconds: Number(values.restSeconds.trim()),
    },
  };
}
