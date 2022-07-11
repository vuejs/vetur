/* tslint:disable:max-line-length */
import {
  HTMLTagSpecification,
  IHTMLTagProvider,
  collectTagsDefault,
  collectAttributesDefault,
  collectValuesDefault,
  genAttribute,
  AttributeCollector,
  TagProviderPriority
} from './common';

const routerTags = {
  'router-link': new HTMLTagSpecification(
    'Link to navigate user. The target location is specified with the to prop.\n\n[API Reference](https://router.vuejs.org/api/#router-link)',
    [
      genAttribute(
        'to',
        undefined,
        'The target route of the link. It can be either a string or a location descriptor object.\n\n[API Reference](https://router.vuejs.org/api/#to)'
      ),
      genAttribute(
        'replace',
        undefined,
        'Setting replace prop will call `router.replace()` instead of `router.push()` when clicked, so the navigation will not leave a history record.\n\n[API Reference](https://router.vuejs.org/api/#replace)'
      ),
      genAttribute(
        'append',
        'v',
        'Setting append prop always appends the relative path to the current path. For example, assuming we are navigating from /a to a relative link b, without append we will end up at /b, but with append we will end up at /a/b.\n\n[API Reference](https://router.vuejs.org/api/#append)'
      ),
      genAttribute(
        'tag',
        undefined,
        'Specify which tag to render to, and it will still listen to click events for navigation.\n\n[API Reference](https://router.vuejs.org/api/#tag)'
      ),
      genAttribute(
        'active-class',
        undefined,
        'Configure the active CSS class applied when the link is active.\n\n[API Reference](https://router.vuejs.org/api/#active-class)'
      ),
      genAttribute(
        'exact',
        'v',
        'Force the link into "exact match mode".\n\n[API Reference](https://router.vuejs.org/api/#exact)'
      ),
      genAttribute(
        'event',
        undefined,
        'Specify the event(s) that can trigger the link navigation.\n\n[API Reference](https://router.vuejs.org/api/#event)'
      ),
      genAttribute(
        'exact-active-class',
        undefined,
        'Configure the active CSS class applied when the link is active with exact match.\n\n[API Reference](https://router.vuejs.org/api/#exact-active-class)'
      ),
      genAttribute(
        'aria-current-value',
        'ariaCurrentType',
        'Configure the value of `aria-current` when the link is active with exact match. It must be one of the [allowed values for `aria-current`](https://www.w3.org/TR/wai-aria-1.2/#aria-current) in the ARIA spec. In most cases, the default of `page` should be the best fit.\n\n[API Reference](https://router.vuejs.org/api/#aria-current-value)'
      )
    ]
  ),
  'router-view': new HTMLTagSpecification(
    'A functional component that renders the matched component for the given path. Components rendered in <router-view> can also contain its own <router-view>, which will render components for nested paths.\n\n\n\n[API Reference](https://router.vuejs.org/api/#router-link)',
    [
      genAttribute(
        'name',
        undefined,
        "When a `<router-view>` has a name, it will render the component with the corresponding name in the matched route record's components option.\n\n[API Reference](https://router.vuejs.org/api/#to)"
      )
    ]
  )
};

const valueSets = {
  ariaCurrentType: ['page', 'step', 'location', 'date', 'time']
};

export function getRouterTagProvider(): IHTMLTagProvider {
  return {
    getId: () => 'vue-router',
    priority: TagProviderPriority.Framework,
    collectTags: collector => collectTagsDefault(collector, routerTags),
    collectAttributes: (tag: string, collector: AttributeCollector) => {
      collectAttributesDefault(tag, collector, routerTags, []);
    },
    collectValues: (tag: string, attribute: string, collector: (value: string) => void) => {
      collectValuesDefault(tag, attribute, collector, routerTags, [], valueSets);
    }
  };
}
