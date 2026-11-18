// Jalankan: node test/store.test.js
// Cek kecil untuk logika uang: saldo, iuran otomatis, dan backup.
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const mem = {};
global.localStorage = {
  getItem: k => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: k => { delete mem[k]; },
};
global.window = {};
global.alert = () => {};

eval(fs.readFileSync(path.join(__dirname, '..', 'js', 'store.js'), 'utf8'));
const S = window.Store;

S.load();
S.get().meta.saldoAwal = 100000;
S.addTxn({ tipe: 'masuk', nominal: 50000, kategori: 'Iuran' });
S.addTxn({ tipe: 'keluar', nominal: 30000, kategori: 'ATK' });
assert.strictEqual(S.balance(), 120000, 'saldo = awal + masuk - keluar');

const andi = S.addMember('Andi');
const bela = S.addMember('Bela');
const due = S.addDue('Iuran Test', 20000);

S.setPaid(due.id, andi.id, true);
assert.strictEqual(S.balance(), 140000, 'centang iuran menambah saldo');
assert.strictEqual(S.dueStats(due.id).paid, 1);

S.setPaid(due.id, andi.id, false);
assert.strictEqual(S.balance(), 120000, 'batal centang mengembalikan saldo');
assert.strictEqual(S.dueStats(due.id).paid, 0);

S.setPaid(due.id, bela.id, true);
S.delMember(bela.id);
assert.strictEqual(S.balance(), 120000, 'hapus anggota membatalkan iurannya');

assert.throws(() => S.importJSON('{"foo":1}'), /Format/);

S.get().meta.pin = '1234';
assert.ok(S.exportJSON().includes('1234'), 'backup bawaan menyertakan PIN');
assert.ok(!S.exportJSON(false).includes('1234'), 'backup tanpa PIN tidak membocorkan PIN');

const json = S.exportJSON();
S.reset();
assert.strictEqual(S.balance(), 0);
S.importJSON(json);
assert.strictEqual(S.balance(), 120000);
assert.strictEqual(S.get().members.length, 1);

console.log('store: semua cek lulus');
