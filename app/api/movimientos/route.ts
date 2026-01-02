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

  const { data, error, count } = await supabaseAdmin
    .from("movimientos")
    .select("*", { count: "exact" })
    .eq("accionista_id", accionistaId)
    .order("fecha_transferencia", { ascending: true })
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
    fecha_transferencia: body.fecha_transferencia ?? null,
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
      updatePayload[key] = body[key];
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
