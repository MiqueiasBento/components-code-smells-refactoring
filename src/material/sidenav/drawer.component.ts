/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */
import {
  FocusMonitor,
  FocusOrigin,
  FocusTrap,
  FocusTrapFactory,
  InteractivityChecker,
} from '@angular/cdk/a11y';
import {BooleanInput, coerceBooleanProperty} from '@angular/cdk/coercion';
import {ESCAPE, hasModifierKey} from '@angular/cdk/keycodes';
import {Platform} from '@angular/cdk/platform';
import {CdkScrollable} from '@angular/cdk/scrolling';
import {DOCUMENT} from '@angular/common';
import {
  afterNextRender,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Injector,
  Input,
  NgZone,
  OnDestroy,
  Output,
  Renderer2,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {fromEvent, Observable, Subject} from 'rxjs';
import {filter, map, mapTo, take, takeUntil} from 'rxjs/operators';

import {MatDrawerContainer} from './drawer-container.component';
import {
  AutoFocusTarget,
  MAT_DRAWER_CONTAINER,
  MatDrawerMode,
  MatDrawerToggleResult,
} from './drawer.types';

@Component({
  selector: 'mat-drawer',
  exportAs: 'matDrawer',
  templateUrl: 'drawer.html',
  host: {
    'class': 'mat-drawer',
    '[attr.align]': 'null',
    '[class.mat-drawer-end]': 'position === "end"',
    '[class.mat-drawer-over]': 'mode === "over"',
    '[class.mat-drawer-push]': 'mode === "push"',
    '[class.mat-drawer-side]': 'mode === "side"',
    '[style.visibility]': '(!_container && !opened) ? "hidden" : null',
    '[attr.tabIndex]': '(mode !== "side") ? "-1" : null',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [CdkScrollable],
})
export class MatDrawer implements AfterViewInit, OnDestroy {
  private _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private _focusTrapFactory = inject(FocusTrapFactory);
  private _focusMonitor = inject(FocusMonitor);
  private _platform = inject(Platform);
  private _ngZone = inject(NgZone);
  private _renderer = inject(Renderer2);
  private _interactivityChecker = inject(InteractivityChecker);
  private _doc = inject(DOCUMENT);
  private _injector = inject(Injector);
  private _changeDetectorRef = inject(ChangeDetectorRef);

  _container? = inject<MatDrawerContainer>(MAT_DRAWER_CONTAINER, {optional: true});

  private _focusTrap: FocusTrap | null = null;
  private _elementFocusedBeforeDrawerWasOpened: HTMLElement | null = null;
  private _eventCleanups: (() => void)[] = [];
  private _isAttached = false;
  private _anchor: Comment | null = null;

  /** The side that the drawer is attached to. */
  @Input()
  get position(): 'start' | 'end' {
    return this._position;
  }
  set position(value: 'start' | 'end') {
    value = value === 'end' ? 'end' : 'start';
    if (value !== this._position) {
      if (this._isAttached) {
        this._updatePositionInParent(value);
      }
      this._position = value;
      this.onPositionChanged.emit();
    }
  }
  private _position: 'start' | 'end' = 'start';

  /** Mode of the drawer; one of 'over', 'push' or 'side'. */
  @Input()
  get mode(): MatDrawerMode {
    return this._mode;
  }
  set mode(value: MatDrawerMode) {
    this._mode = value;
    this._updateFocusTrapState();
    this._modeChanged.next();
  }
  private _mode: MatDrawerMode = 'over';

  /** Whether the drawer can be closed with the escape key or by clicking on the backdrop. */
  @Input()
  get disableClose(): boolean {
    return this._disableClose;
  }
  set disableClose(value: BooleanInput) {
    this._disableClose = coerceBooleanProperty(value);
  }
  private _disableClose = false;

  /**
   * Whether the drawer should focus the first focusable element automatically when opened.
   */
  @Input()
  get autoFocus(): AutoFocusTarget | string | boolean {
    const value = this._autoFocus;
    if (value == null) {
      return this.mode === 'side' ? 'dialog' : 'first-tabbable';
    }
    return value;
  }
  set autoFocus(value: AutoFocusTarget | string | BooleanInput) {
    if (value === 'true' || value === 'false' || value == null) {
      value = coerceBooleanProperty(value);
    }
    this._autoFocus = value;
  }
  private _autoFocus: AutoFocusTarget | string | boolean | undefined;

  /**
   * Whether the drawer is opened.
   */
  @Input()
  get opened(): boolean {
    return this._opened();
  }
  set opened(value: BooleanInput) {
    this.toggle(coerceBooleanProperty(value));
  }
  private _opened = signal(false);

  /** How the sidenav was opened (keypress, mouse click etc.) */
  private _openedVia: FocusOrigin | null = null;

  /** Emits whenever the drawer has started animating. */
  readonly _animationStarted = new Subject();

  /** Emits whenever the drawer is done animating. */
  readonly _animationEnd = new Subject();

  /** Event emitted when the drawer open state is changed. */
  @Output() readonly openedChange = new EventEmitter<boolean>(true);

  /** Event emitted when the drawer has been opened. */
  @Output('opened') readonly _openedStream = this.openedChange.pipe(
    filter(o => o),
    map(() => {}),
  );

  /** Event emitted when the drawer has started opening. */
  @Output() readonly openedStart = this._animationStarted.pipe(
    filter(() => this.opened),
    mapTo(undefined),
  );

  /** Event emitted when the drawer has been closed. */
  @Output('closed') readonly _closedStream = this.openedChange.pipe(
    filter(o => !o),
    map(() => {}),
  );

  /** Event emitted when the drawer has started closing. */
  @Output() readonly closedStart = this._animationStarted.pipe(
    filter(() => !this.opened),
    mapTo(undefined),
  );

  /** Emits when the component is destroyed. */
  private readonly _destroyed = new Subject<void>();

  /** Event emitted when the drawer's position changes. */
  @Output('positionChanged') readonly onPositionChanged = new EventEmitter<void>();

  /** Reference to the inner element that contains all the content. */
  @ViewChild('content') _content!: ElementRef<HTMLElement>;

  /**
   * An observable that emits when the drawer mode changes.
   */
  readonly _modeChanged = new Subject<void>();

  constructor() {
    this._setupEventListeners();
  }

  ngAfterViewInit() {
    this._isAttached = true;

    if (this._position === 'end') {
      this._updatePositionInParent('end');
    }

    if (this._platform.isBrowser) {
      this._focusTrap = this._focusTrapFactory.create(this._elementRef.nativeElement);
      this._updateFocusTrapState();
    }
  }

  ngOnDestroy() {
    this._cleanup();
  }

  /**
   * Open the drawer.
   * @param openedVia Whether the drawer was opened by a key press, mouse click or programmatically.
   */
  open(openedVia?: FocusOrigin): Promise<MatDrawerToggleResult> {
    return this.toggle(true, openedVia);
  }

  /** Close the drawer. */
  close(): Promise<MatDrawerToggleResult> {
    return this.toggle(false);
  }

  /** Closes the drawer with context that the backdrop was clicked. */
  _closeViaBackdropClick(): Promise<MatDrawerToggleResult> {
    return this._setOpen(false, true, 'mouse');
  }

  /**
   * Toggle this drawer.
   * @param isOpen Whether the drawer should be open.
   * @param openedVia Whether the drawer was opened by a key press, mouse click or programmatically.
   */
  toggle(isOpen: boolean = !this.opened, openedVia?: FocusOrigin): Promise<MatDrawerToggleResult> {
    if (isOpen && openedVia) {
      this._openedVia = openedVia;
    }

    const result = this._setOpen(
      isOpen,
      !isOpen && this._isFocusWithinDrawer(),
      this._openedVia || 'program',
    );

    if (!isOpen) {
      this._openedVia = null;
    }

    return result;
  }

  /** Gets the width of the drawer. */
  _getWidth(): number {
    return this._elementRef.nativeElement.offsetWidth || 0;
  }

  /** Sets up event listeners for the drawer. */
  private _setupEventListeners() {
    this.openedChange.pipe(takeUntil(this._destroyed)).subscribe((opened: boolean) => {
      if (opened) {
        this._elementFocusedBeforeDrawerWasOpened = this._doc.activeElement as HTMLElement;
        this._takeFocus();
      } else if (this._isFocusWithinDrawer()) {
        this._restoreFocus(this._openedVia || 'program');
      }
    });

    this._ngZone.runOutsideAngular(() => {
      const element = this._elementRef.nativeElement;
      (fromEvent(element, 'keydown') as Observable<KeyboardEvent>)
        .pipe(
          filter(event => event.keyCode === ESCAPE && !this.disableClose && !hasModifierKey(event)),
          takeUntil(this._destroyed),
        )
        .subscribe(event =>
          this._ngZone.run(() => {
            this.close();
            event.stopPropagation();
            event.preventDefault();
          }),
        );

      this._eventCleanups = [
        this._renderer.listen(element, 'transitionrun', this._handleTransitionEvent),
        this._renderer.listen(element, 'transitionend', this._handleTransitionEvent),
        this._renderer.listen(element, 'transitioncancel', this._handleTransitionEvent),
      ];
    });

    this._animationEnd.subscribe(() => {
      this.openedChange.emit(this.opened);
    });
  }

  /** Toggles the opened state of the drawer. */
  private _setOpen(
    isOpen: boolean,
    restoreFocus: boolean,
    focusOrigin: Exclude<FocusOrigin, null>,
  ): Promise<MatDrawerToggleResult> {
    if (isOpen === this.opened) {
      return Promise.resolve(isOpen ? 'open' : 'close');
    }

    this._opened.set(isOpen);

    if (this._container?._transitionsEnabled) {
      this._setIsAnimating(true);
    } else {
      setTimeout(() => {
        this._animationStarted.next();
        this._animationEnd.next();
      });
    }

    this._elementRef.nativeElement.classList.toggle('mat-drawer-opened', isOpen);

    if (!isOpen && restoreFocus) {
      this._restoreFocus(focusOrigin);
    }

    this._changeDetectorRef.markForCheck();
    this._updateFocusTrapState();

    return new Promise<MatDrawerToggleResult>(resolve => {
      this.openedChange.pipe(take(1)).subscribe(open => resolve(open ? 'open' : 'close'));
    });
  }

  /** Toggles whether the drawer is currently animating. */
  private _setIsAnimating(isAnimating: boolean) {
    this._elementRef.nativeElement.classList.toggle('mat-drawer-animating', isAnimating);
  }

  /** Updates the enabled state of the focus trap. */
  private _updateFocusTrapState() {
    if (this._focusTrap) {
      this._focusTrap.enabled = !!this._container?.hasBackdrop && this.opened;
    }
  }

  /** Updates the position of the drawer in the DOM. */
  private _updatePositionInParent(newPosition: 'start' | 'end'): void {
    if (!this._platform.isBrowser) {
      return;
    }

    const element = this._elementRef.nativeElement;
    const parent = element.parentNode!;

    if (newPosition === 'end') {
      if (!this._anchor) {
        this._anchor = this._doc.createComment('mat-drawer-anchor')!;
        parent.insertBefore(this._anchor!, element);
      }
      parent.appendChild(element);
    } else if (this._anchor) {
      this._anchor.parentNode!.insertBefore(element, this._anchor);
    }
  }

  /** Focuses the first focusable element in the drawer. */
  private _takeFocus() {
    if (!this._focusTrap) {
      return;
    }

    const element = this._elementRef.nativeElement;

    switch (this.autoFocus) {
      case false:
      case 'dialog':
        return;
      case true:
      case 'first-tabbable':
        afterNextRender(
          () => {
            const hasMovedFocus = this._focusTrap!.focusInitialElement();
            if (!hasMovedFocus && typeof element.focus === 'function') {
              element.focus();
            }
          },
          {injector: this._injector},
        );
        break;
      case 'first-heading':
        this._focusByCssSelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
        break;
      default:
        this._focusByCssSelector(this.autoFocus!);
        break;
    }
  }

  /** Focuses element by CSS selector. */
  private _focusByCssSelector(selector: string, options?: FocusOptions) {
    const elementToFocus = this._elementRef.nativeElement.querySelector(
      selector,
    ) as HTMLElement | null;
    if (elementToFocus) {
      this._forceFocus(elementToFocus, options);
    }
  }

  /** Forces focus on an element. */
  private _forceFocus(element: HTMLElement, options?: FocusOptions) {
    if (!this._interactivityChecker.isFocusable(element)) {
      element.tabIndex = -1;
      this._ngZone.runOutsideAngular(() => {
        const callback = () => {
          cleanupBlur();
          cleanupMousedown();
          element.removeAttribute('tabindex');
        };
        const cleanupBlur = this._renderer.listen(element, 'blur', callback);
        const cleanupMousedown = this._renderer.listen(element, 'mousedown', callback);
      });
    }
    element.focus(options);
  }

  /** Restores focus to the element that was originally focused when the drawer opened. */
  private _restoreFocus(focusOrigin: Exclude<FocusOrigin, null>) {
    if (this.autoFocus === 'dialog') {
      return;
    }

    if (this._elementFocusedBeforeDrawerWasOpened) {
      this._focusMonitor.focusVia(this._elementFocusedBeforeDrawerWasOpened, focusOrigin);
    } else {
      this._elementRef.nativeElement.blur();
    }
    this._elementFocusedBeforeDrawerWasOpened = null;
  }

  /** Whether focus is currently within the drawer. */
  private _isFocusWithinDrawer(): boolean {
    const activeEl = this._doc.activeElement;
    return !!activeEl && this._elementRef.nativeElement.contains(activeEl);
  }

  /** Event handler for animation events. */
  private _handleTransitionEvent = (event: TransitionEvent) => {
    const element = this._elementRef.nativeElement;

    if (event.target === element) {
      this._ngZone.run(() => {
        if (event.type === 'transitionrun') {
          this._animationStarted.next(event);
        } else if (event.type === 'transitionend') {
          this._setIsAnimating(false);
          this._animationEnd.next(event);
        } else if (event.type === 'transitioncancel') {
          this._animationEnd.next(event);
        }
      });
    }
  };

  /** Cleans up resources. */
  private _cleanup() {
    this._eventCleanups.forEach(cleanup => cleanup());
    this._focusTrap?.destroy();
    this._anchor?.remove();
    this._anchor = null;
    this._animationStarted.complete();
    this._animationEnd.complete();
    this._modeChanged.complete();
    this._destroyed.next();
    this._destroyed.complete();
  }
}
