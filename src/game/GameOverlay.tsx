import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GAME_IDLE, GAME_OVER, GAME_PLAYING } from './constants';

type GameOverlayProps = {
  gameState: number;
  score: number;
  onStart: () => void;
  onRestart: () => void;
};

export default function GameOverlay({
  gameState,
  score,
  onStart,
  onRestart,
}: GameOverlayProps) {
  // Start screen
  if (gameState === GAME_IDLE) {
    return (
      <View style={styles.overlay}>
        <Text style={styles.title}>RAIL SURFERS</Text>
        <TouchableOpacity style={styles.button} onPress={onStart}>
          <Text style={styles.buttonText}>TAP TO START</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Swipe left or right to change lanes</Text>
      </View>
    );
  }

  // Game over screen
  if (gameState === GAME_OVER) {
    return (
      <View style={styles.overlay}>
        <Text style={styles.gameOverTitle}>GAME OVER</Text>
        <Text style={styles.finalScore}>{score}</Text>
        <TouchableOpacity style={styles.button} onPress={onRestart}>
          <Text style={styles.buttonText}>PLAY AGAIN</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // During gameplay - just show score
  if (gameState === GAME_PLAYING) {
    return (
      <View style={styles.scoreContainer}>
        <Text style={styles.score}>{score}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#00ffcc',
    marginBottom: 60,
    letterSpacing: 4,
  },
  gameOverTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ff3366',
    marginBottom: 20,
    letterSpacing: 2,
  },
  finalScore: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#00ffcc',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 2,
  },
  hint: {
    marginTop: 40,
    fontSize: 14,
    color: '#888',
  },
  scoreContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  score: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
  },
});
