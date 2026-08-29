# 🎨 Epiciclos App — UI/UX Design Specification & AI Image Generation Guide

Este documento describe con precisión la arquitectura visual, layout, paleta de colores, componentes y comportamiento interactivo de la aplicación **Epiciclos** (`com.stivesci.epiciclos` / `epy.stivesci.com`). Está diseñado para ser ingresado directamente en **IAs generadoras de imágenes** (Midjourney v6, Flux.1, DALL-E 3, Imagen 3, Stable Diffusion) para generar mockups de alta fidelidad, conceptos de diseño y propuestas de interfaz de usuario.

---

## 🌌 1. Concepto y Lenguaje Visual (Design System)

- **Nombre:** Epiciclos (Transformada Discreta de Fourier Interactiva & Visualización Matemática).
- **Estilo:** *Modern Dark Glassmorphism / Space Cyberpunk Blueprint*.
- **Atmósfera:** Elegante, técnica, limpia, fluida, orientada a estudiantes de ciencias/matemáticas, diseñadores y creadores de contenido.
- **Fondo General:** Negro profundo con gradiente espacial sutil (`#0a0d14` a `#0f172a`), con cuadrícula matemática tenue opcional (grid de puntos o líneas con 4% de opacidad).
- **Materiales:** Paneles de vidrio esmerilado translúcido (*frosted glass*), `backdrop-filter: blur(16px)`, bordes ultrafinos brillantes con gradiente blanco translúcido (`rgba(255, 255, 255, 0.08)` a `0.15)`) y sombras difusas profundas (`box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45)`).

### 🎨 Paleta Cromática Exacta
- **Color Primario (Ruta y Rotores Activos):** Azul Neón Vibrante / Cyan Eléctrico (`#3b82f6` y `#06b6d4`).
- **Color de Acento / Grabación:** Rosa Neón / Magenta Brillante (`#ec4899` a `#f43f5e`).
- **Color de Éxito / Origen / Nivel Gratuito:** Esmeralda / Verde Neón (`#10b981`).
- **Color de Nivel Cuenta / Puntos de Control:** Ámbar Eléctrico (`#f59e0b`).
- **Color Premium / Gold:** Amarillo Dorado Brillante (`#facc15` con resplandor suave).
- **Fondo de Componentes:** Superficies oscuras acrílicas (`rgba(15, 23, 42, 0.75)`).
- **Texto Principal:** Blanco puro (`#ffffff`) y Blanco hielo (`#f1f5f9`).
- **Texto Secundario:** Gris azulado slate (`#94a3b8`).

---

## 📐 2. Estructura de Pantalla: Desktop vs Mobile

### 🖥️ Vista Desktop (Escritorio / Web)
1. **Lienzo Infinito (Canvas Central - 100vw x 100vh):**
   - **Cadena de Epiciclos / Rotores:** Una serie encadenada de vectores conectados que giran a diferentes frecuencias armónicas.
   - **Formas de Rotores:** Cada eslabón puede ser un **Círculo**, un **Triángulo Equilátero**, un **Cuadrado**, una **Estrella de 5 puntas**, un **Pentágono** o un **Hexágono**.
   - **Punta Trazadora (Tip):** Un punto luminoso brillante que deja una estela continua y luminiscente del dibujo trazado con el color seleccionado.
   - **Punto de Origen (Centro):** Retícula circular verde (`#10b981`) que representa $(0,0)$ o el baricentro.
2. **Barra Lateral Flotante (Glassmorphism Sidebar - Izquierda o Derecha):**
   - Panel vertical de 340px de ancho, con esquinas redondeadas (`border-radius: 16px`), flotando sobre el lienzo con 16px de margen.
   - **Header de 4 Pestañas Superiores con Íconos Minimalistas:**
     - ✏️ **Dibujo:** Lápiz libre, Línea recta, Curva Spline suave, Editar puntos, Paneo, Mover origen, Deshacer, Rehacer, Borrar lienzo.
     - 🎨 **Apariencia:** 
       - *Selector de Formas de Rotores en cuadrícula:* [ ⚪ Círculo | 🔺 Triángulo | 🟦 Cuadrado | ⭐ Estrella | ⬟ Pentágono | ⬡ Hexágono ].
       - *Color Pickers interactivos:* Color de Epiciclos y Color de Trazo.
       - *Sliders de ajuste:* Escala de dibujo ($0.1x - 5.0x$), Grosor de rotores ($1 - 5px$), Grosor de trazo ($1 - 10px$), Tamaño de puntos, Radio de imán (*snapping*).
     - ✨ **Animación & Exportación:**
       - *Slider de velocidad:* $0.1x$ a $5.0x$ con indicador numérico.
       - *Botón principal:* "Iniciar Animación" / "Detener Animación".
       - *Selector de Calidad de Video:*
         - `480p SD` 🟢 [Gratis]
         - `720p HD` 🟡 [🔓 Con Cuenta]
         - `1080p FHD` 👑 [⭐ Premium]
         - `2K QHD` 👑 [⭐ Premium]
         - `4K Ultra HD` 👑 [⭐ Premium]
       - *Botón de Grabación:* "Grabar Video en 1080p" con estado de grabación pulsante en rojo.
       - *Botones de Descarga:* `.MP4` y `.WebM`.
     - 📁 **Proyecto & Nube:**
       - Tarjeta de Perfil de Usuario con Supabase.
       - Lista de Proyectos Guardados en la nube con miniaturas y botón de eliminar/cargar.
       - Subir imagen de referencia / Exportar archivo `.json` de puntos.
       - Banner de Desbloqueo Premium (*Google Play Billing en Android / Mercado Pago en Web*).

