import { AnyAction } from 'redux'
import { ConfigState } from '../../types'
import {
  SET_CONFIG,
  SET_NETWORK_LIST,
  SET_UTC_TIME,
  ADD_NETWORK,
  DELETE_NETWORK,
  SELECT_NETWORK,
  TOGGLE_NETWORK,
  ADD_ENDPOINT,
  DELETE_ENDPOINT,
  TOGGLE_ENDPOINT,
  RESET_CONFIG,
  SET_ENDPOINT_PREFIX,
} from '../actions/configActions'

const initialState: ConfigState = {
  networks: [],
  utcTime: false,
}

const configReducer = (state = initialState, action: AnyAction): ConfigState => {
  switch (action.type) {
    case SET_CONFIG:
      return {
        ...state,
        ...action.payload,
      }
    case SET_NETWORK_LIST:
      return {
        ...state,
        networks: action.payload,
      }
    case SET_UTC_TIME:
      return {
        ...state,
        utcTime: action.payload,
      }
    case ADD_NETWORK:
      return {
        ...state,
        networks: [action.payload, ...state.networks],
      }
    case DELETE_NETWORK:
      return {
        ...state,
        networks: state.networks.filter((auxNetwork) => auxNetwork.networkName !== action.payload),
      }
    case SELECT_NETWORK:
      return {
        ...state,
        selectedNetwork: action.payload,
      }
    case TOGGLE_NETWORK:
      return {
        ...state,
        networks: state.networks.map((auxNetwork) => {
          if (auxNetwork.networkName === action.payload) {
            return {
              ...auxNetwork,
              enabled: !auxNetwork.enabled,
            }
          }
          return auxNetwork
        }),
      }
    case ADD_ENDPOINT:
      return {
        ...state,
        networks: state.networks.map((auxNetwork) => {
          if (auxNetwork.networkName === action.payload.networkName) {
            return {
              ...auxNetwork,
              endpoints: [action.payload.endpoint, ...auxNetwork.endpoints],
            }
          }
          return auxNetwork
        }),
      }
    case DELETE_ENDPOINT:
      return {
        ...state,
        networks: state.networks.map((auxNetwork) => {
          if (auxNetwork.networkName === action.payload.networkName) {
            return {
              ...auxNetwork,
              endpoints: auxNetwork.endpoints.filter(
                (auxEndpoint) => auxEndpoint.value !== action.payload.endpointValue
              ),
            }
          }
          return auxNetwork
        }),
      }
    case TOGGLE_ENDPOINT:
      return {
        ...state,
        networks: state.networks.map((auxNetwork) => {
          if (auxNetwork.networkName === action.payload.networkName) {
            return {
              ...auxNetwork,
              endpoints: auxNetwork.endpoints.map((auxEndpoint) => {
                if (auxEndpoint.value === action.payload.endpointValue) {
                  return {
                    ...auxEndpoint,
                    enabled: !auxEndpoint.enabled,
                  }
                }
                return auxEndpoint
              }),
            }
          }
          return auxNetwork
        }),
      }
    case SET_ENDPOINT_PREFIX:
      return {
        ...state,
        networks: state.networks.map((auxNetwork) => {
          if (auxNetwork.networkName === action.payload.networkName) {
            return {
              ...auxNetwork,
              prefix: action.payload.prefix
            }
          }
          return auxNetwork
        }),
      }
    case RESET_CONFIG:
      return {
        ...state,
        selectedNetwork: undefined,
        networks: [],
      }
    default:
      return state
  }
}

export default configReducer
