# Diagnóstico Operativo de Campo V1

Prueba vertical offline-first de Proyecto B. Permite crear una ficha ficticia, evaluar el área de Inventario, guardar automáticamente en el dispositivo, cerrar y continuar, revisar el historial y obtener un scoring preliminar explicable.

## Alcance actual

- React + Vite + TypeScript.
- PWA instalable mediante `vite-plugin-pwa` y Workbox.
- Dexie sobre IndexedDB.
- Mobile-first.
- Una sola área: Inventario.
- Dos preguntas conservadas del prototipo anterior.
- Respuesta normal, “no aplica” y “no se conoce”.
- Evidencia textual, nota, posible causa, hipótesis y confianza.
- Estados borrador, en progreso y completado.
- Sin IA, backend, nube, cuentas ni integraciones.

Durante desarrollo y validación usa únicamente datos ficticios.

## Requisitos

- Node.js 20.19 o posterior.
- npm.

## Instalar

Desde esta carpeta:

```bash
npm install
```

## Ejecutar en desarrollo

```bash
npm run dev
```

Abre la dirección local que muestra Vite. Para probar desde un teléfono en la misma red, usa la dirección de red que muestra el comando y confirma que el firewall local permite la conexión.

## Compilar y probar la versión PWA

```bash
npm run build
npm run preview
```

Abre `http://localhost:4173/` o la dirección indicada. La PWA y el modo offline deben probarse sobre la compilación de producción, no abriendo `index.html` directamente.

## Instalar la PWA

- Chrome o Edge: abre el menú del navegador y selecciona **Instalar aplicación**.
- Android: usa **Agregar a pantalla principal** o **Instalar aplicación**.
- iPhone/iPad: abre en Safari, usa **Compartir** y selecciona **Agregar a pantalla de inicio**.

La instalación y service worker requieren `localhost` o un sitio publicado con HTTPS.

## Diagnóstico PWA

Abre la aplicación agregando `?pwa-debug=1` a la URL. Ejemplo:

```text
https://a01199146-glitch.github.io/proyecto-b-diagnostico/?pwa-debug=1
```

El panel muestra, sin información sensible:

- si el origen es un contexto seguro;
- si el navegador soporta service workers;
- si existe un registro;
- si la página ya está controlada;
- estado de red;
- versión de la aplicación;
- base de publicación;
- número de recursos encontrados en el precache;
- último error de registro.

En la primera visita el registro puede existir antes de que la página esté controlada. Si **Controlador activo** todavía dice **No**, espera unos segundos y recarga una vez.

## Publicación HTTPS en GitHub Pages

El repositorio de publicación verificado es `a01199146-glitch/proyecto-b-diagnostico`. Al ser un sitio de proyecto, su base es:

```text
/proyecto-b-diagnostico/
```

El workflow `.github/workflows/deploy-diagnostico.yml` instala con `npm ci`, ejecuta pruebas, compila con esa base, sube `dist` y despliega mediante GitHub Pages. Se ejecuta manualmente o al actualizar `feature/diagnostico-campo-v1`.

URL esperada:

```text
https://a01199146-glitch.github.io/proyecto-b-diagnostico/
```

### Por qué falló la prueba con la IP local

`http://IP-LOCAL-DE-LA-MAC:4173` no es `localhost` para el teléfono y tampoco usa HTTPS. En ese origen móvil `window.isSecureContext` es falso y el navegador no habilita correctamente el registro/control del service worker. Aunque la aplicación cargue mientras la Mac está disponible, no constituye una prueba offline móvil válida.

## Prueba manual obligatoria

1. Ejecuta `npm run build` y `npm run preview`.
2. Abre la aplicación y pulsa **Nuevo diagnóstico**.
3. Completa la ficha con datos ficticios.
4. Selecciona Inventario como preocupación principal.
5. En P6 elige **Hay diferencias frecuentes**.
6. En P7 elige **No se conoce** y confirma que aparece un dato pendiente.
7. Escribe evidencia, nota y una posible causa marcada como hipótesis.
8. Espera a que aparezca **Guardado local**.
9. Cierra la pestaña y vuelve a abrir la aplicación.
10. Abre el diagnóstico desde el historial y confirma los mismos datos.
11. Desconecta la red o detén temporalmente el servidor después de la primera carga.
12. Recarga: la aplicación debe abrir desde el service worker.
13. Cambia P7 a **No aplica**; el puntaje no debe cambiar.
14. Finaliza el área, recarga y confirma estado **Completado**.

