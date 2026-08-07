// Estrae maskingSession dal file reale e la esercita sui casi che contano.
// I segnaposto non sono cablati nel test: si leggono dal testo mascherato, perche l'autore viene
// mascherato per primo e la numerazione del corpo dipende da quello.
const fs = require('fs');
const source = fs.readFileSync(require('path').join(__dirname, '..', 'popup.js'), 'utf8');

const start = source.indexOf('function maskingSession()');
if (start < 0) throw new Error('maskingSession non trovata');

let depth = 0, end = start;
for (let i = source.indexOf('{', start); i < source.length; i++) {
  if (source[i] === '{') depth++;
  else if (source[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
}
const maskingSession = new Function(source.slice(start, end) + '; return maskingSession;')();

const RE_ADDRESS = /[^\s<>()[\],;:"]+@[^\s<>()[\],;:"]+\.[^\s<>()[\],;:".]{2,}/u;

function esegui(nome, body, costruisciOutput, atteso) {
  const s = maskingSession();
  const masked = s.maskMessage({ subject: 'Preventivo', author: 'Tizio <t@z.it>', body });

  // Il segnaposto porta un nonce di sessione: si legge dal testo, non si presume.
  const segnaposti = (masked.body.match(/\[indirizzo-[a-z0-9]+-\d+\]/g) || []);
  const uscitaPulita = !RE_ADDRESS.test(masked.subject + ' ' + masked.author + ' ' + masked.body);
  const restored = s.restore(costruisciOutput(segnaposti));
  const buono = uscitaPulita && restored === atteso;

  console.log((buono ? '  OK   ' : '  FAIL ') + nome);
  if (!buono) {
    console.log('         mascherato : ' + masked.body);
    console.log('         indirizzi ancora in chiaro: ' + !uscitaPulita);
    console.log('         ripristinato: ' + restored);
    console.log('         atteso      : ' + atteso);
  }
  return buono;
}

let ok = 0, tot = 0;

tot++; ok += esegui(
  'indirizzo nel corpo, ripristinato sull output',
  'Ciao, scrivi a mario.rossi@fornitore.it per il preventivo.',
  p => `Ho scritto a ${p[0]} come chiesto.`,
  'Ho scritto a mario.rossi@fornitore.it come chiesto.') ? 1 : 0;

tot++; ok += esegui(
  'due indirizzi distinti restano distinguibili',
  'In copia a a@x.it e b@y.com',
  p => `${p[0]} e ${p[1]}`,
  'a@x.it e b@y.com') ? 1 : 0;

tot++; ok += esegui(
  'stesso indirizzo ripetuto usa lo stesso segnaposto',
  'a@x.it ha scritto, rispondi a a@x.it',
  p => p[0],
  'a@x.it') ? 1 : 0;

tot++; ok += esegui(
  'testo senza indirizzi passa intatto',
  'Confermo per venerdi, grazie.',
  () => 'Va bene, confermo.',
  'Va bene, confermo.') ? 1 : 0;

// L'autore, che e sempre presente, non deve mai uscire in chiaro.
const s = maskingSession();
const m = s.maskMessage({ subject: 'x', author: 'Mario Rossi <mario@fornitore.it>', body: 'niente' });
const autoreProtetto = !RE_ADDRESS.test(m.author);
tot++; if (autoreProtetto) ok++;
console.log((autoreProtetto ? '  OK   ' : '  FAIL ') + "l'indirizzo del mittente non esce mai in chiaro");

// Il ripristino non deve toccare testo che assomiglia a un segnaposto ma non lo e.
const s2 = maskingSession();
s2.maskMessage({ subject: '', author: '', body: 'a@x.it' });
const innocuo = s2.restore('vedi [indirizzo-99] e [nota-1]') === 'vedi [indirizzo-99] e [nota-1]';
tot++; if (innocuo) ok++;
console.log((innocuo ? '  OK   ' : '  FAIL ') + 'segnaposto inesistenti lasciati intatti');

console.log('\n' + ok + '/' + tot + ' corretti');
