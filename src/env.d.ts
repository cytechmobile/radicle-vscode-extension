declare global {
  namespace NodeJS {
    interface ProcessEnv {
      LC_ALL?: string
      LC_TIME?: string
      LANG?: string
    }
  }
}
