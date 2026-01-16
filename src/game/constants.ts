import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

export const LANE_COUNT = 3;
export const LANE_WIDTH = SCREEN_WIDTH / LANE_COUNT;

export const PLAYER_SIZE = 50;

// Obstacles
export const OBSTACLE_SIZE = 40;
export const OBSTACLE_POOL_SIZE = 6;

// Physics
export const BASE_OBSTACLE_SPEED = 400;
export const MAX_OBSTACLE_SPEED = 700;
export const BASE_SPAWN_INTERVAL = 1500;
export const MIN_SPAWN_INTERVAL = 800;

// Game states
export const GAME_IDLE = 0;
export const GAME_PLAYING = 1;
export const GAME_OVER = 2;

// Jump/Slide
export const JUMP_HEIGHT = 120;
export const JUMP_DURATION = 600;
export const SLIDE_DURATION = 500;
export const SLIDE_SCALE_Y = 0.4;

// Player vertical states
export const PLAYER_GROUNDED = 0;
export const PLAYER_JUMPING = 1;
export const PLAYER_SLIDING = 2;

// Obstacle types
export const OBSTACLE_NORMAL = 0;
export const OBSTACLE_HIGH = 1;
export const OBSTACLE_LOW = 2;

// Pool structure
export const OBSTACLE_STRIDE = 4;

// Gesture thresholds
export const SWIPE_THRESHOLD_Y = 40;

// Pre-calculated for worklets
export const PLAYER_BOTTOM_Y = SCREEN_HEIGHT * 0.2;
