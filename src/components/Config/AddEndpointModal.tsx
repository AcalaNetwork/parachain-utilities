import { ApiPromise, WsProvider } from "@polkadot/api"
import { Button, Form, Input, Modal, Row, Space, message, Spin } from "antd"
import React, { useEffect, useState } from "react"
import { addEndpoint } from "../../store/actions/configActions"
import { useAppDispatch, useAppSelector } from "../../store/hooks"
import { RPCEndpoint } from "../../types"

type AddEndpointModalProps = {
  showModal: boolean
  setShowModal: (value: boolean) => void
}

function AddEndpointModal(props: AddEndpointModalProps): React.ReactElement {
  const [form] = Form.useForm()
  const dispatch = useAppDispatch()
  const endpoints = useAppSelector(state => state.config.endpoints)
  const [isLoading, setIsLoading] = useState(false)
  const { showModal, setShowModal } = props
  useEffect(() => {
    form.resetFields()
  }, [showModal])

  const onFormSubmit = async (rpcEndpoint: RPCEndpoint) => {
    try {
      setIsLoading(true)
      const trimmedValue = rpcEndpoint.value.trim()
      const checkExisting = endpoints.find(
        auxEndpoint => auxEndpoint.value === trimmedValue
      )
      if (checkExisting) {
        message.error(
          `Endpoint already exists with name ${checkExisting.chainName}`
        )
        setIsLoading(false)
        return
      }

      const provider = new WsProvider(trimmedValue)
      provider.on("error", () => {
        provider.disconnect()
        message.error("Error: Couldn't connect to endpoint")
        setIsLoading(false)
      })
      const api = await ApiPromise.create({ provider })
      const chainName = (await api.rpc.system.chain()).toString()
      provider.disconnect()
      dispatch(
        addEndpoint({
          value: trimmedValue,
          chainName,
          enabled: true,
        })
      )
      setIsLoading(false)
      handleClose()
    } catch (err) {
      message.error("Error: Invalid endpoint URL")
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setShowModal(false)
    form.resetFields()
  }

  return (
    <Modal
      className='add-endpoint-modal'
      visible={showModal}
      title='Add RPC endpoint'
      okText='Add'
      onCancel={handleClose}
      footer={null}>
      <Spin spinning={isLoading}>
        <Form
          layout='vertical'
          name='add-endpoint-form'
          form={form}
          initialValues={{
            value: "",
          }}
          onFinish={onFormSubmit}>
          <Form.Item
            label='URL'
            name='value'
            rules={[
              {
                required: true,
                message: "Please enter the URL",
              },
            ]}>
            <Input type='url' placeholder='Enter endpoint...' />
          </Form.Item>
          <Form.Item className='mb-0'>
            <Row justify='end'>
              <Space>
                <Button
                  htmlType='button'
                  onClick={() => {
                    handleClose()
                  }}>
                  Cancel
                </Button>
                <Button type='primary' htmlType='submit'>
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

export default AddEndpointModal
