/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type {LiveExample} from '@angular/components-examples';
import {normalizePath} from '../normalize-path';

/** Regular expression that matches a file name and its extension */
const fileExtensionRegex = /(.*)\.(\w+)/;

/**
 * Generates example tabs from LiveExample data.
 * @param data The LiveExample data
 * @param exampleName The name of the example
 * @returns A record mapping tab names to their import paths
 */
export function generateExampleTabs(
  data: LiveExample | null,
  exampleName: string,
): Record<string, string> {
  const tabs: Record<string, string> = {};

  if (data) {
    // Name of the default example files. If files with such name exist within the example,
    // we provide a shorthand for them within the example tabs (for less verbose tabs).
    const exampleBaseFileName = `${exampleName}-example`;
    const docsContentPath = `/docs-content/examples-highlighted/${data.packagePath}`;

    const tsPath = normalizePath(`${exampleBaseFileName}.ts`);
    const cssPath = normalizePath(`${exampleBaseFileName}.css`);
    const htmlPath = normalizePath(`${exampleBaseFileName}.html`);

    for (let fileName of data.files) {
      // Since the additional files refer to the original file name, we need to transform
      // the file name to match the highlighted HTML file that displays the source.
      const fileSourceName = fileName.replace(fileExtensionRegex, '$1-$2.html');
      const importPath = `${docsContentPath}/${fileSourceName}`;

      // Normalize the path to allow for more consistent displaying in the tabs,
      // and to make comparisons below more reliable.
      fileName = normalizePath(fileName);

      if (fileName === tsPath) {
        tabs['TS'] = importPath;
      } else if (fileName === cssPath) {
        tabs['CSS'] = importPath;
      } else if (fileName === htmlPath) {
        tabs['HTML'] = importPath;
      } else {
        tabs[fileName] = importPath;
      }
    }
  }

  return tabs;
}
