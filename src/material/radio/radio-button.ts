/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {FocusMonitor, FocusOrigin, _IdGenerator} from '@angular/cdk/a11y';
import {UniqueSelectionDispatcher} from '@angular/cdk/collections';
import {_CdkPrivateStyleLoader} from '@angular/cdk/private';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DoCheck,
  ElementRef,
  EventEmitter,
  HostAttributeToken,
  Injector,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  ViewChild,
  ViewEncapsulation,
  afterNextRender,
  booleanAttribute,
  inject,
  numberAttribute,
} from '@angular/core';
import {
  MatRipple,
  ThemePalette,
  _MatInternalFormField,
  _StructuralStylesLoader,
  _animationsDisabled,
} from '../core';
import {MatRadioChange} from './radio-change';
import {MatRadioGroup} from './radio-group';
import {MAT_RADIO_DEFAULT_OPTIONS, MAT_RADIO_GROUP} from './radio.types';

@Component({
  selector: 'mat-radio-button',
  templateUrl: 'radio.html',
  styleUrl: 'radio.css',
  host: {
    'class': 'mat-mdc-radio-button',
    '[attr.id]': 'id',
    '[class.mat-primary]': 'color === "primary"',
    '[class.mat-accent]': 'color === "accent"',
    '[class.mat-warn]': 'color === "warn"',
    '[class.mat-mdc-radio-checked]': 'checked',
    '[class.mat-mdc-radio-disabled]': 'disabled',
    '[class.mat-mdc-radio-disabled-interactive]': 'disabledInteractive',
    '[class._mat-animation-noopable]': '_noopAnimations',
    '[attr.tabindex]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '(focus)': '_inputElement.nativeElement.focus()',
  },
  exportAs: 'matRadioButton',
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatRipple, _MatInternalFormField],
})
export class MatRadioButton implements OnInit, AfterViewInit, DoCheck, OnDestroy {
  private _elementRef = inject(ElementRef);
  private _changeDetector = inject(ChangeDetectorRef);
  private _focusMonitor = inject(FocusMonitor);
  private _radioDispatcher = inject(UniqueSelectionDispatcher);
  private _defaultOptions = inject(MAT_RADIO_DEFAULT_OPTIONS, {optional: true});
  private _ngZone = inject(NgZone);
  private _renderer = inject(Renderer2);
  private _uniqueId = inject(_IdGenerator).getId('mat-radio-');
  private _injector = inject(Injector);

  private _cleanupClick: (() => void) | undefined;
  private _removeUniqueSelectionListener: () => void = () => {};
  private _previousTabIndex: number | undefined;

  private _checked = false;
  private _disabled = false;
  private _required = false;
  private _value: any = null;
  private _color: ThemePalette;
  private _disabledInteractive = false;
  private _labelPosition: 'before' | 'after';

  /** The unique ID for the radio button. */
  @Input() id: string = this._uniqueId;

  /** Analog to HTML 'name' attribute used to group radios for unique selection. */
  @Input() name: string = '';

  /** Used to set the 'aria-label' attribute on the underlying input element. */
  @Input('aria-label') ariaLabel: string = '';

  /** The 'aria-labelledby' attribute takes precedence as the element's text alternative. */
  @Input('aria-labelledby') ariaLabelledby: string = '';

  /** The 'aria-describedby' attribute is read after the element's label and field type. */
  @Input('aria-describedby') ariaDescribedby: string = '';

  /** Whether ripples are disabled inside the radio button. */
  @Input({transform: booleanAttribute}) disableRipple = false;

  /** Tabindex of the radio button. */
  @Input({
    transform: (value: unknown) => (value == null ? 0 : numberAttribute(value)),
  })
  tabIndex = 0;

  /** Whether this radio button is checked. */
  @Input({transform: booleanAttribute})
  get checked(): boolean {
    return this._checked;
  }
  set checked(value: boolean) {
    if (this._checked !== value) {
      this._checked = value;
      this._updateRadioGroupSelection(value);
      this._notifyOtherRadiosIfChecked(value);
      this._changeDetector.markForCheck();
    }
  }

  /** The value of this radio button. */
  @Input()
  get value(): any {
    return this._value;
  }
  set value(value: any) {
    if (this._value !== value) {
      this._value = value;
      this._syncWithRadioGroup();
    }
  }

