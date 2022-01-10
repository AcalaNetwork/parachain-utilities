import { FileSearchOutlined } from '@ant-design/icons'
import { Button, Col, Form, InputNumber, List, message, Row, Select, Space, Spin, Table } from 'antd'
import React, { ReactNode, useContext, useEffect, useState } from 'react'
import { Header, SignedBlock } from '@polkadot/types/interfaces/runtime'
import { useAppSelector } from '../../store/hooks'
import { ChainEvent, PolkadotNetwork } from '../../types'
import { estimateStartBlockNumber, formatDate, getExpectedBlockTime } from '../../utils/UtilsFunctions'
import { ApiContext, ApiContextData, connectToApi } from '../utils/ApiProvider'
import './Xcm.less'
import { SortOrder } from 'antd/lib/table/interface'
import { BlockHash } from '@polkadot/types/interfaces'

interface XcmFormValues {
  blockNumber: number
  chain: string
}

function Xcm(): React.ReactElement {
  const { apiConnections, apiStatus } = useContext<ApiContextData>(ApiContext)
  const [formBlocks] = Form.useForm()
  const config = useAppSelector((state) => state.config)
  const [senderNetwork, setSenderNetwork] = useState<PolkadotNetwork>()
  const [parentNetwork, setParentNetwork] = useState<PolkadotNetwork>()
  const [recipientNetwork, setRecipientNetwork] = useState<PolkadotNetwork>()
  const [messageType, setMessageType] = useState<string>()
  const [messageSent, setMessageSent] = useState<string>()
  const [parentBlockNumber, setParentBlockNumber] = useState<number>()
  const [recipientBlockNumber, setRecipientBlockNumber] = useState<number>()
  const [results, setResults] = useState<Array<ChainEvent>>()
  const [isLoading, setIsLoading] = useState(false)

  const handleOnCalculate = (values: XcmFormValues) => {
    searchXcm(values)
  }

  const searchXcm = async (values: XcmFormValues) => {
    try {
      const { blockNumber, chain } = values

      setIsLoading(true)

      // Get Sender Network Info
      const auxSenderNetwork = config.networks.find((auxNetwork) => auxNetwork.networkName === chain)
      if (!auxSenderNetwork) return
      setSenderNetwork(auxSenderNetwork)

      // Get Parent Network Info
      const auxParentNetwork = config.networks.find(
        (auxNetwork) => auxNetwork.networkName === auxSenderNetwork?.parentNetworkName
      )
      if (!auxParentNetwork) return
      setParentNetwork(auxParentNetwork)

      const senderApi = await connectToApi(apiConnections, apiStatus, auxSenderNetwork)

      // Get block hash
      const senderBlockHash = await senderApi.rpc.chain.getBlockHash(blockNumber)

      // Query upward message sent
      const upwardMessage = (
        await senderApi.query.parachainSystem.upwardMessages.at(senderBlockHash)
      ).toJSON() as string[]

      if (upwardMessage.length > 0) {
        setMessageType('Upward message')
        setMessageSent(Buffer.from(upwardMessage[0].slice(2), 'hex').toString())

        // Query relay parent block number
        const validationData = (
          await senderApi.query.parachainSystem.validationData.at(senderBlockHash)
        ).toJSON() as Record<string, string | number>
        let relayBlockNumber = (validationData.relayParentNumber as number) + 1

        // Search next 100 blocks until finding ump.UpwardMessageReceived event
        const maxParentBlock = relayBlockNumber + 99
        const parentApi = await connectToApi(apiConnections, apiStatus, auxParentNetwork)
        const latestBlock: Header = await parentApi.rpc.chain.getHeader()
        const currentRelayBlockNumber = latestBlock.number.toNumber()
        let newEvents: ChainEvent[] = []
        let foundBlock = false

        while (relayBlockNumber <= currentRelayBlockNumber && relayBlockNumber <= maxParentBlock && !foundBlock) {
          // Get block hash
          const auxHash = await parentApi.rpc.chain.getBlockHash(relayBlockNumber)
          const auxBlockRecords = (await parentApi.query.system.events.at(auxHash)) as Record<string, any>[]
          newEvents = []

          for (const auxRecords of auxBlockRecords) {
            const { event, phase } = auxRecords
            const types = event.typeDef

            const eventArguments: [string, any][] = []
            event.data.forEach((data: any, index: number) => {
              eventArguments.push([types[index].type.toString(), data.toJSON()])
            })

            const section = event.section.toString()
            const method = event.method.toString()

            if (section === 'ump' && method === 'UpwardMessagesReceived') {
              foundBlock = true
            }

            if (section !== 'paraInclusion' && !(section === 'system' && method === 'ExtrinsicSuccess')) {
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
          relayBlockNumber += 1
        }
        setParentBlockNumber(relayBlockNumber)
        setResults(newEvents)
        setIsLoading(false)
        return
      }

      // Query horizontal message sent
      const horizontalMessage = (
        await senderApi.query.parachainSystem.hrmpOutboundMessages.at(senderBlockHash)
      ).toJSON() as Record<string, unknown>[]

      if (horizontalMessage.length > 0) {
        const horizontalMessageHex = horizontalMessage[0].data as string
        setMessageType('Horizontal message')
        setMessageSent(Buffer.from(horizontalMessageHex.slice(2), 'hex').toString())

        // Query relay parent block number
        const validationData = (
          await senderApi.query.parachainSystem.validationData.at(senderBlockHash)
        ).toJSON() as Record<string, string | number>
        let relayBlockNumber = (validationData.relayParentNumber as number) + 1

        // Search parent next 100 blocks until finding parainherent.enter extrinsic
        const maxParentBlock = relayBlockNumber + 99
        const parentApi = await connectToApi(apiConnections, apiStatus, auxParentNetwork)
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
            const auxExtrinsic: any = ex.toHuman()
            if (auxExtrinsic?.method?.section === 'paraInherent' && auxExtrinsic?.method?.method === 'enter') {
              // Search for the recipient chain paraid
              for (const auxArg of auxExtrinsic.method.args?.data?.backedCandidates) {
                if (
                  auxArg.candidate?.commitments?.horizontalMessages?.length > 0 &&
                  auxArg.candidate.commitments.horizontalMessages[0].data.toString() === horizontalMessageHex
                ) {
                  foundBlock = true
                  const auxParaId = parseInt(
                    auxArg.candidate.commitments.horizontalMessages[0].recipient.replace(',', '')
                  )
                  auxRecipientNetwork = config.networks.find((auxNetwork) => auxNetwork.paraId === auxParaId)
                  if (!auxRecipientNetwork) return
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

        // Search recipient next 100 blocks until finding parachainsystem.set_validation_data extrinsic
        const recipientApi = await connectToApi(apiConnections, apiStatus, auxRecipientNetwork!)
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
            const auxExtrinsic: any = ex.toHuman()
            if (
              auxExtrinsic?.method?.section === 'parachainSystem' &&
              auxExtrinsic?.method?.method === 'setValidationData'
            ) {
              // Search for the extrinsic that received the horizontal message

              if (auxExtrinsic.method.args?.data?.horizontalMessages?.[auxSenderNetwork.paraId]?.length > 0) {
                for (const auxMessage of auxExtrinsic.method.args?.data?.horizontalMessages?.[
                  auxSenderNetwork.paraId
                ]) {
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
        if (!foundBlock) return
        const auxHash = await recipientApi.rpc.chain.getBlockHash(paraBlockNumber)
        const auxBlockRecords = (await recipientApi.query.system.events.at(auxHash)) as Record<string, any>[]
        const newEvents: ChainEvent[] = []

        for (const auxRecords of auxBlockRecords) {
          const { event, phase } = auxRecords
          const types = event.typeDef

          const eventArguments: [string, any][] = []
          event.data.forEach((data: any, index: number) => {
            eventArguments.push([types[index].type.toString(), data.toJSON()])
          })

          const section = event.section.toString()
          const method = event.method.toString()

          if (!(section === 'system' && method === 'ExtrinsicSuccess')) {
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

        setResults(newEvents)
        setIsLoading(false)
        return
      }

      setIsLoading(false)
      setResults([])

      // Query start block and end block time
      // const [startBlockHash, endBlockHash] = await Promise.all([
      //   auxApi.rpc.chain.getBlockHash(startBlock),
      //   auxApi.rpc.chain.getBlockHash(endBlock),
      // ])
      // const [startBlockTimeResponse, endBlockTimeResponse] = await Promise.all([
      //   auxApi.query.timestamp.now.at(startBlockHash),
      //   auxApi.query.timestamp.now.at(endBlockHash),
      // ])

      // const startBlockTime = Number(startBlockTimeResponse.toString())
      // const endBlockTime = Number(endBlockTimeResponse.toString())

      // const timePassed = endBlockTime - startBlockTime
      // const avgBlockTime = timePassed / (endBlock - startBlock) / 1000
      // setResults((oldValue) => [
      //   {
      //     index: oldValue.length,
      //     startBlock,
      //     startBlockTime: formatDate(startBlockTime, config.utcTime),
      //     endBlock,
      //     endBlockTime: formatDate(endBlockTime, config.utcTime),
      //     chain,
      //     avgBlockTime,
      //   },
      //   ...oldValue,
      // ])
      // setIsLoading(false)
    } catch (err) {
      console.log(err)
      message.error('An error ocurred when loading block data.')
      setIsLoading(false)
    }
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
      // eslint-disable-next-line react/display-name
      render: (eventArgs: ChainEvent): ReactNode => {
        const listData = []
        for (const value of Object.values(eventArgs)) {
          listData.push(value)
        }
        return (
          <List
            size="small"
            bordered
            dataSource={listData}
            renderItem={(item) => {
              const [argName, argValue] = item as unknown[]
              if (typeof argValue === 'string' || typeof argValue === 'number') {
                return <List.Item>{`${argName}: ${argValue}`}</List.Item>
              } else {
                const listSubArgs = []
                for (const [subKey, subValue] of Object.entries(argValue as ChainEvent)) {
                  listSubArgs.push([subKey, subValue])
                }
                return (
                  <List.Item>
                    <div className="sub-argument-name">{argName as string}: </div>
                    <List
                      className="sub-argument-list"
                      size="small"
                      bordered
                      dataSource={listSubArgs}
                      renderItem={(subItem) => {
                        const subArgName = subItem[0]
                        let subArgValue = subItem[1]
                        if (!(typeof subArgValue === 'string' || typeof subArgValue === 'number')) {
                          subArgValue = JSON.stringify(subArgValue)
                        }
                        return <List.Item>{`${subArgName}: ${subArgValue}`}</List.Item>
                      }}
                    />
                  </List.Item>
                )
              }
            }}
          />
        )
      },
    },
  ]

  return (
    <div className="xcm-container">
      <Form
        className="mb-4"
        layout="vertical"
        form={formBlocks}
        initialValues={{ chain: config.selectedNetwork?.networkName, blockNumber: 1257765 /*1254590*/ }}
        onFinish={handleOnCalculate}
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
      {parentNetwork && <div>Parent chain name: {parentNetwork.networkName}</div>}
      {messageType && <div>Message type: {messageType}</div>}
      {messageSent && <div>Message sent: {messageSent}</div>}
      {parentBlockNumber && <div>Parent block number: {parentBlockNumber}</div>}
      {recipientNetwork && <div>Recipient chain name: {recipientNetwork.networkName}</div>}
      {recipientBlockNumber && <div>Recipient block number: {recipientBlockNumber}</div>}
      {results && <Table className="events-table" columns={columns} dataSource={results} rowKey="index" />}
    </div>
  )
}

export default Xcm
