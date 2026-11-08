<script setup lang="ts">
import {
  createEch0Comment,
  fetchEch0CommentForm,
  fetchEch0Comments,
  formatEch0Time,
  type Ech0Comment,
  type Ech0FormMeta,
} from '~/utils/ech0'

const props = defineProps<{ echoId: string; apiBase: string }>()
const emit = defineEmits<{ countChange: [count: number] }>()

const { ui, t } = useUi()

const loading = ref(true)
const failed = ref(false)
const comments = ref<Ech0Comment[]>([])
const formMeta = ref<Ech0FormMeta | null>(null)

const formOpenAt = ref(0)
const replyTo = ref<Ech0Comment | null>(null)
const submitting = ref(false)
const notice = ref('')
const nickname = ref('')
const email = ref('')
const website = ref('')
const content = ref('')
const hpField = ref('')

const capWidgetEl = ref<HTMLElement | null>(null)
const capMountEl = ref<HTMLElement | null>(null)
let capToken = ''
let capSolving = false

type CapWidgetElement = HTMLElement & { solve?: () => Promise<{ token: string } | null> }

const topLevel = computed(() => comments.value.filter((c) => !c.parent_id))
function childrenOf(id: string): Ech0Comment[] {
  return comments.value.filter((c) => c.parent_id === id)
}

const timeI18n = computed(() => ({
  justNow: ui.shuoshuo.justNow,
  minutesAgo: ui.shuoshuo.minutesAgo,
  hoursAgo: ui.shuoshuo.hoursAgo,
  daysAgo: ui.shuoshuo.daysAgo,
}))
const timeOf = (ts: number) => formatEch0Time(ts, timeI18n.value)

const contentTooLong = computed(() => content.value.length > 200)

async function load() {
  loading.value = true
  failed.value = false
  try {
    const [list, meta] = await Promise.all([
      fetchEch0Comments(props.apiBase, props.echoId),
      fetchEch0CommentForm(props.apiBase),
    ])
    comments.value = list
    formMeta.value = meta
    formOpenAt.value = Date.now()
    emit('countChange', list.length)
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)

/** 表单与挂载点都就绪时才装验证码（模板 ref 绑定晚于数据赋值，watch 才可靠） */
watch([formMeta, capMountEl], ([meta, el]) => {
  if (meta?.enable_comment && meta?.captcha_enabled && meta?.captcha_api_endpoint && el && !capWidgetEl.value) {
    mountCapWidget()
  }
})

async function mountCapWidget() {
  if (capWidgetEl.value || !capMountEl.value) return
  try {
    await import('@cap.js/widget')
  } catch {
    notice.value = ui.shuoshuo.captchaFailed
    return
  }
  const widget = document.createElement('cap-widget') as CapWidgetElement
  widget.setAttribute('data-cap-api-endpoint', formMeta.value?.captcha_api_endpoint ?? '')
  widget.addEventListener('solve', (event: Event) => {
    const detail = (event as CustomEvent<{ token?: string }>).detail
    capToken = detail?.token ?? ''
  })
  widget.addEventListener('error', () => {
    capToken = ''
  })
  capMountEl.value.appendChild(widget)
  capWidgetEl.value = widget
}

async function solveCap(): Promise<string> {
  if (!formMeta.value?.captcha_enabled) return ''
  if (capToken) return capToken
  const widget = capWidgetEl.value as CapWidgetElement | null
  if (!widget?.solve) throw new Error('captcha')
  capSolving = true
  try {
    const result = await widget.solve()
    capToken = result?.token ?? ''
    return capToken
  } finally {
    capSolving = false
  }
}

function resetReply() {
  replyTo.value = null
}

async function submit() {
  if (submitting.value || contentTooLong.value) return
  notice.value = ''
  const meta = formMeta.value
  if (!meta?.enable_comment || !meta.form_token) return

  // min_submit_ms：提交太快会被反垃圾拦截，差多少补多少
  const elapsed = Date.now() - formOpenAt.value
  const wait = meta.min_submit_ms - elapsed
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))

  submitting.value = true
  try {
    const captchaToken = await solveCap()
    const result = await createEch0Comment(props.apiBase, {
      echo_id: props.echoId,
      parent_id: replyTo.value?.id,
      nickname: nickname.value.trim(),
      email: email.value.trim(),
      website: website.value.trim(),
      content: content.value.trim(),
      hp_field: hpField.value,
      form_token: meta.form_token,
      captcha_token: captchaToken,
    })
    content.value = ''
    resetReply()
    if (result.status === 'approved') {
      notice.value = ui.shuoshuo.commentApproved
      await load()
    } else {
      notice.value = ui.shuoshuo.commentPending
    }
  } catch {
    notice.value = ui.shuoshuo.commentFailed
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => {
  capWidgetEl.value = null
})
</script>

