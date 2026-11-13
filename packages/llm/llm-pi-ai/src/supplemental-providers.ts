/**
 * Lyceum's OpenAI-compatible chat provider and its documented chat catalog.
 * Media-generation and embeddings identifiers are intentionally excluded.
 *
 * @see https://lyceum.technology/models/
 * @see https://docs.lyceum.technology/docs/inference/serverless
 */

import { openAICompletionsApi } from '@earendil-works/pi-ai/api/openai-completions.lazy'
import type { Api, ApiKeyAuth, Model, Provider } from '@earendil-works/pi-ai'
import { createProvider } from './models.ts'

const LYCEUM_BASE_URL = 'https://api.lyceum.technology/openai/v1'

/** Native Lyceum authentication: a stored key wins, then LYCEUM_API_KEY. */
const LYCEUM_AUTH: ApiKeyAuth = {
  name: 'Lyceum API key',
  login: async (interaction) => {
    interaction.signal.throwIfAborted()
    const key = await interaction.prompt({ type: 'secret', message: 'Enter Lyceum API key' })
    interaction.signal.throwIfAborted()
    return { type: 'api_key', key }
  },
  resolve: async ({ ctx, credential, signal }) => {
    signal.throwIfAborted()
    if (credential?.key) {
      return { auth: { apiKey: credential.key }, ...credential.env === undefined ? {} : { env: credential.env }, source: 'stored credential' }
    }
    const value = await ctx.env('LYCEUM_API_KEY')
    signal.throwIfAborted()
    return value ? { auth: { apiKey: value }, source: 'LYCEUM_API_KEY' } : undefined
  },
}

/**
 * Populate one Lyceum model with the shared endpoint and OpenAI wire defaults.
 * The zero-cost fields indicate that Harness does not track provider charges;
 * they are not a claim that Lyceum's inference is free. Reasoning is left at
 * each backend's default rather than sending unverified effort parameters.
 * @param model - Model ID, display name, and supported input modalities.
 * @returns A complete OpenAI Chat Completions catalog entry.
 * @see https://docs.lyceum.technology/docs/inference/serverless#request-limits
 */
function lyceumModel(model: Pick<Model<Api>, 'id' | 'name' | 'input'>): Model<'openai-completions'> {
  return {
    ...model,
    api: 'openai-completions',
    provider: 'lyceum',
    baseUrl: LYCEUM_BASE_URL,
    contextWindow: 1_048_576,
    maxTokens: 131_072,
    reasoning: false,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    compat: {
      maxTokensField: 'max_tokens',
      supportsStore: false,
      supportsDeveloperRole: false,
    },
  }
}

/** Lyceum provider, including only its text-generation chat models. */
export const LYCEUM_PROVIDER: Provider = createProvider({
  id: 'lyceum',
  name: 'Lyceum',
  baseUrl: LYCEUM_BASE_URL,
  auth: { apiKey: LYCEUM_AUTH },
  models: [
    lyceumModel({ id: 'deepseek/deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash', input: ['text'] }),
    lyceumModel({ id: 'deepseek/deepseek-v4.1-flash', name: 'DeepSeek V4.1 Flash', input: ['text', 'image'] }),
    lyceumModel({ id: 'deepseek/deepseek-v4.1-flash-1017', name: 'DeepSeek V4.1 Flash 1017', input: ['text', 'image'] }),
    lyceumModel({ id: 'lyceum/reasoning', name: 'Lyceum Reasoning', input: ['text'] }),
    lyceumModel({ id: 'moonshotai/kimi-k3.1-pro', name: 'Kimi K3.1 Pro', input: ['text', 'image'] }),
    lyceumModel({ id: 'z-ai/glm-5.1', name: 'GLM-5.1', input: ['text'] }),
    lyceumModel({ id: 'z-ai/glm-5.2', name: 'GLM-5.2', input: ['text'] }),
    lyceumModel({ id: 'z-ai/glm-5.2-instant', name: 'GLM-5.2 Instant', input: ['text'] }),
    lyceumModel({ id: 'z-ai/glm-5.3', name: 'GLM-5.3', input: ['text'] }),
    lyceumModel({ id: 'z-ai/glm-5.3-flash', name: 'GLM-5.3 Flash', input: ['text', 'image'] }),
    lyceumModel({ id: 'z-ai/glm-5.3-flash-instant', name: 'GLM-5.3 Flash Instant', input: ['text', 'image'] }),
    lyceumModel({ id: 'z-ai/glm-5.3-instant', name: 'GLM-5.3 Instant', input: ['text'] }),
  ],
  api: openAICompletionsApi(),
})

/** Provider definitions bundled by DSH outside pi-ai's installed catalog. */
export const SUPPLEMENTAL_PROVIDERS: readonly Provider[] = [LYCEUM_PROVIDER]
