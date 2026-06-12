# AGENTS.md — Nuestro Plan

> Contexto persistente del proyecto para agentes de IA (OpenAI Codex, Agentflow, etc.).
> Mantener sincronizado con CLAUDE.md.

## Qué es

**Nuestro Plan** — webapp SPA+PWA de finanzas en pareja. Enfoque macro: reparto del excedente mensual entre metas conjuntas e individuales.

- **Beta pública:** https://ourplan1406.netlify.app/
- **Repo:** https://github.com/germandnino/Nuestro_plan

## Stack

- **Frontend:** Vanilla HTML/CSS/JS (ES6+). Sin frameworks.
- **Sync/Backend:** Firebase (Firestore + Auth Google/correo).
- **Persistencia local:** `localStorage` (key `plan2`). Offline-first.
- **PWA:** `service-worker.js` + `manifest.json`.
- **Nativo:** Capacitor (Android).

## Archivos clave (`NP/`)

| Archivo | Rol |
|---|---|
| `NP/index.html` | Shell HTML (~94 líneas) |
| `NP/app.js` | Toda la lógica (~5500 líneas): estado, render, motor financiero, Firebase |
| `NP/styles.css` | Estilos (tema oscuro, mobile-first) |
| `NP/service-worker.js` | Caché PWA. `const CACHE = "nuestro-plan-vNN"` |
| `NP/manifest.json` | Config PWA instalable |
| `NP/firebase-config.js` | Config Firebase (gitignored) |

## Reglas de trabajo — OBLIGATORIO RESPETAR

### Control de commits y caché/versión

**Tareas complejas (con subtareas):**
- Commits atómicos locales por cada subtarea completada.
- NO incrementar `CACHE` (`service-worker.js`) ni `APP_VERSION` (`app.js`) en commits intermedios.
- Solo al finalizar por completo la tarea principal: incrementar ambas versiones + commit final de cierre.

**Tareas pequeñas y acumulativas:**
- Commits atómicos locales por cada tarea individual.
- Un único incremento de `CACHE` y `APP_VERSION` al finalizar el bloque/sesión.
- Evitar incrementos de versión por cada cambio mínimo aislado.

**Actualización obligatoria al finalizar:**
- Al final de cualquier ciclo que modifique `index.html`, `app.js` o `styles.css`: incrementar `CACHE` y `APP_VERSION` es **mandatorio**.
- Previene que usuarios queden con código obsoleto cacheado.

### Otras reglas

- **No push automático a `main`:** acumular commits locales; pushear solo cuando el usuario lo pida.
- **`docs/superpowers/` está gitignored:** specs/planes no se versionan.
- **SW congela código en APK Capacitor:** en nativo el SW se desregistra. Para probar cambios en APK, desinstalar completo (no `install -r`).

## Versionado

`APP_VERSION` en `NP/app.js` (formato `1.0.x`) se sube **junto con** `CACHE` en `service-worker.js` en cada release.

## Comandos

```bash
# Servir web local
npx serve NP

# Android (Capacitor)
npx cap sync android
cd android && ./gradlew installDebug
```
