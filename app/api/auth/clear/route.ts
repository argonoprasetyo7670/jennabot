import { NextResponse } from "next/server"

const AUTH_TRANSIENT_COOKIES = [
  "authjs.callback-url",
  "authjs.csrf-token",
  "authjs.nonce",
  "authjs.pkce.code_verifier",
  "authjs.state",
  "__Host-authjs.csrf-token",
  "__Secure-authjs.callback-url",
  "__Secure-authjs.nonce",
  "__Secure-authjs.pkce.code_verifier",
  "__Secure-authjs.state",
]

function clearAuthCookies() {
  const response = NextResponse.json({ ok: true })

  for (const name of AUTH_TRANSIENT_COOKIES) {
    response.cookies.set(name, "", {
      path: "/",
      maxAge: 0,
      expires: new Date(0),
      secure: name.startsWith("__Secure-") || name.startsWith("__Host-"),
      httpOnly: true,
      sameSite: "lax",
    })
  }

  return response
}

export function POST() {
  return clearAuthCookies()
}

export function GET() {
  return clearAuthCookies()
}
