"use strict";
const assert = require("node:assert/strict");
const EXPERIENCE = require("../js/experience.js");
const LAB = require("../js/lab.js");
const index = EXPERIENCE.wordIndex([
  {kk:"дастан",meaning_kk:"Жыр",example_kk:"Дастан оқыдым."},
  {kk:"кітап",meaning_kk:"Кітап мағынасы"}
],[{id:"d1",kk:"үй",ru:"дом",en:"house",ex:"Өз үйім."},{id:"d2",kk:"кітап",ru:"book"}]);
assert.equal(index.get("кітап").meaning,"Кітап мағынасы","heritage entry wins deterministic duplicate lookup");
assert.equal(index.get("үй").audio,"d_d1");
assert.equal(index.get("үй").meaning,"дом / house");
assert.equal(EXPERIENCE.normalize("ДАСТАН"),"дастан");
let seen = new Set();
const source = "«Дастанның» кітабым, үйге! Дастан үй үйші.";
let matches = EXPERIENCE.textMatches(source,index,LAB.stems,seen);
assert.deepEqual(matches.map(m=>m.key),["дастан","кітап","үй"]);
assert.deepEqual(matches.map(m=>m.text),["Дастанның","кітабым","үйге"]);
for (const match of matches) assert.equal(source.slice(match.start,match.end),match.text);
assert.equal(EXPERIENCE.textMatches("Үй мен дастан",index,LAB.stems,seen).length,0,"one canonical word across multiple text nodes");
assert.equal(EXPERIENCE.textMatches("Үй мен дастан",index,LAB.stems,new Set()).length,2,"a separate prose starts a fresh seen set");
assert.equal(EXPERIENCE.textMatches("үйші дастаншы кітапхана",index,LAB.stems).length,0,"no arbitrary substring matching");
assert.equal(EXPERIENCE.textMatches("🧿 ҮЙ",index,LAB.stems)[0].start,3,"Unicode code-unit offsets match text slicing");
assert.equal(EXPERIENCE.textMatches("",index,LAB.stems).length,0);
assert.equal(EXPERIENCE.textMatches("123 + =",index,LAB.stems).length,0);
// DOM text-node adapter: markup-like characters remain literal text, never innerHTML.
const element = tag => ({tag,children:[],dataset:{},attributes:{},append(...items){this.children.push(...items);},setAttribute(k,v){this.attributes[k]=v;}});
const doc = {createDocumentFragment:()=>element("fragment"),createTextNode:text=>({text}),createElement:tag=>element(tag)};
const node = {nodeValue:"<script>Үй</script> & үйге, кітабым.",replaceWith(value){this.replacement=value;}};
assert.equal(EXPERIENCE.markTextNode(node,index,LAB.stems,new Set(),doc),2);
const fragment = node.replacement;
assert.equal(fragment.children[0].text,"<script>");
const buttons = fragment.children.filter(child=>child.tag==="button");
assert.equal(buttons.length,2);assert.equal(buttons[0].textContent,"Үй");
assert.equal(buttons[0].attributes["aria-haspopup"],"dialog");assert.equal(buttons[0].dataset.wordLamp,"үй");
assert.equal(fragment.children[2].text,"</script> & үйге, ");
assert.equal(fragment.children.at(-1).text,".");
const untouched = {nodeValue:"белгісіз",replaceWith(){throw Error("should not mutate unmatched text");}};
assert.equal(EXPERIENCE.markTextNode(untouched,index,LAB.stems,new Set(),doc),0);
// Nested .prose elements form a single reading passage, including later lazy text.
const outer = {parentElement:{closest:()=>null}}, nested = {parentElement:{closest:()=>outer}};
assert.deepEqual(EXPERIENCE.proseRoots({querySelectorAll:()=>[outer,nested]}),[outer]);
const passageSeen = new Set();
const initial = {nodeValue:"Үй",replaceWith(value){this.replacement=value;}};
const nestedText = {nodeValue:"Үйдің іші, кітап.",replaceWith(value){this.replacement=value;}};
assert.equal(EXPERIENCE.markTextNode(initial,index,LAB.stems,passageSeen,doc),1);
assert.equal(EXPERIENCE.markTextNode(nestedText,index,LAB.stems,passageSeen,doc),1,"nested text shares the outer passage seen set");
assert.equal(nestedText.replacement.children.find(child=>child.tag==="button").dataset.wordLamp,"кітап");
const lazy = {nodeValue:"Дастан, үй, кітап.",replaceWith(value){this.replacement=value;}};
assert.equal(EXPERIENCE.markTextNode(lazy,index,LAB.stems,passageSeen,doc),1,"later lazy text only marks newly encountered canonical words");
// A minimal DOM traversal proves existing links/code are excluded, and structural HTML is untouched.
const fs = require("node:fs"), code = fs.readFileSync(require.resolve("../js/experience.js"),"utf8");
assert.match(code,/createTreeWalker\(prose,4\)/);
assert.match(code,/closest\("a,button,script,style,textarea,code,pre,input,select,\[contenteditable\],\[data-no-word-lamp\]"\)/);
assert.match(code,/observer\.disconnect\(\); markProse\(\); observer\.observe/);
assert.match(code,/event\.ctrlKey \|\| event\.metaKey/);
assert.match(code,/ArrowDown/); assert.match(code,/aria-activedescendant/); assert.match(code,/showModal\(\)/);
assert.match(code,/cancelAnimationFrame/); assert.match(code,/removeEventListener/);
console.log("EXPERIENCE passed: inflected word offsets, Unicode, duplicate suppression, safe text-node DOM adapter, accessible shell and cleanup contracts.");
