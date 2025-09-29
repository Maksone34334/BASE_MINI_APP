import { type NextRequest, NextResponse } from "next/server"
import { findUser } from "../users"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { login, password } = body

    if (!login || !password) {
      return NextResponse.json({ error: "Login and password are required" }, { status: 400 })
    }

    const user = findUser(login, password)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const sessionSecret = process.env.OSINT_SESSION_SECRET
    if (!sessionSecret) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const token = `${sessionSecret}_${user.id}_${Date.now()}`
    const { password: _, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      token,
    })
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
