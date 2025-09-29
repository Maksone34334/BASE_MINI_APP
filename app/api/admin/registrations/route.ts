import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const PENDING_REGISTRATIONS: Array<{
  id: string
  email: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
}> = []

const USERS: Array<{
  id: string
  email: string
  login: string
  password: string
  status: "active" | "pending" | "blocked"
  createdAt: string
}> = []

export async function GET() {
  return NextResponse.json({
    pendingRegistrations: PENDING_REGISTRATIONS,
    total: PENDING_REGISTRATIONS.length,
  })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { registrationId, action, login, password } = body

    if (!registrationId || !action) {
      return NextResponse.json({ error: "Registration ID and action are required" }, { status: 400 })
    }

    const registration = PENDING_REGISTRATIONS.find((r) => r.id === registrationId)
    if (!registration) {
      return NextResponse.json({ error: "Registration not found" }, { status: 404 })
    }

    if (action === "approve") {
      if (!login || !password) {
        return NextResponse.json({ error: "Login and password are required for approval" }, { status: 400 })
      }

      const newUser = {
        id: Date.now().toString(),
        email: registration.email,
        login,
        password,
        status: "active" as const,
        createdAt: new Date().toISOString(),
      }

      USERS.push(newUser)
      registration.status = "approved"

      return NextResponse.json({
        success: true,
        message: "Registration approved and user created",
        user: { ...newUser, password: undefined },
      })
    } else if (action === "reject") {
      registration.status = "rejected"

      return NextResponse.json({
        success: true,
        message: "Registration rejected",
      })
    } else {
      return NextResponse.json({ error: "Invalid action. Use 'approve' or 'reject'" }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
