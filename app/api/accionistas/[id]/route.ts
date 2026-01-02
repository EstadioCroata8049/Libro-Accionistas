import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(
  _request: Request,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    const missing: string[] = [];
    if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");

    return NextResponse.json(
      { error: `Missing env vars: ${missing.join(", ")}` },
      { status: 500 }
    );
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { error: movError } = await supabaseAdmin
    .from("movimientos")
    .delete()
    .eq("accionista_id", id);

  if (movError) {
    return NextResponse.json(
      { error: movError.message },
      { status: 400 }
    );
  }

  const { error: accError, count } = await supabaseAdmin
    .from("accionistas")
    .delete({ count: "exact" })
    .eq("id", id);

  if (accError) {
    return NextResponse.json(
      { error: accError.message },
      { status: 400 }
    );
  }

  if (!count || count <= 0) {
    return NextResponse.json(
      { error: "No rows deleted" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
