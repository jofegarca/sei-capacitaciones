// ── SUPABASE CONFIG ──────────────────────────────────────────
const SUPABASE_URL = "https://wburchzshbkgdpfwvfzy.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndidXJjaHpzaGJrZ2RwZnd2Znp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4OTcyNjksImV4cCI6MjA3NTQ3MzI2OX0.q5NDSNsBQF3CU-JrezA3YIr1SYVgZckb4gzaEvHxSME";
const IMG_BASE_PATH = "./imagenes/"; // carpeta local de fotos
const IMG_EXTENSION = ".jpg"; // extensión de las fotos

const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

let capacitacionActiva = [];
let todosCoordinadores = [];

document.getElementById("whatsapp").addEventListener("input", function () {
  this.value = this.value.replace(/\D/g, "");
});

// ── AGENDA: cargar desde tabla "capacitacion" ────────────────
async function loadAgenda() {
  const container = document.getElementById("agendaContainer");
  container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:30px;color:var(--text-muted);">Cargando agenda...</div>`;

  const { data, error } = await db
    .from("capacitacion")
    .select(
      "nombre_coordinador, horario, dia, fecha_dia, abreviatura, tema, orden",
    )
    .eq("activo", true)
    .order("fecha_dia", { ascending: true })
    .order("orden", { ascending: true });

  if (error) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:#ff6b6b;">Error al cargar la agenda: ${error.message}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-muted);">No hay ponentes registrados aún.</div>`;
    return;
  }

  // 🔥 Función para convertir "7:00 p.m." a minutos numéricos
  function convertirHora(horaStr) {
    const [horaMin, periodo] = horaStr.split(" ");
    let [hora, minuto] = horaMin.split(":").map(Number);

    if (periodo.toLowerCase().includes("p") && hora !== 12) {
      hora += 12;
    }
    if (periodo.toLowerCase().includes("a") && hora === 12) {
      hora = 0;
    }

    return hora * 60 + minuto;
  }

  // 🔥 Agrupar por día
  const diasMap = {};

  data.forEach((p) => {
    let diaFormateado = p.dia;

    if (p.fecha_dia) {
      const [year, month, day] = p.fecha_dia.split("-");
      const numeroDia = day.padStart(2, "0");
      diaFormateado = `${p.dia.toUpperCase()} ${numeroDia}`;
    }

    if (!diasMap[diaFormateado]) {
      diasMap[diaFormateado] = [];
    }

    diasMap[diaFormateado].push(p);
  });

  // 🔥 Ordenar cada día por horario real
  Object.keys(diasMap).forEach((dia) => {
    diasMap[dia].sort(
      (a, b) => convertirHora(a.horario) - convertirHora(b.horario),
    );
  });

  const diasOrdenados = Object.keys(diasMap);

  // 🔥 Render inteligente (días pequeños se juntan)
  let columnas = [];
  let columnaActual = [];

  diasOrdenados.forEach((dia) => {
    const cantidad = diasMap[dia].length;

    if (cantidad === 1 && columnaActual.length > 0) {
      columnaActual.push({ dia, ponentes: diasMap[dia] });
    } else {
      if (columnaActual.length > 0) {
        columnas.push(columnaActual);
      }
      columnaActual = [{ dia, ponentes: diasMap[dia] }];
    }
  });

  if (columnaActual.length > 0) {
    columnas.push(columnaActual);
  }

  // 🔥 Render final
  container.innerHTML = columnas
    .map(
      (grupo) => `
      <div class="day-col">
        ${grupo
          .map(
            (bloque) => `
          <div class="day-header">${bloque.dia}</div>
          <div class="day-body">
            ${bloque.ponentes
              .map((p) => {
                const imgPath = `${IMG_BASE_PATH}${p.abreviatura}${IMG_EXTENSION}`;
                return `
                  <div class="speaker-card">
                    <div class="speaker-avatar" style="
                        width:60px;height:60px;border-radius:50%;overflow:hidden;
                        border:2px solid var(--cyan);flex-shrink:0;margin-bottom:6px;
                        background:var(--purple-mid);display:flex;align-items:center;justify-content:center;
                    ">
                      <img src="${imgPath}" alt="${p.nombre_coordinador}"
                        style="width:100%;height:100%;object-fit:cover;"
                        onerror="this.style.display='none';this.parentElement.innerHTML='<span style=font-size:0.7rem;color:var(--cyan);font-weight:700>${p.abreviatura.toUpperCase()}</span>'">
                    </div>
                    <h6>${p.nombre_coordinador}</h6>
                    <p>🕐 ${p.horario}</p>
                  </div>
                `;
              })
              .join("")}
          </div>
        `,
          )
          .join("")}
      </div>
    `,
    )
    .join("");
}

