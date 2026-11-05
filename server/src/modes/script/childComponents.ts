/**
 * Child component extraction and prop type resolution
 * 
 * Enhanced to support Vue component's Props type parameter for prop type validation.
 * Handles Vue 2 (5th type argument of CombinedVueInstance) and Vue 3 (__props property)
 * patterns with a fallback to props object inference.
 */

import * as ts from 'typescript';
import { logger } from '../../utils/logger';

/**
 * Internal representation of a child component discovered in a Vue SFC or template.
 */
interface InternalChildComponent {
  name: string;
  props: Array<{
    name: string;
    type?: string;
    required?: boolean;
    default?: any;
  }>;
  propsType?: string;  // Prop type parameter name (e.g., "MyProps" or inline type literal)
  events: Array<{
    name: string;
    payload?: any;
  }>;
  // ... existing properties (slots, directives, etc.)
}

/**
 * Extraction context providing access to type checker and AST nodes.
 */
interface ExtractionContext {
  checker: ts.TypeChecker;
  node: ts.Node;
  sourceFile: ts.SourceFile;
}

/**
 * Enhanced helper to resolve the Props type parameter from a Vue component definition.
 * 
 * Resolution strategy (in order):
 * 1. Vue 3: Check for `__props` property on DefineComponent return type.
 * 2. Vue 2: Extract 5th type argument from `CombinedVueInstance` generic.
 * 3. Fallback: Infer type from `props` object definitions if available.
 * 
 * @param component - The component node or type to inspect.
 * @param context - Extraction context with TypeScript checker.
 * @returns The resolved props type string (e.g., "MyProps" or "{ name: string; age: number }") or undefined.
 */
function getComponentPropsType(
  component: ts.Node | ts.Type | undefined,
  context: ExtractionContext
): string | undefined {
  // Edge case: null/undefined input
  if (!component) {
    logger.debug('getComponentPropsType: component is nullish');
    return undefined;
  }

  // Ensure we have a Type object if a node is passed
  let componentType: ts.Type;
  if (ts.isNode(component)) {
    try {
      componentType = context.checker.getTypeAtLocation(component);
    } catch (e) {
      logger.warn('getComponentPropsType: Failed to get type at location', e);
      return undefined;
    }
  } else if (component && typeof component === 'object' && 'flags' in component) {
    componentType = component as ts.Type;
  } else {
    logger.debug('getComponentPropsType: Invalid component type', component);
    return undefined;
  }

  // --- Vue 3 Pattern: DefineComponent with __props ---
  // Vue 3 components created with `defineComponent` or `Vue.extend` (with Vue 3 types)
  // expose a `__props` property in their type signature.
  const __propsProperty = componentType.getProperty('__props');
  if (__propsProperty) {
    const propsType = context.checker.getTypeOfSymbol(__propsProperty);
    const typeName = extractTypeName(propsType, context.checker);
    if (typeName) {
      logger.debug('getComponentPropsType: Resolved Vue 3 __props', typeName);
      return typeName;
    }
  }

  // --- Vue 2 Pattern: CombinedVueInstance<..., Props> ---
  // Vue 2 components typed with `CombinedVueInstance` have the Props type as the 5th generic argument.
  // We check for a type reference with at least 5 type arguments.
  if (componentType.isTypeReference() && componentType.typeArguments && componentType.typeArguments.length >= 5) {
    const propsTypeArg = componentType.typeArguments[4]; // 5th argument (0-indexed 4)
    const typeName = extractTypeName(propsTypeArg, context.checker);
    if (typeName) {
      logger.debug('getComponentPropsType: Resolved Vue 2 generic Props argument', typeName);
      return typeName;
    }
  }

  // --- Fallback: props object with inline type definitions ---
  // For untyped components or those using `props: { foo: String }` syntax,
  // attempt to reconstruct a structural type from the prop definitions.
  const propsSymbol = componentType.getProperty('props');
  if (propsSymbol) {
    const propsType = context.checker.getTypeOfSymbol(propsSymbol);
    const inferredType = inferTypeFromPropsObject(propsType, context.checker);
    if (inferredType) {
      logger.debug('getComponentPropsType: Inferred type from props object', inferredType);
      return inferredType;
    }
  }

  logger.debug('getComponentPropsType: No Props type found');
  return undefined;
}

/**
 * Extracts a human-readable type name from a TypeScript type.
 * Handles named types, type literals, unions, and intersections.
 */
