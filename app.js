const $ = selector => document.querySelector(selector);
const esc = ML.escape;
let records = [], bookmarks = new Set();
try { bookmarks = new Set(JSON.parse(localStorage.getItem('mau-long-saved') || '[]')); } catch {}

function matchesGroup(record, group) {
  return !group || record.category === group || (group === 'Văn bản Đảng bộ' && record.category.startsWith('Đảng bộ —'));
}
function filteredRecords() {
  const words = ML.normalize($('#query').value).split(/\s+/).filter(Boolean);
  return records.filter(record => matchesGroup(record, $('#category').value)
    && (!$('#form').value || record.form === $('#form').value)
    && (!$('#year').value || record.year === $('#year').value)
    && (!$('#saved').checked || bookmarks.has(record.id))
    && words.every(word => ML.normalize([record.title,record.number,record.issuer,record.department,record.note,record.form].join(' ')).includes(word)))
    .sort((a,b) => {
      const mode = $('#sort').value;
      if (mode === 'due') return (a.deadline || '9999').localeCompare(b.deadline || '9999');
      if (!a.date) return b.date ? 1 : 0;
      if (!b.date) return -1;
      return mode === 'old' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date);
    });
}
function renderGroups() {
  $('#groups').innerHTML = ['Tất cả văn bản', ...ML.categories].map((name,index) => {
    const value = index ? name : '';
    const count = records.filter(record => matchesGroup(record,value)).length;
    return `<button class="group-button" data-group="${esc(value)}" aria-pressed="${$('#category').value === value}"><span class="group-number">${String(index).padStart(2,'0')}</span><span>${esc(name)}<small>${count} văn bản</small></span></button>`;
  }).join('');
}
function render() {
  const list = filteredRecords();
  $('#count').textContent = `${list.length} / ${records.length} văn bản`;
  $('#results').innerHTML = list.length ? list.map(record => `<article class="card">
    <div class="doc-icon" aria-hidden="true">${esc(record.form || 'VB')}</div>
    <div><div class="tags"><span class="tag">${esc(record.category)}</span><span>${esc(record.year)}</span></div>
    <h3>${esc(record.title)}</h3><div class="metadata">${esc(record.number || 'Chưa cập nhật số/ký hiệu')}${record.date ? ' · '+ML.date(record.date) : ''}${record.issuer ? '<br>'+esc(record.issuer) : ''}${record.deadline ? ' · Hạn: '+ML.date(record.deadline) : ''}</div></div>
    <div class="actions"><button class="bookmark" data-save="${esc(record.id)}" aria-pressed="${bookmarks.has(record.id)}" aria-label="${bookmarks.has(record.id) ? 'Bỏ lưu' : 'Lưu'}: ${esc(record.title)}">${bookmarks.has(record.id) ? '★' : '☆'}</button>
    <button class="detail" data-detail="${esc(record.id)}">Xem chi tiết ↗</button></div></article>`).join('') : '<div class="empty"><h3>Chưa có văn bản phù hợp</h3><p>Thử từ khóa khác hoặc chọn “Xóa bộ lọc”. Những nhóm chưa có tài liệu sẽ được bổ sung sau.</p></div>';
}
function openDialog(html) { $('#dialog-content').innerHTML = html; $('#dialog').showModal(); }
$('#groups').addEventListener('click', event => {
  const button = event.target.closest('[data-group]');
  if (button) { $('#category').value = button.dataset.group; renderGroups(); render(); }
});
$('#results').addEventListener('click', event => {
  const save = event.target.closest('[data-save]');
  if (save) {
    const id = save.dataset.save;
    bookmarks.has(id) ? bookmarks.delete(id) : bookmarks.add(id);
    try { localStorage.setItem('mau-long-saved', JSON.stringify([...bookmarks])); } catch {}
    render();
  }
  const detail = event.target.closest('[data-detail]');
  if (detail) {
    const record = records.find(item => item.id === detail.dataset.detail);
    if (!record) return;
    const fields = [['Số / ký hiệu',record.number],['Ngày ban hành',ML.date(record.date)],['Loại văn bản',record.form],['Cơ quan ban hành',record.issuer],['Năm học',record.year],['Bộ phận thực hiện',record.department],['Hạn thực hiện',record.deadline ? ML.date(record.deadline) : 'Chưa giao hạn'],['Nội dung triển khai',record.note]];
    openDialog(`<span class="eyebrow">THÔNG TIN VĂN BẢN</span><h2>${esc(record.title)}</h2><dl>${fields.map(([label,value]) => `<dt>${label}</dt><dd>${esc(value || 'Chưa cập nhật')}</dd>`).join('')}</dl><a class="primary" target="_blank" rel="noopener noreferrer" href="${esc(record.url)}">Mở văn bản gốc ↗</a>${record.attachments.length ? '<h3>Tài liệu kèm theo</h3><ul class="attachments">'+record.attachments.map(file => `<li><a href="${esc(file.url)}" target="_blank" rel="noopener noreferrer">${esc(file.name)} ↗</a></li>`).join('')+'</ul>' : ''}<p>Đăng nhập Google bằng email đã được nhà trường cấp quyền để mở tài liệu trên Drive.</p>`);
  }
});
$('#guide').onclick = () => openDialog('<span class="eyebrow">HƯỚNG DẪN</span><h2>Tìm và mở văn bản</h2><ol><li>Nhập số/ký hiệu hoặc tên văn bản. Có thể gõ không dấu, ví dụ “co so vat chat”.</li><li>Chọn nhóm, loại văn bản hoặc năm học để thu hẹp kết quả.</li><li>Chọn “Xem chi tiết”, sau đó “Mở văn bản gốc”. Tài liệu kèm theo nằm trong phần chi tiết.</li><li>Đăng nhập Google bằng email được nhà trường cấp quyền. Nếu Drive từ chối truy cập, liên hệ văn thư.</li><li>Nhấn ngôi sao để lưu mục thường dùng trên trình duyệt này.</li></ol><p>Danh mục tra cứu hiển thị công khai. Quyền xem nội dung tệp do Google Drive kiểm soát.</p>');
$('.close').onclick = () => $('#dialog').close();
$('#dialog').addEventListener('click', event => {
  if (event.target !== $('#dialog')) return;
  const box = $('#dialog').getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) $('#dialog').close();
});
for (const id of ['query','category','form','year','sort','saved']) $('#'+id).addEventListener(id === 'query' ? 'input' : 'change', () => { renderGroups(); render(); });
$('#reset').onclick = () => {
  for (const id of ['query','category','form','year']) $('#'+id).value = '';
  $('#sort').value = 'new'; $('#saved').checked = false; renderGroups(); render();
};
async function load() {
  try {
    const response = await fetch('data.json', {cache:'no-store'});
    if (!response.ok) throw new Error('Không tải được danh mục');
    records = ML.validate(await response.json());
    $('#notice').textContent = `${records.length} văn bản trong danh mục. Nội dung tệp trên Drive chỉ mở cho email được nhà trường cấp quyền.`;
  } catch {
    $('#notice').textContent = 'Chưa tải được danh mục. Hãy tải lại trang hoặc liên hệ văn thư.';
    $('#notice').classList.add('error');
  }
  for (const [id,values] of [['category',[...new Set([...ML.categories,...records.map(item=>item.category)])]],['form',[...new Set(records.map(item=>item.form).filter(Boolean))]],['year',[...new Set(records.map(item=>item.year).filter(Boolean))].sort().reverse()]]) {
    $('#'+id).innerHTML += values.map(value => `<option value="${esc(value)}">${esc(value)}</option>`).join('');
  }
  renderGroups(); render();
}
load();
