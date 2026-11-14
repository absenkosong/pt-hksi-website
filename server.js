const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const { db, getSettings, getServices, getProjects, getMessages } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Setup Multer for Image Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.VERCEL
      ? path.join(require('node:os').tmpdir(), 'uploads')
      : path.join(__dirname, 'public', 'images', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      try {
        fs.mkdirSync(uploadDir, { recursive: true });
      } catch (e) {}
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + ext;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser('hksi-secret-session-key-2026'));
app.use(express.static(path.join(__dirname, 'public')));

// Template Rendering Helper
function renderPage(templateName, data = {}, activeNav = '') {
  const filePath = path.join(__dirname, 'views', templateName);
  let html = fs.readFileSync(filePath, 'utf8');

  // Partials
  const headerTpl = fs.readFileSync(path.join(__dirname, 'views', 'partials', 'header.html'), 'utf8');
  const footerTpl = fs.readFileSync(path.join(__dirname, 'views', 'partials', 'footer.html'), 'utf8');

  // Nav Active States
  const header = headerTpl
    .replace('{{nav_active_home}}', activeNav === 'home' ? 'active' : '')
    .replace('{{nav_active_tentang}}', activeNav === 'tentang' ? 'active' : '')
    .replace('{{nav_active_layanan}}', activeNav === 'layanan' ? 'active' : '')
    .replace('{{nav_active_portofolio}}', activeNav === 'portofolio' ? 'active' : '')
    .replace('{{nav_active_kontak}}', activeNav === 'kontak' ? 'active' : '');

  html = html.replace('{{header}}', header);
  html = html.replace('{{footer}}', footerTpl);

  // Replace single variables
  const settings = getSettings();
  const merged = { ...settings, ...data };

  for (const [key, val] of Object.entries(merged)) {
    if (typeof val === 'string' || typeof val === 'number') {
      html = html.replaceAll(`{{${key}}}`, String(val));
    }
  }

  // Handle {{#services}}...{{/services}}
  if (html.includes('{{#services}}')) {
    const startTag = '{{#services}}';
    const endTag = '{{/services}}';
    const startIndex = html.indexOf(startTag);
    const endIndex = html.indexOf(endTag);
    const itemTemplate = html.substring(startIndex + startTag.length, endIndex);

    const services = getServices();
    let servicesHtml = '';

    for (const s of services) {
      let itemHtml = itemTemplate
        .replaceAll('{{title}}', s.title)
        .replaceAll('{{slug}}', s.slug)
        .replaceAll('{{category}}', s.category)
        .replaceAll('{{short_desc}}', s.short_desc)
        .replaceAll('{{image}}', s.image)
        .replaceAll('{{badge}}', s.badge || 'Layanan Resmi');

      // handle features preview
      if (itemHtml.includes('{{#features_preview}}')) {
        const featStart = '{{#features_preview}}';
        const featEnd = '{{/features_preview}}';
        const fStartIdx = itemHtml.indexOf(featStart);
        const fEndIdx = itemHtml.indexOf(featEnd);
        const fItemTpl = itemHtml.substring(fStartIdx + featStart.length, fEndIdx);

        const previewList = (s.features || []).slice(0, 3);
        const featuresHtml = previewList.map(f => fItemTpl.replaceAll('{{this}}', f)).join('');
        itemHtml = itemHtml.substring(0, fStartIdx) + featuresHtml + itemHtml.substring(fEndIdx + featEnd.length);
      }

      servicesHtml += itemHtml;
    }

    html = html.substring(0, startIndex) + servicesHtml + html.substring(endIndex + endTag.length);
  }

  // Handle {{#featured_projects}}...{{/featured_projects}}
  if (html.includes('{{#featured_projects}}')) {
    const startTag = '{{#featured_projects}}';
    const endTag = '{{/featured_projects}}';
    const startIndex = html.indexOf(startTag);
    const endIndex = html.indexOf(endTag);
    const itemTemplate = html.substring(startIndex + startTag.length, endIndex);

    const projects = getProjects().filter(p => p.featured === 1).slice(0, 3);
    let projectsHtml = '';
    for (const p of projects) {
      projectsHtml += itemTemplate
        .replaceAll('{{title}}', p.title)
        .replaceAll('{{category}}', p.category)
        .replaceAll('{{client}}', p.client)
        .replaceAll('{{location}}', p.location)
        .replaceAll('{{year}}', p.year)
        .replaceAll('{{description}}', p.description)
        .replaceAll('{{image}}', p.image);
    }
    html = html.substring(0, startIndex) + projectsHtml + html.substring(endIndex + endTag.length);
  }

  // Handle {{#projects}}...{{/projects}}
  if (html.includes('{{#projects}}')) {
    const startTag = '{{#projects}}';
    const endTag = '{{/projects}}';
    const startIndex = html.indexOf(startTag);
    const endIndex = html.indexOf(endTag);
    const itemTemplate = html.substring(startIndex + startTag.length, endIndex);

    const projects = getProjects();
    let projectsHtml = '';
    for (const p of projects) {
      projectsHtml += itemTemplate
        .replaceAll('{{title}}', p.title)
        .replaceAll('{{category}}', p.category)
        .replaceAll('{{client}}', p.client)
        .replaceAll('{{location}}', p.location)
        .replaceAll('{{year}}', p.year)
        .replaceAll('{{description}}', p.description)
        .replaceAll('{{image}}', p.image);
    }
    html = html.substring(0, startIndex) + projectsHtml + html.substring(endIndex + endTag.length);
  }



  return html;
}

