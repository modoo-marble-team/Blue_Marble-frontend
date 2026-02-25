import React from 'react'

interface BaseModalProps {
  open: boolean
  title: string
  children?: React.ReactNode
}

const BaseModal: React.FC<BaseModalProps> = ({ open, title, children }) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-3 text-lg font-bold text-[#314158]">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default BaseModal

