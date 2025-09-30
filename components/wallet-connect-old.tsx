"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Wallet, Shield, CheckCircle, XCircle, Loader2, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface WalletConnectProps {
  onAuthSuccess: (user: any, token: string) => void
}

declare global {
  interface Window {
    ethereum?: any
    coinbaseWalletExtension?: any
  }
}

interface EIP6963ProviderDetail {
  info: {
    uuid: string
    name: string
    icon: string
    rdns: string
  }
  provider: any
}

export default function WalletConnect({ onAuthSuccess }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [provider, setProvider] = useState<any>(null)
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
  const BASE_MAINNET_CHAIN_ID = "0x2105" // 8453 in hex

  // Detect available wallet providers
  const getProvider = () => {
    if (typeof window === "undefined") return null

    // Check for Coinbase Wallet
    if (window.coinbaseWalletExtension) {
      console.log("Using Coinbase Wallet")
      return window.coinbaseWalletExtension
    }

    // Check for injected provider (MetaMask, etc)
    if (window.ethereum) {
      console.log("Using injected provider:", window.ethereum)
      return window.ethereum
    }

    return null
  }

  useEffect(() => {
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async () => {
    const walletProvider = getProvider()
    if (walletProvider) {
      try {
        setProvider(walletProvider)
        const accounts = await walletProvider.request({ method: "eth_accounts" })
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          await verifyNFTOwnership(accounts[0])
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error)
      }
    }
  }

  const connectWallet = async () => {
    const walletProvider = getProvider()

    if (!walletProvider) {
      setError("No wallet detected. Please install MetaMask, Coinbase Wallet, or another Web3 wallet.")
      toast({
        title: "No Wallet Found",
        description: "Please install a Web3 wallet to continue",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    setError("")

    try {
      console.log("Connecting to wallet...")
      setProvider(walletProvider)

      // Request account access
      const accounts = await walletProvider.request({
        method: "eth_requestAccounts",
      })

      if (accounts.length === 0) {
        throw new Error("No accounts found")
      }

      const account = accounts[0]
      setWalletAddress(account)

      // Verify NFT ownership
      await verifyNFTOwnership(account)

      toast({
        title: "Wallet Connected",
        description: `Connected to ${account.slice(0, 6)}...${account.slice(-4)}`,
      })
    } catch (error: any) {
      console.error("Error connecting wallet:", error)
      setError(error.message || "Failed to connect wallet")
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      })
    } finally {
      setIsConnecting(false)
    }
  }


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
          description: "You need to own an NFT from the authorized collections on Monad or Base",
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
      console.log("Message length:", message.length)
      console.log("Wallet address:", walletAddress)
      console.log("Message bytes:", new TextEncoder().encode(message))

      if (!provider) {
        throw new Error("Wallet provider not available")
      }

      // Request signature - try standard params order first
      let signature
      try {
        signature = await provider.request({
          method: "personal_sign",
          params: [message, walletAddress],
        })
        console.log("Signature obtained with standard params order")
      } catch (e) {
        console.log("Standard order failed, trying reverse order...")
        // Some mobile wallets use reverse order
        signature = await provider.request({
          method: "personal_sign",
          params: [walletAddress, message],
        })
        console.log("Signature obtained with reverse params order")
      }

      console.log("Signature:", signature)
      console.log("Sending to backend:", { walletAddress, message, signature: signature.substring(0, 20) + "..." })

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
          {!walletAddress ? (
            <Button
              onClick={connectWallet}
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
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-background/30 rounded border border-primary/20">
                <span className="text-sm text-muted-foreground">Wallet:</span>
                <Badge variant="outline" className="border-green-500 text-green-400">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* NFT Verification Status */}
        {walletAddress && (
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

        {/* Wallet Installation */}
        {typeof window !== "undefined" && !getProvider() && (
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
