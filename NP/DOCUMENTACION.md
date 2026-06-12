# Documentación de la Web-App: Nuestro Plan

"Nuestro Plan" es una aplicación web (Single Page Application) diseñada específicamente para ayudar a parejas a gestionar sus finanzas personales, organizar sus ingresos y ahorrar para metas conjuntas e individuales de manera inteligente y automatizada.

## 1. Arquitectura y Stack Tecnológico

*   **Stack:** Vanilla HTML, CSS (CSS Vanilla moderno con variables CSS y tema oscuro) y JavaScript, organizados en tres archivos: `index.html` (shell/estructura), `app.js` (toda la lógica, estado y motor financiero) y `styles.css` (estilos). Se ejecuta como una PWA en navegadores web y está empaquetado como aplicación nativa para Android utilizando **Capacitor**.
*   **Base de Datos y Sincronización:** Integra **Firebase (Auth y Firestore)** para permitir la autenticación de usuarios y la sincronización en tiempo real de los datos del plan compartido.
*   **Diseño (UI/UX):** Enfoque móvil (Mobile-first) con un diseño oscuro premium. Utiliza tipografías de Google Fonts: `Fraunces` para títulos y números destacados, y `Hanken Grotesk` para textos generales. Cuenta con microanimaciones SVG, gráficos interactivos integrados y transiciones suaves.
*   **Almacenamiento y Persistencia:** Utiliza `localStorage` para almacenar la información de forma persistente localmente (offline-first). Al estar conectado, se sincroniza bidireccionalmente en tiempo real con Firestore. Posee una capa de abstracción para entornos específicos que soporta `window.storage` si está disponible. Cuenta con un banner de alerta para avisar al usuario si el acceso al almacenamiento local está restringido.
*   **Versionado:** La constante `APP_VERSION` (`app.js`, formato `1.0.x`) se muestra en el footer de Ajustes y se incrementa junto con la versión de caché del Service Worker (`CACHE` en `service-worker.js`) en cada release, para detectar versiones cacheadas obsoletas.
*   **Gestión de Estado:** El estado completo de la aplicación se centraliza en un único objeto global `state` que contiene:
    *   `config`: Presupuesto, nombres, perfil activo del dispositivo, estrategia de distribución y modo (`pareja` | `individual`).
    *   `metas`: Listado unificado de metas. Tipos: `imprevistos` | `invertir` | `sueno`. Las metas con `dueno` (`p1`|`p2`) son **individuales privadas** de ese perfil.
    *   `log`: Registro legacy de meses cerrados (el "cierre de mes" ya no existe como flujo; queda vacío en planes nuevos).
    *   `ingresos`: **Movimientos** de entrada de dinero al plan (modelo unificado).
    *   `gastos`: Salidas y transferencias (`mov`: `salida` | `transfer-out`/`transfer-in` enlazadas por `transferId`).

> **Conceptos eliminados del modelo (v2):** las metas tipo `deuda`, los bolsillos personales (metas tipo `personal` y la colección Firestore `bolsillos/{uid}`), el aporte fijo en pesos (`aporteFijo`, solo existe `aportePct`), la retención % de ingresos a bolsillo, el "aporte de siempre" y el cierre/confirmación de mes como paso obligatorio.

---

## 2. Modelo de Movimientos Unificados

Todo ingreso de dinero al plan es un **movimiento**, registrado desde una sola acción ("Añadir dinero"):

1.  **¿Cuánto?** — monto del movimiento.
2.  **¿A dónde va?** — tres destinos posibles:
    *   `distribuir` — el **motor** lo reparte entre las metas compartidas según la estrategia activa.
    *   `distribuir-individual` — el motor lo reparte entre las **metas individuales** del perfil activo (privado).
    *   Una **meta concreta** — aporte directo. Si el aporte llena la meta, un modal pregunta qué hacer con el **sobrante**: repartir con el motor, enviarlo a otra meta, o dejarlo **pendiente**.

