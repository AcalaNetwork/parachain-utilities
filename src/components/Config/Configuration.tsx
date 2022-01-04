import React, { ReactNode, useContext, useState } from 'react'
import { Button, Divider, message, Row, Space, Switch, Table, Popconfirm } from 'antd'
import './Configuration.less'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  deleteNetwork,
  selectNetwork,
  toggleNetwork,
  deleteEndpoint,
  setUtcTime,
  toggleEndpoint,
  resetConfig,
} from '../../store/actions/configActions'
import { PolkadotNetwork, RPCEndpoint } from '../../types'
import { CheckOutlined, DeleteOutlined, PlusOutlined, UndoOutlined } from '@ant-design/icons'
import AddEndpointModal from './AddEndpointModal'
import { ApiContext, ApiContextData } from '../utils/ApiProvider'
import AddNetworkModal from './AddNetworkModal'

function Configuration(): React.ReactElement {
  const { deleteNetworkConnection } = useContext<ApiContextData>(ApiContext)
  const dispatch = useAppDispatch()
  const [showAddNetworkModal, setShowAddNetworkModal] = useState(false)
  const [showAddEndpointModal, setShowAddEndpointModal] = useState(false)
  const [networkChosenToAdd, setNetworkChosenToAdd] = useState('')
  const config = useAppSelector((state) => state.config)

  const onUtcChange = (checked: boolean) => {
    dispatch(setUtcTime(checked))
  }

  const renderEndpointWithHost = (text: string, row: RPCEndpoint) => {
    return (
      <>
        {text}
        {row.hostedBy ? <span className="hosted-by-label"> - {row.hostedBy}</span> : ''}
      </>
    )
  }

  const handleAddNetwork = () => {
    setShowAddNetworkModal(true)
  }

  const handleToggleNetwork = (network: PolkadotNetwork) => {
    dispatch(toggleNetwork(network.networkName))
  }

  const handleSelectNetwork = (network: PolkadotNetwork) => {
    dispatch(selectNetwork(network))
  }

  const handleDeleteNetwork = (network: PolkadotNetwork) => {
    dispatch(deleteNetwork(network.networkName))
  }

  const handleAddEndpoint = (networkName: string) => {
    setNetworkChosenToAdd(networkName)
    setShowAddEndpointModal(true)
  }

  const handleToggleEndpoint = (networkName: string, endpoint: RPCEndpoint) => {
    dispatch(toggleEndpoint(networkName, endpoint.value))
    deleteNetworkConnection(networkName)
  }

  const handleDeleteEndpoint = (networkName: string, endpoint: RPCEndpoint) => {
    dispatch(deleteEndpoint(networkName, endpoint.value))
    deleteNetworkConnection(networkName)
  }

  const handleResetConfig = () => {
    dispatch(resetConfig())
    setTimeout(() => location.reload(), 100)
  }

  const renderNetworkToggle = (row: PolkadotNetwork) => {
    return (
      <Switch
        checked={row.enabled}
        checkedChildren="Enabled"
        unCheckedChildren="Disabled"
        onChange={() => {
          if (row.networkName === config?.selectedNetwork?.networkName) {
            message.warning("Can't disable the selected network")
            return
          }
          handleToggleNetwork(row)
        }}
      />
    )
  }

  const renderNetworkActions = (row: PolkadotNetwork) => {
    return (
      <Space>
        <Button
          type="default"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteNetwork(row)}
          disabled={row.networkName === config?.selectedNetwork?.networkName}
        >
          Delete
        </Button>
        {config?.selectedNetwork?.networkName === row.networkName ? (
          <Button type="primary" size="small" icon={<CheckOutlined />}>
            Default
          </Button>
        ) : (
          <Button type="default" onClick={() => handleSelectNetwork(row)} size="small" disabled={!row.enabled}>
            Select as default
          </Button>
        )}
      </Space>
    )
  }

  const renderExpandedRow = (row: PolkadotNetwork): ReactNode => {
    const endpointColumns = [
      {
        title: 'Endpoint Name',
        dataIndex: 'value',
        key: 'value',
        render: renderEndpointWithHost,
      },
      {
        title: '',
        key: 'toggle',
        render: (endpoint: RPCEndpoint) => renderEndpointToggle(row, endpoint),
      },
      {
        title: 'Actions',
        key: 'actions',
        render: (endpoint: RPCEndpoint) => renderEndpointActions(row, endpoint),
      },
    ]

    const renderAddEndpointHeader = (): ReactNode => {
      return (
        <Button
          className="add-endpoint-button"
          type="default"
          onClick={() => handleAddEndpoint(row.networkName)}
          icon={<PlusOutlined />}
        >
          Add endpoint
        </Button>
      )
    }

    return (
      <Table
        showHeader={false}
        columns={endpointColumns}
        dataSource={row.endpoints}
        pagination={false}
        title={renderAddEndpointHeader}
        rowKey="value"
      />
    )
  }

  const renderEndpointToggle = (network: PolkadotNetwork, endpoint: RPCEndpoint) => {
    return (
      <Switch
        checked={endpoint.enabled}
        checkedChildren="Enabled"
        unCheckedChildren="Disabled"
        onChange={() => {
          const enabledList = network.endpoints.filter((auxEndpoint) => auxEndpoint.enabled)
          if (enabledList.length === 1 && enabledList[0].value === endpoint.value) {
            message.warning('Needs to have at least one endpoint enabled')
            return
          }
          handleToggleEndpoint(network.networkName, endpoint)
        }}
      />
    )
  }

  const renderEndpointActions = (network: PolkadotNetwork, endpoint: RPCEndpoint) => {
    return (
      <Space>
        <Button
          type="default"
          danger
          size="small"
          icon={<DeleteOutlined />}
          onClick={() => {
            const enabledList = network.endpoints.filter((auxEndpoint) => auxEndpoint.enabled)
            if (enabledList.length === 1 && enabledList[0].value === endpoint.value) {
              message.warning('Needs to have at least one endpoint enabled')
              return
            }
            handleDeleteEndpoint(network.networkName, endpoint)
          }}
        >
          Delete
        </Button>
      </Space>
    )
  }

  const columns = [
    {
      title: '',
      key: 'toggle',
      render: renderNetworkToggle,
    },
    {
      title: 'Network Name',
      dataIndex: 'networkName',
      key: 'networkName',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: renderNetworkActions,
    },
  ]

  return (
    <div className="configuration-container">
      <Row align="middle">
        <Space>
          <h2 className="mb-0">Transform to UTC Time:</h2>
          <Switch checked={config.utcTime} onChange={onUtcChange} checkedChildren="Yes" unCheckedChildren="No" />
        </Space>
      </Row>
      <label htmlFor="utcSwitch">
        {config.utcTime ? 'Displaying all datetime with UTC format' : 'Displaying all datetime in local timezone'}
      </label>
      <Divider />
      <div>
        <h2 className="mb-1">Networks:</h2>
        <div>
          Currently Selected is <span className="highlight-endpoint">{config.selectedNetwork?.networkName}</span>
        </div>
        <Row className="my-3">
          <Button className="add-network-button" type="default" onClick={handleAddNetwork} icon={<PlusOutlined />}>
            Add network
          </Button>
          <Popconfirm
            title="Are you sure you want to reset network configuration?"
            onConfirm={handleResetConfig}
            okText="Reset"
            okType="danger"
          >
            <Button className="add-network-button" type="default" icon={<UndoOutlined />}>
              Reset Config
            </Button>
          </Popconfirm>
        </Row>
        <Table
          className="networks-table"
          dataSource={config.networks}
          columns={columns}
          expandable={{ expandedRowRender: renderExpandedRow }}
          rowKey="networkName"
        />
      </div>
      <AddNetworkModal showModal={showAddNetworkModal} setShowModal={setShowAddNetworkModal} />
      <AddEndpointModal
        showModal={showAddEndpointModal}
        setShowModal={setShowAddEndpointModal}
        chosenNetwork={networkChosenToAdd}
      />
    </div>
  )
}

export default Configuration
