/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {Component, OnDestroy, ViewEncapsulation, inject, DOCUMENT} from '@angular/core';

import {AnalyticsService} from './shared/analytics/analytics';
import {NavigationFocusService} from './shared/navigation-focus/navigation-focus.service';
import {Subscription} from 'rxjs';
import {filter, map, pairwise, startWith} from 'rxjs/operators';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {NavBar} from './shared/navbar/navbar';
import {CookiePopup} from './shared/cookie-popup/cookie-popup';
import {HeaderTagManager} from './shared/header-tag-manager';

@Component({
  selector: 'material-docs-app',
  template: `
    <app-cookie-popup/>
    <app-navbar/>
    <router-outlet/>
  `,
  styleUrls: ['./material-docs-app.scss'],
  encapsulation: ViewEncapsulation.None,
  imports: [NavBar, RouterOutlet, CookiePopup],
})
export class MaterialDocsApp implements OnDestroy {
  private _subscriptions = new Subscription();
  private _headerTagManager = inject(HeaderTagManager);
  private _document = inject(DOCUMENT);

  constructor() {
    const analytics = inject(AnalyticsService);
    const navigationFocusService = inject(NavigationFocusService);
    const router = inject(Router);

    this._subscriptions.add(
      navigationFocusService.navigationEndEvents
        .pipe(
          map(e => e.urlAfterRedirects),
          startWith(''),
          pairwise(),
        )
        .subscribe(([fromUrl, toUrl]) => {
          // We want to reset the scroll position on navigation except when navigating within
          // the documentation for a single component.
          if (!navigationFocusService.isNavigationWithinComponentView(fromUrl, toUrl)) {
            this._resetScrollPosition();
          }
          analytics.locationChanged(toUrl);
        }),
    );

    router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(event => event.urlAfterRedirects),
      )
      .subscribe(url => {
        this._updateCanonicalLink(url);
      });
  }

  ngOnDestroy() {
    this._subscriptions.unsubscribe();
  }

  private _updateCanonicalLink(absoluteUrl: string) {
    this._headerTagManager.setCanonical(absoluteUrl);
  }

  private _resetScrollPosition() {
    if (this._document) {
      const sidenavContent = this._document.querySelector('.mat-drawer-content') as HTMLElement;
      if (sidenavContent) {
        sidenavContent.scrollTop = 0;
      }
    }
  }
}
