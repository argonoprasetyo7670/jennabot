import { NextRequest, NextResponse } from "next/server"

const AUTH_COOKIE_NAMES = [
  "authjs.callback-url",
  "authjs.csrf-token",
  "authjs.nonce",
  "authjs.pkce.code_verifier",
  "authjs.session-token",
  "authjs.state",
  "__Host-authjs.csrf-token",
  "__Secure-authjs.callback-url",
  "__Secure-authjs.nonce",
  "__Secure-authjs.pkce.code_verifier",
  "__Secure-authjs.session-token",
  "__Secure-authjs.state",
]

function clearAuthCookies(response: NextResponse) {
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      secure: name.startsWith("__Secure-") || name.startsWith("__Host-"),
      httpOnly: true,
      sameSite: "lax",
    })

    if (!name.startsWith("__Host-")) {
      response.cookies.set(name, "", {
        path: "/",
        domain: ".jennabot.pro",
        maxAge: 0,
        expires: new Date(0),
        secure: name.startsWith("__Secure-"),
        httpOnly: true,
        sameSite: "lax",
      })
    }
  }

  return response
}

export function POST() {
  return clearAuthCookies(NextResponse.json({ ok: true }))
}

export function GET(req: NextRequest) {
  return clearAuthCookies(NextResponse.redirect(new URL("/", req.url)))
}
