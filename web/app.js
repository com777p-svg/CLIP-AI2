import './styles.css';
import { detectLocalComputeCapabilities, classifyLocalCompute } from './local-compute.js';
import { scanLocalVideoScenes } from './local-scene-scan.js';
import { transcribeLocalVideo } from './local-transcription.js';


const $ = (id) => document.getElementById(id);
const state = { clips: [], selected: null, ffmpeg: null, exporting: false, projectName: 'مشروعي الجديد', pendingProject: null, musicFile: null, musicUrl: null, ffmpegLogs: [] };
const input = $('fileInput'), video = $('videoPreview'), empty = $('emptyState');
window.addEventListener('clipai:toast', event => toast(event.detail?.message || ''));
window.addEventListener('clipai:points-updated', event => { const el = $('pointsBalance'); if (el) el.textContent = String(event.detail?.points ?? 0) + ' نقطة'; });
const savedPoints = Number(localStorage.getItem('clipai-points-v1') || 0);
const pointsBalance = $('pointsBalance'); if (pointsBalance) pointsBalance.textContent = savedPoints + ' نقطة';
const urlInput = $('videoUrlInput'), inspectUrlBtn = $('inspectUrlBtn'), urlImportStatus = $('urlImportStatus');
async function inspectVideoUrl(){
 const raw=(urlInput.value||'').trim();
 if(!raw){urlImportStatus.textContent='ألصق رابطًا أولاً.';return}
 inspectUrlBtn.disabled=true;urlImportStatus.textContent='جارٍ فحص الرابط...';
 try{
  const response=await fetch('/.netlify/functions/inspect-video-url',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:raw})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok)throw new Error(data.error||'تعذر التحقق من الرابط');
  urlImportStatus.textContent=data.message;
 }catch(error){
  urlImportStatus.textContent=error.message||'تعذر الاتصال بخدمة فحص الروابط. أعد المحاولة بعد نشر تحديث الموقع.';
 }finally{inspectUrlBtn.disabled=false}
}
inspectUrlBtn.addEventListener('click',inspectVideoUrl);
urlInput.addEventListener('keydown',event=>{if(event.key==='Enter')inspectVideoUrl()});



async function scanSelectedScenes(){
 const clip=selected(),button=$('scanScenesBtn'),summary=$('localComputeSummary');
 if(!clip?.file){toast('أضف فيديو من جهازك أولاً');return}
 button.disabled=true;button.textContent='جارٍ فحص المشاهد...';
 summary.textContent='تُفحص عينات مرئية من الفيديو محليًا على جهازك. لا تغادر الصفحة أثناء الفحص.';
 try{
  const result=await scanLocalVideoScenes(clip.file,(done,total)=>{
   summary.textContent='فحص محلي للمشاهد: '+done+' من '+total+' عينة.';
  });
  const moments=result.scenes||[];
  summary.textContent='اكتمل الفحص المحلي: '+result.processed+' عينة، ووجد '+moments.length+' انتقالات بصرية محتملة. هذه ليست اختيارات AI للنشر بعد.';
  if(moments.length){
   const times=moments.slice(0,8).map(item=>Math.floor(item.time/60).toString().padStart(2,'0')+':'+Math.floor(item.time%60).toString().padStart(2,'0'));
   toast('انتقالات بصرية محتملة: '+times.join('، '));
  }else toast('لم تظهر انتقالات بصرية واضحة في العينات');
 }catch(error){summary.textContent=error.message||'تعذر فحص الفيديو على هذا الجهاز.';toast('تعذر فحص المشاهد محليًا')}
 finally{button.disabled=!selected()?.file;button.textContent='إعادة فحص المشاهد'}
}

