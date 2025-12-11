import crypto from "crypto"

const DEFAULT_PRICE_CENTS = 30
const DEFAULT_TTL_MS = 5 * 60 * 1000

const signingSecret = process.env.X402_SIGNING_SECRET || process.env.OSINT_SESSION_SECRET || ""
const thirdwebApiBase = process.env.THIRDWEB_X402_API_BASE || "https://x402.thirdweb.com/api"
const thirdwebSecret = process.env.THIRDWEB_X402_SECRET_KEY

export interface X402Ticket {
  walletAddress: string
  resource: string
  issuedAt: number
  expiresAt: number
  priceCents: number
  provider: "thirdweb" | "local"
  signature?: string
  paymentToken?: string
}

function signPayload(payload: Omit<X402Ticket, "signature" | "provider" | "paymentToken">) {
  if (!signingSecret) {
    throw new Error("X402 signing secret is not configured")
  }

  return crypto.createHmac("sha256", signingSecret).update(JSON.stringify(payload)).digest("hex")
}

function buildLocalTicket(walletAddress: string, resource: string): X402Ticket {
  const issuedAt = Date.now()
  const expiresAt = issuedAt + DEFAULT_TTL_MS
  const payload = {
    walletAddress,
    resource,
    issuedAt,
    expiresAt,
    priceCents: DEFAULT_PRICE_CENTS,
  }

  return {
    ...payload,
    provider: "local",
    signature: signPayload(payload),
  }
}

async function requestThirdwebPayment(walletAddress: string, resource: string): Promise<X402Ticket> {
  if (!thirdwebSecret) {
    throw new Error("THIRDWEB_X402_SECRET_KEY is not configured")
  }

  try {
    const response = await fetch(`${thirdwebApiBase}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${thirdwebSecret}`,
      },
      body: JSON.stringify({
        walletAddress,
        amount: DEFAULT_PRICE_CENTS,
        currency: "USD",
        resource,
      }),
    })

    const bodyText = await response.text()
    if (!response.ok) {
      console.error("Thirdweb X402 payment request failed", response.status, bodyText)
      throw new Error("Failed to create Thirdweb X402 payment")
    }

    const data = JSON.parse(bodyText)
    const paymentToken = data.paymentToken ?? data.token ?? data.id

    if (!paymentToken) {
      throw new Error("Thirdweb X402 response missing payment token")
    }

    return {
      walletAddress,
      resource,
      issuedAt: Date.now(),
      expiresAt: Date.now() + DEFAULT_TTL_MS,
      priceCents: DEFAULT_PRICE_CENTS,
      provider: "thirdweb",
      paymentToken,
    }
  } catch (error) {
    console.error("Error requesting Thirdweb X402 payment:", error)
    throw error
  }
}

export async function createX402Ticket(walletAddress: string, resource: string): Promise<X402Ticket> {
  return requestThirdwebPayment(walletAddress, resource)
}

function decodeLocalTicket(token: string): X402Ticket | null {
  try {
    const parsed: X402Ticket = JSON.parse(Buffer.from(token, "base64").toString("utf8"))
    return parsed
  } catch (error) {
    console.error("Failed to decode local X402 ticket", error)
    return null
  }
}

async function verifyThirdwebTicket(paymentToken: string, walletAddress: string): Promise<boolean> {
  if (!thirdwebSecret) return false

  try {
    const response = await fetch(`${thirdwebApiBase}/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${thirdwebSecret}`,
      },
      body: JSON.stringify({ paymentToken, walletAddress, amount: DEFAULT_PRICE_CENTS, currency: "USD" }),
    })

    if (!response.ok) {
      console.error("Thirdweb X402 verification failed", response.status, await response.text())
      return false
    }

    const result = await response.json()
    return Boolean(result.valid ?? result.ok ?? result.success)
  } catch (error) {
    console.error("Error verifying Thirdweb X402 payment:", error)
    return false
  }
}

export async function validateX402Ticket(ticketToken: string, walletAddress: string): Promise<{ valid: boolean; reason?: string }> {
  if (!ticketToken) {
    return { valid: false, reason: "Missing X402 payment token" }
  }

  // Attempt to treat token as local ticket first
  const asLocal = decodeLocalTicket(ticketToken)
  if (asLocal) {
    const { signature, provider, paymentToken, ...payload } = asLocal
    const expectedSig = signPayload(payload)

    if (signature !== expectedSig) {
      return { valid: false, reason: "Invalid X402 signature" }
    }

    if (Date.now() > payload.expiresAt) {
      return { valid: false, reason: "X402 payment token expired" }
    }

    if (payload.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return { valid: false, reason: "X402 token wallet mismatch" }
    }

    if (payload.priceCents < DEFAULT_PRICE_CENTS) {
      return { valid: false, reason: "Insufficient X402 payment amount" }
    }

    return { valid: true }
  }

  // If it wasn't a local ticket, try verifying with thirdweb
  const thirdwebValid = await verifyThirdwebTicket(ticketToken, walletAddress)
  if (thirdwebValid) {
    return { valid: true }
  }

  return { valid: false, reason: "Unable to validate X402 payment" }
}

export const X402_PRICE_CENTS = DEFAULT_PRICE_CENTS
export const X402_PRICE_USD = DEFAULT_PRICE_CENTS / 100
