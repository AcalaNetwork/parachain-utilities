import { combineReducers } from 'redux'
import addressReducer from './addressReducer'
import configReducer from './configReducer'
import { persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage'
import hardSet from 'redux-persist/lib/stateReconciler/hardSet'

const addressPersistConfig = {
  key: 'address',
  storage: storage,
  whitelist: ['list'],
  stateReconciler: hardSet,
}

const configPersistConfig = {
  key: 'config',
  storage: storage,
  whitelist: ['networks', 'utcTime', 'selectedNetwork'],
  stateReconciler: hardSet,
}

export default combineReducers({
  address: persistReducer(addressPersistConfig, addressReducer),
  config: persistReducer(configPersistConfig, configReducer),
})