// ── CARGAR SELECTS DINÁMICOS ───────────────────────────────
async function loadSelects() {
  const selectCoordinador = document.getElementById("coordinador");
  const selectDia = document.getElementById("diaSel");
  const selectHora = document.getElementById("horaSel");

  selectCoordinador.innerHTML = `<option value="">Cargando...</option>`;
  selectDia.innerHTML = `<option value="">Cargando...</option>`;
  selectHora.innerHTML = `<option value="">Seleccione...</option>`;

  // 🔵 1️⃣ TRAER TODOS LOS COORDINADORES (activos e inactivos)
  const { data: dataAll, error: errorAll } = await db
    .from("capacitacion")
    .select("nombre_coordinador")
    .order("nombre_coordinador", { ascending: true });

  if (errorAll) {
    console.error("Error cargando coordinadores:", errorAll.message);
    return;
  }

  todosCoordinadores = [...new Set(dataAll.map((d) => d.nombre_coordinador))];

  selectCoordinador.innerHTML = `<option value="">Seleccione...</option>`;

  todosCoordinadores.forEach((c) => {
    selectCoordinador.innerHTML += `<option value="${c}">${c}</option>`;
  });

  // 🟢 2️⃣ TRAER SOLO CAPACITACIONES ACTIVAS (para día y hora)
  const { data: dataActiva, error: errorActiva } = await db
    .from("capacitacion")
    .select("dia, horario, fecha_dia, orden")
    .eq("activo", true)
    .order("fecha_dia", { ascending: true })
    .order("orden", { ascending: true });

  if (errorActiva) {
    console.error(
      "Error cargando capacitaciones activas:",
      errorActiva.message,
    );
    return;
  }

  capacitacionActiva = dataActiva;

  // 🔥 Días únicos solo activos
  const dias = [...new Set(dataActiva.map((d) => d.dia))];

  selectDia.innerHTML = `<option value="">Seleccione...</option>`;

  dias.forEach((d) => {
    selectDia.innerHTML += `<option value="${d}">${d}</option>`;
  });

  // Evento cambio de día
  selectDia.addEventListener("change", function () {
    actualizarHorarios(this.value);
  });
}
function convertirHora(horaStr) {
  const [horaMin, periodo] = horaStr.split(" ");
  let [hora, minuto] = horaMin.split(":").map(Number);

  if (periodo.toLowerCase().includes("p") && hora !== 12) {
    hora += 12;
  }
  if (periodo.toLowerCase().includes("a") && hora === 12) {
    hora = 0;
  }

  return hora * 60 + minuto;
}
function actualizarHorarios(diaSeleccionado) {
  const selectHora = document.getElementById("horaSel");

  selectHora.innerHTML = `<option value="">Seleccione...</option>`;

  if (!diaSeleccionado) {
    selectHora.disabled = true;
    return;
  }

  const horariosFiltrados = capacitacionActiva
    .filter((d) => d.dia === diaSeleccionado)
    .map((d) => d.horario);

  const horariosUnicos = [...new Set(horariosFiltrados)];

  horariosUnicos.sort((a, b) => convertirHora(a) - convertirHora(b));

  horariosUnicos.forEach((h) => {
    selectHora.innerHTML += `<option value="${h}">${h}</option>`;
  });

  selectHora.disabled = false;
}

// ── CARGAR ESTACAS DESDE TABLA "estaca" ─────────────────────
async function loadEstacas() {
  const selectEstaca = document.getElementById("estaca");

  selectEstaca.innerHTML = `<option value="">Cargando...</option>`;

  const { data, error } = await db
    .from("estaca")
    .select("nombre")
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) {
    console.error("Error cargando estacas:", error.message);
    selectEstaca.innerHTML = `<option value="">Error al cargar</option>`;
    return;
  }

  if (!data || data.length === 0) {
    selectEstaca.innerHTML = `<option value="">No hay estacas disponibles</option>`;
    return;
  }

  // Limpiar y cargar opciones
  selectEstaca.innerHTML = `<option value="">Seleccione...</option>`;

  data.forEach((e) => {
    selectEstaca.innerHTML += `<option value="${e.nombre}">${e.nombre}</option>`;
  });
}

