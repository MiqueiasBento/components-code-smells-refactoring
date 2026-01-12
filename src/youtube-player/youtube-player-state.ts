export enum PlayerState {
  UNSTARTED = -1,
  ENDED = 0,
  PLAYING = 1,
  PAUSED = 2,
  BUFFERING = 3,
  CUED = 5,
}

export interface PendingSeek {
  seconds: number;
  allowSeekAhead: boolean;
}

export class YouTubePlayerState {
  playbackState?: PlayerState;
  playbackRate?: number;
  volume?: number;
  muted?: boolean;
  seek?: PendingSeek;

  apply(player: YT.Player): void {
    switch (this.playbackState) {
      case PlayerState.PLAYING:
        player.playVideo();
        break;
      case PlayerState.PAUSED:
        player.pauseVideo();
        break;
      case PlayerState.CUED:
        player.stopVideo();
        break;
    }

    if (this.playbackRate != null) player.setPlaybackRate(this.playbackRate);
    if (this.volume != null) player.setVolume(this.volume);
    if (this.muted != null) this.muted ? player.mute() : player.unMute();
    if (this.seek) player.seekTo(this.seek.seconds, this.seek.allowSeekAhead);
  }
}
