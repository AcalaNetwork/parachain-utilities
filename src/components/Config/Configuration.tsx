import React from "react"
import { Button, Divider, Row, Space, Switch, Table } from "antd"
import "./Configuration.less"
import { useAppDispatch, useAppSelector } from "../../store/hooks"
import { selectEndpoint, setUtcTime } from "../../store/actions/configActions"
import { RPCEndpoint } from "../../types"

const Configuration = function NavbarComponent(): React.ReactElement {
  const dispatch = useAppDispatch()
  const config = useAppSelector(state => state.config)

  const onUtcChange = (checked: boolean) => {
    dispatch(setUtcTime(checked))
  }

  const renderChainNameWithHost = (text: string, row: RPCEndpoint) => {
    return (
      <>
        {text}
        {row.hostedBy ? (
          <span className='hosted-by-label'> - {row.hostedBy}</span>
        ) : (
          ""
        )}
      </>
    )
  }

  const handleSelectEndpoint = (endpoint: RPCEndpoint) => {
    dispatch(selectEndpoint(endpoint))
  }

  const renderEndpointActions = (row: RPCEndpoint) => {
    return (
      <Space>
        {config?.selectedEndpoint?.value === row.value ? (
          <Button type='primary' disabled>
            Selected
          </Button>
        ) : (
          <Button type='default' onClick={() => handleSelectEndpoint(row)}>
            Select
          </Button>
        )}
        <Button type='default' danger>
          Delete
        </Button>
      </Space>
    )
  }

  const columns = [
    {
      title: "Name",
      dataIndex: "chainName",
      key: "chainName",
      render: renderChainNameWithHost,
    },
    {
      title: "URL",
      dataIndex: "value",
      key: "value",
    },
    {
      title: "Actions",
      key: "action",
      render: renderEndpointActions,
    },
  ]

  return (
    <div className='configuration-container'>
      <div>
        <h3>Transform to UTC Time</h3>
        <div>
          <Switch
            checked={config.utcTime}
            onChange={onUtcChange}
          />
          <label>
            {config.utcTime
              ? "Displaying all datetime with UTC format"
              : "Displaying all datetime in local timezone"}
          </label>
        </div>
      </div>
      <Divider />
      <div>
        <h3>RPC endpoints</h3>
        <Row>
          <Space>
            <div>Selected Endpoint:</div>
            <div>
              {config.selectedEndpoint?.chainName} (
              {config.selectedEndpoint?.value})
            </div>
          </Space>
        </Row>
        <Row>
          <Button type='primary'>Add endpoint</Button>
        </Row>
        <Table dataSource={config.endpoints} columns={columns} />
      </div>
    </div>
  )
}

export default Configuration
