import React, { useEffect, useState } from "react"
import { Layout, Spin } from "antd"
import { BrowserRouter, Switch, Route, Redirect } from "react-router-dom"
import { createWsEndpoints } from "@polkadot/apps-config"
import NavbarComponent from "./components/Navbar"
import "./App.less"
import CustomSpinner from "./components/CustomSpinner"
import AddressBook from "./components/AddressBook/AddressBook"
import Configuration from "./components/Config/Configuration"
import AverageBlockTime from "./components/AverageBlockTime/AverageBlockTime"
import BlockTime from "./components/BlockTime/BlockTime"
import BlockAuthor from "./components/BlockAuthor/BlockAuthor"
import { useAppDispatch, useAppSelector } from "./store/hooks"
import { replaceText } from "./utils/UtilsFunctions"
import { setAddressList } from "./store/actions/addressActions"
import { setConfig } from "./store/actions/configActions"
import { RPCEndpoint } from "./types"

function App(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false)
  const dispatch = useAppDispatch()

  useEffect(() => {
    loadSavedOrDefaultConfig()
  }, [])

  const loadSavedOrDefaultConfig = () => {
    console.log('oops')
  }

  return (
    <BrowserRouter>
      <Spin spinning={isLoading} indicator={CustomSpinner}>
        <Layout className='app-layout'>
          <NavbarComponent />
          <Layout.Content className='app-content'>
            <Switch>
              <Route exact path='/address-book' component={AddressBook} />
              <Route
                exact
                path='/average-block-time'
                component={AverageBlockTime}
              />
              <Route exact path='/block-time' component={BlockTime} />
              <Route exact path='/block-author' component={BlockAuthor} />
              <Route exact path='/config' component={Configuration} />
              <Redirect to='/address-book' />
            </Switch>
          </Layout.Content>
        </Layout>
      </Spin>
    </BrowserRouter>
  )
}

export default App
