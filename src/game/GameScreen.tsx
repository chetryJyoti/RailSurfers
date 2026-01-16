import { useState, useCallback } from 'react';
import { StyleSheet } from 'react-native';
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
import AnimatedRail from './AnimatedRail';
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
  JUMP_HEIGHT,
  JUMP_DURATION,
  SLIDE_DURATION,
  SLIDE_SCALE_Y,
  PLAYER_GROUNDED,
  PLAYER_JUMPING,
  PLAYER_SLIDING,
  OBSTACLE_NORMAL,
  OBSTACLE_HIGH,
  OBSTACLE_LOW,
  OBSTACLE_STRIDE,
  SWIPE_THRESHOLD_Y,
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
  const pool = new Float64Array(OBSTACLE_POOL_SIZE * OBSTACLE_STRIDE);
  for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
    const baseIndex = i * OBSTACLE_STRIDE;
    pool[baseIndex] = -100;     // y (off-screen)
    pool[baseIndex + 1] = 0;    // lane
    pool[baseIndex + 2] = 0;    // active (0 = inactive)
    pool[baseIndex + 3] = 0;    // type (0 = normal)
  }
  return pool;
}

// Get random obstacle type with spawn weights: 50% normal, 25% high, 25% low
function getRandomObstacleType(): number {
  'worklet';
  const rand = Math.random();
  if (rand < 0.5) return OBSTACLE_NORMAL;
  if (rand < 0.75) return OBSTACLE_HIGH;
  return OBSTACLE_LOW;
}

