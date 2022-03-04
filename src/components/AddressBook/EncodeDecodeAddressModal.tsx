import { Button, Form, Input, Modal, Row, Space, message } from 'antd'
import React, { useEffect, useState } from 'react'
import { addAddress } from '../../store/actions/addressActions'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { SubstrateAddress } from '../../types'
import { decodeAddress, encodeAddress } from '@polkadot/util-crypto/address'
import { transformAddress } from '../../utils/UtilsFunctions'

type EncodeDecodeAddressModal = {
  showModal: boolean
  setShowModal: (value: boolean) => void
}

function EncodeDecodeAddressModal(props: EncodeDecodeAddressModal): React.ReactElement {
  const [form] = Form.useForm()
  const [result, setResult] = useState<string | undefined>('');

  const { showModal, setShowModal } = props
  useEffect(() => {
    form.resetFields()
  }, [showModal])

  const handleEncodeAddress = () => {
    const input = form.getFieldsValue().address
    if (!input) {
      setResult(undefined)
      return;
    }
    
    const buffer = Buffer.concat([Buffer.from(input, 'ascii')], 32);
    const result = encodeAddress(buffer)

    setResult(result)
  }

  const handleDecodeAddress = () => {
    const input = form.getFieldsValue().address
    console.log(form.getFieldsValue())
    console.log(form.getFieldsValue().address)
    if (!input) {
      setResult(undefined)
      return;
    }

    const buffer = decodeAddress(input)

    setResult(buffer.toString())
  }

  const handleClose = () => {
    setShowModal(false)
  }

  return (
    <Modal
      className="encode-decode-address-modal"
      visible={showModal}
      title="Encode/decode system account address"
      onCancel={handleClose}
      footer={null}
    >
      <Form
        layout="vertical"
        name="encode-decode-address-form"
        form={form}
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
            <Button type="primary" onClick={handleEncodeAddress}>
              Encode
            </Button>
            <Button type="primary" onClick={handleDecodeAddress}>
              Decode
            </Button>
          </Space>
        </Form.Item>
      </Form>
      {result === undefined &&
        <div>
          Invalid address
        </div>
      }
      {result &&
        <div>
          {result}
        </div>
      }
    </Modal>
  )
}

export default EncodeDecodeAddressModal
