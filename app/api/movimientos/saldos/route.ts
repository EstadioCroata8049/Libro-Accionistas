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

    const accionistaIds = body?.accionista_ids;
    if (!Array.isArray(accionistaIds) || accionistaIds.length === 0) {
        return NextResponse.json(
            { error: "accionista_ids array is required" },
            { status: 400 },
        );
    }

    // Obtener todos los movimientos de los accionistas solicitados
    const { data: movs, error } = await supabaseAdmin
        .from("movimientos")
        .select("accionista_id, saldo, fecha_transferencia")
        .in("accionista_id", accionistaIds)
        .order("fecha_transferencia", { ascending: true });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Construir mapa de último saldo por accionista
    const latestSaldoByAccionistaId: Record<string, number> = {};
    if (movs) {
        for (const m of movs as any[]) {
            if (m?.accionista_id && m?.saldo != null) {
                latestSaldoByAccionistaId[String(m.accionista_id)] = Number(m.saldo);
            }
        }
    }

    return NextResponse.json({ saldos: latestSaldoByAccionistaId });
}
