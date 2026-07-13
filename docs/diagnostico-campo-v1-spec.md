# Especificación — Diagnóstico Operativo de Campo V1

## 1. Objetivo

Convertir gradualmente el prototipo comercial existente en una PWA de campo, sin reconstruir funciones útiles y sin introducir IA, nube, cuentas o integraciones. La primera prueba vertical cubre la ficha del negocio y una sola área completa: Inventario.

Esta fase usa únicamente datos ficticios para desarrollo y pruebas. La aplicación guarda información en el dispositivo mediante IndexedDB; no la transmite.

## 2. Inventario del prototipo anterior

### 2.1 Archivos existentes antes de la migración

| Archivo | Responsabilidad |
|---|---|
| `prototypes/diagnostico-operativo/index.html` | Estructura de la demo, formulario, laboratorio, reporte y controles de exportación. |
| `prototypes/diagnostico-operativo/styles.css` | Diseño responsive, estados, reporte y vista de impresión. |
| `prototypes/diagnostico-operativo/questions.js` | 15 preguntas, opciones, puntajes, recomendaciones, desempate y tres casos ficticios. |
| `prototypes/diagnostico-operativo/diagnostic.js` | Validación, scoring, reporte, exportación JSON, pruebas internas y comportamiento de interfaz. |
| `prototypes/diagnostico-operativo/README.md` | Uso, límites, privacidad y validación manual. |
| `docs/diagnostic-spec.md` | Contrato funcional aprobado de las 15 preguntas y el scoring 0–7. |

Los archivos `questions.js`, `diagnostic.js` y `styles.css` se conservan sin cambios. La antigua interfaz quedó disponible en `legacy.html` para trazabilidad y comparación.

### 2.2 Funciones actuales

El objeto global `DiagnosticEngine` expone:

- `validateAnswers`: confirma las 15 claves y sus opciones válidas.
- `calculateDiagnostic`: calcula puntajes, severidades, evidencia, categoría principal, prioridad y empates.
- `createReport`: crea el reporte explicable de ocho secciones.
- `normalizeFilenamePart`: normaliza el nombre de descarga.
- `createExportPayload`: construye el JSON local.
- `serializeExport`: serializa el JSON con formato estable.
- `buildExportFilename`: crea el nombre del archivo.
- `runBuiltInTests`: ejecuta tres casos ficticios conocidos.

La interfaz anterior también conserva modo cliente/demo, modo interno, carga de casos ficticios, impresión y descarga explícita de JSON.

### 2.3 Preguntas actuales

| Número | Área | Propósito | Puntuación |
|---:|---|---|---:|
| 1 | Contexto | Giro principal | No puntúa |
| 2 | Contexto | Tamaño del equipo | No puntúa |
| 3 | Contexto | Principal preocupación | +1 a una de seis áreas |
| 4–5 | Ventas | Registro y visibilidad | 0–3 cada una |
| 6–7 | Inventario | Exactitud e incidentes | 0–3 cada una |
| 8–9 | Procesos | Documentación y reprocesos | 0–3 cada una |
| 10–11 | Costos | Actualización y margen | 0–3 cada una |
| 12–13 | Tiempos | Retrasos y medición | 0–3 cada una |
| 14–15 | Clientes | Seguimiento y oportunidades | 0–3 cada una |

La vertical V1 reutiliza textualmente P6 y P7 y sus cuatro opciones originales. La ficha conserva el sentido de P1, P2 y P3, aunque amplía el contexto de campo.

### 2.4 Lógica de puntuación

Cada área puede obtener un máximo de 7 puntos:

```text
puntaje del área = pregunta operativa A (0–3)
                 + pregunta operativa B (0–3)
                 + 1 si P3 eligió esa área
```

Prioridad:

| Puntaje | Prioridad |
|---:|---|
| 0–2 | Baja |
| 3–4 | Media |
| 5–7 | Alta |

La vertical de Inventario conserva exactamente estas bandas y el punto por preocupación principal.

### 2.5 Desempates

El contrato completo anterior resuelve empates en este orden:

1. Gana la categoría declarada en P3 si participa en el empate.
2. Gana la categoría con más respuestas de severidad 3.
3. Se usa la precedencia fija `costos > inventario > ventas > clientes > tiempos > procesos`.
4. Las demás categorías empatadas se reportan como secundarias.

