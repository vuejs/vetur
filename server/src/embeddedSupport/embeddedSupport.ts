import { TextDocument, Position, Range } from 'vscode-languageserver-types';
import { parseVueDocumentRegions, EmbeddedRegion } from './vueDocumentRegionParser';

export type LanguageId =
  | 'vue'
  | 'vue-html'
  | 'pug'
  | 'css'
  | 'postcss'
  | 'scss'
  | 'less'
  | 'stylus'
  | 'javascript'
  | 'typescript'
  | 'tsx';

export interface LanguageRange extends Range {
  languageId: LanguageId;
  attributeValue?: boolean;
}

export interface VueDocumentRegions {
  /**
   * Get a document where all regions of `languageId` is preserved
   * Whereas other regions are replaced with whitespaces
   */
  getSingleLanguageDocument(languageId: LanguageId): TextDocument;

  /**
   * Get a document where all regions of `type` RegionType is preserved
   * Whereas other regions are replaced with whitespaces
   */
  getSingleTypeDocument(type: RegionType): TextDocument;

  /**
   * Get a list of ranges that has `RegionType`
   */
  getLanguageRangesOfType(type: RegionType): LanguageRange[];

  /**
   * Get all language ranges inside document
   */
  getAllLanguageRanges(): LanguageRange[];

  /**
   * Get language for determining
   */
  getLanguageAtPosition(position: Position): LanguageId;

  getImportedScripts(): string[];
}

type RegionType = 'template' | 'script' | 'style' | 'custom';

const defaultLanguageIdForBlockTypes: { [type: string]: string } = {
  template: 'vue-html',
  script: 'javascript',
  style: 'css'
};

export function getVueDocumentRegions(document: TextDocument): VueDocumentRegions {
  const { regions, importedScripts } = parseVueDocumentRegions(document);

  return {
    getSingleLanguageDocument: (languageId: LanguageId) => getSingleLanguageDocument(document, regions, languageId),
    getSingleTypeDocument: (type: RegionType) => getSingleTypeDocument(document, regions, type),

    getLanguageRangesOfType: (type: RegionType) => getLanguageRangesOfType(document, regions, type),

    getAllLanguageRanges: () => getAllLanguageRanges(document, regions),
    getLanguageAtPosition: (position: Position) => getLanguageAtPosition(document, regions, position),
    getImportedScripts: () => importedScripts
  };
}

function getAllLanguageRanges(document: TextDocument, regions: EmbeddedRegion[]): LanguageRange[] {
  return regions.map(r => {
    return {
      languageId: r.languageId,
      start: document.positionAt(r.start),
      end: document.positionAt(r.end)
    };
  });
}

function getLanguageAtPosition(document: TextDocument, regions: EmbeddedRegion[], position: Position): LanguageId {
  const offset = document.offsetAt(position);
  for (const region of regions) {
    if (region.start <= offset) {
      if (offset <= region.end) {
        return region.languageId;
      }
    } else {
      break;
    }
  }
  return 'vue';
}

export function getSingleLanguageDocument(
  document: TextDocument,
  regions: EmbeddedRegion[],
  languageId: LanguageId
): TextDocument {
  const oldContent = document.getText();
  let newContent = oldContent
    .split('\n')
    .map(line => ' '.repeat(line.length))
    .join('\n');

  for (const r of regions) {
    if (r.languageId === languageId) {
      newContent = newContent.slice(0, r.start) + oldContent.slice(r.start, r.end) + newContent.slice(r.end);
    }
  }

  return TextDocument.create(document.uri, languageId, document.version, newContent);
}

export function getSingleTypeDocument(
  document: TextDocument,
  regions: EmbeddedRegion[],
  type: RegionType
): TextDocument {
  const oldContent = document.getText();
  let newContent = oldContent
    .split('\n')
    .map(line => ' '.repeat(line.length))
    .join('\n');

  let langId: string = defaultLanguageIdForBlockTypes[type];

  for (const r of regions) {
    if (r.type === type) {
      newContent = newContent.slice(0, r.start) + oldContent.slice(r.start, r.end) + newContent.slice(r.end);
      langId = r.languageId;
    }
  }

  return TextDocument.create(document.uri, langId, document.version, newContent);
}

export function getLanguageRangesOfType(
  document: TextDocument,
  regions: EmbeddedRegion[],
  type: RegionType
): LanguageRange[] {
  const result = [];

  for (const r of regions) {
    if (r.type === type) {
      result.push({
        start: document.positionAt(r.start),
        end: document.positionAt(r.end),
        languageId: r.languageId
      });
    }
  }

  return result;
}
