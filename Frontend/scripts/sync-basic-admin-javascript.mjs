import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
const files=['AppRouter.tsx','api/adminOperationsApi.ts','pages/Admin/PlatformOperations.tsx','pages/Admin/adminPolicy.ts','pages/Admin/PlatformAdminShell.tsx','pages/Admin/PlatformRecords.tsx','pages/Admin/UserWorkflows.tsx','pages/Admin/PlatformWorkQueue.tsx','pages/Admin/AdminSetup.tsx'];
for(const file of files){const source=new URL('../src/'+file,import.meta.url);const result=ts.transpileModule(readFileSync(source,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,verbatimModuleSyntax:true}});
  if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error('Cannot emit '+file);
  writeFileSync(new URL('../src/'+file.replace(/\.tsx?$/,'.js'),import.meta.url),result.outputText);
}console.log('Synced basic admin JavaScript companions.');
