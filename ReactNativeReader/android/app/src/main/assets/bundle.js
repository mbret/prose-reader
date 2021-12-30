/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/@oboku/reader/dist/index.js":
/*!**************************************************!*\
  !*** ./node_modules/@oboku/reader/dist/index.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

(()=>{"use strict";var e={d:(t,n)=>{for(var i in n)e.o(n,i)&&!e.o(t,i)&&Object.defineProperty(t,i,{enumerable:!0,get:n[i]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}},t={};e.r(t),e.d(t,{Report:()=>s,composeEnhancer:()=>c,createReader:()=>oe});const n=__webpack_require__(/*! rxjs */ "./node_modules/rxjs/dist/esm5/index.js"),i=__webpack_require__(/*! rxjs/operators */ "./node_modules/rxjs/dist/esm5/operators/index.js"),o="@oboku/reader",r=e=>`[${e}]`,a=e=>({log:(...t)=>{window.__OBOKU_READER_DEBUG&&(e?console.log(r(o),r(e),...t):console.log(r(o),...t))},warn:(...t)=>{window.__OBOKU_READER_DEBUG&&(e?console.warn(r(o),r(e),...t):console.warn(r(o),...t))},error:(...e)=>{console.error(...e)},time:e=>{window.__OBOKU_READER_DEBUG&&console.time(`[prose-reader\] [metric] ${e}`)},timeEnd:e=>{window.__OBOKU_READER_DEBUG&&console.timeEnd(`[prose-reader\] [metric] ${e}`)},metric:(e,t=1/0)=>{const n="number"==typeof e?e:e.duration;window.__OBOKU_READER_DEBUG&&(e.duration<=t?console.log("[prose-reader\] [metric] ",`${e.name} took ${n}ms`):console.warn("[prose-reader\] [metric] ",`${e.name} took ${e.duration}ms which is above the ${t}ms target for this function`))},measurePerformance:(e,t=10,n,{disable:i}={})=>i?n:(...i)=>{const o=performance.now(),r=n(...i);if(r&&r.then)return r.then((n=>{const i=performance.now();return s.metric({name:e,duration:i-o},t),n}));const a=performance.now();return s.metric({name:e,duration:a-o},t),r}}),s=Object.assign(Object.assign({},a()),{namespace:e=>a(e)}),d=(e,t)=>t.reduce(((t,n)=>{const i=n.path.indexOf("#"),o=i>0?n.path.substr(0,i):n.path;if(e.endsWith(o))return{title:n.title,path:n.path};const r=d(e,n.contents);return r?{subChapter:r,title:n.title,path:n.path}:t}),void 0),l=(e,t,n,i)=>{var o,r,a,s;const d=(null===(o=e.getManifest())||void 0===o?void 0:o.readingOrder.length)||0,l=(null===(r=e.getManifest())||void 0===r?void 0:r.readingOrder.slice(0,t).reduce(((e,t)=>e+t.progressionWeight),0))||0,g=(null===(s=null===(a=e.getManifest())||void 0===a?void 0:a.readingOrder[t])||void 0===s?void 0:s.progressionWeight)||0;return t===d-1&&i===n-1?1:l+(i+1)*(g/n)},g=[{name:"bright",backgroundColor:"white"},{name:"sepia",backgroundColor:"#eaddc7",foregroundColor:"black"},{name:"night",backgroundColor:"black",foregroundColor:"white"}];function c(...e){return function(...e){return 0===e.length?e=>e:1===e.length?e[0]:e.reduce(((e,t)=>(...n)=>e(t(...n))))}(...e)}var u=Node.ELEMENT_NODE,m=Node.TEXT_NODE,f=Node.CDATA_SECTION_NODE;function h(e,t,n){var i,o,r,a=0,s=0,d=!0;for(o=0;o<e.length;o++)if((r=e[o]).nodeType===u){if(i||d?(a+=2,d=!1):a++,t===r)return"img"===r.tagName.toLowerCase()?{count:a,offset:n}:{count:a};s=0,i=!0}else{if(r.nodeType!==m&&r.nodeType!==f)continue;if((i||d)&&(a++,d=!1),t===r)return{count:a,offset:n+s};s+=r.textContent.length,i=!1}throw new Error("The specified node was not found in the array of siblings")}function p(e,t){const n="number"==typeof e,i="number"==typeof t;return n||i?!n&&i?-1:n&&!i?1:(e||0)-(t||0):0}function v(e,t){return e||t?!e&&t?-1:e&&!t?1:(e.y||0)-(t.y||0)||(e.x||0)-(t.x||0):0}class y{constructor(e,t){this.isRange=!1,this.opts=Object.assign({flattenRange:!1,stricter:!0},t||{}),this.cfi=e,this.parts=[];const n=new RegExp(/^epubcfi\((.*)\)$/);var i=(e=e.trim()).match(n);if(!i)throw new Error("Not a valid CFI");if(!(i.length<2)){var o,r,a;e=i[1]||"";for(var s=[],d=0;e.length;){if(({parsed:o,offset:r,newDoc:a}=this.parse(e)),!o||null===r)throw new Error("Parsing failed");if(d&&a)throw new Error("CFI is a range that spans multiple documents. This is not allowed");s.push(o),(a||e.length-r<=0)&&(2===d?this.to=s:this.parts.push(s),s=[]),","===(e=e.slice(r))[0]&&(0===d?(s.length&&this.parts.push(s),s=[]):1===d&&(s.length&&(this.from=s),s=[]),e=e.slice(1),d++)}this.from&&this.from.length&&(!this.opts.flattenRange&&this.to&&this.to.length?this.isRange=!0:(this.parts=this.parts.concat(this.from),delete this.from,delete this.to)),this.opts.stricter&&this.removeIllegalOpts()}}removeIllegalOpts(e){if(!e)if(this.from){if(this.removeIllegalOpts(this.from),!this.to)return;e=this.to}else e=this.parts;var t,n,i,o;for(t=0;t<e.length;t++)for(i=e[t],n=0;n<i.length-1;n++)delete(o=i[n]).temporal,delete o.spatial,delete o.offset,delete o.textLocationAssertion}static generatePart(e,t,n){for(var i,o="";e.parentNode;)i=h(e.parentNode.childNodes,e,t),!o&&i.offset&&(o=":"+i.offset),o="/"+i.count+(e.id?"["+e.id.replace(/[\[\]\^,();]/g,"^$&")+"]":"")+o,e=e.parentNode;return o}static generate(e,t,n){var i;if(Array.isArray(e)){var o=[];for(let t of e)o.push(this.generatePart(t.node,t.offset,n));i=o.join("!")}else i=this.generatePart(e,t,n);return n&&(i+=n),"epubcfi("+i+")"}static toParsed(e){return"string"==typeof e&&(cif=new this(e)),e.isRange?e.getFrom():e.get()}static comparePath(e,t){const n=Math.max(e.length,t.length);var i,o,r,a;for(i=0;i<n;i++){if(o=e[i],r=t[i],!o)return-1;if(!r)return 1;if(a=this.compareParts(o,r))return a}return 0}static sort(e){e.sort(((e,t)=>this.compare(e,t)))}static compare(e,t){var n=e.get(),i=t.get();return e.isRange||t.isRange?e.isRange&&t.isRange?this.comparePath(n.from,i.from)||this.comparePath(n.to,i.to):(e.isRange&&(n=n.from),t.isRange&&(i=i.from),this.comparePath(n,i)):this.comparePath(n,i)}static compareParts(e,t){const n=Math.max(e.length,t.length);var i,o,r,a;for(i=0;i<n;i++){if(o=e[i],r=t[i],!o)return-1;if(!r)return 1;if(a=o.nodeIndex-r.nodeIndex)return a;if(0===o.nodeIndex)return 0;if(!(i<n-1)){if(o.nodeIndex%2==0){if(a=p(o.temporal,r.temporal))return a;if(a=v(o.spatial,r.spatial))return a}if(a=(o.offset||0)-(r.offset||0))return a}}return 0}decodeEntities(e,t){try{const n=e.createElement("textarea");return n.innerHTML=t,n.value||""}catch(e){return t}}trueLength(e,t){return this.decodeEntities(e,t).length}getFrom(){if(!this.isRange)throw new Error("Trying to get beginning of non-range CFI");if(!this.from)return this.deepClone(this.parts);const e=this.deepClone(this.parts);return e[e.length-1]=e[e.length-1].concat(this.from),e}getTo(){if(!this.isRange)throw new Error("Trying to get end of non-range CFI");const e=this.deepClone(this.parts);return e[e.length-1]=e[e.length-1].concat(this.to),e}get(){return this.isRange?{from:this.getFrom(),to:this.getTo(),isRange:!0}:this.deepClone(this.parts)}parseSideBias(e,t){if(!t)return;const n=t.trim().match(/^(.*);s=([ba])$/);!n||n.length<3?"object"==typeof e.textLocationAssertion?e.textLocationAssertion.post=t:e.textLocationAssertion=t:(n[1]&&("object"==typeof e.textLocationAssertion?e.textLocationAssertion.post=n[1]:e.textLocationAssertion=n[1]),"a"===n[2]?e.sideBias="after":e.sideBias="before")}parseSpatialRange(e){if(!e)return;const t=e.trim().match(/^([\d\.]+):([\d\.]+)$/);if(!t||t.length<3)return;const n={x:parseInt(t[1]),y:parseInt(t[2])};return"number"==typeof n.x&&"number"==typeof n.y?n:void 0}parse(e){var t={};const n=new RegExp(/[\d]/);var i,o,r,a,s,d,l=!1,g=!1;for(d=0;d<=e.length;d++)if("^"!==(a=d<e.length?e[d]:"")||s){if("/"===o){if(a.match(n)){i?i+=a:i=a,s=!1;continue}i&&(t.nodeIndex=parseInt(i),i=null),r=o,o=null}if(":"===o){if(a.match(n)){i?i+=a:i=a,s=!1;continue}i&&(t.offset=parseInt(i),i=null),r=o,o=null}if("@"===o){let e=!1;if(a.match(n)||"."===a||":"===a?":"===a&&(l?e=!0:l=!0):e=!0,!e){i?i+=a:i=a,s=!1;continue}r=o,o=null,i&&l&&(t.spatial=this.parseSpatialRange(i)),i=null}if("~"===o){if(a.match(n)||"."===a){i?i+=a:i=a,s=!1;continue}i&&(t.temporal=parseFloat(i)),r=o,o=null,i=null}if(!o){if("!"===a){d++,o=a;break}if(","===a)break;if("/"===a){if(g)break;g=!0,r=o,o=a,s=!1;continue}if(":"===a||"~"===a||"@"===a){if(this.opts.stricter){if(":"===a&&(void 0!==t.temporal||void 0!==t.spatial))break;if(("~"===a||"@"===a)&&void 0!==t.offset)break}r=o,o=a,s=!1,l=!1;continue}if("["===a&&!s&&":"===r){r=o,o="[",s=!1;continue}if("["===a&&!s&&"/"===r){r=o,o="nodeID",s=!1;continue}}"["!==o?("nodeID"!==o||("]"!==a||s?i?i+=a:i=a:(r=o,o=null,t.nodeID=i,i=null)),s=!1):("]"!==a||s?","!==a||s?i?i+=a:i=a:(t.textLocationAssertion={},i&&(t.textLocationAssertion.pre=i),i=null):(r=o,o=null,this.parseSideBias(t,i),i=null),s=!1)}else s=!0;if(!t.nodeIndex&&0!==t.nodeIndex)throw new Error("Missing child node index in CFI");return{parsed:t,offset:d,newDoc:"!"===o}}getChildNodeByCFIIndex(e,t,n,i){const o=t.childNodes;if(!o.length)return{node:t,offset:0};if(n<=0)return{node:o[0],relativeToNode:"before",offset:0};var r,a,s,d=0;for(a=0;a<o.length;a++)switch((s=o[a]).nodeType){case u:if(d%2==0){if((d+=2)>=n)return"img"===s.tagName.toLowerCase()&&i?{node:s,offset:i}:{node:s,offset:0}}else{if((d+=1)===n)return"img"===s.tagName.toLowerCase()&&i?{node:s,offset:i}:{node:s,offset:0};if(d>n)return r?{node:r,offset:this.trueLength(e,r.textContent)}:{node:t,offset:0}}r=s;break;case m:case f:if(0!==d&&d%2!=0||(d+=1),d===n){let t=this.trueLength(e,s.textContent);if(!(i>=t))return{node:s,offset:i};i-=t}r=s;break;default:continue}if(n>d){var l={relativeToNode:"after",offset:0};return l.node=r||t,this.isTextNode(l.node)&&(l.offset=this.trueLength(e,l.node.textContent.length)),l}}isTextNode(e){return!!e&&(e.nodeType===m||e.nodeType===f)}correctOffset(e,t,n,i){var o=t;if("string"==typeof i)var r=this.decodeEntities(e,i);else i.pre=this.decodeEntities(e,i.pre),i.post=this.decodeEntities(e,i.post),r=i.pre+"."+i.post;if(!this.isTextNode(t))return{node:t,offset:0};for(;this.isTextNode(o.previousSibling);)o=o.previousSibling;const a=o;var s;const d=[];for(var l="",g=0;this.isTextNode(o)&&(s=this.decodeEntities(e,o.textContent),d[g]=s.length,l+=s,o.nextSibling);)o=o.nextSibling,g++;const c=i.pre?i.pre.length:0,u=function(e,t,n){n=n||0;var i,o=[],r=0;do{if(!(i=e.match(t)))break;o.push(i.index+n),r+=i.index+i.length,e=e.slice(i.index+i.length)}while(r<e.length);return o}(l,new RegExp(r),c);if(!u.length)return{node:t,offset:n};var m=function(e,t){var n,i,o,r;for(o=0;o<e.length;o++)r=Math.abs(e[o]-t),(!o||r<n)&&(r=n,i=e[o]);return i}(u,n);if(o===t&&m===n)return{node:t,offset:n};for(g=0,o=a;m>=d[g];){if((m-=d[g])<0)return{node:t,offset:n};if(!o.nextSibling||g+1>=nodeOffsets.length)return{node:t,offset:n};g++,o=o.nextSibling}return{node:o,offset:m}}resolveNode(e,t,n,i){if(i=Object.assign({},i||{}),!n)throw new Error("Missing DOM argument");var o;if(0===e&&(o=n.querySelector("package")),!o)for(let e of n.childNodes)if(e.nodeType===u){o=e;break}if(!(o=n))throw new Error("Document incompatible with CFIs");var r,a=o,s=0;let d;for(r=t.length-1;r>=0;r--)if(d=t[r],!i.ignoreIDs&&d.nodeID&&(a=n.getElementById(d.nodeID))){s=r+1;break}a||(a=o);var l={node:a,offset:0};for(r=s;r<t.length;r++)d=t[r],d&&(l=this.getChildNodeByCFIIndex(n,l.node,d.nodeIndex,d.offset),d.textLocationAssertion&&(l=this.correctOffset(n,l.node,d.offset,d.textLocationAssertion)));return l}resolveURI(e,t,n){if(n=n||{},e<0||e>this.parts.length-2)throw new Error("index is out of bounds");const i=this.parts[e];if(!i)throw new Error("Missing CFI part for index: "+e);var o=this.resolveNode(e,i,t,n).node;const r=o.tagName.toLowerCase();if("itemref"===r&&"spine"===o.parentNode.tagName.toLowerCase()){const e=o.getAttribute("idref");if(!e)throw new Error("Referenced node had not 'idref' attribute");if(!(o=t.getElementById(e)))throw new Error("Specified node is missing from manifest");const n=o.getAttribute("href");if(!n)throw new Error("Manifest item is missing href attribute");return n}if("iframe"===r||"embed"===r){const e=o.getAttribute("src");if(!e)throw new Error(r+" element is missing 'src' attribute");return e}if("object"===r){const e=o.getAttribute("data");if(!e)throw new Error(r+" element is missing 'data' attribute");return e}if("image"===r||"use"===r){const e=o.getAttribute("xlink:href");if(!e)throw new Error(r+" element is missing 'xlink:href' attribute");return e}throw new Error("No URI found")}deepClone(e){return JSON.parse(JSON.stringify(e))}resolveLocation(e,t){const n=t.length-1,i=t[n];if(!i)throw new Error("Missing CFI part for index: "+n);var o=this.resolveNode(n,i,e),r=this.deepClone(i[i.length-1]);return delete r.nodeIndex,r.offset||delete o.offset,Object.assign(Object.assign({},r),o)}resolveLast(e,t){if(t=Object.assign({range:!1},t||{}),!this.isRange)return this.resolveLocation(e,this.parts);if(t.range){const t=e.createRange(),n=this.getFrom();"before"===n.relativeToNode?t.setStartBefore(n.node,n.offset):"after"===n.relativeToNode?t.setStartAfter(n.node,n.offset):t.setStart(n.node,n.offset);const i=this.getTo();return"before"===i.relativeToNode?t.setEndBefore(i.node,i.offset):"after"===i.relativeToNode?t.setEndAfter(i.node,i.offset):t.setEnd(i.node,i.offset),t}return{from:this.resolveLocation(e,this.getFrom()),to:this.resolveLocation(e,this.getTo()),isRange:!0}}resolve(e,t){return this.resolveLast(e,t)}}const b=e=>{var t,n;const[i]=(null===(t=e.match(/\|(\[oboku\~anchor[^\]]*\])+/gi))||void 0===t?void 0:t.map((e=>e.replace(/\|\[oboku\~anchor\~/,"").replace(/\]/,""))))||[],[o]=(null===(n=e.match(/\|(\[oboku\~offset[^\]]*\])+/gi))||void 0===n?void 0:n.map((e=>e.replace(/\|\[oboku\~offset\~/,"").replace(/\]/,""))))||[],r=e.replace(/\|(\[oboku\~[^\]]*\~[^\]]*\])+/gi,""),a=parseInt(o||"");return{cleanedCfi:r,itemId:i?decodeURIComponent(i):i,offset:isNaN(a)?void 0:a}},x=s.measurePerformance("getFirstVisibleNodeForViewport",1,((e,t)=>{const n=w("body"in e?e.body:e,t),i="createRange"in e?e:e.ownerDocument;if(n){let e,o=0;const r=i.createRange();return Array.from(n.childNodes).some((n=>{r.selectNodeContents(n);const a=function(e,t){return Array.from(e).find((e=>{const n=I(e,t);return"before"!==n&&"after"!==n}))}(r.getClientRects(),t);if(a){e=r.cloneRange();const t=(s=i,d=Math.ceil(a.left),l=Math.ceil(a.top),void 0!==s.caretPositionFromPoint?s.caretPositionFromPoint(d,l):void 0!==s.caretRangeFromPoint?s.caretRangeFromPoint(d,l):void 0);return t&&"startContainer"in t&&t.startContainer===e.startContainer&&(o=t.startOffset),t&&"offsetNode"in t&&t.offsetNode===e.startContainer&&(o=t.offset),!0}var s,d,l;return!1})),e?{node:e.startContainer,offset:o}:{node:n,offset:0}}})),w=(e,t)=>{let n;const i=I(e.getBoundingClientRect(),t);return"before"!==i&&"after"!==i&&(n=e),Array.from(e.children).some((e=>{const i=w(e,t);return!!i&&(n=i,!0)})),n};function I(e,{left:t,right:n}){return e.left<=t&&e.right<=t?"before":e.left<=t&&e.right>t&&e.right<=n?"partially-before":e.left<=n&&e.right>n?"partially-after":e.left>n?"after":"within"}const P=e=>{var t,n,i,o,r,a,s,d,l;if((null===(t=e)||void 0===t?void 0:t.target)&&(null===(i=null===(n=null==e?void 0:e.target)||void 0===n?void 0:n.ownerDocument)||void 0===i?void 0:i.defaultView)){const t=null===(r=null===(o=null==e?void 0:e.target)||void 0===o?void 0:o.ownerDocument)||void 0===r?void 0:r.defaultView;if(t.PointerEvent)return e instanceof t.PointerEvent}if((null===(a=e)||void 0===a?void 0:a.view)&&(null===(d=null===(s=e)||void 0===s?void 0:s.view)||void 0===d?void 0:d.window)){const t=null===(l=e)||void 0===l?void 0:l.view;if(t.PointerEvent)return e instanceof t.PointerEvent}return!1},R=e=>{var t,n,i,o,r,a,s,d,l;if(P(e))return!1;if((null===(t=e)||void 0===t?void 0:t.target)&&(null===(i=null===(n=null==e?void 0:e.target)||void 0===n?void 0:n.ownerDocument)||void 0===i?void 0:i.defaultView)){const t=null===(r=null===(o=null==e?void 0:e.target)||void 0===o?void 0:o.ownerDocument)||void 0===r?void 0:r.defaultView;if(t.MouseEvent)return e instanceof t.MouseEvent}if((null===(a=e)||void 0===a?void 0:a.view)&&(null===(d=null===(s=e)||void 0===s?void 0:s.view)||void 0===d?void 0:d.window)){const t=null===(l=e)||void 0===l?void 0:l.view;if(t.MouseEvent)return e instanceof t.MouseEvent}return!1},E=({context:e})=>{const t=(t,n)=>{const{width:i,height:o}=n.getElementDimensions(),r=n.getReadingDirection();if(n.isUsingVerticalWriting())return{x:0,y:O(e.getPageSize().height,t,o)};const a=O(e.getPageSize().width,t,i);return"rtl"===r?{x:i-a-e.getPageSize().width,y:0}:{x:a,y:0}},n=(t,n,i)=>{var o;let r;if("img"===(null==t?void 0:t.nodeName)||""===(null==t?void 0:t.textContent)&&t.nodeType===Node.ELEMENT_NODE)r=t.getBoundingClientRect().x;else if(t){const e=t?((e,t)=>{var n;if(e.nodeType!==Node.CDATA_SECTION_NODE&&e.nodeType!==Node.DOCUMENT_TYPE_NODE){const i=null===(n=e.ownerDocument)||void 0===n?void 0:n.createRange();null==i||i.selectNodeContents(e);try{t<=((null==i?void 0:i.endOffset)||0)&&(null==i||i.setStart(e,t||0))}catch(e){s.error(e)}return i}})(t,n):void 0;r=(null==e?void 0:e.getBoundingClientRect().x)||r}const a=(null===(o=i.getElementDimensions())||void 0===o?void 0:o.width)||0,d=e.getPageSize().width;if(r)return{x:F(r,d,a),y:0}},i=s.measurePerformance("getCfi",10,((n,i)=>{var o,r,a;const s=((n,i)=>{var o,r,a;const s=e.getPageSize(),d=null===(r=null===(o=i.readingItemFrame)||void 0===o?void 0:o.getManipulableFrame())||void 0===r?void 0:r.frame;if((null===(a=null==d?void 0:d.contentWindow)||void 0===a?void 0:a.document)&&null!==d.contentWindow.document.body){const{x:e,y:o}=t(n,i),r={left:e,right:e+s.width,top:o,bottom:o+s.height};return x(d.contentWindow.document,r)}})(n,i),d=null===(a=null===(r=null===(o=i.readingItemFrame.getManipulableFrame())||void 0===o?void 0:o.frame)||void 0===r?void 0:r.contentWindow)||void 0===a?void 0:a.document,l=`|[oboku~anchor~${encodeURIComponent(i.item.id)}]`,g=`|[oboku~offset~${(null==s?void 0:s.offset)||0}]`;return s&&d?y.generate(s.node,0,`${l}${g}`):`epubcfi(/0${l}) `})),o=(e,t)=>{var n,i,o;if(!e)return;const{cleanedCfi:r,offset:a}=b(e),d=new y(r,{}),l=null===(o=null===(i=null===(n=t.readingItemFrame.getManipulableFrame())||void 0===n?void 0:n.frame)||void 0===i?void 0:i.contentWindow)||void 0===o?void 0:o.document;if(l)try{const{node:e,offset:t}=d.resolve(l,{});return{node:e,offset:null!=a?a:t}}catch(e){return void s.error(e)}},r=(e,t,n)=>{const i=[...Array(n)].map(((e,n)=>n*t));return e<=0?0:e>=n*t?n-1:Math.max(0,i.findIndex((n=>e<n+t)))};return{getReadingItemPositionFromCfi:(e,t)=>{const{node:i,offset:r=0}=o(e,t)||{};if(i)return n(i,r,t)},getReadingItemPositionFromNode:n,getReadingItemPositionFromPageIndex:t,getReadingItemOffsetFromAnchor:(t,n)=>{var i;const o=(null===(i=n.getElementDimensions())||void 0===i?void 0:i.width)||0,r=e.getPageSize().width,a=n.getBoundingRectOfElementFromSelector(t),s=(null==a?void 0:a.x)||0;return F(s,r,o)},getReadingItemPageIndexFromPosition:(t,n)=>{const{width:i,height:o}=n.getElementDimensions(),a=n.getReadingDirection(),s=e.getPageSize().width,d=e.getPageSize().height;let l=Math.min(i,Math.max(0,t.x));if("rtl"===a&&(l=i-l-e.getPageSize().width),n.isUsingVerticalWriting()){const e=C(o,d);return r(t.y,d,e)}{const e=C(i,s);return r(l,s,e)}},getReadingItemClosestPositionFromUnsafePosition:(t,n)=>{const{width:i,height:o}=n.getElementDimensions();return{x:F(t.x,e.getPageSize().width,i),y:F(t.y,e.getPageSize().height,o)}},getCfi:i,resolveCfi:o}},O=(e,t,n)=>{const i=n-e,o=n*(t*e)/n;return Math.max(0,Math.min(i,o))},C=(e,t)=>0===(t||0)||0===(e||0)?1:Math.floor(Math.max(1,e/t)),F=(e,t,n)=>{const i=C(n,t),o=[...Array(i)].map(((e,n)=>n*t));return e>=i*t?o[o.length-1]||0:o.find((n=>e<n+t))||0},S=({readingItemManager:e,context:t})=>{const n=E({context:t}),i=s.measurePerformance("getReadingItemPositionFromReadingOrderViewPosition",10,((n,i)=>{const{end:o,start:r,width:a}=e.getAbsolutePositionOf(i);return t.isRTL()?{x:o-n.x-t.getPageSize().width,y:n.y}:{x:Math.max(0,n.x-r),y:n.y}}),{disable:!0}),o=(n,i)=>{const{end:o,start:r}=e.getAbsolutePositionOf(i);return t.isRTL()?{x:o-n.x-t.getPageSize().width,y:n.y}:{x:r+n.x,y:n.y}},r=s.measurePerformance("getReadingItemFromOffset",10,(t=>e.getReadingItemAtPosition(t.x)),{disable:!0});return{getReadingOrderViewPositionFromReadingItemPosition:o,getReadingOrderViewPositionFromReadingItem:e=>o({x:0,y:0},e),getReadingOrderViewPositionFromReadingItemAnchor:(e,t)=>{const i=n.getReadingItemOffsetFromAnchor(e,t);return o({x:i,y:0},t)},getReadingItemPositionFromReadingOrderViewPosition:i,getReadingItemFromPosition:r,getReadingItemFromIframe:t=>e.getAll().find((e=>e.readingItemFrame.getFrameElement()===t)),getReadingItemsFromReadingOrderPosition:n=>{var i;const o=e.getReadingItemIndex(r(n)||e.getFocusedReadingItem());if(void 0===o)return;let a=n;t.shouldDisplaySpread()&&(a={x:n.x+t.getPageSize().width,y:n.y});const s=null!==(i=e.getReadingItemIndex(r(a)||e.getFocusedReadingItem()))&&void 0!==i?i:o,[d=o,l=o]=[o,s].sort();return{begin:o,beginPosition:n,end:s,endPosition:a,left:d,right:l}}}},j=({readingItemManager:e,context:t})=>{const n=E({context:t}),i=t=>{const{itemId:n}=b(t);if(n){const{itemId:n}=b(t);return(n?e.get(n):void 0)||e.get(0)}},o=t=>{const n=i(t);if(n)return{readingItemIndex:e.getReadingItemIndex(n)}};return{getReadingItemFromCfi:i,getCfiMetaInformation:o,resolveCfi:t=>{const{readingItemIndex:i=-1}=o(t)||{},r=e.get(i);if(r){let e;const{node:o,offset:a=0}=n.resolveCfi(t,r)||{};return o&&(e=n.getReadingItemPositionFromNode(o,a,r)),{readingItemIndex:i,pageIndex:e?n.getReadingItemPageIndexFromPosition(e,r):void 0,node:o,offset:a}}}}},N="viewportNavigator",T=e=>t=>{if(e&&e.contentDocument&&e.contentDocument.head){const n=e.contentDocument.getElementById(t);n&&n.remove()}},L=e=>(t,n,i=!1)=>{if(e&&e.contentDocument&&e.contentDocument.head){const o=document.createElement("style");o.id=t,o.innerHTML=n,i?e.contentDocument.head.prepend(o):e.contentDocument.head.appendChild(o)}},$=(e,t)=>{const n=new RegExp(t+"\\s*=\\s*([0-9.]+)","i"),i=e.match(n)||[],o=i[1]||"0";return i&&parseFloat(o)||0};var k=function(e,t,n,i){return new(n||(n=Promise))((function(o,r){function a(e){try{d(i.next(e))}catch(e){r(e)}}function s(e){try{d(i.throw(e))}catch(e){r(e)}}function d(e){var t;e.done?o(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t)}))).then(a,s)}d((i=i.apply(e,t||[])).next())}))};const D=s.measurePerformance("ReadingItemFrame createFrame",1/0,(e=>k(void 0,void 0,void 0,(function*(){return new Promise((t=>{const n=document.createElement("iframe");n.frameBorder="no",n.tabIndex=0,n.setAttribute("sandbox","allow-same-origin allow-scripts"),n.scrolling="no",n.style.cssText="\n      visibility: hidden;\n      overflow: hidden;\n      background-color: transparent;\n      border: 0px none transparent;\n      padding: 0px;\n      transition: opacity 300ms;\n      opacity: 0;\n    ",e.appendChild(n),t(n)}))})))),A=e=>k(void 0,void 0,void 0,(function*(){if("string"==typeof e)return e;const t=e.headers.get("Content-Type");return["image/jpg","image/jpeg"].some((e=>e===t))?`\n      <html>\n        <head>\n          <meta name="viewport" content="width=device-width, minimum-scale=0.1">\n        </head>\n        <body style="margin: 0px;" tabindex="-1">\n          <img \n            src="${yield M(yield e.blob())}"\n            style="width: 100%;height:100%;object-fit:contain;"\n          >\n        </body>\n      </html>\n        `:yield e.text()})),M=e=>{const t=new FileReader;return new Promise((n=>{t.addEventListener("load",(function(){n(t.result)}),!1),t.readAsDataURL(e)}))};const V=["pointercancel","pointerdown","pointerenter","pointerleave","pointermove","pointerout","pointerover","pointerup","mousedown","mouseup","mouseenter","mouseleave","mousemove","mouseout","mouseover"],B=({item:e,context:t,containerElement:i,iframeEventBridgeElement:o})=>{const r=new n.Subject,a=W(i,e),d=z(i,e,t),l=U(i,e),g=((e,t,i)=>{const o=new n.Subject;let r,a=!1,d=0,l=!1,g=!1;const c=t.href;let u=[],m=[];const f=()=>{if(a&&r)return(e=>({frame:e,removeStyle:T(e),addStyle:L(e)}))(r)},h=()=>{(l||g)&&(g=!1,a=!1,l=!1,m.forEach((e=>e&&e())),null==r||r.remove(),r=void 0,o.next({event:"contentLayoutChange",data:{isFirstLayout:!1,isReady:!1}}))},p=()=>{var e;if((null==r?void 0:r.contentDocument)&&r.contentDocument.body)return null===(e=null==r?void 0:r.contentWindow)||void 0===e?void 0:e.getComputedStyle(r.contentDocument.body).writingMode};return{getIsReady:()=>g,getIsLoaded:()=>a,getIsLoading:()=>l,getViewportDimensions:()=>{if(r&&r.contentDocument){const e=r.contentDocument.querySelector("meta[name='viewport']");if(e){const t=e.getAttribute("content");if(t){const e=$(t,"width"),n=$(t,"height");return e>0&&n>0?{width:e,height:n}:void 0}}}},getFrameElement:()=>r,load:s.measurePerformance("ReadingItemFrame load",1/0,(()=>k(void 0,void 0,void 0,(function*(){var n;if(l||g)return;l=!0;const h=++d,p=()=>!(l&&h===d);r=yield D(e);const v=performance.now(),y=null===(n=i.getLoadOptions())||void 0===n?void 0:n.fetchResource;if(y&&"http"!==y){const e=yield y(t);null==r||r.setAttribute("srcdoc",yield A(e))}else if(c.startsWith(window.location.origin))null==r||r.setAttribute("src",c);else{const e=yield fetch(c);null==r||r.setAttribute("srcdoc",yield A(e))}return new Promise((e=>k(void 0,void 0,void 0,(function*(){r&&!p()&&(r.setAttribute("sandbox","allow-same-origin allow-scripts"),r.onload=()=>{var t;const n=performance.now();if(s.metric({name:"ReadingItemFrame load:onload",duration:n-v}),r&&!p()){r.onload=null,r.setAttribute("role","main"),r.setAttribute("tab-index","0"),a=!0;const n=f();m=u.filter((e=>"onLoad"===e.name)).map((e=>n&&e.fn(n))),o.next({event:"domReady",data:r}),null===(t=r.contentDocument)||void 0===t||t.fonts.ready.then((()=>{r&&!p()&&(g=!0,l=!1,o.next({event:"contentLayoutChange",data:{isFirstLayout:!0,isReady:!0}}))})),e(!0)}})}))))})))),unload:h,registerHook:function(e){u.push(e)},staticLayout:e=>{r&&(r.style.width=`${e.width}px`,r.style.height=`${e.height}px`)},getManipulableFrame:f,getReadingDirection:()=>{var e;if("vertical-rl"===p())return"rtl";if((null==r?void 0:r.contentWindow)&&(null===(e=null==r?void 0:r.contentDocument)||void 0===e?void 0:e.body)){const e=r.contentWindow.getComputedStyle(r.contentDocument.body).direction;if(["ltr","rtl"].includes(e))return e}},isUsingVerticalWriting:()=>{var e;return!!(null===(e=p())||void 0===e?void 0:e.startsWith("vertical"))},getWritingMode:p,destroy:()=>{h(),u=[]},$:o}})(a,e,t),c=(()=>{let e={x:void 0,y:void 0};const t=new n.Subject;let i=!1;return{track:n=>{var o,r,a;e.x=void 0,e.y=void 0,null===(o=n.contentDocument)||void 0===o||o.addEventListener("mousedown",(n=>{i=!0,e.x=n.x,e.y=n.y,t.next({event:"fingermove",data:{x:n.x,y:n.y}})})),null===(r=n.contentDocument)||void 0===r||r.addEventListener("mouseup",(()=>{i=!1,e.x=void 0,e.y=void 0,t.next({event:"fingerout",data:void 0})})),null===(a=n.contentDocument)||void 0===a||a.addEventListener("mousemove",(e=>{i&&t.next({event:"fingermove",data:{x:e.x,y:e.y}})}))},getFingerPositionInIframe:()=>void 0===e.x||void 0===e.y?void 0:e,destroy:()=>{},$:t.asObservable()}})(),u=(()=>{let e,t=!1;const i=new n.Subject,o=["mouseup","pointerup"];return{track:n=>{var r,a;e=n,o.forEach((e=>{var i;null===(i=n.contentWindow)||void 0===i||i.addEventListener(e,(()=>{t=!1}))})),null===(r=n.contentDocument)||void 0===r||r.addEventListener("selectionchange",(()=>{var t;i.next({event:"selectionchange",data:(null===(t=null==e?void 0:e.contentWindow)||void 0===t?void 0:t.getSelection())||null})})),null===(a=n.contentWindow)||void 0===a||a.addEventListener("selectstart",(()=>{t=!0}))},destroy:()=>{},isSelecting:()=>t,getSelection:()=>{var t;const n=null===(t=null==e?void 0:e.contentWindow)||void 0===t?void 0:t.getSelection();if((null==n?void 0:n.anchorNode)&&"None"!==n.type&&"Caret"!==n.type)return n},$:i.asObservable()}})();let m={blankPagePosition:"none",minimumWidth:t.getPageSize().width};a.appendChild(d),a.appendChild(l),i.appendChild(a);let f,h,p=[];const v=()=>{var e;const{width:n,height:i}=t.getPageSize(),o=g.getViewportDimensions(),r=null===(e=g.getManipulableFrame())||void 0===e?void 0:e.frame;return a&&(null==r?void 0:r.contentDocument)&&(null==r?void 0:r.contentWindow)&&o?{computedScale:Math.min(n/o.width,i/o.height),viewportDimensions:o}:Object.assign({computedScale:1},o)},y=()=>{h=void 0};return g.registerHook({name:"onLoad",fn:({frame:e})=>{const t=V.map((t=>{var n;const i=e=>{let t=e;P(e)&&(t=new PointerEvent(e.type,e)),R(e)&&(t=new MouseEvent(e.type,e)),t!==e&&(((e,t)=>{Object.defineProperty(e,"__UNSAFE_REFERENCE_ORIGINAL_IFRAME_EVENT",{value:t,enumerable:!0})})(t,e),o.dispatchEvent(t))};return null===(n=e.contentDocument)||void 0===n||n.addEventListener(t,i),()=>{var n;null===(n=e.contentDocument)||void 0===n||n.removeEventListener(t,i)}}));return u.track(e),c.track(e),()=>{t.forEach((e=>e()))}}}),f=g.$.subscribe((e=>{"contentLayoutChange"===e.event&&(e.data.isFirstLayout&&e.data.isReady&&(d.style.visibility="hidden"),r.next(e))})),{load:()=>{y()},layout:n=>{var{height:i,width:o}=n,r=function(e,t){var n={};for(var i in e)Object.prototype.hasOwnProperty.call(e,i)&&t.indexOf(i)<0&&(n[i]=e[i]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var o=0;for(i=Object.getOwnPropertySymbols(e);o<i.length;o++)t.indexOf(i[o])<0&&Object.prototype.propertyIsEnumerable.call(e,i[o])&&(n[i[o]]=e[i[o]])}return n}(n,["height","width"]);a.style.width=`${o}px`,a.style.height=`${i}px`,d.style.setProperty("max-width",`${t.getVisibleAreaRect().width}px`),m=r,y(),p.forEach((t=>{"onLayout"===t.name&&t.fn({frame:g.getFrameElement(),container:a,loadingElement:d,item:e,overlayElement:l})}))},registerHook:function(t){p.push(t),"onLoad"===t.name&&g.registerHook({name:"onLoad",fn:n=>t.fn(Object.assign(Object.assign({},n),{container:a,loadingElement:d,item:e,overlayElement:l}))})},adjustPositionOfElement:e=>{void 0!==e&&(t.isRTL()?a.style.right=`${e}px`:a.style.left=`${e}px`)},createWrapperElement:W,createLoadingElement:z,getElementDimensions:()=>{if(h)return h;const e=a.getBoundingClientRect(),t=Object.assign(Object.assign({},e),{width:Math.round(10*e.width)/10,height:Math.round(10*e.height)/10});return h=t,h},translateFramePositionIntoPage:e=>{var t;const{left:n=0,top:i=0}=(null===(t=g.getFrameElement())||void 0===t?void 0:t.getBoundingClientRect())||{},{computedScale:o=1}=v()||{};return{clientX:e.clientX*o+n,clientY:e.clientY*o+i}},setLayoutDirty:y,injectStyle:(e,t)=>{var n,i;null===(n=e.getManipulableFrame())||void 0===n||n.removeStyle("prose-reader\-css"),null===(i=e.getManipulableFrame())||void 0===i||i.addStyle("prose-reader\-css",t)},loadContent:()=>{g.load().catch(s.error)},unloadContent:()=>{return e=void 0,t=void 0,i=function*(){g.unload(),d&&"visible"!==d.style.visibility&&(d.style.visibility="visible")},new((n=void 0)||(n=Promise))((function(o,r){function a(e){try{d(i.next(e))}catch(e){r(e)}}function s(e){try{d(i.throw(e))}catch(e){r(e)}}function d(e){var t;e.done?o(e.value):(t=e.value,t instanceof n?t:new n((function(e){e(t)}))).then(a,s)}d((i=i.apply(e,t||[])).next())}));var e,t,n,i},readingItemFrame:g,element:a,loadingElement:d,isReflowable:!1,getBoundingRectOfElementFromSelector:e=>{var t,n,i,o,r;const a=null===(t=g.getManipulableFrame())||void 0===t?void 0:t.frame;if(a&&e)return e.startsWith("#")?null===(i=null===(n=a.contentDocument)||void 0===n?void 0:n.getElementById(e.replace("#","")))||void 0===i?void 0:i.getBoundingClientRect():null===(r=null===(o=a.contentDocument)||void 0===o?void 0:o.querySelector(e))||void 0===r?void 0:r.getBoundingClientRect()},getViewPortInformation:v,destroy:()=>{d.onload=()=>{},d.remove(),a.remove(),null==g||g.destroy(),null==f||f.unsubscribe(),c.destroy(),u.destroy(),p=[]},isUsingVerticalWriting:()=>{var e;return null===(e=g.getWritingMode())||void 0===e?void 0:e.startsWith("vertical")},getReadingDirection:()=>g.getReadingDirection()||t.getReadingDirection(),isFrameReady:()=>g.getIsReady(),isFrameLoading:()=>g.getIsLoading(),manipulateReadingItem:t=>{const n=g.getManipulableFrame();return t(n?Object.assign(Object.assign({},n),{container:a,loadingElement:d,item:e,overlayElement:l}):{container:a,loadingElement:d,item:e,frame:void 0,removeStyle:()=>{},addStyle:()=>{},overlayElement:l})},selectionTracker:u,fingerTracker:c,$:r}},W=(e,t)=>{const n=e.ownerDocument.createElement("div");return n.classList.add("readingItem"),n.classList.add(`readingItem-${t.renditionLayout}`),n.style.cssText="\n    position: absolute;\n    overflow: hidden;\n  ",n},z=(e,t,n)=>{const i=e.ownerDocument.createElement("div");i.classList.add("loading"),i.style.cssText=`\n    height: 100%;\n    width: 100%;\n    max-width: ${n.getVisibleAreaRect().width}px;\n    text-align: center;\n    display: flex;\n    justify-content: center;\n    align-items: center;\n    flex-direction: column;\n    position: absolute;\n    left: 0;\n    top: 0;\n    background-color: white;\n  `;const o=e.ownerDocument.createElement("div");o.innerText="oboku",o.style.cssText="\n    font-size: 4em;\n    color: #cacaca;\n  ";const r=e.ownerDocument.createElement("div");return r.innerText=`loading ${t.id}`,r.style.cssText="\n    font-size: 1.2em;\n    color: rgb(202, 202, 202);\n    text-overflow: ellipsis;\n    white-space: nowrap;\n    overflow: hidden;\n    max-width: 300px;\n    width: 80%;\n  ",i.appendChild(o),i.appendChild(r),i},U=(e,t)=>{const n=e.ownerDocument.createElement("div");return n.classList.add("readingItemOverlay"),n.classList.add(`readingItemOverlay-${t.renditionLayout}`),n.style.cssText="\n    position: absolute;\n    width: 100%;\n    height: 100%;\n    pointer-events: none;\n    background-color: transparent;\n  ",n},_=({item:e,context:t,containerElement:n,iframeEventBridgeElement:i})=>{const o=B({context:t,item:e,containerElement:n,iframeEventBridgeElement:i});let r=o.readingItemFrame;return Object.assign(Object.assign({},o),{layout:e=>(({blankPagePosition:e,minimumWidth:n})=>{var i;const{width:a,height:s}=t.getPageSize(),{viewportDimensions:d,computedScale:l}=o.getViewPortInformation(),g=t.getVisibleAreaRect(),c=null===(i=r.getManipulableFrame())||void 0===i?void 0:i.frame;if((null==r?void 0:r.getIsLoaded())&&(null==c?void 0:c.contentDocument)&&(null==c?void 0:c.contentWindow)){let i=a;const s=g.height+t.getCalculatedInnerMargin(),u=H((()=>{const e=t.getPageSize(),n=e.width;return{columnHeight:e.height,columnWidth:n,horizontalMargin:0}})(),d);return null==c||c.style.setProperty("visibility","visible"),null==c||c.style.setProperty("opacity","1"),d?(o.injectStyle(r,u),r.staticLayout({width:d.width,height:d.height}),null==c||c.style.setProperty("--scale",`${l}`),null==c||c.style.setProperty("position","absolute"),null==c||c.style.setProperty("top","50%"),null==c||c.style.setProperty("left","before"===e?t.isRTL()?"25%":"75%":"after"===e?t.isRTL()?"75%":"25%":"50%"),null==c||c.style.setProperty("transform",`translate(-50%, -50%) scale(${l})`),null==c||c.style.setProperty("transform-origin","center center")):(o.injectStyle(r,u),r.staticLayout({width:i,height:s})),o.layout({width:n,height:s,minimumWidth:n,blankPagePosition:e}),{width:n,height:s}}return o.layout({width:n,height:s,minimumWidth:n,blankPagePosition:e}),{width:n,height:s}})(e),destroy:()=>{o.destroy()}})},H=({columnWidth:e},t)=>`\n    body {\n      \n    }\n    body {\n      margin: 0;\n    }\n    \n    html, body {\n      height: 100%;\n      width: 100%;\n    }\n    \n    html, body {\n      -max-width: ${e}px !important;\n    }\n    \n    html, body {\n      touch-action: none;\n    }\n    \n    img {\n      user-select: none;\n      \n      display: flex;\n      \n      ${t?"":"\n        width: 100%;\n        height:100%;\n        object-fit:contain;\n      "}\n    }\n  `,Y=({item:e,context:t,containerElement:n,iframeEventBridgeElement:i})=>{const o=B({context:t,item:e,containerElement:n,iframeEventBridgeElement:i});let r=o.readingItemFrame;return Object.assign(Object.assign({},o),{isReflowable:!0,unloadContent:()=>{o.unloadContent()},layout:e=>{var n,i,a,s;const{width:d,height:l}=t.getPageSize();return null===(i=null===(n=r.getManipulableFrame())||void 0===n?void 0:n.frame)||void 0===i||i.style.setProperty("width",`${d}px`),null===(s=null===(a=r.getManipulableFrame())||void 0===a?void 0:a.frame)||void 0===s||s.style.setProperty("height",`${l}px`),(({minimumWidth:e,blankPagePosition:n})=>{var i;const{width:a,height:s}=t.getPageSize(),d=r.getViewportDimensions(),l=t.getVisibleAreaRect(),g=null===(i=r.getManipulableFrame())||void 0===i?void 0:i.frame;if((null==r?void 0:r.getIsLoaded())&&(null==g?void 0:g.contentDocument)&&(null==g?void 0:g.contentWindow)){let i=a,c=l.height+t.getCalculatedInnerMargin();if(null==g||g.style.setProperty("visibility","visible"),null==g||g.style.setProperty("opacity","1"),d){const e=Math.min(a/d.width,s/d.height);o.injectStyle(r,X()),r.staticLayout({width:d.width,height:d.height}),null==g||g.style.setProperty("--scale",`${e}`),null==g||g.style.setProperty("position","absolute"),null==g||g.style.setProperty("top","50%"),null==g||g.style.setProperty("left","50%"),null==g||g.style.setProperty("transform",`translate(-50%, -50%) scale(${e})`),null==g||g.style.setProperty("transform-origin","center center")}else{const n=q(((e,n)=>{const i=t.getPageSize(),o=t.getHorizontalMargin();let r=i.width-2*o;return e&&(r=n-2*o),{columnHeight:i.height-2*o,columnWidth:r,horizontalMargin:o}})(r.isUsingVerticalWriting(),e));o.injectStyle(r,n),r.isUsingVerticalWriting()?(c=Math.ceil(g.contentDocument.documentElement.scrollHeight/s)*s,r.staticLayout({width:e,height:c})):(i=Math.ceil(g.contentDocument.documentElement.scrollWidth/a)*a,r.staticLayout({width:i,height:c}))}return i%e==0?null==g||g.style.setProperty("margin-left","0px"):(i+=a,t.isRTL()&&!o.isUsingVerticalWriting()&&(null==g||g.style.setProperty("margin-left",`${a}px`))),o.layout({width:i,height:c,blankPagePosition:n,minimumWidth:e}),{width:i,height:c}}return o.layout({width:e,height:s,blankPagePosition:n,minimumWidth:e}),{width:e,height:s}})(e)},destroy:()=>{o.destroy()}})},X=()=>"\n    html {\n      width: 100%;\n      height: 100%;\n    }\n\n    body {\n      width: 100%;\n      height: 100%;\n      margin: 0;\n    }\n    \n    html, body {\n      touch-action: none;\n    }\n    img {\n      display: flex;\n      max-width: 100%;\n      max-height: 100%;\n      margin: 0 auto;\n    }\n  ",q=({columnHeight:e,columnWidth:t,horizontalMargin:n})=>`\n    parsererror {\n      display: none !important;\n    }\n    \n    html, body {\n      margin: 0;\n      padding: 0 !important;\n      -max-width: ${t}px !important;\n    }\n    \n    body {\n      padding: 0 !important;\n      width: ${t}px !important;\n      height: ${e}px !important;\n      -margin-left: ${n}px !important;\n      -margin-right: ${n}px !important;\n      margin: ${n}px ${n}px !important;\n      -padding-top: ${n}px !important;\n      -padding-bottom: ${n}px !important;\n      overflow-y: hidden;\n      column-width: ${t}px !important;\n      column-gap: ${2*n}px !important;\n      column-fill: auto !important;\n      word-wrap: break-word;\n      box-sizing: border-box;\n    }\n    body {\n      margin: 0;\n    }\n    \n    html, body {\n      touch-action: none;\n    }\n    \n    * {\n      -max-width: ${t}px !important;\n    }\n    \n    img, video, audio, object, svg {\n      max-width: 100%;\n      max-width: ${t}px !important;\n      max-height: ${e}px !important;\n      -pointer-events: none;\n      -webkit-column-break-inside: avoid;\n      page-break-inside: avoid;\n      break-inside: avoid;\n    }\n    figure {\n      d-max-width: ${t}px !important;\n    }\n    img {\n      object-fit: contain;\n      break-inside: avoid;\n      box-sizing: border-box;\n      d-max-width: ${t}px !important;\n    }\n    \n    table {\n      max-width: ${t}px !important;\n      table-layout: fixed;\n    }\n    td {\n      max-width: ${t}px;\n    }\n  `,G=(e,t)=>{const n=e.toString();return{toString:()=>n,getAnchorCfi:()=>{if(e.anchorNode)return y.generate(e.anchorNode,e.anchorOffset,`|[oboku~anchor~${encodeURIComponent(t.id)}]`)},getFocusCfi:()=>{if(e.focusNode)return y.generate(e.focusNode,e.focusOffset,`|[oboku~anchor~${encodeURIComponent(t.id)}]`)}}};const K=({containerElement:e,context:t,pagination:o,iframeEventBridgeElement:r})=>{const a=new n.Subject,l=new n.Subject,g=e.ownerDocument,c=(({context:e})=>{const t=new n.Subject,i=new n.Subject;let o,r=[],a=[];const d=()=>{r.reduce(((t,n,i)=>{let o=e.getPageSize().width,a="none";const s=t%e.getVisibleAreaRect().width==0;e.shouldDisplaySpread()&&(n.isReflowable&&i!==r.length-1&&(o=2*e.getPageSize().width),n.isReflowable&&i===r.length-1&&s&&(o=2*e.getPageSize().width),n.item.pageSpreadRight&&s&&!e.isRTL()&&(a="before",o=2*e.getPageSize().width),n.item.pageSpreadLeft&&s&&e.isRTL()&&(a="before",o=2*e.getPageSize().width));const{width:d}=n.layout({minimumWidth:o,blankPagePosition:a});return n.adjustPositionOfElement(t),d+t}),0),i.next()},l=s.measurePerformance("loadContents",10,(t=>{var n;const[i,o]=t,a=(null===(n=e.getLoadOptions())||void 0===n?void 0:n.numberOfAdjacentSpineItemToPreLoad)||0;r.forEach(((e,t)=>{t<i-a||t>o+a?e.unloadContent():e.isFrameReady()||e.isFrameLoading()||e.loadContent()}))})),g=e=>"number"==typeof e?r[e]:r.find((({item:t})=>t.id===e)),c=s.measurePerformance("getAbsolutePositionOf",10,(e=>{var t;const n="number"==typeof e?e:r.indexOf(e),i=r.slice(0,n+1).reduce(((e,t)=>{const n=t.getElementDimensions().width;return{start:e.end,end:e.end+n,width:n}}),{start:0,end:0});return"number"==typeof e?Object.assign(Object.assign({width:0},null===(t=g(e))||void 0===t?void 0:t.getElementDimensions()),i):Object.assign(Object.assign({},e.getElementDimensions()),i)}),{disable:!0}),u=()=>void 0!==o?r[o]:void 0;function m(e){if(!e)return;const t=r.indexOf(e);return t<0?void 0:t}const f=s.measurePerformance("getReadingItemAtPosition",10,(e=>{const t=r.find((t=>{const{start:n,end:i}=c(t);return e>=n&&e<i}));return 0!==e||t?t:r[0]}),{disable:!0});return{add:e=>{r.push(e);const t=e.$.subscribe((e=>{"contentLayoutChange"===e.event&&d()}));a.push(t),e.load()},get:g,getAll:()=>r,getLength:()=>r.length,layout:d,focus:e=>{const n="number"==typeof e?g(e):e;if(!n)return;const i=r.indexOf(n);i!==o&&(o=i,t.next({data:n}))},loadContents:l,comparePositionOf:(e,t)=>r.indexOf(e)>r.indexOf(t)?"after":"before",getAbsolutePositionOf:c,getReadingItemAtPosition:f,getFocusedReadingItem:u,getFocusedReadingItemIndex:()=>{const e=u();return e&&m(e)},getReadingItemIndex:m,destroy:()=>{r.forEach((e=>e.destroy())),a.forEach((e=>e.unsubscribe())),a=[],t.complete(),i.complete()},$:{focus$:t.asObservable(),layout$:i.asObservable()}}})({context:t}),u=j({readingItemManager:c,context:t}),m=J(g);e.appendChild(m);const f=(({readingItemManager:e,context:t,pagination:o,element:r})=>{const a=(({context:e,readingItemManager:t})=>{const n=(({context:e})=>{const t=E({context:e}),n=(e,n)=>t.getReadingItemPositionFromPageIndex(e,n);return{getNavigationForLeftPage:(n,i)=>{let o={x:n.x-e.getPageSize().width,y:n.y};return i.isUsingVerticalWriting()&&(o={x:n.x,y:n.y+e.getPageSize().height}),t.getReadingItemClosestPositionFromUnsafePosition(o,i)},getNavigationForRightPage:(n,i)=>{let o={x:n.x+e.getPageSize().width,y:n.y};return i.isUsingVerticalWriting()&&(o={x:n.x,y:n.y-e.getPageSize().height}),t.getReadingItemClosestPositionFromUnsafePosition(o,i)},getNavigationForLastPage:t=>{if(t.isUsingVerticalWriting()){const i=e.getPageSize().height,o=C(t.getElementDimensions().height,i);return n(o-1,t)}{const i=e.getPageSize().width,o=C(t.getElementDimensions().width,i);return n(o-1,t)}},getNavigationForPage:n,getNavigationForCfi:(e,n)=>t.getReadingItemPositionFromCfi(e,n)||{x:0,y:0},getNavigationForPosition:(e,n)=>t.getReadingItemClosestPositionFromUnsafePosition(n,e)}})({context:e}),i=j({readingItemManager:t,context:e}),o=S({context:e,readingItemManager:t}),r=(e,t)=>e.x!==t.x||e.y!==t.y,a=n=>{const i=t.get(t.getLength()-1),o=t.getAbsolutePositionOf(i||0).end-e.getPageSize().width;return{x:Math.min(Math.max(0,n.x),o),y:Math.max(0,n.y)}},d=({x:t,y:n})=>({x:t%e.getVisibleAreaRect().width!=0?t-e.getPageSize().width:t,y:n}),l=i=>{const s=o.getReadingItemFromPosition(i)||t.getFocusedReadingItem();if(!s)return i;const d=o.getReadingItemPositionFromReadingOrderViewPosition(i,s),l=n.getNavigationForRightPage(d,s);return!d.outsideOfBoundaries&&r(l,d)?o.getReadingOrderViewPositionFromReadingItemPosition(l,s):a(e.isRTL()?{x:i.x-e.getPageSize().width,y:0}:{x:i.x+e.getPageSize().width,y:0})},g=i=>{const s=o.getReadingItemFromPosition(i)||t.getFocusedReadingItem(),d=Object.assign(Object.assign({},i),{readingItem:s});if(!s)return d;const l=o.getReadingItemPositionFromReadingOrderViewPosition(i,s);n.getNavigationForCfi;const g=n.getNavigationForLeftPage(l,s);return!l.outsideOfBoundaries&&r(g,l)?o.getReadingOrderViewPositionFromReadingItemPosition(g,s):a(e.isRTL()?{x:i.x+e.getPageSize().width,y:0}:{x:i.x-e.getPageSize().width,y:0})},c=(e,t)=>{const n=o.getReadingOrderViewPositionFromReadingItemAnchor(e,t);return d(n)};return{getNavigationForCfi:e=>{const t=i.getReadingItemFromCfi(e);if(t){const i=n.getNavigationForCfi(e,t),r=o.getReadingOrderViewPositionFromReadingItemPosition(i,t);return Object.assign(Object.assign({},d(r)),{readingItem:t})}return s.warn("readingOrderViewNavigator",`unable to detect item id from cfi ${e}`),{x:0,y:0}},getNavigationForPage:(e,t)=>{const i=n.getNavigationForPage(e,t),r=o.getReadingOrderViewPositionFromReadingItemPosition(i,t);return d(r)},getNavigationForLastPage:e=>{const t=n.getNavigationForLastPage(e),i=o.getReadingOrderViewPositionFromReadingItemPosition(t,e);return d(i)},getNavigationForSpineIndexOrId:e=>{const n=t.get(e);if(n){const e=o.getReadingOrderViewPositionFromReadingItem(n);return Object.assign(Object.assign({},d(e)),{readingItem:n})}return{x:0,y:0}},getNavigationForRightPage:n=>{const i=o.getReadingItemFromPosition(n)||t.getFocusedReadingItem();let r=l(n);if((null==i?void 0:i.isUsingVerticalWriting())&&n.x===r.x)return d(r);if(e.shouldDisplaySpread()){if((null==i?void 0:i.isUsingVerticalWriting())&&n.x!==r.x)return d(a(e.isRTL()?Object.assign(Object.assign({},r),{x:r.x-e.getPageSize().width}):Object.assign(Object.assign({},r),{x:r.x+e.getPageSize().width})));r=l(r)}return d(r)},getNavigationForLeftPage:n=>{const i=o.getReadingItemFromPosition(n)||t.getFocusedReadingItem();let r=g(n);if((null==i?void 0:i.isUsingVerticalWriting())&&n.x===r.x)return d(r);if(e.shouldDisplaySpread()){if((null==i?void 0:i.isUsingVerticalWriting())&&n.x!==r.x)return d(a(e.isRTL()?Object.assign(Object.assign({},r),{x:r.x+e.getPageSize().width}):Object.assign(Object.assign({},r),{x:r.x-e.getPageSize().width})));r=g(r)}return d(r)},getNavigationForUrl:n=>{var i;let o;try{o=n instanceof URL?n:new URL(n)}catch(e){s.error(e)}if(o){const n=`${o.origin}${o.pathname}`,r=null===(i=e.getManifest())||void 0===i?void 0:i.readingOrder.find((e=>e.href===n));if(r){const e=t.get(r.id);if(e){const t=c(o.hash,e);return Object.assign(Object.assign({},d(t)),{url:o})}}}},getNavigationForAnchor:c,getNavigationForPosition:e=>{const t=o.getReadingItemFromPosition(e);if(t){const i=o.getReadingItemPositionFromReadingOrderViewPosition(e,t),r=n.getNavigationForPosition(t,i);return o.getReadingOrderViewPositionFromReadingItemPosition(r,t)}return{x:0,y:0}},wrapPositionWithSafeEdge:a}})({context:t,readingItemManager:e}),d=S({context:t,readingItemManager:e});let l,g=[],c={x:0,y:0};const u=new n.Subject;let m=!1,f=!1;const h=new n.BehaviorSubject("end"),p=new n.BehaviorSubject("end"),v=new n.BehaviorSubject("free");let y;const b=s.measurePerformance("adjustReadingOffset",10,(({x:e,y:n})=>{t.isRTL()?r.style.transform=`translate3d(${e}px, -${n}px, 0)`:r.style.transform=`translate3d(-${e}px, -${n}px, 0)`,g.forEach((e=>{"onViewportOffsetAdjust"===e.name&&e.fn()}))}),{disable:!0}),x=()=>({x:Math.round(10*Math.abs(r.getBoundingClientRect().x))/10,y:Math.round(10*Math.abs(r.getBoundingClientRect().y))/10}),w=s.measurePerformance("turnTo",10,((t,{allowReadingItemChange:n=!0}={})=>{const i=e.getFocusedReadingItem();if(!i)return;const o=d.getReadingItemFromPosition(t)||i;o!==i?n&&("before"===e.comparePositionOf(o,i)?(y={type:"navigate-from-next-item"},L(t)):(y={type:"navigate-from-previous-item"},L(t))):(y=void 0,L(t))})),I=s.measurePerformance("viewportNavigator turnLeft",10,(({allowReadingItemChange:e=!0}={})=>{const t=a.getNavigationForLeftPage(c);w(t,{allowReadingItemChange:e})})),P=s.measurePerformance("viewportNavigator turnRight",10,(({allowReadingItemChange:e=!0}={})=>{const t=a.getNavigationForRightPage(c);w(t,{allowReadingItemChange:e})})),R=(e,t={animate:!0})=>{const n=a.getNavigationForCfi(e);s.log(N,"goToCfi",{cfi:e,navigation:n}),y={type:"navigate-from-cfi",data:e},L(n,t)},O=(e,t={animate:!0})=>{const n=a.getNavigationForSpineIndexOrId(e);y={type:"navigate-from-previous-item"},L(n,t)};let F={x:0,y:0},T={x:0,y:0};const L=s.measurePerformance("navigateTo",10,((e,{animate:t}={animate:!0})=>{c=e,u.next({type:"navigation",position:e,animate:t})})),$=u.pipe((0,i.filter)((e=>"adjustEnd"===e.type))),k=u.pipe((0,i.filter)((e=>"navigation"===e.type)),(0,i.switchMap)((e=>{const t=e;return l={animate:t.animate},u.next({type:"adjustStart",position:e.position,animation:t.animate?"auto":"none"}),$.pipe((0,i.take)(1))})),(0,i.tap)((()=>{l=void 0})));return u.pipe((0,i.filter)((e=>"adjustStart"===e.type)),(0,i.throttleTime)(0,n.animationFrameScheduler,{leading:!0,trailing:!0}),(0,i.switchMap)((e=>{m=!0,p.next("started");const o=(a=e.position,s=x(),!(a.x!==s.x||a.y!==s.y));var a,s;const d=t.getComputedPageTurnAnimationDuration(),c=!("adjustStart"===e.type&&"none"===e.animation||!1===(null==l?void 0:l.animate)||!l||"none"===t.getSettings().pageTurnAnimation);return g.forEach((e=>{"onViewportAdjustStart"===e.name&&e.fn({animate:c})})),c&&!o?"fade"===t.getSettings().pageTurnAnimation?(r.style.setProperty("transition",`opacity ${d}ms`),r.style.setProperty("opacity","0")):"slide"===t.getSettings().pageTurnAnimation&&(r.style.setProperty("transition",`transform ${d}ms`),r.style.setProperty("opacity","1")):(r.style.setProperty("transition","none"),r.style.setProperty("opacity","1")),(0,n.of)(e).pipe((0,i.tap)((()=>{"fade"!==t.getSettings().pageTurnAnimation&&b(e.position)})),(0,i.delayWhen)((()=>c?(0,n.timer)(d):n.EMPTY)),(0,i.tap)((()=>{"fade"===t.getSettings().pageTurnAnimation&&b(e.position),g.forEach((e=>{"onViewportAdjustEnd"===e.name&&e.fn()})),m=!1,u.next({type:"adjustEnd",position:e.position}),p.next("end")})))})),(0,i.tap)((()=>{r.style.setProperty("opacity","1")})),(0,i.takeUntil)(t.destroy$)).subscribe(),(0,n.merge)(k).pipe((0,i.takeUntil)(t.destroy$)).subscribe(),(0,n.combineLatest)(h,p).pipe((0,i.tap)((([e,t])=>{v.next("end"===e&&"end"===t?"free":"busy")})),(0,i.takeUntil)(t.destroy$)).subscribe(),{destroy:()=>{g=[],u.complete(),h.complete(),v.complete()},registerHook:e=>{g.push(e)},getCurrentNavigationPosition:()=>c,isAdjusting:()=>m,turnLeft:I,turnRight:P,goTo:e=>{"string"==typeof e&&e.startsWith("epubcfi")?R(e):O(e)},goToSpineItem:O,goToUrl:e=>{const t=a.getNavigationForUrl(e);t&&(y={type:"navigate-from-anchor",data:t.url.hash},L(t))},goToCfi:R,goToPageOfCurrentChapter:t=>{const n=e.getFocusedReadingItem();if(n){const e=a.getNavigationForPage(t,n);y=void 0,L(e)}},adjustReadingOffsetPosition:(e,{})=>{const t=o.getBeginInfo().cfi;let n=c;if("navigate-from-cfi"===(null==y?void 0:y.type))n=a.getNavigationForCfi(y.data),s.log(N,"navigate-from-cfi","use last cfi");else if("navigate-from-next-item"===(null==y?void 0:y.type))n=a.getNavigationForLastPage(e),s.log(N,"adjustReadingOffsetPosition","navigate-from-next-item",{});else if("navigate-from-previous-item"===(null==y?void 0:y.type))n=a.getNavigationForPage(0,e),s.log(N,"adjustReadingOffsetPosition","navigate-from-previous-item",{});else if("navigate-from-anchor"===(null==y?void 0:y.type)){const t=y.data;n=a.getNavigationForAnchor(t,e)}else if(t)n=a.getNavigationForCfi(t),s.log(N,"adjustReadingOffsetPosition","use last cfi");else{const t=o.getBeginInfo().pageIndex||0;n=a.getNavigationForPage(t,e),s.log(N,"adjustReadingOffsetPosition","use guess strategy",{})}s.log(N,"adjustReadingOffsetPosition",{offsetInReadingItem:0,expectedReadingOrderViewOffset:n,lastUserExpectedNavigation:y}),c=n,u.next({type:"adjustStart",position:n,animation:"auto"})},moveTo:(e,{final:n,start:i}={})=>{f=!0,i&&(h.next("start"),F={x:0,y:0},T=x());let o=c;if(e){const t=e.x-((null==F?void 0:F.x)||0);o=a.wrapPositionWithSafeEdge({x:T.x-t,y:0}),F=e}else o=x();if(T=o,n){f=!1,F={x:0,y:0};const e=a.wrapPositionWithSafeEdge({x:o.x+t.getPageSize().width/2,y:0}),n=a.getNavigationForPosition(e);return y=void 0,w(n),void h.next("end")}u.next({type:"adjustStart",position:o,animation:"none"}),h.next("moving")},getLastUserExpectedNavigation:()=>y,$:{$:u.asObservable(),pan$:h.asObservable(),state$:v.asObservable()}}})({context:t,pagination:o,readingItemManager:c,element:m}),h=S({context:t,readingItemManager:c}),p=(({iframeEventBridgeElement:e,context:t,readingItemManager:n})=>{const i=S({readingItemManager:n,context:t});return{normalizeEventForViewport:t=>{var n;const o=t.target===e,r=(e=>e.__UNSAFE_REFERENCE_ORIGINAL_IFRAME_EVENT)(t),a=null===(n=null==r?void 0:r.view)||void 0===n?void 0:n.frameElement;if(!o||!r||!a)return t;const s=i.getReadingItemFromIframe(a);if(!s)return t;if(P(t)){const{clientX:e,clientY:n}=s.translateFramePositionIntoPage(t),i=new PointerEvent(t.type,Object.assign(Object.assign({},t),{clientX:e,clientY:n}));return Object.defineProperty(i,"target",{value:r.target,enumerable:!0}),i}if(R(t)){const{clientX:e,clientY:n}=s.translateFramePositionIntoPage(t),i=new MouseEvent(t.type,Object.assign(Object.assign({},t),{clientX:e,clientY:n}));return Object.defineProperty(i,"target",{value:r.target,enumerable:!0}),i}if((e=>{var t,n,i,o,r,a,s,d,l;if((null===(t=e)||void 0===t?void 0:t.target)&&(null===(i=null===(n=null==e?void 0:e.target)||void 0===n?void 0:n.ownerDocument)||void 0===i?void 0:i.defaultView)){const t=null===(r=null===(o=null==e?void 0:e.target)||void 0===o?void 0:o.ownerDocument)||void 0===r?void 0:r.defaultView;if(t.TouchEvent)return e instanceof t.TouchEvent}if((null===(a=e)||void 0===a?void 0:a.view)&&(null===(d=null===(s=e)||void 0===s?void 0:s.view)||void 0===d?void 0:d.window)){const t=null===(l=e)||void 0===l?void 0:l.view;if(t.TouchEvent)return e instanceof t.TouchEvent}return!1})(t)){const e=Array.from(t.touches).map((e=>{const{clientX:t,clientY:n}=s.translateFramePositionIntoPage(e);return new Touch({identifier:e.identifier,target:e.target,clientX:t,clientY:n})})),n=new TouchEvent(t.type,{touches:e,changedTouches:e,targetTouches:e});return Object.defineProperty(n,"target",{value:r.target,enumerable:!0}),n}return t}}})({context:t,readingItemManager:c,iframeEventBridgeElement:r});let v,y=[];const b=(e,t,n,i)=>{var o,r;return{begin:{readingItem:e,readingItemIndex:null!==(o=c.getReadingItemIndex(e))&&void 0!==o?o:0,readingItemPosition:h.getReadingItemPositionFromReadingOrderViewPosition(n,e)},end:{readingItem:t,readingItemIndex:null!==(r=c.getReadingItemIndex(t))&&void 0!==r?r:0,readingItemPosition:h.getReadingItemPositionFromReadingOrderViewPosition(i,t)}}};c.$.layout$.pipe((0,i.tap)((()=>{a.next({type:"layoutUpdate"}),o.updateTotalNumberOfPages(c.getAll())})),(0,i.switchMap)((()=>f.$.state$.pipe((0,i.filter)((e=>"free"===e)),(0,i.take)(1)).pipe((0,i.tap)((()=>{const e=c.getFocusedReadingItem();e&&f.adjustReadingOffsetPosition(e,{})}))))),(0,i.takeUntil)(l)).subscribe(),(0,n.merge)(c.$.focus$,c.$.layout$).pipe((0,i.switchMap)((()=>(0,n.timer)(1).pipe((0,i.tap)((()=>{const e=c.getFocusedReadingItemIndex();if(void 0===e)return;const{begin:t=e,end:n=e}=h.getReadingItemsFromReadingOrderPosition(f.getCurrentNavigationPosition())||{};t!==e&&n!==e?(console.warn("Current viewport is not in sync with focus item, load from focus item rather than viewport"),c.loadContents([e,e])):c.loadContents([t,n])}))))),(0,i.takeUntil)(l)).subscribe();const x=(0,n.merge)(c.$.focus$.pipe((0,i.tap)((e=>{const t=e.data,o=t.fingerTracker.$,r=t.selectionTracker.$;null==v||v.unsubscribe(),v=(0,n.merge)(r.pipe((0,i.filter)((e=>"selectionchange"===e.event)),(0,i.tap)((e=>{a.next({type:"onSelectionChange",data:e.data?G(e.data,t.item):null})}))),r.pipe((0,i.filter)((({event:e})=>"selectstart"===e)),(0,i.switchMap)((e=>o.pipe((0,i.filter)((({event:e})=>"fingermove"===e)),(0,i.debounce)((()=>(0,n.interval)(1e3))),(0,i.takeUntil)(o.pipe((0,i.filter)((({event:e})=>"fingerout"===e)),(0,i.tap)((()=>{})))),(0,i.tap)((({data:e})=>{}))))))).subscribe()})),(0,i.catchError)((e=>(s.error(e),n.EMPTY))))),w=f.$.$.pipe((0,i.tap)((e=>{if("navigation"===e.type){const t=c.getFocusedReadingItem(),n=h.getReadingItemsFromReadingOrderPosition(e.position),i=n?c.get(n.begin):void 0,r=n?c.get(n.end):void 0,a=e.position.readingItem||i;if(a&&i&&r&&n){a!==t&&c.focus(a);const d=f.getLastUserExpectedNavigation(),l=b(i,r,n.beginPosition,n.endPosition);o.updateBeginAndEnd(Object.assign(Object.assign({},l.begin),{options:{isAtEndOfChapter:!1,cfi:"navigate-from-cfi"===(null==d?void 0:d.type)&&a===i?d.data:void 0}}),Object.assign(Object.assign({},l.end),{options:{isAtEndOfChapter:!1,cfi:"navigate-from-cfi"===(null==d?void 0:d.type)&&a===r?d.data:void 0}})),s.log("readingOrderView","navigation$",{readingItemHasChanged:a!==t,item:a,index:c.getReadingItemIndex(a),offset:e,endReadingItem:r,beginReadingItem:i,lastExpectedNavigation:d,readingItemsFromPosition:n})}}}))),I=f.$.$.pipe((0,i.filter)((e=>"adjustEnd"===e.type)),(0,i.debounceTime)(5,void 0),(0,i.tap)((()=>{const e=f.getCurrentNavigationPosition(),t=h.getReadingItemsFromReadingOrderPosition(e),n=t?c.get(t.begin):void 0,i=t?c.get(t.end):void 0,r=o.getBeginInfo().cfi,a=o.getEndInfo().cfi,s=o.getBeginInfo().readingItemIndex!==(null==t?void 0:t.begin)||void 0===r||(null==r?void 0:r.startsWith("epubcfi(/0")),d=o.getEndInfo().readingItemIndex!==(null==t?void 0:t.end)||void 0===a||(null==a?void 0:a.startsWith("epubcfi(/0"));if(n&&i&&t){const e=b(n,i,t.beginPosition,t.endPosition);o.updateBeginAndEnd(Object.assign(Object.assign({},e.begin),{options:{cfi:s?void 0:r,isAtEndOfChapter:!1}}),Object.assign(Object.assign({},e.end),{options:{cfi:d?void 0:a,isAtEndOfChapter:!1}}))}})));return(0,n.merge)(x,w,I).pipe((0,i.takeUntil)(l)).subscribe(),{viewportNavigator:f,element:m,locator:h,getCfiMetaInformation:u.getCfiMetaInformation,resolveCfi:u.resolveCfi,getFocusedReadingItemIndex:()=>c.getFocusedReadingItemIndex(),getReadingItem:c.get,registerHook:function(e){y.push(e),c.getAll().forEach((t=>{"item.onLoad"===e.name&&t.registerHook({name:"onLoad",fn:e.fn})}))},normalizeEventForViewport:p.normalizeEventForViewport,manipulateReadingItems:e=>{let t=!1;c.getAll().forEach(((n,i)=>{t=n.manipulateReadingItem((t=>e(Object.assign({index:i},t))))||t})),t&&c.layout()},getCurrentNavigationPosition:f.getCurrentNavigationPosition,goToNextSpineItem:()=>{var e;const n=c.getFocusedReadingItemIndex()||0;n<((null===(e=null==t?void 0:t.getManifest())||void 0===e?void 0:e.readingOrder.length)||1)-1&&f.goToSpineItem(n+1)},goToPreviousSpineItem:()=>{const e=c.getFocusedReadingItemIndex()||0;e>0&&f.goToSpineItem(e-1)},load:()=>{var e;null===(e=t.getManifest())||void 0===e||e.readingOrder.map((e=>{return n=void 0,i=void 0,a=function*(){const n=(({item:e,context:t,containerElement:n,iframeEventBridgeElement:i})=>{let o;return o="pre-paginated"===e.renditionLayout?_({item:e,context:t,containerElement:n,iframeEventBridgeElement:i}):Y({item:e,context:t,containerElement:n,iframeEventBridgeElement:i}),Object.assign({item:e},o)})({item:e,containerElement:m,iframeEventBridgeElement:r,context:t});y.forEach((e=>{"item.onLoad"===e.name&&n.registerHook({name:"onLoad",fn:e.fn})})),c.add(n)},new((o=void 0)||(o=Promise))((function(e,t){function r(e){try{d(a.next(e))}catch(e){t(e)}}function s(e){try{d(a.throw(e))}catch(e){t(e)}}function d(t){var n;t.done?e(t.value):(n=t.value,n instanceof o?n:new o((function(e){e(n)}))).then(r,s)}d((a=a.apply(n,i||[])).next())}));var n,i,o,a})),y.forEach((e=>{"readingItem.onCreated"===e.name&&c.getAll().forEach((t=>e.fn({container:t.element,loadingElement:t.loadingElement})))}))},layout:()=>{c.layout()},getChapterInfo(){const e=c.getFocusedReadingItem(),n=t.getManifest();return e&&n&&((e,t)=>{const{path:n}=t.item;return d(n,e.nav.toc)})(n,e)},destroy:()=>{l.next(),l.complete(),f.destroy(),c.destroy(),null==v||v.unsubscribe(),m.remove(),y=[]},isSelecting:()=>{var e;return null===(e=c.getFocusedReadingItem())||void 0===e?void 0:e.selectionTracker.isSelecting()},getSelection:()=>{var e;return null===(e=c.getFocusedReadingItem())||void 0===e?void 0:e.selectionTracker.getSelection()},$:a.asObservable()}},J=e=>{const t=e.createElement("div");return t.id="ReadingOrderView",t.className="ReadingOrderView",t.style.height="100%",t.style.transformOrigin="0 0",t};const Q=e=>{var{containerElement:t}=e,o=function(e,t){var n={};for(var i in e)Object.prototype.hasOwnProperty.call(e,i)&&t.indexOf(i)<0&&(n[i]=e[i]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var o=0;for(i=Object.getOwnPropertySymbols(e);o<i.length;o++)t.indexOf(i[o])<0&&Object.prototype.propertyIsEnumerable.call(e,i[o])&&(n[i[o]]=e[i[o]])}return n}(e,["containerElement"]);const r=new n.Subject,a=new n.Subject,d=new n.Subject,l=(e=>{let t,i,o=Object.assign({forceSinglePageMode:!1,pageTurnAnimation:"none",pageTurnAnimationDuration:void 0},e);const r=new n.Subject,a={width:0,height:0,x:0,y:0},s=new n.Subject,d=()=>{const{height:e,width:n}=a,i=n>e;return!o.forceSinglePageMode&&(!i&&"portrait"===(null==t?void 0:t.renditionSpread)||i&&(void 0===(null==t?void 0:t.renditionSpread)||"auto"===(null==t?void 0:t.renditionSpread)||"landscape"===(null==t?void 0:t.renditionSpread)||"both"===(null==t?void 0:t.renditionSpread)))};return{load:(e,n)=>{t=e,i=n},isRTL:()=>"rtl"===(null==t?void 0:t.readingDirection),destroy:()=>{s.next(),s.complete()},getLoadOptions:()=>i,setSettings:e=>{o=Object.assign(Object.assign({},o),e)},getCalculatedInnerMargin:()=>0,getVisibleAreaRect:()=>a,getPageTurnAnimation:()=>o.pageTurnAnimation,getPageTurnAnimationDuration:()=>o.pageTurnAnimationDuration,getComputedPageTurnAnimationDuration:()=>void 0!==o.pageTurnAnimationDuration?o.pageTurnAnimationDuration:300,shouldDisplaySpread:d,setVisibleAreaRect:(e,t,n,i)=>{a.width=n,a.height=i-0-0,a.x=e,a.y=t},getHorizontalMargin:()=>24,getVerticalMargin:()=>20,getPageSize:()=>({width:d()?a.width/2:a.width,height:a.height}),$:r.asObservable(),destroy$:s.asObservable(),emit:e=>{r.next(e)},getManifest:()=>t,getReadingDirection:()=>null==t?void 0:t.readingDirection}})(o),g=(({context:e})=>{const t=new n.Subject,i=E({context:e});let o,r,a,d,l,g,c=0,u=0,m=[];const f=t=>{const n=t.readingItemFrame.getWritingMode(),{width:i,height:o}=t.getElementDimensions();return"vertical-rl"===n?C(o,e.getPageSize().height):C(i,e.getPageSize().width)},h=e=>{const t=f(e.readingItem),n=i.getReadingItemPageIndexFromPosition(e.readingItemPosition,e.readingItem);let o;return void 0===e.options.cfi?(o=i.getCfi(n,e.readingItem),s.log("pagination","cfi",n,o)):o=e.options.cfi,{numberOfPages:t,pageIndex:n,cfi:o}};return{getBeginInfo:()=>({pageIndex:o,absolutePageIndex:m.slice(0,a).reduce(((e,t)=>e+t),null!=o?o:0),cfi:r,numberOfPages:c,readingItemIndex:a}),getEndInfo:()=>({pageIndex:d,absolutePageIndex:m.slice(0,g).reduce(((e,t)=>e+t),null!=d?d:0),cfi:l,numberOfPages:u,readingItemIndex:g}),getTotalNumberOfPages:()=>m.reduce(((e,t)=>e+t),0),updateTotalNumberOfPages:e=>{m=e.map((e=>f(e)),0),t.next({event:"change"})},updateBeginAndEnd:(e,n)=>{const i=h(e),s=h(n);o=i.pageIndex,c=i.numberOfPages,r=i.cfi,a=e.readingItemIndex,d=s.pageIndex,u=s.numberOfPages,l=s.cfi,g=n.readingItemIndex,t.next({event:"change"})},$:t.asObservable()}})({context:l}),c=Z(t),u=ee(t);let m=[];const f=K({containerElement:c,iframeEventBridgeElement:u,context:l,pagination:g});let h;t.appendChild(c),c.appendChild(u);const p=()=>{const e={width:t.offsetWidth,height:t.offsetHeight},n=e.width;c.style.width=n-0+"px",c.style.height=e.height-0-0+"px";const i=c.getBoundingClientRect();null==l||l.setVisibleAreaRect(i.x,i.y,n,e.height),null==f||f.layout()};return f.$.pipe((0,i.tap)((e=>r.next(e))),(0,i.takeUntil)(a)).subscribe(),{pagination:g,context:l,registerHook:function(e,t){["item.onLoad","readingItem.onCreated"].includes(e)&&f.registerHook({name:e,fn:t}),["onViewportOffsetAdjust","onViewportAdjustStart","onViewportAdjustEnd"].includes(e)&&f.viewportNavigator.registerHook({name:e,fn:t})},manipulateReadingItems:e=>{f.manipulateReadingItems(e)},manipulateContainer:e=>{e(c,(e=>{m.push(e)}))},moveTo:f.viewportNavigator.moveTo,turnLeft:f.viewportNavigator.turnLeft,turnRight:f.viewportNavigator.turnRight,goToPageOfCurrentChapter:f.viewportNavigator.goToPageOfCurrentChapter,goTo:f.viewportNavigator.goTo,goToUrl:f.viewportNavigator.goToUrl,getChapterInfo:f.getChapterInfo,getFocusedReadingItemIndex:f.getFocusedReadingItemIndex,getReadingItem:f.getReadingItem,getSelection:f.getSelection,isSelecting:f.isSelecting,normalizeEventForViewport:f.normalizeEventForViewport,getCfiMetaInformation:f.getCfiMetaInformation,resolveCfi:f.resolveCfi,locator:f.locator,getCurrentNavigationPosition:f.getCurrentNavigationPosition,setPageTurnAnimation:e=>l.setSettings({pageTurnAnimation:e}),layout:p,load:(e,t={fetchResource:"http"})=>{l.getManifest()?s.warn("loading a new book is not supported yet"):(s.log("load",{manifest:e,loadOptions:t}),l.load(e,t),f.load(),p(),t.cfi?f.viewportNavigator.goToCfi(t.cfi,{animate:!1}):f.viewportNavigator.goToSpineItem(0,{animate:!1}),null==h||h.unsubscribe(),h=g.$.subscribe(d),r.next({type:"ready"}))},destroy:()=>{m.forEach((e=>e())),m=[],null==h||h.unsubscribe(),l.destroy(),null==f||f.destroy(),c.remove(),u.remove(),a.next(),a.complete()},pagination$:d.asObservable(),$:r.asObservable(),destroy$:a,__debug:{pagination:g,context:l,readingOrderView:f}}},Z=e=>{const t=e.ownerDocument.createElement("div");return t.id="BookView",t.style.setProperty("overflow","hidden"),t.style.setProperty("position","relative"),t},ee=e=>{const t=e.ownerDocument.createElement("div");return t.id="obokuReaderIframeEventBridgeElement",t.style.cssText="\n    position: absolute;\n    height: 100%;\n    width: 100%;\n  ",t};function te(e,t){return t?t(te)(e):Q(e)}const ne=e=>{const{context:t,pagination:n,manipulateContainer:i,manipulateReadingItems:o,getFocusedReadingItemIndex:r,getCurrentNavigationPosition:a,getReadingItem:s,locator:d}=e;return function(e,t){var n={};for(var i in e)Object.prototype.hasOwnProperty.call(e,i)&&t.indexOf(i)<0&&(n[i]=e[i]);if(null!=e&&"function"==typeof Object.getOwnPropertySymbols){var o=0;for(i=Object.getOwnPropertySymbols(e);o<i.length;o++)t.indexOf(i[o])<0&&Object.prototype.propertyIsEnumerable.call(e,i[o])&&(n[i[o]]=e[i[o]])}return n}(e,["context","pagination","manipulateContainer","manipulateReadingItems","getFocusedReadingItemIndex","getCurrentNavigationPosition","getReadingItem","locator"])},ie=c((e=>t=>{const n=e(t);return Object.assign(Object.assign({},n),{getPaginationInfo:()=>{var e;const t=n.pagination,i=n.context,o=n.pagination.getBeginInfo(),r=n.pagination.getEndInfo(),a=void 0!==o.readingItemIndex?n.getReadingItem(o.readingItemIndex):void 0,s=void 0!==r.readingItemIndex?n.getReadingItem(r.readingItemIndex):void 0;if(t&&i)return{begin:{chapterInfo:n.getChapterInfo(),pageIndexInChapter:o.pageIndex,absolutePageIndex:o.absolutePageIndex,numberOfPagesInChapter:o.numberOfPages,readingItemIndex:o.readingItemIndex,spineItemPath:null==a?void 0:a.item.path,spineItemId:null==a?void 0:a.item.id,cfi:o.cfi,spineItemReadingDirection:null==a?void 0:a.getReadingDirection()},end:{chapterInfo:n.getChapterInfo(),pageIndexInChapter:r.pageIndex,absolutePageIndex:r.absolutePageIndex,numberOfPagesInChapter:r.numberOfPages,readingItemIndex:r.readingItemIndex,spineItemPath:null==s?void 0:s.item.path,spineItemId:null==s?void 0:s.item.id,spineItemReadingDirection:null==s?void 0:s.getReadingDirection(),cfi:r.cfi},percentageEstimateOfBook:l(i,null!==(e=r.readingItemIndex)&&void 0!==e?e:0,r.numberOfPages,r.pageIndex||0),numberOfTotalPages:t.getTotalNumberOfPages()}}})}),(e=>t=>{const n=e(t),i=()=>{var e,t;const i=n.getFocusedReadingItemIndex()||0,{end:o=i}=n.locator.getReadingItemsFromReadingOrderPosition(n.getCurrentNavigationPosition())||{};let r=o+1;r<(null!==(t=null===(e=n.context.getManifest())||void 0===e?void 0:e.readingOrder.length)&&void 0!==t?t:0)&&n.goTo(r)},o=()=>{const e=n.getFocusedReadingItemIndex()||0,{begin:t=e}=n.locator.getReadingItemsFromReadingOrderPosition(n.getCurrentNavigationPosition())||{};let i=t-1;i>=0&&n.goTo(i)};return Object.assign(Object.assign({},n),{goToLeftSpineItem:()=>n.context.isRTL()?i():o(),goToRightSpineItem:()=>n.context.isRTL()?o():i()})}),(e=>t=>{const i=e(t),o=new n.Subject;return i.registerHook("item.onLoad",(({frame:e})=>{e.contentDocument&&Array.from(e.contentDocument.querySelectorAll("a")).forEach((e=>e.addEventListener("click",(t=>{t.target&&"style"in t.target&&"ELEMENT_NODE"in t.target&&(s.warn("prevented click on",e,t),t.preventDefault(),(e=>{var t;if(!e.href)return;const n=new URL(e.href),o=`${n.origin}${n.pathname}`;(null===(t=i.context.getManifest())||void 0===t?void 0:t.readingOrder.some((e=>e.href===o)))&&i.goToUrl(n)})(e),o.next({event:"linkClicked",data:e}))}))))})),Object.assign(Object.assign({},i),{links$:o.asObservable()})}),(e=>t=>{const{fontScale:n=1,lineHeight:i,fontWeight:o,fontJustification:r}=t,a=e(t);let s=n,d=i,l=o,g=r;const c=()=>`\n    \n    body {\n      ${1!==s?`font-size: ${s}em !important;`:""}\n      ${void 0!==d?`line-height: ${d} !important;`:""}\n      ${void 0!==l?`font-weight: ${l} !important;`:""}\n      ${void 0!==g?`text-align: ${g} !important;`:""}\n    }\n  `,u=e=>{a.manipulateReadingItems((({removeStyle:t,addStyle:n,item:i})=>("pre-paginated"!==i.renditionLayout&&(t("prose-reader\-fonts"),n("prose-reader\-fonts",c())),e)))};return a.registerHook("item.onLoad",(({removeStyle:e,addStyle:t,item:n})=>{"pre-paginated"!==n.renditionLayout&&(e("prose-reader\-fonts"),t("prose-reader\-fonts",c()))})),Object.assign(Object.assign({},a),{setFontScale:e=>{s=e,u(!0)},setLineHeight:e=>{d="default"===e?void 0:e,u(!0)},setFontWeight:e=>{l="default"===e?void 0:e,u(!1)},setFontJustification:e=>{g="default"===e?void 0:e,u(!1)}})}),(e=>t=>{const{theme:n}=t,i=e(t);let o=n;const r=()=>{const e=g.find((e=>e.name===o));return`\n      body {\n        ${void 0!==e?`background-color: ${e.backgroundColor} !important;`:""}\n      }\n      ${(null==e?void 0:e.foregroundColor)?`\n          body * {\n            \n            color: ${e.foregroundColor};\n          }\n        `:""}\n    `},a=({container:e,loadingElement:t})=>{const n=g.find((e=>e.name===o));n&&(e.style.setProperty("background-color",n.backgroundColor),t.style.setProperty("background-color",n.backgroundColor))};return i.registerHook("item.onLoad",(({removeStyle:e,addStyle:t})=>{e("prose-reader\-theme"),t("prose-reader\-theme",r())})),i.registerHook("readingItem.onCreated",a),Object.assign(Object.assign({},i),{setTheme:e=>{o=e,i.manipulateReadingItems((({removeStyle:e,addStyle:t,container:n,loadingElement:i})=>(e("prose-reader\-theme"),t("prose-reader\-theme",r()),a({container:n,loadingElement:i}),!1)))}})}),(e=>t=>{const n=e(t),i=e=>{"ArrowRight"===e.key&&n.turnRight(),"ArrowLeft"===e.key&&n.turnLeft()};return document.addEventListener("keyup",i),n.registerHook("item.onLoad",(({frame:e})=>{var t;return null===(t=e.contentDocument)||void 0===t||t.addEventListener("keyup",i),()=>{var t;null===(t=e.contentDocument)||void 0===t||t.removeEventListener("keyup",i)}})),Object.assign(Object.assign({},n),{destroy:()=>{document.removeEventListener("keyup",i),n.destroy()}})}),(e=>t=>{const o=e(t);o.manipulateContainer(((e,t)=>{const n=()=>{e.scrollTo(0,0)};return e.addEventListener("scroll",n),t((()=>{e.removeEventListener("scroll",n)})),!1})),o.registerHook("item.onLoad",(({frame:e})=>{var t;null===(t=e.contentDocument)||void 0===t||t.body.setAttribute("tabindex","-1")}));const r=o.$.pipe((0,i.tap)((()=>{})));return(0,n.merge)(r).pipe((0,i.takeUntil)(o.destroy$)).subscribe(),o}),(e=>t=>{const n=e(t);let i,o={x:0,y:0},r={x:0,y:0},a=1;return Object.assign(Object.assign({},n),{destroy:()=>{null==i||i.remove(),i=void 0,n.destroy()},zoom:{enter:e=>{n.manipulateContainer((t=>{i=t.ownerDocument.createElement("div"),i.style.cssText="\n        top: 0;\n        left: 0;\n        display: block;\n        position: absolute;\n        z-index: 1;\n        background: black;\n        width: 100%;\n        height: 100%;\n      ";const n=e.cloneNode();return n.src=e.src,n.style.setProperty("height","100%"),n.style.setProperty("width","100%"),n.style.setProperty("object-fit","contain"),n.style.setProperty("pointer-events","none"),i.appendChild(n),t.appendChild(i),o={x:0,y:0},a=1,!1}))},exit:()=>{n.manipulateContainer((()=>(null==i||i.remove(),i=void 0,!1)))},move:(e,{isFirst:t,isLast:n})=>{const s=null==i?void 0:i.querySelector("img");if(t&&(r={x:0,y:0}),e){const t=e.x-((null==r?void 0:r.x)||0),n=e.y-((null==r?void 0:r.y)||0);o={x:o.x+t,y:o.y+n},null==s||s.style.setProperty("transform",`translate3d(${o.x}px, ${o.y}px, 0px) scale3d(${a}, ${a}, 1)`),r=e}n&&(r=void 0)},isEnabled:()=>!!i,scale:e=>{const t=null==i?void 0:i.querySelector("img"),n=Math.ceil(100*e)/100,r=Math.max(n,1);n<1&&(o={x:0,y:0}),null==t||t.style.setProperty("transform",`translate3d(${o.x}px, ${o.y}px, 0px) scale3d(${r}, ${r}, 1)`),a=r}}})}),(e=>t=>{const o=e(t);let r;const a=new n.Subject;return o.registerHook("onViewportOffsetAdjust",(()=>{let e=!1;o.manipulateReadingItems((({frame:t})=>(!e&&t&&(t.getBoundingClientRect().left,e=!0),!1)))})),o.registerHook("onViewportAdjustStart",(({animate:e})=>{e&&a.next("start")})),o.registerHook("onViewportAdjustEnd",(()=>{a.next("end")})),o.manipulateContainer(((e,t)=>(r=e.ownerDocument.createElement("div"),r.style.cssText="\n      position: absolute;\n      left: 0;\n      top: 0;\n      width: 100%;\n      height: 100%;\n      visibility: hidden;\n    ",e.appendChild(r),t((()=>{null==r||r.remove()})),!1))),a.pipe((0,i.filter)((e=>"start"===e)),(0,i.switchMap)((()=>(null==r||r.style.setProperty("visibility","visible"),a.pipe((0,i.filter)((e=>"end"===e)),(0,i.tap)((()=>{null==r||r.style.setProperty("visibility","hidden")})))))),(0,i.takeUntil)(o.destroy$)).subscribe(),o}),(e=>t=>{const n=e(t);return Object.assign(Object.assign({},n),{utils:{isOrIsWithinValidLink:e=>{if("object"==typeof(t=e)&&t&&"nodeType"in t&&(null==t?void 0:t.nodeType)===Node.ELEMENT_NODE&&"innerText"in t){const t="a"===e.nodeName?e:e.closest("a");if(null==t?void 0:t.getAttribute("href"))return!0}var t;return!1}}})}));function oe(e,t){return ne(te(e,t?c(t,ie):ie))}var re=exports;for(var ae in t)re[ae]=t[ae];t.__esModule&&Object.defineProperty(re,"__esModule",{value:!0})})();

/***/ }),

/***/ "./node_modules/hammerjs/hammer.js":
/*!*****************************************!*\
  !*** ./node_modules/hammerjs/hammer.js ***!
  \*****************************************/
/***/ ((module, exports, __webpack_require__) => {

var __WEBPACK_AMD_DEFINE_RESULT__;/*! Hammer.JS - v2.0.7 - 2016-04-22
 * http://hammerjs.github.io/
 *
 * Copyright (c) 2016 Jorik Tangelder;
 * Licensed under the MIT license */
(function(window, document, exportName, undefined) {
  'use strict';

var VENDOR_PREFIXES = ['', 'webkit', 'Moz', 'MS', 'ms', 'o'];
var TEST_ELEMENT = document.createElement('div');

var TYPE_FUNCTION = 'function';

var round = Math.round;
var abs = Math.abs;
var now = Date.now;

/**
 * set a timeout with a given scope
 * @param {Function} fn
 * @param {Number} timeout
 * @param {Object} context
 * @returns {number}
 */
function setTimeoutContext(fn, timeout, context) {
    return setTimeout(bindFn(fn, context), timeout);
}

/**
 * if the argument is an array, we want to execute the fn on each entry
 * if it aint an array we don't want to do a thing.
 * this is used by all the methods that accept a single and array argument.
 * @param {*|Array} arg
 * @param {String} fn
 * @param {Object} [context]
 * @returns {Boolean}
 */
function invokeArrayArg(arg, fn, context) {
    if (Array.isArray(arg)) {
        each(arg, context[fn], context);
        return true;
    }
    return false;
}

/**
 * walk objects and arrays
 * @param {Object} obj
 * @param {Function} iterator
 * @param {Object} context
 */
function each(obj, iterator, context) {
    var i;

    if (!obj) {
        return;
    }

    if (obj.forEach) {
        obj.forEach(iterator, context);
    } else if (obj.length !== undefined) {
        i = 0;
        while (i < obj.length) {
            iterator.call(context, obj[i], i, obj);
            i++;
        }
    } else {
        for (i in obj) {
            obj.hasOwnProperty(i) && iterator.call(context, obj[i], i, obj);
        }
    }
}

/**
 * wrap a method with a deprecation warning and stack trace
 * @param {Function} method
 * @param {String} name
 * @param {String} message
 * @returns {Function} A new function wrapping the supplied method.
 */
function deprecate(method, name, message) {
    var deprecationMessage = 'DEPRECATED METHOD: ' + name + '\n' + message + ' AT \n';
    return function() {
        var e = new Error('get-stack-trace');
        var stack = e && e.stack ? e.stack.replace(/^[^\(]+?[\n$]/gm, '')
            .replace(/^\s+at\s+/gm, '')
            .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@') : 'Unknown Stack Trace';

        var log = window.console && (window.console.warn || window.console.log);
        if (log) {
            log.call(window.console, deprecationMessage, stack);
        }
        return method.apply(this, arguments);
    };
}

/**
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} target
 * @param {...Object} objects_to_assign
 * @returns {Object} target
 */
var assign;
if (typeof Object.assign !== 'function') {
    assign = function assign(target) {
        if (target === undefined || target === null) {
            throw new TypeError('Cannot convert undefined or null to object');
        }

        var output = Object(target);
        for (var index = 1; index < arguments.length; index++) {
            var source = arguments[index];
            if (source !== undefined && source !== null) {
                for (var nextKey in source) {
                    if (source.hasOwnProperty(nextKey)) {
                        output[nextKey] = source[nextKey];
                    }
                }
            }
        }
        return output;
    };
} else {
    assign = Object.assign;
}

/**
 * extend object.
 * means that properties in dest will be overwritten by the ones in src.
 * @param {Object} dest
 * @param {Object} src
 * @param {Boolean} [merge=false]
 * @returns {Object} dest
 */
var extend = deprecate(function extend(dest, src, merge) {
    var keys = Object.keys(src);
    var i = 0;
    while (i < keys.length) {
        if (!merge || (merge && dest[keys[i]] === undefined)) {
            dest[keys[i]] = src[keys[i]];
        }
        i++;
    }
    return dest;
}, 'extend', 'Use `assign`.');

/**
 * merge the values from src in the dest.
 * means that properties that exist in dest will not be overwritten by src
 * @param {Object} dest
 * @param {Object} src
 * @returns {Object} dest
 */
var merge = deprecate(function merge(dest, src) {
    return extend(dest, src, true);
}, 'merge', 'Use `assign`.');

/**
 * simple class inheritance
 * @param {Function} child
 * @param {Function} base
 * @param {Object} [properties]
 */
function inherit(child, base, properties) {
    var baseP = base.prototype,
        childP;

    childP = child.prototype = Object.create(baseP);
    childP.constructor = child;
    childP._super = baseP;

    if (properties) {
        assign(childP, properties);
    }
}

/**
 * simple function bind
 * @param {Function} fn
 * @param {Object} context
 * @returns {Function}
 */
function bindFn(fn, context) {
    return function boundFn() {
        return fn.apply(context, arguments);
    };
}

/**
 * let a boolean value also be a function that must return a boolean
 * this first item in args will be used as the context
 * @param {Boolean|Function} val
 * @param {Array} [args]
 * @returns {Boolean}
 */
function boolOrFn(val, args) {
    if (typeof val == TYPE_FUNCTION) {
        return val.apply(args ? args[0] || undefined : undefined, args);
    }
    return val;
}

/**
 * use the val2 when val1 is undefined
 * @param {*} val1
 * @param {*} val2
 * @returns {*}
 */
function ifUndefined(val1, val2) {
    return (val1 === undefined) ? val2 : val1;
}

/**
 * addEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */
function addEventListeners(target, types, handler) {
    each(splitStr(types), function(type) {
        target.addEventListener(type, handler, false);
    });
}

/**
 * removeEventListener with multiple events at once
 * @param {EventTarget} target
 * @param {String} types
 * @param {Function} handler
 */
function removeEventListeners(target, types, handler) {
    each(splitStr(types), function(type) {
        target.removeEventListener(type, handler, false);
    });
}

/**
 * find if a node is in the given parent
 * @method hasParent
 * @param {HTMLElement} node
 * @param {HTMLElement} parent
 * @return {Boolean} found
 */
function hasParent(node, parent) {
    while (node) {
        if (node == parent) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
}

/**
 * small indexOf wrapper
 * @param {String} str
 * @param {String} find
 * @returns {Boolean} found
 */
function inStr(str, find) {
    return str.indexOf(find) > -1;
}

/**
 * split string on whitespace
 * @param {String} str
 * @returns {Array} words
 */
function splitStr(str) {
    return str.trim().split(/\s+/g);
}

/**
 * find if a array contains the object using indexOf or a simple polyFill
 * @param {Array} src
 * @param {String} find
 * @param {String} [findByKey]
 * @return {Boolean|Number} false when not found, or the index
 */
function inArray(src, find, findByKey) {
    if (src.indexOf && !findByKey) {
        return src.indexOf(find);
    } else {
        var i = 0;
        while (i < src.length) {
            if ((findByKey && src[i][findByKey] == find) || (!findByKey && src[i] === find)) {
                return i;
            }
            i++;
        }
        return -1;
    }
}

/**
 * convert array-like objects to real arrays
 * @param {Object} obj
 * @returns {Array}
 */
function toArray(obj) {
    return Array.prototype.slice.call(obj, 0);
}

/**
 * unique array with objects based on a key (like 'id') or just by the array's value
 * @param {Array} src [{id:1},{id:2},{id:1}]
 * @param {String} [key]
 * @param {Boolean} [sort=False]
 * @returns {Array} [{id:1},{id:2}]
 */
function uniqueArray(src, key, sort) {
    var results = [];
    var values = [];
    var i = 0;

    while (i < src.length) {
        var val = key ? src[i][key] : src[i];
        if (inArray(values, val) < 0) {
            results.push(src[i]);
        }
        values[i] = val;
        i++;
    }

    if (sort) {
        if (!key) {
            results = results.sort();
        } else {
            results = results.sort(function sortUniqueArray(a, b) {
                return a[key] > b[key];
            });
        }
    }

    return results;
}

/**
 * get the prefixed property
 * @param {Object} obj
 * @param {String} property
 * @returns {String|Undefined} prefixed
 */
function prefixed(obj, property) {
    var prefix, prop;
    var camelProp = property[0].toUpperCase() + property.slice(1);

    var i = 0;
    while (i < VENDOR_PREFIXES.length) {
        prefix = VENDOR_PREFIXES[i];
        prop = (prefix) ? prefix + camelProp : property;

        if (prop in obj) {
            return prop;
        }
        i++;
    }
    return undefined;
}

/**
 * get a unique id
 * @returns {number} uniqueId
 */
var _uniqueId = 1;
function uniqueId() {
    return _uniqueId++;
}

/**
 * get the window object of an element
 * @param {HTMLElement} element
 * @returns {DocumentView|Window}
 */
function getWindowForElement(element) {
    var doc = element.ownerDocument || element;
    return (doc.defaultView || doc.parentWindow || window);
}

var MOBILE_REGEX = /mobile|tablet|ip(ad|hone|od)|android/i;

var SUPPORT_TOUCH = ('ontouchstart' in window);
var SUPPORT_POINTER_EVENTS = prefixed(window, 'PointerEvent') !== undefined;
var SUPPORT_ONLY_TOUCH = SUPPORT_TOUCH && MOBILE_REGEX.test(navigator.userAgent);

var INPUT_TYPE_TOUCH = 'touch';
var INPUT_TYPE_PEN = 'pen';
var INPUT_TYPE_MOUSE = 'mouse';
var INPUT_TYPE_KINECT = 'kinect';

var COMPUTE_INTERVAL = 25;

var INPUT_START = 1;
var INPUT_MOVE = 2;
var INPUT_END = 4;
var INPUT_CANCEL = 8;

var DIRECTION_NONE = 1;
var DIRECTION_LEFT = 2;
var DIRECTION_RIGHT = 4;
var DIRECTION_UP = 8;
var DIRECTION_DOWN = 16;

var DIRECTION_HORIZONTAL = DIRECTION_LEFT | DIRECTION_RIGHT;
var DIRECTION_VERTICAL = DIRECTION_UP | DIRECTION_DOWN;
var DIRECTION_ALL = DIRECTION_HORIZONTAL | DIRECTION_VERTICAL;

var PROPS_XY = ['x', 'y'];
var PROPS_CLIENT_XY = ['clientX', 'clientY'];

/**
 * create new input type manager
 * @param {Manager} manager
 * @param {Function} callback
 * @returns {Input}
 * @constructor
 */
function Input(manager, callback) {
    var self = this;
    this.manager = manager;
    this.callback = callback;
    this.element = manager.element;
    this.target = manager.options.inputTarget;

    // smaller wrapper around the handler, for the scope and the enabled state of the manager,
    // so when disabled the input events are completely bypassed.
    this.domHandler = function(ev) {
        if (boolOrFn(manager.options.enable, [manager])) {
            self.handler(ev);
        }
    };

    this.init();

}

Input.prototype = {
    /**
     * should handle the inputEvent data and trigger the callback
     * @virtual
     */
    handler: function() { },

    /**
     * bind the events
     */
    init: function() {
        this.evEl && addEventListeners(this.element, this.evEl, this.domHandler);
        this.evTarget && addEventListeners(this.target, this.evTarget, this.domHandler);
        this.evWin && addEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
    },

    /**
     * unbind the events
     */
    destroy: function() {
        this.evEl && removeEventListeners(this.element, this.evEl, this.domHandler);
        this.evTarget && removeEventListeners(this.target, this.evTarget, this.domHandler);
        this.evWin && removeEventListeners(getWindowForElement(this.element), this.evWin, this.domHandler);
    }
};

/**
 * create new input type manager
 * called by the Manager constructor
 * @param {Hammer} manager
 * @returns {Input}
 */
function createInputInstance(manager) {
    var Type;
    var inputClass = manager.options.inputClass;

    if (inputClass) {
        Type = inputClass;
    } else if (SUPPORT_POINTER_EVENTS) {
        Type = PointerEventInput;
    } else if (SUPPORT_ONLY_TOUCH) {
        Type = TouchInput;
    } else if (!SUPPORT_TOUCH) {
        Type = MouseInput;
    } else {
        Type = TouchMouseInput;
    }
    return new (Type)(manager, inputHandler);
}

/**
 * handle input events
 * @param {Manager} manager
 * @param {String} eventType
 * @param {Object} input
 */
function inputHandler(manager, eventType, input) {
    var pointersLen = input.pointers.length;
    var changedPointersLen = input.changedPointers.length;
    var isFirst = (eventType & INPUT_START && (pointersLen - changedPointersLen === 0));
    var isFinal = (eventType & (INPUT_END | INPUT_CANCEL) && (pointersLen - changedPointersLen === 0));

    input.isFirst = !!isFirst;
    input.isFinal = !!isFinal;

    if (isFirst) {
        manager.session = {};
    }

    // source event is the normalized value of the domEvents
    // like 'touchstart, mouseup, pointerdown'
    input.eventType = eventType;

    // compute scale, rotation etc
    computeInputData(manager, input);

    // emit secret event
    manager.emit('hammer.input', input);

    manager.recognize(input);
    manager.session.prevInput = input;
}

/**
 * extend the data with some usable properties like scale, rotate, velocity etc
 * @param {Object} manager
 * @param {Object} input
 */
function computeInputData(manager, input) {
    var session = manager.session;
    var pointers = input.pointers;
    var pointersLength = pointers.length;

    // store the first input to calculate the distance and direction
    if (!session.firstInput) {
        session.firstInput = simpleCloneInputData(input);
    }

    // to compute scale and rotation we need to store the multiple touches
    if (pointersLength > 1 && !session.firstMultiple) {
        session.firstMultiple = simpleCloneInputData(input);
    } else if (pointersLength === 1) {
        session.firstMultiple = false;
    }

    var firstInput = session.firstInput;
    var firstMultiple = session.firstMultiple;
    var offsetCenter = firstMultiple ? firstMultiple.center : firstInput.center;

    var center = input.center = getCenter(pointers);
    input.timeStamp = now();
    input.deltaTime = input.timeStamp - firstInput.timeStamp;

    input.angle = getAngle(offsetCenter, center);
    input.distance = getDistance(offsetCenter, center);

    computeDeltaXY(session, input);
    input.offsetDirection = getDirection(input.deltaX, input.deltaY);

    var overallVelocity = getVelocity(input.deltaTime, input.deltaX, input.deltaY);
    input.overallVelocityX = overallVelocity.x;
    input.overallVelocityY = overallVelocity.y;
    input.overallVelocity = (abs(overallVelocity.x) > abs(overallVelocity.y)) ? overallVelocity.x : overallVelocity.y;

    input.scale = firstMultiple ? getScale(firstMultiple.pointers, pointers) : 1;
    input.rotation = firstMultiple ? getRotation(firstMultiple.pointers, pointers) : 0;

    input.maxPointers = !session.prevInput ? input.pointers.length : ((input.pointers.length >
        session.prevInput.maxPointers) ? input.pointers.length : session.prevInput.maxPointers);

    computeIntervalInputData(session, input);

    // find the correct target
    var target = manager.element;
    if (hasParent(input.srcEvent.target, target)) {
        target = input.srcEvent.target;
    }
    input.target = target;
}

function computeDeltaXY(session, input) {
    var center = input.center;
    var offset = session.offsetDelta || {};
    var prevDelta = session.prevDelta || {};
    var prevInput = session.prevInput || {};

    if (input.eventType === INPUT_START || prevInput.eventType === INPUT_END) {
        prevDelta = session.prevDelta = {
            x: prevInput.deltaX || 0,
            y: prevInput.deltaY || 0
        };

        offset = session.offsetDelta = {
            x: center.x,
            y: center.y
        };
    }

    input.deltaX = prevDelta.x + (center.x - offset.x);
    input.deltaY = prevDelta.y + (center.y - offset.y);
}

/**
 * velocity is calculated every x ms
 * @param {Object} session
 * @param {Object} input
 */
function computeIntervalInputData(session, input) {
    var last = session.lastInterval || input,
        deltaTime = input.timeStamp - last.timeStamp,
        velocity, velocityX, velocityY, direction;

    if (input.eventType != INPUT_CANCEL && (deltaTime > COMPUTE_INTERVAL || last.velocity === undefined)) {
        var deltaX = input.deltaX - last.deltaX;
        var deltaY = input.deltaY - last.deltaY;

        var v = getVelocity(deltaTime, deltaX, deltaY);
        velocityX = v.x;
        velocityY = v.y;
        velocity = (abs(v.x) > abs(v.y)) ? v.x : v.y;
        direction = getDirection(deltaX, deltaY);

        session.lastInterval = input;
    } else {
        // use latest velocity info if it doesn't overtake a minimum period
        velocity = last.velocity;
        velocityX = last.velocityX;
        velocityY = last.velocityY;
        direction = last.direction;
    }

    input.velocity = velocity;
    input.velocityX = velocityX;
    input.velocityY = velocityY;
    input.direction = direction;
}

/**
 * create a simple clone from the input used for storage of firstInput and firstMultiple
 * @param {Object} input
 * @returns {Object} clonedInputData
 */
function simpleCloneInputData(input) {
    // make a simple copy of the pointers because we will get a reference if we don't
    // we only need clientXY for the calculations
    var pointers = [];
    var i = 0;
    while (i < input.pointers.length) {
        pointers[i] = {
            clientX: round(input.pointers[i].clientX),
            clientY: round(input.pointers[i].clientY)
        };
        i++;
    }

    return {
        timeStamp: now(),
        pointers: pointers,
        center: getCenter(pointers),
        deltaX: input.deltaX,
        deltaY: input.deltaY
    };
}

/**
 * get the center of all the pointers
 * @param {Array} pointers
 * @return {Object} center contains `x` and `y` properties
 */
function getCenter(pointers) {
    var pointersLength = pointers.length;

    // no need to loop when only one touch
    if (pointersLength === 1) {
        return {
            x: round(pointers[0].clientX),
            y: round(pointers[0].clientY)
        };
    }

    var x = 0, y = 0, i = 0;
    while (i < pointersLength) {
        x += pointers[i].clientX;
        y += pointers[i].clientY;
        i++;
    }

    return {
        x: round(x / pointersLength),
        y: round(y / pointersLength)
    };
}

/**
 * calculate the velocity between two points. unit is in px per ms.
 * @param {Number} deltaTime
 * @param {Number} x
 * @param {Number} y
 * @return {Object} velocity `x` and `y`
 */
function getVelocity(deltaTime, x, y) {
    return {
        x: x / deltaTime || 0,
        y: y / deltaTime || 0
    };
}

/**
 * get the direction between two points
 * @param {Number} x
 * @param {Number} y
 * @return {Number} direction
 */
function getDirection(x, y) {
    if (x === y) {
        return DIRECTION_NONE;
    }

    if (abs(x) >= abs(y)) {
        return x < 0 ? DIRECTION_LEFT : DIRECTION_RIGHT;
    }
    return y < 0 ? DIRECTION_UP : DIRECTION_DOWN;
}

/**
 * calculate the absolute distance between two points
 * @param {Object} p1 {x, y}
 * @param {Object} p2 {x, y}
 * @param {Array} [props] containing x and y keys
 * @return {Number} distance
 */
function getDistance(p1, p2, props) {
    if (!props) {
        props = PROPS_XY;
    }
    var x = p2[props[0]] - p1[props[0]],
        y = p2[props[1]] - p1[props[1]];

    return Math.sqrt((x * x) + (y * y));
}

/**
 * calculate the angle between two coordinates
 * @param {Object} p1
 * @param {Object} p2
 * @param {Array} [props] containing x and y keys
 * @return {Number} angle
 */
function getAngle(p1, p2, props) {
    if (!props) {
        props = PROPS_XY;
    }
    var x = p2[props[0]] - p1[props[0]],
        y = p2[props[1]] - p1[props[1]];
    return Math.atan2(y, x) * 180 / Math.PI;
}

/**
 * calculate the rotation degrees between two pointersets
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} rotation
 */
function getRotation(start, end) {
    return getAngle(end[1], end[0], PROPS_CLIENT_XY) + getAngle(start[1], start[0], PROPS_CLIENT_XY);
}

/**
 * calculate the scale factor between two pointersets
 * no scale is 1, and goes down to 0 when pinched together, and bigger when pinched out
 * @param {Array} start array of pointers
 * @param {Array} end array of pointers
 * @return {Number} scale
 */
function getScale(start, end) {
    return getDistance(end[0], end[1], PROPS_CLIENT_XY) / getDistance(start[0], start[1], PROPS_CLIENT_XY);
}

var MOUSE_INPUT_MAP = {
    mousedown: INPUT_START,
    mousemove: INPUT_MOVE,
    mouseup: INPUT_END
};

var MOUSE_ELEMENT_EVENTS = 'mousedown';
var MOUSE_WINDOW_EVENTS = 'mousemove mouseup';

/**
 * Mouse events input
 * @constructor
 * @extends Input
 */
function MouseInput() {
    this.evEl = MOUSE_ELEMENT_EVENTS;
    this.evWin = MOUSE_WINDOW_EVENTS;

    this.pressed = false; // mousedown state

    Input.apply(this, arguments);
}

inherit(MouseInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function MEhandler(ev) {
        var eventType = MOUSE_INPUT_MAP[ev.type];

        // on start we want to have the left mouse button down
        if (eventType & INPUT_START && ev.button === 0) {
            this.pressed = true;
        }

        if (eventType & INPUT_MOVE && ev.which !== 1) {
            eventType = INPUT_END;
        }

        // mouse must be down
        if (!this.pressed) {
            return;
        }

        if (eventType & INPUT_END) {
            this.pressed = false;
        }

        this.callback(this.manager, eventType, {
            pointers: [ev],
            changedPointers: [ev],
            pointerType: INPUT_TYPE_MOUSE,
            srcEvent: ev
        });
    }
});

var POINTER_INPUT_MAP = {
    pointerdown: INPUT_START,
    pointermove: INPUT_MOVE,
    pointerup: INPUT_END,
    pointercancel: INPUT_CANCEL,
    pointerout: INPUT_CANCEL
};

// in IE10 the pointer types is defined as an enum
var IE10_POINTER_TYPE_ENUM = {
    2: INPUT_TYPE_TOUCH,
    3: INPUT_TYPE_PEN,
    4: INPUT_TYPE_MOUSE,
    5: INPUT_TYPE_KINECT // see https://twitter.com/jacobrossi/status/480596438489890816
};

var POINTER_ELEMENT_EVENTS = 'pointerdown';
var POINTER_WINDOW_EVENTS = 'pointermove pointerup pointercancel';

// IE10 has prefixed support, and case-sensitive
if (window.MSPointerEvent && !window.PointerEvent) {
    POINTER_ELEMENT_EVENTS = 'MSPointerDown';
    POINTER_WINDOW_EVENTS = 'MSPointerMove MSPointerUp MSPointerCancel';
}

/**
 * Pointer events input
 * @constructor
 * @extends Input
 */
function PointerEventInput() {
    this.evEl = POINTER_ELEMENT_EVENTS;
    this.evWin = POINTER_WINDOW_EVENTS;

    Input.apply(this, arguments);

    this.store = (this.manager.session.pointerEvents = []);
}

inherit(PointerEventInput, Input, {
    /**
     * handle mouse events
     * @param {Object} ev
     */
    handler: function PEhandler(ev) {
        var store = this.store;
        var removePointer = false;

        var eventTypeNormalized = ev.type.toLowerCase().replace('ms', '');
        var eventType = POINTER_INPUT_MAP[eventTypeNormalized];
        var pointerType = IE10_POINTER_TYPE_ENUM[ev.pointerType] || ev.pointerType;

        var isTouch = (pointerType == INPUT_TYPE_TOUCH);

        // get index of the event in the store
        var storeIndex = inArray(store, ev.pointerId, 'pointerId');

        // start and mouse must be down
        if (eventType & INPUT_START && (ev.button === 0 || isTouch)) {
            if (storeIndex < 0) {
                store.push(ev);
                storeIndex = store.length - 1;
            }
        } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
            removePointer = true;
        }

        // it not found, so the pointer hasn't been down (so it's probably a hover)
        if (storeIndex < 0) {
            return;
        }

        // update the event in the store
        store[storeIndex] = ev;

        this.callback(this.manager, eventType, {
            pointers: store,
            changedPointers: [ev],
            pointerType: pointerType,
            srcEvent: ev
        });

        if (removePointer) {
            // remove from the store
            store.splice(storeIndex, 1);
        }
    }
});

var SINGLE_TOUCH_INPUT_MAP = {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
};

var SINGLE_TOUCH_TARGET_EVENTS = 'touchstart';
var SINGLE_TOUCH_WINDOW_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Touch events input
 * @constructor
 * @extends Input
 */
function SingleTouchInput() {
    this.evTarget = SINGLE_TOUCH_TARGET_EVENTS;
    this.evWin = SINGLE_TOUCH_WINDOW_EVENTS;
    this.started = false;

    Input.apply(this, arguments);
}

inherit(SingleTouchInput, Input, {
    handler: function TEhandler(ev) {
        var type = SINGLE_TOUCH_INPUT_MAP[ev.type];

        // should we handle the touch events?
        if (type === INPUT_START) {
            this.started = true;
        }

        if (!this.started) {
            return;
        }

        var touches = normalizeSingleTouches.call(this, ev, type);

        // when done, reset the started state
        if (type & (INPUT_END | INPUT_CANCEL) && touches[0].length - touches[1].length === 0) {
            this.started = false;
        }

        this.callback(this.manager, type, {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
        });
    }
});

/**
 * @this {TouchInput}
 * @param {Object} ev
 * @param {Number} type flag
 * @returns {undefined|Array} [all, changed]
 */
function normalizeSingleTouches(ev, type) {
    var all = toArray(ev.touches);
    var changed = toArray(ev.changedTouches);

    if (type & (INPUT_END | INPUT_CANCEL)) {
        all = uniqueArray(all.concat(changed), 'identifier', true);
    }

    return [all, changed];
}

var TOUCH_INPUT_MAP = {
    touchstart: INPUT_START,
    touchmove: INPUT_MOVE,
    touchend: INPUT_END,
    touchcancel: INPUT_CANCEL
};

var TOUCH_TARGET_EVENTS = 'touchstart touchmove touchend touchcancel';

/**
 * Multi-user touch events input
 * @constructor
 * @extends Input
 */
function TouchInput() {
    this.evTarget = TOUCH_TARGET_EVENTS;
    this.targetIds = {};

    Input.apply(this, arguments);
}

inherit(TouchInput, Input, {
    handler: function MTEhandler(ev) {
        var type = TOUCH_INPUT_MAP[ev.type];
        var touches = getTouches.call(this, ev, type);
        if (!touches) {
            return;
        }

        this.callback(this.manager, type, {
            pointers: touches[0],
            changedPointers: touches[1],
            pointerType: INPUT_TYPE_TOUCH,
            srcEvent: ev
        });
    }
});

/**
 * @this {TouchInput}
 * @param {Object} ev
 * @param {Number} type flag
 * @returns {undefined|Array} [all, changed]
 */
function getTouches(ev, type) {
    var allTouches = toArray(ev.touches);
    var targetIds = this.targetIds;

    // when there is only one touch, the process can be simplified
    if (type & (INPUT_START | INPUT_MOVE) && allTouches.length === 1) {
        targetIds[allTouches[0].identifier] = true;
        return [allTouches, allTouches];
    }

    var i,
        targetTouches,
        changedTouches = toArray(ev.changedTouches),
        changedTargetTouches = [],
        target = this.target;

    // get target touches from touches
    targetTouches = allTouches.filter(function(touch) {
        return hasParent(touch.target, target);
    });

    // collect touches
    if (type === INPUT_START) {
        i = 0;
        while (i < targetTouches.length) {
            targetIds[targetTouches[i].identifier] = true;
            i++;
        }
    }

    // filter changed touches to only contain touches that exist in the collected target ids
    i = 0;
    while (i < changedTouches.length) {
        if (targetIds[changedTouches[i].identifier]) {
            changedTargetTouches.push(changedTouches[i]);
        }

        // cleanup removed touches
        if (type & (INPUT_END | INPUT_CANCEL)) {
            delete targetIds[changedTouches[i].identifier];
        }
        i++;
    }

    if (!changedTargetTouches.length) {
        return;
    }

    return [
        // merge targetTouches with changedTargetTouches so it contains ALL touches, including 'end' and 'cancel'
        uniqueArray(targetTouches.concat(changedTargetTouches), 'identifier', true),
        changedTargetTouches
    ];
}

/**
 * Combined touch and mouse input
 *
 * Touch has a higher priority then mouse, and while touching no mouse events are allowed.
 * This because touch devices also emit mouse events while doing a touch.
 *
 * @constructor
 * @extends Input
 */

var DEDUP_TIMEOUT = 2500;
var DEDUP_DISTANCE = 25;

function TouchMouseInput() {
    Input.apply(this, arguments);

    var handler = bindFn(this.handler, this);
    this.touch = new TouchInput(this.manager, handler);
    this.mouse = new MouseInput(this.manager, handler);

    this.primaryTouch = null;
    this.lastTouches = [];
}

inherit(TouchMouseInput, Input, {
    /**
     * handle mouse and touch events
     * @param {Hammer} manager
     * @param {String} inputEvent
     * @param {Object} inputData
     */
    handler: function TMEhandler(manager, inputEvent, inputData) {
        var isTouch = (inputData.pointerType == INPUT_TYPE_TOUCH),
            isMouse = (inputData.pointerType == INPUT_TYPE_MOUSE);

        if (isMouse && inputData.sourceCapabilities && inputData.sourceCapabilities.firesTouchEvents) {
            return;
        }

        // when we're in a touch event, record touches to  de-dupe synthetic mouse event
        if (isTouch) {
            recordTouches.call(this, inputEvent, inputData);
        } else if (isMouse && isSyntheticEvent.call(this, inputData)) {
            return;
        }

        this.callback(manager, inputEvent, inputData);
    },

    /**
     * remove the event listeners
     */
    destroy: function destroy() {
        this.touch.destroy();
        this.mouse.destroy();
    }
});

function recordTouches(eventType, eventData) {
    if (eventType & INPUT_START) {
        this.primaryTouch = eventData.changedPointers[0].identifier;
        setLastTouch.call(this, eventData);
    } else if (eventType & (INPUT_END | INPUT_CANCEL)) {
        setLastTouch.call(this, eventData);
    }
}

function setLastTouch(eventData) {
    var touch = eventData.changedPointers[0];

    if (touch.identifier === this.primaryTouch) {
        var lastTouch = {x: touch.clientX, y: touch.clientY};
        this.lastTouches.push(lastTouch);
        var lts = this.lastTouches;
        var removeLastTouch = function() {
            var i = lts.indexOf(lastTouch);
            if (i > -1) {
                lts.splice(i, 1);
            }
        };
        setTimeout(removeLastTouch, DEDUP_TIMEOUT);
    }
}

function isSyntheticEvent(eventData) {
    var x = eventData.srcEvent.clientX, y = eventData.srcEvent.clientY;
    for (var i = 0; i < this.lastTouches.length; i++) {
        var t = this.lastTouches[i];
        var dx = Math.abs(x - t.x), dy = Math.abs(y - t.y);
        if (dx <= DEDUP_DISTANCE && dy <= DEDUP_DISTANCE) {
            return true;
        }
    }
    return false;
}

var PREFIXED_TOUCH_ACTION = prefixed(TEST_ELEMENT.style, 'touchAction');
var NATIVE_TOUCH_ACTION = PREFIXED_TOUCH_ACTION !== undefined;

// magical touchAction value
var TOUCH_ACTION_COMPUTE = 'compute';
var TOUCH_ACTION_AUTO = 'auto';
var TOUCH_ACTION_MANIPULATION = 'manipulation'; // not implemented
var TOUCH_ACTION_NONE = 'none';
var TOUCH_ACTION_PAN_X = 'pan-x';
var TOUCH_ACTION_PAN_Y = 'pan-y';
var TOUCH_ACTION_MAP = getTouchActionProps();

/**
 * Touch Action
 * sets the touchAction property or uses the js alternative
 * @param {Manager} manager
 * @param {String} value
 * @constructor
 */
function TouchAction(manager, value) {
    this.manager = manager;
    this.set(value);
}

TouchAction.prototype = {
    /**
     * set the touchAction value on the element or enable the polyfill
     * @param {String} value
     */
    set: function(value) {
        // find out the touch-action by the event handlers
        if (value == TOUCH_ACTION_COMPUTE) {
            value = this.compute();
        }

        if (NATIVE_TOUCH_ACTION && this.manager.element.style && TOUCH_ACTION_MAP[value]) {
            this.manager.element.style[PREFIXED_TOUCH_ACTION] = value;
        }
        this.actions = value.toLowerCase().trim();
    },

    /**
     * just re-set the touchAction value
     */
    update: function() {
        this.set(this.manager.options.touchAction);
    },

    /**
     * compute the value for the touchAction property based on the recognizer's settings
     * @returns {String} value
     */
    compute: function() {
        var actions = [];
        each(this.manager.recognizers, function(recognizer) {
            if (boolOrFn(recognizer.options.enable, [recognizer])) {
                actions = actions.concat(recognizer.getTouchAction());
            }
        });
        return cleanTouchActions(actions.join(' '));
    },

    /**
     * this method is called on each input cycle and provides the preventing of the browser behavior
     * @param {Object} input
     */
    preventDefaults: function(input) {
        var srcEvent = input.srcEvent;
        var direction = input.offsetDirection;

        // if the touch action did prevented once this session
        if (this.manager.session.prevented) {
            srcEvent.preventDefault();
            return;
        }

        var actions = this.actions;
        var hasNone = inStr(actions, TOUCH_ACTION_NONE) && !TOUCH_ACTION_MAP[TOUCH_ACTION_NONE];
        var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_Y];
        var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X) && !TOUCH_ACTION_MAP[TOUCH_ACTION_PAN_X];

        if (hasNone) {
            //do not prevent defaults if this is a tap gesture

            var isTapPointer = input.pointers.length === 1;
            var isTapMovement = input.distance < 2;
            var isTapTouchTime = input.deltaTime < 250;

            if (isTapPointer && isTapMovement && isTapTouchTime) {
                return;
            }
        }

        if (hasPanX && hasPanY) {
            // `pan-x pan-y` means browser handles all scrolling/panning, do not prevent
            return;
        }

        if (hasNone ||
            (hasPanY && direction & DIRECTION_HORIZONTAL) ||
            (hasPanX && direction & DIRECTION_VERTICAL)) {
            return this.preventSrc(srcEvent);
        }
    },

    /**
     * call preventDefault to prevent the browser's default behavior (scrolling in most cases)
     * @param {Object} srcEvent
     */
    preventSrc: function(srcEvent) {
        this.manager.session.prevented = true;
        srcEvent.preventDefault();
    }
};

/**
 * when the touchActions are collected they are not a valid value, so we need to clean things up. *
 * @param {String} actions
 * @returns {*}
 */
function cleanTouchActions(actions) {
    // none
    if (inStr(actions, TOUCH_ACTION_NONE)) {
        return TOUCH_ACTION_NONE;
    }

    var hasPanX = inStr(actions, TOUCH_ACTION_PAN_X);
    var hasPanY = inStr(actions, TOUCH_ACTION_PAN_Y);

    // if both pan-x and pan-y are set (different recognizers
    // for different directions, e.g. horizontal pan but vertical swipe?)
    // we need none (as otherwise with pan-x pan-y combined none of these
    // recognizers will work, since the browser would handle all panning
    if (hasPanX && hasPanY) {
        return TOUCH_ACTION_NONE;
    }

    // pan-x OR pan-y
    if (hasPanX || hasPanY) {
        return hasPanX ? TOUCH_ACTION_PAN_X : TOUCH_ACTION_PAN_Y;
    }

    // manipulation
    if (inStr(actions, TOUCH_ACTION_MANIPULATION)) {
        return TOUCH_ACTION_MANIPULATION;
    }

    return TOUCH_ACTION_AUTO;
}

function getTouchActionProps() {
    if (!NATIVE_TOUCH_ACTION) {
        return false;
    }
    var touchMap = {};
    var cssSupports = window.CSS && window.CSS.supports;
    ['auto', 'manipulation', 'pan-y', 'pan-x', 'pan-x pan-y', 'none'].forEach(function(val) {

        // If css.supports is not supported but there is native touch-action assume it supports
        // all values. This is the case for IE 10 and 11.
        touchMap[val] = cssSupports ? window.CSS.supports('touch-action', val) : true;
    });
    return touchMap;
}

/**
 * Recognizer flow explained; *
 * All recognizers have the initial state of POSSIBLE when a input session starts.
 * The definition of a input session is from the first input until the last input, with all it's movement in it. *
 * Example session for mouse-input: mousedown -> mousemove -> mouseup
 *
 * On each recognizing cycle (see Manager.recognize) the .recognize() method is executed
 * which determines with state it should be.
 *
 * If the recognizer has the state FAILED, CANCELLED or RECOGNIZED (equals ENDED), it is reset to
 * POSSIBLE to give it another change on the next cycle.
 *
 *               Possible
 *                  |
 *            +-----+---------------+
 *            |                     |
 *      +-----+-----+               |
 *      |           |               |
 *   Failed      Cancelled          |
 *                          +-------+------+
 *                          |              |
 *                      Recognized       Began
 *                                         |
 *                                      Changed
 *                                         |
 *                                  Ended/Recognized
 */
var STATE_POSSIBLE = 1;
var STATE_BEGAN = 2;
var STATE_CHANGED = 4;
var STATE_ENDED = 8;
var STATE_RECOGNIZED = STATE_ENDED;
var STATE_CANCELLED = 16;
var STATE_FAILED = 32;

/**
 * Recognizer
 * Every recognizer needs to extend from this class.
 * @constructor
 * @param {Object} options
 */
function Recognizer(options) {
    this.options = assign({}, this.defaults, options || {});

    this.id = uniqueId();

    this.manager = null;

    // default is enable true
    this.options.enable = ifUndefined(this.options.enable, true);

    this.state = STATE_POSSIBLE;

    this.simultaneous = {};
    this.requireFail = [];
}

Recognizer.prototype = {
    /**
     * @virtual
     * @type {Object}
     */
    defaults: {},

    /**
     * set options
     * @param {Object} options
     * @return {Recognizer}
     */
    set: function(options) {
        assign(this.options, options);

        // also update the touchAction, in case something changed about the directions/enabled state
        this.manager && this.manager.touchAction.update();
        return this;
    },

    /**
     * recognize simultaneous with an other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    recognizeWith: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'recognizeWith', this)) {
            return this;
        }

        var simultaneous = this.simultaneous;
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if (!simultaneous[otherRecognizer.id]) {
            simultaneous[otherRecognizer.id] = otherRecognizer;
            otherRecognizer.recognizeWith(this);
        }
        return this;
    },

    /**
     * drop the simultaneous link. it doesnt remove the link on the other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRecognizeWith: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'dropRecognizeWith', this)) {
            return this;
        }

        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        delete this.simultaneous[otherRecognizer.id];
        return this;
    },

    /**
     * recognizer can only run when an other is failing
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    requireFailure: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'requireFailure', this)) {
            return this;
        }

        var requireFail = this.requireFail;
        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        if (inArray(requireFail, otherRecognizer) === -1) {
            requireFail.push(otherRecognizer);
            otherRecognizer.requireFailure(this);
        }
        return this;
    },

    /**
     * drop the requireFailure link. it does not remove the link on the other recognizer.
     * @param {Recognizer} otherRecognizer
     * @returns {Recognizer} this
     */
    dropRequireFailure: function(otherRecognizer) {
        if (invokeArrayArg(otherRecognizer, 'dropRequireFailure', this)) {
            return this;
        }

        otherRecognizer = getRecognizerByNameIfManager(otherRecognizer, this);
        var index = inArray(this.requireFail, otherRecognizer);
        if (index > -1) {
            this.requireFail.splice(index, 1);
        }
        return this;
    },

    /**
     * has require failures boolean
     * @returns {boolean}
     */
    hasRequireFailures: function() {
        return this.requireFail.length > 0;
    },

    /**
     * if the recognizer can recognize simultaneous with an other recognizer
     * @param {Recognizer} otherRecognizer
     * @returns {Boolean}
     */
    canRecognizeWith: function(otherRecognizer) {
        return !!this.simultaneous[otherRecognizer.id];
    },

    /**
     * You should use `tryEmit` instead of `emit` directly to check
     * that all the needed recognizers has failed before emitting.
     * @param {Object} input
     */
    emit: function(input) {
        var self = this;
        var state = this.state;

        function emit(event) {
            self.manager.emit(event, input);
        }

        // 'panstart' and 'panmove'
        if (state < STATE_ENDED) {
            emit(self.options.event + stateStr(state));
        }

        emit(self.options.event); // simple 'eventName' events

        if (input.additionalEvent) { // additional event(panleft, panright, pinchin, pinchout...)
            emit(input.additionalEvent);
        }

        // panend and pancancel
        if (state >= STATE_ENDED) {
            emit(self.options.event + stateStr(state));
        }
    },

    /**
     * Check that all the require failure recognizers has failed,
     * if true, it emits a gesture event,
     * otherwise, setup the state to FAILED.
     * @param {Object} input
     */
    tryEmit: function(input) {
        if (this.canEmit()) {
            return this.emit(input);
        }
        // it's failing anyway
        this.state = STATE_FAILED;
    },

    /**
     * can we emit?
     * @returns {boolean}
     */
    canEmit: function() {
        var i = 0;
        while (i < this.requireFail.length) {
            if (!(this.requireFail[i].state & (STATE_FAILED | STATE_POSSIBLE))) {
                return false;
            }
            i++;
        }
        return true;
    },

    /**
     * update the recognizer
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        // make a new copy of the inputData
        // so we can change the inputData without messing up the other recognizers
        var inputDataClone = assign({}, inputData);

        // is is enabled and allow recognizing?
        if (!boolOrFn(this.options.enable, [this, inputDataClone])) {
            this.reset();
            this.state = STATE_FAILED;
            return;
        }

        // reset when we've reached the end
        if (this.state & (STATE_RECOGNIZED | STATE_CANCELLED | STATE_FAILED)) {
            this.state = STATE_POSSIBLE;
        }

        this.state = this.process(inputDataClone);

        // the recognizer has recognized a gesture
        // so trigger an event
        if (this.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED | STATE_CANCELLED)) {
            this.tryEmit(inputDataClone);
        }
    },

    /**
     * return the state of the recognizer
     * the actual recognizing happens in this method
     * @virtual
     * @param {Object} inputData
     * @returns {Const} STATE
     */
    process: function(inputData) { }, // jshint ignore:line

    /**
     * return the preferred touch-action
     * @virtual
     * @returns {Array}
     */
    getTouchAction: function() { },

    /**
     * called when the gesture isn't allowed to recognize
     * like when another is being recognized or it is disabled
     * @virtual
     */
    reset: function() { }
};

/**
 * get a usable string, used as event postfix
 * @param {Const} state
 * @returns {String} state
 */
function stateStr(state) {
    if (state & STATE_CANCELLED) {
        return 'cancel';
    } else if (state & STATE_ENDED) {
        return 'end';
    } else if (state & STATE_CHANGED) {
        return 'move';
    } else if (state & STATE_BEGAN) {
        return 'start';
    }
    return '';
}

/**
 * direction cons to string
 * @param {Const} direction
 * @returns {String}
 */
function directionStr(direction) {
    if (direction == DIRECTION_DOWN) {
        return 'down';
    } else if (direction == DIRECTION_UP) {
        return 'up';
    } else if (direction == DIRECTION_LEFT) {
        return 'left';
    } else if (direction == DIRECTION_RIGHT) {
        return 'right';
    }
    return '';
}

/**
 * get a recognizer by name if it is bound to a manager
 * @param {Recognizer|String} otherRecognizer
 * @param {Recognizer} recognizer
 * @returns {Recognizer}
 */
function getRecognizerByNameIfManager(otherRecognizer, recognizer) {
    var manager = recognizer.manager;
    if (manager) {
        return manager.get(otherRecognizer);
    }
    return otherRecognizer;
}

/**
 * This recognizer is just used as a base for the simple attribute recognizers.
 * @constructor
 * @extends Recognizer
 */
function AttrRecognizer() {
    Recognizer.apply(this, arguments);
}

inherit(AttrRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof AttrRecognizer
     */
    defaults: {
        /**
         * @type {Number}
         * @default 1
         */
        pointers: 1
    },

    /**
     * Used to check if it the recognizer receives valid input, like input.distance > 10.
     * @memberof AttrRecognizer
     * @param {Object} input
     * @returns {Boolean} recognized
     */
    attrTest: function(input) {
        var optionPointers = this.options.pointers;
        return optionPointers === 0 || input.pointers.length === optionPointers;
    },

    /**
     * Process the input and return the state for the recognizer
     * @memberof AttrRecognizer
     * @param {Object} input
     * @returns {*} State
     */
    process: function(input) {
        var state = this.state;
        var eventType = input.eventType;

        var isRecognized = state & (STATE_BEGAN | STATE_CHANGED);
        var isValid = this.attrTest(input);

        // on cancel input and we've recognized before, return STATE_CANCELLED
        if (isRecognized && (eventType & INPUT_CANCEL || !isValid)) {
            return state | STATE_CANCELLED;
        } else if (isRecognized || isValid) {
            if (eventType & INPUT_END) {
                return state | STATE_ENDED;
            } else if (!(state & STATE_BEGAN)) {
                return STATE_BEGAN;
            }
            return state | STATE_CHANGED;
        }
        return STATE_FAILED;
    }
});

/**
 * Pan
 * Recognized when the pointer is down and moved in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */
function PanRecognizer() {
    AttrRecognizer.apply(this, arguments);

    this.pX = null;
    this.pY = null;
}

inherit(PanRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PanRecognizer
     */
    defaults: {
        event: 'pan',
        threshold: 10,
        pointers: 1,
        direction: DIRECTION_ALL
    },

    getTouchAction: function() {
        var direction = this.options.direction;
        var actions = [];
        if (direction & DIRECTION_HORIZONTAL) {
            actions.push(TOUCH_ACTION_PAN_Y);
        }
        if (direction & DIRECTION_VERTICAL) {
            actions.push(TOUCH_ACTION_PAN_X);
        }
        return actions;
    },

    directionTest: function(input) {
        var options = this.options;
        var hasMoved = true;
        var distance = input.distance;
        var direction = input.direction;
        var x = input.deltaX;
        var y = input.deltaY;

        // lock to axis?
        if (!(direction & options.direction)) {
            if (options.direction & DIRECTION_HORIZONTAL) {
                direction = (x === 0) ? DIRECTION_NONE : (x < 0) ? DIRECTION_LEFT : DIRECTION_RIGHT;
                hasMoved = x != this.pX;
                distance = Math.abs(input.deltaX);
            } else {
                direction = (y === 0) ? DIRECTION_NONE : (y < 0) ? DIRECTION_UP : DIRECTION_DOWN;
                hasMoved = y != this.pY;
                distance = Math.abs(input.deltaY);
            }
        }
        input.direction = direction;
        return hasMoved && distance > options.threshold && direction & options.direction;
    },

    attrTest: function(input) {
        return AttrRecognizer.prototype.attrTest.call(this, input) &&
            (this.state & STATE_BEGAN || (!(this.state & STATE_BEGAN) && this.directionTest(input)));
    },

    emit: function(input) {

        this.pX = input.deltaX;
        this.pY = input.deltaY;

        var direction = directionStr(input.direction);

        if (direction) {
            input.additionalEvent = this.options.event + direction;
        }
        this._super.emit.call(this, input);
    }
});

/**
 * Pinch
 * Recognized when two or more pointers are moving toward (zoom-in) or away from each other (zoom-out).
 * @constructor
 * @extends AttrRecognizer
 */
function PinchRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(PinchRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof PinchRecognizer
     */
    defaults: {
        event: 'pinch',
        threshold: 0,
        pointers: 2
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_NONE];
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(input.scale - 1) > this.options.threshold || this.state & STATE_BEGAN);
    },

    emit: function(input) {
        if (input.scale !== 1) {
            var inOut = input.scale < 1 ? 'in' : 'out';
            input.additionalEvent = this.options.event + inOut;
        }
        this._super.emit.call(this, input);
    }
});

/**
 * Press
 * Recognized when the pointer is down for x ms without any movement.
 * @constructor
 * @extends Recognizer
 */
function PressRecognizer() {
    Recognizer.apply(this, arguments);

    this._timer = null;
    this._input = null;
}

inherit(PressRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof PressRecognizer
     */
    defaults: {
        event: 'press',
        pointers: 1,
        time: 251, // minimal time of the pointer to be pressed
        threshold: 9 // a minimal movement is ok, but keep it low
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_AUTO];
    },

    process: function(input) {
        var options = this.options;
        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTime = input.deltaTime > options.time;

        this._input = input;

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if (!validMovement || !validPointers || (input.eventType & (INPUT_END | INPUT_CANCEL) && !validTime)) {
            this.reset();
        } else if (input.eventType & INPUT_START) {
            this.reset();
            this._timer = setTimeoutContext(function() {
                this.state = STATE_RECOGNIZED;
                this.tryEmit();
            }, options.time, this);
        } else if (input.eventType & INPUT_END) {
            return STATE_RECOGNIZED;
        }
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function(input) {
        if (this.state !== STATE_RECOGNIZED) {
            return;
        }

        if (input && (input.eventType & INPUT_END)) {
            this.manager.emit(this.options.event + 'up', input);
        } else {
            this._input.timeStamp = now();
            this.manager.emit(this.options.event, this._input);
        }
    }
});

/**
 * Rotate
 * Recognized when two or more pointer are moving in a circular motion.
 * @constructor
 * @extends AttrRecognizer
 */
function RotateRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(RotateRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof RotateRecognizer
     */
    defaults: {
        event: 'rotate',
        threshold: 0,
        pointers: 2
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_NONE];
    },

    attrTest: function(input) {
        return this._super.attrTest.call(this, input) &&
            (Math.abs(input.rotation) > this.options.threshold || this.state & STATE_BEGAN);
    }
});

/**
 * Swipe
 * Recognized when the pointer is moving fast (velocity), with enough distance in the allowed direction.
 * @constructor
 * @extends AttrRecognizer
 */
function SwipeRecognizer() {
    AttrRecognizer.apply(this, arguments);
}

inherit(SwipeRecognizer, AttrRecognizer, {
    /**
     * @namespace
     * @memberof SwipeRecognizer
     */
    defaults: {
        event: 'swipe',
        threshold: 10,
        velocity: 0.3,
        direction: DIRECTION_HORIZONTAL | DIRECTION_VERTICAL,
        pointers: 1
    },

    getTouchAction: function() {
        return PanRecognizer.prototype.getTouchAction.call(this);
    },

    attrTest: function(input) {
        var direction = this.options.direction;
        var velocity;

        if (direction & (DIRECTION_HORIZONTAL | DIRECTION_VERTICAL)) {
            velocity = input.overallVelocity;
        } else if (direction & DIRECTION_HORIZONTAL) {
            velocity = input.overallVelocityX;
        } else if (direction & DIRECTION_VERTICAL) {
            velocity = input.overallVelocityY;
        }

        return this._super.attrTest.call(this, input) &&
            direction & input.offsetDirection &&
            input.distance > this.options.threshold &&
            input.maxPointers == this.options.pointers &&
            abs(velocity) > this.options.velocity && input.eventType & INPUT_END;
    },

    emit: function(input) {
        var direction = directionStr(input.offsetDirection);
        if (direction) {
            this.manager.emit(this.options.event + direction, input);
        }

        this.manager.emit(this.options.event, input);
    }
});

/**
 * A tap is ecognized when the pointer is doing a small tap/click. Multiple taps are recognized if they occur
 * between the given interval and position. The delay option can be used to recognize multi-taps without firing
 * a single tap.
 *
 * The eventData from the emitted event contains the property `tapCount`, which contains the amount of
 * multi-taps being recognized.
 * @constructor
 * @extends Recognizer
 */
function TapRecognizer() {
    Recognizer.apply(this, arguments);

    // previous time and center,
    // used for tap counting
    this.pTime = false;
    this.pCenter = false;

    this._timer = null;
    this._input = null;
    this.count = 0;
}

inherit(TapRecognizer, Recognizer, {
    /**
     * @namespace
     * @memberof PinchRecognizer
     */
    defaults: {
        event: 'tap',
        pointers: 1,
        taps: 1,
        interval: 300, // max time between the multi-tap taps
        time: 250, // max time of the pointer to be down (like finger on the screen)
        threshold: 9, // a minimal movement is ok, but keep it low
        posThreshold: 10 // a multi-tap can be a bit off the initial position
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_MANIPULATION];
    },

    process: function(input) {
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.threshold;
        var validTouchTime = input.deltaTime < options.time;

        this.reset();

        if ((input.eventType & INPUT_START) && (this.count === 0)) {
            return this.failTimeout();
        }

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if (validMovement && validTouchTime && validPointers) {
            if (input.eventType != INPUT_END) {
                return this.failTimeout();
            }

            var validInterval = this.pTime ? (input.timeStamp - this.pTime < options.interval) : true;
            var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.posThreshold;

            this.pTime = input.timeStamp;
            this.pCenter = input.center;

            if (!validMultiTap || !validInterval) {
                this.count = 1;
            } else {
                this.count += 1;
            }

            this._input = input;

            // if tap count matches we have recognized it,
            // else it has began recognizing...
            var tapCount = this.count % options.taps;
            if (tapCount === 0) {
                // no failing requirements, immediately trigger the tap event
                // or wait as long as the multitap interval to trigger
                if (!this.hasRequireFailures()) {
                    return STATE_RECOGNIZED;
                } else {
                    this._timer = setTimeoutContext(function() {
                        this.state = STATE_RECOGNIZED;
                        this.tryEmit();
                    }, options.interval, this);
                    return STATE_BEGAN;
                }
            }
        }
        return STATE_FAILED;
    },

    failTimeout: function() {
        this._timer = setTimeoutContext(function() {
            this.state = STATE_FAILED;
        }, this.options.interval, this);
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function() {
        if (this.state == STATE_RECOGNIZED) {
            this._input.tapCount = this.count;
            this.manager.emit(this.options.event, this._input);
        }
    }
});

/**
 * Simple way to create a manager with a default set of recognizers.
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Hammer(element, options) {
    options = options || {};
    options.recognizers = ifUndefined(options.recognizers, Hammer.defaults.preset);
    return new Manager(element, options);
}

/**
 * @const {string}
 */
Hammer.VERSION = '2.0.7';

/**
 * default settings
 * @namespace
 */
Hammer.defaults = {
    /**
     * set if DOM events are being triggered.
     * But this is slower and unused by simple implementations, so disabled by default.
     * @type {Boolean}
     * @default false
     */
    domEvents: false,

    /**
     * The value for the touchAction property/fallback.
     * When set to `compute` it will magically set the correct value based on the added recognizers.
     * @type {String}
     * @default compute
     */
    touchAction: TOUCH_ACTION_COMPUTE,

    /**
     * @type {Boolean}
     * @default true
     */
    enable: true,

    /**
     * EXPERIMENTAL FEATURE -- can be removed/changed
     * Change the parent input target element.
     * If Null, then it is being set the to main element.
     * @type {Null|EventTarget}
     * @default null
     */
    inputTarget: null,

    /**
     * force an input class
     * @type {Null|Function}
     * @default null
     */
    inputClass: null,

    /**
     * Default recognizer setup when calling `Hammer()`
     * When creating a new Manager these will be skipped.
     * @type {Array}
     */
    preset: [
        // RecognizerClass, options, [recognizeWith, ...], [requireFailure, ...]
        [RotateRecognizer, {enable: false}],
        [PinchRecognizer, {enable: false}, ['rotate']],
        [SwipeRecognizer, {direction: DIRECTION_HORIZONTAL}],
        [PanRecognizer, {direction: DIRECTION_HORIZONTAL}, ['swipe']],
        [TapRecognizer],
        [TapRecognizer, {event: 'doubletap', taps: 2}, ['tap']],
        [PressRecognizer]
    ],

    /**
     * Some CSS properties can be used to improve the working of Hammer.
     * Add them to this method and they will be set when creating a new Manager.
     * @namespace
     */
    cssProps: {
        /**
         * Disables text selection to improve the dragging gesture. Mainly for desktop browsers.
         * @type {String}
         * @default 'none'
         */
        userSelect: 'none',

        /**
         * Disable the Windows Phone grippers when pressing an element.
         * @type {String}
         * @default 'none'
         */
        touchSelect: 'none',

        /**
         * Disables the default callout shown when you touch and hold a touch target.
         * On iOS, when you touch and hold a touch target such as a link, Safari displays
         * a callout containing information about the link. This property allows you to disable that callout.
         * @type {String}
         * @default 'none'
         */
        touchCallout: 'none',

        /**
         * Specifies whether zooming is enabled. Used by IE10>
         * @type {String}
         * @default 'none'
         */
        contentZooming: 'none',

        /**
         * Specifies that an entire element should be draggable instead of its contents. Mainly for desktop browsers.
         * @type {String}
         * @default 'none'
         */
        userDrag: 'none',

        /**
         * Overrides the highlight color shown when the user taps a link or a JavaScript
         * clickable element in iOS. This property obeys the alpha value, if specified.
         * @type {String}
         * @default 'rgba(0,0,0,0)'
         */
        tapHighlightColor: 'rgba(0,0,0,0)'
    }
};

var STOP = 1;
var FORCED_STOP = 2;

/**
 * Manager
 * @param {HTMLElement} element
 * @param {Object} [options]
 * @constructor
 */
function Manager(element, options) {
    this.options = assign({}, Hammer.defaults, options || {});

    this.options.inputTarget = this.options.inputTarget || element;

    this.handlers = {};
    this.session = {};
    this.recognizers = [];
    this.oldCssProps = {};

    this.element = element;
    this.input = createInputInstance(this);
    this.touchAction = new TouchAction(this, this.options.touchAction);

    toggleCssProps(this, true);

    each(this.options.recognizers, function(item) {
        var recognizer = this.add(new (item[0])(item[1]));
        item[2] && recognizer.recognizeWith(item[2]);
        item[3] && recognizer.requireFailure(item[3]);
    }, this);
}

Manager.prototype = {
    /**
     * set options
     * @param {Object} options
     * @returns {Manager}
     */
    set: function(options) {
        assign(this.options, options);

        // Options that need a little more setup
        if (options.touchAction) {
            this.touchAction.update();
        }
        if (options.inputTarget) {
            // Clean up existing event listeners and reinitialize
            this.input.destroy();
            this.input.target = options.inputTarget;
            this.input.init();
        }
        return this;
    },

    /**
     * stop recognizing for this session.
     * This session will be discarded, when a new [input]start event is fired.
     * When forced, the recognizer cycle is stopped immediately.
     * @param {Boolean} [force]
     */
    stop: function(force) {
        this.session.stopped = force ? FORCED_STOP : STOP;
    },

    /**
     * run the recognizers!
     * called by the inputHandler function on every movement of the pointers (touches)
     * it walks through all the recognizers and tries to detect the gesture that is being made
     * @param {Object} inputData
     */
    recognize: function(inputData) {
        var session = this.session;
        if (session.stopped) {
            return;
        }

        // run the touch-action polyfill
        this.touchAction.preventDefaults(inputData);

        var recognizer;
        var recognizers = this.recognizers;

        // this holds the recognizer that is being recognized.
        // so the recognizer's state needs to be BEGAN, CHANGED, ENDED or RECOGNIZED
        // if no recognizer is detecting a thing, it is set to `null`
        var curRecognizer = session.curRecognizer;

        // reset when the last recognizer is recognized
        // or when we're in a new session
        if (!curRecognizer || (curRecognizer && curRecognizer.state & STATE_RECOGNIZED)) {
            curRecognizer = session.curRecognizer = null;
        }

        var i = 0;
        while (i < recognizers.length) {
            recognizer = recognizers[i];

            // find out if we are allowed try to recognize the input for this one.
            // 1.   allow if the session is NOT forced stopped (see the .stop() method)
            // 2.   allow if we still haven't recognized a gesture in this session, or the this recognizer is the one
            //      that is being recognized.
            // 3.   allow if the recognizer is allowed to run simultaneous with the current recognized recognizer.
            //      this can be setup with the `recognizeWith()` method on the recognizer.
            if (session.stopped !== FORCED_STOP && ( // 1
                    !curRecognizer || recognizer == curRecognizer || // 2
                    recognizer.canRecognizeWith(curRecognizer))) { // 3
                recognizer.recognize(inputData);
            } else {
                recognizer.reset();
            }

            // if the recognizer has been recognizing the input as a valid gesture, we want to store this one as the
            // current active recognizer. but only if we don't already have an active recognizer
            if (!curRecognizer && recognizer.state & (STATE_BEGAN | STATE_CHANGED | STATE_ENDED)) {
                curRecognizer = session.curRecognizer = recognizer;
            }
            i++;
        }
    },

    /**
     * get a recognizer by its event name.
     * @param {Recognizer|String} recognizer
     * @returns {Recognizer|Null}
     */
    get: function(recognizer) {
        if (recognizer instanceof Recognizer) {
            return recognizer;
        }

        var recognizers = this.recognizers;
        for (var i = 0; i < recognizers.length; i++) {
            if (recognizers[i].options.event == recognizer) {
                return recognizers[i];
            }
        }
        return null;
    },

    /**
     * add a recognizer to the manager
     * existing recognizers with the same event name will be removed
     * @param {Recognizer} recognizer
     * @returns {Recognizer|Manager}
     */
    add: function(recognizer) {
        if (invokeArrayArg(recognizer, 'add', this)) {
            return this;
        }

        // remove existing
        var existing = this.get(recognizer.options.event);
        if (existing) {
            this.remove(existing);
        }

        this.recognizers.push(recognizer);
        recognizer.manager = this;

        this.touchAction.update();
        return recognizer;
    },

    /**
     * remove a recognizer by name or instance
     * @param {Recognizer|String} recognizer
     * @returns {Manager}
     */
    remove: function(recognizer) {
        if (invokeArrayArg(recognizer, 'remove', this)) {
            return this;
        }

        recognizer = this.get(recognizer);

        // let's make sure this recognizer exists
        if (recognizer) {
            var recognizers = this.recognizers;
            var index = inArray(recognizers, recognizer);

            if (index !== -1) {
                recognizers.splice(index, 1);
                this.touchAction.update();
            }
        }

        return this;
    },

    /**
     * bind event
     * @param {String} events
     * @param {Function} handler
     * @returns {EventEmitter} this
     */
    on: function(events, handler) {
        if (events === undefined) {
            return;
        }
        if (handler === undefined) {
            return;
        }

        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            handlers[event] = handlers[event] || [];
            handlers[event].push(handler);
        });
        return this;
    },

    /**
     * unbind event, leave emit blank to remove all handlers
     * @param {String} events
     * @param {Function} [handler]
     * @returns {EventEmitter} this
     */
    off: function(events, handler) {
        if (events === undefined) {
            return;
        }

        var handlers = this.handlers;
        each(splitStr(events), function(event) {
            if (!handler) {
                delete handlers[event];
            } else {
                handlers[event] && handlers[event].splice(inArray(handlers[event], handler), 1);
            }
        });
        return this;
    },

    /**
     * emit event to the listeners
     * @param {String} event
     * @param {Object} data
     */
    emit: function(event, data) {
        // we also want to trigger dom events
        if (this.options.domEvents) {
            triggerDomEvent(event, data);
        }

        // no handlers, so skip it all
        var handlers = this.handlers[event] && this.handlers[event].slice();
        if (!handlers || !handlers.length) {
            return;
        }

        data.type = event;
        data.preventDefault = function() {
            data.srcEvent.preventDefault();
        };

        var i = 0;
        while (i < handlers.length) {
            handlers[i](data);
            i++;
        }
    },

    /**
     * destroy the manager and unbinds all events
     * it doesn't unbind dom events, that is the user own responsibility
     */
    destroy: function() {
        this.element && toggleCssProps(this, false);

        this.handlers = {};
        this.session = {};
        this.input.destroy();
        this.element = null;
    }
};

/**
 * add/remove the css properties as defined in manager.options.cssProps
 * @param {Manager} manager
 * @param {Boolean} add
 */
function toggleCssProps(manager, add) {
    var element = manager.element;
    if (!element.style) {
        return;
    }
    var prop;
    each(manager.options.cssProps, function(value, name) {
        prop = prefixed(element.style, name);
        if (add) {
            manager.oldCssProps[prop] = element.style[prop];
            element.style[prop] = value;
        } else {
            element.style[prop] = manager.oldCssProps[prop] || '';
        }
    });
    if (!add) {
        manager.oldCssProps = {};
    }
}

/**
 * trigger dom event
 * @param {String} event
 * @param {Object} data
 */
function triggerDomEvent(event, data) {
    var gestureEvent = document.createEvent('Event');
    gestureEvent.initEvent(event, true, true);
    gestureEvent.gesture = data;
    data.target.dispatchEvent(gestureEvent);
}

assign(Hammer, {
    INPUT_START: INPUT_START,
    INPUT_MOVE: INPUT_MOVE,
    INPUT_END: INPUT_END,
    INPUT_CANCEL: INPUT_CANCEL,

    STATE_POSSIBLE: STATE_POSSIBLE,
    STATE_BEGAN: STATE_BEGAN,
    STATE_CHANGED: STATE_CHANGED,
    STATE_ENDED: STATE_ENDED,
    STATE_RECOGNIZED: STATE_RECOGNIZED,
    STATE_CANCELLED: STATE_CANCELLED,
    STATE_FAILED: STATE_FAILED,

    DIRECTION_NONE: DIRECTION_NONE,
    DIRECTION_LEFT: DIRECTION_LEFT,
    DIRECTION_RIGHT: DIRECTION_RIGHT,
    DIRECTION_UP: DIRECTION_UP,
    DIRECTION_DOWN: DIRECTION_DOWN,
    DIRECTION_HORIZONTAL: DIRECTION_HORIZONTAL,
    DIRECTION_VERTICAL: DIRECTION_VERTICAL,
    DIRECTION_ALL: DIRECTION_ALL,

    Manager: Manager,
    Input: Input,
    TouchAction: TouchAction,

    TouchInput: TouchInput,
    MouseInput: MouseInput,
    PointerEventInput: PointerEventInput,
    TouchMouseInput: TouchMouseInput,
    SingleTouchInput: SingleTouchInput,

    Recognizer: Recognizer,
    AttrRecognizer: AttrRecognizer,
    Tap: TapRecognizer,
    Pan: PanRecognizer,
    Swipe: SwipeRecognizer,
    Pinch: PinchRecognizer,
    Rotate: RotateRecognizer,
    Press: PressRecognizer,

    on: addEventListeners,
    off: removeEventListeners,
    each: each,
    merge: merge,
    extend: extend,
    assign: assign,
    inherit: inherit,
    bindFn: bindFn,
    prefixed: prefixed
});

// this prevents errors when Hammer is loaded in the presence of an AMD
//  style loader but by script tag, not by the loader.
var freeGlobal = (typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : {})); // jshint ignore:line
freeGlobal.Hammer = Hammer;

if (true) {
    !(__WEBPACK_AMD_DEFINE_RESULT__ = (function() {
        return Hammer;
    }).call(exports, __webpack_require__, exports, module),
		__WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
} else {}

})(window, document, 'Hammer');


/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/index.js":
/*!**********************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/index.js ***!
  \**********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Observable": () => (/* reexport safe */ _internal_Observable__WEBPACK_IMPORTED_MODULE_0__.Observable),
/* harmony export */   "ConnectableObservable": () => (/* reexport safe */ _internal_observable_ConnectableObservable__WEBPACK_IMPORTED_MODULE_1__.ConnectableObservable),
/* harmony export */   "observable": () => (/* reexport safe */ _internal_symbol_observable__WEBPACK_IMPORTED_MODULE_2__.observable),
/* harmony export */   "animationFrames": () => (/* reexport safe */ _internal_observable_dom_animationFrames__WEBPACK_IMPORTED_MODULE_3__.animationFrames),
/* harmony export */   "Subject": () => (/* reexport safe */ _internal_Subject__WEBPACK_IMPORTED_MODULE_4__.Subject),
/* harmony export */   "BehaviorSubject": () => (/* reexport safe */ _internal_BehaviorSubject__WEBPACK_IMPORTED_MODULE_5__.BehaviorSubject),
/* harmony export */   "ReplaySubject": () => (/* reexport safe */ _internal_ReplaySubject__WEBPACK_IMPORTED_MODULE_6__.ReplaySubject),
/* harmony export */   "AsyncSubject": () => (/* reexport safe */ _internal_AsyncSubject__WEBPACK_IMPORTED_MODULE_7__.AsyncSubject),
/* harmony export */   "asap": () => (/* reexport safe */ _internal_scheduler_asap__WEBPACK_IMPORTED_MODULE_8__.asap),
/* harmony export */   "asapScheduler": () => (/* reexport safe */ _internal_scheduler_asap__WEBPACK_IMPORTED_MODULE_8__.asapScheduler),
/* harmony export */   "async": () => (/* reexport safe */ _internal_scheduler_async__WEBPACK_IMPORTED_MODULE_9__.async),
/* harmony export */   "asyncScheduler": () => (/* reexport safe */ _internal_scheduler_async__WEBPACK_IMPORTED_MODULE_9__.asyncScheduler),
/* harmony export */   "queue": () => (/* reexport safe */ _internal_scheduler_queue__WEBPACK_IMPORTED_MODULE_10__.queue),
/* harmony export */   "queueScheduler": () => (/* reexport safe */ _internal_scheduler_queue__WEBPACK_IMPORTED_MODULE_10__.queueScheduler),
/* harmony export */   "animationFrame": () => (/* reexport safe */ _internal_scheduler_animationFrame__WEBPACK_IMPORTED_MODULE_11__.animationFrame),
/* harmony export */   "animationFrameScheduler": () => (/* reexport safe */ _internal_scheduler_animationFrame__WEBPACK_IMPORTED_MODULE_11__.animationFrameScheduler),
/* harmony export */   "VirtualTimeScheduler": () => (/* reexport safe */ _internal_scheduler_VirtualTimeScheduler__WEBPACK_IMPORTED_MODULE_12__.VirtualTimeScheduler),
/* harmony export */   "VirtualAction": () => (/* reexport safe */ _internal_scheduler_VirtualTimeScheduler__WEBPACK_IMPORTED_MODULE_12__.VirtualAction),
/* harmony export */   "Scheduler": () => (/* reexport safe */ _internal_Scheduler__WEBPACK_IMPORTED_MODULE_13__.Scheduler),
/* harmony export */   "Subscription": () => (/* reexport safe */ _internal_Subscription__WEBPACK_IMPORTED_MODULE_14__.Subscription),
/* harmony export */   "Subscriber": () => (/* reexport safe */ _internal_Subscriber__WEBPACK_IMPORTED_MODULE_15__.Subscriber),
/* harmony export */   "Notification": () => (/* reexport safe */ _internal_Notification__WEBPACK_IMPORTED_MODULE_16__.Notification),
/* harmony export */   "NotificationKind": () => (/* reexport safe */ _internal_Notification__WEBPACK_IMPORTED_MODULE_16__.NotificationKind),
/* harmony export */   "pipe": () => (/* reexport safe */ _internal_util_pipe__WEBPACK_IMPORTED_MODULE_17__.pipe),
/* harmony export */   "noop": () => (/* reexport safe */ _internal_util_noop__WEBPACK_IMPORTED_MODULE_18__.noop),
/* harmony export */   "identity": () => (/* reexport safe */ _internal_util_identity__WEBPACK_IMPORTED_MODULE_19__.identity),
/* harmony export */   "isObservable": () => (/* reexport safe */ _internal_util_isObservable__WEBPACK_IMPORTED_MODULE_20__.isObservable),
/* harmony export */   "lastValueFrom": () => (/* reexport safe */ _internal_lastValueFrom__WEBPACK_IMPORTED_MODULE_21__.lastValueFrom),
/* harmony export */   "firstValueFrom": () => (/* reexport safe */ _internal_firstValueFrom__WEBPACK_IMPORTED_MODULE_22__.firstValueFrom),
/* harmony export */   "ArgumentOutOfRangeError": () => (/* reexport safe */ _internal_util_ArgumentOutOfRangeError__WEBPACK_IMPORTED_MODULE_23__.ArgumentOutOfRangeError),
/* harmony export */   "EmptyError": () => (/* reexport safe */ _internal_util_EmptyError__WEBPACK_IMPORTED_MODULE_24__.EmptyError),
/* harmony export */   "NotFoundError": () => (/* reexport safe */ _internal_util_NotFoundError__WEBPACK_IMPORTED_MODULE_25__.NotFoundError),
/* harmony export */   "ObjectUnsubscribedError": () => (/* reexport safe */ _internal_util_ObjectUnsubscribedError__WEBPACK_IMPORTED_MODULE_26__.ObjectUnsubscribedError),
/* harmony export */   "SequenceError": () => (/* reexport safe */ _internal_util_SequenceError__WEBPACK_IMPORTED_MODULE_27__.SequenceError),
/* harmony export */   "TimeoutError": () => (/* reexport safe */ _internal_operators_timeout__WEBPACK_IMPORTED_MODULE_28__.TimeoutError),
/* harmony export */   "UnsubscriptionError": () => (/* reexport safe */ _internal_util_UnsubscriptionError__WEBPACK_IMPORTED_MODULE_29__.UnsubscriptionError),
/* harmony export */   "bindCallback": () => (/* reexport safe */ _internal_observable_bindCallback__WEBPACK_IMPORTED_MODULE_30__.bindCallback),
/* harmony export */   "bindNodeCallback": () => (/* reexport safe */ _internal_observable_bindNodeCallback__WEBPACK_IMPORTED_MODULE_31__.bindNodeCallback),
/* harmony export */   "combineLatest": () => (/* reexport safe */ _internal_observable_combineLatest__WEBPACK_IMPORTED_MODULE_32__.combineLatest),
/* harmony export */   "concat": () => (/* reexport safe */ _internal_observable_concat__WEBPACK_IMPORTED_MODULE_33__.concat),
/* harmony export */   "connectable": () => (/* reexport safe */ _internal_observable_connectable__WEBPACK_IMPORTED_MODULE_34__.connectable),
/* harmony export */   "defer": () => (/* reexport safe */ _internal_observable_defer__WEBPACK_IMPORTED_MODULE_35__.defer),
/* harmony export */   "empty": () => (/* reexport safe */ _internal_observable_empty__WEBPACK_IMPORTED_MODULE_36__.empty),
/* harmony export */   "forkJoin": () => (/* reexport safe */ _internal_observable_forkJoin__WEBPACK_IMPORTED_MODULE_37__.forkJoin),
/* harmony export */   "from": () => (/* reexport safe */ _internal_observable_from__WEBPACK_IMPORTED_MODULE_38__.from),
/* harmony export */   "fromEvent": () => (/* reexport safe */ _internal_observable_fromEvent__WEBPACK_IMPORTED_MODULE_39__.fromEvent),
/* harmony export */   "fromEventPattern": () => (/* reexport safe */ _internal_observable_fromEventPattern__WEBPACK_IMPORTED_MODULE_40__.fromEventPattern),
/* harmony export */   "generate": () => (/* reexport safe */ _internal_observable_generate__WEBPACK_IMPORTED_MODULE_41__.generate),
/* harmony export */   "iif": () => (/* reexport safe */ _internal_observable_iif__WEBPACK_IMPORTED_MODULE_42__.iif),
/* harmony export */   "interval": () => (/* reexport safe */ _internal_observable_interval__WEBPACK_IMPORTED_MODULE_43__.interval),
/* harmony export */   "merge": () => (/* reexport safe */ _internal_observable_merge__WEBPACK_IMPORTED_MODULE_44__.merge),
/* harmony export */   "never": () => (/* reexport safe */ _internal_observable_never__WEBPACK_IMPORTED_MODULE_45__.never),
/* harmony export */   "of": () => (/* reexport safe */ _internal_observable_of__WEBPACK_IMPORTED_MODULE_46__.of),
/* harmony export */   "onErrorResumeNext": () => (/* reexport safe */ _internal_observable_onErrorResumeNext__WEBPACK_IMPORTED_MODULE_47__.onErrorResumeNext),
/* harmony export */   "pairs": () => (/* reexport safe */ _internal_observable_pairs__WEBPACK_IMPORTED_MODULE_48__.pairs),
/* harmony export */   "partition": () => (/* reexport safe */ _internal_observable_partition__WEBPACK_IMPORTED_MODULE_49__.partition),
/* harmony export */   "race": () => (/* reexport safe */ _internal_observable_race__WEBPACK_IMPORTED_MODULE_50__.race),
/* harmony export */   "range": () => (/* reexport safe */ _internal_observable_range__WEBPACK_IMPORTED_MODULE_51__.range),
/* harmony export */   "throwError": () => (/* reexport safe */ _internal_observable_throwError__WEBPACK_IMPORTED_MODULE_52__.throwError),
/* harmony export */   "timer": () => (/* reexport safe */ _internal_observable_timer__WEBPACK_IMPORTED_MODULE_53__.timer),
/* harmony export */   "using": () => (/* reexport safe */ _internal_observable_using__WEBPACK_IMPORTED_MODULE_54__.using),
/* harmony export */   "zip": () => (/* reexport safe */ _internal_observable_zip__WEBPACK_IMPORTED_MODULE_55__.zip),
/* harmony export */   "scheduled": () => (/* reexport safe */ _internal_scheduled_scheduled__WEBPACK_IMPORTED_MODULE_56__.scheduled),
/* harmony export */   "EMPTY": () => (/* reexport safe */ _internal_observable_empty__WEBPACK_IMPORTED_MODULE_36__.EMPTY),
/* harmony export */   "NEVER": () => (/* reexport safe */ _internal_observable_never__WEBPACK_IMPORTED_MODULE_45__.NEVER),
/* harmony export */   "config": () => (/* reexport safe */ _internal_config__WEBPACK_IMPORTED_MODULE_57__.config)
/* harmony export */ });
/* harmony import */ var _internal_Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./internal/Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _internal_observable_ConnectableObservable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./internal/observable/ConnectableObservable */ "./node_modules/rxjs/dist/esm5/internal/observable/ConnectableObservable.js");
/* harmony import */ var _internal_symbol_observable__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./internal/symbol/observable */ "./node_modules/rxjs/dist/esm5/internal/symbol/observable.js");
/* harmony import */ var _internal_observable_dom_animationFrames__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./internal/observable/dom/animationFrames */ "./node_modules/rxjs/dist/esm5/internal/observable/dom/animationFrames.js");
/* harmony import */ var _internal_Subject__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./internal/Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _internal_BehaviorSubject__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./internal/BehaviorSubject */ "./node_modules/rxjs/dist/esm5/internal/BehaviorSubject.js");
/* harmony import */ var _internal_ReplaySubject__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./internal/ReplaySubject */ "./node_modules/rxjs/dist/esm5/internal/ReplaySubject.js");
/* harmony import */ var _internal_AsyncSubject__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./internal/AsyncSubject */ "./node_modules/rxjs/dist/esm5/internal/AsyncSubject.js");
/* harmony import */ var _internal_scheduler_asap__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./internal/scheduler/asap */ "./node_modules/rxjs/dist/esm5/internal/scheduler/asap.js");
/* harmony import */ var _internal_scheduler_async__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./internal/scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _internal_scheduler_queue__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ./internal/scheduler/queue */ "./node_modules/rxjs/dist/esm5/internal/scheduler/queue.js");
/* harmony import */ var _internal_scheduler_animationFrame__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./internal/scheduler/animationFrame */ "./node_modules/rxjs/dist/esm5/internal/scheduler/animationFrame.js");
/* harmony import */ var _internal_scheduler_VirtualTimeScheduler__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ./internal/scheduler/VirtualTimeScheduler */ "./node_modules/rxjs/dist/esm5/internal/scheduler/VirtualTimeScheduler.js");
/* harmony import */ var _internal_Scheduler__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ./internal/Scheduler */ "./node_modules/rxjs/dist/esm5/internal/Scheduler.js");
/* harmony import */ var _internal_Subscription__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ./internal/Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _internal_Subscriber__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ./internal/Subscriber */ "./node_modules/rxjs/dist/esm5/internal/Subscriber.js");
/* harmony import */ var _internal_Notification__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ./internal/Notification */ "./node_modules/rxjs/dist/esm5/internal/Notification.js");
/* harmony import */ var _internal_util_pipe__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ./internal/util/pipe */ "./node_modules/rxjs/dist/esm5/internal/util/pipe.js");
/* harmony import */ var _internal_util_noop__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ./internal/util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");
/* harmony import */ var _internal_util_identity__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ./internal/util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");
/* harmony import */ var _internal_util_isObservable__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ./internal/util/isObservable */ "./node_modules/rxjs/dist/esm5/internal/util/isObservable.js");
/* harmony import */ var _internal_lastValueFrom__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ./internal/lastValueFrom */ "./node_modules/rxjs/dist/esm5/internal/lastValueFrom.js");
/* harmony import */ var _internal_firstValueFrom__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ./internal/firstValueFrom */ "./node_modules/rxjs/dist/esm5/internal/firstValueFrom.js");
/* harmony import */ var _internal_util_ArgumentOutOfRangeError__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ./internal/util/ArgumentOutOfRangeError */ "./node_modules/rxjs/dist/esm5/internal/util/ArgumentOutOfRangeError.js");
/* harmony import */ var _internal_util_EmptyError__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ./internal/util/EmptyError */ "./node_modules/rxjs/dist/esm5/internal/util/EmptyError.js");
/* harmony import */ var _internal_util_NotFoundError__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ./internal/util/NotFoundError */ "./node_modules/rxjs/dist/esm5/internal/util/NotFoundError.js");
/* harmony import */ var _internal_util_ObjectUnsubscribedError__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ./internal/util/ObjectUnsubscribedError */ "./node_modules/rxjs/dist/esm5/internal/util/ObjectUnsubscribedError.js");
/* harmony import */ var _internal_util_SequenceError__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ./internal/util/SequenceError */ "./node_modules/rxjs/dist/esm5/internal/util/SequenceError.js");
/* harmony import */ var _internal_operators_timeout__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ./internal/operators/timeout */ "./node_modules/rxjs/dist/esm5/internal/operators/timeout.js");
/* harmony import */ var _internal_util_UnsubscriptionError__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! ./internal/util/UnsubscriptionError */ "./node_modules/rxjs/dist/esm5/internal/util/UnsubscriptionError.js");
/* harmony import */ var _internal_observable_bindCallback__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! ./internal/observable/bindCallback */ "./node_modules/rxjs/dist/esm5/internal/observable/bindCallback.js");
/* harmony import */ var _internal_observable_bindNodeCallback__WEBPACK_IMPORTED_MODULE_31__ = __webpack_require__(/*! ./internal/observable/bindNodeCallback */ "./node_modules/rxjs/dist/esm5/internal/observable/bindNodeCallback.js");
/* harmony import */ var _internal_observable_combineLatest__WEBPACK_IMPORTED_MODULE_32__ = __webpack_require__(/*! ./internal/observable/combineLatest */ "./node_modules/rxjs/dist/esm5/internal/observable/combineLatest.js");
/* harmony import */ var _internal_observable_concat__WEBPACK_IMPORTED_MODULE_33__ = __webpack_require__(/*! ./internal/observable/concat */ "./node_modules/rxjs/dist/esm5/internal/observable/concat.js");
/* harmony import */ var _internal_observable_connectable__WEBPACK_IMPORTED_MODULE_34__ = __webpack_require__(/*! ./internal/observable/connectable */ "./node_modules/rxjs/dist/esm5/internal/observable/connectable.js");
/* harmony import */ var _internal_observable_defer__WEBPACK_IMPORTED_MODULE_35__ = __webpack_require__(/*! ./internal/observable/defer */ "./node_modules/rxjs/dist/esm5/internal/observable/defer.js");
/* harmony import */ var _internal_observable_empty__WEBPACK_IMPORTED_MODULE_36__ = __webpack_require__(/*! ./internal/observable/empty */ "./node_modules/rxjs/dist/esm5/internal/observable/empty.js");
/* harmony import */ var _internal_observable_forkJoin__WEBPACK_IMPORTED_MODULE_37__ = __webpack_require__(/*! ./internal/observable/forkJoin */ "./node_modules/rxjs/dist/esm5/internal/observable/forkJoin.js");
/* harmony import */ var _internal_observable_from__WEBPACK_IMPORTED_MODULE_38__ = __webpack_require__(/*! ./internal/observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _internal_observable_fromEvent__WEBPACK_IMPORTED_MODULE_39__ = __webpack_require__(/*! ./internal/observable/fromEvent */ "./node_modules/rxjs/dist/esm5/internal/observable/fromEvent.js");
/* harmony import */ var _internal_observable_fromEventPattern__WEBPACK_IMPORTED_MODULE_40__ = __webpack_require__(/*! ./internal/observable/fromEventPattern */ "./node_modules/rxjs/dist/esm5/internal/observable/fromEventPattern.js");
/* harmony import */ var _internal_observable_generate__WEBPACK_IMPORTED_MODULE_41__ = __webpack_require__(/*! ./internal/observable/generate */ "./node_modules/rxjs/dist/esm5/internal/observable/generate.js");
/* harmony import */ var _internal_observable_iif__WEBPACK_IMPORTED_MODULE_42__ = __webpack_require__(/*! ./internal/observable/iif */ "./node_modules/rxjs/dist/esm5/internal/observable/iif.js");
/* harmony import */ var _internal_observable_interval__WEBPACK_IMPORTED_MODULE_43__ = __webpack_require__(/*! ./internal/observable/interval */ "./node_modules/rxjs/dist/esm5/internal/observable/interval.js");
/* harmony import */ var _internal_observable_merge__WEBPACK_IMPORTED_MODULE_44__ = __webpack_require__(/*! ./internal/observable/merge */ "./node_modules/rxjs/dist/esm5/internal/observable/merge.js");
/* harmony import */ var _internal_observable_never__WEBPACK_IMPORTED_MODULE_45__ = __webpack_require__(/*! ./internal/observable/never */ "./node_modules/rxjs/dist/esm5/internal/observable/never.js");
/* harmony import */ var _internal_observable_of__WEBPACK_IMPORTED_MODULE_46__ = __webpack_require__(/*! ./internal/observable/of */ "./node_modules/rxjs/dist/esm5/internal/observable/of.js");
/* harmony import */ var _internal_observable_onErrorResumeNext__WEBPACK_IMPORTED_MODULE_47__ = __webpack_require__(/*! ./internal/observable/onErrorResumeNext */ "./node_modules/rxjs/dist/esm5/internal/observable/onErrorResumeNext.js");
/* harmony import */ var _internal_observable_pairs__WEBPACK_IMPORTED_MODULE_48__ = __webpack_require__(/*! ./internal/observable/pairs */ "./node_modules/rxjs/dist/esm5/internal/observable/pairs.js");
/* harmony import */ var _internal_observable_partition__WEBPACK_IMPORTED_MODULE_49__ = __webpack_require__(/*! ./internal/observable/partition */ "./node_modules/rxjs/dist/esm5/internal/observable/partition.js");
/* harmony import */ var _internal_observable_race__WEBPACK_IMPORTED_MODULE_50__ = __webpack_require__(/*! ./internal/observable/race */ "./node_modules/rxjs/dist/esm5/internal/observable/race.js");
/* harmony import */ var _internal_observable_range__WEBPACK_IMPORTED_MODULE_51__ = __webpack_require__(/*! ./internal/observable/range */ "./node_modules/rxjs/dist/esm5/internal/observable/range.js");
/* harmony import */ var _internal_observable_throwError__WEBPACK_IMPORTED_MODULE_52__ = __webpack_require__(/*! ./internal/observable/throwError */ "./node_modules/rxjs/dist/esm5/internal/observable/throwError.js");
/* harmony import */ var _internal_observable_timer__WEBPACK_IMPORTED_MODULE_53__ = __webpack_require__(/*! ./internal/observable/timer */ "./node_modules/rxjs/dist/esm5/internal/observable/timer.js");
/* harmony import */ var _internal_observable_using__WEBPACK_IMPORTED_MODULE_54__ = __webpack_require__(/*! ./internal/observable/using */ "./node_modules/rxjs/dist/esm5/internal/observable/using.js");
/* harmony import */ var _internal_observable_zip__WEBPACK_IMPORTED_MODULE_55__ = __webpack_require__(/*! ./internal/observable/zip */ "./node_modules/rxjs/dist/esm5/internal/observable/zip.js");
/* harmony import */ var _internal_scheduled_scheduled__WEBPACK_IMPORTED_MODULE_56__ = __webpack_require__(/*! ./internal/scheduled/scheduled */ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduled.js");
/* harmony import */ var _internal_config__WEBPACK_IMPORTED_MODULE_57__ = __webpack_require__(/*! ./internal/config */ "./node_modules/rxjs/dist/esm5/internal/config.js");





























































//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/AsyncSubject.js":
/*!**************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/AsyncSubject.js ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AsyncSubject": () => (/* binding */ AsyncSubject)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");


var AsyncSubject = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(AsyncSubject, _super);
    function AsyncSubject() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._value = null;
        _this._hasValue = false;
        _this._isComplete = false;
        return _this;
    }
    AsyncSubject.prototype._checkFinalizedStatuses = function (subscriber) {
        var _a = this, hasError = _a.hasError, _hasValue = _a._hasValue, _value = _a._value, thrownError = _a.thrownError, isStopped = _a.isStopped;
        if (hasError) {
            subscriber.error(thrownError);
        }
        else if (isStopped) {
            _hasValue && subscriber.next(_value);
            subscriber.complete();
        }
    };
    AsyncSubject.prototype.next = function (value) {
        if (!this.isStopped) {
            this._value = value;
            this._hasValue = true;
        }
    };
    AsyncSubject.prototype.complete = function () {
        var _a = this, _hasValue = _a._hasValue, _value = _a._value, _isComplete = _a._isComplete;
        if (!_isComplete) {
            this._isComplete = true;
            _hasValue && _super.prototype.next.call(this, _value);
            _super.prototype.complete.call(this);
        }
    };
    return AsyncSubject;
}(_Subject__WEBPACK_IMPORTED_MODULE_1__.Subject));

//# sourceMappingURL=AsyncSubject.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/BehaviorSubject.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/BehaviorSubject.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "BehaviorSubject": () => (/* binding */ BehaviorSubject)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");


var BehaviorSubject = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(BehaviorSubject, _super);
    function BehaviorSubject(_value) {
        var _this = _super.call(this) || this;
        _this._value = _value;
        return _this;
    }
    Object.defineProperty(BehaviorSubject.prototype, "value", {
        get: function () {
            return this.getValue();
        },
        enumerable: false,
        configurable: true
    });
    BehaviorSubject.prototype._subscribe = function (subscriber) {
        var subscription = _super.prototype._subscribe.call(this, subscriber);
        !subscription.closed && subscriber.next(this._value);
        return subscription;
    };
    BehaviorSubject.prototype.getValue = function () {
        var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, _value = _a._value;
        if (hasError) {
            throw thrownError;
        }
        this._throwIfClosed();
        return _value;
    };
    BehaviorSubject.prototype.next = function (value) {
        _super.prototype.next.call(this, (this._value = value));
    };
    return BehaviorSubject;
}(_Subject__WEBPACK_IMPORTED_MODULE_1__.Subject));

//# sourceMappingURL=BehaviorSubject.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/Notification.js":
/*!**************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/Notification.js ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NotificationKind": () => (/* binding */ NotificationKind),
/* harmony export */   "Notification": () => (/* binding */ Notification),
/* harmony export */   "observeNotification": () => (/* binding */ observeNotification)
/* harmony export */ });
/* harmony import */ var _observable_empty__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./observable/empty */ "./node_modules/rxjs/dist/esm5/internal/observable/empty.js");
/* harmony import */ var _observable_of__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./observable/of */ "./node_modules/rxjs/dist/esm5/internal/observable/of.js");
/* harmony import */ var _observable_throwError__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./observable/throwError */ "./node_modules/rxjs/dist/esm5/internal/observable/throwError.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");




var NotificationKind;
(function (NotificationKind) {
    NotificationKind["NEXT"] = "N";
    NotificationKind["ERROR"] = "E";
    NotificationKind["COMPLETE"] = "C";
})(NotificationKind || (NotificationKind = {}));
var Notification = (function () {
    function Notification(kind, value, error) {
        this.kind = kind;
        this.value = value;
        this.error = error;
        this.hasValue = kind === 'N';
    }
    Notification.prototype.observe = function (observer) {
        return observeNotification(this, observer);
    };
    Notification.prototype.do = function (nextHandler, errorHandler, completeHandler) {
        var _a = this, kind = _a.kind, value = _a.value, error = _a.error;
        return kind === 'N' ? nextHandler === null || nextHandler === void 0 ? void 0 : nextHandler(value) : kind === 'E' ? errorHandler === null || errorHandler === void 0 ? void 0 : errorHandler(error) : completeHandler === null || completeHandler === void 0 ? void 0 : completeHandler();
    };
    Notification.prototype.accept = function (nextOrObserver, error, complete) {
        var _a;
        return (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)((_a = nextOrObserver) === null || _a === void 0 ? void 0 : _a.next)
            ? this.observe(nextOrObserver)
            : this.do(nextOrObserver, error, complete);
    };
    Notification.prototype.toObservable = function () {
        var _a = this, kind = _a.kind, value = _a.value, error = _a.error;
        var result = kind === 'N'
            ?
                (0,_observable_of__WEBPACK_IMPORTED_MODULE_1__.of)(value)
            :
                kind === 'E'
                    ?
                        (0,_observable_throwError__WEBPACK_IMPORTED_MODULE_2__.throwError)(function () { return error; })
                    :
                        kind === 'C'
                            ?
                                _observable_empty__WEBPACK_IMPORTED_MODULE_3__.EMPTY
                            :
                                0;
        if (!result) {
            throw new TypeError("Unexpected notification kind " + kind);
        }
        return result;
    };
    Notification.createNext = function (value) {
        return new Notification('N', value);
    };
    Notification.createError = function (err) {
        return new Notification('E', undefined, err);
    };
    Notification.createComplete = function () {
        return Notification.completeNotification;
    };
    Notification.completeNotification = new Notification('C');
    return Notification;
}());

function observeNotification(notification, observer) {
    var _a, _b, _c;
    var _d = notification, kind = _d.kind, value = _d.value, error = _d.error;
    if (typeof kind !== 'string') {
        throw new TypeError('Invalid notification, missing "kind"');
    }
    kind === 'N' ? (_a = observer.next) === null || _a === void 0 ? void 0 : _a.call(observer, value) : kind === 'E' ? (_b = observer.error) === null || _b === void 0 ? void 0 : _b.call(observer, error) : (_c = observer.complete) === null || _c === void 0 ? void 0 : _c.call(observer);
}
//# sourceMappingURL=Notification.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/NotificationFactories.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/NotificationFactories.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "COMPLETE_NOTIFICATION": () => (/* binding */ COMPLETE_NOTIFICATION),
/* harmony export */   "errorNotification": () => (/* binding */ errorNotification),
/* harmony export */   "nextNotification": () => (/* binding */ nextNotification),
/* harmony export */   "createNotification": () => (/* binding */ createNotification)
/* harmony export */ });
var COMPLETE_NOTIFICATION = (function () { return createNotification('C', undefined, undefined); })();
function errorNotification(error) {
    return createNotification('E', undefined, error);
}
function nextNotification(value) {
    return createNotification('N', value, undefined);
}
function createNotification(kind, value, error) {
    return {
        kind: kind,
        value: value,
        error: error,
    };
}
//# sourceMappingURL=NotificationFactories.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/Observable.js":
/*!************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/Observable.js ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Observable": () => (/* binding */ Observable)
/* harmony export */ });
/* harmony import */ var _Subscriber__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Subscriber */ "./node_modules/rxjs/dist/esm5/internal/Subscriber.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _symbol_observable__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./symbol/observable */ "./node_modules/rxjs/dist/esm5/internal/symbol/observable.js");
/* harmony import */ var _util_pipe__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./util/pipe */ "./node_modules/rxjs/dist/esm5/internal/util/pipe.js");
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./config */ "./node_modules/rxjs/dist/esm5/internal/config.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");






var Observable = (function () {
    function Observable(subscribe) {
        if (subscribe) {
            this._subscribe = subscribe;
        }
    }
    Observable.prototype.lift = function (operator) {
        var observable = new Observable();
        observable.source = this;
        observable.operator = operator;
        return observable;
    };
    Observable.prototype.subscribe = function (observerOrNext, error, complete) {
        var subscriber = isSubscriber(observerOrNext) ? observerOrNext : new _Subscriber__WEBPACK_IMPORTED_MODULE_0__.SafeSubscriber(observerOrNext, error, complete);
        if (_config__WEBPACK_IMPORTED_MODULE_1__.config.useDeprecatedSynchronousErrorHandling) {
            this._deprecatedSyncErrorSubscribe(subscriber);
        }
        else {
            var _a = this, operator = _a.operator, source = _a.source;
            subscriber.add(operator
                ?
                    operator.call(subscriber, source)
                : source
                    ?
                        this._subscribe(subscriber)
                    :
                        this._trySubscribe(subscriber));
        }
        return subscriber;
    };
    Observable.prototype._deprecatedSyncErrorSubscribe = function (subscriber) {
        var localSubscriber = subscriber;
        localSubscriber._syncErrorHack_isSubscribing = true;
        var operator = this.operator;
        if (operator) {
            subscriber.add(operator.call(subscriber, this.source));
        }
        else {
            try {
                subscriber.add(this._subscribe(subscriber));
            }
            catch (err) {
                localSubscriber.__syncError = err;
            }
        }
        var dest = localSubscriber;
        while (dest) {
            if ('__syncError' in dest) {
                try {
                    throw dest.__syncError;
                }
                finally {
                    subscriber.unsubscribe();
                }
            }
            dest = dest.destination;
        }
        localSubscriber._syncErrorHack_isSubscribing = false;
    };
    Observable.prototype._trySubscribe = function (sink) {
        try {
            return this._subscribe(sink);
        }
        catch (err) {
            sink.error(err);
        }
    };
    Observable.prototype.forEach = function (next, promiseCtor) {
        var _this = this;
        promiseCtor = getPromiseCtor(promiseCtor);
        return new promiseCtor(function (resolve, reject) {
            var subscription;
            subscription = _this.subscribe(function (value) {
                try {
                    next(value);
                }
                catch (err) {
                    reject(err);
                    subscription === null || subscription === void 0 ? void 0 : subscription.unsubscribe();
                }
            }, reject, resolve);
        });
    };
    Observable.prototype._subscribe = function (subscriber) {
        var _a;
        return (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber);
    };
    Observable.prototype[_symbol_observable__WEBPACK_IMPORTED_MODULE_2__.observable] = function () {
        return this;
    };
    Observable.prototype.pipe = function () {
        var operations = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            operations[_i] = arguments[_i];
        }
        return operations.length ? (0,_util_pipe__WEBPACK_IMPORTED_MODULE_3__.pipeFromArray)(operations)(this) : this;
    };
    Observable.prototype.toPromise = function (promiseCtor) {
        var _this = this;
        promiseCtor = getPromiseCtor(promiseCtor);
        return new promiseCtor(function (resolve, reject) {
            var value;
            _this.subscribe(function (x) { return (value = x); }, function (err) { return reject(err); }, function () { return resolve(value); });
        });
    };
    Observable.create = function (subscribe) {
        return new Observable(subscribe);
    };
    return Observable;
}());

function getPromiseCtor(promiseCtor) {
    var _a;
    return (_a = promiseCtor !== null && promiseCtor !== void 0 ? promiseCtor : _config__WEBPACK_IMPORTED_MODULE_1__.config.Promise) !== null && _a !== void 0 ? _a : Promise;
}
function isObserver(value) {
    return value && (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_4__.isFunction)(value.next) && (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_4__.isFunction)(value.error) && (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_4__.isFunction)(value.complete);
}
function isSubscriber(value) {
    return (value && value instanceof _Subscriber__WEBPACK_IMPORTED_MODULE_0__.Subscriber) || (isObserver(value) && (0,_Subscription__WEBPACK_IMPORTED_MODULE_5__.isSubscription)(value));
}
//# sourceMappingURL=Observable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/ReplaySubject.js":
/*!***************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/ReplaySubject.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ReplaySubject": () => (/* binding */ ReplaySubject)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _scheduler_dateTimestampProvider__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./scheduler/dateTimestampProvider */ "./node_modules/rxjs/dist/esm5/internal/scheduler/dateTimestampProvider.js");



var ReplaySubject = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(ReplaySubject, _super);
    function ReplaySubject(_bufferSize, _windowTime, _timestampProvider) {
        if (_bufferSize === void 0) { _bufferSize = Infinity; }
        if (_windowTime === void 0) { _windowTime = Infinity; }
        if (_timestampProvider === void 0) { _timestampProvider = _scheduler_dateTimestampProvider__WEBPACK_IMPORTED_MODULE_1__.dateTimestampProvider; }
        var _this = _super.call(this) || this;
        _this._bufferSize = _bufferSize;
        _this._windowTime = _windowTime;
        _this._timestampProvider = _timestampProvider;
        _this._buffer = [];
        _this._infiniteTimeWindow = true;
        _this._infiniteTimeWindow = _windowTime === Infinity;
        _this._bufferSize = Math.max(1, _bufferSize);
        _this._windowTime = Math.max(1, _windowTime);
        return _this;
    }
    ReplaySubject.prototype.next = function (value) {
        var _a = this, isStopped = _a.isStopped, _buffer = _a._buffer, _infiniteTimeWindow = _a._infiniteTimeWindow, _timestampProvider = _a._timestampProvider, _windowTime = _a._windowTime;
        if (!isStopped) {
            _buffer.push(value);
            !_infiniteTimeWindow && _buffer.push(_timestampProvider.now() + _windowTime);
        }
        this._trimBuffer();
        _super.prototype.next.call(this, value);
    };
    ReplaySubject.prototype._subscribe = function (subscriber) {
        this._throwIfClosed();
        this._trimBuffer();
        var subscription = this._innerSubscribe(subscriber);
        var _a = this, _infiniteTimeWindow = _a._infiniteTimeWindow, _buffer = _a._buffer;
        var copy = _buffer.slice();
        for (var i = 0; i < copy.length && !subscriber.closed; i += _infiniteTimeWindow ? 1 : 2) {
            subscriber.next(copy[i]);
        }
        this._checkFinalizedStatuses(subscriber);
        return subscription;
    };
    ReplaySubject.prototype._trimBuffer = function () {
        var _a = this, _bufferSize = _a._bufferSize, _timestampProvider = _a._timestampProvider, _buffer = _a._buffer, _infiniteTimeWindow = _a._infiniteTimeWindow;
        var adjustedBufferSize = (_infiniteTimeWindow ? 1 : 2) * _bufferSize;
        _bufferSize < Infinity && adjustedBufferSize < _buffer.length && _buffer.splice(0, _buffer.length - adjustedBufferSize);
        if (!_infiniteTimeWindow) {
            var now = _timestampProvider.now();
            var last = 0;
            for (var i = 1; i < _buffer.length && _buffer[i] <= now; i += 2) {
                last = i;
            }
            last && _buffer.splice(0, last + 1);
        }
    };
    return ReplaySubject;
}(_Subject__WEBPACK_IMPORTED_MODULE_2__.Subject));

//# sourceMappingURL=ReplaySubject.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/Scheduler.js":
/*!***********************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/Scheduler.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Scheduler": () => (/* binding */ Scheduler)
/* harmony export */ });
/* harmony import */ var _scheduler_dateTimestampProvider__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./scheduler/dateTimestampProvider */ "./node_modules/rxjs/dist/esm5/internal/scheduler/dateTimestampProvider.js");

var Scheduler = (function () {
    function Scheduler(schedulerActionCtor, now) {
        if (now === void 0) { now = Scheduler.now; }
        this.schedulerActionCtor = schedulerActionCtor;
        this.now = now;
    }
    Scheduler.prototype.schedule = function (work, delay, state) {
        if (delay === void 0) { delay = 0; }
        return new this.schedulerActionCtor(this, work).schedule(state, delay);
    };
    Scheduler.now = _scheduler_dateTimestampProvider__WEBPACK_IMPORTED_MODULE_0__.dateTimestampProvider.now;
    return Scheduler;
}());

//# sourceMappingURL=Scheduler.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/Subject.js":
/*!*********************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/Subject.js ***!
  \*********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Subject": () => (/* binding */ Subject),
/* harmony export */   "AnonymousSubject": () => (/* binding */ AnonymousSubject)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _util_ObjectUnsubscribedError__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./util/ObjectUnsubscribedError */ "./node_modules/rxjs/dist/esm5/internal/util/ObjectUnsubscribedError.js");
/* harmony import */ var _util_arrRemove__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./util/arrRemove */ "./node_modules/rxjs/dist/esm5/internal/util/arrRemove.js");





var Subject = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(Subject, _super);
    function Subject() {
        var _this = _super.call(this) || this;
        _this.closed = false;
        _this.observers = [];
        _this.isStopped = false;
        _this.hasError = false;
        _this.thrownError = null;
        return _this;
    }
    Subject.prototype.lift = function (operator) {
        var subject = new AnonymousSubject(this, this);
        subject.operator = operator;
        return subject;
    };
    Subject.prototype._throwIfClosed = function () {
        if (this.closed) {
            throw new _util_ObjectUnsubscribedError__WEBPACK_IMPORTED_MODULE_1__.ObjectUnsubscribedError();
        }
    };
    Subject.prototype.next = function (value) {
        var e_1, _a;
        this._throwIfClosed();
        if (!this.isStopped) {
            var copy = this.observers.slice();
            try {
                for (var copy_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__values)(copy), copy_1_1 = copy_1.next(); !copy_1_1.done; copy_1_1 = copy_1.next()) {
                    var observer = copy_1_1.value;
                    observer.next(value);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (copy_1_1 && !copy_1_1.done && (_a = copy_1.return)) _a.call(copy_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
    };
    Subject.prototype.error = function (err) {
        this._throwIfClosed();
        if (!this.isStopped) {
            this.hasError = this.isStopped = true;
            this.thrownError = err;
            var observers = this.observers;
            while (observers.length) {
                observers.shift().error(err);
            }
        }
    };
    Subject.prototype.complete = function () {
        this._throwIfClosed();
        if (!this.isStopped) {
            this.isStopped = true;
            var observers = this.observers;
            while (observers.length) {
                observers.shift().complete();
            }
        }
    };
    Subject.prototype.unsubscribe = function () {
        this.isStopped = this.closed = true;
        this.observers = null;
    };
    Object.defineProperty(Subject.prototype, "observed", {
        get: function () {
            var _a;
            return ((_a = this.observers) === null || _a === void 0 ? void 0 : _a.length) > 0;
        },
        enumerable: false,
        configurable: true
    });
    Subject.prototype._trySubscribe = function (subscriber) {
        this._throwIfClosed();
        return _super.prototype._trySubscribe.call(this, subscriber);
    };
    Subject.prototype._subscribe = function (subscriber) {
        this._throwIfClosed();
        this._checkFinalizedStatuses(subscriber);
        return this._innerSubscribe(subscriber);
    };
    Subject.prototype._innerSubscribe = function (subscriber) {
        var _a = this, hasError = _a.hasError, isStopped = _a.isStopped, observers = _a.observers;
        return hasError || isStopped
            ? _Subscription__WEBPACK_IMPORTED_MODULE_2__.EMPTY_SUBSCRIPTION
            : (observers.push(subscriber), new _Subscription__WEBPACK_IMPORTED_MODULE_2__.Subscription(function () { return (0,_util_arrRemove__WEBPACK_IMPORTED_MODULE_3__.arrRemove)(observers, subscriber); }));
    };
    Subject.prototype._checkFinalizedStatuses = function (subscriber) {
        var _a = this, hasError = _a.hasError, thrownError = _a.thrownError, isStopped = _a.isStopped;
        if (hasError) {
            subscriber.error(thrownError);
        }
        else if (isStopped) {
            subscriber.complete();
        }
    };
    Subject.prototype.asObservable = function () {
        var observable = new _Observable__WEBPACK_IMPORTED_MODULE_4__.Observable();
        observable.source = this;
        return observable;
    };
    Subject.create = function (destination, source) {
        return new AnonymousSubject(destination, source);
    };
    return Subject;
}(_Observable__WEBPACK_IMPORTED_MODULE_4__.Observable));

var AnonymousSubject = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(AnonymousSubject, _super);
    function AnonymousSubject(destination, source) {
        var _this = _super.call(this) || this;
        _this.destination = destination;
        _this.source = source;
        return _this;
    }
    AnonymousSubject.prototype.next = function (value) {
        var _a, _b;
        (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.next) === null || _b === void 0 ? void 0 : _b.call(_a, value);
    };
    AnonymousSubject.prototype.error = function (err) {
        var _a, _b;
        (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.error) === null || _b === void 0 ? void 0 : _b.call(_a, err);
    };
    AnonymousSubject.prototype.complete = function () {
        var _a, _b;
        (_b = (_a = this.destination) === null || _a === void 0 ? void 0 : _a.complete) === null || _b === void 0 ? void 0 : _b.call(_a);
    };
    AnonymousSubject.prototype._subscribe = function (subscriber) {
        var _a, _b;
        return (_b = (_a = this.source) === null || _a === void 0 ? void 0 : _a.subscribe(subscriber)) !== null && _b !== void 0 ? _b : _Subscription__WEBPACK_IMPORTED_MODULE_2__.EMPTY_SUBSCRIPTION;
    };
    return AnonymousSubject;
}(Subject));

//# sourceMappingURL=Subject.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/Subscriber.js":
/*!************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/Subscriber.js ***!
  \************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Subscriber": () => (/* binding */ Subscriber),
/* harmony export */   "SafeSubscriber": () => (/* binding */ SafeSubscriber),
/* harmony export */   "EMPTY_OBSERVER": () => (/* binding */ EMPTY_OBSERVER)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./config */ "./node_modules/rxjs/dist/esm5/internal/config.js");
/* harmony import */ var _util_reportUnhandledError__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./util/reportUnhandledError */ "./node_modules/rxjs/dist/esm5/internal/util/reportUnhandledError.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");
/* harmony import */ var _NotificationFactories__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./NotificationFactories */ "./node_modules/rxjs/dist/esm5/internal/NotificationFactories.js");
/* harmony import */ var _scheduler_timeoutProvider__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./scheduler/timeoutProvider */ "./node_modules/rxjs/dist/esm5/internal/scheduler/timeoutProvider.js");








var Subscriber = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(Subscriber, _super);
    function Subscriber(destination) {
        var _this = _super.call(this) || this;
        _this.isStopped = false;
        if (destination) {
            _this.destination = destination;
            if ((0,_Subscription__WEBPACK_IMPORTED_MODULE_1__.isSubscription)(destination)) {
                destination.add(_this);
            }
        }
        else {
            _this.destination = EMPTY_OBSERVER;
        }
        return _this;
    }
    Subscriber.create = function (next, error, complete) {
        return new SafeSubscriber(next, error, complete);
    };
    Subscriber.prototype.next = function (value) {
        if (this.isStopped) {
            handleStoppedNotification((0,_NotificationFactories__WEBPACK_IMPORTED_MODULE_2__.nextNotification)(value), this);
        }
        else {
            this._next(value);
        }
    };
    Subscriber.prototype.error = function (err) {
        if (this.isStopped) {
            handleStoppedNotification((0,_NotificationFactories__WEBPACK_IMPORTED_MODULE_2__.errorNotification)(err), this);
        }
        else {
            this.isStopped = true;
            this._error(err);
        }
    };
    Subscriber.prototype.complete = function () {
        if (this.isStopped) {
            handleStoppedNotification(_NotificationFactories__WEBPACK_IMPORTED_MODULE_2__.COMPLETE_NOTIFICATION, this);
        }
        else {
            this.isStopped = true;
            this._complete();
        }
    };
    Subscriber.prototype.unsubscribe = function () {
        if (!this.closed) {
            this.isStopped = true;
            _super.prototype.unsubscribe.call(this);
            this.destination = null;
        }
    };
    Subscriber.prototype._next = function (value) {
        this.destination.next(value);
    };
    Subscriber.prototype._error = function (err) {
        try {
            this.destination.error(err);
        }
        finally {
            this.unsubscribe();
        }
    };
    Subscriber.prototype._complete = function () {
        try {
            this.destination.complete();
        }
        finally {
            this.unsubscribe();
        }
    };
    return Subscriber;
}(_Subscription__WEBPACK_IMPORTED_MODULE_1__.Subscription));

var SafeSubscriber = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(SafeSubscriber, _super);
    function SafeSubscriber(observerOrNext, error, complete) {
        var _this = _super.call(this) || this;
        var next;
        if ((0,_util_isFunction__WEBPACK_IMPORTED_MODULE_3__.isFunction)(observerOrNext)) {
            next = observerOrNext;
        }
        else if (observerOrNext) {
            (next = observerOrNext.next, error = observerOrNext.error, complete = observerOrNext.complete);
            var context_1;
            if (_this && _config__WEBPACK_IMPORTED_MODULE_4__.config.useDeprecatedNextContext) {
                context_1 = Object.create(observerOrNext);
                context_1.unsubscribe = function () { return _this.unsubscribe(); };
            }
            else {
                context_1 = observerOrNext;
            }
            next = next === null || next === void 0 ? void 0 : next.bind(context_1);
            error = error === null || error === void 0 ? void 0 : error.bind(context_1);
            complete = complete === null || complete === void 0 ? void 0 : complete.bind(context_1);
        }
        _this.destination = {
            next: next ? wrapForErrorHandling(next, _this) : _util_noop__WEBPACK_IMPORTED_MODULE_5__.noop,
            error: wrapForErrorHandling(error !== null && error !== void 0 ? error : defaultErrorHandler, _this),
            complete: complete ? wrapForErrorHandling(complete, _this) : _util_noop__WEBPACK_IMPORTED_MODULE_5__.noop,
        };
        return _this;
    }
    return SafeSubscriber;
}(Subscriber));

function wrapForErrorHandling(handler, instance) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        try {
            handler.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__read)(args)));
        }
        catch (err) {
            if (_config__WEBPACK_IMPORTED_MODULE_4__.config.useDeprecatedSynchronousErrorHandling) {
                if (instance._syncErrorHack_isSubscribing) {
                    instance.__syncError = err;
                }
                else {
                    throw err;
                }
            }
            else {
                (0,_util_reportUnhandledError__WEBPACK_IMPORTED_MODULE_6__.reportUnhandledError)(err);
            }
        }
    };
}
function defaultErrorHandler(err) {
    throw err;
}
function handleStoppedNotification(notification, subscriber) {
    var onStoppedNotification = _config__WEBPACK_IMPORTED_MODULE_4__.config.onStoppedNotification;
    onStoppedNotification && _scheduler_timeoutProvider__WEBPACK_IMPORTED_MODULE_7__.timeoutProvider.setTimeout(function () { return onStoppedNotification(notification, subscriber); });
}
var EMPTY_OBSERVER = {
    closed: true,
    next: _util_noop__WEBPACK_IMPORTED_MODULE_5__.noop,
    error: defaultErrorHandler,
    complete: _util_noop__WEBPACK_IMPORTED_MODULE_5__.noop,
};
//# sourceMappingURL=Subscriber.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/Subscription.js":
/*!**************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/Subscription.js ***!
  \**************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Subscription": () => (/* binding */ Subscription),
/* harmony export */   "EMPTY_SUBSCRIPTION": () => (/* binding */ EMPTY_SUBSCRIPTION),
/* harmony export */   "isSubscription": () => (/* binding */ isSubscription)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");
/* harmony import */ var _util_UnsubscriptionError__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./util/UnsubscriptionError */ "./node_modules/rxjs/dist/esm5/internal/util/UnsubscriptionError.js");
/* harmony import */ var _util_arrRemove__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./util/arrRemove */ "./node_modules/rxjs/dist/esm5/internal/util/arrRemove.js");




var Subscription = (function () {
    function Subscription(initialTeardown) {
        this.initialTeardown = initialTeardown;
        this.closed = false;
        this._parentage = null;
        this._teardowns = null;
    }
    Subscription.prototype.unsubscribe = function () {
        var e_1, _a, e_2, _b;
        var errors;
        if (!this.closed) {
            this.closed = true;
            var _parentage = this._parentage;
            if (_parentage) {
                this._parentage = null;
                if (Array.isArray(_parentage)) {
                    try {
                        for (var _parentage_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__values)(_parentage), _parentage_1_1 = _parentage_1.next(); !_parentage_1_1.done; _parentage_1_1 = _parentage_1.next()) {
                            var parent_1 = _parentage_1_1.value;
                            parent_1.remove(this);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_parentage_1_1 && !_parentage_1_1.done && (_a = _parentage_1.return)) _a.call(_parentage_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
                else {
                    _parentage.remove(this);
                }
            }
            var initialTeardown = this.initialTeardown;
            if ((0,_util_isFunction__WEBPACK_IMPORTED_MODULE_1__.isFunction)(initialTeardown)) {
                try {
                    initialTeardown();
                }
                catch (e) {
                    errors = e instanceof _util_UnsubscriptionError__WEBPACK_IMPORTED_MODULE_2__.UnsubscriptionError ? e.errors : [e];
                }
            }
            var _teardowns = this._teardowns;
            if (_teardowns) {
                this._teardowns = null;
                try {
                    for (var _teardowns_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__values)(_teardowns), _teardowns_1_1 = _teardowns_1.next(); !_teardowns_1_1.done; _teardowns_1_1 = _teardowns_1.next()) {
                        var teardown_1 = _teardowns_1_1.value;
                        try {
                            execTeardown(teardown_1);
                        }
                        catch (err) {
                            errors = errors !== null && errors !== void 0 ? errors : [];
                            if (err instanceof _util_UnsubscriptionError__WEBPACK_IMPORTED_MODULE_2__.UnsubscriptionError) {
                                errors = (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__spreadArray)((0,tslib__WEBPACK_IMPORTED_MODULE_0__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__read)(errors)), (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__read)(err.errors));
                            }
                            else {
                                errors.push(err);
                            }
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (_teardowns_1_1 && !_teardowns_1_1.done && (_b = _teardowns_1.return)) _b.call(_teardowns_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
            if (errors) {
                throw new _util_UnsubscriptionError__WEBPACK_IMPORTED_MODULE_2__.UnsubscriptionError(errors);
            }
        }
    };
    Subscription.prototype.add = function (teardown) {
        var _a;
        if (teardown && teardown !== this) {
            if (this.closed) {
                execTeardown(teardown);
            }
            else {
                if (teardown instanceof Subscription) {
                    if (teardown.closed || teardown._hasParent(this)) {
                        return;
                    }
                    teardown._addParent(this);
                }
                (this._teardowns = (_a = this._teardowns) !== null && _a !== void 0 ? _a : []).push(teardown);
            }
        }
    };
    Subscription.prototype._hasParent = function (parent) {
        var _parentage = this._parentage;
        return _parentage === parent || (Array.isArray(_parentage) && _parentage.includes(parent));
    };
    Subscription.prototype._addParent = function (parent) {
        var _parentage = this._parentage;
        this._parentage = Array.isArray(_parentage) ? (_parentage.push(parent), _parentage) : _parentage ? [_parentage, parent] : parent;
    };
    Subscription.prototype._removeParent = function (parent) {
        var _parentage = this._parentage;
        if (_parentage === parent) {
            this._parentage = null;
        }
        else if (Array.isArray(_parentage)) {
            (0,_util_arrRemove__WEBPACK_IMPORTED_MODULE_3__.arrRemove)(_parentage, parent);
        }
    };
    Subscription.prototype.remove = function (teardown) {
        var _teardowns = this._teardowns;
        _teardowns && (0,_util_arrRemove__WEBPACK_IMPORTED_MODULE_3__.arrRemove)(_teardowns, teardown);
        if (teardown instanceof Subscription) {
            teardown._removeParent(this);
        }
    };
    Subscription.EMPTY = (function () {
        var empty = new Subscription();
        empty.closed = true;
        return empty;
    })();
    return Subscription;
}());

var EMPTY_SUBSCRIPTION = Subscription.EMPTY;
function isSubscription(value) {
    return (value instanceof Subscription ||
        (value && 'closed' in value && (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_1__.isFunction)(value.remove) && (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_1__.isFunction)(value.add) && (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_1__.isFunction)(value.unsubscribe)));
}
function execTeardown(teardown) {
    if ((0,_util_isFunction__WEBPACK_IMPORTED_MODULE_1__.isFunction)(teardown)) {
        teardown();
    }
    else {
        teardown.unsubscribe();
    }
}
//# sourceMappingURL=Subscription.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/config.js":
/*!********************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/config.js ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "config": () => (/* binding */ config)
/* harmony export */ });
var config = {
    onUnhandledError: null,
    onStoppedNotification: null,
    Promise: undefined,
    useDeprecatedSynchronousErrorHandling: false,
    useDeprecatedNextContext: false,
};
//# sourceMappingURL=config.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/firstValueFrom.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/firstValueFrom.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "firstValueFrom": () => (/* binding */ firstValueFrom)
/* harmony export */ });
/* harmony import */ var _util_EmptyError__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./util/EmptyError */ "./node_modules/rxjs/dist/esm5/internal/util/EmptyError.js");
/* harmony import */ var _Subscriber__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./Subscriber */ "./node_modules/rxjs/dist/esm5/internal/Subscriber.js");


function firstValueFrom(source, config) {
    var hasConfig = typeof config === 'object';
    return new Promise(function (resolve, reject) {
        var subscriber = new _Subscriber__WEBPACK_IMPORTED_MODULE_0__.SafeSubscriber({
            next: function (value) {
                resolve(value);
                subscriber.unsubscribe();
            },
            error: reject,
            complete: function () {
                if (hasConfig) {
                    resolve(config.defaultValue);
                }
                else {
                    reject(new _util_EmptyError__WEBPACK_IMPORTED_MODULE_1__.EmptyError());
                }
            },
        });
        source.subscribe(subscriber);
    });
}
//# sourceMappingURL=firstValueFrom.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/lastValueFrom.js":
/*!***************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/lastValueFrom.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "lastValueFrom": () => (/* binding */ lastValueFrom)
/* harmony export */ });
/* harmony import */ var _util_EmptyError__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./util/EmptyError */ "./node_modules/rxjs/dist/esm5/internal/util/EmptyError.js");

function lastValueFrom(source, config) {
    var hasConfig = typeof config === 'object';
    return new Promise(function (resolve, reject) {
        var _hasValue = false;
        var _value;
        source.subscribe({
            next: function (value) {
                _value = value;
                _hasValue = true;
            },
            error: reject,
            complete: function () {
                if (_hasValue) {
                    resolve(_value);
                }
                else if (hasConfig) {
                    resolve(config.defaultValue);
                }
                else {
                    reject(new _util_EmptyError__WEBPACK_IMPORTED_MODULE_0__.EmptyError());
                }
            },
        });
    });
}
//# sourceMappingURL=lastValueFrom.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/ConnectableObservable.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/ConnectableObservable.js ***!
  \**********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ConnectableObservable": () => (/* binding */ ConnectableObservable)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _operators_refCount__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../operators/refCount */ "./node_modules/rxjs/dist/esm5/internal/operators/refCount.js");
/* harmony import */ var _operators_OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../operators/OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");






var ConnectableObservable = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(ConnectableObservable, _super);
    function ConnectableObservable(source, subjectFactory) {
        var _this = _super.call(this) || this;
        _this.source = source;
        _this.subjectFactory = subjectFactory;
        _this._subject = null;
        _this._refCount = 0;
        _this._connection = null;
        if ((0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.hasLift)(source)) {
            _this.lift = source.lift;
        }
        return _this;
    }
    ConnectableObservable.prototype._subscribe = function (subscriber) {
        return this.getSubject().subscribe(subscriber);
    };
    ConnectableObservable.prototype.getSubject = function () {
        var subject = this._subject;
        if (!subject || subject.isStopped) {
            this._subject = this.subjectFactory();
        }
        return this._subject;
    };
    ConnectableObservable.prototype._teardown = function () {
        this._refCount = 0;
        var _connection = this._connection;
        this._subject = this._connection = null;
        _connection === null || _connection === void 0 ? void 0 : _connection.unsubscribe();
    };
    ConnectableObservable.prototype.connect = function () {
        var _this = this;
        var connection = this._connection;
        if (!connection) {
            connection = this._connection = new _Subscription__WEBPACK_IMPORTED_MODULE_2__.Subscription();
            var subject_1 = this.getSubject();
            connection.add(this.source.subscribe(new _operators_OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__.OperatorSubscriber(subject_1, undefined, function () {
                _this._teardown();
                subject_1.complete();
            }, function (err) {
                _this._teardown();
                subject_1.error(err);
            }, function () { return _this._teardown(); })));
            if (connection.closed) {
                this._connection = null;
                connection = _Subscription__WEBPACK_IMPORTED_MODULE_2__.Subscription.EMPTY;
            }
        }
        return connection;
    };
    ConnectableObservable.prototype.refCount = function () {
        return (0,_operators_refCount__WEBPACK_IMPORTED_MODULE_4__.refCount)()(this);
    };
    return ConnectableObservable;
}(_Observable__WEBPACK_IMPORTED_MODULE_5__.Observable));

//# sourceMappingURL=ConnectableObservable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/bindCallback.js":
/*!*************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/bindCallback.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "bindCallback": () => (/* binding */ bindCallback)
/* harmony export */ });
/* harmony import */ var _bindCallbackInternals__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./bindCallbackInternals */ "./node_modules/rxjs/dist/esm5/internal/observable/bindCallbackInternals.js");

function bindCallback(callbackFunc, resultSelector, scheduler) {
    return (0,_bindCallbackInternals__WEBPACK_IMPORTED_MODULE_0__.bindCallbackInternals)(false, callbackFunc, resultSelector, scheduler);
}
//# sourceMappingURL=bindCallback.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/bindCallbackInternals.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/bindCallbackInternals.js ***!
  \**********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "bindCallbackInternals": () => (/* binding */ bindCallbackInternals)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_isScheduler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isScheduler */ "./node_modules/rxjs/dist/esm5/internal/util/isScheduler.js");
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _operators_subscribeOn__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../operators/subscribeOn */ "./node_modules/rxjs/dist/esm5/internal/operators/subscribeOn.js");
/* harmony import */ var _util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/mapOneOrManyArgs */ "./node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js");
/* harmony import */ var _operators_observeOn__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../operators/observeOn */ "./node_modules/rxjs/dist/esm5/internal/operators/observeOn.js");
/* harmony import */ var _AsyncSubject__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../AsyncSubject */ "./node_modules/rxjs/dist/esm5/internal/AsyncSubject.js");







function bindCallbackInternals(isNodeStyle, callbackFunc, resultSelector, scheduler) {
    if (resultSelector) {
        if ((0,_util_isScheduler__WEBPACK_IMPORTED_MODULE_0__.isScheduler)(resultSelector)) {
            scheduler = resultSelector;
        }
        else {
            return function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                return bindCallbackInternals(isNodeStyle, callbackFunc, scheduler)
                    .apply(this, args)
                    .pipe((0,_util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_1__.mapOneOrManyArgs)(resultSelector));
            };
        }
    }
    if (scheduler) {
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return bindCallbackInternals(isNodeStyle, callbackFunc)
                .apply(this, args)
                .pipe((0,_operators_subscribeOn__WEBPACK_IMPORTED_MODULE_2__.subscribeOn)(scheduler), (0,_operators_observeOn__WEBPACK_IMPORTED_MODULE_3__.observeOn)(scheduler));
        };
    }
    return function () {
        var _this = this;
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var subject = new _AsyncSubject__WEBPACK_IMPORTED_MODULE_4__.AsyncSubject();
        var uninitialized = true;
        return new _Observable__WEBPACK_IMPORTED_MODULE_5__.Observable(function (subscriber) {
            var subs = subject.subscribe(subscriber);
            if (uninitialized) {
                uninitialized = false;
                var isAsync_1 = false;
                var isComplete_1 = false;
                callbackFunc.apply(_this, (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__spreadArray)((0,tslib__WEBPACK_IMPORTED_MODULE_6__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__read)(args)), [
                    function () {
                        var results = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            results[_i] = arguments[_i];
                        }
                        if (isNodeStyle) {
                            var err = results.shift();
                            if (err != null) {
                                subject.error(err);
                                return;
                            }
                        }
                        subject.next(1 < results.length ? results : results[0]);
                        isComplete_1 = true;
                        if (isAsync_1) {
                            subject.complete();
                        }
                    },
                ]));
                if (isComplete_1) {
                    subject.complete();
                }
                isAsync_1 = true;
            }
            return subs;
        });
    };
}
//# sourceMappingURL=bindCallbackInternals.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/bindNodeCallback.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/bindNodeCallback.js ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "bindNodeCallback": () => (/* binding */ bindNodeCallback)
/* harmony export */ });
/* harmony import */ var _bindCallbackInternals__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./bindCallbackInternals */ "./node_modules/rxjs/dist/esm5/internal/observable/bindCallbackInternals.js");

function bindNodeCallback(callbackFunc, resultSelector, scheduler) {
    return (0,_bindCallbackInternals__WEBPACK_IMPORTED_MODULE_0__.bindCallbackInternals)(true, callbackFunc, resultSelector, scheduler);
}
//# sourceMappingURL=bindNodeCallback.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/combineLatest.js":
/*!**************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/combineLatest.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "combineLatest": () => (/* binding */ combineLatest),
/* harmony export */   "combineLatestInit": () => (/* binding */ combineLatestInit)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _util_argsArgArrayOrObject__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/argsArgArrayOrObject */ "./node_modules/rxjs/dist/esm5/internal/util/argsArgArrayOrObject.js");
/* harmony import */ var _from__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");
/* harmony import */ var _util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../util/mapOneOrManyArgs */ "./node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");
/* harmony import */ var _util_createObject__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/createObject */ "./node_modules/rxjs/dist/esm5/internal/util/createObject.js");
/* harmony import */ var _operators_OperatorSubscriber__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../operators/OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");








function combineLatest() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var scheduler = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popScheduler)(args);
    var resultSelector = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popResultSelector)(args);
    var _a = (0,_util_argsArgArrayOrObject__WEBPACK_IMPORTED_MODULE_1__.argsArgArrayOrObject)(args), observables = _a.args, keys = _a.keys;
    if (observables.length === 0) {
        return (0,_from__WEBPACK_IMPORTED_MODULE_2__.from)([], scheduler);
    }
    var result = new _Observable__WEBPACK_IMPORTED_MODULE_3__.Observable(combineLatestInit(observables, scheduler, keys
        ?
            function (values) { return (0,_util_createObject__WEBPACK_IMPORTED_MODULE_4__.createObject)(keys, values); }
        :
            _util_identity__WEBPACK_IMPORTED_MODULE_5__.identity));
    return resultSelector ? result.pipe((0,_util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_6__.mapOneOrManyArgs)(resultSelector)) : result;
}
function combineLatestInit(observables, scheduler, valueTransform) {
    if (valueTransform === void 0) { valueTransform = _util_identity__WEBPACK_IMPORTED_MODULE_5__.identity; }
    return function (subscriber) {
        maybeSchedule(scheduler, function () {
            var length = observables.length;
            var values = new Array(length);
            var active = length;
            var remainingFirstValues = length;
            var _loop_1 = function (i) {
                maybeSchedule(scheduler, function () {
                    var source = (0,_from__WEBPACK_IMPORTED_MODULE_2__.from)(observables[i], scheduler);
                    var hasFirstValue = false;
                    source.subscribe(new _operators_OperatorSubscriber__WEBPACK_IMPORTED_MODULE_7__.OperatorSubscriber(subscriber, function (value) {
                        values[i] = value;
                        if (!hasFirstValue) {
                            hasFirstValue = true;
                            remainingFirstValues--;
                        }
                        if (!remainingFirstValues) {
                            subscriber.next(valueTransform(values.slice()));
                        }
                    }, function () {
                        if (!--active) {
                            subscriber.complete();
                        }
                    }));
                }, subscriber);
            };
            for (var i = 0; i < length; i++) {
                _loop_1(i);
            }
        }, subscriber);
    };
}
function maybeSchedule(scheduler, execute, subscription) {
    if (scheduler) {
        subscription.add(scheduler.schedule(execute));
    }
    else {
        execute();
    }
}
//# sourceMappingURL=combineLatest.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/concat.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/concat.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "concat": () => (/* binding */ concat)
/* harmony export */ });
/* harmony import */ var _operators_concatAll__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../operators/concatAll */ "./node_modules/rxjs/dist/esm5/internal/operators/concatAll.js");
/* harmony import */ var _fromArray__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./fromArray */ "./node_modules/rxjs/dist/esm5/internal/observable/fromArray.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");



function concat() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return (0,_operators_concatAll__WEBPACK_IMPORTED_MODULE_0__.concatAll)()((0,_fromArray__WEBPACK_IMPORTED_MODULE_1__.internalFromArray)(args, (0,_util_args__WEBPACK_IMPORTED_MODULE_2__.popScheduler)(args)));
}
//# sourceMappingURL=concat.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/connectable.js":
/*!************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/connectable.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "connectable": () => (/* binding */ connectable)
/* harmony export */ });
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _defer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./defer */ "./node_modules/rxjs/dist/esm5/internal/observable/defer.js");



var DEFAULT_CONFIG = {
    connector: function () { return new _Subject__WEBPACK_IMPORTED_MODULE_0__.Subject(); },
    resetOnDisconnect: true,
};
function connectable(source, config) {
    if (config === void 0) { config = DEFAULT_CONFIG; }
    var connection = null;
    var connector = config.connector, _a = config.resetOnDisconnect, resetOnDisconnect = _a === void 0 ? true : _a;
    var subject = connector();
    var result = new _Observable__WEBPACK_IMPORTED_MODULE_1__.Observable(function (subscriber) {
        return subject.subscribe(subscriber);
    });
    result.connect = function () {
        if (!connection || connection.closed) {
            connection = (0,_defer__WEBPACK_IMPORTED_MODULE_2__.defer)(function () { return source; }).subscribe(subject);
            if (resetOnDisconnect) {
                connection.add(function () { return (subject = connector()); });
            }
        }
        return connection;
    };
    return result;
}
//# sourceMappingURL=connectable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/defer.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/defer.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "defer": () => (/* binding */ defer)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _from__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");


function defer(observableFactory) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable(function (subscriber) {
        (0,_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(observableFactory()).subscribe(subscriber);
    });
}
//# sourceMappingURL=defer.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/dom/animationFrames.js":
/*!********************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/dom/animationFrames.js ***!
  \********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "animationFrames": () => (/* binding */ animationFrames)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../../Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _scheduler_performanceTimestampProvider__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../../scheduler/performanceTimestampProvider */ "./node_modules/rxjs/dist/esm5/internal/scheduler/performanceTimestampProvider.js");
/* harmony import */ var _scheduler_animationFrameProvider__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../../scheduler/animationFrameProvider */ "./node_modules/rxjs/dist/esm5/internal/scheduler/animationFrameProvider.js");




function animationFrames(timestampProvider) {
    return timestampProvider ? animationFramesFactory(timestampProvider) : DEFAULT_ANIMATION_FRAMES;
}
function animationFramesFactory(timestampProvider) {
    var schedule = _scheduler_animationFrameProvider__WEBPACK_IMPORTED_MODULE_0__.animationFrameProvider.schedule;
    return new _Observable__WEBPACK_IMPORTED_MODULE_1__.Observable(function (subscriber) {
        var subscription = new _Subscription__WEBPACK_IMPORTED_MODULE_2__.Subscription();
        var provider = timestampProvider || _scheduler_performanceTimestampProvider__WEBPACK_IMPORTED_MODULE_3__.performanceTimestampProvider;
        var start = provider.now();
        var run = function (timestamp) {
            var now = provider.now();
            subscriber.next({
                timestamp: timestampProvider ? now : timestamp,
                elapsed: now - start
            });
            if (!subscriber.closed) {
                subscription.add(schedule(run));
            }
        };
        subscription.add(schedule(run));
        return subscription;
    });
}
var DEFAULT_ANIMATION_FRAMES = animationFramesFactory();
//# sourceMappingURL=animationFrames.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/empty.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/empty.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "EMPTY": () => (/* binding */ EMPTY),
/* harmony export */   "empty": () => (/* binding */ empty)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");

var EMPTY = new _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable(function (subscriber) { return subscriber.complete(); });
function empty(scheduler) {
    return scheduler ? emptyScheduled(scheduler) : EMPTY;
}
function emptyScheduled(scheduler) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable(function (subscriber) { return scheduler.schedule(function () { return subscriber.complete(); }); });
}
//# sourceMappingURL=empty.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/forkJoin.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/forkJoin.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "forkJoin": () => (/* binding */ forkJoin)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _util_argsArgArrayOrObject__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/argsArgArrayOrObject */ "./node_modules/rxjs/dist/esm5/internal/util/argsArgArrayOrObject.js");
/* harmony import */ var _from__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");
/* harmony import */ var _operators_OperatorSubscriber__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../operators/OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../util/mapOneOrManyArgs */ "./node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js");
/* harmony import */ var _util_createObject__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/createObject */ "./node_modules/rxjs/dist/esm5/internal/util/createObject.js");







function forkJoin() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var resultSelector = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popResultSelector)(args);
    var _a = (0,_util_argsArgArrayOrObject__WEBPACK_IMPORTED_MODULE_1__.argsArgArrayOrObject)(args), sources = _a.args, keys = _a.keys;
    var result = new _Observable__WEBPACK_IMPORTED_MODULE_2__.Observable(function (subscriber) {
        var length = sources.length;
        if (!length) {
            subscriber.complete();
            return;
        }
        var values = new Array(length);
        var remainingCompletions = length;
        var remainingEmissions = length;
        var _loop_1 = function (sourceIndex) {
            var hasValue = false;
            (0,_from__WEBPACK_IMPORTED_MODULE_3__.innerFrom)(sources[sourceIndex]).subscribe(new _operators_OperatorSubscriber__WEBPACK_IMPORTED_MODULE_4__.OperatorSubscriber(subscriber, function (value) {
                if (!hasValue) {
                    hasValue = true;
                    remainingEmissions--;
                }
                values[sourceIndex] = value;
            }, function () {
                if (!--remainingCompletions || !hasValue) {
                    if (!remainingEmissions) {
                        subscriber.next(keys ? (0,_util_createObject__WEBPACK_IMPORTED_MODULE_5__.createObject)(keys, values) : values);
                    }
                    subscriber.complete();
                }
            }));
        };
        for (var sourceIndex = 0; sourceIndex < length; sourceIndex++) {
            _loop_1(sourceIndex);
        }
    });
    return resultSelector ? result.pipe((0,_util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_6__.mapOneOrManyArgs)(resultSelector)) : result;
}
//# sourceMappingURL=forkJoin.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/from.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/from.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "from": () => (/* binding */ from),
/* harmony export */   "innerFrom": () => (/* binding */ innerFrom),
/* harmony export */   "fromArrayLike": () => (/* binding */ fromArrayLike)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_isArrayLike__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/isArrayLike */ "./node_modules/rxjs/dist/esm5/internal/util/isArrayLike.js");
/* harmony import */ var _util_isPromise__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/isPromise */ "./node_modules/rxjs/dist/esm5/internal/util/isPromise.js");
/* harmony import */ var _symbol_observable__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../symbol/observable */ "./node_modules/rxjs/dist/esm5/internal/symbol/observable.js");
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _scheduled_scheduled__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduled/scheduled */ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduled.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");
/* harmony import */ var _util_reportUnhandledError__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../util/reportUnhandledError */ "./node_modules/rxjs/dist/esm5/internal/util/reportUnhandledError.js");
/* harmony import */ var _util_isInteropObservable__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/isInteropObservable */ "./node_modules/rxjs/dist/esm5/internal/util/isInteropObservable.js");
/* harmony import */ var _util_isAsyncIterable__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/isAsyncIterable */ "./node_modules/rxjs/dist/esm5/internal/util/isAsyncIterable.js");
/* harmony import */ var _util_throwUnobservableError__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../util/throwUnobservableError */ "./node_modules/rxjs/dist/esm5/internal/util/throwUnobservableError.js");
/* harmony import */ var _util_isIterable__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../util/isIterable */ "./node_modules/rxjs/dist/esm5/internal/util/isIterable.js");
/* harmony import */ var _util_isReadableStreamLike__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../util/isReadableStreamLike */ "./node_modules/rxjs/dist/esm5/internal/util/isReadableStreamLike.js");













function from(input, scheduler) {
    return scheduler ? (0,_scheduled_scheduled__WEBPACK_IMPORTED_MODULE_0__.scheduled)(input, scheduler) : innerFrom(input);
}
function innerFrom(input) {
    if (input instanceof _Observable__WEBPACK_IMPORTED_MODULE_1__.Observable) {
        return input;
    }
    if (input != null) {
        if ((0,_util_isInteropObservable__WEBPACK_IMPORTED_MODULE_2__.isInteropObservable)(input)) {
            return fromInteropObservable(input);
        }
        if ((0,_util_isArrayLike__WEBPACK_IMPORTED_MODULE_3__.isArrayLike)(input)) {
            return fromArrayLike(input);
        }
        if ((0,_util_isPromise__WEBPACK_IMPORTED_MODULE_4__.isPromise)(input)) {
            return fromPromise(input);
        }
        if ((0,_util_isAsyncIterable__WEBPACK_IMPORTED_MODULE_5__.isAsyncIterable)(input)) {
            return fromAsyncIterable(input);
        }
        if ((0,_util_isIterable__WEBPACK_IMPORTED_MODULE_6__.isIterable)(input)) {
            return fromIterable(input);
        }
        if ((0,_util_isReadableStreamLike__WEBPACK_IMPORTED_MODULE_7__.isReadableStreamLike)(input)) {
            return fromReadableStreamLike(input);
        }
    }
    throw (0,_util_throwUnobservableError__WEBPACK_IMPORTED_MODULE_8__.createInvalidObservableTypeError)(input);
}
function fromInteropObservable(obj) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_1__.Observable(function (subscriber) {
        var obs = obj[_symbol_observable__WEBPACK_IMPORTED_MODULE_9__.observable]();
        if ((0,_util_isFunction__WEBPACK_IMPORTED_MODULE_10__.isFunction)(obs.subscribe)) {
            return obs.subscribe(subscriber);
        }
        throw new TypeError('Provided object does not correctly implement Symbol.observable');
    });
}
function fromArrayLike(array) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_1__.Observable(function (subscriber) {
        for (var i = 0; i < array.length && !subscriber.closed; i++) {
            subscriber.next(array[i]);
        }
        subscriber.complete();
    });
}
function fromPromise(promise) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_1__.Observable(function (subscriber) {
        promise
            .then(function (value) {
            if (!subscriber.closed) {
                subscriber.next(value);
                subscriber.complete();
            }
        }, function (err) { return subscriber.error(err); })
            .then(null, _util_reportUnhandledError__WEBPACK_IMPORTED_MODULE_11__.reportUnhandledError);
    });
}
function fromIterable(iterable) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_1__.Observable(function (subscriber) {
        var e_1, _a;
        try {
            for (var iterable_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_12__.__values)(iterable), iterable_1_1 = iterable_1.next(); !iterable_1_1.done; iterable_1_1 = iterable_1.next()) {
                var value = iterable_1_1.value;
                subscriber.next(value);
                if (subscriber.closed) {
                    return;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (iterable_1_1 && !iterable_1_1.done && (_a = iterable_1.return)) _a.call(iterable_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        subscriber.complete();
    });
}
function fromAsyncIterable(asyncIterable) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_1__.Observable(function (subscriber) {
        process(asyncIterable, subscriber).catch(function (err) { return subscriber.error(err); });
    });
}
function fromReadableStreamLike(readableStream) {
    return fromAsyncIterable((0,_util_isReadableStreamLike__WEBPACK_IMPORTED_MODULE_7__.readableStreamLikeToAsyncGenerator)(readableStream));
}
function process(asyncIterable, subscriber) {
    var asyncIterable_1, asyncIterable_1_1;
    var e_2, _a;
    return (0,tslib__WEBPACK_IMPORTED_MODULE_12__.__awaiter)(this, void 0, void 0, function () {
        var value, e_2_1;
        return (0,tslib__WEBPACK_IMPORTED_MODULE_12__.__generator)(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 5, 6, 11]);
                    asyncIterable_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_12__.__asyncValues)(asyncIterable);
                    _b.label = 1;
                case 1: return [4, asyncIterable_1.next()];
                case 2:
                    if (!(asyncIterable_1_1 = _b.sent(), !asyncIterable_1_1.done)) return [3, 4];
                    value = asyncIterable_1_1.value;
                    subscriber.next(value);
                    if (subscriber.closed) {
                        return [2];
                    }
                    _b.label = 3;
                case 3: return [3, 1];
                case 4: return [3, 11];
                case 5:
                    e_2_1 = _b.sent();
                    e_2 = { error: e_2_1 };
                    return [3, 11];
                case 6:
                    _b.trys.push([6, , 9, 10]);
                    if (!(asyncIterable_1_1 && !asyncIterable_1_1.done && (_a = asyncIterable_1.return))) return [3, 8];
                    return [4, _a.call(asyncIterable_1)];
                case 7:
                    _b.sent();
                    _b.label = 8;
                case 8: return [3, 10];
                case 9:
                    if (e_2) throw e_2.error;
                    return [7];
                case 10: return [7];
                case 11:
                    subscriber.complete();
                    return [2];
            }
        });
    });
}
//# sourceMappingURL=from.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/fromArray.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/fromArray.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "internalFromArray": () => (/* binding */ internalFromArray)
/* harmony export */ });
/* harmony import */ var _scheduled_scheduleArray__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduled/scheduleArray */ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleArray.js");
/* harmony import */ var _from__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");


function internalFromArray(input, scheduler) {
    return scheduler ? (0,_scheduled_scheduleArray__WEBPACK_IMPORTED_MODULE_0__.scheduleArray)(input, scheduler) : (0,_from__WEBPACK_IMPORTED_MODULE_1__.fromArrayLike)(input);
}
//# sourceMappingURL=fromArray.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/fromEvent.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/fromEvent.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "fromEvent": () => (/* binding */ fromEvent)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _operators_mergeMap__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../operators/mergeMap */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js");
/* harmony import */ var _util_isArrayLike__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/isArrayLike */ "./node_modules/rxjs/dist/esm5/internal/util/isArrayLike.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");
/* harmony import */ var _util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/mapOneOrManyArgs */ "./node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js");
/* harmony import */ var _fromArray__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./fromArray */ "./node_modules/rxjs/dist/esm5/internal/observable/fromArray.js");







var nodeEventEmitterMethods = ['addListener', 'removeListener'];
var eventTargetMethods = ['addEventListener', 'removeEventListener'];
var jqueryMethods = ['on', 'off'];
function fromEvent(target, eventName, options, resultSelector) {
    if ((0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(options)) {
        resultSelector = options;
        options = undefined;
    }
    if (resultSelector) {
        return fromEvent(target, eventName, options).pipe((0,_util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_1__.mapOneOrManyArgs)(resultSelector));
    }
    var _a = (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__read)(isEventTarget(target)
        ? eventTargetMethods.map(function (methodName) { return function (handler) { return target[methodName](eventName, handler, options); }; })
        :
            isNodeStyleEventEmitter(target)
                ? nodeEventEmitterMethods.map(toCommonHandlerRegistry(target, eventName))
                : isJQueryStyleEventEmitter(target)
                    ? jqueryMethods.map(toCommonHandlerRegistry(target, eventName))
                    : [], 2), add = _a[0], remove = _a[1];
    if (!add) {
        if ((0,_util_isArrayLike__WEBPACK_IMPORTED_MODULE_3__.isArrayLike)(target)) {
            return (0,_operators_mergeMap__WEBPACK_IMPORTED_MODULE_4__.mergeMap)(function (subTarget) { return fromEvent(subTarget, eventName, options); })((0,_fromArray__WEBPACK_IMPORTED_MODULE_5__.internalFromArray)(target));
        }
    }
    if (!add) {
        throw new TypeError('Invalid event target');
    }
    return new _Observable__WEBPACK_IMPORTED_MODULE_6__.Observable(function (subscriber) {
        var handler = function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return subscriber.next(1 < args.length ? args : args[0]);
        };
        add(handler);
        return function () { return remove(handler); };
    });
}
function toCommonHandlerRegistry(target, eventName) {
    return function (methodName) { return function (handler) { return target[methodName](eventName, handler); }; };
}
function isNodeStyleEventEmitter(target) {
    return (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(target.addListener) && (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(target.removeListener);
}
function isJQueryStyleEventEmitter(target) {
    return (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(target.on) && (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(target.off);
}
function isEventTarget(target) {
    return (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(target.addEventListener) && (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(target.removeEventListener);
}
//# sourceMappingURL=fromEvent.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/fromEventPattern.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/fromEventPattern.js ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "fromEventPattern": () => (/* binding */ fromEventPattern)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");
/* harmony import */ var _util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/mapOneOrManyArgs */ "./node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js");



function fromEventPattern(addHandler, removeHandler, resultSelector) {
    if (resultSelector) {
        return fromEventPattern(addHandler, removeHandler).pipe((0,_util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_0__.mapOneOrManyArgs)(resultSelector));
    }
    return new _Observable__WEBPACK_IMPORTED_MODULE_1__.Observable(function (subscriber) {
        var handler = function () {
            var e = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                e[_i] = arguments[_i];
            }
            return subscriber.next(e.length === 1 ? e[0] : e);
        };
        var retValue = addHandler(handler);
        return (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_2__.isFunction)(removeHandler) ? function () { return removeHandler(handler, retValue); } : undefined;
    });
}
//# sourceMappingURL=fromEventPattern.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/fromSubscribable.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/fromSubscribable.js ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "fromSubscribable": () => (/* binding */ fromSubscribable)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");

function fromSubscribable(subscribable) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable(function (subscriber) { return subscribable.subscribe(subscriber); });
}
//# sourceMappingURL=fromSubscribable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/generate.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/generate.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "generate": () => (/* binding */ generate)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");
/* harmony import */ var _util_isScheduler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/isScheduler */ "./node_modules/rxjs/dist/esm5/internal/util/isScheduler.js");
/* harmony import */ var _defer__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./defer */ "./node_modules/rxjs/dist/esm5/internal/observable/defer.js");
/* harmony import */ var _scheduled_scheduleIterable__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../scheduled/scheduleIterable */ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleIterable.js");





function generate(initialStateOrOptions, condition, iterate, resultSelectorOrScheduler, scheduler) {
    var _a, _b;
    var resultSelector;
    var initialState;
    if (arguments.length === 1) {
        (_a = initialStateOrOptions, initialState = _a.initialState, condition = _a.condition, iterate = _a.iterate, _b = _a.resultSelector, resultSelector = _b === void 0 ? _util_identity__WEBPACK_IMPORTED_MODULE_0__.identity : _b, scheduler = _a.scheduler);
    }
    else {
        initialState = initialStateOrOptions;
        if (!resultSelectorOrScheduler || (0,_util_isScheduler__WEBPACK_IMPORTED_MODULE_1__.isScheduler)(resultSelectorOrScheduler)) {
            resultSelector = _util_identity__WEBPACK_IMPORTED_MODULE_0__.identity;
            scheduler = resultSelectorOrScheduler;
        }
        else {
            resultSelector = resultSelectorOrScheduler;
        }
    }
    function gen() {
        var state;
        return (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__generator)(this, function (_a) {
            switch (_a.label) {
                case 0:
                    state = initialState;
                    _a.label = 1;
                case 1:
                    if (!(!condition || condition(state))) return [3, 4];
                    return [4, resultSelector(state)];
                case 2:
                    _a.sent();
                    _a.label = 3;
                case 3:
                    state = iterate(state);
                    return [3, 1];
                case 4: return [2];
            }
        });
    }
    return (0,_defer__WEBPACK_IMPORTED_MODULE_3__.defer)((scheduler
        ?
            function () { return (0,_scheduled_scheduleIterable__WEBPACK_IMPORTED_MODULE_4__.scheduleIterable)(gen(), scheduler); }
        :
            gen));
}
//# sourceMappingURL=generate.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/iif.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/iif.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "iif": () => (/* binding */ iif)
/* harmony export */ });
/* harmony import */ var _defer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./defer */ "./node_modules/rxjs/dist/esm5/internal/observable/defer.js");

function iif(condition, trueResult, falseResult) {
    return (0,_defer__WEBPACK_IMPORTED_MODULE_0__.defer)(function () { return (condition() ? trueResult : falseResult); });
}
//# sourceMappingURL=iif.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/interval.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/interval.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "interval": () => (/* binding */ interval)
/* harmony export */ });
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _timer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./timer */ "./node_modules/rxjs/dist/esm5/internal/observable/timer.js");


function interval(period, scheduler) {
    if (period === void 0) { period = 0; }
    if (scheduler === void 0) { scheduler = _scheduler_async__WEBPACK_IMPORTED_MODULE_0__.asyncScheduler; }
    if (period < 0) {
        period = 0;
    }
    return (0,_timer__WEBPACK_IMPORTED_MODULE_1__.timer)(period, period, scheduler);
}
//# sourceMappingURL=interval.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/merge.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/merge.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "merge": () => (/* binding */ merge)
/* harmony export */ });
/* harmony import */ var _operators_mergeAll__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../operators/mergeAll */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeAll.js");
/* harmony import */ var _fromArray__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./fromArray */ "./node_modules/rxjs/dist/esm5/internal/observable/fromArray.js");
/* harmony import */ var _from__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _empty__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./empty */ "./node_modules/rxjs/dist/esm5/internal/observable/empty.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");





function merge() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var scheduler = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popScheduler)(args);
    var concurrent = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popNumber)(args, Infinity);
    var sources = args;
    return !sources.length
        ?
            _empty__WEBPACK_IMPORTED_MODULE_1__.EMPTY
        : sources.length === 1
            ?
                (0,_from__WEBPACK_IMPORTED_MODULE_2__.innerFrom)(sources[0])
            :
                (0,_operators_mergeAll__WEBPACK_IMPORTED_MODULE_3__.mergeAll)(concurrent)((0,_fromArray__WEBPACK_IMPORTED_MODULE_4__.internalFromArray)(sources, scheduler));
}
//# sourceMappingURL=merge.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/never.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/never.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NEVER": () => (/* binding */ NEVER),
/* harmony export */   "never": () => (/* binding */ never)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");


var NEVER = new _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable(_util_noop__WEBPACK_IMPORTED_MODULE_1__.noop);
function never() {
    return NEVER;
}
//# sourceMappingURL=never.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/of.js":
/*!***************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/of.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "of": () => (/* binding */ of)
/* harmony export */ });
/* harmony import */ var _fromArray__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./fromArray */ "./node_modules/rxjs/dist/esm5/internal/observable/fromArray.js");
/* harmony import */ var _scheduled_scheduleArray__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../scheduled/scheduleArray */ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleArray.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");



function of() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var scheduler = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popScheduler)(args);
    return scheduler ? (0,_scheduled_scheduleArray__WEBPACK_IMPORTED_MODULE_1__.scheduleArray)(args, scheduler) : (0,_fromArray__WEBPACK_IMPORTED_MODULE_2__.internalFromArray)(args);
}
//# sourceMappingURL=of.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/onErrorResumeNext.js":
/*!******************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/onErrorResumeNext.js ***!
  \******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "onErrorResumeNext": () => (/* binding */ onErrorResumeNext)
/* harmony export */ });
/* harmony import */ var _empty__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./empty */ "./node_modules/rxjs/dist/esm5/internal/observable/empty.js");
/* harmony import */ var _operators_onErrorResumeNext__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../operators/onErrorResumeNext */ "./node_modules/rxjs/dist/esm5/internal/operators/onErrorResumeNext.js");
/* harmony import */ var _util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/argsOrArgArray */ "./node_modules/rxjs/dist/esm5/internal/util/argsOrArgArray.js");



function onErrorResumeNext() {
    var sources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        sources[_i] = arguments[_i];
    }
    return (0,_operators_onErrorResumeNext__WEBPACK_IMPORTED_MODULE_0__.onErrorResumeNext)((0,_util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_1__.argsOrArgArray)(sources))(_empty__WEBPACK_IMPORTED_MODULE_2__.EMPTY);
}
//# sourceMappingURL=onErrorResumeNext.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/pairs.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/pairs.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "pairs": () => (/* binding */ pairs)
/* harmony export */ });
/* harmony import */ var _from__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");

function pairs(obj, scheduler) {
    return (0,_from__WEBPACK_IMPORTED_MODULE_0__.from)(Object.entries(obj), scheduler);
}
//# sourceMappingURL=pairs.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/partition.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/partition.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "partition": () => (/* binding */ partition)
/* harmony export */ });
/* harmony import */ var _util_not__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/not */ "./node_modules/rxjs/dist/esm5/internal/util/not.js");
/* harmony import */ var _operators_filter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../operators/filter */ "./node_modules/rxjs/dist/esm5/internal/operators/filter.js");
/* harmony import */ var _from__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");



function partition(source, predicate, thisArg) {
    return [(0,_operators_filter__WEBPACK_IMPORTED_MODULE_0__.filter)(predicate, thisArg)((0,_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(source)), (0,_operators_filter__WEBPACK_IMPORTED_MODULE_0__.filter)((0,_util_not__WEBPACK_IMPORTED_MODULE_2__.not)(predicate, thisArg))((0,_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(source))];
}
//# sourceMappingURL=partition.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/race.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/race.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "race": () => (/* binding */ race),
/* harmony export */   "raceInit": () => (/* binding */ raceInit)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _from__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/argsOrArgArray */ "./node_modules/rxjs/dist/esm5/internal/util/argsOrArgArray.js");
/* harmony import */ var _operators_OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../operators/OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");




function race() {
    var sources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        sources[_i] = arguments[_i];
    }
    sources = (0,_util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_0__.argsOrArgArray)(sources);
    return sources.length === 1 ? (0,_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(sources[0]) : new _Observable__WEBPACK_IMPORTED_MODULE_2__.Observable(raceInit(sources));
}
function raceInit(sources) {
    return function (subscriber) {
        var subscriptions = [];
        var _loop_1 = function (i) {
            subscriptions.push((0,_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(sources[i]).subscribe(new _operators_OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__.OperatorSubscriber(subscriber, function (value) {
                if (subscriptions) {
                    for (var s = 0; s < subscriptions.length; s++) {
                        s !== i && subscriptions[s].unsubscribe();
                    }
                    subscriptions = null;
                }
                subscriber.next(value);
            })));
        };
        for (var i = 0; subscriptions && !subscriber.closed && i < sources.length; i++) {
            _loop_1(i);
        }
    };
}
//# sourceMappingURL=race.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/range.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/range.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "range": () => (/* binding */ range)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _empty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./empty */ "./node_modules/rxjs/dist/esm5/internal/observable/empty.js");


function range(start, count, scheduler) {
    if (count == null) {
        count = start;
        start = 0;
    }
    if (count <= 0) {
        return _empty__WEBPACK_IMPORTED_MODULE_0__.EMPTY;
    }
    var end = count + start;
    return new _Observable__WEBPACK_IMPORTED_MODULE_1__.Observable(scheduler
        ?
            function (subscriber) {
                var n = start;
                return scheduler.schedule(function () {
                    if (n < end) {
                        subscriber.next(n++);
                        this.schedule();
                    }
                    else {
                        subscriber.complete();
                    }
                });
            }
        :
            function (subscriber) {
                var n = start;
                while (n < end && !subscriber.closed) {
                    subscriber.next(n++);
                }
                subscriber.complete();
            });
}
//# sourceMappingURL=range.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/throwError.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/throwError.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "throwError": () => (/* binding */ throwError)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");


function throwError(errorOrErrorFactory, scheduler) {
    var errorFactory = (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(errorOrErrorFactory) ? errorOrErrorFactory : function () { return errorOrErrorFactory; };
    var init = function (subscriber) { return subscriber.error(errorFactory()); };
    return new _Observable__WEBPACK_IMPORTED_MODULE_1__.Observable(scheduler ? function (subscriber) { return scheduler.schedule(init, 0, subscriber); } : init);
}
//# sourceMappingURL=throwError.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/timer.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/timer.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "timer": () => (/* binding */ timer)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _util_isScheduler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/isScheduler */ "./node_modules/rxjs/dist/esm5/internal/util/isScheduler.js");
/* harmony import */ var _util_isDate__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/isDate */ "./node_modules/rxjs/dist/esm5/internal/util/isDate.js");




function timer(dueTime, intervalOrScheduler, scheduler) {
    if (dueTime === void 0) { dueTime = 0; }
    if (scheduler === void 0) { scheduler = _scheduler_async__WEBPACK_IMPORTED_MODULE_0__.async; }
    var intervalDuration = -1;
    if (intervalOrScheduler != null) {
        if ((0,_util_isScheduler__WEBPACK_IMPORTED_MODULE_1__.isScheduler)(intervalOrScheduler)) {
            scheduler = intervalOrScheduler;
        }
        else {
            intervalDuration = intervalOrScheduler;
        }
    }
    return new _Observable__WEBPACK_IMPORTED_MODULE_2__.Observable(function (subscriber) {
        var due = (0,_util_isDate__WEBPACK_IMPORTED_MODULE_3__.isValidDate)(dueTime) ? +dueTime - scheduler.now() : dueTime;
        if (due < 0) {
            due = 0;
        }
        var n = 0;
        return scheduler.schedule(function () {
            if (!subscriber.closed) {
                subscriber.next(n++);
                if (0 <= intervalDuration) {
                    this.schedule(undefined, intervalDuration);
                }
                else {
                    subscriber.complete();
                }
            }
        }, due);
    });
}
//# sourceMappingURL=timer.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/using.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/using.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "using": () => (/* binding */ using)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _from__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _empty__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./empty */ "./node_modules/rxjs/dist/esm5/internal/observable/empty.js");



function using(resourceFactory, observableFactory) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable(function (subscriber) {
        var resource = resourceFactory();
        var result = observableFactory(resource);
        var source = result ? (0,_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(result) : _empty__WEBPACK_IMPORTED_MODULE_2__.EMPTY;
        source.subscribe(subscriber);
        return function () {
            if (resource) {
                resource.unsubscribe();
            }
        };
    });
}
//# sourceMappingURL=using.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/observable/zip.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/observable/zip.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "zip": () => (/* binding */ zip)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _from__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/argsOrArgArray */ "./node_modules/rxjs/dist/esm5/internal/util/argsOrArgArray.js");
/* harmony import */ var _empty__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./empty */ "./node_modules/rxjs/dist/esm5/internal/observable/empty.js");
/* harmony import */ var _operators_OperatorSubscriber__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../operators/OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");







function zip() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var resultSelector = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popResultSelector)(args);
    var sources = (0,_util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_1__.argsOrArgArray)(args);
    return sources.length
        ? new _Observable__WEBPACK_IMPORTED_MODULE_2__.Observable(function (subscriber) {
            var buffers = sources.map(function () { return []; });
            var completed = sources.map(function () { return false; });
            subscriber.add(function () {
                buffers = completed = null;
            });
            var _loop_1 = function (sourceIndex) {
                (0,_from__WEBPACK_IMPORTED_MODULE_3__.innerFrom)(sources[sourceIndex]).subscribe(new _operators_OperatorSubscriber__WEBPACK_IMPORTED_MODULE_4__.OperatorSubscriber(subscriber, function (value) {
                    buffers[sourceIndex].push(value);
                    if (buffers.every(function (buffer) { return buffer.length; })) {
                        var result = buffers.map(function (buffer) { return buffer.shift(); });
                        subscriber.next(resultSelector ? resultSelector.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__read)(result))) : result);
                        if (buffers.some(function (buffer, i) { return !buffer.length && completed[i]; })) {
                            subscriber.complete();
                        }
                    }
                }, function () {
                    completed[sourceIndex] = true;
                    !buffers[sourceIndex].length && subscriber.complete();
                }));
            };
            for (var sourceIndex = 0; !subscriber.closed && sourceIndex < sources.length; sourceIndex++) {
                _loop_1(sourceIndex);
            }
            return function () {
                buffers = completed = null;
            };
        })
        : _empty__WEBPACK_IMPORTED_MODULE_6__.EMPTY;
}
//# sourceMappingURL=zip.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js":
/*!******************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js ***!
  \******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "OperatorSubscriber": () => (/* binding */ OperatorSubscriber)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Subscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Subscriber */ "./node_modules/rxjs/dist/esm5/internal/Subscriber.js");


var OperatorSubscriber = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(OperatorSubscriber, _super);
    function OperatorSubscriber(destination, onNext, onComplete, onError, onFinalize) {
        var _this = _super.call(this, destination) || this;
        _this.onFinalize = onFinalize;
        _this._next = onNext
            ? function (value) {
                try {
                    onNext(value);
                }
                catch (err) {
                    destination.error(err);
                }
            }
            : _super.prototype._next;
        _this._error = onError
            ? function (err) {
                try {
                    onError(err);
                }
                catch (err) {
                    destination.error(err);
                }
                finally {
                    this.unsubscribe();
                }
            }
            : _super.prototype._error;
        _this._complete = onComplete
            ? function () {
                try {
                    onComplete();
                }
                catch (err) {
                    destination.error(err);
                }
                finally {
                    this.unsubscribe();
                }
            }
            : _super.prototype._complete;
        return _this;
    }
    OperatorSubscriber.prototype.unsubscribe = function () {
        var _a;
        var closed = this.closed;
        _super.prototype.unsubscribe.call(this);
        !closed && ((_a = this.onFinalize) === null || _a === void 0 ? void 0 : _a.call(this));
    };
    return OperatorSubscriber;
}(_Subscriber__WEBPACK_IMPORTED_MODULE_1__.Subscriber));

//# sourceMappingURL=OperatorSubscriber.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/audit.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/audit.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "audit": () => (/* binding */ audit)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function audit(durationSelector) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var hasValue = false;
        var lastValue = null;
        var durationSubscriber = null;
        var isComplete = false;
        var endDuration = function () {
            durationSubscriber === null || durationSubscriber === void 0 ? void 0 : durationSubscriber.unsubscribe();
            durationSubscriber = null;
            if (hasValue) {
                hasValue = false;
                var value = lastValue;
                lastValue = null;
                subscriber.next(value);
            }
            isComplete && subscriber.complete();
        };
        var cleanupDuration = function () {
            durationSubscriber = null;
            isComplete && subscriber.complete();
        };
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            hasValue = true;
            lastValue = value;
            if (!durationSubscriber) {
                (0,_observable_from__WEBPACK_IMPORTED_MODULE_2__.innerFrom)(durationSelector(value)).subscribe((durationSubscriber = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, endDuration, cleanupDuration)));
            }
        }, function () {
            isComplete = true;
            (!hasValue || !durationSubscriber || durationSubscriber.closed) && subscriber.complete();
        }));
    });
}
//# sourceMappingURL=audit.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/auditTime.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/auditTime.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "auditTime": () => (/* binding */ auditTime)
/* harmony export */ });
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _audit__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./audit */ "./node_modules/rxjs/dist/esm5/internal/operators/audit.js");
/* harmony import */ var _observable_timer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/timer */ "./node_modules/rxjs/dist/esm5/internal/observable/timer.js");



function auditTime(duration, scheduler) {
    if (scheduler === void 0) { scheduler = _scheduler_async__WEBPACK_IMPORTED_MODULE_0__.async; }
    return (0,_audit__WEBPACK_IMPORTED_MODULE_1__.audit)(function () { return (0,_observable_timer__WEBPACK_IMPORTED_MODULE_2__.timer)(duration, scheduler); });
}
//# sourceMappingURL=auditTime.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/buffer.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/buffer.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "buffer": () => (/* binding */ buffer)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function buffer(closingNotifier) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var currentBuffer = [];
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) { return currentBuffer.push(value); }, function () {
            subscriber.next(currentBuffer);
            subscriber.complete();
        }));
        closingNotifier.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function () {
            var b = currentBuffer;
            currentBuffer = [];
            subscriber.next(b);
        }, _util_noop__WEBPACK_IMPORTED_MODULE_2__.noop));
        return function () {
            currentBuffer = null;
        };
    });
}
//# sourceMappingURL=buffer.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/bufferCount.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/bufferCount.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "bufferCount": () => (/* binding */ bufferCount)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_arrRemove__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/arrRemove */ "./node_modules/rxjs/dist/esm5/internal/util/arrRemove.js");




function bufferCount(bufferSize, startBufferEvery) {
    if (startBufferEvery === void 0) { startBufferEvery = null; }
    startBufferEvery = startBufferEvery !== null && startBufferEvery !== void 0 ? startBufferEvery : bufferSize;
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var buffers = [];
        var count = 0;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            var e_1, _a, e_2, _b;
            var toEmit = null;
            if (count++ % startBufferEvery === 0) {
                buffers.push([]);
            }
            try {
                for (var buffers_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__values)(buffers), buffers_1_1 = buffers_1.next(); !buffers_1_1.done; buffers_1_1 = buffers_1.next()) {
                    var buffer = buffers_1_1.value;
                    buffer.push(value);
                    if (bufferSize <= buffer.length) {
                        toEmit = toEmit !== null && toEmit !== void 0 ? toEmit : [];
                        toEmit.push(buffer);
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (buffers_1_1 && !buffers_1_1.done && (_a = buffers_1.return)) _a.call(buffers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            if (toEmit) {
                try {
                    for (var toEmit_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__values)(toEmit), toEmit_1_1 = toEmit_1.next(); !toEmit_1_1.done; toEmit_1_1 = toEmit_1.next()) {
                        var buffer = toEmit_1_1.value;
                        (0,_util_arrRemove__WEBPACK_IMPORTED_MODULE_3__.arrRemove)(buffers, buffer);
                        subscriber.next(buffer);
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (toEmit_1_1 && !toEmit_1_1.done && (_b = toEmit_1.return)) _b.call(toEmit_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }, function () {
            var e_3, _a;
            try {
                for (var buffers_2 = (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__values)(buffers), buffers_2_1 = buffers_2.next(); !buffers_2_1.done; buffers_2_1 = buffers_2.next()) {
                    var buffer = buffers_2_1.value;
                    subscriber.next(buffer);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (buffers_2_1 && !buffers_2_1.done && (_a = buffers_2.return)) _a.call(buffers_2);
                }
                finally { if (e_3) throw e_3.error; }
            }
            subscriber.complete();
        }, undefined, function () {
            buffers = null;
        }));
    });
}
//# sourceMappingURL=bufferCount.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/bufferTime.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/bufferTime.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "bufferTime": () => (/* binding */ bufferTime)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_arrRemove__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/arrRemove */ "./node_modules/rxjs/dist/esm5/internal/util/arrRemove.js");
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");







function bufferTime(bufferTimeSpan) {
    var _a, _b;
    var otherArgs = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        otherArgs[_i - 1] = arguments[_i];
    }
    var scheduler = (_a = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popScheduler)(otherArgs)) !== null && _a !== void 0 ? _a : _scheduler_async__WEBPACK_IMPORTED_MODULE_1__.asyncScheduler;
    var bufferCreationInterval = (_b = otherArgs[0]) !== null && _b !== void 0 ? _b : null;
    var maxBufferSize = otherArgs[1] || Infinity;
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_2__.operate)(function (source, subscriber) {
        var bufferRecords = [];
        var restartOnEmit = false;
        var emit = function (record) {
            var buffer = record.buffer, subs = record.subs;
            subs.unsubscribe();
            (0,_util_arrRemove__WEBPACK_IMPORTED_MODULE_3__.arrRemove)(bufferRecords, record);
            subscriber.next(buffer);
            restartOnEmit && startBuffer();
        };
        var startBuffer = function () {
            if (bufferRecords) {
                var subs = new _Subscription__WEBPACK_IMPORTED_MODULE_4__.Subscription();
                subscriber.add(subs);
                var buffer = [];
                var record_1 = {
                    buffer: buffer,
                    subs: subs,
                };
                bufferRecords.push(record_1);
                subs.add(scheduler.schedule(function () { return emit(record_1); }, bufferTimeSpan));
            }
        };
        bufferCreationInterval !== null && bufferCreationInterval >= 0
            ?
                subscriber.add(scheduler.schedule(function () {
                    startBuffer();
                    !this.closed && subscriber.add(this.schedule(null, bufferCreationInterval));
                }, bufferCreationInterval))
            : (restartOnEmit = true);
        startBuffer();
        var bufferTimeSubscriber = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_5__.OperatorSubscriber(subscriber, function (value) {
            var e_1, _a;
            var recordsCopy = bufferRecords.slice();
            try {
                for (var recordsCopy_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__values)(recordsCopy), recordsCopy_1_1 = recordsCopy_1.next(); !recordsCopy_1_1.done; recordsCopy_1_1 = recordsCopy_1.next()) {
                    var record = recordsCopy_1_1.value;
                    var buffer = record.buffer;
                    buffer.push(value);
                    maxBufferSize <= buffer.length && emit(record);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (recordsCopy_1_1 && !recordsCopy_1_1.done && (_a = recordsCopy_1.return)) _a.call(recordsCopy_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }, function () {
            while (bufferRecords === null || bufferRecords === void 0 ? void 0 : bufferRecords.length) {
                subscriber.next(bufferRecords.shift().buffer);
            }
            bufferTimeSubscriber === null || bufferTimeSubscriber === void 0 ? void 0 : bufferTimeSubscriber.unsubscribe();
            subscriber.complete();
            subscriber.unsubscribe();
        }, undefined, function () { return (bufferRecords = null); });
        source.subscribe(bufferTimeSubscriber);
    });
}
//# sourceMappingURL=bufferTime.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/bufferToggle.js":
/*!************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/bufferToggle.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "bufferToggle": () => (/* binding */ bufferToggle)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");
/* harmony import */ var _util_arrRemove__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/arrRemove */ "./node_modules/rxjs/dist/esm5/internal/util/arrRemove.js");







function bufferToggle(openings, closingSelector) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var buffers = [];
        (0,_observable_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(openings).subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (openValue) {
            var buffer = [];
            buffers.push(buffer);
            var closingSubscription = new _Subscription__WEBPACK_IMPORTED_MODULE_3__.Subscription();
            var emitBuffer = function () {
                (0,_util_arrRemove__WEBPACK_IMPORTED_MODULE_4__.arrRemove)(buffers, buffer);
                subscriber.next(buffer);
                closingSubscription.unsubscribe();
            };
            closingSubscription.add((0,_observable_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(closingSelector(openValue)).subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, emitBuffer, _util_noop__WEBPACK_IMPORTED_MODULE_5__.noop)));
        }, _util_noop__WEBPACK_IMPORTED_MODULE_5__.noop));
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) {
            var e_1, _a;
            try {
                for (var buffers_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__values)(buffers), buffers_1_1 = buffers_1.next(); !buffers_1_1.done; buffers_1_1 = buffers_1.next()) {
                    var buffer = buffers_1_1.value;
                    buffer.push(value);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (buffers_1_1 && !buffers_1_1.done && (_a = buffers_1.return)) _a.call(buffers_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }, function () {
            while (buffers.length > 0) {
                subscriber.next(buffers.shift());
            }
            subscriber.complete();
        }));
    });
}
//# sourceMappingURL=bufferToggle.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/bufferWhen.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/bufferWhen.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "bufferWhen": () => (/* binding */ bufferWhen)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");




function bufferWhen(closingSelector) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var buffer = null;
        var closingSubscriber = null;
        var openBuffer = function () {
            closingSubscriber === null || closingSubscriber === void 0 ? void 0 : closingSubscriber.unsubscribe();
            var b = buffer;
            buffer = [];
            b && subscriber.next(b);
            (0,_observable_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(closingSelector()).subscribe((closingSubscriber = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, openBuffer, _util_noop__WEBPACK_IMPORTED_MODULE_3__.noop)));
        };
        openBuffer();
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) { return buffer === null || buffer === void 0 ? void 0 : buffer.push(value); }, function () {
            buffer && subscriber.next(buffer);
            subscriber.complete();
        }, undefined, function () { return (buffer = closingSubscriber = null); }));
    });
}
//# sourceMappingURL=bufferWhen.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/catchError.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/catchError.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "catchError": () => (/* binding */ catchError)
/* harmony export */ });
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");



function catchError(selector) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var innerSub = null;
        var syncUnsub = false;
        var handledResult;
        innerSub = source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, undefined, undefined, function (err) {
            handledResult = (0,_observable_from__WEBPACK_IMPORTED_MODULE_2__.innerFrom)(selector(err, catchError(selector)(source)));
            if (innerSub) {
                innerSub.unsubscribe();
                innerSub = null;
                handledResult.subscribe(subscriber);
            }
            else {
                syncUnsub = true;
            }
        }));
        if (syncUnsub) {
            innerSub.unsubscribe();
            innerSub = null;
            handledResult.subscribe(subscriber);
        }
    });
}
//# sourceMappingURL=catchError.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/combineAll.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/combineAll.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "combineAll": () => (/* binding */ combineAll)
/* harmony export */ });
/* harmony import */ var _combineLatestAll__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./combineLatestAll */ "./node_modules/rxjs/dist/esm5/internal/operators/combineLatestAll.js");

var combineAll = _combineLatestAll__WEBPACK_IMPORTED_MODULE_0__.combineLatestAll;
//# sourceMappingURL=combineAll.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/combineLatest.js":
/*!*************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/combineLatest.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "combineLatest": () => (/* binding */ combineLatest)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _observable_combineLatest__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../observable/combineLatest */ "./node_modules/rxjs/dist/esm5/internal/observable/combineLatest.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../util/argsOrArgArray */ "./node_modules/rxjs/dist/esm5/internal/util/argsOrArgArray.js");
/* harmony import */ var _util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/mapOneOrManyArgs */ "./node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js");
/* harmony import */ var _util_pipe__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/pipe */ "./node_modules/rxjs/dist/esm5/internal/util/pipe.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");







function combineLatest() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var resultSelector = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popResultSelector)(args);
    return resultSelector
        ? (0,_util_pipe__WEBPACK_IMPORTED_MODULE_1__.pipe)(combineLatest.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__read)(args))), (0,_util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_3__.mapOneOrManyArgs)(resultSelector))
        : (0,_util_lift__WEBPACK_IMPORTED_MODULE_4__.operate)(function (source, subscriber) {
            (0,_observable_combineLatest__WEBPACK_IMPORTED_MODULE_5__.combineLatestInit)((0,tslib__WEBPACK_IMPORTED_MODULE_2__.__spreadArray)([source], (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__read)((0,_util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_6__.argsOrArgArray)(args))))(subscriber);
        });
}
//# sourceMappingURL=combineLatest.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/combineLatestAll.js":
/*!****************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/combineLatestAll.js ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "combineLatestAll": () => (/* binding */ combineLatestAll)
/* harmony export */ });
/* harmony import */ var _observable_combineLatest__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/combineLatest */ "./node_modules/rxjs/dist/esm5/internal/observable/combineLatest.js");
/* harmony import */ var _joinAllInternals__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./joinAllInternals */ "./node_modules/rxjs/dist/esm5/internal/operators/joinAllInternals.js");


function combineLatestAll(project) {
    return (0,_joinAllInternals__WEBPACK_IMPORTED_MODULE_0__.joinAllInternals)(_observable_combineLatest__WEBPACK_IMPORTED_MODULE_1__.combineLatest, project);
}
//# sourceMappingURL=combineLatestAll.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/combineLatestWith.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/combineLatestWith.js ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "combineLatestWith": () => (/* binding */ combineLatestWith)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _combineLatest__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./combineLatest */ "./node_modules/rxjs/dist/esm5/internal/operators/combineLatest.js");


function combineLatestWith() {
    var otherSources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        otherSources[_i] = arguments[_i];
    }
    return _combineLatest__WEBPACK_IMPORTED_MODULE_0__.combineLatest.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__read)(otherSources)));
}
//# sourceMappingURL=combineLatestWith.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/concat.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/concat.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "concat": () => (/* binding */ concat)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _concatAll__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./concatAll */ "./node_modules/rxjs/dist/esm5/internal/operators/concatAll.js");
/* harmony import */ var _observable_fromArray__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../observable/fromArray */ "./node_modules/rxjs/dist/esm5/internal/observable/fromArray.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");





function concat() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var scheduler = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popScheduler)(args);
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
        (0,_concatAll__WEBPACK_IMPORTED_MODULE_2__.concatAll)()((0,_observable_fromArray__WEBPACK_IMPORTED_MODULE_3__.internalFromArray)((0,tslib__WEBPACK_IMPORTED_MODULE_4__.__spreadArray)([source], (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__read)(args)), scheduler)).subscribe(subscriber);
    });
}
//# sourceMappingURL=concat.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/concatAll.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/concatAll.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "concatAll": () => (/* binding */ concatAll)
/* harmony export */ });
/* harmony import */ var _mergeAll__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./mergeAll */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeAll.js");

function concatAll() {
    return (0,_mergeAll__WEBPACK_IMPORTED_MODULE_0__.mergeAll)(1);
}
//# sourceMappingURL=concatAll.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/concatMap.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/concatMap.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "concatMap": () => (/* binding */ concatMap)
/* harmony export */ });
/* harmony import */ var _mergeMap__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./mergeMap */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");


function concatMap(project, resultSelector) {
    return (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(resultSelector) ? (0,_mergeMap__WEBPACK_IMPORTED_MODULE_1__.mergeMap)(project, resultSelector, 1) : (0,_mergeMap__WEBPACK_IMPORTED_MODULE_1__.mergeMap)(project, 1);
}
//# sourceMappingURL=concatMap.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/concatMapTo.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/concatMapTo.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "concatMapTo": () => (/* binding */ concatMapTo)
/* harmony export */ });
/* harmony import */ var _concatMap__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./concatMap */ "./node_modules/rxjs/dist/esm5/internal/operators/concatMap.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");


function concatMapTo(innerObservable, resultSelector) {
    return (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(resultSelector) ? (0,_concatMap__WEBPACK_IMPORTED_MODULE_1__.concatMap)(function () { return innerObservable; }, resultSelector) : (0,_concatMap__WEBPACK_IMPORTED_MODULE_1__.concatMap)(function () { return innerObservable; });
}
//# sourceMappingURL=concatMapTo.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/concatWith.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/concatWith.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "concatWith": () => (/* binding */ concatWith)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _concat__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./concat */ "./node_modules/rxjs/dist/esm5/internal/operators/concat.js");


function concatWith() {
    var otherSources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        otherSources[_i] = arguments[_i];
    }
    return _concat__WEBPACK_IMPORTED_MODULE_0__.concat.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__read)(otherSources)));
}
//# sourceMappingURL=concatWith.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/connect.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/connect.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "connect": () => (/* binding */ connect)
/* harmony export */ });
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _observable_fromSubscribable__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../observable/fromSubscribable */ "./node_modules/rxjs/dist/esm5/internal/observable/fromSubscribable.js");




var DEFAULT_CONFIG = {
    connector: function () { return new _Subject__WEBPACK_IMPORTED_MODULE_0__.Subject(); },
};
function connect(selector, config) {
    if (config === void 0) { config = DEFAULT_CONFIG; }
    var connector = config.connector;
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
        var subject = connector();
        (0,_observable_from__WEBPACK_IMPORTED_MODULE_2__.from)(selector((0,_observable_fromSubscribable__WEBPACK_IMPORTED_MODULE_3__.fromSubscribable)(subject))).subscribe(subscriber);
        subscriber.add(source.subscribe(subject));
    });
}
//# sourceMappingURL=connect.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/count.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/count.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "count": () => (/* binding */ count)
/* harmony export */ });
/* harmony import */ var _reduce__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./reduce */ "./node_modules/rxjs/dist/esm5/internal/operators/reduce.js");

function count(predicate) {
    return (0,_reduce__WEBPACK_IMPORTED_MODULE_0__.reduce)(function (total, value, i) { return (!predicate || predicate(value, i) ? total + 1 : total); }, 0);
}
//# sourceMappingURL=count.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/debounce.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/debounce.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "debounce": () => (/* binding */ debounce)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");




function debounce(durationSelector) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var hasValue = false;
        var lastValue = null;
        var durationSubscriber = null;
        var emit = function () {
            durationSubscriber === null || durationSubscriber === void 0 ? void 0 : durationSubscriber.unsubscribe();
            durationSubscriber = null;
            if (hasValue) {
                hasValue = false;
                var value = lastValue;
                lastValue = null;
                subscriber.next(value);
            }
        };
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            durationSubscriber === null || durationSubscriber === void 0 ? void 0 : durationSubscriber.unsubscribe();
            hasValue = true;
            lastValue = value;
            durationSubscriber = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, emit, _util_noop__WEBPACK_IMPORTED_MODULE_2__.noop);
            (0,_observable_from__WEBPACK_IMPORTED_MODULE_3__.innerFrom)(durationSelector(value)).subscribe(durationSubscriber);
        }, function () {
            emit();
            subscriber.complete();
        }, undefined, function () {
            lastValue = durationSubscriber = null;
        }));
    });
}
//# sourceMappingURL=debounce.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/debounceTime.js":
/*!************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/debounceTime.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "debounceTime": () => (/* binding */ debounceTime)
/* harmony export */ });
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function debounceTime(dueTime, scheduler) {
    if (scheduler === void 0) { scheduler = _scheduler_async__WEBPACK_IMPORTED_MODULE_0__.asyncScheduler; }
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
        var activeTask = null;
        var lastValue = null;
        var lastTime = null;
        var emit = function () {
            if (activeTask) {
                activeTask.unsubscribe();
                activeTask = null;
                var value = lastValue;
                lastValue = null;
                subscriber.next(value);
            }
        };
        function emitWhenIdle() {
            var targetTime = lastTime + dueTime;
            var now = scheduler.now();
            if (now < targetTime) {
                activeTask = this.schedule(undefined, targetTime - now);
                return;
            }
            emit();
        }
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) {
            lastValue = value;
            lastTime = scheduler.now();
            if (!activeTask) {
                activeTask = scheduler.schedule(emitWhenIdle, dueTime);
            }
        }, function () {
            emit();
            subscriber.complete();
        }, undefined, function () {
            lastValue = activeTask = null;
        }));
    });
}
//# sourceMappingURL=debounceTime.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/defaultIfEmpty.js":
/*!**************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/defaultIfEmpty.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "defaultIfEmpty": () => (/* binding */ defaultIfEmpty)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function defaultIfEmpty(defaultValue) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var hasValue = false;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            hasValue = true;
            subscriber.next(value);
        }, function () {
            if (!hasValue) {
                subscriber.next(defaultValue);
            }
            subscriber.complete();
        }));
    });
}
//# sourceMappingURL=defaultIfEmpty.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/delay.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/delay.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "delay": () => (/* binding */ delay)
/* harmony export */ });
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _delayWhen__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./delayWhen */ "./node_modules/rxjs/dist/esm5/internal/operators/delayWhen.js");
/* harmony import */ var _observable_timer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/timer */ "./node_modules/rxjs/dist/esm5/internal/observable/timer.js");



function delay(due, scheduler) {
    if (scheduler === void 0) { scheduler = _scheduler_async__WEBPACK_IMPORTED_MODULE_0__.asyncScheduler; }
    var duration = (0,_observable_timer__WEBPACK_IMPORTED_MODULE_1__.timer)(due, scheduler);
    return (0,_delayWhen__WEBPACK_IMPORTED_MODULE_2__.delayWhen)(function () { return duration; });
}
//# sourceMappingURL=delay.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/delayWhen.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/delayWhen.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "delayWhen": () => (/* binding */ delayWhen)
/* harmony export */ });
/* harmony import */ var _observable_concat__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../observable/concat */ "./node_modules/rxjs/dist/esm5/internal/observable/concat.js");
/* harmony import */ var _take__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./take */ "./node_modules/rxjs/dist/esm5/internal/operators/take.js");
/* harmony import */ var _ignoreElements__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./ignoreElements */ "./node_modules/rxjs/dist/esm5/internal/operators/ignoreElements.js");
/* harmony import */ var _mapTo__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./mapTo */ "./node_modules/rxjs/dist/esm5/internal/operators/mapTo.js");
/* harmony import */ var _mergeMap__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./mergeMap */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js");





function delayWhen(delayDurationSelector, subscriptionDelay) {
    if (subscriptionDelay) {
        return function (source) {
            return (0,_observable_concat__WEBPACK_IMPORTED_MODULE_0__.concat)(subscriptionDelay.pipe((0,_take__WEBPACK_IMPORTED_MODULE_1__.take)(1), (0,_ignoreElements__WEBPACK_IMPORTED_MODULE_2__.ignoreElements)()), source.pipe(delayWhen(delayDurationSelector)));
        };
    }
    return (0,_mergeMap__WEBPACK_IMPORTED_MODULE_3__.mergeMap)(function (value, index) { return delayDurationSelector(value, index).pipe((0,_take__WEBPACK_IMPORTED_MODULE_1__.take)(1), (0,_mapTo__WEBPACK_IMPORTED_MODULE_4__.mapTo)(value)); });
}
//# sourceMappingURL=delayWhen.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/dematerialize.js":
/*!*************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/dematerialize.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "dematerialize": () => (/* binding */ dematerialize)
/* harmony export */ });
/* harmony import */ var _Notification__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Notification */ "./node_modules/rxjs/dist/esm5/internal/Notification.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function dematerialize() {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (notification) { return (0,_Notification__WEBPACK_IMPORTED_MODULE_2__.observeNotification)(notification, subscriber); }));
    });
}
//# sourceMappingURL=dematerialize.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/distinct.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/distinct.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "distinct": () => (/* binding */ distinct)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");



function distinct(keySelector, flushes) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var distinctKeys = new Set();
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            var key = keySelector ? keySelector(value) : value;
            if (!distinctKeys.has(key)) {
                distinctKeys.add(key);
                subscriber.next(value);
            }
        }));
        flushes === null || flushes === void 0 ? void 0 : flushes.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function () { return distinctKeys.clear(); }, _util_noop__WEBPACK_IMPORTED_MODULE_2__.noop));
    });
}
//# sourceMappingURL=distinct.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/distinctUntilChanged.js":
/*!********************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/distinctUntilChanged.js ***!
  \********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "distinctUntilChanged": () => (/* binding */ distinctUntilChanged)
/* harmony export */ });
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function distinctUntilChanged(comparator, keySelector) {
    if (keySelector === void 0) { keySelector = _util_identity__WEBPACK_IMPORTED_MODULE_0__.identity; }
    comparator = comparator !== null && comparator !== void 0 ? comparator : defaultCompare;
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
        var previousKey;
        var first = true;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) {
            var currentKey = keySelector(value);
            if (first || !comparator(previousKey, currentKey)) {
                first = false;
                previousKey = currentKey;
                subscriber.next(value);
            }
        }));
    });
}
function defaultCompare(a, b) {
    return a === b;
}
//# sourceMappingURL=distinctUntilChanged.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/distinctUntilKeyChanged.js":
/*!***********************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/distinctUntilKeyChanged.js ***!
  \***********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "distinctUntilKeyChanged": () => (/* binding */ distinctUntilKeyChanged)
/* harmony export */ });
/* harmony import */ var _distinctUntilChanged__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./distinctUntilChanged */ "./node_modules/rxjs/dist/esm5/internal/operators/distinctUntilChanged.js");

function distinctUntilKeyChanged(key, compare) {
    return (0,_distinctUntilChanged__WEBPACK_IMPORTED_MODULE_0__.distinctUntilChanged)(function (x, y) { return compare ? compare(x[key], y[key]) : x[key] === y[key]; });
}
//# sourceMappingURL=distinctUntilKeyChanged.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/elementAt.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/elementAt.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "elementAt": () => (/* binding */ elementAt)
/* harmony export */ });
/* harmony import */ var _util_ArgumentOutOfRangeError__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/ArgumentOutOfRangeError */ "./node_modules/rxjs/dist/esm5/internal/util/ArgumentOutOfRangeError.js");
/* harmony import */ var _filter__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./filter */ "./node_modules/rxjs/dist/esm5/internal/operators/filter.js");
/* harmony import */ var _throwIfEmpty__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./throwIfEmpty */ "./node_modules/rxjs/dist/esm5/internal/operators/throwIfEmpty.js");
/* harmony import */ var _defaultIfEmpty__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./defaultIfEmpty */ "./node_modules/rxjs/dist/esm5/internal/operators/defaultIfEmpty.js");
/* harmony import */ var _take__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./take */ "./node_modules/rxjs/dist/esm5/internal/operators/take.js");





function elementAt(index, defaultValue) {
    if (index < 0) {
        throw new _util_ArgumentOutOfRangeError__WEBPACK_IMPORTED_MODULE_0__.ArgumentOutOfRangeError();
    }
    var hasDefaultValue = arguments.length >= 2;
    return function (source) {
        return source.pipe((0,_filter__WEBPACK_IMPORTED_MODULE_1__.filter)(function (v, i) { return i === index; }), (0,_take__WEBPACK_IMPORTED_MODULE_2__.take)(1), hasDefaultValue ? (0,_defaultIfEmpty__WEBPACK_IMPORTED_MODULE_3__.defaultIfEmpty)(defaultValue) : (0,_throwIfEmpty__WEBPACK_IMPORTED_MODULE_4__.throwIfEmpty)(function () { return new _util_ArgumentOutOfRangeError__WEBPACK_IMPORTED_MODULE_0__.ArgumentOutOfRangeError(); }));
    };
}
//# sourceMappingURL=elementAt.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/endWith.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/endWith.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "endWith": () => (/* binding */ endWith)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _observable_concat__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../observable/concat */ "./node_modules/rxjs/dist/esm5/internal/observable/concat.js");
/* harmony import */ var _observable_of__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/of */ "./node_modules/rxjs/dist/esm5/internal/observable/of.js");



function endWith() {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i] = arguments[_i];
    }
    return function (source) { return (0,_observable_concat__WEBPACK_IMPORTED_MODULE_0__.concat)(source, _observable_of__WEBPACK_IMPORTED_MODULE_1__.of.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__read)(values)))); };
}
//# sourceMappingURL=endWith.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/every.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/every.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "every": () => (/* binding */ every)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function every(predicate, thisArg) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var index = 0;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            if (!predicate.call(thisArg, value, index++, source)) {
                subscriber.next(false);
                subscriber.complete();
            }
        }, function () {
            subscriber.next(true);
            subscriber.complete();
        }));
    });
}
//# sourceMappingURL=every.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/exhaust.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/exhaust.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "exhaust": () => (/* binding */ exhaust)
/* harmony export */ });
/* harmony import */ var _exhaustAll__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./exhaustAll */ "./node_modules/rxjs/dist/esm5/internal/operators/exhaustAll.js");

var exhaust = _exhaustAll__WEBPACK_IMPORTED_MODULE_0__.exhaustAll;
//# sourceMappingURL=exhaust.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/exhaustAll.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/exhaustAll.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "exhaustAll": () => (/* binding */ exhaustAll)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function exhaustAll() {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var isComplete = false;
        var innerSub = null;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (inner) {
            if (!innerSub) {
                innerSub = (0,_observable_from__WEBPACK_IMPORTED_MODULE_2__.innerFrom)(inner).subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, undefined, function () {
                    innerSub = null;
                    isComplete && subscriber.complete();
                }));
            }
        }, function () {
            isComplete = true;
            !innerSub && subscriber.complete();
        }));
    });
}
//# sourceMappingURL=exhaustAll.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/exhaustMap.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/exhaustMap.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "exhaustMap": () => (/* binding */ exhaustMap)
/* harmony export */ });
/* harmony import */ var _map__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./map */ "./node_modules/rxjs/dist/esm5/internal/operators/map.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");




function exhaustMap(project, resultSelector) {
    if (resultSelector) {
        return function (source) {
            return source.pipe(exhaustMap(function (a, i) { return (0,_observable_from__WEBPACK_IMPORTED_MODULE_0__.innerFrom)(project(a, i)).pipe((0,_map__WEBPACK_IMPORTED_MODULE_1__.map)(function (b, ii) { return resultSelector(a, b, i, ii); })); }));
        };
    }
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_2__.operate)(function (source, subscriber) {
        var index = 0;
        var innerSub = null;
        var isComplete = false;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__.OperatorSubscriber(subscriber, function (outerValue) {
            if (!innerSub) {
                innerSub = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__.OperatorSubscriber(subscriber, undefined, function () {
                    innerSub = null;
                    isComplete && subscriber.complete();
                });
                (0,_observable_from__WEBPACK_IMPORTED_MODULE_0__.innerFrom)(project(outerValue, index++)).subscribe(innerSub);
            }
        }, function () {
            isComplete = true;
            !innerSub && subscriber.complete();
        }));
    });
}
//# sourceMappingURL=exhaustMap.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/expand.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/expand.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "expand": () => (/* binding */ expand)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _mergeInternals__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./mergeInternals */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeInternals.js");


function expand(project, concurrent, scheduler) {
    if (concurrent === void 0) { concurrent = Infinity; }
    concurrent = (concurrent || 0) < 1 ? Infinity : concurrent;
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        return (0,_mergeInternals__WEBPACK_IMPORTED_MODULE_1__.mergeInternals)(source, subscriber, project, concurrent, undefined, true, scheduler);
    });
}
//# sourceMappingURL=expand.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/filter.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/filter.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "filter": () => (/* binding */ filter)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function filter(predicate, thisArg) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var index = 0;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) { return predicate.call(thisArg, value, index++) && subscriber.next(value); }));
    });
}
//# sourceMappingURL=filter.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/finalize.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/finalize.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "finalize": () => (/* binding */ finalize)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");

function finalize(callback) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        try {
            source.subscribe(subscriber);
        }
        finally {
            subscriber.add(callback);
        }
    });
}
//# sourceMappingURL=finalize.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/find.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/find.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "find": () => (/* binding */ find),
/* harmony export */   "createFind": () => (/* binding */ createFind)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function find(predicate, thisArg) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(createFind(predicate, thisArg, 'value'));
}
function createFind(predicate, thisArg, emit) {
    var findIndex = emit === 'index';
    return function (source, subscriber) {
        var index = 0;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            var i = index++;
            if (predicate.call(thisArg, value, i, source)) {
                subscriber.next(findIndex ? i : value);
                subscriber.complete();
            }
        }, function () {
            subscriber.next(findIndex ? -1 : undefined);
            subscriber.complete();
        }));
    };
}
//# sourceMappingURL=find.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/findIndex.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/findIndex.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "findIndex": () => (/* binding */ findIndex)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _find__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./find */ "./node_modules/rxjs/dist/esm5/internal/operators/find.js");


function findIndex(predicate, thisArg) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)((0,_find__WEBPACK_IMPORTED_MODULE_1__.createFind)(predicate, thisArg, 'index'));
}
//# sourceMappingURL=findIndex.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/first.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/first.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "first": () => (/* binding */ first)
/* harmony export */ });
/* harmony import */ var _util_EmptyError__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/EmptyError */ "./node_modules/rxjs/dist/esm5/internal/util/EmptyError.js");
/* harmony import */ var _filter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./filter */ "./node_modules/rxjs/dist/esm5/internal/operators/filter.js");
/* harmony import */ var _take__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./take */ "./node_modules/rxjs/dist/esm5/internal/operators/take.js");
/* harmony import */ var _defaultIfEmpty__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./defaultIfEmpty */ "./node_modules/rxjs/dist/esm5/internal/operators/defaultIfEmpty.js");
/* harmony import */ var _throwIfEmpty__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./throwIfEmpty */ "./node_modules/rxjs/dist/esm5/internal/operators/throwIfEmpty.js");
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");






function first(predicate, defaultValue) {
    var hasDefaultValue = arguments.length >= 2;
    return function (source) {
        return source.pipe(predicate ? (0,_filter__WEBPACK_IMPORTED_MODULE_0__.filter)(function (v, i) { return predicate(v, i, source); }) : _util_identity__WEBPACK_IMPORTED_MODULE_1__.identity, (0,_take__WEBPACK_IMPORTED_MODULE_2__.take)(1), hasDefaultValue ? (0,_defaultIfEmpty__WEBPACK_IMPORTED_MODULE_3__.defaultIfEmpty)(defaultValue) : (0,_throwIfEmpty__WEBPACK_IMPORTED_MODULE_4__.throwIfEmpty)(function () { return new _util_EmptyError__WEBPACK_IMPORTED_MODULE_5__.EmptyError(); }));
    };
}
//# sourceMappingURL=first.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/flatMap.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/flatMap.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "flatMap": () => (/* binding */ flatMap)
/* harmony export */ });
/* harmony import */ var _mergeMap__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./mergeMap */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js");

var flatMap = _mergeMap__WEBPACK_IMPORTED_MODULE_0__.mergeMap;
//# sourceMappingURL=flatMap.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/groupBy.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/groupBy.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "groupBy": () => (/* binding */ groupBy)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");






function groupBy(keySelector, elementOrOptions, duration, connector) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var element;
        if (!elementOrOptions || typeof elementOrOptions === 'function') {
            element = elementOrOptions;
        }
        else {
            (duration = elementOrOptions.duration, element = elementOrOptions.element, connector = elementOrOptions.connector);
        }
        var groups = new Map();
        var notify = function (cb) {
            groups.forEach(cb);
            cb(subscriber);
        };
        var handleError = function (err) { return notify(function (consumer) { return consumer.error(err); }); };
        var groupBySourceSubscriber = new GroupBySubscriber(subscriber, function (value) {
            try {
                var key_1 = keySelector(value);
                var group_1 = groups.get(key_1);
                if (!group_1) {
                    groups.set(key_1, (group_1 = connector ? connector() : new _Subject__WEBPACK_IMPORTED_MODULE_1__.Subject()));
                    var grouped = createGroupedObservable(key_1, group_1);
                    subscriber.next(grouped);
                    if (duration) {
                        var durationSubscriber_1 = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(group_1, function () {
                            group_1.complete();
                            durationSubscriber_1 === null || durationSubscriber_1 === void 0 ? void 0 : durationSubscriber_1.unsubscribe();
                        }, undefined, undefined, function () { return groups.delete(key_1); });
                        groupBySourceSubscriber.add((0,_observable_from__WEBPACK_IMPORTED_MODULE_3__.innerFrom)(duration(grouped)).subscribe(durationSubscriber_1));
                    }
                }
                group_1.next(element ? element(value) : value);
            }
            catch (err) {
                handleError(err);
            }
        }, function () { return notify(function (consumer) { return consumer.complete(); }); }, handleError, function () { return groups.clear(); });
        source.subscribe(groupBySourceSubscriber);
        function createGroupedObservable(key, groupSubject) {
            var result = new _Observable__WEBPACK_IMPORTED_MODULE_4__.Observable(function (groupSubscriber) {
                groupBySourceSubscriber.activeGroups++;
                var innerSub = groupSubject.subscribe(groupSubscriber);
                return function () {
                    innerSub.unsubscribe();
                    --groupBySourceSubscriber.activeGroups === 0 &&
                        groupBySourceSubscriber.teardownAttempted &&
                        groupBySourceSubscriber.unsubscribe();
                };
            });
            result.key = key;
            return result;
        }
    });
}
var GroupBySubscriber = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__extends)(GroupBySubscriber, _super);
    function GroupBySubscriber() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.activeGroups = 0;
        _this.teardownAttempted = false;
        return _this;
    }
    GroupBySubscriber.prototype.unsubscribe = function () {
        this.teardownAttempted = true;
        this.activeGroups === 0 && _super.prototype.unsubscribe.call(this);
    };
    return GroupBySubscriber;
}(_OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber));
//# sourceMappingURL=groupBy.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/ignoreElements.js":
/*!**************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/ignoreElements.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ignoreElements": () => (/* binding */ ignoreElements)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");



function ignoreElements() {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, _util_noop__WEBPACK_IMPORTED_MODULE_2__.noop));
    });
}
//# sourceMappingURL=ignoreElements.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/isEmpty.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/isEmpty.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isEmpty": () => (/* binding */ isEmpty)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function isEmpty() {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function () {
            subscriber.next(false);
            subscriber.complete();
        }, function () {
            subscriber.next(true);
            subscriber.complete();
        }));
    });
}
//# sourceMappingURL=isEmpty.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/joinAllInternals.js":
/*!****************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/joinAllInternals.js ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "joinAllInternals": () => (/* binding */ joinAllInternals)
/* harmony export */ });
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");
/* harmony import */ var _util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/mapOneOrManyArgs */ "./node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js");
/* harmony import */ var _util_pipe__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/pipe */ "./node_modules/rxjs/dist/esm5/internal/util/pipe.js");
/* harmony import */ var _mergeMap__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./mergeMap */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js");
/* harmony import */ var _toArray__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./toArray */ "./node_modules/rxjs/dist/esm5/internal/operators/toArray.js");





function joinAllInternals(joinFn, project) {
    return (0,_util_pipe__WEBPACK_IMPORTED_MODULE_0__.pipe)((0,_toArray__WEBPACK_IMPORTED_MODULE_1__.toArray)(), (0,_mergeMap__WEBPACK_IMPORTED_MODULE_2__.mergeMap)(function (sources) { return joinFn(sources); }), project ? (0,_util_mapOneOrManyArgs__WEBPACK_IMPORTED_MODULE_3__.mapOneOrManyArgs)(project) : _util_identity__WEBPACK_IMPORTED_MODULE_4__.identity);
}
//# sourceMappingURL=joinAllInternals.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/last.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/last.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "last": () => (/* binding */ last)
/* harmony export */ });
/* harmony import */ var _util_EmptyError__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/EmptyError */ "./node_modules/rxjs/dist/esm5/internal/util/EmptyError.js");
/* harmony import */ var _filter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./filter */ "./node_modules/rxjs/dist/esm5/internal/operators/filter.js");
/* harmony import */ var _takeLast__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./takeLast */ "./node_modules/rxjs/dist/esm5/internal/operators/takeLast.js");
/* harmony import */ var _throwIfEmpty__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./throwIfEmpty */ "./node_modules/rxjs/dist/esm5/internal/operators/throwIfEmpty.js");
/* harmony import */ var _defaultIfEmpty__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./defaultIfEmpty */ "./node_modules/rxjs/dist/esm5/internal/operators/defaultIfEmpty.js");
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");






function last(predicate, defaultValue) {
    var hasDefaultValue = arguments.length >= 2;
    return function (source) {
        return source.pipe(predicate ? (0,_filter__WEBPACK_IMPORTED_MODULE_0__.filter)(function (v, i) { return predicate(v, i, source); }) : _util_identity__WEBPACK_IMPORTED_MODULE_1__.identity, (0,_takeLast__WEBPACK_IMPORTED_MODULE_2__.takeLast)(1), hasDefaultValue ? (0,_defaultIfEmpty__WEBPACK_IMPORTED_MODULE_3__.defaultIfEmpty)(defaultValue) : (0,_throwIfEmpty__WEBPACK_IMPORTED_MODULE_4__.throwIfEmpty)(function () { return new _util_EmptyError__WEBPACK_IMPORTED_MODULE_5__.EmptyError(); }));
    };
}
//# sourceMappingURL=last.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/map.js":
/*!***************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/map.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "map": () => (/* binding */ map)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function map(project, thisArg) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var index = 0;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            subscriber.next(project.call(thisArg, value, index++));
        }));
    });
}
//# sourceMappingURL=map.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/mapTo.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/mapTo.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "mapTo": () => (/* binding */ mapTo)
/* harmony export */ });
/* harmony import */ var _map__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./map */ "./node_modules/rxjs/dist/esm5/internal/operators/map.js");

function mapTo(value) {
    return (0,_map__WEBPACK_IMPORTED_MODULE_0__.map)(function () { return value; });
}
//# sourceMappingURL=mapTo.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/materialize.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/materialize.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "materialize": () => (/* binding */ materialize)
/* harmony export */ });
/* harmony import */ var _Notification__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Notification */ "./node_modules/rxjs/dist/esm5/internal/Notification.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function materialize() {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            subscriber.next(_Notification__WEBPACK_IMPORTED_MODULE_2__.Notification.createNext(value));
        }, function () {
            subscriber.next(_Notification__WEBPACK_IMPORTED_MODULE_2__.Notification.createComplete());
            subscriber.complete();
        }, function (err) {
            subscriber.next(_Notification__WEBPACK_IMPORTED_MODULE_2__.Notification.createError(err));
            subscriber.complete();
        }));
    });
}
//# sourceMappingURL=materialize.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/max.js":
/*!***************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/max.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "max": () => (/* binding */ max)
/* harmony export */ });
/* harmony import */ var _reduce__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./reduce */ "./node_modules/rxjs/dist/esm5/internal/operators/reduce.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");


function max(comparer) {
    return (0,_reduce__WEBPACK_IMPORTED_MODULE_0__.reduce)((0,_util_isFunction__WEBPACK_IMPORTED_MODULE_1__.isFunction)(comparer) ? function (x, y) { return (comparer(x, y) > 0 ? x : y); } : function (x, y) { return (x > y ? x : y); });
}
//# sourceMappingURL=max.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/merge.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/merge.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "merge": () => (/* binding */ merge)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/argsOrArgArray */ "./node_modules/rxjs/dist/esm5/internal/util/argsOrArgArray.js");
/* harmony import */ var _observable_fromArray__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../observable/fromArray */ "./node_modules/rxjs/dist/esm5/internal/observable/fromArray.js");
/* harmony import */ var _mergeAll__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./mergeAll */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeAll.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");






function merge() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var scheduler = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popScheduler)(args);
    var concurrent = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popNumber)(args, Infinity);
    args = (0,_util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_1__.argsOrArgArray)(args);
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_2__.operate)(function (source, subscriber) {
        (0,_mergeAll__WEBPACK_IMPORTED_MODULE_3__.mergeAll)(concurrent)((0,_observable_fromArray__WEBPACK_IMPORTED_MODULE_4__.internalFromArray)((0,tslib__WEBPACK_IMPORTED_MODULE_5__.__spreadArray)([source], (0,tslib__WEBPACK_IMPORTED_MODULE_5__.__read)(args)), scheduler)).subscribe(subscriber);
    });
}
//# sourceMappingURL=merge.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/mergeAll.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/mergeAll.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "mergeAll": () => (/* binding */ mergeAll)
/* harmony export */ });
/* harmony import */ var _mergeMap__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./mergeMap */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js");
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");


function mergeAll(concurrent) {
    if (concurrent === void 0) { concurrent = Infinity; }
    return (0,_mergeMap__WEBPACK_IMPORTED_MODULE_0__.mergeMap)(_util_identity__WEBPACK_IMPORTED_MODULE_1__.identity, concurrent);
}
//# sourceMappingURL=mergeAll.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/mergeInternals.js":
/*!**************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/mergeInternals.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "mergeInternals": () => (/* binding */ mergeInternals)
/* harmony export */ });
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function mergeInternals(source, subscriber, project, concurrent, onBeforeNext, expand, innerSubScheduler, additionalTeardown) {
    var buffer = [];
    var active = 0;
    var index = 0;
    var isComplete = false;
    var checkComplete = function () {
        if (isComplete && !buffer.length && !active) {
            subscriber.complete();
        }
    };
    var outerNext = function (value) { return (active < concurrent ? doInnerSub(value) : buffer.push(value)); };
    var doInnerSub = function (value) {
        expand && subscriber.next(value);
        active++;
        var innerComplete = false;
        (0,_observable_from__WEBPACK_IMPORTED_MODULE_0__.innerFrom)(project(value, index++)).subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (innerValue) {
            onBeforeNext === null || onBeforeNext === void 0 ? void 0 : onBeforeNext(innerValue);
            if (expand) {
                outerNext(innerValue);
            }
            else {
                subscriber.next(innerValue);
            }
        }, function () {
            innerComplete = true;
        }, undefined, function () {
            if (innerComplete) {
                try {
                    active--;
                    var _loop_1 = function () {
                        var bufferedValue = buffer.shift();
                        innerSubScheduler ? subscriber.add(innerSubScheduler.schedule(function () { return doInnerSub(bufferedValue); })) : doInnerSub(bufferedValue);
                    };
                    while (buffer.length && active < concurrent) {
                        _loop_1();
                    }
                    checkComplete();
                }
                catch (err) {
                    subscriber.error(err);
                }
            }
        }));
    };
    source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, outerNext, function () {
        isComplete = true;
        checkComplete();
    }));
    return function () {
        additionalTeardown === null || additionalTeardown === void 0 ? void 0 : additionalTeardown();
    };
}
//# sourceMappingURL=mergeInternals.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "mergeMap": () => (/* binding */ mergeMap)
/* harmony export */ });
/* harmony import */ var _map__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./map */ "./node_modules/rxjs/dist/esm5/internal/operators/map.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _mergeInternals__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./mergeInternals */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeInternals.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");





function mergeMap(project, resultSelector, concurrent) {
    if (concurrent === void 0) { concurrent = Infinity; }
    if ((0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(resultSelector)) {
        return mergeMap(function (a, i) { return (0,_map__WEBPACK_IMPORTED_MODULE_1__.map)(function (b, ii) { return resultSelector(a, b, i, ii); })((0,_observable_from__WEBPACK_IMPORTED_MODULE_2__.innerFrom)(project(a, i))); }, concurrent);
    }
    else if (typeof resultSelector === 'number') {
        concurrent = resultSelector;
    }
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_3__.operate)(function (source, subscriber) { return (0,_mergeInternals__WEBPACK_IMPORTED_MODULE_4__.mergeInternals)(source, subscriber, project, concurrent); });
}
//# sourceMappingURL=mergeMap.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/mergeMapTo.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/mergeMapTo.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "mergeMapTo": () => (/* binding */ mergeMapTo)
/* harmony export */ });
/* harmony import */ var _mergeMap__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./mergeMap */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");


function mergeMapTo(innerObservable, resultSelector, concurrent) {
    if (concurrent === void 0) { concurrent = Infinity; }
    if ((0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(resultSelector)) {
        return (0,_mergeMap__WEBPACK_IMPORTED_MODULE_1__.mergeMap)(function () { return innerObservable; }, resultSelector, concurrent);
    }
    if (typeof resultSelector === 'number') {
        concurrent = resultSelector;
    }
    return (0,_mergeMap__WEBPACK_IMPORTED_MODULE_1__.mergeMap)(function () { return innerObservable; }, concurrent);
}
//# sourceMappingURL=mergeMapTo.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/mergeScan.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/mergeScan.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "mergeScan": () => (/* binding */ mergeScan)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _mergeInternals__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./mergeInternals */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeInternals.js");


function mergeScan(accumulator, seed, concurrent) {
    if (concurrent === void 0) { concurrent = Infinity; }
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var state = seed;
        return (0,_mergeInternals__WEBPACK_IMPORTED_MODULE_1__.mergeInternals)(source, subscriber, function (value, index) { return accumulator(state, value, index); }, concurrent, function (value) {
            state = value;
        }, false, undefined, function () { return (state = null); });
    });
}
//# sourceMappingURL=mergeScan.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/mergeWith.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/mergeWith.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "mergeWith": () => (/* binding */ mergeWith)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _merge__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./merge */ "./node_modules/rxjs/dist/esm5/internal/operators/merge.js");


function mergeWith() {
    var otherSources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        otherSources[_i] = arguments[_i];
    }
    return _merge__WEBPACK_IMPORTED_MODULE_0__.merge.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__read)(otherSources)));
}
//# sourceMappingURL=mergeWith.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/min.js":
/*!***************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/min.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "min": () => (/* binding */ min)
/* harmony export */ });
/* harmony import */ var _reduce__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./reduce */ "./node_modules/rxjs/dist/esm5/internal/operators/reduce.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");


function min(comparer) {
    return (0,_reduce__WEBPACK_IMPORTED_MODULE_0__.reduce)((0,_util_isFunction__WEBPACK_IMPORTED_MODULE_1__.isFunction)(comparer) ? function (x, y) { return (comparer(x, y) < 0 ? x : y); } : function (x, y) { return (x < y ? x : y); });
}
//# sourceMappingURL=min.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/multicast.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/multicast.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "multicast": () => (/* binding */ multicast)
/* harmony export */ });
/* harmony import */ var _observable_ConnectableObservable__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/ConnectableObservable */ "./node_modules/rxjs/dist/esm5/internal/observable/ConnectableObservable.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");
/* harmony import */ var _connect__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./connect */ "./node_modules/rxjs/dist/esm5/internal/operators/connect.js");



function multicast(subjectOrSubjectFactory, selector) {
    var subjectFactory = (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(subjectOrSubjectFactory) ? subjectOrSubjectFactory : function () { return subjectOrSubjectFactory; };
    if ((0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(selector)) {
        return (0,_connect__WEBPACK_IMPORTED_MODULE_1__.connect)(selector, {
            connector: subjectFactory,
        });
    }
    return function (source) { return new _observable_ConnectableObservable__WEBPACK_IMPORTED_MODULE_2__.ConnectableObservable(source, subjectFactory); };
}
//# sourceMappingURL=multicast.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/observeOn.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/observeOn.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "observeOn": () => (/* binding */ observeOn)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function observeOn(scheduler, delay) {
    if (delay === void 0) { delay = 0; }
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) { return subscriber.add(scheduler.schedule(function () { return subscriber.next(value); }, delay)); }, function () { return subscriber.add(scheduler.schedule(function () { return subscriber.complete(); }, delay)); }, function (err) { return subscriber.add(scheduler.schedule(function () { return subscriber.error(err); }, delay)); }));
    });
}
//# sourceMappingURL=observeOn.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/onErrorResumeNext.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/onErrorResumeNext.js ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "onErrorResumeNext": () => (/* binding */ onErrorResumeNext)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/argsOrArgArray */ "./node_modules/rxjs/dist/esm5/internal/util/argsOrArgArray.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");






function onErrorResumeNext() {
    var sources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        sources[_i] = arguments[_i];
    }
    var nextSources = (0,_util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_0__.argsOrArgArray)(sources);
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
        var remaining = (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__spreadArray)([source], (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__read)(nextSources));
        var subscribeNext = function () {
            if (!subscriber.closed) {
                if (remaining.length > 0) {
                    var nextSource = void 0;
                    try {
                        nextSource = (0,_observable_from__WEBPACK_IMPORTED_MODULE_3__.innerFrom)(remaining.shift());
                    }
                    catch (err) {
                        subscribeNext();
                        return;
                    }
                    var innerSub = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_4__.OperatorSubscriber(subscriber, undefined, _util_noop__WEBPACK_IMPORTED_MODULE_5__.noop, _util_noop__WEBPACK_IMPORTED_MODULE_5__.noop);
                    subscriber.add(nextSource.subscribe(innerSub));
                    innerSub.add(subscribeNext);
                }
                else {
                    subscriber.complete();
                }
            }
        };
        subscribeNext();
    });
}
//# sourceMappingURL=onErrorResumeNext.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/pairwise.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/pairwise.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "pairwise": () => (/* binding */ pairwise)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function pairwise() {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var prev;
        var hasPrev = false;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            var p = prev;
            prev = value;
            hasPrev && subscriber.next([p, value]);
            hasPrev = true;
        }));
    });
}
//# sourceMappingURL=pairwise.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/partition.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/partition.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "partition": () => (/* binding */ partition)
/* harmony export */ });
/* harmony import */ var _util_not__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/not */ "./node_modules/rxjs/dist/esm5/internal/util/not.js");
/* harmony import */ var _filter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./filter */ "./node_modules/rxjs/dist/esm5/internal/operators/filter.js");


function partition(predicate, thisArg) {
    return function (source) {
        return [(0,_filter__WEBPACK_IMPORTED_MODULE_0__.filter)(predicate, thisArg)(source), (0,_filter__WEBPACK_IMPORTED_MODULE_0__.filter)((0,_util_not__WEBPACK_IMPORTED_MODULE_1__.not)(predicate, thisArg))(source)];
    };
}
//# sourceMappingURL=partition.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/pluck.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/pluck.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "pluck": () => (/* binding */ pluck)
/* harmony export */ });
/* harmony import */ var _map__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./map */ "./node_modules/rxjs/dist/esm5/internal/operators/map.js");

function pluck() {
    var properties = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        properties[_i] = arguments[_i];
    }
    var length = properties.length;
    if (length === 0) {
        throw new Error('list of properties cannot be empty.');
    }
    return (0,_map__WEBPACK_IMPORTED_MODULE_0__.map)(function (x) {
        var currentProp = x;
        for (var i = 0; i < length; i++) {
            var p = currentProp === null || currentProp === void 0 ? void 0 : currentProp[properties[i]];
            if (typeof p !== 'undefined') {
                currentProp = p;
            }
            else {
                return undefined;
            }
        }
        return currentProp;
    });
}
//# sourceMappingURL=pluck.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/publish.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/publish.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "publish": () => (/* binding */ publish)
/* harmony export */ });
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _multicast__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./multicast */ "./node_modules/rxjs/dist/esm5/internal/operators/multicast.js");
/* harmony import */ var _connect__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./connect */ "./node_modules/rxjs/dist/esm5/internal/operators/connect.js");



function publish(selector) {
    return selector ? function (source) { return (0,_connect__WEBPACK_IMPORTED_MODULE_0__.connect)(selector)(source); } : function (source) { return (0,_multicast__WEBPACK_IMPORTED_MODULE_1__.multicast)(new _Subject__WEBPACK_IMPORTED_MODULE_2__.Subject())(source); };
}
//# sourceMappingURL=publish.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/publishBehavior.js":
/*!***************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/publishBehavior.js ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "publishBehavior": () => (/* binding */ publishBehavior)
/* harmony export */ });
/* harmony import */ var _BehaviorSubject__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../BehaviorSubject */ "./node_modules/rxjs/dist/esm5/internal/BehaviorSubject.js");
/* harmony import */ var _observable_ConnectableObservable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/ConnectableObservable */ "./node_modules/rxjs/dist/esm5/internal/observable/ConnectableObservable.js");


function publishBehavior(initialValue) {
    return function (source) {
        var subject = new _BehaviorSubject__WEBPACK_IMPORTED_MODULE_0__.BehaviorSubject(initialValue);
        return new _observable_ConnectableObservable__WEBPACK_IMPORTED_MODULE_1__.ConnectableObservable(source, function () { return subject; });
    };
}
//# sourceMappingURL=publishBehavior.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/publishLast.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/publishLast.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "publishLast": () => (/* binding */ publishLast)
/* harmony export */ });
/* harmony import */ var _AsyncSubject__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../AsyncSubject */ "./node_modules/rxjs/dist/esm5/internal/AsyncSubject.js");
/* harmony import */ var _observable_ConnectableObservable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/ConnectableObservable */ "./node_modules/rxjs/dist/esm5/internal/observable/ConnectableObservable.js");


function publishLast() {
    return function (source) {
        var subject = new _AsyncSubject__WEBPACK_IMPORTED_MODULE_0__.AsyncSubject();
        return new _observable_ConnectableObservable__WEBPACK_IMPORTED_MODULE_1__.ConnectableObservable(source, function () { return subject; });
    };
}
//# sourceMappingURL=publishLast.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/publishReplay.js":
/*!*************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/publishReplay.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "publishReplay": () => (/* binding */ publishReplay)
/* harmony export */ });
/* harmony import */ var _ReplaySubject__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../ReplaySubject */ "./node_modules/rxjs/dist/esm5/internal/ReplaySubject.js");
/* harmony import */ var _multicast__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./multicast */ "./node_modules/rxjs/dist/esm5/internal/operators/multicast.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");



function publishReplay(bufferSize, windowTime, selectorOrScheduler, timestampProvider) {
    if (selectorOrScheduler && !(0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(selectorOrScheduler)) {
        timestampProvider = selectorOrScheduler;
    }
    var selector = (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(selectorOrScheduler) ? selectorOrScheduler : undefined;
    return function (source) { return (0,_multicast__WEBPACK_IMPORTED_MODULE_1__.multicast)(new _ReplaySubject__WEBPACK_IMPORTED_MODULE_2__.ReplaySubject(bufferSize, windowTime, timestampProvider), selector)(source); };
}
//# sourceMappingURL=publishReplay.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/race.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/race.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "race": () => (/* binding */ race)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/argsOrArgArray */ "./node_modules/rxjs/dist/esm5/internal/util/argsOrArgArray.js");
/* harmony import */ var _raceWith__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./raceWith */ "./node_modules/rxjs/dist/esm5/internal/operators/raceWith.js");



function race() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return _raceWith__WEBPACK_IMPORTED_MODULE_0__.raceWith.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__read)((0,_util_argsOrArgArray__WEBPACK_IMPORTED_MODULE_2__.argsOrArgArray)(args))));
}
//# sourceMappingURL=race.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/raceWith.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/raceWith.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "raceWith": () => (/* binding */ raceWith)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _observable_race__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/race */ "./node_modules/rxjs/dist/esm5/internal/observable/race.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");




function raceWith() {
    var otherSources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        otherSources[_i] = arguments[_i];
    }
    return !otherSources.length
        ? _util_identity__WEBPACK_IMPORTED_MODULE_0__.identity
        : (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
            (0,_observable_race__WEBPACK_IMPORTED_MODULE_2__.raceInit)((0,tslib__WEBPACK_IMPORTED_MODULE_3__.__spreadArray)([source], (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__read)(otherSources)))(subscriber);
        });
}
//# sourceMappingURL=raceWith.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/reduce.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/reduce.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "reduce": () => (/* binding */ reduce)
/* harmony export */ });
/* harmony import */ var _scanInternals__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./scanInternals */ "./node_modules/rxjs/dist/esm5/internal/operators/scanInternals.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");


function reduce(accumulator, seed) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)((0,_scanInternals__WEBPACK_IMPORTED_MODULE_1__.scanInternals)(accumulator, seed, arguments.length >= 2, false, true));
}
//# sourceMappingURL=reduce.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/refCount.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/refCount.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "refCount": () => (/* binding */ refCount)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function refCount() {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var connection = null;
        source._refCount++;
        var refCounter = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, undefined, undefined, undefined, function () {
            if (!source || source._refCount <= 0 || 0 < --source._refCount) {
                connection = null;
                return;
            }
            var sharedConnection = source._connection;
            var conn = connection;
            connection = null;
            if (sharedConnection && (!conn || sharedConnection === conn)) {
                sharedConnection.unsubscribe();
            }
            subscriber.unsubscribe();
        });
        source.subscribe(refCounter);
        if (!refCounter.closed) {
            connection = source.connect();
        }
    });
}
//# sourceMappingURL=refCount.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/repeat.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/repeat.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "repeat": () => (/* binding */ repeat)
/* harmony export */ });
/* harmony import */ var _observable_empty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../observable/empty */ "./node_modules/rxjs/dist/esm5/internal/observable/empty.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function repeat(count) {
    if (count === void 0) { count = Infinity; }
    return count <= 0
        ? function () { return _observable_empty__WEBPACK_IMPORTED_MODULE_0__.EMPTY; }
        : (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
            var soFar = 0;
            var innerSub;
            var subscribeForRepeat = function () {
                var syncUnsub = false;
                innerSub = source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, undefined, function () {
                    if (++soFar < count) {
                        if (innerSub) {
                            innerSub.unsubscribe();
                            innerSub = null;
                            subscribeForRepeat();
                        }
                        else {
                            syncUnsub = true;
                        }
                    }
                    else {
                        subscriber.complete();
                    }
                }));
                if (syncUnsub) {
                    innerSub.unsubscribe();
                    innerSub = null;
                    subscribeForRepeat();
                }
            };
            subscribeForRepeat();
        });
}
//# sourceMappingURL=repeat.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/repeatWhen.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/repeatWhen.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "repeatWhen": () => (/* binding */ repeatWhen)
/* harmony export */ });
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function repeatWhen(notifier) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var innerSub;
        var syncResub = false;
        var completions$;
        var isNotifierComplete = false;
        var isMainComplete = false;
        var checkComplete = function () { return isMainComplete && isNotifierComplete && (subscriber.complete(), true); };
        var getCompletionSubject = function () {
            if (!completions$) {
                completions$ = new _Subject__WEBPACK_IMPORTED_MODULE_1__.Subject();
                notifier(completions$).subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function () {
                    if (innerSub) {
                        subscribeForRepeatWhen();
                    }
                    else {
                        syncResub = true;
                    }
                }, function () {
                    isNotifierComplete = true;
                    checkComplete();
                }));
            }
            return completions$;
        };
        var subscribeForRepeatWhen = function () {
            isMainComplete = false;
            innerSub = source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, undefined, function () {
                isMainComplete = true;
                !checkComplete() && getCompletionSubject().next();
            }));
            if (syncResub) {
                innerSub.unsubscribe();
                innerSub = null;
                syncResub = false;
                subscribeForRepeatWhen();
            }
        };
        subscribeForRepeatWhen();
    });
}
//# sourceMappingURL=repeatWhen.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/retry.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/retry.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "retry": () => (/* binding */ retry)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");



function retry(configOrCount) {
    if (configOrCount === void 0) { configOrCount = Infinity; }
    var config;
    if (configOrCount && typeof configOrCount === 'object') {
        config = configOrCount;
    }
    else {
        config = {
            count: configOrCount,
        };
    }
    var count = config.count, _a = config.resetOnSuccess, resetOnSuccess = _a === void 0 ? false : _a;
    return count <= 0
        ? _util_identity__WEBPACK_IMPORTED_MODULE_0__.identity
        : (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
            var soFar = 0;
            var innerSub;
            var subscribeForRetry = function () {
                var syncUnsub = false;
                innerSub = source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) {
                    if (resetOnSuccess) {
                        soFar = 0;
                    }
                    subscriber.next(value);
                }, undefined, function (err) {
                    if (soFar++ < count) {
                        if (innerSub) {
                            innerSub.unsubscribe();
                            innerSub = null;
                            subscribeForRetry();
                        }
                        else {
                            syncUnsub = true;
                        }
                    }
                    else {
                        subscriber.error(err);
                    }
                }));
                if (syncUnsub) {
                    innerSub.unsubscribe();
                    innerSub = null;
                    subscribeForRetry();
                }
            };
            subscribeForRetry();
        });
}
//# sourceMappingURL=retry.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/retryWhen.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/retryWhen.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "retryWhen": () => (/* binding */ retryWhen)
/* harmony export */ });
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function retryWhen(notifier) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var innerSub;
        var syncResub = false;
        var errors$;
        var subscribeForRetryWhen = function () {
            innerSub = source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, undefined, undefined, function (err) {
                if (!errors$) {
                    errors$ = new _Subject__WEBPACK_IMPORTED_MODULE_2__.Subject();
                    notifier(errors$).subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function () {
                        return innerSub ? subscribeForRetryWhen() : (syncResub = true);
                    }));
                }
                if (errors$) {
                    errors$.next(err);
                }
            }));
            if (syncResub) {
                innerSub.unsubscribe();
                innerSub = null;
                syncResub = false;
                subscribeForRetryWhen();
            }
        };
        subscribeForRetryWhen();
    });
}
//# sourceMappingURL=retryWhen.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/sample.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/sample.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "sample": () => (/* binding */ sample)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function sample(notifier) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var hasValue = false;
        var lastValue = null;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            hasValue = true;
            lastValue = value;
        }));
        var emit = function () {
            if (hasValue) {
                hasValue = false;
                var value = lastValue;
                lastValue = null;
                subscriber.next(value);
            }
        };
        notifier.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, emit, _util_noop__WEBPACK_IMPORTED_MODULE_2__.noop));
    });
}
//# sourceMappingURL=sample.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/sampleTime.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/sampleTime.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "sampleTime": () => (/* binding */ sampleTime)
/* harmony export */ });
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _sample__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./sample */ "./node_modules/rxjs/dist/esm5/internal/operators/sample.js");
/* harmony import */ var _observable_interval__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/interval */ "./node_modules/rxjs/dist/esm5/internal/observable/interval.js");



function sampleTime(period, scheduler) {
    if (scheduler === void 0) { scheduler = _scheduler_async__WEBPACK_IMPORTED_MODULE_0__.asyncScheduler; }
    return (0,_sample__WEBPACK_IMPORTED_MODULE_1__.sample)((0,_observable_interval__WEBPACK_IMPORTED_MODULE_2__.interval)(period, scheduler));
}
//# sourceMappingURL=sampleTime.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/scan.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/scan.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "scan": () => (/* binding */ scan)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _scanInternals__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./scanInternals */ "./node_modules/rxjs/dist/esm5/internal/operators/scanInternals.js");


function scan(accumulator, seed) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)((0,_scanInternals__WEBPACK_IMPORTED_MODULE_1__.scanInternals)(accumulator, seed, arguments.length >= 2, true));
}
//# sourceMappingURL=scan.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/scanInternals.js":
/*!*************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/scanInternals.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "scanInternals": () => (/* binding */ scanInternals)
/* harmony export */ });
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");

function scanInternals(accumulator, seed, hasSeed, emitOnNext, emitBeforeComplete) {
    return function (source, subscriber) {
        var hasState = hasSeed;
        var state = seed;
        var index = 0;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_0__.OperatorSubscriber(subscriber, function (value) {
            var i = index++;
            state = hasState
                ?
                    accumulator(state, value, i)
                :
                    ((hasState = true), value);
            emitOnNext && subscriber.next(state);
        }, emitBeforeComplete &&
            (function () {
                hasState && subscriber.next(state);
                subscriber.complete();
            })));
    };
}
//# sourceMappingURL=scanInternals.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/sequenceEqual.js":
/*!*************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/sequenceEqual.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "sequenceEqual": () => (/* binding */ sequenceEqual)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function sequenceEqual(compareTo, comparator) {
    if (comparator === void 0) { comparator = function (a, b) { return a === b; }; }
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var aState = createState();
        var bState = createState();
        var emit = function (isEqual) {
            subscriber.next(isEqual);
            subscriber.complete();
        };
        var createSubscriber = function (selfState, otherState) {
            var sequenceEqualSubscriber = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (a) {
                var buffer = otherState.buffer, complete = otherState.complete;
                if (buffer.length === 0) {
                    complete ? emit(false) : selfState.buffer.push(a);
                }
                else {
                    !comparator(a, buffer.shift()) && emit(false);
                }
            }, function () {
                selfState.complete = true;
                var complete = otherState.complete, buffer = otherState.buffer;
                complete && emit(buffer.length === 0);
                sequenceEqualSubscriber === null || sequenceEqualSubscriber === void 0 ? void 0 : sequenceEqualSubscriber.unsubscribe();
            });
            return sequenceEqualSubscriber;
        };
        source.subscribe(createSubscriber(aState, bState));
        compareTo.subscribe(createSubscriber(bState, aState));
    });
}
function createState() {
    return {
        buffer: [],
        complete: false,
    };
}
//# sourceMappingURL=sequenceEqual.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/share.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/share.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "share": () => (/* binding */ share)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _operators_take__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../operators/take */ "./node_modules/rxjs/dist/esm5/internal/operators/take.js");
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _Subscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Subscriber */ "./node_modules/rxjs/dist/esm5/internal/Subscriber.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");






function share(options) {
    if (options === void 0) { options = {}; }
    var _a = options.connector, connector = _a === void 0 ? function () { return new _Subject__WEBPACK_IMPORTED_MODULE_0__.Subject(); } : _a, _b = options.resetOnError, resetOnError = _b === void 0 ? true : _b, _c = options.resetOnComplete, resetOnComplete = _c === void 0 ? true : _c, _d = options.resetOnRefCountZero, resetOnRefCountZero = _d === void 0 ? true : _d;
    return function (wrapperSource) {
        var connection = null;
        var resetConnection = null;
        var subject = null;
        var refCount = 0;
        var hasCompleted = false;
        var hasErrored = false;
        var cancelReset = function () {
            resetConnection === null || resetConnection === void 0 ? void 0 : resetConnection.unsubscribe();
            resetConnection = null;
        };
        var reset = function () {
            cancelReset();
            connection = subject = null;
            hasCompleted = hasErrored = false;
        };
        var resetAndUnsubscribe = function () {
            var conn = connection;
            reset();
            conn === null || conn === void 0 ? void 0 : conn.unsubscribe();
        };
        return (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
            refCount++;
            if (!hasErrored && !hasCompleted) {
                cancelReset();
            }
            var dest = (subject = subject !== null && subject !== void 0 ? subject : connector());
            subscriber.add(function () {
                refCount--;
                if (refCount === 0 && !hasErrored && !hasCompleted) {
                    resetConnection = handleReset(resetAndUnsubscribe, resetOnRefCountZero);
                }
            });
            dest.subscribe(subscriber);
            if (!connection) {
                connection = new _Subscriber__WEBPACK_IMPORTED_MODULE_2__.SafeSubscriber({
                    next: function (value) { return dest.next(value); },
                    error: function (err) {
                        hasErrored = true;
                        cancelReset();
                        resetConnection = handleReset(reset, resetOnError, err);
                        dest.error(err);
                    },
                    complete: function () {
                        hasCompleted = true;
                        cancelReset();
                        resetConnection = handleReset(reset, resetOnComplete);
                        dest.complete();
                    },
                });
                (0,_observable_from__WEBPACK_IMPORTED_MODULE_3__.from)(source).subscribe(connection);
            }
        })(wrapperSource);
    };
}
function handleReset(reset, on) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    if (on === true) {
        reset();
        return null;
    }
    if (on === false) {
        return null;
    }
    return on.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_4__.__read)(args))).pipe((0,_operators_take__WEBPACK_IMPORTED_MODULE_5__.take)(1))
        .subscribe(function () { return reset(); });
}
//# sourceMappingURL=share.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/shareReplay.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/shareReplay.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "shareReplay": () => (/* binding */ shareReplay)
/* harmony export */ });
/* harmony import */ var _ReplaySubject__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../ReplaySubject */ "./node_modules/rxjs/dist/esm5/internal/ReplaySubject.js");
/* harmony import */ var _share__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./share */ "./node_modules/rxjs/dist/esm5/internal/operators/share.js");


function shareReplay(configOrBufferSize, windowTime, scheduler) {
    var _a, _b;
    var bufferSize;
    var refCount = false;
    if (configOrBufferSize && typeof configOrBufferSize === 'object') {
        bufferSize = (_a = configOrBufferSize.bufferSize) !== null && _a !== void 0 ? _a : Infinity;
        windowTime = (_b = configOrBufferSize.windowTime) !== null && _b !== void 0 ? _b : Infinity;
        refCount = !!configOrBufferSize.refCount;
        scheduler = configOrBufferSize.scheduler;
    }
    else {
        bufferSize = configOrBufferSize !== null && configOrBufferSize !== void 0 ? configOrBufferSize : Infinity;
    }
    return (0,_share__WEBPACK_IMPORTED_MODULE_0__.share)({
        connector: function () { return new _ReplaySubject__WEBPACK_IMPORTED_MODULE_1__.ReplaySubject(bufferSize, windowTime, scheduler); },
        resetOnError: true,
        resetOnComplete: false,
        resetOnRefCountZero: refCount
    });
}
//# sourceMappingURL=shareReplay.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/single.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/single.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "single": () => (/* binding */ single)
/* harmony export */ });
/* harmony import */ var _util_EmptyError__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/EmptyError */ "./node_modules/rxjs/dist/esm5/internal/util/EmptyError.js");
/* harmony import */ var _util_SequenceError__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/SequenceError */ "./node_modules/rxjs/dist/esm5/internal/util/SequenceError.js");
/* harmony import */ var _util_NotFoundError__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/NotFoundError */ "./node_modules/rxjs/dist/esm5/internal/util/NotFoundError.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");





function single(predicate) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var hasValue = false;
        var singleValue;
        var seenValue = false;
        var index = 0;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            seenValue = true;
            if (!predicate || predicate(value, index++, source)) {
                hasValue && subscriber.error(new _util_SequenceError__WEBPACK_IMPORTED_MODULE_2__.SequenceError('Too many matching values'));
                hasValue = true;
                singleValue = value;
            }
        }, function () {
            if (hasValue) {
                subscriber.next(singleValue);
                subscriber.complete();
            }
            else {
                subscriber.error(seenValue ? new _util_NotFoundError__WEBPACK_IMPORTED_MODULE_3__.NotFoundError('No matching values') : new _util_EmptyError__WEBPACK_IMPORTED_MODULE_4__.EmptyError());
            }
        }));
    });
}
//# sourceMappingURL=single.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/skip.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/skip.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "skip": () => (/* binding */ skip)
/* harmony export */ });
/* harmony import */ var _filter__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./filter */ "./node_modules/rxjs/dist/esm5/internal/operators/filter.js");

function skip(count) {
    return (0,_filter__WEBPACK_IMPORTED_MODULE_0__.filter)(function (_, index) { return count <= index; });
}
//# sourceMappingURL=skip.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/skipLast.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/skipLast.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "skipLast": () => (/* binding */ skipLast)
/* harmony export */ });
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function skipLast(skipCount) {
    return skipCount <= 0
        ?
            _util_identity__WEBPACK_IMPORTED_MODULE_0__.identity
        : (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
            var ring = new Array(skipCount);
            var seen = 0;
            source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) {
                var valueIndex = seen++;
                if (valueIndex < skipCount) {
                    ring[valueIndex] = value;
                }
                else {
                    var index = valueIndex % skipCount;
                    var oldValue = ring[index];
                    ring[index] = value;
                    subscriber.next(oldValue);
                }
            }));
            return function () {
                ring = null;
            };
        });
}
//# sourceMappingURL=skipLast.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/skipUntil.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/skipUntil.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "skipUntil": () => (/* binding */ skipUntil)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");




function skipUntil(notifier) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var taking = false;
        var skipSubscriber = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function () {
            skipSubscriber === null || skipSubscriber === void 0 ? void 0 : skipSubscriber.unsubscribe();
            taking = true;
        }, _util_noop__WEBPACK_IMPORTED_MODULE_2__.noop);
        (0,_observable_from__WEBPACK_IMPORTED_MODULE_3__.innerFrom)(notifier).subscribe(skipSubscriber);
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) { return taking && subscriber.next(value); }));
    });
}
//# sourceMappingURL=skipUntil.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/skipWhile.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/skipWhile.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "skipWhile": () => (/* binding */ skipWhile)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function skipWhile(predicate) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var taking = false;
        var index = 0;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) { return (taking || (taking = !predicate(value, index++))) && subscriber.next(value); }));
    });
}
//# sourceMappingURL=skipWhile.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/startWith.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/startWith.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "startWith": () => (/* binding */ startWith)
/* harmony export */ });
/* harmony import */ var _observable_concat__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/concat */ "./node_modules/rxjs/dist/esm5/internal/observable/concat.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");



function startWith() {
    var values = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        values[_i] = arguments[_i];
    }
    var scheduler = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popScheduler)(values);
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
        (scheduler ? (0,_observable_concat__WEBPACK_IMPORTED_MODULE_2__.concat)(values, source, scheduler) : (0,_observable_concat__WEBPACK_IMPORTED_MODULE_2__.concat)(values, source)).subscribe(subscriber);
    });
}
//# sourceMappingURL=startWith.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/subscribeOn.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/subscribeOn.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "subscribeOn": () => (/* binding */ subscribeOn)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");

function subscribeOn(scheduler, delay) {
    if (delay === void 0) { delay = 0; }
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        subscriber.add(scheduler.schedule(function () { return source.subscribe(subscriber); }, delay));
    });
}
//# sourceMappingURL=subscribeOn.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/switchAll.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/switchAll.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "switchAll": () => (/* binding */ switchAll)
/* harmony export */ });
/* harmony import */ var _switchMap__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./switchMap */ "./node_modules/rxjs/dist/esm5/internal/operators/switchMap.js");
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");


function switchAll() {
    return (0,_switchMap__WEBPACK_IMPORTED_MODULE_0__.switchMap)(_util_identity__WEBPACK_IMPORTED_MODULE_1__.identity);
}
//# sourceMappingURL=switchAll.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/switchMap.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/switchMap.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "switchMap": () => (/* binding */ switchMap)
/* harmony export */ });
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function switchMap(project, resultSelector) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var innerSubscriber = null;
        var index = 0;
        var isComplete = false;
        var checkComplete = function () { return isComplete && !innerSubscriber && subscriber.complete(); };
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            innerSubscriber === null || innerSubscriber === void 0 ? void 0 : innerSubscriber.unsubscribe();
            var innerIndex = 0;
            var outerIndex = index++;
            (0,_observable_from__WEBPACK_IMPORTED_MODULE_2__.innerFrom)(project(value, outerIndex)).subscribe((innerSubscriber = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (innerValue) { return subscriber.next(resultSelector ? resultSelector(value, innerValue, outerIndex, innerIndex++) : innerValue); }, function () {
                innerSubscriber = null;
                checkComplete();
            })));
        }, function () {
            isComplete = true;
            checkComplete();
        }));
    });
}
//# sourceMappingURL=switchMap.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/switchMapTo.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/switchMapTo.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "switchMapTo": () => (/* binding */ switchMapTo)
/* harmony export */ });
/* harmony import */ var _switchMap__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./switchMap */ "./node_modules/rxjs/dist/esm5/internal/operators/switchMap.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");


function switchMapTo(innerObservable, resultSelector) {
    return (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(resultSelector) ? (0,_switchMap__WEBPACK_IMPORTED_MODULE_1__.switchMap)(function () { return innerObservable; }, resultSelector) : (0,_switchMap__WEBPACK_IMPORTED_MODULE_1__.switchMap)(function () { return innerObservable; });
}
//# sourceMappingURL=switchMapTo.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/switchScan.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/switchScan.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "switchScan": () => (/* binding */ switchScan)
/* harmony export */ });
/* harmony import */ var _switchMap__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./switchMap */ "./node_modules/rxjs/dist/esm5/internal/operators/switchMap.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");


function switchScan(accumulator, seed) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var state = seed;
        (0,_switchMap__WEBPACK_IMPORTED_MODULE_1__.switchMap)(function (value, index) { return accumulator(state, value, index); }, function (_, innerValue) { return ((state = innerValue), innerValue); })(source).subscribe(subscriber);
        return function () {
            state = null;
        };
    });
}
//# sourceMappingURL=switchScan.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/take.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/take.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "take": () => (/* binding */ take)
/* harmony export */ });
/* harmony import */ var _observable_empty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../observable/empty */ "./node_modules/rxjs/dist/esm5/internal/observable/empty.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function take(count) {
    return count <= 0
        ?
            function () { return _observable_empty__WEBPACK_IMPORTED_MODULE_0__.EMPTY; }
        : (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
            var seen = 0;
            source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) {
                if (++seen <= count) {
                    subscriber.next(value);
                    if (count <= seen) {
                        subscriber.complete();
                    }
                }
            }));
        });
}
//# sourceMappingURL=take.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/takeLast.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/takeLast.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "takeLast": () => (/* binding */ takeLast)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _observable_empty__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../observable/empty */ "./node_modules/rxjs/dist/esm5/internal/observable/empty.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");




function takeLast(count) {
    return count <= 0
        ? function () { return _observable_empty__WEBPACK_IMPORTED_MODULE_0__.EMPTY; }
        : (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
            var buffer = [];
            source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) {
                buffer.push(value);
                count < buffer.length && buffer.shift();
            }, function () {
                var e_1, _a;
                try {
                    for (var buffer_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__values)(buffer), buffer_1_1 = buffer_1.next(); !buffer_1_1.done; buffer_1_1 = buffer_1.next()) {
                        var value = buffer_1_1.value;
                        subscriber.next(value);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (buffer_1_1 && !buffer_1_1.done && (_a = buffer_1.return)) _a.call(buffer_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                subscriber.complete();
            }, undefined, function () {
                buffer = null;
            }));
        });
}
//# sourceMappingURL=takeLast.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/takeUntil.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/takeUntil.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "takeUntil": () => (/* binding */ takeUntil)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");




function takeUntil(notifier) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        (0,_observable_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(notifier).subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function () { return subscriber.complete(); }, _util_noop__WEBPACK_IMPORTED_MODULE_3__.noop));
        !subscriber.closed && source.subscribe(subscriber);
    });
}
//# sourceMappingURL=takeUntil.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/takeWhile.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/takeWhile.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "takeWhile": () => (/* binding */ takeWhile)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");


function takeWhile(predicate, inclusive) {
    if (inclusive === void 0) { inclusive = false; }
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var index = 0;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            var result = predicate(value, index++);
            (result || inclusive) && subscriber.next(value);
            !result && subscriber.complete();
        }));
    });
}
//# sourceMappingURL=takeWhile.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/tap.js":
/*!***************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/tap.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "tap": () => (/* binding */ tap)
/* harmony export */ });
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");




function tap(observerOrNext, error, complete) {
    var tapObserver = (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(observerOrNext) || error || complete ? { next: observerOrNext, error: error, complete: complete } : observerOrNext;
    return tapObserver
        ? (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
            source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) {
                var _a;
                (_a = tapObserver.next) === null || _a === void 0 ? void 0 : _a.call(tapObserver, value);
                subscriber.next(value);
            }, function () {
                var _a;
                (_a = tapObserver.complete) === null || _a === void 0 ? void 0 : _a.call(tapObserver);
                subscriber.complete();
            }, function (err) {
                var _a;
                (_a = tapObserver.error) === null || _a === void 0 ? void 0 : _a.call(tapObserver, err);
                subscriber.error(err);
            }));
        })
        :
            _util_identity__WEBPACK_IMPORTED_MODULE_3__.identity;
}
//# sourceMappingURL=tap.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/throttle.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/throttle.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "defaultThrottleConfig": () => (/* binding */ defaultThrottleConfig),
/* harmony export */   "throttle": () => (/* binding */ throttle)
/* harmony export */ });
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");



var defaultThrottleConfig = {
    leading: true,
    trailing: false,
};
function throttle(durationSelector, _a) {
    var _b = _a === void 0 ? defaultThrottleConfig : _a, leading = _b.leading, trailing = _b.trailing;
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var hasValue = false;
        var sendValue = null;
        var throttled = null;
        var isComplete = false;
        var endThrottling = function () {
            throttled === null || throttled === void 0 ? void 0 : throttled.unsubscribe();
            throttled = null;
            if (trailing) {
                send();
                isComplete && subscriber.complete();
            }
        };
        var cleanupThrottling = function () {
            throttled = null;
            isComplete && subscriber.complete();
        };
        var startThrottle = function (value) {
            return (throttled = (0,_observable_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(durationSelector(value)).subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, endThrottling, cleanupThrottling)));
        };
        var send = function () {
            if (hasValue) {
                hasValue = false;
                var value = sendValue;
                sendValue = null;
                subscriber.next(value);
                !isComplete && startThrottle(value);
            }
        };
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) {
            hasValue = true;
            sendValue = value;
            !(throttled && !throttled.closed) && (leading ? send() : startThrottle(value));
        }, function () {
            isComplete = true;
            !(trailing && hasValue && throttled && !throttled.closed) && subscriber.complete();
        }));
    });
}
//# sourceMappingURL=throttle.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/throttleTime.js":
/*!************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/throttleTime.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "throttleTime": () => (/* binding */ throttleTime)
/* harmony export */ });
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _throttle__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./throttle */ "./node_modules/rxjs/dist/esm5/internal/operators/throttle.js");
/* harmony import */ var _observable_timer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/timer */ "./node_modules/rxjs/dist/esm5/internal/observable/timer.js");



function throttleTime(duration, scheduler, config) {
    if (scheduler === void 0) { scheduler = _scheduler_async__WEBPACK_IMPORTED_MODULE_0__.asyncScheduler; }
    if (config === void 0) { config = _throttle__WEBPACK_IMPORTED_MODULE_1__.defaultThrottleConfig; }
    var duration$ = (0,_observable_timer__WEBPACK_IMPORTED_MODULE_2__.timer)(duration, scheduler);
    return (0,_throttle__WEBPACK_IMPORTED_MODULE_1__.throttle)(function () { return duration$; }, config);
}
//# sourceMappingURL=throttleTime.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/throwIfEmpty.js":
/*!************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/throwIfEmpty.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "throwIfEmpty": () => (/* binding */ throwIfEmpty)
/* harmony export */ });
/* harmony import */ var _util_EmptyError__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/EmptyError */ "./node_modules/rxjs/dist/esm5/internal/util/EmptyError.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");



function throwIfEmpty(errorFactory) {
    if (errorFactory === void 0) { errorFactory = defaultErrorFactory; }
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var hasValue = false;
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_1__.OperatorSubscriber(subscriber, function (value) {
            hasValue = true;
            subscriber.next(value);
        }, function () { return (hasValue ? subscriber.complete() : subscriber.error(errorFactory())); }));
    });
}
function defaultErrorFactory() {
    return new _util_EmptyError__WEBPACK_IMPORTED_MODULE_2__.EmptyError();
}
//# sourceMappingURL=throwIfEmpty.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/timeInterval.js":
/*!************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/timeInterval.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "timeInterval": () => (/* binding */ timeInterval),
/* harmony export */   "TimeInterval": () => (/* binding */ TimeInterval)
/* harmony export */ });
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _scan__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./scan */ "./node_modules/rxjs/dist/esm5/internal/operators/scan.js");
/* harmony import */ var _observable_defer__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/defer */ "./node_modules/rxjs/dist/esm5/internal/observable/defer.js");
/* harmony import */ var _map__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./map */ "./node_modules/rxjs/dist/esm5/internal/operators/map.js");




function timeInterval(scheduler) {
    if (scheduler === void 0) { scheduler = _scheduler_async__WEBPACK_IMPORTED_MODULE_0__.async; }
    return function (source) {
        return (0,_observable_defer__WEBPACK_IMPORTED_MODULE_1__.defer)(function () {
            return source.pipe((0,_scan__WEBPACK_IMPORTED_MODULE_2__.scan)(function (_a, value) {
                var current = _a.current;
                return ({ value: value, current: scheduler.now(), last: current });
            }, {
                current: scheduler.now(),
                value: undefined,
                last: undefined,
            }), (0,_map__WEBPACK_IMPORTED_MODULE_3__.map)(function (_a) {
                var current = _a.current, last = _a.last, value = _a.value;
                return new TimeInterval(value, current - last);
            }));
        });
    };
}
var TimeInterval = (function () {
    function TimeInterval(value, interval) {
        this.value = value;
        this.interval = interval;
    }
    return TimeInterval;
}());

//# sourceMappingURL=timeInterval.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/timeout.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/timeout.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "TimeoutError": () => (/* binding */ TimeoutError),
/* harmony export */   "timeout": () => (/* binding */ timeout)
/* harmony export */ });
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _util_isDate__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/isDate */ "./node_modules/rxjs/dist/esm5/internal/util/isDate.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_createErrorClass__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/createErrorClass */ "./node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js");
/* harmony import */ var _util_caughtSchedule__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/caughtSchedule */ "./node_modules/rxjs/dist/esm5/internal/util/caughtSchedule.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");







var TimeoutError = (0,_util_createErrorClass__WEBPACK_IMPORTED_MODULE_0__.createErrorClass)(function (_super) {
    return function TimeoutErrorImpl(info) {
        if (info === void 0) { info = null; }
        _super(this);
        this.message = 'Timeout has occurred';
        this.name = 'TimeoutError';
        this.info = info;
    };
});
function timeout(config, schedulerArg) {
    var _a = ((0,_util_isDate__WEBPACK_IMPORTED_MODULE_1__.isValidDate)(config)
        ? { first: config }
        : typeof config === 'number'
            ? { each: config }
            : config), first = _a.first, each = _a.each, _b = _a.with, _with = _b === void 0 ? timeoutErrorFactory : _b, _c = _a.scheduler, scheduler = _c === void 0 ? schedulerArg !== null && schedulerArg !== void 0 ? schedulerArg : _scheduler_async__WEBPACK_IMPORTED_MODULE_2__.asyncScheduler : _c, _d = _a.meta, meta = _d === void 0 ? null : _d;
    if (first == null && each == null) {
        throw new TypeError('No timeout provided.');
    }
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_3__.operate)(function (source, subscriber) {
        var originalSourceSubscription;
        var timerSubscription;
        var lastValue = null;
        var seen = 0;
        var startTimer = function (delay) {
            timerSubscription = (0,_util_caughtSchedule__WEBPACK_IMPORTED_MODULE_4__.caughtSchedule)(subscriber, scheduler, function () {
                originalSourceSubscription.unsubscribe();
                (0,_observable_from__WEBPACK_IMPORTED_MODULE_5__.innerFrom)(_with({
                    meta: meta,
                    lastValue: lastValue,
                    seen: seen,
                })).subscribe(subscriber);
            }, delay);
        };
        originalSourceSubscription = source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_6__.OperatorSubscriber(subscriber, function (value) {
            timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.unsubscribe();
            seen++;
            subscriber.next((lastValue = value));
            each > 0 && startTimer(each);
        }, undefined, undefined, function () {
            if (!(timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.closed)) {
                timerSubscription === null || timerSubscription === void 0 ? void 0 : timerSubscription.unsubscribe();
            }
            lastValue = null;
        }));
        startTimer(first != null ? (typeof first === 'number' ? first : +first - scheduler.now()) : each);
    });
}
function timeoutErrorFactory(info) {
    throw new TimeoutError(info);
}
//# sourceMappingURL=timeout.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/timeoutWith.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/timeoutWith.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "timeoutWith": () => (/* binding */ timeoutWith)
/* harmony export */ });
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _util_isDate__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/isDate */ "./node_modules/rxjs/dist/esm5/internal/util/isDate.js");
/* harmony import */ var _timeout__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./timeout */ "./node_modules/rxjs/dist/esm5/internal/operators/timeout.js");



function timeoutWith(due, withObservable, scheduler) {
    var first;
    var each;
    var _with;
    scheduler = scheduler !== null && scheduler !== void 0 ? scheduler : _scheduler_async__WEBPACK_IMPORTED_MODULE_0__.async;
    if ((0,_util_isDate__WEBPACK_IMPORTED_MODULE_1__.isValidDate)(due)) {
        first = due;
    }
    else if (typeof due === 'number') {
        each = due;
    }
    if (withObservable) {
        _with = function () { return withObservable; };
    }
    else {
        throw new TypeError('No observable provided to switch to');
    }
    if (first == null && each == null) {
        throw new TypeError('No timeout provided.');
    }
    return (0,_timeout__WEBPACK_IMPORTED_MODULE_2__.timeout)({
        first: first,
        each: each,
        scheduler: scheduler,
        with: _with,
    });
}
//# sourceMappingURL=timeoutWith.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/timestamp.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/timestamp.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "timestamp": () => (/* binding */ timestamp)
/* harmony export */ });
/* harmony import */ var _scheduler_dateTimestampProvider__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduler/dateTimestampProvider */ "./node_modules/rxjs/dist/esm5/internal/scheduler/dateTimestampProvider.js");
/* harmony import */ var _map__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./map */ "./node_modules/rxjs/dist/esm5/internal/operators/map.js");


function timestamp(timestampProvider) {
    if (timestampProvider === void 0) { timestampProvider = _scheduler_dateTimestampProvider__WEBPACK_IMPORTED_MODULE_0__.dateTimestampProvider; }
    return (0,_map__WEBPACK_IMPORTED_MODULE_1__.map)(function (value) { return ({ value: value, timestamp: timestampProvider.now() }); });
}
//# sourceMappingURL=timestamp.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/toArray.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/toArray.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "toArray": () => (/* binding */ toArray)
/* harmony export */ });
/* harmony import */ var _reduce__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./reduce */ "./node_modules/rxjs/dist/esm5/internal/operators/reduce.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");


var arrReducer = function (arr, value) { return (arr.push(value), arr); };
function toArray() {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        (0,_reduce__WEBPACK_IMPORTED_MODULE_1__.reduce)(arrReducer, [])(source).subscribe(subscriber);
    });
}
//# sourceMappingURL=toArray.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/window.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/window.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "window": () => (/* binding */ window)
/* harmony export */ });
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");




function window(windowBoundaries) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var windowSubject = new _Subject__WEBPACK_IMPORTED_MODULE_1__.Subject();
        subscriber.next(windowSubject.asObservable());
        var errorHandler = function (err) {
            windowSubject.error(err);
            subscriber.error(err);
        };
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) { return windowSubject === null || windowSubject === void 0 ? void 0 : windowSubject.next(value); }, function () {
            windowSubject.complete();
            subscriber.complete();
        }, errorHandler));
        windowBoundaries.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function () {
            windowSubject.complete();
            subscriber.next((windowSubject = new _Subject__WEBPACK_IMPORTED_MODULE_1__.Subject()));
        }, _util_noop__WEBPACK_IMPORTED_MODULE_3__.noop, errorHandler));
        return function () {
            windowSubject === null || windowSubject === void 0 ? void 0 : windowSubject.unsubscribe();
            windowSubject = null;
        };
    });
}
//# sourceMappingURL=window.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/windowCount.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/windowCount.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "windowCount": () => (/* binding */ windowCount)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");




function windowCount(windowSize, startWindowEvery) {
    if (startWindowEvery === void 0) { startWindowEvery = 0; }
    var startEvery = startWindowEvery > 0 ? startWindowEvery : windowSize;
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var windows = [new _Subject__WEBPACK_IMPORTED_MODULE_1__.Subject()];
        var starts = [];
        var count = 0;
        subscriber.next(windows[0].asObservable());
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) {
            var e_1, _a;
            try {
                for (var windows_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_3__.__values)(windows), windows_1_1 = windows_1.next(); !windows_1_1.done; windows_1_1 = windows_1.next()) {
                    var window_1 = windows_1_1.value;
                    window_1.next(value);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (windows_1_1 && !windows_1_1.done && (_a = windows_1.return)) _a.call(windows_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var c = count - windowSize + 1;
            if (c >= 0 && c % startEvery === 0) {
                windows.shift().complete();
            }
            if (++count % startEvery === 0) {
                var window_2 = new _Subject__WEBPACK_IMPORTED_MODULE_1__.Subject();
                windows.push(window_2);
                subscriber.next(window_2.asObservable());
            }
        }, function () {
            while (windows.length > 0) {
                windows.shift().complete();
            }
            subscriber.complete();
        }, function (err) {
            while (windows.length > 0) {
                windows.shift().error(err);
            }
            subscriber.error(err);
        }, function () {
            starts = null;
            windows = null;
        }));
    });
}
//# sourceMappingURL=windowCount.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/windowTime.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/windowTime.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "windowTime": () => (/* binding */ windowTime)
/* harmony export */ });
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _scheduler_async__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../scheduler/async */ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_arrRemove__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/arrRemove */ "./node_modules/rxjs/dist/esm5/internal/util/arrRemove.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");







function windowTime(windowTimeSpan) {
    var _a, _b;
    var otherArgs = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        otherArgs[_i - 1] = arguments[_i];
    }
    var scheduler = (_a = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popScheduler)(otherArgs)) !== null && _a !== void 0 ? _a : _scheduler_async__WEBPACK_IMPORTED_MODULE_1__.asyncScheduler;
    var windowCreationInterval = (_b = otherArgs[0]) !== null && _b !== void 0 ? _b : null;
    var maxWindowSize = otherArgs[1] || Infinity;
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_2__.operate)(function (source, subscriber) {
        var windowRecords = [];
        var restartOnClose = false;
        var closeWindow = function (record) {
            var window = record.window, subs = record.subs;
            window.complete();
            subs.unsubscribe();
            (0,_util_arrRemove__WEBPACK_IMPORTED_MODULE_3__.arrRemove)(windowRecords, record);
            restartOnClose && startWindow();
        };
        var startWindow = function () {
            if (windowRecords) {
                var subs = new _Subscription__WEBPACK_IMPORTED_MODULE_4__.Subscription();
                subscriber.add(subs);
                var window_1 = new _Subject__WEBPACK_IMPORTED_MODULE_5__.Subject();
                var record_1 = {
                    window: window_1,
                    subs: subs,
                    seen: 0,
                };
                windowRecords.push(record_1);
                subscriber.next(window_1.asObservable());
                subs.add(scheduler.schedule(function () { return closeWindow(record_1); }, windowTimeSpan));
            }
        };
        windowCreationInterval !== null && windowCreationInterval >= 0
            ?
                subscriber.add(scheduler.schedule(function () {
                    startWindow();
                    !this.closed && subscriber.add(this.schedule(null, windowCreationInterval));
                }, windowCreationInterval))
            : (restartOnClose = true);
        startWindow();
        var loop = function (cb) { return windowRecords.slice().forEach(cb); };
        var terminate = function (cb) {
            loop(function (_a) {
                var window = _a.window;
                return cb(window);
            });
            cb(subscriber);
            subscriber.unsubscribe();
        };
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_6__.OperatorSubscriber(subscriber, function (value) {
            loop(function (record) {
                record.window.next(value);
                maxWindowSize <= ++record.seen && closeWindow(record);
            });
        }, function () { return terminate(function (consumer) { return consumer.complete(); }); }, function (err) { return terminate(function (consumer) { return consumer.error(err); }); }));
        return function () {
            windowRecords = null;
        };
    });
}
//# sourceMappingURL=windowTime.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/windowToggle.js":
/*!************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/windowToggle.js ***!
  \************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "windowToggle": () => (/* binding */ windowToggle)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");
/* harmony import */ var _util_arrRemove__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/arrRemove */ "./node_modules/rxjs/dist/esm5/internal/util/arrRemove.js");








function windowToggle(openings, closingSelector) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var windows = [];
        var handleError = function (err) {
            while (0 < windows.length) {
                windows.shift().error(err);
            }
            subscriber.error(err);
        };
        (0,_observable_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(openings).subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (openValue) {
            var window = new _Subject__WEBPACK_IMPORTED_MODULE_3__.Subject();
            windows.push(window);
            var closingSubscription = new _Subscription__WEBPACK_IMPORTED_MODULE_4__.Subscription();
            var closeWindow = function () {
                (0,_util_arrRemove__WEBPACK_IMPORTED_MODULE_5__.arrRemove)(windows, window);
                window.complete();
                closingSubscription.unsubscribe();
            };
            var closingNotifier;
            try {
                closingNotifier = (0,_observable_from__WEBPACK_IMPORTED_MODULE_1__.innerFrom)(closingSelector(openValue));
            }
            catch (err) {
                handleError(err);
                return;
            }
            subscriber.next(window.asObservable());
            closingSubscription.add(closingNotifier.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, closeWindow, _util_noop__WEBPACK_IMPORTED_MODULE_6__.noop, handleError)));
        }, _util_noop__WEBPACK_IMPORTED_MODULE_6__.noop));
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_2__.OperatorSubscriber(subscriber, function (value) {
            var e_1, _a;
            var windowsCopy = windows.slice();
            try {
                for (var windowsCopy_1 = (0,tslib__WEBPACK_IMPORTED_MODULE_7__.__values)(windowsCopy), windowsCopy_1_1 = windowsCopy_1.next(); !windowsCopy_1_1.done; windowsCopy_1_1 = windowsCopy_1.next()) {
                    var window_1 = windowsCopy_1_1.value;
                    window_1.next(value);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (windowsCopy_1_1 && !windowsCopy_1_1.done && (_a = windowsCopy_1.return)) _a.call(windowsCopy_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }, function () {
            while (0 < windows.length) {
                windows.shift().complete();
            }
            subscriber.complete();
        }, handleError, function () {
            while (0 < windows.length) {
                windows.shift().unsubscribe();
            }
        }));
    });
}
//# sourceMappingURL=windowToggle.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/windowWhen.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/windowWhen.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "windowWhen": () => (/* binding */ windowWhen)
/* harmony export */ });
/* harmony import */ var _Subject__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Subject */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");




function windowWhen(closingSelector) {
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        var window;
        var closingSubscriber;
        var handleError = function (err) {
            window.error(err);
            subscriber.error(err);
        };
        var openWindow = function () {
            closingSubscriber === null || closingSubscriber === void 0 ? void 0 : closingSubscriber.unsubscribe();
            window === null || window === void 0 ? void 0 : window.complete();
            window = new _Subject__WEBPACK_IMPORTED_MODULE_1__.Subject();
            subscriber.next(window.asObservable());
            var closingNotifier;
            try {
                closingNotifier = (0,_observable_from__WEBPACK_IMPORTED_MODULE_2__.innerFrom)(closingSelector());
            }
            catch (err) {
                handleError(err);
                return;
            }
            closingNotifier.subscribe((closingSubscriber = new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__.OperatorSubscriber(subscriber, openWindow, openWindow, handleError)));
        };
        openWindow();
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__.OperatorSubscriber(subscriber, function (value) { return window.next(value); }, function () {
            window.complete();
            subscriber.complete();
        }, handleError, function () {
            closingSubscriber === null || closingSubscriber === void 0 ? void 0 : closingSubscriber.unsubscribe();
            window = null;
        }));
    });
}
//# sourceMappingURL=windowWhen.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/withLatestFrom.js":
/*!**************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/withLatestFrom.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "withLatestFrom": () => (/* binding */ withLatestFrom)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");
/* harmony import */ var _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./OperatorSubscriber */ "./node_modules/rxjs/dist/esm5/internal/operators/OperatorSubscriber.js");
/* harmony import */ var _observable_from__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../observable/from */ "./node_modules/rxjs/dist/esm5/internal/observable/from.js");
/* harmony import */ var _util_identity__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");
/* harmony import */ var _util_noop__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../util/noop */ "./node_modules/rxjs/dist/esm5/internal/util/noop.js");
/* harmony import */ var _util_args__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/args */ "./node_modules/rxjs/dist/esm5/internal/util/args.js");







function withLatestFrom() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    var project = (0,_util_args__WEBPACK_IMPORTED_MODULE_0__.popResultSelector)(inputs);
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_1__.operate)(function (source, subscriber) {
        var len = inputs.length;
        var otherValues = new Array(len);
        var hasValue = inputs.map(function () { return false; });
        var ready = false;
        var _loop_1 = function (i) {
            (0,_observable_from__WEBPACK_IMPORTED_MODULE_2__.innerFrom)(inputs[i]).subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__.OperatorSubscriber(subscriber, function (value) {
                otherValues[i] = value;
                if (!ready && !hasValue[i]) {
                    hasValue[i] = true;
                    (ready = hasValue.every(_util_identity__WEBPACK_IMPORTED_MODULE_4__.identity)) && (hasValue = null);
                }
            }, _util_noop__WEBPACK_IMPORTED_MODULE_5__.noop));
        };
        for (var i = 0; i < len; i++) {
            _loop_1(i);
        }
        source.subscribe(new _OperatorSubscriber__WEBPACK_IMPORTED_MODULE_3__.OperatorSubscriber(subscriber, function (value) {
            if (ready) {
                var values = (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__spreadArray)([value], (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__read)(otherValues));
                subscriber.next(project ? project.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_6__.__read)(values))) : values);
            }
        }));
    });
}
//# sourceMappingURL=withLatestFrom.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/zip.js":
/*!***************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/zip.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "zip": () => (/* binding */ zip)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _observable_zip__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/zip */ "./node_modules/rxjs/dist/esm5/internal/observable/zip.js");
/* harmony import */ var _util_lift__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/lift */ "./node_modules/rxjs/dist/esm5/internal/util/lift.js");



function zip() {
    var sources = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        sources[_i] = arguments[_i];
    }
    return (0,_util_lift__WEBPACK_IMPORTED_MODULE_0__.operate)(function (source, subscriber) {
        _observable_zip__WEBPACK_IMPORTED_MODULE_1__.zip.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__spreadArray)([source], (0,tslib__WEBPACK_IMPORTED_MODULE_2__.__read)(sources))).subscribe(subscriber);
    });
}
//# sourceMappingURL=zip.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/zipAll.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/zipAll.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "zipAll": () => (/* binding */ zipAll)
/* harmony export */ });
/* harmony import */ var _observable_zip__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../observable/zip */ "./node_modules/rxjs/dist/esm5/internal/observable/zip.js");
/* harmony import */ var _joinAllInternals__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./joinAllInternals */ "./node_modules/rxjs/dist/esm5/internal/operators/joinAllInternals.js");


function zipAll(project) {
    return (0,_joinAllInternals__WEBPACK_IMPORTED_MODULE_0__.joinAllInternals)(_observable_zip__WEBPACK_IMPORTED_MODULE_1__.zip, project);
}
//# sourceMappingURL=zipAll.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/operators/zipWith.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/operators/zipWith.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "zipWith": () => (/* binding */ zipWith)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _zip__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./zip */ "./node_modules/rxjs/dist/esm5/internal/operators/zip.js");


function zipWith() {
    var otherInputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        otherInputs[_i] = arguments[_i];
    }
    return _zip__WEBPACK_IMPORTED_MODULE_0__.zip.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__read)(otherInputs)));
}
//# sourceMappingURL=zipWith.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleArray.js":
/*!*************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleArray.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "scheduleArray": () => (/* binding */ scheduleArray)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");

function scheduleArray(input, scheduler) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable(function (subscriber) {
        var i = 0;
        return scheduler.schedule(function () {
            if (i === input.length) {
                subscriber.complete();
            }
            else {
                subscriber.next(input[i++]);
                if (!subscriber.closed) {
                    this.schedule();
                }
            }
        });
    });
}
//# sourceMappingURL=scheduleArray.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleAsyncIterable.js":
/*!*********************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleAsyncIterable.js ***!
  \*********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "scheduleAsyncIterable": () => (/* binding */ scheduleAsyncIterable)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");


function scheduleAsyncIterable(input, scheduler) {
    if (!input) {
        throw new Error('Iterable cannot be null');
    }
    return new _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable(function (subscriber) {
        var sub = new _Subscription__WEBPACK_IMPORTED_MODULE_1__.Subscription();
        sub.add(scheduler.schedule(function () {
            var iterator = input[Symbol.asyncIterator]();
            sub.add(scheduler.schedule(function () {
                var _this = this;
                iterator.next().then(function (result) {
                    if (result.done) {
                        subscriber.complete();
                    }
                    else {
                        subscriber.next(result.value);
                        _this.schedule();
                    }
                });
            }));
        }));
        return sub;
    });
}
//# sourceMappingURL=scheduleAsyncIterable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleIterable.js":
/*!****************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleIterable.js ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "scheduleIterable": () => (/* binding */ scheduleIterable)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _symbol_iterator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../symbol/iterator */ "./node_modules/rxjs/dist/esm5/internal/symbol/iterator.js");
/* harmony import */ var _util_isFunction__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../util/isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");
/* harmony import */ var _util_caughtSchedule__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/caughtSchedule */ "./node_modules/rxjs/dist/esm5/internal/util/caughtSchedule.js");




function scheduleIterable(input, scheduler) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable(function (subscriber) {
        var iterator;
        subscriber.add(scheduler.schedule(function () {
            iterator = input[_symbol_iterator__WEBPACK_IMPORTED_MODULE_1__.iterator]();
            (0,_util_caughtSchedule__WEBPACK_IMPORTED_MODULE_2__.caughtSchedule)(subscriber, scheduler, function () {
                var _a = iterator.next(), value = _a.value, done = _a.done;
                if (done) {
                    subscriber.complete();
                }
                else {
                    subscriber.next(value);
                    this.schedule();
                }
            });
        }));
        return function () { return (0,_util_isFunction__WEBPACK_IMPORTED_MODULE_3__.isFunction)(iterator === null || iterator === void 0 ? void 0 : iterator.return) && iterator.return(); };
    });
}
//# sourceMappingURL=scheduleIterable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleObservable.js":
/*!******************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleObservable.js ***!
  \******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "scheduleObservable": () => (/* binding */ scheduleObservable)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _symbol_observable__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../symbol/observable */ "./node_modules/rxjs/dist/esm5/internal/symbol/observable.js");



function scheduleObservable(input, scheduler) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable(function (subscriber) {
        var sub = new _Subscription__WEBPACK_IMPORTED_MODULE_1__.Subscription();
        sub.add(scheduler.schedule(function () {
            var observable = input[_symbol_observable__WEBPACK_IMPORTED_MODULE_2__.observable]();
            sub.add(observable.subscribe({
                next: function (value) { sub.add(scheduler.schedule(function () { return subscriber.next(value); })); },
                error: function (err) { sub.add(scheduler.schedule(function () { return subscriber.error(err); })); },
                complete: function () { sub.add(scheduler.schedule(function () { return subscriber.complete(); })); },
            }));
        }));
        return sub;
    });
}
//# sourceMappingURL=scheduleObservable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduled/schedulePromise.js":
/*!***************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduled/schedulePromise.js ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "schedulePromise": () => (/* binding */ schedulePromise)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");

function schedulePromise(input, scheduler) {
    return new _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable(function (subscriber) {
        return scheduler.schedule(function () {
            return input.then(function (value) {
                subscriber.add(scheduler.schedule(function () {
                    subscriber.next(value);
                    subscriber.add(scheduler.schedule(function () { return subscriber.complete(); }));
                }));
            }, function (err) {
                subscriber.add(scheduler.schedule(function () { return subscriber.error(err); }));
            });
        });
    });
}
//# sourceMappingURL=schedulePromise.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleReadableStreamLike.js":
/*!**************************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleReadableStreamLike.js ***!
  \**************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "scheduleReadableStreamLike": () => (/* binding */ scheduleReadableStreamLike)
/* harmony export */ });
/* harmony import */ var _scheduleAsyncIterable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./scheduleAsyncIterable */ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleAsyncIterable.js");
/* harmony import */ var _util_isReadableStreamLike__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../util/isReadableStreamLike */ "./node_modules/rxjs/dist/esm5/internal/util/isReadableStreamLike.js");


function scheduleReadableStreamLike(input, scheduler) {
    return (0,_scheduleAsyncIterable__WEBPACK_IMPORTED_MODULE_0__.scheduleAsyncIterable)((0,_util_isReadableStreamLike__WEBPACK_IMPORTED_MODULE_1__.readableStreamLikeToAsyncGenerator)(input), scheduler);
}
//# sourceMappingURL=scheduleReadableStreamLike.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduled.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduled/scheduled.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "scheduled": () => (/* binding */ scheduled)
/* harmony export */ });
/* harmony import */ var _scheduleObservable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./scheduleObservable */ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleObservable.js");
/* harmony import */ var _schedulePromise__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./schedulePromise */ "./node_modules/rxjs/dist/esm5/internal/scheduled/schedulePromise.js");
/* harmony import */ var _scheduleArray__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./scheduleArray */ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleArray.js");
/* harmony import */ var _scheduleIterable__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ./scheduleIterable */ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleIterable.js");
/* harmony import */ var _scheduleAsyncIterable__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./scheduleAsyncIterable */ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleAsyncIterable.js");
/* harmony import */ var _util_isInteropObservable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/isInteropObservable */ "./node_modules/rxjs/dist/esm5/internal/util/isInteropObservable.js");
/* harmony import */ var _util_isPromise__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../util/isPromise */ "./node_modules/rxjs/dist/esm5/internal/util/isPromise.js");
/* harmony import */ var _util_isArrayLike__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/isArrayLike */ "./node_modules/rxjs/dist/esm5/internal/util/isArrayLike.js");
/* harmony import */ var _util_isIterable__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../util/isIterable */ "./node_modules/rxjs/dist/esm5/internal/util/isIterable.js");
/* harmony import */ var _util_isAsyncIterable__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../util/isAsyncIterable */ "./node_modules/rxjs/dist/esm5/internal/util/isAsyncIterable.js");
/* harmony import */ var _util_throwUnobservableError__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../util/throwUnobservableError */ "./node_modules/rxjs/dist/esm5/internal/util/throwUnobservableError.js");
/* harmony import */ var _util_isReadableStreamLike__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../util/isReadableStreamLike */ "./node_modules/rxjs/dist/esm5/internal/util/isReadableStreamLike.js");
/* harmony import */ var _scheduleReadableStreamLike__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ./scheduleReadableStreamLike */ "./node_modules/rxjs/dist/esm5/internal/scheduled/scheduleReadableStreamLike.js");













function scheduled(input, scheduler) {
    if (input != null) {
        if ((0,_util_isInteropObservable__WEBPACK_IMPORTED_MODULE_0__.isInteropObservable)(input)) {
            return (0,_scheduleObservable__WEBPACK_IMPORTED_MODULE_1__.scheduleObservable)(input, scheduler);
        }
        if ((0,_util_isArrayLike__WEBPACK_IMPORTED_MODULE_2__.isArrayLike)(input)) {
            return (0,_scheduleArray__WEBPACK_IMPORTED_MODULE_3__.scheduleArray)(input, scheduler);
        }
        if ((0,_util_isPromise__WEBPACK_IMPORTED_MODULE_4__.isPromise)(input)) {
            return (0,_schedulePromise__WEBPACK_IMPORTED_MODULE_5__.schedulePromise)(input, scheduler);
        }
        if ((0,_util_isAsyncIterable__WEBPACK_IMPORTED_MODULE_6__.isAsyncIterable)(input)) {
            return (0,_scheduleAsyncIterable__WEBPACK_IMPORTED_MODULE_7__.scheduleAsyncIterable)(input, scheduler);
        }
        if ((0,_util_isIterable__WEBPACK_IMPORTED_MODULE_8__.isIterable)(input)) {
            return (0,_scheduleIterable__WEBPACK_IMPORTED_MODULE_9__.scheduleIterable)(input, scheduler);
        }
        if ((0,_util_isReadableStreamLike__WEBPACK_IMPORTED_MODULE_10__.isReadableStreamLike)(input)) {
            return (0,_scheduleReadableStreamLike__WEBPACK_IMPORTED_MODULE_11__.scheduleReadableStreamLike)(input, scheduler);
        }
    }
    throw (0,_util_throwUnobservableError__WEBPACK_IMPORTED_MODULE_12__.createInvalidObservableTypeError)(input);
}
//# sourceMappingURL=scheduled.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/Action.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/Action.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Action": () => (/* binding */ Action)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");


var Action = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(Action, _super);
    function Action(scheduler, work) {
        return _super.call(this) || this;
    }
    Action.prototype.schedule = function (state, delay) {
        if (delay === void 0) { delay = 0; }
        return this;
    };
    return Action;
}(_Subscription__WEBPACK_IMPORTED_MODULE_1__.Subscription));

//# sourceMappingURL=Action.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/AnimationFrameAction.js":
/*!********************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/AnimationFrameAction.js ***!
  \********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AnimationFrameAction": () => (/* binding */ AnimationFrameAction)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _AsyncAction__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./AsyncAction */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncAction.js");
/* harmony import */ var _animationFrameProvider__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./animationFrameProvider */ "./node_modules/rxjs/dist/esm5/internal/scheduler/animationFrameProvider.js");



var AnimationFrameAction = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(AnimationFrameAction, _super);
    function AnimationFrameAction(scheduler, work) {
        var _this = _super.call(this, scheduler, work) || this;
        _this.scheduler = scheduler;
        _this.work = work;
        return _this;
    }
    AnimationFrameAction.prototype.requestAsyncId = function (scheduler, id, delay) {
        if (delay === void 0) { delay = 0; }
        if (delay !== null && delay > 0) {
            return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
        }
        scheduler.actions.push(this);
        return scheduler._scheduled || (scheduler._scheduled = _animationFrameProvider__WEBPACK_IMPORTED_MODULE_1__.animationFrameProvider.requestAnimationFrame(function () { return scheduler.flush(undefined); }));
    };
    AnimationFrameAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
        if (delay === void 0) { delay = 0; }
        if ((delay != null && delay > 0) || (delay == null && this.delay > 0)) {
            return _super.prototype.recycleAsyncId.call(this, scheduler, id, delay);
        }
        if (scheduler.actions.length === 0) {
            _animationFrameProvider__WEBPACK_IMPORTED_MODULE_1__.animationFrameProvider.cancelAnimationFrame(id);
            scheduler._scheduled = undefined;
        }
        return undefined;
    };
    return AnimationFrameAction;
}(_AsyncAction__WEBPACK_IMPORTED_MODULE_2__.AsyncAction));

//# sourceMappingURL=AnimationFrameAction.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/AnimationFrameScheduler.js":
/*!***********************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/AnimationFrameScheduler.js ***!
  \***********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AnimationFrameScheduler": () => (/* binding */ AnimationFrameScheduler)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _AsyncScheduler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AsyncScheduler */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncScheduler.js");


var AnimationFrameScheduler = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(AnimationFrameScheduler, _super);
    function AnimationFrameScheduler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AnimationFrameScheduler.prototype.flush = function (action) {
        this._active = true;
        this._scheduled = undefined;
        var actions = this.actions;
        var error;
        var index = -1;
        action = action || actions.shift();
        var count = actions.length;
        do {
            if ((error = action.execute(action.state, action.delay))) {
                break;
            }
        } while (++index < count && (action = actions.shift()));
        this._active = false;
        if (error) {
            while (++index < count && (action = actions.shift())) {
                action.unsubscribe();
            }
            throw error;
        }
    };
    return AnimationFrameScheduler;
}(_AsyncScheduler__WEBPACK_IMPORTED_MODULE_1__.AsyncScheduler));

//# sourceMappingURL=AnimationFrameScheduler.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsapAction.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/AsapAction.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AsapAction": () => (/* binding */ AsapAction)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _AsyncAction__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./AsyncAction */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncAction.js");
/* harmony import */ var _immediateProvider__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./immediateProvider */ "./node_modules/rxjs/dist/esm5/internal/scheduler/immediateProvider.js");



var AsapAction = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(AsapAction, _super);
    function AsapAction(scheduler, work) {
        var _this = _super.call(this, scheduler, work) || this;
        _this.scheduler = scheduler;
        _this.work = work;
        return _this;
    }
    AsapAction.prototype.requestAsyncId = function (scheduler, id, delay) {
        if (delay === void 0) { delay = 0; }
        if (delay !== null && delay > 0) {
            return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
        }
        scheduler.actions.push(this);
        return scheduler._scheduled || (scheduler._scheduled = _immediateProvider__WEBPACK_IMPORTED_MODULE_1__.immediateProvider.setImmediate(scheduler.flush.bind(scheduler, undefined)));
    };
    AsapAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
        if (delay === void 0) { delay = 0; }
        if ((delay != null && delay > 0) || (delay == null && this.delay > 0)) {
            return _super.prototype.recycleAsyncId.call(this, scheduler, id, delay);
        }
        if (scheduler.actions.length === 0) {
            _immediateProvider__WEBPACK_IMPORTED_MODULE_1__.immediateProvider.clearImmediate(id);
            scheduler._scheduled = undefined;
        }
        return undefined;
    };
    return AsapAction;
}(_AsyncAction__WEBPACK_IMPORTED_MODULE_2__.AsyncAction));

//# sourceMappingURL=AsapAction.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsapScheduler.js":
/*!*************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/AsapScheduler.js ***!
  \*************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AsapScheduler": () => (/* binding */ AsapScheduler)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _AsyncScheduler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AsyncScheduler */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncScheduler.js");


var AsapScheduler = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(AsapScheduler, _super);
    function AsapScheduler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    AsapScheduler.prototype.flush = function (action) {
        this._active = true;
        this._scheduled = undefined;
        var actions = this.actions;
        var error;
        var index = -1;
        action = action || actions.shift();
        var count = actions.length;
        do {
            if ((error = action.execute(action.state, action.delay))) {
                break;
            }
        } while (++index < count && (action = actions.shift()));
        this._active = false;
        if (error) {
            while (++index < count && (action = actions.shift())) {
                action.unsubscribe();
            }
            throw error;
        }
    };
    return AsapScheduler;
}(_AsyncScheduler__WEBPACK_IMPORTED_MODULE_1__.AsyncScheduler));

//# sourceMappingURL=AsapScheduler.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncAction.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncAction.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AsyncAction": () => (/* binding */ AsyncAction)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Action__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./Action */ "./node_modules/rxjs/dist/esm5/internal/scheduler/Action.js");
/* harmony import */ var _intervalProvider__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./intervalProvider */ "./node_modules/rxjs/dist/esm5/internal/scheduler/intervalProvider.js");
/* harmony import */ var _util_arrRemove__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../util/arrRemove */ "./node_modules/rxjs/dist/esm5/internal/util/arrRemove.js");




var AsyncAction = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(AsyncAction, _super);
    function AsyncAction(scheduler, work) {
        var _this = _super.call(this, scheduler, work) || this;
        _this.scheduler = scheduler;
        _this.work = work;
        _this.pending = false;
        return _this;
    }
    AsyncAction.prototype.schedule = function (state, delay) {
        if (delay === void 0) { delay = 0; }
        if (this.closed) {
            return this;
        }
        this.state = state;
        var id = this.id;
        var scheduler = this.scheduler;
        if (id != null) {
            this.id = this.recycleAsyncId(scheduler, id, delay);
        }
        this.pending = true;
        this.delay = delay;
        this.id = this.id || this.requestAsyncId(scheduler, this.id, delay);
        return this;
    };
    AsyncAction.prototype.requestAsyncId = function (scheduler, _id, delay) {
        if (delay === void 0) { delay = 0; }
        return _intervalProvider__WEBPACK_IMPORTED_MODULE_1__.intervalProvider.setInterval(scheduler.flush.bind(scheduler, this), delay);
    };
    AsyncAction.prototype.recycleAsyncId = function (_scheduler, id, delay) {
        if (delay === void 0) { delay = 0; }
        if (delay != null && this.delay === delay && this.pending === false) {
            return id;
        }
        _intervalProvider__WEBPACK_IMPORTED_MODULE_1__.intervalProvider.clearInterval(id);
        return undefined;
    };
    AsyncAction.prototype.execute = function (state, delay) {
        if (this.closed) {
            return new Error('executing a cancelled action');
        }
        this.pending = false;
        var error = this._execute(state, delay);
        if (error) {
            return error;
        }
        else if (this.pending === false && this.id != null) {
            this.id = this.recycleAsyncId(this.scheduler, this.id, null);
        }
    };
    AsyncAction.prototype._execute = function (state, _delay) {
        var errored = false;
        var errorValue;
        try {
            this.work(state);
        }
        catch (e) {
            errored = true;
            errorValue = (!!e && e) || new Error(e);
        }
        if (errored) {
            this.unsubscribe();
            return errorValue;
        }
    };
    AsyncAction.prototype.unsubscribe = function () {
        if (!this.closed) {
            var _a = this, id = _a.id, scheduler = _a.scheduler;
            var actions = scheduler.actions;
            this.work = this.state = this.scheduler = null;
            this.pending = false;
            (0,_util_arrRemove__WEBPACK_IMPORTED_MODULE_2__.arrRemove)(actions, this);
            if (id != null) {
                this.id = this.recycleAsyncId(scheduler, id, null);
            }
            this.delay = null;
            _super.prototype.unsubscribe.call(this);
        }
    };
    return AsyncAction;
}(_Action__WEBPACK_IMPORTED_MODULE_3__.Action));

//# sourceMappingURL=AsyncAction.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncScheduler.js":
/*!**************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncScheduler.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "AsyncScheduler": () => (/* binding */ AsyncScheduler)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Scheduler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../Scheduler */ "./node_modules/rxjs/dist/esm5/internal/Scheduler.js");


var AsyncScheduler = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(AsyncScheduler, _super);
    function AsyncScheduler(SchedulerAction, now) {
        if (now === void 0) { now = _Scheduler__WEBPACK_IMPORTED_MODULE_1__.Scheduler.now; }
        var _this = _super.call(this, SchedulerAction, now) || this;
        _this.actions = [];
        _this._active = false;
        _this._scheduled = undefined;
        return _this;
    }
    AsyncScheduler.prototype.flush = function (action) {
        var actions = this.actions;
        if (this._active) {
            actions.push(action);
            return;
        }
        var error;
        this._active = true;
        do {
            if ((error = action.execute(action.state, action.delay))) {
                break;
            }
        } while ((action = actions.shift()));
        this._active = false;
        if (error) {
            while ((action = actions.shift())) {
                action.unsubscribe();
            }
            throw error;
        }
    };
    return AsyncScheduler;
}(_Scheduler__WEBPACK_IMPORTED_MODULE_1__.Scheduler));

//# sourceMappingURL=AsyncScheduler.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/QueueAction.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/QueueAction.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "QueueAction": () => (/* binding */ QueueAction)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _AsyncAction__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AsyncAction */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncAction.js");


var QueueAction = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(QueueAction, _super);
    function QueueAction(scheduler, work) {
        var _this = _super.call(this, scheduler, work) || this;
        _this.scheduler = scheduler;
        _this.work = work;
        return _this;
    }
    QueueAction.prototype.schedule = function (state, delay) {
        if (delay === void 0) { delay = 0; }
        if (delay > 0) {
            return _super.prototype.schedule.call(this, state, delay);
        }
        this.delay = delay;
        this.state = state;
        this.scheduler.flush(this);
        return this;
    };
    QueueAction.prototype.execute = function (state, delay) {
        return (delay > 0 || this.closed) ?
            _super.prototype.execute.call(this, state, delay) :
            this._execute(state, delay);
    };
    QueueAction.prototype.requestAsyncId = function (scheduler, id, delay) {
        if (delay === void 0) { delay = 0; }
        if ((delay != null && delay > 0) || (delay == null && this.delay > 0)) {
            return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
        }
        return scheduler.flush(this);
    };
    return QueueAction;
}(_AsyncAction__WEBPACK_IMPORTED_MODULE_1__.AsyncAction));

//# sourceMappingURL=QueueAction.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/QueueScheduler.js":
/*!**************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/QueueScheduler.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "QueueScheduler": () => (/* binding */ QueueScheduler)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _AsyncScheduler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AsyncScheduler */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncScheduler.js");


var QueueScheduler = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(QueueScheduler, _super);
    function QueueScheduler() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    return QueueScheduler;
}(_AsyncScheduler__WEBPACK_IMPORTED_MODULE_1__.AsyncScheduler));

//# sourceMappingURL=QueueScheduler.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/VirtualTimeScheduler.js":
/*!********************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/VirtualTimeScheduler.js ***!
  \********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "VirtualTimeScheduler": () => (/* binding */ VirtualTimeScheduler),
/* harmony export */   "VirtualAction": () => (/* binding */ VirtualAction)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _AsyncAction__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./AsyncAction */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncAction.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");
/* harmony import */ var _AsyncScheduler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AsyncScheduler */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncScheduler.js");




var VirtualTimeScheduler = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(VirtualTimeScheduler, _super);
    function VirtualTimeScheduler(schedulerActionCtor, maxFrames) {
        if (schedulerActionCtor === void 0) { schedulerActionCtor = VirtualAction; }
        if (maxFrames === void 0) { maxFrames = Infinity; }
        var _this = _super.call(this, schedulerActionCtor, function () { return _this.frame; }) || this;
        _this.maxFrames = maxFrames;
        _this.frame = 0;
        _this.index = -1;
        return _this;
    }
    VirtualTimeScheduler.prototype.flush = function () {
        var _a = this, actions = _a.actions, maxFrames = _a.maxFrames;
        var error;
        var action;
        while ((action = actions[0]) && action.delay <= maxFrames) {
            actions.shift();
            this.frame = action.delay;
            if ((error = action.execute(action.state, action.delay))) {
                break;
            }
        }
        if (error) {
            while ((action = actions.shift())) {
                action.unsubscribe();
            }
            throw error;
        }
    };
    VirtualTimeScheduler.frameTimeFactor = 10;
    return VirtualTimeScheduler;
}(_AsyncScheduler__WEBPACK_IMPORTED_MODULE_1__.AsyncScheduler));

var VirtualAction = (function (_super) {
    (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__extends)(VirtualAction, _super);
    function VirtualAction(scheduler, work, index) {
        if (index === void 0) { index = (scheduler.index += 1); }
        var _this = _super.call(this, scheduler, work) || this;
        _this.scheduler = scheduler;
        _this.work = work;
        _this.index = index;
        _this.active = true;
        _this.index = scheduler.index = index;
        return _this;
    }
    VirtualAction.prototype.schedule = function (state, delay) {
        if (delay === void 0) { delay = 0; }
        if (Number.isFinite(delay)) {
            if (!this.id) {
                return _super.prototype.schedule.call(this, state, delay);
            }
            this.active = false;
            var action = new VirtualAction(this.scheduler, this.work);
            this.add(action);
            return action.schedule(state, delay);
        }
        else {
            return _Subscription__WEBPACK_IMPORTED_MODULE_2__.Subscription.EMPTY;
        }
    };
    VirtualAction.prototype.requestAsyncId = function (scheduler, id, delay) {
        if (delay === void 0) { delay = 0; }
        this.delay = scheduler.frame + delay;
        var actions = scheduler.actions;
        actions.push(this);
        actions.sort(VirtualAction.sortActions);
        return true;
    };
    VirtualAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
        if (delay === void 0) { delay = 0; }
        return undefined;
    };
    VirtualAction.prototype._execute = function (state, delay) {
        if (this.active === true) {
            return _super.prototype._execute.call(this, state, delay);
        }
    };
    VirtualAction.sortActions = function (a, b) {
        if (a.delay === b.delay) {
            if (a.index === b.index) {
                return 0;
            }
            else if (a.index > b.index) {
                return 1;
            }
            else {
                return -1;
            }
        }
        else if (a.delay > b.delay) {
            return 1;
        }
        else {
            return -1;
        }
    };
    return VirtualAction;
}(_AsyncAction__WEBPACK_IMPORTED_MODULE_3__.AsyncAction));

//# sourceMappingURL=VirtualTimeScheduler.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/animationFrame.js":
/*!**************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/animationFrame.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "animationFrameScheduler": () => (/* binding */ animationFrameScheduler),
/* harmony export */   "animationFrame": () => (/* binding */ animationFrame)
/* harmony export */ });
/* harmony import */ var _AnimationFrameAction__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AnimationFrameAction */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AnimationFrameAction.js");
/* harmony import */ var _AnimationFrameScheduler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AnimationFrameScheduler */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AnimationFrameScheduler.js");


var animationFrameScheduler = new _AnimationFrameScheduler__WEBPACK_IMPORTED_MODULE_0__.AnimationFrameScheduler(_AnimationFrameAction__WEBPACK_IMPORTED_MODULE_1__.AnimationFrameAction);
var animationFrame = animationFrameScheduler;
//# sourceMappingURL=animationFrame.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/animationFrameProvider.js":
/*!**********************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/animationFrameProvider.js ***!
  \**********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "animationFrameProvider": () => (/* binding */ animationFrameProvider)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _Subscription__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Subscription */ "./node_modules/rxjs/dist/esm5/internal/Subscription.js");


var animationFrameProvider = {
    schedule: function (callback) {
        var request = requestAnimationFrame;
        var cancel = cancelAnimationFrame;
        var delegate = animationFrameProvider.delegate;
        if (delegate) {
            request = delegate.requestAnimationFrame;
            cancel = delegate.cancelAnimationFrame;
        }
        var handle = request(function (timestamp) {
            cancel = undefined;
            callback(timestamp);
        });
        return new _Subscription__WEBPACK_IMPORTED_MODULE_0__.Subscription(function () { return cancel === null || cancel === void 0 ? void 0 : cancel(handle); });
    },
    requestAnimationFrame: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var delegate = animationFrameProvider.delegate;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.requestAnimationFrame) || requestAnimationFrame).apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__read)(args)));
    },
    cancelAnimationFrame: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var delegate = animationFrameProvider.delegate;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.cancelAnimationFrame) || cancelAnimationFrame).apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__read)(args)));
    },
    delegate: undefined,
};
//# sourceMappingURL=animationFrameProvider.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/asap.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/asap.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "asapScheduler": () => (/* binding */ asapScheduler),
/* harmony export */   "asap": () => (/* binding */ asap)
/* harmony export */ });
/* harmony import */ var _AsapAction__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AsapAction */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsapAction.js");
/* harmony import */ var _AsapScheduler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AsapScheduler */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsapScheduler.js");


var asapScheduler = new _AsapScheduler__WEBPACK_IMPORTED_MODULE_0__.AsapScheduler(_AsapAction__WEBPACK_IMPORTED_MODULE_1__.AsapAction);
var asap = asapScheduler;
//# sourceMappingURL=asap.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/async.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/async.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "asyncScheduler": () => (/* binding */ asyncScheduler),
/* harmony export */   "async": () => (/* binding */ async)
/* harmony export */ });
/* harmony import */ var _AsyncAction__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./AsyncAction */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncAction.js");
/* harmony import */ var _AsyncScheduler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./AsyncScheduler */ "./node_modules/rxjs/dist/esm5/internal/scheduler/AsyncScheduler.js");


var asyncScheduler = new _AsyncScheduler__WEBPACK_IMPORTED_MODULE_0__.AsyncScheduler(_AsyncAction__WEBPACK_IMPORTED_MODULE_1__.AsyncAction);
var async = asyncScheduler;
//# sourceMappingURL=async.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/dateTimestampProvider.js":
/*!*********************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/dateTimestampProvider.js ***!
  \*********************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "dateTimestampProvider": () => (/* binding */ dateTimestampProvider)
/* harmony export */ });
var dateTimestampProvider = {
    now: function () {
        return (dateTimestampProvider.delegate || Date).now();
    },
    delegate: undefined,
};
//# sourceMappingURL=dateTimestampProvider.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/immediateProvider.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/immediateProvider.js ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "immediateProvider": () => (/* binding */ immediateProvider)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _util_Immediate__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../util/Immediate */ "./node_modules/rxjs/dist/esm5/internal/util/Immediate.js");


var setImmediate = _util_Immediate__WEBPACK_IMPORTED_MODULE_0__.Immediate.setImmediate, clearImmediate = _util_Immediate__WEBPACK_IMPORTED_MODULE_0__.Immediate.clearImmediate;
var immediateProvider = {
    setImmediate: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var delegate = immediateProvider.delegate;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.setImmediate) || setImmediate).apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_1__.__read)(args)));
    },
    clearImmediate: function (handle) {
        var delegate = immediateProvider.delegate;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearImmediate) || clearImmediate)(handle);
    },
    delegate: undefined,
};
//# sourceMappingURL=immediateProvider.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/intervalProvider.js":
/*!****************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/intervalProvider.js ***!
  \****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "intervalProvider": () => (/* binding */ intervalProvider)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");

var intervalProvider = {
    setInterval: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var delegate = intervalProvider.delegate;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.setInterval) || setInterval).apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__read)(args)));
    },
    clearInterval: function (handle) {
        var delegate = intervalProvider.delegate;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearInterval) || clearInterval)(handle);
    },
    delegate: undefined,
};
//# sourceMappingURL=intervalProvider.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/performanceTimestampProvider.js":
/*!****************************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/performanceTimestampProvider.js ***!
  \****************************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "performanceTimestampProvider": () => (/* binding */ performanceTimestampProvider)
/* harmony export */ });
var performanceTimestampProvider = {
    now: function () {
        return (performanceTimestampProvider.delegate || performance).now();
    },
    delegate: undefined,
};
//# sourceMappingURL=performanceTimestampProvider.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/queue.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/queue.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "queueScheduler": () => (/* binding */ queueScheduler),
/* harmony export */   "queue": () => (/* binding */ queue)
/* harmony export */ });
/* harmony import */ var _QueueAction__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./QueueAction */ "./node_modules/rxjs/dist/esm5/internal/scheduler/QueueAction.js");
/* harmony import */ var _QueueScheduler__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./QueueScheduler */ "./node_modules/rxjs/dist/esm5/internal/scheduler/QueueScheduler.js");


var queueScheduler = new _QueueScheduler__WEBPACK_IMPORTED_MODULE_0__.QueueScheduler(_QueueAction__WEBPACK_IMPORTED_MODULE_1__.QueueAction);
var queue = queueScheduler;
//# sourceMappingURL=queue.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/scheduler/timeoutProvider.js":
/*!***************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/scheduler/timeoutProvider.js ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "timeoutProvider": () => (/* binding */ timeoutProvider)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");

var timeoutProvider = {
    setTimeout: function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var delegate = timeoutProvider.delegate;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.setTimeout) || setTimeout).apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__read)(args)));
    },
    clearTimeout: function (handle) {
        var delegate = timeoutProvider.delegate;
        return ((delegate === null || delegate === void 0 ? void 0 : delegate.clearTimeout) || clearTimeout)(handle);
    },
    delegate: undefined,
};
//# sourceMappingURL=timeoutProvider.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/symbol/iterator.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/symbol/iterator.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "getSymbolIterator": () => (/* binding */ getSymbolIterator),
/* harmony export */   "iterator": () => (/* binding */ iterator)
/* harmony export */ });
function getSymbolIterator() {
    if (typeof Symbol !== 'function' || !Symbol.iterator) {
        return '@@iterator';
    }
    return Symbol.iterator;
}
var iterator = getSymbolIterator();
//# sourceMappingURL=iterator.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/symbol/observable.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/symbol/observable.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "observable": () => (/* binding */ observable)
/* harmony export */ });
var observable = (function () { return (typeof Symbol === 'function' && Symbol.observable) || '@@observable'; })();
//# sourceMappingURL=observable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/ArgumentOutOfRangeError.js":
/*!******************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/ArgumentOutOfRangeError.js ***!
  \******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ArgumentOutOfRangeError": () => (/* binding */ ArgumentOutOfRangeError)
/* harmony export */ });
/* harmony import */ var _createErrorClass__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./createErrorClass */ "./node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js");

var ArgumentOutOfRangeError = (0,_createErrorClass__WEBPACK_IMPORTED_MODULE_0__.createErrorClass)(function (_super) {
    return function ArgumentOutOfRangeErrorImpl() {
        _super(this);
        this.name = 'ArgumentOutOfRangeError';
        this.message = 'argument out of range';
    };
});
//# sourceMappingURL=ArgumentOutOfRangeError.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/EmptyError.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/EmptyError.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "EmptyError": () => (/* binding */ EmptyError)
/* harmony export */ });
/* harmony import */ var _createErrorClass__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./createErrorClass */ "./node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js");

var EmptyError = (0,_createErrorClass__WEBPACK_IMPORTED_MODULE_0__.createErrorClass)(function (_super) { return function EmptyErrorImpl() {
    _super(this);
    this.name = 'EmptyError';
    this.message = 'no elements in sequence';
}; });
//# sourceMappingURL=EmptyError.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/Immediate.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/Immediate.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "Immediate": () => (/* binding */ Immediate),
/* harmony export */   "TestTools": () => (/* binding */ TestTools)
/* harmony export */ });
var nextHandle = 1;
var resolved;
var activeHandles = {};
function findAndClearHandle(handle) {
    if (handle in activeHandles) {
        delete activeHandles[handle];
        return true;
    }
    return false;
}
var Immediate = {
    setImmediate: function (cb) {
        var handle = nextHandle++;
        activeHandles[handle] = true;
        if (!resolved) {
            resolved = Promise.resolve();
        }
        resolved.then(function () { return findAndClearHandle(handle) && cb(); });
        return handle;
    },
    clearImmediate: function (handle) {
        findAndClearHandle(handle);
    },
};
var TestTools = {
    pending: function () {
        return Object.keys(activeHandles).length;
    }
};
//# sourceMappingURL=Immediate.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/NotFoundError.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/NotFoundError.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NotFoundError": () => (/* binding */ NotFoundError)
/* harmony export */ });
/* harmony import */ var _createErrorClass__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./createErrorClass */ "./node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js");

var NotFoundError = (0,_createErrorClass__WEBPACK_IMPORTED_MODULE_0__.createErrorClass)(function (_super) {
    return function NotFoundErrorImpl(message) {
        _super(this);
        this.name = 'NotFoundError';
        this.message = message;
    };
});
//# sourceMappingURL=NotFoundError.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/ObjectUnsubscribedError.js":
/*!******************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/ObjectUnsubscribedError.js ***!
  \******************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "ObjectUnsubscribedError": () => (/* binding */ ObjectUnsubscribedError)
/* harmony export */ });
/* harmony import */ var _createErrorClass__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./createErrorClass */ "./node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js");

var ObjectUnsubscribedError = (0,_createErrorClass__WEBPACK_IMPORTED_MODULE_0__.createErrorClass)(function (_super) {
    return function ObjectUnsubscribedErrorImpl() {
        _super(this);
        this.name = 'ObjectUnsubscribedError';
        this.message = 'object unsubscribed';
    };
});
//# sourceMappingURL=ObjectUnsubscribedError.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/SequenceError.js":
/*!********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/SequenceError.js ***!
  \********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "SequenceError": () => (/* binding */ SequenceError)
/* harmony export */ });
/* harmony import */ var _createErrorClass__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./createErrorClass */ "./node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js");

var SequenceError = (0,_createErrorClass__WEBPACK_IMPORTED_MODULE_0__.createErrorClass)(function (_super) {
    return function SequenceErrorImpl(message) {
        _super(this);
        this.name = 'SequenceError';
        this.message = message;
    };
});
//# sourceMappingURL=SequenceError.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/UnsubscriptionError.js":
/*!**************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/UnsubscriptionError.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "UnsubscriptionError": () => (/* binding */ UnsubscriptionError)
/* harmony export */ });
/* harmony import */ var _createErrorClass__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./createErrorClass */ "./node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js");

var UnsubscriptionError = (0,_createErrorClass__WEBPACK_IMPORTED_MODULE_0__.createErrorClass)(function (_super) {
    return function UnsubscriptionErrorImpl(errors) {
        _super(this);
        this.message = errors
            ? errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) { return i + 1 + ") " + err.toString(); }).join('\n  ')
            : '';
        this.name = 'UnsubscriptionError';
        this.errors = errors;
    };
});
//# sourceMappingURL=UnsubscriptionError.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/args.js":
/*!***********************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/args.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "popResultSelector": () => (/* binding */ popResultSelector),
/* harmony export */   "popScheduler": () => (/* binding */ popScheduler),
/* harmony export */   "popNumber": () => (/* binding */ popNumber)
/* harmony export */ });
/* harmony import */ var _isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");
/* harmony import */ var _isScheduler__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./isScheduler */ "./node_modules/rxjs/dist/esm5/internal/util/isScheduler.js");


function last(arr) {
    return arr[arr.length - 1];
}
function popResultSelector(args) {
    return (0,_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(last(args)) ? args.pop() : undefined;
}
function popScheduler(args) {
    return (0,_isScheduler__WEBPACK_IMPORTED_MODULE_1__.isScheduler)(last(args)) ? args.pop() : undefined;
}
function popNumber(args, defaultValue) {
    return typeof last(args) === 'number' ? args.pop() : defaultValue;
}
//# sourceMappingURL=args.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/argsArgArrayOrObject.js":
/*!***************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/argsArgArrayOrObject.js ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "argsArgArrayOrObject": () => (/* binding */ argsArgArrayOrObject)
/* harmony export */ });
var isArray = Array.isArray;
var getPrototypeOf = Object.getPrototypeOf, objectProto = Object.prototype, getKeys = Object.keys;
function argsArgArrayOrObject(args) {
    if (args.length === 1) {
        var first_1 = args[0];
        if (isArray(first_1)) {
            return { args: first_1, keys: null };
        }
        if (isPOJO(first_1)) {
            var keys = getKeys(first_1);
            return {
                args: keys.map(function (key) { return first_1[key]; }),
                keys: keys,
            };
        }
    }
    return { args: args, keys: null };
}
function isPOJO(obj) {
    return obj && typeof obj === 'object' && getPrototypeOf(obj) === objectProto;
}
//# sourceMappingURL=argsArgArrayOrObject.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/argsOrArgArray.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/argsOrArgArray.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "argsOrArgArray": () => (/* binding */ argsOrArgArray)
/* harmony export */ });
var isArray = Array.isArray;
function argsOrArgArray(args) {
    return args.length === 1 && isArray(args[0]) ? args[0] : args;
}
//# sourceMappingURL=argsOrArgArray.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/arrRemove.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/arrRemove.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "arrRemove": () => (/* binding */ arrRemove)
/* harmony export */ });
function arrRemove(arr, item) {
    if (arr) {
        var index = arr.indexOf(item);
        0 <= index && arr.splice(index, 1);
    }
}
//# sourceMappingURL=arrRemove.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/caughtSchedule.js":
/*!*********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/caughtSchedule.js ***!
  \*********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "caughtSchedule": () => (/* binding */ caughtSchedule)
/* harmony export */ });
function caughtSchedule(subscriber, scheduler, execute, delay) {
    if (delay === void 0) { delay = 0; }
    var subscription = scheduler.schedule(function () {
        try {
            execute.call(this);
        }
        catch (err) {
            subscriber.error(err);
        }
    }, delay);
    subscriber.add(subscription);
    return subscription;
}
//# sourceMappingURL=caughtSchedule.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/createErrorClass.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createErrorClass": () => (/* binding */ createErrorClass)
/* harmony export */ });
function createErrorClass(createImpl) {
    var _super = function (instance) {
        Error.call(instance);
        instance.stack = new Error().stack;
    };
    var ctorFunc = createImpl(_super);
    ctorFunc.prototype = Object.create(Error.prototype);
    ctorFunc.prototype.constructor = ctorFunc;
    return ctorFunc;
}
//# sourceMappingURL=createErrorClass.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/createObject.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/createObject.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createObject": () => (/* binding */ createObject)
/* harmony export */ });
function createObject(keys, values) {
    return keys.reduce(function (result, key, i) { return ((result[key] = values[i]), result); }, {});
}
//# sourceMappingURL=createObject.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/identity.js":
/*!***************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/identity.js ***!
  \***************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "identity": () => (/* binding */ identity)
/* harmony export */ });
function identity(x) {
    return x;
}
//# sourceMappingURL=identity.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/isArrayLike.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/isArrayLike.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isArrayLike": () => (/* binding */ isArrayLike)
/* harmony export */ });
var isArrayLike = (function (x) { return x && typeof x.length === 'number' && typeof x !== 'function'; });
//# sourceMappingURL=isArrayLike.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/isAsyncIterable.js":
/*!**********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/isAsyncIterable.js ***!
  \**********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isAsyncIterable": () => (/* binding */ isAsyncIterable)
/* harmony export */ });
/* harmony import */ var _isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");

function isAsyncIterable(obj) {
    return Symbol.asyncIterator && (0,_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(obj === null || obj === void 0 ? void 0 : obj[Symbol.asyncIterator]);
}
//# sourceMappingURL=isAsyncIterable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/isDate.js":
/*!*************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/isDate.js ***!
  \*************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isValidDate": () => (/* binding */ isValidDate)
/* harmony export */ });
function isValidDate(value) {
    return value instanceof Date && !isNaN(value);
}
//# sourceMappingURL=isDate.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/isFunction.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isFunction": () => (/* binding */ isFunction)
/* harmony export */ });
function isFunction(value) {
    return typeof value === 'function';
}
//# sourceMappingURL=isFunction.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/isInteropObservable.js":
/*!**************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/isInteropObservable.js ***!
  \**************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isInteropObservable": () => (/* binding */ isInteropObservable)
/* harmony export */ });
/* harmony import */ var _symbol_observable__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../symbol/observable */ "./node_modules/rxjs/dist/esm5/internal/symbol/observable.js");
/* harmony import */ var _isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");


function isInteropObservable(input) {
    return (0,_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(input[_symbol_observable__WEBPACK_IMPORTED_MODULE_1__.observable]);
}
//# sourceMappingURL=isInteropObservable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/isIterable.js":
/*!*****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/isIterable.js ***!
  \*****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isIterable": () => (/* binding */ isIterable)
/* harmony export */ });
/* harmony import */ var _symbol_iterator__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../symbol/iterator */ "./node_modules/rxjs/dist/esm5/internal/symbol/iterator.js");
/* harmony import */ var _isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");


function isIterable(input) {
    return (0,_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(input === null || input === void 0 ? void 0 : input[_symbol_iterator__WEBPACK_IMPORTED_MODULE_1__.iterator]);
}
//# sourceMappingURL=isIterable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/isObservable.js":
/*!*******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/isObservable.js ***!
  \*******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isObservable": () => (/* binding */ isObservable)
/* harmony export */ });
/* harmony import */ var _Observable__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../Observable */ "./node_modules/rxjs/dist/esm5/internal/Observable.js");
/* harmony import */ var _isFunction__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");


function isObservable(obj) {
    return !!obj && (obj instanceof _Observable__WEBPACK_IMPORTED_MODULE_0__.Observable || ((0,_isFunction__WEBPACK_IMPORTED_MODULE_1__.isFunction)(obj.lift) && (0,_isFunction__WEBPACK_IMPORTED_MODULE_1__.isFunction)(obj.subscribe)));
}
//# sourceMappingURL=isObservable.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/isPromise.js":
/*!****************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/isPromise.js ***!
  \****************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isPromise": () => (/* binding */ isPromise)
/* harmony export */ });
/* harmony import */ var _isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");

function isPromise(value) {
    return (0,_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(value === null || value === void 0 ? void 0 : value.then);
}
//# sourceMappingURL=isPromise.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/isReadableStreamLike.js":
/*!***************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/isReadableStreamLike.js ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "readableStreamLikeToAsyncGenerator": () => (/* binding */ readableStreamLikeToAsyncGenerator),
/* harmony export */   "isReadableStreamLike": () => (/* binding */ isReadableStreamLike)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _isFunction__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");


function readableStreamLikeToAsyncGenerator(readableStream) {
    return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__asyncGenerator)(this, arguments, function readableStreamLikeToAsyncGenerator_1() {
        var reader, _a, value, done;
        return (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__generator)(this, function (_b) {
            switch (_b.label) {
                case 0:
                    reader = readableStream.getReader();
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, , 9, 10]);
                    _b.label = 2;
                case 2:
                    if (false) {}
                    return [4, (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__await)(reader.read())];
                case 3:
                    _a = _b.sent(), value = _a.value, done = _a.done;
                    if (!done) return [3, 5];
                    return [4, (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__await)(void 0)];
                case 4: return [2, _b.sent()];
                case 5: return [4, (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__await)(value)];
                case 6: return [4, _b.sent()];
                case 7:
                    _b.sent();
                    return [3, 2];
                case 8: return [3, 10];
                case 9:
                    reader.releaseLock();
                    return [7];
                case 10: return [2];
            }
        });
    });
}
function isReadableStreamLike(obj) {
    return (0,_isFunction__WEBPACK_IMPORTED_MODULE_1__.isFunction)(obj === null || obj === void 0 ? void 0 : obj.getReader);
}
//# sourceMappingURL=isReadableStreamLike.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/isScheduler.js":
/*!******************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/isScheduler.js ***!
  \******************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "isScheduler": () => (/* binding */ isScheduler)
/* harmony export */ });
/* harmony import */ var _isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");

function isScheduler(value) {
    return value && (0,_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(value.schedule);
}
//# sourceMappingURL=isScheduler.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/lift.js":
/*!***********************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/lift.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "hasLift": () => (/* binding */ hasLift),
/* harmony export */   "operate": () => (/* binding */ operate)
/* harmony export */ });
/* harmony import */ var _isFunction__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./isFunction */ "./node_modules/rxjs/dist/esm5/internal/util/isFunction.js");

function hasLift(source) {
    return (0,_isFunction__WEBPACK_IMPORTED_MODULE_0__.isFunction)(source === null || source === void 0 ? void 0 : source.lift);
}
function operate(init) {
    return function (source) {
        if (hasLift(source)) {
            return source.lift(function (liftedSource) {
                try {
                    return init(liftedSource, this);
                }
                catch (err) {
                    this.error(err);
                }
            });
        }
        throw new TypeError('Unable to lift unknown Observable type');
    };
}
//# sourceMappingURL=lift.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js":
/*!***********************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/mapOneOrManyArgs.js ***!
  \***********************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "mapOneOrManyArgs": () => (/* binding */ mapOneOrManyArgs)
/* harmony export */ });
/* harmony import */ var tslib__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! tslib */ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js");
/* harmony import */ var _operators_map__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../operators/map */ "./node_modules/rxjs/dist/esm5/internal/operators/map.js");


var isArray = Array.isArray;
function callOrApply(fn, args) {
    return isArray(args) ? fn.apply(void 0, (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__spreadArray)([], (0,tslib__WEBPACK_IMPORTED_MODULE_0__.__read)(args))) : fn(args);
}
function mapOneOrManyArgs(fn) {
    return (0,_operators_map__WEBPACK_IMPORTED_MODULE_1__.map)(function (args) { return callOrApply(fn, args); });
}
//# sourceMappingURL=mapOneOrManyArgs.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/noop.js":
/*!***********************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/noop.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "noop": () => (/* binding */ noop)
/* harmony export */ });
function noop() { }
//# sourceMappingURL=noop.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/not.js":
/*!**********************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/not.js ***!
  \**********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "not": () => (/* binding */ not)
/* harmony export */ });
function not(pred, thisArg) {
    return function (value, index) { return !pred.call(thisArg, value, index); };
}
//# sourceMappingURL=not.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/pipe.js":
/*!***********************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/pipe.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "pipe": () => (/* binding */ pipe),
/* harmony export */   "pipeFromArray": () => (/* binding */ pipeFromArray)
/* harmony export */ });
/* harmony import */ var _identity__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./identity */ "./node_modules/rxjs/dist/esm5/internal/util/identity.js");

function pipe() {
    var fns = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        fns[_i] = arguments[_i];
    }
    return pipeFromArray(fns);
}
function pipeFromArray(fns) {
    if (fns.length === 0) {
        return _identity__WEBPACK_IMPORTED_MODULE_0__.identity;
    }
    if (fns.length === 1) {
        return fns[0];
    }
    return function piped(input) {
        return fns.reduce(function (prev, fn) { return fn(prev); }, input);
    };
}
//# sourceMappingURL=pipe.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/reportUnhandledError.js":
/*!***************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/reportUnhandledError.js ***!
  \***************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "reportUnhandledError": () => (/* binding */ reportUnhandledError)
/* harmony export */ });
/* harmony import */ var _config__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../config */ "./node_modules/rxjs/dist/esm5/internal/config.js");
/* harmony import */ var _scheduler_timeoutProvider__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../scheduler/timeoutProvider */ "./node_modules/rxjs/dist/esm5/internal/scheduler/timeoutProvider.js");


function reportUnhandledError(err) {
    _scheduler_timeoutProvider__WEBPACK_IMPORTED_MODULE_0__.timeoutProvider.setTimeout(function () {
        var onUnhandledError = _config__WEBPACK_IMPORTED_MODULE_1__.config.onUnhandledError;
        if (onUnhandledError) {
            onUnhandledError(err);
        }
        else {
            throw err;
        }
    });
}
//# sourceMappingURL=reportUnhandledError.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/internal/util/throwUnobservableError.js":
/*!*****************************************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/internal/util/throwUnobservableError.js ***!
  \*****************************************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createInvalidObservableTypeError": () => (/* binding */ createInvalidObservableTypeError)
/* harmony export */ });
function createInvalidObservableTypeError(input) {
    return new TypeError("You provided " + (input !== null && typeof input === 'object' ? 'an invalid object' : "'" + input + "'") + " where a stream was expected. You can provide an Observable, Promise, ReadableStream, Array, AsyncIterable, or Iterable.");
}
//# sourceMappingURL=throwUnobservableError.js.map

/***/ }),

/***/ "./node_modules/rxjs/dist/esm5/operators/index.js":
/*!********************************************************!*\
  !*** ./node_modules/rxjs/dist/esm5/operators/index.js ***!
  \********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "audit": () => (/* reexport safe */ _internal_operators_audit__WEBPACK_IMPORTED_MODULE_0__.audit),
/* harmony export */   "auditTime": () => (/* reexport safe */ _internal_operators_auditTime__WEBPACK_IMPORTED_MODULE_1__.auditTime),
/* harmony export */   "buffer": () => (/* reexport safe */ _internal_operators_buffer__WEBPACK_IMPORTED_MODULE_2__.buffer),
/* harmony export */   "bufferCount": () => (/* reexport safe */ _internal_operators_bufferCount__WEBPACK_IMPORTED_MODULE_3__.bufferCount),
/* harmony export */   "bufferTime": () => (/* reexport safe */ _internal_operators_bufferTime__WEBPACK_IMPORTED_MODULE_4__.bufferTime),
/* harmony export */   "bufferToggle": () => (/* reexport safe */ _internal_operators_bufferToggle__WEBPACK_IMPORTED_MODULE_5__.bufferToggle),
/* harmony export */   "bufferWhen": () => (/* reexport safe */ _internal_operators_bufferWhen__WEBPACK_IMPORTED_MODULE_6__.bufferWhen),
/* harmony export */   "catchError": () => (/* reexport safe */ _internal_operators_catchError__WEBPACK_IMPORTED_MODULE_7__.catchError),
/* harmony export */   "combineAll": () => (/* reexport safe */ _internal_operators_combineAll__WEBPACK_IMPORTED_MODULE_8__.combineAll),
/* harmony export */   "combineLatestAll": () => (/* reexport safe */ _internal_operators_combineLatestAll__WEBPACK_IMPORTED_MODULE_9__.combineLatestAll),
/* harmony export */   "combineLatest": () => (/* reexport safe */ _internal_operators_combineLatest__WEBPACK_IMPORTED_MODULE_10__.combineLatest),
/* harmony export */   "combineLatestWith": () => (/* reexport safe */ _internal_operators_combineLatestWith__WEBPACK_IMPORTED_MODULE_11__.combineLatestWith),
/* harmony export */   "concat": () => (/* reexport safe */ _internal_operators_concat__WEBPACK_IMPORTED_MODULE_12__.concat),
/* harmony export */   "concatAll": () => (/* reexport safe */ _internal_operators_concatAll__WEBPACK_IMPORTED_MODULE_13__.concatAll),
/* harmony export */   "concatMap": () => (/* reexport safe */ _internal_operators_concatMap__WEBPACK_IMPORTED_MODULE_14__.concatMap),
/* harmony export */   "concatMapTo": () => (/* reexport safe */ _internal_operators_concatMapTo__WEBPACK_IMPORTED_MODULE_15__.concatMapTo),
/* harmony export */   "concatWith": () => (/* reexport safe */ _internal_operators_concatWith__WEBPACK_IMPORTED_MODULE_16__.concatWith),
/* harmony export */   "connect": () => (/* reexport safe */ _internal_operators_connect__WEBPACK_IMPORTED_MODULE_17__.connect),
/* harmony export */   "count": () => (/* reexport safe */ _internal_operators_count__WEBPACK_IMPORTED_MODULE_18__.count),
/* harmony export */   "debounce": () => (/* reexport safe */ _internal_operators_debounce__WEBPACK_IMPORTED_MODULE_19__.debounce),
/* harmony export */   "debounceTime": () => (/* reexport safe */ _internal_operators_debounceTime__WEBPACK_IMPORTED_MODULE_20__.debounceTime),
/* harmony export */   "defaultIfEmpty": () => (/* reexport safe */ _internal_operators_defaultIfEmpty__WEBPACK_IMPORTED_MODULE_21__.defaultIfEmpty),
/* harmony export */   "delay": () => (/* reexport safe */ _internal_operators_delay__WEBPACK_IMPORTED_MODULE_22__.delay),
/* harmony export */   "delayWhen": () => (/* reexport safe */ _internal_operators_delayWhen__WEBPACK_IMPORTED_MODULE_23__.delayWhen),
/* harmony export */   "dematerialize": () => (/* reexport safe */ _internal_operators_dematerialize__WEBPACK_IMPORTED_MODULE_24__.dematerialize),
/* harmony export */   "distinct": () => (/* reexport safe */ _internal_operators_distinct__WEBPACK_IMPORTED_MODULE_25__.distinct),
/* harmony export */   "distinctUntilChanged": () => (/* reexport safe */ _internal_operators_distinctUntilChanged__WEBPACK_IMPORTED_MODULE_26__.distinctUntilChanged),
/* harmony export */   "distinctUntilKeyChanged": () => (/* reexport safe */ _internal_operators_distinctUntilKeyChanged__WEBPACK_IMPORTED_MODULE_27__.distinctUntilKeyChanged),
/* harmony export */   "elementAt": () => (/* reexport safe */ _internal_operators_elementAt__WEBPACK_IMPORTED_MODULE_28__.elementAt),
/* harmony export */   "endWith": () => (/* reexport safe */ _internal_operators_endWith__WEBPACK_IMPORTED_MODULE_29__.endWith),
/* harmony export */   "every": () => (/* reexport safe */ _internal_operators_every__WEBPACK_IMPORTED_MODULE_30__.every),
/* harmony export */   "exhaust": () => (/* reexport safe */ _internal_operators_exhaust__WEBPACK_IMPORTED_MODULE_31__.exhaust),
/* harmony export */   "exhaustAll": () => (/* reexport safe */ _internal_operators_exhaustAll__WEBPACK_IMPORTED_MODULE_32__.exhaustAll),
/* harmony export */   "exhaustMap": () => (/* reexport safe */ _internal_operators_exhaustMap__WEBPACK_IMPORTED_MODULE_33__.exhaustMap),
/* harmony export */   "expand": () => (/* reexport safe */ _internal_operators_expand__WEBPACK_IMPORTED_MODULE_34__.expand),
/* harmony export */   "filter": () => (/* reexport safe */ _internal_operators_filter__WEBPACK_IMPORTED_MODULE_35__.filter),
/* harmony export */   "finalize": () => (/* reexport safe */ _internal_operators_finalize__WEBPACK_IMPORTED_MODULE_36__.finalize),
/* harmony export */   "find": () => (/* reexport safe */ _internal_operators_find__WEBPACK_IMPORTED_MODULE_37__.find),
/* harmony export */   "findIndex": () => (/* reexport safe */ _internal_operators_findIndex__WEBPACK_IMPORTED_MODULE_38__.findIndex),
/* harmony export */   "first": () => (/* reexport safe */ _internal_operators_first__WEBPACK_IMPORTED_MODULE_39__.first),
/* harmony export */   "groupBy": () => (/* reexport safe */ _internal_operators_groupBy__WEBPACK_IMPORTED_MODULE_40__.groupBy),
/* harmony export */   "ignoreElements": () => (/* reexport safe */ _internal_operators_ignoreElements__WEBPACK_IMPORTED_MODULE_41__.ignoreElements),
/* harmony export */   "isEmpty": () => (/* reexport safe */ _internal_operators_isEmpty__WEBPACK_IMPORTED_MODULE_42__.isEmpty),
/* harmony export */   "last": () => (/* reexport safe */ _internal_operators_last__WEBPACK_IMPORTED_MODULE_43__.last),
/* harmony export */   "map": () => (/* reexport safe */ _internal_operators_map__WEBPACK_IMPORTED_MODULE_44__.map),
/* harmony export */   "mapTo": () => (/* reexport safe */ _internal_operators_mapTo__WEBPACK_IMPORTED_MODULE_45__.mapTo),
/* harmony export */   "materialize": () => (/* reexport safe */ _internal_operators_materialize__WEBPACK_IMPORTED_MODULE_46__.materialize),
/* harmony export */   "max": () => (/* reexport safe */ _internal_operators_max__WEBPACK_IMPORTED_MODULE_47__.max),
/* harmony export */   "merge": () => (/* reexport safe */ _internal_operators_merge__WEBPACK_IMPORTED_MODULE_48__.merge),
/* harmony export */   "mergeAll": () => (/* reexport safe */ _internal_operators_mergeAll__WEBPACK_IMPORTED_MODULE_49__.mergeAll),
/* harmony export */   "flatMap": () => (/* reexport safe */ _internal_operators_flatMap__WEBPACK_IMPORTED_MODULE_50__.flatMap),
/* harmony export */   "mergeMap": () => (/* reexport safe */ _internal_operators_mergeMap__WEBPACK_IMPORTED_MODULE_51__.mergeMap),
/* harmony export */   "mergeMapTo": () => (/* reexport safe */ _internal_operators_mergeMapTo__WEBPACK_IMPORTED_MODULE_52__.mergeMapTo),
/* harmony export */   "mergeScan": () => (/* reexport safe */ _internal_operators_mergeScan__WEBPACK_IMPORTED_MODULE_53__.mergeScan),
/* harmony export */   "mergeWith": () => (/* reexport safe */ _internal_operators_mergeWith__WEBPACK_IMPORTED_MODULE_54__.mergeWith),
/* harmony export */   "min": () => (/* reexport safe */ _internal_operators_min__WEBPACK_IMPORTED_MODULE_55__.min),
/* harmony export */   "multicast": () => (/* reexport safe */ _internal_operators_multicast__WEBPACK_IMPORTED_MODULE_56__.multicast),
/* harmony export */   "observeOn": () => (/* reexport safe */ _internal_operators_observeOn__WEBPACK_IMPORTED_MODULE_57__.observeOn),
/* harmony export */   "onErrorResumeNext": () => (/* reexport safe */ _internal_operators_onErrorResumeNext__WEBPACK_IMPORTED_MODULE_58__.onErrorResumeNext),
/* harmony export */   "pairwise": () => (/* reexport safe */ _internal_operators_pairwise__WEBPACK_IMPORTED_MODULE_59__.pairwise),
/* harmony export */   "partition": () => (/* reexport safe */ _internal_operators_partition__WEBPACK_IMPORTED_MODULE_60__.partition),
/* harmony export */   "pluck": () => (/* reexport safe */ _internal_operators_pluck__WEBPACK_IMPORTED_MODULE_61__.pluck),
/* harmony export */   "publish": () => (/* reexport safe */ _internal_operators_publish__WEBPACK_IMPORTED_MODULE_62__.publish),
/* harmony export */   "publishBehavior": () => (/* reexport safe */ _internal_operators_publishBehavior__WEBPACK_IMPORTED_MODULE_63__.publishBehavior),
/* harmony export */   "publishLast": () => (/* reexport safe */ _internal_operators_publishLast__WEBPACK_IMPORTED_MODULE_64__.publishLast),
/* harmony export */   "publishReplay": () => (/* reexport safe */ _internal_operators_publishReplay__WEBPACK_IMPORTED_MODULE_65__.publishReplay),
/* harmony export */   "race": () => (/* reexport safe */ _internal_operators_race__WEBPACK_IMPORTED_MODULE_66__.race),
/* harmony export */   "raceWith": () => (/* reexport safe */ _internal_operators_raceWith__WEBPACK_IMPORTED_MODULE_67__.raceWith),
/* harmony export */   "reduce": () => (/* reexport safe */ _internal_operators_reduce__WEBPACK_IMPORTED_MODULE_68__.reduce),
/* harmony export */   "repeat": () => (/* reexport safe */ _internal_operators_repeat__WEBPACK_IMPORTED_MODULE_69__.repeat),
/* harmony export */   "repeatWhen": () => (/* reexport safe */ _internal_operators_repeatWhen__WEBPACK_IMPORTED_MODULE_70__.repeatWhen),
/* harmony export */   "retry": () => (/* reexport safe */ _internal_operators_retry__WEBPACK_IMPORTED_MODULE_71__.retry),
/* harmony export */   "retryWhen": () => (/* reexport safe */ _internal_operators_retryWhen__WEBPACK_IMPORTED_MODULE_72__.retryWhen),
/* harmony export */   "refCount": () => (/* reexport safe */ _internal_operators_refCount__WEBPACK_IMPORTED_MODULE_73__.refCount),
/* harmony export */   "sample": () => (/* reexport safe */ _internal_operators_sample__WEBPACK_IMPORTED_MODULE_74__.sample),
/* harmony export */   "sampleTime": () => (/* reexport safe */ _internal_operators_sampleTime__WEBPACK_IMPORTED_MODULE_75__.sampleTime),
/* harmony export */   "scan": () => (/* reexport safe */ _internal_operators_scan__WEBPACK_IMPORTED_MODULE_76__.scan),
/* harmony export */   "sequenceEqual": () => (/* reexport safe */ _internal_operators_sequenceEqual__WEBPACK_IMPORTED_MODULE_77__.sequenceEqual),
/* harmony export */   "share": () => (/* reexport safe */ _internal_operators_share__WEBPACK_IMPORTED_MODULE_78__.share),
/* harmony export */   "shareReplay": () => (/* reexport safe */ _internal_operators_shareReplay__WEBPACK_IMPORTED_MODULE_79__.shareReplay),
/* harmony export */   "single": () => (/* reexport safe */ _internal_operators_single__WEBPACK_IMPORTED_MODULE_80__.single),
/* harmony export */   "skip": () => (/* reexport safe */ _internal_operators_skip__WEBPACK_IMPORTED_MODULE_81__.skip),
/* harmony export */   "skipLast": () => (/* reexport safe */ _internal_operators_skipLast__WEBPACK_IMPORTED_MODULE_82__.skipLast),
/* harmony export */   "skipUntil": () => (/* reexport safe */ _internal_operators_skipUntil__WEBPACK_IMPORTED_MODULE_83__.skipUntil),
/* harmony export */   "skipWhile": () => (/* reexport safe */ _internal_operators_skipWhile__WEBPACK_IMPORTED_MODULE_84__.skipWhile),
/* harmony export */   "startWith": () => (/* reexport safe */ _internal_operators_startWith__WEBPACK_IMPORTED_MODULE_85__.startWith),
/* harmony export */   "subscribeOn": () => (/* reexport safe */ _internal_operators_subscribeOn__WEBPACK_IMPORTED_MODULE_86__.subscribeOn),
/* harmony export */   "switchAll": () => (/* reexport safe */ _internal_operators_switchAll__WEBPACK_IMPORTED_MODULE_87__.switchAll),
/* harmony export */   "switchMap": () => (/* reexport safe */ _internal_operators_switchMap__WEBPACK_IMPORTED_MODULE_88__.switchMap),
/* harmony export */   "switchMapTo": () => (/* reexport safe */ _internal_operators_switchMapTo__WEBPACK_IMPORTED_MODULE_89__.switchMapTo),
/* harmony export */   "switchScan": () => (/* reexport safe */ _internal_operators_switchScan__WEBPACK_IMPORTED_MODULE_90__.switchScan),
/* harmony export */   "take": () => (/* reexport safe */ _internal_operators_take__WEBPACK_IMPORTED_MODULE_91__.take),
/* harmony export */   "takeLast": () => (/* reexport safe */ _internal_operators_takeLast__WEBPACK_IMPORTED_MODULE_92__.takeLast),
/* harmony export */   "takeUntil": () => (/* reexport safe */ _internal_operators_takeUntil__WEBPACK_IMPORTED_MODULE_93__.takeUntil),
/* harmony export */   "takeWhile": () => (/* reexport safe */ _internal_operators_takeWhile__WEBPACK_IMPORTED_MODULE_94__.takeWhile),
/* harmony export */   "tap": () => (/* reexport safe */ _internal_operators_tap__WEBPACK_IMPORTED_MODULE_95__.tap),
/* harmony export */   "throttle": () => (/* reexport safe */ _internal_operators_throttle__WEBPACK_IMPORTED_MODULE_96__.throttle),
/* harmony export */   "throttleTime": () => (/* reexport safe */ _internal_operators_throttleTime__WEBPACK_IMPORTED_MODULE_97__.throttleTime),
/* harmony export */   "throwIfEmpty": () => (/* reexport safe */ _internal_operators_throwIfEmpty__WEBPACK_IMPORTED_MODULE_98__.throwIfEmpty),
/* harmony export */   "timeInterval": () => (/* reexport safe */ _internal_operators_timeInterval__WEBPACK_IMPORTED_MODULE_99__.timeInterval),
/* harmony export */   "timeout": () => (/* reexport safe */ _internal_operators_timeout__WEBPACK_IMPORTED_MODULE_100__.timeout),
/* harmony export */   "timeoutWith": () => (/* reexport safe */ _internal_operators_timeoutWith__WEBPACK_IMPORTED_MODULE_101__.timeoutWith),
/* harmony export */   "timestamp": () => (/* reexport safe */ _internal_operators_timestamp__WEBPACK_IMPORTED_MODULE_102__.timestamp),
/* harmony export */   "toArray": () => (/* reexport safe */ _internal_operators_toArray__WEBPACK_IMPORTED_MODULE_103__.toArray),
/* harmony export */   "window": () => (/* reexport safe */ _internal_operators_window__WEBPACK_IMPORTED_MODULE_104__.window),
/* harmony export */   "windowCount": () => (/* reexport safe */ _internal_operators_windowCount__WEBPACK_IMPORTED_MODULE_105__.windowCount),
/* harmony export */   "windowTime": () => (/* reexport safe */ _internal_operators_windowTime__WEBPACK_IMPORTED_MODULE_106__.windowTime),
/* harmony export */   "windowToggle": () => (/* reexport safe */ _internal_operators_windowToggle__WEBPACK_IMPORTED_MODULE_107__.windowToggle),
/* harmony export */   "windowWhen": () => (/* reexport safe */ _internal_operators_windowWhen__WEBPACK_IMPORTED_MODULE_108__.windowWhen),
/* harmony export */   "withLatestFrom": () => (/* reexport safe */ _internal_operators_withLatestFrom__WEBPACK_IMPORTED_MODULE_109__.withLatestFrom),
/* harmony export */   "zip": () => (/* reexport safe */ _internal_operators_zip__WEBPACK_IMPORTED_MODULE_110__.zip),
/* harmony export */   "zipAll": () => (/* reexport safe */ _internal_operators_zipAll__WEBPACK_IMPORTED_MODULE_111__.zipAll),
/* harmony export */   "zipWith": () => (/* reexport safe */ _internal_operators_zipWith__WEBPACK_IMPORTED_MODULE_112__.zipWith)
/* harmony export */ });
/* harmony import */ var _internal_operators_audit__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../internal/operators/audit */ "./node_modules/rxjs/dist/esm5/internal/operators/audit.js");
/* harmony import */ var _internal_operators_auditTime__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../internal/operators/auditTime */ "./node_modules/rxjs/dist/esm5/internal/operators/auditTime.js");
/* harmony import */ var _internal_operators_buffer__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ../internal/operators/buffer */ "./node_modules/rxjs/dist/esm5/internal/operators/buffer.js");
/* harmony import */ var _internal_operators_bufferCount__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ../internal/operators/bufferCount */ "./node_modules/rxjs/dist/esm5/internal/operators/bufferCount.js");
/* harmony import */ var _internal_operators_bufferTime__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ../internal/operators/bufferTime */ "./node_modules/rxjs/dist/esm5/internal/operators/bufferTime.js");
/* harmony import */ var _internal_operators_bufferToggle__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ../internal/operators/bufferToggle */ "./node_modules/rxjs/dist/esm5/internal/operators/bufferToggle.js");
/* harmony import */ var _internal_operators_bufferWhen__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ../internal/operators/bufferWhen */ "./node_modules/rxjs/dist/esm5/internal/operators/bufferWhen.js");
/* harmony import */ var _internal_operators_catchError__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ../internal/operators/catchError */ "./node_modules/rxjs/dist/esm5/internal/operators/catchError.js");
/* harmony import */ var _internal_operators_combineAll__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ../internal/operators/combineAll */ "./node_modules/rxjs/dist/esm5/internal/operators/combineAll.js");
/* harmony import */ var _internal_operators_combineLatestAll__WEBPACK_IMPORTED_MODULE_9__ = __webpack_require__(/*! ../internal/operators/combineLatestAll */ "./node_modules/rxjs/dist/esm5/internal/operators/combineLatestAll.js");
/* harmony import */ var _internal_operators_combineLatest__WEBPACK_IMPORTED_MODULE_10__ = __webpack_require__(/*! ../internal/operators/combineLatest */ "./node_modules/rxjs/dist/esm5/internal/operators/combineLatest.js");
/* harmony import */ var _internal_operators_combineLatestWith__WEBPACK_IMPORTED_MODULE_11__ = __webpack_require__(/*! ../internal/operators/combineLatestWith */ "./node_modules/rxjs/dist/esm5/internal/operators/combineLatestWith.js");
/* harmony import */ var _internal_operators_concat__WEBPACK_IMPORTED_MODULE_12__ = __webpack_require__(/*! ../internal/operators/concat */ "./node_modules/rxjs/dist/esm5/internal/operators/concat.js");
/* harmony import */ var _internal_operators_concatAll__WEBPACK_IMPORTED_MODULE_13__ = __webpack_require__(/*! ../internal/operators/concatAll */ "./node_modules/rxjs/dist/esm5/internal/operators/concatAll.js");
/* harmony import */ var _internal_operators_concatMap__WEBPACK_IMPORTED_MODULE_14__ = __webpack_require__(/*! ../internal/operators/concatMap */ "./node_modules/rxjs/dist/esm5/internal/operators/concatMap.js");
/* harmony import */ var _internal_operators_concatMapTo__WEBPACK_IMPORTED_MODULE_15__ = __webpack_require__(/*! ../internal/operators/concatMapTo */ "./node_modules/rxjs/dist/esm5/internal/operators/concatMapTo.js");
/* harmony import */ var _internal_operators_concatWith__WEBPACK_IMPORTED_MODULE_16__ = __webpack_require__(/*! ../internal/operators/concatWith */ "./node_modules/rxjs/dist/esm5/internal/operators/concatWith.js");
/* harmony import */ var _internal_operators_connect__WEBPACK_IMPORTED_MODULE_17__ = __webpack_require__(/*! ../internal/operators/connect */ "./node_modules/rxjs/dist/esm5/internal/operators/connect.js");
/* harmony import */ var _internal_operators_count__WEBPACK_IMPORTED_MODULE_18__ = __webpack_require__(/*! ../internal/operators/count */ "./node_modules/rxjs/dist/esm5/internal/operators/count.js");
/* harmony import */ var _internal_operators_debounce__WEBPACK_IMPORTED_MODULE_19__ = __webpack_require__(/*! ../internal/operators/debounce */ "./node_modules/rxjs/dist/esm5/internal/operators/debounce.js");
/* harmony import */ var _internal_operators_debounceTime__WEBPACK_IMPORTED_MODULE_20__ = __webpack_require__(/*! ../internal/operators/debounceTime */ "./node_modules/rxjs/dist/esm5/internal/operators/debounceTime.js");
/* harmony import */ var _internal_operators_defaultIfEmpty__WEBPACK_IMPORTED_MODULE_21__ = __webpack_require__(/*! ../internal/operators/defaultIfEmpty */ "./node_modules/rxjs/dist/esm5/internal/operators/defaultIfEmpty.js");
/* harmony import */ var _internal_operators_delay__WEBPACK_IMPORTED_MODULE_22__ = __webpack_require__(/*! ../internal/operators/delay */ "./node_modules/rxjs/dist/esm5/internal/operators/delay.js");
/* harmony import */ var _internal_operators_delayWhen__WEBPACK_IMPORTED_MODULE_23__ = __webpack_require__(/*! ../internal/operators/delayWhen */ "./node_modules/rxjs/dist/esm5/internal/operators/delayWhen.js");
/* harmony import */ var _internal_operators_dematerialize__WEBPACK_IMPORTED_MODULE_24__ = __webpack_require__(/*! ../internal/operators/dematerialize */ "./node_modules/rxjs/dist/esm5/internal/operators/dematerialize.js");
/* harmony import */ var _internal_operators_distinct__WEBPACK_IMPORTED_MODULE_25__ = __webpack_require__(/*! ../internal/operators/distinct */ "./node_modules/rxjs/dist/esm5/internal/operators/distinct.js");
/* harmony import */ var _internal_operators_distinctUntilChanged__WEBPACK_IMPORTED_MODULE_26__ = __webpack_require__(/*! ../internal/operators/distinctUntilChanged */ "./node_modules/rxjs/dist/esm5/internal/operators/distinctUntilChanged.js");
/* harmony import */ var _internal_operators_distinctUntilKeyChanged__WEBPACK_IMPORTED_MODULE_27__ = __webpack_require__(/*! ../internal/operators/distinctUntilKeyChanged */ "./node_modules/rxjs/dist/esm5/internal/operators/distinctUntilKeyChanged.js");
/* harmony import */ var _internal_operators_elementAt__WEBPACK_IMPORTED_MODULE_28__ = __webpack_require__(/*! ../internal/operators/elementAt */ "./node_modules/rxjs/dist/esm5/internal/operators/elementAt.js");
/* harmony import */ var _internal_operators_endWith__WEBPACK_IMPORTED_MODULE_29__ = __webpack_require__(/*! ../internal/operators/endWith */ "./node_modules/rxjs/dist/esm5/internal/operators/endWith.js");
/* harmony import */ var _internal_operators_every__WEBPACK_IMPORTED_MODULE_30__ = __webpack_require__(/*! ../internal/operators/every */ "./node_modules/rxjs/dist/esm5/internal/operators/every.js");
/* harmony import */ var _internal_operators_exhaust__WEBPACK_IMPORTED_MODULE_31__ = __webpack_require__(/*! ../internal/operators/exhaust */ "./node_modules/rxjs/dist/esm5/internal/operators/exhaust.js");
/* harmony import */ var _internal_operators_exhaustAll__WEBPACK_IMPORTED_MODULE_32__ = __webpack_require__(/*! ../internal/operators/exhaustAll */ "./node_modules/rxjs/dist/esm5/internal/operators/exhaustAll.js");
/* harmony import */ var _internal_operators_exhaustMap__WEBPACK_IMPORTED_MODULE_33__ = __webpack_require__(/*! ../internal/operators/exhaustMap */ "./node_modules/rxjs/dist/esm5/internal/operators/exhaustMap.js");
/* harmony import */ var _internal_operators_expand__WEBPACK_IMPORTED_MODULE_34__ = __webpack_require__(/*! ../internal/operators/expand */ "./node_modules/rxjs/dist/esm5/internal/operators/expand.js");
/* harmony import */ var _internal_operators_filter__WEBPACK_IMPORTED_MODULE_35__ = __webpack_require__(/*! ../internal/operators/filter */ "./node_modules/rxjs/dist/esm5/internal/operators/filter.js");
/* harmony import */ var _internal_operators_finalize__WEBPACK_IMPORTED_MODULE_36__ = __webpack_require__(/*! ../internal/operators/finalize */ "./node_modules/rxjs/dist/esm5/internal/operators/finalize.js");
/* harmony import */ var _internal_operators_find__WEBPACK_IMPORTED_MODULE_37__ = __webpack_require__(/*! ../internal/operators/find */ "./node_modules/rxjs/dist/esm5/internal/operators/find.js");
/* harmony import */ var _internal_operators_findIndex__WEBPACK_IMPORTED_MODULE_38__ = __webpack_require__(/*! ../internal/operators/findIndex */ "./node_modules/rxjs/dist/esm5/internal/operators/findIndex.js");
/* harmony import */ var _internal_operators_first__WEBPACK_IMPORTED_MODULE_39__ = __webpack_require__(/*! ../internal/operators/first */ "./node_modules/rxjs/dist/esm5/internal/operators/first.js");
/* harmony import */ var _internal_operators_groupBy__WEBPACK_IMPORTED_MODULE_40__ = __webpack_require__(/*! ../internal/operators/groupBy */ "./node_modules/rxjs/dist/esm5/internal/operators/groupBy.js");
/* harmony import */ var _internal_operators_ignoreElements__WEBPACK_IMPORTED_MODULE_41__ = __webpack_require__(/*! ../internal/operators/ignoreElements */ "./node_modules/rxjs/dist/esm5/internal/operators/ignoreElements.js");
/* harmony import */ var _internal_operators_isEmpty__WEBPACK_IMPORTED_MODULE_42__ = __webpack_require__(/*! ../internal/operators/isEmpty */ "./node_modules/rxjs/dist/esm5/internal/operators/isEmpty.js");
/* harmony import */ var _internal_operators_last__WEBPACK_IMPORTED_MODULE_43__ = __webpack_require__(/*! ../internal/operators/last */ "./node_modules/rxjs/dist/esm5/internal/operators/last.js");
/* harmony import */ var _internal_operators_map__WEBPACK_IMPORTED_MODULE_44__ = __webpack_require__(/*! ../internal/operators/map */ "./node_modules/rxjs/dist/esm5/internal/operators/map.js");
/* harmony import */ var _internal_operators_mapTo__WEBPACK_IMPORTED_MODULE_45__ = __webpack_require__(/*! ../internal/operators/mapTo */ "./node_modules/rxjs/dist/esm5/internal/operators/mapTo.js");
/* harmony import */ var _internal_operators_materialize__WEBPACK_IMPORTED_MODULE_46__ = __webpack_require__(/*! ../internal/operators/materialize */ "./node_modules/rxjs/dist/esm5/internal/operators/materialize.js");
/* harmony import */ var _internal_operators_max__WEBPACK_IMPORTED_MODULE_47__ = __webpack_require__(/*! ../internal/operators/max */ "./node_modules/rxjs/dist/esm5/internal/operators/max.js");
/* harmony import */ var _internal_operators_merge__WEBPACK_IMPORTED_MODULE_48__ = __webpack_require__(/*! ../internal/operators/merge */ "./node_modules/rxjs/dist/esm5/internal/operators/merge.js");
/* harmony import */ var _internal_operators_mergeAll__WEBPACK_IMPORTED_MODULE_49__ = __webpack_require__(/*! ../internal/operators/mergeAll */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeAll.js");
/* harmony import */ var _internal_operators_flatMap__WEBPACK_IMPORTED_MODULE_50__ = __webpack_require__(/*! ../internal/operators/flatMap */ "./node_modules/rxjs/dist/esm5/internal/operators/flatMap.js");
/* harmony import */ var _internal_operators_mergeMap__WEBPACK_IMPORTED_MODULE_51__ = __webpack_require__(/*! ../internal/operators/mergeMap */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeMap.js");
/* harmony import */ var _internal_operators_mergeMapTo__WEBPACK_IMPORTED_MODULE_52__ = __webpack_require__(/*! ../internal/operators/mergeMapTo */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeMapTo.js");
/* harmony import */ var _internal_operators_mergeScan__WEBPACK_IMPORTED_MODULE_53__ = __webpack_require__(/*! ../internal/operators/mergeScan */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeScan.js");
/* harmony import */ var _internal_operators_mergeWith__WEBPACK_IMPORTED_MODULE_54__ = __webpack_require__(/*! ../internal/operators/mergeWith */ "./node_modules/rxjs/dist/esm5/internal/operators/mergeWith.js");
/* harmony import */ var _internal_operators_min__WEBPACK_IMPORTED_MODULE_55__ = __webpack_require__(/*! ../internal/operators/min */ "./node_modules/rxjs/dist/esm5/internal/operators/min.js");
/* harmony import */ var _internal_operators_multicast__WEBPACK_IMPORTED_MODULE_56__ = __webpack_require__(/*! ../internal/operators/multicast */ "./node_modules/rxjs/dist/esm5/internal/operators/multicast.js");
/* harmony import */ var _internal_operators_observeOn__WEBPACK_IMPORTED_MODULE_57__ = __webpack_require__(/*! ../internal/operators/observeOn */ "./node_modules/rxjs/dist/esm5/internal/operators/observeOn.js");
/* harmony import */ var _internal_operators_onErrorResumeNext__WEBPACK_IMPORTED_MODULE_58__ = __webpack_require__(/*! ../internal/operators/onErrorResumeNext */ "./node_modules/rxjs/dist/esm5/internal/operators/onErrorResumeNext.js");
/* harmony import */ var _internal_operators_pairwise__WEBPACK_IMPORTED_MODULE_59__ = __webpack_require__(/*! ../internal/operators/pairwise */ "./node_modules/rxjs/dist/esm5/internal/operators/pairwise.js");
/* harmony import */ var _internal_operators_partition__WEBPACK_IMPORTED_MODULE_60__ = __webpack_require__(/*! ../internal/operators/partition */ "./node_modules/rxjs/dist/esm5/internal/operators/partition.js");
/* harmony import */ var _internal_operators_pluck__WEBPACK_IMPORTED_MODULE_61__ = __webpack_require__(/*! ../internal/operators/pluck */ "./node_modules/rxjs/dist/esm5/internal/operators/pluck.js");
/* harmony import */ var _internal_operators_publish__WEBPACK_IMPORTED_MODULE_62__ = __webpack_require__(/*! ../internal/operators/publish */ "./node_modules/rxjs/dist/esm5/internal/operators/publish.js");
/* harmony import */ var _internal_operators_publishBehavior__WEBPACK_IMPORTED_MODULE_63__ = __webpack_require__(/*! ../internal/operators/publishBehavior */ "./node_modules/rxjs/dist/esm5/internal/operators/publishBehavior.js");
/* harmony import */ var _internal_operators_publishLast__WEBPACK_IMPORTED_MODULE_64__ = __webpack_require__(/*! ../internal/operators/publishLast */ "./node_modules/rxjs/dist/esm5/internal/operators/publishLast.js");
/* harmony import */ var _internal_operators_publishReplay__WEBPACK_IMPORTED_MODULE_65__ = __webpack_require__(/*! ../internal/operators/publishReplay */ "./node_modules/rxjs/dist/esm5/internal/operators/publishReplay.js");
/* harmony import */ var _internal_operators_race__WEBPACK_IMPORTED_MODULE_66__ = __webpack_require__(/*! ../internal/operators/race */ "./node_modules/rxjs/dist/esm5/internal/operators/race.js");
/* harmony import */ var _internal_operators_raceWith__WEBPACK_IMPORTED_MODULE_67__ = __webpack_require__(/*! ../internal/operators/raceWith */ "./node_modules/rxjs/dist/esm5/internal/operators/raceWith.js");
/* harmony import */ var _internal_operators_reduce__WEBPACK_IMPORTED_MODULE_68__ = __webpack_require__(/*! ../internal/operators/reduce */ "./node_modules/rxjs/dist/esm5/internal/operators/reduce.js");
/* harmony import */ var _internal_operators_repeat__WEBPACK_IMPORTED_MODULE_69__ = __webpack_require__(/*! ../internal/operators/repeat */ "./node_modules/rxjs/dist/esm5/internal/operators/repeat.js");
/* harmony import */ var _internal_operators_repeatWhen__WEBPACK_IMPORTED_MODULE_70__ = __webpack_require__(/*! ../internal/operators/repeatWhen */ "./node_modules/rxjs/dist/esm5/internal/operators/repeatWhen.js");
/* harmony import */ var _internal_operators_retry__WEBPACK_IMPORTED_MODULE_71__ = __webpack_require__(/*! ../internal/operators/retry */ "./node_modules/rxjs/dist/esm5/internal/operators/retry.js");
/* harmony import */ var _internal_operators_retryWhen__WEBPACK_IMPORTED_MODULE_72__ = __webpack_require__(/*! ../internal/operators/retryWhen */ "./node_modules/rxjs/dist/esm5/internal/operators/retryWhen.js");
/* harmony import */ var _internal_operators_refCount__WEBPACK_IMPORTED_MODULE_73__ = __webpack_require__(/*! ../internal/operators/refCount */ "./node_modules/rxjs/dist/esm5/internal/operators/refCount.js");
/* harmony import */ var _internal_operators_sample__WEBPACK_IMPORTED_MODULE_74__ = __webpack_require__(/*! ../internal/operators/sample */ "./node_modules/rxjs/dist/esm5/internal/operators/sample.js");
/* harmony import */ var _internal_operators_sampleTime__WEBPACK_IMPORTED_MODULE_75__ = __webpack_require__(/*! ../internal/operators/sampleTime */ "./node_modules/rxjs/dist/esm5/internal/operators/sampleTime.js");
/* harmony import */ var _internal_operators_scan__WEBPACK_IMPORTED_MODULE_76__ = __webpack_require__(/*! ../internal/operators/scan */ "./node_modules/rxjs/dist/esm5/internal/operators/scan.js");
/* harmony import */ var _internal_operators_sequenceEqual__WEBPACK_IMPORTED_MODULE_77__ = __webpack_require__(/*! ../internal/operators/sequenceEqual */ "./node_modules/rxjs/dist/esm5/internal/operators/sequenceEqual.js");
/* harmony import */ var _internal_operators_share__WEBPACK_IMPORTED_MODULE_78__ = __webpack_require__(/*! ../internal/operators/share */ "./node_modules/rxjs/dist/esm5/internal/operators/share.js");
/* harmony import */ var _internal_operators_shareReplay__WEBPACK_IMPORTED_MODULE_79__ = __webpack_require__(/*! ../internal/operators/shareReplay */ "./node_modules/rxjs/dist/esm5/internal/operators/shareReplay.js");
/* harmony import */ var _internal_operators_single__WEBPACK_IMPORTED_MODULE_80__ = __webpack_require__(/*! ../internal/operators/single */ "./node_modules/rxjs/dist/esm5/internal/operators/single.js");
/* harmony import */ var _internal_operators_skip__WEBPACK_IMPORTED_MODULE_81__ = __webpack_require__(/*! ../internal/operators/skip */ "./node_modules/rxjs/dist/esm5/internal/operators/skip.js");
/* harmony import */ var _internal_operators_skipLast__WEBPACK_IMPORTED_MODULE_82__ = __webpack_require__(/*! ../internal/operators/skipLast */ "./node_modules/rxjs/dist/esm5/internal/operators/skipLast.js");
/* harmony import */ var _internal_operators_skipUntil__WEBPACK_IMPORTED_MODULE_83__ = __webpack_require__(/*! ../internal/operators/skipUntil */ "./node_modules/rxjs/dist/esm5/internal/operators/skipUntil.js");
/* harmony import */ var _internal_operators_skipWhile__WEBPACK_IMPORTED_MODULE_84__ = __webpack_require__(/*! ../internal/operators/skipWhile */ "./node_modules/rxjs/dist/esm5/internal/operators/skipWhile.js");
/* harmony import */ var _internal_operators_startWith__WEBPACK_IMPORTED_MODULE_85__ = __webpack_require__(/*! ../internal/operators/startWith */ "./node_modules/rxjs/dist/esm5/internal/operators/startWith.js");
/* harmony import */ var _internal_operators_subscribeOn__WEBPACK_IMPORTED_MODULE_86__ = __webpack_require__(/*! ../internal/operators/subscribeOn */ "./node_modules/rxjs/dist/esm5/internal/operators/subscribeOn.js");
/* harmony import */ var _internal_operators_switchAll__WEBPACK_IMPORTED_MODULE_87__ = __webpack_require__(/*! ../internal/operators/switchAll */ "./node_modules/rxjs/dist/esm5/internal/operators/switchAll.js");
/* harmony import */ var _internal_operators_switchMap__WEBPACK_IMPORTED_MODULE_88__ = __webpack_require__(/*! ../internal/operators/switchMap */ "./node_modules/rxjs/dist/esm5/internal/operators/switchMap.js");
/* harmony import */ var _internal_operators_switchMapTo__WEBPACK_IMPORTED_MODULE_89__ = __webpack_require__(/*! ../internal/operators/switchMapTo */ "./node_modules/rxjs/dist/esm5/internal/operators/switchMapTo.js");
/* harmony import */ var _internal_operators_switchScan__WEBPACK_IMPORTED_MODULE_90__ = __webpack_require__(/*! ../internal/operators/switchScan */ "./node_modules/rxjs/dist/esm5/internal/operators/switchScan.js");
/* harmony import */ var _internal_operators_take__WEBPACK_IMPORTED_MODULE_91__ = __webpack_require__(/*! ../internal/operators/take */ "./node_modules/rxjs/dist/esm5/internal/operators/take.js");
/* harmony import */ var _internal_operators_takeLast__WEBPACK_IMPORTED_MODULE_92__ = __webpack_require__(/*! ../internal/operators/takeLast */ "./node_modules/rxjs/dist/esm5/internal/operators/takeLast.js");
/* harmony import */ var _internal_operators_takeUntil__WEBPACK_IMPORTED_MODULE_93__ = __webpack_require__(/*! ../internal/operators/takeUntil */ "./node_modules/rxjs/dist/esm5/internal/operators/takeUntil.js");
/* harmony import */ var _internal_operators_takeWhile__WEBPACK_IMPORTED_MODULE_94__ = __webpack_require__(/*! ../internal/operators/takeWhile */ "./node_modules/rxjs/dist/esm5/internal/operators/takeWhile.js");
/* harmony import */ var _internal_operators_tap__WEBPACK_IMPORTED_MODULE_95__ = __webpack_require__(/*! ../internal/operators/tap */ "./node_modules/rxjs/dist/esm5/internal/operators/tap.js");
/* harmony import */ var _internal_operators_throttle__WEBPACK_IMPORTED_MODULE_96__ = __webpack_require__(/*! ../internal/operators/throttle */ "./node_modules/rxjs/dist/esm5/internal/operators/throttle.js");
/* harmony import */ var _internal_operators_throttleTime__WEBPACK_IMPORTED_MODULE_97__ = __webpack_require__(/*! ../internal/operators/throttleTime */ "./node_modules/rxjs/dist/esm5/internal/operators/throttleTime.js");
/* harmony import */ var _internal_operators_throwIfEmpty__WEBPACK_IMPORTED_MODULE_98__ = __webpack_require__(/*! ../internal/operators/throwIfEmpty */ "./node_modules/rxjs/dist/esm5/internal/operators/throwIfEmpty.js");
/* harmony import */ var _internal_operators_timeInterval__WEBPACK_IMPORTED_MODULE_99__ = __webpack_require__(/*! ../internal/operators/timeInterval */ "./node_modules/rxjs/dist/esm5/internal/operators/timeInterval.js");
/* harmony import */ var _internal_operators_timeout__WEBPACK_IMPORTED_MODULE_100__ = __webpack_require__(/*! ../internal/operators/timeout */ "./node_modules/rxjs/dist/esm5/internal/operators/timeout.js");
/* harmony import */ var _internal_operators_timeoutWith__WEBPACK_IMPORTED_MODULE_101__ = __webpack_require__(/*! ../internal/operators/timeoutWith */ "./node_modules/rxjs/dist/esm5/internal/operators/timeoutWith.js");
/* harmony import */ var _internal_operators_timestamp__WEBPACK_IMPORTED_MODULE_102__ = __webpack_require__(/*! ../internal/operators/timestamp */ "./node_modules/rxjs/dist/esm5/internal/operators/timestamp.js");
/* harmony import */ var _internal_operators_toArray__WEBPACK_IMPORTED_MODULE_103__ = __webpack_require__(/*! ../internal/operators/toArray */ "./node_modules/rxjs/dist/esm5/internal/operators/toArray.js");
/* harmony import */ var _internal_operators_window__WEBPACK_IMPORTED_MODULE_104__ = __webpack_require__(/*! ../internal/operators/window */ "./node_modules/rxjs/dist/esm5/internal/operators/window.js");
/* harmony import */ var _internal_operators_windowCount__WEBPACK_IMPORTED_MODULE_105__ = __webpack_require__(/*! ../internal/operators/windowCount */ "./node_modules/rxjs/dist/esm5/internal/operators/windowCount.js");
/* harmony import */ var _internal_operators_windowTime__WEBPACK_IMPORTED_MODULE_106__ = __webpack_require__(/*! ../internal/operators/windowTime */ "./node_modules/rxjs/dist/esm5/internal/operators/windowTime.js");
/* harmony import */ var _internal_operators_windowToggle__WEBPACK_IMPORTED_MODULE_107__ = __webpack_require__(/*! ../internal/operators/windowToggle */ "./node_modules/rxjs/dist/esm5/internal/operators/windowToggle.js");
/* harmony import */ var _internal_operators_windowWhen__WEBPACK_IMPORTED_MODULE_108__ = __webpack_require__(/*! ../internal/operators/windowWhen */ "./node_modules/rxjs/dist/esm5/internal/operators/windowWhen.js");
/* harmony import */ var _internal_operators_withLatestFrom__WEBPACK_IMPORTED_MODULE_109__ = __webpack_require__(/*! ../internal/operators/withLatestFrom */ "./node_modules/rxjs/dist/esm5/internal/operators/withLatestFrom.js");
/* harmony import */ var _internal_operators_zip__WEBPACK_IMPORTED_MODULE_110__ = __webpack_require__(/*! ../internal/operators/zip */ "./node_modules/rxjs/dist/esm5/internal/operators/zip.js");
/* harmony import */ var _internal_operators_zipAll__WEBPACK_IMPORTED_MODULE_111__ = __webpack_require__(/*! ../internal/operators/zipAll */ "./node_modules/rxjs/dist/esm5/internal/operators/zipAll.js");
/* harmony import */ var _internal_operators_zipWith__WEBPACK_IMPORTED_MODULE_112__ = __webpack_require__(/*! ../internal/operators/zipWith */ "./node_modules/rxjs/dist/esm5/internal/operators/zipWith.js");

















































































































//# sourceMappingURL=index.js.map

/***/ }),

/***/ "./node_modules/rxjs/node_modules/tslib/tslib.es6.js":
/*!***********************************************************!*\
  !*** ./node_modules/rxjs/node_modules/tslib/tslib.es6.js ***!
  \***********************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "__extends": () => (/* binding */ __extends),
/* harmony export */   "__assign": () => (/* binding */ __assign),
/* harmony export */   "__rest": () => (/* binding */ __rest),
/* harmony export */   "__decorate": () => (/* binding */ __decorate),
/* harmony export */   "__param": () => (/* binding */ __param),
/* harmony export */   "__metadata": () => (/* binding */ __metadata),
/* harmony export */   "__awaiter": () => (/* binding */ __awaiter),
/* harmony export */   "__generator": () => (/* binding */ __generator),
/* harmony export */   "__createBinding": () => (/* binding */ __createBinding),
/* harmony export */   "__exportStar": () => (/* binding */ __exportStar),
/* harmony export */   "__values": () => (/* binding */ __values),
/* harmony export */   "__read": () => (/* binding */ __read),
/* harmony export */   "__spread": () => (/* binding */ __spread),
/* harmony export */   "__spreadArrays": () => (/* binding */ __spreadArrays),
/* harmony export */   "__spreadArray": () => (/* binding */ __spreadArray),
/* harmony export */   "__await": () => (/* binding */ __await),
/* harmony export */   "__asyncGenerator": () => (/* binding */ __asyncGenerator),
/* harmony export */   "__asyncDelegator": () => (/* binding */ __asyncDelegator),
/* harmony export */   "__asyncValues": () => (/* binding */ __asyncValues),
/* harmony export */   "__makeTemplateObject": () => (/* binding */ __makeTemplateObject),
/* harmony export */   "__importStar": () => (/* binding */ __importStar),
/* harmony export */   "__importDefault": () => (/* binding */ __importDefault),
/* harmony export */   "__classPrivateFieldGet": () => (/* binding */ __classPrivateFieldGet),
/* harmony export */   "__classPrivateFieldSet": () => (/* binding */ __classPrivateFieldSet)
/* harmony export */ });
/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    }
    return __assign.apply(this, arguments);
}

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

var __createBinding = Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
});

function __exportStar(m, o) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(o, p)) __createBinding(o, m, p);
}

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

/** @deprecated */
function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

/** @deprecated */
function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}

function __spreadArray(to, from) {
    for (var i = 0, il = from.length, j = to.length; i < il; i++, j++)
        to[j] = from[i];
    return to;
}

function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};

var __setModuleDefault = Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
};

function __importStar(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
}

function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { default: mod };
}

function __classPrivateFieldGet(receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
}

function __classPrivateFieldSet(receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
}


/***/ }),

/***/ "./web/src/constants.ts":
/*!******************************!*\
  !*** ./web/src/constants.ts ***!
  \******************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "NUMBER_OF_ADJACENT_SPINE_ITEM_TO_PRELOAD": () => (/* binding */ NUMBER_OF_ADJACENT_SPINE_ITEM_TO_PRELOAD)
/* harmony export */ });
const NUMBER_OF_ADJACENT_SPINE_ITEM_TO_PRELOAD = 3;


/***/ }),

/***/ "./web/src/gestures.ts":
/*!*****************************!*\
  !*** ./web/src/gestures.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "createGestureHandler": () => (/* binding */ createGestureHandler)
/* harmony export */ });
/* harmony import */ var hammerjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! hammerjs */ "./node_modules/hammerjs/hammer.js");
/* harmony import */ var hammerjs__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(hammerjs__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _messages__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./messages */ "./web/src/messages.ts");


const createGestureHandler = (reader) => {
    const hammerManager = new hammerjs__WEBPACK_IMPORTED_MODULE_0__.Manager(document.body, {
        recognizers: [
            [hammerjs__WEBPACK_IMPORTED_MODULE_0__.Pan, { direction: hammerjs__WEBPACK_IMPORTED_MODULE_0__.DIRECTION_ALL }],
            [hammerjs__WEBPACK_IMPORTED_MODULE_0__.Pinch, { enable: true }],
            [hammerjs__WEBPACK_IMPORTED_MODULE_0__.Tap, {}],
            [hammerjs__WEBPACK_IMPORTED_MODULE_0__.Press, {}],
        ],
    });
    hammerManager === null || hammerManager === void 0 ? void 0 : hammerManager.on('tap', ({ srcEvent }) => {
        const width = window.innerWidth;
        const pageTurnMargin = 0.15;
        const normalizedEvent = (reader === null || reader === void 0 ? void 0 : reader.normalizeEventForViewport(srcEvent)) || {};
        if ('x' in normalizedEvent) {
            const { x = 0 } = normalizedEvent;
            if (x < width * pageTurnMargin) {
                reader.turnLeft();
            }
            else if (x > width * (1 - pageTurnMargin)) {
                reader.turnRight();
            }
            else {
                (0,_messages__WEBPACK_IMPORTED_MODULE_1__.postMessage)({ event: 'menuTap' });
            }
        }
    });
    let movingStartOffset = 0;
    let movingHasStarted = false;
    hammerManager.on('panmove panstart panend', (ev) => {
        const normalizedEvent = reader === null || reader === void 0 ? void 0 : reader.normalizeEventForViewport(ev.srcEvent);
        // because of iframe moving we have to calculate the delta ourselves with normalized value
        const deltaX = normalizedEvent && 'x' in normalizedEvent ? (normalizedEvent === null || normalizedEvent === void 0 ? void 0 : normalizedEvent.x) - movingStartOffset : ev.deltaX;
        if (ev.type === 'panstart') {
            movingHasStarted = true;
            if (normalizedEvent && 'x' in normalizedEvent) {
                movingStartOffset = normalizedEvent === null || normalizedEvent === void 0 ? void 0 : normalizedEvent.x;
                reader === null || reader === void 0 ? void 0 : reader.moveTo({ x: 0, y: 0 }, { start: true });
            }
        }
        if (ev.type === 'panmove' && movingHasStarted) {
            if (movingHasStarted) {
                reader === null || reader === void 0 ? void 0 : reader.moveTo({ x: deltaX, y: ev.deltaY });
            }
        }
        if (ev.type === 'panend') {
            // used to ensure we ignore false positive on firefox
            if (movingHasStarted) {
                reader === null || reader === void 0 ? void 0 : reader.moveTo({ x: deltaX, y: ev.deltaY }, { final: true });
            }
            movingHasStarted = false;
        }
    });
};


/***/ }),

/***/ "./web/src/messages.ts":
/*!*****************************!*\
  !*** ./web/src/messages.ts ***!
  \*****************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "messagesDown$": () => (/* binding */ messagesDown$),
/* harmony export */   "postMessage": () => (/* binding */ postMessage)
/* harmony export */ });
/* harmony import */ var rxjs__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! rxjs */ "./node_modules/rxjs/dist/esm5/internal/Subject.js");

const messagesDown$ = new rxjs__WEBPACK_IMPORTED_MODULE_0__.Subject();
const postMessage = (message) => {
    var _a;
    (_a = window.ReactNativeWebView) === null || _a === void 0 ? void 0 : _a.postMessage(JSON.stringify(message));
};


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
/*!***************************!*\
  !*** ./web/src/index.tsx ***!
  \***************************/
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _oboku_reader__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! @oboku/reader */ "./node_modules/@oboku/reader/dist/index.js");
/* harmony import */ var _oboku_reader__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_oboku_reader__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var rxjs_operators__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! rxjs/operators */ "./node_modules/rxjs/dist/esm5/internal/operators/tap.js");
/* harmony import */ var _constants__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./constants */ "./web/src/constants.ts");
/* harmony import */ var _gestures__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./gestures */ "./web/src/gestures.ts");
/* harmony import */ var _messages__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./messages */ "./web/src/messages.ts");





window.__OBOKU_READER_DEBUG = true;
window.postDownMessage = (message) => {
    _messages__WEBPACK_IMPORTED_MODULE_3__.messagesDown$.next(message);
};
const reader = (0,_oboku_reader__WEBPACK_IMPORTED_MODULE_0__.createReader)({
    containerElement: document.getElementById('app') || document.body,
    pageTurnAnimation: 'slide',
});
const manifest = window.MANIFEST;
reader.load(manifest, {
    numberOfAdjacentSpineItemToPreLoad: _constants__WEBPACK_IMPORTED_MODULE_1__.NUMBER_OF_ADJACENT_SPINE_ITEM_TO_PRELOAD,
});
(0,_gestures__WEBPACK_IMPORTED_MODULE_2__.createGestureHandler)(reader);
_messages__WEBPACK_IMPORTED_MODULE_3__.messagesDown$.pipe((0,rxjs_operators__WEBPACK_IMPORTED_MODULE_4__.tap)(event => {
    if (event.event === 'goTo') {
        reader.goTo(event.data);
    }
}))
    .subscribe();

})();

/******/ })()
;
//# sourceMappingURL=bundle.js.map