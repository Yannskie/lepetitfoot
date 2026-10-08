(() => {
'use strict';
const words=[
  {fr:'un ballon',no:'en ball',icon:'⚽'},
  {fr:'rouge',no:'rød',icon:'🔴'},
  {fr:'bleu',no:'blå',icon:'🔵'},
  {fr:'un but',no:'et mål',icon:'🥅'},
  {fr:'un joueur',no:'en spiller',icon:'🏃'},
  {fr:'un ballon rouge',no:'en rød ball',icon:'⚽'}
];
const el=id=>document.getElementById(id);
const ui={
  art:el('art'),eyebrow:el('eyebrow'),fr:el('french'),no:el('translation'),
  start:el('startButton'),replay:el('replayButton'),pause:el('pauseButton'),
  stop:el('stopButton'),controls:el('sessionControls'),listen:el('listenState'),
  meter:el('soundMeter'),listenLabel:el('listenLabel'),feedback:el('feedback'),
  title:el('feedbackTitle'),meta:el('feedbackMeta'),voice:el('voiceSelect'),
  debug:el('debug'),debugText:el('debugText')
};
const debug=new URLSearchParams(location.search).get('debug')==='1';
ui.debug.hidden=!debug;
let xp=window.PetitCards?.getXP()||0,balls=0,index=0,correctAnswers=0;
let state='idle',epoch=0,stream=null,ctx=null,analyser=null,recorder=null;
let chunks=[],raf=0,audio=null,listenTimer=null,advanceTimer=null,recognition=null;
const sounds=new Map();
const isActive=()=>state==='playing'||state==='listening'||state==='checking'||state==='feedback';
function progress(){
  window.PetitCards?.setXP(xp);
  el('streakValue').textContent=window.PetitCards?.getStreak()||0;
  el('xp').textContent=xp;
  el('level').textContent=1+Math.floor(xp/25);
  el('balls').textContent=balls;
  el('progressBar').style.width=Math.round(index/words.length*100)+'%';
}
function uiState(){
  const running=isActive();
  ui.start.hidden=running||state==='paused';
  ui.controls.hidden=!(running||state==='paused');
  ui.pause.textContent=state==='paused'?'▶ Fortsett':'⏸ Pause';
  ui.replay.hidden=!(running);
  ui.replay.disabled=state==='checking';
  ui.listen.hidden=state!=='listening';
  if(state!=='listening')ui.listen.classList.remove('is-speaking');
}
function message(title,subtitle){
  ui.feedback.hidden=false;ui.title.textContent=title;ui.meta.textContent=subtitle;
}
function cancelPending(){
  epoch++;
  if(listenTimer!==null)clearTimeout(listenTimer);
  if(advanceTimer!==null)clearTimeout(advanceTimer);
  listenTimer=advanceTimer=null;
  if(recognition){recognition.abort();recognition=null}
  cancelAnimationFrame(raf);raf=0;
  ui.listen.classList.remove('is-speaking');
  if(audio){audio.pause();audio.onended=null;audio.onerror=null;audio.onpause=null;audio=null}
  if(recorder&&recorder.state==='recording'){
    recorder.onstop=null;
    try{recorder.stop()}catch(_){}
  }
  recorder=null;
}
async function mic(){
  if(stream?.active&&analyser)return;
  const capture=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  stream=capture;
  ctx=ctx||new(window.AudioContext||window.webkitAudioContext)();
  await ctx.resume();
  analyser=ctx.createAnalyser();analyser.fftSize=512;
  ctx.createMediaStreamSource(stream).connect(analyser);
}
function strength(){
  if(!analyser)return 0;
  const a=new Uint8Array(analyser.fftSize);
  analyser.getByteTimeDomainData(a);
  return Math.sqrt(a.reduce((sum,x)=>sum+((x-128)/128)**2,0)/a.length);
}
async function tts(text){
  const key=ui.voice.value+'|'+text;
  if(sounds.has(key))return sounds.get(key);
  const r=await fetch('/api/tts?voice='+encodeURIComponent(ui.voice.value)+'&text='+encodeURIComponent(text));
  if(!r.ok){const detail=await r.json().catch(()=>({}));throw Error(detail.error||'Kunne ikke spille av fransk')}
  const blob=await r.blob();sounds.set(key,blob);return blob;
}
function fail(err,expectedEpoch){
  if(expectedEpoch!==undefined&&expectedEpoch!==epoch)return;
  cancelPending();state='paused';uiState();
  ui.eyebrow.textContent='Prøv igjen';
  message('Kunne ikke fortsette',typeof err==='string'?err:err.message||'Noe gikk galt');
}
async function speak(text){
  cancelPending();
  const generation=epoch;
  state='playing';uiState();
  ui.feedback.hidden=true;
  ui.eyebrow.textContent='Hør og gjenta';
  try{
    const blob=await tts(text);
    if(epoch!==generation||state!=='playing')return;
    const uri=URL.createObjectURL(blob);
    const player=new Audio(uri);
    audio=player;
    await new Promise((resolve,reject)=>{
      const release=()=>{URL.revokeObjectURL(uri);resolve()};
      player.onended=release;
      player.onpause=release;
      player.onerror=()=>{URL.revokeObjectURL(uri);reject(Error('Lyd kunne ikke spilles'))};
      player.play().catch(reject);
    });
    if(epoch!==generation||state!=='playing')return;
    listenTimer=setTimeout(()=>{listenTimer=null;if(epoch===generation&&state==='playing')startListening(generation)},140);
  }catch(err){fail(err,generation)}
}
async function startListening(generation){
  if(epoch!==generation||state!=='playing')return;
  try{
    await mic();
    if(epoch!==generation||state!=='playing')return;
    const type=['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));
    const mr=type?new MediaRecorder(stream,{mimeType:type}):new MediaRecorder(stream);
    recorder=mr;chunks=[];
    mr.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
    mr.onstop=()=>{if(epoch===generation&&state==='listening')transcribe(generation)};
    mr.start(120);
    state='listening';uiState();
    ui.listenLabel.textContent='Si det nå';
    ui.eyebrow.textContent='Din tur';
    const began=performance.now();let heard=false,speechAt=0,quietAt=0;
    const monitor=()=>{
      if(epoch!==generation||state!=='listening'||mr.state!=='recording')return;
      const now=performance.now(),volume=strength();
      ui.meter.style.width=Math.max(6,Math.min(100,volume*700))+'%';
      ui.listen.classList.toggle('is-speaking',volume>.028);
      if(volume>.028){if(!heard){heard=true;speechAt=now}quietAt=0}
      else if(heard&&volume<.018){
        if(!quietAt)quietAt=now;
        if(now-speechAt>250&&now-quietAt>550)return finishRecording();
      }
      if((!heard&&now-began>4200)||(heard&&now-speechAt>5000))return finishRecording();
      raf=requestAnimationFrame(monitor);
    };
    raf=requestAnimationFrame(monitor);
  }catch(_){fail('Tillat mikrofon i Safari og prøv igjen',generation)}
}
function finishRecording(){
  cancelAnimationFrame(raf);raf=0;
  ui.listen.classList.remove('is-speaking');
  if(recorder?.state==='recording')recorder.stop();
}
function score(target,heard){
  const clean=t=>(t||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  const a=clean(target).split(' '),b=clean(heard).split(' ').filter(Boolean);
  if(!b.length)return 0;
  if(clean(target)===clean(heard))return 1;
  const match=a.filter(x=>b.includes(x)).length;
  return match/a.length*.72+match/b.length*.28;
}
async function transcribe(generation){
  if(generation!==epoch||state!=='listening')return;
  state='checking';uiState();message('…','Sjekker');
  if(!chunks.length)return retry(generation);
  const type=recorder?.mimeType||chunks[0]?.type||'audio/webm';
  const ctrl=new AbortController();recognition=ctrl;
  try{
    const result=await fetch('/api/stt',{method:'POST',headers:{'Content-Type':type},body:new Blob(chunks,{type}),signal:ctrl.signal});
    const data=await result.json();
    if(generation!==epoch||state!=='checking')return;
    recognition=null;
    if(!result.ok)throw Error(data.error||'Kunne ikke forstå lyden');
    const similarity=score(words[index].fr,data.transcript||'');
    if(debug)ui.debugText.textContent=JSON.stringify({target:words[index].fr,heard:data.transcript,confidence:data.confidence,similarity},null,2);
    if(similarity<.28)return retry(generation);
    correctAnswers++;
    xp+=similarity>=.68?5:3;
    state='feedback';uiState();
    message(similarity>=.68?'🌟 Kjempebra!':'👍 Bra!',similarity>=.68?'+5 XP':'+3 XP');
    progress();
    advanceTimer=setTimeout(()=>{advanceTimer=null;if(epoch===generation&&state==='feedback')next()},similarity>=.68?520:650);
  }catch(err){
    if(err.name==='AbortError')return;
    fail(err,generation);
  }
}
function retry(generation){
  if(generation!==epoch)return;
  xp++;progress();
  state='feedback';uiState();
  message('🎧 Hør én gang til','+1 XP for forsøket');
  advanceTimer=setTimeout(()=>{advanceTimer=null;if(epoch===generation&&state==='feedback')speak(words[index].fr)},850);
}
function show(){
  if(index>=words.length)return finishRound();
  const word=words[index];
  ui.art.textContent=word.icon;ui.fr.textContent=word.fr;ui.no.textContent=word.no;
  ui.start.hidden=true;progress();
  if(words[index+1])tts(words[index+1].fr).catch(()=>{});
  speak(word.fr);
}
function next(){
  if(!isActive())return;
  index++;
  if(index>=words.length)return finishRound();
  if(index%2===0)balls=Math.min(6,balls+1);
  show();
}
function finishRound(){
  cancelPending();
  const reward=window.PetitCards?.completeRound(correctAnswers)||null;
  balls=Math.min(6,balls+1);
  state='finished';uiState();progress();
  el('progressBar').style.width='100%';
  ui.art.textContent='🏆';ui.eyebrow.textContent='Ferdig';
  ui.fr.textContent='Bravo!';ui.no.textContent='Du klarte hele runden.';
  ui.start.textContent='EN RUNDE TIL';
  message(reward?'⭐ Spillerkort vunnet!':'🔥 Streak '+(window.PetitCards?.getStreak()||0),xp+' XP');
  if(reward){const generation=epoch;advanceTimer=setTimeout(()=>{if(epoch===generation)window.PetitCards?.reveal(reward)},550)}
}
function pause(){
  if(!isActive())return;
  cancelPending();state='paused';uiState();
  ui.eyebrow.textContent='På pause';
  message('⏸ Pause','Fortsett når du er klar. Du starter på samme ord.');
}
function stop(){
  if(!isActive()&&state!=='paused')return;
  cancelPending();state='stopped';uiState();progress();
  ui.art.textContent='⚽';ui.eyebrow.textContent='Runden avsluttet';
  ui.fr.textContent='À bientôt!';
  ui.no.textContent='Vi sees snart. Framgangen er lagret.';
  ui.start.textContent='START NY RUNDE';
  message('Bra jobbet!',xp+' XP · kort og streak beholdes');
}
ui.start.onclick=async()=>{
  ui.start.disabled=true;
  try{
    await mic();
    index=0;balls=0;correctAnswers=0;
    state='playing';show();
  }catch(_){fail('Tillat mikrofon i Safari og prøv igjen')}
  finally{ui.start.disabled=false}
};
ui.pause.onclick=()=>{
  if(state==='paused'){ui.feedback.hidden=true;speak(words[index].fr)}
  else pause();
};
ui.stop.onclick=stop;
ui.replay.onclick=()=>{
  if(isActive())speak(words[index].fr);
};
ui.voice.onchange=()=>{
  sounds.clear();
  if(isActive())speak(words[index].fr);
};
document.addEventListener('visibilitychange',()=>{
  if(document.hidden&&isActive())pause();
});
progress();uiState();
})();