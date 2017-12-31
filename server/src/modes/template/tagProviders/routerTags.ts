/* tslint:disable:max-line-length */
import {
  HTMLTagSpecification,
  IHTMLTagProvider,
  collectTagsDefault,
  collectAttributesDefault,
  collectValuesDefault,
  genAttribute,
  AttributeCollector,
  Priority
} from './common';

const u = undefined;

const routerTags = {
  'router-link': new HTMLTagSpecification('Link to navigate user. The target location is specified with the to prop.', [
    genAttribute('to', u, 'The target route of the link. It can be either a string or a location descriptor object.'),
    genAttribute(
      'replace',
      u,
      'Setting replace prop will call router.replace() instead of router.push() when clicked, so the navigation will not leave a history record.'
    ),
    genAttribute(
      'append',
      u,
      'Setting append prop always appends the relative path to the current path. For example, assuming we are navigating from /a to a relative link b, without append we will end up at /b, but with append we will end up at /a/b.'
    ),
    genAttribute('tag', u, 'Specify which tag to render to, and it will still listen to click events for navigation.'),
    genAttribute('active-class', u, 'Configure the active CSS class applied when the link is active.'),
    genAttribute('exact', u, 'Force the link into "exact match mode".'),
    genAttribute('event', u, 'Specify the event(s) that can trigger the link navigation.'),
    genAttribute(
      'exact-active-class',
      u,
      'Configure the active CSS class applied when the link is active with exact match.'
    )
  ]),
  'router-view': new HTMLTagSpecification(
    'A functional component that renders the matched component for the given path. Components rendered in <router-view> can also contain its own <router-view>, which will render components for nested paths.',
    [
      genAttribute(
        'name',
        u,
        "When a <router-view> has a name, it will render the component with the corresponding name in the matched route record's components option"
      )
    ]
  )
};

export function getRouterTagProvider(): IHTMLTagProvider {
  return {
    getId: () => 'router',
    priority: Priority.Framework,
    collectTags: collector => collectTagsDefault(collector, routerTags),
    collectAttributes: (tag: string, collector: AttributeCollector) => {
      collectAttributesDefault(tag, collector, routerTags, []);
    },
    collectValues: (tag: string, attribute: string, collector: (value: string) => void) => {
      collectValuesDefault(tag, attribute, collector, routerTags, [], {});
    }
  };
}
