import { Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { SplashScreen } from "@/shared/components/SplashScreen";
import { supabase } from "@/shared/lib/supabase";

type Destination = "/login" | "/(main)" | "/onboarding/personal-info";

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      const session = data.session;

      if (!session) {
        setDestination("/login");
        return;
      }

      const onboardingCompleted =
        session.user.user_metadata?.onboarding_completed === true;

      setDestination(
        onboardingCompleted ? "/(main)" : "/onboarding/personal-info",
      );
    }

    void checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  if (!destination) {
    return <SplashScreen />;
}

  return <Redirect href={destination} />;
}