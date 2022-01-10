export interface SubstrateAddress {
  name: string
  key: string
  transformed: TransformedSubstrateAddress[]
}

export interface TransformedSubstrateAddress {
  prefix: number
  value: string
}

export interface PolkadotNetwork {
  networkName: string
  endpoints: RPCEndpoint[]
  enabled: boolean
  paraId: number
  parentNetworkName?: string
  prefix?: number
}

export interface RPCEndpoint {
  value: string
  hostedBy?: string
  enabled: boolean
}

export interface ConfigState {
  networks: PolkadotNetwork[]
  selectedNetwork?: PolkadotNetwork
  utcTime: boolean
}

export interface AddressState {
  list: SubstrateAddress[]
}

export interface ChainEvent {
  section: string
  method: string
  description: string
  eventArguments: [string, any][]
  phase: number
  index: number
}
