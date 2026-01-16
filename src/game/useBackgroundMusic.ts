import { useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';
import { GAME_PLAYING, GAME_OVER, GAME_IDLE } from './constants';

export function useBackgroundMusic(gameState: number) {
  const player = useAudioPlayer(
    require('../../assets/audio/background-music.mp3')
  );

  useEffect(() => {
    player.loop = true;
    player.volume = 0.5;
  }, [player]);

  useEffect(() => {
    if (gameState === GAME_PLAYING) {
      if (!player.playing) {
        player.play();
      }
    } else if (gameState === GAME_OVER || gameState === GAME_IDLE) {
      player.pause();
      player.seekTo(0);
    }
  }, [gameState, player]);
}
