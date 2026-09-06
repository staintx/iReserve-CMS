import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../../constants/theme";

/**
 * SerratedDivider — Glovo-style ticket-stub zig-zag separator
 * Perfect for receipt cuts, quotations, and itemized billing summaries.
 */
export const SerratedDivider = ({
  color = colors.background,
  teethCount = 28,
  teethHeight = 8,
  style,
}) => {
  const screenWidth = Dimensions.get("window").width;
  const toothWidth = screenWidth / teethCount;

  // Build SVG path for a continuous series of inverted triangles (zig-zag)
  let d = `M 0 0 `;
  for (let i = 0; i < teethCount; i++) {
    const startX = i * toothWidth;
    const midX = startX + toothWidth / 2;
    const endX = (i + 1) * toothWidth;
    d += `L ${midX} ${teethHeight} L ${endX} 0 `;
  }
  d += `L ${screenWidth} ${teethHeight * 2} L 0 ${teethHeight * 2} Z`;

  return (
    <View style={[styles.container, { height: teethHeight }, style]}>
      <Svg width="100%" height={teethHeight} viewBox={`0 0 ${screenWidth} ${teethHeight}`}>
        <Path
          d={d}
          fill={color}
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    overflow: "hidden",
    marginVertical: 4,
  },
});

export default SerratedDivider;
