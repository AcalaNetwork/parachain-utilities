import { AnyAction } from "redux"
import { ConfigState, RPCEndpoint } from "../../types"

export const SET_CONFIG = "SET_CONFIG"
export const SET_ENDPOINT_LIST = "SET_ENDPOINT_LIST"
export const SET_UTC_TIME = "SET_UTC_TIME"
export const ADD_ENDPOINT = "ADD_ENDPOINT"
export const DELETE_ENDPOINT = "DELETE_ENDPOINT"
export const SELECT_ENDPOINT = "SELECT_ENDPOINT"
export const TOGGLE_ENDPOINT = "TOGGLE_ENDPOINT"

export const setConfig = (config: ConfigState): AnyAction => {
  return {
    type: SET_CONFIG,
    payload: config,
  }
}

export const setEndpointList = (endpoints: RPCEndpoint[]): AnyAction => {
  return {
    type: SET_ENDPOINT_LIST,
    payload: endpoints,
  }
}

export const setUtcTime = (value: boolean): AnyAction => {
  return {
    type: SET_UTC_TIME,
    payload: value,
  }
}

export const addEndpoint = (endpoint: RPCEndpoint): AnyAction => {
  return {
    type: ADD_ENDPOINT,
    payload: endpoint,
  }
}

export const deleteEndpoint = (endpointValue: string): AnyAction => {
  return {
    type: DELETE_ENDPOINT,
    payload: endpointValue,
  }
}

export const selectEndpoint = (endpoint: RPCEndpoint): AnyAction => {
  return {
    type: SELECT_ENDPOINT,
    payload: endpoint,
  }
}

export const toggleEndpoint = (endpointUrl: string): AnyAction => {
  return {
    type: TOGGLE_ENDPOINT,
    payload: endpointUrl,
  }
}
