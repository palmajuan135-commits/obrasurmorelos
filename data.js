/* ============================================================================
   ObraSur · Datos del sistema
   ----------------------------------------------------------------------------
   Aquí se cambia TODO lo que la aplicación muestra como catálogo:

   · CONFIG        → fechas del corte de precios y porcentajes por defecto.
   · PROVEEDORES   → los puntos de venta de la zona sur de Morelos.
   · MATERIALES    → el catálogo con su unidad de venta.
   · PRECIOS       → precio de cada material en cada proveedor.

   Formato de cada precio:  proveedorId: [precio actual, precio de la quincena
   anterior]. El segundo valor se usa para calcular la tendencia (subió/bajó).
   Los precios son de EJEMPLO: sustitúyelos por los que te coticen.
   ========================================================================== */

const CONFIG = {
  nombre: 'ObraSur',
  zona: 'Zona sur del estado de Morelos',
  // Fecha del último levantamiento de precios (corte vigente)
  fechaCorte: '2026-11-01',
  // Fecha del levantamiento anterior (para la tendencia)
  fechaComparacion: '2026-10-17',
  // Cada cuántos días toca actualizar
  cicloDias: 15,
  // IVA en México
  iva: 0.16,
  // Merma (desperdicio de material) sugerida en obra
  mermaSugerida: 5,
  moneda: 'MXN'
};

const PROVEEDORES = [
  {
    id: 'jojutla',
    nombre: 'Materiales Jojutla',
    municipio: 'Jojutla',
    distanciaKm: 0,
    envio: 250,
    rating: 4.7,
    telefono: '734 123 4567',
    nota: 'El más surtido de la región'
  },
  {
    id: 'acero',
    nombre: 'Ferretería El Acero',
    municipio: 'Zacatepec',
    distanciaKm: 9,
    envio: 320,
    rating: 4.5,
    telefono: '734 342 1188',
    nota: 'Especialista en acero de refuerzo'
  },
  {
    id: 'sur',
    nombre: 'Distribuidora Sur',
    municipio: 'Tlaltizapán',
    distanciaKm: 15,
    envio: 380,
    rating: 4.3,
    telefono: '734 347 2210',
    nota: 'Buen precio en pintura y cimbra'
  },
  {
    id: 'ixtla',
    nombre: 'Cementos y Agregados Ixtla',
    municipio: 'Puente de Ixtla',
    distanciaKm: 12,
    envio: 300,
    rating: 4.6,
    telefono: '734 345 7744',
    nota: 'Cemento y agregados por volumen'
  },
  {
    id: 'constructor',
    nombre: 'Materiales El Constructor',
    municipio: 'Tlaquiltenango',
    distanciaKm: 7,
    envio: 260,
    rating: 4.4,
    telefono: '734 342 0099',
    nota: 'Blockera y tabique propios'
  },
  {
    id: 'amacuzac',
    nombre: 'Ferretería Amacuzac',
    municipio: 'Amacuzac',
    distanciaKm: 21,
    envio: 450,
    rating: 4.1,
    telefono: '734 348 3322',
    nota: 'Instalación hidráulica y eléctrica'
  }
];

