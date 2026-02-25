import React from 'react'
import BaseModal from './BaseModal'

interface BuildModalProps {
  open: boolean
}

const BuildModal: React.FC<BuildModalProps> = ({ open }) => {
  return <BaseModal open={open} title="Build" />
}

export default BuildModal

