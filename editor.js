const $ = selector => document.querySelector(selector);
const form = $('#record-form');
const draftKey = 'mau-long-catalog-draft:' + location.pathname;
let records = [], activeId = '', formDirty = false, removedRecord = null;
const names = ['id','title','number','date','category','form','year','issuer','department','deadline','url','note'];
for (const [name,values] of [['category',ML.categories],['form',ML.forms]]) form.elements[name].innerHTML = values.map(value => `<option>${ML.escape(value)}</option>`).join('');
function status(message) { $('#status').textContent = message; }
function saveDraft(message) {
  try { localStorage.setItem(draftKey,JSON.stringify(records)); status(message + ' Bản soạn đã lưu trên trình duyệt này; chưa đăng lên website.'); }
  catch { status(message + ' Hãy tải data.json để giữ bản soạn.'); }
}
function renderList() {
  const query = ML.normalize($('#editor-search').value);
  const list = records.filter(record => ML.normalize(record.title+' '+record.number).includes(query));
  $('#editor-records').innerHTML = list.map(record => `<button class="record-button" data-id="${ML.escape(record.id)}" aria-pressed="${record.id === activeId}">${ML.escape(record.title)}<small>${ML.escape(record.number || record.form)}</small></button>`).join('') || '<p>Chưa có văn bản phù hợp.</p>';
}
function openRecord(record) {
  form.reset(); activeId = record?.id || ''; formDirty = false;
  for (const name of names) form.elements[name].value = record?.[name] || (name==='year'?'2026–2027':name==='category'?ML.categories[0]:name==='form'?ML.forms[0]:'');
  form.elements.attachments.value = (record?.attachments || []).map(file=>file.name+' | '+file.url).join('\n');
  $('#form-heading').textContent = activeId ? 'Chỉnh sửa văn bản' : 'Thêm văn bản';
  $('#delete').hidden = !activeId;
  $('#delete').textContent = 'Xóa khỏi bản soạn'; removedRecord = null;
  renderList();
}
form.addEventListener('input', () => { formDirty = true; });
form.addEventListener('change', () => { formDirty = true; });
form.addEventListener('submit', event => {
  event.preventDefault();
  const record = Object.fromEntries(names.map(name=>[name,form.elements[name].value.trim()]));
  record.id = activeId || 'vb-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
  try {
    record.attachments = form.elements.attachments.value.split('\n').filter(line=>line.trim()).map(line=>{
      const separator = line.indexOf('|');
      if (separator < 1) throw new Error('Tài liệu kèm theo cần định dạng: tên | liên kết.');
      const name=line.slice(0,separator).trim(), url=ML.safeUrl(line.slice(separator+1).trim());
      if (!url) throw new Error('Liên kết tài liệu kèm theo cần bắt đầu bằng https://.');
      return {name,url};
    });
    const validated = ML.validate([record])[0];
    const index = records.findIndex(item=>item.id===validated.id);
    if (index>=0) records[index]=validated; else records.unshift(validated);
    openRecord(validated); saveDraft(`Đã lưu “${validated.title}”. Tổng cộng ${records.length} văn bản.`);
  } catch(error) { status(error.message); }
});
$('#new').onclick = () => { openRecord(null); form.elements.title.focus(); };
$('#cancel').onclick = () => openRecord(records.find(record=>record.id===activeId));
$('#editor-search').oninput = renderList;
$('#editor-records').onclick = event => { const button=event.target.closest('[data-id]'); if(button) openRecord(records.find(record=>record.id===button.dataset.id)); };
$('#delete').onclick = () => {
  if (removedRecord) { records.splice(removedRecord.index,0,removedRecord.record); const restored=removedRecord.record; openRecord(restored); saveDraft('Đã hoàn tác xóa.'); return; }
  const index=records.findIndex(record=>record.id===activeId);
  if(index<0) return;
  removedRecord={index,record:records[index]}; records.splice(index,1);
  $('#delete').textContent='Hoàn tác xóa'; renderList(); saveDraft('Đã xóa khỏi bản soạn. Có thể chọn “Hoàn tác xóa” ngay tại đây.');
};
$('#export').onclick = () => {
  if(formDirty) { status('Biểu mẫu có thay đổi chưa lưu. Chọn “Lưu vào bản soạn” hoặc “Bỏ thay đổi trên biểu mẫu” trước khi xuất.'); return; }
  try {
    const valid=ML.validate(records);
    const blob=new Blob([JSON.stringify(valid,null,2)+'\n'],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(blob), link=document.createElement('a'); link.href=url; link.download='data.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
    status(`Đã xuất ${valid.length} văn bản. Tải tệp data.json này lên GitHub và chọn Commit changes để đăng.`);
  } catch(error) { status(error.message); }
};
$('#import').onchange = async event => {
  const file=event.target.files[0]; if(!file)return;
  try { const incoming=ML.validate(JSON.parse(await file.text())); records=incoming; openRecord(null); saveDraft(`Đã mở danh mục ${records.length} văn bản.`); }
  catch(error) { status('Không mở được tệp: '+error.message); }
  event.target.value='';
};
async function load() {
  try {
    const response=await fetch('data.json',{cache:'no-store'}); if(!response.ok)throw new Error('Chưa đọc được danh mục');
    const published=ML.validate(await response.json());
    let draft; try { draft=JSON.parse(localStorage.getItem(draftKey)||'null'); } catch {}
    records=draft ? ML.validate(draft) : published;
    status(draft ? `Đang dùng bản soạn trên trình duyệt này (${records.length} văn bản). Chọn “Mở danh mục từ máy” để thay bằng bản khác.` : `Đã tải ${records.length} văn bản từ website. Có thể chọn một mục để sửa hoặc thêm văn bản mới.`);
    openRecord(null);
  } catch(error) { status(error.message+'. Mở tệp data.json từ máy để bắt đầu.'); openRecord(null); }
  try { const response=await fetch('config.json',{cache:'no-store'}); const config=await response.json(); const url=new URL(config.repositoryUrl); if(url.origin==='https://github.com'){ $('#github').href=url.href; $('#github').hidden=false; } } catch {}
}
load();
