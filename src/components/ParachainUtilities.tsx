import React, { useContext, useEffect, useState } from "react"
import { Button, Layout, message, Row, Spin } from "antd"
import { BrowserRouter, Switch, Route, Redirect } from "react-router-dom"
import { createWsEndpoints } from "@polkadot/apps-config"
import NavbarComponent from "./Navbar/Navbar"
import CustomSpinner from "./utils/CustomSpinner"
import AddressBook from "./AddressBook/AddressBook"
import Configuration from "./Config/Configuration"
import AverageBlockTime from "./AverageBlockTime/AverageBlockTime"
import BlockTime from "./BlockTime/BlockTime"
import BlockAuthor from "./BlockAuthor/BlockAuthor"
import { useAppDispatch, useAppSelector } from "../store/hooks"
import { replaceText } from "../utils/UtilsFunctions"
import { selectEndpoint, setEndpointList } from "../store/actions/configActions"
import { RPCEndpoint } from "../types"
import { ApiContext, ApiContextData } from "./utils/ApiProvider"
import "./ParachainUtilities.less"

function ParachainUtilities(): React.ReactElement {
  const {
    connected: apiConnected,
    error: apiError,
    loading: apiLoading,
    connectToApi,
  } = useContext<ApiContextData>(ApiContext)
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
      connectToApi(
        config.selectedEndpoint?.value ||
          config.endpoints.find(auxEndpoint => auxEndpoint.enabled)?.value ||
          newEndpoints[0].value
      )
    } catch (err) {
      message.error("An error ocurred when trying to load default endpoints")
    }
  }

  return (
    <BrowserRouter>
      <Spin spinning={isLoading} indicator={CustomSpinner}>
        <Layout className='app-layout'>
          {apiLoading ? (
            <Row className='app-layout' justify='center' align='middle'>
              <Spin className='mr-3' />
              Connecting to endpoint {config.selectedEndpoint?.value || ""}
            </Row>
          ) : apiError || !apiConnected ? (
            <Row className='app-layout' justify='center' align='middle'>
              An error happened with your connection to the chain API
              <Button
                className='ml-3'
                type='primary'
                onClick={() => connectToApi(config.selectedEndpoint?.value)}>
                Connect again
              </Button>
            </Row>
          ) : (
            <>
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
            </>
          )}
        </Layout>
      </Spin>
    </BrowserRouter>
  )
}

export default ParachainUtilities
