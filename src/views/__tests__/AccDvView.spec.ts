import { describe, it, expect } from 'vitest'

import { mount } from '@vue/test-utils'
import AccDvView from '../AccDvView.vue'

describe('HelloWorld', () => {
  it('renders properly', () => {
    const wrapper = mount(AccDvView, { props: { msg: 'Hello Vitest' } })
    expect(wrapper.text()).toContain('Hello Vitest')
  })
})
