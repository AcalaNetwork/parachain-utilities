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

export interface RPCEndpoint {
  value: string;
  chainName: string;
  hostedBy?: string;
  enabled: boolean;
  prefix?: number;
}

export interface ConfigState {
  endpoints: RPCEndpoint[],
  selectedEndpoint?: RPCEndpoint
  utcTime: boolean,
}

export interface AddressState {
  list: SubstrateAddress[]
}
