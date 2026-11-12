# System 55 — emulación web de un modular tipo Moog 55

Aplicación estática, sin dependencias ni compilación (AudioWorklet + Web MIDI).

```bash
python3 serve.py
```

Abrir <http://localhost:8055/> en Chrome, Edge o Firefox (hace falta `localhost` o HTTPS para audio y MIDI).

```bash
node test/render.mjs
```

Pruebas offline del motor: afinación, seguimiento 1 V/oct del filtro, tiempos de envolvente, secuenciador y todos los patches de fábrica.

## Estructura

| Archivo | Contenido |
| --- | --- |
| `dsp/engine.js` | Motor: un modelo por módulo y el grafo de parcheo, muestra a muestra a 2× la frecuencia de salida |
| `dsp/worklet.js` | Envoltorio AudioWorklet |
| `js/defs.js` | Paneles (mandos, jacks, posiciones), mueble y resolución de cables/múltiples |
| `js/ui.js` | Dibujo del mueble, mandos, cables y teclado |
| `js/midi.js` | Web MIDI y asignación de controles (MIDI Learn) |
| `js/presets.js` | Patches de fábrica |

## Modelos

Señales en voltios: 1 V/oct (0 V = Do2 en 8'), audio ±1 V, envolventes 5,5 V, V-trigger 0/5 V, S-trigger como contacto.

- **921 / 921A / 921B** — núcleo de diente de sierra (integrador + comparador) con polyBLEP; triángulo por rectificación, seno por conformador con residuo, rectangular por comparador; sync débil/fuerte, FM lineal AC/DC, deriva térmica lenta y error de calibración por oscilador. Los 921B cuelgan de su 921A por cableado interno.
- **904A** — escalera de transistores de 4 etapas con `tanh` por etapa y realimentación (modelo de Huovilainen, 4× sobremuestreo efectivo), sin compensación de graves; auto-oscila y sigue 1 V/oct.
- **904B** — paso alto 24 dB/oct. **914** — paso bajo, 12 resonadores a media octava y paso alto.
- **902** — par diferencial, entradas diferenciales, respuesta lineal o exponencial (12 dB/V), ganancia máx. ×2.
- **911** — contorno RC: T1 hacia un nivel por encima del pico, T2 hacia Esus, T3 a cero; 2 ms–10 s. **911A** — doble retardo de disparo.
- **CP3A** — sumador discreto con recorte suave asimétrico al saturar.
- **960 / 961 / 962** — secuenciador 3×8 con modos skip/normal/stop, novena etapa, control de tiempo por la tercera fila; interfaz V↔S-trigger; conmutador secuencial.
- **950** — monofónico, disparo único, prioridad de nota seleccionable, portamento RC; salidas extra para velocidad, bend, rueda y aftertouch MIDI.

No incluidos: 904C, 992/993, 956 (cinta), entrada *clamp* del 921.
