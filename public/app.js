const SERVICIOS = [
  { nombre: "Corte clásico", detalle: "L 150 · 30 min" },
  { nombre: "Corte + barba", detalle: "L 250 · 50 min" },
  { nombre: "Arreglo de barba", detalle: "L 120 · 20 min" },
  { nombre: "Fade / degradado", detalle: "L 200 · 40 min" },
  { nombre: "Corte infantil", detalle: "L 120 · 25 min" },
];
const BARBEROS = ["Cualquiera", "Fernando", "Carlos", "Luis"];
const HORAS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

const form = document.getElementById("form-cita");
const fechaInput = document.getElementById("fecha");
const horasEl = document.getElementById("horas");
const errorEl = document.getElementById("error");
const enviarBtn = document.getElementById("enviar");
const exitoEl = document.getElementById("exito");

const chip = (name, value, label, detalle = "", checked = false) => {
  const el = document.createElement("label");
  el.className = "chip";
  el.innerHTML = `<input type="radio" name="${name}" ${checked ? "checked" : ""} /><span></span>`;
  el.querySelector("input").value = value;
  const span = el.querySelector("span");
  span.textContent = label;
  if (detalle) {
    const small = document.createElement("small");
    small.textContent = detalle;
    span.append(small);
  }
  return el;
};

document.getElementById("servicios").append(...SERVICIOS.map((s) => chip("servicio", s.nombre, s.nombre, s.detalle)));
document.getElementById("barberos").append(...BARBEROS.map((b, i) => chip("barbero", b, b, "", i === 0)));

const localISO = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
fechaInput.min = localISO(new Date());
const max = new Date();
max.setDate(max.getDate() + 30);
fechaInput.max = localISO(max);

const hint = (text) => {
  horasEl.innerHTML = "";
  const p = document.createElement("p");
  p.className = "hint";
  p.textContent = text;
  horasEl.append(p);
};

async function cargarHoras() {
  const fecha = fechaInput.value;
  const barbero = form.barbero.value;
  if (!fecha) return hint("Elige una fecha para ver horarios disponibles.");
  if (new Date(`${fecha}T12:00:00`).getDay() === 0) return hint("Los domingos estamos cerrados. Elige otro día.");

  hint("Cargando horarios…");
  let ocupadas = [];
  try {
    const res = await fetch(`/api/citas?fecha=${fecha}&barbero=${encodeURIComponent(barbero)}`);
    if (res.ok) ({ ocupadas } = await res.json());
  } catch {}

  const ahora = new Date();
  const esHoy = fecha === localISO(ahora);
  horasEl.innerHTML = "";
  for (const h of HORAS) {
    const [hh] = h.split(":").map(Number);
    const etiqueta = `${((hh + 11) % 12) + 1}:00 ${hh < 12 ? "a.m." : "p.m."}`;
    const el = chip("hora", h, etiqueta);
    const pasada = esHoy && hh <= ahora.getHours();
    if (ocupadas.includes(h) || pasada) el.querySelector("input").disabled = true;
    horasEl.append(el);
  }
}

fechaInput.addEventListener("change", cargarHoras);
document.getElementById("barberos").addEventListener("change", cargarHoras);

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorEl.textContent = "";
  const data = Object.fromEntries(new FormData(form));

  if (!data.servicio) return (errorEl.textContent = "Selecciona un servicio.");
  if (!data.fecha) return (errorEl.textContent = "Selecciona una fecha.");
  if (!data.hora) return (errorEl.textContent = "Selecciona una hora disponible.");
  if (!form.nombre.checkValidity()) return (errorEl.textContent = "Ingresa tu nombre.");
  if (!/^[0-9+\-\s()]{8,20}$/.test(data.telefono.trim())) return (errorEl.textContent = "Ingresa un teléfono válido.");

  enviarBtn.disabled = true;
  enviarBtn.textContent = "Reservando…";
  try {
    const res = await fetch("/api/citas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      errorEl.textContent = json.error || "No se pudo reservar. Intenta de nuevo.";
      if (res.status === 409) cargarHoras();
      return;
    }
    const fechaTxt = new Date(`${data.fecha}T12:00:00`).toLocaleDateString("es-HN", { weekday: "long", day: "numeric", month: "long" });
    const resumen = document.getElementById("resumen");
    resumen.innerHTML = "";
    resumen.append(
      `Gracias, ${data.nombre.split(" ")[0]}. Te esperamos el `,
      Object.assign(document.createElement("strong"), { textContent: `${fechaTxt} a las ${horasEl.querySelector("input:checked + span").textContent}` }),
      ` para tu ${data.servicio.toLowerCase()} con ${data.barbero === "Cualquiera" ? "el próximo barbero disponible" : data.barbero}. Cita #${json.id}.`
    );
    form.hidden = true;
    exitoEl.hidden = false;
  } catch {
    errorEl.textContent = "Error de conexión. Intenta de nuevo.";
  } finally {
    enviarBtn.disabled = false;
    enviarBtn.textContent = "Confirmar cita";
  }
});

document.getElementById("otra").addEventListener("click", () => {
  form.reset();
  hint("Elige una fecha para ver horarios disponibles.");
  exitoEl.hidden = true;
  form.hidden = false;
});
