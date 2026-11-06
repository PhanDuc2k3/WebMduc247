import {createServer} from '../node_modules/vite/dist/node/index.js';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
export async function fixtureBrowser(entry,verify){
  const root=fileURLToPath(new URL('../../',import.meta.url)),frontend=join(root,'Frontend');
  const reserve=http.createServer();await new Promise(done=>reserve.listen(0,'127.0.0.1',done));const port=reserve.address().port;await new Promise(done=>reserve.close(done));
  const vite=await createServer({root:frontend,configFile:join(frontend,'vite.config.ts'),server:{host:'127.0.0.1',port,open:false},plugins:[{
    name:'basic-admin-fixture',enforce:'pre',resolveId(id){if(id==='/__basic-entry.js')return id;},load(id){if(id==='/__basic-entry.js')return entry;},
    configureServer(server){server.middlewares.use('/__basic-test',(_req,res)=>{res.setHeader('Content-Type','text/html');res.end('<html><meta name="viewport" content="width=device-width,initial-scale=1"><body><div id="root"></div><script type="module" src="/__basic-entry.js"></script></body></html>');});}}]});
  await vite.listen();const origin='http://127.0.0.1:'+vite.httpServer.address().port,profile=join(root,'.tmp/basic-admin-edge-'+Date.now());mkdirSync(profile,{recursive:true});
  const edge=spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',['--headless=new','--no-sandbox','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:'ignore'});
  const sleep=ms=>new Promise(done=>setTimeout(done,ms));let socket,call;
  try{
    const portFile=join(profile,'DevToolsActivePort'),deadline=Date.now()+25000;
    while(!existsSync(portFile)){if(Date.now()>deadline)throw Error('Browser did not start');await sleep(100);}
    const port=Number(readFileSync(portFile,'utf8').split('\n')[0]),targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
    socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise((done,reject)=>{socket.addEventListener('open',done,{once:true});socket.addEventListener('error',reject,{once:true});});
    let sequence=0;const pending=new Map(),errors=[];
    socket.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id&&pending.has(m.id)){const p=pending.get(m.id);clearTimeout(p.timer);pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.done(m.result);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.exception?.description||m.params.exceptionDetails.text);});
    call=(method,params={})=>new Promise((done,reject)=>{const id=++sequence,timer=setTimeout(()=>reject(Error('Timed out: '+method)),20000);pending.set(id,{done,reject,timer});socket.send(JSON.stringify({id,method,params}));});
    const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
    const wait=async(expression,label)=>{const until=Date.now()+20000;while(Date.now()<until){if(await evaluate('Boolean('+expression+')'))return;await sleep(80);}throw Error('UI not ready: '+label+'; '+JSON.stringify(errors));};
    const click=async text=>evaluate(`(()=>{const el=[...document.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(text)});if(!el)throw Error('Missing button '+${JSON.stringify(text)});el.click();})()`);
    const input=async(selector,value)=>{await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});const type=el.tagName==='TEXTAREA'?HTMLTextAreaElement:el.tagName==='SELECT'?HTMLSelectElement:HTMLInputElement;Object.getOwnPropertyDescriptor(type.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));})()`);await sleep(100);};
    const viewport=async mobile=>call('Emulation.setDeviceMetricsOverride',{width:mobile?390:1440,height:mobile?844:1000,deviceScaleFactor:1,mobile});
    const screenshot=async name=>{const data=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(join(root,'.tmp/'+name),Buffer.from(data.data,'base64'));};
    await call('Page.enable');await call('Runtime.enable');await viewport(false);await call('Page.navigate',{url:origin+'/__basic-test'});
    await verify({call,evaluate,wait,click,input,viewport,screenshot,errors});
  }finally{if(call)await call('Browser.close').catch(()=>{});socket?.close();edge.kill();await vite.close();}
}
