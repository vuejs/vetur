import { TextDocument } from 'vscode-languageserver';
import { getFileFsPath } from '../utils/paths';
import { Definition, CompletionItemKind } from 'vscode-languageserver-types';
import { LanguageModes } from '../embeddedSupport/languageModes';

/**
 * State associated with a specific Vue file
 * The state is shared between different modes
 */
export interface VueFileInfo {
  /**
   * The defualt export component info from script section
   */
  componentInfo: ComponentInfo;
}

export interface ComponentInfo {
  name?: string;
  definition?: Definition;

  childComponents?: ChildComponent[];

  /**
   * Todo: Extract type info in cases like
   * props: {
   *   foo: String
   * }
   */
  props?: PropInfo[];
  data?: DataInfo[];
  computed?: ComputedInfo[];
  methods?: MethodInfo[];
}

export interface ChildComponent {
  name: string;
  documentation?: string;
  definition?: {
    path: string;
    start: number;
    end: number;
  };
  info?: VueFileInfo;
}

export interface MemberInfo {
  name: string;
  documentation?: string;

  members?: DataInfo[];
  kind?: CompletionItemKind;
}

export interface PropInfo extends MemberInfo {}
export interface DataInfo extends MemberInfo {}
export interface ComputedInfo extends MemberInfo {}
export interface MethodInfo extends MemberInfo {}

export class VueInfoService {
  private languageModes: LanguageModes;
  private vueFileInfo: Map<string, VueFileInfo> = new Map();

  constructor() {}

  init(languageModes: LanguageModes) {
    this.languageModes = languageModes;
  }

  updateInfo(doc: TextDocument, info: VueFileInfo) {
    this.vueFileInfo.set(getFileFsPath(doc.uri), info);
  }

  getInfo(doc: TextDocument) {
    this.languageModes.getAllLanguageModeRangesInDocument(doc).forEach(m => {
      if (m.mode.updateFileInfo) {
        m.mode.updateFileInfo(doc);
      }
    });
    return this.vueFileInfo.get(getFileFsPath(doc.uri));
  }
}
