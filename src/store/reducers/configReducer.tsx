import { AnyAction } from "redux"
import { CONFIG_LOADING, SET_UTC_TIME } from "../actions/configActions"

const initialState = {
  endpoints: [],
  utcTime: false,
  isLoading: false,
}

const configReducer = (
  state = initialState,
  action: AnyAction
): typeof initialState => {
  switch (action.type) {
    case CONFIG_LOADING:
      return {
        ...state,
        isLoading: true,
      }
    case SET_UTC_TIME:
      return {
        ...state,
        utcTime: action.value,
      }
    default:
      return state
  }
}

export default configReducer
