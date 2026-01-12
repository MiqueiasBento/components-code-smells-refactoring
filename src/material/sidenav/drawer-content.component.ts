/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {Platform} from '@angular/cdk/platform';
import {CdkScrollable, ScrollDispatcher} from '@angular/cdk/scrolling';
import {
  AfterContentInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  NgZone,
  ViewEncapsulation,
} from '@angular/core';
import {MatDrawerContainer} from './drawer-container.component';

@Component({
  selector: 'mat-drawer-content',
  template: '<ng-content></ng-content>',
  host: {
    'class': 'mat-drawer-content',
    '[style.margin-left.px]': '_container._contentMargins.left',
    '[style.margin-right.px]': '_container._contentMargins.right',
    '[class.mat-drawer-content-hidden]': '_shouldBeHidden()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: CdkScrollable,
      useExisting: MatDrawerContent,
    },
  ],
})
export class MatDrawerContent extends CdkScrollable implements AfterContentInit {
  private _platform = inject(Platform);
  private _changeDetectorRef = inject(ChangeDetectorRef);
  _container: MatDrawerContainer = inject(MatDrawerContainer);

  constructor() {
    const elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
    const scrollDispatcher = inject(ScrollDispatcher);
    const ngZone = inject(NgZone);
    super(elementRef, scrollDispatcher, ngZone);
  }

  ngAfterContentInit() {
    this._container._contentMarginChanges.subscribe(() => {
      this._changeDetectorRef.markForCheck();
    });
  }

  /** Determines whether the content element should be hidden from the user. */
  protected _shouldBeHidden(): boolean {
    if (this._platform.isBrowser) {
      return false;
    }

    const {start, end} = this._container;
    return (
      (start != null && start.mode !== 'over' && start.opened) ||
      (end != null && end.mode !== 'over' && end.opened)
    );
  }
}
