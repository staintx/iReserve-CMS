import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";

const ONBOARDING_PREFIX = "@ireserve_onboarding_completed_";
const COACH_MARK_PREFIX = "@ireserve_coach_seen_";

const OnboardingContext = createContext({
  isLoading: true,
  hasCompletedOnboarding: false,
  isReplayingOnboarding: false,
  completeOnboarding: async () => {},
  replayOnboarding: () => {},
  dismissReplay: () => {},
  hasSeenCoachMark: () => false,
  markCoachMarkSeen: async () => {},
  resetCoachMarks: async () => {},
  resetAll: async () => {},
});

export const OnboardingProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const currentRole = user?.role || "customer";

  const [isLoading, setIsLoading] = useState(true);
  const [completedRoles, setCompletedRoles] = useState({});
  const [seenCoachMarks, setSeenCoachMarks] = useState({});
  const [isReplayingOnboarding, setIsReplayingOnboarding] = useState(false);

  // Load all onboarding and coach mark flags from AsyncStorage
  const loadState = useCallback(async () => {
    try {
      setIsLoading(true);
      const allKeys = await AsyncStorage.getAllKeys();

      // Extract onboarding completions
      const onboardingKeys = allKeys.filter((k) => k.startsWith(ONBOARDING_PREFIX));
      const coachKeys = allKeys.filter((k) => k.startsWith(COACH_MARK_PREFIX));

      const rolesState = {};
      if (onboardingKeys.length > 0) {
        const onboardingPairs = await AsyncStorage.multiGet(onboardingKeys);
        onboardingPairs.forEach(([key, value]) => {
          const role = key.replace(ONBOARDING_PREFIX, "");
          rolesState[role] = value === "true";
        });
      }

      const coachState = {};
      if (coachKeys.length > 0) {
        const coachPairs = await AsyncStorage.multiGet(coachKeys);
        coachPairs.forEach(([key, value]) => {
          const screenKey = key.replace(COACH_MARK_PREFIX, "");
          coachState[screenKey] = value === "true";
        });
      }

      setCompletedRoles(rolesState);
      setSeenCoachMarks(coachState);
    } catch (error) {
      console.warn("Failed to load onboarding/coach mark states:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Check if current user has completed onboarding
  const hasCompletedOnboarding = Boolean(completedRoles[currentRole]);

  // Mark onboarding complete for a role
  const completeOnboarding = useCallback(
    async (roleToComplete) => {
      const targetRole = roleToComplete || currentRole;
      try {
        await AsyncStorage.setItem(`${ONBOARDING_PREFIX}${targetRole}`, "true");
        setCompletedRoles((prev) => ({ ...prev, [targetRole]: true }));
        setIsReplayingOnboarding(false);
      } catch (error) {
        console.warn(`Failed to save onboarding completion for ${targetRole}:`, error);
      }
    },
    [currentRole]
  );

  // Trigger onboarding replay manually (e.g. from Profile help)
  const replayOnboarding = useCallback(() => {
    setIsReplayingOnboarding(true);
  }, []);

  const dismissReplay = useCallback(() => {
    setIsReplayingOnboarding(false);
  }, []);

  // Check if coach mark for a specific screen key has been seen
  const hasSeenCoachMark = useCallback(
    (screenKey) => {
      return Boolean(seenCoachMarks[screenKey]);
    },
    [seenCoachMarks]
  );

  // Mark coach mark for a screen key as seen
  const markCoachMarkSeen = useCallback(async (screenKey) => {
    try {
      await AsyncStorage.setItem(`${COACH_MARK_PREFIX}${screenKey}`, "true");
      setSeenCoachMarks((prev) => ({ ...prev, [screenKey]: true }));
    } catch (error) {
      console.warn(`Failed to save coach mark seen for ${screenKey}:`, error);
    }
  }, []);

  // Reset coach mark flags (optionally for a specific screenKey)
  const resetCoachMarks = useCallback(
    async (screenKey) => {
      try {
        if (screenKey) {
          await AsyncStorage.removeItem(`${COACH_MARK_PREFIX}${screenKey}`);
          setSeenCoachMarks((prev) => {
            const next = { ...prev };
            delete next[screenKey];
            return next;
          });
        } else {
          const allKeys = await AsyncStorage.getAllKeys();
          const coachKeys = allKeys.filter((k) => k.startsWith(COACH_MARK_PREFIX));
          if (coachKeys.length > 0) {
            await AsyncStorage.multiRemove(coachKeys);
          }
          setSeenCoachMarks({});
        }
      } catch (error) {
        console.warn("Failed to reset coach marks:", error);
      }
    },
    []
  );

  // Reset all onboarding & coach marks (for dev testing or complete reset)
  const resetAll = useCallback(async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const relevantKeys = allKeys.filter(
        (k) => k.startsWith(ONBOARDING_PREFIX) || k.startsWith(COACH_MARK_PREFIX)
      );
      if (relevantKeys.length > 0) {
        await AsyncStorage.multiRemove(relevantKeys);
      }
      setCompletedRoles({});
      setSeenCoachMarks({});
      setIsReplayingOnboarding(false);
    } catch (error) {
      console.warn("Failed to reset all onboarding data:", error);
    }
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isLoading,
        hasCompletedOnboarding,
        isReplayingOnboarding,
        completeOnboarding,
        replayOnboarding,
        dismissReplay,
        hasSeenCoachMark,
        markCoachMarkSeen,
        resetCoachMarks,
        resetAll,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);

export default OnboardingContext;
