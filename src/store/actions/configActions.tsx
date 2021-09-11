import { AnyAction } from "redux";

export const CONFIG_LOADING = "CONFIG_LOADING";
export const SET_UTC_TIME = "SET_UTC_TIME";

export const setConfigLoading = (): AnyAction => {
  return {
    type: CONFIG_LOADING,
  };
};

export const setUtcTime = (value: boolean): AnyAction => {
  return {
    type: SET_UTC_TIME,
    value
  };
};
