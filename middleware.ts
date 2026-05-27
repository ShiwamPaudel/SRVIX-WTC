import { auth } from "@/auth";
import { canAccessPath } from "@/lib/permissions";

const publicRoutes = ["/login", "/api/auth"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  if (!req.auth && !isPublic) {
    const url = new URL("/login", req.nextUrl.origin);
    url.searchParams.set("callbackUrl", req.nextUrl.href);
    return Response.redirect(url);
  }
  if (isPublic) return;

  if (req.auth?.user && !pathname.startsWith("/api") && !canAccessPath(pathname, req.auth.user.role)) {
    return Response.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon-srvix.png|manifest.webmanifest|sw.js|icons).*)"],
};
