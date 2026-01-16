import { useState, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import Player from './Player';
import ObstaclePool from './ObstaclePool';
import GameOverlay from './GameOverlay';
import { useGameLoop } from './useGameLoop';
import {
  LANE_WIDTH,
  PLAYER_SIZE,
  SCREEN_HEIGHT,
  OBSTACLE_SIZE,
  OBSTACLE_POOL_SIZE,
  BASE_OBSTACLE_SPEED,
  MAX_OBSTACLE_SPEED,
  BASE_SPAWN_INTERVAL,
  MIN_SPAWN_INTERVAL,
  GAME_IDLE,
  GAME_PLAYING,
  GAME_OVER,
  PLAYER_BOTTOM_Y,
} from './constants';

// Pre-calculate for worklet capture
const HALF_LANE = LANE_WIDTH / 2;
const PLAYER_OFFSET = PLAYER_SIZE / 2;

// Player collision box (slightly smaller for fairness)
const PLAYER_TOP = SCREEN_HEIGHT - PLAYER_BOTTOM_Y - PLAYER_SIZE;
const PLAYER_HITBOX_PADDING = 5;

function getLanePosition(lane: number): number {
  'worklet';
  return lane * LANE_WIDTH + HALF_LANE - PLAYER_OFFSET;
}

// Create initial obstacle pool data (all inactive, off-screen)
function createObstaclePool(): Float64Array {
  const pool = new Float64Array(OBSTACLE_POOL_SIZE * 3);
  for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
    pool[i * 3] = -100; // y (off-screen)
    pool[i * 3 + 1] = 0; // lane
    pool[i * 3 + 2] = 0; // active (0 = inactive)
  }
  return pool;
}

