import React from "react"
import { Col, Layout, Menu, Row, Space } from "antd"
import { MenuOutlined } from '@ant-design/icons';
import { Link } from "react-router-dom"
import headerLogo from "../images/symbol-polkadot.svg"
import "./Navbar.less"

function NavbarComponent(): React.ReactElement {
  return (
    <Layout.Header className='app-header'>
      <Row wrap={false}>
        <Col flex='none'>
          <Link to='/'>
            <Space className='header-home'>
              <img className='header-logo' src={headerLogo} alt='Polkadot' />
              <div className='logo-text'>Parachain Utilities</div>
            </Space>
          </Link>
        </Col>
        {/* <Col flex='1 1'>
          <Menu mode='horizontal'>
          </Menu>
        </Col> */}
        <Col flex='1 1'>
          <Menu className='menu-right' mode='horizontal'
                overflowedIndicator={<MenuOutlined />}>
            <Menu.Item key='1'>
              <Link to='/address-book'>Address Book</Link>
            </Menu.Item>
            <Menu.Item key='2'>
              <Link to='/average-block-time'>Average Block Time</Link>
            </Menu.Item>
            <Menu.Item key='3'>
              <Link to='/block-time'>Block Time</Link>
            </Menu.Item>
            <Menu.Item key='4'>
              <Link to='/block-author'>Block Author</Link>
            </Menu.Item>
            <Menu.Item key='5'>
              <Link to='/config'>Config</Link>
            </Menu.Item>
          </Menu>
        </Col>
      </Row>
    </Layout.Header>
  )
}

export default NavbarComponent
