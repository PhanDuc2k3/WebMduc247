import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
const files=['AppRouter.tsx','api/catalogApi.ts','api/taxonomyApi.ts','pages/Admin/adminPolicy.ts','pages/Admin/PlatformAdminShell.tsx',
  'pages/Admin/PlatformTaxonomy.tsx','pages/Admin/CategoryEditor.tsx','pages/Admin/AttributeSchemaEditor.tsx','pages/Admin/BrandEditor.tsx','pages/Admin/TaxonomyImports.tsx',
  'pages/MyStore/CatalogProductEditor.tsx','components/MyStore/ProductTaxonomyFields.tsx','pages/Category/CategoryPage.tsx'];
for(const file of files){const path=new URL(`../src/${file}`,import.meta.url);const result=ts.transpileModule(readFileSync(path,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,verbatimModuleSyntax:true}});
  if(result.diagnostics?.some(d=>d.category===ts.DiagnosticCategory.Error))throw Error(`Failed to emit ${file}`);
  writeFileSync(new URL(`../src/${file.replace(/\.tsx?$/,'.js')}`,import.meta.url),result.outputText);
}console.log(`Synced ${files.length} taxonomy JavaScript companions.`);
