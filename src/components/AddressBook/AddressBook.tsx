import { DeleteOutlined, DotChartOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Row, Space, Table } from 'antd'
import React, { useState } from 'react'
import { deleteAddress } from '../../store/actions/addressActions'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { SubstrateAddress } from '../../types'
import AddAddressModal from './AddAddressModal'
import './AddressBook.less'
import ViewFormatsModal from './ViewFormatsModal'

function AddressBook(): React.ReactElement {
  const [showAddAddressModal, setShowAddAddressModal] = useState(false)
  const [showViewFormatsModal, setShowViewFormatsModal] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState<SubstrateAddress | undefined>()
  const dispatch = useAppDispatch()
  const addresses = useAppSelector((state) => state.address.list)

  const handleAddAddress = () => {
    setShowAddAddressModal(true)
  }

  const handleViewFormats = (address: SubstrateAddress) => {
    setSelectedAddress(address)
    setShowViewFormatsModal(true)
  }

  const handleDeleteAddress = (address: SubstrateAddress) => {
    dispatch(deleteAddress(address.key))
  }

  const renderAddressActions = (row: SubstrateAddress) => {
    return (
      <Space>
        <Button type="default" icon={<DotChartOutlined />} size="small" onClick={() => handleViewFormats(row)}>
          View Formats
        </Button>
        <Button type="default" danger icon={<DeleteOutlined />} size="small" onClick={() => handleDeleteAddress(row)}>
          Delete
        </Button>
      </Space>
    )
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Public key of Address',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: 'Actions',
      key: 'action',
      render: renderAddressActions,
    },
  ]

  return (
    <div className="address-book-container">
      <Row className="mb-3">
        <Space>
          <Button type="primary" onClick={handleAddAddress} icon={<PlusOutlined />}>
            Add address
          </Button>
        </Space>
      </Row>
      <Table dataSource={addresses} columns={columns} rowKey="key" />
      <AddAddressModal showModal={showAddAddressModal} setShowModal={setShowAddAddressModal} />
      <ViewFormatsModal
        selectedAddress={selectedAddress}
        showModal={showViewFormatsModal}
        setShowModal={setShowViewFormatsModal}
      />
    </div>
  )
}

export default AddressBook