// Auth Middleware
function requireAdmin(req, res, next) {
  const sessionToken = req.signedCookies.hksi_admin_session;
  if (!sessionToken) {
    if (req.xhr || req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized. Silakan login terlebih dahulu.' });
    }
    return res.redirect('/admin/login');
  }
  next();
}

// ==========================================
// PUBLIC 5 PAGES ROUTES
// ==========================================

// 1. Beranda (Home)
app.get('/', (req, res) => {
  res.send(renderPage('index.html', {}, 'home'));
});

// 2. Tentang Kami (About Us)
app.get('/tentang', (req, res) => {
  res.send(renderPage('tentang.html', {}, 'tentang'));
});

// 3. Layanan & Solusi (Services)
app.get('/layanan', (req, res) => {
  res.send(renderPage('layanan.html', {}, 'layanan'));
});

// 4. Portofolio Proyek & Fasilitas (Portfolio)
app.get('/portofolio', (req, res) => {
  const allProjects = getProjects();
  res.send(renderPage('portofolio.html', { total_projects: allProjects.length }, 'portofolio'));
});

// 5. Hubungi Kami & Minta Penawaran (Contact & RFQ)
app.get('/kontak', (req, res) => {
  res.send(renderPage('kontak.html', {}, 'kontak'));
});

// ==========================================
// ADMIN PANEL ROUTES
// ==========================================

app.get('/admin/login', (req, res) => {
  if (req.signedCookies.hksi_admin_session) {
    return res.redirect('/admin');
  }
  res.sendFile(path.join(__dirname, 'views', 'admin-login.html'));
});

app.get('/admin', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

app.get('/admin/dashboard', requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'admin-dashboard.html'));
});

// ==========================================
// RESTFUL APIS
// ==========================================

// Auth APIs
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username dan password wajib diisi' });
  }

  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || admin.password !== password) {
    return res.status(401).json({ error: 'Username atau password tidak sesuai' });
  }

  // Set cookie session (1 day)
  res.cookie('hksi_admin_session', admin.id, {
    signed: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  });

  res.json({
    success: true,
    user: { id: admin.id, username: admin.username, name: admin.name, role: admin.role }
  });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('hksi_admin_session');
  res.json({ success: true });
});

app.get('/api/auth/check', (req, res) => {
  const adminId = req.signedCookies.hksi_admin_session;
  if (!adminId) return res.json({ authenticated: false });

  const admin = db.prepare('SELECT id, username, name, role FROM admins WHERE id = ?').get(adminId);
  if (!admin) return res.json({ authenticated: false });

  res.json({ authenticated: true, user: admin });
});

