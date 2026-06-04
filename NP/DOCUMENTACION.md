# Documentación de la Web-App: Nuestro Plan

"Nuestro Plan" es una aplicación web (Single Page Application) diseñada específicamente para ayudar a parejas a gestionar sus finanzas personales, organizar sus ingresos, distribuir gastos y ahorrar para metas conjuntas e individuales de manera inteligente y automatizada.

## 1. Arquitectura y Stack Tecnológico

*   **Stack:** Vanilla HTML, CSS (CSS Vanilla moderno con variables CSS y tema oscuro) y JavaScript contenidos en un único archivo (`index.html`). Se ejecuta como una PWA en navegadores web y está empaquetado como aplicación nativa para Android utilizando **Capacitor**.
*   **Base de Datos y Sincronización:** Integra **Firebase (Auth y Firestore)** para permitir la autenticación de usuarios y la sincronización en tiempo real de los datos del plan compartido.
*   **Diseño (UI/UX):** Enfoque móvil (Mobile-first) con un diseño oscuro premium. Utiliza tipografías de Google Fonts: `Fraunces` para títulos y números destacados, y `Hanken Grotesk` para textos generales. Cuenta con microanimaciones SVG, gráficos interactivos integrados y transiciones suaves.
*   **Almacenamiento y Persistencia:** Utiliza `localStorage` para almacenar la información de forma persistente localmente (offline-first). Al estar conectado, se sincroniza bidireccionalmente en tiempo real con Firestore. Posee una capa de abstracción para entornos específicos que soporta `window.storage` si está disponible. Cuenta con un banner de alerta para avisar al usuario si el acceso al almacenamiento local está restringido.
*   **Gestión de Estado:** El estado completo de la aplicación se centraliza en un único objeto global `state` que contiene:
    *   `config`: Opciones de presupuesto, nombres, perfil activo, estrategia y configuraciones de distribución.
    *   `metas`: Un listado unificado de metas financieras (compartidas y personales).
    *   `log`: Registro de meses cerrados y aplicados con sus correspondientes aportes.
    *   `ingresos`: Historial de ingresos especiales (variables).
    *   `gastos`: Registro detallado de salidas y gastos imputados a metas específicas.

---

## 2. Secciones Principales (Experiencia de Usuario)

La navegación de la aplicación se divide en **cinco vistas principales** accesibles desde la barra de navegación inferior:

### 🏠 Inicio (Dashboard)
Es la vista general y de monitoreo del plan financiero. Incorpora componentes interactivos avanzados para visualizar el estado del ahorro de un vistazo:
*   **Métricas Clave:** El **total acumulado** global, la **etapa financiera** actual ("Llenando [meta prioritaria]" o "Ahorrando e invirtiendo") y una proyección estimativa de en cuántos meses se cumplirán los objetivos.
*   **Distribución de Ahorros (Gráfico de Dona):** Un gráfico circular SVG dinámico que muestra en tiempo real la proporción del capital actual asignado a cada meta activa (sueños, emergencias, inversiones y el bolsillo personal activo), con leyendas de color detalladas y porcentajes.
*   **Presupuesto Fijo Mensual (Barra Apilada):** Gráfico apilado horizontal que desglosa cómo se divide la nómina regular mensual conjunta entre gastos del hogar, plan en pareja, presupuestos libres de cada uno y el ahorro base restante.
*   **Evolución del Ahorro (Gráfico Histórico):** Gráfico de barras SVG animado que muestra la trayectoria de ahorro mensual de los últimos 6 meses cerrados (se activa al registrar el primer cierre de mes).

### 🎯 Metas
El área de gestión de objetivos de ahorro.
*   **Metas Compartidas y Personales:** Clasificación de los ahorros en 4 tipologías:
    *   *Imprevistos:* Fondo de emergencia prioritario.
    *   *Sueños:* Metas con valores objetivos y/o fecha límite (viajes, compras, etc.).
    *   *Inversión:* Metas abiertas para canalizar ahorros de largo plazo.
    *   *Personal:* Bolsillo libre blindado para el perfil del teléfono activo.
*   **Reordenamiento por Arrastre (Drag and Drop):** Permite ordenar las metas directamente en la interfaz manteniendo presionado y arrastrando el control ☰. Este orden de la lista define de manera directa las prioridades para el reparto secuencial o en cascada.
*   **Ficha de Detalle:** Acceso a la modificación del saldo, visualización de progreso y registro de salidas (gastos deducidos directamente de la meta con fecha, monto y descripción).

### 💰 Aportar al Plan (Cierre de Mes)
Herramienta operativa para el cierre presupuestario mensual.
*   **Ingresos Extra y Especiales:** Permite registrar los ingresos variables o comisiones de cada miembro del mes en curso, además de añadir ingresos especiales únicos (como primas o bonos) asignándolos directamente a una meta específica o distribuyéndolos según el plan.
*   **Cascada de Distribución:** Visualizador en tiempo real del flujo financiero antes de ser aplicado. Muestra gráficamente cómo se descontará la nómina fija y los extras para cubrir los gastos fijos del hogar, el dinero libre de la pareja, y el ahorro sobrante distribuido.
*   **Manejo de Ahorro Negativo (Déficit):** Si las salidas fijas y variables mensuales superan los ingresos mensuales combinados, la app despliega una advertencia indicando que el ahorro mensual es negativo y **deshabilita** el botón de "Aportar" para evitar desbalances en el saldo.
*   **Meta Llena y Aportes Liberados:** Si una meta ya ha alcanzado o superado su valor objetivo, el visualizador notifica que sus aportes han sido automáticamente liberados y reasignados al ahorro libre del mes.

