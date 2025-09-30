import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MONAD_TESTNET_RPC = "https://testnet-rpc.monad.xyz"
const NFT_CONTRACT_ADDRESS_MONAD = "0xC1C4d4A5A384DE53BcFadB43D0e8b08966195757"
const BASE_MAINNET_RPCS = [
  "https://mainnet.base.org",
  "https://base-mainnet.public.blastapi.io",
  "https://base.gateway.tenderly.co",
  "https://base-rpc.publicnode.com",
]
const NFT_CONTRACT_ADDRESS_BASE = "0x8cf392D33050F96cF6D0748486490d3dEae52564"
const BALANCE_OF_SELECTOR = "0x70a08231"

async function checkNFTBalanceWithFallback(
  rpcUrls: string[],
  contractAddress: string,
  walletAddress: string,
): Promise<number> {
  for (const rpcUrl of rpcUrls) {
    try {
      const balance = await checkNFTBalance(rpcUrl, contractAddress, walletAddress)
      return balance
    } catch (error) {
      continue
    }
  }
  return 0
}

async function checkNFTBalance(rpcUrl: string, contractAddress: string, walletAddress: string): Promise<number> {
  try {
    const paddedAddress = walletAddress.slice(2).padStart(64, "0")
    const callData = BALANCE_OF_SELECTOR + paddedAddress

    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_call",
        params: [
          {
            to: contractAddress,
            data: callData,
          },
          "latest",
        ],
        id: 1,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.error) {
      throw new Error(`RPC Error: ${data.error.message || data.error}`)
    }

    return Number.parseInt(data.result, 16)
  } catch (error) {
    throw error
  }
}

async function checkNFTOwnership(walletAddress: string): Promise<{ hasNFT: boolean; details: any }> {
  try {
    const [monadBalance, baseBalance] = await Promise.all([
      checkNFTBalance(MONAD_TESTNET_RPC, NFT_CONTRACT_ADDRESS_MONAD, walletAddress).catch(() => 0),
      checkNFTBalanceWithFallback(BASE_MAINNET_RPCS, NFT_CONTRACT_ADDRESS_BASE, walletAddress),
    ])

    const totalBalance = monadBalance + baseBalance
    const hasNFT = totalBalance > 0

    const networks = []
    if (monadBalance > 0) {
      networks.push({
        name: "Monad Testnet",
        balance: monadBalance,
        contractAddress: NFT_CONTRACT_ADDRESS_MONAD,
      })
    }
    if (baseBalance > 0) {
      networks.push({
        name: "Base Mainnet",
        balance: baseBalance,
        contractAddress: NFT_CONTRACT_ADDRESS_BASE,
      })
    }

    return {
      hasNFT,
      details: {
        totalBalance,
        monadBalance,
        baseBalance,
        networks,
        monad: {
          hasNFT: monadBalance > 0,
          balance: monadBalance,
          contractAddress: NFT_CONTRACT_ADDRESS_MONAD,
          network: "Monad Testnet",
        },
        base: {
          hasNFT: baseBalance > 0,
          balance: baseBalance,
          contractAddress: NFT_CONTRACT_ADDRESS_BASE,
          network: "Base Mainnet",
        },
      },
    }
  } catch (error) {
    return { hasNFT: false, details: null }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, signature, message } = body

    if (!walletAddress || !signature || !message) {
      return NextResponse.json(
        {
          error: "Wallet address, signature, and message are required",
        },
        { status: 400 },
      )
    }

    // Validate message format - check if it starts with the expected prefix and contains the wallet address
    const messagePrefix = "Login to OSINT HUB with wallet:"
    if (!message.includes(messagePrefix) || !message.toLowerCase().includes(walletAddress.toLowerCase())) {
      console.log('Message validation failed:', {
        received: message,
        expected: `${messagePrefix} ${walletAddress}`,
        hasPrefix: message.includes(messagePrefix),
        hasAddress: message.toLowerCase().includes(walletAddress.toLowerCase())
      })
      return NextResponse.json(
        {
          error: "Invalid message format",
        },
        { status: 400 },
      )
    }

    const nftCheck = await checkNFTOwnership(walletAddress)

    if (!nftCheck.hasNFT) {
      return NextResponse.json(
        {
          error: "Access denied: You must own an NFT from the authorized collection to use this service",
          details: nftCheck.details,
        },
        { status: 403 },
      )
    }

    const sessionSecret = process.env.OSINT_SESSION_SECRET
    if (!sessionSecret) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    const token = `${sessionSecret}_nft_${walletAddress}_${Date.now()}`

    const user = {
      id: walletAddress,
      address: walletAddress,
      login: `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`,
      email: `${walletAddress}@nft.holder`,
      role: "nft_holder",
      status: "active",
      walletAddress,
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({
      success: true,
      user,
      token,
      message: "NFT ownership verified. Access granted!",
      nftDetails: nftCheck.details,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
