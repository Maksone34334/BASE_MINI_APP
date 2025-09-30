"use client"

import { useState, useEffect } from "react"
import { ConnectButton, useActiveAccount, useActiveWalletChain } from "thirdweb/react"
import { createThirdwebClient } from "thirdweb"
import { createWallet, inAppWallet } from "thirdweb/wallets"
import { base } from "thirdweb/chains"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface WalletConnectProps {
  onAuthSuccess: (user: any, token: string) => void
}

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "",
})

const wallets = [
  inAppWallet({
    auth: {
      options: ["google", "email"],
    },
  }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
  createWallet("io.rabby"),
  createWallet("io.zerion.wallet"),
]

export default function WalletConnect({ onAuthSuccess }: WalletConnectProps) {
  const account = useActiveAccount()
  const chain = useActiveWalletChain()
  const [isVerifying, setIsVerifying] = useState(false)
  const [nftStatus, setNftStatus] = useState<{
    hasNFT: boolean
    balance: number
    checked: boolean
    details: any
  }>({ hasNFT: false, balance: 0, checked: false, details: null })
  const [error, setError] = useState("")

  const { toast } = useToast()

  const NFT_CONTRACT_BASE = "0x8cf392D33050F96cF6D0748486490d3dEae52564"

  useEffect(() => {
    if (account?.address) {
      verifyNFTOwnership(account.address)
    }
  }, [account?.address])

  const verifyNFTOwnership = async (address: string) => {
    setIsVerifying(true)
    try {
      const response = await fetch("/api/auth/verify-nft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: address }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to verify NFT")

      setNftStatus({
        hasNFT: data.hasNFT,
        balance: data.balance,
        checked: true,
        details: data.details,
      })

      if (data.hasNFT) {
        toast({
          title: "NFT Verified ✅",
          description: `Found ${data.balance} NFT(s) on Base Mainnet`,
        })
      } else {
        toast({
          title: "No NFT Found ❌",
          description: "You need to own an NFT from the authorized collection",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("NFT verification error:", error)
      setError(error.message)
      setNftStatus({ hasNFT: false, balance: 0, checked: true, details: null })
    } finally {
      setIsVerifying(false)
    }
  }

  const authenticateWithNFT = async () => {
    if (!account?.address || !nftStatus.hasNFT) {
      setError("Wallet not connected or NFT not found")
      return
    }

    setIsVerifying(true)
    setError("")

    try {
      const message = `Login to OSINT HUB with wallet: ${account.address}`

      // Sign message using thirdweb account
      const signature = await account.signMessage({ message })

      const response = await fetch("/api/auth/nft-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: account.address,
          signature,
          message
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Authentication failed")

      onAuthSuccess(data.user, data.token)

      toast({
        title: "Access Granted 🎉",
        description: "Welcome to OSINT HUB!",
      })
    } catch (error: any) {
      console.error("Auth error:", error)
      setError(error.message)
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsVerifying(false)
    }
  }

  return (
    <Card className="w-full max-w-md bg-card/90 border-primary/30 backdrop-blur-sm cyber-glow">
      <CardHeader>
        <CardTitle className="text-center text-primary flex items-center justify-center gap-2">
          <Shield className="w-5 h-5" />
          NFT ACCESS CONTROL
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Connect your wallet to verify NFT ownership
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive" className="bg-red-900/50 border-red-700">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Connect Button */}
        {!account ? (
          <div className="flex justify-center">
            <ConnectButton
              client={client}
              wallets={wallets}
              chain={base}
              connectModal={{
                size: "wide",
                title: "Connect Wallet",
                welcomeScreen: {
                  title: "OSINT HUB",
                  subtitle: "Connect to access NFT-gated features",
                },
              }}
            />
          </div>
        ) : (
          <>
            {/* Wallet Info */}
            <div className="flex items-center justify-between p-3 bg-background/30 rounded border border-primary/20">
              <span className="text-sm text-muted-foreground">Wallet:</span>
              <Badge variant="outline" className="border-green-500 text-green-400">
                {account.address.slice(0, 6)}...{account.address.slice(-4)}
              </Badge>
            </div>

            {/* NFT Status */}
            <div className="flex items-center justify-between p-3 bg-background/30 rounded border border-primary/20">
              <span className="text-sm text-muted-foreground">NFT Status:</span>
              {isVerifying ? (
                <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Checking...
                </Badge>
              ) : nftStatus.checked ? (
                nftStatus.hasNFT ? (
                  <Badge variant="outline" className="border-green-500 text-green-400">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified ({nftStatus.balance})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-red-500 text-red-400">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not Found
                  </Badge>
                )
              ) : (
                <Badge variant="outline">Not Checked</Badge>
              )}
            </div>

            {/* Contract Info */}
            <div className="text-xs text-muted-foreground bg-background/30 p-3 rounded border border-primary/20">
              <p className="mb-2">
                <strong>Required NFT Contract:</strong>
              </p>
              <div className="flex items-center justify-between">
                <code className="text-primary text-xs">
                  {NFT_CONTRACT_BASE.slice(0, 10)}...{NFT_CONTRACT_BASE.slice(-8)}
                </code>
                <a
                  href={`https://basescan.org/address/${NFT_CONTRACT_BASE}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs mt-1">Network: Base Mainnet</p>
              {nftStatus.details?.base && (
                <p className="text-xs text-green-400 mt-1">Balance: {nftStatus.details.base.balance} NFT(s)</p>
              )}
            </div>

            {/* Access Button */}
            {nftStatus.hasNFT && (
              <Button
                onClick={authenticateWithNFT}
                disabled={isVerifying}
                className="w-full bg-green-600 hover:bg-green-700 text-white cyber-glow text-lg py-6"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Access OSINT HUB
                  </>
                )}
              </Button>
            )}

            {/* No NFT Message */}
            {nftStatus.checked && !nftStatus.hasNFT && (
              <Alert className="bg-yellow-900/50 border-yellow-700">
                <AlertDescription className="text-yellow-200 text-sm">
                  You need to own an NFT from the authorized collection on Base Mainnet to access this service.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}