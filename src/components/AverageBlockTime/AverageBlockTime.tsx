import { BarChartOutlined } from "@ant-design/icons"
import { ApiPromise, WsProvider } from "@polkadot/api"
import {
  Button,
  Form,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Table,
} from "antd"
import React, { useContext, useState } from "react"
import { useAppSelector } from "../../store/hooks"
import { ApiContext, ApiContextData } from "../utils/ApiProvider"
import "./AverageBlockTime.less"

interface AvgBlockTimeFormValues {
  startBlock: number
  endBlock: number
  chain: string
}

interface AvgBlockTimeResult {
  startBlock: number
  endBlock: number
  chain: string
  avgBlockTime: number
}

function AverageBlockTime(): React.ReactElement {
  const { api } = useContext<ApiContextData>(ApiContext)
  const [formBlocks] = Form.useForm()
  const config = useAppSelector(state => state.config)
  const [results, setResults] = useState<Array<AvgBlockTimeResult>>([])
  const [isBlockRangeValid, setIsBlockRangeValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const checkBlockRange = (
    changedValues: Record<string, unknown>,
    values: AvgBlockTimeFormValues
  ) => {
    // Validate that start block is less than end block
    if (changedValues && Number(values.startBlock) >= Number(values.endBlock)) {
      setIsBlockRangeValid(false)
      formBlocks.setFields([
        {
          name: "startBlock",
          value: values.startBlock,
          errors: ["Start Block must be less than End Block"],
        },
        {
          name: "endBlock",
          value: values.endBlock,
          errors: ["End Block must be greater than Start Block"],
        },
      ])
    } else {
      setIsBlockRangeValid(true)
      formBlocks.validateFields()
    }
  }

  const handleOnCalculate = (values: AvgBlockTimeFormValues) => {
    calculateAverageBlockTime(values)
  }

  const calculateAverageBlockTime = async (values: AvgBlockTimeFormValues) => {
    try {
      const { startBlock, endBlock, chain } = values

      setIsLoading(true)

      let auxApi
      let auxProvider = {} as WsProvider

      // If the chain is the default one, use that connection
      if (chain === config.selectedEndpoint?.value) {
        auxApi = api
      } else {
        // Connect to chain
        auxProvider = new WsProvider(chain)

        auxProvider.on("error", () => {
          auxProvider.disconnect()
          message.error(
            "An error ocurred when trying to connect to the endpoint"
          )
          setIsLoading(false)
        })

        // Create the API
        auxApi = await ApiPromise.create({ provider: auxProvider })
      }

      // Query start block and end block time
      const [startBlockHash, endBlockHash] = await Promise.all([
        auxApi.rpc.chain.getBlockHash(startBlock),
        auxApi.rpc.chain.getBlockHash(endBlock),
      ])
      const [startBlockTime, endBlockTime] = await Promise.all([
        auxApi.query.timestamp.now.at(startBlockHash),
        auxApi.query.timestamp.now.at(endBlockHash),
      ])

      if (chain !== config.selectedEndpoint?.value) auxProvider.disconnect()

      const timePassed = endBlockTime.toNumber() - startBlockTime.toNumber()
      const avgBlockTime = timePassed / (endBlock - startBlock) / 1000
      setResults(oldValue => [
        {
          startBlock,
          endBlock,
          chain,
          avgBlockTime,
        },
        ...oldValue,
      ])
      setIsLoading(false)
    } catch (err) {
      console.log(err)
      message.error("An error ocurred when loading block data.")
      setIsLoading(false)
    }
  }

  const renderAverageBlockTime = (value: number) => {
    return <div>{value.toFixed(3)} seconds</div>
  }

  const columns = [
    {
      title: "Start Block",
      dataIndex: "startBlock",
      key: "startBlock",
    },
    {
      title: "End Block",
      dataIndex: "endBlock",
      key: "endBlock",
    },
    {
      title: "Chain",
      dataIndex: "chain",
      key: "chain",
    },
    {
      title: "Average Block Time",
      dataIndex: "avgBlockTime",
      key: "avgBlockTime",
      render: renderAverageBlockTime,
    },
  ]

  return (
    <div className='average-block-time-container'>
      <Form
        className='mb-4'
        layout='horizontal'
        form={formBlocks}
        onValuesChange={checkBlockRange}
        initialValues={{ chain: config.selectedEndpoint?.value }}
        onFinish={handleOnCalculate}>
        <Row>
          <Space>
            <Form.Item
              name='startBlock'
              label='Start block'
              rules={[
                {
                  required: true,
                  message: "Field Required",
                },
              ]}>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item
              name='endBlock'
              label='End block'
              rules={[
                {
                  required: true,
                  message: "Field Required",
                },
              ]}>
              <InputNumber min={1} />
            </Form.Item>
          </Space>
        </Row>
        <Form.Item
          name='chain'
          label='Chain'
          rules={[
            {
              required: true,
              message: "Field Required",
            },
          ]}>
          <Select placeholder='Select chain...'>
            {config.endpoints
              .filter(endpoint => endpoint.enabled)
              .map((endpoint, index) => (
                <Select.Option key={index} value={endpoint.value}>
                  {endpoint.chainName} ({endpoint.value})
                </Select.Option>
              ))}
          </Select>
        </Form.Item>
        <Form.Item>
          <Button
            className='calculate-btn'
            type='primary'
            icon={<BarChartOutlined />}
            disabled={!isBlockRangeValid || isLoading}
            loading={isLoading}
            htmlType='submit'>
            Calculate Average Block Time
          </Button>
        </Form.Item>
      </Form>
      <h2>Results:</h2>
      <Table dataSource={results} columns={columns} />
    </div>
  )
}

export default AverageBlockTime