<template>
  <section class="cmt" :aria-label="ui.shuoshuo.commentsTitle.replace(' · {n}', '')">
    <p v-if="loading" class="cmt-note">{{ ui.shuoshuo.loading }}</p>
    <p v-else-if="failed" class="cmt-note is-error">{{ ui.shuoshuo.loadError }}</p>
    <p v-else-if="formMeta && !formMeta.enable_comment" class="cmt-note">{{ ui.shuoshuo.commentsOff }}</p>

    <template v-else>
      <p v-if="comments.length === 0" class="cmt-note">{{ ui.shuoshuo.commentsEmpty }}</p>

      <ul v-else class="cmt-list">
        <li v-for="c in topLevel" :key="c.id" class="cmt-item">
          <div class="cmt-row">
            <span class="cmt-avatar" aria-hidden="true">{{ c.nickname.slice(0, 1) }}</span>
            <div class="cmt-body">
              <p class="cmt-meta">
                <span class="cmt-name">{{ c.nickname }}</span>
                <time :datetime="new Date(c.created_at * 1000).toISOString()">{{ timeOf(c.created_at) }}</time>
              </p>
              <p class="cmt-content">{{ c.content }}</p>
              <button
                type="button"
                class="cmt-reply"
                :aria-label="t(ui.shuoshuo.replyAria, { name: c.nickname })"
                @click="replyTo = replyTo?.id === c.id ? null : c"
              >
                {{ t(ui.shuoshuo.replyTo, { name: c.nickname }) }}
              </button>
            </div>
          </div>

          <ul v-if="childrenOf(c.id).length" class="cmt-children">
            <li v-for="child in childrenOf(c.id)" :key="child.id" class="cmt-item">
              <div class="cmt-row">
                <span class="cmt-avatar" aria-hidden="true">{{ child.nickname.slice(0, 1) }}</span>
                <div class="cmt-body">
                  <p class="cmt-meta">
                    <span class="cmt-name">{{ child.nickname }}</span>
                    <time :datetime="new Date(child.created_at * 1000).toISOString()">{{ timeOf(child.created_at) }}</time>
                  </p>
                  <p class="cmt-content">{{ child.content }}</p>
                </div>
              </div>
            </li>
          </ul>
        </li>
      </ul>

      <form v-if="formMeta?.enable_comment" class="cmt-form" @submit.prevent="submit">
        <p class="cmt-form-title">
          {{ replyTo ? t(ui.shuoshuo.replyTo, { name: replyTo.nickname }) : ui.shuoshuo.formTitle }}
          <button v-if="replyTo" type="button" class="cmt-reply-cancel" @click="resetReply">
            {{ ui.shuoshuo.cancelReply }}
          </button>
        </p>
        <p class="cmt-guest">{{ ui.shuoshuo.guestNotice }}</p>

        <div class="cmt-grid">
          <input v-model="nickname" type="text" class="cmt-input" :placeholder="ui.shuoshuo.nicknameLabel" required :aria-label="ui.shuoshuo.nicknameLabel" />
          <input v-model="email" type="email" class="cmt-input" :placeholder="ui.shuoshuo.emailLabel" required :aria-label="ui.shuoshuo.emailLabel" />
        </div>
        <input v-model="website" type="url" class="cmt-input" :placeholder="ui.shuoshuo.websiteLabel" :aria-label="ui.shuoshuo.websiteLabel" />

        <textarea
          v-model="content"
          class="cmt-input cmt-textarea"
          :placeholder="ui.shuoshuo.contentLabel"
          rows="3"
          required
          maxlength="400"
          :aria-label="ui.shuoshuo.contentLabel"
        ></textarea>

        <input v-model="hpField" type="text" class="cmt-hp" tabindex="-1" autocomplete="off" aria-hidden="true" />

        <div v-if="formMeta?.captcha_enabled" ref="capMountEl" class="cmt-cap"></div>

        <div class="cmt-foot">
          <span class="cmt-count" :class="{ 'is-over': contentTooLong }">
            {{ t(ui.shuoshuo.contentCount, { n: content.length }) }}
          </span>
          <button type="submit" class="cmt-submit" :disabled="submitting || !nickname.trim() || !content.trim() || contentTooLong">
            {{ submitting ? ui.shuoshuo.submitting : ui.shuoshuo.submit }}
          </button>
        </div>

        <p v-if="notice" class="cmt-note" :class="{ 'is-error': notice === ui.shuoshuo.commentFailed || notice === ui.shuoshuo.captchaFailed }">
          {{ notice }}
        </p>
      </form>
    </template>
  </section>
