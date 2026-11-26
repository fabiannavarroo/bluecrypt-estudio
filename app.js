"use strict";

const datos = globalThis.ESTUDIO;
const main = document.querySelector("#contenido");
const bloques = datos.bloques;
const archivoPorRuta = new Map(datos.archivos.map((archivo) => [archivo.ruta, archivo]));
const banco = [
  ...datos.temario.examen,
  ...Object.values(bloques).map((bloque) => ({
    id: bloque.id, criterio: bloque.criterio, pregunta: bloque.pregunta,
    respuesta: bloque.respuesta, citas: [bloque.id],
  })),
];
const claveProgreso = "bluecrypt-estudio-v1";
let persistencia = true;
let progreso = { turno: 0, preguntas: {} };
try {
  const guardado = JSON.parse(localStorage.getItem(claveProgreso));
  if (guardado?.preguntas && Number.isInteger(guardado.turno)) progreso = guardado;
} catch {
  persistencia = false;
}

const vistas = {
  inicio: ["Inicio", "casa"], codigo: ["Explorar código", "codigo"], mapa: ["Mapa del proyecto", "mapa"],
  flujos: ["Flujos paso a paso", "flujo"], glosario: ["Glosario", "libro"],
  laboratorio: ["Laboratorio", "matraz"], decisiones: ["Decisiones y límites", "escudo"],
  preguntas: ["Banco de preguntas", "pregunta"], tarjetas: ["Tarjetas", "tarjetas"],
  examen: ["Simulacro", "reloj"], progreso: ["Mi progreso", "progreso"], demo: ["Guion de demo", "terminal"],
};
const seccionesNav = [
  ["Explorar", ["inicio", "codigo", "mapa", "flujos", "glosario"]],
  ["Preparar la defensa", ["laboratorio", "decisiones", "demo"]],
  ["Practicar", ["preguntas", "tarjetas", "examen", "progreso"]],
];
const iconos = {
  casa: '<path d="m3 10 9-7 9 7v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 20v-6h6v6"/>',
  codigo: '<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-2-15-4 18"/>',
  mapa: '<rect x="8" y="3" width="8" height="5" rx="1"/><rect x="2" y="16" width="7" height="5" rx="1"/><rect x="15" y="16" width="7" height="5" rx="1"/><path d="M12 8v4m-6.5 4v-4h13v4"/>',
  flujo: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h8a3 3 0 0 1 0 6H9a4 4 0 0 0 0 8h8"/>',
  libro: '<path d="M12 6c-3-3-7-3-10-2v15c4-1 7 0 10 2 3-2 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15"/>',
  matraz: '<path d="M9 3h6m-5 0v7l-6 8a1.8 1.8 0 0 0 1.5 3h13a1.8 1.8 0 0 0 1.5-3l-6-8V3M7 15h10"/>',
  escudo: '<path d="M12 3 3.5 7v5c0 4.5 4 7.5 8.5 9 4.5-1.5 8.5-4.5 8.5-9V7Zm-4 9 3 3 5-6"/>',
  pregunta: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2.3-3 4m0 3.7v.1"/>',
  tarjetas: '<rect x="6" y="6" width="15" height="15" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12M10 11h7m-7 5h4"/>',
  reloj: '<circle cx="12" cy="13" r="8"/><path d="M10 2h4m-2 7v4l3 2m2-9 2-2"/>',
  progreso: '<path d="M3 3v18h18M7 16v-3m5 3V9m5 7V5"/>',
  terminal: '<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="m6 9 3 3-3 3m6 0h5"/>',
};
const grupoFlujos = [...new Set(datos.temario.flujos.map((paso) => paso.tema))];
const modulo = (ruta) => ruta.split("/").at(-1);
let tarjeta = null;
let anterior = null;
let revelada = false;
let mapaActual = "bluecrypt/nodo.py";
let flujoActual = grupoFlujos[0];
let pasoActual = 0;
let temaTarjeta = "Todas";
let examen = null;

function escapar(texto) {
  return String(texto).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]);
}

function icono(tipo) {
  return '<svg class="icono" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.55" stroke-linecap="round" stroke-linejoin="round">' + iconos[tipo] + '</svg>';
}

function cabecera(titulo, descripcion) {
  return '<div class="cabecera"><h1>' + titulo + '</h1><p>' + descripcion + '</p></div>';
}

function puntos(rango) {
  return rango.inicio === rango.fin ? String(rango.inicio) : rango.inicio + "–" + rango.fin;
}

function cita(id, larga = false) {
  const bloque = bloques[id];
  const archivo = larga ? bloque.ruta : modulo(bloque.ruta);
  const funciones = bloque.funciones.length ? ' · ' + bloque.funciones.join(', ') : '';
  return '<a class="cita" href="#codigo/' + id + '" title="' + escapar(bloque.ruta + funciones + ' · líneas ' + puntos(bloque)) + '">' +
    escapar(archivo + ':' + puntos(bloque) + (larga ? funciones : '')) + '</a>';
}

function citas(ids) {
  return '<div class="citas">' + ids.map((id) => cita(id, true)).join("") + '</div>';
}

function criterio(texto) {
  return '<span class="etiqueta">' + escapar(texto) + '</span>';
}

function enlace(ruta, texto, clase = "") {
  return '<a class="boton ' + clase + '" href="#' + ruta + '">' + texto + '</a>';
}

function anunciar(texto) {
  document.querySelector("#anuncio").textContent = texto;
}

function guardar() {
  try {
    localStorage.setItem(claveProgreso, JSON.stringify(progreso));
  } catch {
    persistencia = false;
  }
  pieNavegacion();
}

function estadoPregunta(pregunta) {
  return progreso.preguntas[pregunta.id] || { vistas: 0, fallos: 0, aciertos: 0, racha: 0, turno: 0 };
}

