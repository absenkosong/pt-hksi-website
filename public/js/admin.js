// PT HASTA KARYA SEJAHTERA INDONESIA (HKSI) - Admin JS

document.addEventListener('DOMContentLoaded', () => {
  // Check auth
  checkAuth();

  // Navigation Tabs
  const navLinks = document.querySelectorAll('.admin-nav-link[data-tab]');
  const tabPanes = document.querySelectorAll('.admin-tab-pane');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute('data-tab');

      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      tabPanes.forEach(pane => {
        if (pane.id === targetTab) {
          pane.style.display = 'block';
        } else {
          pane.style.display = 'none';
        }
      });

      // Load specific tab data
      if (targetTab === 'tab-dashboard') loadDashboard();
      if (targetTab === 'tab-pesan') loadMessages();
      if (targetTab === 'tab-layanan') loadServices();
      if (targetTab === 'tab-portofolio') loadProjects();
      if (targetTab === 'tab-pengaturan') loadSettings();
    });
  });

  // Initial load
  loadDashboard();
});

// Toast notification helper
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `admin-toast admin-toast-${type}`;
  toast.style.cssText = `
    position: fixed;
    top: 24px;
    right: 24px;
    background: ${type === 'success' ? '#0753AE' : '#DC2626'};
    color: #fff;
    padding: 14px 22px;
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    z-index: 9999;
    font-weight: 600;
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid ${type === 'success' ? '#F5BE38' : '#F87171'};
    transition: all 0.3s ease;
  `;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : '⚠'}</span>
    <span>${message}</span>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Check session
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/check');
    const data = await res.json();
    if (!data.authenticated) {
      window.location.href = '/admin/login';
    } else {
      const adminNameEl = document.getElementById('adminLoggedName');
      if (adminNameEl && data.user) {
        adminNameEl.textContent = data.user.name;
      }
    }
  } catch {
    window.location.href = '/admin/login';
  }
}

// Logout
async function handleLogout() {
  if (confirm('Apakah Anda yakin ingin keluar dari panel admin?')) {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/admin/login';
  }
}

