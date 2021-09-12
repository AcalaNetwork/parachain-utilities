import { AnyAction } from "redux";
import { ConfigState, RPCEndpoint } from "../../types";

export const SET_CONFIG = "SET_CONFIG";
export const SET_UTC_TIME = "SET_UTC_TIME";
export const SELECT_ENDPOINT = "SELECT_ENDPOINT";

export const setConfig = (config: ConfigState): AnyAction => {
  return {
    type: SET_CONFIG,
    payload: config
  };
};

export const setUtcTime = (value: boolean): AnyAction => {
  return {
    type: SET_UTC_TIME,
    payload: value
  };
};

export const selectEndpoint = (endpoint: RPCEndpoint): AnyAction => {
  return {
    type: SELECT_ENDPOINT,
    payload: endpoint
  };
};
