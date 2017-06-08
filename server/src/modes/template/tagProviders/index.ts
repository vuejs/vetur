import { IHTMLTagProvider } from './common'
import { getHTML5TagProvider } from './htmlTags'
import { getVueTagProvider } from './vueTags'

export let allTagProviders : IHTMLTagProvider[] = [
  getHTML5TagProvider(),
  getVueTagProvider()
];
