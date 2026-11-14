require('dotenv').config();
const express = require('express');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Faltan las variables de entorno SUPABASE_URL o SUPABASE_KEY.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Manejo amigable de errores SQL
function manejarError(res, error) {
  console.error(error);
  if (error.code === '23505') {
    return res.status(400).json({ error: 'Ya existe un registro con ese número o documento.' });
  }
  if (error.code === '23503') {
    return res.status(400).json({ error: 'No se puede eliminar porque tiene reservas asociadas.' });
  }
  return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
}

// ==================== HABITACIONES ====================
app.get('/api/habitaciones', async (req, res) => {
  const { data, error } = await supabase
    .from('habitaciones')
    .select('*')
    .order('numero', { ascending: true });
  if (error) return manejarError(res, error);
  res.json(data);
});

app.post('/api/habitaciones', async (req, res) => {
  const { numero, tipo, precio_noche, estado } = req.body;
  if (!numero || !tipo || !precio_noche) {
    return res.status(400).json({ error: 'Número, tipo y precio son obligatorios.' });
  }
  const { data, error } = await supabase
    .from('habitaciones')
    .insert([{ numero: numero.trim(), tipo, precio_noche: Number(precio_noche), estado: estado || 'Disponible' }])
    .select()
    .single();
  if (error) return manejarError(res, error);
  res.status(201).json(data);
});

app.put('/api/habitaciones/:id', async (req, res) => {
  const { id } = req.params;
  const { numero, tipo, precio_noche, estado } = req.body;
  if (!numero || !tipo || !precio_noche || !estado) {
    return res.status(400).json({ error: 'Todos los campos de la habitación son obligatorios.' });
  }
  const { data, error } = await supabase
    .from('habitaciones')
    .update({ numero: numero.trim(), tipo, precio_noche: Number(precio_noche), estado })
    .eq('id', id)
    .select()
    .single();
  if (error) return manejarError(res, error);
  res.json(data);
});

app.delete('/api/habitaciones/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('habitaciones').delete().eq('id', id);
  if (error) return manejarError(res, error);
  res.json({ mensaje: 'Habitación eliminada correctamente.' });
});

// ==================== HUÉSPEDES ====================
app.get('/api/huespedes', async (req, res) => {
  const { data, error } = await supabase
    .from('huespedes')
    .select('*')
    .order('id', { ascending: false });
  if (error) return manejarError(res, error);
  res.json(data);
});

app.post('/api/huespedes', async (req, res) => {
  const { nombre, documento, telefono, email } = req.body;
  if (!nombre || !documento || !telefono) {
    return res.status(400).json({ error: 'Nombre, documento y teléfono son obligatorios.' });
  }
  const { data, error } = await supabase
    .from('huespedes')
    .insert([{ nombre: nombre.trim(), documento: documento.trim(), telefono: telefono.trim(), email: email?.trim() || '' }])
    .select()
    .single();
  if (error) return manejarError(res, error);
  res.status(201).json(data);
});

app.put('/api/huespedes/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, documento, telefono, email } = req.body;
  if (!nombre || !documento || !telefono) {
    return res.status(400).json({ error: 'Nombre, documento y teléfono son obligatorios.' });
  }
  const { data, error } = await supabase
    .from('huespedes')
    .update({ nombre: nombre.trim(), documento: documento.trim(), telefono: telefono.trim(), email: email?.trim() || '' })
    .eq('id', id)
    .select()
    .single();
  if (error) return manejarError(res, error);
  res.json(data);
});

app.delete('/api/huespedes/:id', async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from('huespedes').delete().eq('id', id);
  if (error) return manejarError(res, error);
  res.json({ mensaje: 'Huésped eliminado correctamente.' });
});

// ==================== RESERVAS ====================
app.get('/api/reservas', async (req, res) => {
  const { data, error } = await supabase
    .from('reservas')
    .select(`
      *,
      habitaciones ( id, numero, tipo, precio_noche ),
      huespedes ( id, nombre, documento )
    `)
    .order('id', { ascending: false });
  if (error) return manejarError(res, error);
  res.json(data);
});

