import { AnyAction } from "redux"
import { AddressState } from "../../types"
import {
  ADD_ADDRESS,
  REMOVE_ADDRESS,
  SET_ADDRESS_LIST,
} from "../actions/addressActions"

const initialState: AddressState = {
  list: [],
}

const addressReducer = (
  state = initialState,
  action: AnyAction
): AddressState => {
  console.log(state)
  switch (action.type) {
    case SET_ADDRESS_LIST:
      return {
        ...state,
        list: action.payload,
      }
    case ADD_ADDRESS:
      return {
        ...state,
        list: [action.payload, ...state.list],
      }
    case REMOVE_ADDRESS:
      return {
        ...state,
        list: state.list.filter(
          auxAddress => auxAddress.value !== action.payload
        ),
      }
    default:
      return state
  }
}

export default addressReducer
