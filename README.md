# Nuestro Plan 🎯

**Nuestro Plan** es una aplicación web (Single Page Application y Progressive Web App) diseñada especialmente para ayudar a parejas a gestionar sus finanzas personales, organizar sus ingresos conjuntos e individuales, distribuir gastos de forma equitativa y ahorrar para metas comunes e individuales de manera inteligente y automatizada.

El proyecto está diseñado con un enfoque premium, móvil y offline-first, permitiendo un control financiero simple, visual y colaborativo.

---

## 🚀 Características Principales

### 🏠 Inicio (Dashboard)
*   **Métricas Clave:** Visualización del total acumulado global, la etapa financiera actual y proyecciones de cumplimiento de metas.
*   **Distribución de Ahorros:** Gráfico de dona interactivo en SVG que muestra la proporción del capital asignado a cada meta activa.
*   **Presupuesto Fijo Mensual:** Gráfico apilado horizontal que desglosa la nómina regular conjunta en gastos del hogar, presupuesto en pareja, dinero libre individual y el ahorro base restante.
*   **Evolución del Ahorro:** Gráfico histórico de barras para comparar el ahorro en los últimos 6 meses.

### 🎯 Gestión de Metas
*   **Tipologías de Metas:** Clasificación en Meta de Imprevistos (emergencias), Sueños (con objetivos y plazos), Inversión (abierta a largo plazo) y Bolsillos Personales (para cada integrante).
*   **Priorización Dinámica:** Reordenamiento mediante *Drag & Drop* (arrastrar y soltar) que define la prioridad de reparto de fondos en cascada.
*   **Control de Gastos de Metas:** Posibilidad de registrar salidas de dinero asociadas directamente a cada meta.

### 💰 Aportar al Plan (Cierre de Mes)
*   **Ingresos Extra y Especiales:** Registro de comisiones y bonos especiales, permitiendo distribuirlos según el plan general o asignarlos a metas específicas.
*   **Cascada de Distribución:** Simulación y visualización interactiva del flujo del dinero en tiempo real antes de aplicar el cierre.
*   **Control de Déficit:** Alerta y bloqueo de cierre en caso de que los egresos superen a los ingresos mensuales.
*   **Liberación de Fondos:** Reasignación automática de aportes asignados a metas ya completadas hacia el ahorro libre.

### ⚙️ Estrategias de Ahorro y Configuración
*   **Estrategias Configurables:** 
    1.  *Prioritaria Primero (Secuencial):* El 100% del ahorro va a la meta más prioritaria e incompleta.
    2.  *Simultáneo:* Distribución paralela cubriendo aportes fijos y repartiendo el sobrante por porcentajes.
    3.  *En Cascada:* Asignación secuencial de arriba hacia abajo llenando metas una a una según la lista.
*   **Gestión de Perfiles:** Configuración personalizada para Persona 1 y Persona 2, permitiendo blindar la visibilidad de los bolsillos individuales en cada dispositivo.
*   **Importación / Exportación:** Respaldo completo de la información mediante archivos JSON.

---

## 🛠️ Stack Tecnológico

*   **Frontend:** Vanilla HTML5, CSS3 moderno (con variables CSS y modo oscuro premium) y JavaScript puro (ES6+).
*   **Sin Dependencias:** 100% libre de frameworks pesados o librerías externas, garantizando un rendimiento óptimo e instantáneo.
*   **PWA (Progressive Web App):** Incluye `service-worker.js` y `manifest.json` para poder ser instalada en dispositivos móviles y funcionar offline.
*   **Almacenamiento:** Persistencia local a través de `localStorage` con capas de abstracción seguras.

---

## 📁 Estructura del Proyecto

```text
Nuestro-Plan/
├── NP/
│   ├── index.html            # Aplicación principal (HTML, CSS y JS unificados)
│   ├── service-worker.js     # Soporte para modo offline (PWA)
│   ├── manifest.json         # Configuración de la PWA para instalación
│   ├── icon-180.png          # Icono de la app (180x180)
│   ├── icon-192.png          # Icono de la app (192x192)
│   ├── icon-512.png          # Icono de la app (512x512)
│   └── DOCUMENTACION.md      # Detalles técnicos de la aplicación
├── .gitignore                # Archivos omitidos en Git
└── README.md                 # Guía general del proyecto (este archivo)
```

---

## 💻 ¿Cómo Ejecutar el Proyecto?

Al ser una SPA en Vanilla JavaScript, no requiere de compilación ni de un servidor web complejo. 

### Opción 1: Abrir Localmente
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
