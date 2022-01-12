import { ApiPromise, WsProvider } from '@polkadot/api'
import { Button, Form, Input, Modal, Row, Select, Space, message, Spin } from 'antd'
import React, { useEffect, useState } from 'react'
import { addNetwork } from '../../store/actions/configActions'
import { useAppDispatch, useAppSelector } from '../../store/hooks'

type AddNetworkModalProps = {
  showModal: boolean
  setShowModal: (value: boolean) => void
}

function AddNetworkModal(props: AddNetworkModalProps): React.ReactElement {
  const [form] = Form.useForm()
  const dispatch = useAppDispatch()
  const config = useAppSelector((state) => state.config)
  const networks = useAppSelector((state) => state.config.networks)
  const [isLoading, setIsLoading] = useState(false)
  const { showModal, setShowModal } = props
  useEffect(() => {
    form.resetFields()
  }, [showModal])

  const onFormSubmit = async (formValues: Record<string, string>) => {
    try {
      setIsLoading(true)
      const trimmedValue = formValues.networkName.trim()
      const checkExisting = networks.find((auxNetwork) => auxNetwork.networkName === trimmedValue)
      if (checkExisting) {
        message.error(`Network with name ${checkExisting.networkName} already exists`)
        setIsLoading(false)
        return
      }

      const trimmedUrl = formValues.urlValue
      const provider = new WsProvider(trimmedUrl)
      provider.on('error', () => {
        provider.disconnect()
        message.error("Error: Couldn't connect to endpoint")
        setIsLoading(false)
      })
      const api = await ApiPromise.create({ provider })
      await api.isReady
      let chainId
      if (formValues.parentNetworkName) {
        chainId = await api.query.parachainInfo.parachainId()
      }
      provider.disconnect()

      dispatch(
        addNetwork({
          networkName: trimmedValue,
          endpoints: [
            {
              value: trimmedUrl,
              enabled: true,
            },
          ],
          paraId: Number(chainId && chainId.toString()) || 0,
          parentNetworkName: formValues.parentNetworkName || undefined,
          enabled: true,
        })
      )
      setIsLoading(false)
      handleClose()
    } catch (err) {
      console.log(err)
      message.error("Error: Couldn't connect to network/endpoint")
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setShowModal(false)
    form.resetFields()
  }

  return (
    <Modal
      className="add-network-modal"
      visible={showModal}
      title="Add Network"
      okText="Add"
      onCancel={handleClose}
      footer={null}
    >
      <Spin spinning={isLoading}>
        <Form
          layout="vertical"
          name="add-network-form"
          form={form}
          initialValues={{
            networkName: '',
          }}
          onFinish={onFormSubmit}
        >
          <Form.Item
            label="Network Name"
            name="networkName"
            rules={[
              {
                required: true,
                message: 'Please enter the network name',
              },
            ]}
          >
            <Input placeholder="Enter network name..." />
          </Form.Item>
          <Form.Item
            label="Endpoint URL"
            name="urlValue"
            rules={[
              {
                required: true,
                message: 'Please enter the URL',
              },
            ]}
          >
            <Input type="url" placeholder="Enter endpoint..." />
          </Form.Item>
          <Form.Item
            label="Parent network"
            name="parentNetworkName"
          >
            <Select>
              <Select.Option value={''}>None</Select.Option>
              {config.networks
                .filter((network) => network.enabled)
                .map((network, index) => (
                  <Select.Option key={index} value={network.networkName}>
                    {network.networkName}
                  </Select.Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item className="mb-0">
            <Row justify="end">
              <Space>
                <Button
                  htmlType="button"
                  onClick={() => {
                    handleClose()
                  }}
                >
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit">
                  Add
                </Button>
              </Space>
            </Row>
          </Form.Item>
        </Form>
      </Spin>
    </Modal>
  )
}

export default AddNetworkModal
