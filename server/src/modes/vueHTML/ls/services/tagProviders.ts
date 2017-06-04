import { getHTML5TagProvider, getVueTagProvider, IHTMLTagProvider } from '../parser/htmlTags';

export const allTagProviders: IHTMLTagProvider[] = [getHTML5TagProvider(), getVueTagProvider()];
