import React from 'react'
import './App.less'
import { Provider } from 'react-redux'
import setupStore from './store'
import { PersistGate } from 'redux-persist/integration/react'
import ParachainUtilities from './components/ParachainUtilities'
import { ApiProvider } from './components/utils/ApiProvider'

const { store, persistor } = setupStore()

function App(): React.ReactElement {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <ApiProvider>
          <ParachainUtilities />
        </ApiProvider>
      </PersistGate>
    </Provider>
  )
}

export default App