*   **Sobrantes pendientes:** viven en `state.ingresos` con flag `sinAsignar:true`; un chip en Mi Mes permite asignarlos después.
*   **Retirar dinero** es el movimiento espejo: origen (cualquier meta con saldo) → monto (con botón "Todo") → destino (fuera del plan = gasto real, u otra meta = transferencia). Las transferencias crean el par `transfer-out`/`transfer-in` enlazado por `transferId` y se revierten atómicamente.
*   **Privacidad:** los movimientos hacia metas individuales propias son **invisibles para la pareja** (flags `privado`/`duenoPriv` + filtros `especialesVisibles()` en timeline, estadísticas y gráficos). Una transferencia desde terreno compartido a terreno personal es visible solo como monto ("Transferencia a lo personal"), sin revelar la meta destino.
*   **Reversibilidad:** todo movimiento se puede eliminar desde la lista del mes; los saldos se revierten exactamente (incluyendo la decisión de sobrante que hubiera generado).

---

## 3. Secciones Principales (Experiencia de Usuario)

Navegación inferior con cuatro vistas + botón central de acciones:

### 🏠 Inicio
*   **Patrimonio:** tarjeta "Nuestros ahorros e inversiones" con el total compartido y el desglose Compartido / Individual (lo individual del otro nunca se muestra). Sin metas creadas, muestra un **empty state guía** con CTA "Crear primera meta".
*   **Accesos rápidos:** Añadir Dinero, Ver Mi Mes, Nueva Meta.
*   **Consejo del día:** tarjeta educativa con rotación diaria según el estado del plan.

### 🎯 Metas
Dos subpestañas:
*   **Distribución:** dona SVG de proporción del capital por meta, KPI (ahorro mensual promedio con tendencia, total ahorrado, mejor mes, tasa de ahorro, constancia/racha) y gráfico de evolución de los últimos 6 meses. Todo se calcula **desde los movimientos registrados** (`mesesConDatosUI`/`ahorroMesUI`), no requiere cerrar meses.
*   **Ahorros:** lista de metas compartidas (reordenables por **drag & drop** del control ☰ — el orden define la prioridad para secuencial/cascada) y metas individuales privadas. Cada tarjeta muestra el **% editable inline** (según estrategia); al editar, el sistema **rebalancea automáticamente para mantener la suma en 100%** y resalta con un flash la meta compensada. Al crear/editar una meta cuyo % haga superar el 100%, se ofrece reajustar las demás proporcionalmente.

### 📅 Mi Mes
Pantalla de movimientos del mes seleccionado (navegación ‹ › entre meses — esto reemplaza al historial dedicado):
*   **Métricas:** entradas, salidas y neto del mes.
*   **Distribución del Ahorro Realizado:** barras horizontales doradas (una por meta, con monto y %).
*   **Movimientos del mes:** línea de tiempo con cada ingreso/salida/transferencia, autor (en pareja) y botón de eliminación con reversión de saldos. Filtrada por privacidad.
*   **Sobrantes sin asignar:** chip con CTA para asignarlos.

### 💡 Aprender
Catálogo educativo interactivo con las plataformas reales del mercado colombiano de ahorro e inversión, y recomendaciones por horizonte de la meta (corto/flexible/largo plazo).

### ⚙️ Ajustes
*   **Estrategia de Ahorro:** `secuencial`, `simultaneo` o `cascada`.
*   **Perfil Local:** a quién pertenece el dispositivo (P1/P2) — controla la visibilidad de las metas individuales.
*   **Sincronizar y Conectar Pareja:** tarjeta de perfil (nombre, correo, proveedor), estado de conexión de la pareja, y **gestión de roles**:
    *   *Editor:* lectura y escritura completa.
    *   *Lector:* solo lectura del plan compartido.
*   **Nombres, Respaldo JSON** (exportar/importar el estado completo), reiniciar saldos, borrar datos y versión visible de la app.

### ➕ Botón central de acciones
Action sheet con 4 acciones: **Añadir dinero** · **Retirar dinero** · **Ver Mi Mes** · **Crear nueva meta**.

---

## 4. Lógica Financiera Central (El Motor)

El motor principal reside en `distribuirAhorro(monto)`. Tres estrategias definidas en Ajustes:

