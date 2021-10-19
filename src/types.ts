import { HTMLProps, ReactNode } from 'react';

export interface SubstrateAddress {
  name: string;
  key: string;
  transformed: TransformedSubstrateAddress[]
}

export interface TransformedSubstrateAddress {
  prefix: number;
  value: string;
}

export interface PolkadotNetwork {
  networkName: string;
  endpoints: RPCEndpoint[]
  enabled: boolean;
  prefix?: number;
}

export interface RPCEndpoint {
  value: string;
  hostedBy?: string;
  enabled: boolean;
}

export interface ConfigState {
  networks: PolkadotNetwork[],
  selectedNetwork?: PolkadotNetwork
  utcTime: boolean,
}

export interface AddressState {
  list: SubstrateAddress[]
}
