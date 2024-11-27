const eslintTsconfig = process.env.ESLINT_TSCONFIG ?? 'tsconfig.eslint.json'

/** @type {import('eslint').Linter.Config} */
module.exports = {
  // TODO: can markdown, json, etc file be lintable similarly to how antfu seems to support it?
  // TODO: ensure eslint-plugin-jest is called with "plugin:jest/recommended"

  root: true,
  extends: [
    '@antfu',
    'prettier',
    ...(eslintTsconfig
      ? [
          'plugin:@typescript-eslint/recommended-requiring-type-checking',
          'plugin:@typescript-eslint/strict',
        ]
      : []),
  ],
  plugins: ['unused-imports'],
  ignorePatterns: [
    'static',
    'src/webviews',

    // overrides to antfu's config follow
    '!.*rc.*',
    '!*.config.js',
    '!*.d.ts',
  ],
  rules: {
    /*
     * Rules native to ESLint follow
     * ========================================================================================
     */
    'no-confusing-arrow': ['warn', { allowParens: true }],
    'no-extra-boolean-cast': 'warn',
    'padding-line-between-statements': [
      'warn',
      { blankLine: 'always', prev: '*', next: 'return' },
      { blankLine: 'always', prev: 'directive', next: '*' },
      { blankLine: 'always', prev: '*', next: 'multiline-block-like' },
      // relax previous rule a for co-located early return ifs
      { blankLine: 'any', prev: '*', next: 'if' },
      // relax previous rule a for co-located vars set by loops (`const` in case of array.push)
      { blankLine: 'any', prev: 'singleline-let', next: 'multiline-block-like' },
      { blankLine: 'any', prev: 'singleline-const', next: 'for' },
      { blankLine: 'any', prev: 'singleline-const', next: 'while' },
      { blankLine: 'any', prev: 'singleline-const', next: 'do' },
    ],
    'sort-imports': ['warn', { ignoreDeclarationSort: true }],
    'import/order': [
      'warn',
      {
        pathGroups: [
          { pattern: '~/**', group: 'internal' },
          { pattern: '@/**', group: 'internal' },
        ],
      },
    ],
    'id-length': ['warn', { min: 2, max: 50, exceptions: ['i', 'j', 'x', 'y', 'z', '_'] }],
    'max-len': [
      'warn',
      {
        code: 95,
        tabWidth: 2,
        ignoreComments: true,
        ignoreTrailingComments: true,
        ignoreTemplateLiterals: true, // TODO: remove option when prettier resolves https://github.com/prettier/prettier/issues/3368
        ignoreRegExpLiterals: true,
        ignoreUrls: true,
      },
    ],

    // overrides to antfu's config follow (found in his repo with regex search '[^\/]+':)
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-expressions': [
      'warn',
      {
        allowShortCircuit: true,
        allowTernary: true,
        allowTaggedTemplates: true,
        enforceForJSX: true,
      },
    ],
    'curly': ['warn', 'all'],
    'no-debugger': 'warn',
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'lodash',
            message:
              "Instead use `import [module] from 'lodash/[module]'`, or `import {[module]} from 'lodash-es'` (latter is preferable if possible).\nMore info: https://www.labnol.org/code/import-lodash-211117",
          },
        ],
      },
    ],
    'no-restricted-syntax': [
      'error',
      {
        selector: 'TSEnumDeclaration',
        message:
          "Don't declare enums. See alternative: https://twitter.com/maninak_/status/1448344698704343040",
      },
      'DebuggerStatement',
      'LabeledStatement',
      'WithStatement',
    ],
    'space-before-function-paren': [
      'warn',
      { anonymous: 'always', named: 'never', asyncArrow: 'always' },
    ],
    'prefer-const': ['warn', { destructuring: 'all', ignoreReadBeforeAssign: true }],
    'prefer-exponentiation-operator': 'warn',
    'prefer-rest-params': 'warn',
    'prefer-spread': 'warn',
    'prefer-template': 'warn',
    'template-curly-spacing': 'warn',
    'arrow-parens': ['warn', 'always', { requireForBlockBody: true }],
    'spaced-comment': [
      'warn',
      'always',
      {
        line: { markers: ['/'], exceptions: ['/', '#'] },
        block: { markers: ['!'], exceptions: ['*'], balanced: true },
      },
    ],
    'consistent-return': 'warn',
    'complexity': ['warn', 40],
    'require-await': 'warn',
    'max-statements-per-line': 'warn',
    'no-empty': ['warn', { allowEmptyCatch: true }],
    'no-multiple-empty-lines': ['warn', { max: 1, maxBOF: 0, maxEOF: 1 }],
    'no-useless-return': 'warn',
    'no-undef-init': 'warn',

    /*
     * Rules implemented by `@typescript-eslint` follow
     * ========================================================================================
     */
    '@typescript-eslint/consistent-type-imports': [
      'warn',
      { disallowTypeAnnotations: false, fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/no-import-type-side-effects': 'error',
    '@typescript-eslint/array-type': ['warn', { default: 'array', readonly: 'array' }],
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
    '@typescript-eslint/explicit-member-accessibility': 'warn',
    '@typescript-eslint/prefer-function-type': 'warn',
    '@typescript-eslint/indent': 'off',
    '@typescript-eslint/prefer-for-of': 'error',
    '@typescript-eslint/member-delimiter-style': [
      'warn',
      {
        multiline: { delimiter: 'none', requireLast: true },
        singleline: { delimiter: 'semi', requireLast: false },
      },
    ],
    '@typescript-eslint/member-ordering': 'warn',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-this-alias': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/naming-convention': [
      'warn',
      {
        selector: 'interface',
        format: ['PascalCase'],
        custom: { regex: '^I[A-Z]', match: false },
      },
      {
        selector: 'variable',
        format: ['camelCase', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
        trailingUnderscore: 'allow',
      },
      { selector: 'typeLike', format: ['PascalCase'] },
    ],
    '@typescript-eslint/no-extra-non-null-assertion': 'error',
    '@typescript-eslint/unified-signatures': 'error',
    '@typescript-eslint/no-extraneous-class': 'error',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/require-array-sort-compare': 'warn',
    '@typescript-eslint/promise-function-async': 'warn',
    '@typescript-eslint/prefer-readonly': 'warn',
    '@typescript-eslint/no-unnecessary-qualifier': 'warn',
    '@typescript-eslint/no-duplicate-type-constituents': 'warn',
    '@typescript-eslint/no-confusing-void-expression': ['warn'],

    // overrides to antfu's config follow (not all overrides may have been moved below)
    '@typescript-eslint/consistent-type-assertions': [
      'warn',
      { assertionStyle: 'as', objectLiteralTypeAssertions: 'allow-as-parameter' },
    ],
    '@typescript-eslint/restrict-template-expressions': 'off',

    /*
     * Rules implemented by `eslint-plugin-unused-imports` follow
     * ========================================================================================
     */
    'unused-imports/no-unused-imports': 'warn',
    'unused-imports/no-unused-vars': [
      'warn',
      { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
    ],

    /*
     * Rules implemented by `eslint-plugin-prettier-vue` follow
     * ========================================================================================
     */
    'prettier-vue/prettier': [
      'warn',
      {
        arrowParens: 'always',
        printWidth: 95,
        semi: false,
        singleQuote: true,
        trailingComma: 'all',
        quoteProps: 'consistent',
        htmlWhitespaceSensitivity: 'ignore',
      },
    ],

    /*
     * Rules implemented by `eslint-plugin-antfu` follow
     * ========================================================================================
     */
    // overrides to antfu's config follow
    'antfu/if-newline': 'warn',
    'antfu/import-dedupe': 'warn',
    'antfu/top-level-function': 'warn',
    'antfu/generic-spacing': 'warn',

    /*
     * Rules implemented by `eslint-plugin-react` follow
     * ========================================================================================
     */
    // overrides to antfu's config follow
    'jsx-quotes': ['warn', 'prefer-double'],

    /*
     * Rules implemented by `eslint-plugin-n` follow
     * ========================================================================================
     */
    // overrides to antfu's config follow
    'n/prefer-global/process': ['warn', 'always'],
  },
  overrides: [
    {
      /*
       * Rules specifically for vue files
       * ======================================================================================
       */
      files: ['*.vue'],
      extends: ['plugin:vue-scoped-css/vue3-recommended', 'plugin:prettier-vue/recommended'],
      parser: 'vue-eslint-parser',
      parserOptions: { parser: '@typescript-eslint/parser' },
      rules: {
        '@typescript-eslint/explicit-member-accessibility': 'off',

        'vue-scoped-css/no-deprecated-v-enter-v-leave-class': 'error',
        'vue-scoped-css/require-selector-used-inside': 'warn',
        'vue-scoped-css/v-deep-pseudo-style': 'error',
        'vue-scoped-css/v-global-pseudo-style': 'error',
        'vue-scoped-css/v-slotted-pseudo-style': 'error',

        'vue/html-self-closing': [
          'warn',
          {
            html: { void: 'always', normal: 'never', component: 'always' },
            svg: 'always',
            math: 'always',
          },
        ],

        // overrides to antfu's config follow
        'vue/max-attributes-per-line': ['warn', { singleline: 5 }],
        'vue/no-v-html': 'error',
        'vue/require-prop-types': 'warn',
        'vue/require-default-prop': 'warn',
        'vue/multi-word-component-names': 'warn',
        'vue/prefer-import-from-vue': 'warn',
        'vue/no-v-text-v-html-on-component': 'warn',
        'vue/no-setup-props-destructure': 'warn',
        'vue/component-tags-order': ['warn', { order: ['script', 'template', 'style'] }],
        'vue/block-tag-newline': ['warn', { singleline: 'always', multiline: 'always' }],
        'vue/component-name-in-template-casing': ['warn', 'PascalCase'],
        'vue/component-options-name-casing': ['warn', 'PascalCase'],
        'vue/custom-event-name-casing': ['warn', 'camelCase'],
        'vue/define-macros-order': ['warn', { order: ['defineProps', 'defineEmits'] }],
        'vue/html-comment-content-spacing': ['warn', 'always', { exceptions: ['-'] }],
        'vue/no-restricted-v-bind': ['warn', '/^v-/'],
        'vue/no-useless-v-bind': 'warn',
        'vue/no-unused-refs': 'warn',
        'vue/prefer-separate-static-class': 'warn',
        'vue/array-bracket-spacing': ['warn', 'never'],
        'vue/arrow-spacing': ['warn', { before: true, after: true }],
        'vue/block-spacing': ['warn', 'always'],
        'vue/brace-style': ['warn', 'stroustrup', { allowSingleLine: true }],
        'vue/comma-dangle': ['warn', 'always-multiline'],
        'vue/comma-spacing': ['warn', { before: false, after: true }],
        'vue/comma-style': ['warn', 'last'],
        'vue/dot-location': ['warn', 'property'],
        'vue/dot-notation': ['warn', { allowKeywords: true }],
        'vue/eqeqeq': ['warn', 'smart'],
        'vue/key-spacing': ['warn', { beforeColon: false, afterColon: true }],
        'vue/keyword-spacing': ['warn', { before: true, after: true }],
        'vue/no-empty-pattern': 'warn',
        'vue/no-extra-parens': ['warn', 'functions'],
        'vue/no-irregular-whitespace': 'warn',
        'vue/object-curly-newline': ['warn', { multiline: true, consistent: true }],
        'vue/object-curly-spacing': ['warn', 'always'],
        'vue/object-property-newline': ['warn', { allowMultiplePropertiesPerLine: true }],
        'vue/object-shorthand': [
          'warn',
          'always',
          {
            ignoreConstructors: false,
            avoidQuotes: true,
          },
        ],
        'vue/operator-linebreak': ['warn', 'before'],
        'vue/prefer-template': 'warn',
        'vue/quote-props': ['warn', 'consistent-as-needed'],
        'vue/space-in-parens': ['warn', 'never'],
        'vue/space-infix-ops': 'warn',
        'vue/space-unary-ops': ['warn', { words: true, nonwords: false }],
        'vue/template-curly-spacing': 'warn',
      },
    },
    {
      /*
       * Rules specifically for vue composable files
       * ======================================================================================
       */
      files: ['*/composables/use*.ts'],
      rules: {},
    },
    {
      /*
       * Rules specifically for front-end component files
       * ======================================================================================
       */
      files: ['*.vue', '*.jsx', '*.tsx'],
      extends: ['plugin:tailwindcss/recommended'],
      plugins: ['tailwindcss'],
      rules: {
        'tailwindcss/no-custom-classname': 'off',
      },
    },
    {
      /*
       * Rules specifically for typescript type declaration files
       * ======================================================================================
       */
      files: ['*.d.ts'],
      rules: {
        'id-length': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'unused-imports/no-unused-imports': 'off',
        'unused-imports/no-unused-vars': 'off',
      },
    },
    {
      /*
       * Rules specifically for shared utility function files
       * ======================================================================================
       */
      files: ['*/utils/**/*.ts', '*/util/**/*.ts'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': [
          'warn',
          {
            allowExpressions: true,
            allowConciseArrowFunctionExpressionsStartingWithVoid: true, // eslint-disable-line id-length
            allowIIFEs: true,
          },
        ],
      },
    },
    {
      /*
       * Rules specifically for test files
       * ======================================================================================
       */
      files: ['*.test.ts', '*.test.js', '*.spec.ts', '*.spec.js'],
      plugins: ['jasmine'],
      rules: {
        // overrides to antfu's config follow
        'no-only-tests/no-only-tests': 'warn',
        'jasmine/new-line-before-expect': 'warn',
        'jasmine/new-line-between-declarations': 'warn',
      },
    },
    {
      /*
       * Rules specifically for common js config files
       * ======================================================================================
       */
      files: ['.*.js', '*.config.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
      },
    },
    {
      /*
       * Rules specifically for standard js files
       * ======================================================================================
       */
      files: ['*.js', '*.jsx'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2024,
    ecmaFeatures: { jsx: true },
    ...(eslintTsconfig ? { project: [eslintTsconfig] } : {}), // TODO: fix this to work when eslintTsconfig is undefined
  },
}
