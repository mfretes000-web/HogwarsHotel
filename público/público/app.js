let habitaciones = [];
let huespedes = [];
let reservas = [];

// Escapar HTML para evitar inyecciones
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function mostrarAlerta(mensaje, tipo = 'ok') {
  const el = document.getElementById('alerta');
  el.textContent = mensaje;
  el.className = `alerta ${tipo}`;
  setTimeout(() => {
    el.className = 'alerta oculto';
  }, 4000);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error en la operación');
  return data;
}

// Navegación
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.seccion').forEach(s => s.classList.remove('activa'));
    btn.classList.add('active');
    document.getElementById(`sec-${btn.dataset.section}`).classList.add('activa');
  });
});

// Cargar todos los datos
async function cargarTodo() {
  try {
    [habitaciones, huespedes, reservas] = await Promise.all([
      api('/api/habitaciones'),
      api('/api/huespedes'),
      api('/api/reservas')
    ]);
    renderEstadisticas();
    renderHabitaciones();
    renderHuespedes();
    renderReservas();
    cargarSelectsReserva();
  } catch (err) {
    mostrarAlerta(err.message, 'err');
  }
}

function renderEstadisticas() {
  document.getElementById('stat-hab').textContent = habitaciones.length;
  document.getElementById('stat-disp').textContent = habitaciones.filter(h => h.estado === 'Disponible').length;
  document.getElementById('stat-huesp').textContent = huespedes.length;
  document.getElementById('stat-activas').textContent = reservas.filter(r => r.estado === 'Activa').length;
}

// ==================== HABITACIONES ====================
function renderHabitaciones() {
  const tbody = document.getElementById('tabla-habitaciones');
  tbody.innerHTML = habitaciones.map(h => `
    <tr>
      <td>${esc(h.numero)}</td>
      <td>${esc(h.tipo)}</td>
      <td>Gs. ${Number(h.precio_noche).toLocaleString('es-PY')}</td>
      <td><span class="badge ${h.estado === 'Disponible' ? 'badge-ok' : 'badge-busy'}">${esc(h.estado)}</span></td>
      <td>
        <button class="btn btn-warning btn-sm" onclick="editarHabitacion(${h.id})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarHabitacion(${h.id})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('form-habitacion').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('hab-id').value;
  const payload = {
    numero: document.getElementById('hab-numero').value,
    tipo: document.getElementById('hab-tipo').value,
    precio_noche: document.getElementById('hab-precio').value,
    estado: document.getElementById('hab-estado').value
  };
  try {
    if (id) {
      await api(`/api/habitaciones/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      mostrarAlerta('Habitación actualizada.');
    } else {
      await api('/api/habitaciones', { method: 'POST', body: JSON.stringify(payload) });
      mostrarAlerta('Habitación agregada.');
    }
    resetFormHab();
    await cargarTodo();
  } catch (err) {
    mostrarAlerta(err.message, 'err');
  }
});

window.editarHabitacion = (id) => {
  const h = habitaciones.find(x => x.id === id);
  if (!h) return;
  document.getElementById('hab-id').value = h.id;
  document.getElementById('hab-numero').value = h.numero;
  document.getElementById('hab-tipo').value = h.tipo;
  document.getElementById('hab-precio').value = h.precio_noche;
  document.getElementById('hab-estado').value = h.estado;
  document.getElementById('titulo-form-hab').textContent = 'Editar Habitación';
  document.getElementById('btn-cancelar-hab').classList.remove('oculto');
};

window.eliminarHabitacion = async (id) => {
  if (!confirm('¿Seguro que desea eliminar esta habitación?')) return;
  try {
    await api(`/api/habitaciones/${id}`, { method: 'DELETE' });
    mostrarAlerta('Habitación eliminada.');
    await cargarTodo();
  } catch (err) {
    mostrarAlerta(err.message, 'err');
  }
};

function resetFormHab() {
  document.getElementById('form-habitacion').reset();
  document.getElementById('hab-id').value = '';
  document.getElementById('titulo-form-hab').textContent = 'Agregar Habitación';
  document.getElementById('btn-cancelar-hab').classList.add('oculto');
}
document.getElementById('btn-cancelar-hab').addEventListener('click', resetFormHab);

// ==================== HUÉSPEDES ====================
function renderHuespedes() {
  const tbody = document.getElementById('tabla-huespedes');
  tbody.innerHTML = huespedes.map(h => `
    <tr>
      <td>${esc(h.nombre)}</td>
      <td>${esc(h.documento)}</td>
      <td>${esc(h.telefono)}</td>
      <td>${esc(h.email || '-')}</td>
      <td>
        <button class="btn btn-warning btn-sm" onclick="editarHuesped(${h.id})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarHuesped(${h.id})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('form-huesped').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('hue-id').value;
  const payload = {
    nombre: document.getElementById('hue-nombre').value,
    documento: document.getElementById('hue-doc').value,
    telefono: document.getElementById('hue-tel').value,
    email: document.getElementById('hue-email').value
  };
  try {
    if (id) {
      await api(`/api/huespedes/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      mostrarAlerta('Huésped actualizado.');
    } else {
      await api('/api/huespedes', { method: 'POST', body: JSON.stringify(payload) });
      mostrarAlerta('Huésped registrado.');
    }
    resetFormHue();
    await cargarTodo();
  } catch (err) {
    mostrarAlerta(err.message, 'err');
  }
});