### 📊 Flujo
Configuración base del flujo de caja mensual regular (presupuesto estático):
*   Nóminas netas de Persona 1 y Persona 2.
*   Total unificado de gastos del hogar.
*   Presupuesto asignado para gustos en pareja (citas, entretenimiento).
*   Dinero libre regular de cada integrante.

### ⚙️ Ajustes (Configuración)
Panel de control estratégico de la aplicación:
*   **Estrategia de Ahorro:** Selección de la lógica de distribución (`secuencial`, `simultaneo` o `cascada`).
*   **Reparto de Ingresos Extras:** Configuración del porcentaje de los ingresos variables del mes que se asigna como premio libre ("bolsillo") y el método para dividirlo.
*   **Perfil Local:** Define a quién pertenece el dispositivo actual (Persona 1 o Persona 2) para blindar la visibilidad y edición del bolsillo libre individual correspondiente.
*   **Sincronizar y Conectar Pareja:** 
    *   **Identificación del Usuario:** Muestra una tarjeta de perfil con el nombre, correo y el proveedor de autenticación (Google o Correo).
    *   **Estado de Conexión de Pareja:** Muestra en tiempo real el correo de la pareja conectada o el estado de espera.
    *   **Gestión de Roles (Editor vs. Lector):** Permite al creador/dueño del plan configurar el permiso de su pareja:
        *   *Editor:* Permiso de lectura y escritura completo sobre el presupuesto, metas compartidas y aportes.
        *   *Lector:* Permiso de solo lectura. El usuario puede ver todo el progreso, pero no puede editar metas, registrar salidas de dinero, modificar presupuestos ni aplicar cierres de mes. El bolsillo personal del lector permanece editable localmente.
*   **Nombres y Respaldo:** Personalización de los nombres y exportación/importación del estado de la aplicación mediante un bloque de texto JSON (deshabilitado en modo Lector).

---

## 3. Lógica Financiera Central (El Motor)

El motor principal reside en la función `distribuirAhorro(monto)`. Los pesos y aportes se calculan y asignan dinámicamente según tres estrategias posibles definidas en Ajustes:

### Estrategias de Ahorro:
1.  **Prioritaria Primero (Secuencial):**
    *   Primero, separa y asigna los **aportes fijos** en pesos (`aporteFijo`) de todas las metas compartidas activas (excepto fondos de imprevistos si no aplica).
    *   Determina la meta con prioridad más alta que aún no esté completada.
    *   Deriva el 100% del ahorro mensual restante a esta meta prioritaria hasta cubrir el saldo necesario para cumplir su objetivo.
    *   Si sobra dinero, o si ya no hay metas prioritarias incompletas, se distribuye el remanente en paralelo entre las demás metas activas utilizando sus respectivos aportes porcentuales (`aportePct`).
    *   Cualquier sobrante final se desvía a la inversión abierta.
2.  **Simultáneo:**
    *   Distribuye el ahorro base mensual en paralelo entre todas las metas vigentes.
    *   Primero cubre los **aportes fijos** en pesos configurados de cada meta incompleta.
    *   Del dinero remanente tras cubrir aportes fijos, reparte según los **porcentajes de ahorro** establecidos de manera proporcional.
    *   Cualquier sobrante final de ahorro se asigna automáticamente a la meta de **Inversión abierta** (o al fondo de emergencias principal si no existe).
3.  **En Cascada:**
    *   Ignora por completo las configuraciones de aportes fijos y porcentajes de las metas.
    *   Ordena las metas de acuerdo a su orden en la lista (prioridad definida por Drag & Drop).
    *   Asigna el total del ahorro mensual disponible de forma secuencial a cada meta con objetivo establecido. Cuando una meta se llena por completo, el remanente continúa llenando la siguiente meta de la lista.
    *   Cualquier saldo remanente que supere todas las metas definidas se desvía a la inversión abierta.

### Reglas Especiales de Lógica Financiera:
*   **Liberación de Aportes por Meta Llena:** Si una meta tiene aportes recurrentes configurados (fijos o en porcentaje) pero su saldo es mayor o igual a su objetivo (`m.saldo >= m.objetivo`), el motor de cálculo omite la asignación a esa meta y libera los fondos para que se aprovechen en las demás metas activas.
*   **Reparto Interno de Categorías de Inversión:** Para metas de tipo `invertir`, se permite configurar categorías internas (porcentajes de reparto). Cuando esta meta recibe aportes (ordinarios o ingresos especiales), la interfaz visualiza y desglosa el saldo correspondiente asignado a cada subcategoría interna (renta fija, variable, etc.).

---

## 4. Onboarding (Primeros Pasos)

Para facilitar la adopción inicial del sistema, la aplicación inicia un asistente interactivo detallado de **9 pasos (Pantallas 0 a 8)** si no se detectan datos guardados:
*   **Paso 0:** Introducción a la filosofía de presupuesto compartido de la app.
*   **Paso 1:** Definición de nombres para Persona 1 y Persona 2.
*   **Paso 2:** Selección de a quién corresponde el dispositivo móvil actual.
*   **Paso 3:** Ingreso de nóminas netas fijas y presupuesto aproximado de gastos compartidos.
*   **Paso 4:** Establecimiento de la partida para citas en pareja y fondos libres individuales.
*   **Paso 5:** Elección de la estrategia de ahorro (Secuencial, Simultáneo o En Cascada).
*   **Paso 6:** Configuración del porcentaje de premios por ingresos extra y su método de división.
*   **Paso 7:** Creación y configuración inicial de su primera meta (Sueño o Inversión).
*   **Paso 8 (Visualización):** Generación automática de una simulación interactiva con la cascada de distribución para que la pareja comprenda visualmente cómo operará el motor en un mes regular con ingresos extra.

---

## 5. Integración Móvil y Despliegue Nativo (Capacitor & Android)

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