// Public Contact Form Submission
app.post('/api/kontak', (req, res) => {
  const { name, company, email, phone, service_interest, message } = req.body;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ error: 'Mohon lengkapi seluruh formulir yang bertanda bintang (*)' });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO messages (name, company, email, phone, service_interest, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'unread')
    `);
    const result = insert.run(name, company || '', email, phone, service_interest || 'Umum', message);

    res.json({
      success: true,
      messageId: result.lastInsertRowid,
      msg: 'Permintaan penawaran Anda telah berhasil dikirim.'
    });
  } catch (err) {
    console.error('Insert message error:', err);
    res.status(500).json({ error: 'Gagal menyimpan pesan ke database' });
  }
});

// Admin Messages API
app.get('/api/pesan', requireAdmin, (req, res) => {
  const list = getMessages();
  res.json(list);
});

app.put('/api/pesan/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['unread', 'in_progress', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Status tidak valid' });
  }

  db.prepare('UPDATE messages SET status = ? WHERE id = ?').run(status, id);
  res.json({ success: true });
});

app.delete('/api/pesan/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM messages WHERE id = ?').run(id);
  res.json({ success: true });
});

// Services API
app.get('/api/layanan', (req, res) => {
  res.json(getServices());
});

app.put('/api/layanan/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { title, category, short_desc, full_desc, features, badge } = req.body;

  db.prepare(`
    UPDATE services 
    SET title = ?, category = ?, short_desc = ?, full_desc = ?, features = ?, badge = ?
    WHERE id = ?
  `).run(
    title,
    category,
    short_desc,
    full_desc,
    JSON.stringify(features || []),
    badge || '',
    id
  );

  res.json({ success: true });
});

// Projects API
app.get('/api/portofolio', (req, res) => {
  const { category } = req.query;
  res.json(getProjects(category));
});

app.post('/api/portofolio', requireAdmin, upload.single('image'), (req, res) => {
  const { title, category, client, location, year, description, featured } = req.body;
  let imagePath = '/images/services/supply-material.jpg';

  if (category === 'Jasa Laboratorium') imagePath = '/images/services/laboratorium.jpg';
  if (category === 'Jasa Pengukuran') imagePath = '/images/services/survey-pengukuran.jpg';

  if (req.file) {
    imagePath = `/images/uploads/${req.file.filename}`;
  }

  db.prepare(`
    INSERT INTO projects (title, category, client, location, year, description, image, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title,
    category,
    client || '',
    location || '',
    year || '2026',
    description,
    imagePath,
    featured === '1' || featured === 1 ? 1 : 0
  );

  res.json({ success: true });
});

app.put('/api/portofolio/:id', requireAdmin, upload.single('image'), (req, res) => {
  const { id } = req.params;
  const { title, category, client, location, year, description, featured } = req.body;

  let updateQuery = `
    UPDATE projects 
    SET title = ?, category = ?, client = ?, location = ?, year = ?, description = ?, featured = ?
  `;
  const params = [
    title,
    category,
    client || '',
    location || '',
    year || '2026',
    description,
    featured === '1' || featured === 1 ? 1 : 0
  ];

  if (req.file) {
    updateQuery += `, image = ?`;
    params.push(`/images/uploads/${req.file.filename}`);
  }

  updateQuery += ` WHERE id = ?`;
  params.push(id);

  db.prepare(updateQuery).run(...params);
  res.json({ success: true });
});

app.delete('/api/portofolio/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  res.json({ success: true });
});

// Settings API
app.get('/api/pengaturan', (req, res) => {
  res.json(getSettings());
});

app.put('/api/pengaturan', requireAdmin, (req, res) => {
  const updates = req.body;
  const updateStmt = db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `);

  for (const [key, value] of Object.entries(updates)) {
    const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
    updateStmt.run(key, strVal);
  }

  res.json({ success: true });
});

// Export for Vercel Serverless Function
module.exports = app;

// Start Server locally
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`PT HASTA KARYA SEJAHTERA INDONESIA (HKSI) WEBSITE`);
    console.log(`Server is running smoothly at: http://localhost:${PORT}`);
    console.log(`Admin Panel: http://localhost:${PORT}/admin/login`);
    console.log(`Kredensial Default: admin / admin123`);
    console.log(`====================================================`);
  });
}