---

### 📱 Vista Móvil (App Android / Celular)
1. **Área de Dibujo Touch a Pantalla Completa:**
   - Gestos multitouch de 2 dedos (Pinch-to-zoom y Arrastrar para mover el lienzo).
   - Indicador de estado flotante inferior discreto: *"Lápiz — Dibuja con tu dedo"*.
2. **Banner Superior de Publicidad:**
   - AdMob Adaptive Banner compacto de 320x50px en la parte superior.
3. **Barra de Navegación Inferior Fija (Bottom Navigation Bar):**
   - Barra de acrílico translúcido flotante (`height: 64px`, `border-radius: 20px`, márgenes laterales de 16px, 12px sobre el borde inferior de la pantalla).
   - 4 Botones táctiles equidistantes con íconos vectoriales modernos:
     - `[ ✏️ Dibujo ]` `[ 🎨 Apariencia ]` `[ ✨ Animación ]` `[ 📁 Proyecto ]`
   - El ícono activo tiene un pill resaltado con glow azul/cian (`#3b82f6`).
4. **Cajón Deslizable (Bottom Sheet Drawer):**
   - Al tocar cualquier pestaña, se despliega suavemente una hoja inferior con asa táctil (*drag handle*), esquinas redondeadas superiores de 24px, mostrando los controles, sliders y botones con áreas táctiles generosas (mínimo 48px).

---

## 🤖 3. Prompts Maestros para Generadores de Imágenes (AI Image Prompts)

Copia y pega cualquiera de estos prompts en Midjourney, Flux o DALL-E para obtener renders de diseño de interfaz de primer nivel:

### Prompt 1: Mockup de la App Móvil en Android (UI/UX Showcase)
```text
Clean mobile UI design mockup for a mathematics educational app named "Epiciclos", running on a modern borderless flagship Android smartphone. Dark mode theme with deep obsidian background #0a0d14 and cosmic subtle grid. In the center of the screen, an intricate glowing epicyclic Fourier series animation rendered with neon cyan and glowing amber triangular and circular rotating gears tracing a glowing magenta mathematical spiral drawing. At the bottom, a floating frosted glass bottom navigation bar with 4 modern icons (Pencil, Brush, Sparkles, Folder) with glowing cyan pill indicator on the active tab. Minimalist, modern glassmorphism, subtle neon glows, clean typography, 8k resolution, Figma UI/UX presentation style, UI dribbble design award winner --ar 9:16 --v 6.1 --style raw
```

### Prompt 2: Dashboard Completo en Desktop (Web App Interface)
```text
UI/UX dashboard interface design of a web application for Fourier Series and Epicycle mathematics simulator. Fullscreen dark mode viewport with deep space slate background (#0a0d14). In the main canvas area, an interconnected chain of spinning equilateral triangles and circular gears with thin glowing neon lines, drawing a complex glowing blue and purple vector path. On the right side, a sleek floating glassmorphism control panel with frosted blur effect containing tabs: Draw, Style, Animate, Project. The panel shows a video export quality selector with glowing badges for [480p Free], [720p Account], [1080p Premium], [4K Ultra HD Gold], color pickers, and precision sliders with numeric tags. Ultra sharp, hyper-detailed UI, futuristic clean aesthetic, sleek flat vector icons, Dribbble trend, Behance portfolio showcase --ar 16:9 --v 6.1
```

### Prompt 3: Detalle de los Rotores Geométricos (Triángulos, Estrellas y Círculos)
```text
Close-up conceptual UI visual of an interactive mathematical tool showing complex Fourier epicycles made of glowing neon geometric shapes (rotating equilateral triangles, glowing 5-point stars, and smooth circles) linked together in a kinetic chain. The tip of the final rotor is drawing a vibrant luminescent neon trajectory in real-time. Dark cosmic blueprint aesthetic, glowing technical coordinate lines, precision mathematical markers, glassmorphism tooltips, futuristic scientific software UI, unreal engine 5 render quality, hyper-realistic --ar 16:9 --v 6.1
```

---

## 📊 4. Matriz de Características y Estados del Sistema

| Característica | Estado Invitado (Guest) | Estado Usuario Gratis (Logged In) | Estado Usuario Premium (VIP) |
| :--- | :---: | :---: | :---: |
| **Herramientas de Dibujo** | Lápiz, Línea, Spline, Edición | Lápiz, Línea, Spline, Edición | Todas + Herramientas avanzadas |
| **Formas de Rotores** | Círculos, Triángulos, Cuadrados, Estrellas, Polígonos | Círculos, Triángulos, Cuadrados, Estrellas, Polígonos | Todas las formas ilimitadas |
| **Resolución de Exportación** | 480p SD (Con Anuncio) | 480p y 720p HD (Con Anuncio) | 480p, 720p, 1080p FHD, 2K, 4K UHD (Sin esperas) |
| **Publicidad (AdMob / Web)** | Banners + Interstitial en descarga | Banners + Interstitial en descarga | **100% Libre de Anuncios** |
| **Proyectos en la Nube** | Guardado local en JSON | Hasta 5 proyectos en Supabase | **Almacenamiento Ilimitado** |
| **Pasarela de Pago Activa** | — | — | Google Play In-App / Mercado Pago |