function calificar(pregunta, correcta) {
  progreso.turno += 1;
  const registro = estadoPregunta(pregunta);
  registro.vistas += 1;
  if (correcta) {
    registro.aciertos += 1;
    registro.racha += 1;
    registro.turno = progreso.turno + 7 * Math.min(registro.racha, 4);
  } else {
    registro.fallos += 1;
    registro.racha = 0;
    registro.turno = progreso.turno + 2;
  }
  progreso.preguntas[pregunta.id] = registro;
  guardar();
}

function dominio() {
  return banco.filter((pregunta) => estadoPregunta(pregunta).racha >= 2).length;
}

function pieNavegacion() {
  document.querySelector("#estado-local").innerHTML =
    '<div><span class="punto"></span>' + (persistencia ? "Estudio local" : "Progreso en esta pestaña") + '</div>' +
    (datos.revision ? '<code>Revisión ' + escapar(datos.revision) + '</code>' : '');
  document.querySelector("#acceso-progreso").textContent = dominio()
    ? dominio() + ' / ' + banco.length + ' dominadas'
    : "Ver progreso";
}

function nav(vista) {
  document.querySelector("#navegacion").innerHTML = seccionesNav.map(([titulo, items]) =>
    '<nav class="nav-grupo" aria-label="' + escapar(titulo) + '"><h2>' + titulo + '</h2>' +
    items.map((id) => '<a class="enlace-nav" href="#' + id + '"' + (vista === id ? ' aria-current="page"' : '') +
      '>' + icono(vistas[id][1]) + '<span>' + vistas[id][0] + '</span></a>').join("") + '</nav>'
  ).join("");
  document.querySelector("#ruta-vista").textContent = vistas[vista][0];
  pieNavegacion();
}

function inicio() {
  const ilustracion = '<svg viewBox="0 0 350 242" role="img" aria-label="El mensaje se cifra con AES-GCM, se protege su clave con RSA-OAEP y se firma con RSA-PSS">' +
    '<defs><pattern id="cuadricula" width="23" height="23" patternUnits="userSpaceOnUse"><path d="M0 23V0h23" fill="none" stroke="#69c5a4" stroke-opacity=".15"/></pattern></defs>' +
    '<rect x="2" y="2" width="346" height="238" rx="16" fill="url(#cuadricula)" stroke="#55967e" stroke-opacity=".43"/>' +
    '<path d="M53 121h244M175 39v164M78 69l194 105m0-105L78 174" stroke="#84e2bf" stroke-opacity=".5" stroke-dasharray="4 5" fill="none"/>' +
    '<path d="m175 49 71 38v70l-71 40-71-40V87Z" fill="#173e31" stroke="#7af0c4" stroke-width="1.5"/>' +
    '<path d="m175 65 55 30v54l-55 31-55-31V95Z" fill="none" stroke="#468e73"/>' +
    '<path d="m148 128 27 16 28-16v-25l-28-15-27 15v25Zm0-25 27 15 28-15m-28 15v26" fill="none" stroke="#a0f9d7" stroke-width="2.1" stroke-linejoin="round"/>' +
    '<text x="175" y="166" fill="#abf6d7" text-anchor="middle" font-size="11" font-family="monospace">SOBRE</text>' +
    '<g font-family="monospace" font-size="10" text-anchor="middle" fill="#beebd9"><rect x="15" y="109" width="78" height="24" rx="6" fill="#203b30" stroke="#5e9b85"/><text x="54" y="124">AES-GCM</text><rect x="257" y="109" width="78" height="24" rx="6" fill="#203b30" stroke="#5e9b85"/><text x="296" y="124">RSA-PSS</text><rect x="131" y="195" width="88" height="24" rx="6" fill="#203b30" stroke="#5e9b85"/><text x="175" y="210">RSA-OAEP</text></g></svg>';
  return '<section class="hero"><div><span class="ceja">Criptografía y Seguridad Informática · UC3M</span>' +
    '<h1>BlueCrypt<span>Defensa oral</span></h1><p>Entiende el chat cifrado por IP, sigue cada decisión hasta su código y ensaya cómo explicarla en voz alta.</p>' +
    '<div class="acciones">' + enlace("codigo/sobre-aad", icono("codigo") + " Explorar el código", "principal") +
    enlace("examen", icono("reloj") + " Hacer un simulacro", "ligero") + '</div></div><div class="hero-grafico">' + ilustracion + '</div></section>' +
    '<section class="banda" aria-label="Rúbrica de la defensa, 20 de 30 puntos">' +
    [['7', 'Demostración', 'Ejecutar el chat y enseñar el rechazo'], ['7', 'Comprensión', 'Justificar las decisiones criptográficas'], ['6', 'Preguntas', 'Explicar errores, ataques y límites']].map(([n, titulo, frase]) =>
      '<article><strong>' + n + '</strong><div><span>' + titulo + '</span><small>' + frase + '</small></div></article>').join("") +
    '</section><section><div class="encabezado-seccion"><h2>Elige por dónde empezar</h2><a href="#progreso">Mi progreso</a></div><div class="rejilla">' +
    [
      ["flujos", "flujo", "Sigue un mensaje", "Del registro al sobre cifrado, la firma y la entrega."],
      ["laboratorio", "matraz", "Ensaya las pruebas", "Ve qué se manipula, qué control lo detecta y qué prueba lo demuestra."],
      ["demo", "terminal", "Practica la demo", "Abre dos terminales y prepara qué decir en cada paso."],
    ].map(([destino, ii, titulo, frase]) =>
      '<a class="tarjeta" href="#' + destino + '">' + icono(ii) + '<h3>' + titulo + '</h3><p>' + frase + '</p></a>').join("") +
    '</div></section>';
}

