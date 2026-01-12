import {CSP_NONCE, Inject, Injectable} from '@angular/core';
import {Observable, ReplaySubject} from 'rxjs';
import {trustedResourceUrl} from 'safevalues';
import {setScriptSrc} from 'safevalues/dom';

@Injectable({providedIn: 'root'})
export class YouTubeApiLoaderService {
  private loaded = false;
  private loading$ = new ReplaySubject<void>(1);

  constructor(@Inject(CSP_NONCE) private nonce: string | null) {}

  load(): Observable<void> {
    if (this.loaded) {
      return this.loading$;
    }

    const url = trustedResourceUrl`https://www.youtube.com/iframe_api`;
    const script = document.createElement('script');

    script.onload = () => {
      this.loaded = true;
      this.loading$.next();
      this.loading$.complete();
    };

    script.onerror = () => {
      this.loaded = false;
      this.loading$.error('Failed to load YouTube API');
    };

    setScriptSrc(script, url);
    script.async = true;

    if (this.nonce) {
      script.setAttribute('nonce', this.nonce);
    }

    document.body.appendChild(script);

    return this.loading$;
  }
}
