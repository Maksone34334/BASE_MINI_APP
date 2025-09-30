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
  }
}

export default function WalletConnect({ onAuthSuccess }: WalletConnectProps) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
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
    checkWalletConnection()
  }, [])

  const checkWalletConnection = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" })
        if (accounts.length > 0) {
          setWalletAddress(accounts[0])
          await verifyNFTOwnership(accounts[0])
        }
      } catch (error) {
        console.error("Error checking wallet:", error)
      }
    }
  }

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      setError("Please open this page in your wallet's browser")
      toast({
        title: "Wallet Not Found",
        description: "Open this page inside MetaMask or Coinbase Wallet browser",
        variant: "destructive",
      })
      return
    }

    setIsConnecting(true)
    setError("")

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" })
      if (accounts.length === 0) {
        throw new Error("No accounts found")
      }

      setWalletAddress(accounts[0])
      await verifyNFTOwnership(accounts[0])

      toast({
        title: "Wallet Connected",
        description: `Connected to ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
      })
    } catch (error: any) {
      console.error("Connection error:", error)
      setError(error.message || "Failed to connect")
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect",
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
    if (!walletAddress || !nftStatus.hasNFT) {
      setError("Wallet not connected or NFT not found")
      return
    }

    setIsVerifying(true)
    setError("")

    try {
      const message = `Login to OSINT HUB with wallet: ${walletAddress}`
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, walletAddress],
      })

      const response = await fetch("/api/auth/nft-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, signature, message }),
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
        {!walletAddress ? (
          <Button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full bg-primary hover:bg-primary/90 text-white cyber-glow text-lg py-6"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-5 w-5" />
                Connect Wallet
              </>
            )}
          </Button>
        ) : (
          <>
            {/* Wallet Info */}
            <div className="flex items-center justify-between p-3 bg-background/30 rounded border border-primary/20">
              <span className="text-sm text-muted-foreground">Wallet:</span>
              <Badge variant="outline" className="border-green-500 text-green-400">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
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

        {/* Instruction for mobile users */}
        {typeof window !== "undefined" && !window.ethereum && (
          <Alert className="bg-blue-900/50 border-blue-700">
            <AlertDescription className="text-blue-200 text-sm">
              <p className="font-semibold mb-2">Mobile Users:</p>
              <p>Open this page inside your wallet's browser:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>MetaMask: Tap Browser → Enter URL</li>
                <li>Coinbase Wallet: Tap Browser → Enter URL</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}