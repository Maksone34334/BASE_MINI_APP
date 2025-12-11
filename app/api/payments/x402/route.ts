import { type NextRequest, NextResponse } from "next/server"
import { extractWalletFromToken, isNFTHolder } from "@/lib/rate-limiter"
import { createX402Ticket, X402_PRICE_CENTS, X402_PRICE_USD } from "@/lib/x402"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Authorization required" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    if (!isNFTHolder(token)) {
      return NextResponse.json({ error: "NFT holder token required" }, { status: 403 })
    }

    const walletAddress = extractWalletFromToken(token)
    if (!walletAddress) {
      return NextResponse.json({ error: "Unable to extract wallet from token" }, { status: 400 })
    }

    const body = await request.json()
    const resource = body?.resource || "osint-search"

    const ticket = await createX402Ticket(walletAddress, resource)
    const paymentToken =
      ticket.provider === "local"
        ? Buffer.from(JSON.stringify(ticket)).toString("base64")
        : ticket.paymentToken

    if (!paymentToken) {
      return NextResponse.json({ error: "Failed to prepare X402 payment" }, { status: 500 })
    }

    return NextResponse.json({
      paymentToken,
      provider: ticket.provider,
      priceCents: X402_PRICE_CENTS,
      priceUsd: X402_PRICE_USD,
      expiresAt: ticket.expiresAt ?? null,
    })
  } catch (error: any) {
    const message = error?.message || "Failed to start X402 payment"
    const status = message.includes("THIRDWEB_X402_SECRET_KEY") ? 503 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
