import { useCallback, useState } from "react"

type X402Provider = "thirdweb" | "local"

function describeError(message: string) {
  if (!message) return "Не удалось запустить оплату x402"

  if (message.includes("THIRDWEB_X402_SECRET_KEY")) {
    return "Thirdweb X402 не настроен: задайте THIRDWEB_X402_SECRET_KEY на сервере"
  }

  if (message.includes("X402 signing secret")) {
    return "X402 подпись не настроена: проверьте переменные окружения"
  }

  if (message.includes("Thirdweb X402 response missing")) {
    return "Ответ Thirdweb не содержит токен оплаты X402"
  }

  if (message.includes("Failed to create Thirdweb X402 payment")) {
    return "Не удалось создать платеж X402 в Thirdweb"
  }

  return message
}

export function useX402Payment(sessionToken?: string | null) {
  const [paymentToken, setPaymentToken] = useState<string | null>(null)
  const [provider, setProvider] = useState<X402Provider>("local")
  const [priceCents, setPriceCents] = useState<number>(30)
  const [priceUsd, setPriceUsd] = useState<number>(0.3)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [isPaying, setIsPaying] = useState(false)
  const [error, setError] = useState<string>("")

  const startPayment = useCallback(
    async (walletAddress: string, resource: string) => {
      if (!sessionToken) {
        throw new Error("Missing auth token")
      }

      setIsPaying(true)
      setError("")

      try {
        const response = await fetch("/api/payments/x402", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ walletAddress, resource }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(describeError(data.error))
        }

        setPaymentToken(data.paymentToken)
        setProvider(data.provider || "local")
        setPriceCents(data.priceCents ?? 30)
        setPriceUsd(data.priceUsd ?? (data.priceCents ? data.priceCents / 100 : 0.3))
        setExpiresAt(data.expiresAt ?? null)

        return data.paymentToken as string
      } catch (error: any) {
        const message = describeError(error.message)
        setError(message)
        throw new Error(message)
      } finally {
        setIsPaying(false)
      }
    },
    [sessionToken],
  )

  const resetPayment = useCallback(() => {
    setPaymentToken(null)
    setExpiresAt(null)
  }, [])

  return {
    paymentToken,
    provider,
    priceCents,
    priceUsd,
    expiresAt,
    isPaying,
    error,
    startPayment,
    resetPayment,
  }
}
