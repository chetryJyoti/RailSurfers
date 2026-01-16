import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { OBSTACLE_SIZE, LANE_WIDTH } from './constants';

const HALF_LANE = LANE_WIDTH / 2;
const HALF_OBSTACLE = OBSTACLE_SIZE / 2;

type ObstacleProps = {
  index: number;
  obstaclePool: SharedValue<Float64Array>;
};

export default function Obstacle({ index, obstaclePool }: ObstacleProps) {
  const animatedStyle = useAnimatedStyle(() => {
    // Each obstacle uses 3 values: y, lane, active
    const baseIndex = index * 3;
    const y = obstaclePool.value[baseIndex];
    const lane = obstaclePool.value[baseIndex + 1];
    const active = obstaclePool.value[baseIndex + 2];

    // Calculate x position from lane
    const x = lane * LANE_WIDTH + HALF_LANE - HALF_OBSTACLE;

    return {
      transform: [{ translateX: x }, { translateY: y }],
      opacity: active,
    };
  });

  return <Animated.View style={[styles.obstacle, animatedStyle]} />;
}

const styles = StyleSheet.create({
  obstacle: {
    position: 'absolute',
    width: OBSTACLE_SIZE,
    height: OBSTACLE_SIZE,
    backgroundColor: '#ff3366',
    borderRadius: 6,
  },
});
