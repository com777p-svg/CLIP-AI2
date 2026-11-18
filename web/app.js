const input=document.getElementById('fileInput');
const video=document.getElementById('videoPreview');
const empty=document.getElementById('emptyState');
const track=document.getElementById('videoTrack');
const toast=document.getElementById('toast');
let objectUrl=null, fileName='';
const notify=(message)=>{toast.textContent=message;toast.classList.add('show');clearTimeout(notify.timer);notify.timer=setTimeout(()=>toast.classList.remove('show'),2600)};
const choose=()=>input.click();
document.getElementById('addMediaBtn').addEventListener('click',choose);
document.getElementById('chooseFileBtn').addEventListener('click',choose);
input.addEventListener('change',()=>{
 const file=input.files&&input.files[0]; if(!file)return;
 if(!file.type.startsWith('video/')){notify('اختر ملف فيديو صالحًا');return}
 if(objectUrl)URL.revokeObjectURL(objectUrl);
 objectUrl=URL.createObjectURL(file);fileName=file.name;
 video.src=objectUrl;video.hidden=false;empty.hidden=true;
 document.getElementById('clipCount').textContent='1 مقطع';
 track.innerHTML='<div class="clip-block"><span>▣</span><span>'+escapeText(file.name)+'</span></div>';
 document.getElementById('removeBtn').disabled=false;
 document.getElementById('splitBtn').disabled=false;
 video.onloadedmetadata=()=>{document.getElementById('timeReadout').textContent='00:00 / '+format(video.duration)};
 document.getElementById('exportBtn').disabled=false;
 notify('تمت إضافة الفيديو للمعاينة المحلية');
});
video.addEventListener('timeupdate',()=>{document.getElementById('timeReadout').textContent=format(video.currentTime)+' / '+format(video.duration||0)});
document.getElementById('removeBtn').addEventListener('click',()=>{
 video.pause();video.removeAttribute('src');video.load();video.hidden=true;empty.hidden=false;track.innerHTML='<div class="track-placeholder">أضف فيديو ليظهر هنا في الخط الزمني</div>';
 document.getElementById('clipCount').textContent='لا توجد مقاطع';document.getElementById('timeReadout').textContent='00:00 / 00:00';
 document.getElementById('removeBtn').disabled=true;document.getElementById('splitBtn').disabled=true;document.getElementById('exportBtn').disabled=true;
 if(objectUrl)URL.revokeObjectURL(objectUrl);objectUrl=null;input.value='';notify('تمت إزالة الفيديو من المشروع');
});
document.getElementById('splitBtn').addEventListener('click',()=>notify('أداة التقسيم قيد التنفيذ — لم نفعّلها قبل اكتمال اختبارها'));
document.getElementById('aspectSelect').addEventListener('change',e=>{document.getElementById('ratioLabel').textContent=e.target.value;notify('تم تغيير مساحة المعاينة إلى '+e.target.value)});
document.getElementById('exportBtn').addEventListener('click',()=>notify('محرك التصدير للموقع لم يُربط بعد؛ لن ندّعي إنشاء ملف غير موجود.'));
document.getElementById('helpBtn').addEventListener('click',()=>notify('أضف فيديو من جهازك لمعاينته محليًا.'));
document.querySelectorAll('[data-soon]').forEach(el=>el.addEventListener('click',()=>notify(el.dataset.soon+' — ضمن خطة التطوير')));
function format(s){if(!Number.isFinite(s))return '00:00';let n=Math.floor(s);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0')}
function escapeText(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
