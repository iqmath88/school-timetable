'use strict';
/* ملف PDF متجهي بنص حقيقي (v0.9.43.0)
   - يُعيد استعمال رسّام الجدول نفسه (renderScheduleCanvas) لكن بسياق رسم «مسجِّل» بدل لوحة canvas،
     فيبقى التصميم مطابقاً للصورة، لكن الحدود والنصوص متجهة وحادّة عند أي تكبير.
   - تشكيل الحروف العربية بـ HarfBuzz (harfbuzz.mjs/wasm)، والخطوط TrueType مضمّنة كخطوط CID (Identity-H)
     مع خريطة ToUnicode، فيمكن تحديد النص والبحث فيه.
   - عند أي فشل يرجع التصدير تلقائياً إلى PDF المصوَّر القديم. */
(function(){
const FONT_FILES={sans400:'pdf-font-sans-400.ttf',sans700:'pdf-font-sans-700.ttf',amiri700:'pdf-font-amiri-700.ttf'};
const PS_NAMES={sans400:'NotoSansArabic-Regular',sans700:'NotoSansArabic-Bold',amiri700:'Amiri-Bold'};
let HB=null,FONTS=null,loading=null;

async function ensure(){
 if(FONTS)return;
 if(!loading)loading=(async()=>{
  HB=await import(new URL('harfbuzz.mjs',location.href).href);
  const out={};
  for(const [k,f] of Object.entries(FONT_FILES)){
   const r=await fetch(new URL(f,location.href).href);if(!r.ok)throw new Error('font '+f);
   const bytes=new Uint8Array(await r.arrayBuffer());
   const face=new HB.Face(new HB.Blob(bytes.buffer.slice(0)),0),font=new HB.Font(face);
   const v=new DataView(bytes.buffer),tbl=tag=>{const n=v.getUint16(4);for(let i=0;i<n;i++){const o=12+i*16;if(String.fromCharCode(bytes[o],bytes[o+1],bytes[o+2],bytes[o+3])===tag)return v.getUint32(o+8)}return 0};
   const head=tbl('head'),hhea=tbl('hhea');
   out[k]={key:k,bytes,face,font,upem:face.upem,
    bbox:[v.getInt16(head+36),v.getInt16(head+38),v.getInt16(head+40),v.getInt16(head+42)],
    asc:v.getInt16(hhea+4),desc:v.getInt16(hhea+6),used:new Map()};
  }
  FONTS=out;
 })();
 try{await loading}catch(e){loading=null;throw e}
}

/* --- النص: اتجاهات مختلطة (عربي + أرقام/لاتيني) --- */
const LTR_RUN=/[0-9A-Za-z٠-٩۰-۹](?:[0-9A-Za-z٠-٩۰-۹\-\/.:_,]*[0-9A-Za-z٠-٩۰-۹])?/g;
function runs(str){
 const out=[];let last=0,m;LTR_RUN.lastIndex=0;
 while((m=LTR_RUN.exec(str))){if(m.index>last)out.push({t:str.slice(last,m.index),rtl:true});out.push({t:m[0],rtl:false});last=m.index+m[0].length}
 if(last<str.length)out.push({t:str.slice(last),rtl:true});
 return out;
}
function shapeRun(F,t,rtl){
 const b=new HB.Buffer();b.addText(t);b.guessSegmentProperties();b.setDirection(rtl?HB.Direction.RTL:HB.Direction.LTR);
 HB.shape(F.font,b);
 const info=b.getGlyphInfos(),pos=b.getGlyphPositions(),cps=Array.from(t),u16=[];
 /* cluster = موضع وحدة UTF-16 في النص؛ نحوّله إلى نص المجموعة لخريطة ToUnicode */
 const starts=[];let off=0;for(const ch of cps){starts.push(off);off+=ch.length}
 const clusters=[...new Set(info.map(g=>g.cluster))].sort((a,b)=>a-b);
 const textOf=cl=>{const i=clusters.indexOf(cl),end=clusters[i+1]??off;return cps.filter((_,k)=>starts[k]>=cl&&starts[k]<end).join('')};
 const seen=new Set();
 return info.map((g,i)=>{let s='';if(!seen.has(g.cluster)){seen.add(g.cluster);s=textOf(g.cluster)}
  if(!F.used.has(g.codepoint))F.used.set(g.codepoint,s||'');else if(s&&!F.used.get(g.codepoint))F.used.set(g.codepoint,s);
  return {gid:g.codepoint,ax:pos[i].xAdvance,dx:pos[i].xOffset,dy:pos[i].yOffset,t:s}});
}
/* يرتب المقاطع بصرياً لفقرة من اليمين لليسار ويعيد الحروف بمواضعها (بوحدات الخط) */
function layout(F,str){
 const rs=runs(String(str));const shaped=rs.map(r=>shapeRun(F,r.t,r.rtl));
 const visual=shaped.slice().reverse();const glyphs=[];let x=0;
 for(const run of visual)for(const g of run){glyphs.push({gid:g.gid,x:x+g.dx,y:g.dy,t:g.t});x+=g.ax}
 return {glyphs,width:x};
}

/* --- سياق رسم يشبه CanvasRenderingContext2D ويُنتج أوامر PDF --- */
function color(c){
 c=String(c||'#000').trim();let r=0,g=0,b=0;
 let m=/^#([0-9a-f]{3})$/i.exec(c);if(m){r=parseInt(m[1][0]+m[1][0],16);g=parseInt(m[1][1]+m[1][1],16);b=parseInt(m[1][2]+m[1][2],16)}
 else if((m=/^#([0-9a-f]{6})/i.exec(c))){r=parseInt(m[1].slice(0,2),16);g=parseInt(m[1].slice(2,4),16);b=parseInt(m[1].slice(4,6),16)}
 else if((m=/rgba?\(([^)]+)\)/.exec(c))){[r,g,b]=m[1].split(',').map(Number)}
 return [r/255,g/255,b/255].map(n=>+n.toFixed(4)).join(' ');
}
const N=n=>(Math.round(n*1000)/1000).toString();
function pickFont(css){const bold=/\b(700|bold)\b/.test(css),size=parseFloat((/([\d.]+)px/.exec(css)||[0,16])[1]);return {F:FONTS[/"Amiri"/.test(css)?'amiri700':bold?'sans700':'sans400'],size}}

function makeContext(width,height){
 const ops=[],images=[];
 const ctx={width,height,ops,images,fillStyle:'#000',strokeStyle:'#000',lineWidth:1,font:'16px sans-serif',textAlign:'start',textBaseline:'alphabetic',direction:'rtl',
  save(){ops.push('q')},restore(){ops.push('Q')},
  setTransform(){},
  translate(x,y){ops.push(`1 0 0 1 ${N(x)} ${N(y)} cm`)},
  rotate(a){const c=Math.cos(a),s=Math.sin(a);ops.push(`${N(c)} ${N(s)} ${N(-s)} ${N(c)} 0 0 cm`)},
  fillRect(x,y,w,h){ops.push(`${color(this.fillStyle)} rg ${N(x)} ${N(y)} ${N(w)} ${N(h)} re f`)},
  strokeRect(x,y,w,h){ops.push(`${color(this.strokeStyle)} RG ${N(this.lineWidth)} w ${N(x)} ${N(y)} ${N(w)} ${N(h)} re S`)},
  measureText(s){const {F,size}=pickFont(this.font);return {width:layout(F,s).width*size/F.upem}},
  fillText(s,x,y){
   const {F,size}=pickFont(this.font),k=size/F.upem,L=layout(F,s),w=L.width*k;
   const al=this.textAlign;let x0=al==='center'?x-w/2:(al==='right'||(al==='start'&&this.direction==='rtl')||(al==='end'&&this.direction!=='rtl'))?x-w:x;
   const bl=this.textBaseline;let yb=y;
   if(bl==='middle')yb=y+(F.asc+F.desc)/2*k;else if(bl==='top'||bl==='hanging')yb=y+F.asc*k;else if(bl==='bottom'||bl==='ideographic')yb=y+F.desc*k;
   let t=`BT /${F.key} ${N(size)} Tf ${color(this.fillStyle)} rg`;
   /* كل حرف بموضعه، ومعه ActualText بنص مجموعته: أشكال الحروف العربية في Noto تتشارك أجساماً واحدة (النقاط منفصلة)،
      فلا تكفي خريطة ToUnicode وحدها لنسخ النص والبحث فيه بدقة */
   for(const g of L.glyphs)t+=` /Span << /ActualText <FEFF${hex16(g.t||'')}> >> BDC 1 0 0 -1 ${N(x0+g.x*k)} ${N(yb-g.y*k)} Tm <${g.gid.toString(16).padStart(4,'0')}> Tj EMC`;
   /* ActualText: النص المنطقي الصحيح للنسخ والبحث (الحروف مرسومة بترتيب بصري من اليمين لليسار) */
   ops.push(t+' ET');
  },
  drawImage(img,x,y,w,h){const name='Im'+images.length;images.push({img,name});ops.push(`q ${N(w)} 0 0 ${N(-h)} ${N(x)} ${N(y+h)} cm /${name} Do Q`)}
 };
 return ctx;
}

/* --- كتابة ملف PDF --- */
async function deflate(u8){
 if(typeof CompressionStream!=='function')return null;
 try{const s=new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate'));return new Uint8Array(await new Response(s).arrayBuffer())}catch(e){return null}
}
async function imageJpeg(img){
 const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0);
 const b=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));return {bytes:new Uint8Array(await b.arrayBuffer()),w:c.width,h:c.height};
}
const hex16=s=>Array.from(s).map(ch=>{const cp=ch.codePointAt(0);if(cp<0x10000)return cp.toString(16).padStart(4,'0');const v=cp-0x10000;return ((0xD800+(v>>10)).toString(16)+(0xDC00+(v&1023)).toString(16))}).join('').toUpperCase();

/* pages: [{ctx, w, h}] — w,h أبعاد الورقة بالنقاط؛ يُوسَّط الرسم ويُكبَّر ليملأ الورقة بهامش 20pt */
async function build(pages,meta){
 const enc=new TextEncoder(),objs=[];
 const add=()=>{objs.push(null);return objs.length};
 const set=(n,parts)=>{objs[n-1]=parts};
 const catalog=add(),pagesObj=add();
 const fontRefs={};
 for(const F of Object.values(FONTS)){
  if(!F.used.size)continue;
  const type0=add(),cid=add(),desc=add(),file=add(),tou=add();fontRefs[F.key]=type0;
  const name=PS_NAMES[F.key],k=1000/F.upem;
  const gids=[...F.used.keys()].sort((a,b)=>a-b);
  const W=gids.map(g=>`${g} [${Math.round(F.font.glyphHAdvance(g)*k)}]`).join(' ');
  set(type0,[`<< /Type /Font /Subtype /Type0 /BaseFont /${name} /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${tou} 0 R >>`]);
  set(cid,[`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /${name} /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${desc} 0 R /CIDToGIDMap /Identity /DW 500 /W [${W}] >>`]);
  const bb=F.bbox.map(n=>Math.round(n*k));
  set(desc,[`<< /Type /FontDescriptor /FontName /${name} /Flags 4 /FontBBox [${bb.join(' ')}] /ItalicAngle 0 /Ascent ${Math.round(F.asc*k)} /Descent ${Math.round(F.desc*k)} /CapHeight 700 /StemV 80 /FontFile2 ${file} 0 R >>`]);
  const z=await deflate(F.bytes);
  set(file,[`<< /Length ${(z||F.bytes).length} /Length1 ${F.bytes.length}${z?' /Filter /FlateDecode':''} >>\nstream\n`,z||F.bytes,'\nendstream']);
  const map=gids.filter(g=>F.used.get(g)).map(g=>`<${g.toString(16).padStart(4,'0').toUpperCase()}> <${hex16(F.used.get(g))}>`);
  let cm='/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def /CMapName /Adobe-Identity-UCS def /CMapType 2 def 1 begincodespacerange <0000> <FFFF> endcodespacerange\n';
  for(let i=0;i<map.length;i+=100){const part=map.slice(i,i+100);cm+=`${part.length} beginbfchar\n${part.join('\n')}\nendbfchar\n`}
  cm+='endcmap CMapName currentdict /CMap defineresource pop end end';
  const cmb=enc.encode(cm);set(tou,[`<< /Length ${cmb.length} >>\nstream\n`,cmb,'\nendstream']);
 }
 const fontDict='<< '+Object.entries(fontRefs).map(([k,n])=>`/${k} ${n} 0 R`).join(' ')+' >>';
 const kids=[];
 for(const p of pages){
  const {ctx,w,h}=p,s=Math.min((w-40)/ctx.width,(h-40)/ctx.height),tx=(w-ctx.width*s)/2,ty=(h+ctx.height*s)/2;
  const xo=[];
  for(const im of ctx.images){try{const j=await imageJpeg(im.img),n=add();set(n,[`<< /Type /XObject /Subtype /Image /Width ${j.w} /Height ${j.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${j.bytes.length} >>\nstream\n`,j.bytes,'\nendstream']);xo.push(`/${im.name} ${n} 0 R`)}catch(e){}}
  const content=enc.encode(`q ${N(s)} 0 0 ${N(-s)} ${N(tx)} ${N(ty)} cm\n`+ctx.ops.join('\n')+'\nQ');
  const z=await deflate(content),cobj=add(),pobj=add();kids.push(pobj);
  set(cobj,[`<< /Length ${(z||content).length}${z?' /Filter /FlateDecode':''} >>\nstream\n`,z||content,'\nendstream']);
  set(pobj,[`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${N(w)} ${N(h)}] /Resources << /Font ${fontDict}${xo.length?' /XObject << '+xo.join(' ')+' >>':''} >> /Contents ${cobj} 0 R >>`]);
 }
 set(pagesObj,[`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`]);
 set(catalog,[`<< /Type /Catalog /Pages ${pagesObj} 0 R /ViewerPreferences << /Direction /R2L >> >>`]);
 const info=add();set(info,[`<< /Producer (Nippur vector PDF) /Title <FEFF${hex16(meta&&meta.title||'جدول الحصص')}> >>`]);
 /* تجميع */
 const chunks=[],offsets=[];let pos=0;const push=x=>{const b=typeof x==='string'?enc.encode(x):x;chunks.push(b);pos+=b.length};
 push('%PDF-1.7\n%\xE2\xE3\xCF\xD3\n');
 objs.forEach((parts,i)=>{offsets.push(pos);push(`${i+1} 0 obj\n`);parts.forEach(push);push('\nendobj\n')});
 const xref=pos;push(`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offsets.map(o=>String(o).padStart(10,'0')+' 00000 n \n').join(''));
 push(`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`);
 for(const F of Object.values(FONTS))F.used.clear();
 return new Blob(chunks,{type:'application/pdf'});
}

window.MasarVectorPDF={ensure,makeContext,build,ready:()=>!!FONTS};
})();