  /** Whether the label should appear after or before the radio button. Defaults to 'after'. */
  @Input()
  get labelPosition(): 'before' | 'after' {
    return this._labelPosition || (this.radioGroup && this.radioGroup.labelPosition) || 'after';
  }
  set labelPosition(value) {
    this._labelPosition = value;
  }

  /** Whether the radio button is disabled. */
  @Input({transform: booleanAttribute})
  get disabled(): boolean {
    return this._disabled || (this.radioGroup !== null && this.radioGroup.disabled);
  }
  set disabled(value: boolean) {
    this._setDisabled(value);
  }

  /** Whether the radio button is required. */
  @Input({transform: booleanAttribute})
  get required(): boolean {
    return this._required || (this.radioGroup && this.radioGroup.required);
  }
  set required(value: boolean) {
    if (value !== this._required) {
      this._changeDetector.markForCheck();
    }
    this._required = value;
  }

  /**
   * Theme color of the radio button. This API is supported in M2 themes only.
   */
  @Input()
  get color(): ThemePalette {
    return (
      this._color ||
      (this.radioGroup && this.radioGroup.color) ||
      (this._defaultOptions && this._defaultOptions.color) ||
      'accent'
    );
  }
  set color(newValue: ThemePalette) {
    this._color = newValue;
  }

  /** Whether the radio button should remain interactive when it is disabled. */
  @Input({transform: booleanAttribute})
  get disabledInteractive(): boolean {
    return (
      this._disabledInteractive || (this.radioGroup !== null && this.radioGroup.disabledInteractive)
    );
  }
  set disabledInteractive(value: boolean) {
    this._disabledInteractive = value;
  }

  /**
   * Event emitted when the checked state of this radio button changes.
   */
  @Output() readonly change = new EventEmitter<MatRadioChange>();

  /** The parent radio group. May or may not be present. */
  radioGroup: MatRadioGroup;

  /** ID of the native input element inside `<mat-radio-button>`. */
  get inputId(): string {
    return `${this.id || this._uniqueId}-input`;
  }

  /** The native `<input type=radio>` element. */
  @ViewChild('input') _inputElement!: ElementRef<HTMLInputElement>;

  /** Trigger elements for the ripple events. */
  @ViewChild('formField', {read: ElementRef, static: true})
  _rippleTrigger!: ElementRef<HTMLElement>;

  /** Whether animations are disabled. */
  _noopAnimations = _animationsDisabled();

  constructor() {
    inject(_CdkPrivateStyleLoader).load(_StructuralStylesLoader);

    const radioGroup = inject(MAT_RADIO_GROUP, {optional: true})!;
    const tabIndex = inject(new HostAttributeToken('tabindex'), {optional: true});

    this.radioGroup = radioGroup;
    this._disabledInteractive = this._defaultOptions?.disabledInteractive ?? false;

    if (tabIndex) {
      this.tabIndex = numberAttribute(tabIndex, 0);
    }
  }

  /** Focuses the radio button. */
  focus(options?: FocusOptions, origin?: FocusOrigin): void {
    if (origin) {
      this._focusMonitor.focusVia(this._inputElement, origin, options);
    } else {
      this._inputElement.nativeElement.focus(options);
    }
  }

  /** Marks the radio button as needing checking for change detection. */
  _markForCheck() {
    this._changeDetector.markForCheck();
  }

  /** Checks if ripple is disabled. */
  _isRippleDisabled() {
    return this.disableRipple || this.disabled;
  }

  ngOnInit() {
    this._initializeWithRadioGroup();
    this._setupUniqueSelectionListener();
  }

  ngDoCheck(): void {
    this._updateTabIndex();
  }

  ngAfterViewInit() {
    this._updateTabIndex();
    this._setupFocusMonitoring();
    this._setupInputClickListener();
  }

  ngOnDestroy() {
    this._cleanup();
  }

  /** Triggered when the radio button receives an interaction from the user. */
  _onInputInteraction(event: Event) {
    event.stopPropagation();

    if (!this.checked && !this.disabled) {
      const groupValueChanged = this.radioGroup && this.value !== this.radioGroup.value;
      this.checked = true;
      this._emitChangeEvent();

      if (this.radioGroup) {
        this.radioGroup._controlValueAccessorChangeFn(this.value);
        if (groupValueChanged) {
          this.radioGroup._emitChangeEvent();
        }
      }
    }
  }

