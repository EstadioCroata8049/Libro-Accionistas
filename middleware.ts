import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const loggedIn = request.cookies.get("logged_in")?.value === "1";
  const hasEmpresa = !!request.cookies.get("current_empresa_id")?.value;

  // Rutas protegidas que requieren login
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/admin")) {
    if (!loggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }

    // Dashboard requiere empresa seleccionada
    if (pathname.startsWith("/dashboard") && !hasEmpresa) {
      const url = request.nextUrl.clone();
      url.pathname = "/select-empresa";
      return NextResponse.redirect(url);
    }
  }

  // Selector de empresa requiere login
  if (pathname.startsWith("/select-empresa")) {
    if (!loggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/select-empresa/:path*"],
};