La vertical no ejecuta desempates porque solo calcula Inventario. La regla se conserva en los archivos anteriores y deberá migrarse sin cambios cuando se habiliten las seis áreas.

### 2.6 Resultados actuales

El reporte anterior incluye:

1. resumen del negocio;
2. problema principal;
3. posibles causas;
4. KPIs recomendados;
5. acciones rápidas;
6. acciones de mediano plazo;
7. prioridad explicada;
8. siguiente paso recomendado.

Incluye puntajes por área, problemas secundarios y aviso preliminar. Las causas ya se presentan como hipótesis que requieren validación.

### 2.7 Exportaciones actuales

La descarga JSON anterior se genera en memoria con `Blob`, sin red ni persistencia. Incluye ficha ficticia, 15 respuestas, puntajes, categoría principal, problemas secundarios, prioridad, causas, KPIs, acciones, siguiente paso y aviso. La impresión se realiza con estilos del navegador; no existe generación PDF automática.

La vertical V1 no elimina esta función: permanece disponible en `legacy.html`. Su migración a la PWA queda fuera de esta prueba vertical.

### 2.8 Componentes reutilizables

- textos y opciones de P1, P3, P6 y P7;
- matriz 0–3 de Inventario;
- escala de prioridad 0–7;
- principio de scoring calculado, no almacenado como verdad;
- lenguaje de resultado preliminar y explicable;
- aviso de que las causas son hipótesis;
- estilo visual general de Proyecto B: verde oscuro, verde operativo y acento lima;
- caso ficticio validado de Inventario con resultado 6/7 y prioridad Alta;
- lógica completa anterior como referencia ejecutable.

### 2.9 Problemas encontrados

- No existe persistencia: recargar o cerrar elimina el trabajo.
- No existe service worker ni manifiesto; no puede instalarse ni abrir sin conexión.
- Las 15 preguntas deben completarse en una sola sesión.
- Solo existe respuesta normal; no hay “no aplica” ni “no se conoce”.
- Evidencia, notas, posible causa y confianza no están modeladas.
- Los datos del negocio y las notas internas no están separados estructuralmente.
- El código global JavaScript mezcla motor, exportación y DOM, lo que dificulta pruebas unitarias de una PWA evolutiva.
- La antigua ejecución directa con `file://` no puede ofrecer correctamente service worker ni PWA; la nueva versión necesita un servidor estático local o publicación estática.

## 3. Alcance congelado de la prueba vertical

Se implementa únicamente:

- pantalla de inicio;
- nuevo diagnóstico;
- historial local;
- ficha básica del negocio;
- área Inventario con P6 y P7;
- respuesta normal;
- “no aplica”;
- “no se conoce”;
- evidencia textual;
- nota del consultor;
- posible causa y marca de hipótesis;
- nivel de confianza;
- guardado automático;
- estados borrador, en progreso y completado;
- scoring preliminar determinista;
- resultado explicable;
- PWA instalable;
- funcionamiento posterior sin conexión;
- diseño mobile-first.

No se implementan IA, OpenAI API, MCP, Apps SDK, backend, nube, cuentas, login, pagos, sincronización, CRM, Shopify, SurveyJS, pdfme, PDF, adjuntos reales ni carga avanzada de archivos.

## 4. Modelo de datos TypeScript

La fuente ejecutable está en `src/models.ts`.

### `BusinessProfile`

Datos declarados por el negocio:

- `sessionId`;
- `name`;
- `sector`;
- `interviewee`;
- `intervieweeRole`;
- `employees`;
- `branches`;
- `mainConcernCategory`;
- `currentTools`;
- `diagnosticDate`.

### `DiagnosticSession`

Control interno de la sesión:

- identificador local;
- versión del esquema;
- área habilitada;
- estado;
- consultor;
- fechas de creación, actualización y finalización.

### `AreaResponse`

- sesión y pregunta;
- área;
- modo `normal`, `not_applicable` o `unknown`;
- valor seleccionado cuando el modo es normal;
- fecha de actualización.

### `EvidenceItem`

- identificador;
- sesión y pregunta;
- tipo textual;
- descripción de evidencia.

No almacena archivos en V1.

### `Finding`

- nota del consultor;
- evidencia;
- posible causa;
- indicador de hipótesis;
- confianza baja, media o alta.

### `PriorityScore`

- área;
- puntaje y máximo;
- prioridad;
- conteo de desconocidos;
- conteo de no aplicables;
- explicación reproducible.

