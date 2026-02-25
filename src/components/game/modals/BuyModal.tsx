import React from 'react'
import BaseModal from './BaseModal'

interface BuyModalProps {
  open: boolean
}

const BuyModal: React.FC<BuyModalProps> = ({ open }) => {
  return <BaseModal open={open} title="Buy" />
}

export default BuyModal

