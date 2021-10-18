import React, { useContext, useState } from "react"
import {
  Button,
  Divider,
  message,
  Row,
  Space,
  Switch,
  Table,
} from "antd"
import "./Configuration.less"
import { useAppDispatch, useAppSelector } from "../../store/hooks"
import {
  deleteEndpoint,
  selectEndpoint,
  setUtcTime,
  toggleEndpoint,
} from "../../store/actions/configActions"
import { RPCEndpoint } from "../../types"
import { CheckOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons"
import AddEndpointModal from "./AddEndpointModal"
import { ApiContext, ApiContextData } from "../utils/ApiProvider"

function Configuration(): React.ReactElement {
  const { connectToApi } = useContext<ApiContextData>(ApiContext)
  const dispatch = useAppDispatch()
  const [showAddEndpointModal, setShowAddEndpointModal] = useState(false)
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

  const handleAddEndpoint = () => {
    setShowAddEndpointModal(true)
  }

  const handleToggleEndpoint = (endpoint: RPCEndpoint) => {
    dispatch(toggleEndpoint(endpoint.value))
  }

  const handleSelectEndpoint = (endpoint: RPCEndpoint) => {
    dispatch(selectEndpoint(endpoint))
    connectToApi(endpoint.value)
  }

  const handleDeleteEndpoint = (endpoint: RPCEndpoint) => {
    dispatch(deleteEndpoint(endpoint.value))
  }

  const renderEndpointToggle = (row: RPCEndpoint) => {
    return (
      <Switch
        checked={row.enabled}
        checkedChildren='Enabled'
        unCheckedChildren='Disabled'
        onChange={() => {
          if (row.value === config?.selectedEndpoint?.value) {
            message.warning("Can't disable the selected endpoint")
            return
          }
          handleToggleEndpoint(row)
        }}
      />
    )
  }

  const renderEndpointActions = (row: RPCEndpoint) => {
    return (
      <Space>
        <Button
          type='default'
          danger
          size='small'
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteEndpoint(row)}
          disabled={row.value === config?.selectedEndpoint?.value}>
          Delete
        </Button>
        {config?.selectedEndpoint?.value === row.value ? (
          <Button type='primary' size='small' icon={<CheckOutlined />}>
            Default
          </Button>
        ) : (
          <Button
            type='default'
            onClick={() => handleSelectEndpoint(row)}
            size='small'
            disabled={!row.enabled}>
            Select
          </Button>
        )}
      </Space>
    )
  }

  const columns = [
    {
      title: "",
      key: "toggle",
      render: renderEndpointToggle,
    },
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
      <Row align='middle'>
        <Space>
          <h2 className='mb-0'>Transform to UTC Time:</h2>
          <Switch
            checked={config.utcTime}
            onChange={onUtcChange}
            checkedChildren='Yes'
            unCheckedChildren='No'
          />
        </Space>
      </Row>
      <label htmlFor='utcSwitch'>
        {config.utcTime
          ? "Displaying all datetime with UTC format"
          : "Displaying all datetime in local timezone"}
      </label>
      <Divider />
      <div>
        <h2 className='mb-1'>RPC endpoints:</h2>
        <div>
          Currently Selected is{" "}
          <span className='highlight-endpoint'>
            {config.selectedEndpoint?.chainName}
          </span>{" "}
          ({config.selectedEndpoint?.value})
        </div>
        <Row className='my-3'>
          <Button
            className='addEndpointButton'
            type='default'
            onClick={handleAddEndpoint}
            icon={<PlusOutlined />}>
            Add endpoint
          </Button>
        </Row>
        <Table dataSource={config.endpoints} columns={columns} />
      </div>
      <AddEndpointModal
        showModal={showAddEndpointModal}
        setShowModal={setShowAddEndpointModal}
      />
    </div>
  )
}

export default Configuration