  /** Triggered when the user clicks on the touch target. */
  _onTouchTargetClick(event: Event) {
    this._onInputInteraction(event);

    if (!this.disabled || this.disabledInteractive) {
      this._inputElement?.nativeElement.focus();
    }
  }

  /** Sets the disabled state and marks for check if a change occurred. */
  private _setDisabled(value: boolean) {
    if (this._disabled !== value) {
      this._disabled = value;
      this._changeDetector.markForCheck();
    }
  }

  /** Dispatch change event with current value. */
  private _emitChangeEvent(): void {
    this.change.emit(new MatRadioChange(this, this._value));
  }

  /** Update radio group selection based on checked state. */
  private _updateRadioGroupSelection(isChecked: boolean): void {
    if (isChecked && this.radioGroup && this.radioGroup.value !== this.value) {
      this.radioGroup.selected = this;
    } else if (!isChecked && this.radioGroup && this.radioGroup.value === this.value) {
      this.radioGroup.selected = null;
    }
  }

  /** Notify other radios with the same name to un-check. */
  private _notifyOtherRadiosIfChecked(isChecked: boolean): void {
    if (isChecked) {
      this._radioDispatcher.notify(this.id, this.name);
    }
  }

  /** Synchronize with radio group when value changes. */
  private _syncWithRadioGroup(): void {
    if (this.radioGroup !== null) {
      if (!this.checked) {
        this.checked = this.radioGroup.value === this._value;
      }
      if (this.checked) {
        this.radioGroup.selected = this;
      }
    }
  }

  /** Initialize with radio group if present. */
  private _initializeWithRadioGroup(): void {
    if (this.radioGroup) {
      this.checked = this.radioGroup.value === this._value;

      if (this.checked) {
        this.radioGroup.selected = this;
      }

      this.name = this.radioGroup.name;
    }
  }

  /** Setup unique selection listener. */
  private _setupUniqueSelectionListener(): void {
    this._removeUniqueSelectionListener = this._radioDispatcher.listen((id, name) => {
      if (id !== this.id && name === this.name) {
        this.checked = false;
      }
    });
  }

  /** Setup focus monitoring. */
  private _setupFocusMonitoring(): void {
    this._focusMonitor.monitor(this._elementRef, true).subscribe(focusOrigin => {
      if (!focusOrigin && this.radioGroup) {
        this.radioGroup._touch();
      }
    });
  }

  /** Setup input click listener outside Angular zone. */
  private _setupInputClickListener(): void {
    this._ngZone.runOutsideAngular(() => {
      this._cleanupClick = this._renderer.listen(
        this._inputElement.nativeElement,
        'click',
        this._onInputClick,
      );
    });
  }

  /** Called when the input is clicked. */
  private _onInputClick = (event: Event) => {
    if (this.disabled && this.disabledInteractive) {
      event.preventDefault();
    }
  };

  /** Gets the tabindex for the underlying input element. */
  private _updateTabIndex() {
    const group = this.radioGroup;
    let value: number;

    if (!group || !group.selected || this.disabled) {
      value = this.tabIndex;
    } else {
      value = group.selected === this ? this.tabIndex : -1;
    }

    if (value !== this._previousTabIndex) {
      const input: HTMLInputElement | undefined = this._inputElement?.nativeElement;

      if (input) {
        input.setAttribute('tabindex', value + '');
        this._previousTabIndex = value;

        afterNextRender(
          () => {
            queueMicrotask(() => {
              if (
                group &&
                group.selected &&
                group.selected !== this &&
                document.activeElement === input
              ) {
                group.selected?._inputElement.nativeElement.focus();
                if (document.activeElement === input) {
                  this._inputElement.nativeElement.blur();
                }
              }
            });
          },
          {injector: this._injector},
        );
      }
    }
  }

  /** Cleanup resources. */
  private _cleanup(): void {
    this._cleanupClick?.();
    this._focusMonitor.stopMonitoring(this._elementRef);
    this._removeUniqueSelectionListener();
  }
}
