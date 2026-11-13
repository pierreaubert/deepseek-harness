import { describe, expect, it, vi } from 'vitest'
import type { AuthContext } from '@earendil-works/pi-ai'
import { catalogModels, catalogProvider } from '../src/catalog.ts'
import { resolveProfiles } from '../src/config.ts'
import { generateProviderData } from '../scripts/gen-provider-data.ts'
import { LYCEUM_PROVIDER } from '../src/supplemental-providers.ts'

const defaultModel = 'moonshotai/kimi-k3.1-pro'

describe('Lyceum supplemental provider', () => {
  it('offers a native chat catalog with no custom-route configuration', () => {
    expect(catalogProvider('lyceum')).toMatchObject({
      id: 'lyceum',
      name: 'Lyceum',
      baseUrl: 'https://api.lyceum.technology/openai/v1',
    })
    const models = [...catalogModels('lyceum').values()]
    expect(models).toHaveLength(12)
    expect(models.every(model => model.api === 'openai-completions')).toBe(true)
    expect(models.every(model => !model.id.startsWith('lyc-'))).toBe(true)
    expect(models.find(model => model.id === defaultModel)).toMatchObject({
      name: 'Kimi K3.1 Pro',
      input: ['text', 'image'],
      contextWindow: 1_048_576,
      maxTokens: 131_072,
      compat: { maxTokensField: 'max_tokens', supportsStore: false, supportsDeveloperRole: false },
    })
  })

  it('inherits its models, endpoint, and wire compatibility from an empty profile', () => {
    const profile = resolveProfiles({ lyceum: {} }).get('lyceum')
    expect(profile?.piProvider?.getModels()).toHaveLength(12)
    expect(profile?.piProvider?.getModels().find(model => model.id === defaultModel)).toMatchObject({
      baseUrl: 'https://api.lyceum.technology/openai/v1',
      input: ['text', 'image'],
      compat: { maxTokensField: 'max_tokens' },
    })
    expect(profile?.modelErrors.size).toBe(0)
  })

  it('prefers a stored key, accepts the conventional environment key, and honors cancellation', async () => {
    const ctx: AuthContext = { env: vi.fn().mockResolvedValue('environment-key'), fileExists: vi.fn().mockResolvedValue(false) }
    const controller = new AbortController()
    const auth = LYCEUM_PROVIDER.auth.apiKey!
    await expect(auth.resolve({
      ctx,
      signal: controller.signal,
      credential: { type: 'api_key', key: 'stored-key', env: { REGION: 'eu' } },
    })).resolves.toEqual({ auth: { apiKey: 'stored-key' }, env: { REGION: 'eu' }, source: 'stored credential' })
    await expect(auth.resolve({
      ctx,
      signal: controller.signal,
      credential: { type: 'api_key', key: 'stored-key' },
    })).resolves.toEqual({ auth: { apiKey: 'stored-key' }, source: 'stored credential' })
    await expect(auth.resolve({ ctx, signal: controller.signal })).resolves.toEqual({
      auth: { apiKey: 'environment-key' }, source: 'LYCEUM_API_KEY',
    })
    controller.abort()
    await expect(auth.resolve({ ctx, signal: controller.signal })).rejects.toThrow()
    const cancelled = new AbortController()
    const pending = auth.resolve({
      ctx: { ...ctx, env: vi.fn().mockImplementation(() => { cancelled.abort(); return Promise.resolve('environment-key') }) },
      signal: cancelled.signal,
    })
    await expect(pending).rejects.toThrow()
  })

  it('supports cancellable interactive API-key login', async () => {
    const controller = new AbortController()
    const prompt = vi.fn().mockResolvedValue('entered-key')
    const notify = vi.fn()
    await expect(LYCEUM_PROVIDER.auth.apiKey!.login!({ signal: controller.signal, prompt, notify })).resolves.toEqual({ type: 'api_key', key: 'entered-key' })
    expect(prompt).toHaveBeenCalledWith({ type: 'secret', message: 'Enter Lyceum API key' })
    controller.abort()
    await expect(LYCEUM_PROVIDER.auth.apiKey!.login!({ signal: controller.signal, prompt, notify })).rejects.toThrow()
    const duringPrompt = new AbortController()
    const interrupted = vi.fn().mockImplementation(() => { duringPrompt.abort(); return Promise.resolve('unused') })
    await expect(LYCEUM_PROVIDER.auth.apiKey!.login!({ signal: duringPrompt.signal, prompt: interrupted, notify })).rejects.toThrow()
  })

  it('discovers its conventional API key without reading a real credential', async () => {
    await expect(generateProviderData([LYCEUM_PROVIDER])).resolves.toEqual({
      lyceum: {
        env: ['LYCEUM_API_KEY'],
        defaultBaseURL: 'https://api.lyceum.technology/openai/v1',
      },
    })
  })
})
