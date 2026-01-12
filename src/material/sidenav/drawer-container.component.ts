/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {Directionality} from '@angular/cdk/bidi';
import {BooleanInput, coerceBooleanProperty} from '@angular/cdk/coercion';
import {Platform} from '@angular/cdk/platform';
import {ViewportRuler} from '@angular/cdk/scrolling';
import {
  AfterContentInit,
  afterNextRender,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChild,
  ContentChildren,
  DoCheck,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  NgZone,
  OnDestroy,
  Output,
  QueryList,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {merge, Subject} from 'rxjs';
import {debounceTime, startWith, takeUntil} from 'rxjs/operators';

import {_animationsDisabled} from '../core';
import {MatDrawerContent} from './drawer-content.component';
import {MatDrawer} from './drawer.component';
import {
  MAT_DRAWER_CONTAINER,
  MAT_DRAWER_DEFAULT_AUTOSIZE,
  throwMatDuplicatedDrawerError,
} from './drawer.types';

@Component({
  selector: 'mat-drawer-container',
  exportAs: 'matDrawerContainer',
  templateUrl: 'drawer-container.html',
  styleUrl: 'drawer.css',
  host: {
    'class': 'mat-drawer-container',
    '[class.mat-drawer-container-explicit-backdrop]': '_backdropOverride',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: MAT_DRAWER_CONTAINER,
      useExisting: MatDrawerContainer,
    },
  ],
  imports: [MatDrawerContent],
})
export class MatDrawerContainer implements AfterContentInit, DoCheck, OnDestroy {
  private _dir = inject(Directionality, {optional: true});
  private _element = inject<ElementRef<HTMLElement>>(ElementRef);
  private _ngZone = inject(NgZone);
  private _changeDetectorRef = inject(ChangeDetectorRef);
  private _animationDisabled = _animationsDisabled();
  private _injector = inject(Injector);

  _transitionsEnabled = false;

  /** All drawers in the container. Includes drawers from inside nested containers. */
  @ContentChildren(MatDrawer, {descendants: true})
  _allDrawers!: QueryList<MatDrawer>;

  /** Drawers that belong to this container. */
  _drawers = new QueryList<MatDrawer>();

  @ContentChild(MatDrawerContent) _content!: MatDrawerContent;
  @ViewChild(MatDrawerContent) _userContent!: MatDrawerContent;

  /** The drawer child with the `start` position. */
  get start(): MatDrawer | null {
    return this._start;
  }

  /** The drawer child with the `end` position. */
  get end(): MatDrawer | null {
    return this._end;
  }

  /**
   * Whether to automatically resize the container whenever
   * the size of any of its drawers changes.
   */
  @Input()
  get autosize(): boolean {
    return this._autosize;
  }
  set autosize(value: BooleanInput) {
    this._autosize = coerceBooleanProperty(value);
  }
  private _autosize = inject(MAT_DRAWER_DEFAULT_AUTOSIZE);

  /**
   * Whether the drawer container should have a backdrop while one of the sidenavs is open.
   */
  @Input()
  get hasBackdrop(): boolean {
    return this._drawerHasBackdrop(this._start) || this._drawerHasBackdrop(this._end);
  }
  set hasBackdrop(value: BooleanInput) {
    this._backdropOverride = value == null ? null : coerceBooleanProperty(value);
  }
  _backdropOverride: boolean | null = null;

  /** Event emitted when the drawer backdrop is clicked. */
  @Output() readonly backdropClick = new EventEmitter<void>();

  /** The drawer at the start/end position, independent of direction. */
  private _start: MatDrawer | null = null;
  private _end: MatDrawer | null = null;

  /** The drawer at the left/right. */
  private _left: MatDrawer | null = null;
  private _right: MatDrawer | null = null;

  /** Emits when the component is destroyed. */
  private readonly _destroyed = new Subject<void>();

  /** Emits on every ngDoCheck. Used for debouncing reflows. */
  private readonly _doCheckSubject = new Subject<void>();

  /**
   * Margins to be applied to the content.
   */
  _contentMargins: {left: number | null; right: number | null} = {left: null, right: null};

  readonly _contentMarginChanges = new Subject<{left: number | null; right: number | null}>();

  /** Reference to the CdkScrollable instance that wraps the scrollable content. */
  get scrollable(): MatDrawerContent {
    return this._userContent || this._content;
  }

  constructor() {
    this._initialize();
  }

  ngAfterContentInit() {
    this._setupDrawerListeners();
  }

  ngOnDestroy() {
    this._cleanup();
  }

  /** Calls `open` of both start and end drawers */
  open(): void {
    this._drawers.forEach(drawer => drawer.open());
  }

  /** Calls `close` of both start and end drawers */
  close(): void {
    this._drawers.forEach(drawer => drawer.close());
  }

  /**
   * Recalculates and updates the inline styles for the content.
   */
  updateContentMargins() {
    let left = 0;
    let right = 0;

    if (this._left && this._left.opened) {
      if (this._left.mode == 'side') {
        left += this._left._getWidth();
      } else if (this._left.mode == 'push') {
        const width = this._left._getWidth();
        left += width;
        right -= width;
      }
    }

    if (this._right && this._right.opened) {
      if (this._right.mode == 'side') {
        right += this._right._getWidth();
      } else if (this._right.mode == 'push') {
        const width = this._right._getWidth();
        right += width;
        left -= width;
      }
    }

    left = left || null!;
    right = right || null!;

    if (left !== this._contentMargins.left || right !== this._contentMargins.right) {
      this._contentMargins = {left, right};
      this._ngZone.run(() => this._contentMarginChanges.next(this._contentMargins));
    }
  }

