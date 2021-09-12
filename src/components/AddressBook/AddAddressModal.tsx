import { Button, Form, Input, Modal, Row, Space } from "antd"
import React, { useEffect, useState } from "react"
import { addAddress } from "../../store/actions/addressActions"
import { useAppDispatch } from "../../store/hooks"
import { SubstrateAddress } from "../../types"

type AddAddressModalProps = {
  showModal: boolean
  setShowModal: (value: boolean) => void
}

function AddAddressModal(props: AddAddressModalProps): React.ReactElement {
  const [form] = Form.useForm()
  const dispatch = useAppDispatch()
  
  const { showModal, setShowModal } = props

  const onFormSubmit = (address: SubstrateAddress) => {
    dispatch(addAddress(address))
    handleClose()
  }

  const handleClose = () => {
    setShowModal(false)
  }

  return (
    <Modal
      className='add-address-modal'
      visible={showModal}
      title='Add address'
      okText='Create'
      onCancel={handleClose}
      footer={null}>
      <Form
        layout='vertical'
        name='add-address-form'
        form={form}
        initialValues={{
          gmtDifference: 0,
        }}
        onFinish={onFormSubmit}>
        <Form.Item
          label='Name'
          name='name'
          rules={[
            {
              required: true,
              message: "Please enter a name",
            },
          ]}>
          <Input placeholder='Enter name...' />
        </Form.Item>
        <Form.Item
          label='Address'
          name='value'
          rules={[
            {
              required: true,
              message: "Please enter the address",
            },
          ]}>
          <Input placeholder='Enter address...' />
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
                Create
              </Button>
            </Space>
          </Row>
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default AddAddressModal
