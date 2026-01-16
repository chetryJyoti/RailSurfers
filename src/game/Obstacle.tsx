import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import {
  OBSTACLE_SIZE,
  LANE_WIDTH,
  OBSTACLE_STRIDE,
  OBSTACLE_NORMAL,
  OBSTACLE_HIGH,
  OBSTACLE_LOW,
} from './constants';

const HALF_LANE = LANE_WIDTH / 2;
const HALF_OBSTACLE = OBSTACLE_SIZE / 2;

// Obstacle colors by type
const OBSTACLE_COLORS: Record<number, string> = {
  [OBSTACLE_NORMAL]: '#ff3366', // Pink - lane change to avoid
  [OBSTACLE_HIGH]: '#ff0000',   // Red - slide under
  [OBSTACLE_LOW]: '#ffcc00',    // Yellow - jump over
};

// Obstacle height scales by type
const OBSTACLE_SCALES: Record<number, number> = {
  [OBSTACLE_NORMAL]: 1,
  [OBSTACLE_HIGH]: 1.5,  // Taller obstacle
  [OBSTACLE_LOW]: 0.6,   // Shorter obstacle
};

type ObstacleProps = {
  index: number;
  obstaclePool: SharedValue<Float64Array>;
};

export default function Obstacle({ index, obstaclePool }: ObstacleProps) {
  const animatedStyle = useAnimatedStyle(() => {
    // Each obstacle uses 4 values: y, lane, active, type
    const baseIndex = index * OBSTACLE_STRIDE;
    const y = obstaclePool.value[baseIndex];
    const lane = obstaclePool.value[baseIndex + 1];
    const active = obstaclePool.value[baseIndex + 2];
    const type = obstaclePool.value[baseIndex + 3];

    // Calculate x position from lane
    const x = lane * LANE_WIDTH + HALF_LANE - HALF_OBSTACLE;

    // Get scale based on type
    const scaleY = OBSTACLE_SCALES[type] || 1;
    const height = OBSTACLE_SIZE * scaleY;

    // Get color based on type
    const backgroundColor = OBSTACLE_COLORS[type] || OBSTACLE_COLORS[OBSTACLE_NORMAL];

    return {
      transform: [{ translateX: x }, { translateY: y }],
      opacity: active,
      height,
      backgroundColor,
    };
  });

  return <Animated.View style={[styles.obstacle, animatedStyle]} />;
}

const styles = StyleSheet.create({
  obstacle: {
    position: 'absolute',
    width: OBSTACLE_SIZE,
    height: OBSTACLE_SIZE,
    borderRadius: 6,
  },
});
