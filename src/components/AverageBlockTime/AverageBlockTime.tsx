import { BarChartOutlined } from "@ant-design/icons"
import {
  Button,
  Col,
  Form,
  InputNumber,
  message,
  Row,
  Select,
  Space,
  Spin,
  Table,
} from "antd"
import React, { useContext, useEffect, useState } from "react"
import { useAppSelector } from "../../store/hooks"
import { PolkadotNetwork } from "../../types"
import {
  estimateStartBlockNumber,
  formatDate,
  getExpectedBlockTime,
} from "../../utils/UtilsFunctions"
import { ApiContext, ApiContextData, connectToApi } from "../utils/ApiProvider"
import "./AverageBlockTime.less"

interface AvgBlockTimeFormValues {
  startBlock: number
  endBlock: number
  chain: string
}

interface AvgBlockTimeResult {
  startBlock: number
  startBlockTime: string
  endBlock: number
  endBlockTime: string
  chain: string
  avgBlockTime: number
}

function AverageBlockTime(): React.ReactElement {
  const { apiConnections, apiStatus } = useContext<ApiContextData>(ApiContext)
  const [formBlocks] = Form.useForm()
  const config = useAppSelector(state => state.config)
  const [results, setResults] = useState<Array<AvgBlockTimeResult>>([])
  const [isDefaultLoading, setIsDefaultLoading] = useState(false)
  const [defaultBlockTime, setDefaultBlockTime] = useState<number | undefined>()
  const [isBlockRangeValid, setIsBlockRangeValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadDefaults()
  }, [])

  const loadDefaults = async (overwriteValues = false) => {
    try {
      setIsDefaultLoading(true)
      const selectedChain = formBlocks.getFieldValue("chain")

      const network = config.networks.find(
        auxNetwork => auxNetwork.networkName === selectedChain
      )

      // Get default block time
      const auxApi = await connectToApi(
        apiConnections,
        apiStatus,
        network || ({} as PolkadotNetwork)
      )

      const timeMs = getExpectedBlockTime(auxApi)

      // Get current block number
      const latestBlock = await auxApi.rpc.chain.getHeader()
      const currentBlockNumber = latestBlock.number.toNumber()

      if (
        timeMs &&
        (overwriteValues || !formBlocks.getFieldValue("expectedBlockTime"))
      ) {
        formBlocks.setFieldsValue({
          expectedBlockTime: timeMs,
        })
      }

      if (
        currentBlockNumber &&
        (overwriteValues || !formBlocks.getFieldValue("endBlock"))
      ) {
        formBlocks.setFieldsValue({
          endBlock: currentBlockNumber,
        })
      }
      setDefaultBlockTime(timeMs)
      setIsDefaultLoading(false)
    } catch (err) {
      console.log(err)
      message.error("An error ocurred when trying to load end block.")
      setIsDefaultLoading(false)
    }
  }

  const handleNetworkChange = () => {
    loadDefaults(true)
  }

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

  const fillStartBlock = (hours = 0, days = 0, weeks = 0, months = 0) => {
    const endBlock = formBlocks.getFieldValue("endBlock")
    const expectedBlockTime = formBlocks.getFieldValue("expectedBlockTime")

    if (!endBlock || !expectedBlockTime) {
      message.error("Please set End block and Expected block time")
      return
    }

    formBlocks.setFieldsValue({
      startBlock: estimateStartBlockNumber(
        endBlock,
        expectedBlockTime,
        hours,
        days,
        weeks,
        months
      ),
    })

    setIsBlockRangeValid(true)
    formBlocks.validateFields()
  }

  const resetBlockTime = () => {
    const newDefaultBlockTime = defaultBlockTime || 6000
    formBlocks.setFieldsValue({
      expectedBlockTime: newDefaultBlockTime,
    })
  }

  const calculateAverageBlockTime = async (values: AvgBlockTimeFormValues) => {
    try {
      const { startBlock, endBlock, chain } = values

      setIsLoading(true)

      const auxNetwork = config.networks.find(
        auxNetwork => auxNetwork.networkName === chain
      )

      if (!auxNetwork) return

      const auxApi = await connectToApi(apiConnections, apiStatus, auxNetwork)

      // Query start block and end block time
      const [startBlockHash, endBlockHash] = await Promise.all([
        auxApi.rpc.chain.getBlockHash(startBlock),
        auxApi.rpc.chain.getBlockHash(endBlock),
      ])
      const [startBlockTime, endBlockTime] = await Promise.all([
        auxApi.query.timestamp.now.at(startBlockHash),
        auxApi.query.timestamp.now.at(endBlockHash),
      ])

      const timePassed = endBlockTime.toNumber() - startBlockTime.toNumber()
      const avgBlockTime = timePassed / (endBlock - startBlock) / 1000
      setResults(oldValue => [
        {
          startBlock,
          startBlockTime: formatDate(startBlockTime.toNumber(), config.utcTime),
          endBlock,
          endBlockTime: formatDate(endBlockTime.toNumber(), config.utcTime),
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

  const renderStartBlock = (value: number, row: AvgBlockTimeResult) => {
    return (
      <>
        <div className='block-number'>{value}</div>
        <div className='block-time'>{row.startBlockTime}</div>
      </>
    )
  }

  const renderEndBlock = (value: number, row: AvgBlockTimeResult) => {
    return (
      <>
        <div className='block-number'>{value}</div>
        <div className='block-time'>{row.endBlockTime}</div>
      </>
    )
  }

  const renderAverageBlockTime = (value: number) => {
    return <div>{value.toFixed(3)} seconds</div>
  }

  const columns = [
    {
      title: "Start Block",
      dataIndex: "startBlock",
      key: "startBlock",
      render: renderStartBlock,
    },
    {
      title: "End Block",
      dataIndex: "endBlock",
      key: "endBlock",
      render: renderEndBlock,
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
        layout='vertical'
        form={formBlocks}
        onValuesChange={checkBlockRange}
        initialValues={{ chain: config.selectedNetwork?.networkName }}
        onFinish={handleOnCalculate}>
        <Row gutter={30}>
          <Col className='col-form-item'>
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
          </Col>
          <Col>
            <Space className='additional-data-container'>
              <Button
                className='fill-start-block-btn'
                onClick={() => fillStartBlock(1)}
                disabled={isDefaultLoading}>
                Last hour
              </Button>
              <Button
                className='fill-start-block-btn'
                onClick={() => fillStartBlock(0, 1)}
                disabled={isDefaultLoading}>
                Last day
              </Button>
              <Button
                className='fill-start-block-btn'
                onClick={() => fillStartBlock(0, 3)}
                disabled={isDefaultLoading}>
                Last 3 days
              </Button>
              <Button
                className='fill-start-block-btn'
                onClick={() => fillStartBlock(0, 0, 1)}
                disabled={isDefaultLoading}>
                Last week
              </Button>
              <Button
                className='fill-start-block-btn'
                onClick={() => fillStartBlock(0, 0, 0, 1)}
                disabled={isDefaultLoading}>
                Last month
              </Button>
            </Space>
          </Col>
        </Row>
        <Row gutter={30}>
          <Col className='col-form-item'>
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
          </Col>
          <Col className='col-form-item'>
            <Form.Item
              name='expectedBlockTime'
              label='Expected block time (ms)'>
              <InputNumber min={1} />
            </Form.Item>
          </Col>
          <Col className='pl-0'>
            <div className='additional-data-container'>
              {isDefaultLoading && (
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
            </div>
          </Col>
          <Col>
            <div className='additional-data-container'>
              <Button
                className='reset-block-time-btn'
                onClick={resetBlockTime}
                disabled={isDefaultLoading || defaultBlockTime === undefined}>
                Reset block time
              </Button>
            </div>
          </Col>
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
          <Select onChange={handleNetworkChange} placeholder='Select chain...'>
            {config.networks
              .filter(network => network.enabled)
              .map((network, index) => (
                <Select.Option key={index} value={network.networkName}>
                  {network.networkName}
                </Select.Option>
              ))}
          </Select>
        </Form.Item>
        <Form.Item>
          <Button
            className='calculate-btn'
            type='primary'
            icon={<BarChartOutlined />}
            disabled={!isBlockRangeValid || isLoading || isDefaultLoading}
            loading={isLoading}
            htmlType='submit'>
            Calculate Average Block Time
          </Button>
        </Form.Item>
      </Form>
      <h2>Results:</h2>
      <Table dataSource={results} columns={columns} rowKey='chain' />
    </div>
  )
}

export default AverageBlockTime
