import { BarChartOutlined } from "@ant-design/icons"
import { ApiPromise } from "@polkadot/api"
import {
  Button,
  Col,
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
import { formatDate, getExpectedBlockTime, toUnixTimestamp } from "../../utils/UtilsFunctions"
import { ApiContext, ApiContextData, connectToApi } from "../utils/ApiProvider"
import "./BlockTime.less"

interface BlockTimeFormValues {
  datetime: Moment
  blockNumber: number
  blockTimes: number[]
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
  const selectedNetworks = config.networks.filter(
    auxNetwork => auxNetwork.enabled
  )
  const [results, setResults] = useState<Array<BlockTimeResult>>([])
  const [isOptionalFieldsValid, setIsOptionalFieldsValid] = useState(false)
  const [isExpectedTimeLoading, setIsExpectedTimeLoading] = useState(false)
  const [defaultBlockTimes, setDefaultBlockTimes] = useState<
    (number | undefined)[]
  >(selectedNetworks.map(() => undefined))
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadExpectedBlockTime()
  }, [])

  const loadExpectedBlockTime = async () => {
    try {
      setIsExpectedTimeLoading(true)

      const apis = await Promise.all(
        selectedNetworks.map(auxNetwork => {
          return connectToApi(apiConnections, apiStatus, auxNetwork)
        })
      )

      const newDefaults = apis.map(auxApi =>
        getExpectedBlockTime(auxApi)
      )

      formBlocks.setFieldsValue({
        blockTimes: newDefaults.map(
          (auxDefault, index) =>
            formBlocks.getFieldValue("blockTimes")[index] || auxDefault
        ),
      })

      setDefaultBlockTimes(newDefaults.map(auxDefault => auxDefault || 0))
      setIsExpectedTimeLoading(false)
    } catch (err) {
      console.log(err)
      message.error("An error ocurred when trying to load expected block time.")
      setIsExpectedTimeLoading(false)
    }
  }

  const resetAllBlockTimes = () => {
    const blockTimes = defaultBlockTimes.map(auxTime => auxTime || 6000)
    formBlocks.setFieldsValue({
      blockTimes,
    })
  }

  const resetBlockTime = (index: number) => {
    const blockTimes = formBlocks.getFieldValue("blockTimes")
    blockTimes[index] = defaultBlockTimes[index] || 6000
    formBlocks.setFieldsValue({
      blockTimes,
    })
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
    calculateBlockTime(values)
  }

  const calculateBlockTime = async (values: BlockTimeFormValues) => {
    try {
      const { blockNumber, datetime, blockTimes } = values
      setResults([])

      if (blockNumber) {
        estimateForBlockNumber(blockNumber, blockTimes)
      } else {
        estimateForDateTime(datetime, blockTimes)
      }
    } catch (err) {
      console.log(err)
      message.error("An error ocurred when loading block data.")
      setIsLoading(false)
    }
  }

  const estimateForBlockNumber = async (
    blockNumber: number,
    expectedBlockTimes: number[]
  ) => {
    setIsLoading(true)
    const auxResults: BlockTimeResult[] = []

    let index = 0
    while (index < selectedNetworks.length) {
      try {
        const api = await connectToApi(
          apiConnections,
          apiStatus,
          selectedNetworks[index]
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
            expectedBlockTimes[index] * (blockNumber - currentBlockNumber)
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
          chainName: selectedNetworks[index].networkName,
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
    expectedBlockTimes: number[]
  ) => {
    setIsLoading(true)
    const inputTimestamp = toUnixTimestamp(datetime, config.utcTime)

    let index = 0
    while (index < selectedNetworks.length) {
      try {
        const api = await connectToApi(
          apiConnections,
          apiStatus,
          selectedNetworks[index]
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
            Math.ceil((inputTimestamp - currentTime) / expectedBlockTimes[index])
          type = "Future"

          // If it is past, find the block number
        } else {
          result = await searchPastBlockNumber(
            api,
            inputTimestamp,
            currentTime,
            currentBlockNumber,
            expectedBlockTimes[index]
          )
          type = "Past"
        }

        // Add estimate to results
        setResults(oldResults => {
          return [
            ...oldResults,
            {
              chainName: selectedNetworks[index].networkName,
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
        // Estimate using expectedBlockTime
        searchBlockNumber =
          leftBlockNumber +
          Math.max(
            1,
            Math.round((targetTime - leftBlockTime) / expectedBlockTime)
          )
        // If estimation goes too high, search block in the middle instead
        if (searchBlockNumber > rightBlockNumber - 1) {
          searchBlockNumber = Math.ceil(
            (leftBlockNumber + rightBlockNumber) / 2
          )
        }
      } else {
        // Estimate using expectedBlockTime
        searchBlockNumber =
          rightBlockNumber -
          Math.max(
            1,
            Math.round((rightBlockTime - targetTime) / expectedBlockTime)
          )
        // If estimation goes too low, search block in the middle instead
        if (searchBlockNumber < leftBlockNumber + 1) {
          searchBlockNumber = Math.floor(
            (leftBlockNumber + rightBlockNumber) / 2
          )
        }
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
        initialValues={{
          chain: config.selectedNetwork?.networkName,
          blockTimes: selectedNetworks.map(() => undefined),
        }}
        onFinish={handleOnCalculate}>
        <Row>
          <Space>
            <Form.Item name='blockNumber' label='Block Number'>
              <InputNumber className='block-number-input' min={1} />
            </Form.Item>
            <Form.Item name='datetime' label='Date time'>
              <DatePicker showTime />
            </Form.Item>
          </Space>
        </Row>
        <Form.List name='blockTimes'>
          {(fields, operations, { errors }) => {
            return (
              <div>
                <Row className='mb-2'>
                  <Col>Expected Block Times (ms):</Col>{" "}
                  <Col>
                    <Button
                      className='reset-block-time-btn ml-3'
                      onClick={resetAllBlockTimes}
                      disabled={isExpectedTimeLoading}>
                      Reset ALL block times
                    </Button>
                  </Col>
                </Row>
                {fields.map((field, index) => {
                  return (
                    <>
                      <span>{selectedNetworks[index].networkName}</span>
                      <Row>
                        <Form.Item
                          {...field}
                          rules={[
                            {
                              required: true,
                              message: "Please input expected block time",
                            },
                          ]}
                          key={index}>
                          <InputNumber min={1} />
                        </Form.Item>
                        {isExpectedTimeLoading && (
                          <div className='ml-2 mt-2'>
                            <Spin />
                          </div>
                        )}
                        {defaultBlockTimes[index] !== undefined && (
                          <div className='ml-2 mt-2 default-block-time'>
                            {defaultBlockTimes[index] === 0
                              ? "No default value"
                              : `Default value: ${defaultBlockTimes[index]} ms`}
                          </div>
                        )}
                        <Button
                          className='reset-block-time-btn ml-3'
                          onClick={() => resetBlockTime(index)}
                          disabled={isExpectedTimeLoading}>
                          Reset block time
                        </Button>
                      </Row>
                    </>
                  )
                })}

                <Form.ErrorList errors={errors} />
              </div>
            )
          }}
        </Form.List>

        {/* <Row>
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
          {defaultBlockTime !== undefined && (
            <div className='ml-2 mt-2 default-block-time'>
              {defaultBlockTime === 0
                ? "No default value"
                : `Default value: ${defaultBlockTime} ms`}
            </div>
          )}
        </Row> */}
        <Form.Item>
          <Button
            className='calculate-btn'
            type='primary'
            icon={<BarChartOutlined />}
            disabled={!isOptionalFieldsValid || isLoading}
            loading={isLoading}
            htmlType='submit'>
            Calculate Block Time
          </Button>
        </Form.Item>
      </Form>
      <h2>Result:</h2>
      <Table dataSource={results} columns={columns} rowKey='chainName' />
    </div>
  )
}

export default BlockTime
