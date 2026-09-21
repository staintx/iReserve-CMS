import React, { useState, useEffect, useCallback, useRef } from "react";
import { Platform } from "react-native";
import { useOnboarding } from "../../context/OnboardingContext";
import CoachMarkOverlay from "./CoachMarkOverlay";

export const CoachMarkSequence = ({
  screenKey,
  steps = [],
  autoStart = true,
  delayMs = 600,
  onComplete,
}) => {
  const { hasSeenCoachMark, markCoachMarkSeen, isLoading } = useOnboarding();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetLayout, setTargetLayout] = useState(null);
  const measureTimerRef = useRef(null);

  // Check if sequence should be active
  useEffect(() => {
    if (isLoading || !autoStart || !screenKey || steps.length === 0) {
      return;
    }

    const seen = hasSeenCoachMark(screenKey);
    if (!seen) {
      const timer = setTimeout(() => {
        setIsActive(true);
      }, delayMs);
      return () => clearTimeout(timer);
    } else {
      setIsActive(false);
    }
  }, [isLoading, autoStart, screenKey, hasSeenCoachMark, delayMs, steps.length]);

  // Measure current step's target element
  const measureCurrentTarget = useCallback(() => {
    if (!isActive || !steps[currentStepIndex]) return;

    const currentStep = steps[currentStepIndex];
    const ref = currentStep.targetRef?.current;

    if (!ref) {
      setTargetLayout(null);
      return;
    }

    const tryMeasure = (retriesLeft = 3) => {
      try {
        if (typeof ref.measureInWindow === "function") {
          ref.measureInWindow((x, y, width, height) => {
            if (width > 0 && height > 0) {
              setTargetLayout({ x, y, width, height });
            } else if (retriesLeft > 0) {
              measureTimerRef.current = setTimeout(() => tryMeasure(retriesLeft - 1), 150);
            } else {
              setTargetLayout(null);
            }
          });
        } else if (typeof ref.measure === "function") {
          ref.measure((fx, fy, width, height, px, py) => {
            if (width > 0 && height > 0) {
              setTargetLayout({ x: px, y: py, width, height });
            } else if (retriesLeft > 0) {
              measureTimerRef.current = setTimeout(() => tryMeasure(retriesLeft - 1), 150);
            } else {
              setTargetLayout(null);
            }
          });
        } else {
          setTargetLayout(null);
        }
      } catch (err) {
        console.warn("Coach mark measurement failed:", err);
        setTargetLayout(null);
      }
    };

    // Slight delay to allow layout to settle
    measureTimerRef.current = setTimeout(() => {
      tryMeasure(3);
    }, Platform.OS === "web" ? 50 : 100);
  }, [isActive, currentStepIndex, steps]);

  useEffect(() => {
    measureCurrentTarget();
    return () => {
      if (measureTimerRef.current) clearTimeout(measureTimerRef.current);
    };
  }, [measureCurrentTarget]);

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleSkip = async () => {
    setIsActive(false);
    if (screenKey) {
      await markCoachMarkSeen(screenKey);
    }
    onComplete?.();
  };

  const handleComplete = async () => {
    setIsActive(false);
    if (screenKey) {
      await markCoachMarkSeen(screenKey);
    }
    onComplete?.();
  };

  if (!isActive || steps.length === 0) return null;

  return (
    <CoachMarkOverlay
      visible={isActive}
      step={steps[currentStepIndex]}
      stepIndex={currentStepIndex}
      totalSteps={steps.length}
      targetLayout={targetLayout}
      onNext={handleNext}
      onSkip={handleSkip}
      onDismiss={handleSkip}
    />
  );
};

export default CoachMarkSequence;
