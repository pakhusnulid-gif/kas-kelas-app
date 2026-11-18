/* Kas Kelas - UI */
(function () {
  const S = window.Store;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const state = {
    tab: 'home',
    month: monthKey(new Date()),
    unlocked: false,
    tipe: 'keluar',
    amt: '',
    editId: null,
    dueId: null,
    reportMonth: monthKey(new Date()),
  };

  /* ---------- util ---------- */
  function monthKey(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; }
  function shiftMonth(m, d) {
    const [y, mo] = m.split('-').map(Number);
    const dt = new Date(y, mo - 1 + d, 1);
    return monthKey(dt);
  }
  function monthLabel(m) {
    const [y, mo] = m.split('-').map(Number);
    return new Date(y, mo - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  const rp = n => {
    n = Number(n) || 0;
    return (n < 0 ? '−Rp ' : 'Rp ') + Math.abs(n).toLocaleString('id-ID');
  };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function dayLabel(iso) {
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short' });
  }
  function initials(nama) {
    return nama.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
  }
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2200);
  }
  function copy(text, msg = 'Disalin, tempel di WhatsApp') {
    const done = () => toast(msg);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallback());
    } else fallback();

    function fallback() {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('Gagal menyalin'); }
      ta.remove();
    }
  }

  /* ---------- pasang PWA ---------- */
  const INSTALL_KEY = 'kaskelas.install';
  let installEvt = null;
  let installShown = false;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // Urutan penting: browser dalam aplikasi lebih dulu, lalu iPadOS yang menyamar jadi Mac.
  function installKind() {
    const ua = navigator.userAgent;
    if (/FBAN|FBAV|Instagram|Line\/|WhatsApp/i.test(ua)) return 'inapp';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return 'ios';
    if (/Android/i.test(ua)) return 'android';
    return 'desktop';
  }

  function installFlag() {
    try { return localStorage.getItem(INSTALL_KEY); } catch (e) { return null; }
  }
  const installOff = () => installFlag() === 'dismissed';
  const installDone = () => isStandalone() || installFlag() === 'installed';
  function markInstall(v) {
    try { localStorage.setItem(INSTALL_KEY, v); } catch (e) {}
  }

  function scheduleInstall() {
    if (installShown || isStandalone() || installOff()) return;
    if (location.protocol === 'file:') return;
    if (S.get().meta.pin && !state.unlocked) return;
    if (state.tab !== 'home' || state.dueId) return;
    if ($('#sheetRoot').innerHTML) return;
    installShown = true;
    setTimeout(() => {
      if (state.tab !== 'home' || state.dueId || $('#sheetRoot').innerHTML) { installShown = false; return; }
      openInstall();
    }, 1500);
  }

  function installSteps() {
    const kind = installKind();
    if (kind === 'ios') {
      return `<ol class="steps">
        <li>Buka aplikasi ini di <b>Safari</b>.</li>
        <li>Ketuk ikon <b>Bagikan</b> di bawah layar.</li>
        <li>Pilih <b>Tambahkan ke Layar Utama</b>, lalu <b>Tambah</b>.</li>
      </ol>`;
    }
    if (kind === 'inapp') {
      return `<p class="muted">Browser di dalam aplikasi tidak bisa memasang. Salin link ini, lalu buka di Chrome atau Safari.</p>
        <button class="btn soft wide" data-act="install-copy">Salin link</button>`;
    }
    if (installEvt) {
      return `<button class="btn primary wide" data-act="install-go">Pasang sekarang</button>`;
    }
    return `<ol class="steps">
      <li>Buka menu browser, biasanya ikon titik tiga.</li>
      <li>Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</li>
    </ol>`;
  }

  function openInstall() {
    openSheet(`
      <div class="sheet-head">
        <h2>Pasang di HP</h2>
        <button class="icon-btn" data-act="install-close" aria-label="Tutup">✕</button>
      </div>
      <p class="muted">Buka lebih cepat dan tetap bisa dipakai tanpa internet.</p>
      ${installSteps()}
      <button class="btn wide" data-act="install-close">Nanti saja</button>
    `, 'install-sheet');
  }

  /* ---------- shell ---------- */
  function render() {
    const db = S.get();
    if (db.meta.pin && !state.unlocked) {
      $('#nav').innerHTML = '';
      $('#nav').style.display = 'none';
      $('#topbar').innerHTML = '';
      $('#view').innerHTML = lockView();
      return;
    }
    $('#nav').style.display = '';
    renderNav();
    if (state.dueId) {
      $('#topbar').innerHTML = topbar('Iuran', db.meta.kelas || 'Kas Kelas', true);
      $('#view').innerHTML = dueDetailView();
    } else if (state.tab === 'home') {
      $('#topbar').innerHTML = topbar('Kas Kelas', db.meta.kelas || 'Belum ada nama kelas');
      $('#view').innerHTML = homeView();
    } else if (state.tab === 'riwayat') {
      $('#topbar').innerHTML = topbar('Riwayat', 'Semua transaksi tercatat');
      $('#view').innerHTML = riwayatView();
    } else if (state.tab === 'iuran') {
      $('#topbar').innerHTML = topbar('Iuran', 'Status pembayaran anggota');
      $('#view').innerHTML = iuranView();
    } else {
      $('#topbar').innerHTML = topbar('Atur', 'Data, anggota & laporan');
      $('#view').innerHTML = aturView();
    }
    scheduleInstall();
  }

  function topbar(title, sub, back) {
    return `<div class="tb">
      ${back ? `<button class="icon-btn" data-act="due-back" aria-label="Kembali">‹</button>` : ''}
      <div><h1>${esc(title)}</h1><p>${esc(sub)}</p></div>
    </div>`;
  }

  // Ikon: Phosphor Icons (MIT), path disalin apa adanya. Jangan gambar path sendiri.
  const ICONS = {
    home: 'M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z',
    list: 'M88,64a8,8,0,0,1,8-8H216a8,8,0,0,1,0,16H96A8,8,0,0,1,88,64Zm128,56H96a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Zm0,64H96a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16ZM56,56H40a8,8,0,0,0,0,16H56a8,8,0,0,0,0-16Zm0,64H40a8,8,0,0,0,0,16H56a8,8,0,0,0,0-16Zm0,64H40a8,8,0,0,0,0,16H56a8,8,0,0,0,0-16Z',
    users: 'M244.8,150.4a8,8,0,0,1-11.2-1.6A51.6,51.6,0,0,0,192,128a8,8,0,0,1-7.37-4.89,8,8,0,0,1,0-6.22A8,8,0,0,1,192,112a24,24,0,1,0-23.24-30,8,8,0,1,1-15.5-4A40,40,0,1,1,219,117.51a67.94,67.94,0,0,1,27.43,21.68A8,8,0,0,1,244.8,150.4ZM190.92,212a8,8,0,1,1-13.84,8,57,57,0,0,0-98.16,0,8,8,0,1,1-13.84-8,72.06,72.06,0,0,1,33.74-29.92,48,48,0,1,1,58.36,0A72.06,72.06,0,0,1,190.92,212ZM128,176a32,32,0,1,0-32-32A32,32,0,0,0,128,176ZM72,120a8,8,0,0,0-8-8A24,24,0,1,1,87.24,82a8,8,0,1,0,15.5-4A40,40,0,1,0,37,117.51,67.94,67.94,0,0,0,9.6,139.19a8,8,0,1,0,12.8,9.61A51.6,51.6,0,0,1,64,128,8,8,0,0,0,72,120Z',
    cog: 'M64,105V40a8,8,0,0,0-16,0v65a32,32,0,0,0,0,62v49a8,8,0,0,0,16,0V167a32,32,0,0,0,0-62Zm-8,47a16,16,0,1,1,16-16A16,16,0,0,1,56,152Zm80-95V40a8,8,0,0,0-16,0V57a32,32,0,0,0,0,62v97a8,8,0,0,0,16,0V119a32,32,0,0,0,0-62Zm-8,47a16,16,0,1,1,16-16A16,16,0,0,1,128,104Zm104,64a32.06,32.06,0,0,0-24-31V40a8,8,0,0,0-16,0v97a32,32,0,0,0,0,62v17a8,8,0,0,0,16,0V199A32.06,32.06,0,0,0,232,168Zm-32,16a16,16,0,1,1,16-16A16,16,0,0,1,200,184Z',
    lock: 'M208,80H176V56a48,48,0,0,0-96,0V80H48A16,16,0,0,0,32,96V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V96A16,16,0,0,0,208,80ZM96,56a32,32,0,0,1,64,0V80H96ZM208,208H48V96H208V208Z',
  };

  const icon = (name, size = 21) =>
    `<svg viewBox="0 0 256 256" width="${size}" height="${size}" fill="currentColor" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

  function renderNav() {
    const items = [
      ['home', 'Beranda', 'home'],
      ['riwayat', 'Riwayat', 'list'],
      ['iuran', 'Iuran', 'users'],
      ['atur', 'Atur', 'cog'],
    ];
    $('#nav').innerHTML = `<div class="nav-in">${items.map(([id, label, ico]) => `
      <button class="nav-btn ${state.tab === id && !state.dueId ? 'on' : ''}" data-act="tab" data-tab="${id}">
        ${icon(ico)}<span>${label}</span>
      </button>`).join('')}</div>`;
  }

  /* ---------- views ---------- */
  function lockView() {
    return `<div class="lock">
      <div class="lock-badge">${icon('lock', 30)}</div>
      <h2>Kas Kelas terkunci</h2>
      <p>Masukkan PIN untuk membuka.</p>
      <input id="pinIn" class="pin-in" type="password" inputmode="numeric" maxlength="8" placeholder="••••" aria-label="PIN aplikasi" autofocus>
      <button class="btn primary wide" data-act="unlock">Buka</button>
    </div>`;
  }

  function txnRow(t) {
    const sign = t.tipe === 'masuk' ? '+' : '−';
    return `<button class="txn" data-act="txn-open" data-id="${t.id}">
      <span class="dot ${t.tipe}"></span>
      <span class="txn-main">
        <b>${esc(t.ket || t.kategori)}</b>
        <small>${esc(t.kategori)}${t.dueId ? ' · iuran' : ''}</small>
      </span>
      <span class="txn-amt ${t.tipe}">${sign} ${rp(t.nominal)}</span>
    </button>`;
  }

  function groupTxns(list) {
    const groups = {};
    list.forEach(t => { (groups[t.tgl] = groups[t.tgl] || []).push(t); });
    return Object.keys(groups).sort().reverse().map(d => `
      <div class="day-head"><span>${dayLabel(d)}</span><span>${rp(groups[d].reduce((a, t) => a + (t.tipe === 'masuk' ? t.nominal : -t.nominal), 0))}</span></div>
      <div class="card tight">${groups[d].map(txnRow).join('')}</div>
    `).join('');
  }

  function homeView() {
    const db = S.get();
    const bal = S.balance();
    const t = S.totals(state.month);
    const recent = db.txns.slice().sort((a, b) => (a.tgl === b.tgl ? b.ts - a.ts : a.tgl < b.tgl ? 1 : -1)).slice(0, 6);
    const pending = db.dues.map(d => S.dueStats(d.id)).filter(s => s && s.unpaid.length);

    return `
    <section class="hero">
      <div class="hero-top"><span>Saldo kas</span><button class="ghost" data-act="recon">Cek uang fisik</button></div>
      <div class="hero-amt ${bal < 0 ? 'neg' : ''}">${rp(bal)}</div>
      <div class="hero-grid">
        <div><em>Masuk ${monthLabel(state.month).split(' ')[0]}</em><b class="in">+ ${rp(t.masuk)}</b></div>
        <div><em>Keluar</em><b class="out">− ${rp(t.keluar)}</b></div>
      </div>
    </section>

    <div class="actions">
      <button class="act in" data-act="add" data-tipe="masuk"><span>+</span>Uang masuk</button>
      <button class="act out" data-act="add" data-tipe="keluar"><span>−</span>Uang keluar</button>
    </div>

    ${pending.length ? `<div class="card">
      <div class="card-head"><b>Perlu ditagih</b><button class="link" data-act="tab" data-tab="iuran">Lihat</button></div>
      ${pending.slice(0, 2).map(s => `<div class="pending-row">
        <div><b>${esc(s.due.nama)}</b><small>${s.paid}/${s.total} lunas · terkumpul ${rp(s.collected)}</small></div>
        <button class="mini" data-act="copy-unpaid" data-id="${s.due.id}">Salin tunggakan</button>
      </div>`).join('')}
    </div>` : ''}

    <div class="card">
      <div class="card-head"><b>Transaksi terakhir</b><button class="link" data-act="tab" data-tab="riwayat">Semua</button></div>
      ${recent.length ? recent.map(txnRow).join('') : `<div class="empty"><p>Belum ada transaksi.</p><small>Mulai dengan mencatat uang masuk pertama.</small></div>`}
    </div>

    <button class="btn soft wide" data-act="go-report">Bagikan laporan ${esc(monthLabel(state.month))}</button>
    <div class="foot">Data tersimpan di HP ini. Backup rutin di menu Atur.</div>
    <div class="foot credit">Dikembangkan oleh <a href="https://pakhusnul.id" target="_blank" rel="noopener">pakhusnul.id</a></div>`;
  }

  function riwayatView() {
    const list = S.monthTxns(state.month);
    const t = S.totals(state.month);
    return `
    <div class="monthbar">
      <button class="icon-btn" data-act="mprev" aria-label="Bulan sebelumnya">‹</button>
      <div class="monthbar-mid"><b>${esc(monthLabel(state.month))}</b><small>${t.count} transaksi</small></div>
      <button class="icon-btn" data-act="mnext" aria-label="Bulan berikutnya">›</button>
    </div>
    <div class="totgrid">
      <div class="tot"><em>Masuk</em><b class="in">${rp(t.masuk)}</b></div>
      <div class="tot"><em>Keluar</em><b class="out">${rp(t.keluar)}</b></div>
      <div class="tot"><em>Selisih</em><b>${rp(t.selisih)}</b></div>
    </div>
    ${list.length ? groupTxns(list) : `<div class="card empty"><p>Kosong di bulan ini.</p><small>Geser bulan atau catat transaksi baru.</small></div>`}
    <button class="btn primary wide" data-act="add" data-tipe="keluar">+ Catat transaksi</button>`;
  }

  function iuranView() {
    const db = S.get();
    if (!db.dues.length) {
      return `<div class="card empty">
        <p>Belum ada iuran.</p>
        <small>Buat periode iuran, lalu tandai siapa yang sudah bayar. Uang masuk tercatat otomatis.</small>
        <button class="btn primary" data-act="due-new">Buat iuran</button>
      </div>
      ${db.members.length ? '' : `<div class="card empty"><p>Anggota belum diisi.</p><button class="btn soft" data-act="tab" data-tab="atur">Isi anggota dulu</button></div>`}`;
    }
    const cards = db.dues.slice().sort((a, b) => b.createdAt - a.createdAt).map(d => {
      const s = S.dueStats(d.id);
      const pct = s.total ? Math.round((s.paid / s.total) * 100) : 0;
      return `<button class="card due" data-act="due-open" data-id="${d.id}">
        <div class="due-top"><b>${esc(d.nama)}</b><span class="pill ${pct === 100 ? 'ok' : ''}">${s.paid}/${s.total}</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="due-foot"><span>${rp(d.nominal)}/orang</span><span>${rp(s.collected)}</span></div>
      </button>`;
    }).join('');
    return `${cards}
      <button class="btn soft wide" data-act="due-new">+ Iuran baru</button>`;
  }

  function dueDetailView() {
    const s = S.dueStats(state.dueId);
    if (!s) return `<div class="empty"><p>Iuran tidak ditemukan.</p></div>`;
    const db = S.get();
    const rows = db.members.map(m => {
      const lunas = s.unpaid.every(u => u.id !== m.id);
      return `<button class="member-row ${lunas ? 'lunas' : ''}" data-act="tog-paid" data-mid="${m.id}">
        <span class="av">${esc(initials(m.nama))}</span>
        <span class="txn-main"><b>${esc(m.nama)}</b><small>${lunas ? 'sudah bayar' : 'belum bayar'}</small></span>
        <span class="check">${lunas ? '✓' : ''}</span>
      </button>`;
    }).join('');

    return `
      <div class="card">
        <div class="due-top"><b>${esc(s.due.nama)}</b><span class="pill ${s.paid === s.total ? 'ok' : ''}">${s.paid}/${s.total}</span></div>
        <div class="bar"><i style="width:${s.total ? (s.paid / s.total) * 100 : 0}%"></i></div>
        <div class="due-foot"><span>${rp(s.due.nominal)}/orang</span><span>Terkumpul ${rp(s.collected)}</span></div>
      </div>
      <div class="row-actions three">
        <button class="btn soft" data-act="copy-unpaid" data-id="${s.due.id}">Salin tunggakan</button>
        <button class="btn soft" data-act="due-edit" data-id="${s.due.id}">Ubah</button>
        <button class="btn danger-soft" data-act="due-del" data-id="${s.due.id}">Hapus</button>
      </div>
      <div class="card tight">${db.members.length ? rows : `<div class="empty"><p>Belum ada anggota.</p></div>`}</div>
      <div class="foot">Tandai centang = uang masuk otomatis tercatat.</div>`;
  }

  function aturView() {
    const db = S.get();
    const m = db.meta;
    return `
    <form class="card" id="metaForm">
      <div class="card-head"><b>Identitas</b></div>
      <label class="field"><span>Nama kelas</span><input name="kelas" value="${esc(m.kelas)}" placeholder="XI IPA 2"></label>
      <label class="field"><span>Nama bendahara</span><input name="bendahara" value="${esc(m.bendahara)}" placeholder="Nama kamu"></label>
      <label class="field"><span>Saldo awal (Rp)</span><input name="saldoAwal" type="number" inputmode="numeric" value="${m.saldoAwal || 0}"></label>
      <button class="btn primary" data-act="save-meta">Simpan</button>
    </form>

    <form class="card" id="pinForm">
      <div class="card-head"><b>PIN aplikasi</b><span class="muted">${m.pin ? 'aktif' : 'nonaktif'}</span></div>
      <label class="field"><span>PIN (kosongkan untuk mematikan)</span><input name="pin" type="password" inputmode="numeric" maxlength="8" value="${esc(m.pin)}" placeholder="misal 1234"></label>
      <button class="btn soft" data-act="save-pin">Simpan PIN</button>
    </form>

    <div class="card">
      <div class="card-head"><b>Aplikasi</b></div>
      <p class="muted">Buka tanpa browser dan tetap jalan tanpa internet.</p>
      ${installDone()
        ? '<p class="ok-box">Sudah terpasang di HP ini.</p>'
        : '<button class="btn soft wide" data-act="install-open">Pasang di HP</button>'}
    </div>

    <div class="card">
      <div class="card-head"><b>Anggota (${db.members.length})</b></div>
      <form class="inline-form" id="memberForm">
        <input name="nama" placeholder="Nama anggota" aria-label="Nama anggota" autocomplete="off">
        <button class="btn primary" data-act="add-member">Tambah</button>
      </form>
      <textarea id="bulkIn" class="bulk" rows="2" aria-label="Tempel banyak nama, satu per baris" placeholder="Atau tempel banyak nama, satu per baris…"></textarea>
      <button class="link" data-act="bulk-add">Tambah semua nama di atas</button>
      <div class="members">${db.members.map(x => `
        <div class="member-chip">${esc(x.nama)}<button data-act="del-member" data-id="${x.id}" aria-label="Hapus">×</button></div>`).join('') || '<p class="muted">Belum ada anggota.</p>'}
      </div>
    </div>

    <div class="card">
      <div class="card-head"><b>Laporan</b></div>
      <div class="monthbar slim">
        <button class="icon-btn" data-act="rprev">‹</button>
        <div class="monthbar-mid"><b>${esc(monthLabel(state.reportMonth))}</b></div>
        <button class="icon-btn" data-act="rnext">›</button>
      </div>
      <pre class="report" id="reportBox">${esc(S.report(state.reportMonth))}</pre>
      <button class="btn primary wide" data-act="copy-report">Salin laporan</button>
    </div>

    <div class="card">
      <div class="card-head"><b>Data</b></div>
      <div class="row-actions">
        <button class="btn soft" data-act="export">Backup (.json)</button>
        <button class="btn soft" data-act="import">Pulihkan</button>
      </div>
      <input type="file" id="importFile" accept="application/json,.json" hidden>
      <label class="chk"><input type="checkbox" id="pinInBackup"> Sertakan PIN di file backup</label>
      <div class="row-actions">
        <button class="btn soft" data-act="seed">Isi contoh</button>
        <button class="btn danger-soft" data-act="reset">Hapus semua</button>
      </div>
      <p class="foot">Simpan file backup ke Google Drive/WhatsApp sendiri. Data hanya ada di HP ini.</p>
    </div>`;
  }

  /* ---------- sheet: transaksi ---------- */
  const KAT = {
    masuk: ['Iuran', 'Donasi', 'Denda', 'Lainnya'],
    keluar: ['ATK', 'Konsumsi', 'Kebersihan', 'Kegiatan', 'Transport', 'Lainnya'],
  };

  function openTxn(tipe, txn) {
    state.tipe = tipe;
    state.editId = txn ? txn.id : null;
    state.amt = txn ? String(txn.nominal) : '';
    const kat = txn ? txn.kategori : KAT[tipe][0];
    state.kat = kat;

    openSheet(`
      <div class="sheet-head">
        <div class="seg">
          <button class="seg-btn ${tipe === 'masuk' ? 'on-in' : ''}" data-act="tx-tipe" data-v="masuk">Masuk</button>
          <button class="seg-btn ${tipe === 'keluar' ? 'on-out' : ''}" data-act="tx-tipe" data-v="keluar">Keluar</button>
        </div>
        <button class="icon-btn" data-act="sheet-close" aria-label="Tutup">✕</button>
      </div>

      <div class="amt-display" id="amtView">${rp(state.amt || 0)}</div>

      <div class="chips" id="catChips">${chipsHtml(kat)}</div>

      <div class="keypad">
        ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'del'].map(k =>
          `<button data-k="${k}" class="${k === 'del' ? 'kp-del' : ''}">${k === 'del' ? '⌫' : k}</button>`).join('')}
      </div>

      <div class="quick-amt">
        ${[5000, 10000, 20000, 50000, 100000].map(v => `<button data-k="${v}">${v / 1000}rb</button>`).join('')}
      </div>

      <label class="field"><span>Keterangan</span><input id="ketIn" value="${esc(txn ? txn.ket : '')}" placeholder="misal: beli spidol"></label>
      <label class="field"><span>Tanggal</span><input id="tglIn" type="date" value="${txn ? txn.tgl : S.today()}"></label>

      <button class="btn primary wide big" data-act="tx-save">${txn ? 'Simpan perubahan' : 'Simpan transaksi'}</button>
    `, 'sheet-txn');
  }

  function chipsHtml(active) {
    return KAT[state.tipe].map(k => `<button class="chip ${k === active ? 'on' : ''}" data-act="pick-cat" data-v="${k}">${k}</button>`).join('');
  }

  /* ---------- sheet generik ---------- */
  function openSheet(html, cls = '') {
    const root = $('#sheetRoot');
    root.innerHTML = `<div class="overlay"><div class="sheet ${cls}" role="dialog" aria-modal="true">${html}</div></div>`;
    document.body.classList.add('locked-scroll');
    root.querySelector('.overlay').addEventListener('click', e => {
      if (e.target.classList.contains('overlay')) closeSheet();
    });
  }
  function closeSheet(keepInstall) {
    if (!keepInstall && $('#sheetRoot').querySelector('.install-sheet')) markInstall('dismissed');
    $('#sheetRoot').innerHTML = '';
    document.body.classList.remove('locked-scroll');
    state.editId = null;
    state.dueEditId = null;
  }

  function amtRefresh() {
    const el = $('#amtView');
    if (el) el.textContent = rp(state.amt || 0);
  }

  /* ---------- aksi ---------- */
  document.addEventListener('click', e => {
    const k = e.target.closest('[data-k]');
    if (k) {
      const v = k.dataset.k;
      if (v === 'del') state.amt = state.amt.slice(0, -1);
      else if (v === '000') state.amt = (state.amt || '0') + '000';
      else if (Number(v) >= 1000) state.amt = String(Number(v));
      else state.amt = (state.amt === '0' ? '' : state.amt) + v;
      if (state.amt.length > 12) state.amt = state.amt.slice(0, 12);
      if (/^0+(?=\d)/.test(state.amt)) state.amt = String(Number(state.amt));
      amtRefresh();
      return;
    }

    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;

    switch (act) {
      case 'tab':
        state.tab = el.dataset.tab;
        state.dueId = null;
        render();
        window.scrollTo({ top: 0 });
        break;

      case 'mprev': state.month = shiftMonth(state.month, -1); render(); break;
      case 'mnext': state.month = shiftMonth(state.month, 1); render(); break;
      case 'rprev':
        state.reportMonth = shiftMonth(state.reportMonth, -1);
        render();
        break;
      case 'rnext':
        state.reportMonth = shiftMonth(state.reportMonth, 1);
        render();
        break;

      case 'add': openTxn(el.dataset.tipe || 'keluar', null); break;

      case 'tx-tipe': {
        const v = el.dataset.v;
        if (v === state.tipe) break;
        state.tipe = v;
        state.kat = KAT[v][0];
        $$('.seg-btn').forEach(b => b.classList.toggle('on-in', b.dataset.v === 'masuk'));
        $$('.seg-btn').forEach(b => b.classList.toggle('on-out', b.dataset.v === 'keluar'));
        $('#catChips').innerHTML = chipsHtml(state.kat);
        break;
      }

      case 'pick-cat':
        state.kat = el.dataset.v;
        $$('.chip').forEach(c => c.classList.toggle('on', c === el));
        break;

      case 'tx-save': {
        const nominal = Number(state.amt) || 0;
        if (nominal <= 0) { toast('Nominal belum diisi'); break; }
        const ket = $('#ketIn').value.trim();
        const tgl = $('#tglIn').value || S.today();
        if (state.editId) {
          S.updTxn(state.editId, { nominal, tipe: state.tipe, kategori: state.kat, ket, tgl });
        } else {
          S.addTxn({ nominal, tipe: state.tipe, kategori: state.kat, ket, tgl });
        }
        closeSheet();
        render();
        toast('Tersimpan');
        break;
      }

      case 'txn-open': {
        const t = S.get().txns.find(x => x.id === el.dataset.id);
        if (t) openTxnDetail(t);
        break;
      }

      case 'sheet-close': closeSheet(); break;

      case 'install-open': openInstall(); break;
      case 'install-close': closeSheet(); break;
      case 'install-copy': copy(location.href, 'Link disalin'); break;
      case 'install-go':
        if (!installEvt) break;
        try { installEvt.prompt(); } catch (e) { installEvt = null; break; }
        installEvt.userChoice.then(res => {
          installEvt = null;
          if (res.outcome === 'accepted') {
            markInstall('installed');
            closeSheet(true);
            render();
          } else {
            closeSheet(); // menolak dialog browser tetap dihitung "jangan tanya lagi"
          }
        });
        break;

      case 'txn-edit': {
        const id = el.dataset.id;
        const t = S.get().txns.find(x => x.id === id);
        if (t) openTxn(t.tipe, t);
        break;
      }

      case 'txn-del': {
        if (!confirm('Hapus transaksi ini?')) break;
        S.delTxn(el.dataset.id);
        closeSheet();
        render();
        toast('Transaksi dihapus');
        break;
      }

      case 'copy-unpaid':
        copy(S.unpaidText(el.dataset.id));
        break;

      case 'due-open':
        state.dueId = el.dataset.id;
        render();
        window.scrollTo({ top: 0 });
        break;

      case 'due-back':
        state.dueId = null;
        render();
        break;

      case 'due-new': openDueForm(null); break;

      case 'due-edit': {
        const due = S.get().dues.find(d => d.id === el.dataset.id);
        if (due) openDueForm(due);
        break;
      }

      case 'due-save': {
        const nama = $('#dueName').value.trim() || 'Iuran';
        const nominal = Number($('#dueNom').value) || 0;
        const tgl = $('#dueTgl').value || S.today();
        if (nominal <= 0) { toast('Nominal iuran belum diisi'); break; }
        if (state.dueEditId) {
          S.updDue(state.dueEditId, { nama, nominal, tgl });
          closeSheet();
          render();
          toast('Iuran diperbarui');
          break;
        }
        const d = S.addDue(nama, nominal, tgl);
        closeSheet();
        state.dueId = d.id;
        state.tab = 'iuran';
        render();
        toast('Iuran dibuat');
        break;
      }

      case 'due-del':
        if (!confirm('Hapus iuran ini? Semua pembayaran terkait juga dihapus.')) break;
        S.delDue(el.dataset.id);
        state.dueId = null;
        state.tab = 'iuran';
        render();
        toast('Iuran dihapus');
        break;

      case 'tog-paid': {
        const s = S.dueStats(state.dueId);
        const already = s.unpaid.every(u => u.id !== el.dataset.mid);
        S.setPaid(state.dueId, el.dataset.mid, !already);
        render();
        break;
      }

      case 'save-meta': {
        const f = $('#metaForm');
        const kelas = f.kelas.value.trim();
        const bendahara = f.bendahara.value.trim();
        const saldoAwal = Math.round(Number(f.saldoAwal.value) || 0);
        const meta = S.get().meta;
        Object.assign(meta, { kelas, bendahara, saldoAwal });
        S.save();
        render();
        toast('Identitas disimpan');
        break;
      }

      case 'save-pin': {
        const f = $('#pinForm');
        const pin = f.pin.value.trim();
        S.get().meta.pin = pin;
        S.save();
        state.unlocked = true;
        render();
        toast(pin ? 'PIN aktif' : 'PIN dimatikan');
        break;
      }

      case 'add-member': {
        const f = $('#memberForm');
        const nama = f.nama.value;
        if (!nama.trim()) break;
        if (!S.addMember(nama)) toast('Nama kosong / sudah ada');
        render();
        break;
      }

      case 'bulk-add': {
        const raw = $('#bulkIn').value;
        const names = raw.split(/[\n,;]+/).map(x => x.trim()).filter(Boolean);
        let n = 0;
        names.forEach(x => { if (S.addMember(x)) n++; });
        render();
        toast(`${n} anggota ditambahkan`);
        break;
      }

      case 'del-member':
        if (!confirm('Hapus anggota ini? Riwayat pembayarannya ikut dihapus.')) break;
        S.delMember(el.dataset.id);
        render();
        break;

      case 'copy-report':
        copy(S.report(state.reportMonth), 'Laporan disalin');
        break;

      case 'go-report':
        state.tab = 'atur';
        state.reportMonth = state.month;
        render();
        setTimeout(() => {
          const box = $('#reportBox');
          if (box) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 50);
        break;

      case 'export': {
        const db = S.get();
        const pinBox = $('#pinInBackup');
        const blob = new Blob([S.exportJSON(!!(pinBox && pinBox.checked))], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `kas-${(db.meta.kelas || 'kelas').replace(/\s+/g, '-').toLowerCase()}-${S.today()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        toast('File backup diunduh');
        break;
      }

      case 'import': $('#importFile').click(); break;

      case 'seed':
        if (!confirm('Ganti data saat ini dengan data contoh?')) break;
        S.seed();
        state.month = monthKey(new Date());
        state.tab = 'home';
        render();
        toast('Data contoh dimuat');
        break;

      case 'reset':
        if (!confirm('Hapus SEMUA data kas? Tindakan ini tidak bisa dibatalkan.')) break;
        S.reset();
        state.tab = 'home';
        state.unlocked = true;
        render();
        toast('Semua data dihapus');
        break;

      case 'unlock': {
        const val = $('#pinIn').value;
        if (val === S.get().meta.pin) { state.unlocked = true; render(); }
        else toast('PIN salah');
        break;
      }

      case 'recon':
        openRecon();
        break;

      case 'recon-close': closeSheet(); break;

      default: break;
    }
  });

  document.addEventListener('change', e => {
    if (e.target.id === 'importFile' && e.target.files[0]) {
      const file = e.target.files[0];
      const fr = new FileReader();
      fr.onload = () => {
        if (!confirm(`Pulihkan data dari "${file.name}"?\n\nSemua data saat ini akan diganti dan tidak bisa dikembalikan.`)) return;
        try {
          S.importJSON(String(fr.result));
          state.unlocked = true;
          render();
          toast('Data dipulihkan');
        } catch (err) {
          toast('File tidak valid');
        }
      };
      fr.readAsText(file);
      e.target.value = '';
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSheet();
    if (e.key === 'Enter' && e.target.id === 'pinIn') {
      e.preventDefault();
      if (e.target.value === S.get().meta.pin) { state.unlocked = true; render(); }
      else toast('PIN salah');
    }
  });

  /* ---------- sheet kecil ---------- */
  function openTxnDetail(t) {
    openSheet(`
      <div class="sheet-head">
        <h2>Detail transaksi</h2>
        <button class="icon-btn" data-act="sheet-close">✕</button>
      </div>
      <div class="detail">
        <div class="detail-amt ${t.tipe}">${t.tipe === 'masuk' ? '+' : '−'} ${rp(t.nominal)}</div>
        <dl>
          <dt>Kategori</dt><dd>${esc(t.kategori)}</dd>
          <dt>Tanggal</dt><dd>${dayLabel(t.tgl)} ${esc(t.tgl)}</dd>
          <dt>Keterangan</dt><dd>${esc(t.ket) || '-'}</dd>
          <dt>Jenis</dt><dd>${t.tipe === 'masuk' ? 'Uang masuk' : 'Uang keluar'}</dd>
        </dl>
      </div>
      <div class="row-actions">
        <button class="btn soft" data-act="txn-edit" data-id="${t.id}">Ubah</button>
        <button class="btn danger-soft" data-act="txn-del" data-id="${t.id}">Hapus</button>
      </div>
    `);
  }

  function openDueForm(due) {
    state.dueEditId = due ? due.id : null;
    openSheet(`
      <div class="sheet-head">
        <h2>${due ? 'Ubah iuran' : 'Iuran baru'}</h2>
        <button class="icon-btn" data-act="sheet-close">✕</button>
      </div>
      <label class="field"><span>Nama iuran</span><input id="dueName" placeholder="Iuran November" value="${esc(due ? due.nama : 'Iuran ' + monthLabel(state.month))}"></label>
      <label class="field"><span>Nominal per orang (Rp)</span><input id="dueNom" type="number" inputmode="numeric" placeholder="20000" value="${due ? due.nominal : ''}"></label>
      <label class="field"><span>Tanggal</span><input id="dueTgl" type="date" value="${due ? due.tgl : S.today()}"></label>
      <button class="btn primary wide" data-act="due-save">${due ? 'Simpan perubahan' : 'Buat iuran'}</button>
      <p class="foot">${due ? 'Nominal baru berlaku untuk pembayaran berikutnya. Pembayaran lama tidak berubah.' : 'Setelah dibuat, centang nama yang sudah bayar di tab Iuran.'}</p>
    `);
  }

  function openRecon() {
    const bal = S.balance();
    openSheet(`
      <div class="sheet-head">
        <h2>Cek uang fisik</h2>
        <button class="icon-btn" data-act="recon-close">✕</button>
      </div>
      <p class="muted">Hitung uang tunai yang ada, masukkan di sini.</p>
      <div class="amt-display small">${rp(bal)}<small>tercatat</small></div>
      <label class="field"><span>Uang di tangan (Rp)</span><input id="reconIn" type="number" inputmode="numeric" placeholder="0"></label>
      <button class="btn primary wide" data-act="recon-calc">Hitung selisih</button>
      <div id="reconOut" class="recon-out"></div>
    `);
  }

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act="recon-calc"]');
    if (!el) return;
    const val = Number($('#reconIn').value) || 0;
    const diff = val - S.balance();
    $('#reconOut').innerHTML = diff === 0
      ? `<div class="ok-box">Cocok. Saldo catatan sama dengan uang fisik.</div>`
      : `<div class="warn-box">Selisih <b>${rp(Math.abs(diff))}</b> ${diff > 0 ? 'lebih' : 'kurang'} dari catatan.<br><small>Periksa transaksi yang belum tercatat.</small></div>`;
  });

  /* ---------- boot ---------- */
  S.load();
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installEvt = e;
  });
  window.addEventListener('appinstalled', () => {
    markInstall('installed');
    render();
    toast('Aplikasi terpasang');
  });
  render();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }
})();
