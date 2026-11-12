// Interface language (Spanish / English). Panel legends stay in English, as on the instrument.
const LS = 's55.lang';
let stored = null;
try { stored = localStorage.getItem(LS); } catch { /* storage unavailable */ }
export const lang = stored === 'es' || stored === 'en' ? stored : ((navigator.language || 'en').toLowerCase().startsWith('es') ? 'es' : 'en');
export function setLang(l) { try { localStorage.setItem(LS, l); } catch { /* storage unavailable */ } location.reload(); }

const S = {
  title: ['System 55 — sintetizador modular', 'System 55 — modular synthesizer'],
  powerTip: ['Encender / apagar el audio', 'Audio on / off'],
  save: ['Guardar', 'Save'], saveTip: ['Guardar como patch de usuario', 'Save as a user patch'],
  del: ['Borrar', 'Delete'], delTip: ['Borrar el patch de usuario seleccionado', 'Delete the selected user patch'],
  export: ['Exportar', 'Export'], exportTip: ['Exportar patch a archivo JSON', 'Export the patch to a JSON file'],
  import: ['Importar', 'Import'], importTip: ['Importar patch desde archivo JSON', 'Import a patch from a JSON file'],
  midiInTip: ['Entrada MIDI', 'MIDI input'],
  chATip: ['Canal MIDI de la voz A (panel 950 y teclado)', 'MIDI channel of voice A (950 panel and keyboard)'],
  chBTip: ['Canal MIDI de la voz B (panel 950B)', 'MIDI channel of voice B (950B panel)'],
  learnTip: ['Modo aprendizaje: pulsa un control del panel y mueve un control físico', 'Learn mode: click a panel control, then move a hardware control'],
  maps: ['Asignaciones', 'Mappings'], mapsTip: ['Ver / editar asignaciones MIDI', 'View / edit MIDI mappings'],
  cableTip: ['Opacidad de los cables', 'Cable opacity'],
  fit: ['Ajustar', 'Fit'], panicTip: ['Apagar todas las notas', 'All notes off'], langTip: ['Idioma', 'Language'],
  audioFail: ['No se pudo iniciar el audio: {0}', 'Could not start audio: {0}'],
  learnMove: ['{0}: mueve un control MIDI…', '{0}: move a MIDI control…'],
  allInputs: ['Todas las entradas', 'All inputs'], noInputs: [' (ninguna detectada)', ' (none detected)'],
  mLearn: ['Aprender MIDI…', 'MIDI learn…'], mUnmap: ['Quitar asignación ({0})', 'Remove mapping ({0})'], mNone: ['Sin asignación MIDI', 'No MIDI mapping'],
  mReset: ['Restablecer valor', 'Reset value'],
  user: ['Usuario', 'User'], patchName: ['Nombre del patch:', 'Patch name:'], myPatch: ['Mi patch', 'My patch'],
  saved: ['Patch guardado', 'Patch saved'], onlyUser: ['Solo se pueden borrar patches de usuario', 'Only user patches can be deleted'],
  confirmDel: ['¿Borrar "{0}"?', 'Delete "{0}"?'], imported: ['Patch importado', 'Patch imported'], badFile: ['Archivo de patch no válido', 'Not a valid patch file'],
  vAomni: ['Voz A: omni', 'Voice A: omni'], vAch: ['Voz A: canal {0}', 'Voice A: channel {0}'],
  vBnone: ['Voz B: sin canal', 'Voice B: no channel'], vBch: ['Voz B: canal {0}', 'Voice B: channel {0}'],
  learnOn: ['Pulsa un control del panel y mueve un control de tu equipo MIDI', 'Click a panel control, then move a control on your MIDI gear'],
  remove: ['Quitar', 'Remove'], mapsTitle: ['Asignaciones MIDI', 'MIDI mappings'], control: ['Control', 'Control'], source: ['Origen', 'Source'],
  noMaps: ['No hay asignaciones. Usa <b>MIDI Learn</b> o haz clic derecho sobre cualquier mando, conmutador o botón.', 'No mappings yet. Use <b>MIDI Learn</b> or right-click any knob, switch or button.'],
  clearAll: ['Borrar todas', 'Clear all'], close: ['Cerrar', 'Close'],
  noMidi: ['Web MIDI no disponible', 'Web MIDI not available'],
  channel: [' · canal {0}', ' · channel {0}'],
  kbHint: ['Ratón, MIDI o teclado del ordenador:<br>A W S E D F T G Y H U J K<br>Z / X: octava', 'Mouse, MIDI or computer keyboard:<br>A W S E D F T G Y H U J K<br>Z / X: octave'],
  helpTitle: ['System 55 — ayuda rápida', 'System 55 — quick help'],
  help: [`<li><b>POWER</b> enciende y apaga el audio. Si el navegador lo bloquea al cargar, se enciende con tu primer clic.</li>
  <li><b>Mandos</b>: arrastra arriba/abajo o usa la rueda; <kbd>Shift</kbd> = ajuste fino; doble clic = valor por defecto.</li>
  <li><b>Cables</b>: arrastra de un jack a otro. Para quitar un cable, tira de un extremo y suéltalo fuera. Un cable por jack; usa los <b>994 Multiples</b> para repartir una señal.</li>
  <li>Los jacks rectangulares son <b>S-trigger</b> (teclado → envolventes). El 960 genera V-trigger: conviértelo con el <b>961 Interface</b>.</li>
  <li>Los 921B no tienen entrada de tono propia: los gobierna su <b>921A Oscillator Driver</b> (cableado interno).</li>
  <li><b>Pedales</b>: eco, flanger y reverb están junto al teclado y se conectan con cables como cualquier módulo; el pulsador los activa.</li>
  <li><b>MIDI</b>: la voz A (panel 950) recibe notas, pitch bend, rueda y aftertouch; la voz B (panel 950B) recibe las notas de su canal. Para asignar un control físico: clic derecho sobre un mando → <i>Aprender MIDI</i>, o activa <b>MIDI Learn</b>.</li>
  <li><b>Teclado del ordenador</b>: <kbd>A</kbd> <kbd>W</kbd> <kbd>S</kbd> <kbd>E</kbd> <kbd>D</kbd> <kbd>F</kbd> <kbd>T</kbd> <kbd>G</kbd> <kbd>Y</kbd> <kbd>H</kbd> <kbd>U</kbd> <kbd>J</kbd> <kbd>K</kbd>; <kbd>Z</kbd>/<kbd>X</kbd> cambian de octava.</li>`,
  `<li><b>POWER</b> turns audio on and off. If the browser blocks it on load, it starts on your first click.</li>
  <li><b>Knobs</b>: drag up/down or use the wheel; <kbd>Shift</kbd> = fine adjust; double-click = default value.</li>
  <li><b>Cables</b>: drag from one jack to another. To remove a cable, pull one end and drop it on nothing. One cable per jack; use the <b>994 Multiples</b> to split a signal.</li>
  <li>Rectangular jacks are <b>S-triggers</b> (keyboard → envelopes). The 960 outputs V-triggers: convert them with the <b>961 Interface</b>.</li>
  <li>The 921B oscillators have no pitch input of their own: their <b>921A Oscillator Driver</b> drives them (internal wiring).</li>
  <li><b>Pedals</b>: echo, flanger and reverb sit next to the keyboard and are patched with cables like any module; the footswitch turns them on.</li>
  <li><b>MIDI</b>: voice A (950 panel) receives notes, pitch bend, mod wheel and aftertouch; voice B (950B panel) receives the notes on its channel. To map a hardware control: right-click a knob → <i>MIDI learn</i>, or turn on <b>MIDI Learn</b>.</li>
  <li><b>Computer keyboard</b>: <kbd>A</kbd> <kbd>W</kbd> <kbd>S</kbd> <kbd>E</kbd> <kbd>D</kbd> <kbd>F</kbd> <kbd>T</kbd> <kbd>G</kbd> <kbd>Y</kbd> <kbd>H</kbd> <kbd>U</kbd> <kbd>J</kbd> <kbd>K</kbd>; <kbd>Z</kbd>/<kbd>X</kbd> change octave.</li>`],
};
export function t(key, ...args) {
  const e = S[key];
  let s = e ? e[lang === 'es' ? 0 : 1] : key;
  args.forEach((a, i) => { s = s.replace(`{${i}}`, a); });
  return s;
}

