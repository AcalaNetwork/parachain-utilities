import { BarChartOutlined, CaretRightOutlined } from "@ant-design/icons"
import { ApiPromise, WsProvider } from "@polkadot/api"
import {
  Button,
  Collapse,
  Form,
  InputNumber,
  List,
  message,
  Row,
  Select,
  Space,
  Table,
} from "antd"
import React, { useContext, useState } from "react"
import { useAppSelector } from "../../store/hooks"
import { findAuthorName } from "../../utils/UtilsFunctions"
import { ApiContext, ApiContextData } from "../utils/ApiProvider"
import "./BlockAuthor.less"

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
  const { api } = useContext<ApiContextData>(ApiContext)
  const [formBlocks] = Form.useForm()
  const addresses = useAppSelector(state => state.address.list)
  const config = useAppSelector(state => state.config)
  const [results, setResults] = useState<Array<BlockAuthorResult>>([])
  const [isBlockRangeValid, setIsBlockRangeValid] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const checkBlockRange = (
    changedValues: Record<string, unknown>,
    values: BlockAuthorFormValues
  ) => {
    // Validate that start block is less than or equal to end block
    if (changedValues && Number(values.startBlock) > Number(values.endBlock)) {
      setIsBlockRangeValid(false)
      formBlocks.setFields([
        {
          name: "startBlock",
          value: values.startBlock,
          errors: ["Start Block must be less than or equal to End Block"],
        },
        {
          name: "endBlock",
          value: values.endBlock,
          errors: ["End Block must be greater than or equal to Start Block"],
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

  const countBlockAuthors = async (values: BlockAuthorFormValues) => {
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

      // Load hashes
      const groupedBlocks: Record<string, BlockInfo[]> = {}
      let loadedUntil = startBlock
      while (loadedUntil <= endBlock) {
        let promiseCount = 0
        const allowedParallel = 5
        let promises = []
        while (
          promiseCount < allowedParallel &&
          loadedUntil + promiseCount <= endBlock
        ) {
          promises.push(auxApi.rpc.chain.getBlockHash(loadedUntil + promiseCount))
          promiseCount += 1
        }
        const newHashes = await Promise.all(promises)
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
                hash: newHashes[index].toString(),
              },
            ]
          }
        })
        loadedUntil += newHashes.length
      }

      if (chain !== config.selectedEndpoint?.value) auxProvider.disconnect()

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
      message.error("An error ocurred when loading block data.")
      setIsLoading(false)
    }
  }

  const renderAuthor = (row: BlockAuthorResult) => {
    return (
      <>
        {row.authorName && <Row className='address-name'>{row.authorName}</Row>}
        <Row>{row.authorAddress}</Row>
      </>
    )
  }

  const renderBlocks = (row: BlockAuthorResult) => {
    return (
      <Collapse
        accordion={true}
        expandIcon={({ isActive }) => (
          <CaretRightOutlined rotate={isActive ? 90 : 0} />
        )}>
        <Collapse.Panel
          className='collapse-blocks'
          header={`${row.blocks.length} blocks`}
          key={row.authorAddress}>
          <List
            size='small'
            dataSource={row.blocks}
            renderItem={item => (
              <List.Item>
                <span className='block-number'>{item.number}</span> -{" "}
                {item.hash}
              </List.Item>
            )}
          />
        </Collapse.Panel>
      </Collapse>
    )
  }

  const columns = [
    {
      title: "Author",
      key: "author",
      render: renderAuthor,
    },
    {
      title: "Number of Blocks",
      key: "numberOfBlocks",
      render: renderBlocks,
    },
  ]

  return (
    <div className='block-author-container'>
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
            Load Block Authors
          </Button>
        </Form.Item>
      </Form>
      <h2>Results:</h2>
      <Table dataSource={results} columns={columns} />
    </div>
  )
}

export default BlockAuthor