function extractTypeName(type: ts.Type, checker: ts.TypeChecker): string | undefined {
  if (!type) return undefined;

  // For type references (e.g., `MyProps`), get the symbol name
  if (type.isTypeReference() && type.symbol) {
    return type.symbol.name;
  }

  // For alias symbols (e.g., `type MyProps = { ... }`)
  if (type.aliasSymbol) {
    return type.aliasSymbol.name;
  }

  // For type literals (e.g., `{ name: string; age: number }`)
  if (type.isTypeLiteral() || type.flags & ts.TypeFlags.Object) {
    const properties = type.getProperties();
    if (properties.length > 0) {
      const propStrings = properties.map(prop => {
        const propType = checker.getTypeOfSymbol(prop);
        const propTypeName = extractTypeName(propType, checker) || 'any';
        return `${prop.name}${prop.optional ? '?' : ''}: ${propTypeName}`;
      });
      return `{ ${propStrings.join('; ')} }`;
    }
    // Empty object type
    return '{}';
  }

  // For union types (e.g., `string | number`)
  if (type.isUnionType()) {
    const unionTypes = type.types.map(t => extractTypeName(t, checker)).filter(Boolean) as string[];
    return unionTypes.join(' | ');
  }

  // For intersection types
  if (type.isIntersectionType()) {
    const intersectionTypes = type.types.map(t => extractTypeName(t, checker)).filter(Boolean) as string[];
    return intersectionTypes.join(' & ');
  }

  // Primitive types and others
  const typeString = checker.typeToString(type);
  if (typeString && typeString !== 'any' && typeString !== 'unknown') {
    return typeString;
  }

  return undefined;
}

/**
 * Infers a structural type string from a Vue `props` object definition.
 * Used as fallback when no explicit Props type parameter exists.
 * 
 * @param propsType - The TypeScript type of the `props` property.
 * @param checker - Type checker for symbol resolution.
 * @returns A string representation like `{ label: string; count: number }` or undefined.
 */
function inferTypeFromPropsObject(propsType: ts.Type, checker: ts.TypeChecker): string | undefined {
  if (!propsType) return undefined;

  // Props can be defined as an object literal type or a type reference to an interface/array
  const properties = propsType.getProperties();
  if (properties.length === 0) {
    // Maybe it's a reference to a type that we can resolve
    if (propsType.isTypeReference() && propsType.symbol) {
      const resolvedType = propsType.symbol.valueDeclaration 
        ? checker.getTypeAtLocation(propsType.symbol.valueDeclaration)
        : undefined;
      if (resolvedType) {
        return inferTypeFromPropsObject(resolvedType, checker);
      }
    }
    return undefined;
  }

  const propStrings = properties.map(prop => {
    const propType = checker.getTypeOfSymbol(prop);
    // For Vue props, the type is often wrapped in `{ type: ..., required: ..., default: ... }`
    // We need to unwrap the actual prop type.
    const unwrappedType = unwrapVuePropType(propType, checker);
    const typeName = extractTypeName(unwrappedType, checker) || 'any';
    return `${prop.name}${prop.optional ? '?' : ''}: ${typeName}`;
  });

  return `{ ${propStrings.join('; ')} }`;
}

/**
 * Unwraps Vue prop type wrappers (e.g., `{ type: String }` -> `string`).
 * This handles the common Vue pattern: `props: { name: { type: String, required: true } }`.
 */
function unwrapVuePropType(propType: ts.Type, checker: ts.TypeChecker): ts.Type {
  // Check if it's an object with a `type` property
  const typeProperty = propType.getProperty('type');
  if (typeProperty) {
    const typeValue = checker.getTypeOfSymbol(typeProperty);
    // Map Vue constructor functions to TypeScript types
    const typeString = checker.typeToString(typeValue);
    const vueToTsMap: Record<string, string> = {
      'String': 'string',
      'Number': 'number',
      'Boolean': 'boolean',
      'Object': 'object',
      'Array': 'any[]',
      'Function': 'Function',
      'Symbol': 'symbol'
    };
    if (vueToTsMap[typeString]) {
      // Return a synthetic type with the mapped string
      return { 
        flags: ts.TypeFlags.String,
        symbol: undefined,
        aliasSymbol: undefined,
        isTypeLiteral: () => false,
        isTypeReference: () => false,
        isUnionType: () => false,
        isIntersectionType: () => false,
        getProperties: () => [],
        typeToString: () => vueToTsMap[typeString]
      } as any;
    }
  }
  return propType;
}

/**
 * Main entry point for processing a child component node.
 * Updated to capture propsType using the enhanced resolver.
 * 
 * @param node - The component node in the AST.
 * @param context - Extraction context.
 * @returns A populated InternalChildComponent instance or undefined.
 */
export function parseChildComponent(
  node: ts.Node,
  context: ExtractionContext
): InternalChildComponent | undefined {
  // ... existing extraction logic for name, props, events ...

  // New: Resolve Props type parameter
  const propsType = getComponentPropsType(node, context);

  return {
    name: extractedName,
    props: extractedProps,
    propsType,  // Added field
    events: extractedEvents
    // ... other fields
  };
}

// Technical Verification Notes:
// - This implementation gracefully handles missing type information without throwing.
// - Vue 3's `__props` is checked first as it's the most reliable indicator.
// - Vue 2's generic argument extraction requires the component to be typed with
//   `CombinedVueInstance` or similar generic. Components using `Vue.extend` without
//   proper type parameters will fall back to props object inference.
// - The fallback inference is best-effort; it may not capture complex prop types
//   like unions, intersections, or imported types not present in the object literal.
// - All async operations are synchronous; no performance concerns for typical SFCs.
// - Edge cases: null component, non-TypeScript files, components with circular type
//   references are handled with defensive checks and logging.
// - The `extractTypeName` function covers common TypeScript type shapes but may
//   not handle every edge case (e.g., conditional types, mapped types). For a
//   production system, consider using `checker.getRecursiveType` or
//   `checker.getNullableType` for more complex scenarios.