const MATERIALES = [
  // Cemento y mortero
  { id: 'cemento-gris',   nombre: 'Cemento CPC 30R',                 categoria: 'Cemento y mortero', unidad: 'bulto 50 kg', uso: 'Firmes, castillos y dalas' },
  { id: 'cemento-ton',    nombre: 'Cemento CPC 30R',                 categoria: 'Cemento y mortero', unidad: 'tonelada', uso: 'Equivale a 20 bultos de 50 kg', principal: 'cemento-gris', presentacion: 'tonelada (20 bultos)' },
  { id: 'cemento-blanco', nombre: 'Cemento blanco',                   categoria: 'Cemento y mortero', unidad: 'bulto 25 kg', uso: 'Detalles y acabados finos' },
  { id: 'cal',            nombre: 'Cal hidratada',                    categoria: 'Cemento y mortero', unidad: 'bulto 25 kg', uso: 'Mortero y aplanados' },
  { id: 'mortero',        nombre: 'Mortero predosificado',            categoria: 'Cemento y mortero', unidad: 'bulto 50 kg', uso: 'Aplanados y pegas' },
  // Acero
  { id: 'varilla-38',     nombre: 'Varilla corrugada 3/8"',           categoria: 'Acero',             unidad: 'pieza 12 m',  uso: 'Castillos y dalas' },
  { id: 'varilla-12',     nombre: 'Varilla corrugada 1/2"',           categoria: 'Acero',             unidad: 'pieza 12 m',  uso: 'Columnas y trabes' },
  { id: 'alambre',        nombre: 'Alambre recocido',                 categoria: 'Acero',             unidad: 'kg',          uso: 'Amarres de armado' },
  { id: 'malla',          nombre: 'Malla electrosoldada 6x6-10/10',   categoria: 'Acero',             unidad: 'm²',          uso: 'Firmes y losas' },
  // Agregados
  { id: 'arena',          nombre: 'Arena amarilla',                   categoria: 'Agregados',         unidad: 'm³',          uso: 'Mortero y concretos' },
  { id: 'grava',          nombre: 'Grava 3/4"',                       categoria: 'Agregados',         unidad: 'm³',          uso: 'Concreto estructural' },
  { id: 'piedra',         nombre: 'Piedra braza',                     categoria: 'Agregados',         unidad: 'm³',          uso: 'Cimentación y muros' },
  { id: 'arena-ton',   nombre: 'Arena amarilla por tonelada',  categoria: 'Agregados', unidad: 'tonelada',  uso: 'Venta por peso; 1 m³ ≈ 1.5 t', principal: 'arena', presentacion: 'tonelada' },
  { id: 'arena-viaje', nombre: 'Arena amarilla por viaje',      categoria: 'Agregados', unidad: 'viaje 7 m³', uso: 'Camión completo de 7 m³', principal: 'arena', presentacion: 'viaje 7 m³' },
  { id: 'grava-ton',   nombre: 'Grava 3/4" por tonelada',      categoria: 'Agregados', unidad: 'tonelada',  uso: 'Venta por peso; 1 m³ ≈ 1.45 t', principal: 'grava', presentacion: 'tonelada' },
  { id: 'grava-viaje', nombre: 'Grava 3/4" por viaje',         categoria: 'Agregados', unidad: 'viaje 7 m³', uso: 'Camión completo de 7 m³', principal: 'grava', presentacion: 'viaje 7 m³' },
  // Block y tabique
  { id: 'block-15',       nombre: 'Block de concreto 15×20×40',       categoria: 'Block y tabique',   unidad: 'pieza',       uso: 'Muros exteriores' },
  { id: 'block-10',       nombre: 'Block de concreto 10×20×40',       categoria: 'Block y tabique',   unidad: 'pieza',       uso: 'Tabiques y divisiones' },
  { id: 'tabique',        nombre: 'Tabique rojo recocido',            categoria: 'Block y tabique',   unidad: 'pieza',       uso: 'Aparejos y fachadas' },
  // Acabados
  { id: 'yeso',           nombre: 'Yeso de construcción',             categoria: 'Acabados',          unidad: 'bulto 40 kg', uso: 'Plafones y muros' },
  { id: 'pintura',        nombre: 'Pintura vinílica',                 categoria: 'Acabados',          unidad: 'cubeta 19 L', uso: 'Interiores y fachadas' },
  { id: 'impermeabilizante', nombre: 'Impermeabilizante acrílico 5 años', categoria: 'Acabados',      unidad: 'cubeta 19 L', uso: 'Losas y azoteas' },
  { id: 'piso',           nombre: 'Piso cerámico 45×45',              categoria: 'Acabados',          unidad: 'm²',          uso: 'Pisos interiores' },
  { id: 'adhesivo',       nombre: 'Adhesivo para loseta',             categoria: 'Acabados',          unidad: 'bulto 20 kg', uso: 'Pega de piso y azulejo' },
  // Instalación
  { id: 'pvc',            nombre: 'Tubo PVC hidráulico 1/2"',         categoria: 'Instalación',       unidad: 'tramo 6 m',   uso: 'Agua fría' },
  { id: 'poliducto',      nombre: 'Poliducto naranja 1/2"',           categoria: 'Instalación',       unidad: 'rollo 100 m', uso: 'Instalación eléctrica' },
  { id: 'cable',          nombre: 'Cable THW calibre 12',             categoria: 'Instalación',       unidad: 'rollo 100 m', uso: 'Circuitos de contactos' },
  // Cimbra
  { id: 'madera',         nombre: 'Barrote de pino 8\'',              categoria: 'Cimbra',            unidad: 'pieza',       uso: 'Cimbra de losas' },
  { id: 'triplay',        nombre: 'Triplay 15 mm 1.22×2.44',          categoria: 'Cimbra',            unidad: 'hoja',        uso: 'Cimbra aparente' }
];

