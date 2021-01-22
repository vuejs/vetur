import { getDocUri } from '../../path';
import { testDiagnostics, testNoDiagnostics } from '../../../diagnosticHelper';
import { sameLineRange } from '../../../util';
import { DiagnosticSeverity } from 'vscode';

describe('Should find emit type valiation errors', () => {
  const rightUri = getDocUri('diagnostics/emitTypeValidation/ParentRight.vue');
  const wrongUri = getDocUri('diagnostics/emitTypeValidation/ParentWrong.vue');

  it('Shows no error for correct types', async () => {
    await testNoDiagnostics(rightUri);
  });

  it('Shows errors for incorrect types', async () => {
    await testDiagnostics(wrongUri, [
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '($event: any) => (p: number) => void' is not assignable to type '($event: any) => () => any'.\n  Type '(p: number) => void' is not assignable to type '() => any'.",
        range: sameLineRange(1, 28, 31),
        source: 'Vetur'
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '($event: any) => (a: boolean, b: string) => void' is not assignable to type '($event: any) => (a: any) => any'.\n  Type '(a: boolean, b: string) => void' is not assignable to type '(a: any) => any'.",
        range: sameLineRange(1, 41, 44),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '($event: any) => (a: boolean, b: string[], c: number) => void' is not assignable to type '($event: any) => (a: any, b: any) => any'.\n  Type '(a: boolean, b: string[], c: number) => void' is not assignable to type '(a: any, b: any) => any'.",
        range: sameLineRange(1, 54, 57),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '($event: any) => (...args: never[]) => void' is not assignable to type '($event: any) => (a: any, ...args: any) => any'.\n  Type '(...args: never[]) => void' is not assignable to type '(a: any, ...args: any) => any'.\n    Types of parameters 'args' and 'a' are incompatible.\n      Type 'any' is not assignable to type 'never'.",
        range: sameLineRange(1, 67, 71),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '($event: any) => (p: number) => void' is not assignable to type '($event: any) => () => any'.\n  Type '(p: number) => void' is not assignable to type '() => any'.",
        range: sameLineRange(2, 28, 31),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '($event: any) => (a: boolean, b: string) => void' is not assignable to type '($event: any) => (a: string) => any'.\n  Type '(a: boolean, b: string) => void' is not assignable to type '(a: string) => any'.",
        range: sameLineRange(2, 41, 44),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '($event: any) => (a: boolean, b: string[], c: number) => void' is not assignable to type '($event: any) => (a: boolean, b: string[]) => any'.\n  Type '(a: boolean, b: string[], c: number) => void' is not assignable to type '(a: boolean, b: string[]) => any'.",
        range: sameLineRange(2, 54, 57),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '($event: any) => (...args: never[]) => void' is not assignable to type '($event: any) => (a: string, ...args: number[]) => any'.\n  Type '(...args: never[]) => void' is not assignable to type '(a: string, ...args: number[]) => any'.\n    Types of parameters 'args' and 'a' are incompatible.\n      Type 'string' is not assignable to type 'never'.",
        range: sameLineRange(2, 67, 71),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '($event: any) => (a: number) => void' is not assignable to type '($event: any) => (arg: number | boolean) => any'.\n  Type '(a: number) => void' is not assignable to type '(arg: number | boolean) => any'.\n    Types of parameters 'a' and 'arg' are incompatible.\n      Type 'number | boolean' is not assignable to type 'number'.\n        Type 'boolean' is not assignable to type 'number'.",
        range: sameLineRange(3, 19, 22),
        source: 'Vetur',
        code: 2322
      },
      {
        severity: DiagnosticSeverity.Error,
        message:
          "Type '($event: any) => (a: number) => void' is not assignable to type '($event: any) => (arg: number | undefined) => any'.\n  Type '(a: number) => void' is not assignable to type '(arg: number | undefined) => any'.\n    Types of parameters 'a' and 'arg' are incompatible.\n      Type 'number | undefined' is not assignable to type 'number'.\n        Type 'undefined' is not assignable to type 'number'.",
        range: sameLineRange(3, 32, 35),
        source: 'Vetur',
        code: 2322
      }
    ]);
  });
});
