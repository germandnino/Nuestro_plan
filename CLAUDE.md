# CLAUDE.md — Nuestro Plan

> Contexto persistente del proyecto. Léelo al iniciar cualquier sesión para saber de qué va la app antes de tocar código.

## Qué es

**Nuestro Plan** es una webapp (SPA + PWA) de **finanzas en pareja**. No es una app de gastos diarios (no compite con Monefy/YNAB). Se enfoca en el **nivel macro**: cómo se reparte el excedente mensual (ahorro/inversión) entre metas conjuntas e individuales, con paz mental para la pareja.

- **Beta pública (web):** https://ourplan1406.netlify.app/
- **Repo:** https://github.com/germandnino/Nuestro_plan
- **También** se empaqueta como APK Android vía Capacitor.

## Modelo mental del producto

- La pareja define un **flujo de caja mensual fijo** (nóminas, gastos del hogar, plan en pareja, dinero libre de cada uno).
- El sobrante = **ahorro mensual**, que un **motor de distribución** reparte entre **metas** según una **estrategia**.
- Todo ingreso al plan es un **movimiento** ("Añadir dinero" → motor o meta directa); no hay cierre de mes obligatorio.
- Roles en pareja: **Editor** (lee/escribe) y **Lector** (solo ve).
- Monetización planeada: freemium, pago único Pro ~$9.99 (ver `plan_monetizacion.md`).

## Stack real (verifica aquí, no en READMEs viejos)

- **Frontend:** Vanilla HTML/CSS/JS (ES6+). Sin frameworks.
- **NO está todo en un solo archivo** (los docs viejos lo decían). Está dividido — ver mapa abajo.
- **Sync/Backend:** **Firebase** (Firestore tiempo real + Auth Google/correo). Cada plan tiene owner + partner con roles.
- **Persistencia local:** `localStorage` (key `plan2`) vía capa `store` que prefiere `window.storage` si existe. Offline-first.
- **PWA:** `service-worker.js` + `manifest.json`.
- **Nativo:** Capacitor (Android), Google Auth nativo (`@codetrix-studio/capacitor-google-auth`).

## Mapa de archivos (`NP/`)

| Archivo | Rol |
|---|---|
| `NP/index.html` | Shell HTML (~94 líneas). Solo estructura + carga app.js/styles.css. |
| `NP/app.js` | **Toda la lógica** (~5500 líneas): estado, render, motor financiero, onboarding, Firebase sync. |
| `NP/styles.css` | Estilos (tema oscuro premium, mobile-first). |
| `NP/service-worker.js` | Caché PWA. `const CACHE = "nuestro-plan-vNN"`. |
| `NP/manifest.json` | Config PWA instalable. |
| `NP/firebase-config.js` | Config Firebase (gitignored; hay `.example` + `scripts/generate-firebase-config.js`). |
| `NP/DOCUMENTACION.md` | Detalle funcional profundo de la app. |

## Modelo de estado

Objeto global único en `app.js`:

```js
let state = { config:{}, metas:[], log:[], ingresos:[], gastos:[] };
```

- `config` — presupuesto, nombres P1/P2, perfil del dispositivo, estrategia, modo (`pareja`|`individual`), `onboarded`.
- `metas` — lista unificada. Tipos: `imprevistos` | `invertir` | `sueno`. Metas con `dueno` (`p1`|`p2`) son **individuales privadas** del perfil. **Ya NO existen**: tipo `deuda`, tipo `personal` (bolsillos de sistema), `aporteFijo` (solo `aportePct`).
- `log` — legacy de meses cerrados (el "cierre de mes" ya no existe; queda vacío en planes nuevos).
- `ingresos` — **movimientos** de entrada (modelo unificado: cada aporte es un movimiento).
- `gastos` — salidas y transferencias (`mov`: `salida` | `transfer-out`/`transfer-in` con `transferId`).

## Modelo de movimientos (v2 — sin cierre de mes)

Todo ingreso es un **movimiento** vía "Añadir dinero": monto → destino (`distribuir` = motor compartido, `distribuir-individual` = motor del perfil, o id de meta = aporte directo). Aporte directo que llena la meta → modal de sobrante (motor / otra meta / pendiente). Sobrantes pendientes viven en `ingresos` con `sinAsignar:true`. "Retirar dinero" es el movimiento espejo (fuera del plan o transferencia entre metas). Los KPI (`mesesConDatosUI`/`ahorroMesUI`) se calculan desde los movimientos. Movimientos a metas individuales son invisibles para la pareja (`privado`/`duenoPriv` + filtros en timeline).

## Motor financiero

Núcleo: `distribuirAhorro(monto)`. Tres estrategias:

1. **secuencial** (Prioritaria primero) — 100% a la meta incompleta de mayor prioridad, resto por % a las demás → inversión.
2. **simultaneo** — reparto proporcional por `aportePct` en paralelo → sobrante a inversión.
3. **cascada** — ignora %, llena meta por meta según orden de la lista (Drag & Drop) → sobrante a inversión.

`distribuirAhorroIndividual(perfil, monto)` reparte entre metas individuales; su remanente queda como sobrante pendiente. `rebalancePct`/`autoAdjustPercentages` mantienen la suma de % en 100. Reglas: meta llena (`saldo >= objetivo`) libera sus aportes; metas `invertir` admiten subcategorías internas.

## Vistas (nav inferior)

Inicio (patrimonio + atajos + consejo; empty state guía sin metas) · Metas (subtabs Distribución con dona/KPI/evolución + Ahorros con % inline editable y drag de prioridad) · Mi Mes (movimientos del mes, barras doradas de distribución, navegación ‹ › por mes) · Aprender · Ajustes (estrategia, perfil, sync pareja, roles, respaldo JSON, versión visible `APP_VERSION`).

Acciones (botón + del nav): Añadir dinero · Retirar dinero · Ver Mi Mes · Crear nueva meta.

Onboarding: asistente de **4 pasos (0-3)** (`OB_TOTAL=4`): 0 intro/login · 1 nombres/modo · 2 primera meta · 3 resumen. `obSaveStep()` persiste cada paso; la meta del paso 2 es idempotente vía `obMetaCreatedId`.

## Versionado

`APP_VERSION` (`NP/app.js`, formato `1.0.x`, visible en Ajustes) se sube **junto con** `CACHE` del service worker en cada release.

## Reglas de trabajo en este repo

- **Service Worker bump obligatorio:** al cambiar `index.html`/`app.js`/`styles.css`, **incrementar** `CACHE` en `service-worker.js` (`v50` → `v51`...). Si no, los usuarios siguen viendo código viejo.
- **No push automático a `main`:** acumular commits locales; pushear solo cuando el usuario lo pida explícitamente.
- **SW congela código en APK Capacitor:** en nativo el SW se desregistra. Para probar cambios en APK, desinstalar completo (no `install -r`).
- **`docs/superpowers/` está gitignored:** specs/planes no se versionan; usar `-f` solo si el usuario lo pide.
- Branch de trabajo actual: `feature/redesign-ux-flujo`.

## Comandos

```bash
# Servir web local (recomendado para PWA/SW)
npx serve NP        # o: python -m http.server 8000

# Android (Capacitor)
npx cap sync android
cd android && ./gradlew installDebug
```
