# ObraSur · Comparador de materiales de construcción

Aplicación web para comparar precios de materiales de construcción entre proveedores de la
**zona sur del estado de Morelos**, elegir la opción más barata, calcular el total de la obra
según las cantidades y mantener los precios actualizados **cada 15 días**.

Hecha con HTML, CSS y JavaScript puro: no necesita instalación, ni compilación, ni internet.

---

## Cómo abrirla

1. Descarga o copia la carpeta completa (`index.html`, `styles.css`, `data.js`, `app.js`).
2. Haz doble clic en `index.html`.

Opcional, si quieres servirla en local (recomendado para pruebas en celular):

```bash
python3 -m http.server 3000
# abre http://localhost:3000
```

---

## Qué hace cada sección

| Sección | Para qué sirve |
|---|---|
| **Comparador** | Muestra cada material con el precio de los 6 proveedores, resalta el más barato y calcula el ahorro. Tiene buscador, filtros por categoría y ordenamiento. |
| **Cotizador** | Captura cantidades, elige proveedor por material, aplica merma e IVA y obtiene el total. Guarda proyectos, exporta CSV e imprime la cotización en PDF. |
| **Proveedores** | Índice de competitividad de cada proveedor (100% = siempre el más barato), distancia, envío y contacto. |
| **Precios · quincena** | Estado del corte de 15 días, registro de precios nuevos con historial y tendencias (subió / bajó). Exporta e importa los precios en JSON. |
| **Documentación** | Objetivo general y específicos, alcance, módulos, cronograma de 30 días y mejoras futuras: listo para el reporte del proyecto. |

---

## Archivos

```
index.html   → estructura de la página (las 5 secciones)
styles.css   → diseño oscuro, responsive y estilos de impresión
data.js      → CONFIG, PROVEEDORES, MATERIALES y PRECIOS  ← aquí se edita el catálogo
app.js       → toda la lógica: comparación, totales, cotización, guardado y eventos
```

### Dónde cambiar las cosas

- **Proveedores** (nombre, municipio, distancia, envío, teléfono): `data.js` → `PROVEEDORES`.
- **Materiales** (nombre, categoría, unidad, uso): `data.js` → `MATERIALES`.
- **Precios de ejemplo**: `data.js` → `PRECIOS`. Formato `proveedor: [precio actual, precio anterior]`.
- **Fecha del corte y ciclo de actualización**: `data.js` → `CONFIG` (`fechaCorte`, `cicloDias`).
- **Colores**: `styles.css` → variables en `:root` (por ejemplo `--ambar`).

Los precios que se registran desde la aplicación y las cotizaciones guardadas se almacenan en el
navegador (`localStorage`), no en el archivo `data.js`.

---

## Cómo funciona el cálculo

```
cantidad con merma = cantidad × (1 + merma%)
importe            = cantidad con merma × precio unitario del proveedor elegido
subtotal           = suma de importes
IVA                = subtotal × 16%   (se puede desactivar)
total a pagar      = subtotal + IVA
```

Además se calcula un **plan de compra**: agrupa los materiales por proveedor y suma un envío por
proveedor, para comparar "comprar todo en uno" contra "comprar cada cosa donde es más barato".

## Rutina quincenal (día 1 y día 16)

1. Pide la lista de precios a los 6 proveedores.
2. Ve a **Precios · quincena** y registra cada precio nuevo con su fecha.
3. La aplicación guarda el precio anterior y muestra la variación.
4. Emite las cotizaciones con la fecha de corte vigente.

## Publicarla gratis

Cualquier hosting estático funciona (GitHub Pages, Netlify, Vercel, Cloudflare Pages): sube los
cuatro archivos y listo, no hay backend.

---

## Limitaciones del prototipo

- Los precios y contactos son de **ejemplo**: deben reemplazarse por cotizaciones reales.
- No incluye mano de obra, herramienta, fletes por volumen ni tiempos de entrega.
- Los datos viven en el navegador del usuario; no hay cuentas ni base de datos compartida.
- El historial de precios se reinicia si se borran los datos del navegador (usa *Exportar JSON* para respaldarlo).
