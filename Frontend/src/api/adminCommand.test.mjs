import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {stripTypeScriptTypes} from 'node:module';
const source=stripTypeScriptTypes(await readFile(new URL('./adminCommand.ts',import.meta.url),'utf8'));
const {adminRequestId}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
test('admin commands keep a key after an uncertain response and replace it when payload or version changes',()=>{
  const attempt={signature:'',requestId:''},input={id:'target',version:2,reason:'A reviewed reason'};
  const first=adminRequestId(attempt,input);
  assert.equal(adminRequestId(attempt,{...input}),first);
  assert.notEqual(adminRequestId(attempt,{...input,version:3}),first);
  const previous=attempt.requestId;
  assert.notEqual(adminRequestId(attempt,{...input,reason:'A different reason'}),previous);
  assert.notEqual(adminRequestId({signature:'',requestId:''},input),first);
});
