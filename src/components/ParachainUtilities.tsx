import React, { useEffect, useState } from "react"
import { Layout, message, Spin } from "antd"
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
import { selectNetwork, setNetworkList } from "../store/actions/configActions"
import { PolkadotNetwork } from "../types"
import "./ParachainUtilities.less"

function ParachainUtilities(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(false)
  const config = useAppSelector((state) => {
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
      let newNetworks: PolkadotNetwork[] = []
      // If config has no endpoint, load default configuration
      if (!config.networks || config.networks.length === 0) {
        const networksMap: Record<string, PolkadotNetwork> = {}
        const externalList = createWsEndpoints(replaceText)
        for (const auxEndpoint of externalList) {
          const networkName = auxEndpoint.text as string
          if (
            auxEndpoint.value &&
            !auxEndpoint.isLightClient &&
            !auxEndpoint.isUnreachable
          ) {
            if (networksMap[networkName]) {
              networksMap[networkName].endpoints.push({
                value: auxEndpoint.value,
                hostedBy: auxEndpoint.textBy,
                enabled: false,
              })
            } else {
              networksMap[networkName] = {
                networkName,
                endpoints: [
                  {
                    value: auxEndpoint.value,
                    hostedBy: auxEndpoint.textBy,
                    enabled: true,
                  },
                ],
                enabled: false,
              }
            }
          }
        }
        // By default enable Polkadot and Kusama
        networksMap["Polkadot"].enabled = true
        networksMap["Polkadot"].endpoints[0].enabled = true
        networksMap["Kusama"].enabled = true
        networksMap["Kusama"].endpoints[0].enabled = true
        newNetworks = Object.values(networksMap)

        dispatch(setNetworkList(newNetworks))
      }
      // If no endpoint is selected, set the first enabled endpoint as selected
      if (!config.selectedNetwork) {
        dispatch(
          selectNetwork(
            config.networks?.find((auxEndpoint) => auxEndpoint.enabled) ||
              newNetworks[0]
          )
        )
      }
    } catch (err) {
      console.log(err)
      message.error("An error ocurred when trying to load default networks")
    }
  }

  return (
    <BrowserRouter>
      <Spin spinning={isLoading} indicator={CustomSpinner}>
        <Layout className="app-layout">
          <NavbarComponent />
          <Layout.Content className="app-content">
            <Switch>
              <Route exact path="/address-book" component={AddressBook} />
              <Route
                exact
                path="/average-block-time"
                component={AverageBlockTime}
              />
              <Route exact path="/block-time" component={BlockTime} />
              <Route exact path="/block-author" component={BlockAuthor} />
              <Route exact path="/config" component={Configuration} />
              <Redirect to="/address-book" />
            </Switch>
          </Layout.Content>
        </Layout>
      </Spin>
    </BrowserRouter>
  )
}

export default ParachainUtilities
