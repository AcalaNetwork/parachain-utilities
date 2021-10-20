import { BarChartOutlined } from "@ant-design/icons"
import { ApiPromise } from "@polkadot/api"
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
import { PolkadotNetwork } from "../../types"
import { formatDate, toUnixTimestamp } from "../../utils/UtilsFunctions"
import { ApiContext, ApiContextData, connectToApi } from "../utils/ApiProvider"
import "./BlockTime.less"

interface BlockTimeFormValues {
  datetime: Moment
  blockNumber: number
  expectedBlockTime: number
}

interface BlockTimeResult {
  chainName: string
  estimateResult?: number | string
  type: string
}

function BlockTime(): React.ReactElement {
  const { apiConnections, apiStatus } = useContext<ApiContextData>(ApiContext)
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
      const auxApi = await connectToApi(
        apiConnections,
        apiStatus,
        config.selectedNetwork || ({} as PolkadotNetwork)
      )
      const timeMs = auxApi.consts.babe.expectedBlockTime.toNumber()

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

    const enabledNetworks = config.networks.filter(network => network.enabled)
    let index = 0
    while (index < enabledNetworks.length) {
      try {
        const api = await connectToApi(
          apiConnections,
          apiStatus,
          enabledNetworks[index]
        )

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

        // Add estimate to results
        auxResults.push({
          chainName: enabledNetworks[index].networkName,
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

    const enabledNetworks = config.networks.filter(network => network.enabled)
    let index = 0
    while (index < enabledNetworks.length) {
      try {
        const api = await connectToApi(
          apiConnections,
          apiStatus,
          enabledNetworks[index]
        )

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

        // Add estimate to results
        setResults(oldResults => {
          return [
            ...oldResults,
            {
              chainName: enabledNetworks[index].networkName,
              estimateResult: result,
              type,
            },
          ]
        })

        index += 1
      } catch (err) {
        message.error("An error happened when estimating block times/numbers")
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
    // If times match, return directly
    if (targetTime === currentTime) {
      return currentBlockNumber
    }

    // Get timestamp at first block (block 1)
    const firstBlockHash = await api.rpc.chain.getBlockHash(1)
    const firstBlockTime = (
      await api.query.timestamp.now.at(firstBlockHash)
    ).toNumber()

    // Handle special cases
    if (targetTime <= firstBlockTime) {
      return 1
    } else if (currentBlockNumber === 2) {
      return currentBlockNumber
    }

    let leftBlockNumber = 1
    let leftBlockTime = firstBlockTime
    let rightBlockNumber = currentBlockNumber
    let rightBlockTime = currentTime
    let directionLeftToRight = false

    while (leftBlockNumber < rightBlockNumber) {
      // Try to estimate target block number, depending on direction, we set the search block
      // from the left or from the right. Minimum searchBlocNumber difference from left or right is 1
      let searchBlockNumber
      if (directionLeftToRight) {
        searchBlockNumber = Math.min(
          rightBlockNumber - 1,
          leftBlockNumber +
            Math.max(
              1,
              Math.round((targetTime - leftBlockTime) / expectedBlockTime)
            )
        )
      } else {
        searchBlockNumber = Math.max(
          leftBlockNumber + 1,
          rightBlockNumber -
            Math.max(
              1,
              Math.round((rightBlockTime - targetTime) / expectedBlockTime)
            )
        )
      }
      // Load search block time
      const searchBlockHash = await api.rpc.chain.getBlockHash(
        searchBlockNumber
      )
      const searchBlockTime = (
        await api.query.timestamp.now.at(searchBlockHash)
      ).toNumber()

      // If we found the block, return the value
      if (searchBlockTime === targetTime) return searchBlockNumber

      // Assign new left/right block
      if (targetTime < searchBlockTime) {
        rightBlockNumber = searchBlockNumber
        rightBlockTime = searchBlockTime
        directionLeftToRight = false
      } else {
        leftBlockNumber = searchBlockNumber
        leftBlockTime = searchBlockTime
        directionLeftToRight = true
      }

      // If both left and right block are next to each other, verify if target time is in-between
      if (Math.abs(rightBlockNumber - leftBlockNumber) === 1) {
        if (leftBlockTime < targetTime && targetTime < rightBlockTime) {
          return rightBlockNumber
        } else {
          break
        }
      }
    }

    throw Error("Error estimating the block number")
  }

  const renderChain = (row: BlockTimeResult) => {
    return <div>{row.chainName}</div>
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
        initialValues={{ chain: config.selectedNetwork?.networkName }}
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
      <Table dataSource={results} columns={columns} rowKey='chainName' />
    </div>
  )
}

export default BlockTime
