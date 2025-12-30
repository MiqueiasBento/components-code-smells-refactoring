/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {ExampleViewer} from '../example-viewer/example-viewer';

/**
 * Initializes an ExampleViewer component with the provided parameters.
 */
export function initExampleViewer(
  exampleViewerComponent: ExampleViewer,
  example: string,
  file: string | null,
  region: string | null,
): void {
  exampleViewerComponent.example = example;
  if (file) {
    // if the html div has field `file` then it should be in compact view to show the code
    // snippet
    exampleViewerComponent.view.set('snippet');
    exampleViewerComponent.showCompactToggle.set(true);
    exampleViewerComponent.file.set(file);
    if (region) {
      // `region` should only exist when `file` exists but not vice versa
      // It is valid for embedded example snippets to show the whole file (esp short files)
      exampleViewerComponent.region.set(region);
    }
  } else {
    // otherwise it is an embedded demo
    exampleViewerComponent.view.set('demo');
  }
}