## Prueba física exacta en iPhone

Usa Safari. La instalación desde otros navegadores en iOS puede no ofrecer el mismo flujo.

1. Con conexión, abre `https://a01199146-glitch.github.io/proyecto-b-diagnostico/?pwa-debug=1` en Safari.
2. Confirma **Contexto seguro: Sí**, **Service worker registrado: Sí** y **Base: /proyecto-b-diagnostico/**.
3. Espera a que **Controlador activo** diga **Sí**. Si todavía dice **No**, espera cinco segundos y recarga una vez.
4. Pulsa **Compartir** y luego **Agregar a pantalla de inicio**. Conserva el nombre propuesto y pulsa **Agregar**.
5. Abre la app desde el icono nuevo, no desde la pestaña de Safari.
6. Crea un diagnóstico con datos ficticios, responde Inventario y espera **Guardado local**.
7. Vuelve al historial y confirma que aparece el diagnóstico.
8. Abre el Centro de control y activa **Modo avión**. Confirma que Wi-Fi y datos móviles estén apagados.
9. Cierra la app por completo desde el selector de aplicaciones.
10. Abre otra vez la app desde su icono. Debe mostrar la pantalla inicial y el historial sin depender de la Mac.
11. Abre el diagnóstico guardado, modifica una nota y espera **Guardado local**.
12. Cierra y vuelve a abrir la app manteniendo el modo avión. La nota debe seguir disponible.
13. Desactiva el modo avión al terminar.

## Prueba física exacta en Android

Usa Chrome.

1. Con conexión, abre `https://a01199146-glitch.github.io/proyecto-b-diagnostico/?pwa-debug=1` en Chrome.
2. Confirma **Contexto seguro: Sí**, **Service worker registrado: Sí** y **Base: /proyecto-b-diagnostico/**.
3. Espera a que **Controlador activo** diga **Sí**. Si todavía dice **No**, espera cinco segundos y recarga una vez.
4. Abre el menú de Chrome y pulsa **Instalar aplicación** o **Agregar a pantalla principal**; confirma la instalación.
5. Abre la app desde su icono instalado, no desde la pestaña de Chrome.
6. Crea un diagnóstico con datos ficticios, responde Inventario y espera **Guardado local**.
7. Vuelve al historial y confirma que aparece el diagnóstico.
8. Activa **Modo avión** y confirma que Wi-Fi y datos móviles estén apagados.
9. Cierra la app por completo desde la vista de aplicaciones recientes.
10. Abre otra vez la app desde su icono. Debe mostrar la pantalla inicial y el historial sin depender de la Mac.
11. Abre el diagnóstico guardado, modifica una nota y espera **Guardado local**.
12. Fuerza el cierre y vuelve a abrir la app manteniendo el modo avión. La nota debe seguir disponible.
13. Desactiva el modo avión al terminar.

En ambos teléfonos, si al abrir sin red aparece una página del navegador en lugar de la app, repite primero la carga HTTPS con conexión, espera el controlador activo y vuelve a instalar. No borres los datos del sitio entre la carga inicial y la prueba: hacerlo elimina tanto el cache como IndexedDB.

No uses `http://IP-LOCAL-DE-LA-MAC:4173` para esta validación. Esa dirección depende de Vite y de que la Mac permanezca encendida, y no ofrece un origen seguro al teléfono.

## Pruebas automatizadas

```bash
npm test
```

Cubren:

- caso validado de Inventario: 6/7 y prioridad Alta;
- “no aplica” sin efecto en puntos;
- “no se conoce” como información pendiente;
- determinismo con entradas idénticas;
- cierre y reapertura de Dexie sin pérdida de ficha, respuesta ni observación.

## Prototipo anterior

`legacy.html` conserva la interfaz de 15 preguntas, el reporte, exportación JSON, impresión y laboratorio de pruebas anteriores. Usa `questions.js`, `diagnostic.js` y `styles.css` sin modificarlos.

## Privacidad y límites

- Los datos se guardan solo en IndexedDB del navegador actual.
- No existe respaldo ni sincronización.
- Borrar datos del sitio elimina el historial.
- No hay archivos adjuntos reales.
- No se calcula impacto económico.
- Las posibles causas deben validarse.
- La vertical de Inventario no sustituye el diagnóstico completo de seis áreas.

La especificación de inspección, modelos, reglas, esquema Dexie, riesgos y ampliación está en `../../docs/diagnostico-campo-v1-spec.md`.