function rutaCodigo(archivo) {
  return "codigo/archivo/" + encodeURIComponent(archivo.ruta);
}

function visor(bloqueId, nombreArchivo) {
  const bloque = bloques[bloqueId];
  const archivo = archivoPorRuta.get(bloque?.ruta || nombreArchivo) || archivoPorRuta.get("bluecrypt/criptografia.py");
  const activo = bloque || bloques[archivo.bloques[0]];
  const opciones = datos.archivos.map((item) =>
    '<option value="' + rutaCodigo(item) + '"' + (item === archivo ? ' selected' : '') + '>' + escapar(item.ruta) + '</option>'
  ).join("");
  const lista = archivo.bloques.map((id) => {
    const item = bloques[id];
    return '<button class="bloque" data-bloque="' + id + '" aria-pressed="' + (activo?.id === id) + '"><span>' +
      puntos(item) + '</span><span>' + escapar(item.titulo) + '</span></button>';
  }).join("");
  const codigo = archivo.codigo.map((linea, indice) => {
    const n = indice + 1;
    return '<li data-linea="' + n + '"><span class="num" aria-hidden="true">' + n + '</span><code>' + linea + '</code></li>';
  }).join("");
  main.innerHTML = cabecera("Explorar código", datos.archivos.length + ' archivos completos, con referencias de línea y explicaciones para la defensa.') +
    '<div class="fila archivos-cabecera"><label>Archivo <select class="selector" id="archivo">' + opciones + '</select></label>' +
    '<button type="button" id="copiar-codigo" class="boton pequeno">Copiar archivo</button></div>' +
    '<section class="tarjeta resumen-archivo"><div class="fila"><h3>En 30 segundos</h3><span class="sobretitulo">' + archivo.cantidad + ' líneas</span></div>' +
    '<p>' + escapar(archivo.resumen) + '</p><p class="voz">«' + escapar(archivo.voz) + '»</p><p class="sobretitulo">Se relaciona con ' +
    escapar(archivo.relaciones) + '</p></section>' + (archivo.revisar ?
      '<p class="aviso"><strong>Verificar</strong> El archivo cambió desde la revisión anotada. El visor muestra las líneas actuales y ajusta las citas. Revisa que la explicación siga describiendo el comportamiento.</p>' : '') +
    '<div class="visor"><section class="explicacion" aria-label="Explicaciones"><div class="panel-titulo"><strong>Bloques explicados</strong><span class="sobretitulo">' +
    archivo.bloques.length + ' bloques</span></div>' + (lista ? '<div class="lista-bloques">' + lista + '</div>' : '') +
    '<div class="detalle-bloque" id="detalle-bloque"></div></section><section class="codigo-panel" aria-label="Código completo">' +
    '<div class="panel-titulo"><strong class="mono">' + escapar(archivo.ruta) + '</strong><span class="etiqueta">' +
    escapar(archivo.ruta.split(".").at(-1)) + '</span></div><div class="codigo" tabindex="0" aria-label="Código con números de línea">' +
    (codigo ? '<ol>' + codigo + '</ol>' : '<p class="tarjeta suave">El archivo está vacío.</p>') + '</div></section></div>';
  document.querySelector("#archivo").onchange = (e) => { location.hash = e.target.value; };
  document.querySelector("#copiar-codigo").onclick = (e) => copiar(archivo.texto, e.currentTarget);
  for (const boton of main.querySelectorAll("[data-bloque]")) {
    boton.onclick = () => { location.hash = "codigo/" + boton.dataset.bloque; };
  }
  mostrarBloque(activo, Boolean(bloque));
}

function mostrarBloque(bloque, saltar) {
  const detalle = document.querySelector("#detalle-bloque");
  if (!bloque) {
    detalle.innerHTML = '<p>Este marcador de paquete tiene cero líneas que explicar.</p>';
    return;
  }
  detalle.innerHTML = criterio(bloque.criterio) + '<h2>' + escapar(bloque.titulo) + '</h2>' +
    '<p class="mono sobretitulo">' + (bloque.funciones.length ? escapar(bloque.funciones.join(", ")) + ' · ' : "") + 'Líneas ' + puntos(bloque) + '</p>' +
    '<p><strong>Qué hace</strong> ' + escapar(bloque.que) + '</p><p><strong>Por qué</strong> ' + escapar(bloque.motivo) + '</p>' +
    '<div class="correccion"><strong>' + escapar(bloque.pregunta) + '</strong><p>' + escapar(bloque.respuesta) + '</p></div>';
  for (const linea of main.querySelectorAll("[data-linea]")) {
    const n = Number(linea.dataset.linea);
    linea.classList.toggle("marcada", n >= bloque.inicio && n <= bloque.fin);
  }
  for (const boton of main.querySelectorAll("[data-bloque]")) {
    boton.setAttribute("aria-pressed", String(boton.dataset.bloque === bloque.id));
  }
  if (saltar) {
    const linea = main.querySelector('[data-linea="' + bloque.inicio + '"]');
    const caja = main.querySelector(".codigo");
    caja.scrollTop += linea.getBoundingClientRect().top - caja.getBoundingClientRect().top - 9;
    const boton = main.querySelector('[data-bloque="' + bloque.id + '"]');
    const lista = main.querySelector(".lista-bloques");
    lista.scrollTop += boton.getBoundingClientRect().top - lista.getBoundingClientRect().top - 7;
    anunciar("Resaltadas las líneas " + puntos(bloque));
  }
}

