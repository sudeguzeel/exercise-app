import { router } from "expo-router";
import { useEffect, useState } from "react";

import { SplashScreen } from "@/shared/components/SplashScreen";
import { supabase } from "@/shared/lib/supabase";

type Destination = "/login" | "/(main)" | "/onboarding/personal-info";

const MINIMUM_SPLASH_DURATION = 2200;
const EXIT_ANIMATION_DURATION = 700;

export default function Index() {
  const [isLeavingSplash, setIsLeavingSplash] = useState(false);

  useEffect(() => {
    let mounted = true;
    let exitTimeout: ReturnType<typeof setTimeout> | undefined;

    async function checkSession() {
      const startedAt = Date.now();

      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      const session = data.session;

      let destination: Destination;

      if (!session) {
        destination = "/login";
      } else {
        const onboardingCompleted =
          session.user.user_metadata?.onboarding_completed === true;

        destination = onboardingCompleted
          ? "/(main)"
          : "/onboarding/personal-info";
      }

      const elapsed = Date.now() - startedAt;

      const remaining = Math.max(
        MINIMUM_SPLASH_DURATION - elapsed,
        0,
      );

      await new Promise((resolve) =>
        setTimeout(resolve, remaining),
      );

      if (!mounted) {
        return;
      }

      setIsLeavingSplash(true);

      exitTimeout = setTimeout(() => {
        if (mounted) {
          router.replace(destination);
        }
      }, EXIT_ANIMATION_DURATION);
    }

    void checkSession();

    return () => {
      mounted = false;

      if (exitTimeout) {
        clearTimeout(exitTimeout);
      }
    };
  }, []);

  return <SplashScreen isLeaving={isLeavingSplash} />;
}