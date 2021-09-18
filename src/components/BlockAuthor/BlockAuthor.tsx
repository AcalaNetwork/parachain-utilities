import { BarChartOutlined } from "@ant-design/icons"
import { ApiPromise, WsProvider } from "@polkadot/api"
import { BlockHash, Header } from "@polkadot/types/interfaces"
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
import React, { useState } from "react"
import { useAppSelector } from "../../store/hooks"
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
  const [formBlocks] = Form.useForm()
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
    countBlockAuthors(values)
  }

  const countBlockAuthors = async (values: BlockAuthorFormValues) => {
    try {
      const { startBlock, endBlock, chain } = values

      setIsLoading(true)
      // Connect to chain
      const provider = new WsProvider(chain)

      provider.on("error", () => {
        provider.disconnect()
        message.error("An error ocurred when trying to connect to the endpoint")
        setIsLoading(false)
      })

      // Create the API
      const api = await ApiPromise.create({ provider })

      // Load hashes
      let loadedUntil = startBlock
      let allHashes: BlockHash[] = []
      while (loadedUntil <= endBlock) {
        let promiseCount = 0
        const allowedParallel = 5
        const promises = []
        while (loadedUntil <= endBlock && promiseCount < allowedParallel) {
          promises.push(api.rpc.chain.getBlockHash(loadedUntil))
          loadedUntil += 1
          promiseCount += 1
        }
        const newHashes = await Promise.all(promises)
        allHashes = allHashes.concat(newHashes)
      }

      // Load headers/authors
      loadedUntil = startBlock
      let allHeaders: any[] = []
      while (loadedUntil <= endBlock) {
        let promiseCount = 0
        const allowedParallel = 5
        const promises = []
        while (loadedUntil <= endBlock && promiseCount < allowedParallel) {
          promises.push(
            api.derive.chain.getHeader(allHashes[loadedUntil - startBlock])
          )
          loadedUntil += 1
          promiseCount += 1
        }
        const newHeaders = await Promise.all(promises)
        allHeaders = allHeaders.concat(newHeaders)
      }

      const groupBlocks: Record<string, BlockInfo[]> = {}
      for (const header of allHeaders) {
        const author = header?.author?.toString()
        if (author) {
          groupBlocks[author] = [
            ...(groupBlocks[author] || []),
            {
              number: 1,
              hash: "",
            },
          ]
        }
      }
      const finalResults: BlockAuthorResult[] = []

      for (const author in groupBlocks) {
        finalResults.push({
          authorAddress: author,
          blocks: groupBlocks[author],
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
    return <div>{row.authorAddress}</div>
  }

  const renderBlocks = (row: BlockAuthorResult) => {
    return <div>{row.blocks.length} blocks</div>
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
            Calculate
          </Button>
        </Form.Item>
      </Form>
      <h2>Results:</h2>
      <Table dataSource={results} columns={columns} />
    </div>
  )
}

export default BlockAuthor