  ngDoCheck() {
    if (this._autosize && this._isPushed()) {
      this._ngZone.runOutsideAngular(() => this._doCheckSubject.next());
    }
  }

  _onBackdropClicked() {
    this.backdropClick.emit();
    this._closeModalDrawersViaBackdrop();
  }

  _closeModalDrawersViaBackdrop() {
    [this._start, this._end]
      .filter(drawer => drawer && !drawer.disableClose && this._drawerHasBackdrop(drawer))
      .forEach(drawer => drawer!._closeViaBackdropClick());
  }

  _isShowingBackdrop(): boolean {
    return (
      (this._isDrawerOpen(this._start) && this._drawerHasBackdrop(this._start)) ||
      (this._isDrawerOpen(this._end) && this._drawerHasBackdrop(this._end))
    );
  }

  /** Initialize the container. */
  private _initialize() {
    const platform = inject(Platform);
    const viewportRuler = inject(ViewportRuler);

    this._dir?.change.pipe(takeUntil(this._destroyed)).subscribe(() => {
      this._validateDrawers();
      this.updateContentMargins();
    });

    viewportRuler
      .change()
      .pipe(takeUntil(this._destroyed))
      .subscribe(() => {
        this.updateContentMargins();
      });

    if (!this._animationDisabled && platform.isBrowser) {
      this._ngZone.runOutsideAngular(() => {
        setTimeout(() => {
          this._element.nativeElement.classList.add('mat-drawer-transition');
          this._transitionsEnabled = true;
        }, 200);
      });
    }

    this._ngZone.runOutsideAngular(() => {
      this._doCheckSubject
        .pipe(debounceTime(10), takeUntil(this._destroyed))
        .subscribe(() => this.updateContentMargins());
    });
  }

  /** Setup listeners for drawer changes. */
  private _setupDrawerListeners() {
    this._allDrawers.changes
      .pipe(startWith(this._allDrawers), takeUntil(this._destroyed))
      .subscribe((drawer: QueryList<MatDrawer>) => {
        this._drawers.reset(drawer.filter(item => !item._container || item._container === this));
        this._drawers.notifyOnChanges();
      });

    this._drawers.changes.pipe(startWith(null)).subscribe(() => {
      this._validateDrawers();
      this._setupIndividualDrawerListeners();
      this.updateContentMargins();
      this._changeDetectorRef.markForCheck();
    });
  }

  /** Setup listeners for individual drawers. */
  private _setupIndividualDrawerListeners() {
    this._drawers.forEach((drawer: MatDrawer) => {
      drawer._animationStarted.pipe(takeUntil(this._drawers.changes)).subscribe(() => {
        this.updateContentMargins();
        this._changeDetectorRef.markForCheck();
      });

      if (drawer.mode !== 'side') {
        drawer.openedChange
          .pipe(takeUntil(this._drawers.changes))
          .subscribe(() => this._setContainerClass(drawer.opened));
      }

      drawer.onPositionChanged.pipe(takeUntil(this._drawers.changes)).subscribe(() => {
        afterNextRender({read: () => this._validateDrawers()}, {injector: this._injector});
      });

      drawer._modeChanged
        .pipe(takeUntil(merge(this._drawers.changes, this._destroyed)))
        .subscribe(() => {
          this.updateContentMargins();
          this._changeDetectorRef.markForCheck();
        });
    });
  }

  /** Toggles the container class. */
  private _setContainerClass(isAdd: boolean): void {
    const classList = this._element.nativeElement.classList;
    const className = 'mat-drawer-container-has-open';
    isAdd ? classList.add(className) : classList.remove(className);
  }

  /** Validate the state of the drawer children components. */
  private _validateDrawers() {
    this._start = this._end = null;
    this._drawers.forEach(drawer => {
      if (drawer.position == 'end') {
        if (this._end != null && (typeof ngDevMode === 'undefined' || ngDevMode)) {
          throwMatDuplicatedDrawerError('end');
        }
        this._end = drawer;
      } else {
        if (this._start != null && (typeof ngDevMode === 'undefined' || ngDevMode)) {
          throwMatDuplicatedDrawerError('start');
        }
        this._start = drawer;
      }
    });

    this._right = this._left = null;
    if (this._dir && this._dir.value === 'rtl') {
      this._left = this._end;
      this._right = this._start;
    } else {
      this._left = this._start;
      this._right = this._end;
    }
  }

  /** Whether the container is being pushed to the side by one of the drawers. */
  private _isPushed() {
    return (
      (this._isDrawerOpen(this._start) && this._start!.mode != 'over') ||
      (this._isDrawerOpen(this._end) && this._end!.mode != 'over')
    );
  }

  /** Check if a drawer is open. */
  private _isDrawerOpen(drawer: MatDrawer | null): drawer is MatDrawer {
    return drawer != null && drawer.opened;
  }

  /** Check if a drawer should have a backdrop. */
  private _drawerHasBackdrop(drawer: MatDrawer | null) {
    if (this._backdropOverride == null) {
      return !!drawer && drawer.mode !== 'side';
    }
    return this._backdropOverride;
  }

  /** Clean up resources. */
  private _cleanup() {
    this._contentMarginChanges.complete();
    this._doCheckSubject.complete();
    this._drawers.destroy();
    this._destroyed.next();
    this._destroyed.complete();
  }
}
