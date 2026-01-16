import { Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

export const LANE_COUNT = 3;
export const LANE_WIDTH = SCREEN_WIDTH / LANE_COUNT;

export const PLAYER_SIZE = 50;
