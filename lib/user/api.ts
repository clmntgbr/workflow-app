import { User } from "./types"

export const getUser = async (): Promise<User> => {
  const response = await fetch("/api/dee593b110504cd6b99541539649944b", {
    method: "GET",
  })

  if (!response.ok) {
    throw new Error("Failed to fetch user")
  }

  return response.json()
}
