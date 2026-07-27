export type RegisterInput = {
  email: string;
  password: string;
};

export type RegisterResult =
  | { success: true }
  | { success: false; reason: "EMAIL_ALREADY_REGISTERED" };

const MOCK_REGISTER_DELAY_MS = 1200;
const REGISTERED_EMAIL = "kayitli@eposta.com";

export async function registerUser({
  email,
}: RegisterInput): Promise<RegisterResult> {
  await new Promise((resolve) =>
    setTimeout(resolve, MOCK_REGISTER_DELAY_MS),
  );

  if (email.trim().toLocaleLowerCase() === REGISTERED_EMAIL) {
    return {
      success: false,
      reason: "EMAIL_ALREADY_REGISTERED",
    };
  }

  return { success: true };
}
