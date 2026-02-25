import React from 'react'
import BaseModal from './BaseModal'

interface BankruptModalProps {
  open: boolean
}

const BankruptModal: React.FC<BankruptModalProps> = ({ open }) => {
  return <BaseModal open={open} title="Bankrupt" />
}

export default BankruptModal

