/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {FocusMonitor, FocusOrigin} from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  ViewEncapsulation,
  TemplateRef,
  AfterViewInit,
  inject,
} from '@angular/core';
import {Subscription} from 'rxjs';
import {MatStepLabel} from './step-label';
import {MatStepperIntl} from './stepper-intl';
import {MatStepperIconContext} from './stepper-icon';
import {CdkStepHeader, StepState} from '@angular/cdk/stepper';

/** Configuration options for the step header. */
export interface MatStepHeaderConfig {
  label?: MatStepLabel | string;
  errorMessage?: string;
  iconOverrides?: {[key: string]: TemplateRef<MatStepperIconContext>};
  index?: number;
  optional?: boolean;
  disableRipple?: boolean;
  color?: ThemePalette;
}

/** State properties for the step header. */
export interface MatStepHeaderState {
  state?: StepState;
  selected?: boolean;
  active?: boolean;
}
import {_StructuralStylesLoader, MatRipple, ThemePalette} from '../core';
import {MatIcon} from '../icon';
import {NgTemplateOutlet} from '@angular/common';
import {_CdkPrivateStyleLoader, _VisuallyHiddenLoader} from '@angular/cdk/private';

@Component({
  selector: 'mat-step-header',
  templateUrl: 'step-header.html',
  styleUrl: 'step-header.css',
  host: {
    'class': 'mat-step-header',
    '[class.mat-step-header-empty-label]': '_hasEmptyLabel()',
    '[class]': '"mat-" + (color || "primary")',
    'role': '', // ignore cdk role in favor of setting appropriately in html
  },
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatRipple, NgTemplateOutlet, MatIcon],
})
export class MatStepHeader extends CdkStepHeader implements AfterViewInit, OnDestroy {
  _intl = inject(MatStepperIntl);
  private _focusMonitor = inject(FocusMonitor);

  private _intlSubscription: Subscription;

  /**
   * Configuration options.
   */
  @Input()
  get config(): MatStepHeaderConfig {
    return {
      label: this.label,
      errorMessage: this.errorMessage,
      iconOverrides: this.iconOverrides,
      index: this.index,
      optional: this.optional,
      disableRipple: this.disableRipple,
      color: this.color
    };
  }
  set config(c: MatStepHeaderConfig) {
    if (c.label !== undefined) this.label = c.label;
    if (c.errorMessage !== undefined) this.errorMessage = c.errorMessage;
    if (c.iconOverrides !== undefined) this.iconOverrides = c.iconOverrides;
    if (c.index !== undefined) this.index = c.index;
    if (c.optional !== undefined) this.optional = c.optional;
    if (c.disableRipple !== undefined) this.disableRipple = c.disableRipple;
    if (c.color !== undefined) this.color = c.color;
  }

  /**
   * State properties.
   */
  @Input()
  get headerState(): MatStepHeaderState {
    return {
      state: this.state,
      selected: this.selected,
      active: this.active
    };
  }
  set headerState(s: MatStepHeaderState) {
    if (s.state !== undefined) this.state = s.state;
    if (s.selected !== undefined) this.selected = s.selected;
    if (s.active !== undefined) this.active = s.active;
  }

  /** State of the given step. */
  state: StepState;

  /** Label of the given step. */
  label: MatStepLabel | string;

  /** Error message to display when there's an error. */
  errorMessage: string;

  /** Overrides for the header icons, passed in via the stepper. */
  iconOverrides: {[key: string]: TemplateRef<MatStepperIconContext>};

  /** Index of the given step. */
  index: number;

  /** Whether the given step is selected. */
  selected: boolean;

  /** Whether the given step label is active. */
  active: boolean;

  /** Whether the given step is optional. */
  optional: boolean;

  /** Whether the ripple should be disabled. */
  disableRipple: boolean;

  /**
   * Theme color of the step header. This API is supported in M2 themes only, it
   * has no effect in M3 themes. For color customization in M3, see https://material.angular.dev/components/stepper/styling.
   *
   * For information on applying color variants in M3, see
   * https://material.angular.dev/guide/material-2-theming#optional-add-backwards-compatibility-styles-for-color-variants
   */
  color: ThemePalette;

  constructor(...args: unknown[]);

  constructor() {
    super();

    const styleLoader = inject(_CdkPrivateStyleLoader);
    styleLoader.load(_StructuralStylesLoader);
    styleLoader.load(_VisuallyHiddenLoader);
    const changeDetectorRef = inject(ChangeDetectorRef);
    this._intlSubscription = this._intl.changes.subscribe(() => changeDetectorRef.markForCheck());
  }

  ngAfterViewInit() {
    this._focusMonitor.monitor(this._elementRef, true);
  }

  ngOnDestroy() {
    this._intlSubscription.unsubscribe();
    this._focusMonitor.stopMonitoring(this._elementRef);
  }

  /** Focuses the step header. */
  override focus(origin?: FocusOrigin, options?: FocusOptions) {
    if (origin) {
      this._focusMonitor.focusVia(this._elementRef, origin, options);
    } else {
      this._elementRef.nativeElement.focus(options);
    }
  }

  /** Returns string label of given step if it is a text label. */
  _stringLabel(): string | null {
    return this.label instanceof MatStepLabel ? null : this.label;
  }

  /** Returns MatStepLabel if the label of given step is a template label. */
  _templateLabel(): MatStepLabel | null {
    return this.label instanceof MatStepLabel ? this.label : null;
  }

  /** Returns the host HTML element. */
  _getHostElement() {
    return this._elementRef.nativeElement;
  }

  _getDefaultTextForState(state: StepState): string {
    if (state == 'number') {
      return `${this.index + 1}`;
    }
    if (state == 'edit') {
      return 'create';
    }
    if (state == 'error') {
      return 'warning';
    }
    return state;
  }

  protected _hasEmptyLabel() {
    return (
      !this._stringLabel() &&
      !this._templateLabel() &&
      !this._hasOptionalLabel() &&
      !this._hasErrorLabel()
    );
  }

  protected _hasOptionalLabel() {
    return this.optional && this.state !== 'error';
  }

  protected _hasErrorLabel() {
    return this.state === 'error';
  }
}