async function transcribeSelectedVideo(){
 const clip=selected(),button=$('transcribeBtn'),status=$('transcriptStatus'),output=$('transcriptOutput');
 if(!clip?.file){toast('أضف فيديو من جهازك أولاً');return}
 button.disabled=true;button.textContent='جارٍ التفريغ...';output.hidden=true;output.textContent='';
 try{
  const result=await transcribeLocalVideo(clip.file,message=>{status.textContent=message});
  output.textContent=result.segments.map(s=>'['+fmt(s.start)+'–'+fmt(s.end)+'] '+s.text).join('\n');
  output.hidden=false;
  status.textContent='اكتمل التفريغ المحلي. اللغة المقدّرة من شكل النص: '+(result.languageHint==='ar'?'العربية':result.languageHint==='en'?'الإنجليزية':'غير محددة')+'؛ راجع النص قبل استخدامه كترجمة مكتوبة.';
  toast('اكتمل تفريغ الكلام من الفيديو');
 }catch(error){status.textContent=error.message||'تعذر تفريغ الصوت على هذا الجهاز.';toast('تعذر التفريغ المحلي')}
 finally{button.disabled=!selected()?.file;button.textContent='إعادة تفريغ الكلام'}
}

async function checkLocalDevice(){
 const button=$('checkDeviceBtn'),summary=$('localComputeSummary'),results=$('localComputeResults');
 if(!button||!summary||!results)return;
 button.disabled=true;button.textContent='جارٍ الفحص...';summary.textContent='نفحص دعم WebGPU وWebAssembly والمهام الخلفية وقدرات المعالج.';
 try{
  const caps=await detectLocalComputeCapabilities();
  const result=classifyLocalCompute(caps);
  const labels={
   webgpu:'WebGPU: '+(caps.webgpu?'متاح':'غير متاح'),
   wasm:'WebAssembly: '+(caps.webAssembly?'متاح':'غير متاح'),
   workers:'Workers: '+(caps.workers?'متاح':'غير متاح'),
   decode:'فك الفيديو: '+(caps.videoDecoder?'WebCodecs':'عبر المتصفح'),
   cores:'أنوية المعالج: '+caps.hardwareConcurrency,
   memory:'ذاكرة الجهاز: '+(caps.deviceMemory?caps.deviceMemory+' GB تقريبًا':'غير معلومة')
  };
  results.replaceChildren(...Object.values(labels).map(label=>{const chip=document.createElement('span');chip.className='compute-chip';chip.textContent=label;return chip}));
  const messages={
   'local-strong':'الجهاز مناسب لتجربة معالجة محلية أقوى. ما زلنا نحتاج تحميل نموذج AI واختبار الأداء.',
   'local-hybrid':'يمكن تنفيذ المهام الخفيفة محليًا؛ الأفضل توزيع التحليل الثقيل على دفعات واستخدام سحابة مجانية عند توفرها.',
   'cloud-fallback':'هذا الجهاز يناسب المعالجة الخفيفة، وقد نحتاج عاملًا سحابيًا لبعض مهام الذكاء الاصطناعي.'
  };
  summary.textContent=messages[result.tier];
  $('engineStatus').textContent='فحص الجهاز اكتمل. لم يتم تحميل نموذج ذكاء اصطناعي أو تشغيل خدمة مدفوعة.';
 }catch(error){summary.textContent='تعذر فحص بعض قدرات الجهاز. سيظل المحرر المحلي متاحًا.';console.warn(error)}
 finally{button.disabled=false;button.textContent='إعادة فحص الجهاز'}
}

