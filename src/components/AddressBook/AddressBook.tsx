import { Button, Row, Space, Table } from "antd"
import React, { useState } from "react"
import { removeAddress } from "../../store/actions/addressActions"
import { useAppDispatch, useAppSelector } from "../../store/hooks"
import { SubstrateAddress } from "../../types"
import AddAddressModal from "./AddAddressModal"
import "./AddressBook.less"
import ViewFormatsModal from "./ViewFormatsModal"

const AddressBook = function NavbarComponent(): React.ReactElement {
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [showViewFormatsModal, setShowViewFormatsModal] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<SubstrateAddress | undefined>();
  const dispatch = useAppDispatch()
  const addresses = useAppSelector(state => state.address.list)

  const handleAddAddress = () => {
    setShowAddAddressModal(true)
  }

  const handleViewFormats = (address: SubstrateAddress) => {
    setSelectedAddress(address)
    setShowViewFormatsModal(true)
  }

  const handleDeleteAddress = (address: SubstrateAddress) => {
    dispatch(removeAddress(address.value))
  }

  const renderAddressActions = (row: SubstrateAddress) => {
    return (
      <Space>
        <Button type='default' onClick={() => handleViewFormats(row)}>
          View Formats
        </Button>
        <Button type='default' danger onClick={()=> handleDeleteAddress(row)}>
          Delete
        </Button>
      </Space>
    )
  }

  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "Address",
      dataIndex: "value",
      key: "value",
    },
    {
      title: "Actions",
      key: "action",
      render: renderAddressActions,
    },
  ]
  
  return (
    <div className="address-book-container">
      <Row>
        <Button type='primary' onClick={handleAddAddress}>Add address</Button>
      </Row>
      <Table dataSource={addresses} columns={columns} />      
      <AddAddressModal
          showModal={showAddAddressModal}
          setShowModal={setShowAddAddressModal}
        />  
        <ViewFormatsModal
            selectedAddress={selectedAddress}
            showModal={showViewFormatsModal}
            setShowModal={setShowViewFormatsModal}
          />
    </div>
  )
}

export default AddressBook
