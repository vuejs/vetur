import { Node } from '../parser/htmlParser';
import { parse } from 'vue-eslint-parser';

const PARSER_PRE = '<template>';
const PARSER_POS = '</template>';

export function isInsideInterpolation(node: Node, nodeText: string, relativePos: number) {
  // Case {{ }}
  if (node.isInterpolation && relativePos >= '{{'.length && relativePos <= nodeText.length - '}}'.length) {
    return true;
  }

  // Case v-, : or @ directives
  const templateBody = parse(PARSER_PRE + nodeText + PARSER_POS, {}).templateBody;
  if (!templateBody) {
    return false;
  }

  const onlyChild = templateBody.children[0];

  if (!onlyChild || onlyChild.type !== 'VElement') {
    return false;
  }

  if (!onlyChild.startTag || !onlyChild.range) {
    return false;
  }

  if (!isInsideRange(onlyChild.startTag)) {
    return false;
  }

  for (const a of onlyChild.startTag.attributes) {
    if (isInsideRange(a) && a.directive) {
      if (a.value) {
        return isInsideRange(a.value);
      }
    }
  }

  return false;

  function isInsideRange(node: { range: number[] }) {
    const [start, end] = node.range;

    return start - PARSER_PRE.length < relativePos && end - PARSER_PRE.length > relativePos;
  }
}
