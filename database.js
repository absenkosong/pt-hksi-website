const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');

let dbPath;
if (process.env.VERCEL) {
  // On Vercel serverless, copy pre-seeded database to writable /tmp directory
  const tmpDbPath = path.join(os.tmpdir(), 'hksi.db');
  const sourceDbPath = path.join(__dirname, 'data', 'hksi.db');
  if (!fs.existsSync(tmpDbPath) && fs.existsSync(sourceDbPath)) {
    try {
      fs.copyFileSync(sourceDbPath, tmpDbPath);
    } catch (e) {
      console.error('Error copying database to /tmp:', e);
    }
  }
  dbPath = fs.existsSync(tmpDbPath) ? tmpDbPath : sourceDbPath;
} else {
  dbPath = path.join(__dirname, 'data', 'hksi.db');
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
}

const db = new DatabaseSync(dbPath);

// Initialize Tables
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      short_desc TEXT NOT NULL,
      full_desc TEXT NOT NULL,
      features TEXT NOT NULL, -- JSON array string
      icon TEXT NOT NULL,
      image TEXT NOT NULL,
      badge TEXT,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      client TEXT NOT NULL,
      location TEXT NOT NULL,
      year TEXT NOT NULL,
      description TEXT NOT NULL,
      image TEXT NOT NULL,
      featured INTEGER DEFAULT 0,
      display_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      service_interest TEXT,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread', -- unread, in_progress, completed
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'Super Admin',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Clear & Re-seed updated corporate settings
  console.log('Seeding updated company data (Newly established, high-quality enterprise)...');
  const insertSetting = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  
  const defaultSettings = [
    ['company_name', 'PT HASTA KARYA SEJAHTERA INDONESIA'],
    ['company_short', 'PT HKSI'],
    ['tagline', 'Solusi Material, Laboratorium, dan Pengukuran yang Akurat, Andal, dan Terpercaya'],
    ['motto', 'Bersama Membangun Solusi, Menciptakan Nilai, Meraih Kemajuan'],
    ['about_summary', 'PT Hasta Karya Sejahtera Indonesia (HKSI) adalah perusahaan berbadan hukum resmi yang didirikan pada tahun 2026 di Kota Cilegon, Banten. Kami berkomitmen memberikan standar layanan tertinggi dan transparansi penuh di bidang penyediaan material konstruksi, laboratorium uji mutu beton & tanah berstandar SNI/ASTM, serta survei pemetaan geospasial presisi untuk proyek infrastruktur dan industri nasional.'],
    ['address', 'Komplek Ruko Metro Cilegon Blok B 1 No 07, Panggung Rawi, Kec. Jombang, Kota Cilegon, Provinsi Banten 42412'],
    ['phone', '089502431727'],
    ['whatsapp', '6289502431727'],
    ['email', 'pt.hastakaryasejahteraind@gmail.com'],
    ['sk_menkumham', 'NOMOR AHU-0036855.AH.01.01.TAHUN 2026'],
    ['sk_date', '08 Mei 2026'],
    ['nib', '1405260029131'],
    ['npwp', '1000 0000 0958 4594'],
    ['akta_notaris', 'Akta No. 43 Tanggal 04 Mei 2026 (Notaris Syafira Aulia, S.H., M.Kn.)'],
    ['operating_hours', 'Senin - Sabtu: 08:00 - 17:00 WIB (Layanan Lapangan & Armada 24 Jam)'],
    ['maps_embed', 'https://maps.google.com/maps?q=Ruko+Metro+Cilegon+Banten&t=&z=15&ie=UTF8&iwloc=&output=embed'],
    // Factual, realistic corporate metrics for newly established enterprise
    ['stat_legal', '100% Sah'],
    ['stat_legal_sub', 'Kemenkumham RI 2026 & NIB'],
    ['stat_standard', 'SNI & ASTM'],
    ['stat_standard_sub', 'Kalibrasi KAN Terverifikasi'],
    ['stat_divisions', '3 Divisi'],
    ['stat_divisions_sub', 'Material, Lab & Geospasial'],
    ['stat_service', '24/7 Siaga'],
    ['stat_service_sub', 'Armada Darat & Tongkang Laut'],
    ['vision', 'Menjadi perusahaan terpercaya dan profesional di bidang penyediaan material, laboratorium, dan jasa pengukuran yang berstandar tinggi serta mampu memberikan nilai tambah bagi pelanggan dan pembangunan nasional.'],
    ['mission', JSON.stringify([
      'Menyediakan produk dan layanan berkualitas yang memenuhi kebutuhan pelanggan secara tepat, cepat, dan terpercaya.',
      'Mengutamakan profesionalisme, integritas, dan keselamatan kerja (K3) dalam setiap kegiatan operasional perusahaan.',
      'Mengembangkan sumber daya manusia yang kompeten, inovatif, dan berorientasi pada standar pelayanan prima.',
      'Menggunakan teknologi dan metode kerja efektif untuk menghasilkan data uji dan layanan yang akurat.',
      'Membangun hubungan kerja sama yang transparan dan berkelanjutan dengan pelanggan serta pemangku kepentingan.',
      'Berkontribusi aktif dalam mendukung percepatan pembangunan infrastruktur dan pertumbuhan ekonomi nasional.'
    ])],
    ['core_values', JSON.stringify([
      { letter: 'H', title: 'Harmoni', desc: 'Membangun sinergi yang selaras antara lingkungan kerja, mitra klien, dan kelestarian pembangunan yang berkelanjutan.' },
      { letter: 'K', title: 'Kualitas', desc: 'Menjamin standar mutu tertinggi pada setiap butir material, uji laboratorium presisi, dan akurasi data survei.' },
      { letter: 'S', title: 'Sinergi', desc: 'Bekerja sama erat dan adaptif sebagai mitra strategis solusi terintegrasi untuk menyukseskan proyek klien.' },
      { letter: 'I', title: 'Integritas', desc: 'Menjunjung tinggi transparansi, kejujuran data uji, etika bisnis, dan komitmen ketepatan waktu pengiriman.' }
    ])],
    ['management', JSON.stringify([
      { name: 'Urip Widodo', position: 'Komisaris Utama', role: 'Pengawasan Strategis & Tata Kelola Perusahaan' },
      { name: 'Tatang Darmuji', position: 'Direktur Utama', role: 'Kepemimpinan Eksekutif & Manajemen Operasional' },
      { name: 'Belly Pranata', position: 'Direktur', role: 'Operasional Lapangan, Logistik, & Pengadaan' },
      { name: 'Pauri D. Samal', position: 'Business Development', role: 'Pengembangan Bisnis & Kemitraan Klien' }
    ])]
  ];

  for (const [key, value] of defaultSettings) {
    insertSetting.run(key, value);
  }

  // Update Services
  db.exec('DELETE FROM services');
  const insertService = db.prepare(`
    INSERT INTO services (title, slug, category, short_desc, full_desc, features, icon, image, badge, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertService.run(
    'Supply Material Konstruksi & Industri',
    'supply-material',
    'Material Konstruksi',
    'Penyediaan agregat kelas A/B, pasir cor bermutu tinggi, batu split berbagai fraksi, tanah urug pilihan, dan batu boulder dengan jaminan pengiriman darat (dump truck) dan laut (tongkang/barge).',
    'PT Hasta Karya Sejahtera Indonesia (HKSI) memposisikan diri sebagai mitra rantai pasok material konstruksi yang andal untuk proyek sipil, pelabuhan, jalan tol, dan industri di kawasan Cilegon, Banten, hingga ke seluruh Indonesia. Didukung oleh konsesi quarry berizin resmi, armada dump truck tronton & indeks puluhan unit, serta fasilitas loading jetty dermaga langsung untuk muat tongkang berkapasitas 2.000 hingga 7.500 ton, kami memastikan pasokan material Anda tepat volume, tepat mutu, dan tepat waktu tanpa kendala.',
    JSON.stringify([
      'Pasir Pasang, Pasir Cor, & Pasir Silika Berkualitas',
      'Batu Split Fraksi 1/2, 2/3, Screen, & Makadam Base',
      'Agregat Lapis Pondasi Atas (LPA) & Bawah (LPB) Standar Bina Marga',
      'Tanah Urug Pilihan & Subgrade Pemadatan Lahan Proyek',
      'Batu Belah & Boulder untuk Breakwater / Pelindung Tanggul',
      'Armada Truk Tronton dan Tongkang Laut Siap Muat 24 Jam'
    ]),
    'truck',
    '/images/services/supply-material.jpg',
    'Pengiriman Darat & Laut',
    1
  );

  insertService.run(
    'Jasa Laboratorium & Pengujian Mutu',
    'jasa-laboratorium',
    'Uji Mutu & Geoteknik',
    'Layanan pengujian material konstruksi, beton, tanah (sondir, boring SPT, CBR), dan agregat menggunakan instrumen uji terkalibrasi berstandar SNI dan ASTM resmi.',
    'Divisi Laboratorium PT HKSI menyediakan kepastian teknis dan jaminan mutu menyeluruh bagi konsultan perencana, kontraktor utama, dan pengawas proyek. Pengujian dilakukan oleh teknisi sipil kompeten dengan mesin uji otomatis terkalibrasi KAN. Laporan uji disajikan secara komprehensif, cepat, objektif, dan dapat dipertanggungjawabkan di hadapan instansi teknis maupun auditor independen.',
    JSON.stringify([
      'Uji Kuat Tekan Beton Silinder, Balok, & Kubus (SNI 03-1974-1990)',
      'Core Drill Beton Terpasang & Uji Non-Destructive Rebound Hammer',
      'Penyelidikan Geoteknik Tanah: Sondir (CPT) Kapasitas 2.5 & 5 Ton',
      'Hand Boring, Deep Boring & Uji Standard Penetration Test (SPT)',
      'Uji Kepadatan Tanah Lapangan Sand Cone Method (ASTM D1556)',
      'Uji Pemadatan Laboratorium Standard & Modified Proctor Test',
      'Uji Karakteristik Agregat: Abrasi Los Angeles, Soundness, Berat Jenis'
    ]),
    'flask',
    '/images/services/laboratorium.jpg',
    'Standar SNI & ASTM',
    2
  );

  insertService.run(
    'Jasa Pengukuran & Survei Geospasial',
    'jasa-pengukuran-survei',
    'Survei & Pemetaan',
    'Layanan survei topografi kontur, batimetri kedalaman laut, staking out titik konstruksi, pemetaan drone LiDAR, serta pemantauan deformasi struktur modern.',
    'Divisi Survei PT HKSI menghadirkan data geospasial berakurasi tinggi untuk mendukung tahapan perencanaan (feasibility study), rekayasa desain (DED), konstruksi, hingga monitoring pasca-konstruksi. Menggunakan kombinasi instrumen geodetik terkini seperti Total Station presisi tinggi, GNSS/GPS Geodetik RTK Multi-Frequency, Singlebeam / Multibeam Echo Sounder untuk perairan, dan drone survei fotogrametri udara.',
    JSON.stringify([
      'Survei Topografi & Pemetaan Garis Kontur Lahan / Tapak Proyek',
      'Survei Batimetri / Hidrografi Alur Sandar Dermaga & Pelabuhan',
      'Staking Out & Setting Out As Kolom, Titik Pancang, dan Grid Bangunan',
      'Pemetaan Foto Udara UAV Drone Resolusi Tinggi & Model 3D DSM/DTM',
      'Perhitungan Akurat Volume Cut and Fill (Galian & Timbunan)',
      'Monitoring Deformasi & Pergeseran Sudut Kemiringan Struktur Sipil'
    ]),
    'compass',
    '/images/services/survey-pengukuran.jpg',
    'Instrumen Presisi Modern',
    3
  );

  // Update Projects (Focus on Core Service Portfolios & Capabilities)
  db.exec('DELETE FROM projects');
  const insertProj = db.prepare(`
    INSERT INTO projects (title, category, client, location, year, description, image, featured, display_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProj.run(
    'Layanan Suplai Agregat & Pasir Terminal Curah Jetty Cilegon',
    'Supply Material',
    'Konsorsium Pelabuhan & Terminal Curah',
    'Cilegon, Banten',
    '2026',
    'Kapabilitas suplai dan logistik pengiriman material agregat lapis pondasi serta pasir urug via jalur laut tongkang kapasitas 5.000 DWT dan armada dump truck terpadu.',
    '/images/projects/dermaga-cilegon.jpg',
    1,
    1
  );

  insertProj.run(
    'Pengadaan Batu Split & Base A Infrastruktur Jalan Tol',
    'Supply Material',
    'Kontraktor Konstruksi Jalan & Jembatan',
    'Banten',
    '2026',
    'Penyediaan batu split fraksi 1/2 dan 2/3 untuk rigid pavement serta material subbase kelas A dengan kesiapan kapasitas volume pengiriman masif dan berkelanjutan.',
    '/images/projects/jalan-tol-banten.jpg',
    1,
    2
  );

  insertProj.run(
    'Quality Control & Uji Kuat Tekan Beton Kawasan Industri Petrokimia',
    'Jasa Laboratorium',
    'Fasilitas Pabrik Petrokimia',
    'Anyer - Cilegon',
    '2026',
    'Layanan uji mutu beton silinder, pengujian core drill struktur eksisting, dan non-destructive test dengan kalibrasi KAN untuk verifikasi kekuatan struktur pabrik industri.',
    '/images/projects/lab-petrokimia.jpg',
    1,
    3
  );

  insertProj.run(
    'Survei Topografi & Pemetaan Kawasan Industri Terpadu',
    'Jasa Pengukuran',
    'Pengelola Kawasan Industri',
    'Cilegon, Banten',
    '2026',
    'Pemetaan kontur elevasi lahan dan analisis volume cut & fill berbasis model 3D Drone LiDAR serta GNSS Geodetik RTK untuk persiapan masterplan tapak kawasan industri.',
    '/images/projects/survey-kawasan.jpg',
    1,
    4
  );

  insertProj.run(
    'Soil Investigation & Sondir Hidrolik Tapak Konstruksi',
    'Jasa Laboratorium',
    'Proyek Pembangunan Industri',
    'Ciwandan, Cilegon',
    '2026',
    'Penyelidikan mekanika tanah komprehensif menggunakan rig sondir hidrolik 2.5 & 5 Ton serta deep boring untuk penentuan daya dukung tanah tiang pancang (bearing capacity).',
    '/images/projects/soil-investigation.jpg',
    1,
    5
  );

  insertProj.run(
    'Pekerjaan Cut & Fill dan Pemadatan Lahan Pergudangan Logistik',
    'Supply Material',
    'Fasilitas Pergudangan & Terminal Logistik',
    'Merak - Cilegon',
    '2026',
    'Penyediaan material tanah urug pilihan, perataan kontur lahan dengan alat berat, dan pengujian kepadatan tanah sand cone method di tapak proyek.',
    '/images/projects/cut-and-fill.jpg',
    1,
    6
  );

  // Admin user
  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admins').get();
  if (adminCount.count === 0) {
    db.prepare('INSERT INTO admins (username, password, name, role) VALUES (?, ?, ?, ?)').run(
      'admin', 'admin123', 'Administrator Utama HKSI', 'Super Admin'
    );
  }

  console.log('Database successfully re-seeded with realistic corporate data!');
}

initDatabase();

module.exports = {
  db,
  getSettings: () => {
    const rows = db.prepare('SELECT key, value FROM settings').all();
    const settings = {};
    for (const r of rows) {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value;
      }
    }
    return settings;
  },
  getServices: () => {
    const rows = db.prepare('SELECT * FROM services ORDER BY display_order ASC').all();
    return rows.map(r => ({ ...r, features: JSON.parse(r.features || '[]') }));
  },
  getProjects: (category) => {
    let query = 'SELECT * FROM projects';
    const params = [];
    if (category && category !== 'All' && category !== 'Semua') {
      query += ' WHERE category = ?';
      params.push(category);
    }
    query += ' ORDER BY display_order ASC, id DESC';
    return db.prepare(query).all(...params);
  },
  getMessages: () => {
    return db.prepare('SELECT * FROM messages ORDER BY id DESC').all();
  }
};
