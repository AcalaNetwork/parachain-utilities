import { AnyAction } from "redux"
import { ConfigState } from "../../types"
import {
  SELECT_ENDPOINT,
  SET_CONFIG,
  SET_UTC_TIME,
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
    case SET_UTC_TIME:
      return {
        ...state,
        utcTime: action.payload,
      }
    case SELECT_ENDPOINT:
      return {
        ...state,
        selectedEndpoint: action.payload,
      }
    default:
      return state
  }
}

export default configReducer
