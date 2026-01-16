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

// Pre-calculated for worklets
export const PLAYER_BOTTOM_Y = SCREEN_HEIGHT * 0.2;
