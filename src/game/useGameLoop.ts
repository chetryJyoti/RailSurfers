import { useFrameCallback } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { GAME_PLAYING } from './constants';

export function useGameLoop(
  gameState: SharedValue<number>,
  onFrame: (dt: number) => void
) {
  useFrameCallback((frameInfo) => {
    'worklet';
    // Only run when game is playing
    if (gameState.value !== GAME_PLAYING) {
      return;
    }

    // Calculate delta time in seconds
    const dt = frameInfo.timeSincePreviousFrame ?? 16;
    const dtSeconds = dt / 1000;

    onFrame(dtSeconds);
  });
}
