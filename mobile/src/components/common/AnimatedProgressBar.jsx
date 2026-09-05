import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { colors, radius } from "../../constants/theme";

export const AnimatedProgressBar = ({
  currentStep = 1,
  totalSteps = 5,
  height = 4,
  activeColor = colors.primary,
  backgroundColor = colors.borderLight,
  style,
}) => {
  const animatedWidth = useRef(new Animated.Value((currentStep / totalSteps) * 100)).current;

  useEffect(() => {
    const targetPercentage = Math.min(100, Math.max(0, (currentStep / totalSteps) * 100));
    Animated.timing(animatedWidth, {
      toValue: targetPercentage,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [currentStep, totalSteps, animatedWidth]);

  const widthInterpolate = animatedWidth.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <View style={[styles.track, { height, backgroundColor }, style]}>
      <Animated.View
        style={[
          styles.fill,
          {
            height,
            backgroundColor: activeColor,
            width: widthInterpolate,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  track: {
    width: "100%",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fill: {
    borderRadius: radius.full,
  },
});

export default AnimatedProgressBar;
