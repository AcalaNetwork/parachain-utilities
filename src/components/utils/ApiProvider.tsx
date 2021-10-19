import React, { FC, useCallback, useRef } from "react"

import { ApiPromise, WsProvider } from "@polkadot/api"
import { PolkadotNetwork } from "../../types"

export interface ApiContextData {
  apiConnections: Record<string, ApiPromise>
  apiStatus: Record<string, boolean>
  deleteNetworkConnection: (networkName: string) => void
}

// Ensure that ApiContext always exists
export const ApiContext = React.createContext<ApiContextData>(
  {} as ApiContextData
)

export const connectToApi = async (
  apiConnections: Record<string, ApiPromise>,
  apiStatus: Record<string, boolean>,
  network: PolkadotNetwork
): Promise<ApiPromise> => {
  try {
    if (apiStatus[network.networkName]) {
      return apiConnections[network.networkName]
    }

    const provider = new WsProvider(
      network.endpoints.map(endpoint => endpoint.value)
    )

    provider.on("disconnected", () => {
      console.log(`Disconnected from provider of ${network.networkName}`)
      apiStatus[network.networkName] = false
    })
    provider.on("error", () => {
      console.log(`Error on provider of ${network.networkName}`)
      apiStatus[network.networkName] = false
    })

    const api = await ApiPromise.create({
      provider,
    })

    api.on("disconnected", () => {
      console.log(`Disconnected from api of ${network.networkName}`)
      apiStatus[network.networkName] = false
    })
    api.on("error", () => {
      console.log(`Error on api of ${network.networkName}`)
      apiStatus[network.networkName] = false
    })

    apiConnections[network.networkName] = api
    apiStatus[network.networkName] = true
    return api
  } catch (error) {
    apiStatus[network.networkName] = false
    throw(error)
  }
}

export const ApiProvider: FC = ({ children }) => {
  const apiConnections = useRef<Record<string, ApiPromise>>(
    {} as Record<string, ApiPromise>
  )
  const apiStatus = useRef<Record<string, boolean>>(
    {} as Record<string, boolean>
  )

  const deleteNetworkConnection = useCallback((networkName: string) => {
    if (typeof apiConnections.current[networkName]?.disconnect === "function") {
      apiConnections.current[networkName].disconnect()
    }
  }, [])

  return (
    <ApiContext.Provider
      value={{
        apiConnections: apiConnections.current,
        apiStatus: apiStatus.current,
        deleteNetworkConnection,
      }}>
      {children}
    </ApiContext.Provider>
  )
}
