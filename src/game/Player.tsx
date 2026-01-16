import { View, StyleSheet } from 'react-native';
import { PLAYER_SIZE } from './constants';

export default function Player() {
  return <View style={styles.player} />;
}

const styles = StyleSheet.create({
  player: {
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    backgroundColor: '#00ffcc',
    borderRadius: 8,
  },
});
