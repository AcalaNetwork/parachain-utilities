import React, { useEffect, useState } from "react"
import { Layout, message, Spin } from "antd"
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
import {
  selectEndpoint,
  setEndpointList,
} from "./store/actions/configActions"
import { RPCEndpoint } from "./types"

function App(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false)
  const config = useAppSelector(state => {
    return state.config
  })
  const dispatch = useAppDispatch()

  useEffect(() => {
    setIsLoading(true)
    loadDefaultEndpoints()
    setIsLoading(false)
  }, [])

  const loadDefaultEndpoints = () => {
    try {
      const newEndpoints: RPCEndpoint[] = []
      // If config has no endpoint, load default configuration
      if (config.endpoints.length === 0) {
        const externalList = createWsEndpoints(replaceText)
        for (const auxEndpoint of externalList) {
          if (
            auxEndpoint.value &&
            !auxEndpoint.isLightClient &&
            !auxEndpoint.isUnreachable
          ) {
            newEndpoints.push({
              value: auxEndpoint.value,
              chainName: auxEndpoint.text as string,
              hostedBy: auxEndpoint.textBy,
              enabled: false,
            })
          }
        }
        newEndpoints[0].enabled = true
        dispatch(setEndpointList(newEndpoints))
      }
      // If no endpoint is selected, set the first enabled endpoint as selected
      if (!config.selectedEndpoint) {
        dispatch(
          selectEndpoint(
            config.endpoints.find(auxEndpoint => auxEndpoint.enabled) ||
              newEndpoints[0]
          )
        )
      }
    } catch (err) {
      message.error("An error ocurred when trying to load default endpoints")
    }
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
