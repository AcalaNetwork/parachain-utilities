import { createWsEndpoints } from "@polkadot/apps-config"
import { createStore, applyMiddleware, compose } from "redux"
import thunk from "redux-thunk"
import { RPCEndpoint } from "../types"
import { replaceText } from "../utils/UtilsFunctions"
import rootReducer from "./reducers"

const loadSavedOrDefaultConfig = () => {
  try {
    // Try to load Address from local storage
    const serializedAddress = localStorage.getItem("address")
    const addressData = JSON.parse(serializedAddress || "null")
    const address = addressData ? addressData : { list: [] }

    // Try to load Config from local storage    
    let config
    const serializedConfig = localStorage.getItem("config")
    const configData = JSON.parse(serializedConfig || "null")
    if (configData) {
      config = configData
    } else {
      const newEndpoints: RPCEndpoint[] = []
      const externalList = createWsEndpoints(replaceText)
      for (const auxEndpoint of externalList) {
        if (auxEndpoint.value) {
          newEndpoints.push({
            value: auxEndpoint.value,
            chainName: auxEndpoint.text as string,
            hostedBy: auxEndpoint.textBy,
          })
        }
      }
      config = {
        endpoints: newEndpoints,
        selectedEndpoint: newEndpoints[0],
        utcTime: false,
      }
    }
    return {
      address,
      config,
    }
  } catch (err) {
    return {}
  }
}

const middleware = [thunk]

const store = createStore(
  rootReducer,
  loadSavedOrDefaultConfig(),
  compose(applyMiddleware(...middleware))
)

store.subscribe(() => {
  try {
    console.log("updating")
    console.log(store.getState())
    const serializedConfig = JSON.stringify(store.getState().config)
    localStorage.setItem("config", serializedConfig)
    const serializedAddress = JSON.stringify(store.getState().address)
    localStorage.setItem("address", serializedAddress)
  } catch (err) {
    console.log(err)
  }
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default store