// ── FORM: guardar en tabla "registro-capacitacion" ───────────
document
  .getElementById("registroForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const btn = this.querySelector(".btn-submit");
    btn.textContent = "Registrando...";
    btn.disabled = true;

    // Obtener llamamientos seleccionados dinámicamente
    const llamamientosSelected = Array.from(
      document.querySelectorAll(".checkbox-dropdown input:checked"),
    )
      .map((cb) => cb.value)
      .join(", ");
    if (!llamamientosSelected) {
      alert("Debes seleccionar al menos un llamamiento.");
      btn.textContent = "✓ Confirmar Registro";
      btn.disabled = false;
      return;
    }

    const payload = {
      nombre: document.getElementById("nombre").value.trim(),
      whatsapp: document.getElementById("whatsapp").value.trim(),
      estaca: document.getElementById("estaca").value,
      coordinador: document.getElementById("coordinador").value,
      llamamiento: llamamientosSelected,
      dia: document.getElementById("diaSel").value,
      horario: document.getElementById("horaSel").value,
      fecha_registro: new Date().toISOString(),
    };

    const { error } = await db.from("registro-capacitacion").insert([payload]);

    if (error) {
      btn.textContent = "✓ Confirmar Registro";
      btn.disabled = false;
      alert(
        `❌ Error al registrar: ${error.message}\n\nVerifica que la tabla "registro-capacitacion" exista en Supabase.`,
      );
      return;
    }

    // Éxito → enviar WhatsApp
    btn.textContent = "✅ ¡Registrado!";
    btn.style.background =
      "linear-gradient(135deg, var(--green-accent), #007a3d)";
    btn.style.color = "white";

    // 🔥 Obtener link zoom dinámicamente
    const linkZoom = await obtenerLinkZoom(payload.dia, payload.horario);

    const mensajeFinal = `
Hola ${payload.nombre},

Tu registro ha sido exitoso 🎉

📅 Día: ${payload.dia}
⏰ Hora: ${payload.horario}

🔗 Enlace Zoom:
${linkZoom || "Se enviará próximamente"}

Te esperamos 🙌
`;

    mostrarPopupExito(mensajeFinal, () => {
      // 🔥 RESET EXACTO COMO LO TENÍAS
      this.reset();

      document
        .querySelectorAll(".checkbox-dropdown input[type='checkbox']")
        .forEach((checkbox) => {
          checkbox.checked = false;
        });

      const selectedSpan = document.querySelector(".multi-select .selected");
      if (selectedSpan) {
        selectedSpan.textContent = "Seleccione...";
      }

      document.querySelectorAll(".checkbox-dropdown").forEach((dropdown) => {
        dropdown.style.display = "none";
      });

      btn.textContent = "✓ Confirmar Registro";
      btn.disabled = false;
      btn.style.background = "";
      btn.style.color = "";
    });

    setTimeout(() => {
      this.reset();
      // 🔥 Desmarcar checkboxes
      document
        .querySelectorAll(".checkbox-dropdown input[type='checkbox']")
        .forEach((checkbox) => {
          checkbox.checked = false;
        });

      // 🔥 Resetear texto visible del selector
      const selectedSpan = document.querySelector(".multi-select .selected");
      if (selectedSpan) {
        selectedSpan.textContent = "Seleccione...";
      }

      // 🔥 Cerrar dropdown si quedó abierto
      document.querySelectorAll(".checkbox-dropdown").forEach((dropdown) => {
        dropdown.style.display = "none";
      });
      btn.textContent = "✓ Confirmar Registro";
      btn.disabled = false;
      btn.style.background = "";
      btn.style.color = "";
    }, 3000);
  });

function mostrarToast(texto) {
  const toast = document.createElement("div");

  toast.textContent = texto;

  toast.style.position = "fixed";
  toast.style.bottom = "30px";
  toast.style.right = "30px";
  toast.style.background = "linear-gradient(135deg,#00c853,#009624)";
  toast.style.color = "white";
  toast.style.padding = "12px 18px";
  toast.style.borderRadius = "10px";
  toast.style.boxShadow = "0 8px 25px rgba(0,0,0,0.3)";
  toast.style.fontSize = "14px";
  toast.style.fontWeight = "600";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(20px)";
  toast.style.transition = "all 0.4s ease";
  toast.style.zIndex = "10000";

  document.body.appendChild(toast);

  // Animación entrada
  setTimeout(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  }, 50);

  // Animación salida automática
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
  }, 2500);

  // Eliminar del DOM
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
async function obtenerLinkZoom(dia, horario) {
  const { data, error } = await db
    .from("capacitacion")
    .select("zoom_link")
    .eq("dia", dia)
    .eq("horario", horario)
    .eq("activo", true)
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0].zoom_link;
}

