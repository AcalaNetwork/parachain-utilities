import { FileSearchOutlined, LinkOutlined } from '@ant-design/icons'
import { Button, Col, Form, InputNumber, List, message, Row, Select, Space, Table } from 'antd'
import React, { ReactNode, useContext, useState } from 'react'
import { Header, SignedBlock } from '@polkadot/types/interfaces/runtime'
import { SortOrder } from 'antd/lib/table/interface'
import { BlockHash } from '@polkadot/types/interfaces'
import { ApiPromise } from '@polkadot/api'
import { useAppSelector } from '../../store/hooks'
import { ChainEvent, PolkadotNetwork } from '../../types'
import { ApiContext, ApiContextData, connectToApi } from '../utils/ApiProvider'
import './Xcm.less'

interface XcmFormValues {
  blockNumber: number
  chain: string
}

function Xcm(): React.ReactElement {
  const { apiConnections, apiStatus } = useContext<ApiContextData>(ApiContext)
  const [formBlocks] = Form.useForm()
  const config = useAppSelector((state) => state.config)
  const [parentNetwork, setParentNetwork] = useState<PolkadotNetwork>()
  const [recipientNetwork, setRecipientNetwork] = useState<PolkadotNetwork>()
  const [messageType, setMessageType] = useState<string>()
  const [messageSent, setMessageSent] = useState<string>()
  const [parentBlockNumber, setParentBlockNumber] = useState<number>()
  const [recipientBlockNumber, setRecipientBlockNumber] = useState<number>()
  const [results, setResults] = useState<Array<ChainEvent>>()
  const [isLoading, setIsLoading] = useState(false)

  const searchXcm = async (values: XcmFormValues) => {
    try {
      const { blockNumber, chain } = values

      // Clear previous results
      setResults(undefined)
      setRecipientBlockNumber(undefined)
      setRecipientNetwork(undefined)
      setParentBlockNumber(undefined)
      setParentNetwork(undefined)
      setMessageSent(undefined)
      setMessageType(undefined)

      setIsLoading(true)

      // Get Sender Network Info
      const auxSenderNetwork = config.networks.find((auxNetwork) => auxNetwork.networkName === chain)
      if (!auxSenderNetwork) {
        message.error("Couldn't find sender network info")
        setIsLoading(false)
        return
      }

      // Get Parent Network Info
      const auxParentNetwork = config.networks.find(
        (auxNetwork) => auxNetwork.networkName === auxSenderNetwork?.parentNetworkName
      )
      if (!auxParentNetwork) {
        message.error("Couldn't find parent network info")
        setIsLoading(false)
        return
      }
      setParentNetwork(auxParentNetwork)

      const senderApi = await connectToApi(apiConnections, apiStatus, auxSenderNetwork)

      // Get block hash
      const senderBlockHash: BlockHash = await senderApi.rpc.chain.getBlockHash(blockNumber)

      // 1) Query upward message sent
      const upwardMessage = (
        await senderApi.query.parachainSystem.upwardMessages.at(senderBlockHash)
      ).toJSON() as string[]

      if (upwardMessage.length > 0) {
        setMessageType('Upward message')
        setMessageSent(parseXcmMessage(upwardMessage[0]))

        await loadUpwardMessageEvents(senderApi, senderBlockHash, auxParentNetwork)

        setIsLoading(false)
        return
      }

      // 2) Query horizontal message sent
      const horizontalMessage = (
        await senderApi.query.parachainSystem.hrmpOutboundMessages.at(senderBlockHash)
      ).toJSON() as Record<string, unknown>[]

      if (horizontalMessage.length > 0) {
        const horizontalMessageHex = horizontalMessage[0].data as string
        setMessageType('Horizontal message')
        setMessageSent(parseXcmMessage(horizontalMessageHex))

        await loadHorizontalMessageEvents(
          auxSenderNetwork,
          senderApi,
          senderBlockHash,
          auxParentNetwork,
          horizontalMessageHex
        )

        setIsLoading(false)
        return
      }

      // If we reach here, we couldn't find upwards nor horizontal messages
      message.info('No upward nor horizontal message sent in block')
      setIsLoading(false)
      setResults([])
    } catch (err) {
      console.log(err)
      message.error('An error ocurred when searching XCM data.')
      setIsLoading(false)
    }
  }

  const loadUpwardMessageEvents = async (
    senderApi: ApiPromise,
    senderBlockHash: BlockHash,
    parentNetwork: PolkadotNetwork
  ) => {
    // Query relay parent block number
    const validationData = (
      await senderApi.query.parachainSystem.validationData.at(senderBlockHash)
    ).toJSON() as Record<string, string | number>
    let relayBlockNumber = (validationData.relayParentNumber as number) + 1

    // Search next 100 blocks until finding ump.UpwardMessageReceived event
    const maxParentBlock = relayBlockNumber + 99
    const parentApi = await connectToApi(apiConnections, apiStatus, parentNetwork)
    const latestBlock: Header = await parentApi.rpc.chain.getHeader()
    const currentRelayBlockNumber = latestBlock.number.toNumber()
    let newEvents: ChainEvent[] = []
    let foundBlock = false

    while (relayBlockNumber <= currentRelayBlockNumber && relayBlockNumber <= maxParentBlock && !foundBlock) {
      // Get block hash
      const auxHash = await parentApi.rpc.chain.getBlockHash(relayBlockNumber)
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
      const auxBlockRecords = (await parentApi.query.system.events.at(auxHash)) as Record<string, any>[]
      newEvents = extractEventsFromBlock(auxBlockRecords, [
        ['paraInclusion', ''],
        ['system', 'ExtrinsicSuccess'],
      ])

      for (const auxEvent of newEvents) {
        if (auxEvent.section === 'ump' && auxEvent.method === 'UpwardMessagesReceived') {
          foundBlock = true
          break
        }
      }
      relayBlockNumber += 1
    }

    if (foundBlock) {
      setParentBlockNumber(relayBlockNumber)
      setResults(newEvents)
    } else {
      message.info('No ump.UpwardMessageReceived event found in parent chain')
      setResults([])
    }
  }

  const loadHorizontalMessageEvents = async (
    senderNetwork: PolkadotNetwork,
    senderApi: ApiPromise,
    senderBlockHash: BlockHash,
    parentNetwork: PolkadotNetwork,
    horizontalMessageHex: string
  ) => {
    // Query relay parent block number
    const validationData = (
      await senderApi.query.parachainSystem.validationData.at(senderBlockHash)
    ).toJSON() as Record<string, string | number>
    let relayBlockNumber = (validationData.relayParentNumber as number) + 1

    // Search parent next 100 blocks until finding parainherent.enter extrinsic
    const maxParentBlock = relayBlockNumber + 99
    const parentApi = await connectToApi(apiConnections, apiStatus, parentNetwork)
    const latestBlock: Header = await parentApi.rpc.chain.getHeader()
    const currentRelayBlockNumber = latestBlock.number.toNumber()
    let auxRelayBlock: SignedBlock
    let auxRecipientNetwork: PolkadotNetwork | undefined
    let foundBlock = false
    let recipientBlockHash

    while (relayBlockNumber <= currentRelayBlockNumber && relayBlockNumber <= maxParentBlock && !foundBlock) {
      const auxRelayHash = await parentApi.rpc.chain.getBlockHash(relayBlockNumber)
      auxRelayBlock = await parentApi.rpc.chain.getBlock(auxRelayHash)

      for (const ex of auxRelayBlock.block.extrinsics) {
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        const auxExtrinsic: any = ex.toHuman()
        if (auxExtrinsic?.method?.section === 'paraInherent' && auxExtrinsic?.method?.method === 'enter') {
          // Search for the recipient chain paraid
          for (const auxArg of auxExtrinsic.method.args?.data?.backedCandidates) {
            if (
              auxArg.candidate?.commitments?.horizontalMessages?.length > 0 &&
              auxArg.candidate.commitments.horizontalMessages[0].data.toString() === horizontalMessageHex
            ) {
              foundBlock = true
              const auxParaId = parseInt(auxArg.candidate.commitments.horizontalMessages[0].recipient.replace(',', ''))
              auxRecipientNetwork = config.networks.find((auxNetwork) => auxNetwork.paraId === auxParaId)

              if (!auxRecipientNetwork) {
                message.error("Couldn't find recipient network info")
                return
              }

              setParentBlockNumber(relayBlockNumber)
              setRecipientNetwork(auxRecipientNetwork)
              break
            }
          }
          // If recipient parachain id was found, search for the block hash of the recipient network
          if (foundBlock) {
            for (const auxCandidate of auxExtrinsic.method.args?.data?.backedCandidates) {
              const auxParaId = parseInt(auxCandidate.candidate?.descriptor?.paraId?.replace(',', ''))
              if (auxParaId === auxRecipientNetwork?.paraId) {
                recipientBlockHash = auxCandidate.candidate.descriptor.paraHead.toString()
                break
              }
            }
            break
          }
        }
      }
      relayBlockNumber += 1
    }

    if (!foundBlock) {
      message.info('No parainherent.enter extrinsic found in parent chain')
      setResults([])
      return
    }

    // Search recipient next 100 blocks until finding parachainSystem.SetValidationData extrinsic
    if (!auxRecipientNetwork) return
    const recipientApi = await connectToApi(apiConnections, apiStatus, auxRecipientNetwork)
    const paraBlock: SignedBlock = await recipientApi.rpc.chain.getBlock(recipientBlockHash)
    let paraBlockNumber = Number(paraBlock.block.header.number.toString())
    const maxParaBlockNumber = paraBlockNumber + 1
    const paraLatestBlock: Header = await recipientApi.rpc.chain.getHeader()
    const currentParaBlockNumber = paraLatestBlock.number.toNumber()
    let auxParaBlock: SignedBlock
    foundBlock = false

    while (paraBlockNumber <= currentParaBlockNumber && paraBlockNumber <= maxParaBlockNumber && !foundBlock) {
      const auxParaHash = await recipientApi.rpc.chain.getBlockHash(paraBlockNumber)
      auxParaBlock = await recipientApi.rpc.chain.getBlock(auxParaHash)

      for (const ex of auxParaBlock.block.extrinsics) {
        // eslint-disable-next-line  @typescript-eslint/no-explicit-any
        const auxExtrinsic: any = ex.toHuman()
        if (
          auxExtrinsic?.method?.section === 'parachainSystem' &&
          auxExtrinsic?.method?.method === 'setValidationData'
        ) {
          // Search for the extrinsic that received the horizontal message
          if (auxExtrinsic.method.args?.data?.horizontalMessages?.[senderNetwork.paraId]?.length > 0) {
            for (const auxMessage of auxExtrinsic.method.args?.data?.horizontalMessages?.[senderNetwork.paraId]) {
              if (auxMessage.data === horizontalMessageHex) {
                foundBlock = true
                setRecipientBlockNumber(paraBlockNumber)
                break
              }
            }
          }

          if (foundBlock) {
            break
          }
        }
      }
      if (!foundBlock) {
        paraBlockNumber += 1
      }
    }

    // Load the events from the block where the xcm message was received in the parachain
    if (!foundBlock) {
      message.info('No parachainSystem.SetValidationData event found in parent chain')
      setResults([])
      return
    }
    const auxHash = await recipientApi.rpc.chain.getBlockHash(paraBlockNumber)
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    const auxBlockRecords = (await recipientApi.query.system.events.at(auxHash)) as Record<string, any>[]
    const newEvents = extractEventsFromBlock(auxBlockRecords, [['system', 'ExtrinsicSuccess']])

    setResults(newEvents)
  }

  const parseXcmMessage = (encoded: string) => {
    return Buffer.from(encoded.slice(2), 'hex').toString()
  }

  const extractEventsFromBlock = (
    // eslint-disable-next-line  @typescript-eslint/no-explicit-any
    blockRecords: Record<string, any>[],
    excludeEvents: [string, string][]
  ): ChainEvent[] => {
    const newEvents: ChainEvent[] = []

    for (const auxRecords of blockRecords) {
      const { event, phase } = auxRecords
      const types = event.typeDef

      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
      const eventArguments: [string, any][] = []
      // eslint-disable-next-line  @typescript-eslint/no-explicit-any
      event.data.forEach((data: any, index: number) => {
        eventArguments.push([types[index].type.toString(), data.toJSON()])
      })

      const section = event.section.toString()
      const method = event.method.toString()

      let excludeEvent = false

      for (const [excludeSection, excludeMethod] of excludeEvents) {
        if (section === excludeSection && (method === excludeMethod || !excludeMethod)) {
          excludeEvent = true
          break
        }
      }

      if (!excludeEvent) {
        newEvents.push({
          section,
          method,
          description: event.meta.docs[0].toString().replace(/\\/g, ''),
          eventArguments,
          phase: phase.toJSON().applyExtrinsic,
          index: newEvents.length,
        })
      }
    }

    return newEvents
  }

  const formatWithJSONStringify = (dataToDisplay: unknown): string => {
    if (typeof dataToDisplay === 'string') {
      const trimmed = dataToDisplay.trim()
      if (trimmed[0] === '{' && trimmed[trimmed.length - 1] === '}') {
        return JSON.stringify(JSON.parse(trimmed), null, 4)
      } else {
        return dataToDisplay
      }
    }
    return JSON.stringify(dataToDisplay, null, 4)
  }

  const createSubscanLink = (network: PolkadotNetwork, blockNumber: number): string => {
    return `https://${network.networkName.split(' ')[0].toLowerCase()}.subscan.io/block/${blockNumber}`
  }

  // eslint-disable-next-line  @typescript-eslint/no-explicit-any
  const renderEventArguments = (eventArgs: [string, any][]): ReactNode => {
    const listData = []
    for (const auxArg of eventArgs) {
      listData.push({
        index: listData.length,
        type: formatWithJSONStringify(auxArg[0]),
        value: formatWithJSONStringify(auxArg[1]),
      })
    }
    return (
      <List
        bordered
        dataSource={listData}
        renderItem={(item) => (
          <List.Item>
            <pre className="mb-0">{item.value}</pre>
          </List.Item>
        )}
      />
    )
  }

  const columns = [
    {
      title: 'Action',
      key: 'method',
      sorter: (a: ChainEvent, b: ChainEvent) => {
        const sectionCompare = (a.section as string).localeCompare(b.section as string)
        if (sectionCompare === 0) {
          return (a.method as string).localeCompare(b.method as string)
        }
        return sectionCompare
      },
      sortDirections: ['ascend', 'descend'] as SortOrder[],
      render: (a: ChainEvent) => {
        return `${a.section}(${a.method})`
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      sorter: (a: ChainEvent, b: ChainEvent) => {
        return (a.description as string).localeCompare(b.description as string)
      },
      sortDirections: ['ascend', 'descend'] as SortOrder[],
    },
    {
      title: 'Event Arguments',
      dataIndex: 'eventArguments',
      key: 'eventArguments',
      render: renderEventArguments,
    },
  ]

  return (
    <div className="xcm-container">
      <Form
        className="mb-4"
        layout="vertical"
        form={formBlocks}
        initialValues={{ chain: config.selectedNetwork?.networkName }}
        onFinish={searchXcm}
      >
        <Row gutter={30}>
          <Col className="col-form-item">
            <Form.Item
              name="blockNumber"
              label="Block Number"
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
          <Select placeholder="Select chain...">
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
            className="search-btn"
            type="primary"
            icon={<FileSearchOutlined />}
            disabled={isLoading}
            loading={isLoading}
            htmlType="submit"
          >
            Search XCM
          </Button>
        </Form.Item>
      </Form>
      <h2>Results:</h2>
      {messageType && (
        <Row align="middle" className="mb-1">
          <Col flex="0 0 200px" className="result-description">
            Message type:
          </Col>
          <Col flex="auto">{messageType}</Col>
        </Row>
      )}
      {messageSent && (
        <Row align="middle" className="mb-3">
          <Col flex="0 0 200px" className="result-description">
            Message sent:
          </Col>
          <Col flex="auto">
            <pre className="mb-0">{formatWithJSONStringify(messageSent)}</pre>
          </Col>
        </Row>
      )}
      {parentNetwork && messageType && (
        <Row align="middle" className="mb-1">
          <Col flex="0 0 200px" className="result-description">
            Parent chain:
          </Col>
          <Col flex="auto">{parentNetwork.networkName}</Col>
        </Row>
      )}
      {parentBlockNumber && parentNetwork && (
        <Row align="middle" className="mb-3">
          <Col flex="0 0 200px" className="result-description">
            Parent block number:
          </Col>
          <Col flex="auto">
            <a href={createSubscanLink(parentNetwork, parentBlockNumber)} target="_blank" rel="noreferrer">
              <Space>
                {parentBlockNumber}
                <Button icon={<LinkOutlined />}>Open in Subscan</Button>
              </Space>
            </a>
          </Col>
        </Row>
      )}
      {recipientNetwork && (
        <Row align="middle" className="mb-1">
          <Col flex="0 0 200px" className="result-description">
            Recipient chain:
          </Col>
          <Col flex="auto">
            {recipientNetwork.networkName} - {recipientNetwork.paraId}
          </Col>
        </Row>
      )}
      {recipientBlockNumber && recipientNetwork && (
        <Row align="middle" className="mb-4">
          <Col flex="0 0 200px" className="result-description">
            Recipient block number:
          </Col>
          <Col flex="auto">
            <a href={createSubscanLink(recipientNetwork, recipientBlockNumber)} target="_blank" rel="noreferrer">
              <Space>
                {recipientBlockNumber}
                <Button icon={<LinkOutlined />}>Open in Subscan</Button>
              </Space>
            </a>
          </Col>
        </Row>
      )}
      {results && (
        <>
          {results.length > 0 && (
            <h3>
              {`List of events at ${
                (recipientNetwork && recipientNetwork.networkName) || (parentNetwork && parentNetwork.networkName)
              }'s chain block ${recipientBlockNumber || parentBlockNumber}:`}
            </h3>
          )}
          <Table className="events-table" columns={columns} dataSource={results} rowKey="index" />
        </>
      )}
    </div>
  )
}

export default Xcm