// 1. Dashboard Tab
async function loadDashboard() {
  try {
    const [msgRes, projRes, servRes] = await Promise.all([
      fetch('/api/pesan'),
      fetch('/api/portofolio'),
      fetch('/api/layanan')
    ]);

    const messages = await msgRes.json();
    const projects = await projRes.json();
    const services = await servRes.json();

    document.getElementById('statTotalPesan').textContent = messages.length || 0;
    const unread = messages.filter(m => m.status === 'unread').length;
    document.getElementById('statUnreadPesan').textContent = unread;
    document.getElementById('statTotalProjects').textContent = projects.length || 0;
    document.getElementById('statTotalServices').textContent = services.length || 0;

    // Recent 5 messages
    const recentTableBody = document.getElementById('dashboardRecentMessages');
    if (recentTableBody) {
      if (messages.length === 0) {
        recentTableBody.innerHTML = '<tr><td colspan="5" class="text-center">Belum ada pesan masuk.</td></tr>';
      } else {
        recentTableBody.innerHTML = messages.slice(0, 5).map(m => `
          <tr>
            <td><strong>${escapeHtml(m.name)}</strong><br><small class="text-muted">${escapeHtml(m.company || '-')}</small></td>
            <td><a href="tel:${escapeHtml(m.phone)}" class="text-blue">${escapeHtml(m.phone)}</a></td>
            <td><span class="badge-tag">${escapeHtml(m.service_interest || 'Umum')}</span></td>
            <td>${renderStatusBadge(m.status)}</td>
            <td>
              <button onclick="viewMessageDetail(${m.id})" class="btn btn-sm btn-outline-blue" style="padding:4px 10px;font-size:0.8rem;">Detail</button>
            </td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    console.error('Error loading dashboard:', err);
  }
}

// 2. Messages Tab
let cachedMessages = [];
async function loadMessages() {
  try {
    const res = await fetch('/api/pesan');
    cachedMessages = await res.json();
    renderMessagesTable(cachedMessages);
  } catch (err) {
    console.error('Error loading messages:', err);
  }
}

function renderMessagesTable(list) {
  const tbody = document.getElementById('messagesTableBody');
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;">Belum ada data pesan masuk.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map(m => `
    <tr>
      <td>#${m.id}</td>
      <td>
        <strong>${escapeHtml(m.name)}</strong><br>
        <small class="text-muted">${escapeHtml(m.company || 'Perseorangan')}</small>
      </td>
      <td>
        <div>${escapeHtml(m.email)}</div>
        <a href="https://wa.me/${cleanPhone(m.phone)}" target="_blank" class="text-gold" style="font-weight:700;display:inline-flex;align-items:center;gap:4px;">
          <span>💬</span> ${escapeHtml(m.phone)}
        </a>
      </td>
      <td><span class="badge-tag">${escapeHtml(m.service_interest || 'Permintaan Umum')}</span></td>
      <td>${renderStatusBadge(m.status)}</td>
      <td><small>${formatDate(m.created_at)}</small></td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button onclick="viewMessageDetail(${m.id})" class="btn btn-outline-blue" style="padding:6px 10px;font-size:0.8rem;">Lihat</button>
          <button onclick="deleteMessage(${m.id})" class="btn btn-outline-white" style="padding:6px 10px;font-size:0.8rem;background:#fee2e2;color:#b91c1c;border-color:#fca5a5;">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderStatusBadge(status) {
  if (status === 'unread') return '<span style="background:#fef3c7;color:#92400e;padding:4px 10px;border-radius:9999px;font-size:0.75rem;font-weight:700;">Baru (Belum Dibaca)</span>';
  if (status === 'in_progress') return '<span style="background:#dbeafe;color:#1e40af;padding:4px 10px;border-radius:9999px;font-size:0.75rem;font-weight:700;">Sedang Diproses</span>';
  return '<span style="background:#d1fae5;color:#065f46;padding:4px 10px;border-radius:9999px;font-size:0.75rem;font-weight:700;">Selesai Dihubungi</span>';
}

function viewMessageDetail(id) {
  const m = cachedMessages.find(item => item.id === id);
  if (!m) return;

  const modal = document.getElementById('messageDetailModal');
  const body = document.getElementById('messageDetailBody');
  if (!modal || !body) return;

  body.innerHTML = `
    <div style="margin-bottom:16px;">
      <p><strong>Pengirim:</strong> ${escapeHtml(m.name)} (${escapeHtml(m.company || 'Perorangan')})</p>
      <p><strong>Email:</strong> <a href="mailto:${escapeHtml(m.email)}" class="text-blue">${escapeHtml(m.email)}</a></p>
      <p><strong>No. Telepon / WhatsApp:</strong> <a href="https://wa.me/${cleanPhone(m.phone)}" target="_blank" class="text-gold" style="font-weight:700;">${escapeHtml(m.phone)} (Buka WA)</a></p>
      <p><strong>Layanan Diminati:</strong> <span class="badge-tag">${escapeHtml(m.service_interest || '-')}</span></p>
      <p><strong>Waktu Masuk:</strong> ${formatDate(m.created_at)}</p>
    </div>
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin-bottom:20px;">
      <strong style="display:block;margin-bottom:6px;color:#0B132B;">Isi Pesan / Rincian Kebutuhan:</strong>
      <p style="white-space:pre-wrap;color:#334155;line-height:1.6;">${escapeHtml(m.message)}</p>
    </div>
    <div class="form-group">
      <label class="form-label">Ubah Status Penanganan:</label>
      <select id="updateMessageStatusSelect" class="form-control" style="max-width:300px;">
        <option value="unread" ${m.status === 'unread' ? 'selected' : ''}>Baru (Belum Dibaca)</option>
        <option value="in_progress" ${m.status === 'in_progress' ? 'selected' : ''}>Sedang Diproses / Dihubungi</option>
        <option value="completed" ${m.status === 'completed' ? 'selected' : ''}>Selesai / Terfollow-up</option>
      </select>
    </div>
  `;

  document.getElementById('btnSaveMessageStatus').onclick = async () => {
    const newStatus = document.getElementById('updateMessageStatusSelect').value;
    try {
      const res = await fetch(`/api/pesan/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        showToast('Status pesan berhasil diperbarui!');
        closeModal('messageDetailModal');
        loadMessages();
        loadDashboard();
      }
    } catch {
      showToast('Gagal mengubah status pesan', 'error');
    }
  };

  modal.style.display = 'flex';
}

async function deleteMessage(id) {
  if (confirm(`Apakah Anda yakin ingin menghapus pesan #${id}? Tindakan ini permanen.`)) {
    try {
      const res = await fetch(`/api/pesan/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Pesan berhasil dihapus!');
        loadMessages();
        loadDashboard();
      }
    } catch {
      showToast('Gagal menghapus pesan', 'error');
    }
  }
}

// 3. Services Tab
let cachedServices = [];
async function loadServices() {
  try {
    const res = await fetch('/api/layanan');
    cachedServices = await res.json();
    const tbody = document.getElementById('servicesTableBody');
    if (!tbody) return;

    tbody.innerHTML = cachedServices.map(s => `
      <tr>
        <td>#${s.id}</td>
        <td>
          <img src="${s.image}" style="width:70px;height:45px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;">
        </td>
        <td>
          <strong>${escapeHtml(s.title)}</strong><br>
          <small class="badge-tag">${escapeHtml(s.category)}</small>
        </td>
        <td>${escapeHtml(s.badge || '-')}</td>
        <td>
          <small class="text-muted">${(s.features || []).length} Poin Spesifikasi</small>
        </td>
        <td>
          <button onclick="editService(${s.id})" class="btn btn-outline-blue" style="padding:6px 12px;font-size:0.82rem;">Edit Layanan</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading services:', err);
  }
}

function editService(id) {
  const s = cachedServices.find(item => item.id === id);
  if (!s) return;

  const modal = document.getElementById('serviceEditModal');
  if (!modal) return;

  document.getElementById('editServiceId').value = s.id;
  document.getElementById('editServiceTitle').value = s.title;
  document.getElementById('editServiceCategory').value = s.category;
  document.getElementById('editServiceBadge').value = s.badge || '';
  document.getElementById('editServiceShortDesc').value = s.short_desc;
  document.getElementById('editServiceFullDesc').value = s.full_desc;
  document.getElementById('editServiceFeatures').value = (s.features || []).join('\n');

  modal.style.display = 'flex';
}

async function saveServiceEdit(e) {
  e.preventDefault();
  const id = document.getElementById('editServiceId').value;
  const featuresRaw = document.getElementById('editServiceFeatures').value;
  const features = featuresRaw.split('\n').map(f => f.trim()).filter(Boolean);

  const payload = {
    title: document.getElementById('editServiceTitle').value,
    category: document.getElementById('editServiceCategory').value,
    badge: document.getElementById('editServiceBadge').value,
    short_desc: document.getElementById('editServiceShortDesc').value,
    full_desc: document.getElementById('editServiceFullDesc').value,
    features: features
  };

  try {
    const res = await fetch(`/api/layanan/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('Layanan berhasil diperbarui!');
      closeModal('serviceEditModal');
      loadServices();
    } else {
      showToast('Gagal memperbarui layanan', 'error');
    }
  } catch {
    showToast('Kesalahan koneksi saat menyimpan layanan', 'error');
  }
}

// 4. Projects Tab
let cachedProjects = [];
async function loadProjects() {
  try {
    const res = await fetch('/api/portofolio');
    cachedProjects = await res.json();
    const tbody = document.getElementById('projectsTableBody');
    if (!tbody) return;

    if (cachedProjects.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada portofolio proyek.</td></tr>';
      return;
    }

    tbody.innerHTML = cachedProjects.map(p => `
      <tr>
        <td>#${p.id}</td>
        <td>
          <img src="${p.image}" style="width:70px;height:48px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;">
        </td>
        <td>
          <strong>${escapeHtml(p.title)}</strong><br>
          <small class="badge-tag">${escapeHtml(p.category)}</small>
        </td>
        <td>${escapeHtml(p.client || '-')}<br><small class="text-muted">${escapeHtml(p.location || '-')}</small></td>
        <td>${escapeHtml(p.year || '-')}</td>
        <td>
          <span style="color:${p.featured ? '#D4AF37' : '#94A3B8'};font-weight:700;">
            ${p.featured ? '★ Unggulan' : 'Normal'}
          </span>
        </td>
        <td>
          <div style="display:flex;gap:6px;">
            <button onclick="editProject(${p.id})" class="btn btn-outline-blue" style="padding:6px 10px;font-size:0.8rem;">Edit</button>
            <button onclick="deleteProject(${p.id})" class="btn btn-outline-white" style="padding:6px 10px;font-size:0.8rem;background:#fee2e2;color:#b91c1c;border-color:#fca5a5;">Hapus</button>
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading projects:', err);
  }
}

function openAddProjectModal() {
  const form = document.getElementById('projectForm');
  if (form) form.reset();
  document.getElementById('projectId').value = '';
  document.getElementById('projectModalTitle').textContent = 'Tambah Portofolio Proyek Baru';
  document.getElementById('projectModal').style.display = 'flex';
}

function editProject(id) {
  const p = cachedProjects.find(item => item.id === id);
  if (!p) return;

  document.getElementById('projectId').value = p.id;
  document.getElementById('projectTitle').value = p.title;
  document.getElementById('projectCategory').value = p.category;
  document.getElementById('projectClient').value = p.client;
  document.getElementById('projectLocation').value = p.location;
  document.getElementById('projectYear').value = p.year;
  document.getElementById('projectDesc').value = p.description;
  document.getElementById('projectFeatured').checked = p.featured === 1;

  document.getElementById('projectModalTitle').textContent = 'Edit Portofolio Proyek #' + p.id;
  document.getElementById('projectModal').style.display = 'flex';
}

async function saveProject(e) {
  e.preventDefault();
  const id = document.getElementById('projectId').value;
  const fileInput = document.getElementById('projectImageFile');

  const formData = new FormData();
  formData.append('title', document.getElementById('projectTitle').value);
  formData.append('category', document.getElementById('projectCategory').value);
  formData.append('client', document.getElementById('projectClient').value);
  formData.append('location', document.getElementById('projectLocation').value);
  formData.append('year', document.getElementById('projectYear').value);
  formData.append('description', document.getElementById('projectDesc').value);
  formData.append('featured', document.getElementById('projectFeatured').checked ? '1' : '0');

  if (fileInput.files.length > 0) {
    formData.append('image', fileInput.files[0]);
  }

  const url = id ? `/api/portofolio/${id}` : '/api/portofolio';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method: method,
      body: formData
    });
    if (res.ok) {
      showToast(id ? 'Proyek berhasil diperbarui!' : 'Proyek baru berhasil ditambahkan!');
      closeModal('projectModal');
      loadProjects();
    } else {
      showToast('Gagal menyimpan proyek', 'error');
    }
  } catch {
    showToast('Kesalahan saat menyimpan proyek', 'error');
  }
}

async function deleteProject(id) {
  if (confirm(`Apakah Anda yakin ingin menghapus proyek #${id}?`)) {
    try {
      const res = await fetch(`/api/portofolio/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Proyek berhasil dihapus!');
        loadProjects();
      }
    } catch {
      showToast('Gagal menghapus proyek', 'error');
    }
  }
}

// 5. Settings Tab
async function loadSettings() {
  try {
    const res = await fetch('/api/pengaturan');
    const settings = await res.json();

    document.getElementById('setCompanyName').value = settings.company_name || '';
    document.getElementById('setTagline').value = settings.tagline || '';
    document.getElementById('setMotto').value = settings.motto || '';
    document.getElementById('setPhone').value = settings.phone || '';
    document.getElementById('setWhatsapp').value = settings.whatsapp || '';
    document.getElementById('setEmail').value = settings.email || '';
    document.getElementById('setAddress').value = settings.address || '';
    document.getElementById('setOperatingHours').value = settings.operating_hours || '';
    document.getElementById('setVision').value = settings.vision || '';
    document.getElementById('setSkMenkumham').value = settings.sk_menkumham || '';
    document.getElementById('setNib').value = settings.nib || '';
    document.getElementById('setNpwp').value = settings.npwp || '';
  } catch (err) {
    console.error('Error loading settings:', err);
  }
}

async function saveSettings(e) {
  e.preventDefault();
  const payload = {
    company_name: document.getElementById('setCompanyName').value,
    tagline: document.getElementById('setTagline').value,
    motto: document.getElementById('setMotto').value,
    phone: document.getElementById('setPhone').value,
    whatsapp: document.getElementById('setWhatsapp').value,
    email: document.getElementById('setEmail').value,
    address: document.getElementById('setAddress').value,
    operating_hours: document.getElementById('setOperatingHours').value,
    vision: document.getElementById('setVision').value,
    sk_menkumham: document.getElementById('setSkMenkumham').value,
    nib: document.getElementById('setNib').value,
    npwp: document.getElementById('setNpwp').value
  };

  try {
    const res = await fetch('/api/pengaturan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      showToast('Pengaturan perusahaan berhasil disimpan!');
    } else {
      showToast('Gagal menyimpan pengaturan', 'error');
    }
  } catch {
    showToast('Kesalahan saat menyimpan pengaturan', 'error');
  }
}

// Helper utilities
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

function cleanPhone(phone) {
  if (!phone) return '6289502431727';
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  }
  return clean;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
