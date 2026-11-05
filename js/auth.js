"use strict";
// Құпия сөз тек жіберілетін пішінде болады; профильге де, журналға да жазылмайды.
const AUTH_SESSION_KEY = "dastan.auth.v1";
const authMemory = new Map();
const authStorage = {
  getItem(key) {
    if (authMemory.has(key)) return authMemory.get(key);
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem(key,value) {
    try { localStorage.setItem(key,value); authMemory.delete(key); }
    catch { authMemory.set(key,value); }
  },
  removeItem(key) {
    authMemory.delete(key);
    try { localStorage.removeItem(key); }
    catch {
      authMemory.set(key,null);
      try { localStorage.setItem(key, ""); } catch { /* Браузер сақтауын пайдаланушы тазалайды. */ }
    }
  }
};
const PROFILE_OWNER_KEY = "dastan.profile.owner.v1";
const AUTH = {client:null, user:null, epoch:0, timer:null, ready:false, loading:false,
  revision:0, writes:Promise.resolve(), recovery:false, busy:false, message:"", owner:null, loadPromise:null, syncFailed:false, mergeBase:null, mergeRevision:0, initializing:true, localOnly:false, localNotice:false, confirmation:null, resendAt:0, resendTimer:null, lastRoute:null};

function authError(error) {
  const code = error?.code || "";
  const message = String(error?.message || "").toLowerCase();
  if (code === "invalid_credentials" || /invalid login|invalid credentials/.test(message)) return "Электрондық пошта не құпия сөз қате.";
  if (code === "email_not_confirmed" || /email not confirmed/.test(message)) return "Алдымен поштаңыздағы сілтеме арқылы мекенжайды растаңыз.";
  if (/user_already_exists|email_exists/.test(code) || /already registered|already been registered/.test(message)) return "Бұл пошта мекенжайы тіркелген. Кіру бетін ашыңыз.";
  if (error?.status === 429 || /over_.*rate_limit/.test(code) || /rate limit|too many/.test(message)) return "Әрекет тым көп. Біраздан кейін қайталаңыз.";
  if (/weak_password|same_password/.test(code) || /password/.test(message)) return "Құпия сөз кемінде 8 таңба болсын және бұрынғыдан өзгеше болсын.";
  if (/email_address_invalid|validation_failed/.test(code) || /invalid email/.test(message)) return "Пошта мекенжайын дұрыс енгізіңіз.";
  if (/flow_state|code_verifier|otp_expired/.test(code) || /expired|verifier|auth code/.test(message)) return "Сілтеменің мерзімі аяқталған немесе басқа браузерде ашылған. Жаңа сілтеме сұраңыз.";
  return "Байланыс орнатылмады. Желіні тексеріп, қайта көріңіз.";
}
function authNotify(message) {
  AUTH.message = message;
  APP.toast(message);
  document.querySelectorAll("[data-auth-message]").forEach(node => { node.textContent = message; });
}
function authStoreOwner(id) {
  AUTH.owner = id;
  try { if (id) localStorage.setItem(PROFILE_OWNER_KEY,id); else localStorage.removeItem(PROFILE_OWNER_KEY); } catch { /* Жадтағы күй жұмыс істейді. */ }
}
APP.clearLocalProfile = () => {
  APP.profile = emptyProfile();
  AUTH.revision++;
  try { localStorage.removeItem(PROFILE_KEY); }
  catch {
    try { localStorage.setItem(PROFILE_KEY,JSON.stringify(APP.profile)); }
    catch { APP.toast("Браузердегі сақтауды тазарту мүмкін болмады. Ортақ құрылғыда браузердің сайт деректерін тазалаңыз."); }
  }
  authStoreOwner(null);
  APP.updateProfileButton();
};
function authCancelSync() {
  clearTimeout(AUTH.timer); AUTH.timer = null; AUTH.epoch++; AUTH.ready = false;
}
function mergeProfiles(cloud, local) {
  cloud = validateProfile(cloud); local = validateProfile(local);
  const zhuz = cloud.zhuz || local.zhuz;
  return validateProfile({name:cloud.name || local.name, zhuz,
    tribe:cloud.tribe || local.tribe,
    saved:[...cloud.saved,...local.saved], recent:[...local.recent,...cloud.recent]});
}
const LOCAL_PROFILE_MESSAGE = "Профильді бұлтқа сақтау әзірге қосылмаған. Деректер осы браузерде сақталады.";
function missingProfileTable(error) { return error?.code === "PGRST205" || Number(error?.status) === 404; }
function localProfileFallback() {
  AUTH.localOnly = true; AUTH.ready = false; AUTH.syncFailed = false; AUTH.mergeBase = null;
  clearTimeout(AUTH.timer); AUTH.timer = null;
  if (!AUTH.localNotice) { AUTH.localNotice = true; authNotify(LOCAL_PROFILE_MESSAGE); }
}
function authAccountHTML() {
  if (AUTH.user) return `<p>Кірген тіркелгі: <strong>${esc(AUTH.user.email || "Расталған тіркелгі")}</strong></p><p>${AUTH.localOnly ? LOCAL_PROFILE_MESSAGE : AUTH.loading ? "Профиль бұлттан жүктелуде…" : AUTH.syncFailed ? "Жергілікті көшірме сақтаулы. Бұлтқа қайта жіберу қажет." : AUTH.ready ? "Профиль осы браузерде және бұлтта сақталады." : "Жергілікті көшірме сақтаулы. Бұлтпен байланысты қайта тексеріңіз."}</p><div class="auth-actions"><button type="button" data-auth-logout${AUTH.busy ? " disabled" : ""}>Шығу</button>${(!AUTH.ready || AUTH.syncFailed) && !AUTH.loading && !AUTH.localOnly ? '<button type="button" data-auth-retry>Қайта қосылу</button>' : ""}</div>`;
  return `<p>Қонақ режимі. Профиль осы браузерде сақталады.</p><div class="auth-actions">${routeLink("login","Кіру")}${routeLink("register","Тіркелу")}</div>`;
}
APP.updateAuthUI = () => {
  document.querySelectorAll("[data-auth-account]").forEach(node => {
    const html = authAccountHTML();
    if (node.innerHTML === html) return;
    const focused = node.contains(document.activeElement);
    node.innerHTML = html;
    if (focused) (node.querySelector("button, a") || document.getElementById("menuClose"))?.focus();
  });
  APP.updateProfileButton();
};
function authRefreshProfile() {
  APP.updateAuthUI();
  if (APP.route === "profile") renderRoute();
}
function loadCloudProfile(epoch) {
  if (AUTH.loading) return AUTH.loadPromise || Promise.resolve();
  AUTH.loadPromise = doLoadCloudProfile(epoch);
  return AUTH.loadPromise;
}
async function doLoadCloudProfile(epoch) {
  if (!AUTH.user || epoch !== AUTH.epoch || AUTH.loading || AUTH.localOnly) return;
  const id = AUTH.user.id, base = AUTH.mergeBase || validateProfile(APP.profile), revision = AUTH.mergeBase ? AUTH.mergeRevision : AUTH.revision;
  AUTH.loading = true; APP.updateAuthUI();
  try {
    const {data,error,status} = await AUTH.client.from("profiles").select("name,zhuz,tribe,saved,recent").eq("id",id).maybeSingle();
    if (epoch !== AUTH.epoch) return;
    if (error) throw {...error,status:error.status || status};
    let merged = mergeProfiles(data,APP.profile);
    // Жүктелу кезінде жасалған нақты өңдеулер бұлттағы ескі мәннен басым.
    if (revision !== AUTH.revision) {
      for (const key of ["name","zhuz","tribe"]) if (APP.profile[key] !== base[key]) merged[key] = APP.profile[key];
      for (const key of ["saved","recent"]) {
        const current = new Set(APP.profile[key].map(e => e.type + ":" + e.id));
        const removed = new Set(base[key].filter(e => !current.has(e.type + ":" + e.id)).map(e => e.type + ":" + e.id));
        merged[key] = merged[key].filter(e => !removed.has(e.type + ":" + e.id));
      }
    }
    APP.profile = validateProfile(merged); AUTH.ready = true; AUTH.syncFailed = false; AUTH.mergeBase = null;
    APP.persistProfile();
  } catch (error) {
    if (epoch === AUTH.epoch && missingProfileTable(error)) localProfileFallback();
    else if (epoch === AUTH.epoch) authNotify("Бұлттағы профиль жүктелмеді. Жергілікті көшірме сақтаулы. Қайта қосылып көріңіз.");
  } finally {
    if (epoch === AUTH.epoch) { AUTH.loading = false; APP.updateAuthUI(); }
  }
}
APP.queueProfileSync = () => {
  AUTH.revision++;
  if (!AUTH.ready || !AUTH.user || AUTH.busy || AUTH.localOnly) return;
  clearTimeout(AUTH.timer);
  const epoch = AUTH.epoch, id = AUTH.user.id;
  AUTH.timer = setTimeout(() => {
    AUTH.timer = null;
    const profile = validateProfile(APP.profile);
    AUTH.writes = AUTH.writes.catch(() => {}).then(async () => {
      if (epoch !== AUTH.epoch || AUTH.user?.id !== id || !AUTH.ready || AUTH.busy) return;
      try {
        const {error,status} = await AUTH.client.from("profiles").upsert({id,...profile,updated_at:new Date().toISOString()},{onConflict:"id"});
        if (error) throw {...error,status:error.status || status};
        if (epoch === AUTH.epoch) { AUTH.syncFailed = false; APP.updateAuthUI(); }
      } catch (error) {
        if (epoch === AUTH.epoch && missingProfileTable(error)) { localProfileFallback(); APP.updateAuthUI(); return; }
        if (epoch === AUTH.epoch) { AUTH.syncFailed = true; APP.updateAuthUI(); }
        if (epoch === AUTH.epoch) authNotify("Бұлтқа сақтау мүмкін болмады. Жергілікті көшірме сақтаулы. Қайта қосылып көріңіз.");
      }
    });
  },650);
};
async function authSession(session) {
  const user = session?.user || null;
  if (AUTH.user?.id === user?.id && (!AUTH.owner || AUTH.owner === user?.id)) { AUTH.user = user; APP.updateAuthUI(); if (AUTH.loading) await AUTH.loadPromise; return; }
  const previous = AUTH.user;
  authCancelSync(); AUTH.loading = false;
  if (previous || (AUTH.owner && AUTH.owner !== user?.id)) APP.clearLocalProfile();
  AUTH.user = user;
  if (!user) clearRecovery();
  if (user) {
    authStoreOwner(user.id);
    AUTH.mergeBase = validateProfile(APP.profile); AUTH.mergeRevision = AUTH.revision;
    const loading = loadCloudProfile(AUTH.epoch);
    // Аккаунт ауысқанда ескі профиль DOM ішінде де қалып қоймасын.
    authRefreshProfile();
    await loading;
  }
  authRefreshProfile();
}
function clearRecovery() {
  AUTH.recovery = false;
  try { sessionStorage.removeItem("dastan.auth.recovery"); } catch { /* Беттегі күй жеткілікті. */ }
}
function authRecovery() {
  AUTH.recovery = true;
  if (AUTH.initializing) AUTH.callbackRoute = "new-password";
  try { sessionStorage.setItem("dastan.auth.recovery",AUTH.user?.id || ""); } catch { /* Беттегі күй жеткілікті. */ }
  if (location.hash === "#new-password") { if (APP.route) renderRoute(); }
  else location.hash = "#new-password";
}
APP.initAuth = () => {
  if (!APP.authReady) APP.authReady = (async () => {
    try { AUTH.owner = localStorage.getItem(PROFILE_OWNER_KEY); } catch { /* Қонақ режимі сақталады. */ }
    if (typeof SUPABASE_URL !== "string" || !SUPABASE_URL.trim() || typeof SUPABASE_ANON_KEY !== "string" || !SUPABASE_ANON_KEY.trim() || !window.supabase?.createClient) {
      if (AUTH.owner) APP.clearLocalProfile();
      AUTH.initializing = false; APP.updateAuthUI(); return;
    }
    // 2.45.4 PKCE URL-ін detectSessionInUrl:false болса да өзі алмастырады.
    // Кодты конструктордан БҰРЫН алып тастап, төменде дәл бір рет алмастырамыз.
    const callback = new URL(location.href), code = callback.searchParams.get("code");
    const failed = callback.searchParams.has("error") || callback.searchParams.has("error_description");
    for (const key of ["code","error","error_code","error_description"]) callback.searchParams.delete(key);
    if (code || failed) history.replaceState(history.state,"",callback.pathname + callback.search + callback.hash);
    try {
      AUTH.client = window.supabase.createClient(SUPABASE_URL,SUPABASE_ANON_KEY,{auth:{flowType:"pkce",detectSessionInUrl:false,persistSession:true,autoRefreshToken:true,storageKey:AUTH_SESSION_KEY,storage:authStorage}});
      // Callback ішінде Supabase сұрауын күтпейміз: SDK құлпы босатылған соң жұмыс істейді.
      AUTH.client.auth.onAuthStateChange((event,session) => {
        if (event === "PASSWORD_RECOVERY") AUTH.recovery = true;
        if (AUTH.initializing) return;
        const epoch = AUTH.epoch;
        setTimeout(() => {
          if (epoch !== AUTH.epoch) return;
          authSession(session).catch(() => authNotify("Тіркелгі күйін жаңарту мүмкін болмады."));
          if (event === "PASSWORD_RECOVERY") authRecovery();
        },0);
      });
      let session;
      if (code) {
        const {data,error} = await AUTH.client.auth.exchangeCodeForSession(code);
        if (error) throw error;
        session = data.session;
        // Осы UMD нұсқасы recovery түрін оқиғадан бөлек қайтаруы мүмкін.
        if (data.redirectType === "PASSWORD_RECOVERY" || data.redirectType === "recovery") AUTH.recovery = true;
      } else {
        const {data,error} = await AUTH.client.auth.getSession();
        if (error) throw error;
        session = data.session;
      }
      await authSession(session);
      try {
        if (session && location.hash === "#new-password" && sessionStorage.getItem("dastan.auth.recovery") === session.user.id) AUTH.recovery = true;
      } catch { /* Қалпына келтіру оқиғасы жұмыс істейді. */ }
      if (AUTH.recovery && session) authRecovery();
      else if (code && session) {
        AUTH.confirmation = null;
        AUTH.callbackRoute = "profile"; authNotify("Поштаңыз расталды, қош келдіңіз"); location.hash = "#profile";
      }
      if (failed) authCallbackFailure();
    } catch (error) {
      // Желі қатесі сақталған жергілікті көшірмені жоймайды.
      // Басқа аккаунтқа кіру кезінде owner салыстырылып, көшірме тазаланады.
      if (code || failed) authCallbackFailure(); else authNotify(authError(error));
    }
    AUTH.initializing = false; APP.updateAuthUI();
  })();
  return APP.authReady;
};
APP.signOut = async () => {
  if (AUTH.busy || !AUTH.client) return;
  AUTH.busy = true; authCancelSync(); APP.updateAuthUI();
  let failed = false;
  try {
    const {error} = await AUTH.client.auth.signOut({scope:"local"});
    if (error) failed = true;
  } catch { failed = true; }
  finally {
    // Желі үзілсе де осы құрылғыдағы сессия мен профиль жойылады.
    authStorage.removeItem(AUTH_SESSION_KEY);
    authStorage.removeItem(AUTH_SESSION_KEY + "-code-verifier");
    if (failed) await AUTH.client.auth.signOut({scope:"local"}).catch(() => {});
    await AUTH.client.auth.stopAutoRefresh();
    AUTH.user = null; clearRecovery(); APP.clearLocalProfile();
    AUTH.busy = false;
    authNotify(failed ? "Осы құрылғыдағы тіркелгіден шықтыңыз. Жергілікті профиль тазартылды." : "Тіркелгіден шықтыңыз. Осы браузердегі профиль тазартылды.");
    location.hash = "#profile"; authRefreshProfile();
  }
};
APP.deleteAccount = async () => {
  if (!AUTH.user || AUTH.busy) return false;
  const wasReady = AUTH.ready;
  AUTH.busy = true; authCancelSync(); APP.updateAuthUI();
  try {
    // Бұрын басталған жазулар RPC-ден кейін профильді қайта жасай алмайды.
    await AUTH.writes.catch(() => {});
    const {error} = await AUTH.client.rpc("delete_own_account");
    if (error) throw error;
    await AUTH.client.auth.signOut({scope:"local"}).catch(() => {});
    authStorage.removeItem(AUTH_SESSION_KEY);
    authStorage.removeItem(AUTH_SESSION_KEY + "-code-verifier");
    await AUTH.client.auth.signOut({scope:"local"}).catch(() => {});
    await AUTH.client.auth.stopAutoRefresh();
    AUTH.user = null; clearRecovery(); APP.clearLocalProfile();
    authNotify("Тіркелгі мен профиль өшірілді.");
    return true;
  } catch {
    AUTH.ready = wasReady; AUTH.syncFailed = wasReady;
    authNotify("Тіркелгіні өшіру мүмкін болмады. Байланысты тексеріп, қайта көріңіз."); return false;
  }
  finally { AUTH.busy = false; authRefreshProfile(); }
};

const AUTH_TITLES = {login:"Кіру",register:"Тіркелу",reset:"Құпия сөзді қалпына келтіру","new-password":"Жаңа құпия сөз"};
const AUTH_RETURN_KEY = "dastan.auth.return";
function authInternalHash(value) {
  if (typeof value !== "string" || !/^#[a-z][a-z0-9-]*(?:\/[a-zA-Z0-9_%.-]+)?$/.test(value)) return "#profile";
  const route = value.slice(1).split("/")[0];
  return Object.hasOwn(AUTH_TITLES,route) ? "#profile" : value;
}
function authReturnRoute() {
  let value = AUTH.lastRoute;
  try { value = sessionStorage.getItem(AUTH_RETURN_KEY) || value; sessionStorage.removeItem(AUTH_RETURN_KEY); } catch { /* Жадтағы бағыт жеткілікті. */ }
  return authInternalHash(value);
}
APP.authRoute = route => {
  if (AUTH.callbackRoute) {
    if (route !== AUTH.callbackRoute) return AUTH.callbackRoute;
    AUTH.callbackRoute = null;
  }
  if (Object.hasOwn(AUTH_TITLES,route)) {
    if ((route === "login" || route === "register") && AUTH.user) return "profile";
    try { if (!sessionStorage.getItem(AUTH_RETURN_KEY)) sessionStorage.setItem(AUTH_RETURN_KEY,authInternalHash(AUTH.lastRoute)); } catch { /* Жадтағы бағыт жеткілікті. */ }
    if (route === "login" && AUTH.confirmation?.kind === "register") AUTH.confirmation = null;
    if (route === "register" && AUTH.confirmation?.kind === "login") AUTH.confirmation = null;
  } else {
    AUTH.lastRoute = authInternalHash(location.hash || "#home");
    try { sessionStorage.removeItem(AUTH_RETURN_KEY); } catch { /* Жадтағы бағыт жеткілікті. */ }
  }
  return route;
};
function authCallbackFailure() {
  AUTH.callbackRoute = "login";
  authNotify("Поштаңыз расталған болуы мүмкін. Құпия сөзбен кіріп көріңіз."); location.hash = "#login";
}
function authShell(content) {
  return `<section class="auth-page auth-layout"><div class="auth-art">${imageFigure("assets/heritage/syrmak-pattern.jpg","auth-photo",true)}</div><div class="auth-content">${content}</div></section>`;
}
function authConfirmationHTML() {
  return `<section class="auth-confirmation"><h1>Поштаңызды растаңыз</h1><p>Хат <strong>${esc(AUTH.confirmation.email)}</strong> мекенжайына жіберілді</p><p>Хаттағы сілтемені ашыңыз. Хат көрінбесе, спам бумасын тексеріңіз.</p><button type="button" data-auth-resend>Хатты қайта жіберу</button><p class="fine" data-resend-countdown aria-live="polite"></p><p data-auth-message role="status" aria-live="polite">${esc(AUTH.message)}</p><a href="#login" data-auth-back>Кіру бетіне оралу</a></section>`;
}
function authPage(kind) {
  const title = AUTH_TITLES[kind];
  if (AUTH.user && (kind === "login" || kind === "register")) { location.hash = "#profile"; return ""; }
  if (!AUTH.client) return authShell(`<h1>${esc(title)}</h1><p role="status">Тіркелу әзірге қосылмаған</p><p>Сайтты тіркелмей толық пайдалана аласыз.</p>${routeLink("home","Тіркелмей жалғастыру")}`);
  if (kind === "new-password" && (!AUTH.user || !AUTH.recovery)) return authShell(`<h1>${esc(title)}</h1><p role="status">Жаңа құпия сөз қою үшін поштадағы қалпына келтіру сілтемесін осы браузерде ашыңыз.</p>${routeLink("reset","Қалпына келтіру сілтемесін алу")}`);
  if ((kind === "login" || kind === "register") && AUTH.confirmation?.kind === kind) return authShell(authConfirmationHTML());
  const password = kind !== "reset", email = kind !== "new-password";
  const switches = kind === "login" || kind === "register" ? `<nav class="auth-switch" aria-label="Тіркелгіге кіру тәсілі"><a href="#login"${kind === "login" ? ' aria-current="page"' : ""}>Кіру</a><a href="#register"${kind === "register" ? ' aria-current="page"' : ""}>Тіркелу</a></nav>` : "";
  const pageTitle = {login:"Қош келдіңіз",register:"Тіркелгі ашу"}[kind] || title;
  return authShell(`<h1>${esc(pageTitle)}</h1>${switches}<form id="authForm" class="auth-form" data-auth-kind="${esc(kind)}" novalidate>${email ? '<label for="authEmail">Электрондық пошта</label><input id="authEmail" name="email" type="email" autocomplete="email" inputmode="email" maxlength="254" aria-describedby="authEmailError" required><p id="authEmailError" class="field-error"></p>' : ""}${password ? `<label for="authPassword">Құпия сөз</label><div class="password-control"><input id="authPassword" name="password" type="password" autocomplete="${kind === "login" ? "current-password" : "new-password"}" aria-describedby="authPasswordError${kind === "login" ? "" : " authPasswordHint"}"${kind === "login" ? "" : ' minlength="8"'} required><button type="button" data-password-toggle aria-controls="authPassword" aria-pressed="false">Көрсету</button></div><p id="authPasswordError" class="field-error"></p>${kind === "login" ? '<p><a href="#reset">Құпия сөзді қалпына келтіру</a></p>' : '<p id="authPasswordHint" class="fine">Кемінде 8 таңба.</p>'}` : ""}<button type="submit">${kind === "reset" ? "Сілтеме жіберу" : kind === "new-password" ? "Құпия сөзді сақтау" : title}</button><p data-auth-message role="status" aria-live="polite" aria-atomic="true">${esc(AUTH.message)}</p></form><nav class="auth-actions" aria-label="Басқа әрекеттер">${kind === "reset" ? routeLink("login","Кіру бетіне оралу") : ""}<a href="${esc(authInternalHash(AUTH.lastRoute || "#home"))}">Тіркелмей жалғастыру</a></nav>`);
}
function authRedirect() { return location.origin + location.pathname; }
function authFieldError(form,name,message) {
  const input = form.elements[name], error = document.getElementById(name === "email" ? "authEmailError" : "authPasswordError");
  input?.setAttribute("aria-invalid","true");
  if (error) error.textContent = message;
  AUTH.message = message;
  const status = form.querySelector("[data-auth-message]");
  if (status) status.textContent = "";
  input?.focus();
}
function showAuthConfirmation(email,kind) {
  AUTH.confirmation = {email,kind}; AUTH.resendAt = Date.now() + 60000;
  authNotify("Тіркелуді аяқтау үшін поштаңызды растаңыз.");
  if (APP.route) renderRoute();
}
function updateResendCountdown() {
  clearTimeout(AUTH.resendTimer);
  const button = document.querySelector("[data-auth-resend]"), count = document.querySelector("[data-resend-countdown]");
  if (!button || !AUTH.confirmation) return;
  const remaining = Math.max(0,Math.ceil((AUTH.resendAt-Date.now())/1000));
  button.disabled = remaining > 0;
  if (count) count.textContent = remaining ? `Қайта жіберуге ${remaining} секунд қалды.` : "Хатты қайта жіберуге болады.";
  if (remaining) AUTH.resendTimer = setTimeout(updateResendCountdown,1000);
}
async function resendConfirmation() {
  if (!AUTH.confirmation || Date.now() < AUTH.resendAt || AUTH.resending) return;
  AUTH.resending = true; AUTH.resendAt = Date.now()+60000; updateResendCountdown();
  try {
    const {error} = await AUTH.client.auth.resend({type:"signup",email:AUTH.confirmation.email,options:{emailRedirectTo:authRedirect()}});
    if (error) throw error;
    authNotify("Растау хаты қайта жіберілді. Пошта мен спам бумасын тексеріңіз.");
  } catch (error) { authNotify(authError(error)); }
  finally { AUTH.resending = false; updateResendCountdown(); }
}
function mountAuthForm() {
  updateResendCountdown();
  const form = document.getElementById("authForm");
  if (!form) return;
  form.addEventListener("submit",async event => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    if (button.disabled) return;
    const kind = form.dataset.authKind, email = form.elements.email?.value.trim();
    const password = form.elements.password?.value;
    for (const name of ["email","password"]) {
      form.elements[name]?.removeAttribute("aria-invalid");
      const error = document.getElementById(name === "email" ? "authEmailError" : "authPasswordError");
      if (error) error.textContent = "";
    }
    if (form.elements.email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) { authFieldError(form,"email","Пошта мекенжайын дұрыс енгізіңіз."); return; }
    if (form.elements.password && (!password || (kind !== "login" && Array.from(password).length < 8))) { authFieldError(form,"password",kind === "login" ? "Құпия сөзді енгізіңіз." : "Құпия сөз кемінде 8 таңба болсын."); return; }
    button.disabled = true; form.setAttribute("aria-busy","true");
    const status = form.querySelector("[data-auth-message]"); status.textContent = "Өңделуде…";
    try {
      let result;
      if (kind === "login" || kind === "register") AUTH.client.auth.startAutoRefresh();
      if (kind === "login") result = await AUTH.client.auth.signInWithPassword({email,password});
      if (kind === "register") result = await AUTH.client.auth.signUp({email,password,options:{emailRedirectTo:authRedirect()}});
      if (kind === "reset") result = await AUTH.client.auth.resetPasswordForEmail(email,{redirectTo:authRedirect()});
      if (kind === "new-password") result = await AUTH.client.auth.updateUser({password});
      if (result.error) throw result.error;
      if (kind === "reset") authNotify("Егер бұл мекенжай тіркелген болса, қалпына келтіру сілтемесі жіберіледі. Поштаңызды тексеріңіз.");
      else if (kind === "register" && !result.data.session) showAuthConfirmation(email,kind);
      else if (kind === "new-password") {
        clearRecovery(); authNotify("Құпия сөз жаңартылды."); location.hash = "#profile";
      } else {
        AUTH.confirmation = null;
        await authSession(result.data.session);
        if (!AUTH.localOnly) authNotify("Тіркелгіге кірдіңіз."); location.hash = authReturnRoute();
      }
    } catch (error) {
      // Қалпына келтіру жауабы тіркелгінің бар-жоғын ашпайды.
      if (kind === "reset") {
        if (error?.status === 429 || /rate_limit/.test(error?.code || "")) authNotify("Әрекет тым көп. Біраздан кейін қайталаңыз.");
        else if (!error?.status || error.status >= 500 || /fetch|network/i.test(error?.message || "")) authNotify("Байланыс орнатылмады. Желіні тексеріп, қайта көріңіз.");
        else authNotify("Егер бұл мекенжай тіркелген болса, қалпына келтіру сілтемесі жіберіледі. Поштаңызды тексеріңіз.");
      } else if (kind === "login" && (error?.code === "email_not_confirmed" || /email not confirmed/i.test(error?.message || ""))) showAuthConfirmation(email,kind);
      else {
        const message = authError(error), code = error?.code || "";
        if (/invalid_credentials|weak_password|same_password/.test(code) || /password|invalid login|invalid credentials/i.test(error?.message || "")) authFieldError(form,"password",message);
        else if (/email|validation_failed/.test(code)) authFieldError(form,"email",message);
        else authNotify(message);
      }
    } finally {
      if (form.elements.password) form.elements.password.value = "";
      button.disabled = false; form.removeAttribute("aria-busy");
    }
  });
}
for (const [kind,title] of Object.entries(AUTH_TITLES)) VIEWS[kind] = {title,render:() => authPage(kind),mount:mountAuthForm};
document.addEventListener("click",event => {
  const reveal = event.target.closest("[data-password-toggle]");
  if (reveal) {
    const input = document.getElementById("authPassword"), visible = input.type === "password";
    input.type = visible ? "text" : "password";
    reveal.setAttribute("aria-pressed",String(visible)); reveal.textContent = visible ? "Жасыру" : "Көрсету";
  }
  if (event.target.closest("[data-auth-resend]")) resendConfirmation();
  if (event.target.closest("[data-auth-back]")) { AUTH.confirmation = null; AUTH.message = ""; if (location.hash === "#login") renderRoute(); }
  if (event.target.closest("[data-auth-logout]")) APP.signOut();
  if (event.target.closest("[data-auth-retry]") && !AUTH.loading && !AUTH.busy && !AUTH.localOnly) {
    if (AUTH.ready) APP.queueProfileSync();
    else loadCloudProfile(AUTH.epoch).then(authRefreshProfile);
  }
});
window.addEventListener("online",() => {
  if (AUTH.user && !AUTH.loading && !AUTH.busy && !AUTH.localOnly) {
    if (AUTH.ready) APP.queueProfileSync();
    else loadCloudProfile(AUTH.epoch).then(authRefreshProfile);
  }
});

// Басқа қойындыда, соның ішінде желісіз шығу кезінде, жадтағы көшірмені де тазалаймыз.
window.addEventListener("storage",event => {
  if (event.key === AUTH_SESSION_KEY || event.key === null) {
    authMemory.delete(AUTH_SESSION_KEY);
    if (!event.newValue && !AUTH.initializing) authSession(null).catch(() => {});
  }
});
