import { AnyAction } from "redux";
import {
  ADDRESS_LOADING,
} from "../actions/addressActions";

const initialState = {
  isLoading: false,
};

const addressReducer = (state = initialState, action: AnyAction): typeof initialState => {
  switch (action.type) {
    case ADDRESS_LOADING:
      return {
        ...state,
        isLoading: true,
      };
    default:
      return state;
  }
};

export default addressReducer;