export default function GameScreen() {
  // Player horizontal state
  const playerLane = useSharedValue(1);
  const translateX = useSharedValue(getLanePosition(1));

  // Player vertical state
  const playerVerticalState = useSharedValue(PLAYER_GROUNDED);
  const verticalActionStartTime = useSharedValue(0);
  const playerTranslateY = useSharedValue(0);
  const playerScaleY = useSharedValue(1);

  // Game state
  const gameState = useSharedValue(GAME_IDLE);
  const gameTime = useSharedValue(0);
  const score = useSharedValue(0);
  const lastSpawnTime = useSharedValue(0);

  // Obstacle pool: Float64Array with [y, lane, active, type] for each obstacle
  const obstaclePool = useSharedValue(createObstaclePool());

  // Rail animation offset
  const railOffset = useSharedValue(0);

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

      // Update jump/slide animation
      if (playerVerticalState.value === PLAYER_JUMPING) {
        const elapsed = gameTime.value - verticalActionStartTime.value;
        if (elapsed >= JUMP_DURATION) {
          // Jump finished
          playerVerticalState.value = PLAYER_GROUNDED;
          playerTranslateY.value = 0;
        } else {
          // Parabolic jump arc: peaks at t=0.5
          const t = elapsed / JUMP_DURATION;
          const jumpOffset = 4 * JUMP_HEIGHT * t * (1 - t);
          playerTranslateY.value = -jumpOffset; // Negative because Y is up
        }
      } else if (playerVerticalState.value === PLAYER_SLIDING) {
        const elapsed = gameTime.value - verticalActionStartTime.value;
        if (elapsed >= SLIDE_DURATION) {
          // Slide finished
          playerVerticalState.value = PLAYER_GROUNDED;
          playerScaleY.value = 1;
        } else {
          // Stay scaled down during slide
          playerScaleY.value = SLIDE_SCALE_Y;
        }
      }

      // Calculate difficulty based on time (0 to 1 over 60 seconds)
      const difficulty = Math.min(gameTime.value / 60000, 1);
      const currentSpeed =
        BASE_OBSTACLE_SPEED + (MAX_OBSTACLE_SPEED - BASE_OBSTACLE_SPEED) * difficulty;
      const currentSpawnInterval =
        BASE_SPAWN_INTERVAL - (BASE_SPAWN_INTERVAL - MIN_SPAWN_INTERVAL) * difficulty;

      // Update rail animation (move at same speed as obstacles)
      railOffset.value += currentSpeed * dt;

      // Check if we should spawn a new obstacle
      if (gameTime.value - lastSpawnTime.value >= currentSpawnInterval) {
        lastSpawnTime.value = gameTime.value;

        // Find an inactive obstacle slot
        const pool = obstaclePool.value;
        for (let i = 0; i < OBSTACLE_POOL_SIZE; i++) {
          const baseIndex = i * OBSTACLE_STRIDE;
          const activeIndex = baseIndex + 2;
          if (pool[activeIndex] === 0) {
            // Found an inactive slot - activate it
            const newPool = new Float64Array(pool);
            newPool[baseIndex] = -OBSTACLE_SIZE; // y (start above screen)
            newPool[baseIndex + 1] = Math.floor(Math.random() * 3); // random lane 0-2
            newPool[baseIndex + 2] = 1; // active
            newPool[baseIndex + 3] = getRandomObstacleType(); // random obstacle type
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
        const baseIndex = i * OBSTACLE_STRIDE;
        const yIndex = baseIndex;
        const laneIndex = baseIndex + 1;
        const activeIndex = baseIndex + 2;
        const typeIndex = baseIndex + 3;

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
          const obstacleType = newPool[typeIndex];
          const obstacleBottom = obstacleY + OBSTACLE_SIZE;

          // Check if in same lane
          if (obstacleLane === playerLane.value) {
            // Check Y overlap (obstacle bottom vs player top, obstacle top vs player bottom)
            const playerTopY = PLAYER_TOP + PLAYER_HITBOX_PADDING;
            const playerBottomY = PLAYER_TOP + PLAYER_SIZE - PLAYER_HITBOX_PADDING;

            const hasYOverlap = obstacleBottom > playerTopY && obstacleY < playerBottomY;

            if (hasYOverlap) {
              // Check for immunity based on vertical state
              const isJumpingOverLow =
                obstacleType === OBSTACLE_LOW &&
                playerVerticalState.value === PLAYER_JUMPING;
              const isSlidingUnderHigh =
                obstacleType === OBSTACLE_HIGH &&
                playerVerticalState.value === PLAYER_SLIDING;

              if (!isJumpingOverLow && !isSlidingUnderHigh) {
                hasCollision = true;
              }
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
    [
      gameTime,
      score,
      lastSpawnTime,
      obstaclePool,
      playerLane,
      gameState,
      updateUI,
      playerVerticalState,
      verticalActionStartTime,
      playerTranslateY,
      playerScaleY,
      railOffset,
    ]
  );

  // Start the game loop
  useGameLoop(gameState, processFrame);

  // Player animated style
  const playerAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: playerTranslateY.value },
        { scaleY: playerScaleY.value },
      ],
    };
  });

  // Swipe gesture for lane changes and jump/slide
  const swipeGesture = Gesture.Pan().onEnd((e) => {
    'worklet';

    // Only allow swiping when playing
    if (gameState.value !== GAME_PLAYING) {
      return;
    }

    const absX = Math.abs(e.translationX);
    const absY = Math.abs(e.translationY);

    // Determine if horizontal or vertical swipe
    if (absX > absY) {
      // Horizontal swipe - lane change
      let nextLane = playerLane.value;

      if (e.translationX > 50 && playerLane.value > 0) {
        nextLane = playerLane.value - 1;
      } else if (e.translationX < -50 && playerLane.value < 2) {
        nextLane = playerLane.value + 1;
      }

      playerLane.value = nextLane;
      translateX.value = withTiming(getLanePosition(nextLane), { duration: 150 });
    } else {
      // Vertical swipe - jump or slide (only if grounded)
      if (playerVerticalState.value !== PLAYER_GROUNDED) {
        return; // Can't jump/slide while already jumping/sliding
      }

      if (e.translationY < -SWIPE_THRESHOLD_Y) {
        // Swipe up - jump
        playerVerticalState.value = PLAYER_JUMPING;
        verticalActionStartTime.value = gameTime.value;
      } else if (e.translationY > SWIPE_THRESHOLD_Y) {
        // Swipe down - slide
        playerVerticalState.value = PLAYER_SLIDING;
        verticalActionStartTime.value = gameTime.value;
      }
    }
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

    // Reset vertical state
    playerVerticalState.value = PLAYER_GROUNDED;
    verticalActionStartTime.value = 0;
    playerTranslateY.value = 0;
    playerScaleY.value = 1;

    // Reset rail animation
    railOffset.value = 0;

    // Start playing
    gameState.value = GAME_PLAYING;
    setDisplayScore(0);
    setDisplayGameState(GAME_PLAYING);
  }, [
    gameState,
    gameTime,
    score,
    lastSpawnTime,
    playerLane,
    translateX,
    obstaclePool,
    playerVerticalState,
    verticalActionStartTime,
    playerTranslateY,
    playerScaleY,
    railOffset,
  ]);

  return (
    <GestureDetector gesture={swipeGesture}>
      <Animated.View style={styles.container}>
        {/* Animated Rails */}
        <AnimatedRail left={LANE_WIDTH} railOffset={railOffset} />
        <AnimatedRail left={LANE_WIDTH * 2} railOffset={railOffset} />

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
          <Player verticalState={playerVerticalState} />
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
  playerWrapper: {
    position: 'absolute',
  },
});
