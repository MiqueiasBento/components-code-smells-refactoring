import {computed} from '@angular/core';
import {LabelControl, LabelControlOptionalInputs} from '../behaviors/label/label';
import {SignalLike} from '../public-api';
import {TabPattern} from './tab-pattern';

/** The required inputs for the tabpanel. */
export interface TabPanelInputs extends LabelControlOptionalInputs {
  /** A global unique identifier for the tabpanel. */
  id: SignalLike<string>;

  /** The tab that controls this tabpanel. */
  tab: SignalLike<TabPattern | undefined>;

  /** A local unique identifier for the tabpanel. */
  value: SignalLike<string>;
}

/** A tabpanel associated with a tab. */
export class TabPanelPattern {
  /** A global unique identifier for the tabpanel. */
  readonly id: SignalLike<string> = () => this.inputs.id();

  /** A local unique identifier for the tabpanel. */
  readonly value: SignalLike<string> = () => this.inputs.value();

  /** Controls label for this tabpanel. */
  readonly labelManager: LabelControl;

  /** Whether the tabpanel is hidden. */
  readonly hidden = computed(() => this.inputs.tab()?.expanded() === false);

  /** The tab index of this tabpanel. */
  readonly tabIndex = computed(() => (this.hidden() ? -1 : 0));

  /** The aria-labelledby value for this tabpanel. */
  readonly labelledBy = computed(() =>
    this.labelManager.labelledBy().length > 0
      ? this.labelManager.labelledBy().join(' ')
      : undefined,
  );

  constructor(readonly inputs: TabPanelInputs) {
    this.labelManager = new LabelControl({
      ...inputs,
      defaultLabelledBy: computed(() => (this.inputs.tab() ? [this.inputs.tab()!.id()] : [])),
    });
  }
}
