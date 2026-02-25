import React from 'react'
import BaseModal from './BaseModal'

interface TollModalProps {
  open: boolean
}

const TollModal: React.FC<TollModalProps> = ({ open }) => {
  return <BaseModal open={open} title="Toll" />
}

export default TollModal