/* Precios: [precio actual, precio quincena anterior] ---------------------- */
const PRECIOS = {
  'cemento-gris':   { jojutla: [178, 172],   acero: [189, 186],   sur: [182, 178],   ixtla: [174, 170],   constructor: [181, 176],   amacuzac: [192, 188] },
  'cemento-ton':    { jojutla: [3560, 3440], acero: [3780, 3720], sur: [3640, 3560], ixtla: [3480, 3400], constructor: [3620, 3520], amacuzac: [3840, 3760] },
  'cemento-blanco': { jojutla: [245, 238],   acero: [258, 255],   sur: [249, 245],   ixtla: [252, 246],   constructor: [242, 236],   amacuzac: [265, 260] },
  'cal':            { jojutla: [88, 85],     acero: [92, 90],     sur: [90, 88],     ixtla: [95, 92],     constructor: [82, 79],     amacuzac: [98, 95] },
  'mortero':        { jojutla: [162, 158],   acero: [168, 165],   sur: [159, 156],   ixtla: [155, 150],   constructor: [166, 160],   amacuzac: [172, 168] },
  'varilla-38':     { jojutla: [179, 172],   acero: [165, 168],   sur: [172, 170],   ixtla: [174, 172],   constructor: [176, 171],   amacuzac: [185, 180] },
  'varilla-12':     { jojutla: [312, 300],   acero: [289, 295],   sur: [299, 296],   ixtla: [305, 298],   constructor: [308, 300],   amacuzac: [318, 310] },
  'alambre':        { jojutla: [31, 30],     acero: [28, 29],     sur: [30, 29],     ixtla: [32, 31],     constructor: [29, 28],     amacuzac: [33, 32] },
  'malla':          { jojutla: [62, 60],     acero: [58, 58],     sur: [60, 59],     ixtla: [63, 61],     constructor: [59, 57],     amacuzac: [66, 64] },
  'arena':          { jojutla: [430, 415],   acero: [455, 450],   sur: [420, 410],   ixtla: [395, 385],   constructor: [415, 405],   amacuzac: [470, 460] },
  'grava':          { jojutla: [465, 450],   acero: [480, 475],   sur: [440, 435],   ixtla: [425, 415],   constructor: [448, 440],   amacuzac: [495, 485] },
  'piedra':         { jojutla: [440, 430],   acero: [470, 465],   sur: [415, 405],   ixtla: [405, 398],   constructor: [430, 425],   amacuzac: [480, 470] },
  'block-15':       { jojutla: [15.5, 15],   acero: [16.8, 16.5], sur: [16, 15.8],   ixtla: [15.9, 15.5], constructor: [14.6, 14.2], amacuzac: [17.4, 17] },
  'block-10':       { jojutla: [13.2, 12.9], acero: [14.5, 14.2], sur: [13.8, 13.5], ixtla: [13.9, 13.6], constructor: [12.4, 12],   amacuzac: [15, 14.6] },
  'tabique':        { jojutla: [5.8, 5.5],   acero: [6.4, 6.2],   sur: [6, 5.9],     ixtla: [6.1, 5.8],   constructor: [5.2, 5],     amacuzac: [6.8, 6.5] },
  'yeso':           { jojutla: [122, 118],   acero: [130, 128],   sur: [126, 124],   ixtla: [128, 125],   constructor: [115, 112],   amacuzac: [136, 132] },
  'pintura':        { jojutla: [1245, 1210], acero: [1310, 1300], sur: [1180, 1150], ixtla: [1290, 1265], constructor: [1225, 1200], amacuzac: [1350, 1320] },
  'impermeabilizante': { jojutla: [1420, 1380], acero: [1480, 1460], sur: [1350, 1320], ixtla: [1450, 1420], constructor: [1390, 1360], amacuzac: [1520, 1490] },
  'piso':           { jojutla: [158, 152],   acero: [165, 162],   sur: [149, 146],   ixtla: [172, 168],   constructor: [152, 148],   amacuzac: [145, 142] },
  'adhesivo':       { jojutla: [142, 138],   acero: [148, 146],   sur: [139, 136],   ixtla: [145, 142],   constructor: [136, 133],   amacuzac: [138, 135] },
  'pvc':            { jojutla: [72, 70],     acero: [78, 76],     sur: [70, 69],     ixtla: [74, 72],     constructor: [75, 73],     amacuzac: [66, 64] },
  'poliducto':      { jojutla: [780, 765],   acero: [820, 810],   sur: [760, 750],   ixtla: [800, 790],   constructor: [775, 760],   amacuzac: [735, 720] },
  'cable':          { jojutla: [1560, 1520], acero: [1480, 1495], sur: [1520, 1500], ixtla: [1540, 1520], constructor: [1550, 1530], amacuzac: [1440, 1410] },
  'madera':         { jojutla: [148, 142],   acero: [155, 152],   sur: [138, 134],   ixtla: [145, 140],   constructor: [142, 138],   amacuzac: [160, 155] },
  'triplay':        { jojutla: [565, 550],   acero: [580, 575],   sur: [535, 525],   ixtla: [555, 545],   constructor: [548, 540],   amacuzac: [595, 580] },
  'arena-ton':      { jojutla: [287, 277],   acero: [303, 300],   sur: [280, 273],   ixtla: [263, 257],   constructor: [277, 270],   amacuzac: [313, 307] },
  'arena-viaje':    { jojutla: [3010, 2905],   acero: [3185, 3150],   sur: [2940, 2870],   ixtla: [2765, 2695],   constructor: [2905, 2835],   amacuzac: [3290, 3220] },
  'grava-ton':      { jojutla: [321, 310],   acero: [331, 328],   sur: [303, 300],   ixtla: [293, 286],   constructor: [309, 303],   amacuzac: [341, 334] },
  'grava-viaje':    { jojutla: [3255, 3150],   acero: [3360, 3325],   sur: [3080, 3045],   ixtla: [2975, 2905],   constructor: [3136, 3080],   amacuzac: [3465, 3395] }
};
