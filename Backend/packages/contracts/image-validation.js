import sharp from 'sharp';

export function imageMime(buffer, declared) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 16 || buffer.length > 2 * 1024 * 1024) return null;
  let actual = null;
  if (buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) actual='image/png';
  else if (buffer[0]===0xff && buffer[1]===0xd8 && buffer[2]===0xff &&
    buffer[buffer.length-2]===0xff && buffer[buffer.length-1]===0xd9) actual='image/jpeg';
  else if (buffer.toString('ascii',0,4)==='RIFF' && buffer.toString('ascii',8,12)==='WEBP') actual='image/webp';
  return actual===declared ? actual : null;
}

export async function normalizeImage(buffer,mime){
  const actual=imageMime(buffer,mime);
  if(!actual) return null;
  try{
    const source=sharp(buffer,{failOn:'error',limitInputPixels:24_000_000});
    const metadata=await source.metadata();
    if(metadata.pages>1||metadata.width>6000||metadata.height>6000||
      !{jpeg:'image/jpeg',png:'image/png',webp:'image/webp'}[metadata.format]||
      ({jpeg:'image/jpeg',png:'image/png',webp:'image/webp'})[metadata.format]!==mime) return null;
    return source.rotate().resize(1600,1600,{fit:'inside',withoutEnlargement:true})
      .webp({quality:82}).toBuffer();
  }catch{return null;}
}
