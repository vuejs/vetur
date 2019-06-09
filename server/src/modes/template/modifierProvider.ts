// tslint:disable: max-line-length
import { MarkupContent } from 'vscode-languageserver-types';

export interface Modifier {
  label: string;
  documentation?: string | MarkupContent;
}

function genModifier(label: string, documentation?: string | MarkupContent) {
  return { label, documentation };
}

const eventModifiers = [
  genModifier('stop', 'The event propagation will be stopped.'),
  genModifier('prevent', 'The event will no longer default action.'),
  genModifier('capture', 'Use capture mode when adding the event listener.'),
  genModifier('self', 'Only trigger handler if event.target is the element itself.'),
  genModifier('once', 'The event will be triggered at most once.'),
  genModifier(
    'passive',
    "The scroll event's default behavior (scrolling) will happen immediately, instead of waiting for `onScroll` to complete."
  ),
  genModifier(
    'native',
    'There may be times when you want to listen directly to a native event on the root element of a component. In these cases, you can use the `.native` modifier for `v-on`'
  )
];

const keyModifiers = [
  genModifier('enter'),
  genModifier('tab'),
  genModifier('delete', 'captures both “Delete” and “Backspace” keys'),
  genModifier('esc'),
  genModifier('space'),
  genModifier('up'),
  genModifier('down'),
  genModifier('left'),
  genModifier('right')
];

const mouseModifiers = [genModifier('left'), genModifier('right'), genModifier('middle')];

const systemModifiers = [
  genModifier('ctrl'),
  genModifier('alt'),
  genModifier('shift'),
  genModifier('meta'),
  genModifier(
    'exact',
    'The `.exact` modifier allows control of the exact combination of system modifiers needed to trigger an event.'
  )
];

const propsModifiers = [genModifier('sync')];

const vModelModifiers = [
  genModifier(
    'lazy',
    'By default, `v-model` syncs the input with the data after each input event. You can add the `lazy` modifier to instead sync after change events'
  ),
  genModifier(
    'number',
    'If you want user input to be automatically typecast as a number, you can add the `number` modifier to your `v-model` managed inputs.'
  ),
  genModifier(
    'trim',
    'If you want whitespace from user input to be trimmed automatically, you can add the `trim` modifier to your `v-model`-managed inputs.'
  )
];

export function getModifierProvider() {
  return {
    eventModifiers: {
      items: eventModifiers,
      priority: 1
    },
    keyModifiers: {
      items: keyModifiers,
      priority: 2
    },
    mouseModifiers: {
      items: mouseModifiers,
      priority: 2
    },
    systemModifiers: {
      items: systemModifiers,
      priority: 3
    },
    propsModifiers: {
      items: propsModifiers,
      priority: 1
    },
    vModelModifiers: {
      items: vModelModifiers,
      priority: 1
    }
  };
}
