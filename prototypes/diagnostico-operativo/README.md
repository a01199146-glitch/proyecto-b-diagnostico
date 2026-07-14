# Diagnóstico Operativo de Campo V1 · seis áreas

PWA offline-first de Proyecto B para registrar una sola sesión general y revisar Ventas, Inventario, Procesos, Costos, Tiempos y Clientes. Guarda automáticamente en IndexedDB, reabre la última pantalla útil, genera resultados parciales o completos y permite descargar un respaldo JSON manual.

Durante desarrollo y validación utiliza únicamente datos ficticios.

## Alcance implementado

- React, Vite y TypeScript.
- PWA instalable con Workbox y funcionamiento offline después de la primera carga HTTPS.
- Dexie v2 sobre la misma base IndexedDB validada.
- Seis áreas exactas y doce preguntas P4–P15.
- Dos preguntas por área con textos, identificadores, opciones y puntos históricos sin reescribir.
- Modos `normal`, `not_applicable` y `unknown`.
- Evidencia textual, nota, posible causa, hipótesis, contradicción y confianza.
- Resultado parcial sin convertir áreas faltantes en cero.
- Resultado completo cuando las seis áreas están cerradas.
- Scoring 0–7 y desempate determinista.
- Vista preliminar para cliente y vista interna.
- Exportación JSON v2 como respaldo manual.
- Sin IA, backend, nube, sincronización, cuentas ni integraciones.

## Instalar y validar

Requiere Node.js 20.19 o posterior y npm.

```bash
npm ci
npm test
npm run build
```

Para ejecutar en desarrollo:

```bash
npm run dev
```

Para revisar la compilación:

```bash
npm run preview
```

La PWA debe probarse con `localhost` o HTTPS. Abrir `index.html` directamente o usar una IP local por HTTP no demuestra el funcionamiento offline del service worker.

## Flujo de uso

```text
Inicio e historial
  → Ficha del negocio
  → Resumen de seis áreas
  → Área seleccionada
  → Resumen de seis áreas
  → Resultado general
```

Cada área puede quedar como:

- `not_started`: no iniciada;
- `in_progress`: tiene una pregunta válida y otra pendiente;
- `completed`: dos respuestas válidas;
- `completed_with_pending_information`: cerrada con al menos un “no se conoce”;
- `not_applicable`: ambas preguntas marcadas “no aplica”.

Una pregunta vacía mantiene el área incompleta. “No aplica” se excluye del scoring. “No se conoce” aporta cero y queda como información pendiente.

## Scoring y resultado

```text
puntaje de área = pregunta A (0–3)
                + pregunta B (0–3)
                + 1 si P3 seleccionó el área
```

- 0–2: prioridad Baja.
- 3–4: prioridad Media.
- 5–7: prioridad Alta.

Desempate:

1. área seleccionada en P3;
2. mayor número de respuestas normales con severidad 3;
3. `costos > inventario > ventas > clientes > tiempos > procesos`.

Las demás áreas empatadas inicialmente aparecen como problemas secundarios. Los puntajes siempre se recalculan; no se guardan como valores editables.

## Dexie v2 y migración

La base conserva el nombre `proyecto-b-diagnostico-campo-v1` y las tablas v1:

- `sessions`;
- `businessProfiles`;
- `areaResponses`;
- `internalObservations`.

La versión 2 añade `areaProgress`. Al abrir una base v1:

1. conserva ficha, respuestas y observaciones;
2. crea progreso para las seis áreas;
3. calcula el estado migrado de Inventario;
4. deja las demás áreas como no iniciadas;
5. actualiza la sesión a esquema 2 dentro de la migración.

No borra, recrea ni limpia la base.

## Respaldo JSON

En la pantalla de resultado, **Exportar respaldo JSON** descarga:

- versión del esquema;
- ficha y sesión;
- estados de las seis áreas;
- respuestas, observaciones y evidencias;
- causas e hipótesis;
- puntajes calculados y desempate;
- resultado parcial o completo;
- pendientes y recomendaciones aprobadas;
- timestamps.

El archivo es un respaldo manual local. No se envía a un servidor y todavía no existe importación automática.

## Diagnóstico PWA

Agrega `?pwa-debug=1` a la URL:

```text
https://a01199146-glitch.github.io/proyecto-b-diagnostico/?pwa-debug=1
```

El panel muestra contexto seguro, soporte y control del service worker, conectividad, versión, base, recursos en precache y errores de registro sin exponer respuestas.

## Prueba física después de publicar

1. Con conexión, abre la URL HTTPS con `?pwa-debug=1`.
2. Confirma contexto seguro, service worker registrado y controlador activo.
3. Instala la PWA desde Safari en iPhone o Chrome en Android.
4. Crea una sesión con datos ficticios y completa la ficha.
5. Cierra Inventario con una respuesta normal y una “no se conoce”.
6. Cierra otra área como “no aplica”.
7. Genera un resultado parcial y confirma áreas revisadas y faltantes.
8. Registra evidencia, nota, contradicción y causa marcada como hipótesis.
9. Espera **Guardado local**, cierra la app y vuelve a abrirla.
10. Confirma que abre la última pantalla o área útil con los mismos datos.
11. Exporta el respaldo JSON y verifica que esté marcado como resultado parcial.
12. Completa las seis áreas y genera el resultado completo.
13. Activa modo avión, fuerza el cierre y abre la PWA desde su icono.
14. Confirma historial, sesión, resultado y edición local sin red.
15. Desactiva modo avión al terminar.

No borres los datos del sitio durante esta prueba: eso elimina tanto el cache como IndexedDB.

## Pruebas automatizadas

`npm test` cubre:

- seis áreas, doce preguntas y contrato P4–P15;
- límites de prioridad y rango 0–7;
- “no aplica”, “no se conoce” y pregunta ausente;
- resultado parcial y completo;
- tres reglas de desempate y problemas secundarios;
- casos históricos A, B y C;
- determinismo;
- reapertura Dexie v2;
- migración de Dexie v1 a v2 sin pérdida;
- estructura de exportación JSON;
- configuración de manifest, service worker y precache.

## Fuentes preservadas

- `legacy.html`;
- `questions.js`;
- `diagnostic.js`;
- `styles.css` del prototipo anterior;
- `../../docs/diagnostic-spec.md`.

Estas fuentes siguen siendo la referencia histórica del contrato y no se modificaron durante la migración.

## Privacidad y límites

- Los datos permanecen en IndexedDB del navegador actual.
- El respaldo es manual; no hay nube ni sincronización.
- Borrar los datos del sitio elimina el historial.
- No se adjuntan archivos reales.
- No se inventan impactos económicos, causas, cifras o servicios.
- Las causas se presentan como hipótesis y requieren validación.
- El resultado es preliminar y no sustituye una evaluación profesional.
