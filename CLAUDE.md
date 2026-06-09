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
- Mensualmente se hace un **Cierre de Mes** (registrar ingresos extra → simular cascada → aplicar).
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

- `config` — presupuesto, nombres P1/P2, perfil del dispositivo, estrategia, modo (`pareja`|`individual`), `onboarded`, % premio.
- `metas` — lista unificada. Tipos: `imprevistos` | `invertir` | `sueno` | `personal` (las `personal` son de sistema, una por dueño p1/p2).
- `log` — meses cerrados y aplicados.
- `ingresos` — ingresos especiales/variables.
- `gastos` — salidas imputadas a metas.

## Motor financiero

Núcleo: `distribuirAhorro(monto)`. Tres estrategias:

1. **secuencial** (Prioritaria primero) — cubre aportes fijos, vuelca 100% del resto a la meta incompleta de mayor prioridad, sobrante por % a las demás → inversión.
2. **simultaneo** — aportes fijos + reparto proporcional por % en paralelo → sobrante a inversión.
3. **cascada** — ignora fijos/%, llena meta por meta según orden de la lista (Drag & Drop) → sobrante a inversión.

Reglas: meta llena (`saldo >= objetivo`) libera sus aportes; déficit (egresos > ingresos) bloquea el cierre; metas `invertir` admiten subcategorías internas.

## Vistas (nav inferior)

Inicio (dashboard: dona SVG, barra apilada, histórico) · Metas · Aportar al Plan (cierre de mes) · Flujo (presupuesto base) · Ajustes (estrategia, perfil, sync pareja, roles, respaldo JSON).

Onboarding: asistente de **5 pasos (0-4)** si no hay datos guardados (`OB_TOTAL=5`): 0 intro · 1 nombres/modo · 2 presupuesto (nóminas, gastos, libres) · 3 primera meta · 4 simulación. `obSaveStep()` persiste cada paso; la meta del paso 3 es idempotente vía `obMetaCreatedId`.

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
