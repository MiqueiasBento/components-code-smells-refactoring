/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {_IdGenerator} from '@angular/cdk/a11y';
import {
  AfterContentInit,
  booleanAttribute,
  ChangeDetectorRef,
  ContentChildren,
  Directive,
  EventEmitter,
  forwardRef,
  inject,
  Input,
  OnDestroy,
  Output,
  QueryList,
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from '@angular/forms';
import {Subscription} from 'rxjs';
import {ThemePalette} from '../core';
import {MatRadioButton} from './radio-button';
import {MatRadioChange} from './radio-change';
import {MAT_RADIO_GROUP} from './radio.types';

/**
 * Provider Expression that allows mat-radio-group to register as a ControlValueAccessor.
 */
export const MAT_RADIO_GROUP_CONTROL_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => MatRadioGroup),
  multi: true,
};

/**
 * A group of radio buttons. May contain one or more `<mat-radio-button>` elements.
 */
@Directive({
  selector: 'mat-radio-group',
  exportAs: 'matRadioGroup',
  providers: [
    MAT_RADIO_GROUP_CONTROL_VALUE_ACCESSOR,
    {provide: MAT_RADIO_GROUP, useExisting: MatRadioGroup},
  ],
  host: {
    'role': 'radiogroup',
    'class': 'mat-mdc-radio-group',
  },
})
export class MatRadioGroup implements AfterContentInit, OnDestroy, ControlValueAccessor {
  private _changeDetector = inject(ChangeDetectorRef);
  private _idGenerator = inject(_IdGenerator);

  /** Selected value for the radio group. */
  private _value: any = null;

  /** The HTML name attribute applied to radio buttons in this group. */
  private _name: string = this._idGenerator.getId('mat-radio-group-');

  /** The currently selected radio button. Should match value. */
  private _selected: MatRadioButton | null = null;

  /** Whether the `value` has been set to its initial value. */
  private _isInitialized = false;

  /** Whether the labels should appear after or before the radio-buttons. Defaults to 'after' */
  private _labelPosition: 'before' | 'after' = 'after';

  /** Whether the radio group is disabled. */
  private _disabled = false;

  /** Whether the radio group is required. */
  private _required = false;

  /** Whether buttons in the group should be interactive while they're disabled. */
  private _disabledInteractive = false;

  /** Subscription to changes in amount of radio buttons. */
  private _buttonChanges!: Subscription;

  /** The method to be called in order to update ngModel. */
  _controlValueAccessorChangeFn: (value: any) => void = () => {};

  /** onTouch function registered via registerOnTouch (ControlValueAccessor). */
  onTouched: () => any = () => {};

  /**
   * Event emitted when the group value changes.
   * Change events are only emitted when the value changes due to user interaction with
   * a radio button (the same behavior as `<input type-"radio">`).
   */
  @Output() readonly change = new EventEmitter<MatRadioChange>();

  /** Child radio buttons. */
  @ContentChildren(forwardRef(() => MatRadioButton), {descendants: true})
  _radios!: QueryList<MatRadioButton>;

  /**
   * Theme color of the radio buttons in the group. This API is supported in M2
   * themes only, it has no effect in M3 themes.
   */
  @Input() color!: ThemePalette;

  /** Name of the radio button group. All radio buttons inside this group will use this name. */
  @Input()
  get name(): string {
    return this._name;
  }
  set name(value: string) {
    this._name = value;
    this._updateRadioButtonNames();
  }

  /** Whether the labels should appear after or before the radio-buttons. Defaults to 'after'. */
  @Input()
  get labelPosition(): 'before' | 'after' {
    return this._labelPosition;
  }
  set labelPosition(v) {
    this._labelPosition = v === 'before' ? 'before' : 'after';
    this._markRadiosForCheck();
  }

  /**
   * Value for the radio-group. Should equal the value of the selected radio button if there is
   * a corresponding radio button with a matching value.
   */
  @Input()
  get value(): any {
    return this._value;
  }
  set value(newValue: any) {
    if (this._value !== newValue) {
      this._value = newValue;
      this._updateSelectedRadioFromValue();
      this._checkSelectedRadioButton();
    }
  }

  /**
   * The currently selected radio button. If set to a new radio button, the radio group value
   * will be updated to match the new selected button.
   */
  @Input()
  get selected() {
    return this._selected;
  }
  set selected(selected: MatRadioButton | null) {
    this._selected = selected;
    this.value = selected ? selected.value : null;
    this._checkSelectedRadioButton();
  }

  /** Whether the radio group is disabled. */
  @Input({transform: booleanAttribute})
  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    this._disabled = value;
    this._markRadiosForCheck();
  }

  /** Whether the radio group is required. */
  @Input({transform: booleanAttribute})
  get required(): boolean {
    return this._required;
  }
  set required(value: boolean) {
    this._required = value;
    this._markRadiosForCheck();
  }

  /** Whether buttons in the group should be interactive while they're disabled. */
  @Input({transform: booleanAttribute})
  get disabledInteractive(): boolean {
    return this._disabledInteractive;
  }
  set disabledInteractive(value: boolean) {
    this._disabledInteractive = value;
    this._markRadiosForCheck();
  }

  /** Initialize properties once content children are available. */
  ngAfterContentInit() {
    this._isInitialized = true;

    this._buttonChanges = this._radios.changes.subscribe(() => {
      if (this.selected && !this._radios.find(radio => radio === this.selected)) {
        this._selected = null;
      }
    });
  }

  ngOnDestroy() {
    this._buttonChanges?.unsubscribe();
  }

  /** Mark this group as being "touched" (for ngModel). */
  _touch() {
    if (this.onTouched) {
      this.onTouched();
    }
  }

  /** Update the selected radio button from the internal value state. */
  private _updateSelectedRadioFromValue(): void {
    const isAlreadySelected = this._selected !== null && this._selected.value === this._value;

    if (this._radios && !isAlreadySelected) {
      this._selected = null;
      this._radios.forEach(radio => {
        radio.checked = this.value === radio.value;
        if (radio.checked) {
          this._selected = radio;
        }
      });
    }
  }

  /** Ensure the selected radio button is checked. */
  _checkSelectedRadioButton() {
    if (this._selected && !this._selected.checked) {
      this._selected.checked = true;
    }
  }

  /** Dispatch change event with current selection and group value. */
  _emitChangeEvent(): void {
    if (this._isInitialized) {
      this.change.emit(new MatRadioChange(this._selected!, this._value));
    }
  }

  /** Mark all radios for check. */
  _markRadiosForCheck() {
    if (this._radios) {
      this._radios.forEach(radio => radio._markForCheck());
    }
  }

  /** Update radio button names when group name changes. */
  private _updateRadioButtonNames(): void {
    if (this._radios) {
      this._radios.forEach(radio => {
        radio.name = this.name;
        radio._markForCheck();
      });
    }
  }

  // ControlValueAccessor implementation
  writeValue(value: any) {
    this.value = value;
    this._changeDetector.markForCheck();
  }

  registerOnChange(fn: (value: any) => void) {
    this._controlValueAccessorChangeFn = fn;
  }

  registerOnTouched(fn: any) {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean) {
    this.disabled = isDisabled;
    this._changeDetector.markForCheck();
  }
}
