(() => {
  'use strict';

  // Curated photographs from Wikimedia Commons. Every image has its own
  // source, creator and license; see README and the in-app credits.
  // Ratings are EDITORIAL Petit Foot estimates, not official rankings.
  const LICENSE_BY = 'https://creativecommons.org/licenses/by/4.0/';
  const LICENSE_SA = 'https://creativecommons.org/licenses/by-sa/4.0/';
  const players = [
    {id:'courtois',name:'Thibaut Courtois',short:'COURTOIS',position:'GK',role:'Keeper',country:'Belgia',flag:'🇧🇪',world:90,positionLevel:95,stats:[['REF',96],['POS',94],['GRE',92]],tier:'royal',file:'Thibaut Courtois WC2022.jpg',credit:'Hossein Zohrevand / Tasnim News Agency',license:'CC BY 4.0',licenseURL:LICENSE_BY},
    {id:'vandijk',name:'Virgil van Dijk',short:'VAN DIJK',position:'CB',role:'Midtstopper',country:'Nederland',flag:'🇳🇱',world:92,positionLevel:95,stats:[['FOR',96],['HOD',94],['PAS',87]],tier:'royal',file:'Liverpool vs. Chelsea, UEFA Super Cup 2019-08-14 05 (Virgil Van Dijk).jpg',credit:'Mehdi Bolourian / Fars Media Corporation',license:'CC BY 4.0',licenseURL:LICENSE_BY},
    {id:'bellingham',name:'Jude Bellingham',short:'BELLINGHAM',position:'CAM',role:'Midtbane',country:'England',flag:'🏴',world:93,positionLevel:95,stats:[['PAS',93],['TEK',94],['LØP',92]],tier:'royal',file:'Jude Bellingham 2022-11-21 1.jpg',credit:'Hossein Zohrevand / Tasnim News Agency',license:'CC BY 4.0',licenseURL:LICENSE_BY},
    {id:'salah',name:'Mohamed Salah',short:'SALAH',position:'RW',role:'Høyrekant',country:'Egypt',flag:'🇪🇬',world:94,positionLevel:96,stats:[['FAR',95],['SKU',96],['TEK',95]],tier:'aurora',file:'Mohamed Salah 2022.png',credit:'Al AHLY TV',license:'CC BY 3.0',licenseURL:'https://creativecommons.org/licenses/by/3.0/'},
    {id:'yamal',name:'Lamine Yamal',short:'YAMAL',position:'RW',role:'Høyrekant',country:'Spania',flag:'🇪🇸',world:96,positionLevel:96,stats:[['FAR',95],['DRI',98],['PAS',94]],tier:'aurora',file:'Lamine Yamal in 2025 (cropped).jpg',credit:'Biso (original photo), Mickey Đại Phát (crop)',license:'CC BY 4.0',licenseURL:LICENSE_BY},
    {id:'mbappe',name:'Kylian Mbappé',short:'MBAPPÉ',position:'ST',role:'Spiss',country:'Frankrike',flag:'🇫🇷',world:97,positionLevel:97,stats:[['FAR',99],['SKU',96],['DRI',96]],tier:'star',file:'Kylian Mbappe 2017.jpg',credit:'Biser Todorov',license:'CC BY 4.0',licenseURL:LICENSE_BY},
    {id:'haaland',name:'Erling Haaland',short:'HAALAND',position:'ST',role:'Spiss',country:'Norge',flag:'🇳🇴',world:96,positionLevel:98,stats:[['SKU',99],['FYS',98],['FAR',93]],tier:'star',file:'Erling Haaland 2023.jpg',credit:'Jacek Stanislawek',license:'CC BY-SA 4.0',licenseURL:LICENSE_SA},
    {id:'messi',name:'Lionel Messi',short:'MESSI',position:'CAM',role:'Angrepsmidt',country:'Argentina',flag:'🇦🇷',world:90,positionLevel:92,stats:[['TEK',99],['PAS',96],['DRI',98]],tier:'legend',file:'Inter Miami Messi 2024 (cropped).jpg',credit:'TheSoccerBoy',license:'CC BY 4.0',licenseURL:LICENSE_BY}
  ].map(player => ({
    ...player,
    rating: Math.max(0, Math.min(100, Math.round(player.world * .45 + player.positionLevel * .55))),
    source: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(player.file).replace(/%20/g, '_'),
    photo: 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(player.file).replace(/%20/g, '_') + '?width=640'
  }));

  const STORAGE_KEY='petit-foot-club-v1';
  const defaultState={unlocked:[],xp:0,completed:0};
  let state={...defaultState};
  try {
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');
    if(saved && typeof saved==='object'){
      state.unlocked=Array.isArray(saved.unlocked)?[...new Set(saved.unlocked)].filter(id=>players.some(p=>p.id===id)):[];
      state.xp=Number.isFinite(saved.xp)?Math.max(0,Math.round(saved.xp)):0;
      state.completed=Number.isFinite(saved.completed)?Math.max(0,Math.round(saved.completed)):0;
    }
  }catch(_){}
  const root=document.getElementById('clubRoot');
  const overlay=document.getElementById('cardModalRoot');
  let returnFocus=null;

  const save=()=>{try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}catch(_){}};
  const nextCard=()=>players.find(p=>!state.unlocked.includes(p.id));
  const grade=rating=>rating>=96?'VERDENSSTJERNE':rating>=94?'ELITE':rating>=90?'PROFF':'TALENT';

  function card(player,locked=false,large=false){
    if(locked){
      return '<div class="pf-card pf-card--locked" aria-label="Låst spillerkort"><div class="pf-card__stripe"></div><div class="pf-card__mystery">?</div><div class="pf-card__lock">🔒 LÅST</div><div class="pf-card__name">UKJENT SPILLER</div><div class="pf-card__edition">PETIT FOOT · 25/26</div></div>';
    }
    return '<div class="pf-card pf-card--'+player.tier+(large?' pf-card--large':'')+'">'+
      '<div class="pf-card__stripe"></div><div class="pf-card__topline">PETIT FOOT <span>25/26</span></div>'+
      '<div class="pf-card__rating">'+player.rating+'<small>'+player.position+'</small></div>'+
      '<span class="pf-card__flag" aria-label="'+player.country+'">'+player.flag+'</span>'+
      '<div class="pf-card__silhouette">'+player.short.slice(0,1)+'</div>'+
      '<img class="pf-card__photo" loading="lazy" alt="Foto av '+player.name+'" src="'+player.photo+'">'+
      '<div class="pf-card__bottom"><div class="pf-card__role">'+grade(player.rating)+' · '+player.role+'</div>'+
      '<div class="pf-card__name">'+player.short+'</div>'+
      '<div class="pf-card__stats">'+player.stats.map(([label,value])=>'<div><b>'+value+'</b><small>'+label+'</small></div>').join('')+'</div>'+
      '<div class="pf-card__edition">PF ORIGINAL · '+player.country.toUpperCase()+'</div></div></div>';
  }

  function render(){
    if(!root)return;
    const count=state.unlocked.length, next=nextCard(), complete=count===players.length;
    root.innerHTML='<div class="pf-club-head"><div><span class="pf-overline">DIN FOTBALLKLUBB</span><h2>Drømmelaget</h2></div><span class="pf-count">'+count+' / '+players.length+' kort</span></div>'+
      '<div class="pf-club-body"><div class="pf-mini-card">'+(complete?card(players[players.length-1]):card(next,true))+'</div>'+
      '<div class="pf-club-copy"><strong>'+(complete?'Full samling!':'Neste belønning')+'</strong>'+
      '<p>'+(complete?'Du har samlet alle stjernene. Fortsett å øve på fransk!':'Fullfør en runde med minst 4 gode svar for å få et nytt spillerkort.')+'</p>'+
      '<div class="pf-mini-progress" role="progressbar" aria-valuemin="0" aria-valuemax="'+players.length+'" aria-valuenow="'+count+'"><span style="width:'+(count/players.length*100)+'%"></span></div>'+
      '<button id="openCollection" type="button" class="pf-link-button">Se spillerkort <span aria-hidden="true">↗</span></button></div></div>';
    document.getElementById('openCollection')?.addEventListener('click',showCollection);
  }

  function openModal(html){
    if(!overlay)return;
    returnFocus=document.activeElement;
    overlay.innerHTML='<div class="pf-modal-backdrop" data-close-modal></div><div class="pf-modal-sheet" role="dialog" aria-modal="true" aria-label="Petit Foot spillerkort">'+html+'</div>';
    overlay.hidden=false;
    document.body.classList.add('pf-modal-open');
    overlay.querySelector('[data-close-modal]')?.focus();
  }
  function closeModal(){
    if(!overlay)return;
    overlay.hidden=true;overlay.innerHTML='';
    document.body.classList.remove('pf-modal-open');
    returnFocus?.focus?.();
  }
  function credit(player){
    return '<div class="pf-license"><strong>Foto og lisens</strong><p>Foto: '+player.credit+'. Vises beskåret i kortet.</p><p><a href="'+player.source+'" target="_blank" rel="noopener noreferrer">Se originalfoto ↗</a> · <a href="'+player.licenseURL+'" target="_blank" rel="noopener noreferrer">'+player.license+' ↗</a></p>'+
      '<p class="pf-note">Lisenser gjelder fotografiene. Petit Foot-kortet er en original design. Spilleren støtter ikke spillet.</p></div>';
  }
  function detail(player){
    openModal('<div class="pf-modal-header"><span class="pf-overline">SPILLERKORT · 2025/26</span><button class="pf-close" data-close-modal type="button" aria-label="Lukk">✕</button></div>'+
      '<div class="pf-featured-card">'+card(player,false,true)+'</div><div class="pf-player-info"><h2>'+player.name+'</h2><p>'+player.flag+' '+player.country+' · '+player.role+' · '+player.rating+'/100</p></div>'+
      '<div class="pf-rating-info"><strong>Slik er '+player.rating+' beregnet</strong><p>45 % anslått globalt nivå ('+player.world+') + 55 % anslått nivå i sin posisjon ('+player.positionLevel+').</p><small>Redaksjonelle Petit Foot-vurderinger for spillet – ikke en offisiell 2025/26-ranking.</small></div>'+
      credit(player));
  }
  function showCollection(){
    const count=state.unlocked.length;
    openModal('<div class="pf-modal-header"><div><span class="pf-overline">PETIT FOOT · 25/26</span><h2>Min kortsamling</h2><p>'+count+' av '+players.length+' fotballstjerner</p></div><button class="pf-close" data-close-modal type="button" aria-label="Lukk">✕</button></div>'+
      '<div class="pf-gallery">'+players.map((p,i)=>'<button type="button" class="pf-card-trigger" data-player="'+p.id+'" '+(!state.unlocked.includes(p.id)?'disabled':'')+' aria-label="'+(state.unlocked.includes(p.id)?p.name+' '+p.rating+' poeng':'Låst kort '+(i+1))+'">'+card(p,!state.unlocked.includes(p.id))+'</button>').join('')+'</div>'+
      '<div class="pf-rating-info"><strong>Petit Foot-rating: 0–100</strong><p>Vi kombinerer 45 % vurdert globalt nivå med 55 % vurdert prestasjon i spillerens egen posisjon. Tallene er illustrerende, ikke en offisiell rangering eller verifiserte sesongstatistikker.</p><p>Alle kort opptjenes ved å lære fransk. Ingen kjøp eller tilfeldige pakker.</p></div>'+
      '<p class="pf-note">Trykk på et opplåst kort for kilde, fotolisens og beregning. © Bildeskaperne, under lisensene som er oppgitt på hvert kort.</p>');
  }
  function showReward(player){
    openModal('<div class="pf-modal-header"><span class="pf-overline">★ NY BELØNNING ★</span><button class="pf-close" data-close-modal type="button" aria-label="Lukk">✕</button></div>'+
      '<div class="pf-reward-intro"><div class="pf-reward-symbol">✦</div><h2>Nytt spillerkort!</h2><p>Du øvde på fransk og vant en stjerne.</p></div>'+
      '<div class="pf-featured-card pf-reward-card">'+card(player,false,true)+'</div>'+
      '<div class="pf-player-info"><h2>'+player.name+'</h2><p>'+player.rating+'/100 · '+player.role+'</p></div>'+
      '<button type="button" class="pf-reward-done" data-close-modal>Tilbake til spillet</button>'+
      credit(player));
  }

  overlay?.addEventListener('click',e=>{
    if(e.target.closest('[data-close-modal]'))return closeModal();
    const id=e.target.closest('[data-player]')?.dataset.player;
    if(id && state.unlocked.includes(id)){
      const player=players.find(p=>p.id===id);
      if(player)detail(player);
    }
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape' && overlay && !overlay.hidden)closeModal()});

  window.PetitCards={
    getXP(){return state.xp},
    setXP(value){state.xp=Math.max(0,Math.round(value));save()},
    // Fixed unlock order; the child does not need to gamble to get a favorite.
    completeRound(correctAnswers){
      if(correctAnswers<4)return null;
      state.completed++;
      const next=nextCard();
      if(next)state.unlocked.push(next.id);
      save();render();
      return next||null;
    },
    reveal:showReward,
    collection:showCollection,
    render,
    getCollectionCount(){return state.unlocked.length},
    getPlayers(){return players.map(({id,name,position,rating,world,positionLevel,tier})=>({id,name,position,rating,world,positionLevel,tier}))}
  };
  render();
})();