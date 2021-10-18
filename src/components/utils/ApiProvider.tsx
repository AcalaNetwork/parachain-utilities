import React, { FC, useCallback, useEffect, useRef, useState } from "react"

import { ApiPromise, WsProvider } from "@polkadot/api"

export interface ApiContextData {
  api: ApiPromise
  connected: boolean
  error: boolean
  loading: boolean
  connectToApi: (endpoint?: string) => void
}

// ensure that api always exist
export const ApiContext = React.createContext<ApiContextData>(
  {} as ApiContextData
)

/**
 * @name ApiProvider
 * @description context provider to connect to polkadot.js api
 */
export const ApiProvider: FC = ({ children }) => {
  const [connected, setConnected] = useState<boolean>(false)
  const [error, setError] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const providerInstance = useRef<WsProvider>({} as WsProvider)
  const apiInstance = useRef<ApiPromise>({} as ApiPromise)

  const connectToApi = useCallback(async (endpoint?: string) => {
    if (!endpoint) return
    try {
      setLoading(true)
      if (typeof providerInstance.current.disconnect === "function")
        providerInstance.current.disconnect()
      setConnected(false)

      providerInstance.current = new WsProvider(endpoint)

      const api = await ApiPromise.create({
        provider: providerInstance.current,
      })

      apiInstance.current = api
      setConnected(true)
      setError(false)
      setLoading(false)
    } catch (error) {
      console.log(error)
      setConnected(false)
      setError(true)
      setLoading(false)
    }
  }, [])

  // subscribe connect status
  useEffect(() => {
    if (!connected) return

    apiInstance.current.on("disconnected", () => {
      setConnected(false)
      setError(false)
    })
    apiInstance.current.on("error", () => {
      setConnected(false)
      setError(true)
    })
    apiInstance.current.on("connected", () => {
      setConnected(true)
      setError(false)
    })
  }, [apiInstance, connected, setConnected, setError])

  return (
    <ApiContext.Provider
      value={{
        api: apiInstance.current,
        connected,
        error,
        loading,
        connectToApi,
      }}>
      {children}
    </ApiContext.Provider>
  )
}