app.post('/api/reservas', async (req, res) => {
  const { habitacion_id, huesped_id, fecha_entrada, fecha_salida } = req.body;
  if (!habitacion_id || !huesped_id || !fecha_entrada || !fecha_salida) {
    return res.status(400).json({ error: 'Todos los campos de la reserva son obligatorios.' });
  }
  if (fecha_salida < fecha_entrada) {
    return res.status(400).json({ error: 'La fecha de salida no puede ser anterior a la fecha de entrada.' });
  }

  // Verificar que la habitación esté disponible
  const { data: hab, error: errHab } = await supabase
    .from('habitaciones')
    .select('estado')
    .eq('id', habitacion_id)
    .single();

  if (errHab) return manejarError(res, errHab);
  if (hab.estado !== 'Disponible') {
    return res.status(400).json({ error: 'La habitación seleccionada no está disponible.' });
  }

  const { data, error } = await supabase
    .from('reservas')
    .insert([{ habitacion_id, huesped_id, fecha_entrada, fecha_salida, estado: 'Activa' }])
    .select()
    .single();

  if (error) return manejarError(res, error);

  // Marcar habitación como Ocupada
  await supabase.from('habitaciones').update({ estado: 'Ocupada' }).eq('id', habitacion_id);

  res.status(201).json(data);
});

app.put('/api/reservas/:id', async (req, res) => {
  const { id } = req.params;
  const { habitacion_id, huesped_id, fecha_entrada, fecha_salida, estado } = req.body;
  if (!habitacion_id || !huesped_id || !fecha_entrada || !fecha_salida || !estado) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }
  if (fecha_salida < fecha_entrada) {
    return res.status(400).json({ error: 'La fecha de salida no puede ser anterior a la de entrada.' });
  }

  const { data: reservaAnterior } = await supabase
    .from('reservas')
    .select('habitacion_id, estado')
    .eq('id', id)
    .single();

  const { data, error } = await supabase
    .from('reservas')
    .update({ habitacion_id, huesped_id, fecha_entrada, fecha_salida, estado })
    .eq('id', id)
    .select()
    .single();

  if (error) return manejarError(res, error);

  // Sincronizar disponibilidad si cambió habitación o estado
  if (reservaAnterior && reservaAnterior.habitacion_id != habitacion_id) {
    await supabase.from('habitaciones').update({ estado: 'Disponible' }).eq('id', reservaAnterior.habitacion_id);
  }
  const nuevoEstadoHab = estado === 'Activa' ? 'Ocupada' : 'Disponible';
  await supabase.from('habitaciones').update({ estado: nuevoEstadoHab }).eq('id', habitacion_id);

  res.json(data);
});

// Acción específica: Marcar salida (Check-out)
app.patch('/api/reservas/:id/salida', async (req, res) => {
  const { id } = req.params;

  const { data: reserva, error: errBusca } = await supabase
    .from('reservas')
    .select('*')
    .eq('id', id)
    .single();

  if (errBusca) return manejarError(res, errBusca);
  if (reserva.estado === 'Finalizada') {
    return res.status(400).json({ error: 'Esta reserva ya tiene marcada su salida.' });
  }

  const { data, error } = await supabase
    .from('reservas')
    .update({ estado: 'Finalizada' })
    .eq('id', id)
    .select()
    .single();

  if (error) return manejarError(res, error);

  // Liberar la habitación
  await supabase.from('habitaciones').update({ estado: 'Disponible' }).eq('id', reserva.habitacion_id);

  res.json(data);
});

app.delete('/api/reservas/:id', async (req, res) => {
  const { id } = req.params;

  const { data: reserva } = await supabase
    .from('reservas')
    .select('habitacion_id, estado')
    .eq('id', id)
    .single();

  const { error } = await supabase.from('reservas').delete().eq('id', id);
  if (error) return manejarError(res, error);

  if (reserva && reserva.estado === 'Activa') {
    await supabase.from('habitaciones').update({ estado: 'Disponible' }).eq('id', reserva.habitacion_id);
  }

  res.json({ mensaje: 'Reserva eliminada correctamente.' });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
