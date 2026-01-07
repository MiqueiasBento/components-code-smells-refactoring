import {isPlatformBrowser} from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
} from '@angular/core';
import {YouTubePlayerPlaceholder} from 'youtube-player-placeholder';
import {YouTubeApiLoaderService} from './youtube-api-loader.service';
import {YouTubePlayerFacade} from './youtube-player.facade';
import {
  DEFAULT_PLAYER_HEIGHT,
  DEFAULT_PLAYER_WIDTH,
  YOUTUBE_PLAYER_CONFIG,
  YouTubePlayerConfig,
} from './youtube-player.tokens';

declare global {
  interface Window {
    YT: typeof YT | undefined;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

@Component({
  imports: [YouTubePlayerPlaceholder],
  selector: 'youtube-player',
  styleUrl: 'youtube-player.css',
  template: `
    @if (showPlaceholder) {
      <youtube-player-placeholder
        [videoId]="videoId!"
        [width]="width"
        [height]="height"
        (click)="load(true)">
      </youtube-player-placeholder>
    }

    <div [style.display]="showPlaceholder ? 'none' : ''">
      <div #container></div>
    </div>

  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class YouTubePlayerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('container', {static: true})
  container!: ElementRef<HTMLElement>;

  @Input() videoId?: string;
  @Input() width = DEFAULT_PLAYER_WIDTH;
  @Input() height = DEFAULT_PLAYER_HEIGHT;

  showPlaceholder = true;

  private facade = new YouTubePlayerFacade();
  private isBrowser: boolean;

  constructor(
    private apiLoader: YouTubeApiLoaderService,
    private zone: NgZone,
    @Inject(PLATFORM_ID) platformId: object,
    @Inject(YOUTUBE_PLAYER_CONFIG) config?: YouTubePlayerConfig,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.showPlaceholder = !config?.disablePlaceholder;
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser || !this.videoId) return;
  }

  load(autoplay: boolean): void {
    this.showPlaceholder = false;

    this.apiLoader.load().subscribe(() => {
      this.zone.runOutsideAngular(() => {
        this.facade.create(
          this.container.nativeElement,
          {
            videoId: this.videoId,
            width: this.width,
            height: this.height,
            playerVars: autoplay ? {autoplay: 1} : {},
          },
          () => {},
        );
      });
    });
  }

  play(): void {
    this.facade.play();
  }

  pause(): void {
    this.facade.pause();
  }

  ngOnDestroy(): void {
    this.facade.destroy();
  }
}
