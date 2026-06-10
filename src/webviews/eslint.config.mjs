import maninak from '@maninak/eslint-config'

export default maninak({
  typescript: {
    tsconfigPath: ['./tsconfig.app.json',
      './tsconfig.node.json',
      './tsconfig.vitest.json',
    ],
  },
})