async function copiar(texto, boton) {
  try {
    await navigator.clipboard.writeText(texto);
    const original = boton.textContent;
    boton.textContent = "Copiado";
    setTimeout(() => { boton.textContent = original; }, 1400);
  } catch {
    const campo = document.createElement("textarea");
    campo.value = texto;
    campo.setAttribute("aria-label", "Texto preparado para copiar");
    campo.className = "busqueda";
    campo.rows = 5;
    campo.readOnly = true;
    boton.after(campo);
    campo.select();
    anunciar("Usa el atajo de copia de tu sistema en el texto seleccionado.");
  }
}

function mapa() {
  const aristas = datos.temario.mapa;
  const modulos = [...new Set(aristas.flatMap(({ origen, destino }) => [bloques[origen].ruta, bloques[destino].ruta]))];
  const nodos = {
    "__main__.py": [50, 10, "Punto de entrada"], "tui.py": [50, 26, "Interfaz"],
    "servicio.py": [23, 43, "Login y SQLite"], "tui_red.py": [77, 43, "Comandos y eventos"],
    "criptografia.py": [23, 85, "Criptografía"], "nodo.py": [77, 61, "Coordinación"],
    "contactos.py": [50, 73, "Identidad e historial"], "red.py": [77, 89, "Canal TCP"],
  };
  const pares = new Map();
  for (const { origen, destino } of aristas) {
    const de = modulo(bloques[origen].ruta);
    const hacia = modulo(bloques[destino].ruta);
    pares.set(de + ":" + hacia, [de, hacia]);
  }
  const enlaces = [...pares.values()].map(([de, hacia]) => {
    const [ax, ay] = nodos[de];
    const [bx, by] = nodos[hacia];
    const finX = ax === bx ? bx : bx - (bx > ax ? 13 : -13);
    const finY = ax === bx ? by - (by > ay ? 5 : -5) : by;
    const mitadY = (ay + finY) / 2;
    const mitadX = (ax + finX) / 2;
    return '<path class="arista" data-de="' + de + '" data-hacia="' + hacia + '" d="M' + ax + ' ' + ay +
      ' C' + (ax === bx ? ax : mitadX) + ' ' + mitadY + ' ' + (ax === bx ? finX : mitadX) + ' ' +
      (ax === bx ? mitadY : finY) + ' ' + finX + ' ' + finY + '" marker-end="url(#punta-mapa)"/>';
  }).join("");
  const grafo = '<svg class="aristas" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">' +
    '<defs><marker id="punta-mapa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="4" markerHeight="4" orient="auto-start-reverse">' +
    '<path d="M0 0l8 4-8 4z" fill="#70d3ac"/></marker></defs>' + enlaces + '</svg>';
  main.innerHTML = cabecera("Mapa del proyecto", "Selecciona un módulo para ver qué llamadas hace y qué módulos lo usan.") +
    '<div class="mapa"><section class="tarjeta"><h3>Módulos</h3><div class="mapa-grafo">' + grafo +
    modulos.map((id) => {
      const [x, y, alias] = nodos[modulo(id)];
      return '<button type="button" class="filtro" style="--x:' + x + '%;--y:' + y + '%" data-modulo="' +
        escapar(id) + '" aria-pressed="' + (id === mapaActual) + '"><span class="mono">' +
        escapar(modulo(id)) + '</span><small>' + escapar(alias) + '</small></button>';
    }).join("") +
    '</div></section><section id="conexiones-mapa" class="tarjeta"></section></div>';
  const destino = document.querySelector("#conexiones-mapa");
  function dibujar() {
    for (const boton of main.querySelectorAll("[data-modulo]")) boton.setAttribute("aria-pressed", String(boton.dataset.modulo === mapaActual));
    for (const arista of main.querySelectorAll(".arista")) {
      const actual = modulo(mapaActual);
      arista.classList.toggle("activa", arista.dataset.de === actual || arista.dataset.hacia === actual);
    }
    const salientes = aristas.filter(({ origen }) => bloques[origen].ruta === mapaActual);
    const entrantes = aristas.filter(({ destino: id }) => bloques[id].ruta === mapaActual);
    const diagrama = (lista, esSalida) => lista.length ? '<div class="diagrama">' + lista.map(({ origen, destino, texto }) => {
      const otra = esSalida ? destino : origen;
      return '<div class="conexion"><div class="mono">' + escapar(modulo(bloques[otra].ruta)) + '</div><p>' + escapar(texto) +
        '</p><div class="citas">' + cita(origen) + cita(destino) + '</div></div>';
    }).join("") + '</div>' : '<p class="suave">Sin llamadas en este mapa.</p>';
    destino.innerHTML = '<div class="fila"><h3 class="mono">' + escapar(modulo(mapaActual)) + '</h3>' +
      enlace(rutaCodigo(archivoPorRuta.get(mapaActual)), "Ver código", "pequeno") + '</div>' +
      '<div class="espacio"><h3>Llama a</h3>' + diagrama(salientes, true) + '</div>' +
      '<div class="espacio"><h3>Lo llaman desde</h3>' + diagrama(entrantes, false) + '</div>';
  }
  for (const boton of main.querySelectorAll("[data-modulo]")) boton.onclick = () => { mapaActual = boton.dataset.modulo; dibujar(); };
  dibujar();
}

