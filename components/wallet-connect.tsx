"use client"

import { useState, useEffect } from "react"
import { useConnect, useAccount, useDisconnect, useSignMessage } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wallet, Shield, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface WalletConnectProps {
  onAuthSuccess: (user: any, token: string) => void
}

export default function WalletConnect({ onAuthSuccess }: WalletConnectProps) {
  const { connect, connectors, isPending: isConnecting } = useConnect()
  const { address: walletAddress, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()

  const [isVerifying, setIsVerifying] = useState(false)
  const [nftStatus, setNftStatus] = useState<{
    hasNFT: boolean
    balance: number
    checked: boolean
    networks: Array<{ name: string; balance: number; contractAddress: string }>
    details: any
  }>({ hasNFT: false, balance: 0, checked: false, networks: [], details: null })
  const [error, setError] = useState("")

  const { toast } = useToast()

  const NFT_CONTRACT_BASE = "0x8cf392D33050F96cF6D0748486490d3dEae52564"

  useEffect(() => {
    if (isConnected && walletAddress) {
      verifyNFTOwnership(walletAddress)
    }
  }, [isConnected, walletAddress])

  const verifyNFTOwnership = async (address: string) => {
    setIsVerifying(true)
    try {
      const response = await fetch("/api/auth/verify-nft", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ walletAddress: address }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify NFT ownership")
      }

      setNftStatus({
        hasNFT: data.hasNFT,
        balance: data.balance,
        checked: true,
        networks: data.networks || [],
        details: data.details,
      })

      if (data.hasNFT) {
        const networksList = data.networks?.map((n: any) => `${n.name} (${n.balance})`).join(", ") || ""
        toast({
          title: "NFT Verified ✅",
          description: `Found ${data.balance} NFT(s) on: ${networksList}`,
        })
      } else {
        toast({
          title: "No NFT Found ❌",
          description: "You need to own an NFT from the authorized collection on Base Mainnet",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("Error verifying NFT:", error)
      setError(error.message)
      setNftStatus({ hasNFT: false, balance: 0, checked: true, networks: [], details: null })
    } finally {
      setIsVerifying(false)
    }
  }

  const authenticateWithNFT = async () => {
    if (!walletAddress || !nftStatus.hasNFT) {
      setError("Wallet not connected or NFT not found")
      return
    }

    setIsVerifying(true)
    setError("")

    try {
      // Create message to sign
      const message = `Login to OSINT HUB with wallet: ${walletAddress}`

      console.log("=== Frontend Auth Debug ===")
      console.log("Message to sign:", message)
      console.log("Wallet address:", walletAddress)

      // Request signature using wagmi
      const signature = await signMessageAsync({ message })
      console.log("Signature obtained:", signature)

      // Authenticate with backend
      const response = await fetch("/api/auth/nft-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          signature,
          message,
        }),
      })

      const data = await response.json()
      console.log("Backend response:", data)

      if (!response.ok) {
        console.error("Backend error:", data)
        throw new Error(data.error || "Authentication failed")
      }

      // Success - call parent callback
      onAuthSuccess(data.user, data.token)

      toast({
        title: "Access Granted 🎉",
        description: "Welcome to OSINT HUB, NFT holder!",
      })
    } catch (error: any) {
      console.error("Authentication error:", error)
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

  const handleConnect = () => {
    // Try to connect with the first available connector
    const connector = connectors[0]
    if (connector) {
      connect({ connector })
    }
  }

  const isMobile = () => {
    if (typeof window === 'undefined') return false
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  }

  const hasWalletProvider = () => {
    if (typeof window === 'undefined') return false
    return !!(window.ethereum || (window as any).coinbaseWalletExtension)
  }

  const openInWallet = () => {
    const url = window.location.href
    // Try Coinbase Wallet first
    const coinbaseDeeplink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(url)}`
    // Fallback to MetaMask
    const metamaskDeeplink = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`

    // Try Coinbase first
    window.location.href = coinbaseDeeplink
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

        {/* Wallet Connection */}
        <div className="space-y-3">
          {!isConnected ? (
            <>
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full bg-primary hover:bg-primary/90 text-white cyber-glow"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Wallet className="mr-2 h-4 w-4" />
                    Connect Wallet
                  </>
                )}
              </Button>

              {connectors.length > 1 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">Or choose wallet:</p>
                  {connectors.slice(1).map((connector) => (
                    <Button
                      key={connector.id}
                      onClick={() => connect({ connector })}
                      disabled={isConnecting}
                      variant="outline"
                      className="w-full"
                    >
                      {connector.name}
                    </Button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-background/30 rounded border border-primary/20">
                <span className="text-sm text-muted-foreground">Wallet:</span>
                <Badge variant="outline" className="border-green-500 text-green-400">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* NFT Verification Status */}
        {isConnected && walletAddress && (
          <div className="space-y-3">
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
                <Badge variant="outline" className="border-gray-500 text-gray-400">
                  Not Checked
                </Badge>
              )}
            </div>

            {/* Contract Info */}
            <div className="text-xs text-muted-foreground bg-background/30 p-3 rounded border border-primary/20">
              <p className="mb-3">
                <strong>Required NFT Contract:</strong>
              </p>

              {/* Base Mainnet Contract */}
              <div>
                <div className="flex items-center justify-between mb-1">
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
                <p className="text-xs">Network: Base Mainnet</p>
                {nftStatus.details?.base && (
                  <p className="text-xs text-green-400">Balance: {nftStatus.details.base.balance} NFT(s)</p>
                )}
              </div>
            </div>

            {/* Authentication Button */}
            {nftStatus.hasNFT && (
              <Button
                onClick={authenticateWithNFT}
                disabled={isVerifying}
                className="w-full bg-green-600 hover:bg-green-700 text-white cyber-glow"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Access OSINT HUB
                  </>
                )}
              </Button>
            )}

            {/* No NFT Message */}
            {nftStatus.checked && !nftStatus.hasNFT && (
              <Alert className="bg-yellow-900/50 border-yellow-700">
                <AlertDescription className="text-yellow-200">
                  You need to own an NFT from the authorized collection on Base Mainnet to access this service. Please
                  acquire an NFT and try again.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Mobile without wallet - show deeplink button */}
        {isMobile() && !hasWalletProvider() && !isConnected && (
          <Alert className="bg-blue-900/50 border-blue-700">
            <AlertDescription className="text-blue-200 space-y-3">
              <p>Wallet not detected. Open this page in your wallet's browser:</p>
              <Button
                onClick={openInWallet}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Open in Coinbase Wallet
              </Button>
              <p className="text-xs text-center">
                Or manually open{" "}
                <a
                  href="https://www.coinbase.com/wallet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Coinbase Wallet
                </a>
                {" / "}
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  MetaMask
                </a>
                {" and browse to this page"}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Desktop without wallet */}
        {!isMobile() && connectors.length === 0 && (
          <Alert className="bg-blue-900/50 border-blue-700">
            <AlertDescription className="text-blue-200">
              A Web3 wallet is required to connect. Install:{" "}
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                MetaMask
              </a>
              {" or "}
              <a
                href="https://www.coinbase.com/wallet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Coinbase Wallet
              </a>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}