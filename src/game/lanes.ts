import { LANE_WIDTH } from './constants';

export type LaneIndex = 0 | 1 | 2;

export function getLaneX(lane: number): number {
  'worklet';
  return lane * LANE_WIDTH + LANE_WIDTH / 2;
}
