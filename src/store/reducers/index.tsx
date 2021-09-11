import { combineReducers } from "redux";
import addressReducer from "./addressReducer";
import configReducer from "./configReducer";

export default combineReducers({
  address: addressReducer,
  config: configReducer,
});
