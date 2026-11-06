const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
function setup({configured=true,url='https://example.test/dastan/#login',cloud=null}={}) {
 const storage=new Map(), session=new Map(), timers=new Map(), writes=[], notices=[];let timer=0, listener, resolveRead; const handlers={};
 const location=new URL(url), document={addEventListener(event,fn){(handlers[event] ||= []).push(fn)},querySelectorAll(){return []},querySelector(){return null},getElementById(){return null}};
 const client={auth:{onAuthStateChange(fn){listener=fn},async getSession(){return {data:{session:null}}},async exchangeCodeForSession(code){client.codes.push(code);return {data:{session:{user:{id:'a',email:'a@test.kz'}},redirectType:'PASSWORD_RECOVERY'}}},async signOut(){return {}},stopAutoRefresh(){},startAutoRefresh(){}},codes:[],rpc:async()=>({}),from(){return {select(){return this},eq(){return this},maybeSingle(){return client.read()},async upsert(p){writes.push(JSON.parse(JSON.stringify(p)));return client.writeError ? {error:{}} : {}}}},async read(){return {data:cloud}}};
 const ctx=vm.createContext({console,URL,Map,Set,Date,Promise,sessionStorage:{getItem:k=>session.get(k)||null,setItem:(k,v)=>session.set(k,v),removeItem:k=>session.delete(k)},localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},document,location,history:{state:null,replaceState(_a,_b,path){location.href=new URL(path,location).href}},window:{addEventListener(){},supabase:{createClient(u,k,opts){assert.equal(location.searchParams.get('code'),null);assert.equal(opts.auth.flowType,'pkce');return client}}},setTimeout(fn,ms){timers.set(++timer,{fn,ms});return timer},clearTimeout(id){timers.delete(id)}});
 const run=s=>vm.runInContext(s,ctx);
 run(`const APP={toast:message=>notices.push(message)}, VIEWS={}; function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))} function routeLink(r,l){return '<a href="#'+r+'">'+esc(l)+'</a>'} function imageFigure(){return '<figure>Сырмақ</figure>'} function heading(t){return '<h1>'+esc(t)+'</h1>'} function renderRoute(){};const SUPABASE_URL=${JSON.stringify(configured?'https://test.supabase.co':'')},SUPABASE_ANON_KEY=${JSON.stringify(configured?'anon':'')};`);
 ctx.notices=notices;
 run(fs.readFileSync('js/shanyrak.js','utf8'));run(fs.readFileSync('js/profile.js','utf8'));run(fs.readFileSync('js/auth.js','utf8'));
 run(`APP.profileTree={zhuzes:[{id:'uly',branches:[{tribes:[{id:'dulat'}]}]},{id:'orta',branches:[{tribes:[{id:'argyn'}]}]}],non_clan:[]}; for(let i=0;i<250;i++)APP.materials.set('person:'+i,{title:'Тұлға'});`);
 return {run,ctx,storage,session,handlers,client,writes,notices,location,async tick(ms=650){for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.fn()}await run('AUTH.writes');},event(e,s){listener(e,s)}};
}
(async()=>{
 let t=setup({configured:false});await t.run('APP.initAuth()');assert.match(t.run('VIEWS.login.render()'),/Тіркелу әзірге қосылмаған/);assert.equal(t.client.codes.length,0);assert.equal(t.notices.length,0);
 t=setup();let merged=JSON.parse(t.run(`JSON.stringify(mergeProfiles({name:'Бұлт',zhuz:'uly',tribe:'dulat',saved:[{type:'person',id:'1'},{type:'bad',id:'2'}],recent:[{type:'person',id:'1'}]},{name:'Жергілікті',zhuz:'orta',tribe:'argyn',saved:[{type:'person',id:'1'},{type:'person',id:'2'}],recent:[{type:'person',id:'2'}]}))`));assert.equal(merged.name,'Бұлт');assert.equal(merged.tribe,'dulat');assert.equal(merged.saved.length,2);assert.equal(merged.recent[0].id,'2');assert.equal(t.run(`mergeProfiles({saved:Array.from({length:250},(_,i)=>({type:'person',id:String(i)})),recent:Array.from({length:250},(_,i)=>({type:'person',id:String(i)}))},{}).saved.length`),200);assert.equal(t.run(`mergeProfiles({recent:Array.from({length:250},(_,i)=>({type:'person',id:String(i)}))},{}).recent.length`),12);
 t=setup({url:'https://example.test/dastan/?code=one&keep=yes#home'});await t.run('APP.initAuth()');assert.deepEqual(t.client.codes,['one']);assert.equal(t.location.search,'?keep=yes');assert.equal(t.location.hash,'#new-password');assert.equal(t.run('AUTH.recovery'),true);await t.tick();assert.equal(t.writes.length,1);assert.equal(t.writes[0].id,'a');
 t=setup();await t.run('APP.initAuth()');t.client.read=async()=>({error:{}});t.run(`APP.profile.name='Жергілікті'`);await t.run(`authSession({user:{id:'a'}})`);t.run('APP.persistProfile()');await t.tick();assert.equal(t.writes.length,0);assert.equal(t.run('APP.profile.name'),'Жергілікті');assert.equal(t.run('AUTH.ready'),false);
 // Жүктеу сәтсіз болғаннан кейін де өңдеу қайта қосылғанда сақталады.
 t.run(`APP.profile.name='Өңделген'; APP.persistProfile()`);t.client.read=async()=>({data:{name:'Ескі'}});await t.run('loadCloudProfile(AUTH.epoch)');assert.equal(t.run('APP.profile.name'),'Өңделген');await t.tick();assert.equal(t.writes[0].name,'Өңделген');
 t=setup();await t.run('APP.initAuth()');let resolve;t.client.read=()=>new Promise(r=>resolve=r);const pending=t.run(`authSession({user:{id:'a'}})`);t.run(`APP.profile.name='Жаңа';APP.persistProfile()`);resolve({data:{name:'Ескі',saved:[{type:'person',id:'1'}]}});await pending;assert.equal(t.run('APP.profile.name'),'Жаңа');assert.equal(t.run('APP.profile.saved.length'),1);
 // Шығудан кейін кеш келген бұлт жауабы жергілікті профильді қайта толтырмайды.
 t=setup();await t.run('APP.initAuth()');t.client.read=()=>new Promise(r=>resolve=r);const old=t.run(`authSession({user:{id:'a'}})`);await t.run('APP.signOut()');resolve({data:{name:'Бұрынғы'}});await old;assert.equal(t.run('APP.profile.name'),'');assert.equal(t.run('AUTH.user'),null);await t.tick();assert.equal(t.writes.length,0);
 // Желі қатесімен шығу сессияны да, профильді де тазалайды.
 t=setup();await t.run('APP.initAuth()');await t.run(`authSession({user:{id:'a'}})`);t.storage.set('dastan.auth.v1','token');t.client.auth.signOut=async()=>({error:{status:0}});await t.run('APP.signOut()');assert.equal(t.storage.has('dastan.auth.v1'),false);assert.equal(t.storage.has('dastan.profile.v1'),false);assert.equal(t.run('AUTH.user'),null);
 // Иесі бар, сессиясы жоқ жергілікті көшірме қонаққа көрсетілмейді.
 t=setup();t.storage.set('dastan.profile.owner.v1','a');t.run(`APP.profile.name='Жасырын'`);await t.run('APP.initAuth()');assert.equal(t.run('APP.profile.name'),'');
 // Аккаунт ауысқанда бұрынғы профиль жаңа аккаунтпен біріктірілмейді.
 t=setup();await t.run('APP.initAuth()');await t.run(`authSession({user:{id:'a'}})`);t.run(`APP.profile.name='А';APP.profile.saved=[{type:'person',id:'1'}];APP.persistProfile()`);await t.run(`authSession({user:{id:'b'}})`);assert.equal(t.run('APP.profile.name'),'');assert.equal(t.run('APP.profile.saved.length'),0);await t.tick();assert.equal(t.writes.length,1);assert.equal(t.writes[0].id,'b');
 // Сақтау қатесі жергілікті көшірмені сақтап, қайта жіберуге мүмкіндік береді.
 t=setup();await t.run('APP.initAuth()');await t.run(`authSession({user:{id:'a'}})`);t.client.writeError=true;t.run(`APP.profile.name='Сақтаулы';APP.persistProfile()`);await t.tick();assert.equal(t.run('AUTH.syncFailed'),true);assert.match(t.storage.get('dastan.profile.v1'),/Сақтаулы/);assert.match(t.run('authAccountHTML()'),/data-auth-retry/);
 // RPC орындалмайынша аккаунт өшірілді деп есептелмейді.
 let rpc=0;t.client.rpc=async name=>{assert.equal(name,'delete_own_account');rpc++;return {}};assert.equal(await t.run('APP.deleteAccount()'),true);assert.equal(rpc,1);assert.equal(t.run('AUTH.user'),null);assert.equal(t.storage.has('dastan.profile.v1'),false);
 // Қалпына келтіру жауабы email тіркелгенін ашпайды, қате мәтіні қазақша.
 async function submit(t,kind,method,response,values={}) {
   let handler;
   const button={disabled:false},status={textContent:''}; const field=value=>({value,attrs:{},setAttribute(k,v){this.attrs[k]=v},removeAttribute(k){delete this.attrs[k]},focus(){this.focused=true}});
   const form={dataset:{authKind:kind},elements:{email:field(values.email ?? 'mail@test.kz'),password:field(values.password ?? 'long-password')},
     querySelector:selector=>selector.startsWith('button')?button:status,
     addEventListener(_event,fn){handler=fn},setAttribute(){},removeAttribute(){}};
   t.ctx.document.getElementById=id=>id==='authForm'?form:null;
   t.form=form; t.status=status; t.calls=0; t.client.auth[method]=async()=>{t.calls++;return response};
   t.run('mountAuthForm()');await handler({preventDefault(){}});
   if(t.calls) assert.equal(form.elements.password.value,'');
   return t.run('AUTH.message');
 }
 t=setup();await t.run('APP.initAuth()');
 const absent=await submit(t,'reset','resetPasswordForEmail',{error:{status:400,code:'email_not_found'}});
 const present=await submit(t,'reset','resetPasswordForEmail',{});
 assert.equal(absent,present);assert.match(absent,/Егер бұл мекенжай/);
 assert.match(await submit(t,'reset','resetPasswordForEmail',{error:{status:429}}),/Әрекет тым көп/);
 assert.match(await submit(t,'reset','resetPasswordForEmail',{error:{status:503}}),/Желіні тексеріп/);
 assert.match(await submit(t,'login','signInWithPassword',{error:{code:'invalid_credentials'}}),/құпия сөз қате/);
 assert.match(await submit(t,'register','signUp',{data:{session:null,user:{identities:[{}]}}}),/поштаңызды растаңыз/);
 t.run(`AUTH.user={id:'a',email:'<img src=x onerror=1>'}`);
 assert.doesNotMatch(t.run('authAccountHTML()'),/<img/);
 assert.match(t.run('authAccountHTML()'),/&lt;img/);
 t.run('AUTH.user=null;AUTH.confirmation=null');
 for(const [kind,autocomplete] of [['login','current-password'],['register','new-password']]) {
   assert.match(t.run(`authPage('${kind}')`),new RegExp('autocomplete="'+autocomplete+'"'));
   assert.match(t.run(`authPage('${kind}')`),/aria-live="polite"/);
 }
 // 8-кезең: пішін өрістері және интерфейс келісімі.
 t=setup();await t.run('APP.initAuth()');
 const login=t.run("authPage('login')"), register=t.run("authPage('register')");
 assert.match(login,/auth-layout/);assert.match(login,/Қайта келдіңіз/);
 assert.match(register,/Тіркелгіңіз бар ма/);assert.doesNotMatch(login,/auth-switch|role="tablist"/);assert.doesNotMatch(register,/поштаңызды раста|Поштаңызды раста|растау сілтемесі/i);
 assert.match(login,/auth-login/);assert.match(register,/auth-register/);
 assert.match(register,/Материалдарды сақтап жинаңыз/);assert.match(register,/Соңғы қаралғандарға қайта оралыңыз/);assert.match(register,/Басқа құрылғыдан кіріңіз/);
 assert.match(login,/shanyrak-svg/);assert.doesNotMatch(login,/auth-benefits/);
 for(const kind of ['reset','new-password'])assert.match(t.run(`authPage('${kind}')`),/auth-layout/);
 assert.match(login,/data-password-toggle aria-controls="authPassword" aria-pressed="false"/);
 assert.match(login,/aria-describedby="authEmailError"/);assert.match(login,/Тіркелмей жалғастыру/);
 await submit(t,'login','signInWithPassword',{}, {email:'wrong'});
 assert.equal(t.calls,0);assert.equal(t.form.elements.email.attrs['aria-invalid'],'true');assert.equal(t.form.elements.email.focused,true);
 await submit(t,'register','signUp',{}, {password:'short'});
 assert.equal(t.calls,0);assert.equal(t.form.elements.password.focused,true);
 await submit(t,'login','signInWithPassword',{error:{code:'invalid_credentials'}});
 assert.equal(t.form.elements.password.attrs['aria-invalid'],'true');assert.equal(t.form.elements.password.focused,true);assert.equal(t.status.textContent,'');
 // Құпия сөзді көрсету жеке батырмамен басқарылады.
 const input={type:'password'},reveal={textContent:'Көрсету',setAttribute(k,v){this[k]=v}};
 t.ctx.document.getElementById=id=>id==='authPassword'?input:null;
 for(const click of t.handlers.click)click({target:{closest:s=>s==='[data-password-toggle]'?reveal:null}});
 assert.equal(input.type,'text');assert.equal(reveal['aria-pressed'],'true');assert.equal(reveal.textContent,'Жасыру');
 for(const click of t.handlers.click)click({target:{closest:s=>s==='[data-password-toggle]'?reveal:null}});
 assert.equal(input.type,'password');assert.equal(reveal['aria-pressed'],'false');
 // Растаусыз тіркелу: сессия, профиль бағыты, сәлемдесу; бұрынғы бағыттан басым.
 t=setup();await t.run('APP.initAuth()');
 t.session.set('dastan.auth.return','#people/abai');
 await submit(t,'register','signUp',{data:{session:{user:{id:'new',email:'mail@test.kz'}}}});
 assert.equal(t.run('AUTH.user.id'),'new');assert.equal(t.location.hash,'#profile');
 assert.match(t.run('AUTH.message'),/Қош келдіңіз/);assert.equal(t.run('AUTH.confirmation'),null);
 // Растау экраны, HTML escaping, қайта жіберу және 60 секундтық тосқауыл.
 t=setup();await t.run('APP.initAuth()');
 await submit(t,'register','signUp',{data:{session:null,user:{identities:[{}]}}});
 assert.match(t.run("authPage('register')"),/Хат <strong>mail@test.kz<\/strong> мекенжайына жіберілді/);
 t.run(`AUTH.confirmation.email='<img src=x>'`);assert.doesNotMatch(t.run('authConfirmationHTML()'),/<img/);assert.match(t.run('authConfirmationHTML()'),/&lt;img/);
 let resend=0;t.client.auth.resend=async args=>{resend++;assert.equal(args.type,'signup');assert.equal(args.email,'mail@test.kz');return {}};
 t.run(`AUTH.confirmation.email='mail@test.kz'`);await t.run('resendConfirmation()');assert.equal(resend,0);
 t.run('AUTH.resendAt=0');await t.run('resendConfirmation()');assert.equal(resend,1);
 assert.ok(t.run('AUTH.resendAt-Date.now()')>59000);await t.run('resendConfirmation()');assert.equal(resend,1);
 await submit(t,'login','signInWithPassword',{error:{code:'email_not_confirmed'}});
 assert.equal(t.run('AUTH.confirmation.kind'),'login');assert.match(t.run("authPage('login')"),/Хатты қайта жіберу/);
 // Кіру алдында ішкі бағыт қана сақталады, auth бағыты профильге ауысады.
 t=setup({url:'https://example.test/dastan/#people/abai'});await t.run('APP.initAuth()');
 t.run(`APP.authRoute('people')`);t.location.hash='#login';t.run(`APP.authRoute('login')`);
 assert.equal(t.session.get('dastan.auth.return'),'#people/abai');
 await submit(t,'login','signInWithPassword',{data:{session:{user:{id:'a'}}}});assert.equal(t.location.hash,'#people/abai');
 assert.equal(t.run(`APP.authRoute('register')`),'profile');
 for(const hash of ['https://evil.test','#login','#register','#reset','#new-password','#//evil','javascript:alert(1)']) assert.equal(t.run(`authInternalHash(${JSON.stringify(hash)})`),'#profile');
 // Тікелей кіру беті ашылса, кіруден кейін профиль; тіркелмей жалғастыру басты бетке.
 t=setup();await t.run('APP.initAuth()');t.run(`APP.authRoute('login')`);
 assert.match(t.run(`authPage('login')`),/href="#home">Тіркелмей жалғастыру/);
 await submit(t,'login','signInWithPassword',{data:{session:{user:{id:'a'}}}});
 assert.equal(t.location.hash,'#profile');
 // Растау callback-ы recovery-ден бөлек, басқа браузердегі PKCE қатесі кіруге апарады.
 t=setup({url:'https://example.test/dastan/?code=confirm#home'});
 t.client.auth.exchangeCodeForSession=async code=>{t.client.codes.push(code);return {data:{session:{user:{id:'a'}}}}};
 await t.run('APP.initAuth()');assert.deepEqual(t.client.codes,['confirm']);assert.equal(t.location.hash,'#profile');assert.match(t.run('AUTH.message'),/Поштаңыз расталды/);
 t=setup({url:'https://example.test/dastan/?code=other#home'});t.client.auth.exchangeCodeForSession=async()=>({error:{code:'flow_state_not_found'}});
 await t.run('APP.initAuth()');assert.equal(t.location.hash,'#login');assert.match(t.run('AUTH.message'),/Поштаңыз расталған болуы мүмкін/);
 // profiles жоқ болса, кіру мен жергілікті сақтау жалғасады; хабар бір-ақ рет.
 for(const error of [{code:'PGRST205'},{status:404}]) {
   t=setup();await t.run('APP.initAuth()');t.client.read=async()=>({error});t.run(`APP.profile.name='Жергілікті'`);
   await t.run(`authSession({user:{id:'a'}})`);assert.equal(t.run('AUTH.user.id'),'a');assert.equal(t.run('AUTH.localOnly'),true);
   assert.equal(t.run('APP.profile.name'),'Жергілікті');t.run(`APP.profile.name='Өзгерді';APP.persistProfile()`);await t.tick();assert.equal(t.writes.length,0);
   assert.match(t.storage.get('dastan.profile.v1'),/Өзгерді/);assert.doesNotMatch(t.run('authAccountHTML()'),/data-auth-retry/);
   const count=t.notices.length;await t.run('loadCloudProfile(AUTH.epoch)');await t.run(`authSession({user:{id:'a'}})`);assert.equal(t.notices.length,count);
 }
 // HTTP мәртебесі қате объектісінен бөлек келуі мүмкін; upsert те жергілікті режимге өтеді.
 t=setup();await t.run('APP.initAuth()');t.client.read=async()=>({error:{message:'missing'},status:404});await t.run(`authSession({user:{id:'a'}})`);assert.equal(t.run('AUTH.localOnly'),true);
 t=setup();await t.run('APP.initAuth()');await t.run(`authSession({user:{id:'a'}})`);
 t.client.from=()=>({upsert:async()=>({error:{code:'PGRST205'}})});await t.tick();assert.equal(t.run('AUTH.localOnly'),true);assert.equal(t.run('AUTH.syncFailed'),false);
 // Болдырылмаған кіру ескі бағытты келесі кіруге тасымалдамайды.
 t=setup({url:'https://example.test/dastan/#people/abai'});await t.run('APP.initAuth()');t.run(`APP.authRoute('people')`);t.location.hash='#login';t.run(`APP.authRoute('login')`);
 t.location.hash='#traditions';t.run(`APP.authRoute('traditions')`);t.location.hash='#login';t.run(`APP.authRoute('login')`);assert.equal(t.session.get('dastan.auth.return'),'#traditions');
 // Callback бағыты initAuth күткен ескі маршруттан басым.
 t.run(`AUTH.callbackRoute='profile'`);assert.equal(t.run(`APP.authRoute('home')`),'profile');assert.equal(t.run(`APP.authRoute('profile')`),'profile');assert.equal(t.run('AUTH.callbackRoute'),null);
 console.log('PASS: бос конфигурация, PKCE, recovery, біріктіру, шектер, желі қатесі, өңдеу жарысы, шығу, аккаунт ауысуы, RPC, пішіндер, растау/қайта жіберу, өріс қатесі, ішкі бағыт, callback және жергілікті fallback');
})().catch(e=>{console.error(e);process.exitCode=1});
