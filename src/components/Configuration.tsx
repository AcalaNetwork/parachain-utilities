import React from "react"
import { Divider, Switch, Table } from "antd"
import "./Configuration.less"
import { useAppDispatch, useAppSelector } from "../store/hooks"
import { setUtcTime } from "../store/actions/configActions"

const Configuration = function NavbarComponent(): React.ReactElement {
  const dispatch = useAppDispatch()
  const config = useAppSelector(state => state.config)

  const onUtcChange = (checked: boolean) => {
    dispatch(setUtcTime(checked))
  }

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url'
    }
  ]

  return (
    <div className='configuration-container'>
      <div>
        <div>UTC Time Toggle</div>
        <div>
          <Switch checked={config.utcTime} onChange={onUtcChange} />
        </div>
      </div>
      <Divider />
      <div>
        <div>RPC endpoints</div>
        <Table dataSource={config.endpoints} columns={columns} />
        </div>
    </div>
  )
}

export default Configuration
