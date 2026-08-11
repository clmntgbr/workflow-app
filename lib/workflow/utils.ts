export function hasNotificationTarget(values: {
  notifyOnSuccess: boolean
  notifyOnFailure: boolean
  notifyOnCancel: boolean
}): boolean {
  return (
    values.notifyOnSuccess || values.notifyOnFailure || values.notifyOnCancel
  )
}