export default function GameScreen() {
  // Player state
  const playerLane = useSharedValue(1);
  const translateX = useSharedValue(getLanePosition(1));

  // Game state
  const gameState = useSharedValue(GAME_IDLE);
  const gameTime = useSharedValue(0);
  const score = useSharedValue(0);
  const lastSpawnTime = useSharedValue(0);

  // Obstacle pool: Float64Array with [y, lane, active] for each obstacle
  const obstaclePool = useSharedValue(createObstaclePool());

  // React state for UI (updated from worklet via runOnJS)
  const [displayScore, setDisplayScore] = useState(0);
  const [displayGameState, setDisplayGameState] = useState(GAME_IDLE);

  // Update UI state from worklet
  const updateUI = useCallback((newScore: number, newGameState: number) => {
    setDisplayScore(newScore);
    setDisplayGameState(newGameState);
  }, []);

  // Process each frame
  const processFrame = useCallback(
    (dt: number) => {
      'worklet';

      // Update game time and score
      gameTime.value += dt * 1000;
      const newScore = Math.floor(gameTime.value / 100);
      score.value = newScore;

      // Calculate difficulty based on time (0 to 1 over 60 seconds)
      const difficulty = Math.min(gameTime.value / 60000, 1);
      const currentSpeed =
        BASE_OBSTACLE_SPEED + (MAX_OBSTACLE_SPEED - BASE_OBSTACLE_SPEED) * difficulty;
      const currentSpawnInterval =
        BASE_SPAWN_INTERVAL - (BASE_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL) * difficulty;

      // Check if we should spawn a new obstacle
      if (gameTime.value - lastSpawnTime.value >= currentSpawnInterval) {
        lastSpawnTime.value = gameTime.value;

        // Find an inactive obstacle slot
        const pool = obstaclePool.value;
        for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
          const activeIndex = i * 3 + 2;
          if (pool[activeIndex] === 0) {
            // Found an inactive slot - activate it
            const newPool = new Float64Array(pool);
            newPool[i * 3] = -OBSTACLE_SIZE; // y (start above screen)
            newPool[i * 3 + 1] = Math.floor(Math.random() * 3); // random lane 0-2
            newPool[i * 3 + 2] = 1; // active
            obstaclePool.value = newPool;
            break;
          }
        }
      }

      // Move obstacles and check collisions
      const pool = obstaclePool.value;
      const newPool = new Float64Array(pool);
      let hasCollision = false;

      for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
        const yIndex = i * 3;
        const laneIndex = i * 3 + 1;
        const activeIndex = i * 3 + 2;

        if (newPool[activeIndex] === 1) {
          // Move obstacle down
          newPool[yIndex] += currentSpeed * dt;

          // Check if obstacle is off screen (deactivate)
          if (newPool[yIndex] > SCREEN_HEIGHT + OBSTACLE_SIZE) {
            newPool[activeIndex] = 0;
            continue;
          }

          // Check collision with player
          const obstacleY = newPool[yIndex];
          const obstacleLane = newPool[laneIndex];
          const obstacleBottom = obstacleY + OBSTACLE_SIZE;

          // Check if in same lane
          if (obstacleLane === playerLane.value) {
            // Check Y overlap (obstacle bottom vs player top, obstacle top vs player bottom)
            const playerTopY = PLAYER_TOP + PLAYER_HITBOX_PADDING;
            const playerBottomY = PLAYER_TOP + PLAYER_SIZE - PLAYER_HITBOX_PADDING;

            if (obstacleBottom > playerTopY && obstacleY < playerBottomY) {
              hasCollision = true;
            }
          }
        }
      }

      obstaclePool.value = newPool;

      // Handle collision
      if (hasCollision) {
        gameState.value = GAME_OVER;
        runOnJS(updateUI)(newScore, GAME_OVER);
        return;
      }

      // Update UI periodically (every 5 frames worth of time to reduce calls)
      runOnJS(updateUI)(newScore, GAME_PLAYING);
    },
    [gameTime, score, lastSpawnTime, obstaclePool, playerLane, gameState, updateUI]
  );

  // Start the game loop
  useGameLoop(gameState, processFrame);

  // Player animated style
  const playerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Swipe gesture for lane changes
  const swipeGesture = Gesture.Pan().onEnd((e) => {
    'worklet';

    // Only allow swiping when playing
    if (gameState.value !== GAME_PLAYING) {
      return;
    }

    let nextLane = playerLane.value;

    if (e.translationX > 50 && playerLane.value > 0) {
      nextLane = playerLane.value - 1;
    } else if (e.translationX < -50 && playerLane.value < 2) {
      nextLane = playerLane.value + 1;
    }

    playerLane.value = nextLane;
    translateX.value = withTiming(getLanePosition(nextLane), { duration: 150 });
  });

  // Start game handler
  const handleStart = useCallback(() => {
    gameState.value = GAME_PLAYING;
    setDisplayGameState(GAME_PLAYING);
  }, [gameState]);

  // Restart game handler
  const handleRestart = useCallback(() => {
    // Reset all game state
    gameTime.value = 0;
    score.value = 0;
    lastSpawnTime.value = 0;
    playerLane.value = 1;
    translateX.value = getLanePosition(1);
    obstaclePool.value = createObstaclePool();

    // Start playing
    gameState.value = GAME_PLAYING;
    setDisplayScore(0);
    setDisplayGameState(GAME_PLAYING);
  }, [gameState, gameTime, score, lastSpawnTime, playerLane, translateX, obstaclePool]);

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={styles.container}>
        {/* Rails */}
        <View style={[styles.rail, { left: LANE_WIDTH }]} />
        <View style={[styles.rail, { left: LANE_WIDTH * 2 }]} />

        {/* Obstacles */}
        <ObstaclePool obstaclePool={obstaclePool} />

        {/* Player */}
        <Animated.View
          style={[
            styles.playerWrapper,
            playerAnimatedStyle,
            { bottom: PLAYER_BOTTOM_Y },
          ]}
        >
          <Player />
        </Animated.View>

        {/* UI Overlay */}
        <GameOverlay
          gameState={displayGameState}
          score={displayScore}
          onStart={handleStart}
          onRestart={handleRestart}
        />
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