// Factory patch and category names are written in Spanish; these are their English names.
const NAMES = {
  'Secuencias (960)': 'Sequences (960)', 'Con pedales de efectos': 'With effect pedals', 'Bajos y solistas': 'Basses and leads',
  'Teclados y conjuntos': 'Keys and ensembles', 'Efectos y percusión': 'Effects and percussion', 'Básicos': 'Basics',
  'Bajo clásico · 3 osciladores': 'Classic bass · 3 oscillators', 'Bajo redondo de triángulo': 'Round triangle bass',
  'Solista con portamento y vibrato': 'Lead with portamento and vibrato', 'Sync lead': 'Sync lead',
  'Solista en quintas paralelas': 'Lead in parallel fifths', 'Metales': 'Brass',
  'Berlín · ostinato de 8 pasos': 'Berlin · 8-step ostinato',
  'Berlín · 16 pasos (el 962 alterna las filas A y B)': 'Berlin · 16 steps (the 962 alternates rows A and B)',
  'Bajo en octavas · disco electrónico': 'Octave bass · electronic disco',
  'Secuencia rápida con barrido lento de filtro': 'Fast sequence with slow filter sweep',
  'Ritmo irregular (la 3ª fila controla el tiempo)': 'Uneven rhythm (row 3 controls timing)',
  'Secuencia tímbrica (tono, filtro y ancho de pulso por paso)': 'Timbre sequence (pitch, filter and pulse width per step)',
  'Secuencia en quintas paralelas': 'Sequence in parallel fifths',
  'Dúo secuenciado: bajo (fila A) y melodía (fila B)': 'Sequenced duo: bass (row A) and melody (row B)',
  'Bajo y caja de ruido secuenciados': 'Sequenced bass and noise snare',
  'Silbido secuenciado (904A auto-oscilando)': 'Sequenced whistle (self-oscillating 904A)',
  'Secuencia lenta de campanas': 'Slow bell sequence',
  'Frase de un disparo (cada tecla lanza la secuencia)': 'One-shot phrase (each key fires the sequence)',
  'Berlín con eco (tres pasos de retardo)': 'Berlin with echo (three-step delay)', 'Solista con eco y reverb': 'Lead with echo and reverb',
  'Cuerdas con flanger y reverb': 'Strings with flanger and reverb', 'Campanas lentas en una sala grande': 'Slow bells in a large hall',
  'Cuerdas PWM': 'PWM strings', 'Órgano de armónicos': 'Drawbar-style organ', 'Clavecín': 'Harpsichord', 'Flauta': 'Flute', 'Campana FM': 'FM bell',
  'Coro de formantes (914)': 'Formant choir (914)',
  'Viento · ruido y resonancia': 'Wind · noise and resonance', 'Olas del mar': 'Ocean waves', 'Sirena': 'Siren',
  'Tom sintético (filtro percutido)': 'Synth tom (pinged filter)', 'Sin cables': 'No cables',
};
export const tn = (name) => (lang === 'en' && NAMES[name]) || name;
export const hasName = (name) => name in NAMES;

// Static markup: data-i18n="key" (text), data-i18n-title="key" (tooltip).
export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  document.title = t('title');
  root.querySelectorAll('[data-i18n]').forEach((e) => { e.textContent = t(e.dataset.i18n); });
  root.querySelectorAll('[data-i18n-title]').forEach((e) => { e.title = t(e.dataset.i18nTitle); });
}
