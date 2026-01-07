import {InjectionToken} from '@angular/core';
import {PlaceholderImageQuality} from './youtube-player-placeholder';

export interface YouTubePlayerConfig {
  loadApi?: boolean;
  disablePlaceholder?: boolean;
  placeholderButtonLabel?: string;
  placeholderImageQuality?: PlaceholderImageQuality;
}

export const YOUTUBE_PLAYER_CONFIG = new InjectionToken<YouTubePlayerConfig>(
  'YOUTUBE_PLAYER_CONFIG',
);

export const DEFAULT_PLAYER_WIDTH = 640;
export const DEFAULT_PLAYER_HEIGHT = 390;