function mostrarPopupExito(mensaje, onCloseCallback) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.top = "0";
  overlay.style.left = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = "rgba(0,0,0,0.6)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "9999";

  const popup = document.createElement("div");
  popup.style.background = "#1e1e2f";
  popup.style.padding = "30px";
  popup.style.borderRadius = "12px";
  popup.style.width = "90%";
  popup.style.maxWidth = "480px";
  popup.style.position = "relative";
  popup.style.color = "white";
  popup.style.boxShadow = "0 10px 40px rgba(0,0,0,0.4)";

  popup.innerHTML = `
    <button id="cerrarPopup" style="
      position:absolute;
      top:12px;
      right:12px;
      background:none;
      border:none;
      font-size:18px;
      color:white;
      cursor:pointer;
    ">✖</button>

    <h3 style="margin-bottom:15px;">✅ Registro Exitoso</h3>

    <div style="
  white-space:pre-line;
  font-size:14px;
  margin-bottom:20px;
  word-break: break-word;
  overflow-wrap: break-word;
  line-height:1.5;
">
  ${mensaje}
</div>

    <button id="copiarMensaje" style="
      width:100%;
      padding:10px;
      border:none;
      border-radius:8px;
      cursor:pointer;
      background:linear-gradient(135deg,#00c6ff,#0072ff);
      color:white;
      font-weight:600;
    ">📋 Copiar mensaje</button>
  `;

  overlay.appendChild(popup);
  document.body.appendChild(overlay);

  document.getElementById("copiarMensaje").addEventListener("click", () => {
    navigator.clipboard.writeText(mensaje);
    mostrarToast("✅ Mensaje copiado correctamente");
  });

  document.getElementById("cerrarPopup").addEventListener("click", () => {
    document.body.removeChild(overlay);
    if (onCloseCallback) onCloseCallback();
  });
}

// ── TEMA: cargar desde tabla "capacitacion" ────────────────
async function loadTema() {
  const themeBadge = document.getElementById("temaCapacitacion");

  if (!themeBadge) return;

  themeBadge.textContent = "Cargando tema...";

  const { data, error } = await db
    .from("capacitacion")
    .select("tema")
    .eq("activo", true)
    .order("orden", { ascending: true })
    .limit(1);

  if (error) {
    console.error("Error al cargar el tema:", error.message);
    themeBadge.textContent = "📖 Tema no disponible";
    return;
  }

  if (!data || data.length === 0) {
    themeBadge.textContent = "📖 Tema no configurado";
    return;
  }

  themeBadge.textContent = data[0].tema;
}

// ── FECHA: cargar la primera fecha de VIERNES ────────────────
async function loadFechaCapacitacion() {
  const pEtiqueta = document.getElementById("pEtiqueta");
  if (!pEtiqueta) return;

  pEtiqueta.textContent = "Cargando fecha...";

  const { data, error } = await db
    .from("capacitacion")
    .select("fecha_dia")
    .eq("dia", "VIERNES")
    .eq("activo", true)
    .order("fecha_dia", { ascending: true })
    .limit(1);

  if (error) {
    console.error("Error al cargar la fecha:", error.message);
    pEtiqueta.textContent = "Fecha no disponible";
    return;
  }

  if (!data || data.length === 0) {
    pEtiqueta.textContent = "Fecha no configurada";
    return;
  }

  const fecha = new Date(data[0].fecha_dia);
  const opciones = { month: "long", year: "numeric" };
  const fechaFormateada = fecha.toLocaleDateString("es-PE", opciones);

  // Actualiza el contenido de la etiqueta
  pEtiqueta.innerHTML = `Maestros de Seminarios e Institutos &mdash; ${fechaFormateada}`;
}

function toggleDropdown(el) {
  const dropdown = el.nextElementSibling;
  dropdown.style.display =
    dropdown.style.display === "block" ? "none" : "block";
}

// Actualizar texto de selección
const checkboxes = document.querySelectorAll(".checkbox-dropdown input");
checkboxes.forEach((cb) => {
  cb.addEventListener("change", () => {
    const selected = Array.from(
      document.querySelectorAll(".checkbox-dropdown input:checked"),
    )
      .map((c) => c.value)
      .join(", ");
    document.querySelector(".select-box .selected").textContent =
      selected || "Seleccione...";
  });
});

// Cerrar dropdown si se hace click afuera
document.addEventListener("click", function (e) {
  const multiSelects = document.querySelectorAll(".multi-select");
  multiSelects.forEach((ms) => {
    if (!ms.contains(e.target)) {
      ms.querySelector(".checkbox-dropdown").style.display = "none";
    }
  });
});

// ── INIT ────────────────────────────────────────────────────
loadAgenda();
loadTema();
loadFechaCapacitacion();
loadSelects();
loadEstacas();
