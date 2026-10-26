import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Server } from 'socket.io';
import { io as clientIo } from 'socket.io-client';
import { attachNotificationSockets } from '../src/notification.socket.js';

test('NOTI-05 socket automatically joins only its authenticated user room',async()=>{
  const server=http.createServer((_,res)=>{res.writeHead(404);res.end();});
  const io=new Server(server,{cors:{origin:'http://localhost:5173'},transports:['websocket']});
  attachNotificationSockets(io,async bearer=>{
    if(!['Bearer token-A','Bearer token-B'].includes(bearer))throw new Error('Invalid token');
    return {id:bearer.endsWith('A')?'A':'B'};
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port;
  const a=clientIo(url,{auth:{token:'token-A'},transports:['websocket']});
  const b=clientIo(url,{auth:{token:'token-B'},transports:['websocket']});
  try{
    await Promise.all([a,b].map(socket=>new Promise((resolve,reject)=>{
      socket.once('connect',resolve);socket.once('connect_error',reject);})));
    a.emit('notification:join','notification:user:B');
    assert.equal((await io.in('notification:user:A').fetchSockets()).length,1);
    assert.equal((await io.in('notification:user:B').fetchSockets()).length,1);
    let receivedByB=false;b.on('notification:new',()=>{receivedByB=true;});
    const receivedByA=new Promise(resolve=>a.once('notification:new',resolve));
    io.to('notification:user:A').emit('notification:new',{id:'own'});
    assert.deepEqual(await receivedByA,{id:'own'});
    await new Promise(resolve=>setTimeout(resolve,30));
    assert.equal(receivedByB,false);
  }finally{a.disconnect();b.disconnect();await new Promise(resolve=>io.close(resolve));
    if(server.listening)await new Promise(resolve=>server.close(resolve));}
});
