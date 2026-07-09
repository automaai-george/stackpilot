import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESSAO, uidDoToken } from "@/lib/auth";

// Protege o app: sem sessão válida, visitante vai para a landing page
// (rota "/") ou para o login (demais rotas). APIs respondem 401.
export async function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_SESSAO)?.value;
  if ((await uidDoToken(token)) !== null) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/lp", request.url));
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // tudo, exceto páginas públicas, o cron (que se protege sozinho),
  // estáticos e ícones
  matcher: [
    "/((?!lp|login|registro|api/login|api/registro|api/cron|manifest\\.webmanifest|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|svg|jpg|ico)$).*)",
  ],
};
