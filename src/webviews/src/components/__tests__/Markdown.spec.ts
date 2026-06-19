import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import Markdown from '../Markdown.vue'

describe('Markdown', () => {
  it('renders its markdown source', async () => {
    const wrapper = mount(Markdown, { props: { source: 'A new `hello world`' } })
    await nextTick()
    await flushPromises()
    await nextTick()

    expect(wrapper.html()).toContain('<code>hello world</code>')
    expect(wrapper.text()).toContain('hello world')
  })
})
