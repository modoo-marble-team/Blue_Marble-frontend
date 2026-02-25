import React from 'react'
import BaseModal from './BaseModal'

interface AIPenaltyModalProps {
  open: boolean
}

const AIPenaltyModal: React.FC<AIPenaltyModalProps> = ({ open }) => {
  return <BaseModal open={open} title="AI Penalty" />
}

export default AIPenaltyModal

