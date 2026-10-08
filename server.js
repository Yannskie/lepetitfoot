const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'public');
try{for(const line of fs.readFileSync(path.join(__dirname,'.env'),'utf8').split(/\r?\n/)){const m=line.match(/^([A-Z_]+)=(.*)$/);if(m&&!process.env[m[1]])process.env[m[1]]=m[2].trim()}}catch{}
const apiKey=process.env.DEEPGRAM_API_KEY||'';
const types={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.svg':'image/svg+xml','.webmanifest':'application/manifest+json'};
const reply=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
async function body(req){const parts=[];let n=0;for await(const b of req){n+=b.length;if(n>8000000)throw Error('Audio too large');parts.push(b)}return Buffer.concat(parts)}
http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/api/health')return reply(res,200,{ok:true,deepgramConfigured:!!apiKey});
  if(url.pathname.startsWith('/api/')){
    if(!apiKey)return reply(res,503,{error:'Deepgram API key missing on server'});
    try{
      if(req.method==='GET'&&url.pathname==='/api/tts'){
        const phrase=url.searchParams.get('text')||'';
        if(!phrase||phrase.length>160)return reply(res,400,{error:'Invalid text'});
        const voice=url.searchParams.get('voice')==='hector'?'aura-2-hector-fr':'aura-2-agathe-fr';
        const dg=await fetch('https://api.deepgram.com/v1/speak?model='+voice+'&encoding=mp3',{method:'POST',headers:{Authorization:'Token '+apiKey,'Content-Type':'application/json'},body:JSON.stringify({text:phrase})});
        if(!dg.ok)return reply(res,502,{error:'Deepgram voice error',detail:(await dg.text()).slice(0,300)});
        res.writeHead(200,{'Content-Type':'audio/mpeg','Cache-Control':'private,max-age=3600'});return res.end(Buffer.from(await dg.arrayBuffer()));
      }
      if(req.method==='POST'&&url.pathname==='/api/stt'){
        const audio=await body(req);
        if(!audio.length)return reply(res,400,{error:'No audio'});
        const type=(req.headers['content-type']||'audio/webm').split(';')[0];
        const dg=await fetch('https://api.deepgram.com/v1/listen?model=nova-3&language=fr&smart_format=true',{method:'POST',headers:{Authorization:'Token '+apiKey,'Content-Type':type},body:audio});
        if(!dg.ok)return reply(res,502,{error:'Deepgram transcription error',detail:(await dg.text()).slice(0,300)});
        const data=await dg.json(),alt=data?.results?.channels?.[0]?.alternatives?.[0]||{};
        return reply(res,200,{transcript:alt.transcript||'',confidence:alt.confidence||0});
      }
    }catch(err){return reply(res,502,{error:err.message})}
    return reply(res,404,{error:'Unknown endpoint'});
  }
  let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{return reply(res,400,{error:'Bad path'})}
  const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep))return reply(res,403,{error:'Forbidden'});
  fs.readFile(file,(err,buf)=>{if(err)return reply(res,404,{error:'Not found'});res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(buf)});
}).listen(Number(process.env.PORT||5173),()=>console.log('Petit Foot: http://localhost:'+(process.env.PORT||5173)+'; Deepgram configured: '+!!apiKey));
