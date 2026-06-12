# Nuestro Plan 🎯

**Nuestro Plan** es una aplicación web (Single Page Application y Progressive Web App) diseñada especialmente para ayudar a parejas a gestionar sus finanzas personales, organizar sus ingresos conjuntos e individuales, distribuir gastos de forma equitativa y ahorrar para metas comunes e individuales de manera inteligente y automatizada.

El proyecto está diseñado con un enfoque premium, móvil y offline-first, permitiendo un control financiero simple, visual y colaborativo.

---

## 🚀 Características Principales

### 🏠 Inicio (Dashboard)
*   **Patrimonio:** total de ahorros e inversiones con desglose Compartido / Individual (lo individual de la pareja nunca se muestra).
*   **Accesos rápidos:** Añadir Dinero, Ver Mi Mes y Nueva Meta.
*   **Consejo del día:** tarjeta educativa con rotación diaria según el estado del plan.

### 💸 Movimientos Unificados
*   **Añadir dinero:** un solo gesto para aportar al plan — el motor lo reparte entre metas, o va directo a una meta concreta (con manejo de sobrante si la meta se llena).
*   **Retirar dinero:** movimiento espejo — saca dinero del plan (gasto real) o transfiere entre metas, con reversión atómica.
*   **Privacidad en pareja:** los movimientos hacia metas individuales propias son invisibles para la pareja.

### 🎯 Gestión de Metas
*   **Tipologías de Metas:** Imprevistos (emergencias), Sueños (con objetivos y plazos) e Inversión (abierta a largo plazo). Cada integrante puede tener además **metas individuales privadas**.
*   **Priorización Dinámica:** Reordenamiento mediante *Drag & Drop* que define la prioridad de reparto.
*   **% editable inline:** el porcentaje de cada meta se edita en su tarjeta y el sistema rebalancea automáticamente para mantener la suma en 100%.
*   **KPI y evolución:** estadísticas (promedio, mejor mes, racha, tasa de ahorro) y gráfico de los últimos 6 meses, calculados desde los movimientos.

### 📅 Mi Mes
*   **Línea de tiempo de movimientos** del mes con navegación entre meses, métricas (entradas/salidas/neto) y barras de distribución del ahorro realizado.
*   **Sobrantes pendientes:** dinero sin asignar queda visible con un CTA para decidir su destino después.

### ⚙️ Estrategias de Ahorro y Configuración
*   **Estrategias Configurables:** 
    1.  *Prioritaria Primero (Secuencial):* El 100% del ahorro va a la meta más prioritaria e incompleta.
    2.  *Simultáneo:* Distribución paralela proporcional a los porcentajes de cada meta.
    3.  *En Cascada:* Asignación secuencial de arriba hacia abajo llenando metas una a una según la lista.
*   **Gestión de Perfiles y Roles:** perfil por dispositivo (Persona 1 / Persona 2) con metas individuales privadas; roles Editor/Lector para la pareja conectada.
*   **Importación / Exportación:** Respaldo completo de la información mediante archivos JSON.

---

## 🛠️ Stack Tecnológico

*   **Frontend:** Vanilla HTML5, CSS3 moderno (con variables CSS y modo oscuro premium) y JavaScript puro (ES6+). El código está organizado en tres archivos: `index.html` (shell/estructura), `app.js` (toda la lógica, estado y motor financiero) y `styles.css` (estilos).
*   **Sin Dependencias:** 100% libre de frameworks o librerías de frontend pesadas (React, Vue, etc.), garantizando una carga instantánea y rendimiento óptimo.
*   **PWA (Progressive Web App):** Incluye `service-worker.js` y `manifest.json` para ejecución offline e instalación directa desde navegador.
*   **Nativo (Capacitor/Android):** Empaquetado nativo mediante **Capacitor** para ejecutarse como aplicación Android con inicio de sesión nativo de Google.
*   **Base de Datos y Sincronización:** Integración en la nube en tiempo real mediante **Firebase (Firestore y Authentication)**.
*   **Almacenamiento Local:** Persistencia local a través de `localStorage` con capas de abstracción seguras (offline-first).

---

## 📁 Estructura del Proyecto

```text
Nuestro-Plan/
├── NP/                       # Código fuente de la Web-App/PWA
│   ├── index.html            # Shell HTML de la aplicación (estructura)
│   ├── app.js                # Toda la lógica: estado, render, motor financiero, sync
│   ├── styles.css            # Estilos (tema oscuro premium, mobile-first)
│   ├── service-worker.js     # Soporte para modo offline (PWA)
│   ├── manifest.json         # Configuración de la PWA para instalación
│   ├── icon-*.png            # Iconos de la app
│   └── DOCUMENTACION.md      # Detalles técnicos de la aplicación
├── android/                  # Carpeta del proyecto nativo Android (Capacitor)
├── capacitor.config.json     # Configuración del empaquetador Capacitor
├── package.json              # Dependencias de npm y scripts
├── .gitignore                # Archivos omitidos en Git
└── README.md                 # Guía general del proyecto (este archivo)
```

---

## 💻 ¿Cómo Ejecutar el Proyecto?

### Opción 1: Abrir Localmente (Solo Web)
Simplemente haz doble clic en el archivo [NP/index.html](file:///c:/Dev/Nuestro-Plan/NP/index.html) en tu navegador preferido.

### Opción 2: Servidor Local (Recomendado para Service Workers y PWA)
Puedes usar cualquier servidor de desarrollo rápido:
*   Si tienes Python instalado:
    ```bash
    python -m http.server 8000
    ```
*   Si usas VS Code, puedes usar la extensión **Live Server**.
*   Si usas Node.js:
    ```bash
    npx serve NP
    ```

### Opción 3: Dispositivo Android (Nativo con Capacitor)
Para sincronizar tus cambios web y compilar la aplicación en tu celular Android conectado:
1. Sincroniza los assets web con el proyecto Android:
   ```bash
   npx cap sync android
   ```
2. Compila e instala la APK de depuración en tu dispositivo:
   ```powershell
   cd android
   .\gradlew installDebug
   ```
