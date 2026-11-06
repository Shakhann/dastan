"use strict";
const assert = require("node:assert/strict");
const LAB = require("../js/lab.js");
const golden = `бала: балалар баланың балаға баланы балада баладан баламен
үй: үйлер үйдің үйге үйді үйде үйден үймен
кітап: кітаптар кітаптың кітапқа кітапты кітапта кітаптан кітаппен
ел: елдер елдің елге елді елде елден елмен
қазақ: қазақтар қазақтың қазаққа қазақты қазақта қазақтан қазақпен
дастан: дастандар дастанның дастанға дастанды дастанда дастаннан дастанмен
тіл: тілдер тілдің тілге тілді тілде тілден тілмен
мектеп: мектептер мектептің мектепке мектепті мектепте мектептен мектеппен
ат: аттар аттың атқа атты атта аттан атпен
қала: қалалар қаланың қалаға қаланы қалада қаладан қаламен
көз: көздер көздің көзге көзді көзде көзден көзбен
қыз: қыздар қыздың қызға қызды қызда қыздан қызбен
жер: жерлер жердің жерге жерді жерде жерден жермен
тау: таулар таудың тауға тауды тауда таудан таумен
дәптер: дәптерлер дәптердің дәптерге дәптерді дәптерде дәптерден дәптермен
адам: адамдар адамның адамға адамды адамда адамнан адаммен`;
for(const line of golden.split("\n")) { const [word,forms]=line.split(": "); const d=LAB.decline(word);assert.equal([d.plural,...d.cases.slice(1)].map(x=>x.text).join(" "),forms,word); assert.equal(d.cases[0].text,word); for(const f of [d.plural,...d.cases,...d.possessives]) { assert.equal(f.root+f.suffix,f.text);assert.ok(f.rule); } }
for(const [word,forms] of Object.entries({бала:"балам балаң балаңыз баласы",кітап:"кітабым кітабың кітабыңыз кітабы",мектеп:"мектебім мектебің мектебіңіз мектебі",қазақ:"қазағым қазағың қазағыңыз қазағы",үй:"үйім үйің үйіңіз үйі"})) assert.equal(LAB.decline(word).possessives.map(x=>x.text).join(" "),forms);
for(const x of ["", "  ","123","кітап2","hello","екі сөз","<img>","бала!",null]) assert.ok(LAB.decline(x).error);
assert.equal(LAB.decline("  бала  ").word,"бала");
assert.equal(LAB.decline("Абай").cases[1].text,"Абайдың");
assert.equal(LAB.decline("КІТАП").possessives[0].root,"КІТАБ");
assert.equal(LAB.harmony("би"),true);assert.equal(LAB.harmony("қи"),true);assert.equal(LAB.harmony("тау"),false);assert.equal(LAB.harmony("жазу"),false);assert.equal(LAB.harmony("оқи"),false);
for(const [word,result] of Object.entries({дастан:"dastan",қазақ:"qazaq",тіл:"tıl",шежіре:"şejıre",ұлт:"ūlt",өнер:"öner"})) assert.equal(LAB.latin(word),result);
assert.equal(LAB.latin("И І Ә Ё Щ Ц Ч Ю Я Э Ь Ъ"),"İ I Ä Io Ş Ts Ç Iu Ia E  ");
for(const [word,result] of Object.entries({дастан:"داستان",қазақ:"قازاق",тіл:"ٴتىل",бала:"بالا"})) assert.equal(LAB.tote(word),result);
assert.equal(LAB.tote("ТІЛ, бала!"),"ٴتىل, بالا!");assert.equal(LAB.tote("өнер").startsWith("ٴ"),false);assert.equal(LAB.tote("әңгіме").startsWith("ٴ"),false);assert.equal(LAB.tote("көл").startsWith("ٴ"),true);
assert.ok(LAB.stems("Абайдың").includes("абай"));assert.ok(LAB.stems("балаларға").includes("бала"));
assert.equal((LAB.keyboard("word").match(/data-kazakh-key=/g)||[]).length,9);
console.log("LAB tests passed: all golden morphology and alphabet tables, validation, harmony and search roots.");
// Run the browser adapter without a browser; functions above stay DOM-independent.
const vm=require("node:vm"),fs=require("node:fs");
const listeners={},messages=[],nodes={};
const document={addEventListener:(name,fn)=>{listeners[name]=fn;},getElementById:id=>nodes[id],body:{append(){}},createElement:()=>({style:{},setAttribute(){},select(){},remove(){document.removed=true;}}),execCommand:()=>true};
const context={document,navigator:{},APP:{toast:s=>messages.push(s)},VIEWS:{},esc:s=>String(s).replaceAll("<","&lt;"),heading:()=>"",Event:class {constructor(type){this.type=type;}}};
vm.runInNewContext(fs.readFileSync(require.resolve("../js/lab.js"),"utf8"),context);
const lab=context.VIEWS.lab;
const input=(value)=>({value,maxLength:80,selectionStart:1,selectionEnd:3,addEventListener(name,fn){this[name]=fn;},setRangeText(s,start,end){this.value=this.value.slice(0,start)+s+this.value.slice(end);},focus(){this.focused=true;},dispatchEvent(e){this.event=e;}});
nodes.labWord=input("кітап");nodes.labText=input("тіл");for(const id of ["labForms","labCyr","labLatin","labArab"]) nodes[id]={};
lab.mount();assert.match(nodes.labForms.innerHTML,/кітаб/);assert.equal(nodes.labLatin.textContent,"tıl");assert.equal(nodes.labArab.textContent,"ٴتىل");
nodes.labWord.value="123";nodes.labWord.input();assert.match(nodes.labForms.innerHTML,/кирилл/);
nodes.labText.value="қазақ";nodes.labText.input();assert.equal(nodes.labLatin.textContent,"qazaq");
const key={dataset:{input:"labWord",kazakhKey:"ә"}};
const click=button=>listeners.click({target:{closest:selector=>selector==="[data-kazakh-key]" ? button : null}});
nodes.labWord.value="кітап";click(key);assert.equal(nodes.labWord.value,"кәап");assert.equal(nodes.labWord.event.type,"input");assert.ok(nodes.labWord.focused);
nodes.labWord.disabled=true;click(key);assert.equal(nodes.labWord.value,"кәап");
(async()=>{
 const copy={dataset:{labCopy:"labLatin"},focus(){this.focused=true;}};
 const event={target:{closest:selector=>selector==="[data-lab-copy]" ? copy : null}};
 await listeners.click(event);assert.equal(messages.at(-1),"Мәтін көшірілді.");assert.ok(document.removed);assert.ok(copy.focused);
 context.navigator.clipboard={writeText:async()=>{throw Error("denied");}};document.removed=false;
 await listeners.click(event);assert.equal(messages.at(-1),"Мәтін көшірілді.");assert.ok(document.removed);
 document.execCommand=()=>false;await listeners.click(event);assert.match(messages.at(-1),/мүмкін болмады/);assert.ok(document.removed);
 console.log("LAB browser adapter passed: live mount, cursor selection, disabled fields, clipboard fallback and cleanup.");
})().catch(error=>{console.error(error);process.exitCode=1;});

for(const [word,root] of Object.entries({кітабым:"кітап",қазағыңыз:"қазақ",мектебің:"мектеп",жүрегім:"жүрек"})) assert.ok(LAB.stems(word).includes(root),word);
assert.equal(LAB.harmony("оқии"),false);assert.ok(LAB.decline("а".repeat(81)).error);
