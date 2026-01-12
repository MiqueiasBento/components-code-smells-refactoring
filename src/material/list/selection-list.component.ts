/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {BooleanInput, coerceBooleanProperty} from '@angular/cdk/coercion';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ContentChildren,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  QueryList,
  SimpleChanges,
  ViewEncapsulation,
  inject,
  signal,
} from '@angular/core';
import {ControlValueAccessor} from '@angular/forms';
import {Subject} from 'rxjs';
import {ThemePalette} from '../core';
import {MatListBase} from './list-base';
import {MatListOption, SELECTION_LIST, SelectionList} from './list-option';
import {MatSelectionListChange} from './models/selection-list.models';
import {MAT_SELECTION_LIST_VALUE_ACCESSOR} from './selection-list.constants';
import {SelectionListFocusService} from './services/selection-list-focus.service';
import {SelectionListKeyboardService} from './services/selection-list-keyboard.service';
import {SelectionListSelectionService} from './services/selection-list-selection.service';

/**
 * Component for displaying a list of options with selection capabilities.
 * Supports both single and multiple selection modes.
 */
@Component({
  selector: 'mat-selection-list',
  exportAs: 'matSelectionList',
  host: {
    'class': 'mat-mdc-selection-list mat-mdc-list-base mdc-list',
    'role': 'listbox',
    '[attr.aria-multiselectable]': 'multiple',
    '(keydown)': '_handleKeydown($event)',
  },
  template: '<ng-content></ng-content>',
  styleUrl: 'list.css',
  encapsulation: ViewEncapsulation.None,
  providers: [
    MAT_SELECTION_LIST_VALUE_ACCESSOR,
    {provide: MatListBase, useExisting: MatSelectionList},
    {provide: SELECTION_LIST, useExisting: MatSelectionList},
    SelectionListKeyboardService,
    SelectionListFocusService,
    SelectionListSelectionService,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MatSelectionList
  extends MatListBase
  implements SelectionList, ControlValueAccessor, AfterViewInit, OnChanges, OnDestroy
{
  readonly _element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _changeDetectorRef = inject(ChangeDetectorRef);
  private readonly _keyboardService = inject(SelectionListKeyboardService);
  private readonly _focusService = inject(SelectionListFocusService);
  private readonly _selectionService = inject(SelectionListSelectionService);

  private _initialized = false;
  private _isDestroyed = false;

  /** Emits when the list has been destroyed. */
  private readonly _destroyed = new Subject<void>();

  @ContentChildren(MatListOption, {descendants: true}) _items: QueryList<MatListOption>;

  /** Emits a change event whenever the selected state of an option changes. */
  @Output() readonly selectionChange: EventEmitter<MatSelectionListChange> =
    new EventEmitter<MatSelectionListChange>();

  /** Theme color of the selection list. */
  @Input() color: ThemePalette = 'accent';

  /** Function used for comparing an option against the selected value. */
  @Input() compareWith: (o1: any, o2: any) => boolean = (a1, a2) => a1 === a2;

  /** Whether selection is limited to one or multiple items. */
  @Input()
  get multiple(): boolean {
    return this._selectionService.multiple;
  }
  set multiple(value: BooleanInput) {
    const newValue = coerceBooleanProperty(value);

    if (newValue !== this._selectionService.multiple) {
      if ((typeof ngDevMode === 'undefined' || ngDevMode) && this._initialized) {
        throw new Error(
          'Cannot change `multiple` mode of mat-selection-list after initialization.',
        );
      }
      this._selectionService.setMultiple(newValue);
    }
  }

  /** Whether radio indicator for all list items is hidden. */
  @Input()
  get hideSingleSelectionIndicator(): boolean {
    return this._hideSingleSelectionIndicator;
  }
  set hideSingleSelectionIndicator(value: BooleanInput) {
    this._hideSingleSelectionIndicator = coerceBooleanProperty(value);
  }
  private _hideSingleSelectionIndicator: boolean =
    this._defaultOptions?.hideSingleSelectionIndicator ?? false;

  /** The currently selected options. */
  get selectedOptions() {
    return this._selectionService.selectedOptions;
  }

  /** Keeps track of the currently-selected value. */
  _value: string[] | null;

  /** View to model callback. */
  _onTouched: () => void = () => {};

  constructor(...args: unknown[]);
  constructor() {
    super();
    this._isNonInteractive = false;
  }

  ngAfterViewInit() {
    this._initialized = true;

    this._keyboardService.initialize(this._items, this.disabled);
    this._focusService.initialize(this._element, this._items);

    if (this._value) {
      this._selectionService.setOptionsFromValues(this._value, this.options, this.compareWith);
    }

    this._selectionService.watchForSelectionChange(
      this._destroyed,
      () => this._focusService.containsFocus(),
      () => this._focusService.resetActiveOption(this._items, this.disabled),
    );
  }

  ngOnChanges(changes: SimpleChanges) {
    const disabledChanges = changes['disabled'];
    const disableRippleChanges = changes['disableRipple'];
    const hideSingleSelectionIndicatorChanges = changes['hideSingleSelectionIndicator'];

    if (
      (disableRippleChanges && !disableRippleChanges.firstChange) ||
      (disabledChanges && !disabledChanges.firstChange) ||
      (hideSingleSelectionIndicatorChanges && !hideSingleSelectionIndicatorChanges.firstChange)
    ) {
      this._markOptionsForCheck();
    }
  }

  ngOnDestroy() {
    this._keyboardService.destroy();
    this._focusService.destroy();
    this._destroyed.next();
    this._destroyed.complete();
    this._isDestroyed = true;
  }

  /** Focuses the selection list. */
  focus(options?: FocusOptions) {
    this._element.nativeElement.focus(options);
  }

  /** Selects all of the options. */
  selectAll(): MatListOption[] {
    return this._setAllOptionsSelected(true);
  }

  /** Deselects all of the options. */
  deselectAll(): MatListOption[] {
    return this._setAllOptionsSelected(false);
  }

  /** Reports a value change to the ControlValueAccessor */
  _reportValueChange() {
    if (this.options && !this._isDestroyed) {
      const value = this._selectionService.getSelectedOptionValues(this.options);
      this._selectionService.onChange(value);
      this._value = value;
    }
  }

  /** Emits a change event if the selected state of an option changed. */
  _emitChangeEvent(options: MatListOption[]) {
    this.selectionChange.emit(new MatSelectionListChange(this, options));
  }

  /** Implemented as part of ControlValueAccessor. */
  writeValue(values: string[]): void {
    this._value = values;

    if (this.options) {
      this._selectionService.setOptionsFromValues(values || [], this.options, this.compareWith);
    }
  }

  /** Implemented as a part of ControlValueAccessor. */
  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this._changeDetectorRef.markForCheck();
    this._markOptionsForCheck();
  }

  /** Whether the entire selection list is disabled. */
  @Input()
  override get disabled(): boolean {
    return this._selectionListDisabled();
  }
  override set disabled(value: BooleanInput) {
    this._selectionListDisabled.set(coerceBooleanProperty(value));
    if (this._selectionListDisabled()) {
      this._keyboardService.setActiveItem(-1);
    }
  }
  private _selectionListDisabled = signal(false);

  /** Implemented as part of ControlValueAccessor. */
  registerOnChange(fn: (value: any) => void): void {
    this._selectionService.onChange = fn;
  }

  /** Implemented as part of ControlValueAccessor. */
  registerOnTouched(fn: () => void): void {
    this._onTouched = fn;
  }

  /** Marks all the options to be checked in the next change detection run. */
  private _markOptionsForCheck() {
    if (this.options) {
      this.options.forEach(option => option._markForCheck());
    }
  }

  /** Sets the selected state on all options and emits an event if anything changed. */
  private _setAllOptionsSelected(isSelected: boolean, skipDisabled?: boolean): MatListOption[] {
    const changedOptions: MatListOption[] = [];

    this.options.forEach(option => {
      if ((!skipDisabled || !option.disabled) && option._setSelected(isSelected)) {
        changedOptions.push(option);
      }
    });

    if (changedOptions.length) {
      this._reportValueChange();
    }

    return changedOptions;
  }

  /** The option components contained within this selection-list. */
  get options(): QueryList<MatListOption> {
    return this._items;
  }

  /** Handles keydown events within the list. */
  _handleKeydown(event: KeyboardEvent) {
    this._keyboardService.handleKeydown(event, this.multiple, this.options, shouldSelect =>
      this._emitChangeEvent(this._setAllOptionsSelected(shouldSelect, true)),
    );
  }
}