function flujos() {
  const pasos = datos.temario.flujos.filter(({ tema }) => tema === flujoActual);
  const paso = pasos[pasoActual];
  main.innerHTML = cabecera("Flujos paso a paso", "Recorre la operación y abre el bloque exacto de código desde cada paso.") +
    '<div class="filtros" role="group" aria-label="Elige el flujo">' + grupoFlujos.map((tema, i) =>
      '<button class="filtro" data-flujo="' + i + '" aria-pressed="' + (flujoActual === tema) + '">' + escapar(tema) + '</button>'
    ).join("") + '</div><section class="tarjeta"><div class="fila"><h3>' + escapar(flujoActual) +
    '</h3><span class="etiqueta">Paso ' + (pasoActual + 1) + ' de ' + pasos.length + '</span></div>' +
    '<progress aria-label="Paso del flujo" value="' + (pasoActual + 1) + '" max="' + pasos.length + '"></progress>' +
    '<div class="espacio"><h3>' + escapar(bloques[paso.cita].titulo) + '</h3><p>' + escapar(paso.texto) + '</p>' +
    citas([paso.cita]) + '</div><div class="acciones espacio"><button id="paso-ant" class="boton"' +
    (pasoActual === 0 ? " disabled" : "") + '>Anterior</button><button id="paso-sig" class="boton principal"' +
    (pasoActual + 1 === pasos.length ? " disabled" : "") + '>Siguiente</button></div></section>' +
    '<h2 class="espacio">Índice del flujo</h2><div class="pila espacio">' + pasos.map(({ cita: id, texto }, i) =>
      '<div class="tarjeta paso"><span class="numero-paso">' + (i + 1) + '</span><div><button type="button" class="filtro" data-paso="' +
      i + '" aria-pressed="' + (pasoActual === i) + '">' + escapar(bloques[id].titulo) + '</button><p>' + escapar(texto) +
      '</p>' + citas([id]) + '</div></div>').join("") + '</div>';
  for (const boton of main.querySelectorAll("[data-flujo]")) boton.onclick = () => {
    flujoActual = grupoFlujos[Number(boton.dataset.flujo)];
    pasoActual = 0;
    flujos();
    main.querySelector('[data-flujo="' + boton.dataset.flujo + '"]').focus();
  };
  function cambiarPaso(indice, foco) {
    pasoActual = indice;
    flujos();
    const boton = main.querySelector(foco);
    if (!boton?.disabled) boton?.focus();
    else main.querySelector('[data-paso="' + indice + '"]').focus();
  }
  for (const boton of main.querySelectorAll("[data-paso]")) boton.onclick = () => cambiarPaso(Number(boton.dataset.paso), '[data-paso="' + boton.dataset.paso + '"]');
  main.querySelector("#paso-ant").onclick = () => cambiarPaso(pasoActual - 1, "#paso-ant");
  main.querySelector("#paso-sig").onclick = () => cambiarPaso(pasoActual + 1, "#paso-sig");
}

function glosario() {
  return cabecera("Glosario criptográfico", "Repasa los conceptos y localiza cómo se aplican en BlueCrypt.") +
    '<div class="rejilla dos">' + datos.temario.glosario.map(({ titulo, texto, citas: refs }) =>
      '<article class="tarjeta"><h3>' + escapar(titulo) + '</h3><p>' + escapar(texto) + '</p>' + citas(refs) + '</article>'
    ).join("") + '</div>';
}

function laboratorio() {
  return cabecera("Laboratorio de ataques", "Estudia qué dato cambia, qué comprobación lo rechaza y qué evidencia lo demuestra en un entorno local de prueba.") +
    '<div class="pila">' + datos.temario.laboratorio.map(({ titulo, cambio, deteccion, citas: refs, pruebas, evidencia }) => {
      const adicional = pruebas.length === 0 ? datos.comprobaciones.aad : "";
      return '<article class="tarjeta"><div class="fila"><h3>' + escapar(titulo) + '</h3>' +
        (pruebas.length || adicional ? '<span class="etiqueta">' + (pruebas.length ? "Suite" : "Comprobación adicional") + '</span>' :
          '<span class="etiqueta ambar">Verificar</span>') + '</div><p><strong>Qué se modifica</strong> ' + escapar(cambio) +
        '</p><p><strong>Qué lo detecta</strong> ' + escapar(deteccion) + '</p>' + citas(refs) +
        '<p class="espacio"><strong>Evidencia</strong> ' + escapar(evidencia) + '</p>' +
        (adicional ? '<p>' + escapar(adicional) + '</p>' : '') + (pruebas.length ? citas(pruebas) : '') + '</article>';
    }).join("") + '</div>';
}

function decisiones() {
  const mejoras = datos.temario.mejoras.map(({ titulo, antes, despues, motivo, citas: refs }) =>
    '<article class="tarjeta"><h3>' + escapar(titulo) + '</h3><p><strong>Antes</strong> ' + escapar(antes) +
    '</p><p><strong>Ahora</strong> ' + escapar(despues) + '</p><p><strong>Por qué</strong> ' + escapar(motivo) + '</p>' + citas(refs) + '</article>'
  ).join("");
  const limites = datos.temario.limites.map(({ titulo, riesgo, mitigacion, defensa, citas: refs }) =>
    '<article class="tarjeta"><h3>' + escapar(titulo) + '</h3><p><strong>Riesgo real</strong> ' + escapar(riesgo) +
    '</p><p><strong>Mitigación posible</strong> ' + escapar(mitigacion) + '</p><p><strong>Cómo defenderlo</strong> ' +
    escapar(defensa) + '</p>' + citas(refs) + '</article>'
  ).join("");
  const verificadas = Object.entries(datos.comprobaciones).map(([id, texto]) => {
    const refs = { aad: ["abrir-gcm"], "rsa-persistente": ["abrir-rsa"], metadatos: ["red-paquete"], bcrypt: ["bcrypt"], pem: ["privada-leer"] }[id];
    return refs ? '<li>' + escapar(texto) + ' ' + cita(refs[0]) + '</li>' : '';
  }).join("");
  return cabecera("Decisiones y límites", "Explica qué cambió en el código, por qué se hizo y dónde termina cada protección.") +
    '<div class="encabezado-seccion"><h2>Mejoras implementadas</h2></div><div class="rejilla dos">' + mejoras + '</div>' +
    '<div class="encabezado-seccion espacio"><h2>Límites del proyecto</h2></div><div class="rejilla dos">' + limites + '</div>' +
    '<section class="tarjeta espacio"><h3>Qué se ha comprobado</h3><p>Las pruebas del proyecto cubren migración, llamada a bcrypt, rechazo de claves alteradas y gestión de solicitudes. ' +
    'Las comprobaciones adicionales registran resultados de identidades desechables.</p>' +
    (verificadas ? '<ul>' + verificadas + '</ul>' : '<p class="aviso">Verificar las comprobaciones adicionales con el script antes de citar resultados.</p>') +
    '<p><strong>Verificar en vuestro entorno</strong> La latencia exacta del login, los costes relativos en hardware ajeno, las carreras con conexiones concurrentes, el comportamiento tras NAT y una demo entre ordenadores físicos.</p>' +
    citas(["ts-senuelo", "tr-bloqueo", "nodo-conectar", "tt-chat"]) + '</section>';
}

