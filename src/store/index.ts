import { createStore, applyMiddleware, compose, Store } from 'redux'
import thunk from 'redux-thunk'
import { persistStore, persistReducer } from 'redux-persist'
import storage from 'redux-persist/lib/storage' // defaults to localStorage for web

import rootReducer from './reducers'
import { Persistor } from 'redux-persist/lib/types'

const middleware = [thunk]

const rootPersistConfig = {
  key: 'root',
  storage: storage,
  whitelist: ['addresses', 'config'],
}

const store = createStore(persistReducer(rootPersistConfig, rootReducer), compose(applyMiddleware(...middleware)))

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export default (): { store: Store; persistor: Persistor } => {
  const persistor = persistStore(store)
  return { store, persistor }
}
