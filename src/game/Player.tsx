import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { PLAYER_SIZE, PLAYER_SLIDING } from './constants';

type PlayerProps = {
  verticalState: SharedValue<number>;
};

export default function Player({ verticalState }: PlayerProps) {
  const animatedStyle = useAnimatedStyle(() => {
    // Change color when sliding for visual feedback
    const isSliding = verticalState.value === PLAYER_SLIDING;
    return {
      backgroundColor: isSliding ? '#00ccff' : '#00ffcc', // Lighter blue when sliding
    };
  });

  return <Animated.View style={[styles.player, animatedStyle]} />;
}

const styles = StyleSheet.create({
  player: {
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: 8,
  },
});
