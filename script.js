/* =========================================================
   ZAPASTRONE — script.js
   Todo lo que necesitás tocar para el día a día del negocio
   (productos, número de WhatsApp, Instagram) está en la
   sección "CONFIGURACIÓN" de más abajo. El resto es lógica
   de la página y normalmente no hace falta modificarlo.
   ========================================================= */

/* =========================================================
   1) CONFIGURACIÓN — EDITAR ACÁ
   ========================================================= */

// Número de WhatsApp de ZAPASTRONE, en formato internacional
// SIN espacios, SIN "+" y SIN guiones (wa.me lo necesita así).
const NUMERO_WHATSAPP = "59892176807";

// Link completo del perfil de Instagram
const ENLACE_INSTAGRAM = "https://www.instagram.com/zapastrone.uy?stkn=MW15a3JoeGw1NXJtdw%3D%3D&utm_source=qr";

/* -----------------------------------------------------------
   PRODUCTOS
   -----------------------------------------------------------
   Los productos YA NO están escritos acá: viven en el archivo
   data/productos.json, que es el que edita el panel de
   administración (con login) en /admin/. Ahí cambiás precios,
   fotos, talles y disponibilidad sin tocar código.

   Si en algún momento preferís editar a mano en vez de usar el
   panel, podés abrir directamente data/productos.json — tiene
   los mismos campos que antes (id, nombre, categoria, precio,
   talles, disponible, destacado, imagen, demo).
   ----------------------------------------------------------- */
let PRODUCTOS = [];

async function cargarProductos() {
  try {
    const respuesta = await fetch("data/productos.json");
    const datos = await respuesta.json();
    PRODUCTOS = datos.productos || [];
  } catch (error) {
    console.error("No se pudieron cargar los productos:", error);
    PRODUCTOS = [];
  }
}

/* =========================================================
   2) LÓGICA DE LA PÁGINA — no hace falta tocar de acá para abajo
   ========================================================= */

const formatoPrecio = (numero) =>
  new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(numero);

// Estado en memoria: talle elegido por producto, y contenido del carrito
const talleElegido = {};
let carrito = [];

const grilla = document.getElementById("grillaProductos");
const contenedorDestacados = document.getElementById("grillaDestacados");
const filtros = document.querySelectorAll(".chip-filtro");

function crearTarjeta(producto) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "tarjeta-producto aparece";

  const talleActual = talleElegido[producto.id] || null;

  tarjeta.innerHTML = `
    <div class="tarjeta-imagen">
      ${producto.demo ? '<span class="etiqueta-demo">Ejemplo</span>' : ""}
      ${!producto.disponible ? '<span class="etiqueta-agotado">Agotado</span>' : ""}
      <img src="${producto.imagen}" alt="${producto.nombre}" loading="lazy">
    </div>
    <div class="tarjeta-cuerpo">
      <span class="tarjeta-categoria">${etiquetaCategoria(producto.categoria)}</span>
      <h3 class="tarjeta-nombre">${producto.nombre}</h3>
      <div class="tarjeta-precio">${formatoPrecio(producto.precio)}</div>
      <div class="tarjeta-talles" data-talles>
        ${producto.talles
          .map(
            (t) =>
              `<button type="button" class="talle-opcion ${t === talleActual ? "seleccionado" : ""}" data-talle="${t}">${t}</button>`
          )
          .join("")}
      </div>
      <button type="button" class="boton boton-comprar" data-comprar ${!producto.disponible ? "disabled" : ""}>
        ${producto.disponible ? "Comprar" : "Agotado"}
      </button>
    </div>
  `;

  // Selección de talle
  tarjeta.querySelectorAll("[data-talle]").forEach((boton) => {
    boton.addEventListener("click", () => {
      talleElegido[producto.id] = Number(boton.dataset.talle);
      tarjeta.querySelectorAll("[data-talle]").forEach((b) => b.classList.remove("seleccionado"));
      boton.classList.add("seleccionado");
    });
  });

  // Botón comprar: agrega al carrito y abre WhatsApp
  const botonComprar = tarjeta.querySelector("[data-comprar]");
  botonComprar.addEventListener("click", () => {
    if (!producto.disponible) return;
    const talle = talleElegido[producto.id] || producto.talles[0];
    agregarAlCarrito(producto, talle);
    abrirWhatsAppProducto(producto, talle);
  });

  return tarjeta;
}

function etiquetaCategoria(categoria) {
  const nombres = {
    lifestyle: "Lifestyle",
    basketball: "Basketball",
    running: "Running",
    skate: "Skate",
  };
  return nombres[categoria] || categoria;
}

function renderizarCatalogo(categoria = "todas") {
  grilla.innerHTML = "";
  const lista = categoria === "todas" ? PRODUCTOS : PRODUCTOS.filter((p) => p.categoria === categoria);

  if (lista.length === 0) {
    grilla.innerHTML = '<p style="color:var(--gris-2)">No hay productos en esta categoría todavía.</p>';
    return;
  }

  lista.forEach((producto) => grilla.appendChild(crearTarjeta(producto)));
}

