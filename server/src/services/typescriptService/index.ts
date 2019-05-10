import { DependencyService, T_TypeScript, State } from '../dependencyService';
import { LanguageServiceHost } from 'typescript';

export class TypescriptService {
  private tsModule: T_TypeScript;
  private tsLanguageServiceHost: LanguageServiceHost;

  constructor(dependencyService: DependencyService) {
    const tsDependency = dependencyService.getDependency('typescript');
    if (tsDependency && tsDependency.state === State.Loaded) {
      this.tsModule = tsDependency.module;
    } else {
      throw Error('Failed to load TypeScript module');
    }
  }
}
