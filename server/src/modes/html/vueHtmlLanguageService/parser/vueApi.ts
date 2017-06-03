export interface VueDirective {
  label: string;
  documentation: string;
}

export const vueDirectives: VueDirective[] = [
  { label: "v-text", documentation: "Updates the element’s `textContent`." },
  { label: "v-html", documentation: "Updates the element’s `innerHTML`." },
  { label: "v-show", documentation: "Toggle’s the element’s `display` CSS property based on the truthy-ness of the expression value." },
  { label: "v-if", documentation: "Conditionally render the element based on the truthy-ness of the expression value." },
  { label: "v-else", documentation: "Denote the “else block” for `v-if` or a `v-if`/`v-else-if` chain." },
  { label: "v-else-if", documentation: "Denote the “else if block” for `v-if`. Can be chained." },
  { label: "v-for", documentation: "Render the element or template block multiple times based on the source data." },
  { label: "v-on", documentation: "Attaches an event listener to the element." },
  { label: "v-bind", documentation: "Dynamically bind one or more attributes, or a component prop to an expression." },
  { label: "v-model", documentation: "Create a two-way binding on a form input element or a component." },
  { label: "v-pre", documentation: "Skip compilation for this element and all its children." },
  { label: "v-cloak", documentation: "This directive will remain on the element until the associated Vue instance finishes compilation." },
  { label: "v-once", documentation: "Render the element and component once only." },

  { label: "key", documentation: "The `key` special attribute is primarily used as a hint for Vue’s virtual DOM algorithm to identify VNodes when diffing the new list of nodes against the old list." },
  { label: "ref", documentation: "`ref` is used to register a reference to an element or a child component." },
  { label: "slot", documentation: "Used on content inserted into child components to indicate which named slot the content belongs to." }
];
