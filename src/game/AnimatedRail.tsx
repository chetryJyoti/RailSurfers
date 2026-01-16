import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { SCREEN_HEIGHT } from './constants';

// Rail segment configuration
const DASH_HEIGHT = 40;
const DASH_GAP = 30;
const SEGMENT_HEIGHT = DASH_HEIGHT + DASH_GAP;
// Calculate how many segments we need to fill screen + one extra for seamless loop
const SEGMENT_COUNT = Math.ceil(SCREEN_HEIGHT / SEGMENT_HEIGHT) + 2;

type AnimatedRailProps = {
  left: number;
  railOffset: SharedValue<number>;
};

export default function AnimatedRail({ left, railOffset }: AnimatedRailProps) {
  const animatedStyle = useAnimatedStyle(() => {
    // Use modulo to create seamless looping
    const offset = railOffset.value % SEGMENT_HEIGHT;
    return {
      transform: [{ translateY: offset }],
    };
  });

  // Create array of dash segments
  const segments = [];
  for (let i = 0; i < SEGMENT_COUNT; i++) {
    segments.push(
      <View
        key={i}
        style={[
          styles.dash,
          { top: i * SEGMENT_HEIGHT - SEGMENT_HEIGHT }, // Start one segment above screen
        ]}
      />
    );
  }

  return (
    <Animated.View style={[styles.railContainer, { left }, animatedStyle]}>
      {segments}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  railContainer: {
    position: 'absolute',
    top: 0,
    width: 3,
    height: SCREEN_HEIGHT + SEGMENT_HEIGHT * 2,
  },
  dash: {
    position: 'absolute',
    width: 3,
    height: DASH_HEIGHT,
    backgroundColor: '#333',
    borderRadius: 1,
  },
});