let toastTimer;
function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3000)}
function fmt(seconds){if(!Number.isFinite(seconds))return '00:00';const n=Math.max(0,Math.floor(seconds));return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function uid(){return crypto.randomUUID?crypto.randomUUID():String(Date.now())+Math.random()}
function selected(){return state.clips.find(c=>c.id===state.selected)}
function updateButtons(){const has=state.clips.length>0,sel=!!selected();$('scanScenesBtn').disabled=!selected()?.file;$('transcribeBtn').disabled=!selected()?.file;$('removeAudioBtn').disabled=!state.musicFile;$('exportBtn').disabled=!has||state.exporting;$('splitBtn').disabled=!sel;$('deleteBtn').disabled=!sel;$('moveLeftBtn').disabled=!sel||state.clips.findIndex(c=>c.id===state.selected)===0;$('moveRightBtn').disabled=!sel||state.clips.findIndex(c=>c.id===state.selected)===state.clips.length-1;$('playBtn').disabled=!sel;$('stopBtn').disabled=!sel;$('clipCount').textContent=state.clips.length?state.clips.length+' مقطع':'لا توجد مقاطع';$('totalDuration').textContent=fmt(state.clips.reduce((a,c)=>a+c.end-c.start,0))}
function persist(){try{const meta={format:'CLIPAI_PROJECT_V1',name:$('projectName').value,aspect:$('aspectSelect').value,quality:$('qualitySelect').value,fps:$('fpsSelect').value,musicVolume:Number($('musicVolume').value),brightness:Number($('brightness').value),contrast:Number($('contrast').value),saturation:Number($('saturation').value),clips:state.clips.map(c=>({name:c.name,start:c.start,end:c.end,duration:c.duration}))};localStorage.setItem('clipai-project-meta',JSON.stringify(meta));$('saveState').textContent='حُفظت بيانات المشروع'}catch{$('saveState').textContent='الحفظ المحلي غير متاح'}}
function render(){
 const list=$('videoTrack');list.innerHTML='';
 if(!state.clips.length){list.innerHTML='<div class="track-placeholder">أضف فيديو ليظهر هنا في الخط الزمني</div>';video.hidden=true;empty.hidden=false;updateButtons();return}
 state.clips.forEach((clip,index)=>{
  const row=document.createElement('div');row.className='clip-row'+(clip.id===state.selected?' selected':'');
  const main=document.createElement('div');main.className='clip-main';
  const thumb=document.createElement('div');thumb.className='clip-thumb';thumb.textContent='▶';thumb.style.display='grid';thumb.style.placeItems='center';
  const info=document.createElement('div');info.style.minWidth='0';const name=document.createElement('div');name.className='clip-name';name.textContent=clip.name;const sub=document.createElement('div');sub.className='clip-sub';sub.textContent=fmt(clip.start)+' — '+fmt(clip.end)+' · '+fmt(clip.end-clip.start);info.append(name,sub);main.append(thumb,info);main.onclick=()=>selectClip(clip.id);
  const controls=document.createElement('div');controls.className='clip-controls';
  [['معاينة',()=>selectClip(clip.id)],['↑',()=>moveClip(index,-1)],['↓',()=>moveClip(index,1)],['حذف',()=>removeClip(clip.id)]].forEach(([label,fn])=>{const b=document.createElement('button');b.textContent=label;b.onclick=fn;controls.append(b)});
  const trim=document.createElement('div');trim.className='trim-fields';
  const makeField=(label,value,handler,max)=>{const l=document.createElement('label');l.textContent=label;const inp=document.createElement('input');inp.type='number';inp.min='0';inp.max=String(max);inp.step='0.1';inp.value=Number(value.toFixed(1));inp.addEventListener('change',()=>handler(Number(inp.value)));trim.append(l,inp)};
  makeField('بداية (ث)',clip.start,v=>{clip.start=Math.max(0,Math.min(v,clip.end-.1));persist();render()},clip.duration);
  makeField('نهاية (ث)',clip.end,v=>{clip.end=Math.max(clip.start+.1,Math.min(v,clip.duration));persist();render()},clip.duration);
  row.append(main,controls,trim);list.append(row);
 });
 updateButtons();persist();
}
function selectClip(id){state.selected=id;$('scanScenesBtn').disabled=!selected()?.file;const c=selected();if(!c)return;video.src=c.url;video.hidden=false;empty.hidden=true;video.currentTime=Math.min(c.start,Math.max(0,c.end-.05));$('seekSlider').max=String(c.duration||0);$('seekSlider').value=String(c.start);video.onloadedmetadata=()=>{video.currentTime=Math.min(c.start,Math.max(0,c.end-.05));$('seekSlider').max=String(c.duration||0);$('seekSlider').value=String(c.start);$('timeReadout').textContent=fmt(video.currentTime)+' / '+fmt(c.duration)};render()}
function removeClip(id){const i=state.clips.findIndex(c=>c.id===id);if(i<0)return;URL.revokeObjectURL(state.clips[i].url);state.clips.splice(i,1);state.selected=state.clips[Math.max(0,i-1)]?.id||null;if(state.selected)selectClip(state.selected);else render();toast('تم حذف المقطع')}
function moveClip(index,delta){const next=index+delta;if(next<0||next>=state.clips.length)return;[state.clips[index],state.clips[next]]=[state.clips[next],state.clips[index]];render()}
function addFiles(files){for(const file of files){if(!file.type.startsWith('video/'))continue;const url=URL.createObjectURL(file);const clip={id:uid(),file,url,name:file.name,start:0,end:0,duration:0};const probe=document.createElement('video');probe.preload='metadata';probe.src=url;probe.onloadedmetadata=()=>{clip.duration=probe.duration;clip.end=probe.duration;const saved=state.pendingProject?.clips?.find(item=>item.name===clip.name);if(saved){clip.start=Math.max(0,Math.min(Number(saved.start)||0,Math.max(0,clip.duration-.1)));clip.end=Math.max(clip.start+.1,Math.min(Number(saved.end)||clip.duration,clip.duration));}if(!state.selected)state.selected=clip.id;render();if(state.selected===clip.id)selectClip(clip.id)};probe.onerror=()=>toast('تعذر قراءة '+file.name);state.clips.push(clip)}if(!files.length)return;render();toast('تمت إضافة '+files.length+' ملف/ملفات للخط الزمني')}
const stage=$('previewStage');['dragenter','dragover'].forEach(type=>stage.addEventListener(type,e=>{e.preventDefault();stage.classList.add('drag-active')}));['dragleave','drop'].forEach(type=>stage.addEventListener(type,e=>{e.preventDefault();stage.classList.remove('drag-active')}));stage.addEventListener('drop',e=>{const files=[...(e.dataTransfer?.files||[])].filter(f=>f.type.startsWith('video/'));if(files.length)addFiles(files);else toast('أسقط ملفات فيديو مدعومة لإضافتها')});
$('addMediaBtn').onclick=$('addMediaTop').onclick=$('chooseFileBtn').onclick=()=>input.click();
input.onchange=()=>{addFiles([...input.files]);input.value=''};
$('addAudioBtn').onclick=()=>$('audioInput').click();$('audioInput').onchange=()=>{const file=$('audioInput').files[0];if(!file)return;if(state.musicUrl)URL.revokeObjectURL(state.musicUrl);state.musicFile=file;state.musicUrl=URL.createObjectURL(file);$('audioPreview').src=state.musicUrl;$('audioPreview').hidden=false;$('audioStatus').textContent=file.name;updateButtons();toast('تمت إضافة المسار الصوتي')};$('musicVolume').oninput=()=>{ $('audioPreview').volume=Number($('musicVolume').value);persist()};$('removeAudioBtn').onclick=()=>{if(state.musicUrl)URL.revokeObjectURL(state.musicUrl);state.musicFile=null;state.musicUrl=null;$('audioPreview').pause();$('audioPreview').removeAttribute('src');$('audioPreview').hidden=true;$('audioStatus').textContent='لم تتم إضافة موسيقى';updateButtons();toast('تمت إزالة المسار الصوتي')};
$('deleteBtn').onclick=()=>{if(state.selected)removeClip(state.selected)};
$('moveLeftBtn').onclick=()=>{const i=state.clips.findIndex(c=>c.id===state.selected);moveClip(i,-1)};
$('moveRightBtn').onclick=()=>{const i=state.clips.findIndex(c=>c.id===state.selected);moveClip(i,1)};
$('splitBtn').onclick=()=>{const c=selected();if(!c)return;const at=video.currentTime;if(at<=c.start+.1||at>=c.end-.1){toast('ضع مؤشر التشغيل داخل المقطع قبل التقسيم');return}const second={...c,id:uid(),start:at};c.end=at;state.clips.splice(state.clips.indexOf(c)+1,0,second);state.selected=second.id;render();selectClip(second.id);toast('تم تقسيم المقطع عند موضع التشغيل')};
$('playBtn').onclick=()=>{const c=selected();if(!c)return;video.currentTime=Math.max(c.start,video.currentTime);video.play()};
$('stopBtn').onclick=()=>video.pause();
video.ontimeupdate=()=>{const c=selected();if(!c)return;$('timeReadout').textContent=fmt(video.currentTime)+' / '+fmt(c.duration);$('seekSlider').value=String(video.currentTime);if(video.currentTime>=c.end){video.pause();video.currentTime=c.end}};$('seekSlider').oninput=()=>{const c=selected();if(!c)return;video.currentTime=Math.max(c.start,Math.min(Number($('seekSlider').value),c.end));};
$('aspectSelect').onchange=()=>{$('ratioLabel').textContent=$('aspectSelect').value;persist()};
function applyEffects(){const b=Number($('brightness').value),c=Number($('contrast').value),sat=Number($('saturation').value);video.style.filter='brightness('+(1+b)+') contrast('+c+') saturate('+sat+')';$('brightnessValue').textContent=b.toFixed(2);$('contrastValue').textContent=c.toFixed(2);$('saturationValue').textContent=sat.toFixed(2);persist()}['brightness','contrast','saturation'].forEach(id=>$(id).addEventListener('input',applyEffects));$('resetEffectsBtn').onclick=()=>{$('brightness').value='0';$('contrast').value='1';$('saturation').value='1';applyEffects();toast('تمت إعادة ضبط الألوان')};
$('projectName').oninput=persist;
$('saveProjectBtn').onclick=()=>{const data={format:'CLIPAI_PROJECT_V1',name:$('projectName').value,aspect:$('aspectSelect').value,quality:$('qualitySelect').value,fps:$('fpsSelect').value,musicVolume:Number($('musicVolume').value),clips:state.clips.map(c=>({name:c.name,start:c.start,end:c.end,duration:c.duration}))};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});download(blob,(data.name||'project')+'.clipai');toast('تم حفظ ملف إعدادات المشروع؛ أعد استيراد الوسائط عند فتحه')};
$('loadProjectBtn').onclick=()=>$('projectInput').click();
$('projectInput').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const data=JSON.parse(await f.text());if(data.format!=='CLIPAI_PROJECT_V1'||!Array.isArray(data.clips))throw Error();state.pendingProject=data;$('projectName').value=data.name||'مشروع مستورد';if(data.aspect)$('aspectSelect').value=data.aspect;if(data.quality)$('qualitySelect').value=data.quality;if(data.fps)$('fpsSelect').value=data.fps;if(data.musicVolume!==undefined)$('musicVolume').value=String(data.musicVolume);if(data.brightness!==undefined)$('brightness').value=String(data.brightness);if(data.contrast!==undefined)$('contrast').value=String(data.contrast);if(data.saturation!==undefined)$('saturation').value=String(data.saturation);toast('تم تحميل إعدادات المشروع. أضف ملفات الفيديو الأصلية لاستعادة ترتيبها ونقاط القص.');persist()}catch{toast('ملف المشروع غير صالح')}e.target.value=''};
function download(blob,name){const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)}
async function loadEngine(){if(state.ffmpeg)return state.ffmpeg;$('engineStatus').textContent='جارٍ تحميل محرك FFmpeg؛ قد يستغرق ذلك أول مرة.';const [{FFmpeg},{fetchFile,toBlobURL}]=await Promise.all([import('@ffmpeg/ffmpeg'),import('@ffmpeg/util')]);state.fetchFile=fetchFile;const ffmpeg=new FFmpeg();ffmpeg.on('progress',({progress})=>{$('exportProgress').value=Math.round(progress*100);$('progressText').textContent=Math.round(progress*100)+'%'});ffmpeg.on('log',({message})=>{state.ffmpegLogs.push(message);if(message.includes('Error'))console.warn(message)});const base='https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';await ffmpeg.load({coreURL:await toBlobURL(base+'/ffmpeg-core.js','text/javascript'),wasmURL:await toBlobURL(base+'/ffmpeg-core.wasm','application/wasm')});state.ffmpeg=ffmpeg;$('engineStatus').textContent='محرك FFmpeg جاهز — التصدير يتم داخل المتصفح.';return ffmpeg}
async function exportVideo(){if(state.exporting||!state.clips.length)return;state.exporting=true;updateButtons();$('progressWrap').hidden=false;$('exportProgress').value=0;$('progressText').textContent='0%';try{const ff=await loadEngine();for(const temp of ['concat.txt','output.mp4','final.mp4',...state.clips.flatMap((_,i)=>['input_'+i+'.mp4','part_'+i+'.mp4'])]){try{await ff.deleteFile(temp)}catch{}}const files=[];for(let i=0;i<state.clips.length;i++){const c=state.clips[i],name='input_'+i+'.mp4',out='part_'+i+'.mp4';await ff.writeFile(name,await state.fetchFile(c.file));state.ffmpegLogs=[];try{await ff.exec(['-i',name])}catch{}const hasAudio=state.ffmpegLogs.some(line=>/Stream #0:\d+.*Audio:/i.test(line));const args=['-ss',String(c.start),'-i',name];if(!hasAudio)args.push('-f','lavfi','-i','anullsrc=channel_layout=stereo:sample_rate=44100');args.push('-t',String(c.end-c.start),'-vf');const ratio=$('aspectSelect').value;const q=Number($('qualitySelect').value);let w=Math.round(q*16/9),h=q;if(ratio==='9:16'){w=Math.round(q*9/16);h=q}if(ratio==='1:1'){w=q;h=q}w=Math.max(2,Math.round(w/2)*2);h=Math.max(2,Math.round(h/2)*2);const brightness=Number($('brightness').value),contrast=Number($('contrast').value),saturation=Number($('saturation').value);args.push('eq=brightness='+brightness+':contrast='+contrast+':saturation='+saturation+',scale='+w+':'+h+':force_original_aspect_ratio=decrease,pad='+w+':'+h+':(ow-iw)/2:(oh-ih)/2,setsar=1,fps='+$('fpsSelect').value);args.push('-map','0:v:0','-map',hasAudio?'0:a:0':'1:a:0','-pix_fmt','yuv420p','-c:v','libx264','-preset','ultrafast','-crf','23','-c:a','aac','-ar','44100','-ac','2','-b:a','128k','-movflags','+faststart',out);const code=await ff.exec(args);if(code!==0)throw new Error('تعذر تجهيز المقطع رقم '+(i+1));files.push(out)}const concat=files.map(f=>"file '"+f+"'").join('\n');await ff.writeFile('concat.txt',new TextEncoder().encode(concat));const concatCode=await ff.exec(['-f','concat','-safe','0','-i','concat.txt','-map','0:v:0','-map','0:a:0','-c:v','libx264','-preset','ultrafast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-ar','44100','-ac','2','-b:a','128k','-movflags','+faststart','output.mp4']);if(concatCode!==0)throw new Error('تعذر دمج المقاطع؛ تحقق من صيغ الفيديو وحاول بملفات أقصر');let finalOutput='output.mp4';if(state.musicFile){const ext=(state.musicFile.name.split('.').pop()||'audio').replace(/[^a-z0-9]/gi,'').slice(0,8)||'audio';const musicName='background_audio.'+ext;await ff.writeFile(musicName,await state.fetchFile(state.musicFile));const total=state.clips.reduce((sum,clip)=>sum+clip.end-clip.start,0);const volume=Math.max(0,Math.min(1,Number($('musicVolume').value)||0));const mixCode=await ff.exec(['-i','output.mp4','-i',musicName,'-filter_complex','[0:a:0]volume=1,apad,atrim=duration='+total+'[original];[1:a:0]volume='+volume+',apad,atrim=duration='+total+'[bg];[original][bg]amix=inputs=2:duration=longest:dropout_transition=2[aout]','-map','0:v:0','-map','[aout]','-c:v','copy','-c:a','aac','-b:a','192k','-movflags','+faststart','final.mp4']);if(mixCode!==0)throw new Error('تعذر مزج الصوت الأصلي مع الموسيقى الخلفية');finalOutput='final.mp4'}const bytes=await ff.readFile(finalOutput);download(new Blob([bytes.buffer],{type:'video/mp4'}),($('projectName').value||'clip-ai')+'.mp4');$('engineStatus').textContent='اكتمل التصدير بنجاح.';toast('اكتمل إنشاء ملف MP4');for(const f of [...files,'concat.txt','output.mp4','final.mp4','background_audio.'+(state.musicFile?(state.musicFile.name.split('.').pop()||'audio').replace(/[^a-z0-9]/gi,'').slice(0,8)||'audio':'audio'),...state.clips.map((_,i)=>'input_'+i+'.mp4')]){try{await ff.deleteFile(f)}catch{}}}catch(err){console.error(err);$('engineStatus').textContent='تعذر التصدير. قد لا يدعم المتصفح/الجهاز تشغيل محرك FFmpeg أو قد تكون الذاكرة غير كافية.';toast('فشل التصدير: '+(err?.message||'خطأ غير معروف'))}finally{state.exporting=false;updateButtons()}}
$('exportBtn').onclick=exportVideo;
$('helpBtn').onclick=()=>{$('dialogTitle').textContent='طريقة استخدام CLIP AI';$('dialogText').textContent='استورد فيديوهات متعددة، اختر مقطعًا، اضبط بدايته ونهايته، ثم رتّب المقاطع أو قسّمها عند مؤشر التشغيل. زر تصدير MP4 يشغّل محرك FFmpeg داخل المتصفح. الملفات لا تُرفع إلى خادم. التصدير قد يستهلك ذاكرة كبيرة على الهواتف.';$('infoDialog').showModal()};
$('closeDialog').onclick=()=>$('infoDialog').close();
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{const tab=b.dataset.tab;if(tab==='editor')return;const msg=tab==='auto'?'المونتاج التلقائي يحتاج ربط نموذج ذكاء اصطناعي وخادم آمن قبل تفعيله.':'هذه الوحدة ضمن بنية المشروع، وسيتم ربطها بخدمات فعلية قبل إعلان جاهزيتها.';$('dialogTitle').textContent=b.textContent.trim();$('dialogText').textContent=msg;$('infoDialog').showModal()});
window.addEventListener('beforeunload',()=>{state.clips.forEach(c=>URL.revokeObjectURL(c.url));if(state.musicUrl)URL.revokeObjectURL(state.musicUrl)});
try{const recovered=JSON.parse(localStorage.getItem('clipai-project-meta')||'null');if(recovered?.format==='CLIPAI_PROJECT_V1'){state.pendingProject=recovered;$('projectName').value=recovered.name||$('projectName').value;if(recovered.aspect)$('aspectSelect').value=recovered.aspect;if(recovered.quality)$('qualitySelect').value=recovered.quality;if(recovered.fps)$('fpsSelect').value=recovered.fps;if(recovered.musicVolume!==undefined)$('musicVolume').value=String(recovered.musicVolume);if(recovered.brightness!==undefined)$('brightness').value=String(recovered.brightness);if(recovered.contrast!==undefined)$('contrast').value=String(recovered.contrast);if(recovered.saturation!==undefined)$('saturation').value=String(recovered.saturation);applyEffects();$('ratioLabel').textContent=$('aspectSelect').value;toast('تم استرجاع بيانات مشروعك السابق؛ أعد استيراد الفيديوهات والصوت الأصليين.')}}catch{localStorage.removeItem('clipai-project-meta')}
$('checkDeviceBtn')?.addEventListener('click',checkLocalDevice);
$('scanScenesBtn')?.addEventListener('click',scanSelectedScenes);
$('transcribeBtn')?.addEventListener('click',transcribeSelectedVideo);
checkLocalDevice();
render();