1.  **Prioritaria Primero (Secuencial):**
    *   Determina la meta con prioridad más alta que aún no esté completada y le deriva el 100% del monto hasta cubrir su objetivo.
    *   El remanente se distribuye en paralelo entre las demás metas según sus `aportePct`.
    *   Cualquier sobrante final se desvía a la inversión abierta (o al fondo de emergencias si le falta colchón).
2.  **Simultáneo:**
    *   Reparte el monto en paralelo entre todas las metas vigentes según sus **porcentajes** (`aportePct`), de manera proporcional.
    *   El sobrante se asigna a la **inversión abierta** (o al fondo de emergencias principal si no existe).
3.  **En Cascada:**
    *   Ignora los porcentajes. Ordena las metas según la lista (drag & drop) y llena meta por meta secuencialmente.
    *   El remanente final va a la inversión abierta.

`distribuirAhorroIndividual(perfil, monto)` aplica la misma idea sobre las metas individuales del perfil; su remanente queda como **sobrante pendiente**.

### Reglas Especiales:
*   **Suma de % = 100:** `rebalancePct` (edición inline) y `rebalancePctProporcional` (creación/edición de meta) garantizan que los porcentajes de las metas elegibles sumen exactamente 100.
*   **Liberación de Aportes por Meta Llena:** si `m.saldo >= m.objetivo`, el motor omite esa meta y libera sus fondos hacia las demás.
*   **Colocación del Sobrante (`colocarSobrante`):** (1) completa el colchón del fondo de emergencia si tiene objetivo y le falta, (2) el resto a la inversión abierta, (3) sin inversión, el fondo de emergencia actúa de sumidero, (4) en último caso, la meta prioritaria.
*   **Metas "colocadas":** una meta marcada `colocado` (p. ej. un CDT ya constituido) no admite reparto nuevo.
*   **Reparto Interno de Inversión:** las metas `invertir` admiten subcategorías internas con porcentajes (renta fija, variable, etc.) que la interfaz desglosa.

---

## 5. Onboarding (Primeros Pasos)

Asistente interactivo de **4 pasos (Pantallas 0 a 3, `OB_TOTAL=4`)** si no se detectan datos guardados:
*   **Paso 0:** Introducción, login (Google / correo / modo local) y elección de modo (pareja / individual).
*   **Paso 1:** Nombres de Persona 1 y Persona 2, y perfil del dispositivo.
*   **Paso 2:** Creación de la primera meta (nombre, tipo Sueño/Imprevistos, objetivo). El guardado es idempotente (`obMetaCreatedId`): navegar Atrás/Continuar no duplica la meta.
*   **Paso 3:** Resumen de la estructura de la app, tarjeta de instalación PWA y código de invitación para conectar a la pareja.

> La estrategia de ahorro y demás ajustes finos no se piden en el onboarding (default: estrategia `simultaneo` en `finishOnboarding`) y se configuran después en **Ajustes**.

---

## 6. Integración Móvil y Despliegue Nativo (Capacitor & Android)

La aplicación incluye adaptaciones específicas para ejecutarse de manera óptima como un APK nativo en dispositivos Android:

*   **Autenticación de Google Nativa:**
    *   Utiliza el plugin `@codetrix-studio/capacitor-google-auth`.
    *   Para evitar fallos de inicialización (crashes por `NullPointerException` al obtener el `SignInIntent`), el código inicializa de manera explícita el cliente mediante `GoogleAuth.initialize({ clientId, scopes })` antes de invocar la pantalla de login.
    *   Usa el client ID de tipo Web (Web client ID) para el intercambio seguro del ID Token de Firebase.
*   **Gestión del Service Worker y Caché:**
    *   En dispositivos nativos (Capacitor), los archivos de la app ya se empaquetan localmente dentro del APK, por lo que el Service Worker no es necesario.
    *   Para evitar que el Service Worker y la caché del navegador WebView congelen versiones de código desactualizadas, al detectar una plataforma nativa (`window.Capacitor.isNativePlatform()`), la aplicación desregistra programáticamente los Service Workers activos y purga todas las cachés locales.
*   **Ocultación de la Tarjeta de Instalación (PWA):**
    *   La tarjeta de "Instalar en el teléfono" se oculta automáticamente cuando la app corre de manera nativa en Capacitor, ya que carece de sentido en un entorno empaquetado.