</template>

<style scoped>
.cmt {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}

.cmt-note {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.cmt-note.is-error {
  color: var(--accent);
}

.cmt-list,
.cmt-children {
  list-style: none;
  margin: 0;
  padding: 0;
}

.cmt-children {
  margin-left: 2.25rem;
  padding-left: 0.75rem;
  border-left: 1px solid var(--border);
}

.cmt-item + .cmt-item {
  margin-top: 0.75rem;
}

.cmt-row {
  display: flex;
  gap: 0.625rem;
}

.cmt-avatar {
  flex: none;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 999px;
  background: var(--muted);
  border: 1px solid var(--border);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.cmt-body {
  min-width: 0;
  flex: 1;
}

.cmt-meta {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  font-size: var(--fs-meta);
}

.cmt-name {
  font-weight: 700;
  color: var(--foreground);
}

.cmt-meta time {
  color: var(--muted-foreground);
}

.cmt-content {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--foreground);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin-top: 0.125rem;
}

.cmt-reply,
.cmt-reply-cancel {
  border: 0;
  background: none;
  padding: 0;
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  cursor: pointer;
  transition: color var(--duration-base) var(--easing-base);
}

.cmt-reply:hover,
.cmt-reply-cancel:hover {
  color: var(--accent);
}

.cmt-form {
  margin-top: 1rem;
  display: grid;
  gap: 0.5rem;
}

.cmt-form-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--fs-meta);
  font-weight: 700;
}

.cmt-guest {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
}

.cmt-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.cmt-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--background);
  color: var(--foreground);
  padding: 0.4375rem 0.625rem;
  font-size: 0.9375rem;
  font-family: inherit;
  transition: border-color var(--duration-base) var(--easing-base);
}

.cmt-input:focus-visible {
  outline: none;
  border-color: var(--accent);
}

.cmt-textarea {
  resize: vertical;
  min-height: 4.5rem;
}

.cmt-hp {
  position: absolute;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
}

.cmt-cap {
  display: block;
}

.cmt-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.cmt-count {
  font-size: var(--fs-meta);
  color: var(--muted-foreground);
  font-family: var(--font-mono);
}

.cmt-count.is-over {
  color: var(--accent);
}

.cmt-submit {
  border: 1px solid var(--accent);
  background: var(--accent);
  color: #fff;
  border-radius: 999px;
  padding: 0.375rem 1.25rem;
  font-size: var(--fs-meta);
  cursor: pointer;
  transition:
    opacity var(--duration-base) var(--easing-base),
    transform var(--duration-base) var(--easing-base);
}

.cmt-submit:hover:not(:disabled) {
  opacity: 0.9;
}

.cmt-submit:active:not(:disabled) {
  transform: scale(0.97);
}

.cmt-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
