import { AnyAction } from "redux";
import { SubstrateAddress } from "../../types";

export const SET_ADDRESS_LIST = "SET_ADDRESS_LIST";
export const ADD_ADDRESS = "ADD_ADDRESS";
export const REMOVE_ADDRESS = "REMOVE_ADDRESS";

export const setAddressList = (addressList: SubstrateAddress[]): AnyAction => {
  return {
    type: SET_ADDRESS_LIST,
    payload: addressList
  };
};

export const addAddress = (address: SubstrateAddress): AnyAction => {
  return {
    type: ADD_ADDRESS,
    payload: address
  };
};

export const removeAddress = (addressValue: string): AnyAction => {
  return {
    type: REMOVE_ADDRESS,
    payload: addressValue
  };
};
