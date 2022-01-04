import { AnyAction } from 'redux'
import { SubstrateAddress } from '../../types'

export const SET_ADDRESS_LIST = 'SET_ADDRESS_LIST'
export const ADD_ADDRESS = 'ADD_ADDRESS'
export const DELETE_ADDRESS = 'DELETE_ADDRESS'

export const setAddressList = (addressList: SubstrateAddress[]): AnyAction => {
  return {
    type: SET_ADDRESS_LIST,
    payload: addressList,
  }
}

export const addAddress = (address: SubstrateAddress): AnyAction => {
  return {
    type: ADD_ADDRESS,
    payload: address,
  }
}

export const deleteAddress = (addressKey: string): AnyAction => {
  return {
    type: DELETE_ADDRESS,
    payload: addressKey,
  }
}
