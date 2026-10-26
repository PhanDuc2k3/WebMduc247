export function attachNotificationSockets(io,identity){
  io.use(async(socket,next)=>{
    try{const token=socket.handshake.auth?.token;
      if(typeof token!=='string'||!token||token.length>4096)throw new Error('Missing token');
      const bearer='Bearer '+token,user=await identity(bearer);
      socket.data.userId=user.id;socket.data.bearer=bearer;next();
    }catch{next(new Error('UNAUTHORIZED'));}
  });
  io.on('connection',socket=>socket.join('notification:user:'+socket.data.userId));
}
