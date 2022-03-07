import { AnyAction } from 'redux'
import { ConfigState, PolkadotNetwork, RPCEndpoint } from '../../types'

export const SET_CONFIG = 'SET_CONFIG'
export const SET_NETWORK_LIST = 'SET_NETWORK_LIST'
export const SET_UTC_TIME = 'SET_UTC_TIME'
export const ADD_NETWORK = 'ADD_NETWORK'
export const DELETE_NETWORK = 'DELETE_NETWORK'
export const SELECT_NETWORK = 'SELECT_NETWORK'
export const TOGGLE_NETWORK = 'TOGGLE_NETWORK'
export const ADD_ENDPOINT = 'ADD_ENDPOINT'
export const DELETE_ENDPOINT = 'DELETE_ENDPOINT'
export const TOGGLE_ENDPOINT = 'TOGGLE_ENDPOINT'
export const SET_ENDPOINT_PREFIX = 'SET_ENDPOINT_PREFIX'
export const RESET_CONFIG = 'RESET_CONFIG'

export const setConfig = (config: ConfigState): AnyAction => {
  return {
    type: SET_CONFIG,
    payload: config,
  }
}

export const setNetworkList = (networks: PolkadotNetwork[]): AnyAction => {
  return {
    type: SET_NETWORK_LIST,
    payload: networks,
  }
}

export const setUtcTime = (value: boolean): AnyAction => {
  return {
    type: SET_UTC_TIME,
    payload: value,
  }
}

export const addNetwork = (network: PolkadotNetwork): AnyAction => {
  return {
    type: ADD_NETWORK,
    payload: network,
  }
}

export const deleteNetwork = (networkName: string): AnyAction => {
  return {
    type: DELETE_NETWORK,
    payload: networkName,
  }
}

export const selectNetwork = (network: PolkadotNetwork): AnyAction => {
  return {
    type: SELECT_NETWORK,
    payload: network,
  }
}

export const toggleNetwork = (networkName: string): AnyAction => {
  return {
    type: TOGGLE_NETWORK,
    payload: networkName,
  }
}

export const addEndpoint = (networkName: string, endpoint: RPCEndpoint): AnyAction => {
  return {
    type: ADD_ENDPOINT,
    payload: {
      networkName,
      endpoint,
    },
  }
}

export const deleteEndpoint = (networkName: string, endpointValue: string): AnyAction => {
  return {
    type: DELETE_ENDPOINT,
    payload: {
      networkName,
      endpointValue,
    },
  }
}

export const toggleEndpoint = (networkName: string, endpointValue: string): AnyAction => {
  return {
    type: TOGGLE_ENDPOINT,
    payload: {
      networkName,
      endpointValue,
    },
  }
}

export const setEndpointPrefix = (networkName: string, prefix: number): AnyAction => {
  return {
    type: SET_ENDPOINT_PREFIX,
    payload: {
      networkName,
      prefix
    }
  }
}

export const resetConfig = (): AnyAction => {
  return {
    type: RESET_CONFIG,
  }
}