window.editarHuesped = (id) => {
  const h = huespedes.find(x => x.id === id);
  if (!h) return;
  document.getElementById('hue-id').value = h.id;
  document.getElementById('hue-nombre').value = h.nombre;
  document.getElementById('hue-doc').value = h.documento;
  document.getElementById('hue-tel').value = h.telefono;
  document.getElementById('hue-email').value = h.email || '';
  document.getElementById('titulo-form-hue').textContent = 'Editar Huésped';
  document.getElementById('btn-cancelar-hue').classList.remove('oculto');
};

window.eliminarHuesped = async (id) => {
  if (!confirm('¿Seguro que desea eliminar este huésped?')) return;
  try {
    await api(`/api/huespedes/${id}`, { method: 'DELETE' });
    mostrarAlerta('Huésped eliminado.');
    await cargarTodo();
  } catch (err) {
    mostrarAlerta(err.message, 'err');
  }
};

function resetFormHue() {
  document.getElementById('form-huesped').reset();
  document.getElementById('hue-id').value = '';
  document.getElementById('titulo-form-hue').textContent = 'Registrar Huésped';
  document.getElementById('btn-cancelar-hue').classList.add('oculto');
}
document.getElementById('btn-cancelar-hue').addEventListener('click', resetFormHue);

// ==================== RESERVAS ====================
function cargarSelectsReserva(habActualId = null) {
  const selHab = document.getElementById('res-habitacion');
  const selHue = document.getElementById('res-huesped');

  const habsFiltradas = habitaciones.filter(h => h.estado === 'Disponible' || h.id == habActualId);
  selHab.innerHTML = '<option value="">-- Seleccione habitación --</option>' +
    habsFiltradas.map(h => `<option value="${h.id}">Hab. ${esc(h.numero)} (${esc(h.tipo)})</option>`).join('');

  selHue.innerHTML = '<option value="">-- Seleccione huésped --</option>' +
    huespedes.map(h => `<option value="${h.id}">${esc(h.nombre)} (CI: ${esc(h.documento)})</option>`).join('');
}

function renderReservas() {
  const tbody = document.getElementById('tabla-reservas');
  tbody.innerHTML = reservas.map(r => `
    <tr>
      <td>#${r.id}</td>
      <td>Hab. ${esc(r.habitaciones?.numero || r.habitacion_id)} (${esc(r.habitaciones?.tipo || '')})</td>
      <td>${esc(r.huespedes?.nombre || r.huesped_id)}</td>
      <td>${esc(r.fecha_entrada)}</td>
      <td>${esc(r.fecha_salida)}</td>
      <td><span class="badge ${r.estado === 'Activa' ? 'badge-info' : 'badge-ok'}">${esc(r.estado)}</span></td>
      <td>
        ${r.estado === 'Activa' ? `<button class="btn btn-success btn-sm" onclick="marcarSalida(${r.id})">Marcar Salida</button>` : ''}
        <button class="btn btn-warning btn-sm" onclick="editarReserva(${r.id})">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="eliminarReserva(${r.id})">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('form-reserva').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('res-id').value;
  const payload = {
    habitacion_id: Number(document.getElementById('res-habitacion').value),
    huesped_id: Number(document.getElementById('res-huesped').value),
    fecha_entrada: document.getElementById('res-entrada').value,
    fecha_salida: document.getElementById('res-salida').value,
    estado: document.getElementById('res-estado').value
  };
  try {
    if (id) {
      await api(`/api/reservas/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      mostrarAlerta('Reserva actualizada correctamente.');
    } else {
      await api('/api/reservas', { method: 'POST', body: JSON.stringify(payload) });
      mostrarAlerta('Reserva registrada y habitación ocupada.');
    }
    resetFormRes();
    await cargarTodo();
  } catch (err) {
    mostrarAlerta(err.message, 'err');
  }
});

window.marcarSalida = async (id) => {
  if (!confirm('¿Confirmar la salida (check-out) del huésped? La habitación pasará a Disponible.')) return;
  try {
    await api(`/api/reservas/${id}/salida`, { method: 'PATCH' });
    mostrarAlerta('Salida marcada correctamente. Habitación liberada.');
    await cargarTodo();
  } catch (err) {
    mostrarAlerta(err.message, 'err');
  }
};

window.editarReserva = (id) => {
  const r = reservas.find(x => x.id === id);
  if (!r) return;
  cargarSelectsReserva(r.habitacion_id);
  document.getElementById('res-id').value = r.id;
  document.getElementById('res-habitacion').value = r.habitacion_id;
  document.getElementById('res-huesped').value = r.huesped_id;
  document.getElementById('res-entrada').value = r.fecha_entrada;
  document.getElementById('res-salida').value = r.fecha_salida;
  document.getElementById('res-estado').value = r.estado;
  document.getElementById('grupo-res-estado').classList.remove('oculto');
  document.getElementById('titulo-form-res').textContent = 'Editar Reserva';
  document.getElementById('btn-cancelar-res').classList.remove('oculto');
};

window.eliminarReserva = async (id) => {
  if (!confirm('¿Seguro que desea eliminar esta reserva?')) return;
  try {
    await api(`/api/reservas/${id}`, { method: 'DELETE' });
    mostrarAlerta('Reserva eliminada.');
    await cargarTodo();
  } catch (err) {
    mostrarAlerta(err.message, 'err');
  }
};

function resetFormRes() {
  document.getElementById('form-reserva').reset();
  document.getElementById('res-id').value = '';
  document.getElementById('grupo-res-estado').classList.add('oculto');
  document.getElementById('titulo-form-res').textContent = 'Registrar Nueva Reserva';
  document.getElementById('btn-cancelar-res').classList.add('oculto');
  cargarSelectsReserva();
}
document.getElementById('btn-cancelar-res').addEventListener('click', resetFormRes);

// Iniciar
cargarTodo();
