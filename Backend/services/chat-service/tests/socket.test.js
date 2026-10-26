import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Server } from 'socket.io';
import { io as clientIo } from 'socket.io-client';
import mongoose from 'mongoose';
import { ChatService,ChatError } from '../src/service.js';
import { attachSockets,createHandler } from '../src/server.js';

test('AC-11-01 guessed room and history are denied over Socket.IO and HTTP',async()=>{
  const id=new mongoose.Types.ObjectId(),storeId='11111111-1111-4111-8111-111111111111';
  const conversation={_id:id,buyerId:'buyer',storeId,status:'ACTIVE'};
  const chat=new ChatService({get:async()=>conversation},{catalogUrl:'http://localhost:5102'});
  chat.identity=async bearer=>({id:bearer==='Bearer buyer-token'?'buyer':'outsider'});
  chat.member=async()=>{throw new ChatError(403,'FORBIDDEN','No shop membership');};
  let dispatch=()=>{};
  const server=http.createServer((req,res)=>dispatch(req,res));
  const io=new Server(server,{cors:{origin:'http://localhost:5173'},transports:['websocket']});
  const attachments={direct:async()=>{throw new Error('unused');}};
  const handlers=createHandler(chat,attachments,io);dispatch=handlers.handler;
  attachSockets(io,chat,handlers.deliver);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const outsider=clientIo(base,{auth:{token:'outsider-token'},transports:['websocket']});
  const buyer=clientIo(base,{auth:{token:'buyer-token'},transports:['websocket']});
  try{
    await Promise.all([outsider,buyer].map(socket=>new Promise((resolve,reject)=>{
      socket.once('connect',resolve);socket.once('connect_error',reject); })));
    const denied=await new Promise(resolve=>outsider.emit('chat:join',String(id),resolve));
    assert.equal(denied.ok,false);assert.equal(denied.code,'FORBIDDEN');
    assert.equal((await io.in('conversation:'+id).fetchSockets()).length,0);
    const joined=await new Promise(resolve=>buyer.emit('chat:join',String(id),resolve));
    assert.equal(joined.ok,true);
    assert.equal((await io.in('conversation:'+id).fetchSockets()).length,1);
    const history=await fetch(base+'/api/v2/conversations/'+id+'/messages',{
      headers:{Authorization:'Bearer outsider-token'}});
    assert.equal(history.status,403);
  }finally{outsider.disconnect();buyer.disconnect();await new Promise(resolve=>io.close(resolve));
    if(server.listening)await new Promise(resolve=>server.close(resolve));}
});
