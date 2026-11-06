import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
const files=['api/catalogApi.ts','api/platformAdminApi.ts','api/productModerationApi.ts','pages/Admin/PlatformRecords.tsx',
  'pages/Admin/PlatformProducts.tsx','pages/Admin/ProductWorkspace.tsx','components/MyStore/ProductModerationPanel.tsx',
  'components/ProductDetail/ProductReport.tsx','pages/MyStore/CatalogProductEditor.tsx','pages/Product/DetailProduct.tsx'];
for(const file of files){
  const path=new URL(`../src/${file}`,import.meta.url),output=new URL(`../src/${file.replace(/\.tsx?$/,'.js')}`,import.meta.url);
  const result=ts.transpileModule(readFileSync(path,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,verbatimModuleSyntax:true}});
  if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error(`Failed to emit ${file}`);
  writeFileSync(output,result.outputText);
}
console.log(`Synced ${files.length} product JavaScript companions.`);