### `Recommendation`

- área y prioridad;
- título y descripción;
- marca obligatoria de validación.

La vertical no genera recomendaciones automáticas nuevas; el tipo queda preparado para migrar las recomendaciones aprobadas.

## 5. Reglas congeladas

1. `No aplica` se excluye y no suma ni resta.
2. `No se conoce` aporta cero y se registra como información pendiente.
3. Ningún dato económico se infiere, calcula o inventa.
4. La posible causa puede marcarse como hipótesis; inicia marcada por seguridad.
5. El scoring se recalcula desde las respuestas y nunca se usa como entrada editable.
6. Las mismas entradas producen exactamente el mismo resultado.
7. La ficha y respuestas declaradas se separan de observaciones internas.
8. Todos los datos permanecen en el dispositivo.
9. Los ejemplos y pruebas usan datos ficticios.
10. El resultado es preliminar y requiere validación profesional.

## 6. Arquitectura implementada

- React para interfaz y estado visible.
- Vite para desarrollo y compilación estática.
- TypeScript para modelos y scoring.
- Dexie sobre IndexedDB para persistencia local.
- `vite-plugin-pwa` y Workbox `generateSW` para precache y uso offline.
- Vitest y `fake-indexeddb` para scoring y reapertura de datos.

La aplicación compila a `dist/` y puede publicarse como sitio estático. `base: "./"` permite alojarla bajo una subruta.

## 7. Esquema Dexie

Base: `proyecto-b-diagnostico-campo-v1`, versión 1.

| Tabla | Contenido | Índices principales |
|---|---|---|
| `sessions` | Estado y metadatos internos | `id`, `status`, `updatedAt`, `createdAt` |
| `businessProfiles` | Ficha declarada por negocio | `sessionId`, `sector`, `mainConcernCategory` |
| `areaResponses` | Respuestas del área | `id`, `sessionId`, `questionId`, compuesto sesión-pregunta |
| `internalObservations` | Evidencia, notas, causas, hipótesis y confianza | `id`, `sessionId`, `questionId`, compuesto sesión-pregunta |

El autosave espera 350 ms después del último cambio y escribe las cuatro tablas dentro de una transacción.

## 8. Criterios de transición a seis áreas

Antes de ampliar:

- migrar P4–P5 y P8–P15 sin cambiar textos ni puntos;
- migrar el desempate completo y sus pruebas conocidas;
- definir navegación entre áreas y resumen general;
- decidir cómo distinguir “área completada” de “área con desconocidos”;
- migrar recomendaciones aprobadas sin inventar impacto económico;
- definir exportación local de la nueva estructura;
- definir migraciones Dexie antes de cambiar el esquema;
- realizar prueba de campo con datos ficticios y después aprobar un protocolo para datos reales;
- validar instalación en iOS y Android físicos;
- documentar respaldo/transferencia local antes de usar información operativa no ficticia.

## 9. Riesgos

- IndexedDB pertenece al navegador y dispositivo; borrar datos del sitio elimina el historial.
- No existe sincronización ni respaldo.
- El service worker requiere HTTPS o `localhost`; no funciona como PWA al abrir `index.html` con `file://`.
- El navegador puede administrar almacenamiento bajo presión.
- El indicador `navigator.onLine` puede decir “En línea” aunque el servidor no responda; la disponibilidad real fue validada apagando el servidor.
- La vertical evalúa una sola área y no representa todavía un diagnóstico operativo completo.

## 10. Corrección de validación móvil y despliegue HTTPS

La prueba inicial desde `localhost` confirmó el precache en la computadora, pero no podía aprobar el uso offline en un teléfono. Al acceder desde `http://IP-LOCAL-DE-LA-MAC:4173`, la IP privada no es `localhost` para el teléfono y el origen no usa HTTPS. Por tanto, `window.isSecureContext` es falso y el service worker no puede registrarse/controlar la página como en un origen seguro.

El repositorio de despliegue verificado es `a01199146-glitch/proyecto-b-diagnostico`, por lo que GitHub Pages publica bajo `/proyecto-b-diagnostico/`. El build recibe esa base mediante `VITE_BASE_PATH`; la ejecución local conserva `./`.

El panel `?pwa-debug=1` permite comprobar contexto seguro, soporte, registro, control, conectividad, versión, base, precache y errores sin mostrar datos del diagnóstico.
