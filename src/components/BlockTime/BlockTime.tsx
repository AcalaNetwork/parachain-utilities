import { BarChartOutlined } from "@ant-design/icons"
import { ApiPromise, WsProvider } from "@polkadot/api"
import {
  Button,
  DatePicker,
  Form,
  InputNumber,
  message,
  Row,
  Space,
  Spin,
  Table,
} from "antd"
import { Moment } from "moment"
import React, { useContext, useEffect, useState } from "react"
import { useAppSelector } from "../../store/hooks"
import { formatDate, toUnixTimestamp } from "../../utils/UtilsFunctions"
import { ApiContext, ApiContextData } from "../utils/ApiProvider"
import "./BlockTime.less"

interface BlockTimeFormValues {
  datetime: Moment
  blockNumber: number
  expectedBlockTime: number
}

interface BlockTimeResult {
  chainName: string
  endpoint: string
  estimateResult?: number | string
  type: string
}

function BlockTime(): React.ReactElement {
  const { api } = useContext<ApiContextData>(ApiContext)
  const [formBlocks] = Form.useForm()
  const config = useAppSelector(state => state.config)
  const [results, setResults] = useState<Array<BlockTimeResult>>([])
  const [isOptionalFieldsValid, setIsOptionalFieldsValid] = useState(false)
  const [isExpectedTimeLoading, setIsExpectedTimeLoading] = useState(false)
  const [defaultBlockTime, setDefaultBlockTime] = useState<number | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadExpectedBlockTime()
  }, [])

  const loadExpectedBlockTime = async () => {
    try {
      setIsExpectedTimeLoading(true)

      // Get default block time
      const timeMs = api.consts.babe.expectedBlockTime.toNumber()

      if (!formBlocks.getFieldValue("expectedBlockTime")) {
        formBlocks.setFieldsValue({
          expectedBlockTime: timeMs,
        })
      }
      setDefaultBlockTime(timeMs)
      setIsExpectedTimeLoading(false)
    } catch (err) {
      console.log(err)
      message.error("An error ocurred when trying to load expected block time.")
      setIsExpectedTimeLoading(false)
    }
  }

  const checkOptionalFields = (
    changedValues: Record<string, unknown>,
    values: BlockTimeFormValues
  ) => {
    // Validate that start block is less than end block
    if (changedValues && !values.blockNumber && !values.datetime) {
      setIsOptionalFieldsValid(false)
      formBlocks.setFields([
        {
          name: "blockNumber",
          value: values.blockNumber,
          errors: ["Enter block number or datetime"],
        },
        {
          name: "datetime",
          value: values.datetime,
          errors: ["Enter block number or datetime"],
        },
      ])
    } else {
      setIsOptionalFieldsValid(true)
      formBlocks.setFields([
        {
          name: "blockNumber",
          value: values.blockNumber,
          errors: [],
        },
        {
          name: "datetime",
          value: values.datetime,
          errors: [],
        },
      ])
      formBlocks.validateFields()
    }
  }

  const handleOnCalculate = (values: BlockTimeFormValues) => {
    calculateAverageBlockTime(values)
  }

  const calculateAverageBlockTime = async (values: BlockTimeFormValues) => {
    try {
      const { blockNumber, datetime, expectedBlockTime } = values
      setResults([])

      if (blockNumber) {
        estimateForBlockNumber(blockNumber, expectedBlockTime)
      } else {
        estimateForDateTime(datetime, expectedBlockTime)
      }
    } catch (err) {
      console.log(err)
      message.error("An error ocurred when loading block data.")
      setIsLoading(false)
    }
  }

  const estimateForBlockNumber = async (
    blockNumber: number,
    expectedBlockTime: number
  ) => {
    setIsLoading(true)
    const auxResults: BlockTimeResult[] = []

    const enabledEndpoints = config.endpoints.filter(
      endpoint => endpoint.enabled
    )
    let index = 0
    while (index < enabledEndpoints.length) {
      try {
        // Connect to chain
        const provider = new WsProvider(enabledEndpoints[index].value)

        provider.on("error", () => {
          provider.disconnect()
          message.error(
            "An error ocurred when trying to connect to the endpoint"
          )
          setIsLoading(false)
        })

        // Create the API
        const api = await ApiPromise.create({ provider })

        // Get current block number
        const latestBlock = await api.rpc.chain.getHeader()
        const currentBlockNumber = latestBlock.number.toNumber()

        let formattedResult = ""
        let type = ""

        // If it is future, estimate the date time
        if (blockNumber > currentBlockNumber) {
          const currentHash = await api.rpc.chain.getBlockHash(
            currentBlockNumber
          )
          const currentTime = await api.query.timestamp.now.at(currentHash)
          const estimatedTime =
            currentTime.toNumber() +
            expectedBlockTime * (blockNumber - currentBlockNumber)
          formattedResult = formatDate(estimatedTime, config.utcTime)
          type = "Future"

          // If it is past, fetch the blocktime
        } else {
          const pastHash = await api.rpc.chain.getBlockHash(blockNumber)
          const pastTime = await api.query.timestamp.now.at(pastHash)
          formattedResult = formatDate(pastTime.toNumber(), config.utcTime)
          type = "Past"
        }

        provider.disconnect()

        // Add estimate to results
        auxResults.push({
          chainName: enabledEndpoints[index].chainName,
          endpoint: enabledEndpoints[index].value,
          estimateResult: formattedResult,
          type,
        })

        index += 1
      } catch (err) {
        console.log(err)
        index += 1
      }
    }
    setResults(auxResults)
    setIsLoading(false)
  }

  const estimateForDateTime = async (
    datetime: Moment,
    expectedBlockTime: number
  ) => {
    setIsLoading(true)
    const inputTimestamp = toUnixTimestamp(datetime, config.utcTime)

    const enabledEndpoints = config.endpoints.filter(
      endpoint => endpoint.enabled
    )
    let index = 0
    while (index < enabledEndpoints.length) {
      try {
        // Connect to chain
        const provider = new WsProvider(enabledEndpoints[index].value)

        provider.on("error", () => {
          provider.disconnect()
          message.error(
            "An error ocurred when trying to connect to the endpoint"
          )
          setIsLoading(false)
        })

        // Create the API
        const api = await ApiPromise.create({ provider })

        // Get current block number
        const latestBlock = await api.rpc.chain.getHeader()
        const currentBlockNumber = latestBlock.number.toNumber()
        const currentHash = await api.rpc.chain.getBlockHash(currentBlockNumber)
        const currentTime = (
          await api.query.timestamp.now.at(currentHash)
        ).toNumber()

        let result: number
        let type = ""

        // If it is future, estimate the block number
        if (inputTimestamp > currentTime) {
          result =
            currentBlockNumber +
            Math.ceil((inputTimestamp - currentTime) / expectedBlockTime)
          type = "Future"

          // If it is past, find the block number
        } else {
          result = await searchPastBlockNumber(
            api,
            inputTimestamp,
            currentTime,
            currentBlockNumber,
            expectedBlockTime
          )
          type = "Past"
        }

        provider.disconnect()

        // Add estimate to results
        setResults(oldResults => {
          return [
            ...oldResults,
            {
              chainName: enabledEndpoints[index].chainName,
              endpoint: enabledEndpoints[index].value,
              estimateResult: result,
              type,
            },
          ]
        })

        index += 1
      } catch (err) {
        console.log(err)
        index += 1
      }
    }
    setIsLoading(false)
  }

  const searchPastBlockNumber = async (
    api: ApiPromise,
    targetTime: number,
    currentTime: number,
    currentBlockNumber: number,
    expectedBlockTime: number
  ): Promise<number> => {
    // If times match, return
    if (targetTime === currentTime) {
      return currentBlockNumber
    }

    // Try to estimate target block number, minimum value is 1
    let searchBlockNumber = Math.max(
      1,
      currentBlockNumber -
        Math.ceil((currentTime - targetTime) / expectedBlockTime)
    )

    let searchHash = await api.rpc.chain.getBlockHash(searchBlockNumber)
    let searchTime = (await api.query.timestamp.now.at(searchHash)).toNumber()

    // If estimated search time matches target, return value
    if (searchTime === targetTime) {
      return searchBlockNumber
    }

    // Navigate until finding the block
    const directionIncreasing = searchTime < targetTime
    while (searchBlockNumber > 0 && searchBlockNumber < currentBlockNumber) {
      // Navigate 1 block
      const newBlockNumber = searchBlockNumber + (directionIncreasing ? 1 : -1)

      // Load new block time
      const newHash = await api.rpc.chain.getBlockHash(newBlockNumber)
      const newTime = (await api.query.timestamp.now.at(newHash)).toNumber()

      // If we found the block, return the value
      if (directionIncreasing && newTime >= targetTime) return newBlockNumber
      if (!directionIncreasing && newTime < targetTime) return searchBlockNumber

      // If we didn't find it, update search and continue
      searchBlockNumber = newBlockNumber
      searchHash = newHash
      searchTime = newTime
    }

    return 1
  }

  const renderChain = (row: BlockTimeResult) => {
    return (
      <div>
        {row.chainName} ({row.endpoint})
      </div>
    )
  }

  const renderResult = (row: BlockTimeResult) => {
    return <div>{row.estimateResult}</div>
  }

  const columns = [
    {
      title: "Chain",
      key: "chain",
      render: renderChain,
    },
    {
      title: "Type",
      key: "type",
      dataIndex: "type",
    },
    {
      title: "Estimated",
      key: "action",
      render: renderResult,
    },
  ]

  return (
    <div className='block-time-container'>
      <Form
        className='mb-4'
        layout='horizontal'
        form={formBlocks}
        onValuesChange={checkOptionalFields}
        initialValues={{ chain: config.selectedEndpoint?.value }}
        onFinish={handleOnCalculate}>
        <Row>
          <Space>
            <Form.Item name='blockNumber' label='Block Number'>
              <InputNumber min={1} />
            </Form.Item>
            <Form.Item name='datetime' label='Date time'>
              <DatePicker showTime />
            </Form.Item>
          </Space>
        </Row>
        <Row>
          <Form.Item
            name='expectedBlockTime'
            label='Expected block time (ms)'
            rules={[
              {
                required: true,
                message: "Field Required",
              },
            ]}>
            <InputNumber min={1} />
          </Form.Item>
          {isExpectedTimeLoading && (
            <div className='ml-2 mt-2'>
              <Spin />
            </div>
          )}
          {defaultBlockTime && (
            <div className='ml-2 mt-2 default-block-time'>
              Default value: {defaultBlockTime} ms
            </div>
          )}
        </Row>
        <Form.Item>
          <Button
            className='calculate-btn'
            type='primary'
            icon={<BarChartOutlined />}
            disabled={!isOptionalFieldsValid || isLoading}
            loading={isLoading}
            htmlType='submit'>
            Calculate Average Block Time
          </Button>
        </Form.Item>
      </Form>
      <h2>Result:</h2>
      <Table dataSource={results} columns={columns} />
    </div>
  )
}

export default BlockTime