function demo() {
  return cabecera("Guion de demo", "Ensaya las operaciones que enseñarán el funcionamiento del chat y prepara una frase para justificar cada una.") +
    '<div class="aviso"><strong>En localhost</strong> Evita rechazar una solicitud entrante durante la demostración. Si bloqueas 127.0.0.1, vuelve a iniciar sesión en el receptor. ' + cita("nodo-responder") + '</div>' +
    '<ol class="pila" style="list-style:none;padding:0">' + datos.temario.demo.map(({ titulo, texto, comandos, voz, citas: refs }, i) =>
      '<li class="tarjeta paso"><span class="numero-paso" aria-hidden="true">' + (i + 1) + '</span><div><h3>' + escapar(titulo) +
      '</h3><p>' + escapar(texto) + '</p>' + (comandos !== '-' ? '<pre class="comandos">' + escapar(comandos.replaceAll("~", "\n")) + '</pre>' : '') +
      '<p><strong>Qué decir</strong> «' + escapar(voz) + '»</p>' + citas(refs) + '</div></li>'
    ).join("") + '</ol>';
}

function opcionesTema() {
  return ["Todas", ...datos.criterios].map((etiqueta) =>
    '<option value="' + escapar(etiqueta) + '">' + escapar(etiqueta) + '</option>'
  ).join("");
}

