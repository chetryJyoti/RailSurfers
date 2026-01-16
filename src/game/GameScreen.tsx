import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import Player from './Player';
import { LANE_WIDTH, PLAYER_SIZE, SCREEN_HEIGHT } from './constants';

// Pre-calculate for worklet capture
const HALF_LANE = LANE_WIDTH / 2;
const PLAYER_OFFSET = PLAYER_SIZE / 2;

function getLanePosition(lane: number): number {
  'worklet';
  return lane * LANE_WIDTH + HALF_LANE - PLAYER_OFFSET;
}

export default function GameScreen() {
  const lane = useSharedValue(1);
  const translateX = useSharedValue(getLanePosition(1));

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const swipeGesture = Gesture.Pan().onEnd((e) => {
    'worklet';

    let nextLane = lane.value;

    if (e.translationX > 50 && lane.value > 0) {
      nextLane = lane.value - 1;
    } else if (e.translationX < -50 && lane.value < 2) {
      nextLane = lane.value + 1;
    }

    lane.value = nextLane;

    translateX.value = withTiming(getLanePosition(nextLane), { duration: 150 });
  });

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={styles.container}>
        {/* Rails */}
        <View style={[styles.rail, { left: LANE_WIDTH }]} />
        <View style={[styles.rail, { left: LANE_WIDTH * 2 }]} />

        {/* Player */}
        <Animated.View
          style={[
            styles.playerWrapper,
            animatedStyle,
            { bottom: SCREEN_HEIGHT * 0.2 },
          ]}
        >
          <Player />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  rail: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#222',
  },
  playerWrapper: {
    position: 'absolute',
  },
});
