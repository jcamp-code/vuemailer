<script setup lang="ts">
import Prism from 'prismjs'
import { computed, nextTick, ref, watch } from 'vue'
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/themes/prism-tomorrow.css'

const props = defineProps<{ code: string; lang: string; highlightLine?: number | null }>()

// Must match the <pre>'s padding-top (p-4) and line-height (leading-5 = 20px) so
// the highlight band lines up with the rendered text.
const LINE_HEIGHT = 20
const PADDING_TOP = 16

const highlighted = computed(() => {
  const grammar = Prism.languages[props.lang] ?? Prism.languages.markup
  return Prism.highlight(props.code, grammar, props.lang)
})

const scroller = ref<HTMLElement | null>(null)
const bandWidth = ref(0)
const bandTop = computed(() =>
  props.highlightLine ? PADDING_TOP + (props.highlightLine - 1) * LINE_HEIGHT : 0,
)

watch(
  () => props.highlightLine,
  async (line) => {
    if (!line) return
    await nextTick()
    const el = scroller.value
    if (!el) return
    bandWidth.value = el.scrollWidth
    const target = bandTop.value - el.clientHeight / 2 + LINE_HEIGHT / 2
    el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' })
  },
  { flush: 'post' },
)
</script>

<template>
  <pre
    ref="scroller"
    class="relative m-0 h-full overflow-auto bg-[#2d2d2d] p-4 text-[13px] leading-5"
  ><div
      v-if="highlightLine"
      class="pointer-events-none absolute left-0 bg-blue-400/15 ring-1 ring-blue-400/40"
      :style="{ top: `${bandTop}px`, height: `${LINE_HEIGHT}px`, width: bandWidth ? `${bandWidth}px` : '100%' }"
    /><code v-html="highlighted" /></pre>
</template>
