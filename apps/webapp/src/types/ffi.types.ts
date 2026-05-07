export interface FireFlyFFI {
  name: string
  version: string
  methods: FireFlyMethod[]
}

export interface FireFlyMethod {
  name: string
  description?: string
  params: FireFlyParam[]
  returns?: FireFlyParam
}

export interface FireFlyParam {
  name: string
  type: string
  schema: {
    type: string
  }
}