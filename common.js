const ML = {
  categories: [
    'Văn bản đến — Trung ương',
    'Văn bản đến — Sở GD&ĐT Tuyên Quang',
    'Văn bản đến — Xã Mậu Duệ',
    'Văn bản đến — UBND tỉnh Tuyên Quang',
    'Văn bản nhà trường ban hành',
    'Văn bản Đảng bộ',
    'Đảng bộ — Chi bộ Trường Tiểu học',
    'Đảng bộ — Chi bộ Trường THCS',
    'Văn bản Đoàn–Đội',
    'Chế độ chính sách giáo viên',
    'Chế độ chính sách học sinh',
    'Văn bản khác'
  ],
  forms: ['Công văn', 'Kế hoạch', 'Quyết định', 'Thông báo', 'Hướng dẫn', 'Báo cáo', 'Tờ trình', 'Quy chế', 'Chương trình', 'Biên bản', 'Thông tư', 'Nghị quyết', 'Khác'],
  normalize: value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase(),
  escape: value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char])),
  safeUrl(value) { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } },
  date(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value.split('-').reverse().join('/') : 'Chưa cập nhật'; },
  validate(data) {
    if (!Array.isArray(data)) throw new Error('Danh mục phải là một danh sách.');
    const ids = new Set();
    return data.map((item, index) => {
      if (!item || typeof item.title !== 'string' || !item.title.trim()) throw new Error(`Văn bản ${index + 1} thiếu tên.`);
      const id = String(item.id || `vb-${index + 1}`);
      if (ids.has(id)) throw new Error(`Trùng mã văn bản: ${id}`);
      ids.add(id);
      const record = {id};
      for (const key of ['title','number','date','category','form','year','issuer','department','deadline','note']) record[key] = String(item[key] || '').trim();
      record.url = ML.safeUrl(item.url);
      if (!record.url) throw new Error(`Văn bản ${index + 1} cần liên kết HTTPS hợp lệ.`);
      record.attachments = (Array.isArray(item.attachments) ? item.attachments : []).map(file => ({name: String(file.name || 'Tài liệu kèm theo'), url: ML.safeUrl(file.url)})).filter(file => file.url);
      return record;
    });
  }
};
