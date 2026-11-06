/* ============================================================================
   ObraSur · Lógica de la aplicación
   ----------------------------------------------------------------------------
   Estructura:
     1. Utilidades de formato y fechas
     2. Estado y almacenamiento local
     3. Precios, comparación y cálculos
     4. Renderizado de cada vista
     5. Eventos e inicio
   Depende de data.js (CONFIG, PROVEEDORES, MATERIALES, PRECIOS).
   ========================================================================== */

(() => {
  'use strict';

  /* ======================= 1. UTILIDADES ======================= */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const moneyFmt = new Intl.NumberFormat('es-MX', {
    style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  const numFmt = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 2 });
  const fmtMoney = (n) => moneyFmt.format(Number.isFinite(n) ? n : 0);
  const fmtNum = (n) => numFmt.format(Number.isFinite(n) ? n : 0);

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

  const pad = (n) => String(n).padStart(2, '0');
  const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const sumarDias = (iso, dias) => {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + dias);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const diasEntre = (a, b) => Math.round(
    (new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000
  );
  const fechaLarga = (iso) => new Date(iso + 'T00:00:00')
    .toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' });
  const fechaCorta = (iso) => new Date(iso + 'T00:00:00')
    .toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });

  /* ======================= 2. ESTADO ======================= */
  const materialPorId = (id) => MATERIALES.find((m) => m.id === id);
  const proveedorPorId = (id) => PROVEEDORES.find((p) => p.id === id);
  const CATEGORIAS = ['todas', ...Array.from(new Set(MATERIALES.map((m) => m.categoria)))];

  const K = {
    cotizacion: 'obrasur.cotizacion.v1',
    proyecto: 'obrasur.proyecto.v1',
    actualizaciones: 'obrasur.precios.v1',
    proyectos: 'obrasur.proyectos.v1'
  };

  const leer = (clave, predeterminado) => {
    try {
      const raw = localStorage.getItem(clave);
      return raw ? JSON.parse(raw) : predeterminado;
    } catch (_) {
      return predeterminado;
    }
  };
  const escribir = (clave, valor) => {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (_) { /* modo privado */ }
  };

  const proyectoPrevio = leer(K.proyecto, null) || {};

  const estado = {
    vista: 'comparador',
    busqueda: '',
    categoria: 'todas',
    orden: 'ahorro',
    cotizacion: (leer(K.cotizacion, []) || [])
      .filter((it) => materialPorId(it.materialId) && proveedorPorId(it.proveedorId)),
    proyecto: {
      nombre: proyectoPrevio.nombre || '',
      cliente: proyectoPrevio.cliente || '',
      ubicacion: proyectoPrevio.ubicacion || '',
      fecha: proyectoPrevio.fecha || hoyISO(),
      merma: Number.isFinite(proyectoPrevio.merma) ? proyectoPrevio.merma : CONFIG.mermaSugerida,
      iva: proyectoPrevio.iva !== false
    },
    actualizaciones: (leer(K.actualizaciones, []) || [])
      .filter((a) => materialPorId(a.materialId) && proveedorPorId(a.proveedorId) && Number.isFinite(a.precio)),
    proyectos: leer(K.proyectos, []) || []
  };

  function guardarEstado() {
    escribir(K.cotizacion, estado.cotizacion);
    escribir(K.proyecto, estado.proyecto);
    escribir(K.actualizaciones, estado.actualizaciones);
  }

  function guardarProyectos() {
    escribir(K.proyectos, estado.proyectos);
  }

  /* ======================= 3. PRECIOS Y CÁLCULOS ======================= */

  /** Puntos de precio (fecha + precio) de un material en un proveedor. */
  function puntosPrecio(materialId, proveedorId) {
    const semilla = PRECIOS[materialId] ? PRECIOS[materialId][proveedorId] : null;
    if (!semilla) return [];
    const puntos = [
      { fecha: CONFIG.fechaComparacion, precio: semilla[1] },
      { fecha: CONFIG.fechaCorte, precio: semilla[0] }
    ];
    estado.actualizaciones
      .filter((a) => a.materialId === materialId && a.proveedorId === proveedorId)
      .sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)))
      .forEach((a) => puntos.push({ fecha: a.fecha, precio: a.precio }));

    const porFecha = new Map();
    puntos.forEach((p) => porFecha.set(p.fecha, p));
    return Array.from(porFecha.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  function precioDe(materialId, proveedorId) {
    const puntos = puntosPrecio(materialId, proveedorId);
    return puntos.length ? puntos[puntos.length - 1].precio : null;
  }

  function precioAnteriorDe(materialId, proveedorId) {
    const puntos = puntosPrecio(materialId, proveedorId);
    return puntos.length > 1 ? puntos[puntos.length - 2].precio : null;
  }

  /** Lista de proveedores ordenada de más barato a más caro para un material. */
  function comparativa(materialId) {
    return PROVEEDORES
      .map((proveedor) => ({ proveedor, precio: precioDe(materialId, proveedor.id) }))
      .filter((x) => x.precio != null)
      .sort((a, b) => a.precio - b.precio);
  }

  function ahorroPorcentaje(materialId) {
    const comp = comparativa(materialId);
    if (comp.length < 2) return 0;
    const mejor = comp[0].precio;
    const peor = comp[comp.length - 1].precio;
    return peor ? ((peor - mejor) / peor) * 100 : 0;
  }

  function ahorroPromedio() {
    if (!MATERIALES.length) return 0;
    const total = MATERIALES.reduce((suma, m) => suma + ahorroPorcentaje(m.id), 0);
    return total / MATERIALES.length;
  }

  function ultimaActualizacion() {
    const fechas = [CONFIG.fechaCorte, ...estado.actualizaciones.map((a) => a.fecha)];
    return fechas.filter(Boolean).sort().pop() || CONFIG.fechaCorte;
  }

  function calcular() {
    const factorMerma = 1 + (Number(estado.proyecto.merma) || 0) / 100;
    const lineas = estado.cotizacion.map((it) => {
      const material = materialPorId(it.materialId);
      const precio = precioDe(it.materialId, it.proveedorId) || 0;
      const cantidad = Math.max(0, Number(it.cantidad) || 0);
      const cantidadConMerma = cantidad * factorMerma;
      return {
        ...it,
        material,
        precio,
        cantidad,
        cantidadConMerma,
        importe: cantidadConMerma * precio
      };
    }).filter((l) => l.material);

    const subtotal = lineas.reduce((s, l) => s + l.importe, 0);
    const iva = estado.proyecto.iva ? subtotal * CONFIG.iva : 0;
    return { lineas, subtotal, iva, total: subtotal + iva, factorMerma };
  }

  /** Agrupa las líneas por proveedor y suma un envío por proveedor. */
  function planDeCompra(lineas) {
    const grupos = new Map();
    lineas.forEach((l) => {
      if (!grupos.has(l.proveedorId)) {
        grupos.set(l.proveedorId, {
          proveedor: proveedorPorId(l.proveedorId),
          lineas: [],
          subtotal: 0
        });
      }
      const grupo = grupos.get(l.proveedorId);
      grupo.lineas.push(l);
      grupo.subtotal += l.importe;
    });

    const lista = Array.from(grupos.values()).map((g) => ({
      ...g,
      envio: g.subtotal > 0 ? g.proveedor.envio : 0,
      total: g.subtotal + (g.subtotal > 0 ? g.proveedor.envio : 0)
    })).sort((a, b) => b.subtotal - a.subtotal);

    const subtotal = lista.reduce((s, g) => s + g.subtotal, 0);
    const envios = lista.reduce((s, g) => s + g.envio, 0);
    const base = subtotal + envios;
    const iva = estado.proyecto.iva ? base * CONFIG.iva : 0;
    return { grupos: lista, subtotal, envios, iva, total: base + iva, base };
  }

  /** Compara: comprar TODO en un solo proveedor vs. plan optimizado. */
  function compararProveedorUnico(lineas) {
    const opciones = PROVEEDORES.map((proveedor) => {
      const subtotal = lineas.reduce((s, l) => {
        const precio = precioDe(l.materialId, proveedor.id) || 0;
        return s + l.cantidadConMerma * precio;
      }, 0);
      const envio = subtotal > 0 ? proveedor.envio : 0;
      return { proveedor, subtotal, envio, base: subtotal + envio };
    }).sort((a, b) => a.base - b.base);
    return opciones;
  }

  /* ======================= 4. RENDERIZADO ======================= */

  function renderTodo() {
    renderEstadoCorte();
    renderKPIs();
    renderChips();
    renderComparador();
    renderCotizador();
    renderProveedores();
    renderPrecios();
    renderProyectosGuardados();
    renderBadge();
  }

  function renderBadge() {
    const badge = $('#badge-cot');
    const n = estado.cotizacion.length;
    badge.textContent = String(n);
    badge.hidden = n === 0;
  }

  function renderEstadoCorte() {
    const ultima = ultimaActualizacion();
    const dias = diasEntre(ultima, hoyISO());
    const pendiente = dias >= CONFIG.cicloDias;
    const el = $('#estado-corte');
    el.textContent = pendiente
      ? `Precios con ${dias} días · actualizar`
      : `Corte ${fechaLarga(ultima)}`;
    el.classList.toggle('alerta', pendiente);
  }

  function renderKPIs() {
    const ultima = ultimaActualizacion();
    const próxima = sumarDias(ultima, CONFIG.cicloDias);
    const dias = diasEntre(hoyISO(), próxima);
    const ahorro = ahorroPromedio();

    $('#hero-kpis').innerHTML = `
      <div class="kpi">
        <small>Materiales</small>
        <strong>${MATERIALES.length}</strong>
        <span>en ${new Set(MATERIALES.map((m) => m.categoria)).size} categorías</span>
      </div>
      <div class="kpi">
        <small>Proveedores</small>
        <strong>${PROVEEDORES.length}</strong>
        <span>municipios del sur de Morelos</span>
      </div>
      <div class="kpi destacado">
        <small>Ahorro promedio</small>
        <strong>${ahorro.toFixed(1)}%</strong>
        <span>comprando en el más barato</span>
      </div>
      <div class="kpi">
        <small>Próximo corte</small>
        <strong>${dias <= 0 ? 'Hoy' : dias + ' días'}</strong>
        <span>${fechaCorta(próxima)} · ciclo de ${CONFIG.cicloDias} días</span>
      </div>`;
  }

  function renderChips() {
    const cont = $('#chips');
    cont.innerHTML = CATEGORIAS.map((cat) => `
      <button class="chip ${estado.categoria === cat ? 'activa' : ''}"
        data-accion="categoria" data-cat="${esc(cat)}"
        aria-pressed="${estado.categoria === cat}">
        ${cat === 'todas' ? 'Todas' : esc(cat)}
      </button>`).join('');
  }

  function materialesFiltrados() {
    const q = estado.busqueda.trim().toLowerCase();
    let lista = MATERIALES.filter((m) => {
      const coincideCat = estado.categoria === 'todas' || m.categoria === estado.categoria;
      const texto = `${m.nombre} ${m.categoria} ${m.unidad} ${m.uso}`.toLowerCase();
      return coincideCat && (!q || texto.includes(q));
    });
    if (estado.orden === 'ahorro') lista.sort((a, b) => ahorroPorcentaje(b.id) - ahorroPorcentaje(a.id));
    if (estado.orden === 'precio') {
      const primero = (m) => (comparativa(m.id)[0] ? comparativa(m.id)[0].precio : 0);
      lista.sort((a, b) => primero(a) - primero(b));
    }
    if (estado.orden === 'nombre') lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return lista;
  }

  function renderComparador() {
    const cont = $('#lista-materiales');
    const lista = materialesFiltrados();
    $('#conteo-materiales').textContent =
      `${lista.length} de ${MATERIALES.length} materiales · precios al ${fechaLarga(ultimaActualizacion())}`;

    if (!lista.length) {
      cont.innerHTML = `<div class="vacio" style="grid-column:1/-1">
        <strong>Sin resultados</strong>
        <p>No encontramos materiales con ese criterio. Prueba con “cemento”, “varilla” o cambia la categoría.</p>
        <button class="btn btn-linea" data-accion="limpiar-filtros">Limpiar filtros</button>
      </div>`;
      return;
    }

    cont.innerHTML = lista.map((m) => {
      const comp = comparativa(m.id);
      if (!comp.length) return '';
      const mejor = comp[0];
      const peor = comp[comp.length - 1];
      const ahorro = peor.precio - mejor.precio;
      const ahorroPct = peor.precio ? (ahorro / peor.precio) * 100 : 0;
      const anterior = precioAnteriorDe(m.id, mejor.proveedor.id);
      const tendencia = anterior ? ((mejor.precio - anterior) / anterior) * 100 : 0;
      const claseTend = tendencia > 0.05 ? 'alza' : tendencia < -0.05 ? 'baja' : 'plano';
      const flecha = tendencia > 0.05 ? '▲' : tendencia < -0.05 ? '▼' : '＝';

      return `<article class="mat-card">
        <div class="mat-top">
          <span class="tag">${esc(m.categoria)}</span>
          <span class="tend ${claseTend}" title="Variación contra la quincena anterior">${flecha} ${Math.abs(tendencia).toFixed(1)}%</span>
        </div>
        <h3>${esc(m.nombre)}</h3>
        <p class="mat-unidad">${esc(m.unidad)}</p>
        <p class="mat-uso">${esc(m.uso)}</p>

        <div class="mejor">
          <div>
            <span class="mejor-prov">${esc(mejor.proveedor.nombre)}</span>
            <span class="mejor-muni">${esc(mejor.proveedor.municipio)} · ${mejor.proveedor.distanciaKm} km</span>
          </div>
          <div class="mejor-precio">${fmtMoney(mejor.precio)}<span class="sello">Mejor precio</span></div>
        </div>

        <button class="btn btn-ghost" data-accion="toggle-precios" data-material="${m.id}"
          aria-expanded="false" aria-controls="precios-${m.id}">Ver los ${comp.length} precios comparados</button>

        <ul class="precios" id="precios-${m.id}" hidden>
          ${comp.map((c, i) => `<li class="${i === 0 ? 'es-mejor' : ''}">
            <span class="p-prov">${esc(c.proveedor.nombre)}<em>${esc(c.proveedor.municipio)}</em></span>
            <span class="p-precio">${fmtMoney(c.precio)}</span>
            <span class="p-dif">${i === 0 ? '<span class="chip-ok">más barato</span>' : '+' + fmtMoney(c.precio - mejor.precio)}</span>
          </li>`).join('')}
        </ul>

        <div class="mat-foot">
          <span class="ahorro">Ahorro hasta <strong>${fmtMoney(ahorro)}</strong> (${ahorroPct.toFixed(0)}%)</span>
          <div class="agregar">
            <label class="sr-only" for="qty-${m.id}">Cantidad de ${esc(m.nombre)} (${esc(m.unidad)})</label>
            <input id="qty-${m.id}" type="number" min="0" step="any" value="1" inputmode="decimal">
            <button class="btn" data-accion="agregar" data-material="${m.id}">Agregar</button>
          </div>
        </div>
      </article>`;
    }).join('');
  }

  /* ------------------------- cotizador ------------------------- */

  function renderCotizador() {
    const res = calcular();
    const vacia = res.lineas.length === 0;
    const hayLineas = !vacia;

    $('#cot-vacia').hidden = hayLineas;
    $('#cot-contenido').hidden = !hayLineas;
    $('#panel-plan').hidden = !hayLineas;
    $('#panel-comparativa-proveedor').hidden = !hayLineas;

    $('#res-materiales').textContent = fmtMoney(res.subtotal);
    $('#res-total').textContent = fmtMoney(res.total);
    $('#iva-monto').textContent = estado.proyecto.iva
      ? `IVA ${(CONFIG.iva * 100).toFixed(0)}%: ${fmtMoney(res.iva)}`
      : 'Sin IVA';

    if (!hayLineas) {
      $('#cot-lineas').innerHTML = '';
      $('#plan-compra').innerHTML = '';
      $('#comparativa-proveedor').innerHTML = '';
      $('#hoja-impresion').innerHTML = '';
      return;
    }

    // --- líneas de la tabla ---
    $('#cot-lineas').innerHTML = res.lineas.map((l, i) => {
      const opciones = PROVEEDORES.map((p) => {
        const precio = precioDe(l.materialId, p.id);
        if (precio == null) return '';
        const esMejor = precio === comparativa(l.materialId)[0].precio;
        return `<option value="${p.id}" ${p.id === l.proveedorId ? 'selected' : ''}>${esc(p.nombre)}${esMejor ? ' ★' : ''} — ${fmtMoney(precio)}</option>`;
      }).join('');

      return `<tr>
        <td><strong>${esc(l.material.nombre)}</strong><em>${esc(l.material.unidad)}</em></td>
        <td class="num"><input type="number" min="0" step="any" value="${l.cantidad}"
            data-campo="cantidad" data-index="${i}" aria-label="Cantidad de ${esc(l.material.nombre)}"></td>
        <td><select data-campo="proveedor" data-index="${i}" aria-label="Proveedor de ${esc(l.material.nombre)}">${opciones}</select></td>
        <td class="num">${fmtMoney(l.precio)}</td>
        <td class="num"><strong>${fmtMoney(l.importe)}</strong></td>
        <td><button class="btn-icono" data-accion="quitar" data-index="${i}"
            aria-label="Quitar ${esc(l.material.nombre)}">×</button></td>
      </tr>`;
    }).join('');

    // --- plan de compra ---
    const plan = planDeCompra(res.lineas);
    $('#plan-compra').innerHTML = `
      ${plan.grupos.map((g, i) => `
        <div class="plan-grupo">
          <header>
            <strong>${i + 1}. ${esc(g.proveedor.nombre)}</strong>
            <span>${esc(g.proveedor.municipio)} · ${g.proveedor.distanciaKm} km</span>
          </header>
          <ul>
            ${g.lineas.map((l) => `<li>
              <span>${fmtNum(l.cantidadConMerma)} ${esc(l.material.unidad)} · ${esc(l.material.nombre)}</span>
              <span>${fmtMoney(l.importe)}</span>
            </li>`).join('')}
          </ul>
          <div class="plan-totales">
            <span>Materiales ${fmtMoney(g.subtotal)} + envío ${fmtMoney(g.envio)}</span>
            <strong>${fmtMoney(g.total)}</strong>
          </div>
        </div>`).join('')}

      <div class="plan-resumen">
        <div class="resumen-linea"><span>Materiales</span><strong>${fmtMoney(plan.subtotal)}</strong></div>
        <div class="resumen-linea"><span>Fletes estimados (${plan.grupos.length} ${plan.grupos.length === 1 ? 'proveedor' : 'proveedores'})</span><strong>${fmtMoney(plan.envios)}</strong></div>
        <div class="resumen-linea"><span>IVA</span><strong>${fmtMoney(plan.iva)}</strong></div>
        <div class="resumen-total"><span>Total con fletes</span><strong>${fmtMoney(plan.total)}</strong></div>
      </div>`;

    // --- ¿un solo proveedor conviene? ---
    const opcionesUnico = compararProveedorUnico(res.lineas);
    const mejorUnico = opcionesUnico[0];
    const ahorroFlete = mejorUnico.base - plan.base;

    $('#comparativa-proveedor').innerHTML = `
      <div class="comparativa-caja">
        <div class="comparativa-item">
          <div><span>Compra optimizada (${plan.grupos.length} proveedores + fletes)</span></div>
          <strong>${fmtMoney(plan.base)}</strong>
        </div>
        <div class="comparativa-item ganador">
          <div><span>Todo en ${esc(mejorUnico.proveedor.nombre)} (materiales + envío)</span></div>
          <strong>${fmtMoney(mejorUnico.base)}</strong>
        </div>
      </div>
      <p class="ahorro-badge">${ahorroFlete >= 0
        ? `El plan optimizado ahorra ${fmtMoney(ahorroFlete)} frente a comprar todo en un solo proveedor.`
        : `Conviene comprar todo en ${esc(mejorUnico.proveedor.nombre)}: ahorras ${fmtMoney(Math.abs(ahorroFlete))} en fletes.`}</p>
      <p class="nota-mini">Montos sin IVA. El envío se cuenta una vez por proveedor; confirma con cada uno si aplica flete por volumen.</p>`;

    // --- hoja imprimible ---
    const folio = `OS-${String(estado.proyecto.fecha).replace(/-/g, '')}-${String(res.lineas.length).padStart(2, '0')}`;
    const totalSinIva = res.subtotal;
    $('#hoja-impresion').innerHTML = `
      <div class="print-cabecera">
        <div class="print-marca">ObraSur<small>Comparador de materiales de construcción · Zona sur de Morelos</small></div>
        <div class="print-folio">Cotización ${esc(folio)}<br>${fechaLarga(hoyISO())}</div>
      </div>
      <h1>Cotización de materiales</h1>
      <div class="print-datos">
        <div><span>Obra</span>${esc(estado.proyecto.nombre || 'Obra sin nombre')}</div>
        <div><span>Cliente / responsable</span>${esc(estado.proyecto.cliente || '—')}</div>
        <div><span>Ubicación</span>${esc(estado.proyecto.ubicacion || '—')}</div>
        <div><span>Precios vigentes al</span>${fechaLarga(ultimaActualizacion())}</div>
      </div>
      <table>
        <thead><tr>
          <th>Material</th><th>Proveedor</th><th class="num">Cantidad</th>
          <th class="num">P. unitario</th><th class="num">Importe</th>
        </tr></thead>
        <tbody>
          ${res.lineas.map((l) => `<tr>
            <td>${esc(l.material.nombre)}<br><small>${esc(l.material.unidad)}</small></td>
            <td>${esc(proveedorPorId(l.proveedorId).nombre)}</td>
            <td class="num">${fmtNum(l.cantidadConMerma)}</td>
            <td class="num">${fmtMoney(l.precio)}</td>
            <td class="num">${fmtMoney(l.importe)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="print-totales">
        <div><span>Subtotal materiales</span><span>${fmtMoney(totalSinIva)}</span></div>
        <div><span>Merma aplicada</span><span>${fmtNum(estado.proyecto.merma)}%</span></div>
        <div><span>IVA</span><span>${estado.proyecto.iva ? fmtMoney(res.iva) : 'No aplica'}</span></div>
        <div class="total"><span>Total</span><span>${fmtMoney(res.total)}</span></div>
      </div>
      <p class="print-nota">Precios de materiales vigentes al ${fechaLarga(ultimaActualizacion())} y sujetos a cambio sin previo aviso. Cotización válida por 15 días o hasta el siguiente corte de precios. No incluye flete, mano de obra, herramienta ni tiempos de entrega salvo indicación expresa.</p>
      <div class="print-firmas">
        <div>Elaboró · ${esc(estado.proyecto.cliente || 'Ingeniería civil')}</div>
        <div>Autorizó · Cliente</div>
      </div>`;
  }

  function renderProyectosGuardados() {
    const cont = $('#lista-proyectos');
    if (!estado.proyectos.length) {
      cont.innerHTML = '<p class="nota">Aún no has guardado ninguna cotización. Usa el botón <strong>Guardar proyecto</strong> para conservarla en este navegador.</p>';
      return;
    }
    cont.innerHTML = `<div class="lista-guardados">${estado.proyectos.map((p) => `
      <div class="guardado">
        <div>
          <strong>${esc(p.nombre)}</strong>
          <small>${fechaCorta(p.guardado)} · ${p.items.length} materiales · ${fmtMoney(p.total)}</small>
        </div>
        <div class="acciones">
          <button class="btn btn-linea" data-accion="abrir-proyecto" data-id="${p.id}">Abrir</button>
          <button class="btn-icono" data-accion="borrar-proyecto" data-id="${p.id}" aria-label="Borrar ${esc(p.nombre)}">×</button>
        </div>
      </div>`).join('')}</div>`;
  }

  /* ------------------------ proveedores ------------------------ */

  function estadisticasProveedor() {
    const cotizacion = calcular().lineas;
    return PROVEEDORES.map((proveedor) => {
      let masBarato = 0;
      let sumaIndice = 0;
      MATERIALES.forEach((m) => {
        const precio = precioDe(m.id, proveedor.id);
        const mejor = comparativa(m.id)[0];
        if (precio == null || !mejor) return;
        if (precio <= mejor.precio + 0.001) masBarato += 1;
        sumaIndice += precio / mejor.precio;
      });
      const subtotalCotizacion = cotizacion.reduce((s, l) => (
        l.proveedorId === proveedor.id ? s + l.importe : s
      ), 0);
      return {
        ...proveedor,
        masBarato,
        indice: (sumaIndice / MATERIALES.length) * 100,
        subtotalCotizacion
      };
    }).sort((a, b) => a.indice - b.indice);
  }

  function estrellas(rating) {
    const llenas = Math.round(rating);
    return '★'.repeat(llenas) + '☆'.repeat(5 - llenas);
  }

  function renderProveedores() {
    const stats = estadisticasProveedor();
    $('#lista-proveedores').innerHTML = stats.map((p, i) => {
      const clase = p.indice <= 103 ? '' : p.indice <= 107 ? 'medio' : 'alto';
      const ancho = Math.min(100, Math.max(4, (p.indice - 100) * 12 + 8));
      return `<article class="prov-card">
        <div class="prov-cabecera">
          <div>
            <h3>${esc(p.nombre)}</h3>
            <span class="prov-muni">${esc(p.municipio)} · a ${p.distanciaKm} km</span>
          </div>
          <span class="rank">${i + 1}º mejor</span>
        </div>

        <div class="prov-datos">
          <div>Más barato en<strong>${p.masBarato} de ${MATERIALES.length} materiales</strong></div>
          <div>Envío estimado<strong>${fmtMoney(p.envio)}</strong></div>
          <div>Calificación<strong class="estrella">${estrellas(p.rating)} ${p.rating}</strong></div>
          <div>Teléfono<strong>${esc(p.telefono)}</strong></div>
        </div>

        <div class="indice">
          <div class="indice-cabecera"><span>Índice de precio</span><span>${p.indice.toFixed(1)}%</span></div>
          <div class="barra"><span class="${clase}" style="width:${ancho}%"></span></div>
        </div>

        <p class="nota" style="font-size:12px;margin-bottom:10px">${esc(p.nota)}</p>

        <div class="prov-pie">
          <a href="tel:${p.telefono.replace(/\s/g, '')}">Llamar</a>
          ${p.subtotalCotizacion > 0
            ? `<span>En tu cotización: <strong>${fmtMoney(p.subtotalCotizacion)}</strong></span>`
            : '<span class="muted">Sin materiales en tu cotización</span>'}
        </div>
      </article>`;
    }).join('');
  }

  /* --------------------------- precios --------------------------- */

  function renderPrecios() {
    const ultima = ultimaActualizacion();
    const dias = diasEntre(ultima, hoyISO());
    const proxima = sumarDias(ultima, CONFIG.cicloDias);
    const faltan = diasEntre(hoyISO(), proxima);
    const avance = Math.min(100, Math.max(0, (dias / CONFIG.cicloDias) * 100));
    const vencido = dias >= CONFIG.cicloDias;

    $('#panel-corte').innerHTML = `
      <h3 class="panel-titulo">Estado del corte</h3>
      <p class="nota">Cada ${CONFIG.cicloDias} días se actualizan los precios con los proveedores. Cuando se cumple el ciclo, la barra pasa a rojo y conviene recotizar.</p>
      <div class="corte-datos">
        <div class="corte-dato"><small>Último levantamiento</small><strong>${fechaLarga(ultima)}</strong></div>
        <div class="corte-dato"><small>Días transcurridos</small><strong>${dias} de ${CONFIG.cicloDias}</strong></div>
        <div class="corte-dato"><small>Próximo corte</small><strong>${fechaLarga(proxima)}</strong></div>
        <div class="corte-dato"><small>Estado</small><strong style="color:${vencido ? 'var(--rojo)' : 'var(--verde)'}">${vencido ? 'Requiere actualización' : faltan <= 0 ? 'Vence hoy' : `Vigente · faltan ${faltan} días`}</strong></div>
      </div>
      <div class="progreso"><span class="${vencido ? 'completo' : ''}" style="width:${avance}%"></span></div>
      <p class="nota-mini">${estado.actualizaciones.length} precios registrados manualmente. Los precios base del prototipo corresponden al ${fechaLarga(CONFIG.fechaCorte)}.</p>`;

    // Tendencias: mejor proveedor de cada material
    $('#tendencias').innerHTML = MATERIALES.map((m) => {
      const mejor = comparativa(m.id)[0];
      if (!mejor) return '';
      const puntos = puntosPrecio(m.id, mejor.proveedor.id);
      const primero = puntos[0].precio;
      const ultimo = puntos[puntos.length - 1].precio;
      const cambio = primero ? ((ultimo - primero) / primero) * 100 : 0;
      const clase = cambio > 0.05 ? 'alza' : cambio < -0.05 ? 'baja' : 'plano';
      const signo = cambio > 0.05 ? '▲' : cambio < -0.05 ? '▼' : '＝';
      return `<div class="tendencia">
        <div>
          <strong>${esc(m.nombre)}</strong>
          <small>${esc(mejor.proveedor.nombre)}</small>
        </div>
        <div class="valor">
          ${fmtMoney(ultimo)}
          <em class="tend ${clase}">${signo} ${Math.abs(cambio).toFixed(1)}%</em>
          ${sparkline(puntos)}
        </div>
      </div>`;
    }).join('');

    // Historial de actualizaciones registradas
    const cambios = [...estado.actualizaciones].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    if (!cambios.length) {
      $('#historial-cambios').innerHTML = '<p class="nota">Todavía no hay cambios registrados. Usa el formulario de arriba para guardar el precio que te coticen; aquí verás la variación contra el precio anterior.</p>';
    } else {
      $('#historial-cambios').innerHTML = `<div class="tabla-scroll"><table class="tabla-historial">
        <thead><tr><th>Fecha</th><th>Material</th><th>Proveedor</th><th class="num">Anterior</th><th class="num">Nuevo</th><th class="num">Cambio</th></tr></thead>
        <tbody>
          ${cambios.slice(0, 12).map((c) => {
            const variacion = c.anterior ? ((c.precio - c.anterior) / c.anterior) * 100 : 0;
            const clase = variacion > 0.05 ? 'sube' : variacion < -0.05 ? 'baja' : '';
            const material = materialPorId(c.materialId);
            const proveedor = proveedorPorId(c.proveedorId);
            return `<tr>
              <td>${fechaCorta(c.fecha)}</td>
              <td>${esc(material ? material.nombre : c.materialId)}</td>
              <td>${esc(proveedor ? proveedor.nombre : c.proveedorId)}</td>
              <td class="num">${c.anterior != null ? fmtMoney(c.anterior) : '—'}</td>
              <td class="num">${fmtMoney(c.precio)}</td>
              <td class="num cambio ${clase}">${variacion > 0 ? '+' : ''}${variacion.toFixed(1)}%</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
    }
  }

  /** Mini gráfica de líneas en SVG (sin librerías). */
  function sparkline(puntos, ancho = 84, alto = 26) {
    if (!puntos || puntos.length < 2) return '<span class="muted" style="font-size:11px">—</span>';
    const valores = puntos.map((p) => p.precio);
    const min = Math.min(...valores);
    const max = Math.max(...valores);
    const rango = max - min || 1;
    const coords = puntos.map((p, i) => {
      const x = (i / (puntos.length - 1)) * (ancho - 4) + 2;
      const y = alto - 3 - ((p.precio - min) / rango) * (alto - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
    const sube = valores[valores.length - 1] > valores[0];
    const color = sube ? 'var(--rojo)' : 'var(--verde)';
    return `<svg class="spark" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" aria-hidden="true"><polyline points="${coords}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  /* ======================= 5. EVENTOS ======================= */

  let temporizadorToast = null;
  function toast(mensaje, tipo = 'exito') {
    const el = $('#toast');
    el.textContent = mensaje;
    el.className = `toast ${tipo}`;
    el.hidden = false;
    clearTimeout(temporizadorToast);
    temporizadorToast = setTimeout(() => { el.hidden = true; }, 3200);
  }

  function descargar(nombre, contenido, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function cambiarVista(vista) {
    estado.vista = vista;
    $$('.tab').forEach((tab) => {
      const activa = tab.dataset.vista === vista;
      tab.classList.toggle('activa', activa);
      tab.setAttribute('aria-selected', String(activa));
    });
    $$('.vista').forEach((seccion) => {
      seccion.hidden = seccion.id !== `vista-${vista}`;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function agregarMaterial(materialId) {
    const material = materialPorId(materialId);
    if (!material) return;
    const input = document.getElementById(`qty-${materialId}`);
    const cantidad = Math.max(0, Number(input ? input.value : 1) || 1);
    const mejor = comparativa(materialId)[0];
    if (!mejor) return;
    estado.cotizacion.push({
      materialId,
      cantidad,
      proveedorId: mejor.proveedor.id
    });
    guardarEstado();
    renderCotizador();
    renderProveedores();
    renderBadge();
    toast(`${material.nombre} agregado · ${mejor.proveedor.nombre}`);
  }

  function guardarProyecto() {
    if (!estado.cotizacion.length) return toast('Agrega materiales antes de guardar', 'error');
    const res = calcular();
    const nombre = estado.proyecto.nombre.trim() || `Obra ${fechaCorta(estado.proyecto.fecha)}`;
    estado.proyectos.unshift({
      id: Date.now(),
      nombre,
      guardado: hoyISO(),
      total: res.total,
      items: JSON.parse(JSON.stringify(estado.cotizacion)),
      proyecto: { ...estado.proyecto }
    });
    guardarProyectos();
    renderProyectosGuardados();
    toast(`Proyecto “${nombre}” guardado`);
  }

  function abrirProyecto(id) {
    const proyecto = estado.proyectos.find((p) => String(p.id) === String(id));
    if (!proyecto) return;
    estado.cotizacion = proyecto.items.filter((it) => materialPorId(it.materialId) && proveedorPorId(it.proveedorId));
    estado.proyecto = { ...estado.proyecto, ...proyecto.proyecto };
    $('#proy-nombre').value = estado.proyecto.nombre || '';
    $('#proy-cliente').value = estado.proyecto.cliente || '';
    $('#proy-ubicacion').value = estado.proyecto.ubicacion || '';
    $('#proy-fecha').value = estado.proyecto.fecha || hoyISO();
    $('#merma').value = estado.proyecto.merma;
    $('#iva').checked = estado.proyecto.iva;
    guardarEstado();
    renderTodo();
    cambiarVista('cotizador');
    toast(`Proyecto “${proyecto.nombre}” abierto`);
  }

  function borrarProyecto(id) {
    estado.proyectos = estado.proyectos.filter((p) => String(p.id) !== String(id));
    guardarProyectos();
    renderProyectosGuardados();
    toast('Proyecto eliminado');
  }

  function exportarCSV() {
    const res = calcular();
    if (!res.lineas.length) return toast('No hay materiales en la cotización', 'error');
    const filas = [
      ['Obra', estado.proyecto.nombre || 'Sin nombre'],
      ['Cliente', estado.proyecto.cliente || ''],
      ['Ubicación', estado.proyecto.ubicacion || ''],
      ['Fecha', estado.proyecto.fecha],
      ['Precios vigentes al', ultimaActualizacion()],
      [],
      ['Material', 'Unidad', 'Cantidad', 'Proveedor', 'Precio unitario', 'Importe']
    ];
    res.lineas.forEach((l) => filas.push([
      l.material.nombre,
      l.material.unidad,
      l.cantidadConMerma.toFixed(2),
      proveedorPorId(l.proveedorId).nombre,
      l.precio.toFixed(2),
      l.importe.toFixed(2)
    ]));
    filas.push([]);
    filas.push(['Subtotal', '', '', '', '', res.subtotal.toFixed(2)]);
    filas.push(['IVA', '', '', '', '', res.iva.toFixed(2)]);
    filas.push(['Total', '', '', '', '', res.total.toFixed(2)]);

    const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    descargar(`obrasur-cotizacion-${estado.proyecto.fecha}.csv`, '\uFEFF' + csv, 'text/csv;charset=utf-8');
    toast('CSV descargado');
  }

  function registrarPrecio(evento) {
    evento.preventDefault();
    const materialId = $('#f-material').value;
    const proveedorId = $('#f-proveedor').value;
    const precio = Number($('#f-precio').value);
    const fecha = $('#f-fecha').value || hoyISO();
    if (!materialId || !proveedorId || !Number.isFinite(precio) || precio <= 0) {
      return toast('Captura un precio válido', 'error');
    }
    estado.actualizaciones.push({
      materialId,
      proveedorId,
      precio,
      fecha,
      anterior: precioDe(materialId, proveedorId)
    });
    guardarEstado();
    renderTodo();
    toast(`Precio actualizado: ${fmtMoney(precio)}`);
  }

  /* ------------------------ delegación de clics ------------------------ */
  document.addEventListener('click', (evento) => {
    const tab = evento.target.closest('[data-vista]');
    if (tab && !tab.matches('select, option')) {
      evento.preventDefault();
      cambiarVista(tab.dataset.vista);
      return;
    }

    const el = evento.target.closest('[data-accion]');
    if (!el) return;
    const accion = el.dataset.accion;

    switch (accion) {
      case 'categoria':
        estado.categoria = el.dataset.cat;
        renderChips();
        renderComparador();
        break;
      case 'limpiar-filtros':
        estado.categoria = 'todas';
        estado.busqueda = '';
        $('#busqueda').value = '';
        renderChips();
        renderComparador();
        break;
      case 'toggle-precios': {
        const lista = document.getElementById(`precios-${el.dataset.material}`);
        if (!lista) break;
        lista.hidden = !lista.hidden;
        el.setAttribute('aria-expanded', String(!lista.hidden));
        el.textContent = lista.hidden ? 'Ver los precios comparados' : 'Ocultar comparación';
        break;
      }
      case 'agregar':
        agregarMaterial(el.dataset.material);
        break;
      case 'quitar':
        estado.cotizacion.splice(Number(el.dataset.index), 1);
        guardarEstado();
        renderCotizador();
        renderProveedores();
        renderBadge();
        break;
      case 'vaciar':
        if (!estado.cotizacion.length) break;
        estado.cotizacion = [];
        guardarEstado();
        renderCotizador();
        renderProveedores();
        renderBadge();
        toast('Cotización vaciada');
        break;
      case 'guardar-proyecto':
        guardarProyecto();
        break;
      case 'abrir-proyecto':
        abrirProyecto(el.dataset.id);
        break;
      case 'borrar-proyecto':
        borrarProyecto(el.dataset.id);
        break;
      case 'ir-cotizador':
        cambiarVista('cotizador');
        break;
      case 'imprimir':
        if (!estado.cotizacion.length) { toast('Agrega materiales a la cotización', 'error'); break; }
        window.print();
        break;
      case 'csv':
        exportarCSV();
        break;
      case 'exportar-precios':
        descargar(
          `obrasur-precios-${hoyISO()}.json`,
          JSON.stringify({ corte: ultimaActualizacion(), precios: estado.actualizaciones }, null, 2),
          'application/json'
        );
        toast('Precios exportados');
        break;
      case 'importar-precios':
        $('#archivo-precios').click();
        break;
      default:
        break;
    }
  });

  /* --------------------- cambios en inputs y selects --------------------- */
  document.addEventListener('input', (evento) => {
    if (evento.target.id === 'busqueda') {
      estado.busqueda = evento.target.value;
      renderComparador();
    }
  });

  document.addEventListener('change', (evento) => {
    const campo = evento.target.dataset ? evento.target.dataset.campo : null;

    if (campo === 'cantidad') {
      const item = estado.cotizacion[Number(evento.target.dataset.index)];
      if (!item) return;
      item.cantidad = Math.max(0, Number(evento.target.value) || 0);
      guardarEstado();
      renderCotizador();
      renderProveedores();
      return;
    }

    if (campo === 'proveedor') {
      const item = estado.cotizacion[Number(evento.target.dataset.index)];
      if (!item) return;
      item.proveedorId = evento.target.value;
      guardarEstado();
      renderCotizador();
      renderProveedores();
      return;
    }

    switch (evento.target.id) {
      case 'orden':
        estado.orden = evento.target.value;
        renderComparador();
        break;
      case 'merma':
        estado.proyecto.merma = Math.min(30, Math.max(0, Number(evento.target.value) || 0));
        guardarEstado();
        renderCotizador();
        break;
      case 'iva':
        estado.proyecto.iva = evento.target.checked;
        guardarEstado();
        renderCotizador();
        break;
      case 'proy-nombre':
        estado.proyecto.nombre = evento.target.value;
        guardarEstado();
        break;
      case 'proy-cliente':
        estado.proyecto.cliente = evento.target.value;
        guardarEstado();
        break;
      case 'proy-ubicacion':
        estado.proyecto.ubicacion = evento.target.value;
        guardarEstado();
        break;
      case 'proy-fecha':
        estado.proyecto.fecha = evento.target.value || hoyISO();
        guardarEstado();
        renderCotizador();
        break;
      case 'f-material':
      case 'f-proveedor':
        actualizarSugerenciaPrecio();
        break;
      case 'archivo-precios':
        importarPrecios(evento.target.files[0]);
        evento.target.value = '';
        break;
      default:
        break;
    }
  });

  async function importarPrecios(archivo) {
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      const datos = JSON.parse(texto);
      const lista = Array.isArray(datos) ? datos : datos.precios;
      if (!Array.isArray(lista)) throw new Error('formato');
      const validos = lista.filter((a) => (
        materialPorId(a.materialId) && proveedorPorId(a.proveedorId) && Number.isFinite(a.precio)
      ));
      estado.actualizaciones = estado.actualizaciones.concat(validos);
      guardarEstado();
      renderTodo();
      toast(`${validos.length} precios importados`);
    } catch (_) {
      toast('El archivo no tiene el formato esperado', 'error');
    }
  }

  /* ---------------------------- inicio ---------------------------- */
  function actualizarSugerenciaPrecio() {
    const materialId = $('#f-material').value;
    const proveedorId = $('#f-proveedor').value;
    const actual = precioDe(materialId, proveedorId);
    const input = $('#f-precio');
    if (actual != null) {
      input.value = String(actual);
      input.placeholder = fmtMoney(actual);
    } else {
      input.value = '';
    }
  }

  function iniciar() {
    // Pestañas accesibles
    $$('.tab').forEach((tab) => tab.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const tabs = $$('.tab');
        const i = tabs.indexOf(tab);
        const siguiente = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        siguiente.focus();
        cambiarVista(siguiente.dataset.vista);
      }
    }));

    // Datos de la obra
    $('#proy-nombre').value = estado.proyecto.nombre;
    $('#proy-cliente').value = estado.proyecto.cliente;
    $('#proy-ubicacion').value = estado.proyecto.ubicacion;
    $('#proy-fecha').value = estado.proyecto.fecha;
    $('#merma').value = estado.proyecto.merma;
    $('#iva').checked = estado.proyecto.iva;

    // Selects del formulario de precios
    const opcionesMateriales = MATERIALES
      .slice()
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`)
      .join('');
    $('#f-material').innerHTML = opcionesMateriales;
    $('#f-proveedor').innerHTML = PROVEEDORES
      .map((p) => `<option value="${p.id}">${esc(p.nombre)}</option>`)
      .join('');
    $('#f-fecha').value = hoyISO();
    $('#form-precio').addEventListener('submit', registrarPrecio);
    actualizarSugerenciaPrecio();

    renderTodo();
    cambiarVista('comparador');
  }

  iniciar();
})();
