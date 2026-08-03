import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { AuthColors } from "@/shared/constants/theme";
import { supabase } from "@/shared/lib/supabase";

type Destination = "/login" | "/(main)" | "/onboarding/personal-info";

export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
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

      setDestination(onboardingCompleted ? "/(main)" : "/onboarding/personal-info");
    });

    return () => {
      mounted = false;
    };
  }, []);

  if (!destination) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={AuthColors.primaryDark} size="large" />
      </View>
    );
  }

  return <Redirect href={destination} />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: AuthColors.background,
  },
});
