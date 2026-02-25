import React from 'react'
import BaseModal from './BaseModal'

interface GameResultModalProps {
  open: boolean
}

const GameResultModal: React.FC<GameResultModalProps> = ({ open }) => {
  return <BaseModal open={open} title="Result" />
}

export default GameResultModal