function comun(texto) {
  return texto.toLocaleLowerCase("es").normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function preguntas() {
  main.innerHTML = cabecera("Banco de preguntas", banco.length + " preguntas con respuesta modelo, criterio y referencia de código.") +
    '<div class="acciones"><label class="solo-lector" for="buscar-preguntas">Buscar preguntas</label>' +
    '<input id="buscar-preguntas" type="search" class="busqueda" placeholder="Busca, por ejemplo, AAD o huella">' +
    '<label class="solo-lector" for="tema-banco">Criterio</label><select id="tema-banco" class="selector">' + opcionesTema() +
    '</select></div><p id="total-preguntas" class="suave espacio" aria-live="polite"></p><div id="lista-preguntas" class="banco pila espacio"></div>';
  const tema = main.querySelector("#tema-banco");
  const buscador = main.querySelector("#buscar-preguntas");
  function filtrar() {
    const clave = comun(buscador.value.trim());
    const filtradas = banco.filter((p) => (tema.value === "Todas" || tema.value === p.criterio) &&
      comun(p.pregunta + " " + p.respuesta).includes(clave));
    main.querySelector("#total-preguntas").textContent = filtradas.length +
      (filtradas.length === 1 ? " pregunta" : " preguntas");
    main.querySelector("#lista-preguntas").innerHTML = filtradas.map((p) =>
      '<details class="tarjeta"><summary><strong>' + escapar(p.pregunta) + '</strong>' + criterio(p.criterio) +
      '</summary><p>' + escapar(p.respuesta) + '</p>' + citas(p.citas) + '</details>'
    ).join("") || '<p class="suave">No hay preguntas con esos filtros.</p>';
  }
  tema.onchange = buscador.oninput = filtrar;
  filtrar();
}

function prioridad(p) {
  const registro = estadoPregunta(p);
  if (!registro.vistas) return 30;
  const distancia = progreso.turno - registro.turno;
  if (distancia >= 0) {
    return 40 + Math.min(distancia, 20) + Math.min(registro.fallos, 8) - 4 * registro.racha;
  }
  return distancia - 5 * registro.racha;
}

function muestrear(candidatas, n) {
  return candidatas.map((p) => ({ pregunta: p, peso: prioridad(p) + Math.random() * 9 }))
    .sort((a, b) => b.peso - a.peso)
    .slice(0, n).map((item) => item.pregunta);
}

function nuevaTarjeta() {
  const posibles = banco.filter((p) => (temaTarjeta === "Todas" || p.criterio === temaTarjeta) && p.id !== anterior);
  tarjeta = muestrear(posibles, 1)[0];
  anterior = tarjeta.id;
  revelada = false;
}

function tarjetas() {
  if (!tarjeta) nuevaTarjeta();
  const p = tarjeta;
  const registro = estadoPregunta(p);
  main.innerHTML = cabecera("Tarjetas de repaso", "Responde en voz alta antes de mirar. Los fallos vuelven antes que los aciertos.") +
    '<div class="acciones"><label for="tema-tarjeta">Tema</label><select id="tema-tarjeta" class="selector">' + opcionesTema() + '</select></div>' +
    '<section class="tarjeta examen espacio"><div class="fila">' + criterio(p.criterio) +
    '<span class="sobretitulo">' + (registro.fallos ? "Repaso · " + registro.fallos + " fallos previos" :
      registro.vistas ? "Ya practicada" : "Pregunta nueva") + '</span></div><h2>' + escapar(p.pregunta) + '</h2>' +
    (revelada ? '<div class="correccion"><h3>Respuesta modelo</h3><p>' + escapar(p.respuesta) + '</p>' +
      citas(p.citas) + '</div><div class="acciones"><button id="no-recorde" class="boton">No la recordé</button>' +
      '<button id="si-recorde" class="boton principal">La recordé</button></div>' :
      '<div class="acciones"><button id="revelar" class="boton principal">Ver respuesta</button>' +
      '<button id="omitir" class="boton">Pasar</button></div>') + '</section>';
  const selector = main.querySelector("#tema-tarjeta");
  selector.value = temaTarjeta;
  selector.onchange = () => {
    temaTarjeta = selector.value;
    nuevaTarjeta();
    tarjetas();
    main.querySelector("#tema-tarjeta").focus();
  };
  if (revelada) {
    function registrar(correcta) {
      calificar(p, correcta);
      nuevaTarjeta();
      tarjetas();
      main.querySelector("#revelar").focus();
      anunciar(correcta ? "Respuesta recordada. Nueva tarjeta." : "Se repasará antes. Nueva tarjeta.");
    }
    main.querySelector("#no-recorde").onclick = () => registrar(false);
    main.querySelector("#si-recorde").onclick = () => registrar(true);
  } else {
    main.querySelector("#revelar").onclick = () => {
      revelada = true; tarjetas(); main.querySelector("#no-recorde").focus();
    };
    main.querySelector("#omitir").onclick = () => {
      nuevaTarjeta(); tarjetas(); main.querySelector("#omitir").focus();
    };
  }
}

function barajar(lista) {
  for (let i = lista.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}

function reloj() {
  if (!examen || examen.fin) return;
  const restante = Math.max(0, Math.ceil((examen.limite - Date.now()) / 1000));
  if (restante === 0) {
    finalizar(true);
    return;
  }
  const area = main.querySelector("#reloj");
  if (area) {
    const minutos = String(Math.floor(restante / 60)).padStart(2, "0");
    const segundos = String(restante % 60).padStart(2, "0");
    area.textContent = minutos + ":" + segundos;
  }
}

function finalizar(tiempo) {
  examen.fin = true;
  examen.tiempo = tiempo;
  for (const pregunta of examen.preguntas) {
    if (!examen.resultados.has(pregunta.id)) {
      examen.resultados.set(pregunta.id, { correcta: false, elegida: null });
      calificar(pregunta, false);
    }
  }
  if (vistaActual === "examen") {
    simulacro();
    main.querySelector("h2")?.focus();
  }
  anunciar(tiempo ? "Tiempo agotado." : "Simulacro corregido.");
}

function simulacro() {
  const titulo = cabecera("Simulacro cronometrado", "Una respuesta por pregunta. Revisa la explicación y localiza el código al corregir.");
  if (!examen) {
    main.innerHTML = titulo + '<section class="tarjeta examen"><h2>Configura el simulacro</h2><p>Elige el ritmo de la sesión. Las preguntas pendientes de repaso tienen prioridad.</p>' +
      '<div class="acciones espacio"><label>Preguntas <select id="cantidad-examen" class="selector"><option>6</option><option selected>10</option><option>18</option></select></label>' +
      '<label>Minutos <select id="duracion-examen" class="selector"><option>5</option><option selected>8</option><option>12</option></select></label></div>' +
      '<button id="iniciar-examen" class="boton principal espacio">Empezar simulacro</button></section>';
    main.querySelector("#iniciar-examen").onclick = () => {
      const n = Number(main.querySelector("#cantidad-examen").value);
      const minutos = Number(main.querySelector("#duracion-examen").value);
      examen = {
        preguntas: muestrear(datos.temario.examen, n).map((p) => ({
          ...p, opciones: barajar([p.respuesta, p.falsa1, p.falsa2, p.falsa3]),
        })),
        limite: Date.now() + minutos * 60_000, indice: 0, seleccion: null, fin: false, resultados: new Map(),
      };
      simulacro();
      main.querySelector("h2").focus();
    };
    return;
  }
  if (examen.fin) {
    const aciertos = [...examen.resultados.values()].filter((r) => r.correcta).length;
    main.innerHTML = titulo + '<section class="tarjeta examen"><span class="etiqueta">' +
      (examen.tiempo ? "Tiempo agotado" : "Corrección completa") + '</span><h2 tabindex="-1">' + aciertos + ' de ' +
      examen.preguntas.length + ' correctas</h2><p>Los fallos y preguntas en blanco se guardan para repasarlos antes.</p><div class="acciones espacio">' +
      '<button id="nuevo-examen" class="boton principal">Nuevo simulacro</button>' + enlace("progreso", "Ver progreso") +
      '</div></section><div class="pila espacio">' + examen.preguntas.map((p) => {
        const resultado = examen.resultados.get(p.id);
        return '<details class="tarjeta"><summary><strong>' + (resultado.correcta ? "Correcta · " : "Repasar · ") + escapar(p.pregunta) +
          '</strong></summary><p><strong>Tu respuesta</strong> ' + escapar(resultado.elegida || "En blanco") + '</p><p><strong>Explicación</strong> ' +
          escapar(p.respuesta) + '</p>' + citas(p.citas) + '</details>';
      }).join("") + '</div>';
    main.querySelector("#nuevo-examen").onclick = () => { examen = null; simulacro(); main.querySelector("#iniciar-examen").focus(); };
    return;
  }

  const p = examen.preguntas[examen.indice];
  const resultado = examen.resultados.get(p.id);
  const ultima = examen.indice + 1 === examen.preguntas.length;
  main.innerHTML = titulo + '<section class="tarjeta examen"><div class="fila"><div>' + criterio(p.criterio) +
    ' <span class="sobretitulo">Pregunta ' + (examen.indice + 1) + ' de ' + examen.preguntas.length +
    '</span></div><span class="reloj" id="reloj" role="timer"></span></div><h2 tabindex="-1">' + escapar(p.pregunta) + '</h2>' +
    '<div class="opciones" role="group" aria-label="Opciones de respuesta">' + p.opciones.map((opcion, i) => {
      const clase = resultado && opcion === p.respuesta ? " correcta" :
        resultado && opcion === resultado.elegida ? " incorrecta" : "";
      return '<button class="opcion' + clase + '" data-opcion="' + i + '" aria-pressed="' + (examen.seleccion === i) +
        '"' + (resultado ? " disabled" : "") + '>' + escapar(opcion) + '</button>';
    }).join("") + '</div>' +
    (resultado ? '<div class="correccion"><h3>' + (resultado.correcta ? "Correcta" : "Para repasar") + '</h3><p>' +
      escapar(p.respuesta) + '</p>' + citas(p.citas) + '</div><button id="avanzar-examen" class="boton principal">' +
      (ultima ? "Ver resultado" : "Siguiente pregunta") + '</button>' :
      '<button id="corregir-examen" class="boton principal"' + (examen.seleccion === null ? " disabled" : "") + '>Corregir respuesta</button>') +
    '</section>';
  if (resultado) {
    main.querySelector("#avanzar-examen").onclick = () => {
      if (Date.now() >= examen.limite) finalizar(true);
      else if (ultima) finalizar(false);
      else {
        examen.indice += 1;
        examen.seleccion = null;
        simulacro();
        main.querySelector("h2").focus();
      }
    };
  } else {
    for (const boton of main.querySelectorAll("[data-opcion]")) boton.onclick = () => {
      examen.seleccion = Number(boton.dataset.opcion);
      for (const opcion of main.querySelectorAll("[data-opcion]")) opcion.setAttribute("aria-pressed", String(opcion === boton));
      main.querySelector("#corregir-examen").disabled = false;
    };
    main.querySelector("#corregir-examen").onclick = () => {
      if (Date.now() >= examen.limite) return finalizar(true);
      const elegida = p.opciones[examen.seleccion];
      const correcta = elegida === p.respuesta;
      examen.resultados.set(p.id, { correcta, elegida });
      calificar(p, correcta);
      anunciar(correcta ? "Respuesta correcta." : "Respuesta incorrecta. Lee la explicación.");
      simulacro();
      main.querySelector("#avanzar-examen")?.focus();
    };
  }
  reloj();
}

function resumenProgreso() {
  const practicadas = banco.filter((p) => estadoPregunta(p).vistas).length;
  return cabecera("Mi progreso", "Se guarda en este navegador. Una pregunta cuenta como dominada después de dos aciertos consecutivos.") +
    '<div class="banda" aria-label="Resumen de práctica">' + [
      [practicadas, "Practicadas"], [dominio(), "Dominadas"], [banco.length - practicadas, "Por empezar"],
    ].map(([n, texto]) => '<article><strong>' + n + '</strong><span>' + texto + '</span></article>').join("") +
    '</div><div class="encabezado-seccion"><h2>Por criterio</h2></div><div class="tabla-progreso">' +
    datos.criterios.map((tema) => {
      const delTema = banco.filter((p) => p.criterio === tema);
      const dominadas = delTema.filter((p) => estadoPregunta(p).racha >= 2).length;
      const intentadas = delTema.filter((p) => estadoPregunta(p).vistas).length;
      return '<article><span>' + escapar(tema) + '</span><progress aria-label="Dominadas en ' + escapar(tema) + '" value="' +
        dominadas + '" max="' + delTema.length + '"></progress><span class="sobretitulo">' +
        dominadas + " / " + delTema.length + ' · ' + intentadas + ' vistas</span></article>';
    }).join("") + '</div><div class="acciones espacio">' + enlace("tarjetas", "Seguir con tarjetas", "principal") +
    enlace("examen", "Hacer un simulacro") + '</div>' + (!persistencia ?
      '<p class="aviso">Verificar los permisos de almacenamiento de este navegador para guardar el progreso cuando cierres.</p>' : '');
}

let vistaActual = "";
let archivoActual = "";

function ruta() {
  const partes = location.hash.slice(1).split("/");
  if (partes[0] === "contenido") return;
  const vista = Object.hasOwn(vistas, partes[0]) ? partes[0] : "inicio";
  const anterior = vistaActual;
  vistaActual = vista;
  if (anterior !== vista) {
    nav(vista);
    document.title = vistas[vista][0] + " · BlueCrypt";
    window.scrollTo(0, 0);
  }
  if (vista === "codigo") {
    const id = Object.hasOwn(bloques, partes[1]) ? partes[1] : null;
    const bloque = bloques[id];
    let nombreArchivo;
    if (partes[1] === "archivo") {
      try { nombreArchivo = decodeURIComponent(partes[2] || ""); } catch { nombreArchivo = ""; }
    }
    if (anterior === "codigo" && bloque?.ruta === archivoActual) {
      mostrarBloque(bloque, true);
    } else {
      visor(id, nombreArchivo);
    }
    archivoActual = main.querySelector("#archivo").selectedOptions[0].textContent;
  } else if (vista === "mapa") mapa();
  else if (vista === "flujos") flujos();
  else if (vista === "preguntas") preguntas();
  else if (vista === "tarjetas") tarjetas();
  else if (vista === "examen") simulacro();
  else {
    const producir = { inicio, glosario, laboratorio, decisiones, demo, progreso: resumenProgreso };
    main.innerHTML = producir[vista]();
  }
  if (anterior && anterior !== vista) main.focus({ preventScroll: true });
}

window.addEventListener("hashchange", ruta);
setInterval(reloj, 250);
ruta();
