import {PlayerState, YouTubePlayerState} from './youtube-player-state';

export class YouTubePlayerFacade {
  private player?: YT.Player;
  private pendingState = new YouTubePlayerState();

  create(element: HTMLElement, options: YT.PlayerOptions, onReady: () => void) {
    this.player = new YT.Player(element, {
      ...options,
      events: {
        onReady: () => {
          this.pendingState.apply(this.player!);
          onReady();
        },
      },
    });
  }

  destroy(): void {
    this.player?.destroy();
    this.player = undefined;
  }

  play(): void {
    this.player ? this.player.playVideo() : (this.pendingState.playbackState = PlayerState.PLAYING);
  }

  pause(): void {
    this.player ? this.player.pauseVideo() : (this.pendingState.playbackState = PlayerState.PAUSED);
  }

  stop(): void {
    this.player ? this.player.stopVideo() : (this.pendingState.playbackState = PlayerState.CUED);
  }

  seek(seconds: number, allowSeekAhead: boolean): void {
    this.player
      ? this.player.seekTo(seconds, allowSeekAhead)
      : (this.pendingState.seek = {seconds, allowSeekAhead});
  }

  setVolume(volume: number): void {
    this.player ? this.player.setVolume(volume) : (this.pendingState.volume = volume);
  }

  mute(): void {
    this.player ? this.player.mute() : (this.pendingState.muted = true);
  }

  unMute(): void {
    this.player ? this.player.unMute() : (this.pendingState.muted = false);
  }
}
