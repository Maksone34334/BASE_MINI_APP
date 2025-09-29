import { type NextRequest, NextResponse } from "next/server"
import { nftHolderLimiter, regularUserLimiter, extractWalletFromToken, isNFTHolder } from "@/lib/rate-limiter"

const API_TOKEN = process.env.OSINT_API_TOKEN
const SESSION_SECRET = process.env.OSINT_SESSION_SECRET

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    if (!API_TOKEN) {
      return NextResponse.json(
        {
          error: "Service temporarily unavailable",
          message: "OSINT API is not configured. Please contact administrator.",
        },
        { status: 503 },
      )
    }

    if (!SESSION_SECRET) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    if (!token || !token.startsWith(SESSION_SECRET)) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // Only NFT holders can access
    if (!isNFTHolder(token)) {
      return NextResponse.json({ error: "NFT required for access" }, { status: 403 })
    }

    const walletAddress = extractWalletFromToken(token)
    console.log("Token:", token)
    console.log("Extracted wallet address:", walletAddress)
    if (!walletAddress) {
      return NextResponse.json({ error: "Invalid NFT token format" }, { status: 401 })
    }

    const rateLimitResult = nftHolderLimiter.checkLimit(walletAddress)

    if (!rateLimitResult.allowed) {
      const resetDate = new Date(rateLimitResult.resetTime)
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          message: `Too many requests. Limit resets at ${resetDate.toISOString()}`,
          resetTime: rateLimitResult.resetTime,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": "30",
            "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
            "X-RateLimit-Reset": rateLimitResult.resetTime.toString(),
          },
        },
      )
    }

    const body = await request.json()
    const { request: query, limit = 100, lang = "ru" } = body

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 })
    }

    const requestPayload = {
      token: API_TOKEN,
      request: query,
      limit,
      lang,
      type: "json",
    }

    const apiResponse = await fetch("https://leakosintapi.com/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestPayload),
    })

    if (!apiResponse.ok) {
      const errorMessage = `OSINT API returned status ${apiResponse.status}`
      throw new Error(errorMessage)
    }

    const data = await apiResponse.json()

    if (data["Error code"]) {
      const errorMessage = `OSINT API Error: ${data["Error code"]}`

      if (data["Error code"] === "bad token") {
        return NextResponse.json(
          {
            error: "Invalid API Token",
            message: "The OSINT API token is invalid or expired.",
          },
          { status: 401 },
        )
      }

      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }

    const response = NextResponse.json(data)
    response.headers.set("X-RateLimit-Limit", "30")
    response.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString())
    response.headers.set("X-RateLimit-Reset", rateLimitResult.resetTime.toString())

    return response
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message || "Internal server error",
        details: "Failed to process search request",
      },
      { status: 500 },
    )
  }
}
