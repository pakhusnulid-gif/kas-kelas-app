/* Kas Kelas - penyimpanan & logika data (localStorage, tanpa server) */
(function () {
  const KEY = 'kaskelas.v1';
  let db = null;
  let warned = false;
  // shortcut: satu browser, satu perangkat. Pindah ke server + auth kalau butuh multi-bendahara.

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const today = () => iso(new Date());
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const monthKey = d => d.slice(0, 7);

  function blank() {
    return {
      v: 1,
      meta: { kelas: '', bendahara: '', saldoAwal: 0, pin: '', mulai: today() },
      members: [],
      txns: [],
      dues: [],
      paid: [],
    };
  }

  function load() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { /* mode privat */ }
    try { db = raw ? JSON.parse(raw) : blank(); } catch (e) { db = blank(); }
    if (!db || typeof db !== 'object') db = blank();
    db.meta = Object.assign(blank().meta, db.meta || {});
    ['members', 'txns', 'dues', 'paid'].forEach(k => { if (!Array.isArray(db[k])) db[k] = []; });
    return db;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(db));
      return true;
    } catch (e) {
      console.error('Gagal menyimpan', e);
      // Data bisa hilang tanpa peringatan, jadi jangan diam.
      if (!warned) {
        warned = true;
        alert('Data gagal disimpan. Penyimpanan browser penuh atau diblokir. Backup sekarang, lalu kosongkan ruang penyimpanan.');
      }
      return false;
    }
  }

  const byDate = (a, b) => (a.tgl === b.tgl ? (b.ts || 0) - (a.ts || 0) : (a.tgl < b.tgl ? 1 : -1));

  /* ---------- transaksi ---------- */
  function addTxn(t) {
    const txn = {
      id: uid(),
      tgl: t.tgl || today(),
      tipe: t.tipe === 'masuk' ? 'masuk' : 'keluar',
      nominal: Math.round(Number(t.nominal) || 0),
      kategori: t.kategori || 'Lainnya',
      ket: (t.ket || '').trim(),
      dueId: t.dueId || null,
      memberId: t.memberId || null,
      ts: Date.now(),
    };
    db.txns.push(txn);
    save();
    return txn;
  }

  function updTxn(id, patch) {
    const t = db.txns.find(x => x.id === id);
    if (!t) return;
    Object.assign(t, patch);
    t.nominal = Math.round(Number(t.nominal) || 0);
    if (t.dueId && t.memberId) {
      const p = db.paid.find(x => x.dueId === t.dueId && x.memberId === t.memberId);
      if (p) p.nominal = t.tipe === 'masuk' ? t.nominal : 0;
    }
    save();
  }

  function delTxn(id) {
    const t = db.txns.find(x => x.id === id);
    if (!t) return;
    db.txns = db.txns.filter(x => x.id !== id);
    if (t.dueId && t.memberId) {
      db.paid = db.paid.filter(p => !(p.dueId === t.dueId && p.memberId === t.memberId));
    }
    save();
  }

  const monthTxns = m => db.txns.filter(t => t.tgl.startsWith(m)).sort(byDate);

  function totals(m) {
    let masuk = 0, keluar = 0;
    monthTxns(m).forEach(t => { if (t.tipe === 'masuk') masuk += t.nominal; else keluar += t.nominal; });
    return { masuk, keluar, selisih: masuk - keluar, count: monthTxns(m).length };
  }

  function balance() {
    let b = Number(db.meta.saldoAwal) || 0;
    db.txns.forEach(t => { b += t.tipe === 'masuk' ? t.nominal : -t.nominal; });
    return b;
  }

  function byCategory(m) {
    const out = {};
    monthTxns(m).filter(t => t.tipe === 'keluar').forEach(t => {
      out[t.kategori] = (out[t.kategori] || 0) + t.nominal;
    });
    return Object.entries(out).sort((a, b) => b[1] - a[1]);
  }

  /* ---------- anggota ---------- */
  function addMember(nama) {
    nama = (nama || '').trim();
    if (!nama) return null;
    if (db.members.some(m => m.nama.toLowerCase() === nama.toLowerCase())) return null;
    const m = { id: uid(), nama, aktif: true };
    db.members.push(m);
    save();
    return m;
  }

  function renameMember(id, nama) {
    const m = db.members.find(x => x.id === id);
    if (m && (nama || '').trim()) { m.nama = nama.trim(); save(); }
  }

  function delMember(id) {
    db.members = db.members.filter(m => m.id !== id);
    db.paid = db.paid.filter(p => p.memberId !== id);
    db.txns = db.txns.filter(t => t.memberId !== id);
    save();
  }

  /* ---------- iuran ---------- */
  function addDue(nama, nominal, tgl) {
    const d = {
      id: uid(),
      nama: (nama || 'Iuran').trim(),
      nominal: Math.round(Number(nominal) || 0),
      tgl: tgl || today(),
      createdAt: Date.now(),
    };
    db.dues.push(d);
    save();
    return d;
  }

  function updDue(id, patch) {
    const d = db.dues.find(x => x.id === id);
    if (!d) return;
    if (patch.nama) d.nama = patch.nama.trim();
    if (patch.nominal != null) d.nominal = Math.round(Number(patch.nominal) || 0);
    if (patch.tgl) d.tgl = patch.tgl;
    save();
  }

  function delDue(id) {
    db.dues = db.dues.filter(d => d.id !== id);
    db.paid = db.paid.filter(p => p.dueId !== id);
    db.txns = db.txns.filter(t => t.dueId !== id);
    save();
  }

  function dueStats(dueId) {
    const due = db.dues.find(d => d.id === dueId);
    if (!due) return null;
    const paid = db.paid.filter(p => p.dueId === dueId);
    const paidIds = paid.map(p => p.memberId);
    const unpaid = db.members.filter(m => paidIds.indexOf(m.id) < 0);
    const collected = paid.reduce((a, p) => a + (p.nominal || due.nominal), 0);
    return {
      due,
      total: db.members.length,
      paid: paid.length,
      unpaid,
      collected,
      expected: due.nominal * db.members.length,
    };
  }

  function setPaid(dueId, memberId, lunas) {
    const due = db.dues.find(d => d.id === dueId);
    const mem = db.members.find(m => m.id === memberId);
    if (!due || !mem) return;
    const existing = db.paid.find(p => p.dueId === dueId && p.memberId === memberId);

    if (lunas && !existing) {
      const txn = addTxn({
        tipe: 'masuk',
        nominal: due.nominal,
        kategori: 'Iuran',
        ket: `${due.nama} - ${mem.nama}`,
        dueId, memberId,
      });
      db.paid.push({ dueId, memberId, nominal: due.nominal, at: Date.now(), txnId: txn.id });
      save();
    } else if (!lunas && existing) {
      if (existing.txnId) db.txns = db.txns.filter(t => t.id !== existing.txnId);
      db.paid = db.paid.filter(p => !(p.dueId === dueId && p.memberId === memberId));
      save();
    }
  }

  /* ---------- laporan ---------- */
  function report(m) {
    const t = totals(m);
    const cats = byCategory(m);
    const label = new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1)
      .toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    const rp = n => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');

    let s = `*LAPORAN KAS${db.meta.kelas ? ' ' + db.meta.kelas.toUpperCase() : ''}*\n`;
    s += `Periode: ${label}\n`;
    if (db.meta.bendahara) s += `Bendahara: ${db.meta.bendahara}\n`;
    s += `\nSaldo akhir: *${rp(balance())}*\n`;
    s += `Masuk: ${rp(t.masuk)}\n`;
    s += `Keluar: ${rp(t.keluar)}\n`;

    if (cats.length) {
      s += `\n*Pengeluaran per kategori*\n`;
      cats.forEach(([k, v]) => { s += `- ${k}: ${rp(v)}\n`; });
    }

    const dues = db.dues.filter(d => monthKey(d.tgl) === m);
    dues.forEach(d => {
      const st = dueStats(d.id);
      s += `\n*${d.nama}* (${st.paid}/${st.total} lunas)\n`;
      s += `Terkumpul: ${rp(st.collected)} dari ${rp(st.expected)}\n`;
      if (st.unpaid.length) s += `Belum bayar (${st.unpaid.length}): ${st.unpaid.map(x => x.nama).join(', ')}\n`;
    });

    if (!t.count && !dues.length) s += `\nBelum ada transaksi pada periode ini.\n`;
    s += `\n_Dibuat ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}_`;
    return s;
  }

  function unpaidText(dueId) {
    const st = dueStats(dueId);
    if (!st) return '';
    const rp = n => 'Rp ' + (Number(n) || 0).toLocaleString('id-ID');
    let s = `*${st.due.nama}*\n`;
    s += `Sudah bayar: ${st.paid}/${st.total}\n`;
    if (!st.unpaid.length) { s += 'Semua anggota sudah lunas.'; return s; }
    s += `\n*Belum bayar (${st.unpaid.length}):*\n`;
    st.unpaid.forEach((m, i) => { s += `${i + 1}. ${m.nama}\n`; });
    s += `\nIuran: ${rp(st.due.nominal)}/orang\n`;
    s += `Total tunggakan: ${rp(st.due.nominal * st.unpaid.length)}`;
    return s;
  }

  /* ---------- backup ---------- */
  function exportJSON() { return JSON.stringify(db, null, 2); }

  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || typeof data !== 'object' || !Array.isArray(data.txns)) throw new Error('Format file tidak dikenali');
    db = data;
    db.meta = Object.assign(blank().meta, db.meta || {});
    ['members', 'txns', 'dues', 'paid'].forEach(k => { if (!Array.isArray(db[k])) db[k] = []; });
    save();
  }

  function reset() { db = blank(); save(); }

  function seed() {
    db = blank();
    db.meta.kelas = 'XI IPA 2';
    db.meta.bendahara = 'Rani';
    db.meta.saldoAwal = 150000;
    ['Andi', 'Bela', 'Citra', 'Dewa', 'Eka', 'Fajar'].forEach(n => addMember(n));
    const due = addDue('Iuran November', 20000, '2026-11-01');
    addTxn({ tipe: 'masuk', nominal: 20000, kategori: 'Iuran', ket: 'Iuran November - Andi' });
    addTxn({ tipe: 'keluar', nominal: 35000, kategori: 'ATK', ket: 'Spidol & kertas absen', tgl: '2026-11-05' });
    addTxn({ tipe: 'keluar', nominal: 25000, kategori: 'Konsumsi', ket: 'Snack rapat panitia', tgl: '2026-11-12' });
    db.paid.push({ dueId: due.id, memberId: db.members[0].id, nominal: 20000, at: Date.now(), txnId: db.txns[0].id });
    save();
  }

  window.Store = {
    load, save, get: () => db,
    addTxn, updTxn, delTxn, monthTxns, totals, balance, byCategory,
    addMember, renameMember, delMember,
    addDue, updDue, delDue, dueStats, setPaid,
    report, unpaidText, exportJSON, importJSON, reset, seed,
    today, uid,
  };
})();
