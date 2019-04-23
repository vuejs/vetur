import { isInsideInterpolation } from '../services/isInsideInterpolation';
import { Node } from '../parser/htmlParser';
import * as assert from 'assert';

suite('isInsideInterpolation', () => {
  test('{{ }}', () => {
    const nodeText = '{{ }}';

    assert.ok(!isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 0));
    assert.ok(!isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 1));

    assert.ok(isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 2));
    assert.ok(isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 3));

    assert.ok(!isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 4));
    assert.ok(!isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 5));
  });

  test('{{ f }}', () => {
    const nodeText = '{{ f }}';

    assert.ok(!isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 0));
    assert.ok(!isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 1));

    assert.ok(isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 2));
    assert.ok(isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 3));
    assert.ok(isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 4));
    assert.ok(isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 5));

    assert.ok(!isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 6));
    assert.ok(!isInsideInterpolation({ isInterpolation: true } as Node, nodeText, 7));
  });

  test('v-if=""', () => {
    const nodeText = '<div v-if=""></div>';
    const arr = [...Array(nodeText.length).keys()];

    assert.ok(isInsideInterpolation({ isInterpolation: false } as Node, nodeText, 11));

    for (const i of arr) {
      if(i !== 11) {
        assert.ok(!isInsideInterpolation({ isInterpolation: false } as Node, nodeText, i));
      }
    }
  });

  test('v-if="x"', () => {
    const nodeText = '<div v-if="x"></div>';
    const arr = [...Array(nodeText.length).keys()];

    assert.ok(isInsideInterpolation({ isInterpolation: false } as Node, nodeText, 11));
    assert.ok(isInsideInterpolation({ isInterpolation: false } as Node, nodeText, 12));

    for (const i of arr) {
      if(i !== 11 && i !== 12) {
        assert.ok(!isInsideInterpolation({ isInterpolation: false } as Node, nodeText, i));
      }
    }
  });

  test(':foo=""', () => {
    const nodeText = '<div :foo=""></div>';
    const arr = [...Array(nodeText.length).keys()];

    assert.ok(isInsideInterpolation({ isInterpolation: false } as Node, nodeText, 11));

    for (const i of arr) {
      if(i !== 11) {
        assert.ok(!isInsideInterpolation({ isInterpolation: false } as Node, nodeText, i));
      }
    }
  });

  test(':foo="x"', () => {
    const nodeText = '<div :foo="x"></div>';
    const arr = [...Array(nodeText.length).keys()];

    assert.ok(isInsideInterpolation({ isInterpolation: false } as Node, nodeText, 11));
    assert.ok(isInsideInterpolation({ isInterpolation: false } as Node, nodeText, 12));

    for (const i of arr) {
      if(i !== 11 && i !== 12) {
        assert.ok(!isInsideInterpolation({ isInterpolation: false } as Node, nodeText, i));
      }
    }
  });

  test('@foo=""', () => {
    const nodeText = '<div @foo=""></div>';
    const arr = [...Array(nodeText.length).keys()];

    assert.ok(isInsideInterpolation({ isInterpolation: false } as Node, nodeText, 11));

    for (const i of arr) {
      if(i !== 11) {
        assert.ok(!isInsideInterpolation({ isInterpolation: false } as Node, nodeText, i));
      }
    }
  });

  test('@foo="x"', () => {
    const nodeText = '<div @foo="x"></div>';
    const arr = [...Array(nodeText.length).keys()];

    assert.ok(isInsideInterpolation({ isInterpolation: false } as Node, nodeText, 11));
    assert.ok(isInsideInterpolation({ isInterpolation: false } as Node, nodeText, 12));

    for (const i of arr) {
      if(i !== 11 && i !== 12) {
        assert.ok(!isInsideInterpolation({ isInterpolation: false } as Node, nodeText, i));
      }
    }
  });

});
