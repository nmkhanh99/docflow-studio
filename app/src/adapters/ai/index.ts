import { AppError } from '@core/domain';
import type { AiCliAdapterPort, AiProviderKind } from '@core/ports';
import { AgyCliAssistantAdapter } from './agy-cli';
import { HttpApiAssistantAdapter } from './api';
import { ClaudeCliAssistantAdapter } from './claude-cli';
import { CodexCliAssistantAdapter } from './codex-cli';

export * from './shared-security';
export * from './agy-cli';
export * from './claude-cli';
export * from './codex-cli';
export * from './api';

/**
 * Bộ chọn Strategy cho `AiCliAdapterPort` (mặc định ưu tiên `agy-cli` chỉ đọc).
 */
export class AiAdapterStrategyRegistry {
  private readonly adapters = new Map<AiProviderKind, AiCliAdapterPort>();
  private activeProvider: AiProviderKind;

  public constructor(
    initialAdapters?: readonly AiCliAdapterPort[],
    defaultProvider: AiProviderKind = 'agy-cli'
  ) {
    const defaults: readonly AiCliAdapterPort[] = initialAdapters ?? [
      new AgyCliAssistantAdapter(),
      new ClaudeCliAssistantAdapter(),
      new CodexCliAssistantAdapter(),
      new HttpApiAssistantAdapter()
    ];

    for (const adapter of defaults) {
      if (adapter.providerKind) {
        this.adapters.set(adapter.providerKind, adapter);
      }
    }
    this.activeProvider = defaultProvider;
  }

  public register(provider: AiProviderKind, adapter: AiCliAdapterPort): void {
    this.adapters.set(provider, adapter);
  }

  public setActiveProvider(provider: AiProviderKind): void {
    if (!this.adapters.has(provider)) {
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: `Chưa đăng ký AI Strategy Adapter cho nhà cung cấp '${provider}'.`,
        details: { provider },
        recoverable: true
      });
    }
    this.activeProvider = provider;
  }

  public getActiveAdapter(): AiCliAdapterPort {
    return this.getAdapter(this.activeProvider);
  }

  public getAdapter(provider: AiProviderKind): AiCliAdapterPort {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: `Không tìm thấy AI Strategy Adapter cho '${provider}'.`,
        details: { provider },
        recoverable: true
      });
    }
    return adapter;
  }
}
