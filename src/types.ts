export interface SubstrateAddress {
  name: string;
  value: string;
}

export interface RPCEndpoint {
  value: string;
  chainName: string;
  hostedBy?: string;
}

export interface ConfigState {
  endpoints: RPCEndpoint[],
  selectedEndpoint?: RPCEndpoint
  utcTime: boolean,
}

export interface AddressState {
  list: SubstrateAddress[]
}
