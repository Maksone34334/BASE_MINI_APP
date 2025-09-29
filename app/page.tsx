"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Loader2,
  Search,
  Shield,
  Globe,
  Zap,
  Lock,
  AlertCircle,
  User,
  LogOut,
  Wallet,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import dynamic from "next/dynamic"

const WalletConnect = dynamic(() => import("@/components/wallet-connect"), {
  ssr: false,
})

interface ApiResponse {
  List: Record<
    string,
    {
      InfoLeak: string
      Data: Record<string, any>[]
    }
  >
}

interface OsintUser {
  id: string
  address: string
  role: string
  status: "active" | "pending" | "blocked"
  createdAt: string
}

export default function OSINTMini() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentUser, setCurrentUser] = useState<OsintUser | null>(null)
  const [query, setQuery] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null)
  const [error, setError] = useState("")

  const { toast } = useToast()

  useEffect(() => {
    // Check saved session
    const savedUser = localStorage.getItem("osint_user")
    const savedToken = localStorage.getItem("osint_token")

    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser)
        setCurrentUser(user)
        setIsLoggedIn(true)
      } catch (error) {
        console.error("Error parsing saved user:", error)
        localStorage.removeItem("osint_user")
        localStorage.removeItem("osint_token")
      }
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("osint_user")
    localStorage.removeItem("osint_token")
    setCurrentUser(null)
    setIsLoggedIn(false)
    setApiResponse(null)
    setQuery("")

    toast({
      title: "Logged Out",
      description: "You have been logged out",
    })
  }

  const makeSearch = async () => {
    if (!query.trim()) {
      setError("Please enter a target for analysis")
      return
    }

    if (!isLoggedIn || !currentUser) {
      setError("Please connect your wallet first")
      return
    }

    setError("")
    setIsLoading(true)

    try {
      const token = localStorage.getItem("osint_token")

      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          request: query,
          limit: 1000,
          lang: "en",
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Search failed")
      }

      setApiResponse(data)

      toast({
        title: "Analysis Complete",
        description: `Intelligence gathered from ${Object.keys(data.List || {}).length} sources`,
      })
    } catch (error: any) {
      const errorMsg = error.message
      setError(errorMsg)

      toast({
        title: "Analysis Failed",
        description: errorMsg,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 cyber-grid opacity-30"></div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-6 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">
            OSINT<span className="text-primary">MINI</span>
          </span>
        </div>

        {isLoggedIn && currentUser && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary text-primary">
                {currentUser.address ? `${currentUser.address.slice(0, 6)}...${currentUser.address.slice(-4)}` : currentUser.id?.slice(0, 6) + '...' + currentUser.id?.slice(-4)}
              </Badge>
              <Badge className="bg-green-600 text-white">{currentUser.role}</Badge>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary hover:text-white bg-transparent"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="relative z-10 p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {!isLoggedIn ? (
            // Login Section
            <>
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-6xl font-bold mb-4">
                  OSINT <span className="text-primary">MINI</span>
                </h1>
                <p className="text-gray-400 text-lg">
                  Real OSINT platform with NFT authentication
                </p>
              </div>

              <Card className="w-full max-w-md mx-auto bg-card/90 border-primary/30 backdrop-blur-sm cyber-glow">
                <CardHeader>
                  <CardTitle className="text-center text-primary">Connect Wallet</CardTitle>
                  <CardDescription className="text-center text-muted-foreground">
                    Verify your NFT ownership to access OSINT tools
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <WalletConnect
                    onAuthSuccess={(user, token) => {
                      localStorage.setItem("osint_user", JSON.stringify(user))
                      localStorage.setItem("osint_token", token)
                      setCurrentUser(user)
                      setIsLoggedIn(true)
                      toast({
                        title: "NFT Verified!",
                        description: "Access granted to OSINT platform",
                      })
                    }}
                  />

                  <div className="text-xs text-muted-foreground bg-background/30 p-3 rounded border border-primary/20">
                    <p className="mb-2">
                      🔐 <strong>NFT Requirements & Limits:</strong>
                    </p>
                    <ul className="space-y-1 text-xs">
                      <li>• Must hold OSINT HUB NFT on Base mainnet</li>
                      <li>• Contract: 0x8cf392D33050F96cF6D0748486490d3dEae52564</li>
                      <li>• NFT holders get: <span className="text-green-400 font-semibold">30 searches per day</span></li>
                      <li>• Non-holders: <span className="text-red-400 font-semibold">No access</span></li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Feature Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                {[
                  {
                    icon: Globe,
                    title: "Real OSINT Data",
                    desc: "Access live intelligence databases",
                  },
                  {
                    icon: Zap,
                    title: "NFT Authentication",
                    desc: "Secure access via Base mainnet NFTs",
                  },
                  {
                    icon: Lock,
                    title: "Professional Tools",
                    desc: "Advanced OSINT search capabilities",
                  },
                ].map((feature, index) => (
                  <Card
                    key={feature.title}
                    className="bg-card/80 border-primary/20 backdrop-blur-sm hover:border-primary/40 transition-all"
                  >
                    <CardContent className="p-6 text-center">
                      <feature.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                      <p className="text-gray-400 text-sm">{feature.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            // Main Application (when logged in)
            <>
              <div className="text-center mb-8">
                <h1 className="text-4xl md:text-6xl font-bold mb-4">
                  OSINT <span className="text-primary">MINI</span>
                </h1>
                <p className="text-gray-400 text-lg">
                  Professional intelligence gathering platform
                </p>
              </div>

          {/* OSINT Terminal */}
          <Card className="bg-card/90 border-primary/30 backdrop-blur-sm cyber-glow">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 text-primary">
                <Shield className="w-5 h-5" />
                <CardTitle className="text-lg">OSINT SEARCH</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Enter target for analysis: email, domain, IP, username..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="bg-input border-primary/30 text-foreground placeholder-muted-foreground"
                    onKeyPress={(e) => e.key === "Enter" && makeSearch()}
                  />
                </div>
                <Button
                  onClick={makeSearch}
                  disabled={isLoading}
                  className="bg-primary hover:bg-primary/90 text-white cyber-glow px-8"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Analyze
                    </>
                  )}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <span className="text-primary">Examples:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {["example@email.com", "google.com", "8.8.8.8", "@username"].map((example) => (
                    <Badge
                      key={example}
                      variant="outline"
                      className="border-primary/30 text-primary cursor-pointer hover:bg-primary/10"
                      onClick={() => setQuery(example)}
                    >
                      {example}
                    </Badge>
                  ))}
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-blue-900/50 border-blue-700">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

              {/* Results */}
              {apiResponse && (
                <Card className="bg-card/90 border-primary/30 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-primary">Intelligence Report</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Real data from {Object.keys(apiResponse.List).length} OSINT source(s)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(apiResponse.List).map(([dbName, dbData]) => (
                        <Card key={dbName} className="bg-secondary/50 border-primary/20">
                          <CardHeader>
                            <CardTitle className="text-lg text-primary">{dbName}</CardTitle>
                            <CardDescription className="text-muted-foreground">{dbData.InfoLeak}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            {dbData.Data && dbData.Data.length > 0 ? (
                              <div className="space-y-2">
                                {dbData.Data.slice(0, 5).map((item, index) => (
                                  <div key={index} className="p-3 bg-background/50 rounded border border-primary/10">
                                    {Object.entries(item).map(([key, value]) => (
                                      <div key={key} className="flex justify-between py-1">
                                        <span className="font-medium text-primary">{key}:</span>
                                        <span className="text-foreground break-all">{String(value)}</span>
                                      </div>
                                    ))}
                                  </div>
                                ))}
                                {dbData.Data.length > 5 && (
                                  <p className="text-sm text-muted-foreground text-center">
                                    ... and {dbData.Data.length - 5} more records
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-muted-foreground">No intelligence found in this source</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                {[
                  {
                    icon: Globe,
                    title: "Live OSINT API",
                    desc: "Real intelligence database access",
                  },
                  {
                    icon: Zap,
                    title: "NFT Verified",
                    desc: "Authenticated Base mainnet holder",
                  },
                  {
                    icon: Lock,
                    title: "Secure Platform",
                    desc: "Professional OSINT capabilities",
                  },
                ].map((feature, index) => (
                  <Card
                    key={feature.title}
                    className="bg-card/80 border-primary/20 backdrop-blur-sm hover:border-primary/40 transition-all"
                  >
                    <CardContent className="p-6 text-center">
                      <feature.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                      <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
                      <p className="text-gray-400 text-sm">{feature.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-xs text-gray-500">
        © 2025 OSINT MINI • {isLoggedIn ? "PROFESSIONAL" : "NFT-GATED"} INTELLIGENCE PLATFORM
      </footer>
    </div>
  )
}
