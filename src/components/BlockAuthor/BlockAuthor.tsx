import { BarChartOutlined, CaretRightOutlined } from '@ant-design/icons'
import { Button, Col, Collapse, Form, InputNumber, List, message, Row, Select, Space, Spin, Table } from 'antd'
import React, { useContext, useEffect, useState } from 'react'
import { Header } from '@polkadot/types/interfaces/runtime'
import { BlockHash } from '@polkadot/types/interfaces/chain'
import { useAppSelector } from '../../store/hooks'
import { PolkadotNetwork } from '../../types'
import { estimateStartBlockNumber, findAuthorName, getExpectedBlockTime } from '../../utils/UtilsFunctions'
import { ApiContext, ApiContextData, connectToApi } from '../utils/ApiProvider'
import './BlockAuthor.less'

interface BlockAuthorFormValues {
  startBlock: number
  endBlock: number
  chain: string
}

interface BlockAuthorResult {
  authorAddress: string
  authorName?: string
  blocks: BlockInfo[]
}

interface BlockInfo {
  number: number
  hash: string
}

function BlockAuthor(): React.ReactElement {
  const { apiConnections, apiStatus } = useContext<ApiContextData>(ApiContext)
  const [formBlocks] = Form.useForm()
  const addresses = useAppSelector((state) => state.address.list)
  const config = useAppSelector((state) => state.config)
  const [results, setResults] = useState<Array<BlockAuthorResult>>([])
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
      const selectedChain = formBlocks.getFieldValue('chain')

      const network = config.networks.find((auxNetwork) => auxNetwork.networkName === selectedChain)

      // Get default block time
      const auxApi = await connectToApi(apiConnections, apiStatus, network || ({} as PolkadotNetwork))

      const timeMs = getExpectedBlockTime(auxApi)

      // Get current block number
      const latestBlock: Header = await auxApi.rpc.chain.getHeader()
      const currentBlockNumber = latestBlock.number.toNumber()

      if (timeMs && (overwriteValues || !formBlocks.getFieldValue('expectedBlockTime'))) {
        formBlocks.setFieldsValue({
          expectedBlockTime: timeMs,
        })
      }

      if (currentBlockNumber && (overwriteValues || !formBlocks.getFieldValue('endBlock'))) {
        formBlocks.setFieldsValue({
          endBlock: currentBlockNumber,
        })
      }
      setDefaultBlockTime(timeMs)
      setIsDefaultLoading(false)
    } catch (err) {
      console.log(err)
      message.error('An error ocurred when trying to load end block.')
      setIsDefaultLoading(false)
    }
  }

  const handleNetworkChange = () => {
    loadDefaults(true)
  }

  const checkBlockRange = (changedValues: Record<string, unknown>, values: BlockAuthorFormValues) => {
    // Validate that start block is less than or equal to end block
    if (changedValues && Number(values.startBlock) > Number(values.endBlock)) {
      setIsBlockRangeValid(false)
      formBlocks.setFields([
        {
          name: 'startBlock',
          value: values.startBlock,
          errors: ['Start Block must be less than or equal to End Block'],
        },
        {
          name: 'endBlock',
          value: values.endBlock,
          errors: ['End Block must be greater than or equal to Start Block'],
        },
      ])
    } else {
      setIsBlockRangeValid(true)
      formBlocks.validateFields()
    }
  }

  const handleOnCalculate = (values: BlockAuthorFormValues) => {
    setResults([])
    countBlockAuthors(values)
  }

  const fillStartBlock = (hours = 0, days = 0, weeks = 0, months = 0) => {
    const endBlock = formBlocks.getFieldValue('endBlock')
    const expectedBlockTime = formBlocks.getFieldValue('expectedBlockTime')

    if (!endBlock || !expectedBlockTime) {
      message.error('Please set End block and Expected block time')
      return
    }

    formBlocks.setFieldsValue({
      startBlock: estimateStartBlockNumber(endBlock, expectedBlockTime, hours, days, weeks, months),
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

  const countBlockAuthors = async (values: BlockAuthorFormValues) => {
    try {
      const { startBlock, endBlock, chain } = values

      setIsLoading(true)

      const auxNetwork = config.networks.find((auxNetwork) => auxNetwork.networkName === chain)

      if (!auxNetwork) return

      const auxApi = await connectToApi(apiConnections, apiStatus, auxNetwork)

      // Load hashes
      const groupedBlocks: Record<string, BlockInfo[]> = {}
      let loadedUntil = startBlock
      while (loadedUntil <= endBlock) {
        let promiseCount = 0
        const allowedParallel = 10
        let promises = []
        while (promiseCount < allowedParallel && loadedUntil + promiseCount <= endBlock) {
          promises.push(auxApi.rpc.chain.getBlockHash(loadedUntil + promiseCount))
          promiseCount += 1
        }
        const newHashes: BlockHash[] = await Promise.all(promises)
        promises = []
        for (const hash of newHashes) {
          promises.push(auxApi.derive.chain.getHeader(hash))
        }
        const newHeaders = await Promise.all(promises)
        newHeaders.forEach((header, index) => {
          const author = header?.author?.toString()
          if (author) {
            groupedBlocks[author] = [
              ...(groupedBlocks[author] || []),
              {
                number: loadedUntil + index,
                hash: newHashes[index]?.toString(),
              },
            ]
          }
        })
        loadedUntil += newHashes.length
      }

      const finalResults: BlockAuthorResult[] = []

      for (const author in groupedBlocks) {
        finalResults.push({
          authorAddress: author,
          authorName: findAuthorName(addresses, author),
          blocks: groupedBlocks[author],
        })
      }

      setResults(finalResults)

      setIsLoading(false)
    } catch (err) {
      console.log(err)
      message.error('An error ocurred when loading block data.')
      setIsLoading(false)
    }
  }

  const renderAuthor = (row: BlockAuthorResult) => {
    return (
      <>
        {row.authorName && <Row className="address-name">{row.authorName}</Row>}
        <Row>{row.authorAddress}</Row>
      </>
    )
  }

  const renderBlocks = (row: BlockAuthorResult) => {
    return (
      <Collapse accordion={true} expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}>
        <Collapse.Panel className="collapse-blocks" header={`${row.blocks.length} blocks`} key={row.authorAddress}>
          <List
            size="small"
            dataSource={row.blocks}
            renderItem={(item) => (
              <List.Item>
                <span className="block-number">{item.number}</span> - {item.hash}
              </List.Item>
            )}
          />
        </Collapse.Panel>
      </Collapse>
    )
  }

  const columns = [
    {
      title: 'Author',
      key: 'author',
      render: renderAuthor,
    },
    {
      title: 'Number of Blocks',
      key: 'numberOfBlocks',
      render: renderBlocks,
    },
  ]

  return (
    <div className="block-author-container">
      <Form
        className="mb-4"
        layout="vertical"
        form={formBlocks}
        onValuesChange={checkBlockRange}
        initialValues={{ chain: config.selectedNetwork?.networkName }}
        onFinish={handleOnCalculate}
      >
        <Row gutter={30}>
          <Col className="col-form-item">
            <Form.Item
              name="startBlock"
              label="Start block"
              rules={[
                {
                  required: true,
                  message: 'Field Required',
                },
              ]}
            >
              <InputNumber min={1} />
            </Form.Item>
          </Col>
          <Col>
            <Space className="additional-data-container">
              <Button className="fill-start-block-btn" onClick={() => fillStartBlock(1)} disabled={isDefaultLoading}>
                Last hour
              </Button>
              <Button className="fill-start-block-btn" onClick={() => fillStartBlock(0, 1)} disabled={isDefaultLoading}>
                Last day
              </Button>
              <Button className="fill-start-block-btn" onClick={() => fillStartBlock(0, 3)} disabled={isDefaultLoading}>
                Last 3 days
              </Button>
              <Button
                className="fill-start-block-btn"
                onClick={() => fillStartBlock(0, 0, 1)}
                disabled={isDefaultLoading}
              >
                Last week
              </Button>
              <Button
                className="fill-start-block-btn"
                onClick={() => fillStartBlock(0, 0, 0, 1)}
                disabled={isDefaultLoading}
              >
                Last month
              </Button>
            </Space>
          </Col>
        </Row>
        <Row gutter={30}>
          <Col className="col-form-item">
            <Form.Item
              name="endBlock"
              label="End block"
              rules={[
                {
                  required: true,
                  message: 'Field Required',
                },
              ]}
            >
              <InputNumber min={1} />
            </Form.Item>
          </Col>
          <Col className="col-form-item">
            <Form.Item name="expectedBlockTime" label="Expected block time (ms)">
              <InputNumber min={1} />
            </Form.Item>
          </Col>
          <Col className="pl-0">
            <div className="additional-data-container">
              {isDefaultLoading && (
                <div className="ml-2 mt-2">
                  <Spin />
                </div>
              )}
              {defaultBlockTime !== undefined && (
                <div className="ml-2 mt-2 default-block-time">
                  {defaultBlockTime === 0 ? 'No default value' : `Default value: ${defaultBlockTime} ms`}
                </div>
              )}
            </div>
          </Col>
          <Col>
            <div className="additional-data-container">
              <Button
                className="reset-block-time-btn"
                onClick={resetBlockTime}
                disabled={isDefaultLoading || defaultBlockTime === undefined}
              >
                Reset block time
              </Button>
            </div>
          </Col>
        </Row>
        <Form.Item
          name="chain"
          label="Chain"
          rules={[
            {
              required: true,
              message: 'Field Required',
            },
          ]}
        >
          <Select onChange={handleNetworkChange} placeholder="Select chain...">
            {config.networks
              .filter((network) => network.enabled)
              .map((network, index) => (
                <Select.Option key={index} value={network.networkName}>
                  {network.networkName}
                </Select.Option>
              ))}
          </Select>
        </Form.Item>
        <Form.Item>
          <Button
            className="calculate-btn"
            type="primary"
            icon={<BarChartOutlined />}
            disabled={!isBlockRangeValid || isLoading || isDefaultLoading}
            loading={isLoading}
            htmlType="submit"
          >
            Load Block Authors
          </Button>
        </Form.Item>
      </Form>
      <h2>Results:</h2>
      <Table dataSource={results} columns={columns} rowKey="authorAddress" />
    </div>
  )
}

export default BlockAuthor
