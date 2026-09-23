export type ToolCategory =
  | "encoding"
  | "authentication"
  | "analysis"
  | "hashing"
  | "policy"
  | "testing"

export type ToolIcon =
  | "key"
  | "code"
  | "globe"
  | "braces"
  | "fingerprint"
  | "shield"
  | "headers"
  | "regex"

export interface SecurityTool {
  id: string
  slug: string
  name: string
  description: string
  category: ToolCategory
  icon: ToolIcon
  available: boolean
}
