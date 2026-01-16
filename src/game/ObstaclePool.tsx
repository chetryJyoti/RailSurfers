import type { SharedValue } from 'react-native-reanimated';
import Obstacle from './Obstacle';
import { OBSTACLE_POOL_SIZE } from './constants';

type ObstaclePoolProps = {
  obstaclePool: SharedValue<Float64Array>;
};

// Pre-generate indices array to avoid creating new array on each render
const INDICES = Array.from({ length: OBSTACLE_POOL_SIZE }, (_, i) => i);

export default function ObstaclePool({ obstaclePool }: ObstaclePoolProps) {
  return (
    <>
      {INDICES.map((index) => (
        <Obstacle key={index} index={index} obstaclePool={obstaclePool} />
      ))}
    </>
  );
}
