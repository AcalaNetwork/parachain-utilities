import { AnyAction } from "redux"
import { ConfigState } from "../../types"
import {
  ADD_ENDPOINT,
  DELETE_ENDPOINT,
  SELECT_ENDPOINT,
  SET_CONFIG,
  SET_ENDPOINT_LIST,
  SET_UTC_TIME,
  TOGGLE_ENDPOINT,
} from "../actions/configActions"

const initialState: ConfigState = {
  endpoints: [],
  utcTime: false,
}

const configReducer = (
  state = initialState,
  action: AnyAction
): ConfigState => {
  switch (action.type) {
    case SET_CONFIG:
      return {
        ...state,
        ...action.payload,
      }
    case SET_ENDPOINT_LIST:
      return {
        ...state,
        endpoints: action.payload,
      }
    case SET_UTC_TIME:
      return {
        ...state,
        utcTime: action.payload,
      }
    case ADD_ENDPOINT:
      return {
        ...state,
        endpoints: [action.payload, ...state.endpoints],
      }
    case DELETE_ENDPOINT:
      return {
        ...state,
        endpoints: state.endpoints.filter(
          auxEndpoint => auxEndpoint.value !== action.payload
        ),
      }
    case SELECT_ENDPOINT:
      return {
        ...state,
        selectedEndpoint: action.payload,
      }
    case TOGGLE_ENDPOINT:
      return {
        ...state,
        endpoints: state.endpoints.map(auxEndpoint => {
          if (auxEndpoint.value === action.payload) {
            return {
              ...auxEndpoint,
              enabled: !auxEndpoint.enabled,
            }
          }
          return auxEndpoint
        }),
      }
    default:
      return state
  }
}

export default configReducer
