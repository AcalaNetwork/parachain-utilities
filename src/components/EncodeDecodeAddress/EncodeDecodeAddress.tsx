import { ArrowsAltOutlined, CopyOutlined, ShrinkOutlined } from '@ant-design/icons'
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto/address'
import { Button, Form, Input, message, Space, Table } from 'antd'
import React, { useContext, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { ApiContext, ApiContextData, connectToApi } from '../utils/ApiProvider'
import './EncodeDecodeAddress.less'
import { setEndpointPrefix } from '../../store/actions/configActions'
import CopyToClipboard from 'react-copy-to-clipboard'

interface AddressResult {
  chainName: string
  prefix: string
  address: string
}

function EncodeDecodeAddress(): React.ReactElement {
  const { apiConnections, apiStatus } = useContext<ApiContextData>(ApiContext)
  const dispatch = useAppDispatch()
  const [formEncodeDecodeAddress] = Form.useForm()
  const config = useAppSelector((state) => state.config)
  const selectedNetworks = useMemo(() => config.networks.filter((auxNetwork) => auxNetwork.enabled), [config])
  const [results, setResults] = useState<Array<AddressResult>>([])
  const [isLoading, setIsLoading] = useState(false)

  const handleEncodeAddress = async () => {
    const input = formEncodeDecodeAddress.getFieldsValue().address?.toString().trim()
    if (!input) {
      message.error('Please enter a valid address.')
      return
    }

    setResults([])
    setIsLoading(true)

    try {
      const buffer = Buffer.concat([Buffer.from(input, 'ascii')], 32)
      for (const auxNetwork of selectedNetworks) {
        if (auxNetwork.prefix !== undefined) {
          // If we already know the prefix, calculate address directly
          setResults((oldResults) => {
            return [
              ...oldResults,
              {
                chainName: auxNetwork.networkName,
                prefix: auxNetwork.prefix?.toString() || '-',
                address: encodeAddress(buffer, auxNetwork.prefix),
              },
            ]
          })
        } else {
          const api = await connectToApi(apiConnections, apiStatus, auxNetwork)
          const resultPrefix = await api.consts.system.ss58Prefix
          const prefix = parseInt(resultPrefix.toString())
          // Update prefix on config
          dispatch(setEndpointPrefix(auxNetwork.networkName, prefix))
          // Then encode address
          setResults((oldResults) => {
            return [
              ...oldResults,
              {
                chainName: auxNetwork.networkName,
                prefix: prefix.toString(),
                address: encodeAddress(buffer, prefix),
              },
            ]
          })
        }
      }
    } catch (err) {
      message.error(`Couldn't encode the address ${input}`)
    }

    setIsLoading(false)
  }

  const handleDecodeAddress = () => {
    const input = formEncodeDecodeAddress.getFieldsValue().address?.toString().trim()
    if (!input) {
      message.error('Please enter a valid address.')
      return
    }

    setResults([])
    setIsLoading(true)

    try {
      const hex = decodeAddress(input)
      let buffer = Buffer.from(hex)
      let index = buffer.indexOf(0x00)
      while (index !== -1) {
        buffer = buffer.slice(0, index)
        index = buffer.indexOf(0x00)
      }
      const result = buffer.toString('ascii')
      setResults([
        {
          chainName: '-',
          prefix: '-',
          address: result,
        },
      ])
    } catch (err) {
      message.error(`Couldn't decode the address ${input}`)
    }

    setIsLoading(false)
  }

  const renderConvertedAddress = (row: AddressResult) => {
    return <Space>
      <CopyToClipboard onCopy={() => message.success('Address copied to Clipboard!')} text={row.address}>
        <Button type="default" size="middle" icon={<CopyOutlined />} />
      </CopyToClipboard>
      <div>{row.address}</div>
    </Space>
  }

  const columns = [
    {
      title: 'Chain',
      key: 'chainName',
      dataIndex: 'chainName',
    },
    {
      title: 'Prefix',
      key: 'prefix',
      dataIndex: 'prefix',
    },
    {
      title: 'Address',
      key: 'address',
      render: renderConvertedAddress,
    },
  ]

  return (
    <div className="block-time-container">
      <Form
        className="mb-4"
        layout="horizontal"
        form={formEncodeDecodeAddress}
        initialValues={{
          address: '',
        }}
      >
        <Form.Item
          label="Address"
          name="address"
          rules={[
            {
              required: true,
              message: 'Please enter the address',
            },
          ]}
        >
          <Input placeholder="Enter address..." />
        </Form.Item>
        <Form.Item className="mb-0">
          <Space>
            <Button
              htmlType="submit"
              icon={<ShrinkOutlined />}
              loading={isLoading}
              type="primary"
              onClick={handleEncodeAddress}
            >
              Encode
            </Button>
            <Button
              htmlType="submit"
              icon={<ArrowsAltOutlined />}
              loading={isLoading}
              type="primary"
              onClick={handleDecodeAddress}
            >
              Decode
            </Button>
          </Space>
        </Form.Item>
      </Form>
      <h2>Result:</h2>
      <Table dataSource={results} columns={columns} rowKey="chainName" />
    </div>
  )
}

export default EncodeDecodeAddress