function renderizarDestacados() {
  contenedorDestacados.innerHTML = "";
  PRODUCTOS.filter((p) => p.destacado).forEach((producto) => contenedorDestacados.appendChild(crearTarjeta(producto)));
}

// Filtros de categoría
filtros.forEach((chip) => {
  chip.addEventListener("click", () => {
    filtros.forEach((c) => c.classList.remove("activo"));
    chip.classList.add("activo");
    renderizarCatalogo(chip.dataset.categoria);
  });
});

/* ---------------------- Carrito ---------------------- */

const fondoCarrito = document.getElementById("fondoCarrito");
const panelCarrito = document.getElementById("panelCarrito");
const listaCarrito = document.getElementById("carritoItems");
const totalCarrito = document.getElementById("carritoTotal");
const contadorCarrito = document.getElementById("contadorCarrito");

function agregarAlCarrito(producto, talle) {
  carrito.push({ ...producto, talleElegido: talle, clave: `${producto.id}-${talle}-${Date.now()}` });
  actualizarCarrito();
}

function quitarDelCarrito(clave) {
  carrito = carrito.filter((item) => item.clave !== clave);
  actualizarCarrito();
}

function actualizarCarrito() {
  contadorCarrito.textContent = carrito.length;
  contadorCarrito.classList.toggle("oculto", carrito.length === 0);

  if (carrito.length === 0) {
    listaCarrito.innerHTML = '<p class="carrito-vacio">Todavía no agregaste zapatillas al carrito.</p>';
  } else {
    listaCarrito.innerHTML = carrito
      .map(
        (item) => `
        <div class="item-carrito">
          <img src="${item.imagen}" alt="${item.nombre}">
          <div class="item-carrito-info">
            <strong>${item.nombre}</strong>
            <span>Talle ${item.talleElegido} · ${formatoPrecio(item.precio)}</span>
          </div>
          <button type="button" class="quitar-item" data-quitar="${item.clave}">Quitar</button>
        </div>`
      )
      .join("");

    listaCarrito.querySelectorAll("[data-quitar]").forEach((boton) => {
      boton.addEventListener("click", () => quitarDelCarrito(boton.dataset.quitar));
    });
  }

  const total = carrito.reduce((suma, item) => suma + item.precio, 0);
  totalCarrito.textContent = formatoPrecio(total);
}

document.getElementById("abrirCarrito").addEventListener("click", () => alternarCarrito(true));
document.getElementById("cerrarCarrito").addEventListener("click", () => alternarCarrito(false));
fondoCarrito.addEventListener("click", () => alternarCarrito(false));

function alternarCarrito(mostrar) {
  fondoCarrito.classList.toggle("visible", mostrar);
  panelCarrito.classList.toggle("visible", mostrar);
}

document.getElementById("finalizarCompra").addEventListener("click", () => {
  if (carrito.length === 0) return;
  abrirWhatsAppCarrito();
});

/* ---------------------- WhatsApp ---------------------- */

function abrirWhatsAppProducto(producto, talle) {
  const mensaje =
    `Hola ZAPASTRONE! Quiero comprar:\n` +
    `• ${producto.nombre} (talle ${talle}) — ${formatoPrecio(producto.precio)}\n` +
    `¿Está disponible?`;
  irAWhatsApp(mensaje);
}

function abrirWhatsAppCarrito() {
  const lineas = carrito
    .map((item) => `• ${item.nombre} (talle ${item.talleElegido}) — ${formatoPrecio(item.precio)}`)
    .join("\n");
  const total = carrito.reduce((suma, item) => suma + item.precio, 0);
  const mensaje =
    `Hola ZAPASTRONE! Quiero coordinar esta compra:\n${lineas}\n\nTotal estimado: ${formatoPrecio(total)}\n` +
    `Mi nombre es: \nMi localidad es: `;
  irAWhatsApp(mensaje);
}

function irAWhatsApp(mensaje) {
  const url = `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}

/* ---------------------- Menú mobile ---------------------- */

const botonMenu = document.getElementById("botonMenu");
const navMobile = document.getElementById("navMobile");
botonMenu.addEventListener("click", () => {
  navMobile.classList.toggle("abierto");
});
navMobile.querySelectorAll("a").forEach((enlace) => {
  enlace.addEventListener("click", () => navMobile.classList.remove("abierto"));
});

/* ---------------------- Instagram dinámico ---------------------- */

document.querySelectorAll("[data-instagram]").forEach((enlace) => {
  enlace.href = ENLACE_INSTAGRAM;
});

/* ---------------------- Año dinámico en el pie ---------------------- */

document.getElementById("anioActual").textContent = new Date().getFullYear();

/* ---------------------- Animación al hacer scroll ---------------------- */

const observador = new IntersectionObserver(
  (entradas) => {
    entradas.forEach((entrada) => {
      if (entrada.isIntersecting) {
        entrada.target.classList.add("visible");
        observador.unobserve(entrada.target);
      }
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll(".revelar").forEach((elemento) => observador.observe(elemento));

/* ---------------------- Inicio ---------------------- */

(async function iniciar() {
  await cargarProductos();
  renderizarDestacados();
  renderizarCatalogo("todas");
  actualizarCarrito();
})();
