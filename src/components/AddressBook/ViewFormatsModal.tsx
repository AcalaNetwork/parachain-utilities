import { Button, Form, Input, message, Modal, Row, Space, Table } from "antd"
import React, { useEffect, useState } from "react"
import { addAddress } from "../../store/actions/addressActions"
import { useAppDispatch } from "../../store/hooks"
import { SubstrateAddress, TransformedSubstrateAddress } from "../../types"
import * as prefixes from "../../utils/ss58-registry.json"
import { encodeAddress, decodeAddress } from "@polkadot/util-crypto/address"
import CopyToClipboard from "react-copy-to-clipboard"
import { CopyOutlined } from "@ant-design/icons"

type ViewFormatsModalProps = {
  selectedAddress?: SubstrateAddress
  showModal: boolean
  setShowModal: (value: boolean) => void
}

function ViewFormatsModal(props: ViewFormatsModalProps): React.ReactElement {
  const { showModal, setShowModal, selectedAddress } = props

  const renderCopyToClipboard = (row: TransformedSubstrateAddress) => {
    return (
      <CopyToClipboard
        onCopy={() => message.success("Address copied to Clipboard!")}
        text={row.value}>
        <Button type='default' size='middle' icon={<CopyOutlined />} />
      </CopyToClipboard>
    )
  }

  const handleClose = () => {
    setShowModal(false)
  }

  const columns = [
    {
      title: "Prefix",
      dataIndex: "prefix",
      key: "prefix",
    },
    {
      title: "Transformed Address",
      dataIndex: "value",
      key: "value",
    },
    {
      title: "Copy",
      key: "value",
      render: renderCopyToClipboard,
    },
  ]

  return (
    <Modal
      className='view-formats-modal'
      visible={showModal}
      title={`View formats of ${selectedAddress?.name}`}
      onCancel={handleClose}
      footer={null}
      width={800}>
      <Row align='middle' className='mb-3'>
        <Space>
          <h3 className='mb-0'>Public Key:</h3>
          <div>{selectedAddress?.key}</div>
          <CopyToClipboard
            onCopy={() => message.success("Public Key copied to Clipboard!")}
            text={selectedAddress?.key || ""}>
            <Button type='default' size='middle' icon={<CopyOutlined />} />
          </CopyToClipboard>
        </Space>
      </Row>
      {/* <Row>Public Key{selectedAddress?.key}</Row> */}
      <Table dataSource={selectedAddress?.transformed} columns={columns} />
    </Modal>
  )
}

export default ViewFormatsModal
