/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {Injectable} from '@angular/core';
import type {LiveExample} from '@angular/components-examples';
import {DocItem} from './doc-item-types';
import {DOCS, COMPONENTS, CDK} from './doc-items-data';

export {DocItem, DocSection, AdditionalApiDoc, ExampleSpecs} from './doc-item-types';
export {SECTIONS} from './doc-items-data';

interface DocsData {
  cdk: DocItem[];
  components: DocItem[];
  all: DocItem[];
  examples: Record<string, LiveExample>;
}

@Injectable({providedIn: 'root'})
export class DocumentationItems {
  private _cachedData: DocsData | null = null;

  async getItems(section: string): Promise<DocItem[]> {
    const data = await this.getData();
    if (section === COMPONENTS) {
      return data.components;
    }
    if (section === CDK) {
      return data.cdk;
    }
    return [];
  }

  async getItemById(id: string, section: string): Promise<DocItem | undefined> {
    const docs = (await this.getData()).all;
    const sectionLookup = section === 'cdk' ? 'cdk' : 'material';
    return docs.find(doc => doc.id === id && doc.packageName === sectionLookup);
  }

  async getData(): Promise<DocsData> {
    if (!this._cachedData) {
      const examples = (await import('@angular/components-examples')).EXAMPLE_COMPONENTS;
      const exampleNames = Object.keys(examples);
      const components = this._processDocs('material', exampleNames, DOCS[COMPONENTS]);
      const cdk = this._processDocs('cdk', exampleNames, DOCS[CDK]);

      this._cachedData = {
        components,
        cdk,
        all: [...components, ...cdk],
        examples,
      };
    }

    return this._cachedData;
  }

  private _processDocs(packageName: string, exampleNames: string[], docs: DocItem[]): DocItem[] {
    for (const doc of docs) {
      doc.packageName = packageName;
      doc.hasStyling ??= packageName === 'material';
      doc.examples = exampleNames.filter(
        key =>
          key.match(RegExp(`^${doc.exampleSpecs.prefix}`)) &&
          !doc.exampleSpecs.exclude?.some(excludeName => key.indexOf(excludeName) === 0),
      );
    }

    return docs.sort((a, b) => a.name.localeCompare(b.name, 'en'));
  }
}
