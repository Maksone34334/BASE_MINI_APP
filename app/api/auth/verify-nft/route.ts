import { type NextRequest, NextResponse } from "next/server"

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
      console.warn(`RPC ${rpcUrl} failed, trying next...`, error)
      continue
    }
  }
  console.error(`All RPC endpoints failed for contract ${contractAddress}`)
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
      signal: AbortSignal.timeout(10000), // 10 second timeout
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
    console.error(`Error checking NFT balance on ${rpcUrl}:`, error)
    throw error
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json(
        {
          error: "Wallet address is required",
        },
        { status: 400 },
      )
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        {
          error: "Invalid wallet address format",
        },
        { status: 400 },
      )
    }

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

    return NextResponse.json({
      hasNFT,
      balance: totalBalance,
      monadBalance,
      baseBalance,
      networks,
      details: {
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
    })
  } catch (error: any) {
    console.error("NFT verification error:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
