export interface ProfileMenuItem {
  id: string
  label: string
  onSelect: () => void
  tone?: 'default' | 'danger'
}
