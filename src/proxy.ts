import { NextResponse } from "next/server"
import { auth } from "@/auth"

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith("/app")) {
    return NextResponse.redirect(new URL("/login", req.nextUrl))
  }
})

export const config = {
  matcher: ["/app/:path*"],
}
