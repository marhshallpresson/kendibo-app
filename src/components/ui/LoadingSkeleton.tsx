import React, { useEffect, useState } from 'react';
import { View, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { radii, spacing } from '../../constants/theme';
import { useAppTheme } from '../../constants/ThemeContext';

export interface LoadingSkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  lines?: number;
  testID?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  width = '100%',
  height = 18,
  borderRadius = radii.sm,
  style,
  lines = 1,
  testID,
}) => {
  const [opacityAnim] = useState(() => new Animated.Value(0.3));
  const { colors } = useAppTheme();

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.8,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [opacityAnim]);

  if (lines > 1) {
    return (
      <View style={styles.multiLineContainer} testID={testID}>
        {Array.from({ length: lines }).map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.skeleton,
              {
                width: i === lines - 1 ? '70%' : width,
                height,
                borderRadius,
                opacity: opacityAnim,
                backgroundColor: colors.surfaceHover,
                marginBottom: i === lines - 1 ? 0 : spacing.sm,
              },
              style,
            ]}
          />
        ))}
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          opacity: opacityAnim,
          backgroundColor: colors.surfaceHover,
        },
        style,
      ]}
      testID={testID}
    />
  );
};

const styles = StyleSheet.create({
  skeleton: {},
  multiLineContainer: {
    width: '100%',
  },
});
