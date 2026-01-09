import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function requireLogin() {
  const cookieStore = await cookies();
  const loggedIn = cookieStore.get("logged_in")?.value === "1";
  if (!loggedIn) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function getSupabaseAdmin() {
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

function normalizeDate(dateStr: string | null): string | null {
  if (!dateStr) return null;

  // Si ya viene en formato ISO YYYY-MM-DD, devolver tal cual
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return dateStr;
  }

  // Intentar detectar formato DD-MM-YYYY o DD/MM/YYYY con posibles espacios
  // Ejemplos: "22-09-1954", "22 - 09 - 1954", "22/09/1954"
  const match = dateStr.match(/^(\d{1,2})\s*[-/]\s*(\d{1,2})\s*[-/]\s*(\d{4})$/);
  if (match) {
    const [_, day, month, year] = match;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  // Si no coincide con ninguno, devolver original (probablemente falle validación de BD o se guarde mal, pero intentamos lo mejor)
  return dateStr;
}

export async function GET(request: Request) {
  const notLogged = await requireLogin();
  if (notLogged) return notLogged;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

    return NextResponse.json(
      { error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const accionistaId = url.searchParams.get("accionista_id");
  const pageRaw = url.searchParams.get("page") ?? "0";
  const pageSizeRaw = url.searchParams.get("page_size") ?? "50";

  if (!accionistaId) {
    return NextResponse.json(
      { error: "accionista_id is required" },
      { status: 400 },
    );
  }

  const page = Number(pageRaw);
  const pageSize = Number(pageSizeRaw);
  if (!Number.isFinite(page) || page < 0 || !Number.isFinite(pageSize) || pageSize <= 0) {
    return NextResponse.json(
      { error: "Invalid pagination params" },
      { status: 400 },
    );
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  // AUTO-FIX: Detectar y corregir fechas con año 18xx (error común de tipeo por 19xx)
  // Esto se ejecuta antes de devolver los datos para asegurar que el usuario vea el orden correcto
  const { data: badDates } = await supabaseAdmin
    .from("movimientos")
    .select("id, fecha_transferencia")
    .lt("fecha_transferencia", "1900-01-01")
    .limit(50); // Límite por seguridad

  if (badDates && badDates.length > 0) {
    for (const record of badDates) {
      if (record.fecha_transferencia && record.fecha_transferencia.startsWith("18")) {
        const newDate = record.fecha_transferencia.replace(/^18/, "19");
        await supabaseAdmin
          .from("movimientos")
          .update({ fecha_transferencia: newDate })
          .eq("id", record.id);
      }
    }
  }

  const { data, error, count } = await supabaseAdmin
    .from("movimientos")
    .select("*", { count: "exact" })
    .eq("accionista_id", accionistaId)
    .order("fecha_transferencia", { ascending: true })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: data ?? [], count: count ?? 0 });
}

export async function POST(request: Request) {
  const notLogged = await requireLogin();
  if (notLogged) return notLogged;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

    return NextResponse.json(
      { error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body?.accionista_id) {
    return NextResponse.json({ error: "accionista_id is required" }, { status: 400 });
  }

  const insertPayload = {
    accionista_id: body.accionista_id,
    fecha_transferencia: normalizeDate(body.fecha_transferencia ?? null),
    numero_transferencia: body.numero_transferencia ?? null,
    titulo_inutilizado: body.titulo_inutilizado ?? null,
    comprado_a: body.comprado_a ?? null,
    vendido_a: body.vendido_a ?? null,
    titulo_nuevo_comprador: body.titulo_nuevo_comprador ?? null,
    titulo_nuevo_vendedor: body.titulo_nuevo_vendedor ?? null,
    numero_titulo_emitido: body.numero_titulo_emitido ?? null,
    compras: body.compras ?? null,
    ventas: body.ventas ?? null,
    saldo: body.saldo ?? null,
    observaciones: body.observaciones ?? null,
  };

  const { data, error } = await supabaseAdmin
    .from("movimientos")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function PATCH(request: Request) {
  const notLogged = await requireLogin();
  if (notLogged) return notLogged;

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

    return NextResponse.json(
      { error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 },
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const id = body?.id;
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const allowedKeys = [
    "fecha_transferencia",
    "numero_transferencia",
    "titulo_inutilizado",
    "comprado_a",
    "vendido_a",
    "titulo_nuevo_comprador",
    "titulo_nuevo_vendedor",
    "numero_titulo_emitido",
    "compras",
    "ventas",
    "saldo",
    "observaciones",
  ];

  const updatePayload: Record<string, any> = {};
  for (const key of allowedKeys) {
    if (body[key] !== undefined) {
      if (key === "fecha_transferencia") {
        updatePayload[key] = normalizeDate(body[key]);
      } else {
        updatePayload[key] = body[key];
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from("movimientos")
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
