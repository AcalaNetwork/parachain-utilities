import { Button, Form, Input, Modal, Row, Space, message } from 'antd'
import React, { useEffect } from 'react'
import { addAddress } from '../../store/actions/addressActions'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { SubstrateAddress } from '../../types'
import { decodeAddress } from '@polkadot/util-crypto/address'
import { transformAddress } from '../../utils/UtilsFunctions'

type AddAddressModalProps = {
  showModal: boolean
  setShowModal: (value: boolean) => void
}

function AddAddressModal(props: AddAddressModalProps): React.ReactElement {
  const [form] = Form.useForm()
  const dispatch = useAppDispatch()
  const addresses = useAppSelector((state) => state.address.list)

  const { showModal, setShowModal } = props
  useEffect(() => {
    form.resetFields()
  }, [showModal])

  const onFormSubmit = (address: SubstrateAddress) => {
    try {
      const decodedValue = decodeAddress(address.key)
      const hexValue = '0x' + Buffer.from(decodedValue).toString('hex')
      const checkExisting = addresses.find((auxAddress) => auxAddress.key === hexValue)
      if (checkExisting) {
        message.error(`Address already exists with name ${checkExisting.name}`)
        return
      }
      dispatch(
        addAddress({
          ...address,
          key: hexValue,
          transformed: transformAddress(hexValue),
        })
      )
      handleClose()
    } catch (err) {
      message.error('Error: Invalid address')
    }
  }

  const handleClose = () => {
    setShowModal(false)
  }

  return (
    <Modal
      className="add-address-modal"
      visible={showModal}
      title="Add address"
      okText="Add"
      onCancel={handleClose}
      footer={null}
    >
      <Form
        layout="vertical"
        name="add-address-form"
        form={form}
        initialValues={{
          name: '',
          value: '',
        }}
        onFinish={onFormSubmit}
      >
        <Form.Item
          label="Name"
          name="name"
          rules={[
            {
              required: true,
              message: 'Please enter a name',
            },
          ]}
        >
          <Input placeholder="Enter name..." />
        </Form.Item>
        <Form.Item
          label="Address"
          name="key"
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
    </Modal>
  )
}

export default AddAddressModal
